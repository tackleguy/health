# Outdoor OS

A unified outdoor adventure platform — trail discovery, interactive maps, and reviews. Built as Phase 1 (foundation + map shell) and Phase 2 (trails) of the Ultimate Outdoor App vision.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — Auth, PostgreSQL + PostGIS, Row Level Security
- **MapLibre GL** — Interactive maps with trail/ski mode switcher

## Features

- 🏞 **Parks & trails** — Browse 3 national parks and 9 seeded trails (from NotAllTrails data)
- 🔍 **Search** — Real-time search across parks and trails
- 🗺 **Map** — MapLibre map with park/trail markers and trail/ski mode toggle
- ⭐ **Reviews** — Signed-in users can create, edit, and delete trail reviews
- 🔐 **Auth** — Email/password signup and login via Supabase

## Quick start

### 1. Install dependencies

```bash
cd outdoor-app
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and fill in your project URL and anon key
3. Run the migration in the Supabase SQL Editor:

   ```
   supabase/migrations/20250622000001_initial_schema.sql
   ```

4. Run the seed data:

   ```
   supabase/seed.sql
   ```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

The Next.js app lives in **`outdoor-app/`** (not the repo root). Vercel must be pointed at that folder.

### 1. Root Directory (required)

In [Vercel Dashboard](https://vercel.com) → your project → **Settings → General → Root Directory**:

- Set to **`outdoor-app`**
- Save and redeploy

If Root Directory is wrong, Vercel builds the repo root (which has no Next.js app) and the site will fail or show the wrong project.

### 2. Environment variables

**Settings → Environment Variables** — add for Production, Preview, and Development:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://frjgusxmkfsevlmixowg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable/anon key |
| `NEXT_PUBLIC_SKI_API_URL` | `https://api.openskimap.org` (optional) |

Redeploy after adding env vars.

### 3. Supabase Auth URLs

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**` and `https://*.vercel.app/**` for preview deploys

### 4. Database

Run migrations in Supabase SQL Editor if not already applied:

- `supabase/migrations/20250622000001_initial_schema.sql`
- `supabase/migrations/20250623000001_activities.sql`
- `supabase/seed.sql` (optional sample data)

### Troubleshooting

- **Amber banner on load** — env vars missing on Vercel; add them and redeploy.
- **Login redirects fail** — add your Vercel URL to Supabase redirect allowlist.
- **GPS not working** — requires HTTPS (Vercel provides this); grant location permission in the browser.
- **Build fails with lockfile warning** — ensure Root Directory is `outdoor-app`.

## Project structure

```
outdoor-app/
├── src/
│   ├── app/              # Pages and API routes
│   ├── components/       # UI components (map, trails, search, auth)
│   └── lib/              # Supabase clients, data layer, types
├── supabase/
│   ├── migrations/     # Database schema + RLS
│   └── seed.sql          # Sample parks and trails
└── references/           # (parent repo) Reference zip archives
```

## Roadmap

- **Phase 3** — Ski mode with OpenSkiMap API integration
- **Phase 4** — GPS activity tracking (Strava patterns)
- **Phase 5** — Discovery feed + AI route suggestions
- **Phase 6** — Social layer + safety features

## Reference projects

This app draws patterns from:

- **NotAllTrails** — Trail/park data model, search, reviews
- **OpenSkiMap** — MapLibre ski map (Phase 3)
- **Straya / Strava clones** — Activity tracking (Phase 4)
