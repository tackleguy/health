import type { CatalogTrail } from "./types";

/** Winter-only / motorized names that often appear in the hiking-oriented catalog. */
const WINTER_ACTIVITY =
  /\b(ski(ing)?|skier|nordic|cross[\s-]?country|\bx-?c\b|snowshoe(ing)?|snow[\s-]?mobile|snowmobile|snowmobiling|groomed\s+ski|ski\s+trail|ski\s+loop)\b/i;

const PLACE_FALSE_POSITIVE =
  /\b(snow\s+(canyon|creek|lake|peak|mountain|river|pass|basin|valley)|muskie|skinner|skiing\s+eagle)\b/i;

/**
 * True when a catalog section is primarily a winter or snowmobile route
 * rather than a hiking trail (name/manager heuristics — no activity field exists).
 */
export function isWinterActivityTrail(trail: Pick<CatalogTrail, "name" | "manager">): boolean {
  const haystack = `${trail.name} ${trail.manager ?? ""}`;
  if (PLACE_FALSE_POSITIVE.test(haystack)) return false;
  return WINTER_ACTIVITY.test(haystack);
}
