# Sipo Loyalty

A production loyalty platform for cafés: branded public pages, customer rewards, cashier tools, an owner dashboard, and a public REST API for POS/ERP integrations — all in one multi-tenant app.

Sipo turns a café's loyalty program into a simple digital flow: customers verify by email, collect stamps or points, cashiers manage purchases from a focused POS-style screen, owners run campaigns and referrals and read their own analytics, and external systems (POS, ERP) can post purchases straight into the loyalty engine through a versioned API.

> **Currently in production, used by real cafés.** This repo is a public mirror of the live codebase (no customer data, credentials, or business-specific config included) kept for portfolio review.

> Built around production concerns: multi-tenant routing, role-based access, OTP verification, transactional loyalty logic, idempotent API writes, plan-gated features, scheduled jobs, image uploads, and tenant-safe admin workflows.

---

## Why this project matters

Most small cafés still run loyalty programs with paper cards, spreadsheets, or disconnected tools. Sipo brings the whole flow into one branded web app — and, unlike a typical portfolio CRUD app, it also has to survive real usage: concurrent purchases, plan limits, scheduled expirations, and a public API that any POS integrator can hit.

- customers get a mobile-first page for the café, an installable wallet card, and their rewards;
- baristas can add stamps, purchases, and redemptions quickly;
- owners can manage branding, campaigns, referrals, and read their own analytics without touching code;
- a café's own POS or ERP can register purchases and redemptions directly through the API;
- each café has its own public URL, its own plan, and fully isolated data.

The goal is not just to show screens. It shows how a small business SaaS handles auth, tenant boundaries, plan limits, idempotency, concurrency, scheduled jobs, and a public API surface.

---

## Main app areas

| Area | What it does |
| --- | --- |
| Public café page | Branded landing page for each café, available under its own slug |
| Customer loyalty page | Email verification, registration, stamps, points, campaigns banner, referrals, and an installable wallet card (PWA) |
| Self-service signup | `/sumate` — a café owner can request an account without a super admin creating it by hand |
| Owner/staff login | Role-aware access for café teams |
| Cashier dashboard | Fast customer search, stamp updates, purchases, and redemptions |
| Settings dashboard | Branding, links, staff users, loyalty configuration, referral program, and API keys |
| Campaigns dashboard | Time-limited point/stamp multipliers, bonus-point campaigns, and a welcome bonus for new signups |
| Rewards dashboard | Create and manage point-based rewards |
| Customers dashboard | Review registered customers, stamps, points, and spend — with a one-click CSV export |
| Broadcasts dashboard | Send a one-time email update to all opted-in customers, queued and rate-limited by the cron |
| Getting started guide | Self-updating setup checklist for new café owners, with per-step skip |
| Analytics dashboard | Visits, new vs. returning customers, redemptions, and peak hours — read-only, owner-facing |
| Developer docs | `/developers` — public API reference for POS/ERP integrators |
| Super admin panel | Create cafés, review signup requests, activate plans, manage platform-wide config |

---

## What users can do

### Customers

- Open a café-specific landing page.
- Access menu, maps, Instagram, WhatsApp, website, and custom links.
- Verify their email with an OTP code.
- Register for the café loyalty program, optionally via a referral link, and get an automatic welcome bonus if the café is running one.
- Optionally complete their profile (phone, birthday, favorite drink) after registering.
- View current stamps, lifetime stamps, points, bonus points, and rewards.
- See active campaigns (multiplier, bonus-point, or welcome-bonus promotions) as a banner.
- Get nudged to leave a Google Maps review after redeeming.
- Add their loyalty card to their phone's home screen (installable PWA).
- Invite others and earn a reward once the referred friend makes their first real purchase.
- Get a re-engagement email if they go quiet or complete a card without redeeming — and unsubscribe from café broadcasts with one click.

### Baristas / cashiers

- Search customers by name or email (same lookup logic the public API uses).
- Add a stamp after a valid purchase.
- Register purchase amounts to award points — campaign multipliers apply automatically.
- Redeem completed stamp cards.
- Redeem point-based rewards.
- See recent activity from the cashier screen.

### Café owners

- Customize café name, description, logo, cover image, and colors.
- Configure public links and custom buttons.
- Enable/disable stamp and points programs; set stamps required, stamp reward, points ratio, currency, and minimum purchase.
- Create and manage staff users.
- Create, edit, disable, and delete rewards.
- Configure stamp expiration windows.
- Create time-limited campaigns (point/stamp multipliers, bonus points with their own expiration).
- Turn on referrals and configure the reward type/amount.
- Turn on a welcome bonus (points and/or stamps) for customers who just signed up.
- Turn on re-engagement emails for inactive customers and for completed-but-unredeemed cards, each with its own delay and editable message.
- Send a one-time broadcast email to customers who haven't opted out, with an explicit confirmation step before it queues.
- Read their own analytics: visits, new vs. returning customers, redemptions, peak hours.
- Export their customer list as a CSV.
- Follow a setup checklist that auto-detects what's already configured (logo, colors, stamps, rewards, staff), with a per-step "skip" for what doesn't apply.
- Generate and revoke API keys for their own POS/ERP integration.
- Review customers, points, stamps, and total spend.

### Super admin

- Create cafés and owner accounts.
- Review and approve self-service signup requests.
- Activate/extend a café's plan (trial, monthly, permanent) or let it lapse.
- Manage platform-wide config (contact links shown on marketing/demo pages).
- Access café dashboards when needed for administration.

---

## Public API (v1)

A café on an active (non-trial) plan can generate an API key from **Settings → Integraciones** and let its own POS or ERP talk to Sipo directly — register purchases, look up a customer's balance, or redeem a reward — without going through the cashier UI.

```bash
curl -X POST https://sipo.ar/api/v1/purchases \
  -H "Authorization: Bearer $SIPO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "amount": 8200,
    "mode": "auto",
    "auto_register": true,
    "external_id": "pos-ticket-8841"
  }'
```

- **Auth**: one API key per café (`Authorization: Bearer sipo_live_…`), stored server-side only as a SHA-256 hash — the raw key is shown once, at creation time.
- **Idempotency**: every purchase/redemption call takes an `external_id`; replaying the same ID (retry, double click) returns the original result instead of double-crediting.
- **Shared core**: the API and the in-app cashier screen call the same purchase logic (`lib/purchase.ts`), so campaigns, referrals, stamp expiration, and concurrency guards behave identically regardless of which path a transaction comes through.
- **Plan-gated**: the API is a feature of paid/active plans, not the free trial — enforced server-side on every request, not just in the UI.
- **Customer lookup**: `/customers/search` shares its matching logic (`lib/customerSearch.ts`) with the in-app cashier search, so an integrator's autocomplete and the barista's own search box behave identically.

Full endpoint reference (`/me`, `/customers`, `/customers/search`, `/purchases`, `/redemptions`, error codes) lives at [`app/developers/page.tsx`](app/developers/page.tsx) and is served live at `/developers`.

---

## Product details worth reviewing

- **Multi-tenant routing:** café pages live under `/:cafeSlug`, each with isolated data.
- **Role-aware auth:** super admin, owner, and cashier access paths are separated.
- **OTP customer verification:** public customer registration requires a cryptographically random OTP proof — no bypass path via the registration endpoint.
- **Tenant-safe uploads:** uploads check café ownership/staff access before using Supabase storage.
- **Transactional rewards:** stamp and point operations run inside guarded Prisma transactions to avoid double-spend and race conditions — the same guards apply whether the transaction comes from the cashier UI or the public API.
- **Idempotent writes:** both the API and internal flows dedupe on an external/idempotency key.
- **Plan enforcement:** free-tier customer limits, trial/active/permanent states, and API access are all checked server-side, not just hidden in the UI.
- **Scheduled jobs:** a secret-protected cron endpoint expires stamps and bonus points on schedule, emails a heads-up a few days before expiration, sends re-engagement and broadcast emails in batches, and rotates through in-flight broadcasts fairly across cafés.
- **Shared email quota, respected everywhere:** every automated email (OTP, expiration warnings, re-engagement, broadcasts) shares one Resend quota across the whole platform, so batch jobs cap themselves per run rather than risking starving customer-facing OTP delivery.
- **Configurable loyalty rules:** each café controls its own stamps, points, rewards, campaigns, referral program, re-engagement rules, and branding independently.

---

## Tech stack

| Area | Stack |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 18, Tailwind CSS, Framer Motion |
| Auth | NextAuth.js JWT sessions + hashed per-café API keys |
| Database | Prisma + PostgreSQL |
| Email | Resend (OTP codes, expiration notices, re-engagement, broadcasts) |
| Uploads | Supabase Storage |
| Scheduled jobs | Vercel Cron (`vercel.json`) |
| Validation/tooling | TypeScript, ESLint, npm audit |
| Deployment target | Vercel |

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/lolookw/sipo-loyalty.git
cd sipo-loyalty
npm install
```

### 2. Create `.env`

```env
DATABASE_URL="postgresql://user:password@host:5432/cafeloyalty"
NEXTAUTH_SECRET="replace-with-a-strong-secret"
NEXTAUTH_URL="http://localhost:3000"

# Super admin login
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="replace-with-a-strong-password"

# Customer OTP + expiration-notice emails
RESEND_API_KEY="replace-with-resend-api-key"
RESEND_FROM_EMAIL="Sipo <hello@example.com>"

# Image uploads
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="replace-with-service-role-key"

# Cron auth for the stamp/points expiration job
CRON_SECRET="replace-with-a-strong-secret"
```

### 3. Set up the database

```bash
npm run db:push
npm run db:seed
```

`db:seed` creates local sample data for development.

The seed is meant for local development only. Do not reuse seeded credentials in production.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Create production build |
| `npm run start` | Run production server after build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:seed` | Seed local sample data |
| `npm run db:studio` | Open Prisma Studio |

---

## Deployment notes

The app is designed for Vercel, including a scheduled cron job (`vercel.json`) for stamp/points expiration.

Required production environment variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Then deploy with your usual Vercel flow.

```bash
npm run build
```

The project uses `next/font/google`, so fonts are downloaded at build time and served from the deployment.

---

## Security notes

This public repo intentionally avoids committed `.env` files, local MCP config, Vercel project config, service credentials, and internal test scripts.

Important safeguards implemented in the app:

- no fallback secret for customer token signing;
- cryptographically random OTP codes, with proof required before public customer registration;
- role and tenant checks before café uploads and cashier access;
- API keys stored only as a SHA-256 hash, never in plaintext, shown once at creation;
- idempotency keys on API writes to prevent duplicate purchases/redemptions from retries;
- plan checks enforced server-side (customer limits, API access) rather than only in the UI;
- the scheduled expiration job requires a bearer secret, so it can't be triggered by an outside caller;
- sanitized public URLs and custom links;
- normalized emails and duplicate checks across owner/staff accounts;
- transaction guards for stamp and points updates, shared by the cashier UI and the public API;
- the public unsubscribe link is scoped to one café's broadcasts only (never transactional email) and relies on an unguessable id, the same security model as referral links.

---

## Future improvements

- Convert remaining `<img>` usages to `next/image` where it makes sense.
- Expand automated test coverage around the public API and the scheduled expiration job.
- Webhook/POS bridge integrations beyond the direct REST API (in progress for a specific POS partner).
- Tiered loyalty levels (bronze/silver/gold) — deliberately left out so far in favor of simpler stamps/points rules.

---

## Project status

This repository is public so the codebase can be reviewed as part of a portfolio. It mirrors the real, currently-deployed product — not a simplified demo — with customer data, credentials, and business-specific configuration excluded.
