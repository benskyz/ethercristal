import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { user_id, item_id } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    const { data: item } = await supabase
      .from("items")
      .select("*")
      .eq("id", item_id)
      .single();

    if (!profile || !item) {
      return NextResponse.json({ error: "Erreur données" }, { status: 400 });
    }

    if (profile.ether_balance < item.price) {
      return NextResponse.json({ error: "Pas assez de crédits" }, { status: 400 });
    }

    await supabase
      .from("profiles")
      .update({ ether_balance: profile.ether_balance - item.price })
      .eq("id", user_id);

    await supabase.from("inventory").insert({
      user_id,
      item_id,
      quantity: 1,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
