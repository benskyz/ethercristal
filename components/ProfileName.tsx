"use client";

import { Crown, Shield, Sparkles } from "lucide-react";

type Props = {
  pseudo: string;
  isVip?: boolean | null;
  isAdmin?: boolean | null;
  masterTitle?: string | null;
  masterTitleStyle?: string | null;
  activeNameFxKey?: string | null;
  activeBadgeKey?: string | null;
  activeTitleKey?: string | null;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getNameEffectClass(effectKey?: string | null) {
  const key = (effectKey || "").toLowerCase();

  if (!key) return "text-white";
  if (key.includes("crystal")) return "bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent";
  if (key.includes("void")) return "bg-gradient-to-r from-fuchsia-200 via-violet-400 to-fuchsia-200 bg-clip-text text-transparent";
  if (key.includes("ember")) return "bg-gradient-to-r from-orange-300 via-red-400 to-orange-300 bg-clip-text text-transparent";

  return "bg-gradient-to-r from-white via-fuchsia-200 to-white bg-clip-text text-transparent";
}

function getTitleTone(titleStyle?: string | null) {
  const value = (titleStyle || "").toLowerCase();

  if (value.includes("gold")) return "border-amber-400/18 bg-amber-500/10 text-amber-100";
  if (value.includes("void")) return "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100";
  if (value.includes("crystal")) return "border-cyan-300/18 bg-cyan-500/10 text-cyan-100";

  return "border-white/10 bg-white/[0.04] text-white/70";
}

export default function ProfileName({
  pseudo,
  isVip,
  isAdmin,
  masterTitle,
  masterTitleStyle,
  activeNameFxKey,
  activeBadgeKey,
  activeTitleKey,
  className,
}: Props) {
  return (
    <div className={cx("min-w-0", className)}>
      <div
        className={cx(
          "truncate text-xl font-black tracking-[-0.02em]",
          getNameEffectClass(activeNameFxKey)
        )}
      >
        {pseudo || "Membre Ether"}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/18 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-100">
            <Shield className="h-3.5 w-3.5" />
            admin
          </span>
        ) : null}

        {isVip ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/18 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
            <Crown className="h-3.5 w-3.5" />
            vip
          </span>
        ) : null}

        {activeBadgeKey ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/18 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-100">
            <Sparkles className="h-3.5 w-3.5" />
            {activeBadgeKey}
          </span>
        ) : null}

        {masterTitle ? (
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
              getTitleTone(masterTitleStyle)
            )}
          >
            {activeTitleKey ? <Sparkles className="h-3.5 w-3.5" /> : null}
            {masterTitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
