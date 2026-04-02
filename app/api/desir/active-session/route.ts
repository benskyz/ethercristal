import { NextRequest, NextResponse } from "next/server";
import { getActiveDesirSession } from "@/lib/desir/server";
import { createClient } from "@supabase/supabase-js";

function userClient(req: NextRequest) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get("authorization") || "",
        },
      },
      auth: { persistSession: false },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = userClient(req);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const session = await getActiveDesirSession(auth.user.id);

    return NextResponse.json({
      ok: true,
      active: !!session,
      session: session || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur active-session" }, { status: 500 });
  }
}
