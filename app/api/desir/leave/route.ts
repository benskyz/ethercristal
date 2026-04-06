import { NextRequest, NextResponse } from "next/server";
import { removeFromQueue, getActiveDesirSession, getDesirAdminSupabase } from "@/lib/desir/server";
import { createClient } from "@supabase/supabase-js";

function userClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  const authHeader = req.headers.get("authorization") || "";

  console.log("[LEAVE] auth header present:", !!authHeader);
  console.log(
    "[LEAVE] auth header preview:",
    authHeader ? authHeader.slice(0, 30) + "..." : "NONE"
  );

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = userClient(req);
    const adminSupabase = getDesirAdminSupabase();

    const { data: auth, error: authError } = await supabase.auth.getUser();

    console.log("[LEAVE] authError:", authError?.message || null);
    console.log("[LEAVE] auth user id:", auth?.user?.id || null);

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const currentUserId = auth.user.id;

    // 1) enlève de la file si présent
    await removeFromQueue(currentUserId);

    // 2) si une session active existe, on la termine
    const activeSession = await getActiveDesirSession(currentUserId);

    if (activeSession?.id) {
      const sessionId = activeSession.id;

      const updatePayload: Record<string, any> = {
        status: "ended",
        ended_at: new Date().toISOString(),
      };

      const { error: sessionUpdateError } = await adminSupabase
        .from("desir_sessions")
        .update(updatePayload)
        .eq("id", sessionId);

      if (sessionUpdateError) {
        console.error("[LEAVE] session update error:", sessionUpdateError.message);
        return NextResponse.json(
          { error: sessionUpdateError.message || "Impossible de terminer la session." },
          { status: 500 }
        );
      }

      // best effort: annule aussi d’éventuelles demandes queued/matched pour ce user
      await adminSupabase
        .from("desir_match_requests")
        .update({ status: "cancelled" })
        .eq("user_id", currentUserId)
        .in("status", ["queued", "matched"]);
    }

    return NextResponse.json({
      ok: true,
      left: true,
      endedSession: Boolean(activeSession?.id),
    });
  } catch (e: any) {
    console.error("[LEAVE] fatal error:", e);
    return NextResponse.json(
      { error: e?.message || "Erreur leave désir" },
      { status: 500 }
    );
  }
}
