import type { CatalogTrail } from "./types";
import { matchThroughHike, normalizeTrailName } from "./through-hikes";

export type Point = [number, number];
export type Lines = Point[][];
export type CatalogSection = { row: CatalogTrail; lines: Lines };
export type MergedTrail = { row: CatalogTrail; lines: Lines; sectionIds: string[] };

/** Sections of the same named trail whose lines come within this distance are one trail. */
export const JOIN_METERS = 200;
/** Stretches of a section within this distance of an already-counted section are overlap. */
export const OVERLAP_METERS = 15;
const EARTH_MILES = 3958.7613;
const RAD = Math.PI / 180;
const GENERIC_NAMES = new Set(["unnamed", "unnamed trail", "unknown", "no name", "none", "trail", "path", "n a"]);

export function milesBetween(a: Point, b: Point) {
  const h = Math.sin((b[1] - a[1]) * RAD / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin((b[0] - a[0]) * RAD / 2) ** 2;
  return EARTH_MILES * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function geometryMiles(lines: Lines) {
  let total = 0;
  for (const line of lines) for (let i = 1; i < line.length; i++) total += milesBetween(line[i - 1], line[i]);
  return total;
}

export { normalizeTrailName };

/** Sections sharing a key are candidates for one trail; generic names never merge. Through-hike keys start with "route-". */
export function mergeKey(row: CatalogTrail) {
  const name = normalizeTrailName(row.name);
  if (!name || GENERIC_NAMES.has(name)) return null;
  const pattern = matchThroughHike(name);
  return pattern && pattern.country === row.country ? `${row.country}:${pattern.id}` : `${row.country}:${name}`;
}

/**
 * USGS lengthmiles is kept when it agrees with the mapped line. Ontario lengths are rounded
 * whole-trail values repeated on every segment, so mapped geometry is used for Ontario and Parks Canada.
 */
export function sectionLength(row: CatalogTrail, lines: Lines): { miles: number; basis: "source" | "geometry" } {
  const mapped = geometryMiles(lines);
  const reported = row.distanceBasis === "source" ? row.miles : null;
  if (row.source === "usgs" && reported !== null && reported > 0) {
    const ratio = mapped > 0 ? reported / mapped : Infinity;
    if ((ratio >= 0.67 && ratio <= 1.5) || (mapped < 0.05 && reported < 0.1)) return { miles: reported, basis: "source" };
  }
  return { miles: mapped, basis: "geometry" };
}

type XY = [number, number];
const toXY = (p: Point): XY => [p[0] * 111_320 * Math.cos(p[1] * RAD), p[1] * 110_540];
const cellKey = (cx: number, cy: number) => (cx + 1_048_576) * 2_097_152 + (cy + 1_048_576);

function distanceToSegment(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Samples points every `spacing` meters along each line. Points within `margin` of a line's ends are
 * skipped so sections that merely touch end to end are not treated as overlapping.
 */
function interiorSamples(lines: XY[][], spacing: number, margin: number) {
  const all: XY[] = [], interior: XY[] = [];
  for (const line of lines) {
    const points: { p: XY; along: number }[] = [{ p: line[0], along: 0 }];
    let along = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(length / spacing));
      for (let s = 1; s <= steps; s++) points.push({ p: [a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps], along: along + length * s / steps });
      along += length;
    }
    for (const { p, along: at } of points) {
      all.push(p);
      if (at > margin && at < along - margin) interior.push(p);
    }
  }
  return interior.length > 0 ? interior : all;
}

/** Spatial hash of line segments that answers "is any indexed segment within `radius` of p". */
class SegmentGrid {
  private cells = new Map<number, number[]>();
  private segments: { owner: number; a: XY; b: XY }[] = [];
  private cell: number;
  constructor(private radius: number) { this.cell = radius * 2; }

  add(owner: number, lines: XY[][]) {
    const spacing = this.cell / 4;
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const index = this.segments.push({ owner, a, b }) - 1;
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing));
        let last = NaN;
        for (let s = 0; s <= steps; s++) {
          const key = cellKey(Math.floor((a[0] + (b[0] - a[0]) * s / steps) / this.cell), Math.floor((a[1] + (b[1] - a[1]) * s / steps) / this.cell));
          if (key === last) continue;
          last = key;
          const bucket = this.cells.get(key);
          if (!bucket) this.cells.set(key, [index]);
          else if (bucket[bucket.length - 1] !== index) bucket.push(index);
        }
      }
    }
  }

  /** Owners with a segment within radius of p, excluding `skip`. */
  near(p: XY, visit: (owner: number) => boolean | void, skip = -1) {
    const cx = Math.floor(p[0] / this.cell), cy = Math.floor(p[1] / this.cell);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        const bucket = this.cells.get(cellKey(x, y));
        if (!bucket) continue;
        for (const index of bucket) {
          const segment = this.segments[index];
          if (segment.owner === skip) continue;
          if (distanceToSegment(p, segment.a, segment.b) <= this.radius && visit(segment.owner) === true) return;
        }
      }
    }
  }
}

/** Groups same-name sections into connected trails (lines within JOIN_METERS of each other). */
export function connectedGroups(sections: CatalogSection[]): number[][] {
  if (sections.length <= 1) return sections.map((_, i) => [i]);
  const parent = sections.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const projected = sections.map((s) => s.lines.map((line) => line.map(toXY)));
  const grid = new SegmentGrid(JOIN_METERS);
  projected.forEach((lines, i) => grid.add(i, lines));
  projected.forEach((lines, i) => {
    for (const line of lines) {
      for (const end of [line[0], line[line.length - 1]]) {
        grid.near(end, (j) => { const a = find(i), b = find(j); if (a !== b) parent[a] = b; }, i);
      }
    }
  });
  const groups = new Map<number, number[]>();
  sections.forEach((_, i) => { const root = find(i); const group = groups.get(root); if (group) group.push(i); else groups.set(root, [i]); });
  return [...groups.values()];
}

/** Joins lines whose endpoints coincide into longer lines. */
export function joinLines(lines: Lines): Lines {
  if (lines.length <= 1) return lines;
  const key = (p: Point) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  const ends = new Map<string, number[]>();
  lines.forEach((line, i) => {
    for (const k of new Set([key(line[0]), key(line[line.length - 1])])) {
      const list = ends.get(k);
      if (list) list.push(i); else ends.set(k, [i]);
    }
  });
  const used = new Uint8Array(lines.length);
  const next = (k: string) => ends.get(k)?.find((j) => !used[j]);
  const out: Lines = [];
  for (let i = 0; i < lines.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    let line = lines[i];
    for (let j = next(key(line[line.length - 1])); j !== undefined; j = next(key(line[line.length - 1]))) {
      used[j] = 1;
      const other = lines[j];
      line = key(other[0]) === key(line[line.length - 1]) ? [...line, ...other.slice(1)] : [...line, ...other.slice(0, -1).reverse()];
    }
    for (let j = next(key(line[0])); j !== undefined; j = next(key(line[0]))) {
      used[j] = 1;
      const other = lines[j];
      line = key(other[other.length - 1]) === key(line[0]) ? [...other.slice(0, -1), ...line] : [...other.slice(1).reverse(), ...line];
    }
    out.push(line);
  }
  return out;
}

const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;

function mostCommon<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null, bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return best;
}

/**
 * Combines one connected group into a trail. Length is the sum of section lengths after removing
 * stretches already covered by a longer section, so duplicated or overlapping sections count once.
 */
function combine(group: CatalogSection[], regionAt?: (point: Point, country: string) => string | null): MergedTrail {
  const measured = group
    .map((section) => ({ section, ...sectionLength(section.row, section.lines) }))
    .sort((a, b) => b.miles - a.miles || a.section.row.id.localeCompare(b.section.row.id));
  if (measured.length === 1) {
    const [{ section, miles, basis }] = measured;
    return { row: { ...section.row, miles: round(miles), distanceBasis: basis, sectionCount: 1 }, lines: section.lines, sectionIds: [section.row.id] };
  }
  const grid = new SegmentGrid(OVERLAP_METERS);
  let miles = 0, allSource = true;
  const kept: Lines = [];
  measured.forEach(({ section, miles: sectionMiles, basis }, i) => {
    const projected = section.lines.map((line) => line.map(toXY));
    let fresh = 1;
    if (i > 0) {
      const points = interiorSamples(projected, OVERLAP_METERS / 2, OVERLAP_METERS * 1.5);
      let covered = 0;
      for (const p of points) {
        let hit = false;
        grid.near(p, () => { hit = true; return true; });
        if (hit) covered++;
      }
      fresh = 1 - covered / points.length;
    }
    if (fresh < 0.05) return;
    miles += sectionMiles * fresh;
    if (basis !== "source") allSource = false;
    kept.push(...section.lines);
    grid.add(i, projected);
  });
  const lines = joinLines(kept);
  const primary = measured[0].section.row;
  let longest = lines[0], longestMiles = -1;
  for (const line of lines) { const m = geometryMiles([line]); if (m > longestMiles) { longest = line; longestMiles = m; } }
  const pin = longest[Math.floor(longest.length / 2)];
  const rows = measured.map((m) => m.section.row);
  const dates = rows.map((r) => r.sourceDate).filter((d): d is string => d !== null).sort();
  return {
    row: {
      ...primary,
      miles: round(miles),
      distanceBasis: allSource ? "source" : "geometry",
      latitude: pin[1],
      longitude: pin[0],
      region: regionAt?.(pin, primary.country) ?? primary.region,
      difficulty: primary.difficulty ?? mostCommon(rows.map((r) => r.difficulty)),
      dogs: primary.dogs ?? mostCommon(rows.map((r) => r.dogs)),
      officialUrl: primary.officialUrl ?? mostCommon(rows.map((r) => r.officialUrl)),
      manager: primary.manager ?? mostCommon(rows.map((r) => r.manager)),
      surface: primary.surface ?? mostCommon(rows.map((r) => r.surface)),
      season: primary.season ?? mostCommon(rows.map((r) => r.season)),
      sourceDate: dates[dates.length - 1] ?? null,
      sectionCount: rows.length,
    },
    lines,
    sectionIds: rows.map((r) => r.id),
  };
}

/** Merges connected same-name sections into whole trails and corrects every trail's length. */
export function mergeCatalogSections(
  sections: CatalogSection[],
  options: { regionAt?: (point: Point, country: string) => string | null } = {},
): MergedTrail[] {
  const byKey = new Map<string, CatalogSection[]>();
  const trails: MergedTrail[] = [];
  for (const section of sections) {
    const key = mergeKey(section.row);
    if (key === null) { trails.push(combine([section])); continue; }
    const list = byKey.get(key);
    if (list) list.push(section); else byKey.set(key, [section]);
  }
  for (const [key, group] of byKey) {
    // A named through-hike is one trail even where the source data has gaps between its sections.
    if (key.includes(":route-")) { trails.push(combine(group, options.regionAt)); continue; }
    for (const indexes of connectedGroups(group)) trails.push(combine(indexes.map((i) => group[i]), options.regionAt));
  }
  return trails;
}
