import Link from "next/link";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, type ActivityType } from "@/lib/types";

const types: {
  type: ActivityType;
  description: string;
  tips: string;
}[] = [
  {
    type: "run",
    description: "Track pace, distance, and elevation on roads or trails.",
    tips: "Best with phone in pocket · accuracy ≤20m",
  },
  {
    type: "hike",
    description: "Altimeter and elevation profile for trail adventures.",
    tips: "Start from Explore trails with one tap",
  },
  {
    type: "bike",
    description: "Speedometer with smoothed mph from GPS velocity.",
    tips: "Mount phone securely for best speed readings",
  },
  {
    type: "ski",
    description: "Log vertical and runs on the mountain.",
    tips: "Start from Explore → Ski resort map",
  },
];

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8 md:pb-8">
      <h1 className="text-2xl font-bold text-stone-900">Record</h1>
      <p className="mt-1 text-stone-500">
        Live GPS with altimeter, speedometer, and elevation chart
      </p>

      <div className="mt-3 rounded-xl bg-stone-900 px-4 py-3 text-xs text-stone-300">
        <span className="font-semibold text-emerald-400">GPS engine:</span> accuratelocation.js
        · 5m distance filter · AgOpenGPS speed smoothing · points filtered at &gt;50m accuracy
      </div>

      <div className="mt-8 grid gap-3">
        {types.map(({ type, description, tips }) => (
          <Link
            key={type}
            href={`/record/live?type=${type}`}
            className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
              {ACTIVITY_ICONS[type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-stone-900">{ACTIVITY_LABELS[type]}</p>
              <p className="mt-0.5 text-sm text-stone-600">{description}</p>
              <p className="mt-1 text-[10px] text-stone-400">{tips}</p>
            </div>
            <span className="shrink-0 self-center text-stone-400">→</span>
          </Link>
        ))}
      </div>

      <Link
        href="/record/manual"
        className="mt-6 block rounded-xl border border-dashed border-stone-300 px-4 py-3 text-center text-sm font-medium text-stone-500 hover:border-stone-400 hover:text-stone-700"
      >
        No GPS? Log activity manually instead
      </Link>
    </div>
  );
}
