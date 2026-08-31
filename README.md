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

Neither league's Sleeper id is hard-coded. Each format is looked up from **its
own commissioner's** public Sleeper username, taking whichever of that
commissioner's leagues matches the format's name, newest season first:

| Format | Commissioner | Name match |
| --- | --- | --- |
| 🪓 The Guillotine | `dawit21` | `/guillotine/i` |
| ⛳ The Country Club | `cheezychang` | `/country\s*club/i` |

Both commissioners sit in other leagues too, hence the name match rather than
"their only league". A new season, or a new commissioner for either league, is a
one-line change in `src/lib/leagues.ts` — no env-var redeploy. Resolution order
per league:

1. `SLEEPER_LEAGUE_CHOPPED` / `SLEEPER_LEAGUE_REGULAR` — an explicit pin, if ops
   needs one. **Note:** a pin beats the commissioner lookup, so leaving a stale
   one set stops the league from following its commissioner.
2. That commissioner's newest matching league (default).
3. Legacy `SLEEPER_LEAGUE_NAVY` / `SLEEPER_LEAGUE_MARINE` or DB config.

Both endpoints report which of the three they used in `source`, alongside
`commissioner` and `leagueSeason`, so a stale pull is obvious.
`GET /api/sleeper/matchups` also returns the live **draft clock** (`draft`): who
is on the clock, the deadline for the current pick, and the projected end of
every round. The client counts down from those timestamps, so the timer ticks
between polls.

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

- [x] Connect both leagues (each resolved from its own commissioner's username)
- [ ] Weekly standings + elimination dashboard
- [ ] Waiver ($1,000 FAAB) tracker
- [ ] Week 14 redraft + Weeks 15–16 final view
