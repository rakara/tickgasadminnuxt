# TickGas Admin — Nuxt 3 + Ionic Vue + Vercel

Single-repo admin dashboard. The Vue frontend and the API backend live together — no CORS, no second server, one deployment.

## Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Framework   | Nuxt 3 (SPA mode, SSR disabled)                 |
| UI          | Ionic Vue 8 (MD mode)                           |
| API routes  | Nitro `server/api/` → Vercel serverless functions |
| Database    | Supabase (PostgreSQL, service-role server-side) |
| Auth        | Custom JWT (bcrypt + jsonwebtoken)              |
| Deployment  | Vercel (`nitro.preset = 'vercel'`)              |

## Why Nuxt 3 over plain Vite

- `server/api/*.ts` files become Vercel serverless functions automatically — no `vercel.json` route config needed
- `useRuntimeConfig()` separates secret server keys from public client keys cleanly
- `useLazyAsyncData` / `$fetch` replace raw `fetch` — built-in error handling, deduplication, and SSR-safe patterns
- `composables/` and `server/utils/` are auto-imported everywhere — zero import boilerplate

## Project layout

```
tickgas-admin-nuxt/
├── nuxt.config.ts          — SPA mode, Vercel preset, CSS, runtimeConfig
├── app.vue                 — <ion-app> root + client-side auth guard
├── plugins/
│   └── ionic.client.ts     — registers IonicVue + ionicons (client only)
├── composables/
│   ├── useAuth.ts          — reactive session state (token, admin, save/clear)
│   └── useApi.ts           — $fetch wrapper with JWT injection + formatters
├── assets/css/
│   ├── variables.css       — TickGas brand tokens + Ionic CSS var overrides
│   └── global.css          — stat cards, badges, shared layout styles
├── pages/
│   ├── index.vue           — redirects to /app/dashboard or /login
│   ├── login.vue           — login page
│   ├── app.vue             — Ionic tab bar shell
│   └── app/
│       ├── dashboard.vue
│       ├── orders.vue
│       ├── suppliers.vue
│       ├── agents.vue
│       ├── payments.vue
│       ├── more.vue
│       ├── analytics.vue
│       ├── locations.vue
│       └── profile.vue
└── server/
    ├── utils/
    │   ├── supabase.ts     — useSupabaseAdmin() (auto-imported by Nitro)
    │   ├── auth.ts         — signToken, verifyToken, requireAdmin (auto-imported)
    │   └── phone.ts        — normalisePhone (auto-imported)
    └── api/admin/
        ├── login.post.ts
        ├── dashboard.get.ts
        ├── orders.get.ts
        ├── orders.put.ts
        ├── suppliers.get.ts
        ├── suppliers.post.ts
        ├── suppliers.put.ts
        ├── agents.get.ts
        ├── agents.post.ts
        ├── agents.put.ts
        ├── payments.get.ts
        ├── analytics.get.ts
        ├── locations.get.ts
        ├── locations.post.ts
        └── locations/
            └── [id].patch.ts
```

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill in all NUXT_* variables

# 3. Dev server (frontend + API on the same port)
npm run dev

# 4. Build
npm run build

# 5. Preview production build locally
npm run preview
```

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable                    | Where used  | Description                        |
|-----------------------------|-------------|------------------------------------|
| `NUXT_JWT_SECRET`           | Server only | JWT signing secret (min 32 chars)  |
| `NUXT_SUPABASE_SERVICE_KEY` | Server only | Supabase service-role key (bypasses RLS) |
| `NUXT_ADMIN_EMAIL`          | Server only | Bootstrap admin email              |
| `NUXT_ADMIN_PASSWORD_HASH`  | Server only | bcrypt hash of bootstrap password  |
| `NUXT_PUBLIC_SUPABASE_URL`  | Public      | Supabase project URL               |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Public  | Supabase anon key                  |

## Deploying to Vercel

```bash
# Push to GitHub, then in Vercel:
# 1. Import repo
# 2. Framework preset: Nuxt.js (auto-detected)
# 3. Add all NUXT_* env vars
# 4. Deploy
```

Nitro's Vercel preset handles everything — each `server/api/*.ts` file becomes an independent serverless function. No `vercel.json` needed.

## Capacitor (optional native wrapper)

```bash
npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "TickGas Admin" com.tickgas.admin --web-dir=.output/public
npm run build
npx cap add android
npx cap sync
npx cap open android
```
