# TrailPack

Next.js app at the **repository root** — standard layout for Vercel.

The app includes a searchable catalog of **90,000 public trail-section records**: 82,392 in the U.S. and 7,608 in Canada. Browse `/explore/trails`, inspect source links and map geometry, or find regional discovery links in `/plan`. Sections are parts of trails, not automatically complete hikes.

The catalog and guest trip planner work without Supabase setup. See [catalog sources, licenses, coverage and refresh instructions](data/trail-catalog/README.md). Account features still require the configuration below.

Trail data platform (Phase 1): PostGIS geometry, ingestion pipeline, spatial APIs, admin dashboard.  
**Full documentation:** [docs/TRAIL_PLATFORM.md](docs/TRAIL_PLATFORM.md)

## Local dev

```bash
npm install
cp .env.local.example .env.local   # add Supabase keys + ADMIN_SECRET
npm run dev
```

Apply Supabase migrations (includes PostGIS schema + sample trail geometries):

```bash
supabase db reset   # or supabase migration up
```

## Vercel

1. **Root Directory:** leave **empty** (repo root)
2. **Install / Build commands:** leave default (`npm install`, `next build`)
3. **Environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_SECRET` (for `/admin`)

Add your Vercel URL to Supabase Auth redirect allowlist.
