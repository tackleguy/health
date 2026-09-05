# Outdoor OS

Next.js app at the **repository root** — standard layout for Vercel.

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
