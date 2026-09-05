import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WikimediaCommonsAdapter,
  matchPhotosToTrail,
} from "./adapters/wikimedia";
import { loadIngestionConfig } from "./config";
import {
  createImportLog,
  finishImportLog,
  insertTrailPhotoIfNew,
  upsertDataSource,
} from "./store";
import type { ImportResult, IngestionConfig, SourceAdapterConfig } from "./types";
import { emptyImportResult } from "./adapters/base";

interface TrailForPhotos {
  id: string;
  trail_name: string;
  latitude: number;
  longitude: number;
}

export async function runPhotoIngestionPipeline(
  supabase: SupabaseClient,
  sourceConfig: SourceAdapterConfig,
  configOverrides?: Partial<IngestionConfig>,
): Promise<ImportResult> {
  const config = loadIngestionConfig(configOverrides);
  const adapter = new WikimediaCommonsAdapter();
  const result = emptyImportResult();
  let logId: string | undefined;

  const maxDistanceMeters =
    config.photoMatching?.maxDistanceMeters ?? 500;
  const limit = (sourceConfig.options?.limit as number | undefined) ?? 5;
  const trailIds = sourceConfig.options?.trailIds as string[] | undefined;

  try {
    const dataSourceId = await upsertDataSource(supabase, sourceConfig);
    logId = await createImportLog(supabase, "wikimedia", dataSourceId);

    let trailsQuery = supabase
      .from("trails")
      .select("id, trail_name, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (trailIds?.length) {
      trailsQuery = trailsQuery.in("id", trailIds);
    } else {
      trailsQuery = trailsQuery.limit(
        (sourceConfig.options?.maxTrails as number | undefined) ?? 25,
      );
    }

    const { data: trails, error: trailsError } = await trailsQuery;
    if (trailsError) throw trailsError;

    const trailList = (trails ?? []) as TrailForPhotos[];
    result.processed = trailList.length;

    for (const trail of trailList) {
      try {
        const raw = await adapter.download({
          ...sourceConfig,
          options: {
            ...sourceConfig.options,
            latitude: trail.latitude,
            longitude: trail.longitude,
            radiusMeters: maxDistanceMeters,
            limit,
          },
        });

        const { photos } = raw as { photos: import("./types").TrailPhotoRecord[] };
        const matched = matchPhotosToTrail(
          photos ?? [],
          trail.latitude,
          trail.longitude,
          maxDistanceMeters,
        );

        for (const photo of matched) {
          const inserted = await insertTrailPhotoIfNew(
            supabase,
            trail.id,
            dataSourceId,
            photo,
          );
          if (inserted) result.stored++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push(
          `${trail.trail_name}: ${err instanceof Error ? err.message : "photo fetch failed"}`,
        );
      }
    }

    if (logId) {
      await finishImportLog(supabase, logId, result, "completed");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo import failed";
    result.errors.push(message);
    if (logId) {
      await finishImportLog(supabase, logId, result, "failed", message);
    }
    throw err;
  }

  return result;
}
