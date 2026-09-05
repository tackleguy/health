import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ImportResult,
  MergeCandidate,
  NormalizedTrail,
  SourceAdapterConfig,
  TrailPhotoRecord,
} from "./types";

export async function upsertDataSource(
  supabase: SupabaseClient,
  config: SourceAdapterConfig,
): Promise<string> {
  const { data: existing } = await supabase
    .from("data_sources")
    .select("id")
    .eq("source_name", config.sourceName)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("data_sources")
    .insert({
      source_name: config.sourceName,
      source_url: config.sourceUrl ?? null,
      license: config.license,
      license_url: config.licenseUrl ?? null,
      attribution: config.attribution,
      version: config.version ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create data source");
  return data.id;
}

const IMPORT_PARK_ID = "a0000000-0000-4000-8000-000000009999";

export async function ensureImportPark(
  supabase: SupabaseClient,
  parkName = "Open Data Imports",
): Promise<string> {
  const { data: existing } = await supabase
    .from("parks")
    .select("id")
    .eq("id", IMPORT_PARK_ID)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("parks")
    .insert({
      id: IMPORT_PARK_ID,
      park_name: parkName,
      description:
        "Trails imported from licensed open-data sources (OpenStreetMap, government GIS).",
      acreage: 0,
      country: "United States of America",
      state: "Various",
      latitude: 39.8283,
      longitude: -98.5795,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create import park");
  return data.id;
}

export async function findTrailByExternalId(
  supabase: SupabaseClient,
  dataSourceId: string,
  externalId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("trails")
    .select("id")
    .eq("data_source_id", dataSourceId)
    .eq("source_external_id", externalId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function insertImportedTrail(
  supabase: SupabaseClient,
  dataSourceId: string,
  parkId: string,
  trail: NormalizedTrail,
): Promise<string> {
  if (trail.externalId) {
    const existing = await findTrailByExternalId(
      supabase,
      dataSourceId,
      trail.externalId,
    );
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from("trails")
    .insert({
      park_id: parkId,
      trail_name: trail.name,
      description: trail.description ?? `Imported trail: ${trail.name}`,
      difficulty: trail.difficulty ?? "moderate",
      length_miles: Math.max(0.1, Math.round((trail.lengthMiles ?? 0.1) * 100) / 100),
      elevation_ft: trail.elevationGainFt ?? 0,
      route_type: trail.routeType ?? "out-and-back",
      latitude: trail.startLatitude,
      longitude: trail.startLongitude,
      data_source_id: dataSourceId,
      source_external_id: trail.externalId ?? null,
      start_latitude: trail.startLatitude,
      start_longitude: trail.startLongitude,
      end_latitude: trail.endLatitude,
      end_longitude: trail.endLongitude,
      highest_point_ft: trail.highestPointFt ?? null,
      lowest_point_ft: trail.lowestPointFt ?? null,
      trail_type: trail.trailType ?? "hiking",
      surface: trail.surface ?? null,
      allows_hiking: trail.allowsHiking ?? true,
      allows_backpacking: trail.allowsBackpacking ?? true,
      allows_biking: trail.allowsBiking ?? false,
      allows_horseback: trail.allowsHorseback ?? false,
      allows_dogs: trail.allowsDogs ?? null,
      seasonal_information: trail.seasonalInformation ?? null,
      official_source: trail.officialSource ?? "OpenStreetMap",
      confidence_score: trail.confidenceScore ?? "source_reported",
      geometry: trail.geojson,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error(`Failed to insert trail: ${trail.name}`);
  return data.id;
}

export async function storeSourceRecord(
  supabase: SupabaseClient,
  dataSourceId: string,
  trail: NormalizedTrail,
  trailId?: string,
): Promise<void> {
  const { error } = await supabase.from("trail_source_records").insert({
    data_source_id: dataSourceId,
    trail_id: trailId ?? null,
    external_id: trail.externalId ?? null,
    raw_name: trail.name,
    raw_properties: trail.properties ?? {},
    raw_geometry: trail.geojson,
    confidence_score: trail.confidenceScore ?? "source_reported",
  });

  if (error) throw error;
}

export async function storeMergeCandidates(
  supabase: SupabaseClient,
  incomingTrailId: string,
  candidates: MergeCandidate[],
): Promise<void> {
  for (const c of candidates) {
    if (c.trailBId === "incoming") {
      await supabase.from("merge_candidates").insert({
        trail_a_id: c.trailAId,
        trail_b_id: incomingTrailId,
        overlap_score: c.overlapScore,
        name_similarity: c.nameSimilarity,
        distance_delta_miles: c.distanceDeltaMiles ?? null,
        status: "pending",
      });
    }
  }
}

export async function createImportLog(
  supabase: SupabaseClient,
  adapterName: string,
  dataSourceId?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_logs")
    .insert({
      adapter_name: adapterName,
      data_source_id: dataSourceId ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create import log");
  return data.id;
}

export async function finishImportLog(
  supabase: SupabaseClient,
  logId: string,
  result: ImportResult,
  status: "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  await supabase
    .from("import_logs")
    .update({
      status,
      records_processed: result.processed,
      records_stored: result.stored,
      records_failed: result.failed,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
      details: { errors: result.errors.slice(0, 50) },
    })
    .eq("id", logId);
}

export async function insertTrailPhotoIfNew(
  supabase: SupabaseClient,
  trailId: string,
  dataSourceId: string,
  photo: TrailPhotoRecord,
): Promise<boolean> {
  if (photo.externalId) {
    const { data: existing } = await supabase
      .from("trail_photos")
      .select("id")
      .eq("trail_id", trailId)
      .eq("external_id", photo.externalId)
      .maybeSingle();

    if (existing?.id) return false;
  }

  const { error } = await supabase.from("trail_photos").insert({
    trail_id: trailId,
    url: photo.url,
    thumbnail_url: photo.thumbnailUrl ?? null,
    caption: photo.caption ?? null,
    photographer: photo.photographer ?? null,
    license: photo.license,
    license_url: photo.licenseUrl ?? null,
    attribution: photo.attribution,
    source_name: photo.sourceName,
    source_url: photo.sourceUrl ?? null,
    external_id: photo.externalId ?? null,
    latitude: photo.latitude ?? null,
    longitude: photo.longitude ?? null,
    data_source_id: dataSourceId,
    confidence_score: "source_reported",
  });

  if (error) throw error;
  return true;
}

export async function fetchExistingTrailRefs(
  supabase: SupabaseClient,
): Promise<
  {
    id: string;
    name: string;
    length_miles: number;
    latitude: number;
    longitude: number;
  }[]
> {
  const { data } = await supabase
    .from("trails")
    .select("id, trail_name, length_miles, latitude, longitude");

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.trail_name,
    length_miles: t.length_miles,
    latitude: t.latitude,
    longitude: t.longitude,
  }));
}
