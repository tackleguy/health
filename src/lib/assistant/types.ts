import type { GearCategory, GearType } from "@/lib/gear";

export interface PlannerGear {
  id: string;
  name: string;
  category: GearCategory;
  type: GearType;
  qty: number;
  weightOz: number | null;
  packedSize: string | null;
  sourceUrl: string | null;
}
export interface TripRequest {
  distanceMiles: number | null;
  days: number | null;
  region: string;
  startDate: string;
  lowTempF: number | null;
  waterLiters: number | null;
  foodOzPerDay: number | null;
  fuelOz: number | null;
  suppliesInGear: boolean;
}
export interface PlannerProfile {
  usualMilesPerDay: number | null;
  comfortablePackLb: number | null;
  packCapacityL: number | null;
  experience: "new" | "some" | "experienced";
  priorities: string;
}
export interface RouteCandidate {
  id: string;
  name: string;
  region: string;
  distanceMiles: number;
  elevationFt: number | null;
  difficulty: string;
  sourceUrl: string | null;
  sourceLabel: string;
  catalogHref?: string;
  trailId?: string;
  note: string;
}
export interface TripFeedback {
  effort: "easy" | "right" | "hard";
  packComfort: "comfortable" | "too-heavy";
  carriedLb: number | null;
  notes: string;
}
export interface SavedPlan {
  id: string;
  prompt: string;
  request: TripRequest;
  route: RouteCandidate | null;
  gear: PlannerGear[];
  packedIds: string[];
  savedAt: string;
  feedback: TripFeedback | null;
}
export interface PlannerMemory {
  version: 1;
  profile: PlannerProfile;
  gear: PlannerGear[];
  plans: SavedPlan[];
}
export interface ActivitySummary { id: string; title: string; miles: number; hours: number; date: string }
export interface PlannerContext {
  userId: string | null;
  gear: PlannerGear[];
  activities: ActivitySummary[];
  routes: RouteCandidate[];
  messages: string[];
}
export interface WebSource { title: string; url: string; snippet: string }
export interface ProductFact { label: string; value: string; weightOz: number | null; kind: "weight" | "packed-size" | "dimensions"; evidence: string }
export interface ProductResearch { title: string; url: string; retrievedAt: string; facts: ProductFact[]; excerpt: string }
