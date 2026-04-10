import { createClient } from "@supabase/supabase-js";

type WebhookBody = {
  paymentId?: string;
  eventType?: string;
  eventStatus?: string | null;
  provider?: string | null;
  providerEventId?: string | null;
  providerPaymentId?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

function json(data: unknown, init: number | ResponseInit = 200) {
  const responseInit =
    typeof init === "number"
      ? { status: init }
      : init;

  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-webhook-secret",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      ...(responseInit.headers || {}),
    },
  });
}

function normalizeStatus(input?: string | null) {
  const value = String(input || "").toLowerCase().trim();

  if (["paid", "success", "succeeded", "completed", "approved"].includes(value)) {
    return "paid";
  }

  if (["refunded", "refund", "chargeback"].includes(value)) {
    return "refunded";
  }

  if (["failed", "declined", "error", "cancelled", "canceled"].includes(value)) {
    return "failed";
  }

  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      return json({ error: "Missing server secrets" }, 500);
    }

    const receivedSecret = req.headers.get("x-webhook-secret");
    if (receivedSecret !== webhookSecret) {
      return json({ error: "Invalid webhook secret" }, 401);
    }

    const body = (await req.json()) as WebhookBody;

    const paymentId = String(body.paymentId || "").trim();
    const eventType = String(body.eventType || "unknown").trim();
    const provider = String(body.provider || "manual").trim();
    const providerEventId = body.providerEventId?.trim() || null;
    const providerPaymentId = body.providerPaymentId?.trim() || null;
    const nextStatus = normalizeStatus(body.eventStatus);
    const rawPayload = body.rawPayload || body;

    if (!paymentId) {
      return json({ error: "paymentId is required" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: payment, error: paymentLookupError } = await adminClient
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentLookupError) {
      return json({ error: paymentLookupError.message }, 400);
    }

    if (!payment) {
      return json({ error: "Payment not found" }, 404);
    }

    if (providerEventId) {
      const { data: existingEvent, error: existingEventError } = await adminClient
        .from("payment_events")
        .select("id, payment_id, provider_event_id")
        .eq("provider", provider)
        .eq("provider_event_id", providerEventId)
        .maybeSingle();

      if (existingEventError) {
        return json({ error: existingEventError.message }, 400);
      }

      if (existingEvent) {
        return json({
          ok: true,
          duplicate: true,
          paymentId,
          message: "Webhook déjà traité.",
        });
      }
    }

    const { error: eventInsertError } = await adminClient.from("payment_events").insert({
      payment_id: payment.id,
      event_type: eventType,
      event_status: nextStatus,
      provider,
      provider_event_id: providerEventId,
      raw_payload: rawPayload,
    });

    if (eventInsertError) {
      return json({ error: eventInsertError.message }, 400);
    }

    if (payment.status === "paid" && nextStatus === "paid") {
      return json({
        ok: true,
        alreadyPaid: true,
        paymentId: payment.id,
        status: "paid",
      });
    }

    if (nextStatus === "paid") {
      const { data: applied, error: applyError } = await adminClient.rpc(
        "apply_paid_payment",
        { p_payment_id: payment.id }
      );

      if (applyError) {
        return json(
          {
            error: applyError.message,
            paymentId: payment.id,
            step: "apply_paid_payment",
          },
          400
        );
      }

      await adminClient
        .from("payments")
        .update({
          provider,
          provider_payment_id: providerPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      return json({
        ok: true,
        paymentId: payment.id,
        nextStatus: "paid",
        applied,
      });
    }

    const { error: paymentUpdateError } = await adminClient
      .from("payments")
      .update({
        status: nextStatus,
        provider,
        provider_payment_id: providerPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (paymentUpdateError) {
      return json({ error: paymentUpdateError.message }, 400);
    }

    await adminClient.from("audit_logs").insert({
      actor_id: payment.user_id,
      action: "payment_webhook_processed",
      target_type: "payment",
      target_id: payment.id,
      status:
        nextStatus === "pending"
          ? "warning"
          : nextStatus === "refunded"
          ? "warning"
          : "error",
      details: `Webhook processed for payment ${payment.id} with status ${nextStatus}`,
    });

    return json({
      ok: true,
      paymentId: payment.id,
      nextStatus,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      500
    );
  }
});
