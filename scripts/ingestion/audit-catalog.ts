/** Audits a published catalog snapshot with the trail quality rules.
 * Run with npm run audit:trails [snapshot-directory] [--json out.json].
 * Read-only: it prints a summary and never rewrites the snapshot. `npm run source:trails` applies the rules when building.
 */
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import type { CatalogTrail } from "../../src/lib/trail-catalog/types";
import { auditCatalog, recommendedAction } from "../../src/lib/trail-catalog/audit";
import type { Lines } from "../../src/lib/trail-catalog/quality";

async function main() {
  const root = path.join(process.cwd(), "data/trail-catalog");
  const args = process.argv.slice(2);
  const jsonAt = args.indexOf("--json");
  const out = jsonAt >= 0 ? args[jsonAt + 1] : null;
  const named = args.find((a, i) => !a.startsWith("--") && i !== jsonAt + 1);
  const directory = path.resolve(root, named ?? JSON.parse(await readFile(path.join(root, "current.json"), "utf8")).directory);
  const rows = JSON.parse(gunzipSync(await readFile(path.join(directory, "index.json.gz"))).toString()) as CatalogTrail[];
  const geometry: Record<string, Lines> = {};
  for (let i = 0; i < 64; i++) Object.assign(geometry, JSON.parse(gunzipSync(await readFile(path.join(directory, `geometry-${String(i).padStart(2, "0")}.json.gz`))).toString()));
  const failures: string[] = [];
  const items = rows.map((row) => {
    const lines = geometry[row.id];
    if (!lines) failures.push(row.id);
    // Audit a copy so the published record is not altered by a read-only run.
    return { row: { ...row }, lines: lines ?? [] };
  });
  const report = auditCatalog(items);
  const { entries, ...summary } = report;
  console.log(JSON.stringify({ snapshot: path.basename(directory), ...summary, missingGeometry: failures.length }, null, 2));
  const examples = entries.slice(0, 15).map(([id, name, region, , miles, mapped, status, flags]) => ({ id, name, region, miles, mapped, status, flags: flags.join(","), action: recommendedAction(status, flags) }));
  console.table(examples);
  if (out) await writeFile(out, JSON.stringify(report));
  if (failures.length) { console.error(`Validation failed: ${failures.length} trails have no geometry, e.g. ${failures.slice(0, 5).join(", ")}`); process.exitCode = 1; }
}
main().catch((error) => { console.error("Trail audit failed:", error); process.exitCode = 1; });
