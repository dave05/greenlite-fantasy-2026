# Weekly Gazette routine

The scheduled routine "Guillotine Gazette - weekly waiver roast" runs these
steps every Wednesday. Its prompt only points here, so change the process by
editing this file - no need to touch the routine.

Build this week's Guillotine Gazette and publish it to the website.

The Guillotine is a fantasy football league where the lowest scorer each week
is eliminated. The Gazette is its satirical paper: a one-page printed sheet
plus the Gazette tab on greenlite-fantasy-2026.vercel.app. All league data
comes from Sleeper's public API - no credentials needed.

**You are the editor-in-chief. Read `league-memory/EDITORIAL.md` in full before
anything else** - the voice, the facts the commissioner has corrected, what
landed and what flopped, where to research, and the running storylines. The
standard goes up every week: this issue has to be better than the last one.

The memory lives in `league-memory/` (`README.md` explains each file): a
profile per manager, every past offence, every past edition (`issues/`,
`archive/`) and every joke ever published. Continue the stories; never repeat
a joke or reuse a premise on the same person.

## Step 1 - find Chrome

    ls /opt/pw-browsers/*/chrome-linux/chrome

Export `CHROME` to that path. Only if nothing is there, install with
`npx --yes @puppeteer/browsers install chrome@stable`.

## Step 2 - collect the week and read the record

    OUT=$(mktemp -d)
    node scripts/roast/collect.mjs > $OUT/gazette.json
    node scripts/roast/memory.mjs brief $OUT/gazette.json

No arguments = the last COMPLETED NFL week; note N. Then read, in this order:
the briefing (storylines first), `members.json` for everyone in the news, the
last two `issues/week-*.json` and `archive/week-*-email.txt`, and the running
storylines in EDITORIAL.md section 6.

## Step 3 - research (EDITORIAL.md section 4)

- The waiver wire, both runs: the bidding war in `freshContests` (who paid what,
  the next highest bid, the gap) and the verdict on last week's run (awards,
  points scored, started or benched). Every bid has `budgetLeft`;
  `faab.rosters` has spent / remaining / rank - hoarders with mediocre teams
  get it hardest.
- The death: pull the chopped team's matchup (starters, bench points, empty
  slots) and transactions (late adds, timestamps). Do the "would they have
  survived" math with the real slot rules.
- Byes: who started a player on bye (ESPN `week.teamsOnBye` vs starters).
- The weekend's NFL news and viral moments: web search in extended mode
  (queries in EDITORIAL.md). Verify the season of every result. Tie at least
  one bit to real news, ideally about a player someone in the league rosters.

## Step 4 - write the edition into $OUT/copy.json

If `league-memory/issues/week-N.json` already exists, the commissioner has
approved a draft for this week: copy it to `$OUT/copy.json` and start from it.
Only change a line if `check` rejects it or this week's data contradicts it.

Format is in `league-memory/README.md`; what goes where is in EDITORIAL.md
section 5:

- `paper.headline` - a turn or a pun, never a summary.
- `paper.jabs` `{flop, benched, lowball, steal, hoarder}` for whichever awards
  exist, and `paper.obituary` (one-line epitaph). A missing slot falls back to
  a canned line that has already run.
- `jokes` - the Editor's Desk: 15-20 lines that all land, in 5-6 `section`s
  (cut filler words, never punchlines; group-chat lines word for word), each with
  `target`, a short `premise` and the exact `text`. Section "Obituary" goes on
  the chopped team's memorial.
- `comic` - four panels: setup, setup, turn, payoff.

Then:

    node scripts/roast/memory.mjs check $OUT/gazette.json $OUT/copy.json

Rewrite anything it rejects with a genuinely new angle (not a rewording) until
it prints ok. Before moving on, re-read every line against EDITORIAL.md
section 3 (the corrected facts) and section 2 (what flopped). Cut any line
that is a fact without a punchline - but do not cut a line that lands just to
hit a length.

## Step 5 - build the printed paper

    OUT_DIR=$OUT GAZETTE_JSON=$OUT/gazette.json COPY=$OUT/copy.json ./scripts/roast/build.sh

Then screenshot the print HTML and shrink it to a ~760px JPEG (60-90KB):

    "$CHROME" --headless=new --disable-gpu --no-sandbox --disable-background-networking \
      --virtual-time-budget=8000 --hide-scrollbars --window-size=1150,1500 \
      --screenshot=$OUT/gz.png --user-data-dir=$(mktemp -d) "file://$OUT/gazette-print-N.html"
    convert $OUT/gz.png -fuzz 3% -trim +repage -bordercolor '#d9d3c3' -border 12 $OUT/gz-trim.png
    convert $OUT/gz-trim.png -resize 760x -quality 40 $OUT/gz.jpg

Look at the JPEG: the whole sheet, nothing cut off, one page.

## Step 6 - record and publish

    node scripts/roast/memory.mjs record $OUT/gazette.json $OUT/copy.json
    cp $OUT/copy.json league-memory/issues/week-N.json      # the website reads this
    cp <pdf> gazettes/guillotine-gazette-week-N.pdf
    cp $OUT/gz.jpg gazettes/guillotine-gazette-week-N.jpg
    git add gazettes league-memory && git commit -m "gazette: week N" && git push origin feat/weekly-chop-and-draft-tools

The site picks up `issues/week-N.json` from GitHub within about a minute - no
redeploy. Check it: `curl -s https://greenlite-fantasy-2026.vercel.app/api/gazette?week=N`
should return your headline under `issue`.

Also update the memory for next week:
- add anything new you learned about a manager to their `members.json`
  profile (tendencies, running gags) - facts only;
- add new running storylines to EDITORIAL.md section 6, and anything that
  landed or flopped to section 2.
Commit those too.

The commissioner said email is not needed. Do not send the edition by email.
Finish by using SendUserFile to drop the JPEG into the session, with the
headline and the site link.

## When things go wrong

- BUILD FAILS: email dasam2012@gmail.com, subject "Guillotine Gazette - build
  failed", with the error and command output. This is the one email still
  wanted. Do not fail silently.
- SEASON OVER or no waiver activity: publish anyway and say it was a quiet week
  (still run check and record).
