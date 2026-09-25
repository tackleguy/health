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
    const rows = [...overlay, ...sections];
    const manifest: CatalogManifest = {
      ...baseManifest,
      total: rows.length,
      countries: recountCountries(rows),
      notes: [
        ...baseManifest.notes,
        `${overlay.length} through-hike routes (curated international/classic guides plus aggregates of National Scenic Trail sections) are overlaid at read time.`,
      ],
    };
    return {
      rows,
      texts: rows.map(searchableText),
      byId: new Map(rows.map((r) => [r.id, r])),
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

export async function getCatalogTrail(id: string) {
  if (id.length > 200 || !CATALOG_ID.test(id)) return null;
  const data = await load();
  const trail = data.byId.get(id);
  if (!trail) return null;
  if (trail.kind === "route" || trail.geometryShard === "route") {
    return { trail, lines: [] as [number, number][][], manifest: data.manifest };
  }
  const geometry = JSON.parse(
    (await unzip(await readFile(path.join(data.directory, `geometry-${trail.geometryShard}.json.gz`)))).toString(),
  ) as Record<string, [number, number][][]>;
  if (!geometry[id]) throw new Error("Missing catalog geometry");
  return { trail, lines: geometry[id], manifest: data.manifest };
}

export async function catalogDownload() {
  const data = await load();
  return readFile(path.join(data.directory, "index.json.gz"));
}
