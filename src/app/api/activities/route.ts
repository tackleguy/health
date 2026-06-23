import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import type { ActivityType, GeoLineString } from "@/lib/types";

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*, trail:trails(*, park:parks(*))")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [] });
}

interface CreateActivityBody {
  activity_type: ActivityType;
  title: string;
  distance_m: number;
  duration_sec: number;
  elevation_gain_ft: number;
  route_geojson: GeoLineString | null;
  trail_id?: string | null;
  ski_area_id?: string | null;
  ski_area_name?: string | null;
  started_at: string;
  ended_at: string;
  notes?: string | null;
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthUser();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateActivityBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      activity_type: body.activity_type,
      status: "completed",
      title: body.title,
      distance_m: body.distance_m,
      duration_sec: body.duration_sec,
      elevation_gain_ft: body.elevation_gain_ft,
      route_geojson: body.route_geojson,
      trail_id: body.trail_id ?? null,
      ski_area_id: body.ski_area_id ?? null,
      ski_area_name: body.ski_area_name ?? null,
      started_at: body.started_at,
      ended_at: body.ended_at,
      notes: body.notes ?? null,
    })
    .select("*, trail:trails(*, park:parks(*))")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity: data }, { status: 201 });
}
