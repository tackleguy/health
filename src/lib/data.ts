import type { Park, Review, Trail, TrailFilters } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import {
  getTrailCampsites,
  getTrailElevationProfile,
  getTrailExtendedFields,
  getTrailPhotos,
  getTrailTrailheads,
  getTrailWaterSources,
  queryNearbyTrailsPostgis,
  queryTrailsFiltered,
} from "@/lib/trails";

export async function getParks(): Promise<Park[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("parks")
    .select("*")
    .order("park_name");

  if (error) throw error;
  return data ?? [];
}

export async function getPark(id: string): Promise<Park | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("parks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getTrails(filters?: TrailFilters): Promise<Trail[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  if (filters && Object.keys(filters).length > 0) {
    try {
      return await queryTrailsFiltered(supabase, filters);
    } catch {
      // fall through
    }
  }

  const { data, error } = await supabase
    .from("trails")
    .select("*, park:parks(*)")
    .order("trail_name");

  if (error) return [];
  return data ?? [];
}

export async function getTrailsByPark(parkId: string): Promise<Trail[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trails")
    .select("*")
    .eq("park_id", parkId)
    .order("trail_name");

  if (error) throw error;
  return data ?? [];
}

export async function getTrail(id: string): Promise<Trail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("trails")
    .select("*, park:parks(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  try {
    const extended = await getTrailExtendedFields(supabase, id);
    return { ...data, ...extended };
  } catch {
    return data;
  }
}

export async function getReviews(trailId: string): Promise<Review[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profile:profiles(*)")
    .eq("trail_id", trailId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getNearbyTrails(
  lat: number,
  lng: number,
  radiusKm = 50,
  limit = 40,
): Promise<(Trail & { distance_km: number })[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  try {
    const trails = await queryNearbyTrailsPostgis(supabase, lat, lng, radiusKm, limit);
    return trails.map((t) => ({
      ...t,
      distance_km: t.distance_km ?? (t.distance_m != null ? t.distance_m / 1000 : 0),
    }));
  } catch {
    return [];
  }
}

export async function searchTrailsAndParks(query: string): Promise<{
  parks: Park[];
  trails: Trail[];
}> {
  const supabase = await createClient();
  const term = query.trim();
  if (!supabase || !term) return { parks: [], trails: [] };

  const [parksResult, trailsResult] = await Promise.all([
    supabase.from("parks").select("*").ilike("park_name", `%${term}%`).limit(8),
    queryTrailsFiltered(supabase, { q: term, limit: 8 }).catch(() => []),
  ]);

  return {
    parks: parksResult.data ?? [],
    trails: trailsResult,
  };
}

export {
  getTrailPhotos,
  getTrailCampsites,
  getTrailWaterSources,
  getTrailTrailheads,
  getTrailElevationProfile,
  queryTrailsFiltered,
};
