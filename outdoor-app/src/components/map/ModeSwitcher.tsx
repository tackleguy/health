"use client";

import clsx from "clsx";
import type { MapMode } from "@/lib/types";

interface ModeSwitcherProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onChange("trail")}
        className={clsx(
          "rounded-lg px-4 py-2 text-sm font-medium transition",
          mode === "trail"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-stone-600 hover:bg-stone-50",
        )}
      >
        🥾 Trails
      </button>
      <button
        onClick={() => onChange("ski")}
        className={clsx(
          "rounded-lg px-4 py-2 text-sm font-medium transition",
          mode === "ski"
            ? "bg-sky-600 text-white shadow-sm"
            : "text-stone-600 hover:bg-stone-50",
        )}
      >
        ⛷ Ski
      </button>
    </div>
  );
}
