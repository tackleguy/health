import { normalizeTrailName } from "./through-hikes";
import { MILE_METERS, metersBetween, type Lines, type Point } from "./quality";

export const CENSUS_DIVISIONS: Record<string, string[]> = {
  "New England": ["Connecticut", "Maine", "Massachusetts", "New Hampshire", "Rhode Island", "Vermont"],
  "Mid-Atlantic": ["New Jersey", "New York", "Pennsylvania"],
  "East North Central": ["Illinois", "Indiana", "Michigan", "Ohio", "Wisconsin"],
  "West North Central": ["Iowa", "Kansas", "Minnesota", "Missouri", "Nebraska", "North Dakota", "South Dakota"],
  "South Atlantic": ["Delaware", "District of Columbia", "Florida", "Georgia", "Maryland", "North Carolina", "South Carolina", "Virginia", "West Virginia"],
  "East South Central": ["Alabama", "Kentucky", "Mississippi", "Tennessee"],
  "West South Central": ["Arkansas", "Louisiana", "Oklahoma", "Texas"],
  Mountain: ["Arizona", "Colorado", "Idaho", "Montana", "Nevada", "New Mexico", "Utah", "Wyoming"],
  Pacific: ["Alaska", "California", "Hawaii", "Oregon", "Washington"],
};
const DIVISION_OF = new Map(Object.entries(CENSUS_DIVISIONS).flatMap(([division, states]) => states.map((s) => [s, division] as const)));
export const divisionOf = (state: string | null) => (state ? DIVISION_OF.get(state) ?? null : null);

export interface OsmWay { id: number; tags: Record<string, string>; line: Point[] }
export type Verdict = "confirmed" | "same-path-other-name" | "same-path-unnamed-in-osm" | "length-differs" | "partly-mapped" | "not-in-osm" | "follows-road" | "ski-piste";
export interface OsmVerdict {
  verdict: Verdict;
  /** Share of our line within MATCH_METERS of an OSM foot/bike path or track. */
  coverage: number;
  /** Share of our line on OSM public roads (residential, service, unclassified). */
  roadCoverage: number;
  pisteCoverage: number;
  /** Most common name among the OSM paths our line follows. */
  osmName: string | null;
  nameAgrees: boolean;
  /** Our miles ÷ total length of same-named OSM paths nearby; null when OSM has no same-named path. */
  lengthRatio: number | null;
  osmNamedMiles: number | null;
}

const MATCH_METERS = 25;
const PATH = new Set(["path", "footway", "track", "bridleway", "cycleway", "steps", "pedestrian"]);
const ROAD = new Set(["service", "unclassified", "residential", "living_street"]);
const FILLER = new Set(["trail", "trails", "tr", "trl", "path", "loop", "the", "national", "recreation", "nrt", "scenic", "nst", "footpath", "hiking", "hike", "route", "connector", "spur", "segment", "section", "of", "and", "no"]);
const EXPAND: Record<string, string> = { mt: "mount", mtn: "mountain", st: "saint", ft: "fort", pk: "peak", ck: "creek", cr: "creek", crk: "creek", lk: "lake", n: "north", s: "south", e: "east", w: "west" };

function tokens(name: string) {
  return new Set(normalizeTrailName(name).split(" ").map((t) => EXPAND[t] ?? t).filter((t) => t && !FILLER.has(t)));
}
/** Names agree when their distinctive words overlap (e.g. "BRIGHT ANGEL TR" ≈ "Bright Angel Trail"). */
export function namesAgree(a: string, b: string) {
  const x = tokens(a), y = tokens(b);
  if (!x.size || !y.size) return normalizeTrailName(a) === normalizeTrailName(b);
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / Math.min(x.size, y.size) >= 0.6;
}

type XY = [number, number];
function project(p: Point, lat0: number): XY { return [p[0] * 111_320 * Math.cos(lat0 * Math.PI / 180), p[1] * 110_540]; }
function segDist(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function samples(lines: Lines, lat0: number, spacing = 25) {
  const out: XY[] = [];
  let total = 0;
  for (const line of lines) for (let i = 1; i < line.length; i++) total += metersBetween(line[i - 1], line[i]);
  const step = Math.max(spacing, total / 600);
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = project(line[i - 1], lat0), b = project(line[i], lat0);
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let s = i === 1 ? 0 : 1; s <= n; s++) out.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]);
    }
  }
  return out;
}
const wayMeters = (line: Point[]) => { let m = 0; for (let i = 1; i < line.length; i++) m += metersBetween(line[i - 1], line[i]); return m; };

export function compareWithOsm(name: string, miles: number, lines: Lines, ways: OsmWay[]): OsmVerdict {
  const lat0 = lines[0]?.[0]?.[1] ?? 0;
  const points = samples(lines, lat0);
  const projected = ways.map((w) => ({ way: w, xy: w.line.map((p) => project(p, lat0)) }));
  let onPath = 0, onRoad = 0, onPiste = 0;
  const nameHits = new Map<string, number>();
  for (const p of points) {
    let path = false, road = false, piste = false;
    const namesHere = new Set<string>();
    for (const { way, xy } of projected) {
      let near = false;
      for (let i = 1; i < xy.length && !near; i++) near = segDist(p, xy[i - 1], xy[i]) <= MATCH_METERS;
      if (!near) continue;
      const hw = way.tags.highway;
      if (way.tags["piste:type"]) piste = true;
      if (hw && PATH.has(hw)) { path = true; if (way.tags.name) namesHere.add(way.tags.name); }
      else if (hw && ROAD.has(hw)) road = true;
    }
    if (path) onPath++;
    else if (road) onRoad++;
    if (piste) onPiste++;
    for (const n of namesHere) nameHits.set(n, (nameHits.get(n) ?? 0) + 1);
  }
  const n = Math.max(1, points.length);
  const coverage = onPath / n, roadCoverage = onRoad / n, pisteCoverage = onPiste / n;
  const osmName = [...nameHits].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const nameAgrees = [...nameHits.keys()].some((osm) => namesAgree(name, osm));
  // Same-named OSM paths in the area: their total length is OSM's idea of this trail's length.
  const sameNamed = ways.filter((w) => w.tags.name && PATH.has(w.tags.highway ?? "") && namesAgree(name, w.tags.name));
  const osmNamedMeters = sameNamed.reduce((sum, w) => sum + wayMeters(w.line), 0);
  const lengthRatio = osmNamedMeters > 0 ? (miles * MILE_METERS) / osmNamedMeters : null;

  let verdict: Verdict;
  if (pisteCoverage >= 0.6 && coverage < 0.3) verdict = "ski-piste";
  else if (roadCoverage >= 0.6) verdict = "follows-road";
  else if (coverage < 0.3) verdict = "not-in-osm";
  else if (coverage < 0.6) verdict = "partly-mapped";
  else if (nameAgrees && lengthRatio !== null && (lengthRatio < 0.67 || lengthRatio > 1.5)) verdict = "length-differs";
  else if (nameAgrees) verdict = "confirmed";
  else if (osmName) verdict = "same-path-other-name";
  else verdict = "same-path-unnamed-in-osm";
  return { verdict, coverage, roadCoverage, pisteCoverage, osmName, nameAgrees, lengthRatio, osmNamedMiles: osmNamedMeters ? osmNamedMeters / MILE_METERS : null };
}
