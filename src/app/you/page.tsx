import Link from "next/link";
import { redirect } from "next/navigation";
import { getActivities, getWeeklyStats } from "@/lib/activities";
import { formatDistance, formatDuration } from "@/lib/gps";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, type ActivityType } from "@/lib/types";
import { getAuthUser } from "@/lib/supabase/server";

const allTypes: ActivityType[] = ["run", "hike", "bike", "ski"];

export default async function YouPage() {
  const { user } = await getAuthUser();

  if (!user) redirect("/login?next=/you");

  const [stats, activities] = await Promise.all([getWeeklyStats(), getActivities(15)]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">You</h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
        </div>
        <Link
          href="/record"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Record
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          This week
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Distance" value={formatDistance(stats.distanceM)} />
          <StatCard label="Moving time" value={formatDuration(stats.durationSec)} />
          <StatCard label="Activities" value={String(stats.activityCount)} />
          <StatCard label="Elev gain" value={`${stats.elevationFt.toLocaleString()} ft`} />
        </div>
      </section>

      {stats.byType && Object.keys(stats.byType).length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            By activity type
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allTypes.map((type) => {
              const count = stats.byType?.[type] ?? 0;
              if (count === 0) return null;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm"
                >
                  {ACTIVITY_ICONS[type]} {ACTIVITY_LABELS[type]} · {count}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Activity history</h2>
          <span className="text-xs text-stone-400">{activities.length} recent</span>
        </div>

        {activities.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-200 px-6 py-10 text-center">
            <p className="text-stone-500">No activities yet.</p>
            <Link
              href="/record"
              className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
            >
              Record your first activity
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {activities.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/activities/${a.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl">
                    {ACTIVITY_ICONS[a.activity_type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{a.title}</p>
                    <p className="text-xs text-stone-500">
                      {formatDistance(Number(a.distance_m))} ·{" "}
                      {formatDuration(a.duration_sec)} ·{" "}
                      {Number(a.elevation_gain_ft).toLocaleString()} ft ↑
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(a.started_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-stone-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
      <p className="text-lg font-bold tabular-nums text-emerald-600 sm:text-xl">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{label}</p>
    </div>
  );
}
