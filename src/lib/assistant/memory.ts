import { cleanProductDetails } from "./product-details";
import { CATEGORY_ORDER } from "@/lib/gear";
import { EMPTY_PROFILE, EMPTY_REQUEST } from "./planning";
import type { PlannerGear, PlannerMemory, PlannerProfile, SavedPlan, TripRequest } from "./types";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (v: unknown, max = 1000) => typeof v === "string" ? v.slice(0, max) : "";
const num = (v: unknown, min = 0, max = 10000) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
export const memoryKey = (userId: string | null) => `outdoor-os:planner:v1:${userId ?? "guest"}`;
export const emptyMemory = (): PlannerMemory => ({ version: 1, profile: { ...EMPTY_PROFILE }, gear: [], plans: [] });
export function cleanGear(value: unknown): PlannerGear | null {
  const g = object(value);
  if (!str(g.id) || !str(g.name)) return null;
  return { ...cleanProductDetails(g), id: str(g.id, 160), name: str(g.name, 180), category: CATEGORY_ORDER.includes(g.category as PlannerGear["category"]) ? g.category as PlannerGear["category"] : "Misc", type: ["Base", "Worn", "Consumable"].includes(String(g.type)) ? g.type as PlannerGear["type"] : "Base", qty: Math.floor(num(g.qty, 1, 1000) ?? 1), weightOz: num(g.weightOz, 0.001, 16000), packedSize: str(g.packedSize, 160) || null, sourceUrl: /^https:\/\//i.test(str(g.sourceUrl)) ? str(g.sourceUrl, 2000) : null };
}
export function cleanRequest(value: unknown): TripRequest {
  const r = object(value);
  return { ...EMPTY_REQUEST, distanceMiles: num(r.distanceMiles, 0.1), days: num(r.days, 1, 365) === null ? null : Math.floor(Number(r.days)), region: str(r.region, 100), startDate: /^\d{4}-\d{2}-\d{2}$/.test(str(r.startDate)) ? str(r.startDate) : "", lowTempF: num(r.lowTempF, -80, 130), waterLiters: num(r.waterLiters, 0, 100), foodOzPerDay: num(r.foodOzPerDay, 0, 300), fuelOz: num(r.fuelOz, 0, 1000), suppliesInGear: r.suppliesInGear === true };
}
export function parseMemory(raw: string | null): PlannerMemory {
  if (!raw) return emptyMemory();
  try {
    const m = object(JSON.parse(raw));
    if (m.version !== 1) return emptyMemory();
    const p = object(m.profile);
    const profile: PlannerProfile = { usualMilesPerDay: num(p.usualMilesPerDay, 0.1, 100), comfortablePackLb: num(p.comfortablePackLb, 1, 150), packCapacityL: num(p.packCapacityL, 1, 200), experience: p.experience === "new" || p.experience === "experienced" ? p.experience : "some", priorities: str(p.priorities, 500) };
    const gear = (Array.isArray(m.gear) ? m.gear : []).map(cleanGear).filter((g): g is PlannerGear => Boolean(g)).slice(0, 500);
    const plans: SavedPlan[] = (Array.isArray(m.plans) ? m.plans : []).slice(0, 30).flatMap(value => {
      const plan = object(value); if (!str(plan.id) || !str(plan.savedAt)) return [];
      const route = object(plan.route); const feedback = object(plan.feedback);
      return [{ id: str(plan.id), prompt: str(plan.prompt, 1500), request: cleanRequest(plan.request), route: route.id && route.name && num(route.distanceMiles, 0.1) ? { id: str(route.id), name: str(route.name, 180), region: str(route.region, 200), distanceMiles: Number(route.distanceMiles), elevationFt: num(route.elevationFt, 0, 100000), difficulty: str(route.difficulty, 30), sourceUrl: /^https:\/\//i.test(str(route.sourceUrl)) ? str(route.sourceUrl, 2000) : null, sourceLabel: str(route.sourceLabel, 100), note: str(route.note), ...(typeof route.trailId === "string" ? { trailId: str(route.trailId, 160) } : {}) } : null, gear: (Array.isArray(plan.gear) ? plan.gear : []).map(cleanGear).filter((g): g is PlannerGear => Boolean(g)).slice(0, 500), packedIds: (Array.isArray(plan.packedIds) ? plan.packedIds : []).filter((id): id is string => typeof id === "string").slice(0, 500), savedAt: str(plan.savedAt), feedback: ["easy", "right", "hard"].includes(String(feedback.effort)) && ["comfortable", "too-heavy"].includes(String(feedback.packComfort)) ? { effort: feedback.effort as "easy"|"right"|"hard", packComfort: feedback.packComfort as "comfortable"|"too-heavy", carriedLb: num(feedback.carriedLb, 1, 150), notes: str(feedback.notes, 500) } : null }];
    });
    return { version: 1, profile, gear, plans };
  } catch { return emptyMemory(); }
}
