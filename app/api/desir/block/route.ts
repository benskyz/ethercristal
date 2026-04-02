import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getUserClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Variables Supabase publiques manquantes");
  }

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
    },
    auth: { persistSession: false },
  });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Variables Supabase admin manquantes");
  }

  return createClient(url, service, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getUserClient(req);
    const adminSupabase = getAdminClient();

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const blockedId = String(body.blockedId || "");

    if (!blockedId) {
      return NextResponse.json({ error: "blockedId manquant" }, { status: 400 });
    }

    const { error } = await adminSupabase.from("desir_blocks").upsert({
      blocker_id: auth.user.id,
      blocked_id: blockedId,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Blocage impossible" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur block désir" },
      { status: 500 }
    );
  }
}
