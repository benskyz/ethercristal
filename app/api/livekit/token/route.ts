import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// Token endpoint sécurisé.
// Donne publish uniquement si role=participant.
// Spectator = subscribe-only (pas de publish cam/mic).

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomId = String(body?.roomId || "");
    const identity = String(body?.identity || "");
    const name = String(body?.name || "Membre");
    const role = (body?.role === "participant" ? "participant" : "spectator") as "participant" | "spectator";

    if (!roomId || !identity) {
      return NextResponse.json({ error: "missing roomId/identity" }, { status: 400 });
    }

    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "LiveKit env missing" }, { status: 500 });
    }

    // Permissions
    const canPublish = role === "participant";

    const at = new AccessToken(apiKey, apiSecret, {
      identity, // user.id
      name,     // affichage
      ttl: 60 * 60, // 1h
    });

    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: canPublish, // data messages seulement participants (tu peux le mettre true si tu veux)
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url,
      role,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "token error" }, { status: 500 });
  }
}
