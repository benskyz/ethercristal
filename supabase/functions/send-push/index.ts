import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

type PushSubscriptionLike = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type RequestBody = {
  subscription?: PushSubscriptionLike;
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  data?: Record<string, unknown>;
  ttl?: number;
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: cors }
    );
  }

  try {
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Missing VAPID secrets. Required: VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
        }),
        { status: 500, headers: cors }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = (await req.json()) as RequestBody;

    if (!body?.subscription?.endpoint) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing subscription.endpoint",
        }),
        { status: 400, headers: cors }
      );
    }

    const payload = JSON.stringify({
      title: body.title ?? "Nouvelle notification",
      body: body.body ?? "Tu as reçu une nouvelle alerte.",
      icon: body.icon ?? "/favicon.ico",
      badge: body.badge ?? "/favicon.ico",
      image: body.image ?? undefined,
      tag: body.tag ?? "ethercristal",
      vibrate: body.vibrate ?? [200, 100, 200],
      url: body.url ?? "/dashboard",
      data: body.data ?? {},
    });

    const ttl = Number.isFinite(body.ttl) ? Number(body.ttl) : 60;

    await webpush.sendNotification(
      body.subscription as webpush.PushSubscription,
      payload,
      {
        TTL: ttl,
        urgency: "high",
      }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Push sent successfully",
      }),
      { status: 200, headers: cors }
    );
  } catch (error: any) {
    console.error("send-push error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message ?? "Unknown error",
        statusCode: error?.statusCode ?? null,
        body: error?.body ?? null,
      }),
      { status: 500, headers: cors }
    );
  }
});
