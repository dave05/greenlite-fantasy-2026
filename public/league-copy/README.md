# Curated Gazette copy

One JSON file per week, written by the Wednesday editor routine
(`scripts/roast/ROUTINE.md`) and committed to `main`. When a week's file
exists, the live site (`/api/gazette` -> `Gazette.tsx`) renders these
hand-written, web-researched, no-repeat jokes instead of the auto-generated
lines. Missing file or missing field = the deterministic fallback.

File: `week-<N>.json`, shape `{ "week": N, "paper": { ... } }`. The `paper`
object is also what `scripts/roast/memory.mjs check` scans for repeats, so the
site and the no-repeat guard always show the same words.

`paper` fields (all optional - a missing field just falls back to auto):

- `headline`   `{ kicker, head, sub }`      the marquee lead
- `offWire`    `{ source, headline, text }` the Off the Wire tie-in to real NFL news
- `kickoff`    `{ nudge, miss }`            the Kickoff Bulletin
- `roast`      `{ benched, flop, fresh, top, bottom, spread, escape, chopped, bigWallet, tightWallet }`  Roast Desk one-liners
- `value`      `{ stealJab, lowballJab }`   the Value Desk card jabs
- `comic`      `[ { who:"a"|"b", mood:"talk"|"yell"|"smug"|"react", text } ]`  up to 4 Peanut Gallery panels
- `obituary`   string                        one-line epitaph under the memorial
- `jabs`       `{ flop, benched, lowball, steal, hoarder }`  legacy slots the no-repeat checker also reads
