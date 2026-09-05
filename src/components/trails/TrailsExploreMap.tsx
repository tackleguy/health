"use client";

import type { Trail } from "@/lib/types";
import { MapView } from "@/components/map/MapView";

interface TrailsExploreMapProps {
  trails: Trail[];
}

export function TrailsExploreMap({ trails }: TrailsExploreMapProps) {
  if (trails.length === 0) return null;

  const markers = trails
    .filter((t) => Number.isFinite(t.latitude) && Number.isFinite(t.longitude))
    .map((trail) => ({
      id: trail.id,
      type: "trail" as const,
      name: trail.trail_name,
      latitude: trail.latitude,
      longitude: trail.longitude,
      subtitle: trail.park?.park_name,
      href: `/explore/trails/${trail.id}`,
    }));

  const centerLng =
    markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length;
  const centerLat =
    markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
      <MapView
        mode="trail"
        markers={markers}
        center={[centerLng, centerLat]}
        zoom={markers.length === 1 ? 10 : 5}
        className="h-72"
        fitToMarkers
      />
    </div>
  );
}
