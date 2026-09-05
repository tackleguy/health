/**
 * Apply all Supabase migrations in order to a remote Postgres database.
 *
 * Requires DATABASE_URL in .env.local, e.g.:
 * postgresql://postgres.nwxgovpuwxiksmrhsmkk:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
 *
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

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
    // .env.local optional if vars already exported
  }
}

async function main() {
  loadEnvLocal();

  const connectionString =
    process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL. Add to .env.local from Supabase Dashboard → Settings → Database → Connection string.",
    );
    process.exit(1);
  }

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(`Applying ${files.length} migrations…`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`  → ${file}`);
    try {
      await client.query(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed on ${file}: ${message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
