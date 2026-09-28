import test from "node:test";
import assert from "node:assert/strict";
import { assessTrail, findFragmentParents, formatDistance, isPlaceholderName, measureLines, MILE_METERS, type Lines } from "./quality";
import { auditCatalog } from "./audit";
import { mergeCatalogSections, mergeKey, type CatalogSection } from "./merge";
import { filterCatalog } from "./search";
import type { CatalogTrail } from "./types";

const base: CatalogTrail = {
  id: "usgs-a", name: "Overlook Trail", country: "US", region: "Colorado", kind: "segment", miles: null, distanceBasis: "geometry",
  latitude: 40, longitude: -105, difficulty: null, dogs: null, source: "usgs", sourceId: "a", sourceUrl: "https://example.com",
  officialUrl: null, sourceDate: null, manager: null, surface: null, season: null, geometryShard: "00",
};
// 0.001° of latitude is ~111 m.
const north = (fromMeters: number, toMeters: number, lng = -105): Lines => [[[lng, 40 + fromMeters / 111_195], [lng, 40 + toMeters / 111_195]]];
const path = (meters: number, lng = -105): Lines => {
  const points: [number, number][] = [];
  for (let m = 0; m <= meters; m += 20) points.push([lng + (m % 40 ? 0.00001 : 0), 40 + m / 111_195]);
  return [points];
};
const trail = (id: string, lines: Lines, patch: Partial<CatalogTrail> = {}) => {
  const miles = measureLines(lines).meters / MILE_METERS;
  return { row: { ...base, id, sourceId: id, miles, ...patch }, lines };
};

test("distance is measured along the whole path, not endpoint to endpoint", () => {
  const out = [[-105, 40], [-105, 40.01], [-105.00001, 40]] as [number, number][];
  const m = measureLines([out]);
  assert.ok(Math.abs(m.meters - 2 * 1112) < 5, `expected ~2224 m, got ${m.meters}`);
  assert.ok(m.start && m.end);
  assert.deepEqual(m.bounds, [-105.00001, 40, -105, 40.01]);
});

test("a legitimate 100-meter trail stays published as a short trail", () => {
  const { row, lines } = trail("usgs-short", path(100));
  const result = assessTrail(row, lines);
  assert.equal(result.status, "short");
  assert.deepEqual(result.flags, ["short"]);
  assert.ok(Math.abs(result.mappedMiles * MILE_METERS - 100) < 2);
  const [audited] = [row];
  auditCatalog([{ row: audited, lines }]);
  assert.equal(filterCatalog([audited], {}).total, 1, "short trails stay in default results");
});

test("a 100-meter piece of a longer same-name trail is flagged as a fragment and linked to it", () => {
  const long = trail("usgs-long", path(5000), { name: "Ridge Trail" });
  // Separated by a 600 m gap, so the merge did not join it.
  const piece = trail("usgs-piece", north(5600, 5700), { name: "Ridge Trail" });
  const report = auditCatalog([long, piece]);
  assert.equal(piece.row.quality, "fragment");
  assert.equal(piece.row.parentId, "usgs-long");
  assert.ok(piece.row.flags!.includes("fragment-of-longer-trail"));
  assert.equal(long.row.quality, "ok");
  assert.equal(report.byStatus.fragment, 1);
  assert.deepEqual(filterCatalog([long.row, piece.row], {}).trails.map((t) => t.id), ["usgs-long"]);
  assert.equal(filterCatalog([long.row, piece.row], { includeFragments: true }).total, 2);
});

test("same-name trails far apart are separate trails, not fragments", () => {
  const a = trail("usgs-a", path(5000), { name: "Ridge Trail" });
  const b = trail("usgs-b", path(200, -106), { name: "Ridge Trail" });
  auditCatalog([a, b]);
  assert.equal(b.row.parentId, undefined);
  assert.equal(b.row.quality, "short");
});

test("a valid long-distance trail passes", () => {
  const lines = path(40_000);
  const result = assessTrail({ ...base, miles: measureLines(lines).meters / MILE_METERS }, lines);
  assert.equal(result.status, "ok");
  assert.equal(result.routeType, "point-to-point");
});

test("a valid loop is detected as a loop", () => {
  const loop: Lines = [[[-105, 40], [-105, 40.005], [-104.995, 40.005], [-104.995, 40], [-105, 40]]];
  const result = assessTrail({ ...base, miles: null }, loop);
  assert.equal(result.routeType, "loop");
  assert.equal(result.status, "ok");
});

test("an out-and-back line whose ends meet is only a loop when it is long enough", () => {
  const tiny: Lines = [[[-105, 40], [-105, 40.0002], [-105, 40]]];
  assert.equal(assessTrail({ ...base, miles: null }, tiny).routeType, "point-to-point");
});

test("duplicate same-name sections merge once, with overlap counted once", () => {
  const section = (id: string, lines: Lines): CatalogSection => ({ row: { ...base, id, sourceId: id, name: "Ridge Trail" }, lines });
  const merged = mergeCatalogSections([section("usgs-a", north(0, 2000)), section("usgs-b", north(0, 2000))]);
  assert.equal(merged.length, 1);
  assert.ok(Math.abs(merged[0].row.miles! * MILE_METERS - 2000) < 40);
});

test("missing geometry is invalid and never given a distance", () => {
  const result = assessTrail({ ...base, miles: null }, []);
  assert.equal(result.status, "fragment");
  assert.ok(result.flags.includes("invalid-geometry"));
  assert.equal(result.mappedMiles, 0);
  assert.equal(formatDistance(null).primary, "Distance unknown");
});

test("invalid coordinates are rejected", () => {
  for (const lines of [[[[-105, 40], [-105, 95]]], [[[-105, 40], [Number.NaN, 40]]], [[[-105, 40]]]] as Lines[]) {
    assert.equal(measureLines(lines).valid, false);
    assert.ok(assessTrail({ ...base, miles: null }, lines).flags.includes("invalid-geometry"));
  }
});

test("disconnected segments are flagged for review, not joined", () => {
  const lines: Lines = [...path(2000), ...north(3000, 5000)];
  const result = assessTrail({ ...base, miles: measureLines(lines).meters / MILE_METERS }, lines);
  assert.ok(result.flags.includes("disconnected"));
  assert.equal(result.status, "review");
  assert.equal(result.routeType, "network");
  assert.equal(result.measure.pieces, 2);
  assert.equal(result.measure.components, 2);
  const tee: Lines = [[[-105, 40], [-105, 40.02]], [[-105.01, 40.01], [-105, 40.01]]];
  assert.equal(measureLines(tee).components, 1, "a T-junction is connected");
});

test("an incorrect stored distance is flagged and the source value kept for debugging", () => {
  const item = { ...trail("usgs-x", path(3000)), sectionReportedMiles: 9 };
  auditCatalog([item]);
  assert.ok(item.row.flags!.includes("distance-mismatch"));
  assert.equal(item.row.reportedMiles, 9);
  assert.equal(item.row.quality, "review");
});

test("a source that reports a much longer trail than is mapped marks the geometry incomplete", () => {
  const item = { ...trail("ontario-1", path(1000), { source: "ontario" }), reportedMiles: 12 };
  auditCatalog([item]);
  assert.ok(item.row.flags!.includes("incomplete-geometry"));
  assert.equal(item.row.quality, "review");
});

test("missing elevation is reported, never estimated", () => {
  const report = auditCatalog([trail("usgs-e", path(3000))]);
  assert.equal(report.missingElevation, 1);
});

test("placeholder names are not trail names and never merge", () => {
  for (const name of ["-", "<unnamed>", "(none)", "Unknown", "TEMP", "Trail", "  "]) assert.ok(isPlaceholderName(name), name);
  for (const name of ["Ridge Trail", "120", "Lanark Link"]) assert.equal(isPlaceholderName(name) && !/\d/.test(name), false, name);
  assert.equal(mergeKey({ ...base, name: "<unnamed>" }), null);
  const short = trail("usgs-u", path(150), { name: "Unnamed trail" });
  auditCatalog([short]);
  assert.equal(short.row.quality, "fragment");
});

test("short connectors and agency-wide network pieces are fragments; long ones stay", () => {
  const connector = trail("usgs-c", path(150), { name: "Connector Trail" });
  const longConnector = trail("usgs-lc", path(2000), { name: "Connector Trail", region: "Utah" });
  const pieces = Array.from({ length: 6 }, (_, i) => trail(`usgs-n${i}`, path(150, -100 - i), { name: "Loudoun County Trails", region: "Virginia" }));
  auditCatalog([connector, longConnector, ...pieces]);
  assert.equal(connector.row.quality, "fragment");
  assert.equal(longConnector.row.quality, "ok");
  assert.ok(pieces.every((p) => p.row.quality === "fragment" && p.row.flags!.includes("network-name")));
});

test("trails the source marks closed stay linkable but leave default results", () => {
  const closed = trail("usgs-closed", path(3000), { name: "Old Mill Trail (closed)" });
  auditCatalog([closed]);
  assert.ok(closed.row.flags!.includes("closed"));
  assert.equal(closed.row.quality, "review");
  assert.equal(filterCatalog([closed.row], {}).total, 0);
  assert.equal(filterCatalog([closed.row], { includeFragments: true }).total, 1);
});

test("conflicting sources: the mapped line wins and the disagreement is recorded", () => {
  const item = { ...trail("usgs-c2", path(1000)), sectionReportedMiles: 0.1 };
  auditCatalog([item]);
  assert.ok(item.row.flags!.includes("distance-mismatch"));
  assert.ok(Math.abs(item.row.miles! * MILE_METERS - 1000) < 5, "stored miles stay the mapped length");
});

test("fragment parents need the parent to be clearly longer", () => {
  const parents = findFragmentParents([
    { id: "a", key: "US:x", miles: 1, lines: north(0, 1600), bounds: measureLines(north(0, 1600)).bounds },
    { id: "b", key: "US:x", miles: 0.8, lines: north(2000, 3300), bounds: measureLines(north(2000, 3300)).bounds },
  ]);
  assert.equal(parents.size, 0);
});

test("short distances show meters instead of <0.1 mi", () => {
  assert.equal(formatDistance(100 / MILE_METERS).primary, "100 m");
  assert.equal(formatDistance(2).primary, "2.0 mi");
  assert.equal(formatDistance(2).secondary, "3.2 km");
});
