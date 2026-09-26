import type { CatalogTrail } from "./types";
import { isWinterActivityTrail } from "./winter";

/** Trail-search activity filters (catalog heuristics — sources are hiking-first). */
export type CatalogActivity = "hike" | "backpack" | "bike" | "run" | "ski";
/** Internal / explicit “no activity filter” for winter-inclusive browse. */
export type CatalogActivityFilter = CatalogActivity | "all";

export const CATALOG_ACTIVITIES: readonly CatalogActivity[] = [
  "hike",
  "backpack",
  "bike",
  "run",
  "ski",
] as const;

export const CATALOG_ACTIVITY_LABELS: Record<CatalogActivity, string> = {
  hike: "Hiking",
  backpack: "Backpacking",
  bike: "Biking",
  run: "Trail running",
  ski: "Ski",
};

const BIKE =
  /\b(bike|biking|bicycl(?:e|ing)|cycling|cyclist|mtb|mountain[\s-]?bike|rail[\s-]?trail|greenway|bike[\s-]?path|bike[\s-]?way)\b/i;
const RUN =
  /\b(trail[\s-]?run(?:ning)?|running|runner|jog(?:ging)?|footing)\b/i;
const BACKPACK =
  /\b(backpack(?:ing)?|thru[\s-]?hike|through[\s-]?hike|long[\s-]?distance|overnight|multi[\s-]?day|wilderness)\b/i;
const SKI =
  /\b(ski(?:ing)?|skier|nordic|cross[\s-]?country|\bx-?c\b|groomed\s+ski|ski\s+trail|ski\s+loop)\b/i;
const SNOWMOBILE = /\b(snow[\s-]?mobile|snowmobile|snowmobiling)\b/i;
/** Bike-primary names that are usually not advertised as hiking. */
const BIKE_PRIMARY =
  /\b(mountain[\s-]?bike|\bmtb\b|bike[\s-]?only|cycling|bicycle)\b/i;

function haystack(trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface">) {
  return [trail.name, trail.manager ?? "", trail.surface ?? "", ...(trail.tags ?? [])].join(" ");
}

export function isBikeActivityTrail(trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface">) {
  return BIKE.test(haystack(trail));
}

export function isRunActivityTrail(trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface">) {
  return RUN.test(haystack(trail));
}

export function isBackpackActivityTrail(
  trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface" | "kind" | "miles">,
) {
  if (trail.kind === "route") return true;
  if (BACKPACK.test(haystack(trail))) return true;
  return trail.miles !== null && trail.miles >= 15;
}

export function isSkiActivityTrail(trail: Pick<CatalogTrail, "name" | "manager">) {
  if (!isWinterActivityTrail(trail)) return false;
  const text = `${trail.name} ${trail.manager ?? ""}`;
  if (SNOWMOBILE.test(text) && !SKI.test(text)) return false;
  return SKI.test(text) || isWinterActivityTrail(trail);
}

/** Activities a catalog row is suitable for (best-effort from name and length). */
export function trailActivities(
  trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface" | "kind" | "miles">,
): CatalogActivity[] {
  const text = haystack(trail);
  const out: CatalogActivity[] = [];
  if (isSkiActivityTrail(trail)) out.push("ski");
  if (isBikeActivityTrail(trail)) out.push("bike");
  if (isRunActivityTrail(trail)) out.push("run");
  if (isBackpackActivityTrail(trail)) out.push("backpack");
  // Hiking-first catalog: non-winter foot travel stays hikeable. Pure bike names stay bike-only.
  const multiUse =
    /\b(hike|hiking|foot|pedestrian|walk(?:ing)?|multi[\s-]?use)\b/i.test(text) ||
    (!isBikeActivityTrail(trail) && !isWinterActivityTrail(trail));
  if (!isWinterActivityTrail(trail) && multiUse && !BIKE_PRIMARY.test(text)) out.push("hike");
  // Trail runners share most hiking paths when nothing is run-specific.
  if (out.includes("hike") && !out.includes("run") && trail.kind === "segment" && (trail.miles === null || trail.miles <= 20)) {
    out.push("run");
  }
  return out.length ? out : ["hike"];
}

export function matchesCatalogActivity(
  trail: Pick<CatalogTrail, "name" | "manager" | "tags" | "surface" | "kind" | "miles">,
  activity: CatalogActivity,
): boolean {
  return trailActivities(trail).includes(activity);
}

export function parseCatalogActivity(value: string | null | undefined): CatalogActivityFilter | undefined {
  const raw = value?.trim().toLowerCase();
  if (raw === "all") return "all";
  return CATALOG_ACTIVITIES.includes(raw as CatalogActivity) ? (raw as CatalogActivity) : undefined;
}
