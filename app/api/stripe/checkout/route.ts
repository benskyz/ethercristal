import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe non configuré: STRIPE_SECRET_KEY manquant." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const body = await req.json();
    const { priceName, amountUsd, metadata, mode = "payment" } = body || {};

    if (!priceName || typeof priceName !== "string") {
      return NextResponse.json(
        { error: "priceName manquant ou invalide." },
        { status: 400 }
      );
    }

    if (typeof amountUsd !== "number" || !Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json(
        { error: "amountUsd manquant ou invalide." },
        { status: 400 }
      );
    }

    if (mode !== "payment" && mode !== "subscription") {
      return NextResponse.json(
        { error: "mode invalide. Utilise 'payment' ou 'subscription'." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: priceName,
            },
            unit_amount: Math.round(amountUsd * 100),
            ...(mode === "subscription"
              ? {
                  recurring: {
                    interval: "month" as const,
                  },
                }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/shop?success=1`,
      cancel_url: `${appUrl}/shop?canceled=1`,
      metadata:
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur création checkout" },
      { status: 500 }
    );
  }
}
