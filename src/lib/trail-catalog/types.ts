export interface CatalogTrail {
  id: string;
  name: string;
  country: "US" | "CA";
  region: string | null;
  kind: "segment";
  miles: number | null;
  distanceBasis: "source" | "geometry";
  latitude: number;
  longitude: number;
  difficulty: string | null;
  dogs: boolean | null;
  source: "usgs" | "parks-canada" | "ontario";
  sourceId: string;
  sourceUrl: string;
  officialUrl: string | null;
  sourceDate: string | null;
  manager: string | null;
  surface: string | null;
  season: string | null;
  geometryShard: string;
}
export interface CatalogManifest {
  version: number;
  generatedAt: string;
  total: number;
  countries: Record<string, number>;
  sources: { name: string; url: string; license: string; count: number; query: string; retrievedAt: string }[];
  regions: { name: string; country: string; count: number }[];
  indexSha256: string;
  excluded: Record<string, number>;
  notes: string[];
}
export type CatalogBounds = [west: number, south: number, east: number, north: number];
export interface CatalogMapPoint {
  id: string;
  longitude: number;
  latitude: number;
  count: number;
  bounds?: CatalogBounds;
  trail?: CatalogTrail;
}
export interface CatalogMapResult {
  points: CatalogMapPoint[];
  total: number;
  bounds: CatalogBounds | null;
  grouped: boolean;
}
export interface CatalogFilters {
  bbox?: CatalogBounds;
  q?: string;
  country?: string;
  region?: string;
  page?: number;
  limit?: number;
  minMiles?: number;
  maxMiles?: number;
  difficulty?: string;
  dogFriendly?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}
export const countryName = (country: string) => country === "CA" ? "Canada" : "United States";
export const sourceName = (source: CatalogTrail["source"]) => ({ usgs:"USGS", "parks-canada":"Parks Canada", ontario:"Ontario Trail Network" })[source];
export function displayMiles(miles: number | null) {
  return miles === null ? "Distance unknown" : `${miles < 0.1 ? "<0.1" : miles.toFixed(1)} mi`;
}
