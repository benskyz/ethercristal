import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe non configuré: STRIPE_SECRET_KEY manquant." },
        { status: 500 }
      );
    }

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Stripe non configuré: STRIPE_WEBHOOK_SECRET manquant." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Signature Stripe manquante." },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Webhook Stripe invalide." },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur webhook Stripe." },
      { status: 500 }
    );
  }
}
