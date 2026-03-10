# Sovereign — Elite Execution

Elite Temporal Audit & Execution Engine. Next.js 15 app with Supabase (auth + database), sync when logged in, and PWA support.

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL Editor, run the migration:  
     `supabase/migrations/001_sovereign_schema.sql`
   - In Project Settings → API copy the project URL and the `anon` public key.

3. **Environment**
   - Copy `.env.example` to `.env.local`.
   - Set:
     - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

4. **PWA icons (optional)**  
   Add `public/icons/icon-192.png` and `public/icons/icon-512.png` for install prompt and home screen. If missing, the app still runs; add any 192×192 and 512×512 PNGs when you want PWA install.

5. **Run**
   ```bash
   npm run build
   npm start
   ```
   Or for development: `npm run dev`

## Deploy (e.g. Vercel)

1. Push the repo to GitHub (or connect your Git provider to Vercel).
2. In Vercel: **New Project** → import repo → Framework: **Next.js**.
3. **Environment variables** (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
4. Deploy. After deploy, ensure the Supabase project URL is your production URL if you use redirects (e.g. Auth redirect URL in Supabase: `https://your-app.vercel.app/**`).

## Features

- **Auth:** Email/password via Supabase. Routes `/login`, `/signup`. Middleware redirects unauthenticated users to `/login`; logout in the app header.
- **Data:** When logged in, data (assets, session logs, app state) is loaded from and saved to Supabase; when not logged in, data is stored in `localStorage` only.
- **PWA:** `manifest.json`, theme-color, and meta for standalone install. Add icons under `public/icons/` for full install support.

## Env reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for auth/sync) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for auth/sync) | Supabase anon/public key |

Other keys (e.g. Genkit) stay in `.env.local` as before.
