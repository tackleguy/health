/** Resumable, sequential snapshot of public USGS and Parks Canada trail features.
 * Raw responses are cached locally; output is a bounded server-side catalog.
 * Run with npm run source:trails. Use --refresh to fetch a new source snapshot.
 */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import path from "node:path";
import type { CatalogManifest, CatalogTrail } from "../../src/lib/trail-catalog/types";

const root = process.cwd();
const output = path.join(root, "data/trail-catalog");
const cache = path.join(root, ".cache/trail-catalog");
const target = 90_000;
const refresh = process.argv.includes("--refresh");
const USGS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37";
const CANADA = "https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/Trails_Sentiers_APCA_Temporary_Temporaire_APCA_OpenOuvert/FeatureServer/0";
const ONTARIO = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19";
const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
type Point = [number, number];
type Feature = { attributes: Record<string, string | number | null>; geometry?: { paths: Point[][] } };
type ResponseData = { features?: Feature[]; exceededTransferLimit?: boolean; error?: { message: string }; retrievedAt: string };
type Region = { properties: { name: string; admin: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const boundaries: { name: string; country: string; rings: number[][][]; bounds: number[] }[] = [];
const excluded: Record<string, number> = { missingName: 0, invalidGeometry: 0, duplicateId: 0, duplicateGeometry: 0 };

function inside(point: Point, ring: number[][]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [xj, yj] = ring[j];
    if ((y > point[1]) !== (yj > point[1]) && point[0] < (xj-x)*(point[1]-y)/(yj-y)+x) result = !result;
  }
  return result;
}
function regionAt(point: Point, country: string) {
  return boundaries.find(b => b.country === country && point[0] >= b.bounds[0] && point[1] >= b.bounds[1] && point[0] <= b.bounds[2] && point[1] <= b.bounds[3] && inside(point, b.rings[0]) && !b.rings.slice(1).some(r => inside(point, r)))?.name ?? null;
}
function milesBetween(a: Point, b: Point) {
  const rad = Math.PI/180;
  const h = Math.sin((b[1]-a[1])*rad/2)**2 + Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2;
  return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1, h)));
}
function geometryMiles(lines: Point[][]) {
  return lines.reduce((sum, line) => sum+line.slice(1).reduce((s, p, i) => s+milesBetween(line[i], p), 0), 0);
}
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
function safeUrl(v: unknown) { try { const url = new URL(String(v)); return url.protocol === "https:" ? url.href : null; } catch { return null; } }
async function fetchPage(url: string, key: string): Promise<ResponseData> {
  const filename = path.join(cache, `${key}.json.gz`);
  if (!refresh) { try { return JSON.parse(gunzipSync(await readFile(filename)).toString()); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "TrailPack/1.0 (https://github.com/tackleguy/health)" }, signal: AbortSignal.timeout(90_000) });
      if (!response.ok) {
        if (response.status === 429) {
          const retry = response.headers.get("retry-after");
          const seconds = Number(retry);
          const wait = retry ? (Number.isFinite(seconds) ? seconds*1000 : Date.parse(retry)-Date.now()) : 60_000;
          if (wait > 300_000) throw new Error(`Rate limited until ${retry}. Rerun later to resume.`);
          await new Promise(resolve => setTimeout(resolve, Math.max(1000, wait || 60_000)));
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json() as ResponseData;
      if (data.error || !Array.isArray(data.features)) throw new Error(data.error?.message ?? "Source returned no feature list");
      data.retrievedAt = new Date().toISOString();
      await writeFile(`${filename}.tmp`, gzipSync(JSON.stringify(data)));
      await rename(`${filename}.tmp`, filename);
      return data;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Retry ${key}: ${String(error)}`);
      await new Promise(resolve => setTimeout(resolve, 2000*2**attempt));
    }
  }
  throw new Error("Unreachable");
}

async function main() {
  await mkdir(cache, { recursive: true }); await mkdir(output, { recursive: true });
  const geo = JSON.parse(await readFile(path.join(output, "regions.geojson"), "utf8")) as { features: Region[] };
  for (const f of geo.features) {
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates as number[][][]] : f.geometry.coordinates as number[][][][];
    for (const rings of polygons) {
      const points = rings[0];
      boundaries.push({ name: f.properties.name, country: f.properties.admin === "Canada" ? "CA" : "US", rings, bounds: [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))] });
    }
  }
  const rows: CatalogTrail[] = [], geometries: Record<string, Record<string, Point[][]>> = {};
  const ids = new Set<string>(), shapes = new Set<string>();
  const sources: CatalogManifest["sources"] = [];
  const sourcesToImport = [
    { key: "parks-canada" as const, country: "CA" as const, endpoint: CANADA, where: "General_Activity=100", fields: "*", idField: "OBJECTID", name: "Parks Canada — Trails APCA", license: "Open Government Licence – Canada", url: "https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4" },
    { key: "ontario" as const, country: "CA" as const, endpoint: ONTARIO, where: "PERMITTED_USES LIKE '%Hiking or Walking%' AND TRAIL_NAME IS NOT NULL", fields: "OBJECTID,OGF_ID,TRAIL_NAME,TRAIL_ASSOCIATION,TRAIL_ASSOCIATION_WEBSITE,TRAIL_LENGTH_KM,EFFECTIVE_DATETIME", idField: "OBJECTID", name: "Ontario Trail Network — Trail Segment", license: "Open Government Licence – Ontario", url: "https://data.ontario.ca/en/dataset/ontario-trail-network" },
    { key: "usgs" as const, country: "US" as const, endpoint: USGS, where: "name IS NOT NULL AND name <> '' AND lengthmiles >= 0.1 AND hikerpedestrian = 'Y' AND trailtype = 'Terra Trail'", fields: "objectid,permanentidentifier,name,lengthmiles,pets,sourceoriginator,sourceeditdate,trailsurface,seasonopen", idField: "objectid", name: "USGS National Transportation Dataset — Trails", license: "Public domain", url: "https://www.usgs.gov/national-digital-trails/how-access-or-view-usgs-trails-dataset" },
  ];
  for (const source of sourcesToImport) {
    const before = rows.length; let retrievedAt = "";
    for (let offset = 0; ; offset += 1000) {
      const query = new URLSearchParams({ f: "json", where: source.where, outFields: source.fields, returnGeometry: "true", outSR: "4326", geometryPrecision: "5", maxAllowableOffset: "0.0001", orderByFields: `${source.idField} ASC`, resultOffset: String(offset), resultRecordCount: "1000" });
      const data = await fetchPage(`${source.endpoint}/query?${query}`, `${source.key}-${offset}-${hash(query.toString()).slice(0, 8)}`);
      retrievedAt = data.retrievedAt;
      for (const f of data.features!) {
        const a = f.attributes;
        const name = str(source.key === "ontario" ? a.TRAIL_NAME : source.country === "CA" ? a.Name_Official_e ?? a.Nom_Officiel_f : a.name);
        if (!name) { excluded.missingName++; continue; }
        const lines = f.geometry?.paths;
        if (!lines?.length || lines.some(line => line.length < 2 || line.some(p => p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90))) { excluded.invalidGeometry++; continue; }
        const sourceId = source.key === "ontario" ? String(a.OGF_ID) : source.country === "US" ? str(a.permanentidentifier) : String(a.OBJECTID);
        if (!sourceId) throw new Error("Missing source identifier");
        const id = `${source.key}-${sourceId}`;
        if (ids.has(id)) { excluded.duplicateId++; continue; }
        const signature = hash(JSON.stringify([source.country, name.toLowerCase(), lines]));
        if (shapes.has(signature)) { excluded.duplicateGeometry++; continue; }
        ids.add(id); shapes.add(signature);
        const point = lines[0][Math.floor(lines[0].length/2)];
        const geometryShard = (parseInt(hash(id).slice(0, 2), 16)%64).toString().padStart(2, "0");
        const reportedMiles = source.key === "ontario" && typeof a.TRAIL_LENGTH_KM === "number" ? a.TRAIL_LENGTH_KM/1.609344 : a.lengthmiles;
        const suppliedMiles = typeof reportedMiles === "number" && reportedMiles > 0 ? reportedMiles : null;
        const sourceTimestamp = source.key === "ontario" ? a.EFFECTIVE_DATETIME : a.sourceeditdate;
        const metersDate = typeof sourceTimestamp === "number" ? sourceTimestamp : null;
        rows.push({ id, name, country: source.country, region: regionAt(point, source.country), kind: "segment", miles: suppliedMiles ?? Math.round(geometryMiles(lines)*1000)/1000, distanceBasis: suppliedMiles !== null ? "source" : "geometry", latitude: point[1], longitude: point[0], difficulty: source.country === "CA" ? ({ 1: "Easy", 2: "Moderate", 3: "Difficult", 4: "Most difficult" }[Number(a["Summer_Classification_Été"]) as 1|2|3|4] ?? null) : null, dogs: a.pets === "Y" ? true : a.pets === "N" ? false : null, source: source.key, sourceId, sourceUrl: `${source.endpoint}/query?${new URLSearchParams({ where: `${source.idField}=${a[source.idField]}`, outFields: "*", f: "pjson" })}`, officialUrl: safeUrl(a.URL_e ?? a.URL_f), sourceDate: metersDate !== null ? new Date(metersDate).toISOString() : null, manager: source.country === "CA" ? "Parks Canada" : str(a.sourceoriginator), surface: source.country === "US" ? str(a.trailsurface) : ({1:"Natural",2:"Gravel",3:"Boardwalk",4:"Asphalt",5:"Wood chip",6:"Water",7:"Concrete",8:"Stairs"}[Number(a.Surface) as 1] ?? null), season: str(a.seasonopen), geometryShard });
        if (source.key === "ontario") {
          const row = rows[rows.length-1];
          row.region = "Ontario";
          row.manager = str(a.TRAIL_ASSOCIATION) ?? "Ontario Trail Network";
          row.officialUrl = safeUrl(a.TRAIL_ASSOCIATION_WEBSITE);
        }
        (geometries[geometryShard] ??= {})[id] = lines;
      }
      console.log(`${source.key}: ${offset+data.features!.length} fetched; ${rows.length.toLocaleString()} accepted total`);
      if (!data.exceededTransferLimit || data.features!.length === 0) break;
      // Fetch the full eligible population so selection isn't biased to early object IDs.
    }
    sources.push({ name: source.name, url: source.url, license: source.license, count: rows.length-before, query: source.where, retrievedAt });
  }
  if (rows.length < target) throw new Error(`Only ${rows.length} valid distinct records. Catalog has not been replaced; need ${target}.`);
  // Keep all Canadian records, select U.S. records deterministically across the eligible population.
  rows.sort((a,b) => (a.country === b.country ? hash(a.id).localeCompare(hash(b.id)) : a.country === "CA" ? -1 : 1));
  const selected = rows.slice(0, target).sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const selectedIds = new Set(selected.map(r => r.id));
  const index = gzipSync(JSON.stringify(selected), { level: 9 });
  const countries: Record<string, number> = {}, regionCounts = new Map<string, { name: string; country: string; count: number }>();
  for (const r of selected) {
    countries[r.country] = (countries[r.country] ?? 0)+1;
    if (r.region) { const key = `${r.country}:${r.region}`; const entry = regionCounts.get(key) ?? { name:r.region, country:r.country, count:0 }; entry.count++; regionCounts.set(key, entry); }
  }
  sources.forEach((source,i)=>{ source.count = selected.filter(r=>r.source === sourcesToImport[i].key).length; });
  const manifest: CatalogManifest = { version:1, generatedAt:new Date().toISOString(), total:selected.length, countries, sources, regions:[...regionCounts.values()].sort((a,b)=>a.name.localeCompare(b.name)), indexSha256:hash(index), excluded, notes:["Counts are distinct source trail-section records, not 90,000 independent end-to-end hikes. Multiple sections can belong to one named trail.", "Generalized source geometry is for discovery, not navigation. Map pins are points on sections, not verified trailheads.", "U.S. distances are source-reported section miles. Parks Canada distances are computed from generalized geometry, not official route distances. Ontario distances are source-reported section lengths converted from km.", "State/province is inferred from a representative point and Natural Earth public-domain boundaries; cross-border sections can extend outside it.", "Seasonal access, overnight camping, water, difficulty and elevation are not inferred. Source data may be older than the retrieval date."] };
  const stage = path.join(output, `snapshot-${Date.now()}`); await mkdir(stage);
  for (const [shard, entries] of Object.entries(geometries)) {
    for (const id of Object.keys(entries)) if (!selectedIds.has(id)) delete entries[id];
    await writeFile(path.join(stage, `geometry-${shard}.json.gz`), gzipSync(JSON.stringify(entries), { level:9 }));
  }
  await writeFile(path.join(stage, "index.json.gz"), index);
  await writeFile(path.join(stage, "manifest.json"), JSON.stringify(manifest,null,2)+"\n");
  // Pointer swap keeps readers on a complete snapshot. Old snapshots may be removed after deployment.
  await writeFile(path.join(output, "current.json.tmp"), JSON.stringify({ directory:path.basename(stage) })+"\n");
  await rename(path.join(output, "current.json.tmp"), path.join(output,"current.json"));
  console.log(JSON.stringify({ total:manifest.total, countries, excluded, snapshot:path.basename(stage) },null,2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
