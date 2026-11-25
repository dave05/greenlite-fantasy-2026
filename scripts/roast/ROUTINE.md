# Weekly Gazette routine - The Guillotine Roast

The scheduled routine "Guillotine Gazette - weekly waiver roast" runs this every
Wednesday morning (waivers clear ~3am; you run at 8am ET). Its prompt only points
here, so change the process by editing this file - no need to touch the routine.

**What you produce:** this week's curated jokes for **The Guillotine Roast**, the
live paper the website already renders at `/#gazette`. You do NOT build a PDF or a
separate layout anymore. You write the JOKES into a committed file; the website
renders them with its own code. Then you push to `main` (which deploys the site),
screenshot the live paper, and email it.

The Guillotine is a survival league: lowest scorer each week is chopped, no
head-to-head matchups. All data is Sleeper's public API - no credentials.

## You are the editor-in-chief. Be savage.

This is a trolling paper and you run it. The voice is a stand-up editor-in-chief
roasting the group chat - sarcastic, specific, creative and edgy, written to get a
REACTION out of the person named. Dry, confident, mean about the DECISION. The data
is the floor, not the ceiling.

The core troll rules, every week (non-negotiable):
- **The current week's waiver wire must have run FIRST.** Never build a paper on
  stale waivers. Confirm this week's run has actually processed before you write
  (Step 2a below). If it has not cleared yet, STOP and do not publish.
- **Never repeat a joke, premise, or analogy - checked against EVERY previous
  week's issue.** `memory.mjs check` compares your lines to every joke ever
  printed (`league-memory/jokes.jsonl`), not just last week. A callback to an old
  crime by name and week is good; a reworded rerun is banned.
- **Use ALL the league data.** Everything `collect.mjs` emits: both waiver runs,
  the awards, every score, the full FAAB table, the chop, season spending. Do not
  lead with one stat and ignore the rest.
- **Read the league chat.** The group-chat drama lives in `storylines.json`
  (the commissioner adds it by hand - Sleeper's public API has no chat endpoint).
  `brief` surfaces the entries for this week. Work the fresh drama in.
- **Per-team / per-person memory.** `league-memory/members.json` is one dossier
  per manager - nicknames, fandom, tendencies, running gags, past crimes, and
  `off_limits`. Roast each person from THEIR file; call back their own history.
- **Know the wider fantasy-football world, not just this league.** Web-search
  the real NFL news AND the broader fantasy landscape this week: who the whole
  fantasy world was adding/dropping, the trending breakouts and busts, the
  start/sit debates, the injuries and role changes everyone is reacting to, the
  consensus takes (think r/fantasyfootball, FantasyPros, the beat writers). Then
  judge THIS league's moves against that backdrop - someone paying $181 for a guy
  going for cheap everywhere else, or ignoring the obvious league-wide pickup, is
  a funnier burn when you know what the rest of the fantasy world did. Tie at
  least one bit to a real, verifiable headline about a rostered player.
- **Get every real NFL stat exactly right.** Only state numbers a source
  actually gives. Never mix a single-game line with a career or season total in
  one breath (e.g. do NOT write "107 yards and 5,000 career rushing yards all on
  Monday night" - that reads as one game). If you are not certain of a figure,
  leave it out. A wrong stat kills the whole joke's credibility.
- **Benching an injured or ruled-out player is SMART, never a flop.** A 0.0 from
  a guy who was OUT (on IR, inactive, ruled out) and correctly left on the bench
  is good management, not misconduct. Do not build a "wasted money / the zeros are
  a brand" bit out of injured-player blanks. Only roast a bad buy the manager
  actually STARTED, or a real score they benched. (`collect.mjs` now enforces this
  in the awards, but check the story before you write it.)
- Be creative and edgy, but only ever about football decisions and fandom.

Before you write a single line, read EVERYTHING:

1. **Every previous week's post.** `league-memory/jokes.jsonl` is every joke ever
   printed; `node scripts/roast/memory.mjs brief` prints them. **Never reuse a
   joke, a premise, or an analogy on anyone.** Callbacks to an old crime ("second
   benching in three weeks") are great; reruns are banned. Repeats are the #1
   complaint about this paper and the checker will reject them.
2. **The member dossiers.** `league-memory/members.json` - nicknames, fandoms,
   tendencies, running gags, and `off_limits` topics. Weaponize the fandom and the
   roster crimes. Never touch anything under `off_limits`, in ANY line.
   `src/lib/leagueProfiles.ts` and `LEAGUE_INTEL.md` have the same intel in prose.
3. **The group chat storylines.** `gazette.json` `storylines` (also shown by
   `brief`) - the freshest, most personal material. Lead with them when good.
4. **The latest real NFL news - WEB SEARCH.** Search the web for this past
   weekend's real NFL news on players these managers roster: injuries, benchings,
   trades, suspensions, legal, viral blowups, and tonight's TNF storyline. Tie
   **Off the Wire** to a real, verifiable headline about a rostered player (ideally
   NOT the marquee guy). State only what a source actually says - never invent an
   injury or a quote.

House rules, non-negotiable:
- Punch at DECISIONS and FANDOM, never at people. These are the user's friends.
- Only real, verifiable facts. No invented news, scores, or quotes.
- **No em dashes or en dashes.** Hyphens only.

## Step 1 - get the code (on main)

    git fetch origin && git checkout main && git reset --hard origin/main

Use `reset --hard`, not `pull`: `main` is occasionally force-pushed, and a plain
`pull` then dies on "divergent branches". Reset lines you up with the remote
every time. Everything lives on `main`, and you push curated copy back to `main`.

## Step 2 - collect the week and read the briefing

    OUT=$(mktemp -d)
    node scripts/roast/collect.mjs > $OUT/gazette.json
    node scripts/roast/memory.mjs brief $OUT/gazette.json
    N=$(node -e 'console.log(require(process.argv[1]).week)' $OUT/gazette.json)
    curl -s "https://greenlite-fantasy-2026.vercel.app/api/gazette?week=$N" > $OUT/site.json

`site.json` is what the LIVE SITE computes for the week. Its `gazette.awards` can
differ from `collect.mjs` (different lowball, a `benchGem` that collect does not
have). The cards on the paper are built from site.json, so every card jab must be
about the manager and player THAT card names - read `site.json` awards before
writing `benchGem`, `roast.benched`, `roast.flop` and the `value` lines.

No arguments = the last COMPLETED NFL week. Note the week number **N** from the
JSON. Read the whole briefing: storylines, who is in the news, their profile,
their rap sheet, and every joke already used. `gazette.json` also carries
`tnf` (tonight's real Thursday game), `spending` (season FAAB leaders), `awards`,
`contests`, `freshContests`, `scores`, `chopped`, and `faab`.

## Step 2a - GATE: confirm this week's waiver wire has run first

`gazette.json` carries `freshRunAt` (when this week's waiver run processed) and
`freshRunAgeHours` (how long ago). The run should be fresh - the Wednesday wire
clears ~3am, so by 8am it is a few hours old.

- If `freshRunAgeHours` is null, or clearly stale (more than ~48 hours old, i.e.
  it is still last week's run and this week's has not cleared), **STOP.** Do not
  build or publish a paper on a stale wire. Email dasam2012@gmail.com, subject
  "Guillotine Roast - waiver wire not run yet", say the current run has not
  cleared, and end the routine. A paper that roasts last week's claims as if
  they were new is the exact mistake this gate exists to prevent.
- Otherwise the wire has run - continue.

## Step 2b - GATE: this week's league chat must be in

The group chat is the best material this paper has, and it only reaches you
through `league-memory/storylines.json`, which the owner fills by hand. If the
newest entry (`added_week`, else `from_week`) is older than week N-1, the brief
prints `!! STALE CHAT` and `check` refuses to pass. Do NOT publish from stale
gossip. Email dasam2012@gmail.com, subject "Guillotine Roast - need this week's
league chat", asking for the chat highlights (screenshots or pasted text; or a
reply saying the chat was quiet), and end the routine. When the owner sends it,
add the entries with `"added_week": N` and re-run from Step 2.

When the chat IS fresh, the headline or at least two Roast Desk lines must come
from this week's chat entries. Name the entry you used in your summary.

## Step 3 - web-research, then write the curated copy

Do the web search described above first. Then write
`public/league-copy/week-N.json`. **If that file already exists, the owner has
pre-loaded something for this issue (e.g. a `hero` header graphic). Read it and
MERGE your copy into it - never drop or overwrite fields you did not write.** Schema and every field are documented in
`public/league-copy/README.md`. Shape:

    { "week": N, "paper": { hero?, headline, offWire, kickoff, roast, value, benchGem,
      comic, obituary, obituaryNotice, condolences, jabs } }

**Every text slot is REQUIRED.** Any slot you leave empty prints one of the
site's canned rotating lines, which the league has already read many times -
that is the "same paper every week" complaint. `check` fails on any missing
slot. Fill all of them:

- `hero` `{src, alt, credit}` - optional centre header graphic, set by the owner.
  Keep it if present and write the headline so it fits the graphic.
- `headline` `{kicker, head, sub}` - the marquee: the loudest overpay or crime.
- `offWire` `{source, headline, text}` - your real-news tie-in. `headline` is the
  actual headline you found; `text` is the roast connecting it to the manager.
- `kickoff` `{nudge, miss}` - name tonight's TNF (in `gazette.json.tnf`) and nudge
  lineups; `miss` ribs last week's biggest start/sit blunder. No bye references.
- `roast` - one-liners for `benched, flop, fresh, top, bottom, spread, escape,
  chopped, bigWallet, tightWallet`. This is the heart of the paper.
- `value` `{stealJab, stealLine, lowballJab, lowballLine}` - the two Value Desk
  cards. `*Line` replaces the canned closer in the card body, `*Jab` is the red
  jab under it. Both must name the manager on that card in `site.json`.
- `benchGem` - the "Started the wrong guy" line: `site.json` `awards.benchGem`
  (the biggest bench score left out of a lineup). Must name that manager.
- `comic` - up to 4 Peanut Gallery panels `{who:"a"|"b", mood, text}`, a bit ABOUT
  the bidding (psychology, blown budget, bidding against nobody) - a fresh joke,
  not a restatement of the headline.
- `obituary` - one-line epitaph for the chopped team.
- `obituaryNotice` - the memorial card's full paragraph (replaces the canned
  "We mourn..." text). Mock-solemn, specific to THIS team's season.
- `condolences` - 2 or 3 `{msg, from}` notes "from" the survivors, written fresh
  for this chop (the canned ones are retired).
- `jabs` `{flop, benched, lowball, steal, hoarder}` - legacy slots the checker
  also reads; fill the ones whose award exists so a canned repeat is not printed.

TWO FACTS YOU MUST NOT GET WRONG - the owner has corrected these before:

- **A LOSING BID COSTS NOTHING.** Only the winning claim is charged. Never write or
  imply a runner-up "spent" or "blew" money. Call it the next highest bid, unpaid.
- **THE HIGHEST VALID BID ALWAYS WINS.** If a FAILED claim shows a bigger number
  than the winner, it was invalid (no drop against a full roster) - never frame it
  as a lower bid beating a higher one. Ignore such rows.

## Step 4 - pass the no-repeat check

    node scripts/roast/memory.mjs check $OUT/gazette.json public/league-copy/week-N.json $OUT/site.json

It fails on:
- a line that shares half its words with any joke ever printed, or with another
  line in this issue;
- a reused SENTENCE FRAME - a sentence that opens or closes the way a printed one
  did once names and numbers are blanked ("Survived by $X and...", "N points from
  first to last", "X goes out with..."). New facts in an old frame are a repeat;
- the same phrase in two slots of one issue (one bit, one slot - week 10 ran
  "at 3am X bought the same Y" three times);
- any missing text slot (see Step 3);
- a card jab that does not name the manager on that card in `site.json`;
- stale league chat (Step 2b) and `off_limits` topics.

Rewrite any flagged line with a genuinely NEW angle and structure (not a reword,
not the same template with new numbers) and run it again until it prints `ok`.

## Step 4b - proofread in passes before publishing

The `check` script only catches repeats and off-limits topics. YOU catch the rest.
Read the whole paper back critically, one concern per pass. Fix, then re-read. Do
not push until all four passes are clean:

1. **FACTS.** Every number, name, score, bid and date matches `gazette.json` or a
   cited source. No single-game line fused with a career or season total. No
   invented stats. Re-verify the marquee bid, the chop score and the FAAB figures
   against the data, not your memory of them.
2. **FAIRNESS.** No roasting a benched injured or ruled-out player as a flop or a
   waste. Punch at decisions and fandom, never people. Nothing from any manager's
   `off_limits`. A losing bid costs nothing; the highest valid bid wins.
3. **CLARITY and COMEDY.** Does each joke actually LAND, and is it clear WHO it is
   about? Name names. For the comic, give each character a `label` (the manager
   they are playing) so the reader knows who is talking. If a bit needs inside
   knowledge the reader does not have, add the setup or cut it.
4. **NO REPEATS.** `memory.mjs check` prints `ok` (Step 4 above). Then compare
   your issue side by side with last week's `week-(N-1).json`: different kicker
   format, different headline angle, different obituary shape, and no running
   bit (Maye-Nix campaign, estate sale, spite) framed the same way twice. The
   checker catches wording; you catch premises.

A second read of your own copy catches the stat slip, the unfair burn and the
joke that does not land BEFORE the league sees them, not after.

## Step 5 - record, commit, and push to main (this updates the live site)

    node scripts/roast/memory.mjs record $OUT/gazette.json public/league-copy/week-N.json
    git add public/league-copy league-memory
    git commit -m "gazette: week N curated copy"
    git push origin main

Pushing to `main` deploys the site, so the live Guillotine Roast now shows your
jokes.

## Step 6 - wait for the deploy, then screenshot the live paper

The emailed image must show YOUR copy, so wait until the deploy is live. Poll the
production API until your `headline` shows up in `copy` (a pre-loaded
`hero` alone does not count):

    for i in $(seq 1 40); do
      curl -s "https://greenlite-fantasy-2026.vercel.app/api/gazette?week=N" \
        | grep -q '"headline":{' && { echo live; break; }
      sleep 15
    done

Then find the sandbox Chromium and screenshot the chrome-free print route. The
Playwright path changes between images (it has been `chrome-linux/chrome` and
`chrome-linux64/chrome`), so glob for it rather than hardcoding:

    CHROME=$(ls /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | head -1)
    "$CHROME" --headless=new --disable-gpu --no-sandbox --disable-background-networking \
      --virtual-time-budget=12000 --hide-scrollbars --window-size=900,2600 \
      --screenshot=/tmp/roast.png --user-data-dir=$(mktemp -d) \
      "https://greenlite-fantasy-2026.vercel.app/gazette/print?week=N"

`/gazette/print?week=N` renders ONLY the paper (no nav, no week picker). Check the
height: adjust `--window-size` and re-shoot until the image is the whole sheet and
nothing more (the paper is tall - expect 2400-2800px). Then shrink to ~760px wide
as a JPEG (ImageMagick `convert -resize 760x -quality 55`, or Python/PIL), target
~70-110KB.

If the poll never goes live (deploy failed), email dasam2012@gmail.com with
subject "Guillotine Roast - deploy stuck", the commit sha, and stop. Do not email
a stale paper.

## Step 7 - publish the image and email it

Commit the JPEG so its raw URL resolves in the email (do NOT attach it - base64 of
a 70KB+ file into a tool call is prohibitively expensive and a past run burned its
whole budget on exactly that):

    mkdir -p gazettes
    cp <jpg> gazettes/guillotine-roast-week-N.jpg
    git add gazettes && git commit -m "gazette: week N image" && git push origin main

Raw URL (substitute N):

    https://raw.githubusercontent.com/dave05/greenlite-fantasy-2026/main/gazettes/guillotine-roast-week-N.jpg

Then send the email:

- to: dasam2012@gmail.com
- subject: "The Guillotine Roast - Week N"
- body: a plain-text version of the paper's best lines (headline, the chop, the
  marquee, Off the Wire, two or three Roast Desk burns).
- htmlBody: leads with the paper itself -
  `<img src="<raw .jpg URL>" width="760" style="width:100%;max-width:760px">` - then
  the plain-text lines below it.
- no attachments.

End the email with the live link and the raw image link on their own lines, so
they can be forwarded straight into the group chat:

    https://greenlite-fantasy-2026.vercel.app/#gazette
    <raw .jpg URL>

Finally, use SendUserFile to drop the JPEG into the session too.

## When things go wrong

- COLLECT OR CHECK FAILS: email dasam2012@gmail.com, subject "Guillotine Roast -
  build failed", with the error and command output. Do not fail silently.
- SEASON OVER or no waiver activity: still write a short, funny quiet-week copy,
  run check and record, push, screenshot, and send it anyway.
