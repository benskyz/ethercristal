import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MatchFilter = "random" | "women" | "men" | "vip";
type DesirePreference = "soft" | "vip" | "intense";

function getUserClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Variables Supabase admin manquantes.");
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getUserClient(req);
    const adminSupabase = getAdminClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const filter = String(body?.filter || "random") as MatchFilter;
    const preference = String(body?.preference || "soft") as DesirePreference;

    const allowedFilters = ["random", "women", "men", "vip"];
    const allowedPreferences = ["soft", "vip", "intense"];

    if (!allowedFilters.includes(filter)) {
      return NextResponse.json(
        { error: "Filtre invalide." },
        { status: 400 }
      );
    }

    if (!allowedPreferences.includes(preference)) {
      return NextResponse.json(
        { error: "Préférence invalide." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, ether_balance, vip_level")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil introuvable." },
        { status: 404 }
      );
    }

    let cost = 0;

    // random = gratuit
    if (filter === "women" || filter === "men") {
      cost = 20;
    }

    if (filter === "vip") {
      const vipLevel = String(profile.vip_level || "").toLowerCase();
      const hasVip =
        vipLevel.includes("vip") ||
        vipLevel.includes("gold") ||
        vipLevel.includes("diamond") ||
        vipLevel.includes("premium") ||
        vipLevel.includes("luxe");

      if (!hasVip) {
        return NextResponse.json(
          { error: "Ce filtre est réservé aux membres VIP." },
          { status: 403 }
        );
      }
    }

    const currentEther = Number(profile.ether_balance || 0);

    if (cost > 0 && currentEther < cost) {
      return NextResponse.json(
        { error: "Pas assez d’Éther pour ce filtre." },
        { status: 400 }
      );
    }

    if (cost > 0) {
      const { error: debitError } = await adminSupabase
        .from("profiles")
        .update({
          ether_balance: currentEther - cost,
        })
        .eq("id", userId);

      if (debitError) {
        return NextResponse.json(
          { error: "Impossible de débiter l’Éther." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      filter,
      preference,
      cost,
      message:
        filter === "random"
          ? "Recherche gratuite lancée."
          : filter === "vip"
          ? "Recherche VIP lancée."
          : `Recherche lancée pour ${cost} Ether.`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur démarrage match." },
      { status: 500 }
    );
  }
}
