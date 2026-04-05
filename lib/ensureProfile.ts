import { requireSupabaseBrowserClient } from "./supabase";

export async function ensureProfile(user: any) {
  const supabase = requireSupabaseBrowserClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data;

  const username = (user.email || "membre").split("@")[0];

  await supabase.from("profiles").insert({
    id: user.id,
    username,
    vip_level: "Standard",
    ether_balance: 100,
  });

  const { data: created } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return created;
}
