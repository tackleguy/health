# Outdoor OS

Strava-style GPS tracking + AllTrails trail discovery + ski resort maps.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — Auth, PostgreSQL, Row Level Security
- **MapLibre GL** — Live maps, route polylines, ski explore

## Quick start

```bash
npm install
cp .env.local.example .env.local   # add your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase setup

Run in the Supabase SQL Editor:

1. `supabase/migrations/20250622000001_initial_schema.sql`
2. `supabase/migrations/20250623000001_activities.sql`
3. `supabase/seed.sql` (optional sample data)

## Deploy on Vercel

The app deploys from the **repo root** (no Root Directory override needed).

### Environment variables

Add in Vercel → **Settings → Environment Variables**:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable key |

### Supabase Auth URLs

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/**` and `https://*.vercel.app/**`

Redeploy after adding env vars.

## Reference archives

Stored in [`references/`](./references/) — NotAllTrails, OpenSkiMap, Strava clone, AltimeterView, GPS libs.
