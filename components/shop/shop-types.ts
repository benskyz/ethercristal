export type ShopProfile = {
  id: string;
  pseudo: string;
  credits: number;
  is_vip: boolean;
  is_admin: boolean;
  master_title: string;
  active_name_fx_key: string | null;
  active_badge_key: string | null;
  active_title_key: string | null;
};

export type ShopItem = {
  id: string;
  item_key: string;
  title: string;
  description: string;
  price: number;
  category: string;
  rarity: string;
  preview_style: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
};

export type InventoryItem = {
  id: string;
  user_id: string;
  item_key: string;
  item_type: string;
  equipped: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
