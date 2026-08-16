import { NextResponse } from "next/server";
import { claim } from "@/lib/db";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  unknown_name: "That name isn't on the 28-manager roster.",
  already_claimed: "That manager has already spun in. Ask the commissioner if that's a mistake.",
  full: "Both leagues are full — all 28 spots are claimed.",
};

export async function POST(req: Request) {
  let name: unknown;
  try {
    const body = await req.json();
    name = body?.name;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  try {
    const result = await claim(name.trim());
    if (result.ok) {
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { ...result, error: MESSAGES[result.reason] ?? "Could not assign a league." },
      { status: result.reason === "unknown_name" ? 404 : 409 },
    );
  } catch (err) {
    console.error("[api/claim]", err);
    return NextResponse.json({ error: "Something broke while spinning." }, { status: 500 });
  }
}
