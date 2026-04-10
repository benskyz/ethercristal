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
  data?: Record<string, unknown>;
  ttl?: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: {
          ...cors,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing VAPID secrets. Required: VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
        }),
        {
          status: 500,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        },
      );
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
    );

    const body = (await req.json()) as RequestBody;

    if (!body?.subscription?.endpoint) {
      return new Response(
        JSON.stringify({
          error: "Missing subscription.endpoint",
        }),
        {
          status: 400,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const payload = JSON.stringify({
      title: body.title ?? "Nouvelle notification",
      body: body.body ?? "Tu as reçu une nouvelle alerte.",
      icon: body.icon ?? "/icons/icon-192.png",
      badge: body.badge ?? "/icons/badge-72.png",
      image: body.image ?? undefined,
      url: body.url ?? "/dashboard",
      data: body.data ?? {},
    });

    const ttl = Number.isFinite(body.ttl) ? Number(body.ttl) : 60;

    await webpush.sendNotification(body.subscription as webpush.PushSubscription, payload, {
      TTL: ttl,
      urgency: "high",
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Push sent successfully",
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error("send-push error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...cors,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
