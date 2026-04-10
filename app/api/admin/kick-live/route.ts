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

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("room_presence")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      userId,
      pseudo: targetProfile.pseudo || "Membre",
      removedPresenceCount: deletedRows?.length ?? 0,
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
