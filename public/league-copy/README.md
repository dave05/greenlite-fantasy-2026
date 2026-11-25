# Curated Gazette copy

One JSON file per week, written by the Wednesday editor routine
(`scripts/roast/ROUTINE.md`) and committed to `main`. When a week's file
exists, the live site (`/api/gazette` -> `Gazette.tsx`) renders these
hand-written, web-researched, no-repeat jokes instead of the auto-generated
lines. Missing file or missing field = the deterministic fallback.

File: `week-<N>.json`, shape `{ "week": N, "paper": { ... } }`. The `paper`
object is also what `scripts/roast/memory.mjs check` scans for repeats, so the
site and the no-repeat guard always show the same words.

`paper` fields. The site treats them as optional (a missing field falls back to a
canned line), but `memory.mjs check` requires every text slot so canned lines
never print. `hero` is the only truly optional one:

- `hero`       `{ src, alt, credit }`       optional centre header graphic (file in `img/`), printed with a credit line; pre-loaded by the owner, kept by the routine
- `headline`   `{ kicker, head, sub }`      the marquee lead
- `offWire`    `{ source, headline, text }` the Off the Wire tie-in to real NFL news
- `kickoff`    `{ nudge, miss }`            the Kickoff Bulletin
- `roast`      `{ benched, flop, fresh, top, bottom, spread, escape, chopped, bigWallet, tightWallet }`  Roast Desk one-liners
- `value`      `{ stealJab, stealLine, lowballJab, lowballLine }`  the Value Desk cards (`*Line` replaces the canned closer in the card body)
- `benchGem`   string                        the "Started the wrong guy" line (site award `benchGem`)
- `comic`      `[ { who:"a"|"b", mood:"talk"|"yell"|"smug"|"react", text } ]`  up to 4 Peanut Gallery panels
- `obituary`   string                        one-line epitaph under the memorial
- `obituaryNotice` string                    the memorial card's full paragraph (replaces the canned one)
- `condolences` `[ { msg, from } ]`         2-3 condolence notes (replace the canned ones)
- `jabs`       `{ flop, benched, lowball, steal, hoarder }`  legacy slots the no-repeat checker also reads
