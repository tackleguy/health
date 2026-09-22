import { CATEGORY_ORDER } from "../gear";
import { gearWeightOz, packReport, packingZone, ZONE_GUIDANCE, type PackingZone } from "./planning";
import type { PlannerGear, TripRequest } from "./types";

export type PackUnits = "imperial" | "metric";
export type WeightSlice = { label: string; oz: number; missing: number };

export function formatPackWeight(oz: number, units: PackUnits, item = false) {
  if (units === "metric") return item ? `${Math.round(oz * 28.349523125).toLocaleString()} g` : `${(oz * 0.028349523125).toFixed(2)} kg`;
  return item ? `${oz.toFixed(1)} oz` : `${(oz / 16).toFixed(1)} lb`;
}

export function weightBreakdown(gear: PlannerGear[], request: TripRequest, byCategory = false): WeightSlice[] {
  const report = packReport(gear, request, null);
  const carried = gear.filter(item => item.type !== "Worn");
  const fromItems = (label: string, items: PlannerGear[]): WeightSlice => ({
    label,
    oz: items.reduce((sum, item) => sum + (gearWeightOz(item) ?? 0), 0),
    missing: items.filter(item => gearWeightOz(item) === null).length,
  });
  const items = byCategory
    ? CATEGORY_ORDER.filter(category => carried.some(item => item.category === category)).map(category => fromItems(category, carried.filter(item => item.category === category)))
    : [fromItems("Base gear", carried.filter(item => item.type === "Base")), fromItems("Listed consumables", carried.filter(item => item.type === "Consumable"))];
  if (!request.suppliesInGear) items.push(
    { label: "Additional food", oz: report.extraFoodOz, missing: report.missingSupplies.some(item => item.startsWith("food") || item.startsWith("trip days")) ? 1 : 0 },
    { label: "Starting water", oz: report.extraWaterOz, missing: report.missingSupplies.includes("water carry") ? 1 : 0 },
    { label: "Additional fuel", oz: report.extraFuelOz, missing: report.missingSupplies.some(item => item.startsWith("fuel")) ? 1 : 0 },
  );
  return items;
}

export interface PackingGuideStep {
  zone: PackingZone;
  title: string;
  guidance: string;
  tips: string[];
  items: PlannerGear[];
}

/** Placement suggestions use the user's categories/names; no equipment is invented. */
export function packingGuide(gear: PlannerGear[], request: TripRequest): PackingGuideStep[] {
  const report = packReport(gear, request, null);
  const has = (pattern: RegExp) => gear.some(item => pattern.test(item.name));
  return (["Bottom", "Core", "Top / quick access", "Worn"] as PackingZone[]).map(zone => {
    const items = gear.filter(item => packingZone(item) === zone);
    const common = { zone, guidance: ZONE_GUIDANCE[zone], items };
    if (zone === "Bottom") return { ...common, title: "Start with soft camp gear", tips: [
      "Keep your sleep system in waterproof protection. Pack the soft items you only use at camp first.",
      ...(request.lowTempF !== null && request.lowTempF <= 32 ? [`Your entered low is ${request.lowTempF}°F. Check sleep-system comfort ratings and keep insulating gear dry.`] : []),
    ] };
    if (zone === "Core") return { ...common, title: "Balance the heavier load", tips: [
      "Place dense items near the back panel, centered between left and right. Fill gaps to stop them shifting.",
      ...(!request.suppliesInGear && request.days && request.foodOzPerDay !== null ? [`Your food allowance totals ${report.extraFoodOz.toFixed(1)} oz across ${request.days} days. Keep today's snacks accessible and the remaining food in the core.`] : []),
      ...(!request.suppliesInGear && request.waterLiters !== null ? [`Start with your planned ${request.waterLiters} L of water. Fit a reservoir before filling the pack, or put bottles in secure reachable pockets. Confirm refill points.`] : []),
      ...(has(/fuel|stove|canister/i) || (request.fuelOz ?? 0) > 0 ? ["Secure fuel away from food; carry liquid-fuel bottles upright with the cap closed."] : []),
      ...(has(/bear.*canister|bear.*vault/i) ? ["Follow the land manager’s food-storage rules for your canister and other scented items."] : []),
    ] };
    if (zone === "Top / quick access") return { ...common, title: "Keep trail essentials reachable", tips: [
      "Use top and accessory pockets for layers, navigation, light, first aid, snacks, and water treatment. Test that you can reach them without emptying the pack.",
      ...(request.lowTempF !== null && request.lowTempF <= 32 && has(/filter|purifier/i) ? ["Check your filter’s manufacturer instructions for freezing conditions before this trip."] : []),
    ] };
    return { ...common, title: "Set out what you’ll wear", tips: [
      "Lay these items beside the pack and check them before leaving. Worn items are listed separately from your starting pack weight.",
      "Finish with a loaded test walk, adjust the harness, and check that the load stays balanced. Reweigh the complete pack with starting supplies.",
    ] };
  });
}
