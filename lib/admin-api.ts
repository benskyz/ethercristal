import { requireSupabaseBrowserClient } from "@/lib/supabase";

type ToggleAdminResponse = {
  ok: boolean;
  userId: string;
  isAdmin: boolean;
};

export async function toggleAdminViaApi(userId: string, isAdmin: boolean) {
  const response = await fetch("/api/admin/toggle-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, isAdmin }),
  });

  const data = (await response.json().catch(() => null)) as
    | ToggleAdminResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      (data && "error" in data && data.error) || "Impossible de modifier le statut admin."
    );
  }

  return data as ToggleAdminResponse;
}

export async function markNotificationRead(notificationId: string) {
  const supabase = requireSupabaseBrowserClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function sendAdminNotification(input: {
  userId: string;
  title: string;
  body?: string;
}) {
  const supabase = requireSupabaseBrowserClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title.trim(),
    body: input.body?.trim() || "",
    is_read: false,
  });

  if (error) throw error;
}
