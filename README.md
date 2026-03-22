# TickGas — Admin Web App

Internal web application for TickGas platform administrators.

## Live URL
`https://admin.tickgas.com`

## What's in this repo
| Path | Purpose |
|---|---|
| `pages/api/admin/login.js` | Email + password auth → JWT (role=admin) |
| `pages/api/admin/dashboard.js` | Platform KPIs + revenue chart data |
| `pages/api/admin/analytics.js` | Aggregate analytics endpoint |
| `pages/api/admin/suppliers.js` | List + approve/reject/suspend suppliers |
| `pages/api/admin/orders.js` | Platform-wide order management |
| `pages/api/admin/orders/[id].js` | Single order detail |
| `pages/api/admin/payments.js` | M-PESA transaction history |
| `pages/api/admin/agents.js` | Create + manage field agents |
| `pages/api/admin/locations.js` | Service area management |
| `pages/api/admin/locations/[id].js` | Single location CRUD |
| `public/login.html` | Admin login |
| `public/dashboard.html` | KPI overview |
| `public/suppliers.html` | Supplier approval queue |
| `public/orders.html` | Order list |
| `public/payments.html` | Payment transactions |
| `public/analytics.html` | Charts and metrics |
| `public/agents.html` | Agent management |
| `public/locations.html` | Service area management |
| `lib/daraja.js` | M-PESA client (admin-initiated retries) |

## Setup

```bash
cp .env.example .env.local
# Fill in all values — especially ADMIN_EMAIL + ADMIN_PASSWORD_HASH for first login
npm install
npm run dev
```

## First admin login
Until the `admins` DB table is seeded, the app falls back to env-var credentials:
```bash
# Generate a bcrypt hash of your chosen password:
node -e "const b=require('bcryptjs'); b.hash('YourPassword',12).then(h=>console.log(h))"

# Add to .env.local:
ADMIN_EMAIL=admin@tickgas.com
ADMIN_PASSWORD_HASH=<hash from above>
```
After that, create a proper row in the `admins` table and remove the env-var fallback.

## Environment Variables
See `.env.example`. Key ones:
- `JWT_SECRET` — **must be identical across all four apps**
- `NEXT_PUBLIC_SUPABASE_URL` + keys — same Supabase project
- `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` — bootstrap credentials (first login only)

## Deploy to Vercel
```bash
vercel --prod
```

## Notes
- This is intentionally **not** a PWA — it's a desktop-first admin tool.
- All API routes require a valid `role=admin` JWT.
- Approving a supplier auto-sets `verified=true` and fires an SMS notification.
