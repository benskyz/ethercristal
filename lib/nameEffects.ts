import { SHOP } from "@/lib/shop";

export function getNameFxClass(equippedKey: string | null) {
  if (!equippedKey) return "";
  const item = SHOP.find((x) => x.key === equippedKey);
  if (!item || item.category !== "name_fx") return "";
  return item.previewClass || "";
}
