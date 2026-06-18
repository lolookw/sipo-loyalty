# Sipo Loyalty

A production-ready loyalty platform for cafés: branded public pages, customer rewards, cashier tools, and an owner dashboard in one multi-tenant app.

Sipo turns a café's loyalty program into a simple digital flow: customers verify by email, collect stamps or points, cashiers manage purchases from a focused POS-style screen, and owners customize the café experience without touching code.

> Built around production concerns: multi-tenant routing, role-based access, OTP verification, transactional loyalty logic, image uploads, and tenant-safe admin workflows.

---

## Why this project matters

Most small cafés still run loyalty programs with paper cards, spreadsheets, or disconnected tools. Sipo brings the whole flow into one branded web app:

- customers get a mobile-first page for the café and their rewards;
- baristas can add stamps, purchases, and redemptions quickly;
- owners can manage branding, links, staff, rewards, and loyalty rules;
- each café has its own public URL and isolated data.

The goal is not just to show screens. It shows how a small business product handles auth, tenant boundaries, validation, transactions, and deployment concerns.

---

## Main app areas

| Area | What it does |
| --- | --- |
| Public café page | Branded landing page for each café, available under its own slug |
| Customer loyalty page | Email verification, registration, stamps, points, and available rewards |
| Owner/staff login | Role-aware access for café teams |
| Cashier dashboard | Fast customer search, stamp updates, purchases, and redemptions |
| Settings dashboard | Café branding, links, staff users, and loyalty configuration |
| Rewards dashboard | Create and manage point-based rewards |
| Customers dashboard | Review registered customers, stamps, points, and spend |

---

## What users can do

### Customers

- Open a café-specific landing page.
- Access menu, maps, Instagram, WhatsApp, website, and custom links.
- Verify their email with an OTP code.
- Register for the café loyalty program.
- View current stamps, lifetime stamps, points, and rewards.

### Baristas / cashiers

- Search customers by email or phone.
- Add a stamp after a valid purchase.
- Register purchase amounts to award points.
- Redeem completed stamp cards.
- Redeem point-based rewards.
- See recent activity from the cashier screen.

### Café owners

- Customize café name, description, logo, cover image, and colors.
- Configure public links and custom buttons.
- Enable/disable stamp and points programs.
- Set stamps required, stamp reward, points ratio, currency, and minimum purchase for stamps.
- Create and manage staff users.
- Create, edit, disable, and delete rewards.
- Review customers, points, stamps, and total spend.

### Super admin

- Create cafés and owner accounts.
- Manage existing café records.
- Access café dashboards when needed for administration.

---

## Product details worth reviewing

- **Multi-tenant routing:** café pages live under `/:cafeSlug`.
- **Role-aware auth:** super admin, owner, and cashier access paths are separated.
- **OTP customer verification:** public customer registration requires OTP proof.
- **Tenant-safe uploads:** uploads check café ownership/staff access before using Supabase storage.
- **Transactional rewards:** stamp and point operations use guarded Prisma transactions to avoid double-spend and race conditions.
- **Configurable loyalty rules:** each café controls its own stamps, points, rewards, minimum purchase, and branding.

---

## Tech stack

| Area | Stack |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 18, Tailwind CSS, Framer Motion |
| Auth | NextAuth.js JWT sessions |
| Database | Prisma + PostgreSQL |
| Email OTP | Resend |
| Uploads | Supabase Storage |
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

# Customer OTP emails
RESEND_API_KEY="replace-with-resend-api-key"
RESEND_FROM_EMAIL="Sipo <hello@example.com>"

# Image uploads
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="replace-with-service-role-key"
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

The app is designed for Vercel.

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

Then deploy with your usual Vercel flow.

```bash
npm run build
```

The project uses `next/font/google`, so fonts are downloaded at build time and served from the deployment.

---

## Security notes

This public repo intentionally avoids committed `.env` files, local MCP config, Vercel config, and service credentials.

Important safeguards implemented in the app:

- no fallback secret for customer token signing;
- OTP proof required before public customer registration;
- role and tenant checks before café uploads and cashier access;
- sanitized public URLs and custom links;
- normalized emails and duplicate checks across owner/staff accounts;
- transaction guards for stamp and points updates.

---

## Future improvements

- Convert remaining `<img>` usages to `next/image` where it makes sense.
- Add analytics for visits, purchases, and reward redemption.
- Add owner onboarding/self-serve café creation.
- Add automated tests around OTP, uploads, and transaction race cases.
- Add PWA support for cashier/customer flows.

---

## Project status

This repository is public so the codebase can be reviewed as part of a portfolio. The application itself is product-oriented and can be deployed with your own environment variables.
