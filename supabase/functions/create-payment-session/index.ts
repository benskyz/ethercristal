import { createClient } from "@supabase/supabase-js";

type CreatePaymentBody = {
  purchaseType: "vip" | "shop_item" | "credits" | "custom";
  amount: number;
  currency?: string;
  planSlug?: string | null;
  itemKey?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: "Supabase secrets missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing bearer token" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as CreatePaymentBody;

    const purchaseType = body.purchaseType;
    const amount = Number(body.amount ?? 0);
    const currency = String(body.currency || "CAD").toUpperCase();
    const planSlug = body.planSlug || null;
    const itemKey = body.itemKey || null;
    const targetId = body.targetId || null;
    const metadata = body.metadata || {};

    if (!["vip", "shop_item", "credits", "custom"].includes(purchaseType)) {
      return json({ error: "Invalid purchase type" }, 400);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Invalid amount" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .insert({
        user_id: user.id,
        purchase_type: purchaseType,
        target_id: targetId,
        item_key: itemKey,
        plan_slug: planSlug,
        amount,
        currency,
        status: "pending",
        provider: "manual",
        metadata,
      })
      .select("*")
      .single();

    if (paymentError) {
      return json({ error: paymentError.message }, 400);
    }

    const fakeCheckoutUrl = `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment/pending?payment_id=${payment.id}`;

    return json({
      ok: true,
      paymentId: payment.id,
      status: payment.status,
      checkoutUrl: fakeCheckoutUrl,
      message: "Session de paiement créée. Branche ensuite ton provider réel.",
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500
    );
  }
});
