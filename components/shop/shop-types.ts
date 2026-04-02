export type ShopCategory = "vip" | "effect" | "theme" | "bundle";

export type ShopScope = "profile" | "desir" | "salons" | "rooms" | "global";

export type ShopRarity = "common" | "rare" | "epic" | "legendary";

export type ShopItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price_ether?: number | null;
  price_usd?: number | null;
  category: ShopCategory;
  badge?: string | null;
  metadata?: {
    scope?: ShopScope;
    unique?: boolean;
    target?: string;
    rarity?: ShopRarity;
    preview_variant?: string;
    affects?: string[];
  } | null;
};

export type ProfileRow = {
  id: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  ether_balance?: number | null;
  vip_level?: string | null;
  theme_mode?: string | null;
  is_verified?: boolean | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

export type InventoryRow = {
  id: string;
  item_slug?: string | null;
  item_type?: string | null;
  is_active?: boolean | null;
  metadata?: any;
  acquired_at?: string | null;
};

export type BuyRpcResponse = {
  ok?: boolean;
  error?: string;
  item_slug?: string;
  title?: string;
  new_balance?: number;
  purchase_id?: string;
};

export type FilterTab = "all" | "vip" | "effect" | "theme" | "bundle";
export type ScopeFilter = "all" | ShopScope;
export type OwnedFilter = "all" | "owned" | "not_owned" | "equipped";
export type SortMode = "default" | "price_low" | "price_high" | "rarity";
