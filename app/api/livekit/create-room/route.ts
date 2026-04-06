import { NextRequest, NextResponse } from "next/server";
import { ensureRoomExists } from "@/lib/livekit-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room = body?.room;

    if (!room) {
      return NextResponse.json({ error: "room missing" }, { status: 400 });
    }

    await ensureRoomExists(room);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
