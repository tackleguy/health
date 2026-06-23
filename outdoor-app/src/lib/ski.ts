export interface SkiArea {
  id: string;
  name: string;
  country?: string;
  region?: string;
  lat: number;
  lng: number;
  runs_count?: number;
  lifts_count?: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_SKI_API_URL ?? "https://api.openskimap.org";

interface GeoFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

function centroidFromGeometry(geometry?: GeoFeature["geometry"]): {
  lat: number;
  lng: number;
} {
  if (!geometry) return { lat: 0, lng: 0 };

  let coords: number[][] = [];

  if (geometry.type === "Point") {
    const c = geometry.coordinates as number[];
    return { lng: c[0], lat: c[1] };
  }

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as unknown as number[][][];
    coords = rings[0] ?? [];
  } else if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as unknown as number[][][][];
    coords = polys[0]?.[0] ?? [];
  } else if (geometry.type === "LineString") {
    coords = geometry.coordinates as unknown as number[][];
  }

  if (coords.length === 0) return { lat: 0, lng: 0 };

  const sum = coords.reduce(
    (acc, c) => ({ lng: acc.lng + c[0], lat: acc.lat + c[1] }),
    { lng: 0, lat: 0 },
  );

  return { lng: sum.lng / coords.length, lat: sum.lat / coords.length };
}

function parseFeature(feature: GeoFeature): SkiArea | null {
  const props = feature.properties ?? {};
  const id = String(props.id ?? "");
  const name = String(props.name ?? "");
  if (!id || !name) return null;

  const { lat, lng } = centroidFromGeometry(feature.geometry);

  const places = props.places as
    | { localized?: { en?: { region?: string; country?: string } } }[]
    | undefined;
  const place = places?.[0]?.localized?.en;

  const stats = props.statistics as
    | { runs?: { count?: number }; lifts?: { count?: number } }
    | undefined;

  return {
    id,
    name,
    country: place?.country,
    region: place?.region,
    lat,
    lng,
    runs_count: stats?.runs?.count,
    lifts_count: stats?.lifts?.count,
  };
}

export async function searchSkiAreas(query: string, limit = 8): Promise<SkiArea[]> {
  const term = query.trim();
  if (!term) return [];

  try {
    const res = await fetch(
      `${API_BASE}/search?query=${encodeURIComponent(term)}&limit=${limit}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];

    const data = (await res.json()) as GeoFeature[];
    if (!Array.isArray(data)) return [];

    return data
      .map(parseFeature)
      .filter((a): a is SkiArea => a !== null && a.lat !== 0 && a.lng !== 0);
  } catch {
    return [];
  }
}

export async function getSkiArea(id: string): Promise<SkiArea | null> {
  const areas = await searchSkiAreas(id, 5);
  return areas.find((a) => a.id === id) ?? areas[0] ?? null;
}
