import { NextResponse } from "next/server";
import { getState, usingDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(
      { ...state, persistent: usingDatabase },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/state]", err);
    return NextResponse.json(
      { error: "Failed to load league state." },
      { status: 500 },
    );
  }
}
