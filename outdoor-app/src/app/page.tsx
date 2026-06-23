import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActivities, getWeeklyStats } from "@/lib/activities";
import { formatDistance, formatDuration } from "@/lib/gps";
import { ActivityCard } from "@/components/activities/ActivityCard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activities = user ? await getActivities(20) : [];
  const stats = user ? await getWeeklyStats() : null;

  return (
    <div className="pb-24 md:pb-8">
      <section className="border-b border-stone-200 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Activity feed</h1>
            <p className="mt-1 text-stone-500">Your GPS-recorded adventures</p>
          </div>
          {user && (
            <Link
              href="/record"
              className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              + Record
            </Link>
          )}
        </div>

        {user && stats && stats.activityCount > 0 && (
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-4 gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <WeekStat label="This week" value={`${stats.activityCount} acts`} />
            <WeekStat label="Distance" value={formatDistance(stats.distanceM)} />
            <WeekStat label="Time" value={formatDuration(stats.durationSec)} />
            <WeekStat label="Elev" value={`${stats.elevationFt.toLocaleString()} ft`} />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {!user ? (
          <div className="rounded-2xl border border-dashed border-stone-200 px-6 py-12 text-center">
            <p className="text-4xl">⛰</p>
            <p className="mt-3 font-medium text-stone-900">Your outdoor activity feed</p>
            <p className="mt-1 text-sm text-stone-500">
              Sign in to record GPS tracks, view routes on the map, and track weekly stats.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Sign up
              </Link>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 px-6 py-12 text-center">
            <p className="text-4xl">🥾</p>
            <p className="mt-3 font-medium text-stone-900">No activities yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Record a hike, run, ride, or ski day with live GPS — altimeter, speedometer, and
              elevation profile included.
            </p>
            <Link
              href="/record"
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Start recording
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold tabular-nums text-stone-800 sm:text-sm">{value}</p>
    </div>
  );
}
