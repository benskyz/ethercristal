import { NextRequest, NextResponse } from "next/server";
import { removeFromQueue } from "@/lib/desir/server";
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

export async function POST(req: NextRequest) {
  try {
    const supabase = userClient(req);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await removeFromQueue(auth.user.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur leave désir" }, { status: 500 });
  }
}
