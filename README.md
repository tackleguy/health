# Outdoor OS

Strava-style GPS tracking + AllTrails trails + ski resort maps.

## Quick start

```bash
cd outdoor-app
npm install
cp .env.local.example .env.local
npm run dev
```

## Deploy on Vercel

**Root Directory must be `outdoor-app`** (Settings → General → Root Directory).

Clear any custom Build/Install command overrides — `outdoor-app/vercel.json` handles it.

### Environment variables

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable key |

Also add your Vercel URL to Supabase Auth → URL Configuration.

## Reference archives

See [`references/`](./references/).
