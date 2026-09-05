/**
 * Bootstrap database schema (if needed) and run trail ingestion.
 *
 * Usage:
 *   npm run ingest:nps          # NPS Yosemite trails (after schema exists)
 *   npm run bootstrap           # Apply migrations + ingest (needs DATABASE_URL)
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { runIngestionPipeline } from "../src/lib/ingestion/pipeline";

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

async function schemaExists(url: string, key: string): Promise<boolean> {
  const supabase = createClient(url, key);
  const { error } = await supabase.from("trails").select("id").limit(1);
  return !error;
}

async function applyMigrations(connectionString: string): Promise<void> {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`  → ${file}`);
    await client.query(sql);
  }

  await client.end();
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  const adapter = process.argv[2] ?? "nps";

  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const hasSchema = await schemaExists(url, key);

  if (!hasSchema) {
    if (!dbUrl) {
      console.error(`
Database schema not found on ${url}

Your Supabase project needs migrations applied first. Either:

  1. Add DATABASE_URL to .env.local (Dashboard → Settings → Database → URI), then:
     npm run bootstrap

  2. Or paste supabase/setup.sql + migrations into the Supabase SQL Editor and Run.

See: https://supabase.com/dashboard/project/nwxgovpuwxiksmrhsmkk/sql/new
`);
      process.exit(1);
    }

    console.log("Applying migrations…");
    await applyMigrations(dbUrl);
    console.log("Migrations applied.");
  } else {
    console.log("Schema OK.");
  }

  console.log(`Starting ingestion: ${adapter}`);
  const supabase = createClient(url, key);
  const result = await runIngestionPipeline(supabase, adapter);

  console.log("\nImport complete:");
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Stored:    ${result.stored}`);
  console.log(`  Failed:    ${result.failed}`);

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
