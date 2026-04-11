"use client";

import { useState } from "react";
import { EtherFX } from "@/components/effects/EtherFX";

export type ItemRarity = "mythic" | "legendary" | "epic" | "rare" | "common";
export type ItemStatus = "equipped" | "owned" | "available";
export type ItemType = "effect" | "badge" | "title";

export interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ItemType;
  effectClass: string | null;
  price: number;
  currency: string;
  rarity: ItemRarity;
  status: ItemStatus;
  previewName: string | null;
  meta?: {
    icon?: string;
    label?: string;
  };
}

type RarityCfg = {
  label: string;
  topBar: string;
  border: string;
  glow: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  priceFg: string;
  btnBg: string;
  btnBorder: string;
  btnText: string;
  btnHover: string;
};

const RARITY: Record<ItemRarity, RarityCfg> = {
  mythic: {
    label: "Mythique",
    topBar: "from-transparent via-rose-400 to-transparent",
    border: "border-rose-500/35",
    glow: "shadow-[0_0_28px_rgba(244,63,94,0.14)]",
    pillBg: "bg-rose-500/15",
    pillText: "text-rose-300",
    pillBorder: "border-rose-500/35",
    priceFg: "text-rose-300",
    btnBg: "bg-rose-500/15",
    btnBorder: "border-rose-500/40",
    btnText: "text-rose-300",
    btnHover: "hover:bg-rose-500/25",
  },
  legendary: {
    label: "Légendaire",
    topBar: "from-transparent via-amber-400 to-transparent",
    border: "border-amber-500/35",
    glow: "shadow-[0_0_28px_rgba(245,158,11,0.13)]",
    pillBg: "bg-amber-500/15",
    pillText: "text-amber-300",
    pillBorder: "border-amber-500/35",
    priceFg: "text-amber-300",
    btnBg: "bg-amber-500/15",
    btnBorder: "border-amber-500/40",
    btnText: "text-amber-300",
    btnHover: "hover:bg-amber-500/25",
  },
  epic: {
    label: "Épique",
    topBar: "from-transparent via-violet-400 to-transparent",
    border: "border-violet-500/35",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.13)]",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-300",
    pillBorder: "border-violet-500/35",
    priceFg: "text-violet-300",
    btnBg: "bg-violet-500/15",
    btnBorder: "border-violet-500/40",
    btnText: "text-violet-300",
    btnHover: "hover:bg-violet-500/25",
  },
  rare: {
    label: "Rare",
    topBar: "from-transparent via-cyan-400 to-transparent",
    border: "border-cyan-500/25",
    glow: "shadow-[0_0_18px_rgba(6,182,212,0.09)]",
    pillBg: "bg-cyan-500/15",
    pillText: "text-cyan-300",
    pillBorder: "border-cyan-500/25",
    priceFg: "text-cyan-300",
    btnBg: "bg-cyan-500/15",
    btnBorder: "border-cyan-500/35",
    btnText: "text-cyan-300",
    btnHover: "hover:bg-cyan-500/25",
  },
  common: {
    label: "Commun",
    topBar: "from-transparent via-white/10 to-transparent",
    border: "border-white/8",
    glow: "",
    pillBg: "bg-white/8",
    pillText: "text-white/35",
    pillBorder: "border-white/10",
    priceFg: "text-white/60",
    btnBg: "bg-white/8",
    btnBorder: "border-white/15",
    btnText: "text-white/50",
    btnHover: "hover:bg-white/12",
  },
};

type StatusCfg = {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
};

const STATUS: Record<ItemStatus, StatusCfg> = {
  equipped: {
    label: "Équipé",
    bg: "bg-emerald-500/12",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  owned: {
    label: "Possédé",
    bg: "bg-sky-500/12",
    text: "text-sky-300",
    border: "border-sky-500/25",
    dot: "bg-sky-400",
  },
  available: {
    label: "Disponible",
    bg: "bg-white/[0.04]",
    text: "text-white/30",
    border: "border-white/8",
    dot: "bg-white/20",
  },
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function BoutiqueCard({ item }: { item: ShopItem }) {
  const [previewing, setPreviewing] = useState(false);
  const rc = RARITY[item.rarity];
  const sc = STATUS[item.status];

  const isEffect = item.type === "effect" && !!item.effectClass && !!item.previewName;
  const isBadge = item.type === "badge";
  const isTitle = item.type === "title";

  return (
    <article
      className={cx(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-[#0b0b18] transition-all duration-300 hover:-translate-y-[2px]",
        rc.border,
        rc.glow
      )}
    >
      <div aria-hidden className={cx("h-px w-full bg-gradient-to-r", rc.topBar)} />

      <div
        className="relative flex min-h-[120px] select-none items-center justify-center overflow-hidden bg-[#080814]"
        onMouseEnter={() => isEffect && setPreviewing(true)}
        onMouseLeave={() => isEffect && setPreviewing(false)}
        onTouchStart={() => isEffect && setPreviewing(true)}
        onTouchEnd={() => isEffect && setPreviewing(false)}
      >
        {previewing && isEffect && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)",
            }}
          />
        )}

        {isEffect ? (
          <EtherFX
            effectClass={item.effectClass}
            name={item.previewName ?? "EtherUser"}
            active={previewing}
            size="lg"
            className="sm:text-2xl"
          />
        ) : null}

        {isBadge ? (
          <span className={cx("text-5xl drop-shadow-lg", rc.priceFg)} aria-label={item.name}>
            {item.meta?.icon ?? "⬡"}
          </span>
        ) : null}

        {isTitle ? (
          <span
            className={cx(
              "px-4 text-center text-sm font-black uppercase tracking-[0.2em] drop-shadow-lg",
              rc.priceFg
            )}
          >
            {item.meta?.label ?? item.name}
          </span>
        ) : null}

        {isEffect && (
          <span className="absolute bottom-2 right-3 text-[9px] uppercase tracking-widest text-white/15">
            {previewing ? "animation active" : "survol → preview"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold leading-snug text-white">{item.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/30">
              {item.description}
            </p>
          </div>

          <span
            className={cx(
              "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              rc.pillBg,
              rc.pillText,
              rc.pillBorder
            )}
          >
            {rc.label}
          </span>
        </div>

        <span
          className={cx(
            "flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            sc.bg,
            sc.text,
            sc.border
          )}
        >
          <span className={cx("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </span>

        <div className="mt-auto flex items-center justify-between pt-1">
          <p className={cx("text-base font-black", rc.priceFg)}>
            {item.price.toLocaleString("fr-FR")}
            <span className="ml-1 text-[10px] font-medium text-white/25">{item.currency}</span>
          </p>

          {item.status === "equipped" ? (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Actif
            </span>
          ) : item.status === "owned" ? (
            <button
              type="button"
              className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300 transition-all duration-150 hover:bg-sky-500/20"
            >
              Équiper
            </button>
          ) : (
            <button
              type="button"
              className={cx(
                "rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-150",
                rc.btnBg,
                rc.btnBorder,
                rc.btnText,
                rc.btnHover
              )}
            >
              Obtenir
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default BoutiqueCard;
