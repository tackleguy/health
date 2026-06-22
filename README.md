# Health / Outdoor OS

Reference archives and the **Outdoor OS** app — a unified outdoor adventure platform.

## App

The main application lives in [`outdoor-app/`](./outdoor-app/). See its [README](./outdoor-app/README.md) for setup instructions.

```bash
cd outdoor-app
npm install
cp .env.local.example .env.local   # add your Supabase credentials
npm run dev
```

## Deploy on Vercel

Set **Root Directory** to `outdoor-app` and add Supabase env vars. See [outdoor-app/README.md](./outdoor-app/README.md#deploy-on-vercel) for the full checklist.

## Reference archives

Stored in [`references/`](./references/):

- `NotAllTrails` — AllTrails clone (trails, parks, reviews)
- `openskimap.org` — Ski map frontend (MapLibre)
- `Straya` / `Strava-clone-project` — Activity tracking
- `AltimeterView` — Elevation UI
