import assert from "node:assert/strict";
import test from "node:test";
import { tripChecklist } from "./checklist";
import { EMPTY_REQUEST } from "./planning";
import type { PlannerGear } from "./types";

test("export keeps unknown weights, quantities, worn gear and packed state truthful", () => {
  const gear: PlannerGear[] = [
    { id: "tent", name: "Tent", category: "Shelter", type: "Base", qty: 1, weightOz: null, packedSize: null, sourceUrl: null },
    { id: "hat", name: "Hat", category: "Clothing", type: "Worn", qty: 2, weightOz: 2, packedSize: null, sourceUrl: null },
  ];
  const output = tripChecklist({ ...EMPTY_REQUEST, region: "Colorado", days: 3, distanceMiles: 30 }, null, gear, ["hat"]);
  assert.match(output, /Known weight so far \(incomplete\): 0.0 lb/);
  assert.match(output, /Worn separately: 0.3 lb/);
  assert.match(output, /\[ \] Tent — Weight unknown/);
  assert.match(output, /\[x\] Hat ×2 — 4.0 oz/);
  assert.match(output, /Food: Not set oz\/day/);
});

test("complete export includes supplies in the total and the authoritative route link", () => {
  const output = tripChecklist({ ...EMPTY_REQUEST, days: 1, distanceMiles: 9, foodOzPerDay: 16, fuelOz: 0, waterLiters: 0 }, { id: "r", name: "Chosen route", region: "Colorado", distanceMiles: 10, elevationFt: null, difficulty: "Unknown", sourceUrl: "https://example.org/route", sourceLabel: "Source", note: "" }, [{ id: "bag", name: "Sleeping bag", category: "Sleep System", type: "Base", qty: 1, weightOz: 16, packedSize: "10 × 6 in", sourceUrl: null }], []);
  assert.match(output, /10 mi · 1 day/);
  assert.match(output, /Calculated starting pack: 2.0 lb/);
  assert.match(output, /10 × 6 in/);
  assert.match(output, /Route source: https:\/\/example.org\/route/);
});
