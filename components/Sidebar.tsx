"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Flame,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { getProfileByUserId, profileDisplayName, type ProfileRow } from "@/lib/profileCompat";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSidebar() {
      try {
        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const row = await getProfileByUserId(user.id);

        if (!mounted) return;
        setProfile(row);
      } catch {
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSidebar();

    return () => {
      mounted = false;
    };
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/desir", label: "Désir", icon: <Flame className="h-4 w-4" /> },
      { href: "/salons", label: "Salons", icon: <Users className="h-4 w-4" /> },
      { href: "/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
      { href: "/boutique", label: "Boutique", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/inventaire", label: "Inventaire", icon: <Wand2 className="h-4 w-4" /> },
      { href: "/vip", label: "VIP", icon: <Crown className="h-4 w-4" /> },
      { href: "/options", label: "Options", icon: <Settings className="h-4 w-4" /> },
      { href: "/admin", label: "Admin", icon: <Shield className="h-4 w-4" />, adminOnly: true },
    ],
    []
  );

  async function handleLogout() {
    try {
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/enter");
    }
  }

  const visibleItems = navItems.filter((item) => !item.adminOnly || profile?.is_admin);

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cx(
          "fixed left-0 top-0 z-50 h-screen w-[290px] border-r border-red-500/12 bg-[#09090d]/96 p-4 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="mb-4 flex items-center justify-between gap-3 lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-red-500/12 bg-gradient-to-br from-red-700/20 via-black to-fuchsia-700/10">
                <Sparkles className="h-5 w-5 text-red-100" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-red-100/34">
                  EtherCristal
                </div>
                <div className="text-lg font-black text-white">Navigation</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 rounded-[24px] border border-red-500/12 bg-black/20 p-4">
            {loading ? (
              <div className="text-sm text-white/45">Chargement du profil...</div>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                  Profil
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {profileDisplayName(profile)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                    crédits {profile?.credits ?? 0}
                  </span>
                  {profile?.is_vip ? (
                    <span className="rounded-full border border-amber-400/18 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
                      vip
                    </span>
                  ) : null}
                  {profile?.is_admin ? (
                    <span className="rounded-full border border-red-400/18 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-100">
                      admin
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cx(
                    "flex items-center gap-3 rounded-[18px] border px-4 py-4 text-sm font-black uppercase tracking-[0.14em] transition",
                    active
                      ? "border-red-400/18 bg-red-500/12 text-white"
                      : "border-white/8 bg-white/[0.03] text-white/62 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose?.();
                router.push("/dashboard");
              }}
              className="flex w-full items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              <MenuSquare className="h-4 w-4" />
              Vue principale
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/16"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
