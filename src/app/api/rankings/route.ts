import { NextResponse } from "next/server";
import { getConsensusRankings } from "@/lib/fantasypros";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["ALL", "QB", "RB", "WR", "TE", "K", "DST"]);

// GET /api/rankings?position=ALL&year=2026
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const posParam = (searchParams.get("position") ?? "ALL").toUpperCase();
    const position = ALLOWED.has(posParam) ? posParam : "ALL";
    const year = searchParams.get("year") ?? "2026";

    const rankings = await getConsensusRankings(position, year);
    if (!rankings) {
      return NextResponse.json({ available: false });
    }
    return NextResponse.json(
      { available: true, ...rankings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/rankings]", err);
    return NextResponse.json({ error: "Failed to load rankings." }, { status: 500 });
  }
}
