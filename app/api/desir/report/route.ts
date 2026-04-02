import { NextRequest, NextResponse } from "next/server";
import { getDesirAdminSupabase } from "@/lib/desir/server";
import { createClient } from "@supabase/supabase-js";

function userClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("authorization") || "",
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

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const sessionId = String(body?.sessionId || "");
    const reportedId = String(body?.reportedId || "");
    const reason = String(body?.reason || "");
    const details = String(body?.details || "");

    if (!sessionId || !reportedId) {
      return NextResponse.json(
        { error: "sessionId ou reportedId manquant" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await adminSupabase
      .from("desir_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    if (session.user_a !== auth.user.id && session.user_b !== auth.user.id) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const { error: reportError } = await adminSupabase
      .from("desir_reports")
      .insert({
        reporter_id: auth.user.id,
        reported_id: reportedId,
        session_id: sessionId,
        reason: reason || null,
        details: details || null,
      });

    if (reportError) {
      return NextResponse.json(
        { error: reportError.message || "Impossible de créer le signalement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur report désir" },
      { status: 500 }
    );
  }
}
