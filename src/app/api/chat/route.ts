import { NextResponse } from "next/server";
import { getMessages, postMessage, MAX_MESSAGE_LEN } from "@/lib/db";

export const dynamic = "force-dynamic";

const POST_ERRORS: Record<string, string> = {
  unknown_name: "That name isn't on the 28-manager roster.",
  empty: "Say something.",
  too_long: `Keep it under ${MAX_MESSAGE_LEN} characters.`,
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const after = Number(searchParams.get("after") ?? 0);
  try {
    const messages = await getMessages(Number.isFinite(after) ? after : 0);
    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/chat GET]", err);
    return NextResponse.json({ error: "Failed to load the channel." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let name: unknown;
  let body: unknown;
  try {
    const parsed = await req.json();
    name = parsed?.name;
    body = parsed?.body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof name !== "string" || typeof body !== "string") {
    return NextResponse.json({ error: "Name and message are required." }, { status: 400 });
  }

  try {
    const result = await postMessage(name.trim(), body);
    if (result.ok) {
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { ...result, error: POST_ERRORS[result.reason] ?? "Could not post." },
      { status: result.reason === "unknown_name" ? 404 : 400 },
    );
  } catch (err) {
    console.error("[api/chat POST]", err);
    return NextResponse.json({ error: "Something broke while posting." }, { status: 500 });
  }
}
