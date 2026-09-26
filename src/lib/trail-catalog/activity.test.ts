import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesCatalogActivity,
  parseCatalogActivity,
  trailActivities,
} from "./activity";
import { filterCatalog, parseCatalogFilters } from "./search";
import type { CatalogTrail } from "./types";

const base = {
  country: "US",
  region: "Colorado",
  latitude: 40,
  longitude: -105,
  miles: 5,
  difficulty: null,
  dogs: null,
  manager: null,
  kind: "segment",
  tags: [],
  surface: null,
} as CatalogTrail;

test("activity parsing defaults and rejects unknown values", () => {
  assert.equal(parseCatalogActivity("hike"), "hike");
  assert.equal(parseCatalogActivity("trail running"), undefined);
  assert.equal(parseCatalogFilters(new URLSearchParams()).activity, "hike");
  assert.equal(parseCatalogFilters(new URLSearchParams("activity=bike")).activity, "bike");
  assert.equal(parseCatalogFilters(new URLSearchParams("activity=ski")).includeWinter, true);
});

test("classifies backpacking, bike, run and ski from name and length", () => {
  assert.ok(trailActivities({ ...base, id: "h", name: "Pine Creek Trail" }).includes("hike"));
  assert.ok(matchesCatalogActivity({ ...base, id: "b", name: "Pine Creek MTB Trail" }, "bike"));
  assert.ok(matchesCatalogActivity({ ...base, id: "r", name: "Riverfront Trail Run" }, "run"));
  assert.ok(matchesCatalogActivity({ ...base, id: "s", name: "Nordic Ski Loop" }, "ski"));
  assert.ok(matchesCatalogActivity({ ...base, id: "p", name: "High Sierra", kind: "route", miles: 80 }, "backpack"));
  assert.ok(matchesCatalogActivity({ ...base, id: "l", name: "Long Canyon", miles: 22 }, "backpack"));
  assert.equal(matchesCatalogActivity({ ...base, id: "w", name: "Nordic Ski Loop" }, "hike"), false);
});

test("default hike filter keeps summer hiking and drops ski-named sections", () => {
  const rows = [
    { ...base, id: "hike", name: "Eagle Peak Trail" },
    { ...base, id: "ski", name: "Eagle Peak Ski Trail" },
    { ...base, id: "bike", name: "Eagle Peak Bike Path" },
    { ...base, id: "route", name: "Continental Divide Trail", kind: "route" as const, miles: 100 },
  ];
  assert.deepEqual(filterCatalog(rows, { activity: "hike" }).trails.map((t) => t.id).sort(), ["hike", "route"]);
  assert.deepEqual(filterCatalog(rows, { activity: "ski" }).trails.map((t) => t.id), ["ski"]);
  assert.deepEqual(filterCatalog(rows, { activity: "bike" }).trails.map((t) => t.id), ["bike"]);
  assert.ok(filterCatalog(rows, { activity: "backpack" }).trails.some((t) => t.id === "route"));
  assert.ok(filterCatalog(rows, { activity: "run" }).trails.some((t) => t.id === "hike"));
});
