import { PACK_TRAILS } from "@/lib/gear";
import type { RouteCandidate } from "./types";
// Route geometry and historical distance only. Do not use the old handout's permit rules.
export const REFERENCE_ROUTES: RouteCandidate[] = [{
  id: "reference:four-pass-loop", name: "Four Pass Loop", region: "Maroon Bells–Snowmass Wilderness, Colorado, USA", distanceMiles: 28, elevationFt: null, difficulty: "hard",
  sourceUrl: "https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5186829.pdf", sourceLabel: "US Forest Service route handout",
  note: "Historical route reference: 28 miles, with passes up to 12,500 ft. This is a strenuous high-altitude option, not a confirmed match for your ability or dates. The old handout’s permit rules are not current; check the land manager before booking.",
}, ...PACK_TRAILS.map(t => ({ id: `guide:${t.name}`, name: t.name, region: t.location, distanceMiles: t.distance, elevationFt: t.elevation, difficulty: t.difficulty, sourceUrl: null, sourceLabel: "Existing route guide · unverified", note: "From the app’s existing route guide. Confirm route distance, access, and current conditions with an official source." }))];
