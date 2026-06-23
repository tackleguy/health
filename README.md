# Outdoor OS

## Local dev

```bash
cd outdoor-app
npm install
cp .env.local.example .env.local
npm run dev
```

## Vercel

**Root Directory: `outdoor-app`** (Settings → General)

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** override Install or Build commands in Vercel — defaults work.

Add your Vercel URL to Supabase Auth redirect allowlist.
