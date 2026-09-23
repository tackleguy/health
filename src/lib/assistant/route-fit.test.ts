import assert from "node:assert/strict";
import test from "node:test";
import { rankRoutes, gearResearchGaps } from "./route-fit";
import { expandRegion, regionMatches } from "./regions";
import { rankTrailSources, trailPublisher, trailSearchLocation } from "./trail-research";
import { EMPTY_REQUEST } from "./planning";
import type { PlannerGear, RouteCandidate } from "./types";

const trip = { ...EMPTY_REQUEST, region: "Colorado", distanceMiles: 30, days: 3 };
const route = (name: string, distanceMiles: number, difficulty = "moderate", region = "Colorado, USA"): RouteCandidate => ({ id: name, name, distanceMiles, difficulty, region, elevationFt: null, sourceUrl: null, sourceLabel: "test", note: "test" });

test("trip fit respects location, tight distance ranges and valid measurements", () => {
  const matches = rankRoutes(trip, [route("right", 28), route("wrong state", 30, "easy", "Utah"), route("Colorado named elsewhere", 30, "easy", "Oregon"), route("distant", 50), route("unknown", NaN)]);
  assert.deepEqual(matches.map(m => m.route.id), ["right"]);
  assert.deepEqual(rankRoutes({ ...trip, distanceMiles: 1 }, [route("too long", 3)]), []);
  assert.deepEqual(rankRoutes({ ...trip, distanceMiles: Infinity }, [route("valid", 30)]), []);
});

test("usual daily mileage changes route order and suggests enough days without silently editing the trip", () => {
  const routes = [route("exact but fast", 30), route("shorter at usual pace", 24)];
  assert.equal(rankRoutes(trip, routes)[0].route.id, "exact but fast");
  const personalized = rankRoutes(trip, routes, { usualMilesPerDay: 8 });
  assert.equal(personalized[0].route.id, "shorter at usual pace");
  assert.equal(personalized[1].suggestedDays, 4);
  assert.match(personalized[1].cautions.join(" "), /25% above/);
  assert.equal(trip.days, 3);
  const slower = rankRoutes({ ...trip, days: 4 }, routes, { usualMilesPerDay: 8 });
  assert.equal(slower[0].route.id, "exact but fast"); assert.equal(slower[0].suggestedDays, null);
});

test("overnight experience and a known overweight pack influence strenuous route comparisons", () => {
  const routes = [route("hard exact", 30, "hard"), route("moderate close", 29)];
  assert.equal(rankRoutes(trip, routes, { experience: "experienced" })[0].route.id, "hard exact");
  const beginner = rankRoutes(trip, routes, { experience: "new", packOverTarget: true });
  assert.equal(beginner[0].route.id, "moderate close");
  assert.equal(beginner[1].cautions.length, 2);
  assert.equal(rankRoutes(trip, [routes[0], routes[0]]).length, 1);
});

test("US and Canadian region aliases match whole place words, including accented names", () => {
  assert.equal(regionMatches("CO", "Colorado, USA"), true);
  assert.equal(regionMatches("BC", "Vancouver Island, British Columbia, Canada"), true);
  assert.equal(regionMatches("QC", "Québec, Canada"), true);
  assert.equal(regionMatches("USA", "Colorado, USA"), true);
  assert.equal(regionMatches("York", "Yorkshire"), false);
  assert.equal(regionMatches("CA", "Alberta, Canada"), false);
  assert.equal(expandRegion("Banff, AB"), "banff alberta");
});

test("gear readiness reports actual selected inventory and preserves unknowns", () => {
  const tent: PlannerGear = { id: "tent", name: "Tent", category: "Shelter", type: "Base", qty: 1, weightOz: null, packedSize: null, sourceUrl: null, sourceNote: "Unverified weight" };
  const gaps = gearResearchGaps([tent], trip);
  assert.ok(gaps.some(g => g.includes("Sleep System")));
  assert.ok(gaps.some(g => g.includes("unverified")));
  assert.ok(!gaps.some(g => g.startsWith("Shelter")));
  assert.equal(gearResearchGaps([], trip).length, 1);
  assert.ok(!gearResearchGaps([{ ...tent, sourceNote: null }], { ...trip, days: 1 }).length);
});

test("trail research ranks relevant official sources, rejects unrelated results and treats excerpts as discovery", () => {
  const sources = rankTrailSources("Banff 30 mile 3 day", [
    { title: "Banff backpacking guide", snippet: "Routes and loops for overnight camping", url: "https://example.com/guide" },
    { title: "Backcountry camping - Banff National Park", snippet: "Trail conditions and reservations", url: "https://parks.canada.ca/pn-np/ab/banff/backcountry" },
    { title: "Banff hotel deals", snippet: "Reserve a hotel", url: "https://example.com/hotels" },
    { title: "Colorado backpacking", snippet: "Trail routes", url: "https://www.nps.gov/colorado" },
    { title: "Banff camping", snippet: "Trail", url: "http://127.0.0.1/private" },
  ], "2026-09-23T00:00:00.000Z");
  assert.equal(sources.length, 2); assert.equal(sources[0].publisher, "Park or land manager");
  assert.ok(sources[0].topics.includes("Overnight planning"));
  assert.equal(sources[0].retrievedAt, "2026-09-23T00:00:00.000Z");
  assert.equal(trailPublisher("https://nps.gov.fake.example/trails"), "Independent guide · verify details");
  assert.equal(trailSearchLocation("BC 30 mile 3 day"), "british columbia");
  assert.doesNotThrow(() => rankTrailSources("Banff", [{ title: "Banff hiking", snippet: "Trail", url: "https://example.com/%zz" }]));
});
