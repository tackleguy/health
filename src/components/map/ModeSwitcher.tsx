"use client";

import clsx from "clsx";
import type { MapMode } from "@/lib/types";

interface ModeSwitcherProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="inline-flex rounded-[var(--radius-xl)] border border-[var(--border)] bg-surface-elevated p-1">
      <button
        type="button"
        onClick={() => onChange("trail")}
        className={clsx(
          "rounded-[var(--radius-lg)] px-4 py-2 text-sm font-semibold transition",
          mode === "trail"
            ? "bg-accent text-forest shadow-md shadow-accent/20"
            : "text-mist hover:text-cream",
        )}
      >
        🥾 Trails
      </button>
      <button
        type="button"
        onClick={() => onChange("ski")}
        className={clsx(
          "rounded-[var(--radius-lg)] px-4 py-2 text-sm font-semibold transition",
          mode === "ski"
            ? "bg-accent text-forest shadow-md shadow-accent/20"
            : "text-mist hover:text-cream",
        )}
      >
        ⛷ Ski
      </button>
    </div>
  );
}
