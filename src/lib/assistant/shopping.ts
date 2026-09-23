import type { PlannerGear, ShoppingItem, TripRequest } from "./types";
interface Need { id: string; name: string; reason: string; matches: (gear: PlannerGear) => boolean }
export function tripNeeds(request: TripRequest): Need[] {
  const named = (pattern: RegExp, exclude?: RegExp) => (g: PlannerGear) => g.qty > 0 && pattern.test(g.name) && !exclude?.test(g.name);
  const needs: Need[] = [
    { id: "pack", name: "Backpack", reason: "Carry your trip equipment; confirm that everything fits.", matches: named(/\b(backpack|rucksack|daypack|pack)\b/i) },
    { id: "navigation", name: "Offline navigation / map and compass", reason: "Prepare navigation for the chosen route, including an offline backup.", matches: g => g.qty > 0 && (g.category === "Navigation" || /\b(map|compass|gps)\b/i.test(g.name)) },
    { id: "light", name: "Headlamp or flashlight", reason: "Light for delays and camp; check battery life.", matches: named(/headlamp|flashlight|torch/i) },
    { id: "first-aid", name: "First-aid kit", reason: "Personal supplies appropriate to the outing.", matches: named(/first.?aid|medical kit/i) },
    { id: "water", name: "Water bottles or reservoir", reason: `Carry ${request.waterLiters == null ? "your planned water supply" : `${request.waterLiters} L at the start`}; confirm refill points.`, matches: named(/water bottle|reservoir|hydration bladder|canteen|nalgene|smartwater/i) },
    { id: "rain", name: "Rain protection", reason: "Choose protection for the route forecast.", matches: named(/rain|poncho|waterproof jacket/i) },
    { id: "sun", name: "Sun protection", reason: "Review sunscreen, clothing and eye protection for exposure.", matches: named(/sunscreen|sunblock|sun hat|sunglasses/i) },
    { id: "food", name: `Food for ${request.days ?? "your"} ${request.days === 1 ? "day" : "days"}`, reason: "Review portions and an emergency reserve. Existing food still needs a quantity check.", matches: named(/\b(food|meals?|snacks?|rations?|energy bars?)\b/i, /bag|sack|container|canister|storage/i) },
  ];
  if (request.days && request.days > 1) needs.push(
    { id: "shelter", name: "Overnight shelter", reason: "Confirm a shelter suitable for the campsite and weather.", matches: g => g.qty > 0 && (g.category === "Shelter" || /\b(tent|tarp|bivy|bivvy|hammock|shelter)\b/i.test(g.name)) && !/stake|peg|pole|footprint|repair|guy.?line/i.test(g.name) },
    { id: "sleep", name: "Sleeping bag or quilt", reason: `Check comfort rating against ${request.lowTempF == null ? "the expected overnight low" : `${request.lowTempF}°F`}.`, matches: named(/sleeping bag|quilt|sleep system/i) },
    { id: "pad", name: "Sleeping pad", reason: "Check insulation for expected ground temperatures.", matches: named(/sleeping (?:pad|mat)|\b(mattress|sleep pad|tensor|neoair|z lite)\b/i) },
    { id: "treatment", name: "Water treatment", reason: "Check source availability and a treatment method for the route.", matches: named(/water filter|purifier|purification|aquamira|sawyer|lifestraw|steripen|beefree|befree/i) },
    { id: "storage", name: "Food storage suitable for the route", reason: "Check local rules before buying: a bear canister may be required.", matches: named(/bear canister|bear vault|bearvault|ursack|bear bag|food bag/i) },
  );
  if (request.lowTempF != null && request.lowTempF <= 32) needs.push({ id: "warmth", name: "Cold-weather insulation", reason: "Freezing conditions: check insulation, gloves and hat against the actual forecast.", matches: named(/insulated jacket|down jacket|puffy|parka/i) });
  if (request.fuelOz != null && request.fuelOz > 0) needs.push({ id: "fuel", name: "Stove fuel", reason: `Your plan includes ${request.fuelOz} oz of additional fuel; verify compatibility and fire rules.`, matches: named(/\b(fuel|isobutane|propane)\b/i) });
  return needs;
}
export function shoppingForTrip(request: TripRequest, inventory: PlannerGear[], edits: ShoppingItem[]) {
  const needs = tripNeeds(request);
  const items = needs.filter(need => !inventory.some(need.matches)).map(need => ({ id: need.id, name: need.name, reason: need.reason, status: edits.find(e => e.id === need.id)?.status ?? "needed" } satisfies ShoppingItem));
  const custom = edits.filter(e => e.id.startsWith("custom:") && !inventory.some(g => g.qty > 0 && g.name.trim().toLowerCase() === e.name.trim().toLowerCase()));
  return [...items, ...custom];
}
export function cleanShopping(value: unknown): ShoppingItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap(item => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string" || !item.name.trim()) return [];
    return [{ id: item.id.slice(0, 180), name: item.name.trim().slice(0, 180), reason: typeof item.reason === "string" ? item.reason.slice(0, 500) : "Added for this trip.", status: item.status === "obtained" || item.status === "skip" ? item.status : "needed" } as ShoppingItem];
  }).filter((item, i, all) => all.findIndex(other => other.id === item.id) === i);
}
export function shoppingText(items: ShoppingItem[]) {
  return ["Trip shopping list", "Check suggestions against your itinerary and conditions. Obtained items need to be added to your gear for weight calculations.", ...items.map(item => `[${item.status === "obtained" ? "x" : item.status === "skip" ? "-" : " "}] ${item.name} — ${item.status === "skip" ? "Not needed for this trip. " : ""}${item.reason}`)].join("\n");
}
