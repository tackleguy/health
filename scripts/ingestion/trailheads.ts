/** Downloads OpenStreetMap trailheads (highway=trailhead, ODbL) for North America into a local cache that
 * `npm run source:trails` uses to give each trail a start point. Public Overpass instances are slow and
 * sometimes down, so this runs once at build time rather than on each page view.
 * Run with npm run source:trailheads [--refresh].
 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import type { TrailheadCache } from "../../src/lib/trail-catalog/access";

const cache = path.join(process.cwd(), ".cache/trailheads");
const target = path.join(cache, "trailheads-na.json.gz");
const refresh = process.argv.includes("--refresh");
const QUERY = `[out:json][timeout:600];nwr["highway"="trailhead"](14,-170,72,-50);out center tags;`;
const ENDPOINTS = [
  process.env.OVERPASS_API_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
].filter((url): url is string => Boolean(url));

type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

async function fetchAll(): Promise<{ elements: Element[]; osm3s?: { timestamp_osm_base?: string } }> {
  // A previously downloaded raw response can be reused (e.g. fetched by hand from a mirror).
  if (!refresh) { try { return JSON.parse(await readFile(path.join(cache, "th.json"), "utf8")); } catch { /* fetch */ } }
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Querying ${endpoint}…`);
      const response = await fetch(endpoint, { method: "POST", body: new URLSearchParams({ data: QUERY }), headers: { "User-Agent": "HikeSync/1.0 (https://github.com/tackleguy/health)" }, signal: AbortSignal.timeout(660_000) });
      if (!response.ok) { console.warn(`${endpoint}: HTTP ${response.status}`); continue; }
      const data = await response.json();
      if (Array.isArray(data.elements)) return data;
    } catch (error) {
      console.warn(`${endpoint}: ${String(error)}`);
    }
  }
  throw new Error("No Overpass instance returned trailheads. Rerun later; the catalog builds without them.");
}

async function main() {
  await mkdir(cache, { recursive: true });
  if (!refresh) { try { await stat(target); console.log("Trailhead cache present; use --refresh to update."); return; } catch { /* build */ } }
  const data = await fetchAll();
  const out: TrailheadCache = {
    retrievedAt: new Date().toISOString(),
    dataTimestamp: data.osm3s?.timestamp_osm_base ?? null,
    trailheads: data.elements.flatMap((e) => {
      const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
      if (lat == null || lon == null) return [];
      return [{ osm: `${e.type}/${e.id}`, name: e.tags?.name?.trim() || null, latitude: Math.round(lat * 1e5) / 1e5, longitude: Math.round(lon * 1e5) / 1e5 }];
    }),
  };
  await writeFile(target, gzipSync(JSON.stringify(out)));
  console.log(`${out.trailheads.length.toLocaleString()} trailheads cached (OSM data as of ${out.dataTimestamp ?? "unknown"}).`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
