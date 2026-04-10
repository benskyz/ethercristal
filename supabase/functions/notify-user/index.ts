import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type RequestBody = {
  user_id?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  image?: string;
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
      JSON.stringify({ ok: false, error: "Method not allowed." }),
      { status: 405, headers: cors }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !vapidSubject ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Missing required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
        }),
        { status: 500, headers: cors }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = (await req.json()) as RequestBody;

    if (!body.user_id || !body.title || !body.body) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing user_id, title, or body",
        }),
        { status: 400, headers: cors }
      );
    }

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", body.user_id);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No subscriptions found for this user",
          sent: 0,
        }),
        { status: 200, headers: cors }
      );
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      image: body.image,
      tag: body.tag ?? "ethercristal",
      vibrate: [200, 100, 200],
      url: body.url ?? "/dashboard",
    });

    const results = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          {
            TTL: 60,
            urgency: "high",
          }
        );

        results.push({
          id: sub.id,
          endpoint: sub.endpoint,
          ok: true,
        });
      } catch (error: any) {
        const statusCode = error?.statusCode ?? null;
        const errorMessage = error?.message ?? "Unknown error";

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }

        results.push({
          id: sub.id,
          endpoint: sub.endpoint,
          ok: false,
          statusCode,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: results.filter((r) => r.ok).length,
        results,
      }),
      { status: 200, headers: cors }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: cors }
    );
  }
});
