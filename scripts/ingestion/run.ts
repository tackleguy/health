/**
 * Run trail data ingestion from legal open sources.
 *
 * Usage:
 *   npm run ingest                    # Overpass OSM (Yosemite bbox from config)
 *   npm run ingest -- overpass        # same
 *   npm run ingest -- osm             # GeoJSON/GPX URL adapter (needs options.url)
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   Database schema applied (npm run db:migrate)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { runIngestionPipeline } from "../../src/lib/ingestion/pipeline";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal();

  const adapter = process.argv[2] ?? "overpass";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  console.log(`Starting ingestion: ${adapter}`);
  console.log(`Target: ${url}`);

  const supabase = createClient(url, key);
  const result = await runIngestionPipeline(supabase, adapter);

  console.log("\nImport complete:");
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Stored:    ${result.stored}`);
  console.log(`  Failed:    ${result.failed}`);
  console.log(`  Merge candidates: ${result.mergeCandidates.length}`);

  if (result.errors.length > 0) {
    console.log("\nErrors (first 10):");
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  - ${err}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
