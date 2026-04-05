import { requireSupabaseBrowserClient } from "./supabase";

export async function sendMessage(user: any, content: string) {
  const supabase = requireSupabaseBrowserClient();

  await supabase.from("messages").insert({
    user_id: user.id,
    content,
    room: "global",
  });
}
