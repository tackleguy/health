export interface CatalogTrail {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code (US, CA, FR, …). */
  country: string;
  region: string | null;
  kind: "segment" | "route";
  miles: number | null;
  distanceBasis: "source" | "geometry";
  latitude: number;
  longitude: number;
  difficulty: string | null;
  dogs: boolean | null;
  source: "usgs" | "parks-canada" | "ontario" | "guide" | "route-aggregate";
  sourceId: string;
  sourceUrl: string;
  officialUrl: string | null;
  sourceDate: string | null;
  manager: string | null;
  surface: string | null;
  season: string | null;
  geometryShard: string;
  /** Through-hike route metadata (optional). */
  sectionCount?: number;
  mappedMiles?: number;
  note?: string;
  tags?: string[];
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
  /** When true, keep ski/snowshoe/snowmobile-named sections. Default excludes them. */
  includeWinter?: boolean;
  /** segment = mapped sections; route = through-hikes / curated guides. */
  kind?: "segment" | "route";
  /** Collapse same-name sections to the longest one (routes always kept). */
  uniqueNames?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  targetMiles?: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  FR: "France",
  IT: "Italy",
  CH: "Switzerland",
  SE: "Sweden",
  CL: "Chile",
  IS: "Iceland",
  NP: "Nepal",
  PE: "Peru",
  NZ: "New Zealand",
  AU: "Australia",
  TZ: "Tanzania",
  ES: "Spain",
  GR: "Greece",
  TR: "Turkey",
  BT: "Bhutan",
  ZA: "South Africa",
  AR: "Argentina",
};

export const countryName = (country: string) => COUNTRY_NAMES[country] ?? country;

const SOURCE_NAMES: Record<CatalogTrail["source"], string> = {
  usgs: "USGS",
  "parks-canada": "Parks Canada",
  ontario: "Ontario Trail Network",
  guide: "Curated guide",
  "route-aggregate": "Mapped corridor",
};

export const sourceName = (source: CatalogTrail["source"]) => SOURCE_NAMES[source] ?? source;

export function displayMiles(miles: number | null) {
  return miles === null ? "Distance unknown" : `${miles < 0.1 ? "<0.1" : miles.toFixed(1)} mi`;
}
