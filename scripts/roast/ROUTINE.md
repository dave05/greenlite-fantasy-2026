# Weekly Gazette routine

The scheduled routine "Guillotine Gazette - weekly waiver roast" runs these
steps every Wednesday. Its prompt only points here, so change the process by
editing this file - no need to touch the routine.

Build this week's Guillotine Gazette, publish it, and email it to dasam2012@gmail.com.

The Guillotine is a fantasy football league where the lowest scorer each week
is eliminated. The Gazette is a one-page satirical newspaper roasting the
league's waiver-wire spending. All data comes from Sleeper's public API - no
credentials needed.

The Gazette has a MEMORY in `league-memory/` (read `league-memory/README.md`
first). It knows every manager (`members.json` - nicknames, tendencies, running
gags, OFF LIMITS topics), every past offence (`rap-sheet.jsonl`), and every joke
ever published (`jokes.jsonl`). Use it: call back to people's earlier crimes by
week, build on running gags, and NEVER repeat a joke or reuse a premise on the
same person. Repeated jokes are the main complaint about this paper.

## You are the editor-in-chief

This is a trolling paper and you run it. Be creative; the data is the floor,
not the ceiling. Before writing, gather material from all of these:

1. **The group chat** - storylines in the briefing (also in `gazette.json` as
   `storylines`). The commissioner adds them by hand; they are the freshest,
   most personal material you have. Lead with them when they are good.
2. **The weekend's real NFL news** - use web search for what happened in the
   NFL this past weekend: upsets, meltdowns, viral moments, coaching blunders,
   memes. Tie at least one bit to real news, ideally to a player someone in
   the league rosters. Verify anything you state as fact; only state what a
   source says.
3. **Previous issues** - every joke already published is in the briefing and
   `league-memory/jokes.jsonl`; past papers are in `gazettes/`. Never repeat a
   bit. Callbacks to earlier issues are encouraged; reruns are not.
4. **The waiver wire** - two runs, two stories. Cover both every week:
   - **The bidding war (the run that just processed)** - `freshContests`:
     for each contested player, who won, what they paid, who was the next
     highest bidder and by how much (`gap`). $1 margins, $100+ overpays, and
     one manager bidding on everything are the headlines. `freshMoney` has
     every winning claim.
   - **The verdict (last week's run, now played)** - `contests`, `topBids`
     and the awards: who paid what, what the player actually scored for them,
     and whether they even started him. Name the biggest winner (best points
     for the money - `awards.steal`) and the biggest loser (most money for the
     least - `awards.flop`, and `awards.benched`).
   Every bid carries `budgetLeft`; `faab.rosters` has each team's spent,
   remaining, this week's points and `rank` (of `of` teams still scoring).
   Big bids on fumes and panic buys after a bad week are material.
5. **The non-participants** - troll the managers who have not used their
   FAAB (`awards.hoarder`), hardest of all the ones whose team is mediocre
   or worse (`faab.rosters[].rank` in the bottom half). Sitting on $1,000
   with a so-so roster is a choice, and the Gazette has opinions about it.

## Step 1 - find Chrome

The sandbox already ships Playwright's Chromium:

    ls /opt/pw-browsers/*/chrome-linux/chrome

Export `CHROME` to that path. Only if nothing is there, install with
`npx --yes @puppeteer/browsers install chrome@stable`.

## Step 2 - collect the week and read the briefing

    OUT=$(mktemp -d)
    node scripts/roast/collect.mjs > $OUT/gazette.json
    node scripts/roast/memory.mjs brief $OUT/gazette.json

No arguments = the last COMPLETED NFL week. Note the week number N from the
JSON. Read the whole briefing: what the group chat is talking about (storylines -
work these in, they are the most current material you have), who is in this
week's news, their profile, their rap sheet, and every joke already used.

## Step 3 - write every joke into $OUT/copy.json

If `league-memory/issues/week-N.json` already exists, the commissioner has
approved a draft for this week: copy it to `$OUT/copy.json` and start from it.
Only change a line if `check` rejects it or this week's data contradicts it.

Format is in `league-memory/README.md`.

- `paper`: headline `{kicker, head, sub}`, jabs `{flop, benched, lowball, steal, hoarder}`
  for whichever awards exist, and `obituary` (one-line epitaph for the chopped
  team). These print on the sheet. Fill every slot that has an award - a
  missing slot falls back to a canned line that has already run.
- `jokes`: every OTHER joke you will put in the email, one entry each, with
  `target` (Sleeper user_id or null), a short `premise` label, the exact
  `text`, and a `section` (e.g. "The Estate Sale", "The Verdict", "The Great
  Debate"). The website's Gazette tab prints them in order under these
  section names, so keep each section's lines together. Lines in section
  "Obituary" go on the chopped team's memorial instead.
- `comic`: four panels for the website's comic strip, about this week's
  actual story - `[{"who": "a"|"b", "mood": "talk"|"yell"|"smug"|"react",
  "text": "..."}]` x4, alternating speakers, short enough for a speech bubble.

Jokes come from `gazette.json` - `awards`, `chopped`, `scores`, `totals` - plus
the memory. A callback to someone's earlier offence ("second benching in three
weeks") beats a generic line. Dry and deadpan beats try-hard. Punch at
decisions, never at people; these are the user's friends. Never touch anything
listed under OFF LIMITS.

Then run:

    node scripts/roast/memory.mjs check $OUT/gazette.json $OUT/copy.json

If it reports problems, rewrite those lines with a genuinely new angle (not a
reworded version) and run check again until it prints ok.

TWO FACTS YOU MUST NOT GET WRONG - the league owner has already corrected these once:

- A LOSING BID COSTS NOTHING. Only the winning claim is charged. Never write or
  imply that a runner-up 'spent' or 'blew' their money. Call it the next
  highest bid, unpaid.
- THE HIGHEST VALID BID ALWAYS WINS. If a FAILED claim shows a bigger number
  than the winner, that claim was invalid (usually no drop designated against a
  full roster) - it is NOT an upset and must never be framed as a lower bid
  beating a higher one. Ignore such rows.

## Step 4 - build the PDF with your copy

    OUT_DIR=$OUT GAZETTE_JSON=$OUT/gazette.json COPY=$OUT/copy.json ./scripts/roast/build.sh

It prints the PDF path as its last stdout line and writes
`gazette-print-N.html` alongside it.

## Step 5 - render a JPEG

An image is what actually works in email and chat. Screenshot the PRINT html,
then shrink it:

    "$CHROME" --headless=new --disable-gpu --no-sandbox --disable-background-networking \
      --virtual-time-budget=8000 --hide-scrollbars --window-size=1150,1040 \
      --screenshot=/tmp/gz.png --user-data-dir=$(mktemp -d) "file://$OUT/gazette-print-N.html"

Resize to about 760px wide as a JPEG (ImageMagick
`convert -resize 760x -quality 50`, or Python/PIL). Target roughly 60-90KB.
Check the height: if the paper is taller or shorter the screenshot will have
dead space or be cut off - adjust the height and re-shoot until the image
contains the whole sheet and nothing more.

    mkdir -p gazettes
    cp <pdf> gazettes/guillotine-gazette-week-N.pdf
    cp <jpg> gazettes/guillotine-gazette-week-N.jpg

## Step 6 - record the memory and publish, BEFORE emailing

So the image URL resolves when the email is opened:

    node scripts/roast/memory.mjs record $OUT/gazette.json $OUT/copy.json
    cp $OUT/copy.json league-memory/issues/week-N.json   # the website reads this
    git add gazettes league-memory && git commit -m "gazette: week N" && git push origin <current branch>

URLs (substitute the branch you pushed to):

    https://raw.githubusercontent.com/dave05/greenlite-fantasy-2026/<branch>/gazettes/guillotine-gazette-week-N.jpg
    https://github.com/dave05/greenlite-fantasy-2026/raw/<branch>/gazettes/guillotine-gazette-week-N.pdf

DO NOT attach either file to the email. Base64-ing a 70KB+ file into a tool
call is prohibitively expensive and a previous run burned its whole budget
discovering that. The inline `<img>` below does the same thing for free.

## Step 7 - write and send the email

Use ONLY the jokes in copy.json (paper lines plus the `jokes` list). If you
want a new line while writing, add it to copy.json, re-run check, and re-run
record before sending. Cover whichever exist: awards.overkill, awards.flop,
awards.benched, awards.lowball, awards.steal, awards.hoarder (managers still
sitting on their whole FAAB budget), any storylines, and chopped (who died, with what
score).

- to: dasam2012@gmail.com
- subject: "The Guillotine Gazette - Week N"
- body: your plain-text version
- htmlBody: the same content, leading with the paper itself:
  `<img src="<raw .jpg URL>" width="760" style="width:100%;max-width:760px">`
- no attachments

End with both URLs on their own lines so they can be forwarded straight into
the group chat - pasting the .jpg link into Slack or WhatsApp renders it inline.

Finally, use SendUserFile to drop the JPEG into the session too.

## When things go wrong

- BUILD FAILS: email dasam2012@gmail.com, subject "Guillotine Gazette - build
  failed", with the error and command output. Do not fail silently.
- SEASON OVER or no waiver activity: send it anyway and say it was a quiet week
  (still run check and record).
