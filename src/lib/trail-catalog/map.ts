import type { CatalogBounds, CatalogMapPoint, CatalogMapResult, CatalogTrail } from "./types";

export const MAX_MAP_POINTS = 160;
export const normalizeLongitude = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;

export function withinBounds(longitude: number, latitude: number, [west, south, east, north]: CatalogBounds) {
  const inLongitude = west <= east ? longitude >= west && longitude <= east : longitude >= west || longitude <= east;
  return latitude >= south && latitude <= north && inLongitude;
}

/** The shortest longitudinal extent also handles sections on either side of the date line. */
export function catalogBounds(trails: CatalogTrail[]): CatalogBounds | null {
  if (!trails.length) return null;
  const longitudes = trails.map(trail => normalizeLongitude(trail.longitude)).sort((a, b) => a - b);
  let gap = -1;
  let start = 0;
  for (let i = 0; i < longitudes.length; i++) {
    const next = i + 1 < longitudes.length ? longitudes[i + 1] : longitudes[0] + 360;
    if (next - longitudes[i] > gap) { gap = next - longitudes[i]; start = (i + 1) % longitudes.length; }
  }
  const west = longitudes[start];
  const east = west + (360 - gap);
  let south = 90, north = -90;
  for (const trail of trails) { south = Math.min(south, trail.latitude); north = Math.max(north, trail.latitude); }
  return [west, south, east, north];
}

/** Send a bounded, geographically representative map instead of the first search page. */
export function buildCatalogMap(trails: CatalogTrail[]): CatalogMapResult {
  const bounds = catalogBounds(trails);
  if (!bounds) return { points: [], total: 0, bounds: null, grouped: false };
  if (trails.length <= MAX_MAP_POINTS) {
    return { points: trails.map(trail => ({ id: trail.id, latitude: trail.latitude, longitude: trail.longitude, count: 1, trail })), total: trails.length, bounds, grouped: false };
  }
  const [west, south, east, north] = bounds;
  const width = Math.max(east - west, 0.00001), height = Math.max(north - south, 0.00001);
  const columns = 16, rows = 10;
  const cells = new Map<string, CatalogTrail[]>();
  for (const trail of trails) {
    const longitude = trail.longitude < west ? trail.longitude + 360 : trail.longitude;
    const x = Math.min(columns - 1, Math.floor((longitude - west) / width * columns));
    const y = Math.min(rows - 1, Math.floor((trail.latitude - south) / height * rows));
    const key = `${x}:${y}`;
    const group = cells.get(key);
    if (group) group.push(trail); else cells.set(key, [trail]);
  }
  const points: CatalogMapPoint[] = [...cells].map(([id, group]) => {
    if (group.length === 1) return { id: group[0].id, latitude: group[0].latitude, longitude: group[0].longitude, count: 1, trail: group[0] };
    const extent = catalogBounds(group)!;
    return { id: `group-${id}`, count: group.length, longitude: normalizeLongitude((extent[0] + extent[2]) / 2), latitude: (extent[1] + extent[3]) / 2, bounds: extent };
  });
  return { points, total: trails.length, bounds, grouped: true };
}
