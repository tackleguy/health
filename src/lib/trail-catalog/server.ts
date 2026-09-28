import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import type { CatalogFilters, CatalogManifest, CatalogTrail } from "./types";
import { filterCatalog, matchingCatalogRows, searchableText } from "./search";
import { buildThroughHikeOverlay } from "./through-hikes";
import { buildCatalogMap } from "./map";

const unzip = promisify(gunzip);
const root = path.join(process.cwd(), "data/trail-catalog");
const CATALOG_ID = /^(usgs|parks-canada|ontario|route)-/;
let catalog: Promise<{
  rows: CatalogTrail[];
  texts: string[];
  byId: Map<string, CatalogTrail>;
  manifest: CatalogManifest;
  directory: string;
}> | undefined;

// This module is imported only by server components and API routes. Never send the index to a client component.
function recountCountries(rows: CatalogTrail[]) {
  const countries: Record<string, number> = {};
  for (const row of rows) countries[row.country] = (countries[row.country] ?? 0) + 1;
  return countries;
}

function load() {
  catalog ??= (async () => {
    const pointer = JSON.parse(await readFile(path.join(root, "current.json"), "utf8"));
    if (!/^snapshot-\d+$/.test(pointer.directory)) throw new Error("Invalid catalog snapshot");
    const directory = path.join(root, pointer.directory);
    const [raw, metadata] = await Promise.all([
      readFile(path.join(directory, "index.json.gz")),
      readFile(path.join(directory, "manifest.json"), "utf8"),
    ]);
    const baseManifest = JSON.parse(metadata) as CatalogManifest;
    if (createHash("sha256").update(raw).digest("hex") !== baseManifest.indexSha256) {
      throw new Error("Catalog checksum mismatch");
    }
    const sections = JSON.parse((await unzip(raw)).toString()) as CatalogTrail[];
    if (sections.length !== baseManifest.total || new Set(sections.map((r) => r.id)).size !== sections.length) {
      throw new Error("Catalog count mismatch");
    }
    const overlay = buildThroughHikeOverlay(sections);
    // Trails that make up a through-hike are listed once, as the route card.
    const members = new Set(overlay.flatMap((route) => route.memberIds ?? []));
    const rows = [...overlay, ...sections.filter((row) => !members.has(row.id))];
    const byId = new Map([...sections, ...overlay].map((r) => [r.id, r]));
    const manifest: CatalogManifest = {
      ...baseManifest,
      total: rows.length,
      countries: recountCountries(rows),
      notes: [
        ...baseManifest.notes,
        `${overlay.length} through-hike routes (curated international/classic guides plus mapped National Scenic and long trails, shown with official length) are overlaid at read time.`,
      ],
    };
    return {
      rows,
      texts: rows.map(searchableText),
      byId,
      manifest,
      directory,
    };
  })().catch((error) => {
    catalog = undefined;
    throw error;
  });
  return catalog;
}

export async function searchCatalog(filters: CatalogFilters = {}) {
  const data = await load();
  return { ...filterCatalog(data.rows, filters, data.texts), manifest: data.manifest };
}

export async function searchCatalogMap(filters: CatalogFilters = {}) {
  const data = await load();
  return buildCatalogMap(matchingCatalogRows(data.rows, filters, data.texts));
}

async function readShard(directory: string, kind: "geometry" | "aliases", shard: string) {
  if (!/^\d{2}$/.test(shard)) return {};
  try {
    return JSON.parse((await unzip(await readFile(path.join(directory, `${kind}-${shard}.json.gz`)))).toString());
  } catch (error) {
    if (kind === "aliases" && (error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

const shardOf = (id: string) => (parseInt(createHash("sha256").update(id).digest("hex").slice(0, 2), 16) % 64).toString().padStart(2, "0");

/**
 * Returns a catalog trail and its lines. Ids of source sections that were merged into a trail resolve
 * to that trail, so callers should compare `detail.trail.id` with the requested id to canonicalize URLs.
 */
export async function getCatalogTrail(id: string) {
  if (id.length > 200 || !CATALOG_ID.test(id)) return null;
  const data = await load();
  let trail = data.byId.get(id);
  if (!trail) {
    const alias = ((await readShard(data.directory, "aliases", shardOf(id))) as Record<string, string>)[id];
    trail = alias ? data.byId.get(alias) : undefined;
    if (!trail) return null;
  }
  if (trail.kind === "route" || trail.geometryShard === "route") {
    const lines: [number, number][][] = [];
    for (const memberId of trail.memberIds ?? []) {
      const member = data.byId.get(memberId);
      if (!member) continue;
      const geometry = (await readShard(data.directory, "geometry", member.geometryShard)) as Record<string, [number, number][][]>;
      lines.push(...(geometry[memberId] ?? []));
    }
    return { trail, lines, manifest: data.manifest };
  }
  const geometry = (await readShard(data.directory, "geometry", trail.geometryShard)) as Record<string, [number, number][][]>;
  if (!geometry[trail.id]) throw new Error("Missing catalog geometry");
  const parentRow = trail.parentId ? data.byId.get(trail.parentId) : undefined;
  const parent = parentRow ? { id: parentRow.id, name: parentRow.name, miles: parentRow.miles } : null;
  return { trail, lines: geometry[trail.id], manifest: data.manifest, parent };
}

/** The snapshot's quality audit report, if this snapshot was built with one. */
export async function catalogAudit() {
  const data = await load();
  try {
    return JSON.parse((await unzip(await readFile(path.join(data.directory, "audit.json.gz")))).toString()) as import("./audit").AuditReport;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function catalogDownload() {
  const data = await load();
  return readFile(path.join(data.directory, "index.json.gz"));
}
