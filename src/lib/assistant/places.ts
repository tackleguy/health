import type { TripPlace } from "./types";

/** Only mapped US/Canadian points are accepted; an ambiguous result is never silently picked. */
export function parsePlaces(data: unknown): TripPlace[] {
  if (!data || typeof data !== "object" || !("features" in data) || !Array.isArray(data.features)) return [];
  return data.features.flatMap(feature => {
    const p = feature?.properties;
    const coordinates = feature?.geometry?.coordinates;
    if (!p || !["US", "CA"].includes(String(p.countrycode).toUpperCase()) || !Array.isArray(coordinates)) return [];
    const [longitude, latitude] = coordinates;
    if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const name = [...new Set([p.name, p.city, p.state, p.country].filter(v => typeof v === "string" && v.trim()))].join(", ").slice(0, 250);
    if (!name) return [];
    return [{ id: `${p.osm_type}:${p.osm_id}:${latitude}:${longitude}`, name, latitude, longitude }];
  }).filter((p, i, all) => all.findIndex(other => (other.id === p.id || (other.name === p.name && Math.abs(other.latitude - p.latitude) < .02 && Math.abs(other.longitude - p.longitude) < .02))) === i).slice(0, 6);
}
