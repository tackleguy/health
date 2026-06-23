import Link from "next/link";
import type { Activity } from "@/lib/types";
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from "@/lib/types";
import { avgSpeedMph, formatDistance, formatDuration, formatPace } from "@/lib/gps";
import { RouteMiniMap } from "@/components/activities/RouteMiniMap";
import { ActivityStats } from "@/components/activities/ActivityStats";

export function ActivityCard({ activity }: { activity: Activity }) {
  const date = new Date(activity.started_at).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = new Date(activity.started_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const distanceM = Number(activity.distance_m);
  const avgMph = avgSpeedMph(distanceM, activity.duration_sec);

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <RouteMiniMap route={activity.route_geojson} className="h-40 w-full" />
        <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow">
          {ACTIVITY_ICONS[activity.activity_type]}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-stone-900">{activity.title}</h3>
            <p className="text-sm text-stone-500">
              {ACTIVITY_LABELS[activity.activity_type]} · {date} at {time}
            </p>
          </div>
          {distanceM > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              {formatPace(distanceM, activity.duration_sec)}
            </span>
          )}
        </div>

        {(activity.trail || activity.ski_area_name) && (
          <p className="mt-2 truncate text-xs text-emerald-700">
            {activity.trail?.trail_name ?? activity.ski_area_name}
          </p>
        )}

        <ActivityStats
          className="mt-3"
          variant="compact"
          distanceM={distanceM}
          durationSec={activity.duration_sec}
          elevationGainFt={Number(activity.elevation_gain_ft)}
        />

        {distanceM > 100 && (
          <p className="mt-2 text-xs text-stone-400">
            Avg {avgMph.toFixed(1)} mph · {formatDistance(distanceM)} ·{" "}
            {formatDuration(activity.duration_sec)}
          </p>
        )}
      </div>
    </Link>
  );
}
