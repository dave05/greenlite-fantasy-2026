import { NextResponse } from "next/server";
import { getSleeperRankings, getWeeklyRankings } from "@/lib/sleeperRankings";
import { getNflState } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["ALL", "QB", "RB", "WR", "TE", "K", "DST"]);

// GET /api/rankings?position=ALL&mode=draft|weekly&year=2026
// One source for everything - Sleeper.
//   draft  -> season-long value (ALL = overall big board, else position board)
//   weekly -> ranked by this week's projected points (start/sit)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const posParam = (searchParams.get("position") ?? "ALL").toUpperCase();
    const position = ALLOWED.has(posParam) ? posParam : "ALL";
    const mode = searchParams.get("mode") === "weekly" ? "weekly" : "draft";
    const year = searchParams.get("year") ?? "2026";

    if (mode === "weekly") {
      const state = await getNflState();
      const week = Math.max(1, state?.week ?? 1);
      const players = await getWeeklyRankings(position, week, 100, year);
      if (!players) return NextResponse.json({ available: false });
      return NextResponse.json(
        {
          available: true,
          source: "sleeper",
          mode: "weekly",
          week,
          type: `Week ${week} projections`,
          year,
          players,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const players = await getSleeperRankings(position, 100, year);
    if (!players) return NextResponse.json({ available: false });

    return NextResponse.json(
      {
        available: true,
        source: "sleeper",
        mode: "draft",
        type: position === "ALL" ? "Overall PPR" : `${position} · PPR`,
        year,
        players,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/rankings]", err);
    return NextResponse.json({ error: "Failed to load rankings." }, { status: 500 });
  }
}
