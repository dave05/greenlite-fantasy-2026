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

## Sleeper connection

The Country Club's Sleeper league is **not** a hard-coded id. The app looks up
the commissioner's public Sleeper username (`cheezychang`) and pulls whichever
of their leagues is The Country Club, newest season first — so a new season, or
a new commissioner, is a one-line change in `src/lib/leagues.ts` rather than an
env-var redeploy. Resolution order:

1. `SLEEPER_LEAGUE_REGULAR` — an explicit pin, if ops needs one.
2. The commissioner's newest Country Club league (default).
3. Legacy `SLEEPER_LEAGUE_MARINE` / DB config, from before the redesign.

`GET /api/sleeper/matchups` reports which of the three it used in `source`, and
also returns the live **draft clock** (`draft`): who is on the clock, the
deadline for the current pick, and the projected end of every round. The client
counts down from those timestamps, so the timer ticks between polls.

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

- [x] Connect the Country Club league (resolved from the commissioner's username)
- [ ] Connect the Guillotine league id
- [ ] Weekly standings + elimination dashboard
- [ ] Waiver ($1,000 FAAB) tracker
- [ ] Week 14 redraft + Weeks 15–16 final view
