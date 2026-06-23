import { getParks, getTrails } from "@/lib/data";
import { MapPageClient } from "@/components/map/MapPageClient";
import type { MapMarker } from "@/lib/types";

export default async function MapPage() {
  let markers: MapMarker[] = [];

  try {
    const [parks, trails] = await Promise.all([getParks(), getTrails()]);

    markers = [
      ...parks.map((park) => ({
        id: park.id,
        type: "park" as const,
        name: park.park_name,
        latitude: park.latitude,
        longitude: park.longitude,
        subtitle: `${park.state}, ${park.country}`,
        href: `/parks/${park.id}`,
      })),
      ...trails.map((trail) => ({
        id: trail.id,
        type: "trail" as const,
        name: trail.trail_name,
        latitude: trail.latitude,
        longitude: trail.longitude,
        subtitle: trail.park?.park_name,
        href: `/explore/trails/${trail.id}`,
      })),
    ];
  } catch {
    // empty markers
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <MapPageClient markers={markers} />
    </div>
  );
}
