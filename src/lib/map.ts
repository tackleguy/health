import type { ActivityType } from "@/lib/types";

export function directionsUrl(lat: number, lng: number, label?: string): string {
  const dest = `${lat},${lng}`;
  const params = new URLSearchParams({ api: "1", destination: dest });
  if (label) params.set("destination_place_id", label);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceAway(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.2) return `${Math.round(km * 1000)} m`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export interface MapCluster<T> {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  items: T[];
}

/** Grid cluster for AllTrails-style count bubbles */
export function clusterByGrid<T extends { latitude: number; longitude: number }>(
  items: T[],
  cellDeg: number,
): MapCluster<T>[] {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const gx = Math.floor(item.longitude / cellDeg);
    const gy = Math.floor(item.latitude / cellDeg);
    const key = `${gx}:${gy}`;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  return [...buckets.entries()].map(([key, group]) => {
    const latitude = group.reduce((s, i) => s + i.latitude, 0) / group.length;
    const longitude = group.reduce((s, i) => s + i.longitude, 0) / group.length;
    return { id: key, latitude, longitude, count: group.length, items: group };
  });
}

export function cellSizeForZoom(zoom: number): number {
  if (zoom >= 12) return 0;
  if (zoom >= 9) return 0.35;
  if (zoom >= 6) return 1.2;
  return 3.5;
}

export function activityForTrail(difficulty: string): ActivityType {
  return difficulty === "easy" ? "run" : "hike";
}

export function recordUrl(
  activity: ActivityType,
  opts?: { trailId?: string; resortId?: string; resortName?: string },
): string {
  const params = new URLSearchParams({ type: activity });
  if (opts?.trailId) params.set("trail_id", opts.trailId);
  if (opts?.resortId) {
    params.set("resort_id", opts.resortId);
    if (opts.resortName) params.set("resort_name", opts.resortName);
  }
  return `/record/live?${params}`;
}
