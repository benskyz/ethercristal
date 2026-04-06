import { NextRequest, NextResponse } from "next/server";
import {
  getDesirAdminSupabase,
  blockedEitherWay,
  getActiveDesirSession,
} from "@/lib/desir/server";
import { createClient } from "@supabase/supabase-js";

function userClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  const authHeader = req.headers.get("authorization") || "";

  console.log("[JOIN] auth header present:", !!authHeader);
  console.log(
    "[JOIN] auth header preview:",
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

    console.log("[JOIN] authError:", authError?.message || null);
    console.log("[JOIN] auth user id:", auth?.user?.id || null);

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const currentUserId = auth.user.id;

    const activeSession = await getActiveDesirSession(currentUserId);
    if (activeSession) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        session: activeSession,
        sessionId: activeSession.id ?? null,
        roomName:
          activeSession.room_name ??
          activeSession.roomName ??
          activeSession.room ??
          `desir-${activeSession.id}`,
      });
    }

    const body = await req.json().catch(() => ({}));
    const filter = String(body?.filter || "random");
    const preference = String(body?.preference || "soft");

    const { data: existingQueue, error: existingQueueError } = await adminSupabase
      .from("desir_match_requests")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingQueueError) {
      return NextResponse.json(
        { error: existingQueueError.message || "Impossible de lire la file." },
        { status: 500 }
      );
    }

    if (existingQueue) {
      return NextResponse.json({
        ok: true,
        queued: true,
        request: existingQueue,
      });
    }

    const { data: otherQueued, error: queueError } = await adminSupabase
      .from("desir_match_requests")
      .select("*")
      .eq("status", "queued")
      .neq("user_id", currentUserId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (queueError) {
      return NextResponse.json(
        { error: queueError.message || "Impossible de lire la file." },
        { status: 500 }
      );
    }

    let chosenRequest: any = null;

    for (const row of otherQueued || []) {
      const isBlocked = await blockedEitherWay(currentUserId, row.user_id);
      if (!isBlocked) {
        chosenRequest = row;
        break;
      }
    }

    if (chosenRequest) {
      const roomName = `desir-${chosenRequest.user_id}-${currentUserId}-${Date.now()}`;

      const insertPayload: Record<string, any> = {
        user_a: chosenRequest.user_id,
        user_b: currentUserId,
        status: "active",
        started_at: new Date().toISOString(),
      };

      // enlève cette ligne si ta table n'a pas room_name
      insertPayload.room_name = roomName;

      const { data: createdSession, error: sessionError } = await adminSupabase
        .from("desir_sessions")
        .insert(insertPayload)
        .select("*")
        .single();

      if (sessionError || !createdSession) {
        return NextResponse.json(
          { error: sessionError?.message || "Impossible de créer la session." },
          { status: 500 }
        );
      }

      await adminSupabase
        .from("desir_match_requests")
        .update({
          status: "matched",
          matched_with: currentUserId,
          matched_at: new Date().toISOString(),
        })
        .eq("id", chosenRequest.id);

      return NextResponse.json({
        ok: true,
        matched: true,
        session: createdSession,
        sessionId: createdSession.id ?? null,
        roomName:
          createdSession.room_name ??
          createdSession.roomName ??
          createdSession.room ??
          roomName,
      });
    }

    const { data: queuedRequest, error: insertError } = await adminSupabase
      .from("desir_match_requests")
      .insert({
        user_id: currentUserId,
        filter,
        preference,
        ether_spent: 0,
        status: "queued",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Impossible d’entrer dans la file." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      request: queuedRequest,
    });
  } catch (e: any) {
    console.error("[JOIN] fatal error:", e);
    return NextResponse.json(
      { error: e?.message || "Erreur join désir" },
      { status: 500 }
    );
  }
}
