# ☕ CaféLoyalty

A white-label loyalty + linktree platform for cafés. Each café gets a beautiful public page with links and a full loyalty program (stamp cards + points system), managed through a dedicated owner dashboard.

---

## Features

### Customer-facing (`/[cafeSlug]`)
- Beautiful linktree-style landing page with café branding
- Buttons: Menu, Google Maps, Instagram, WhatsApp, custom links
- "Programa de beneficios" CTA that opens the loyalty page

### Loyalty page (`/[cafeSlug]/loyalty`)
- Phone-based login (no password needed for customers)
- **Stamp card**: visual grid, adds one per coffee, auto-resets when complete
- **Points system**: enter purchase amount → earn points → redeem rewards
- Fully reflects the café's custom colors and config

### Owner Dashboard (`/dashboard`)
- **Barista panel**: search customer by phone → add stamps or process purchases → redeem rewards — all in one screen
- **Settings**: customize name, description, logo, cover image, brand colors, all links, loyalty rules
- **Rewards**: create/edit/delete/toggle point rewards with emoji picker
- **Customers**: full table of registered customers with stamps, points, and total spent

---

## Tech Stack

- **Next.js 14** (App Router)
- **Prisma** + **SQLite** (dev) / PostgreSQL (prod)
- **NextAuth.js** (JWT sessions, owner login)
- **Tailwind CSS** + **Framer Motion**
- **react-hot-toast** for notifications

---

## Getting Started

### 1. Clone & install

```bash
git clone <your-repo>
cd cafe-loyalty
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env and set a strong NEXTAUTH_SECRET
```

### 3. Set up database

```bash
npm run db:push    # creates SQLite DB and applies schema
npm run db:seed    # creates a local dev demo café — dev only, never run in production
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Try it out

| URL | What it is |
|-----|-----------|
| `/cafedemo` | Customer-facing page for demo café |
| `/cafedemo/loyalty` | Loyalty program (enter any email to register) |
| `/login` | Owner dashboard login |
| `/dashboard` | Barista panel |
| `/dashboard/settings` | Café configuration |
| `/dashboard/rewards` | Points rewards management |
| `/dashboard/customers` | Customer list |

**Local dev credentials** after `db:seed`: `demo@sipo.ar` / `sipoDemo25`. Do not reuse this password in production.

---

## Adding a New Café

1. Log in as an owner
2. Run a seed or create via Prisma Studio (`npm run db:studio`)
3. Or build a registration flow for new café owners

---

## Production Deployment

### Switch to PostgreSQL

Update `.env`:
```
DATABASE_URL="postgresql://user:password@host:5432/cafeloyalty"
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then: `npm run db:push`

### Deploy to Vercel

```bash
vercel
```

Add environment variables in Vercel dashboard:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)

---

## Customization Ideas

- Add QR code generation for each café's page
- Add email/SMS notifications when stamps complete
- Analytics dashboard (visits, transactions over time)
- Multi-café support per owner
- Tiered loyalty levels (Bronze / Silver / Gold)
- Push notifications via PWA
