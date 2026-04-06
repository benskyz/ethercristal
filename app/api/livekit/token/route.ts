import { NextRequest, NextResponse } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { ensureRoomExists } from "@/lib/livekit-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room = body?.room;
    const identity = body?.identity || `guest-${Math.random().toString(36).slice(2, 8)}`;

    if (!room) {
      return NextResponse.json({ error: "room missing" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      process.env.LIVEKIT_URL!;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit config missing" },
        { status: 500 }
      );
    }

    // 🔥 ensure room exists automatically
    await ensureRoomExists(room);

    const at = new AccessToken(apiKey, apiSecret, { identity });

    const grant = new VideoGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    at.addGrant(grant);

    const token = at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
    });
  } catch (e: any) {
    console.error("LiveKit token error:", e);
    return NextResponse.json(
      { error: e?.message || "Token generation failed" },
      { status: 500 }
    );
  }
}
