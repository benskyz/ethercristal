import { NextRequest, NextResponse } from "next/server";
import { ensureRoomExists } from "@/lib/livekit-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = String(body?.room || "").trim();

    if (!room) {
      return NextResponse.json({ error: "room missing" }, { status: 400 });
    }

    await ensureRoomExists(room);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("create-room error:", e);
    return NextResponse.json(
      { error: e?.message || "create-room failed" },
      { status: 500 }
    );
  }
}
