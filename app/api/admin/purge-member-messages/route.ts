import { NextResponse } from "next/server";
import { requireAdminFromRequest, supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminFromRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "userId manquant." }, { status: 400 });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, pseudo")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }

    const { data: deletedPrivateMessages, error: privateError } = await supabaseAdmin
      .from("messages")
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .select("id");

    if (privateError) {
      return NextResponse.json({ error: privateError.message }, { status: 500 });
    }

    const { data: deletedRoomMessages, error: roomError } = await supabaseAdmin
      .from("room_messages")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      userId,
      pseudo: targetProfile.pseudo || "Membre",
      deletedPrivateMessages: deletedPrivateMessages?.length ?? 0,
      deletedRoomMessages: deletedRoomMessages?.length ?? 0,
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
