import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_REQUEST, gearWeightOz, packReport } from "./planning";
import { formatPackWeight, packingGuide, weightBreakdown } from "./packing";
import { tripChecklist } from "./checklist";
import type { PlannerGear } from "./types";

const tent: PlannerGear = { id: "tent", name: "Tent", category: "Shelter", type: "Base", weightOz: 32, qty: 1, packedSize: null, sourceUrl: null };
const gear: PlannerGear[] = [tent, { ...tent, id: "socks", name: "Socks", category: "Clothing", weightOz: 2, qty: 3 }, { ...tent, id: "hat", name: "Hat", type: "Worn", weightOz: 4 }, { ...tent, id: "snacks", name: "Snacks", type: "Consumable", weightOz: 8 }];
const request = { ...EMPTY_REQUEST, days: 3, foodOzPerDay: 20, waterLiters: 2, fuelOz: 4 };

test("both chart views reconcile to carried weight including quantities, food days, and water", () => {
  const report = packReport(gear, request, 20);
  for (const byCategory of [false, true]) {
    const slices = weightBreakdown(gear, request, byCategory);
    assert.ok(Math.abs(slices.reduce((sum, slice) => sum + slice.oz, 0) - report.loadedLb * 16) < 0.000001);
    assert.equal(slices.filter(slice => slice.label === "Worn").length, 0);
  }
  assert.equal(report.wornLb, 0.25);
  assert.equal(report.extraFoodOz, 60);
  assert.equal(report.duplicateSupplies, true);
});
test("including supplies in gear avoids adding the separate allowances a second time", () => {
  const included = { ...request, suppliesInGear: true };
  assert.equal(weightBreakdown(gear, included).reduce((sum, slice) => sum + slice.oz, 0), 46);
  assert.equal(packReport(gear, included, null).duplicateSupplies, false);
});
test("invalid quantities and unknown or nonfinite weights stay incomplete", () => {
  for (const item of [{ ...tent, qty: 0 }, { ...tent, qty: 1.5 }, { ...tent, weightOz: -1 }, { ...tent, weightOz: NaN }, { ...tent, weightOz: null }]) {
    assert.equal(gearWeightOz(item), null);
    assert.equal(packReport([item], request, null).complete, false);
    assert.equal(weightBreakdown([item], request)[0].missing, 1);
  }
  assert.equal(packReport([], request, null).complete, false);
  assert.equal(packReport([tent], { ...request, days: 0 }, null).complete, false);
});
test("packing guide assigns each owned item once and keeps emergency equipment reachable", () => {
  const items = [...gear, { ...tent, id: "bag", name: "Sleeping bag", category: "Sleep System" as const }, { ...tent, id: "aid", name: "First aid kit" }];
  const steps = packingGuide(items, request);
  assert.deepEqual(steps.flatMap(step => step.items.map(item => item.id)).sort(), items.map(item => item.id).sort());
  assert.ok(steps.find(step => step.zone === "Bottom")?.items.some(item => item.id === "bag"));
  assert.ok(steps.find(step => step.zone === "Top / quick access")?.items.some(item => item.id === "aid"));
  assert.ok(steps.find(step => step.zone === "Worn")?.items.some(item => item.id === "hat"));
});
test("metric summaries and exported guides use converted real weights", () => {
  assert.equal(formatPackWeight(35.27396195, "metric"), "1.00 kg");
  const output = tripChecklist(request, null, gear, ["socks"], "metric");
  assert.match(output, /\[x\] Socks ×3 — 170 g/);
  assert.match(output, /Base gear: 1.08 kg/);
  assert.match(output, /Balance the heavier load/);
  assert.match(output, /Worn separately: 0.11 kg/);
});
