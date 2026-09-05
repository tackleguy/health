import type { SupabaseClient } from "@supabase/supabase-js";
import { OsmAdapter } from "./adapters/osm";
import { OverpassAdapter } from "./adapters/overpass";
import { NationalParkServiceAdapter } from "./adapters/nps";
import { USForestServiceAdapter } from "./adapters/usfs";
import { BLMAdapter } from "./adapters/blm";
import { StateParksAdapter } from "./adapters/state-parks";
import type { DataSourceAdapter } from "./adapters/base";
import { loadIngestionConfig } from "./config";
import { findMergeCandidates } from "./deduplicate";
import { runPhotoIngestionPipeline } from "./photos";
import {
  createImportLog,
  ensureImportPark,
  fetchExistingTrailRefs,
  finishImportLog,
  insertImportedTrail,
  storeMergeCandidates,
  storeSourceRecord,
  upsertDataSource,
} from "./store";
import type { ImportResult, IngestionConfig, SourceAdapterConfig } from "./types";
import { emptyImportResult } from "./adapters/base";
import { normalizeTrail } from "./validate";
import { validateTrailRecord } from "./validate";

const ADAPTERS: Record<string, () => DataSourceAdapter> = {
  osm: () => new OsmAdapter(),
  overpass: () => new OverpassAdapter(),
  nps: () => new NationalParkServiceAdapter(),
  usfs: () => new USForestServiceAdapter(),
  blm: () => new BLMAdapter(),
  "state-parks": () => new StateParksAdapter(),
};

export function getAdapter(name: string): DataSourceAdapter | null {
  const factory = ADAPTERS[name];
  return factory ? factory() : null;
}

export async function runIngestionPipeline(
  supabase: SupabaseClient,
  adapterName: string,
  configOverrides?: Partial<IngestionConfig>,
): Promise<ImportResult> {
  const config = loadIngestionConfig(configOverrides);
  const sourceConfig = config.sources.find((s) => s.adapter === adapterName);

  if (!sourceConfig?.enabled) {
    throw new Error(`Adapter "${adapterName}" is not enabled in ingestion config`);
  }

  if (adapterName === "wikimedia") {
    return runPhotoIngestionPipeline(supabase, sourceConfig, configOverrides);
  }

  const adapter = getAdapter(adapterName);
  if (!adapter) throw new Error(`Unknown adapter: ${adapterName}`);

  const result = emptyImportResult();
  let logId: string | undefined;

  try {
    const dataSourceId = await upsertDataSource(supabase, sourceConfig);
    logId = await createImportLog(supabase, adapterName, dataSourceId);

    const raw = await adapter.download(sourceConfig);
    const records = await adapter.parse(raw);
    result.processed = records.length;

    const existing = await fetchExistingTrailRefs(supabase);
    const parkId = await ensureImportPark(supabase);

    for (const record of records) {
      const validation = validateTrailRecord(record);
      if (!validation.valid) {
        result.failed++;
        result.errors.push(
          `${record.name}: ${validation.issues.map((i) => i.message).join("; ")}`,
        );
        continue;
      }

      const normalized = normalizeTrail(record);
      const candidates = findMergeCandidates(
        normalized,
        existing.map((t) => ({
          id: t.id,
          name: t.name,
          lengthMiles: t.length_miles,
          latitude: t.latitude,
          longitude: t.longitude,
        })),
        config.deduplication,
      );

      const trailId = await insertImportedTrail(
        supabase,
        dataSourceId,
        parkId,
        normalized,
      );
      await storeSourceRecord(supabase, dataSourceId, normalized, trailId);
      result.stored++;

      existing.push({
        id: trailId,
        name: normalized.name,
        length_miles: normalized.lengthMiles ?? 0,
        latitude: normalized.startLatitude,
        longitude: normalized.startLongitude,
      });

      if (candidates.length > 0) {
        result.mergeCandidates.push(...candidates);
        await storeMergeCandidates(supabase, trailId, candidates);
      }
    }

    if (logId) {
      await finishImportLog(supabase, logId, result, "completed");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown import error";
    result.errors.push(message);
    if (logId) {
      await finishImportLog(supabase, logId, result, "failed", message);
    }
    throw err;
  }

  return result;
}

export async function runIngestionForSource(
  supabase: SupabaseClient,
  sourceConfig: SourceAdapterConfig,
  config?: Partial<IngestionConfig>,
): Promise<ImportResult> {
  const fullConfig = loadIngestionConfig({
    ...config,
    sources: [sourceConfig],
  });
  return runIngestionPipeline(supabase, sourceConfig.adapter, fullConfig);
}

export { loadIngestionConfig };
