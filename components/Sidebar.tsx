"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  pseudo?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
};

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profil" },
  { href: "/messages", label: "Messages" },
  { href: "/salons", label: "Salons" },
  { href: "/desir", label: "Désir Intense" },
  { href: "/boutique", label: "Boutique" },
  { href: "/inventaire", label: "Inventaire" },
  { href: "/vip", label: "VIP" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) return;

        const { data } = await supabase
          .from("profiles")
          .select("pseudo, credits, is_vip, is_admin")
          .eq("id", user.id)
          .single();

        if (mounted && data) {
          setProfile(data as ProfileRow);
        }
      } catch {
        if (mounted) {
          setProfile(null);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      window.location.href = "/enter";
    } catch {
      setLoggingOut(false);
    }
  }

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.adminOnly && !profile?.is_admin) return false;
      return true;
    });
  }, [profile]);

  function renderNavItems(isMobile = false) {
    return visibleNavItems.map((item) => {
      const active =
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href + "/"));

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cx(
            "flex items-center rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200",
            isMobile
              ? active
                ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black shadow-[0_10px_30px_rgba(255,60,120,0.25)]"
                : "bg-white/[0.04] text-white/78 hover:bg-white/[0.08] hover:text-white"
              : active
              ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black shadow-[0_10px_30px_rgba(255,60,120,0.25)]"
              : "text-white/72 hover:bg-white/[0.06] hover:text-white"
          )}
        >
          {item.label}
        </Link>
      );
    });
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-2xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg shadow-[0_0_30px_rgba(255,80,120,0.15)]">
            💎
          </div>

          <div>
            <p className="text-sm font-black leading-none text-white">EtherCristal</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/35">
              {profile?.pseudo || "Membre"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white"
        >
          {mobileOpen ? "Fermer" : "Menu"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[88%] max-w-[320px] border-r border-white/10 bg-[#07070b]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl">
                  💎
                </div>
                <div>
                  <p className="text-lg font-black text-white">EtherCristal</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                    Accès privé
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-white">
                {profile?.pseudo || "Membre"}
              </p>

              <p className="mt-1 text-xs text-white/55">
                {profile?.credits ?? 0} crédits
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.is_admin ? (
                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
                    ADMIN
                  </span>
                ) : null}

                {profile?.is_vip ? (
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                    VIP
                  </span>
                ) : null}

                {!profile?.is_admin && !profile?.is_vip ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                    MEMBRE
                  </span>
                ) : null}
              </div>
            </div>

            <nav className="mt-5 space-y-2">{renderNavItems(true)}</nav>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-5 w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
            >
              {loggingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </div>
      ) : null}

      <aside className="hidden md:flex w-[250px] shrink-0 flex-col border-r border-white/10 bg-black/25 backdrop-blur-2xl">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl shadow-[0_0_30px_rgba(255,80,120,0.15)]">
                💎
              </div>

              <div>
                <p className="text-lg font-black leading-none text-white">
                  EtherCristal
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/35">
                  Accès privé
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
              <p className="text-sm font-bold text-white">
                {profile?.pseudo || "Membre"}
              </p>

              <p className="mt-1 text-xs text-white/55">
                {profile?.credits ?? 0} crédits
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.is_admin ? (
                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
                    ADMIN
                  </span>
                ) : null}

                {profile?.is_vip ? (
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                    VIP
                  </span>
                ) : null}

                {!profile?.is_admin && !profile?.is_vip ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                    MEMBRE
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1.5">{renderNavItems(false)}</div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
            >
              {loggingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
