"use client";

import { getShopItemByKey } from "@/lib/shop";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export type DisplayProfile = {
  pseudo?: string | null;
  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;
  master_title?: string | null;
  master_title_style?: string | null;
  is_admin?: boolean | null;
  role?: string | null;
};

export default function ProfileName({
  profile,
  size = "md",
  showTitle = true,
}: {
  profile: DisplayProfile;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
}) {
  const pseudo = profile.pseudo || "Membre";

  const nameFx = profile.active_name_fx_key ? getShopItemByKey(profile.active_name_fx_key) : null;
  const badge = profile.active_badge_key ? getShopItemByKey(profile.active_badge_key) : null;
  const title = profile.active_title_key ? getShopItemByKey(profile.active_title_key) : null;

  const isAdmin = Boolean(profile.is_admin || profile.role === "admin");
  const masterTitle = isAdmin ? profile.master_title : null;
  const masterStyle = isAdmin ? profile.master_title_style : null;

  const nameClass =
    nameFx?.category === "name_fx" ? nameFx.previewClass : "";
  const badgeClass =
    badge?.category === "badge" ? badge.badgeClass : "";
  const badgeIcon = badge?.meta?.icon as string | undefined;

  const titleText =
    (isAdmin && masterTitle) ? masterTitle : (title?.category === "title" ? title.titleText : null);

  const titleStyle =
    (isAdmin && masterTitle && masterStyle) ? masterStyle : "text-white/55";

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cx("font-black truncate", sizes[size], nameClass || "text-white")}>
          {pseudo}
        </span>

        {badgeClass ? (
          <span className={badgeClass}>
            {badgeIcon ? <span className="text-[12px]">{badgeIcon}</span> : null}
            <span className="uppercase tracking-[0.14em]">{badge?.name?.replace("Badge ", "")}</span>
          </span>
        ) : null}
      </div>

      {showTitle && titleText ? (
        <div className={cx("mt-0.5 text-[11px] font-bold tracking-[0.22em] uppercase", titleStyle)}>
          {titleText}
        </div>
      ) : null}
    </div>
  );
}
