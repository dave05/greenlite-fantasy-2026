"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LEAGUES, LeagueId, MANAGERS, MAX_MESSAGE_LEN } from "@/lib/roster";
import type { Me } from "./AppShell";

type Message = {
  id: number;
  name: string;
  league: LeagueId | null;
  body: string;
  createdAt: string;
};

const POLL_MS = 3500;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatChannel({
  me,
  onIdentify,
  onGoToBoard,
}: {
  me: Me | null;
  onIdentify: (name: string, league: LeagueId | null) => void;
  onGoToBoard: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickName, setPickName] = useState("");
  const lastIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch(`/api/chat?after=${lastIdRef.current}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      if (data.messages?.length) {
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        setMessages((prev) => {
          // First load replaces; later loads append only-new.
          const merged = prev.length ? [...prev, ...data.messages] : data.messages;
          return merged.slice(-300);
        });
      }
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  // Auto-scroll to newest unless the reader has scrolled up.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  async function send() {
    const body = draft.trim();
    if (!body || !me || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: me.name, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not post.");
      } else {
        setDraft("");
        atBottomRef.current = true;
        // Optimistically append; poll will reconcile ids.
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
          return [...prev, data.message];
        });
      }
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setSending(false);
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const remaining = MAX_MESSAGE_LEN - draft.length;
  const sortedNames = useMemo(() => [...MANAGERS].sort((a, b) => a.localeCompare(b)), []);

  return (
    <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
      {/* Channel header */}
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="text-lg">#</span>fantasy-football-2026
        </h2>
        <p className="mt-0.5 text-xs text-white/40">
          Talk all the trash you want — aim at the lineup, not the person. No
          scores in the first 24 hours. Eliminated? Stay and heckle.
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/30">
            Nobody&apos;s said anything yet. Someone has to throw the first punch.
          </p>
        )}
        {messages.map((m) => {
          const lg = m.league ? LEAGUES[m.league] : null;
          const mine = me?.name === m.name;
          return (
            <div key={m.id} className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: lg ? `${lg.accent}33` : "#ffffff14",
                  color: lg?.accent ?? "#e7ecf3",
                }}
              >
                {initials(m.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">
                    {lg ? `${lg.emoji} ` : ""}
                    {m.name}
                    {mine && <span className="ml-1 text-[10px] text-white/40">(you)</span>}
                  </span>
                  <span className="text-[11px] text-white/30">{timeLabel(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-white/80">
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer / identity gate */}
      <div className="border-t border-white/10 p-3">
        {me ? (
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LEN))}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={`Message as ${me.name}…`}
                className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-white/15 bg-[#0d1220] px-4 py-2.5 text-sm outline-none focus:border-white/40"
              />
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0a0e17] transition hover:bg-white/90 disabled:opacity-40"
              >
                {sending ? "…" : "Send"}
              </button>
              <span
                className={`text-[10px] ${remaining < 40 ? "text-amber-400" : "text-white/25"}`}
              >
                {remaining}
              </span>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-sm text-white/60">Pick your name to join the channel.</p>
            <div className="flex gap-2">
              <select
                value={pickName}
                onChange={(e) => setPickName(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#0d1220] px-3 py-2 text-sm outline-none focus:border-white/40"
              >
                <option value="">— your name —</option>
                {sortedNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                onClick={() => pickName && onIdentify(pickName, null)}
                disabled={!pickName}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#0a0e17] disabled:opacity-40"
              >
                Enter
              </button>
            </div>
            <button
              onClick={onGoToBoard}
              className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
            >
              or spin into a league first →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
