// The framed "In Loving Memory" newspaper clipping for a chopped team - ornate
// double border, floral corners, a grayscale portrait, a mock-solemn obituary
// (that is, in fact, a roast), and condolences from the surviving league.
//
// Shared so the Guillotine graveyard and the Gazette's obituary section render
// the EXACT same clipping - one source of truth, no drift between the two pages.

// Deterministic choice - keeps the copy stable across renders (no Math.random,
// so no hydration mismatch).
const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(Math.floor(seed)) % arr.length];

// A full newspaper-obituary paragraph, in the mock-solemn "It is with great
// regret..." voice - but every line roasts the fantasy team, never the person.
const obituary = (name: string, points: number, week: number) => {
  const pts = points.toFixed(1);
  const seed = Math.round(points * 10) + name.length + week * 7;
  return pick(
    [
      `It is with great regret, and considerable laughter, that we announce the passing of ${name}, chopped in Week ${week} at a tragic ${pts} points. Initial findings show a fatal overdose of bad start/sit decisions. A memorial will be held in the group chat, where mourners are encouraged to pile on. In lieu of flowers, the family asks only that you please set your lineup. ${name} is survived by a bench that begged to play.`,
      `The league solemnly reports the death of ${name}, found face-down in the basement of the standings with just ${pts} points. Cause of death: acute roster mismanagement. While an investigation is ongoing, early reports suggest they simply forgot it was game day. Services will be brief; so was the season.`,
      `We mourn ${name}, ${pts} points, chopped in Week ${week} after a long and very public battle with the waiver wire. They leave behind $0 in FAAB well spent and a group chat full of receipts. Viewing will be held every time someone reopens the screenshots.`,
      `${name} was laid to rest in Week ${week}, having posted a heroic ${pts} points - roughly what a competent bench scores by accident. Preceded in death by their draft strategy and survived by everyone who benched their kicker on time. Donations may be sent to a fund for people who check the injury report.`,
      `With heavy hearts and light schedules, we announce that ${name} has been chopped in Week ${week} at ${pts} points. The deceased is remembered for the trades they never made and the free agents they never claimed. A candlelight vigil will be held the moment someone remembers their team name.`,
    ],
    seed,
  );
};

// Troll condolences "signed" by the surviving league - the messages-from-the-
// family section every real obituary notice carries, weaponized.
const CONDOLENCES: { msg: string; from: string }[] = [
  { msg: "Gone too soon, spent too much.", from: "The Waiver Wire" },
  { msg: "We lit a candle. It outscored your starters.", from: "The Group Chat" },
  { msg: "In lieu of flowers, we're keeping your FAAB.", from: "The Commissioner" },
  { msg: "You will be missed. Briefly.", from: "Everyone Still Alive" },
  { msg: "Thoughts and prayers - mostly thoughts about how that lineup happened.", from: "The League" },
  { msg: "He fought hard. Against himself, mostly.", from: "A Rival" },
  { msg: "Rest easy. The blade needs a weekend too.", from: "The Executioner" },
  { msg: "So brave. So bad. So gone.", from: "The Standings" },
  { msg: "Heaven gained a bench warmer.", from: "Section 7, Row Chop" },
];

const condolences = (name: string, points: number, week: number) => {
  const seed = Math.round(points * 10) + name.length + week * 3;
  const a = pick(CONDOLENCES, seed);
  const b = pick(CONDOLENCES, seed + 4);
  return a === b ? [a] : [a, b];
};

// A filigree divider - the little symmetric swirl a real obituary notice runs
// above and below the text.
export function Flourish() {
  return (
    <div className="flex items-center justify-center gap-3 text-[#463c2d]/70">
      <span className="h-px flex-1 bg-[#463c2d]/35" />
      <svg width="72" height="14" viewBox="0 0 72 14" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
        <path d="M2 7c11-8 19 8 34 0M36 7c15 8 23-8 34 0" />
        <circle cx="36" cy="7" r="1.6" fill="currentColor" stroke="none" />
      </svg>
      <span className="h-px flex-1 bg-[#463c2d]/35" />
    </div>
  );
}

export default function ObituaryNotice({
  name,
  points,
  week,
  avatar,
}: {
  name: string;
  points: number;
  week: number;
  avatar: string | null;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <article className="relative mx-auto w-full max-w-xl bg-[#efe7d3] px-7 py-6 text-[#221d15] shadow-[0_18px_42px_rgba(0,0,0,0.6)]">
      {/* double ink frame */}
      <span aria-hidden className="pointer-events-none absolute inset-0 border-2 border-[#221d15]" />
      <span aria-hidden className="pointer-events-none absolute inset-[6px] border border-[#221d15]/55" />
      {/* floral corners */}
      <span aria-hidden className="absolute left-2 top-1 text-lg leading-none text-[#221d15]/75">❦</span>
      <span aria-hidden className="absolute right-2 top-1 -scale-x-100 text-lg leading-none text-[#221d15]/75">❦</span>
      <span aria-hidden className="absolute bottom-1 left-2 -scale-y-100 text-lg leading-none text-[#221d15]/75">❦</span>
      <span aria-hidden className="absolute bottom-1 right-2 -scale-100 text-lg leading-none text-[#221d15]/75">❦</span>

      <div className="relative">
        <Flourish />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-5">
          {/* portrait - the owner's real Sleeper avatar in mournful grayscale,
              a monogram if they never set one */}
          <div className="shrink-0 text-center">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={name}
                className="mx-auto h-24 w-24 rounded-full border border-[#221d15]/50 object-cover grayscale"
              />
            ) : (
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#221d15]/50 grayscale"
                style={{ background: "radial-gradient(120% 120% at 30% 25%, #cfc6b0 0%, #a99f86 55%, #6f6650 100%)" }}
              >
                <span className="font-serif text-5xl font-semibold text-[#efe7d3]/90">{initial}</span>
              </div>
            )}
            <p className="mt-2 font-serif text-sm italic">{name}</p>
          </div>
          {/* text */}
          <div className="min-w-0">
            <h3 className="font-serif text-2xl font-semibold leading-none sm:text-[1.7rem]">
              In Loving Memory
            </h3>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c1c13]">
              🪓 Chopped · Week {week} · {points.toFixed(1)} pts
            </p>
            <p className="mt-2 font-serif text-[13px] leading-snug text-[#221d15]/90">
              {obituary(name, points, week)}
            </p>
            {/* messages from the surviving league - the condolences column */}
            <div className="mt-3 border-t border-[#221d15]/25 pt-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#221d15]/55">
                Condolences from the surviving members
              </p>
              <ul className="mt-1 space-y-1">
                {condolences(name, points, week).map((c, i) => (
                  <li key={i} className="font-serif text-[12px] italic leading-snug text-[#221d15]/85">
                    &ldquo;{c.msg}&rdquo;{" "}
                    <span className="not-italic text-[#221d15]/55">- {c.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Flourish />
        </div>
      </div>
    </article>
  );
}
