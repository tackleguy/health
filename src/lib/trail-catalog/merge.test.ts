import test from "node:test";
import assert from "node:assert/strict";
import { geometryMiles, joinLines, mergeCatalogSections, mergeKey, sectionLength, type CatalogSection, type Lines } from "./merge";
import type { CatalogTrail } from "./types";

const base: CatalogTrail = {
  id: "usgs-a", name: "Ridge Trail", country: "US", region: "Colorado", kind: "segment", miles: null, distanceBasis: "geometry",
  latitude: 40, longitude: -105, difficulty: null, dogs: null, source: "usgs", sourceId: "a", sourceUrl: "https://example.com",
  officialUrl: null, sourceDate: null, manager: null, surface: null, season: null, geometryShard: "00",
};
const section = (id: string, lines: Lines, patch: Partial<CatalogTrail> = {}): CatalogSection => ({ row: { ...base, id, sourceId: id, ...patch }, lines });
// ~0.01° of longitude at 40°N is ~0.53 mi.
const east = (from: number, to: number): Lines => [[[-105 + from, 40], [-105 + to, 40]]];

test("connected same-name sections become one trail with summed length", () => {
  const trails = mergeCatalogSections([section("usgs-a", east(0, 0.01)), section("usgs-b", east(0.01, 0.02)), section("usgs-c", east(0.02, 0.03))]);
  assert.equal(trails.length, 1);
  const [trail] = trails;
  assert.equal(trail.row.sectionCount, 3);
  assert.deepEqual(trail.sectionIds.sort(), ["usgs-a", "usgs-b", "usgs-c"]);
  assert.equal(trail.lines.length, 1, "touching lines are joined end to end");
  assert.ok(Math.abs(trail.row.miles! - geometryMiles(east(0, 0.03))) < 0.01);
});

test("same name far apart stays separate, generic names never merge", () => {
  const far = mergeCatalogSections([section("usgs-a", east(0, 0.01)), section("usgs-b", east(1, 1.01))]);
  assert.equal(far.length, 2);
  const unnamed = mergeCatalogSections([section("usgs-a", east(0, 0.01), { name: "Unnamed trail" }), section("usgs-b", east(0.01, 0.02), { name: "Unnamed trail" })]);
  assert.equal(unnamed.length, 2);
  assert.equal(mergeKey({ ...base, name: "Unknown" }), null);
});

test("sections within 100 m join, overlapping duplicates are not double counted", () => {
  const gap = mergeCatalogSections([section("usgs-a", east(0, 0.01)), section("usgs-b", east(0.0105, 0.02))]);
  assert.equal(gap.length, 1);
  const overlap = mergeCatalogSections([section("usgs-a", east(0, 0.02)), section("usgs-b", east(0.01, 0.03)), section("usgs-c", east(0.005, 0.015))]);
  assert.equal(overlap.length, 1);
  assert.ok(Math.abs(overlap[0].row.miles! - geometryMiles(east(0, 0.03))) < 0.02, `got ${overlap[0].row.miles}`);
});

test("through-hike names merge across naming variants", () => {
  const trails = mergeCatalogSections([
    section("usgs-a", east(0, 0.01), { name: "Pacific Crest Trail" }),
    section("usgs-b", east(0.01, 0.02), { name: "Pacific Crest National Scenic Trail" }),
    section("usgs-c", east(0.02, 0.03), { name: "Pacific Crest Trail_def" }),
  ]);
  assert.equal(trails.length, 1);
  assert.equal(trails[0].row.sectionCount, 3);
});

test("lengths use USGS miles only when they agree with the mapped line", () => {
  const lines = east(0, 0.02);
  const mapped = geometryMiles(lines);
  assert.deepEqual(sectionLength({ ...base, miles: mapped * 1.1, distanceBasis: "source" }, lines), { miles: mapped * 1.1, basis: "source" });
  assert.equal(sectionLength({ ...base, miles: mapped * 4, distanceBasis: "source" }, lines).basis, "geometry");
  assert.equal(sectionLength({ ...base, miles: 42, distanceBasis: "source", source: "ontario" }, lines).miles, mapped);
});

test("joinLines chains reversed and out-of-order lines", () => {
  const joined = joinLines([[[2, 0], [3, 0]], [[1, 0], [0, 0]], [[1, 0], [2, 0]]]);
  assert.equal(joined.length, 1);
  assert.equal(joined[0].length, 4);
});
