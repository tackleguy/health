import { followUpQuestions, inferHistory, packReport, packingZone } from "./planning";
import type { PlannerContext, PlannerGear, PlannerProfile, RouteCandidate, SavedPlan, TripRequest } from "./types";
export interface PlanInsight { id: string; text: string }
export function planInsights(request: TripRequest, route: RouteCandidate | null, gear: PlannerGear[], profile: PlannerProfile, plans: SavedPlan[], activities: PlannerContext["activities"]): PlanInsight[] {
  const history = inferHistory(profile, plans, activities);
  const report = packReport(gear, request, history.comfortablePackLb);
  const result: PlanInsight[] = [];
  if (route) result.push({ id: "route", text: `${route.name} is ${route.distanceMiles} miles. ${request.days ? `Over ${request.days} days that averages ${(route.distanceMiles/request.days).toFixed(1)} miles per day. ` : ""}Difficulty: ${route.difficulty}. Confirm terrain, current access, and overnight rules with the source.` });
  else result.push({ id: "choose-route", text: "Choose a route before finalizing your gear. Distance alone does not establish that a route fits your ability or dates." });
  result.push({ id: "weight", text: `${report.complete ? "Your calculated starting pack" : "Your known pack weight so far"} is ${report.loadedLb.toFixed(1)} lb, including ${report.baseLb.toFixed(1)} lb of base gear and ${report.suppliesLb.toFixed(1)} lb of supplies. Worn items are counted separately.${report.complete ? "" : " This total is incomplete until the missing gear weights and supply amounts are entered."}` });
  if (history.comfortablePackLb) result.push({ id: "target", text: `Your personal carrying target is ${history.comfortablePackLb.toFixed(1)} lb. ${report.overTarget ? `The current total exceeds it by ${(report.loadedLb-history.comfortablePackLb).toFixed(1)} lb.` : report.complete ? "The calculated pack is within that target." : "Finish the weight list before comparing the full load."} This is a planning preference, not a safety limit.` });
  const daily = request.days && (route?.distanceMiles ?? request.distanceMiles) ? (route?.distanceMiles ?? request.distanceMiles)! / request.days : null;
  if (daily && history.usualMilesPerDay) result.push({ id: "pace", text: `Your planned ${daily.toFixed(1)} mi/day is ${daily > history.usualMilesPerDay ? "above" : "at or below"} your usual ${history.usualMilesPerDay.toFixed(1)} mi/day. Compare elevation, terrain, and altitude with trips you have already completed.` });
  if (daily && !history.usualMilesPerDay && history.typicalRecordedHike) result.push({ id: "recorded-history", text: `Your planned ${daily.toFixed(1)} mi/day can be compared with a typical recorded hike of ${history.typicalRecordedHike.toFixed(1)} miles across ${history.activityCount} completed hikes. A single-hike distance does not establish overnight-trip experience; add your usual daily-mileage preference.` });
  const heaviest = gear.filter(g => g.type === "Base" && g.weightOz).sort((a,b) => b.weightOz!*b.qty-a.weightOz!*a.qty)[0];
  if (heaviest) result.push({ id: "heaviest", text: `Your heaviest selected base item is ${heaviest.name}, ${(heaviest.weightOz!*heaviest.qty/16).toFixed(1)} lb. Review alternatives or duplicates while keeping required protection.` });
  if (report.unknown.length) result.push({ id: "unknown", text: `Missing item weights: ${report.unknown.slice(0, 10).join(", ")}. Look up the exact model or weigh it yourself before relying on the total.` });
  if (report.duplicateSupplies) result.push({ id: "duplicate", text: "Consumables appear in your gear and in additional allowances. Check that you are not counting the same food, water, or fuel twice." });
  for (const [index, question] of followUpQuestions(request, { ...profile, usualMilesPerDay: history.usualMilesPerDay, comfortablePackLb: history.comfortablePackLb }, gear).entries()) result.push({ id: `question-${index}`, text: question });
  if (request.lowTempF !== null && request.lowTempF <= 32) result.push({ id: "freezing", text: "Your expected overnight low is at or below freezing. Check sleep-system comfort ratings, insulation, and protection for filtration equipment." });
  const accessible = gear.filter(g => packingZone(g) === "Top / quick access").map(g => g.name);
  if (accessible.length) result.push({ id: "accessible", text: `Keep these selected items accessible: ${accessible.slice(0, 12).join(", ")}. Use the packing checklist to arrange the rest.` });
  return result;
}
export function validateInsightSelection(raw: string, insights: PlanInsight[]): string[] {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !("ids" in parsed) || !Array.isArray(parsed.ids) || !parsed.ids.length || parsed.ids.length > 5) throw new Error("The local model could not prioritize this plan. Your verified calculations are still shown above; try again.");
  const byId = new Map(insights.map(i => [i.id, i.text]));
  if (parsed.ids.some(id => typeof id !== "string" || !byId.has(id))) throw new Error("The local model returned an unsupported suggestion. No unverified text was added to your plan.");
  return [...new Set(parsed.ids as string[])].map(id => byId.get(id)!);
}
