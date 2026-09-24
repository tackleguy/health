import type { GearCategory, GearType } from "@/lib/gear";

export interface ProductDetails {
  price?: number | null;
  priceCurrency?: string | null;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  capacity?: string | null;
  materials?: string | null;
  dimensions?: string | null;
  sourceCheckedAt?: string | null;
  sourceNote?: string | null;
}
export interface PlannerGear extends ProductDetails {
  id: string;
  name: string;
  category: GearCategory;
  type: GearType;
  qty: number;
  weightOz: number | null;
  packedSize: string | null;
  sourceUrl: string | null;
}
export interface TripPlace { id: string; name: string; latitude: number; longitude: number }
export interface ShoppingItem { id: string; name: string; reason: string; status: "needed" | "obtained" | "skip" }
export interface TripRequest {
  locationMode?: "in" | "near";
  radiusKm?: number;
  place?: TripPlace | null;
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
  kind?: "segment";
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
  shopping?: ShoppingItem[];
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
export interface TrailResearchSource extends WebSource { publisher: string; topics: string[]; retrievedAt: string }
export type ProductFactKind = "weight" | "packed-size" | "dimensions" | "price" | "brand" | "model" | "sku" | "capacity" | "materials";
export interface ProductFact {
  label: string;
  value: string;
  weightOz: number | null;
  kind: ProductFactKind;
  evidence: string;
  amount?: number;
  currency?: string;
  requiresChoice?: boolean;
  variantLabel?: string;
  sourceUrl?: string;
}
export interface ProductVariant { id: string; name: string; url: string; facts: ProductFact[] }
export interface ProductResearch {
  title: string;
  url: string;
  retrievedAt: string;
  facts: ProductFact[];
  excerpt: string;
  variants: ProductVariant[];
  recovery?: {
    method: "alternate-page" | "search-excerpt" | "pasted-specs" | "not-found";
    requestedUrl: string;
    notice: string;
    sources: WebSource[];
  };
}
export interface ProductDraft extends ProductDetails {
  name: string;
  sourceUrl: string;
  weightOz?: number;
  packedSize?: string;
}
