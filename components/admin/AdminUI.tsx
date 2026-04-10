"use client";

import type { ReactNode } from "react";

export type FlashState = {
  tone: "success" | "error";
  text: string;
} | null;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function roomLabel(roomId?: string | null) {
  if (!roomId) return "Room inconnue";
  if (roomId === "1") return "Salon Éther Rouge";
  if (roomId === "2") return "Cristal Privé VIP";
  return `Room ${roomId}`;
}

export function StatCard({
  title,
  value,
  icon,
  accent,
  subtitle,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className={cx("absolute inset-0 bg-gradient-to-br opacity-70", accent)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_30%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
          {icon}
          <span>{title}</span>
        </div>
        <div className="mt-2 text-xl font-black text-white">{value}</div>
        {subtitle ? <div className="mt-1 text-xs text-white/45">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function ActionCard({
  title,
  subtitle,
  icon,
  onClick,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className={cx("absolute inset-0 bg-gradient-to-br opacity-75", accent)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_30%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/25 text-white/90">
            {icon}
          </div>
          <span className="text-white/35 transition group-hover:text-white/80">↗</span>
        </div>

        <div className="mt-4 text-base font-black text-white">{title}</div>
        <div className="mt-1 text-sm leading-6 text-white/58">{subtitle}</div>
      </div>
    </button>
  );
}

export function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  const toneClass =
    flash.tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-red-400/20 bg-red-500/10 text-red-100";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", toneClass)}>
      {flash.text}
    </div>
  );
}
export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}
