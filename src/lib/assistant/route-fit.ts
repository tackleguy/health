import { expandRegion, normalizeRegion, regionMatches } from "./regions";
import type { PlannerGear, PlannerProfile, RouteCandidate, TripRequest } from "./types";

export interface RouteFitPreferences {
  usualMilesPerDay?: number | null;
  experience?: PlannerProfile["experience"];
  packOverTarget?: boolean;
}
export function rankRoutes(request: TripRequest, routes: RouteCandidate[], preferences: RouteFitPreferences = {}) {
  const target = request.distanceMiles;
  if (request.locationMode === "near") return []; // Guide entries have no verified coordinates. Nearby results come from the mapped catalog.
  if (!request.region.trim() || target === null || !Number.isFinite(target) || target <= 0) return [];
  const days = request.days && Number.isFinite(request.days) && request.days > 0 ? request.days : null;
  const usual = preferences.usualMilesPerDay && preferences.usualMilesPerDay > 0 && Number.isFinite(preferences.usualMilesPerDay) ? preferences.usualMilesPerDay : null;
  const tolerance = Math.max(0.5, target * 0.3);
  return routes.filter(route => Number.isFinite(route.distanceMiles) && route.distanceMiles > 0 && regionMatches(request.region, route.region))
    .map(route => {
      const difference = Math.abs(route.distanceMiles - target);
      const dailyMiles = days ? route.distanceMiles / days : null;
      const aboveUsual = dailyMiles && usual ? Math.max(0, dailyMiles / usual - 1) : 0;
      const strenuous = /hard|expert|strenuous|difficult/i.test(route.difficulty);
      const cautions = [
        ...(aboveUsual > 0 ? [`${Math.round(aboveUsual * 100)}% above your usual ${usual!.toFixed(1)} mi/day.`] : []),
        ...(preferences.experience === "new" && strenuous ? ["Strenuous terrain: review this against your overnight experience."] : []),
        ...(preferences.packOverTarget && strenuous ? ["Your selected pack already exceeds your carrying target; allow for the extra effort on this terrain."] : []),
      ];
      const reasons = [
        difference < 0.05 ? "Matches your distance target." : `${difference.toFixed(1)} mi ${route.distanceMiles < target ? "shorter" : "longer"} than your target.`,
        ...(dailyMiles !== null && usual !== null && aboveUsual === 0 ? [`At or below your usual ${usual.toFixed(1)} mi/day.`] : []),
      ];
      // A transparent ordering heuristic, not a probability of suitability.
      const score = difference / target * 40 + aboveUsual * 60 + (preferences.experience === "new" && strenuous ? 15 : 0) + (preferences.packOverTarget && strenuous ? 10 : 0);
      return { route, difference, dailyMiles, reasons, cautions, suggestedDays: aboveUsual > 0 && usual ? Math.ceil(route.distanceMiles / usual) : null, score };
    })
    .filter(match => match.difference <= tolerance)
    .sort((a, b) => a.score - b.score || a.difference - b.difference || (a.route.sourceUrl ? -1 : 1) - (b.route.sourceUrl ? -1 : 1) || a.route.name.localeCompare(b.route.name))
    .filter((match, index, all) => all.findIndex(other => other.route.id === match.route.id || (normalizeRegion(other.route.name) === normalizeRegion(match.route.name) && expandRegion(other.route.region) === expandRegion(match.route.region) && Math.abs(other.route.distanceMiles - match.route.distanceMiles) < 0.1)) === index)
    .slice(0, 5);
}

export function gearResearchGaps(gear: PlannerGear[], request: TripRequest) {
  const selected = gear.filter(g => g.qty > 0);
  const gaps: string[] = [];
  if (!selected.length) return ["Add the gear you plan to carry so the route comparison can include your pack."];
  if (request.days && request.days > 1) {
    for (const category of ["Shelter", "Sleep System"] as const) if (!selected.some(g => g.category === category)) gaps.push(`${category} is not categorized in your selected gear. Review it for an overnight trip.`);
  }
  const uncertain = selected.filter(g => g.sourceNote);
  if (uncertain.length) gaps.push(`${uncertain.length} ${uncertain.length === 1 ? "item has" : "items have"} recovered or unverified specifications. Check the values before relying on the pack total.`);
  return gaps;
}
