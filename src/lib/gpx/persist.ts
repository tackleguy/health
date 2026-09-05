import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityType, GeoLineString } from "@/lib/types";
import type { ParsedRoute } from "@/lib/ingestion/types";

export interface PersistRouteOptions {
  route: ParsedRoute;
  sourceFormat: "gpx" | "kml" | "geojson";
  title?: string;
  trailId?: string | null;
  activityType?: ActivityType;
  notes?: string | null;
}

export interface PersistRouteResult {
  kind: "activity" | "route_import";
  id: string;
}

export async function persistImportedRoute(
  supabase: SupabaseClient,
  userId: string | null,
  options: PersistRouteOptions,
): Promise<PersistRouteResult> {
  const title = options.title?.trim() || options.route.name?.trim() || "Imported route";
  const geojson = options.route.geojson as GeoLineString;

  if (userId) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        activity_type: options.activityType ?? "hike",
        status: "completed",
        title,
        distance_m: options.route.distanceM,
        duration_sec: 0,
        elevation_gain_ft: Math.round(options.route.elevationGainFt),
        route_geojson: geojson,
        trail_id: options.trailId ?? null,
        started_at: now,
        ended_at: now,
        notes: options.notes ?? "Imported from GPX/KML/GeoJSON",
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to save activity");
    return { kind: "activity", id: data.id };
  }

  const { data, error } = await supabase
    .from("route_imports")
    .insert({
      user_id: null,
      trail_id: options.trailId ?? null,
      title,
      route_geojson: geojson,
      distance_m: options.route.distanceM,
      elevation_gain_ft: Math.round(options.route.elevationGainFt),
      elevation_loss_ft: Math.round(options.route.elevationLossFt),
      source_format: options.sourceFormat,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save route import");
  return { kind: "route_import", id: data.id };
}
