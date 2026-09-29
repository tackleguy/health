/** Resumable, sequential snapshot of public USGS and Parks Canada trail features.
 * Raw responses are cached locally; output is a bounded server-side catalog.
 * Run with npm run source:trails. Use --refresh to fetch a new source snapshot.
 */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import path from "node:path";
import type { CatalogManifest, CatalogTrail } from "../../src/lib/trail-catalog/types";
import { JOIN_METERS, mergeCatalogSections } from "../../src/lib/trail-catalog/merge";
import { auditCatalog } from "../../src/lib/trail-catalog/audit";
import { QUALITY_RULES, isPlaceholderName } from "../../src/lib/trail-catalog/quality";
import { PisteIndex, matchSkiRun, type SkiRunCache } from "../../src/lib/trail-catalog/ski-runs";
import { TrailheadIndex, trailEnds, type TrailheadCache } from "../../src/lib/trail-catalog/access";
import { DUPLICATE_SHARE, LineIndex, MIN_NEW_TRAIL_MILES, NPS_WHERE, classifyTerrain, pointsAlong, surroundingPoints } from "../../src/lib/trail-catalog/additions";

const root = process.cwd();
const output = path.join(root, "data/trail-catalog");
const cache = path.join(root, ".cache/trail-catalog");
/** Guards against publishing a snapshot from a truncated source response. */
const minimumSections = 450_000;
/** Standalone trails shorter than this (~80 m) are mapping fragments, not hikes. */
const minimumTrailMiles = QUALITY_RULES.minimumTrailMiles;
const refresh = process.argv.includes("--refresh");
const USGS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37";
const CANADA = "https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/Trails_Sentiers_APCA_Temporary_Temporaire_APCA_OpenOuvert/FeatureServer/0";
const NPS = "https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/FeatureServer/0";
const ONTARIO = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19";
/** Named USGS trail sections plus unnamed sections tagged for hikers. */
const USGS_WHERE =
  "(name IS NOT NULL AND name <> '') OR hikerpedestrian = 'Y'";
const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
type Point = [number, number];
type Feature = { attributes: Record<string, string | number | null>; geometry?: { paths: Point[][] } };
type ResponseData = { features?: Feature[]; exceededTransferLimit?: boolean; error?: { message: string }; retrievedAt: string };
type Region = { properties: { name: string; admin: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const boundaries: { name: string; country: string; rings: number[][][]; bounds: number[] }[] = [];
const excluded: Record<string, number> = { missingName: 0, invalidGeometry: 0, duplicateId: 0, duplicateGeometry: 0, tooShort: 0, npsAlreadyListed: 0, npsTooShort: 0, npsNotMountain: 0 };
const shardOf = (id: string) => (parseInt(hash(id).slice(0, 2), 16)%64).toString().padStart(2, "0");

function inside(point: Point, ring: number[][]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [xj, yj] = ring[j];
    if ((y > point[1]) !== (yj > point[1]) && point[0] < (xj-x)*(point[1]-y)/(yj-y)+x) result = !result;
  }
  return result;
}
/** Generalized 1:50m coastlines and borders leave shoreline and border trails just outside every polygon. */
const NEAREST_REGION_DEGREES = 0.25;
function distanceToRing(point: Point, ring: number[][]) {
  const k = Math.cos(point[1] * Math.PI / 180);
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const ax = ring[i-1][0]*k, ay = ring[i-1][1], bx = ring[i][0]*k, by = ring[i][1], px = point[0]*k, py = point[1];
    const dx = bx-ax, dy = by-ay, l = dx*dx+dy*dy;
    const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/l));
    best = Math.min(best, Math.hypot(px-(ax+t*dx), py-(ay+t*dy)));
  }
  return best;
}
function regionAt(point: Point, country: string) {
  const containing = boundaries.find(b => b.country === country && point[0] >= b.bounds[0] && point[1] >= b.bounds[1] && point[0] <= b.bounds[2] && point[1] <= b.bounds[3] && inside(point, b.rings[0]) && !b.rings.slice(1).some(r => inside(point, r)));
  if (containing) return containing.name;
  // Otherwise the nearest state/province of the same country within ~25 km.
  let nearest: string | null = null, best = NEAREST_REGION_DEGREES;
  for (const b of boundaries) {
    if (b.country !== country || point[0] < b.bounds[0]-best || point[0] > b.bounds[2]+best || point[1] < b.bounds[1]-best || point[1] > b.bounds[3]+best) continue;
    const d = distanceToRing(point, b.rings[0]);
    if (d < best) { best = d; nearest = b.name; }
  }
  return nearest;
}
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
function safeUrl(v: unknown) { try { const url = new URL(String(v)); return url.protocol === "https:" ? url.href : null; } catch { return null; } }
async function fetchPage(url: string, key: string): Promise<ResponseData> {
  const filename = path.join(cache, `${key}.json.gz`);
  if (!refresh) { try { return JSON.parse(gunzipSync(await readFile(filename)).toString()); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "HikeSync/1.0 (https://github.com/tackleguy/health)" }, signal: AbortSignal.timeout(90_000) });
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

type MergedTrailRef = ReturnType<typeof mergeCatalogSections>[number];
const pointKey = (p: Point) => `${p[1].toFixed(4)},${p[0].toFixed(4)}`;
/** Ground elevations (m) from Open-Meteo's Copernicus DEM, 100 points per request, cached on disk. */
async function elevationsFor(points: Point[]) {
  const file = path.join(root, ".cache/elevation/points.json");
  await mkdir(path.dirname(file), { recursive: true });
  let known: Record<string, number> = {};
  try { known = JSON.parse(await readFile(file, "utf8")); } catch { /* first run */ }
  const missing = [...new Set(points.map(pointKey))].filter(k => !(k in known));
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i+100);
    const url = `https://api.open-meteo.com/v1/elevation?${new URLSearchParams({ latitude: batch.map(k => k.split(",")[0]).join(","), longitude: batch.map(k => k.split(",")[1]).join(",") })}`;
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
      if (response?.ok) { const data = await response.json() as { elevation: number[] }; batch.forEach((k, j) => { known[k] = data.elevation[j]; }); break; }
      if (attempt === 5) throw new Error(`Elevation lookup failed (${response?.status ?? "network"}). Rerun to resume; results are cached.`);
      await new Promise(r => setTimeout(r, 5000 * 2**attempt));
    }
    if ((i/100) % 20 === 19) { await writeFile(file, JSON.stringify(known)); console.log(`Elevation: ${Math.min(i+100, missing.length)}/${missing.length} points`); }
    await new Promise(r => setTimeout(r, 250));
  }
  await writeFile(file, JSON.stringify(known));
  return new Map(Object.entries(known));
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
  const rows: CatalogTrail[] = [], geometries = new Map<string, Point[][]>();
  const ids = new Set<string>(), shapes = new Set<string>();
  const sources: CatalogManifest["sources"] = [];
  const sourcesToImport = [
    { key: "parks-canada" as const, country: "CA" as const, endpoint: CANADA, where: "1=1", fields: "*", idField: "OBJECTID", name: "Parks Canada — Trails APCA", license: "Open Government Licence – Canada", url: "https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4" },
    { key: "ontario" as const, country: "CA" as const, endpoint: ONTARIO, where: "TRAIL_NAME IS NOT NULL", fields: "OBJECTID,OGF_ID,TRAIL_NAME,TRAIL_ASSOCIATION,TRAIL_ASSOCIATION_WEBSITE,TRAIL_LENGTH_KM,EFFECTIVE_DATETIME", idField: "OBJECTID", name: "Ontario Trail Network — Trail Segment", license: "Open Government Licence – Ontario", url: "https://data.ontario.ca/en/dataset/ontario-trail-network" },
    { key: "nps" as const, country: "US" as const, endpoint: NPS, where: NPS_WHERE, fields: "OBJECTID,GEOMETRYID,TRLNAME,TRLSURFACE,SEASONAL,SEASDESC,UNITCODE,UNITNAME,EDITDATE", idField: "OBJECTID", name: "National Park Service — Public Trails (existing, official trails; mountain trails ≥0.3 mi not already listed)", license: "Public domain", url: "https://public-nps.opendata.arcgis.com/" },
    { key: "usgs" as const, country: "US" as const, endpoint: USGS, where: USGS_WHERE, fields: "objectid,permanentidentifier,name,lengthmiles,pets,sourceoriginator,sourceeditdate,trailsurface,seasonopen", idField: "objectid", name: "USGS National Transportation Dataset — Trails", license: "Public domain", url: "https://www.usgs.gov/national-digital-trails/how-access-or-view-usgs-trails-dataset" },
  ];
  for (const source of sourcesToImport) {
    const before = rows.length; let retrievedAt = "";
    for (let offset = 0; ; offset += 1000) {
      const query = new URLSearchParams({ f: "json", where: source.where, outFields: source.fields, returnGeometry: "true", outSR: "4326", geometryPrecision: "5", maxAllowableOffset: "0.0001", orderByFields: `${source.idField} ASC`, resultOffset: String(offset), resultRecordCount: "1000" });
      const data = await fetchPage(`${source.endpoint}/query?${query}`, `${source.key}-${offset}-${hash(query.toString()).slice(0, 8)}`);
      retrievedAt = data.retrievedAt;
      for (const f of data.features!) {
        const a = f.attributes;
        const named = str(source.key === "ontario" ? a.TRAIL_NAME : source.key === "nps" ? a.TRLNAME : source.country === "CA" ? a.Name_Official_e ?? a.Nom_Officiel_f : a.name);
        // Placeholder names ("-", "<unnamed>", "Unknown") are not trail names; they are labeled and never merged.
        const placeholder = named !== null && isPlaceholderName(named);
        const name = named && !placeholder ? named : (source.key === "usgs" || placeholder ? "Unnamed trail" : null);
        if (!name) { excluded.missingName++; continue; }
        const lines = f.geometry?.paths;
        if (!lines?.length || lines.some(line => line.length < 2 || line.some(p => p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90))) { excluded.invalidGeometry++; continue; }
        const sourceId = source.key === "ontario" ? String(a.OGF_ID) : source.key === "nps" ? str(a.GEOMETRYID)?.replace(/[{}]/g, "").toLowerCase() ?? null : source.country === "US" ? str(a.permanentidentifier) : String(a.OBJECTID);
        if (!sourceId) throw new Error("Missing source identifier");
        const id = `${source.key}-${sourceId}`;
        if (ids.has(id)) { excluded.duplicateId++; continue; }
        const signature = hash(JSON.stringify([source.country, name.toLowerCase(), lines]));
        if (shapes.has(signature)) { excluded.duplicateGeometry++; continue; }
        ids.add(id); shapes.add(signature);
        const point = lines[0][Math.floor(lines[0].length/2)];
        const geometryShard = shardOf(id);
        const reportedMiles = source.key === "ontario" && typeof a.TRAIL_LENGTH_KM === "number" ? a.TRAIL_LENGTH_KM/1.609344 : a.lengthmiles;
        const suppliedMiles = typeof reportedMiles === "number" && reportedMiles > 0 ? reportedMiles : null;
        const sourceTimestamp = source.key === "ontario" ? a.EFFECTIVE_DATETIME : source.key === "nps" ? a.EDITDATE : a.sourceeditdate;
        const metersDate = typeof sourceTimestamp === "number" ? sourceTimestamp : null;
        rows.push({ id, name, country: source.country, region: regionAt(point, source.country), kind: "segment", miles: suppliedMiles, distanceBasis: suppliedMiles !== null ? "source" : "geometry", latitude: point[1], longitude: point[0], difficulty: source.country === "CA" ? ({ 1: "Easy", 2: "Moderate", 3: "Difficult", 4: "Most difficult" }[Number(a["Summer_Classification_Été"]) as 1|2|3|4] ?? null) : null, dogs: a.pets === "Y" ? true : a.pets === "N" ? false : null, source: source.key, sourceId, sourceUrl: `${source.endpoint}/query?${new URLSearchParams({ where: `${source.idField}=${a[source.idField]}`, outFields: "*", f: "pjson" })}`, officialUrl: safeUrl(a.URL_e ?? a.URL_f), sourceDate: metersDate !== null ? new Date(metersDate).toISOString() : null, manager: source.country === "CA" ? "Parks Canada" : str(a.sourceoriginator), surface: source.country === "US" ? str(a.trailsurface) : ({1:"Natural",2:"Gravel",3:"Boardwalk",4:"Asphalt",5:"Wood chip",6:"Water",7:"Concrete",8:"Stairs"}[Number(a.Surface) as 1] ?? null), season: str(a.seasonopen), geometryShard });
        if (source.key === "ontario") {
          const row = rows[rows.length-1];
          row.region = "Ontario";
          row.manager = str(a.TRAIL_ASSOCIATION) ?? "Ontario Trail Network";
          row.officialUrl = safeUrl(a.TRAIL_ASSOCIATION_WEBSITE);
        }
        if (source.key === "nps") {
          const row = rows[rows.length-1];
          const unit = str(a.UNITCODE)?.toLowerCase();
          row.manager = str(a.UNITNAME) ? `National Park Service — ${a.UNITNAME}` : "National Park Service";
          row.officialUrl = unit && /^[a-z]{4}$/.test(unit) ? `https://www.nps.gov/${unit}/planyourvisit/hiking.htm` : null;
          row.surface = str(a.TRLSURFACE) && a.TRLSURFACE !== "Unknown" ? String(a.TRLSURFACE) : null;
          row.season = a.SEASONAL === "Yes" ? (str(a.SEASDESC) ?? "Seasonal") : null;
          row.sourceUrl = `${NPS}/query?${new URLSearchParams({ where: `GEOMETRYID='${a.GEOMETRYID}'`, outFields: "*", f: "pjson" })}`;
        }
        if (placeholder) rows[rows.length-1].originalName = named!;
        geometries.set(id, lines);
      }
      console.log(`${source.key}: ${offset+data.features!.length} fetched; ${rows.length.toLocaleString()} accepted total`);
      if (!data.exceededTransferLimit || data.features!.length === 0) break;
    }
    sources.push({ name: source.name, url: source.url, license: source.license, count: rows.length-before, query: source.where, retrievedAt });
  }
  // NPS lines already in the catalog (USGS includes much NPS data) are duplicates; only new lines are added.
  {
    const nps = rows.filter(r => r.source === "nps");
    const cell = (p: Point) => `${Math.floor(p[0]*4)}:${Math.floor(p[1]*4)}`;
    const touched = new Set(nps.flatMap(r => geometries.get(r.id)!.flat().map(cell)));
    const existing = new LineIndex();
    for (const r of rows) if (r.source !== "nps" && geometries.get(r.id)!.some(line => line.some(p => touched.has(cell(p))))) existing.add(geometries.get(r.id)!);
    const listed = new Set(nps.filter(r => existing.coveredShare(geometries.get(r.id)!) >= DUPLICATE_SHARE).map(r => r.id));
    excluded.npsAlreadyListed = listed.size;
    for (let i = rows.length-1; i >= 0; i--) if (listed.has(rows[i].id)) { geometries.delete(rows[i].id); rows.splice(i, 1); }
    console.log(`NPS: ${nps.length - listed.size} of ${nps.length} official trail lines are not yet in the catalog`);
  }
  if (rows.length < minimumSections) throw new Error(`Only ${rows.length} valid distinct sections. Catalog has not been replaced; expected at least ${minimumSections}.`);
  const merged = mergeCatalogSections(rows.map(row => ({ row, lines: geometries.get(row.id)! })), { regionAt });
  const trails: typeof merged = [];
  for (const trail of merged) {
    if ((trail.row.miles ?? 0) < minimumTrailMiles) { excluded.tooShort += trail.sectionIds.length; continue; }
    trail.row.geometryShard = shardOf(trail.row.id);
    trails.push(trail);
  }
  // New trails made only of NPS lines must be mountain trails of at least 0.3 mi. NPS lines that joined an
  // existing trail fill its gaps and stay.
  {
    const npsOnly = trails.filter(t => t.sectionIds.every(id => id.startsWith("nps-")));
    const keep = new Set<MergedTrailRef>();
    const pending: { trail: MergedTrailRef; along: Point[]; around: Point[] }[] = [];
    for (const trail of npsOnly) {
      if ((trail.row.miles ?? 0) < MIN_NEW_TRAIL_MILES) { excluded.npsTooShort += trail.sectionIds.length; continue; }
      const along = pointsAlong(trail.lines, 10);
      pending.push({ trail, along, around: surroundingPoints(along[Math.floor(along.length/2)]) });
    }
    const elevations = await elevationsFor(pending.flatMap(p => [...p.along, ...p.around]));
    for (const { trail, along, around } of pending) {
      const terrain = classifyTerrain(along.map(p => elevations.get(pointKey(p)) ?? NaN), around.map(p => elevations.get(pointKey(p)) ?? NaN));
      if (!terrain.mountain) { excluded.npsNotMountain += trail.sectionIds.length; continue; }
      trail.row.elevationFt = { min: Math.round(terrain.minMeters*3.28084), max: Math.round(terrain.maxMeters*3.28084) };
      keep.add(trail);
    }
    const drop = new Set(npsOnly.filter(t => !keep.has(t)));
    for (let i = trails.length-1; i >= 0; i--) if (drop.has(trails[i])) trails.splice(i, 1);
    console.log(`NPS: ${keep.size} new mountain trails ≥${MIN_NEW_TRAIL_MILES} mi added; ${drop.size} new trails were too short or not in mountain terrain`);
  }
  trails.sort((a, b) => a.row.name.localeCompare(b.row.name) || a.row.id.localeCompare(b.row.id));
  // Records whose line follows OpenSkiMap pistes are ski runs, not hiking trails (npm run source:ski).
  let skiSource: CatalogManifest["sources"][number] | null = null;
  const winterCounts = { downhill: 0, nordic: 0 };
  try {
    const ski = JSON.parse(gunzipSync(await readFile(path.join(root, ".cache/ski/runs-na.json.gz"))).toString()) as SkiRunCache;
    const pistes = new PisteIndex(ski.runs);
    for (const trail of trails) {
      const match = matchSkiRun(trail.row.name, trail.lines, pistes);
      if (!match) continue;
      trail.row.winterUse = match.use;
      if (match.areaName) trail.row.skiArea = match.areaName;
      winterCounts[match.use]++;
    }
    skiSource = { name: "OpenSkiMap — ski runs (used to identify ski runs; not listed as trails)", url: "https://openskimap.org", license: "ODbL — © OpenStreetMap contributors", count: 0, query: `U.S./Canadian pistes; a record is a run when ≥60% of its line follows a piste`, retrievedAt: ski.retrievedAt };
    console.log(`Ski pistes: ${winterCounts.downhill} downhill runs, ${winterCounts.nordic} Nordic tracks`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.warn("No ski run cache; run npm run source:ski to identify ski runs.");
  }
  // Start points: the nearest mapped OSM trailhead to either end (npm run source:trailheads).
  let trailheadSource: CatalogManifest["sources"][number] | null = null;
  try {
    const cached = JSON.parse(gunzipSync(await readFile(path.join(root, ".cache/trailheads/trailheads-na.json.gz"))).toString()) as TrailheadCache;
    const index = new TrailheadIndex(cached.trailheads);
    let matched = 0;
    for (const trail of trails) {
      const ends = trailEnds(trail.lines);
      const start = ends ? index.nearest(ends) : null;
      if (start) { trail.row.trailhead = start; matched++; }
    }
    trailheadSource = { name: "OpenStreetMap — trailheads (start points)", url: "https://www.openstreetmap.org/copyright", license: "ODbL — © OpenStreetMap contributors", count: 0, query: `highway=trailhead within 800 m of a trail end; ${matched.toLocaleString("en-US")} trails matched; OSM data as of ${cached.dataTimestamp ?? "unknown"}`, retrievedAt: cached.retrievedAt };
    console.log(`Trailheads: ${matched} trails have a mapped trailhead within 800 m`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.warn("No trailhead cache; run npm run source:trailheads to add start points.");
  }
  // Every published trail passes through the quality rules; the report ships with the snapshot.
  const audit = auditCatalog(trails.map(t => ({ row: t.row, lines: t.lines, reportedMiles: t.reportedMiles, sectionReportedMiles: t.sectionReportedMiles })));
  audit.excludedTooShort = excluded.tooShort;
  audit.duplicatesRemoved = excluded.duplicateId + excluded.duplicateGeometry;
  console.log(`Quality: ${JSON.stringify(audit.byStatus)}`);
  const selected = trails.map(t => t.row);
  const sectionTotal = trails.reduce((sum, t) => sum+t.sectionIds.length, 0);
  console.log(`${rows.length.toLocaleString()} sections merged into ${merged.length.toLocaleString()} trails; ${selected.length.toLocaleString()} kept`);
  const index = gzipSync(JSON.stringify(selected), { level: 9 });
  const countries: Record<string, number> = {}, regionCounts = new Map<string, { name: string; country: string; count: number }>();
  for (const r of selected) {
    countries[r.country] = (countries[r.country] ?? 0)+1;
    if (r.region) { const key = `${r.country}:${r.region}`; const entry = regionCounts.get(key) ?? { name:r.region, country:r.country, count:0 }; entry.count++; regionCounts.set(key, entry); }
  }
  const sourceOf = new Map(rows.map(r => [r.id, r.source]));
  sources.forEach((source,i)=>{ source.count = trails.reduce((sum, t) => sum+t.sectionIds.filter(id => sourceOf.get(id) === sourcesToImport[i].key).length, 0); });
  if (skiSource) sources.push(skiSource);
  if (trailheadSource) sources.push(trailheadSource);
  const manifest: CatalogManifest = { version:2, generatedAt:new Date().toISOString(), total:selected.length, sectionTotal, countries, sources, regions:[...regionCounts.values()].sort((a,b)=>a.name.localeCompare(b.name)), indexSha256:hash(index), excluded, notes:[`Each record is a whole named trail: ${sectionTotal.toLocaleString("en-US")} source sections were merged where sections with the same name connect (within ${JOIN_METERS} m). Same-named trails that do not connect stay separate, except named through-hikes (Appalachian, Pacific Crest, …), which are one trail even across mapping gaps. Unnamed sections are never merged.`, "Trail length is the sum of its sections with overlapping stretches counted once. U.S. sections use USGS-reported miles when they agree with the mapped line (within 0.67–1.5×); otherwise, and for all Canadian sections, length is measured from the generalized geometry.", "Generalized source geometry is for discovery, not navigation. Map pins are points on the trail's longest mapped line, not verified trailheads.", "State/province is inferred from the map pin and Natural Earth public-domain boundaries; long trails can extend outside it.", "Seasonal access, overnight camping, water, difficulty and elevation are not inferred. Source data may be older than the retrieval date.", "U.S. eligibility is named USGS sections plus unnamed sections tagged hikerpedestrian=Y; unnamed sections are labeled Unnamed trail.", `Standalone trails shorter than ${minimumTrailMiles} mi are mapping fragments and are excluded.`, `National Park Service trails are added only when NPS lists them as existing, official, open trails (not unofficial, unmaintained, sidewalk, water or snow trails) and the line is not already in the catalog. New NPS trails must be at least ${MIN_NEW_TRAIL_MILES} mi and in mountain terrain (sampled elevation varies ≥100 m within 1 km, or the trail climbs ≥60 m; Copernicus DEM via Open-Meteo). NPS lines that fill gaps in existing trails are kept.`, `Every trail is checked by config/trail-quality.json rules: ${audit.byStatus.ok.toLocaleString("en-US")} passed, ${audit.byStatus.short.toLocaleString("en-US")} are short trails, ${audit.byStatus.review.toLocaleString("en-US")} need review and ${audit.byStatus.fragment.toLocaleString("en-US")} are partial, unnamed or connector segments kept out of default results. No elevation is available from these sources.`, ...(skiSource ? [`${winterCounts.downhill.toLocaleString("en-US")} records follow downhill ski pistes mapped in OpenSkiMap and are listed as ski runs, not hiking trails; ${winterCounts.nordic.toLocaleString("en-US")} follow Nordic ski tracks and stay hikeable.`] : [])] };
  const stage = path.join(output, `snapshot-${Date.now()}`); await mkdir(stage);
  const shards: Record<string, Record<string, Point[][]>> = {}, aliases: Record<string, Record<string, string>> = {};
  for (const trail of trails) {
    (shards[trail.row.geometryShard] ??= {})[trail.row.id] = trail.lines;
    for (const id of trail.sectionIds) if (id !== trail.row.id) (aliases[shardOf(id)] ??= {})[id] = trail.row.id;
  }
  for (let i = 0; i < 64; i++) {
    const shard = String(i).padStart(2, "0");
    await writeFile(path.join(stage, `geometry-${shard}.json.gz`), gzipSync(JSON.stringify(shards[shard] ?? {}), { level:9 }));
    await writeFile(path.join(stage, `aliases-${shard}.json.gz`), gzipSync(JSON.stringify(aliases[shard] ?? {}), { level:9 }));
  }
  await writeFile(path.join(stage, "index.json.gz"), index);
  await writeFile(path.join(stage, "audit.json.gz"), gzipSync(JSON.stringify(audit), { level:9 }));
  await writeFile(path.join(stage, "manifest.json"), JSON.stringify(manifest,null,2)+"\n");
  // Pointer swap keeps readers on a complete snapshot. Old snapshots may be removed after deployment.
  await writeFile(path.join(output, "current.json.tmp"), JSON.stringify({ directory:path.basename(stage) })+"\n");
  await rename(path.join(output, "current.json.tmp"), path.join(output,"current.json"));
  console.log(JSON.stringify({ total:manifest.total, sectionTotal, countries, excluded, snapshot:path.basename(stage) },null,2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
