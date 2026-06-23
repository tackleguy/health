import type { Activity, ActivityType } from "@/lib/types";
import { ACTIVITY_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const emptyWeeklyStats = () => ({
  distanceM: 0,
  activityCount: 0,
  elevationFt: 0,
  durationSec: 0,
  byType: {} as Partial<Record<ActivityType, number>>,
});

export async function getActivities(limit = 50): Promise<Activity[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*, trail:trails(*, park:parks(*))")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Activity[];
}

export async function getActivity(id: string): Promise<Activity | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("activities")
    .select("*, trail:trails(*, park:parks(*))")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Activity;
}

export async function getWeeklyStats() {
  const supabase = await createClient();
  if (!supabase) return emptyWeeklyStats();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyWeeklyStats();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data } = await supabase
    .from("activities")
    .select("distance_m, elevation_gain_ft, duration_sec, activity_type")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", weekAgo.toISOString());

  const activities = data ?? [];
  return {
    distanceM: activities.reduce((s, a) => s + Number(a.distance_m), 0),
    activityCount: activities.length,
    elevationFt: activities.reduce(
      (s, a) => s + Number(a.elevation_gain_ft),
      0,
    ),
    durationSec: activities.reduce((s, a) => s + Number(a.duration_sec), 0),
    byType: activities.reduce(
      (acc, a) => {
        const t = a.activity_type as ActivityType;
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      },
      {} as Partial<Record<ActivityType, number>>,
    ),
  };
}

export async function getTrailForRecord(trailId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("trails")
    .select("*, park:parks(*)")
    .eq("id", trailId)
    .single();
  return data;
}

export function defaultActivityTitle(
  type: ActivityType,
  trailName?: string,
  resortName?: string,
): string {
  if (trailName) return `${ACTIVITY_LABELS[type]} — ${trailName}`;
  if (resortName) return `Ski Day — ${resortName}`;
  const labels: Record<ActivityType, string> = {
    run: "Morning Run",
    hike: "Trail Hike",
    bike: "Bike Ride",
    ski: "Ski Day",
  };
  return labels[type];
}
