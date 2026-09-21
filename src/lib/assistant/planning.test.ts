import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EMPTY_PROFILE, EMPTY_REQUEST, inferHistory, packReport, packingZone, parseTripRequest, rankRoutes } from "./planning";
import { memoryKey, parseMemory } from "./memory";
import { parseProduct, parseSearch, publicIPv4, sourceUrl, weightToOz } from "./research";
import type { PlannerGear, RouteCandidate, SavedPlan } from "./types";
const tent: PlannerGear = { id: "tent", name: "Test tent", category: "Shelter", type: "Base", qty: 1, weightOz: 32, packedSize: null, sourceUrl: null };
const route: RouteCandidate = { id: "route", name: "Colorado loop", region: "Colorado", distanceMiles: 28, elevationFt: null, difficulty: "hard", sourceUrl: null, sourceLabel: "fixture", note: "test" };
const trip = parseTripRequest("30 mile 3 day in colorado");
test("extracts informal requests and converts kilometers and nights without inventing missing fields", () => {
  assert.equal(trip.days, 3); assert.equal(trip.distanceMiles, 30); assert.equal(trip.region, "colorado"); assert.equal(trip.waterLiters, null);
  const metric = parseTripRequest("48 km, 2 nights near Colorado with my tent"); assert.equal(metric.distanceMiles, 29.8); assert.equal(metric.days, 3); assert.equal(metric.region, "Colorado");
  assert.equal(parseTripRequest("somewhere warm").distanceMiles, null);
  assert.equal(parseTripRequest("0 mile 0 days").days, null);
});
test("matches region and distance without treating distant trails as recommendations", () => {
  assert.equal(rankRoutes(trip, [route, { ...route, id: "wrong", region: "Utah", name: "Utah loop" }]).length, 1);
  assert.equal(rankRoutes({ ...trip, region: "CO" }, [route]).length, 1);
  assert.equal(rankRoutes({ ...trip, distanceMiles: 5 }, [route]).length, 0);
});
test("calculates carried versus worn weight, quantities, and starting water", () => {
  const report = packReport([tent, { ...tent, id: "socks", name: "Socks", type: "Worn", qty: 2, weightOz: 2 }], { ...trip, waterLiters: 2, foodOzPerDay: 20, fuelOz: 4 }, 15);
  assert.equal(report.baseLb, 2); assert.equal(report.wornLb, .25); assert.ok(Math.abs(report.loadedLb - 10.40925) < .001); assert.equal(report.complete, true);
  assert.equal(packReport([{ ...tent, weightOz: null }], trip, 10).complete, false);
  assert.equal(packReport([], { ...trip, suppliesInGear: true }, 10).complete, false);
  assert.equal(packReport([tent], trip, 10).missingSupplies.length, 3);
});
test("does not double add separately entered supplies when gear includes everything", () => {
  const food: PlannerGear = { ...tent, id: "food", type: "Consumable", weightOz: 48 };
  const report = packReport([tent, food], { ...trip, suppliesInGear: true, foodOzPerDay: 16, waterLiters: 2, fuelOz: 4 }, 10);
  assert.equal(report.loadedLb, 5); assert.equal(report.complete, true);
  assert.equal(packReport([food], { ...trip, foodOzPerDay: 16 }, null).duplicateSupplies, true);
});
test("packing positions keep emergency gear accessible and worn gear separate", () => {
  assert.equal(packingZone({ ...tent, name: "First aid" }), "Top / quick access");
  assert.equal(packingZone({ ...tent, category: "Sleep System" }), "Bottom");
  assert.equal(packingZone({ ...tent, type: "Worn" }), "Worn");
});
test("learns only from completed feedback and prefers explicit profile values", () => {
  const plan: SavedPlan = { id: "one", prompt: "test", request: trip, route, gear: [tent], packedIds: [], savedAt: "2026-09-21", feedback: null };
  assert.equal(inferHistory(EMPTY_PROFILE, [plan], []).comfortablePackLb, null);
  const completed = { ...plan, feedback: { effort: "right" as const, packComfort: "comfortable" as const, carriedLb: 24, notes: "" } };
  assert.equal(inferHistory(EMPTY_PROFILE, [completed], []).comfortablePackLb, 24);
  assert.equal(inferHistory(EMPTY_PROFILE, [completed], []).usualMilesPerDay, 28/3);
  assert.equal(inferHistory({ ...EMPTY_PROFILE, comfortablePackLb: 20 }, [completed], []).comfortablePackLb, 20);
  assert.equal(inferHistory(EMPTY_PROFILE, [{ ...completed, feedback: { ...completed.feedback, packComfort: "too-heavy" } }], []).comfortablePackLb, null);
});
test("memory separates accounts and safely handles malformed saved data", () => {
  assert.notEqual(memoryKey("a"), memoryKey("b")); assert.notEqual(memoryKey(null), memoryKey("a"));
  assert.deepEqual(parseMemory("broken").gear, []);
  assert.equal(parseMemory(JSON.stringify({ version: 1, profile: { comfortablePackLb: -30 }, gear: [null, { ...tent, weightOz: -4 }] })).gear[0].weightOz, null);
  assert.equal(parseMemory(JSON.stringify({ version: 1, plans: [{ id: "p", savedAt: "now", request: EMPTY_REQUEST, gear: [], feedback: {} }] })).plans[0].feedback, null);
});
test("weights convert once, preserving compound pounds and ounces", () => {
  assert.equal(weightToOz("3 lb 6 oz (1.54 kg)"), 54);
  assert.equal(weightToOz("1.25 kg"), 44.09);
  assert.equal(weightToOz("100 g"), 3.53);
  assert.equal(weightToOz("32 inches"), null);
});
test("product extraction separates packed sizes, floor sizes, minimum weights and shipping", () => {
  const result = parseProduct('<title>Exact model</title><dl><dt>Shipping Weight</dt><dd>6 lb</dd><dt>Minimum Weight</dt><dd>3 lb (1.36 kg)</dd><dt>Packaged Weight</dt><dd>3 lb 6 oz (1.54 kg)</dd><dt>Packed Size</dt><dd>20 x 5.5 in</dd><dt>Floor Dimensions</dt><dd>84 x 50 in</dd></dl>', "https://example.com/product");
  assert.equal(result.facts.length, 4); assert.equal(result.facts[0].weightOz, 48); assert.equal(result.facts[1].weightOz, 54); assert.equal(result.facts[2].kind, "packed-size"); assert.equal(result.facts[3].kind, "dimensions");
  assert.deepEqual(parseProduct("<p>A featherweight tent with a 20 inch pole</p>", "https://example.com").facts, []);
});
test("public source fetch rejects local and special networks and unsafe URL schemes", () => {
  ["127.0.0.1", "10.1.1.1", "172.16.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "224.1.1.1"].forEach(ip => assert.equal(publicIPv4(ip), false, ip));
  assert.equal(publicIPv4("1.1.1.1"), true);
  ["http://example.com", "https://127.0.0.1", "https://user:pass@example.com", "https://site.local", "https://example.com:8000", "file:///etc/passwd"].forEach(url => assert.throws(() => sourceUrl(url)));
  assert.equal(sourceUrl("https://example.com/product").hostname, "example.com");
});
test("search sources reject unsafe links and decode public result text", () => {
  const sources = parseSearch('<rss><item><title>Tent &amp; Pack</title><link>https://example.com/product</link><description>Specs</description></item><item><title>bad</title><link>javascript:alert(1)</link></item></rss>');
  assert.equal(sources.length, 1); assert.equal(sources[0].title, "Tent & Pack");
});

test("AI output cannot introduce weights, specifications, or unapproved text", async () => {
  const { planInsights, validateInsightSelection } = await import("./insights");
  const insights = planInsights(trip, route, [], EMPTY_PROFILE, [], []);
  assert.ok(insights.some(i => i.id === "weight" && i.text.includes("0.0 lb") && i.text.includes("incomplete")));
  assert.deepEqual(validateInsightSelection('{"ids":["route","weight"]}', insights), insights.filter(i => ["route", "weight"].includes(i.id)).map(i => i.text));
  assert.throws(() => validateInsightSelection('{"ids":["invented 14 lb"]}', insights));
  assert.throws(() => validateInsightSelection('The pack is 14 lb', insights));
});
