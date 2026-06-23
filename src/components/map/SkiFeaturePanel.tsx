"use client";

import Link from "next/link";
import type { SkiFeatureSummary } from "@/lib/ski";
import {
  difficultyColor,
  formatSkiUses,
} from "@/lib/ski";
import { directionsUrl, formatDistanceAway, recordUrl } from "@/lib/map";

interface SkiFeaturePanelProps {
  feature: SkiFeatureSummary;
  distanceKm?: number;
  onClose: () => void;
}

export function SkiFeaturePanel({
  feature,
  distanceKm,
  onClose,
}: SkiFeaturePanelProps) {
  const typeLabel =
    feature.type === "run"
      ? "Ski run"
      : feature.type === "lift"
        ? "Lift"
        : "Ski area";

  const icon = feature.type === "lift" ? "🚡" : feature.type === "run" ? "⛷" : "🏔";

  const resortId =
    feature.type === "skiArea" ? feature.id : undefined;
  const resortName =
    feature.type === "skiArea" ? feature.name : undefined;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
              {typeLabel}
            </p>
            <p className="font-semibold text-stone-900">{feature.name}</p>
            <p className="mt-0.5 text-sm text-stone-500">
              {formatSkiUses(feature.uses, feature.activities)}
              {feature.difficulty && (
                <span
                  className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${difficultyColor(feature.difficulty)}`}
                >
                  {feature.difficulty}
                </span>
              )}
              {feature.liftType && ` · ${feature.liftType.replace(/_/g, " ")}`}
              {distanceKm != null && ` · ${formatDistanceAway(distanceKm)} away`}
            </p>
            {feature.type === "skiArea" &&
              (feature.runs_count || feature.lifts_count) && (
                <p className="mt-1 text-xs text-stone-400">
                  {feature.runs_count ? `${feature.runs_count} runs` : ""}
                  {feature.runs_count && feature.lifts_count ? " · " : ""}
                  {feature.lifts_count ? `${feature.lifts_count} lifts` : ""}
                </p>
              )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={directionsUrl(feature.lat, feature.lng, feature.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Get directions
        </a>
        {feature.type === "skiArea" && (
          <Link
            href={`/explore/ski?area=${feature.id}`}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Resort map
          </Link>
        )}
        <Link
          href={recordUrl("ski", {
            resortId,
            resortName: resortName ?? feature.name,
          })}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Start ski day
        </Link>
      </div>
    </div>
  );
}
