# League memory

What the Guillotine Gazette remembers between weeks, so it can call back to
old crimes and never tell the same joke twice. Read and written by
`scripts/roast/memory.mjs`.

| File | Who writes it | What it holds |
| --- | --- | --- |
| `members.json` | **you**, by hand (plus `record` for `teams`/`status`) | one profile per manager, keyed by Sleeper `user_id` |
| `rap-sheet.jsonl` | `record` only | every award and chop, straight from Sleeper data |
| `jokes.jsonl` | `record` only | every joke published, paper and email |
| `storylines.json` | **you**, by hand | what the group chat is talking about this week |
| `issues/week-N.json` | the routine (or you, as a draft) | each week's finished copy; the website's Gazette tab shows it |

## Filling in profiles

`members.json` starts with every manager and blank personal fields. Fill in
whatever makes a better roast - all optional:

```jsonc
"<sleeper user_id>": {   // example only
  "display_name": "example_handle",   // kept in sync from Sleeper
  "real_name": "Sam",                 // what the group calls them
  "nicknames": ["Bench Daddy"],
  "teams": ["Example FC"],            // every team name seen; kept in sync
  "nfl_team": "Raiders",              // fandom is fair game
  "tendencies": ["panic-buys RBs after one good game", "never sets a lineup before Sunday"],
  "running_gags": ["still thinks Pollard is a RB1"],
  "off_limits": ["their job", "their ex"],// never joked about, in ANY joke - enforced by `check`
  "notes": "",
  "status": "alive"                   // set to "chopped week N" automatically
}
```

Keep it about football decisions. `off_limits` is the safety valve: anything
listed there fails `memory.mjs check`, whoever the joke is about.

## Storylines

Add whatever the group chat is on about before Wednesday's run. `brief` shows
every entry whose `from_week`..`until_week` covers the week being written
(leave `until_week` out for one that runs all season):

```json
{ "from_week": 4, "until_week": 4, "topic": "what happened", "angle": "how to play it", "notes": "anything else" }
```

The week is the one the paper covers: Wednesday's run writes up the week whose
games just finished.

## The weekly flow

```sh
OUT=$(mktemp -d)
node scripts/roast/collect.mjs > $OUT/gazette.json
node scripts/roast/memory.mjs brief  $OUT/gazette.json            # who, history, jokes used
# ... write $OUT/copy.json ...
node scripts/roast/memory.mjs check  $OUT/gazette.json $OUT/copy.json   # repeat until ok
OUT_DIR=$OUT GAZETTE_JSON=$OUT/gazette.json COPY=$OUT/copy.json ./scripts/roast/build.sh
# ... send the email ...
node scripts/roast/memory.mjs record $OUT/gazette.json $OUT/copy.json
git add league-memory gazettes && git commit -m "gazette: week N"
```

## copy.json

```json
{
  "week": 4,
  "paper": {
    "headline": { "kicker": "REPEAT OFFENDER", "head": "BENCHED AGAIN", "sub": "...", "target": "<user_id>" },
    "jabs": { "flop": "...", "benched": "...", "lowball": "...", "steal": "...", "hoarder": "..." },
    "obituary": "..."
  },
  "jokes": [
    { "section": "The Estate Sale", "target": "<user_id or null>", "premise": "short label for the bit", "text": "the line as it appears in the email" }
  ],
  "comic": [
    { "who": "a", "mood": "talk", "text": "panel 1" },
    { "who": "b", "mood": "react", "text": "panel 2" },
    { "who": "a", "mood": "yell", "text": "panel 3" },
    { "who": "b", "mood": "smug", "text": "panel 4" }
  ]
}
```

- `paper` fills the joke slots on the printed sheet. Any slot left out falls
  back to the canned line in `scripts/roast/copy.mjs`, and `check` will reject
  that line if it has been printed before.
- `jokes` is every other joke in the email: one entry per bit, with a short
  `premise` so the same angle is not used on the same person again.

`check` fails when a line shares half its words with anything in
`jokes.jsonl`, when a premise is reused on the same person, or when a line
mentions an `off_limits` topic. `record` is safe to re-run for the same week.
