"use client";

import type { ReactNode } from "react";
import {
  Crown,
  Gem,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

export type FXVariant =
  | "ether"
  | "crystal"
  | "ruby"
  | "void"
  | "ember"
  | "obsidian"
  | "blackdiamond";

export type VIPGrade =
  | "vip"
  | "ruby_vip"
  | "crystal_vip"
  | "obsidian_vip"
  | "black_diamond"
  | "ether_elite"
  | "god_mode";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeVariant(variant?: string | null): FXVariant {
  const raw = String(variant || "").toLowerCase();

  if (raw.includes("crystal") || raw.includes("diamond frost")) return "crystal";
  if (raw.includes("ruby")) return "ruby";
  if (raw.includes("void")) return "void";
  if (raw.includes("ember") || raw.includes("inferno") || raw.includes("flame")) return "ember";
  if (raw.includes("obsidian") || raw.includes("shadow")) return "obsidian";
  if (raw.includes("black") && raw.includes("diamond")) return "blackdiamond";

  return "ether";
}

export function fxVariantFromKey(key?: string | null) {
  return normalizeVariant(key);
}

function variantTextClass(variant: FXVariant) {
  switch (variant) {
    case "crystal":
      return "ecfx-text-crystal";
    case "ruby":
      return "ecfx-text-ruby";
    case "void":
      return "ecfx-text-void";
    case "ember":
      return "ecfx-text-ember";
    case "obsidian":
      return "ecfx-text-obsidian";
    case "blackdiamond":
      return "ecfx-text-blackdiamond";
    default:
      return "ecfx-text-ether";
  }
}

function variantBadgeClass(variant: FXVariant) {
  switch (variant) {
    case "crystal":
      return "border-cyan-300/20 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_rgba(125,211,252,0.16)]";
    case "ruby":
      return "border-rose-300/20 bg-rose-500/10 text-rose-100 shadow-[0_0_24px_rgba(251,113,133,0.16)]";
    case "void":
      return "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.18)]";
    case "ember":
      return "border-orange-300/20 bg-orange-500/10 text-orange-100 shadow-[0_0_24px_rgba(251,146,60,0.16)]";
    case "obsidian":
      return "border-red-400/20 bg-red-950/30 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.16)]";
    case "blackdiamond":
      return "border-slate-200/15 bg-slate-500/10 text-slate-100 shadow-[0_0_24px_rgba(255,255,255,0.12)]";
    default:
      return "border-white/10 bg-white/[0.04] text-white/80 shadow-[0_0_22px_rgba(255,255,255,0.06)]";
  }
}

function gradeMeta(grade: VIPGrade) {
  switch (grade) {
    case "ruby_vip":
      return {
        label: "Ruby VIP",
        variant: "ruby" as FXVariant,
        icon: <Gem className="h-3.5 w-3.5" />,
      };
    case "crystal_vip":
      return {
        label: "Crystal VIP",
        variant: "crystal" as FXVariant,
        icon: <Sparkles className="h-3.5 w-3.5" />,
      };
    case "obsidian_vip":
      return {
        label: "Obsidian VIP",
        variant: "obsidian" as FXVariant,
        icon: <Star className="h-3.5 w-3.5" />,
      };
    case "black_diamond":
      return {
        label: "Black Diamond",
        variant: "blackdiamond" as FXVariant,
        icon: <Gem className="h-3.5 w-3.5" />,
      };
    case "ether_elite":
      return {
        label: "Ether Elite",
        variant: "void" as FXVariant,
        icon: <Zap className="h-3.5 w-3.5" />,
      };
    case "god_mode":
      return {
        label: "God Mode",
        variant: "ember" as FXVariant,
        icon: <Shield className="h-3.5 w-3.5" />,
      };
    default:
      return {
        label: "VIP",
        variant: "ether" as FXVariant,
        icon: <Crown className="h-3.5 w-3.5" />,
      };
  }
}

export function EtherFXStyles() {
  return (
    <style jsx global>{`
      .ecfx-text-ether,
      .ecfx-text-crystal,
      .ecfx-text-ruby,
      .ecfx-text-void,
      .ecfx-text-ember,
      .ecfx-text-obsidian,
      .ecfx-text-blackdiamond {
        background-size: 220% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: ecfxShimmer 4.6s linear infinite;
        will-change: background-position, filter;
      }

      .ecfx-text-ether {
        background-image: linear-gradient(90deg, #ffffff, #ffb4cf, #ffffff);
        text-shadow: 0 0 22px rgba(255, 110, 170, 0.14);
      }

      .ecfx-text-crystal {
        background-image: linear-gradient(90deg, #ffffff, #c4f1ff, #dbeafe, #ffffff);
        text-shadow: 0 0 24px rgba(125, 211, 252, 0.18);
      }

      .ecfx-text-ruby {
        background-image: linear-gradient(90deg, #fff1f2, #fb7185, #f43f5e, #fff1f2);
        text-shadow: 0 0 24px rgba(244, 63, 94, 0.2);
      }

      .ecfx-text-void {
        background-image: linear-gradient(90deg, #fdf4ff, #f0abfc, #a855f7, #fdf4ff);
        text-shadow: 0 0 24px rgba(192, 38, 211, 0.18);
      }

      .ecfx-text-ember {
        background-image: linear-gradient(90deg, #fff7ed, #fb923c, #ef4444, #fff7ed);
        text-shadow: 0 0 24px rgba(239, 68, 68, 0.18);
      }

      .ecfx-text-obsidian {
        background-image: linear-gradient(90deg, #ffffff, #fca5a5, #991b1b, #ffffff);
        text-shadow: 0 0 22px rgba(248, 113, 113, 0.16);
      }

      .ecfx-text-blackdiamond {
        background-image: linear-gradient(90deg, #ffffff, #cbd5e1, #64748b, #ffffff);
        text-shadow: 0 0 24px rgba(226, 232, 240, 0.14);
      }

      .ecfx-preview {
        position: relative;
        overflow: hidden;
        border-radius: 28px;
        min-height: 220px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(135deg, rgba(10,10,14,0.95), rgba(18,8,14,0.92));
      }

      .ecfx-preview::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0 1px, transparent 1px),
          radial-gradient(circle at 78% 30%, rgba(255,255,255,0.12) 0 1px, transparent 1px),
          radial-gradient(circle at 42% 78%, rgba(255,255,255,0.08) 0 1px, transparent 1px);
        background-size: 44px 44px, 56px 56px, 60px 60px;
        opacity: 0.12;
        pointer-events: none;
      }

      .ecfx-preview-glow {
        position: absolute;
        inset: -18%;
        filter: blur(44px);
        opacity: 0.92;
      }

      .ecfx-preview-particles span {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        opacity: 0.75;
        animation: ecfxFloat 6.5s ease-in-out infinite;
      }

      .ecfx-preview-particles span:nth-child(1) { left: 14%; top: 26%; animation-delay: 0s; }
      .ecfx-preview-particles span:nth-child(2) { left: 82%; top: 22%; animation-delay: 1.1s; }
      .ecfx-preview-particles span:nth-child(3) { left: 28%; top: 74%; animation-delay: 2.3s; }
      .ecfx-preview-particles span:nth-child(4) { left: 72%; top: 72%; animation-delay: 3.6s; }

      .ecfx-preview-ether .ecfx-preview-glow {
        background:
          radial-gradient(circle at 18% 24%, rgba(255,20,90,0.34), transparent 34%),
          radial-gradient(circle at 78% 76%, rgba(192,38,211,0.26), transparent 35%);
      }
      .ecfx-preview-ether .ecfx-preview-particles span {
        background: rgba(255, 112, 170, 0.86);
        box-shadow: 0 0 18px rgba(255, 70, 140, 0.38);
      }

      .ecfx-preview-crystal .ecfx-preview-glow {
        background:
          radial-gradient(circle at 18% 18%, rgba(255,255,255,0.26), transparent 34%),
          radial-gradient(circle at 82% 70%, rgba(34,211,238,0.30), transparent 36%),
          radial-gradient(circle at 62% 28%, rgba(59,130,246,0.18), transparent 30%);
      }
      .ecfx-preview-crystal .ecfx-preview-particles span {
        background: rgba(180, 240, 255, 0.92);
        box-shadow: 0 0 18px rgba(125, 211, 252, 0.48);
      }

      .ecfx-preview-ruby .ecfx-preview-glow {
        background:
          radial-gradient(circle at 18% 22%, rgba(251,113,133,0.32), transparent 34%),
          radial-gradient(circle at 78% 72%, rgba(225,29,72,0.26), transparent 36%);
      }
      .ecfx-preview-ruby .ecfx-preview-particles span {
        background: rgba(251, 113, 133, 0.9);
        box-shadow: 0 0 18px rgba(244, 63, 94, 0.44);
      }

      .ecfx-preview-void .ecfx-preview-glow {
        background:
          radial-gradient(circle at 22% 24%, rgba(217,70,239,0.28), transparent 34%),
          radial-gradient(circle at 78% 76%, rgba(88,28,135,0.34), transparent 36%),
          radial-gradient(circle at 64% 24%, rgba(236,72,153,0.16), transparent 28%);
      }
      .ecfx-preview-void .ecfx-preview-particles span {
        background: rgba(240, 171, 252, 0.88);
        box-shadow: 0 0 18px rgba(217, 70, 239, 0.46);
      }

      .ecfx-preview-ember .ecfx-preview-glow {
        background:
          radial-gradient(circle at 20% 24%, rgba(251,146,60,0.28), transparent 34%),
          radial-gradient(circle at 76% 74%, rgba(239,68,68,0.32), transparent 36%);
      }
      .ecfx-preview-ember .ecfx-preview-particles span {
        background: rgba(255, 167, 72, 0.92);
        box-shadow: 0 0 18px rgba(251, 146, 60, 0.42);
        animation-name: ecfxEmberFloat;
      }

      .ecfx-preview-obsidian .ecfx-preview-glow {
        background:
          radial-gradient(circle at 22% 24%, rgba(127,29,29,0.36), transparent 36%),
          radial-gradient(circle at 74% 76%, rgba(190,24,93,0.18), transparent 30%);
      }
      .ecfx-preview-obsidian .ecfx-preview-particles span {
        background: rgba(255, 90, 120, 0.78);
        box-shadow: 0 0 18px rgba(190, 24, 93, 0.4);
      }

      .ecfx-preview-blackdiamond .ecfx-preview-glow {
        background:
          radial-gradient(circle at 20% 22%, rgba(226,232,240,0.18), transparent 30%),
          radial-gradient(circle at 80% 76%, rgba(71,85,105,0.28), transparent 34%);
      }
      .ecfx-preview-blackdiamond .ecfx-preview-particles span {
        background: rgba(226, 232, 240, 0.78);
        box-shadow: 0 0 18px rgba(203, 213, 225, 0.32);
      }

      @keyframes ecfxShimmer {
        0% { background-position: 0% center; }
        100% { background-position: 220% center; }
      }

      @keyframes ecfxFloat {
        0%, 100% {
          transform: translateY(0px) scale(1);
          opacity: 0.45;
        }
        50% {
          transform: translateY(-12px) scale(1.18);
          opacity: 0.98;
        }
      }

      @keyframes ecfxEmberFloat {
        0%, 100% {
          transform: translateY(0px) scale(0.95);
          opacity: 0.44;
        }
        50% {
          transform: translateY(-18px) scale(1.24);
          opacity: 1;
        }
      }
    `}</style>
  );
}

export function FXName({
  text,
  variant = "ether",
  size = "lg",
  className,
}: {
  text: string;
  variant?: FXVariant | string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const v = normalizeVariant(variant);

  const sizeClass =
    size === "sm"
      ? "text-sm"
      : size === "md"
      ? "text-lg"
      : size === "xl"
      ? "text-4xl"
      : "text-2xl";

  return (
    <span
      className={cx(
        "font-black tracking-[-0.03em]",
        sizeClass,
        variantTextClass(v),
        className
      )}
    >
      {text}
    </span>
  );
}

export function FXBadge({
  label,
  variant = "ether",
  icon,
  className,
}: {
  label: string;
  variant?: FXVariant | string;
  icon?: ReactNode;
  className?: string;
}) {
  const v = normalizeVariant(variant);

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]",
        variantBadgeClass(v),
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function FXTitle({
  label,
  variant = "void",
  className,
}: {
  label: string;
  variant?: FXVariant | string;
  className?: string;
}) {
  const v = normalizeVariant(variant);

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        variantBadgeClass(v),
        className
      )}
    >
      {label}
    </span>
  );
}

export function VIPGradeBadge({
  grade,
  className,
}: {
  grade: VIPGrade;
  className?: string;
}) {
  const meta = gradeMeta(grade);

  return (
    <FXBadge
      label={meta.label}
      variant={meta.variant}
      icon={meta.icon}
      className={className}
    />
  );
}

export function FXPreviewCard({
  title,
  subtitle,
  variant = "ether",
  topLeft,
  topRight,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  variant?: FXVariant | string;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const v = normalizeVariant(variant);

  return (
    <div className={cx("ecfx-preview", `ecfx-preview-${v}`, className)}>
      <div className="ecfx-preview-glow" />
      <div className="ecfx-preview-particles">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>{topLeft}</div>
          <div>{topRight}</div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/34">
            preview
          </div>
          <FXName text={title} variant={v} size="xl" />
          {subtitle ? (
            <div className="text-xs font-black uppercase tracking-[0.20em] text-white/72">
              {subtitle}
            </div>
          ) : null}
        </div>

        {footer ? <div>{footer}</div> : <div />}
      </div>
    </div>
  );
}

export function FXProductCard({
  title,
  description,
  price,
  variant = "ether",
  rarity,
  slot,
  locked,
  owned,
  vip,
  buttonLabel = "Acheter",
  onClick,
  busy = false,
}: {
  title: string;
  description: string;
  price: string;
  variant?: FXVariant | string;
  rarity?: string;
  slot?: string;
  locked?: boolean;
  owned?: boolean;
  vip?: boolean;
  buttonLabel?: string;
  busy?: boolean;
  onClick?: () => void;
}) {
  const v = normalizeVariant(variant);

  return (
    <div className="group overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0b0b10] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-1 hover:border-red-400/18">
      <FXPreviewCard
        title="ETHERCRISTAL"
        subtitle={title}
        variant={v}
        topLeft={
          <div className="flex flex-wrap gap-2">
            {rarity ? <FXBadge label={rarity} variant={v} /> : null}
            {slot ? <FXBadge label={slot} variant="ether" /> : null}
          </div>
        }
        topRight={
          vip ? (
            <FXBadge
              label="VIP"
              variant="obsidian"
              icon={<Crown className="h-3.5 w-3.5" />}
            />
          ) : null
        }
      />

      <div className="mt-4">
        <div className="text-xl font-black tracking-[-0.02em] text-white">{title}</div>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/58">{description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {owned ? (
            <FXBadge
              label="Possédé"
              variant="crystal"
              icon={<Wand2 className="h-3.5 w-3.5" />}
            />
          ) : null}
          {locked ? (
            <FXBadge
              label="Verrouillé"
              variant="obsidian"
              icon={<Lock className="h-3.5 w-3.5" />}
            />
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-lg font-black text-white">{price}</div>

          <button
            type="button"
            disabled={owned || locked || busy}
            onClick={onClick}
            className={cx(
              "inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50",
              owned
                ? "border-white/10 bg-white/[0.04] text-white/50"
                : "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/16"
            )}
          >
            {busy ? <RefreshInline /> : <ShoppingBagInline />}
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FXVipCard({
  grade,
  title,
  description,
  price,
  perks,
  days,
  busy = false,
  onClick,
}: {
  grade: VIPGrade;
  title: string;
  description: string;
  price: string;
  perks: string;
  days: string;
  busy?: boolean;
  onClick?: () => void;
}) {
  const meta = gradeMeta(grade);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-amber-400/14 bg-[#0b0b10] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.32)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,196,0,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,0,120,0.10),transparent_34%)]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-black tracking-[-0.02em] text-white">{title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <VIPGradeBadge grade={grade} />
              <FXBadge label={days} variant={meta.variant} />
            </div>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white/80">
            {meta.icon}
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/60">{description}</p>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-white/52">
          {perks}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xl font-black text-white">{price}</div>

          <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-[16px] border border-amber-400/18 bg-amber-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/16 disabled:opacity-50"
          >
            {busy ? <RefreshInline /> : <Crown className="h-4 w-4" />}
            Activer
          </button>
        </div>
      </div>
    </div>
  );
}

function RefreshInline() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function ShoppingBagInline() {
  return <ShoppingBagGlyph />;
}

function ShoppingBagGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 8a3 3 0 1 1 6 0" />
    </svg>
  );
}
