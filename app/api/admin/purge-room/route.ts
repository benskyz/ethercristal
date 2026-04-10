import { NextResponse } from "next/server";
import { requireAdminFromRequest, supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminFromRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const roomId = String(body?.roomId || "").trim();

    if (!roomId) {
      return NextResponse.json({ error: "roomId manquant." }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, name")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Room introuvable." }, { status: 404 });
    }

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("room_messages")
      .delete()
      .eq("room_id", roomId)
      .select("id");

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      roomId,
      roomName: room.name,
      deletedCount: deletedRows?.length ?? 0,
      byAdminId: auth.user.id,
      byAdminPseudo: auth.adminProfile.pseudo || "Admin",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inconnue." },
      { status: 500 }
    );
  }
}
