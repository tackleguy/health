import type { RawTrailRecord } from "../types";

function coordsFromGeometry(geometry: GeoJSON.Geometry): [number, number, number?][] {
  switch (geometry.type) {
    case "LineString":
      return geometry.coordinates as [number, number, number?][];
    case "MultiLineString":
      return geometry.coordinates.flat() as [number, number, number?][];
    default:
      return [];
  }
}

function propsString(props: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = props[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function mapDifficulty(raw?: string): "easy" | "moderate" | "hard" | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes("easy") || v === "0" || v === "1") return "easy";
  if (v.includes("hard") || v.includes("difficult") || v === "3") return "hard";
  return "moderate";
}

export function parseGeoJsonTrails(input: unknown): RawTrailRecord[] {
  const features: GeoJSON.Feature[] = [];

  if (input && typeof input === "object") {
    const obj = input as GeoJSON.FeatureCollection | GeoJSON.Feature;
    if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
      features.push(...obj.features);
    } else if (obj.type === "Feature") {
      features.push(obj);
    }
  }

  const trails: RawTrailRecord[] = [];

  for (const feature of features) {
    if (!feature.geometry) continue;
    const coordinates = coordsFromGeometry(feature.geometry);
    if (coordinates.length < 2) continue;

    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const name =
      propsString(props, "name", "trail_name", "TRAIL_NAME", "TRLNAME", "MAPLABEL", "FULL_NAME")?.trim();
    if (!name) continue;

    trails.push({
      externalId: propsString(props, "id", "osm_id", "OBJECTID", "@id"),
      name,
      description: propsString(props, "description", "DESC", "trail_desc"),
      difficulty: mapDifficulty(
        propsString(props, "difficulty", "DIFFICULTY", "hiking_difficulty", "TRLCLASS"),
      ),
      lengthMiles: typeof props.length_miles === "number" ? props.length_miles : undefined,
      routeType: propsString(props, "route_type", "ROUTE_TYPE"),
      trailType: propsString(props, "highway", "trail_type", "TRAIL_TYPE", "TRLTYPE", "TRLFEATTYPE") ?? "hiking",
      surface: propsString(props, "surface", "SURFACE", "TRLSURFACE"),
      allowsDogs: props.dog === "yes" || props.dogs === "yes" ? true : undefined,
      officialSource: propsString(props, "source", "official_source"),
      confidenceScore: "source_reported",
      coordinates,
      properties: props,
    });
  }

  return trails;
}

export function geoJsonLineString(
  coordinates: [number, number, number?][],
): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: coordinates.map(([lng, lat, ele]) =>
      ele != null ? [lng, lat, ele] : [lng, lat],
    ),
  };
}
