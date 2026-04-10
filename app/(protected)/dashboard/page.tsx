"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Flame,
  Menu,
  MessageSquare,
  RefreshCw,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/70";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        toneClass
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
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
        "rounded-[24px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]",
        toneClass
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  onClick,
  tone = "default",
}: {
  title: string;
  desc: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10 hover:bg-red-900/16"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10 hover:bg-emerald-900/16"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10 hover:bg-amber-900/16"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10 hover:bg-fuchsia-900/16"
      : "border-white/10 bg-black/20 hover:bg-black/30";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[26px] border p-6 text-left shadow-[0_14px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1",
        toneClass
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.04] text-white/75">
          {icon}
        </div>
        <div className="text-base font-black uppercase tracking-[0.14em] text-white">
          {title}
        </div>
      </div>
      <div className="text-sm leading-6 text-white/58">{desc}</div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [liveRoomsCount, setLiveRoomsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [error, setError] = useState("");

  const statusLabel = useMemo(() => {
    if (profile?.is_admin) return "ADMIN";
    if (isVipActive(profile)) return "VIP";
    return "MEMBRE";
  }, [profile]);

  const loadDashboard = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setError("");

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextProfile = await ensureProfileRecord(user);

        const [inventoryRes, liveRoomsRes, unreadRes] = await Promise.all([
          supabase.from("inventory_items").select("id").eq("user_id", user.id),
          supabase.from("rooms").select("id").eq("is_live", true),
          supabase
            .from("private_messages")
            .select("id")
            .eq("receiver_id", user.id)
            .eq("is_read", false),
        ]);

        setProfile(nextProfile);
        setInventoryCount((inventoryRes.data ?? []).length);
        setLiveRoomsCount((liveRoomsRes.data ?? []).length);
        setUnreadMessagesCount((unreadRes.data ?? []).length);
      } catch (err: any) {
        setError(err?.message || "Impossible de charger le dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

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
            Dashboard...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => void loadDashboard(false)}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[32px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10">
                <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                  espace membre
                </div>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
                  Bienvenue
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                  <span className="font-black text-white">
                    {profileDisplayName(profile)}
                  </span>
                  <span className="text-white/20">•</span>
                  <span>
                    crédits <span className="font-black text-white">{profile?.credits ?? 0}</span>
                  </span>
                  <span className="text-white/20">•</span>
                  <span>
                    rôle <span className="font-black text-white">{profile?.role ?? "member"}</span>
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag tone={profile?.is_admin ? "red" : isVipActive(profile) ? "gold" : "default"}>
                    {statusLabel}
                  </Tag>

                  {profile?.master_title ? (
                    <Tag tone="violet">{profile.master_title}</Tag>
                  ) : null}

                  {profile?.active_name_fx_key ? (
                    <Tag tone="green">
                      <Zap className="h-3.5 w-3.5" />
                      {profile.active_name_fx_key}
                    </Tag>
                  ) : null}

                  {profile?.active_badge_key ? (
                    <Tag tone="gold">
                      <Crown className="h-3.5 w-3.5" />
                      {profile.active_badge_key}
                    </Tag>
                  ) : null}
                </div>

                {error ? (
                  <div className="mt-5 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => void loadDashboard(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/14 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    {refreshing ? "Actualisation..." : "Actualiser"}
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Crédits"
                value={profile?.credits ?? 0}
                icon={<Sparkles className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Messages non lus"
                value={unreadMessagesCount}
                icon={<MessageSquare className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Items inventaire"
                value={inventoryCount}
                icon={<Wand2 className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Salons live"
                value={liveRoomsCount}
                icon={<Users className="h-4 w-4" />}
                tone="red"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ActionCard
                title="Désir intense"
                desc="Cam-to-cam aléatoire et accès direct au module principal."
                icon={<Flame className="h-5 w-5" />}
                onClick={() => router.push("/desir")}
                tone="red"
              />

              <ActionCard
                title="Salons webcam"
                desc="Voir les rooms actives, rejoindre et suivre le live."
                icon={<Users className="h-5 w-5" />}
                onClick={() => router.push("/salons")}
                tone="violet"
              />

              <ActionCard
                title="Messages"
                desc="Retrouver tes discussions privées en temps réel."
                icon={<MessageSquare className="h-5 w-5" />}
                onClick={() => router.push("/messages")}
                tone="default"
              />

              <ActionCard
                title="Boutique"
                desc="Effets, badges, titres et achats du compte."
                icon={<ShoppingBag className="h-5 w-5" />}
                onClick={() => router.push("/boutique")}
                tone="gold"
              />

              <ActionCard
                title="Inventaire"
                desc="Équiper tes effets actifs et gérer ton style."
                icon={<Wand2 className="h-5 w-5" />}
                onClick={() => router.push("/inventaire")}
                tone="green"
              />

              <ActionCard
                title="Options"
                desc="Compte, préférences et réglages personnels."
                icon={<Settings className="h-5 w-5" />}
                onClick={() => router.push("/options")}
                tone="default"
              />

              {profile?.is_admin ? (
                <ActionCard
                  title="Administration"
                  desc="Accès complet au hub admin, sécurité, reports et paiements."
                  icon={<Shield className="h-5 w-5" />}
                  onClick={() => router.push("/admin")}
                  tone="red"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
