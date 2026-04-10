import type { ShopProfile, ShopItem } from "./shop-types";

export function getShopDisplayName(profile?: Partial<ShopProfile> | null) {
  return String(profile?.pseudo || "Membre");
}

export function canBuyItem(profile: Partial<ShopProfile> | null, item: ShopItem) {
  const credits = Number(profile?.credits ?? 0);
  return credits >= Number(item.price ?? 0);
}

export function isVipLocked(profile: Partial<ShopProfile> | null, item: ShopItem) {
  const metadata = item.metadata || {};
  const vipRequired = Boolean((metadata as Record<string, unknown>).vipRequired);

  if (!vipRequired) return false;
  if (profile?.is_admin) return false;

  return !profile?.is_vip;
}

export function formatShopPrice(value: number) {
  return `${Number(value || 0).toFixed(2)} Ξ`;
}

export function sortShopItems(items: ShopItem[]) {
  return [...items].sort((a, b) => {
    const rarityOrder = ["common", "rare", "epic", "legendary"];
    const ar = rarityOrder.indexOf((a.rarity || "common").toLowerCase());
    const br = rarityOrder.indexOf((b.rarity || "common").toLowerCase());

    if (ar !== br) return br - ar;
    return Number(a.price ?? 0) - Number(b.price ?? 0);
  });
}
