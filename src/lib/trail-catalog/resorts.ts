import type { CatalogTrail } from "./types";
import { namesAgree } from "./verify";
import { metersBetween } from "./quality";
import { MIN_NEW_TRAIL_MILES } from "./additions";

/** One resort's official summer trail list, as collected into data/trail-catalog/resort-trails.json. */
export interface ResortTrailSource {
  resort: string;
  state: string;
  baseLatitude: number;
  baseLongitude: number;
  coordinatesSource: string;
  sourceUrl: string;
  season: string;
  note?: string;
  trails: {
    name: string;
    miles: number;
    lengthBasis: "one-way" | "round-trip" | "loop" | "unstated";
    difficulty: string | null;
    use: "hike" | "hike+bike";
    /** Exact wording on the resort's page, kept as evidence. */
    quote: string;
    /** Set when a fetch of sourceUrl found the name and this length together in the page text. */
    verifiedOnPage?: boolean;
  }[];
}

/** A mapped catalog trail with the same name this close to the resort base is the same trail. */
const SAME_TRAIL_METERS = 10_000;
const slug = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const BASIS: Record<ResortTrailSource["trails"][number]["lengthBasis"], string> = {
  "one-way": "one way",
  "round-trip": "round trip",
  loop: "loop",
  unstated: "the resort doesn't say one way or round trip",
};

/**
 * Trails a resort lists on its summer trail map. The resort gives names and lengths but no coordinates,
 * so these rows have no route line and are pinned at the resort's base area. A resort trail that is
 * already mapped in the catalog (same name, within 10 km) is not listed twice.
 */
export function buildResortOverlay(sources: ResortTrailSource[], mapped: CatalogTrail[]): CatalogTrail[] {
  const out: CatalogTrail[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const base: [number, number] = [source.baseLongitude, source.baseLatitude];
    const nearby = mapped.filter((row) => row.country === "US" && metersBetween(base, [row.longitude, row.latitude]) <= SAME_TRAIL_METERS);
    for (const trail of source.trails) {
      if (!(trail.miles >= MIN_NEW_TRAIL_MILES) || !trail.name.trim()) continue;
      if (nearby.some((row) => namesAgree(trail.name, row.name))) continue;
      const id = `resort-${slug(source.resort)}-${slug(trail.name)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        name: trail.name.trim(),
        country: "US",
        region: source.state,
        kind: "segment",
        miles: trail.miles,
        distanceBasis: "source",
        latitude: source.baseLatitude,
        longitude: source.baseLongitude,
        difficulty: trail.difficulty,
        dogs: null,
        source: "resort",
        sourceId: `${slug(source.resort)}/${slug(trail.name)}`,
        sourceUrl: source.sourceUrl,
        officialUrl: source.sourceUrl,
        sourceDate: null,
        manager: source.resort,
        surface: null,
        season: `Summer (listed for ${source.season})`,
        geometryShard: "none",
        quality: "ok",
        tags: ["resort trail", "ski resort", "summer", ...(trail.use === "hike+bike" ? ["multi-use", "bike"] : [])],
        note: `Listed on ${source.resort}’s official summer trail information (${source.season}). The length is the resort’s own figure (${BASIS[trail.lengthBasis]}). The resort doesn’t publish coordinates, so the route isn’t drawn; the pin marks the resort base area.`,
      });
    }
  }
  return out;
}
