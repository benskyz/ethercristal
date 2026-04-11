"use client";

import type { CSSProperties, ReactNode } from "react";

type EffectVariant =
  | "none"
  | "flame_to_text"
  | "starburst_letters"
  | "liquid_crystal_form"
  | "smoke_condense_text"
  | "fractal_name_evolution"
  | "organic_growth_text"
  | "ice_crystallization"
  | "stardust_assembly"
  | "water_flow_text"
  | "coral_branch_growth";

type EtherFXProps = {
  effectClass?: string | null;
  name: string;
  active?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
};

type FXNameProps = {
  text: string;
  fxKey?: string | null;
  active?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
};

type FXBadgeProps = {
  icon?: ReactNode;
  label?: string | null;
  rarity?: "common" | "rare" | "epic" | "legendary" | "mythic";
  className?: string;
};

type FXTitleProps = {
  text: string;
  rarity?: "common" | "rare" | "epic" | "legendary" | "mythic";
  className?: string;
};

type FXVipCardProps = {
  title?: string;
  subtitle?: string;
  badge?: string;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const SIZE_MAP: Record<NonNullable<EtherFXProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

const FX_CLASS_MAP: Record<Exclude<EffectVariant, "none">, string> = {
  flame_to_text: "fx-flame-to-text",
  starburst_letters: "fx-starburst-letters",
  liquid_crystal_form: "fx-liquid-crystal-form",
  smoke_condense_text: "fx-smoke-condense-text",
  fractal_name_evolution: "fx-fractal-name-evolution",
  organic_growth_text: "fx-organic-growth-text",
  ice_crystallization: "fx-ice-crystallization",
  stardust_assembly: "fx-stardust-assembly",
  water_flow_text: "fx-water-flow-text",
  coral_branch_growth: "fx-coral-branch-growth",
};

const CLASS_TO_VARIANT = Object.fromEntries(
  Object.entries(FX_CLASS_MAP).map(([variant, cssClass]) => [cssClass, variant])
) as Record<string, Exclude<EffectVariant, "none">>;

export function fxVariantFromKey(input?: string | null): EffectVariant {
  if (!input) return "none";

  const normalized = input.trim();

  if (normalized in FX_CLASS_MAP) {
    return normalized as Exclude<EffectVariant, "none">;
  }

  if (normalized in CLASS_TO_VARIANT) {
    return CLASS_TO_VARIANT[normalized];
  }

  return "none";
}

function getEffectClass(input?: string | null) {
  const variant = fxVariantFromKey(input);
  if (variant === "none") return "";
  return FX_CLASS_MAP[variant];
}

function getRarityClass(
  rarity?: "common" | "rare" | "epic" | "legendary" | "mythic"
) {
  switch (rarity) {
    case "mythic":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "legendary":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "epic":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "rare":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

export function EtherFX({
  effectClass,
  name,
  active = false,
  size = "md",
  className,
  style,
}: EtherFXProps) {
  const resolvedClass = getEffectClass(effectClass);

  if (!active || !resolvedClass) {
    return (
      <span
        aria-label={name}
        style={style}
        className={cx(
          "select-none whitespace-nowrap font-black tracking-[0.08em] text-white/50 transition-all duration-500",
          SIZE_MAP[size],
          className
        )}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      aria-label={name}
      data-text={name}
      style={style}
      className={cx(
        "name-fx select-none whitespace-nowrap font-black tracking-[0.08em] text-white transition-all duration-500",
        SIZE_MAP[size],
        resolvedClass,
        className
      )}
    >
      {name}
    </span>
  );
}

export default EtherFX;

export function FXName({
  text,
  fxKey,
  active = true,
  size = "md",
  className,
  style,
}: FXNameProps) {
  return (
    <EtherFX
      effectClass={fxKey}
      name={text}
      active={active}
      size={size}
      className={className}
      style={style}
    />
  );
}

export function FXBadge({
  icon = "⬡",
  label,
  rarity = "common",
  className,
}: FXBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        getRarityClass(rarity),
        className
      )}
    >
      <span className="text-sm">{icon}</span>
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function FXTitle({
  text,
  rarity = "common",
  className,
}: FXTitleProps) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em]",
        getRarityClass(rarity),
        className
      )}
    >
      {text}
    </span>
  );
}

export function FXVipCard({
  title = "VIP Ether",
  subtitle = "Accès prestige",
  badge = "✦",
  className,
}: FXVipCardProps) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[24px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-black/40 to-cyan-500/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            Carte privilège
          </div>
          <div className="mt-2 text-xl font-black text-white">{title}</div>
          <div className="mt-1 text-sm text-white/55">{subtitle}</div>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/15 text-xl text-violet-200">
          {badge}
        </div>
      </div>
    </div>
  );
}

export function EtherFXStyles() {
  return null;
}
