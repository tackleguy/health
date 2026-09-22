import type { ActivitySummary, PlannerGear, PlannerProfile, RouteCandidate, SavedPlan, TripRequest } from "./types";

export const REFERENCES = {
  packing: "https://www.rei.com/learn/expert-advice/loading-backpack.html",
  essentials: "https://www.nps.gov/articles/10essentials.htm",
  weight: "https://www.rei.com/learn/expert-advice/backpacking-weight.html",
};
export const EMPTY_REQUEST: TripRequest = { distanceMiles: null, days: null, region: "", startDate: "", lowTempF: null, waterLiters: null, foodOzPerDay: null, fuelOz: null, suppliesInGear: false };
export const EMPTY_PROFILE: PlannerProfile = { usualMilesPerDay: null, comfortablePackLb: null, packCapacityL: null, experience: "some", priorities: "" };
export function optionalNumber(value: string, min = 0, max = 10000): number | null {
  if (!value.trim()) return null;
  const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export function parseTripRequest(text: string): TripRequest {
  const distance = text.match(/\b(\d+(?:\.\d+)?)\s*(?:-\s*)?(miles?|mi\b|kilometers?|kilometres?|km\b)/i);
  const days = text.match(/\b(\d+)\s*(?:-\s*)?days?\b/i);
  const nights = text.match(/\b(\d+)\s*(?:-\s*)?nights?\b/i);
  const region = text.match(/\b(?:in|near|around)\s+([a-z][a-z\s,'-]*?)(?=\s+(?:with|for|during|on|starting|and)\b|[.!?;]|$)/i)?.[1]?.trim() ?? "";
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? "";
  const miles = distance ? Number(distance[1]) * (/^k/i.test(distance[2]) ? 0.621371 : 1) : null;
  const dayCount = days ? Number(days[1]) : nights ? Number(nights[1]) + 1 : null;
  return { ...EMPTY_REQUEST, distanceMiles: miles && miles <= 10000 ? Math.round(miles * 10) / 10 : null, days: dayCount && dayCount <= 365 ? dayCount : null, region: region.slice(0, 100), startDate: date };
}
export function inferHistory(profile: PlannerProfile, plans: SavedPlan[], activities: ActivitySummary[]) {
  const completed = plans.filter(p => p.feedback);
  const comfortable = completed.filter(p => p.feedback?.packComfort === "comfortable" && p.feedback.carriedLb != null).map(p => p.feedback!.carriedLb!);
  const typical = completed.filter(p => p.feedback?.effort === "right" || p.feedback?.effort === "easy").flatMap(p => p.request.distanceMiles && p.request.days ? [(p.route?.distanceMiles ?? p.request.distanceMiles) / p.request.days] : []);
  const median = (values: number[]) => { const sorted = [...values].sort((a,b) => a-b); const mid = Math.floor(sorted.length / 2); return sorted.length ? sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2 : null; };
  return {
    usualMilesPerDay: profile.usualMilesPerDay ?? median(typical),
    comfortablePackLb: profile.comfortablePackLb ?? median(comfortable),
    basis: profile.comfortablePackLb != null ? "Your preferred carrying target" : comfortable.length ? `From ${comfortable.length} trips you marked comfortable` : "Add your comfortable carrying weight",
    activityCount: activities.length,
    typicalRecordedHike: median(activities.map(a => a.miles)),
    completedCount: completed.length,
  };
}
const normalized = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const regions: Record<string, string> = { co: "colorado", ca: "california", wa: "washington", wy: "wyoming", ut: "utah", az: "arizona", or: "oregon" };
export function rankRoutes(request: TripRequest, routes: RouteCandidate[]) {
  const region = regions[normalized(request.region)] ?? normalized(request.region);
  if (!region || !request.distanceMiles) return [];
  const tokens = region.split(" ").filter(t => t.length > 1);
  return routes.filter(r => tokens.every(t => normalized(`${r.region} ${r.name}`).includes(t)))
    .map(route => ({ route, difference: Math.abs(route.distanceMiles - request.distanceMiles!) }))
    .filter(r => r.difference <= Math.max(5, request.distanceMiles! * 0.3))
    .sort((a,b) => a.difference-b.difference).slice(0, 5);
}
export type PackingZone = "Bottom" | "Core" | "Top / quick access" | "Worn";
export function packingZone(gear: PlannerGear): PackingZone {
  if (gear.type === "Worn") return "Worn";
  if (/first.?aid|rain|headlamp|torch|snack|map|compass|filter|sunscreen|bear spray/i.test(gear.name) || gear.category === "Navigation") return "Top / quick access";
  if (gear.category === "Sleep System") return "Bottom";
  if (gear.category === "Cooking" || gear.type === "Consumable" || /canister|water|food/i.test(gear.name)) return "Core";
  if (gear.category === "Clothing" || gear.category === "Electronics" || gear.category === "Hygiene") return "Top / quick access";
  return "Core";
}
export const ZONE_GUIDANCE: Record<PackingZone, string> = {
  Bottom: "Protect camp-only soft items from water and use them as the bottom cushion.",
  Core: "Keep dense gear close to your back and balance the load from side to side. Keep fuel secure and separate from food.",
  "Top / quick access": "Keep layers, navigation, first aid, lighting, and other on-trail items reachable without unpacking.",
  Worn: "These items are worn or carried outside the pack and are excluded from loaded-pack weight.",
};
/** A missing or invalid quantity cannot silently turn into a known item weight. */
export function gearWeightOz(gear: PlannerGear): number | null {
  if (gear.weightOz == null || !Number.isFinite(gear.weightOz) || gear.weightOz <= 0 || !Number.isInteger(gear.qty) || gear.qty < 1) return null;
  const weight = gear.weightOz * gear.qty;
  return Number.isFinite(weight) ? weight : null;
}
export function packReport(gear: PlannerGear[], request: TripRequest, targetLb: number | null) {
  let baseOz = 0, wornOz = 0, consumableOz = 0;
  const unknown: string[] = [];
  for (const g of gear) {
    const weight = gearWeightOz(g);
    if (weight === null) { unknown.push(g.name); continue; }
    if (g.type === "Base") baseOz += weight;
    else if (g.type === "Worn") wornOz += weight;
    else consumableOz += weight;
  }
  const amount = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0 ? value : null;
  const days = request.days !== null && Number.isInteger(request.days) && request.days > 0 ? request.days : null;
  const food = amount(request.foodOzPerDay), water = amount(request.waterLiters), fuel = amount(request.fuelOz);
  const extraFoodOz = request.suppliesInGear ? 0 : (food ?? 0) * (days ?? 0);
  const extraWaterOz = request.suppliesInGear ? 0 : (water ?? 0) * 35.274;
  const extraFuelOz = request.suppliesInGear ? 0 : fuel ?? 0;
  const suppliesOz = consumableOz + extraFoodOz + extraWaterOz + extraFuelOz;
  const loadedLb = (baseOz + suppliesOz) / 16;
  const missingSupplies = request.suppliesInGear ? [] : [food === null ? "food allowance" : "", days === null ? "trip days for food calculation" : "", water === null ? "water carry" : "", fuel === null ? "fuel allowance (enter 0 if none)" : ""].filter(Boolean);
  return { baseLb: baseOz/16, wornLb: wornOz/16, suppliesLb: suppliesOz/16, loadedLb, unknown, missingSupplies, consumableOz, extraFoodOz, extraWaterOz, extraFuelOz,
    complete: gear.length > 0 && !unknown.length && !missingSupplies.length && days !== null,
    targetLb, baseBudgetLb: targetLb == null || missingSupplies.length > 0 || gear.some(g => g.type === "Consumable" && gearWeightOz(g) === null) ? null : targetLb - suppliesOz/16,
    overTarget: targetLb != null && loadedLb > targetLb,
    duplicateSupplies: !request.suppliesInGear && consumableOz > 0 && (extraFoodOz > 0 || extraWaterOz > 0 || extraFuelOz > 0),
  };
}
export function followUpQuestions(request: TripRequest, profile: PlannerProfile, gear: PlannerGear[]) {
  const questions: string[] = [];
  if (!request.startDate) questions.push("When are you going? Dates affect conditions, access, and the gear you’ll need.");
  if (request.lowTempF === null) questions.push("What overnight low are you preparing for? Check a forecast for the route’s elevation.");
  if (profile.comfortablePackLb === null) questions.push("What loaded pack weight have you comfortably carried before?");
  if (profile.usualMilesPerDay === null) questions.push("How many miles per day usually feel comfortable on similar terrain?");
  if (!gear.length) questions.push("What equipment do you own? Add or import your gear to calculate your actual pack.");
  if (request.waterLiters === null && !request.suppliesInGear) questions.push("How much water will you carry between confirmed refill points?");
  return questions;
}
export function preparationChecks(request: TripRequest) {
  return [
    "Check permits, closures, access, and legal camping locations with the land manager.",
    "Confirm current weather, water availability and treatment, and a route you can navigate offline.",
    "Review navigation, sun protection, layers, lighting, first aid, fire tools where allowed, repair tools, extra food, water, and emergency shelter.",
    "Tell someone your route and expected return. Test your loaded pack before leaving.",
    ...(request.lowTempF != null && request.lowTempF <= 32 ? ["Freezing temperatures: verify the comfort rating of your sleep system and protection for water and filtration equipment."] : []),
  ];
}
