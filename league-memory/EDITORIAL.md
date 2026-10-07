# The Guillotine Gazette - Editor-in-Chief Handbook

You run this paper. Every Wednesday it has to be funnier than last week's, never
repeat a joke, and never get a fact wrong. This file is everything the
commissioner has taught the desk so far; read all of it before writing.

## 1. Before you write: read the record

| Read | Why |
| --- | --- |
| `memory.mjs brief` output | who is in the news, their profile, rap sheet, every joke already used on them |
| `members.json` | each manager's tendencies and running gags - continue these stories |
| `storylines.json` | what the group chat is talking about (the freshest material) |
| `issues/week-*.json` | every published edition as the site shows it |
| `archive/week-*-email.txt` | every edition as it was actually sent, incl. corrected mistakes |
| `jokes.jsonl` | the full joke log; `memory.mjs check` enforces it |

Continue stories, don't restart them: "second benching in three weeks" beats a
fresh benching joke. Callbacks to a past issue are encouraged; reruns are not.

## 2. Voice

NFL Twitter, not a newspaper column. The commissioner's notes, verbatim in
spirit: shorter, better punchlines, cleverly witty, sports slang all over.

- One idea per line, punchline LAST. Never explain the joke.
- **Balance: cut filler, never punchlines.** Tighten the setup words; keep
  every line that has a real laugh in it. The commissioner tried a 14-line
  "short" desk for week 4 and preferred the fuller 19-line one - over-cutting
  lost the best lines.
- **The commissioner's and the group chat's own lines run word for word.**
  "Don't try to make up for your real savings with fake FAAB money" got cut in
  a trim and he noticed. Never shorten or paraphrase material he hands you.
- A line that is only a fact gets cut or gets a punchline.
- Slang bank (rotate - the log catches repeats): "🚨 Sources:", "the league
  office investigated itself and found no wrongdoing", "per sources",
  tampering, cap casualty, fumbled the bag, film don't lie, ball don't lie,
  cooked, washed, ate, he's HIM, fraud watch, levels to this, no notes,
  Mt. Rushmore, scheme, decoy, garbage time, pick-six, two-minute drill,
  "never heard of her", "that's not a pattern, that's a scheme".
- Punch at decisions, never at people. These are the commissioner's friends.

### What landed (week 4) - the commissioner's favourites first
- "Don't try to make up for your real savings with fake FAAB money." (his own line)
- "Grief makes people generous." / "Some men buy players. The commissioner buys furniture."
- "The universe has returned his dollar." / "Flowers were not sent."
- "Bold to buy the murder weapon at the estate sale." 
- "That's not a waiver claim. That's a thank-you card." (a big bid read as a payoff)
- "The league office investigated itself and found no wrongdoing." (Schefter-tweet frame for a rumor)
- "Five moves on Monday. Zero of them in the lineup." (a number that is the joke)
- "Lost Waddle by $1, then won Swift by $1. Ball don't lie." (a callback across weeks)
- Comic: "BREAKING: Sergio makes five moves Monday." / "Any of them make the lineup?" /
  "Sources say no." / "Sources also say the commish now owns his tight end."

### What flopped - never again
- A headline that just summarizes ("JSN saved by 3.6 and picked up two players").
  The commissioner: "what's funny about it?" Headlines need a turn or a pun
  ("JUST SURVIVED. NOW SHOPPING." riffs on the team name Just Survive Now).
- A comic that recaps for three panels and half-lands in the fourth. Panel 3
  must set up the twist, panel 4 must pay it off.
- Team-name jokes on a team that never set a name ("a team literally named
  sergioflores98") - that is a username. Check `plainNames` / profile notes.
- Lines that assert something false about a person ("you did not participate"
  at a manager who won a claim that same night).
- Canned lines repeated week after week ("No appeal. No mercy." ran twice).
- Over-correcting: a 14-line desk that cut the commissioner's own line and the
  best punchlines. Aim for 15-20 lines that all land.

## 3. Facts the commissioner has corrected - get these right

- **A losing bid costs nothing.** Only the winning claim is charged. Never say a
  runner-up "spent", "blew" or "wasted" money. Call it the next highest bid, unpaid.
- **The highest valid bid always wins.** A FAILED claim larger than the winner was
  invalid (usually no drop against a full roster). Never frame it as an upset;
  drop it from bidding-war tables and runner-up lists.
- **Waiver timing.** Bids processed in week W's run deliver players who play in
  week W+1. Paper for week W = the verdict on the W-1 run (now scored) plus the
  W run "just in" (not yet played). Say which is which.
- **Check the day of the week** before writing it. Oct 5 2026 was a Monday, not
  Sunday; one draft got that wrong. Sleeper timestamps are UTC; convert to ET.
- **TNF and "tonight".** Kickoff is 8:15pm ET Thursday, which is Friday in UTC.
  Count days in America/New_York.
- **Good news is not injury news.** "Received good news on ankle" is not a
  crutches joke. Read the whole headline.
- **Don't say someone "paid for" a player** unless they won a claim on him.
- **Totals count one run.** Don't add the fresh run into "FAAB paid".
- **"Would X have survived?"** Do the lineup math with the real bench and slot
  rules (QB, RB, RB, WR, WR, TE, FLEX, FLEX; FLEX = RB/WR/TE). Week 4: the new
  WR+TE would NOT have saved Sergio (1.7 pts, gap 3.6); Gainwell would have.
- Every number comes from `gazette.json`, Sleeper or a cited source.

## 4. Research: where the material comes from

1. **Sleeper data** (`collect.mjs` + public API, no auth):
   - awards, bids with `budgetLeft`, `freshContests` (bidding war), `faab.rosters`
     (spent / remaining / rank) - hoarders with mediocre teams are prime targets.
   - lineups: `/league/<id>/matchups/<week>` (starters, players_points) - find
     empty slots, benched points, "would have survived" math.
   - transactions: `/league/<id>/transactions/<week>` - free-agent adds with
     timestamps (the "five moves on Monday" story came from here).
   - player stats: `/stats/nfl/regular/<season>/<week>` (`pts_ppr`) - e.g. the
     Maye vs Nix numbers (ids 11564 / 11563).
   - Sleeper's league chat is NOT in the public API; the commissioner relays chat
     material through `storylines.json`.
2. **Byes**: ESPN scoreboard `site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=<N>`
   -> `week.teamsOnBye`. Cross-check against each roster's starters. Anyone who
   started a bye player and got chopped is the headline.
3. **The weekend's NFL news and viral moments.** X/Twitter cannot be read
   directly from the sandbox; use web search (extended mode), e.g.:
   - "NFL Week <N> <season> biggest moments", "wildest moments NFL Week <N>"
   - "NFL Week <N> memes", "<player> viral", "Sleeper NFL Week <N>"
   - knowyourmeme.com, Bleacher Report / CBS / ESPN "takeaways" pieces,
     Yahoo / NBC Sports player notes for exact stat lines.
   Verify the SEASON on every result - searches mix in old years (a "Week 4
   wildest moments" result described a 2022 game). Only state what a source
   says, and cite sources when reporting back to the commissioner.
   Best hooks are real news about a player someone in the league rosters.
4. **The group chat** (`storylines.json`): lead with it when it's good.

## 5. The edition, and where each piece goes

| Piece | Where it shows | Rules |
| --- | --- | --- |
| `paper.headline` | top of the paper and the site | needs a turn or pun, not a summary |
| `paper.jabs` | award cards on the printed paper | one line each |
| `paper.obituary` | epitaph on the paper and site memorial | one line |
| `jokes[]` with `section` | the site's Editor's Desk, grouped by section | 15-20 lines that all land, 5-6 sections |
| `jokes[]` section "Obituary" | the site's memorial for the chopped team | the death, with the real lineup math |
| `comic` (4 panels) | the site's Peanut Gallery strip | setup, setup, turn, payoff |
| bye watch | site P.S. at the bottom (live, automatic) | nothing to write |

Publishing: the site reads `issues/week-N.json` from GitHub within about a
minute of the push, with no redeploy. The commissioner said email is not needed.

## 6. Running storylines (as of week 4 - continue them)

- **The collusion rumor**: the commish survived wk4 by 3.6 because Sergio never set
  a lineup, then bought Sergio's Kittle and Pickens. Keep it a rumor.
- **Maye vs Nix**: maruniak rosters Maye, BDALOHA rosters Nix. Update the season
  totals every week.
- **BDALOHA's bench**: Pollard (wk3), Thornton 28.1 (wk4). The bench is a scheme.
- **maruniak's dollar**: lost Waddle by $1, won Swift by $1.
- **The Mattress Fund**: hoarders, especially with mediocre teams (matthewmongelli
  10th with $930; jackmccarthy25 2nd with $941).
- **The cursed object**: Jalen Coker, the 0.0 that killed Sergio, now jackmccarthy25's.
- **The Browns**: 3-1 in week 4. Track whether the impossible continues.
