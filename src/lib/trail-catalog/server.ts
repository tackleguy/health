import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import type { CatalogFilters, CatalogManifest, CatalogTrail } from "./types";
import { filterCatalog, searchableText } from "./search";

const unzip = promisify(gunzip);
const root = path.join(process.cwd(),"data/trail-catalog");
let catalog: Promise<{ rows:CatalogTrail[]; texts:string[]; byId:Map<string,CatalogTrail>; manifest:CatalogManifest; directory:string }> | undefined;
// This module is imported only by server components and API routes. Never send the index to a client component.
function load() {
  catalog ??= (async () => {
    const pointer = JSON.parse(await readFile(path.join(root,"current.json"),"utf8"));
    if (!/^snapshot-\d+$/.test(pointer.directory)) throw new Error("Invalid catalog snapshot");
    const directory = path.join(root,pointer.directory);
    const [raw,metadata] = await Promise.all([readFile(path.join(directory,"index.json.gz")),readFile(path.join(directory,"manifest.json"),"utf8")]);
    const manifest = JSON.parse(metadata) as CatalogManifest;
    if (createHash("sha256").update(raw).digest("hex") !== manifest.indexSha256) throw new Error("Catalog checksum mismatch");
    const rows = JSON.parse((await unzip(raw)).toString()) as CatalogTrail[];
    if (rows.length !== manifest.total || new Set(rows.map(r=>r.id)).size !== rows.length) throw new Error("Catalog count mismatch");
    return { rows, texts:rows.map(searchableText), byId:new Map(rows.map(r=>[r.id,r])), manifest, directory };
  })().catch(error => { catalog = undefined; throw error; });
  return catalog;
}
export async function searchCatalog(filters: CatalogFilters = {}) {
  const data = await load();
  return { ...filterCatalog(data.rows,filters,data.texts), manifest:data.manifest };
}
export async function getCatalogTrail(id: string) {
  if (!/^(usgs|parks-canada|ontario)-[a-zA-Z0-9-]+$/.test(id)) return null;
  const data = await load();
  const trail = data.byId.get(id); if (!trail) return null;
  const geometry = JSON.parse((await unzip(await readFile(path.join(data.directory,`geometry-${trail.geometryShard}.json.gz`)))).toString()) as Record<string,[number,number][][]>;
  if (!geometry[id]) throw new Error("Missing catalog geometry");
  return { trail, lines:geometry[id], manifest:data.manifest };
}
export async function catalogDownload() {
  const data = await load();
  return readFile(path.join(data.directory,"index.json.gz"));
}
