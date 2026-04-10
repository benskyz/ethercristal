import { requireSupabaseBrowserClient } from "@/lib/supabase";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
};

export type PushSubscriptionJson = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const VAPID_PUBLIC_KEY =
  "BBVgfYkDoBBWrhRwz34WFKtITr7Fxl93zhcO5UOvZjwIiLcYY1SGiMr40or6o_0ceofyggw6alzLOuRVuV4ZZTQ";

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

export async function clearPushState() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const regs = await navigator.serviceWorker.getRegistrations();

  for (const reg of regs) {
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
    } catch {}

    try {
      await reg.unregister();
    } catch {}
  }
}

export async function registerPush(
  vapidPublicKey: string = VAPID_PUBLIC_KEY
): Promise<PushSubscriptionJson> {
  if (typeof window === "undefined") {
    throw new Error("Fonction disponible uniquement dans le navigateur.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non supporté.");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push non supporté.");
  }

  await clearPushState();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission notification refusée.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js?v=103", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON() as PushSubscriptionJson;

  if (!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) {
    throw new Error("Subscription push incomplète.");
  }

  return json;
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
    try {
      const response = (error as { context?: Response }).context;

      if (response) {
        const text = await response.text();

        try {
          const json = JSON.parse(text);
          throw new Error(JSON.stringify(json, null, 2));
        } catch {
          throw new Error(text || error.message || "FunctionsHttpError");
        }
      }
    } catch (inner) {
      if (inner instanceof Error) {
        throw inner;
      }
    }

    throw new Error(error.message || JSON.stringify(error, null, 2));
  }

  return data;
}

export async function savePushSubscription() {
  if (typeof window === "undefined") {
    throw new Error("Fonction disponible uniquement dans le navigateur.");
  }

  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté.");
  }

  const subscription = await registerPush(VAPID_PUBLIC_KEY);

  const { endpoint, keys } = subscription;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Subscription push invalide.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw error;
  }

  return subscription;
}

export async function removePushSubscription() {
  if (typeof window === "undefined") {
    throw new Error("Fonction disponible uniquement dans le navigateur.");
  }

  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté.");
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  const regs = await navigator.serviceWorker.getRegistrations();

  for (const reg of regs) {
    try {
      const sub = await reg.pushManager.getSubscription();

      if (sub?.endpoint) {
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);

        if (error) {
          throw error;
        }

        await sub.unsubscribe();
      }
    } catch {}

    try {
      await reg.unregister();
    } catch {}
  }
}
