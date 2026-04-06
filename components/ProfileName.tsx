"use client";

import React, { useMemo } from "react";
import { getShopItemByKey, ShopItem } from "@/lib/shop";

export type DisplayProfile = {
  pseudo?: string | null;

  // role / admin
  is_admin?: boolean | null;
  role?: string | null;

  // active styling keys
  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;

  // master ether fields
  master_title?: string | null;
  master_title_style?: string | null;

  // optional vip fields (used only for fallback display if you want)
  vip_expires_at?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function safeText(v?: string | null, fallback = "") {
  const s = (v ?? "").trim();
  return s.length ? s : fallback;
}

function isAdmin(p?: DisplayProfile | null) {
  return Boolean(p?.is_admin || p?.role === "admin");
}

function iconFromMeta(item?: ShopItem | null) {
  const icon = item?.meta?.icon;
  if (!icon) return null;
  return String(icon);
}

function BadgePill({ className, text }: { className: string; text: string }) {
  return (
    <span className={cx(className, "shrink-0")}>
      {text}
    </span>
  );
}

export default function ProfileName({
  profile,
  size = "md",
  showTitle = true,
  showBadge = true,
  className,
}: {
  profile: DisplayProfile;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
  showBadge?: boolean;
  className?: string;
}) {
  const pseudo = safeText(profile?.pseudo, "Membre");

  const admin = isAdmin(profile);

  const nameFxItem = useMemo(() => {
    const key = profile?.active_name_fx_key ?? null;
    return key ? getShopItemByKey(key) : null;
  }, [profile?.active_name_fx_key]);

  const badgeItem = useMemo(() => {
    const key = profile?.active_badge_key ?? null;
    return key ? getShopItemByKey(key) : null;
  }, [profile?.active_badge_key]);

  const titleItem = useMemo(() => {
    const key = profile?.active_title_key ?? null;
    return key ? getShopItemByKey(key) : null;
  }, [profile?.active_title_key]);

  // Master Ether overrides title if present and admin
  const masterTitle = admin ? safeText(profile?.master_title, "") : "";
  const masterStyle = admin ? safeText(profile?.master_title_style, "") : "";

  const titleText =
    masterTitle ||
    safeText(titleItem?.titleText, "") ||
    safeText(titleItem?.name, "");

  const titleClass =
    masterTitle
      ? (masterStyle || "text-violet-200")
      : "text-white/55";

  const badgeIcon = iconFromMeta(badgeItem);
  const badgeText =
    badgeIcon ? `${badgeIcon} ${badgeItem?.name ?? ""}`.trim() : (badgeItem?.name ?? "");

  const badgeClass =
    badgeItem?.badgeClass ||
    "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-black text-white/75";

  const sizes = {
    sm: { name: "text-base", title: "text-[10px]", wrapGap: "gap-2" },
    md: { name: "text-xl sm:text-2xl", title: "text-[11px]", wrapGap: "gap-2" },
    lg: { name: "text-2xl sm:text-3xl", title: "text-xs", wrapGap: "gap-3" },
  }[size];

  const nameClass =
    nameFxItem?.previewClass ||
    "text-white";

  return (
    <div className={cx("min-w-0", className)}>
      <div className={cx("flex items-center flex-wrap", sizes.wrapGap)}>
        <div className="min-w-0">
          <div className={cx("truncate font-black tracking-tight", sizes.name, nameClass)}>
            {pseudo}
          </div>
        </div>

        {showBadge && badgeItem ? (
          <BadgePill className={badgeClass} text={badgeText} />
        ) : null}

        {admin ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[11px] font-black text-violet-200">
            🜁 Ether
          </span>
        ) : null}
      </div>

      {showTitle && titleText ? (
        <div className={cx("mt-1 uppercase tracking-[0.22em] font-black", sizes.title, titleClass)}>
          {titleText}
        </div>
      ) : null}
    </div>
  );
}
