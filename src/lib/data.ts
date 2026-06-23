import type { Park, Review, Trail } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

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

export async function getTrails(): Promise<Trail[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trails")
    .select("*, park:parks(*)")
    .order("trail_name");

  if (error) throw error;
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

  if (error) return null;
  return data;
}

export async function getReviews(trailId: string): Promise<Review[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profile:profiles(*)")
    .eq("trail_id", trailId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function searchTrailsAndParks(query: string): Promise<{
  parks: Park[];
  trails: Trail[];
}> {
  const supabase = await createClient();
  const term = query.trim().toLowerCase();
  if (!supabase || !term) return { parks: [], trails: [] };

  const [parksResult, trailsResult] = await Promise.all([
    supabase.from("parks").select("*").ilike("park_name", `%${term}%`).limit(8),
    supabase
      .from("trails")
      .select("*, park:parks(park_name, state, country)")
      .ilike("trail_name", `%${term}%`)
      .limit(8),
  ]);

  return {
    parks: parksResult.data ?? [],
    trails: trailsResult.data ?? [],
  };
}
