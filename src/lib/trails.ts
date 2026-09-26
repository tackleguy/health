import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Campsite,
  ElevationSample,
  Trail,
  TrailFilters,
  Trailhead,
  TrailPhoto,
  WaterSource,
} from "@/lib/types";

type RpcTrailRow = Record<string, unknown>;

function mapRpcTrail(row: RpcTrailRow): Trail {
  return {
    id: String(row.id),
    park_id: String(row.park_id),
    trail_name: String(row.trail_name),
    description: String(row.description ?? ""),
    difficulty: row.difficulty as Trail["difficulty"],
    length_miles: Number(row.length_miles),
    elevation_ft: Number(row.elevation_ft),
    duration: row.duration ? String(row.duration) : null,
    route_type: String(row.route_type ?? ""),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    image_url: row.image_url ? String(row.image_url) : null,
    avg_rating: Number(row.avg_rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    geometry: (row.geometry as Trail["geometry"]) ?? null,
    allows_dogs: row.allows_dogs as boolean | null | undefined,
    confidence_score: row.confidence_score as Trail["confidence_score"],
    distance_m: row.distance_m != null ? Number(row.distance_m) : undefined,
    distance_km:
      row.distance_m != null ? Number(row.distance_m) / 1000 : undefined,
    park: row.park_name
      ? {
          id: String(row.park_id),
          park_name: String(row.park_name),
          description: "",
          acreage: 0,
          contact: null,
          country: "United States of America",
          state: String(row.park_state ?? ""),
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          image_url: null,
          created_at: "",
          updated_at: "",
        }
      : undefined,
  };
}

export async function queryTrailsFiltered(
  supabase: SupabaseClient,
  filters: TrailFilters,
): Promise<Trail[]> {
  const radiusM =
    filters.radiusKm != null ? filters.radiusKm * 1000 : undefined;

  const { data, error } = await supabase.rpc("search_trails_filtered", {
    p_query: filters.q ?? null,
    p_lat: filters.lat ?? null,
    p_lng: filters.lng ?? null,
    p_radius_m: radiusM ?? null,
    p_difficulty: filters.difficulty ?? null,
    p_min_length_miles: filters.minLengthMiles ?? null,
    p_max_length_miles: filters.maxLengthMiles ?? null,
    p_min_elevation_ft: filters.minElevationFt ?? null,
    p_max_elevation_ft: filters.maxElevationFt ?? null,
    p_dog_friendly: filters.dogFriendly ?? null,
    p_limit: filters.limit ?? 50,
  });

  if (error) throw error;
  return (data ?? []).map(mapRpcTrail);
}

export async function queryNearbyTrailsPostgis(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  radiusKm = 50,
  limit = 50,
): Promise<Trail[]> {
  const { data, error } = await supabase.rpc("nearby_trails", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusKm * 1000,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []).map(mapRpcTrail);
}

function parseElevationProfilePayload(
  data: unknown,
): ElevationSample[] {
  if (!data) return [];

  const samples = Array.isArray(data) ? data : (data as ElevationSample[]);
  if (!Array.isArray(samples)) return [];

  return samples.map((sample: Record<string, unknown>) => ({
    distance_m: Number(sample.distance_m ?? 0),
    elevation_m:
      sample.elevation_m != null ? Number(sample.elevation_m) : undefined,
    elevation_ft:
      sample.elevation_m != null
        ? Math.round(Number(sample.elevation_m) * 3.28084)
        : sample.elevation_ft != null
          ? Number(sample.elevation_ft)
          : undefined,
  }));
}

export async function getTrailElevationProfile(
  supabase: SupabaseClient,
  trailId: string,
): Promise<ElevationSample[]> {
  const { data, error } = await supabase.rpc("trail_elevation_profile", {
    p_trail_id: trailId,
  });

  if (error) throw error;
  return parseElevationProfilePayload(data);
}

export async function getTrailTrailheads(
  supabase: SupabaseClient,
  trailId: string,
): Promise<Trailhead[]> {
  const { data, error } = await supabase
    .from("trailheads")
    .select("*")
    .eq("trail_id", trailId);

  if (error) throw error;
  return (data ?? []) as Trailhead[];
}

export async function getTrailPhotos(
  supabase: SupabaseClient,
  trailId: string,
): Promise<TrailPhoto[]> {
  const { data, error } = await supabase
    .from("trail_photos")
    .select("*")
    .eq("trail_id", trailId)
    .eq("is_disabled", false)
    .not("uploaded_by", "is", null)
    .order("sort_order")
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as TrailPhoto[];
}

export async function getTrailCampsites(
  supabase: SupabaseClient,
  trailId: string,
): Promise<Campsite[]> {
  const { data, error } = await supabase
    .from("campsites")
    .select("*")
    .eq("trail_id", trailId);

  if (error) throw error;
  return (data ?? []) as Campsite[];
}

export async function getTrailWaterSources(
  supabase: SupabaseClient,
  trailId: string,
): Promise<WaterSource[]> {
  const { data, error } = await supabase
    .from("water_sources")
    .select("*")
    .eq("trail_id", trailId);

  if (error) throw error;
  return (data ?? []) as WaterSource[];
}

export function parseTrailFilters(searchParams: URLSearchParams): TrailFilters {
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");

  return {
    q: searchParams.get("q") ?? undefined,
    lat: lat != null ? Number(lat) : undefined,
    lng: lng != null ? Number(lng) : undefined,
    radiusKm: radius != null ? Number(radius) : undefined,
    difficulty: (searchParams.get("difficulty") as TrailFilters["difficulty"]) ?? undefined,
    minLengthMiles: numParam(searchParams, "min_length"),
    maxLengthMiles: numParam(searchParams, "max_length"),
    minElevationFt: intParam(searchParams, "min_elevation"),
    maxElevationFt: intParam(searchParams, "max_elevation"),
    dogFriendly: boolParam(searchParams, "dog_friendly"),
    limit: intParam(searchParams, "limit") ?? 50,
  };
}

function numParam(params: URLSearchParams, key: string): number | undefined {
  const v = params.get(key);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function intParam(params: URLSearchParams, key: string): number | undefined {
  const n = numParam(params, key);
  return n != null ? Math.round(n) : undefined;
}

function boolParam(params: URLSearchParams, key: string): boolean | undefined {
  const v = params.get(key);
  if (v == null || v === "") return undefined;
  return v === "true" || v === "1";
}

export async function getTrailExtendedFields(
  supabase: SupabaseClient,
  trailId: string,
): Promise<Partial<Trail>> {
  const { data, error } = await supabase.rpc("get_trail_detail", {
    p_trail_id: trailId,
  });

  if (error || !data) return {};

  const detail = data as Record<string, unknown>;
  return {
    geometry: detail.geometry as Trail["geometry"],
    elevation_profile: detail.elevation_profile as Trail["elevation_profile"],
    start_latitude: detail.start_latitude as number | null,
    start_longitude: detail.start_longitude as number | null,
    end_latitude: detail.end_latitude as number | null,
    end_longitude: detail.end_longitude as number | null,
    elevation_loss_ft: detail.elevation_loss_ft as number | null,
    highest_point_ft: detail.highest_point_ft as number | null,
    lowest_point_ft: detail.lowest_point_ft as number | null,
    trail_type: detail.trail_type as string | null,
    surface: detail.surface as string | null,
    allows_hiking: detail.allows_hiking as boolean,
    allows_backpacking: detail.allows_backpacking as boolean,
    allows_biking: detail.allows_biking as boolean,
    allows_horseback: detail.allows_horseback as boolean,
    allows_dogs: detail.allows_dogs as boolean | null,
    seasonal_information: detail.seasonal_information as string | null,
    official_source: detail.official_source as string | null,
    confidence_score: detail.confidence_score as Trail["confidence_score"],
  };
}
