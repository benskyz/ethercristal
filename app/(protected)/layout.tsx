"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastHost";
import { Menu, X, Sparkles } from "lucide-react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // prevent body scroll while drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#07070a] text-white">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
          <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        {/* Desktop */}
        <div className="hidden lg:flex">
          <Sidebar variant="desktop" />
          <main className="min-h-screen flex-1">
            <div className="mx-auto w-full max-w-[1240px] p-6 xl:p-8">
              <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          {/* Topbar */}
          <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3">
              <button
                onClick={() => setOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Sparkles className="h-4 w-4 text-white/80" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">EtherCristal</div>
                  <div className="text-sm font-black text-white">Espace privé</div>
                </div>
              </div>

              {/* spacer for symmetry */}
              <div className="h-9 w-9" />
            </div>
          </header>

          {/* Drawer */}
          <div
            className={cx(
              "fixed inset-0 z-50 transition",
              open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

            <div
              className={cx(
                "absolute left-0 top-0 h-full w-[86%] max-w-[360px] border-r border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] transition-transform",
                open ? "translate-x-0" : "-translate-x-full"
              )}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Menu</div>
                  <div className="text-lg font-black text-white">Navigation</div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="h-[calc(100%-72px)] overflow-auto">
                <Sidebar variant="drawer" />
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="mx-auto w-full max-w-[1240px] p-4 pb-10">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
