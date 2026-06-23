# Outdoor OS

Next.js app at the **repository root** — standard layout for Vercel.

## Local dev

```bash
npm install
cp .env.local.example .env.local   # add Supabase keys
npm run dev
```

## Vercel

1. **Root Directory:** leave **empty** (repo root)
2. **Install / Build commands:** leave default (`npm install`, `next build`)
3. **Environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add your Vercel URL to Supabase Auth redirect allowlist.
