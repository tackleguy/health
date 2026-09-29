import { metersBetween, type Lines, type Point } from "./quality";

/** A new source line within this distance of an existing catalog line is the same trail. */
export const DUPLICATE_METERS = 25;
/** Share of a new line that must already be in the catalog for it to be a duplicate. */
export const DUPLICATE_SHARE = 0.6;
/** New trails must be at least this long. */
export const MIN_NEW_TRAIL_MILES = 0.3;
/** Mountain terrain: elevation varies at least this much across the trail and 1 km around it. */
export const MOUNTAIN_RELIEF_METERS = 100;
/** …or the trail itself climbs at least this much between its lowest and highest sampled points. */
export const MOUNTAIN_CLIMB_METERS = 60;
/** Distance of the four surrounding terrain samples from the trail's middle. */
export const SURROUND_METERS = 1000;

const RAD = Math.PI / 180;
type XY = [number, number];
const toXY = ([lng, lat]: Point): XY => [lng * 111_320 * Math.cos(lat * RAD), lat * 110_540];
const CELL = DUPLICATE_METERS * 2;
const key = (x: number, y: number) => (x + 2_097_152) * 4_194_304 + (y + 2_097_152);

function segDist(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Spatial hash of existing catalog lines, answering "how much of this new line is already listed?" */
export class LineIndex {
  private cells = new Map<number, [XY, XY][]>();
  add(lines: Lines) {
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = toXY(line[i - 1]), b = toXY(line[i]);
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 2)));
        let last = NaN;
        for (let s = 0; s <= steps; s++) {
          const k = key(Math.floor((a[0] + (b[0] - a[0]) * s / steps) / CELL), Math.floor((a[1] + (b[1] - a[1]) * s / steps) / CELL));
          if (k === last) continue;
          last = k;
          const bucket = this.cells.get(k);
          if (bucket) bucket.push([a, b]); else this.cells.set(k, [[a, b]]);
        }
      }
    }
  }
  private near(p: XY) {
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
      for (const [a, b] of this.cells.get(key(x, y)) ?? []) if (segDist(p, a, b) <= DUPLICATE_METERS) return true;
    }
    return false;
  }
  /** Share of `lines` (sampled every ~20 m) that lies on an indexed line. */
  coveredShare(lines: Lines) {
    let total = 0, hit = 0;
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = toXY(line[i - 1]), b = toXY(line[i]);
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20));
        for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
          total++;
          if (this.near([a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps])) hit++;
        }
      }
    }
    return total ? hit / total : 0;
  }
}

/** Evenly spaced points along the lines (by distance), always including both ends. */
export function pointsAlong(lines: Lines, count: number): Point[] {
  const all = lines.flat();
  if (all.length <= count) return all;
  const cumulative: number[] = [0];
  for (let i = 1; i < all.length; i++) cumulative.push(cumulative[i - 1] + metersBetween(all[i - 1], all[i]));
  const total = cumulative[cumulative.length - 1];
  const out: Point[] = [];
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    let i = cumulative.findIndex((c) => c >= target);
    if (i < 0) i = all.length - 1;
    out.push(all[i]);
  }
  return out;
}

/** Four points SURROUND_METERS north, east, south and west of `p`, to measure the terrain around a trail. */
export function surroundingPoints([lng, lat]: Point): Point[] {
  const dLat = SURROUND_METERS / 110_540, dLng = SURROUND_METERS / (111_320 * Math.cos(lat * RAD));
  return [[lng, lat + dLat], [lng + dLng, lat], [lng, lat - dLat], [lng - dLng, lat]];
}

export interface TerrainCheck { mountain: boolean; minMeters: number; maxMeters: number; reliefMeters: number; climbMeters: number }

/** Mountain terrain from sampled elevations: the land around the trail is steep, or the trail climbs. */
export function classifyTerrain(alongMeters: number[], aroundMeters: number[]): TerrainCheck {
  const along = alongMeters.filter(Number.isFinite), around = aroundMeters.filter(Number.isFinite);
  if (!along.length) return { mountain: false, minMeters: NaN, maxMeters: NaN, reliefMeters: 0, climbMeters: 0 };
  const minMeters = Math.min(...along), maxMeters = Math.max(...along);
  const everything = [...along, ...around];
  const reliefMeters = Math.max(...everything) - Math.min(...everything);
  const climbMeters = maxMeters - minMeters;
  return { mountain: reliefMeters >= MOUNTAIN_RELIEF_METERS || climbMeters >= MOUNTAIN_CLIMB_METERS, minMeters, maxMeters, reliefMeters, climbMeters };
}

/** NPS layer values that mean the trail is not a real, open, maintained foot trail. */
export const NPS_WHERE = [
  "TRLNAME IS NOT NULL AND TRLNAME <> ' ' AND TRLNAME <> ''",
  "TRLSTATUS IN ('Existing','Exisiting')",
  "(ISEXTANT IS NULL OR ISEXTANT <> 'False')",
  "(TRLFEATTYPE IS NULL OR TRLFEATTYPE NOT IN ('Unofficial Trail','Unmaintained Trail','Unmaintained Trail Centerline'))",
  "(TRLTYPE IS NULL OR TRLTYPE NOT IN ('Sidewalk','Water Trail','Snow Trail','Ferry Route'))",
].join(" AND ");
