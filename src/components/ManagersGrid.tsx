type Member = {
  userId: string;
  handle: string;
  team: string | null;
  avatar: string | null;
  isCommissioner?: boolean;
};

function initials(s: string): string {
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  member,
  accent,
  size = "h-9 w-9",
}: {
  member: Member;
  accent: string;
  size?: string;
}) {
  if (member.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://sleepercdn.com/avatars/thumbs/${member.avatar}`}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover ring-1 ring-white/10`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full text-xs font-bold`}
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
      {initials(member.team || member.handle)}
    </span>
  );
}

export default function ManagersGrid({
  members,
  accent,
  totalTeams,
  title = "The field",
}: {
  members: Member[];
  accent: string;
  totalTeams?: number;
  title?: string;
}) {
  return (
    <section>
      <h3 className="chalk font-display mb-3 text-2xl font-semibold uppercase">
        {title}
        <span className="ml-2 align-middle text-sm font-normal normal-case tracking-normal text-white/40">
          {members.length}
          {totalTeams ? ` / ${totalTeams}` : ""} managers
        </span>
      </h3>
      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/12 px-4 py-6 text-center text-sm text-white/45">
          No managers have joined yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
            >
              <Avatar member={m} accent={accent} />
              <div className="min-w-0">
                {/* Team name with the Sleeper handle in brackets, so a manager
                    is identifiable whether you know them by team or by @name. */}
                <p className="truncate text-sm font-semibold">
                  {m.team || m.handle}
                  {m.team && (
                    <span className="ml-1.5 font-normal text-white/40">
                      (@{m.handle})
                    </span>
                  )}
                </p>
                {m.isCommissioner && (
                  <p
                    className="truncate text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: accent }}
                  >
                    Commissioner
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
