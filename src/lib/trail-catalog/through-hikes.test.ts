import test from "node:test";
import assert from "node:assert/strict";
import type { CatalogTrail } from "./types";
import {
  aggregateThroughHikes,
  buildThroughHikeOverlay,
  curatedThroughHikes,
  dedupeSectionsByName,
  isPriorityThroughHikeSection,
} from "./through-hikes";
import { PACK_TRAILS } from "@/lib/gear";
import { filterCatalog, parseCatalogFilters } from "./search";

test("curated through-hikes cover every PACK_TRAIL with coordinates and unique ids", () => {
  const guides = curatedThroughHikes();
  assert.equal(guides.length, PACK_TRAILS.length);
  assert.equal(new Set(guides.map((g) => g.id)).size, guides.length);
  assert.ok(guides.every((g) => g.kind === "route" && g.source === "guide"));
  assert.ok(guides.every((g) => Number.isFinite(g.latitude) && Number.isFinite(g.longitude)));
  assert.ok(guides.every((g) => Math.abs(g.latitude) > 0.1 || Math.abs(g.longitude) > 0.1));
  assert.ok(guides.some((g) => g.country === "NP"));
  assert.ok(guides.some((g) => g.country === "NZ"));
  assert.ok(guides.some((g) => g.country === "FR"));
});

test("aggregate through-hikes from matching National Scenic sections", () => {
  const sections = [
    {
      id: "usgs-1",
      name: "Pacific Crest National Scenic Trail",
      country: "US",
      kind: "segment",
      miles: 12,
      latitude: 34,
      longitude: -118,
    },
    {
      id: "usgs-2",
      name: "Pacific Crest National Scenic Trail",
      country: "US",
      kind: "segment",
      miles: 8,
      latitude: 35,
      longitude: -119,
    },
    {
      id: "usgs-3",
      name: "Unrelated Spur",
      country: "US",
      kind: "segment",
      miles: 2,
      latitude: 40,
      longitude: -105,
    },
  ] as CatalogTrail[];
  const routes = aggregateThroughHikes(sections);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].id, "route-pct");
  assert.equal(routes[0].sectionCount, 2);
  assert.equal(routes[0].mappedMiles, 20);
  assert.equal(routes[0].miles, 2650);
});

test("overlay prefers aggregates over curated guides for the same name", () => {
  const sections = [
    {
      id: "usgs-1",
      name: "Appalachian National Scenic Trail",
      country: "US",
      kind: "segment",
      miles: 5,
      latitude: 35,
      longitude: -83,
    },
  ] as CatalogTrail[];
  const overlay = buildThroughHikeOverlay(sections);
  const at = overlay.find((r) => r.name === "Appalachian Trail");
  assert.ok(at);
  assert.equal(at!.source, "route-aggregate");
  assert.ok(overlay.some((r) => r.country === "IS"));
});

test("dedupe keeps longest section per name and all routes", () => {
  const rows = [
    { id: "a", name: "Eagle Peak", country: "US", kind: "segment", miles: 2 },
    { id: "b", name: "Eagle Peak", country: "US", kind: "segment", miles: 7 },
    { id: "route-x", name: "Eagle Peak", country: "US", kind: "route", miles: 100 },
  ] as CatalogTrail[];
  const deduped = dedupeSectionsByName(rows);
  assert.deepEqual(
    deduped.map((r) => r.id).sort(),
    ["b", "route-x"],
  );
});

test("priority matcher recognizes scenic trail names", () => {
  assert.equal(isPriorityThroughHikeSection("Pacific Crest National Scenic Trail"), true);
  assert.equal(isPriorityThroughHikeSection("Random Ridge Trail"), false);
});

test("filters support through-hike kind, international country, and unique names", () => {
  const rows = [
    { id: "route-guide-tmb", name: "Tour du Mont Blanc", country: "FR", kind: "route", miles: 105, latitude: 45.9, longitude: 6.8 },
    { id: "usgs-1", name: "Eagle Peak", country: "US", kind: "segment", miles: 2, latitude: 40, longitude: -105 },
    { id: "usgs-2", name: "Eagle Peak", country: "US", kind: "segment", miles: 9, latitude: 40.1, longitude: -105.1 },
  ] as CatalogTrail[];
  assert.deepEqual(filterCatalog(rows, { kind: "route" }).trails.map((t) => t.id), ["route-guide-tmb"]);
  assert.deepEqual(filterCatalog(rows, { country: "intl" }).trails.map((t) => t.id), ["route-guide-tmb"]);
  assert.deepEqual(filterCatalog(rows, { uniqueNames: true, kind: "segment" }).trails.map((t) => t.id), ["usgs-2"]);
  assert.equal(parseCatalogFilters(new URLSearchParams("country=intl&kind=route&uniqueNames=true")).country, "intl");
  assert.equal(parseCatalogFilters(new URLSearchParams("country=NP")).country, "NP");
  assert.equal(parseCatalogFilters(new URLSearchParams("country=ZZ")).country, undefined);
});
