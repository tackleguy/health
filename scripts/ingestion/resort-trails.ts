/** Compiles resort summer-trail lists (collected from each resort's official site) into
 * data/trail-catalog/resort-trails.json. Every entry must carry a stated length and a quote from the
 * resort's page naming it; anything that fails a check is dropped and reported, never repaired by guessing.
 * Run with npm run source:resorts -- <input.json> [more.json …]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResortTrailSource } from "../../src/lib/trail-catalog/resorts";
import { MIN_NEW_TRAIL_MILES } from "../../src/lib/trail-catalog/additions";
import { normalizeTrailName } from "../../src/lib/trail-catalog/through-hikes";

const output = path.join(process.cwd(), "data/trail-catalog/resort-trails.json");
const BASES = new Set(["one-way", "round-trip", "loop", "unstated"]);

function httpsUrl(value: unknown) {
  try { const url = new URL(String(value)); return url.protocol === "https:" ? url : null; } catch { return null; }
}

async function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) throw new Error("Pass one or more resort JSON files.");
  const resorts: ResortTrailSource[] = [];
  const rejected: string[] = [];
  for (const file of inputs) {
    for (const r of JSON.parse(await readFile(file, "utf8")) as ResortTrailSource[]) {
      const source = httpsUrl(r.sourceUrl);
      if (!source || !Number.isFinite(r.baseLatitude) || !Number.isFinite(r.baseLongitude) || Math.abs(r.baseLatitude) > 90 || Math.abs(r.baseLongitude) > 180) {
        rejected.push(`${r.resort}: missing official source URL or base coordinates`);
        continue;
      }
      const trails = (r.trails ?? []).filter((t) => {
        const quote = normalizeTrailName(t.quote ?? "");
        const words = normalizeTrailName(t.name).split(" ").filter((w) => w.length > 2 && !["trail", "the", "loop"].includes(w));
        const ok = typeof t.miles === "number" && t.miles >= MIN_NEW_TRAIL_MILES && t.miles < 100 && BASES.has(t.lengthBasis) && (t.use === "hike" || t.use === "hike+bike") && words.length > 0 && (words.some((w) => quote.includes(w)) || t.verifiedOnPage === true);
        if (!ok) rejected.push(`${r.resort} / ${t.name}: failed checks (length, basis, use, or quote does not name it and the page check could not pair name and length)`);
        return ok;
      });
      resorts.push({ ...r, sourceUrl: source.href, trails });
    }
  }
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), note: "Summer trails listed on ski resorts' official websites: name, stated length and difficulty only. Resorts do not publish coordinates, so no route lines exist for these.", resorts }, null, 1) + "\n");
  console.log(`${resorts.length} resorts, ${resorts.reduce((n, r) => n + r.trails.length, 0)} trails written to ${path.relative(process.cwd(), output)}`);
  for (const r of resorts) console.log(`  ${r.resort}: ${r.trails.length}${r.trails.length ? "" : ` — ${r.note ?? "no official list"}`}`);
  if (rejected.length) console.log(`Rejected ${rejected.length}:\n  ${rejected.join("\n  ")}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
