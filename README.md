# 🏈 GreenLite Survivor Fantasy 2026

Twenty-eight managers. Two leagues. Every week, the lowest scorer in your league
is out — for good. This app is the front door for the season: **no login, just
pick your name and spin in** to ⚓ League Navy or 🦅 League Marine Corps
(fourteen a side, cap-enforced).

Built with Next.js 16 (App Router) + Tailwind v4, deployed on Vercel, backed by
Neon Postgres.

## How it works

- **Spin to assign.** Managers aren't pre-split. Each person picks their name
  from the fixed 28-person roster and spins; the server assigns a league
  atomically and keeps both sides capped at 14.
- **Live board.** Everyone sees the same rosters fill up in real time.
- **Coming next.** Wire in the **Sleeper** leagues for live standings, weekly
  chops, and the survivor dashboard.

## Local development

```bash
npm install
npm run dev
```

Without a `DATABASE_URL`, the app runs in **in-memory demo mode** — the spin
works but assignments reset on restart. To use real persistence locally:

```bash
vercel env pull .env.local   # after linking the project + Neon integration
npm run dev
```

## Data

Single table, created + seeded lazily on first request:

```sql
CREATE TABLE assignments (
  name       text PRIMARY KEY,
  league     text,          -- 'navy' | 'marine' | NULL (unclaimed)
  claimed_at timestamptz
);
```

## Deploy

Provisioned via the Vercel Marketplace Neon integration (sets `DATABASE_URL`),
then deployed with the Vercel CLI. See the project on Vercel for env + logs.

## Roadmap

- [ ] Connect Sleeper league IDs (Navy + Marine) via MCP
- [ ] Weekly standings + elimination dashboard
- [ ] Waiver ($1,000 FAAB) tracker
- [ ] Week 14 redraft + Weeks 15–16 final view
