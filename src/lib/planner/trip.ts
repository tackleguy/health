/**
 * Phase 3 — AI trip planner architecture (stub).
 * Never emits safety-critical permit/closure data without verified sources.
 */
import type { Campsite, Trail, WaterSource } from "@/lib/types";

export interface TripPlannerInput {
  trailId?: string;
  days: number;
  startDate?: string;
  partySize?: number;
  preferences?: string;
}

export interface TripPlannerDay {
  day: number;
  summary: string;
  distanceMiles?: number;
  campsites: string[];
  waterSources: string[];
  notes: string[];
}

export interface TripPlannerResult {
  status: "stub";
  message: string;
  itinerary: TripPlannerDay[];
  confidence: "architecture_only";
}

export function planBackpackingTrip(
  trail: Trail | null,
  campsites: Campsite[],
  water: WaterSource[],
  input: TripPlannerInput,
): TripPlannerResult {
  const days = Math.max(1, input.days);

  const itinerary: TripPlannerDay[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    summary: trail
      ? `Day ${i + 1} on ${trail.trail_name} — draft segment (human review required)`
      : `Day ${i + 1} — select a trail with verified geometry`,
    distanceMiles: trail ? trail.length_miles / days : undefined,
    campsites: campsites.slice(0, 2).map((c) => c.name ?? "Unnamed campsite"),
    waterSources: water.slice(0, 2).map((w) => w.name ?? "Unnamed water source"),
    notes: [
      "This is a non-AI architecture stub. LLM drafting requires verified POI + restriction data.",
      "Verify all permits and closures with official agency sources before travel.",
    ],
  }));

  return {
    status: "stub",
    message:
      "Trip planner API stub — wire LLM + restriction filters after POI coverage improves.",
    itinerary,
    confidence: "architecture_only",
  };
}
