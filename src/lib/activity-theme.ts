import type { ActivityType } from "@/lib/types";

export const ACTIVITY_THEME: Record<
  ActivityType,
  {
    gradient: string;
    accent: string;
    accentBg: string;
    ring: string;
    label: string;
  }
> = {
  hike: {
    gradient: "from-emerald-600/90 to-teal-800/90",
    accent: "text-emerald-700",
    accentBg: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    label: "Trail",
  },
  run: {
    gradient: "from-amber-500/90 to-orange-700/90",
    accent: "text-amber-700",
    accentBg: "bg-amber-500",
    ring: "ring-amber-500/30",
    label: "Run",
  },
  bike: {
    gradient: "from-sky-500/90 to-blue-800/90",
    accent: "text-sky-700",
    accentBg: "bg-sky-500",
    ring: "ring-sky-500/30",
    label: "Ride",
  },
  ski: {
    gradient: "from-cyan-400/90 to-indigo-700/90",
    accent: "text-cyan-700",
    accentBg: "bg-cyan-500",
    ring: "ring-cyan-500/30",
    label: "Ski",
  },
};
