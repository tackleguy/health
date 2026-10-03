import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTrail, validateTrailRecord } from "./validate";
import { importedLengthMiles } from "./store";

const line = (meters: number): [number, number][] => [[-105, 40], [-105, 40 + meters / 111_195]];

test("import rejects records without usable geometry or names", () => {
  assert.equal(validateTrailRecord({ name: "Ridge Trail", coordinates: [] } as never).valid, false);
  assert.equal(validateTrailRecord({ name: "Ridge Trail", coordinates: [[-105, 40], [-105, 95]] } as never).valid, false);
  assert.equal(validateTrailRecord({ name: " ", coordinates: line(2000) } as never).valid, false);
});

test("import warns on placeholder names and short lines without rejecting them", () => {
  const result = validateTrailRecord({ name: "<unnamed>", coordinates: line(100) } as never);
  assert.equal(result.valid, true);
  assert.ok(result.issues.some((i) => i.field === "name"));
  assert.ok(result.issues.some((i) => /short-trail/.test(i.message)));
});

test("imported length follows the mapped line and is never padded", () => {
  const trail = normalizeTrail({ name: "Ridge Trail", coordinates: line(100), lengthMiles: 5 } as never);
  const miles = importedLengthMiles(trail);
  assert.ok(Math.abs(miles * 1609.344 - 100) < 2, `stored ${miles} mi for a 100 m line`);
  const agreeing = normalizeTrail({ name: "Ridge Trail", coordinates: line(1609), lengthMiles: 1.05 } as never);
  assert.equal(importedLengthMiles(agreeing), 1.05);
});
