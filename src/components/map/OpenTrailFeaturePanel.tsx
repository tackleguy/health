"use client";

import type { OpenTrailFeatureSummary } from "@/lib/opentrailmap";
import { openTrailMapOsmUrl } from "@/lib/opentrailmap";
import { directionsUrl, recordUrl } from "@/lib/map";
import Link from "next/link";

interface OpenTrailFeaturePanelProps {
  feature: OpenTrailFeatureSummary;
  mode: "trail" | "ski";
  onClose: () => void;
}

export function OpenTrailFeaturePanel({
  feature,
  mode,
  onClose,
}: OpenTrailFeaturePanelProps) {
  const activity = mode === "ski" ? "ski" : "hike";

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">
            {mode === "ski" ? "Nordic ski trail" : "OSM trail"}
          </p>
          <p className="font-display font-semibold text-cream">{feature.name}</p>
          <p className="mt-0.5 text-sm text-mist">
            {feature.highway && `${feature.highway}`}
            {feature.operator && ` · ${feature.operator}`}
            {feature.network && ` · ${feature.network}`}
          </p>
          <p className="mt-1 text-xs text-mist">
            OpenStreetMap {feature.osmType} #{feature.osmId}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-mist hover:text-cream"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={directionsUrl(feature.lat, feature.lng, feature.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !py-2 !text-sm"
        >
          Get directions
        </a>
        <a
          href={openTrailMapOsmUrl(feature)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !py-2 !text-sm"
        >
          View on OSM
        </a>
        <Link
          href={recordUrl(activity)}
          className="btn-primary !py-2 !text-sm"
        >
          Start GPS record
        </Link>
      </div>
    </div>
  );
}
