# GreenLite Gridiron - League Intel (repo memory)

The durable, in-repo brain for the Gazette / "Vinny Chops" weekly routine. Everything the commissioner (Dawit) tells me about the league gets logged HERE, in the repo, so it survives across sessions and is version-controlled. The routine reads this at the start of every run and appends new intel at the end.

Two files work together:
- **This file** = raw running log of intel (chat topics, weekly events, fandoms, tendencies). Human-readable source of truth.
- **`src/lib/leagueProfiles.ts`** = the distilled, render-facing jabs the live site actually shows. Keep it in sync with the confirmed facts here.

House rules: good-natured ribbing about SPORTS FANDOM and FANTASY DECISIONS only. Never anything genuinely personal/sensitive. Punch at allegiances and roster crimes, not real lives. No em dashes in copy.

---

## Members (team [handle] = person - fandom - hooks)
- **JSN - Just Survive Now** [dawit21] = **Dawit** (commissioner / THE USER). $182 on Michael Wilson over a $2 next bid (Wk2 marquee). Benched a Titans pickup (name TBC) into a 0. Roast him too.
- **elifelber** [elifelber] = **Eli** - **Giants** fan, from NY. Rostered Jaxson Dart; Dart tore MCL/PCL/meniscus on the Giants' opening drive (Mon vs Rams), OUT FOR SEASON. elifelber chopped Wk2 (65.7). Fantasy QB and franchise QB, same snap.
- **KRogo5** [KRogo5] = **Kevin ("Rogo")** - **Vikings** fan. Vikings 3-0 in real life; fantasy roster is an injury ward. Chopped Wk3 in the final minutes of SNF when WR Jaylen Waddle underproduced; his chop SAVED Jack.
- **Sdobens4** [Sdobens4] = **Sam** - **Patriots** fan. Team scores well (contender). Running league troll: **Drake Maye = "the Schedule"** (great last year on an easy schedule, chucking picks now). Drake Maye vs Bo Nix was a big chat debate.
- **BDALOHA** [BDALOHA] = **Ben ("Bain")** - **Saints** fan. Paid ~$299 for Tony Pollard and benched him. Chronic pay-then-bench.
- **Always Safe** [Always Safe] = **Jalijah**. Starts injured players (started Puka Nacua while OUT) and still wins - roster too strong to punish. Name is a threat.
- **PumpUpTheJam32** [PumpUpTheJam32] = **Peter** - **Eagles** fan.
- **kylereckert** [kylereckert] = **Kyle** - **Vikings** fan.
- **matthewmongelli** [matthewmongelli] = **Matt** - **Giants** fan (tentative, confirm).
- **jackmccarthy25** [jackmccarthy25] = **Jack** (fandom TBC). Survived Wk3 only because Rogo got chopped instead - "bailed out, didn't earn it."

## Still to confirm
Fandoms for: maruniak, riguy101, kaelanzm, sergioflores98, Vladimir Tuten. Confirm Matt & Jack fandoms. Name of Dawit's benched $0 Titans player.

## Chat lore / running trolls (league banter - verify before stating as fact on the public site)
- **Drake Maye = "the Schedule"** - aimed at Sam (Patriots). Season-long troll.
- **JJ McCarthy to the Giants** - a chat topic/rumor (Giants lost Dart for the year, so the room joked about the Vikings' JJ McCarthy landing there). Cross-fandom fuel: Vikings fans (Rogo, Kyle) losing their QB + Giants fans (Eli, Matt) getting him. Treat as banter unless verified as real news.

## Recent chops (obituary timeline)
- Wk1: jayabg
- Wk2: elifelber (Eli / Jaxson Dart season-ending knee)
- Wk3: KRogo5 (Kevin/Rogo / Waddle flopped on SNF, saved Jack)

## Spending patterns (season FAAB, budget $1000) - updated as waivers run
Track who stays cheap vs who torches the budget; use in the receipts roast. Snapshot after Week 3 waivers:
- **Reckless spenders:** Vladimir Tuten $721 used (72% gone, not even leading), BDALOHA/Ben $698 (the pay-then-bench king), Sdobens4/Sam $485.
- **Mid:** JSN/Dawit $335, kaelanzm $260.
- **Cheapskates (alive on pocket change):** kylereckert/Kyle $101, maruniak $105, PumpUpTheJam32/Peter $137, riguy101 $175, Always Safe/Jalijah $175.
- **$0 spent, still breathing:** matthewmongelli/Matt, sergioflores98, jackmccarthy25/Jack (survives on $0 and other people's misery).
- **JSN/Dawit buy-then-drop:** paid ~$50 for a Titans player, then DROPPED him the next week. Classic panic-cut. Add to the buy-high-drop-low pattern.
- Routine: each week, diff FAAB-used vs the prior snapshot to call out who KEEPS being cheap and who KEEPS overspending, and refresh this list.

## Week 3 edition notes (scored, posted ~Week 4 Wed)
- **Chopped Wk3:** KRogo5 (Kevin/Rogo, 50.98) - Waddle flopped on SNF; saved Jack (52.54, 2nd lowest).
- **Top:** Vladimir Tuten 163.9 (and already down $721 FAAB). **Bottom:** KRogo5.
- **A.J. Brown fairness note:** AJB was traded to the PATRIOTS, then landed on IR (high-ankle sprain, ~6 wks). maruniak paid ~$52 and has him BENCHED. That is a SMART injured-stud stash, NOT a flop - do not roast it. (Also ties AJB to Sam, the Patriots fan.) Rule now enforced in code: the "flop" award only counts STARTED players.
- **Ben/BDALOHA:** paid $299 for Tony Pollard and benched him (Pollard scored 13.6) - pay-then-bench again.
- **Jack/jackmccarthy25:** benched Sam Darnold's 29.66 and still nearly got chopped; survives on $0 FAAB and Rogo's misery.
- **Week 4 TNF:** Steelers @ Browns (both 2-1), 41-year-old Aaron Rodgers QBing Pittsburgh. Kickoff bulletin fodder.

## Marquee rule + history (avoid stale/repeat headlines)
- The marquee MUST come from the freshest waiver run (the one that just cleared this morning = thisRun/freshContests in code), NEVER a prior week's run. A bid already printed last week is dead news.
- Used marquees so far: Wk1 James Cook $503 (Vlad), Wk2 Michael Wilson $182 (JSN), Wk3 (this morning's run) Omarion Hampton $135 (PumpUpTheJam32/Peter). Do not re-headline any of these.

## Routine reminders
- Post the Gazette **Wednesday 8am** (waivers clear Wed 3am).
- ALWAYS web-research: current NFL news for each rostered player, r/fantasyfootball trends, the TNF storyline. Only real, verifiable facts.
- Best burns = real news + a member's fandom + their actual roster move.
- After each run, append new intel here and sync confirmed jabs into `src/lib/leagueProfiles.ts`.
