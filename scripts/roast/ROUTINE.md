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
JSON. Read the whole briefing: who is in this week's news, their profile, their
rap sheet, and every joke already used.

## Step 3 - write every joke into $OUT/copy.json

Format is in `league-memory/README.md`.

- `paper`: headline `{kicker, head, sub}`, jabs `{flop, benched, lowball, steal}`
  for whichever awards exist, and `obituary` (one-line epitaph for the chopped
  team). These print on the sheet. Fill every slot that has an award - a
  missing slot falls back to a canned line that has already run.
- `jokes`: every OTHER joke you will put in the email, one entry each, with
  `target` (Sleeper user_id or null), a short `premise` label, and the exact
  `text`.

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
awards.benched, awards.lowball, awards.steal, and chopped (who died, with what
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
