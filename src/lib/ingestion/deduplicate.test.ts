import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findMergeCandidates, nameSimilarity } from "./deduplicate";
import type { NormalizedTrail } from "./types";

function makeTrail(overrides: Partial<NormalizedTrail> = {}): NormalizedTrail {
  return {
    name: "Half Dome Trail",
    coordinates: [
      [-119.59, 37.74],
      [-119.55, 37.74],
    ],
    startLatitude: 37.74,
    startLongitude: -119.59,
    endLatitude: 37.74,
    endLongitude: -119.55,
    lengthMiles: 14,
    geojson: { type: "LineString", coordinates: [[-119.59, 37.74], [-119.55, 37.74]] },
    ...overrides,
  };
}

describe("nameSimilarity", () => {
  it("returns 1 for identical normalized names", () => {
    assert.equal(nameSimilarity("Half Dome Trail", "half dome trail"), 1);
  });

  it("scores high for substring matches", () => {
    assert.ok(nameSimilarity("Angels Landing", "Angels Landing Trail") >= 0.9);
  });
});

describe("findMergeCandidates", () => {
  it("flags trails with similar names near each other", () => {
    const incoming = makeTrail({ name: "Half Dome Trail" });
    const candidates = findMergeCandidates(incoming, [
      {
        id: "existing-1",
        name: "Half Dome Trail",
        lengthMiles: 14,
        latitude: 37.74,
        longitude: -119.59,
      },
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].trailAId, "existing-1");
    assert.equal(candidates[0].nameSimilarity, 1);
  });

  it("does not flag distant unrelated trails", () => {
    const incoming = makeTrail({ name: "Emerald Lake Trail" });
    const candidates = findMergeCandidates(incoming, [
      {
        id: "existing-2",
        name: "Angels Landing",
        lengthMiles: 5,
        latitude: 37.27,
        longitude: -112.95,
      },
    ]);

    assert.equal(candidates.length, 0);
  });
});
