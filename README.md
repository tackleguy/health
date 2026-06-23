# Outdoor OS

Strava-style GPS tracking, trail discovery, and ski maps.

## Local dev

```bash
npm install
cp .env.local.example .env.local   # add Supabase keys
npm run dev
```

Open http://localhost:3000

## Vercel deploy

The app deploys from the **repository root** (not `outdoor-app/`).

### Required Vercel settings

1. **Settings → General → Root Directory** → leave **empty** (or `.`)
   - If this says `outdoor-app`, delete it and save — that breaks deploys.
2. **Settings → Build & Development** → turn **off** any override for Install Command or Build Command
3. **Settings → Environment Variables** → add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy

### Supabase auth

In Supabase → Authentication → URL Configuration, add your Vercel URL:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**` and `https://*.vercel.app/**`

## Database

Run in Supabase SQL Editor:
- `supabase/migrations/20250622000001_initial_schema.sql`
- `supabase/migrations/20250623000001_activities.sql`
- `supabase/seed.sql` (optional)
