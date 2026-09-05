/**
 * Phase 3 — pack planner / weight calculator architecture (stub).
 */
export interface PackItem {
  name: string;
  category: string;
  weightOz: number;
  essential: boolean;
}

export interface PackPlannerInput {
  days: number;
  season: "summer" | "shoulder" | "winter";
  elevationFt?: number;
  bearCanisterRequired?: boolean;
}

export interface PackPlannerResult {
  status: "stub";
  message: string;
  baseWeightOz: number;
  items: PackItem[];
  confidence: "architecture_only";
}

const BASE_ITEMS: PackItem[] = [
  { name: "Backpack (55L class)", category: "pack", weightOz: 80, essential: true },
  { name: "Shelter (tent)", category: "shelter", weightOz: 48, essential: true },
  { name: "Sleeping bag", category: "sleep", weightOz: 32, essential: true },
  { name: "Sleeping pad", category: "sleep", weightOz: 16, essential: true },
  { name: "Water filter", category: "water", weightOz: 3, essential: true },
  { name: "Stove + fuel (per day)", category: "cook", weightOz: 8, essential: true },
];

export function planPack(input: PackPlannerInput): PackPlannerResult {
  const items = [...BASE_ITEMS];

  if (input.bearCanisterRequired) {
    items.push({
      name: "Bear canister",
      category: "food",
      weightOz: 40,
      essential: true,
    });
  }

  if (input.season === "winter" || (input.elevationFt ?? 0) > 9000) {
    items.push(
      { name: "Insulated layers", category: "clothing", weightOz: 24, essential: true },
      { name: "4-season considerations", category: "safety", weightOz: 0, essential: true },
    );
  }

  const foodPerDayOz = 20;
  items.push({
    name: `Food (${input.days} days)`,
    category: "food",
    weightOz: foodPerDayOz * input.days,
    essential: true,
  });

  const baseWeightOz = items.reduce((sum, item) => sum + item.weightOz, 0);

  return {
    status: "stub",
    message:
      "Pack planner stub — extend with user gear inventory and weather-aware suggestions.",
    baseWeightOz,
    items,
    confidence: "architecture_only",
  };
}
