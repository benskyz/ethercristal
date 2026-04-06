"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  MessageCircle,
  User,
  Crown,
  Settings,
  Shield,
  LogOut,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = DisplayProfile & {
  id: string;
  credits?: number | null;
  vip_expires_at?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isVipActive(vip_expires_at?: string | null) {
  if (!vip_expires_at) return false;
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return false;
  return d > new Date();
}

function formatVip(vip_expires_at?: string | null) {
  if (!vip_expires_at) return "Non VIP";
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return "Non VIP";
  if (d <= new Date()) return "VIP expiré";
  return `VIP → ${d.toLocaleDateString("fr-CA")}`;
}

export default function Sidebar({
  variant = "desktop",
}: {
  variant?: "desktop" | "drawer";
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");

  const credits = profile?.credits ?? 0;
  const vipOk = isVipActive(profile?.vip_expires_at);
  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  const NAV = useMemo(() => {
    const items = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/salons", label: "Salons", icon: Users },
      { href: "/desir", label: "Désir Intense", icon: Sparkles },
      { href: "/boutique", label: "Boutique", icon: ShoppingBag },
      { href: "/messages", label: "Messages", icon: MessageCircle },
      { href: "/profile", label: "Profil", icon: User },
      { href: "/vip", label: "VIP", icon: Crown },
      { href: "/options", label: "Options", icon: Settings },
    ];

    if (isAdmin) items.unshift({ href: "/admin", label: "Admin", icon: Shield });
    return items;
  }, [isAdmin]);

  async function loadProfile() {
    setError("");

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      router.push("/enter");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, pseudo, credits, vip_expires_at, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setProfile(null);
    } else {
      setProfile((data as ProfileRow) ?? null);
    }

    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  useEffect(() => {
    loadProfile();

    const channel = supabase
      .channel("sidebar-profile")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => loadProfile()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/enter");
  }

  const shell =
    variant === "desktop"
      ? "sticky top-0 h-screen w-[320px] shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-2xl"
      : "w-full border-b border-white/10 bg-black/40 backdrop-blur-2xl";

  return (
    <aside className={shell}>
      <div className={cx("flex h-full flex-col", variant === "desktop" ? "p-5" : "p-4")}>
        {/* Brand */}
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">
                EtherCristal
              </div>
              <div className="mt-1 text-2xl font-black text-white">NCQ LIVE</div>
            </div>

            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 disabled:opacity-60"
              title="Actualiser"
            >
              <RefreshCw className={cx("h-4 w-4 text-white/80", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* Profile card */}
          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/30 p-4">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
                <div className="mt-3 h-9 w-full rounded bg-white/10 animate-pulse" />
              </div>
            ) : profile ? (
              <div className="space-y-3">
                <ProfileName profile={profile} size="md" showTitle showBadge />

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                    {credits} crédits
                  </span>

                  <span
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs font-black",
                      vipOk
                        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                        : "border-white/10 bg-white/10 text-white/55"
                    )}
                  >
                    {formatVip(profile.vip_expires_at)}
                  </span>

                  {isAdmin ? (
                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-200">
                      Maître Ether
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => router.push("/boutique")}
                  className="w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2.5 text-sm font-black text-black hover:opacity-95"
                >
                  Améliorer mon style
                </button>
              </div>
            ) : (
              <div className="text-sm text-white/60">Profil introuvable.</div>
            )}

            {error ? (
              <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* Nav */}
        <nav className={cx("mt-5 space-y-2", variant === "desktop" ? "flex-1" : "")}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition",
                  active
                    ? "border-white/10 bg-white/12 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.07]"
                )}
              >
                <span
                  className={cx(
                    "grid h-9 w-9 place-items-center rounded-xl border transition",
                    active
                      ? "border-white/10 bg-white/10"
                      : "border-white/10 bg-white/5 group-hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cx("mt-4", variant === "desktop" ? "" : "pt-2")}>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <button
              onClick={signOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>

            <div className="mt-3 text-center text-[11px] text-white/40">
              EtherCristal • privé • premium
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
