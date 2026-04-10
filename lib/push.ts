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

export async function resetOldServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
}

export async function registerPush(vapidPublicKey: string) {
  if (typeof window === "undefined") {
    throw new Error("Fenêtre non disponible.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non supporté.");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push non supporté.");
  }

  await resetOldServiceWorkers();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission notification refusée.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js?v=12", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  return subscription;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
};

export async function sendPush(
  subscription: PushSubscription | Record<string, unknown>,
  payload: PushPayload
) {
  const res = await fetch(
    "https://czmhgljqtumnbnmeiuzb.supabase.co/functions/v1/send-push",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription,
        title: payload.title,
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: payload.tag || "ethercristal",
        url: payload.url || "/dashboard",
        image: payload.image,
        vibrate: [200, 100, 200],
      }),
    }
  );

  const text = await res.text();

  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    throw new Error(
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
  }

  return data;
}
