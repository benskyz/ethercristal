import { requireSupabaseBrowserClient } from "@/lib/supabase";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function registerPush(vapidPublicKey: string) {
  if (typeof window === "undefined") {
    throw new Error("Fonction disponible uniquement dans le navigateur.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non supporté.");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push non supporté.");
  }

  const regs = await navigator.serviceWorker.getRegistrations();

  for (const reg of regs) {
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch {}

    try {
      await reg.unregister();
    } catch {}
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission notification refusée.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js?v=102", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  return subscription.toJSON();
}

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
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data;
}

export async function savePushSubscription() {
  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté.");
  }

  const VAPID_PUBLIC_KEY =
    "BBVgfYkDoBBWrhRwz34WFKtITr7Fxl93zhcO5UOvZjwIiLcYY1SGiMr40or6o_0ceofyggw6alzLOuRVuV4ZZTQ";

  const subscription = await registerPush(VAPID_PUBLIC_KEY);

  const endpoint = subscription.endpoint as string;
  const keys = (subscription.keys || {}) as { p256dh?: string; auth?: string };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;

  return subscription;
}

export async function removePushSubscription() {
  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté.");
  }

  const regs = await navigator.serviceWorker.getRegistrations();

  for (const reg of regs) {
    try {
      const sub = await reg.pushManager.getSubscription();

      if (sub?.endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);

        await sub.unsubscribe();
      }
    } catch {}

    try {
      await reg.unregister();
    } catch {}
  }
}
