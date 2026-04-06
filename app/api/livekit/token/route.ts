import { NextRequest, NextResponse } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { ensureRoomExists } from "@/lib/livekit-admin";

function getApiKey() {
  const v = process.env.LIVEKIT_API_KEY || "";
  if (!v) throw new Error("LIVEKIT_API_KEY manquant");
  return v;
}

function getApiSecret() {
  const v = process.env.LIVEKIT_API_SECRET || "";
  if (!v) throw new Error("LIVEKIT_API_SECRET manquant");
  return v;
}

function getLivekitUrl() {
  const v =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL ||
    "";
  if (!v) throw new Error("LIVEKIT_URL / NEXT_PUBLIC_LIVEKIT_URL manquant");
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = String(body?.room || "").trim();
    const identity = String(body?.identity || "").trim();

    if (!room || !identity) {
      return NextResponse.json(
        { error: "missing roomId/identity" },
        { status: 400 }
      );
    }

    await ensureRoomExists(room);

    const at = new AccessToken(getApiKey(), getApiSecret(), {
      identity,
    });

    const grant = new VideoGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    at.addGrant(grant);

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: getLivekitUrl(),
    });
  } catch (e: any) {
    console.error("livekit token error:", e);
    return NextResponse.json(
      { error: e?.message || "Token generation failed" },
      { status: 500 }
    );
  }
}
