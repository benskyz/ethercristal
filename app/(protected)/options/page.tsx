"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Check,
  Crown,
  Eye,
  EyeOff,
  LogOut,
  Menu,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";

type profile_row = {
  id: string;
  email: string | null;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  credits: number;
  is_vip: boolean;
  is_admin: boolean;
  vip_expires_at: string | null;
  role: string;
  master_title: string;
  master_title_style: string | null;
  active_name_fx_key: string | null;
  active_badge_key: string | null;
  active_title_key: string | null;
  gender: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

type preference_row = {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  discreet_mode: boolean;
  show_online_status: boolean;
  allow_private_messages: boolean;
  created_at: string;
  updated_at: string;
};

type profile_form = {
  pseudo: string;
  avatar_url: string;
  bio: string;
  gender: string;
};

type preference_form = {
  notifications_enabled: boolean;
  discreet_mode: boolean;
  show_online_status: boolean;
  allow_private_messages: boolean;
};

type flash_state =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

const profile_select = `
  id,
  email,
  pseudo,
  avatar_url,
  bio,
  credits,
  is_vip,
  is_admin,
  vip_expires_at,
  role,
  master_title,
  master_title_style,
  active_name_fx_key,
  active_badge_key,
  active_title_key,
  gender,
  is_verified,
  created_at,
  updated_at
`;

const default_preferences: preference_form = {
  notifications_enabled: true,
  discreet_mode: false,
  show_online_status: true,
  allow_private_messages: true,
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function is_valid_email(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function is_valid_http_url(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function is_missing_relation(error: any) {
  return error?.code === "42P01";
}

function normalize_pseudo(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function build_fallback_pseudo(user: User) {
  const base =
    String(user.user_metadata?.pseudo || "").trim() ||
    user.email?.split("@")[0]?.trim() ||
    `membre_${user.id.slice(0, 8)}`;

  return normalize_pseudo(base || "Membre Ether");
}

function vip_is_active(profile: profile_row | null) {
  if (!profile) return false;
  if (profile.is_admin) return true;
  if (profile.is_vip) return true;

  if (!profile.vip_expires_at) return false;

  const expires_at = new Date(profile.vip_expires_at).getTime();
  return Number.isFinite(expires_at) && expires_at > Date.now();
}

async function get_connected_user() {
  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

async function get_profile_record(user_id: string) {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(profile_select)
    .eq("id", user_id)
    .maybeSingle();

  if (error) throw error;

  return (data as profile_row | null) ?? null;
}

async function ensure_profile_record(user: User) {
  const supabase = requireSupabaseBrowserClient();

  const existing = await get_profile_record(user.id);
  if (existing) return existing;

  const { error: upsert_error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      pseudo: build_fallback_pseudo(user),
      credits: 0,
      is_vip: false,
      is_admin: false,
      role: "member",
      master_title: "Aucun titre",
    },
    { onConflict: "id" }
  );

  if (upsert_error) throw upsert_error;

  const created = await get_profile_record(user.id);

  if (!created) {
    throw new Error("Impossible de créer le profil utilisateur.");
  }

  return created;
}

async function get_preference_record(user_id: string) {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) throw error;

  return (data as preference_row | null) ?? null;
}

async function ensure_preference_record(user_id: string) {
  const supabase = requireSupabaseBrowserClient();

  const existing = await get_preference_record(user_id);
  if (existing) return existing;

  const { error: insert_error } = await supabase.from("user_preferences").insert({
    user_id,
    ...default_preferences,
  });

  if (insert_error) throw insert_error;

  const created = await get_preference_record(user_id);

  if (!created) {
    throw new Error("Impossible de créer les préférences utilisateur.");
  }

  return created;
}

function Banner({ flash }: { flash: flash_state }) {
  if (!flash) return null;

  return (
    <div
      className={cx(
        "rounded-[20px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
        flash.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      )}
    >
      {flash.text}
    </div>
  );
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const tone_class =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/75";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        tone_class
      )}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="bg-gradient-to-r from-red-300/80 via-white/90 to-fuchsia-300/80 bg-clip-text text-[11px] font-black uppercase tracking-[0.35em] text-transparent">
            {title}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const tone_class =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10"
      : "border-white/10 bg-black/20";

  return (
    <div
      className={cx(
        "rounded-[22px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]",
        tone_class
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.20em] text-white/34">
        {label}
      </label>
      {children}
      {hint ? <div className="mt-2 text-xs text-white/42">{hint}</div> : null}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  on_change,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  on_change: (next_value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[20px] border border-red-500/10 bg-black/20 p-4">
      <div className="min-w-0">
        <div className="text-sm font-black uppercase tracking-[0.14em] text-white">
          {title}
        </div>
        <div className="mt-1 text-sm leading-6 text-white/56">{description}</div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => on_change(!checked)}
        className={cx(
          "relative mt-1 h-7 w-14 rounded-full border transition disabled:opacity-50",
          checked
            ? "border-emerald-400/20 bg-emerald-500/20"
            : "border-white/10 bg-white/[0.06]"
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-8" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export default function OptionsPage() {
  const router = useRouter();

  const [sidebar_open, set_sidebar_open] = useState(false);

  const [loading, set_loading] = useState(true);
  const [refreshing, set_refreshing] = useState(false);
  const [saving_profile, set_saving_profile] = useState(false);
  const [saving_preferences, set_saving_preferences] = useState(false);
  const [requesting_verification, set_requesting_verification] = useState(false);
  const [resetting_preferences, set_resetting_preferences] = useState(false);
  const [logging_out, set_logging_out] = useState(false);

  const [flash, set_flash] = useState<flash_state>(null);

  const [profile, set_profile] = useState<profile_row | null>(null);
  const [preferences, set_preferences] = useState<preference_row | null>(null);

  const [profile_form, set_profile_form] = useState<profile_form>({
    pseudo: "",
    avatar_url: "",
    bio: "",
    gender: "",
  });

  const [preference_form, set_preference_form] = useState<preference_form>(default_preferences);

  const vip_active = useMemo(() => vip_is_active(profile), [profile]);

  const load_page = useCallback(
    async (first_load = false) => {
      try {
        if (first_load) set_loading(true);
        else set_refreshing(true);

        set_flash(null);

        const user = await get_connected_user();

        if (!user) {
          router.replace("/enter");
          return;
        }

        const next_profile = await ensure_profile_record(user);

        let next_preferences: preference_row | null = null;

        try {
          next_preferences = await ensure_preference_record(user.id);
        } catch (preference_error: any) {
          if (is_missing_relation(preference_error)) {
            set_flash({
              tone: "error",
              text: 'La table "user_preferences" est manquante. Exécute le SQL fourni sous ce fichier.',
            });
          } else {
            throw preference_error;
          }
        }

        set_profile(next_profile);
        set_profile_form({
          pseudo: next_profile.pseudo || "",
          avatar_url: next_profile.avatar_url || "",
          bio: next_profile.bio || "",
          gender: next_profile.gender || "",
        });

        if (next_preferences) {
          set_preferences(next_preferences);
          set_preference_form({
            notifications_enabled: next_preferences.notifications_enabled,
            discreet_mode: next_preferences.discreet_mode,
            show_online_status: next_preferences.show_online_status,
            allow_private_messages: next_preferences.allow_private_messages,
          });
        } else {
          set_preferences(null);
          set_preference_form(default_preferences);
        }
      } catch (error: any) {
        set_flash({
          tone: "error",
          text: error?.message || "Impossible de charger la page options.",
        });
      } finally {
        set_loading(false);
        set_refreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void load_page(true);
  }, [load_page]);

  async function handle_save_profile() {
    try {
      if (!profile) return;

      set_saving_profile(true);
      set_flash(null);

      const clean_pseudo = normalize_pseudo(profile_form.pseudo);
      const clean_avatar_url = profile_form.avatar_url.trim();
      const clean_bio = profile_form.bio.trim();
      const clean_gender = profile_form.gender.trim();

      if (clean_pseudo.length < 3) {
        throw new Error("Le pseudo doit contenir au moins 3 caractères.");
      }

      if (clean_pseudo.length > 32) {
        throw new Error("Le pseudo doit contenir au maximum 32 caractères.");
      }

      if (profile.email && !is_valid_email(profile.email)) {
        throw new Error("L’adresse courriel du compte est invalide.");
      }

      if (clean_avatar_url && !is_valid_http_url(clean_avatar_url)) {
        throw new Error("L’avatar doit être une URL http:// ou https:// valide.");
      }

      if (clean_bio.length > 500) {
        throw new Error("La bio doit contenir au maximum 500 caractères.");
      }

      const allowed_genders = ["", "homme", "femme", "couple", "autre"];
      if (!allowed_genders.includes(clean_gender)) {
        throw new Error("La valeur du genre est invalide.");
      }

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          pseudo: clean_pseudo,
          avatar_url: clean_avatar_url || null,
          bio: clean_bio || null,
          gender: clean_gender || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      const next_profile = await get_profile_record(profile.id);
      if (!next_profile) {
        throw new Error("Impossible de relire le profil après sauvegarde.");
      }

      set_profile(next_profile);
      set_profile_form({
        pseudo: next_profile.pseudo || "",
        avatar_url: next_profile.avatar_url || "",
        bio: next_profile.bio || "",
        gender: next_profile.gender || "",
      });

      set_flash({
        tone: "success",
        text: "Profil mis à jour.",
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible de sauvegarder le profil.",
      });
    } finally {
      set_saving_profile(false);
    }
  }

  async function handle_save_preferences() {
    try {
      if (!profile) return;

      set_saving_preferences(true);
      set_flash(null);

      const supabase = requireSupabaseBrowserClient();

      const payload = {
        user_id: profile.id,
        notifications_enabled: preference_form.notifications_enabled,
        discreet_mode: preference_form.discreet_mode,
        show_online_status: preference_form.show_online_status,
        allow_private_messages: preference_form.allow_private_messages,
      };

      const { error } = await supabase
        .from("user_preferences")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      const next_preferences = await ensure_preference_record(profile.id);

      set_preferences(next_preferences);
      set_preference_form({
        notifications_enabled: next_preferences.notifications_enabled,
        discreet_mode: next_preferences.discreet_mode,
        show_online_status: next_preferences.show_online_status,
        allow_private_messages: next_preferences.allow_private_messages,
      });

      set_flash({
        tone: "success",
        text: "Préférences mises à jour.",
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible de sauvegarder les préférences.",
      });
    } finally {
      set_saving_preferences(false);
    }
  }

  async function handle_request_verification() {
    try {
      if (!profile) return;
      if (profile.is_verified) {
        set_flash({
          tone: "success",
          text: "Le compte est déjà vérifié.",
        });
        return;
      }

      set_requesting_verification(true);
      set_flash(null);

      const supabase = requireSupabaseBrowserClient();

      const existing = await supabase
        .from("verification_requests")
        .select("id, status")
        .eq("user_id", profile.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing.error) throw existing.error;

      if (existing.data?.status === "pending") {
        set_flash({
          tone: "success",
          text: "Une demande de vérification est déjà en attente.",
        });
        return;
      }

      if (existing.data?.status === "approved") {
        set_flash({
          tone: "success",
          text: "Une vérification approuvée existe déjà pour ce compte.",
        });
        return;
      }

      const { error } = await supabase.from("verification_requests").insert({
        user_id: profile.id,
        status: "pending",
        note: "Demande envoyée depuis la page options.",
      });

      if (error) throw error;

      set_flash({
        tone: "success",
        text: "Demande de vérification envoyée.",
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible d’envoyer la demande de vérification.",
      });
    } finally {
      set_requesting_verification(false);
    }
  }

  async function handle_reset_preferences() {
    try {
      if (!profile) return;

      set_resetting_preferences(true);
      set_flash(null);

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: profile.id,
            ...default_preferences,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      const next_preferences = await ensure_preference_record(profile.id);

      set_preferences(next_preferences);
      set_preference_form({
        notifications_enabled: next_preferences.notifications_enabled,
        discreet_mode: next_preferences.discreet_mode,
        show_online_status: next_preferences.show_online_status,
        allow_private_messages: next_preferences.allow_private_messages,
      });

      set_flash({
        tone: "success",
        text: "Préférences réinitialisées.",
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible de réinitialiser les préférences.",
      });
    } finally {
      set_resetting_preferences(false);
    }
  }

  async function handle_logout() {
    try {
      set_logging_out(true);
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/enter");
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible de se déconnecter.",
      });
    } finally {
      set_logging_out(false);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebar_open} onClose={() => set_sidebar_open(false)} />

      <div className="relative min-h-screen lg:pl-[290px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(170,50,170,0.12),transparent_35%),radial-gradient(circle_at_50%_5%,rgba(59,130,246,0.10),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
          <div className="absolute -left-24 top-16 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-red-700/20 via-fuchsia-700/16 to-blue-700/12 blur-[160px]" />
          <div className="absolute right-8 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-red-600/16 via-pink-600/16 to-orange-600/14 blur-[150px]" />
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => set_sidebar_open(true)}
              className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => void load_page(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />
              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    préférences & identité
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Options
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{profile?.pseudo || "Membre Ether"}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      rôle <span className="font-black text-white">{profile?.role || "member"}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits <span className="font-black text-white">{profile?.credits ?? 0}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile?.is_admin ? (
                      <Tag tone="red">
                        <Shield className="h-3.5 w-3.5" />
                        admin
                      </Tag>
                    ) : null}

                    {vip_active ? (
                      <Tag tone="gold">
                        <Crown className="h-3.5 w-3.5" />
                        vip
                      </Tag>
                    ) : null}

                    {profile?.is_verified ? (
                      <Tag tone="green">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        vérifié
                      </Tag>
                    ) : (
                      <Tag tone="violet">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        non vérifié
                      </Tag>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void load_page(false)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16 disabled:opacity-60"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>

                  <button
                    type="button"
                    onClick={handle_logout}
                    disabled={logging_out}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/16 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {logging_out ? "Déconnexion..." : "Déconnexion"}
                  </button>
                </div>
              </div>
            </section>

            <Banner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Crédits"
                value={profile?.credits ?? 0}
                icon={<Sparkles className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Statut"
                value={profile?.is_admin ? "Admin" : vip_active ? "VIP" : "Membre"}
                icon={<Shield className="h-4 w-4" />}
                tone={profile?.is_admin ? "red" : vip_active ? "gold" : "default"}
              />
              <StatCard
                label="Vérification"
                value={profile?.is_verified ? "Oui" : "Non"}
                icon={<BadgeCheck className="h-4 w-4" />}
                tone={profile?.is_verified ? "green" : "violet"}
              />
              <StatCard
                label="Messages privés"
                value={preference_form.allow_private_messages ? "Activés" : "Coupés"}
                icon={<Eye className="h-4 w-4" />}
                tone={preference_form.allow_private_messages ? "green" : "red"}
              />
              <StatCard
                label="Présence"
                value={preference_form.show_online_status ? "Visible" : "Masquée"}
                icon={preference_form.show_online_status ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                tone={preference_form.show_online_status ? "green" : "red"}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Panel
                title="Profil"
                right={
                  <button
                    type="button"
                    onClick={handle_save_profile}
                    disabled={saving_profile}
                    className="inline-flex items-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 disabled:opacity-60"
                  >
                    {saving_profile ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Sauvegarder
                  </button>
                }
              >
                <div className="grid gap-4">
                  <Field label="Pseudo" hint="3 à 32 caractères.">
                    <input
                      value={profile_form.pseudo}
                      onChange={(event) =>
                        set_profile_form((previous) => ({
                          ...previous,
                          pseudo: event.target.value,
                        }))
                      }
                      placeholder="Pseudo"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </Field>

                  <Field label="Courriel" hint="Lecture seule depuis le compte connecté.">
                    <input
                      value={profile?.email || ""}
                      readOnly
                      className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72 outline-none"
                    />
                  </Field>

                  <Field label="Avatar URL" hint="URL http:// ou https:// valide.">
                    <input
                      value={profile_form.avatar_url}
                      onChange={(event) =>
                        set_profile_form((previous) => ({
                          ...previous,
                          avatar_url: event.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </Field>

                  <Field label="Bio" hint="Maximum 500 caractères.">
                    <textarea
                      rows={6}
                      value={profile_form.bio}
                      onChange={(event) =>
                        set_profile_form((previous) => ({
                          ...previous,
                          bio: event.target.value,
                        }))
                      }
                      placeholder="Décris ton profil..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </Field>

                  <Field label="Genre">
                    <select
                      value={profile_form.gender}
                      onChange={(event) =>
                        set_profile_form((previous) => ({
                          ...previous,
                          gender: event.target.value,
                        }))
                      }
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                    >
                      <option value="">Non défini</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                      <option value="couple">Couple</option>
                      <option value="autre">Autre</option>
                    </select>
                  </Field>
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="Identité visuelle">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                        titre maître
                      </div>
                      <div className="mt-2 text-lg font-black text-white">
                        {profile?.master_title || "Aucun titre"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {profile?.active_name_fx_key ? (
                        <Tag tone="violet">{profile.active_name_fx_key}</Tag>
                      ) : (
                        <Tag>aucun name fx</Tag>
                      )}

                      {profile?.active_badge_key ? (
                        <Tag tone="gold">{profile.active_badge_key}</Tag>
                      ) : (
                        <Tag>aucun badge</Tag>
                      )}

                      {profile?.active_title_key ? (
                        <Tag tone="green">{profile.active_title_key}</Tag>
                      ) : (
                        <Tag>aucun title fx</Tag>
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel title="Compte">
                  <div className="grid gap-3">
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">rôle</div>
                      <div className="mt-2 text-sm font-black text-white">{profile?.role || "member"}</div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">vip</div>
                      <div className="mt-2 text-sm font-black text-white">{vip_active ? "Actif" : "Inactif"}</div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">admin</div>
                      <div className="mt-2 text-sm font-black text-white">{profile?.is_admin ? "Oui" : "Non"}</div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">vérifié</div>
                      <div className="mt-2 text-sm font-black text-white">{profile?.is_verified ? "Oui" : "Non"}</div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">fin vip</div>
                      <div className="mt-2 text-sm font-black text-white">
                        {profile?.vip_expires_at
                          ? new Date(profile.vip_expires_at).toLocaleString()
                          : "Aucune date"}
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Panel
                title="Préférences"
                right={
                  <button
                    type="button"
                    onClick={handle_save_preferences}
                    disabled={saving_preferences || !preferences}
                    className="inline-flex items-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 disabled:opacity-60"
                  >
                    {saving_preferences ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Sauvegarder
                  </button>
                }
              >
                <div className="grid gap-4">
                  <ToggleRow
                    title="Notifications"
                    description="Recevoir les notifications générales du compte."
                    checked={preference_form.notifications_enabled}
                    disabled={!preferences || saving_preferences}
                    on_change={(next_value) =>
                      set_preference_form((previous) => ({
                        ...previous,
                        notifications_enabled: next_value,
                      }))
                    }
                  />

                  <ToggleRow
                    title="Mode discret"
                    description="Réduire la visibilité de ton activité dans l’interface."
                    checked={preference_form.discreet_mode}
                    disabled={!preferences || saving_preferences}
                    on_change={(next_value) =>
                      set_preference_form((previous) => ({
                        ...previous,
                        discreet_mode: next_value,
                      }))
                    }
                  />

                  <ToggleRow
                    title="Afficher présence en ligne"
                    description="Montrer ou masquer ton statut en ligne."
                    checked={preference_form.show_online_status}
                    disabled={!preferences || saving_preferences}
                    on_change={(next_value) =>
                      set_preference_form((previous) => ({
                        ...previous,
                        show_online_status: next_value,
                      }))
                    }
                  />

                  <ToggleRow
                    title="Autoriser messages privés"
                    description="Permettre aux autres membres de te contacter en privé."
                    checked={preference_form.allow_private_messages}
                    disabled={!preferences || saving_preferences}
                    on_change={(next_value) =>
                      set_preference_form((previous) => ({
                        ...previous,
                        allow_private_messages: next_value,
                      }))
                    }
                  />
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="Sécurité">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                        vérification du compte
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/58">
                        {profile?.is_verified
                          ? "Le compte est déjà vérifié."
                          : "Tu peux envoyer une demande de vérification réelle à l’administration."}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handle_request_verification}
                      disabled={requesting_verification || Boolean(profile?.is_verified)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 disabled:opacity-60"
                    >
                      {requesting_verification ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      {profile?.is_verified ? "Compte déjà vérifié" : "Demander la vérification"}
                    </button>

                    <button
                      type="button"
                      onClick={handle_logout}
                      disabled={logging_out}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-red-100 disabled:opacity-60"
                    >
                      {logging_out ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      Déconnexion
                    </button>
                  </div>
                </Panel>

                <Panel title="Danger zone" right={<Tag tone="red">sensible</Tag>}>
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-red-500/14 bg-red-950/10 p-4">
                      <div className="text-sm font-black uppercase tracking-[0.14em] text-red-100">
                        Réinitialiser les préférences
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/58">
                        Remet les préférences utilisateur à leurs valeurs par défaut.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handle_reset_preferences}
                      disabled={resetting_preferences || !preferences}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-red-100 disabled:opacity-60"
                    >
                      {resetting_preferences ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Réinitialiser
                    </button>
                  </div>
                </Panel>
              </div>
            </div>

            <Panel title="Résumé visuel">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Pseudo"
                  value={profile?.pseudo || "Membre Ether"}
                  icon={<UserCircle2 className="h-4 w-4" />}
                />
                <StatCard
                  label="Titre"
                  value={profile?.master_title || "Aucun titre"}
                  icon={<Sparkles className="h-4 w-4" />}
                  tone="violet"
                />
                <StatCard
                  label="Notifications"
                  value={preference_form.notifications_enabled ? "On" : "Off"}
                  icon={<Bell className="h-4 w-4" />}
                  tone={preference_form.notifications_enabled ? "green" : "red"}
                />
                <StatCard
                  label="Discret"
                  value={preference_form.discreet_mode ? "Oui" : "Non"}
                  icon={preference_form.discreet_mode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  tone={preference_form.discreet_mode ? "gold" : "default"}
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
