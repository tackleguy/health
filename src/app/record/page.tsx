import Link from "next/link";
import clsx from "clsx";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, type ActivityType } from "@/lib/types";
import { ACTIVITY_THEME } from "@/lib/activity-theme";

const types: {
  type: ActivityType;
  description: string;
}[] = [
  { type: "run", description: "Pace, distance, and elevation on any terrain." },
  { type: "hike", description: "Altimeter and elevation profile for trails." },
  { type: "bike", description: "Speedometer with smoothed GPS velocity." },
  { type: "ski", description: "Log vertical and runs on the mountain." },
];

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8 md:pb-10">
      <p className="section-label">GPS recorder</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-cream">
        What are you doing?
      </h1>
      <p className="mt-2 text-mist">
        Live GPS with altimeter, speedometer, and elevation chart
      </p>

      <div className="mt-8 grid gap-3">
        {types.map(({ type, description }) => {
          const theme = ACTIVITY_THEME[type];
          return (
            <Link
              key={type}
              href={`/record/live?type=${type}`}
              className="card-lift group flex items-center gap-4 surface-card p-4"
            >
              <span
                className={clsx(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br text-2xl",
                  theme.gradient,
                )}
              >
                {ACTIVITY_ICONS[type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-cream group-hover:text-accent">
                  {ACTIVITY_LABELS[type]}
                </p>
                <p className="mt-0.5 text-sm text-mist">{description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent opacity-0 transition group-hover:opacity-100">
                Start
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/record/manual"
        className="mt-8 block rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] px-4 py-3.5 text-center text-sm font-medium text-mist transition hover:border-accent/30 hover:text-sage"
      >
        No GPS? Log activity manually
      </Link>
    </div>
  );
}
