import type { RawTrailRecord } from "../types";

interface OsmElement {
  type: "way" | "node" | "relation";
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; ref: number; role: string }[];
}

interface OsmJsonResponse {
  elements: OsmElement[];
}

const TRAIL_HIGHWAYS = new Set([
  "path",
  "footway",
  "bridleway",
  "steps",
  "track",
]);

function isHikingTrail(tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  if (tags.route === "hiking") return true;
  if (tags["route:hiking"]) return true;
  if (tags.highway && TRAIL_HIGHWAYS.has(tags.highway)) return true;
  if (tags.sac_scale) return true;
  return false;
}

function mapDifficulty(tags: Record<string, string>): "easy" | "moderate" | "hard" | undefined {
  const raw = tags.difficulty ?? tags["hiking:difficulty"] ?? tags.sac_scale ?? "";
  const v = raw.toLowerCase();
  if (!v) return undefined;
  if (v.includes("easy") || v === "hiking" || v === "t1" || v === "t2") return "easy";
  if (v.includes("hard") || v.includes("difficult") || v === "t5" || v === "t6") return "hard";
  return "moderate";
}

export function parseOsmJsonTrails(input: unknown): RawTrailRecord[] {
  const data = input as OsmJsonResponse;
  if (!data?.elements?.length) return [];

  const trails: RawTrailRecord[] = [];

  for (const element of data.elements) {
    if (element.type !== "way") continue;
    if (!element.geometry || element.geometry.length < 2) continue;
    if (!isHikingTrail(element.tags)) continue;

    const name = element.tags?.name?.trim();
    if (!name) continue;

    const coordinates: [number, number, number?][] = element.geometry.map((pt) => [
      pt.lon,
      pt.lat,
    ]);

    trails.push({
      externalId: `way/${element.id}`,
      name,
      description: element.tags?.description,
      difficulty: mapDifficulty(element.tags ?? {}),
      trailType: element.tags?.highway ?? "path",
      surface: element.tags?.surface,
      allowsDogs:
        element.tags?.dog === "yes" || element.tags?.dogs === "yes"
          ? true
          : element.tags?.dog === "no" || element.tags?.dogs === "no"
            ? false
            : undefined,
      officialSource: "OpenStreetMap",
      confidenceScore: "source_reported",
      coordinates,
      properties: { ...(element.tags ?? {}), osm_type: "way", osm_id: element.id },
    });
  }

  return trails;
}

export function buildOverpassQuery(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): string {
  const { south, west, north, east } = bbox;
  return `
[out:json][timeout:120];
(
  way["highway"~"path|footway|steps|track"]["name"](${south},${west},${north},${east});
  way["route"="hiking"]["name"](${south},${west},${north},${east});
);
out geom;
`.trim();
}
