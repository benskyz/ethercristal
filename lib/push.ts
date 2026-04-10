export async function sendPush(
  subscription: Record<string, unknown>,
  payload: PushPayload
) {
  if (typeof window === "undefined") {
    throw new Error("Fonction disponible uniquement dans le navigateur.");
  }

  const supabase = requireSupabaseBrowserClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session Supabase introuvable. Reconnecte-toi.");
  }

  const { data, error } = await supabase.functions.invoke("send-push", {
    body: {
      subscription,
      title: payload.title,
      body: payload.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.tag || "ethercristal",
      url: payload.url || "/dashboard",
      image: payload.image,
      vibrate: [200, 100, 200],
    },
  });

  if (error) {
    throw new Error(
      typeof error === "string" ? error : JSON.stringify(error, null, 2)
    );
  }

  return data;
}
