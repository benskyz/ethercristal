export type ShopCategory =
  | "particles"
  | "frames"
  | "sounds"
  | "stickers"
  | "special"
  | "vip";

export type ShopRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "exclusive";

export type ShopItem = {
  key: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  longDescription?: string;
  price: number;
  oldPrice?: number;
  currency: "credits";
  rarity: ShopRarity;
  category: ShopCategory;

  enabled: boolean;
  featured?: boolean;
  isNew?: boolean;
  vipOnly?: boolean;

  preview?: {
    image?: string;
    video?: string;
    sound?: string;
    gradient?: string;
    icon?: string;
  };

  ui?: {
    badge?: string;
    glow?: string;
    accent?: string;
  };

  equip?: {
    autoEquipOnBuy?: boolean;
    stackable?: boolean;
    exclusiveGroup?: string;
    maxEquipped?: number;
  };

  tags?: string[];
};

export const SHOP_CATEGORIES: {
  key: ShopCategory;
  label: string;
  description: string;
}[] = [
  {
    key: "particles",
    label: "Particules",
    description: "Effets visuels atmosphériques autour de la webcam",
  },
  {
    key: "frames",
    label: "Cadres",
    description: "Contours premium et bordures animées",
  },
  {
    key: "sounds",
    label: "Sons",
    description: "Effets audio activables dans les salons",
  },
  {
    key: "stickers",
    label: "Stickers",
    description: "Overlays décoratifs et visuels flottants",
  },
  {
    key: "special",
    label: "Spéciaux",
    description: "Effets rares et impacts visuels puissants",
  },
  {
    key: "vip",
    label: "VIP",
    description: "Contenu exclusif réservé aux membres premium",
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    key: "rose-particles",
    slug: "rose-particles",
    name: "Rose Particles",
    shortName: "Rose",
    description: "Nuage de particules rosées autour de la webcam.",
    longDescription:
      "Ajoute une pluie légère de particules roses avec un rendu doux, glamour et immersif.",
    price: 120,
    currency: "credits",
    rarity: "rare",
    category: "particles",
    enabled: true,
    featured: true,
    isNew: true,
    preview: {
      gradient: "from-pink-500/30 via-fuchsia-500/20 to-rose-500/30",
      icon: "sparkles",
    },
    ui: {
      badge: "Tendance",
      glow: "shadow-pink-500/25",
      accent: "text-pink-300",
    },
    equip: {
      autoEquipOnBuy: true,
      stackable: true,
      exclusiveGroup: "particles",
      maxEquipped: 2,
    },
    tags: ["rose", "romantique", "glamour", "webcam"],
  },
  {
    key: "diamond-rain",
    slug: "diamond-rain",
    name: "Diamond Rain",
    shortName: "Diamond Rain",
    description: "Pluie de diamants brillants en overlay.",
    longDescription:
      "Fait tomber des éclats cristallins lumineux autour de la scène avec un rendu premium.",
    price: 260,
    oldPrice: 320,
    currency: "credits",
    rarity: "epic",
    category: "particles",
    enabled: true,
    featured: true,
    preview: {
      gradient: "from-cyan-400/30 via-sky-400/20 to-blue-500/30",
      icon: "gem",
    },
    ui: {
      badge: "Premium",
      glow: "shadow-cyan-500/25",
      accent: "text-cyan-300",
    },
    equip: {
      autoEquipOnBuy: false,
      stackable: false,
      exclusiveGroup: "particles",
      maxEquipped: 1,
    },
    tags: ["diamant", "cristal", "luxe", "pluie"],
  },
  {
    key: "neon-aura",
    slug: "neon-aura",
    name: "Neon Aura",
    shortName: "Aura",
    description: "Halo néon animé autour de la caméra.",
    longDescription:
      "Crée une aura lumineuse pulsante qui donne un style cyber et magnétique à la webcam.",
    price: 200,
    currency: "credits",
    rarity: "rare",
    category: "frames",
    enabled: true,
    featured: true,
    preview: {
      gradient: "from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30",
      icon: "zap",
    },
    ui: {
      badge: "Glow",
      glow: "shadow-violet-500/25",
      accent: "text-violet-300",
    },
    equip: {
      autoEquipOnBuy: true,
      stackable: false,
      exclusiveGroup: "frame",
      maxEquipped: 1,
    },
    tags: ["néon", "halo", "cyber", "glow"],
  },
  {
    key: "gold-frame",
    slug: "gold-frame",
    name: "Golden Frame",
    shortName: "Gold Frame",
    description: "Cadre doré premium autour du stream.",
    longDescription:
      "Encadrement brillant avec finition or luxueuse pour mettre la webcam en valeur.",
    price: 180,
    currency: "credits",
    rarity: "rare",
    category: "frames",
    enabled: true,
    preview: {
      gradient: "from-amber-500/30 via-yellow-400/20 to-orange-500/30",
      icon: "crown",
    },
    ui: {
      badge: "Luxe",
      glow: "shadow-amber-500/25",
      accent: "text-amber-300",
    },
    equip: {
      autoEquipOnBuy: false,
      stackable: false,
      exclusiveGroup: "frame",
      maxEquipped: 1,
    },
    tags: ["or", "premium", "cadre", "luxe"],
  },
  {
    key: "kiss-stickers",
    slug: "kiss-stickers",
    name: "Kiss Stickers",
    shortName: "Kiss",
    description: "Petits overlays de bisous animés.",
    longDescription:
      "Ajoute des stickers flottants en forme de lèvres et de cœurs pour un rendu joueur et séducteur.",
    price: 90,
    currency: "credits",
    rarity: "common",
    category: "stickers",
    enabled: true,
    isNew: true,
    preview: {
      gradient: "from-rose-500/30 via-red-400/20 to-pink-500/30",
      icon: "heart",
    },
    ui: {
      badge: "Fun",
      glow: "shadow-rose-500/20",
      accent: "text-rose-300",
    },
    equip: {
      autoEquipOnBuy: true,
      stackable: true,
      exclusiveGroup: "stickers",
      maxEquipped: 3,
    },
    tags: ["kiss", "bisou", "coeur", "overlay"],
  },
  {
    key: "thunder-burst",
    slug: "thunder-burst",
    name: "Thunder Burst",
    shortName: "Thunder",
    description: "Flash électrique avec impact visuel intense.",
    longDescription:
      "Déclenche un effet d’explosion électrique spectaculaire pour donner du caractère à la scène.",
    price: 320,
    currency: "credits",
    rarity: "legendary",
    category: "special",
    enabled: true,
    featured: true,
    preview: {
      gradient: "from-blue-500/30 via-indigo-500/20 to-cyan-400/30",
      icon: "bolt",
    },
    ui: {
      badge: "Légendaire",
      glow: "shadow-blue-500/30",
      accent: "text-blue-300",
    },
    equip: {
      autoEquipOnBuy: false,
      stackable: false,
      exclusiveGroup: "special",
      maxEquipped: 1,
    },
    tags: ["éclair", "énergie", "burst", "impact"],
  },
  {
    key: "moan-pack",
    slug: "moan-pack",
    name: "Moan Pack",
    shortName: "Moan Pack",
    description: "Pack de sons déclenchables dans le salon.",
    longDescription:
      "Ajoute plusieurs effets sonores courts activables depuis les contrôles de la salle.",
    price: 150,
    currency: "credits",
    rarity: "rare",
    category: "sounds",
    enabled: true,
    preview: {
      gradient: "from-fuchsia-500/30 via-pink-500/20 to-purple-500/30",
      icon: "volume-2",
      sound: "/sounds/moan.mp3",
    },
    ui: {
      badge: "Audio",
      glow: "shadow-fuchsia-500/25",
      accent: "text-fuchsia-300",
    },
    equip: {
      autoEquipOnBuy: false,
      stackable: true,
      exclusiveGroup: "sounds",
      maxEquipped: 5,
    },
    tags: ["son", "audio", "pack", "reaction"],
  },
  {
    key: "vip-halo",
    slug: "vip-halo",
    name: "VIP Halo",
    shortName: "VIP Halo",
    description: "Halo exclusif pour comptes VIP.",
    longDescription:
      "Effet distinctif réservé aux profils premium avec signature visuelle haut de gamme.",
    price: 500,
    currency: "credits",
    rarity: "exclusive",
    category: "vip",
    enabled: true,
    featured: true,
    vipOnly: true,
    preview: {
      gradient: "from-yellow-400/30 via-amber-400/20 to-pink-500/30",
      icon: "star",
    },
    ui: {
      badge: "VIP",
      glow: "shadow-yellow-500/30",
      accent: "text-yellow-300",
    },
    equip: {
      autoEquipOnBuy: true,
      stackable: false,
      exclusiveGroup: "vip",
      maxEquipped: 1,
    },
    tags: ["vip", "halo", "exclusive", "premium"],
  },
];

export const RARITY_ORDER: ShopRarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "exclusive",
];

export function getAllShopItems() {
  return SHOP_ITEMS.filter((item) => item.enabled);
}

export function getFeaturedShopItems() {
  return getAllShopItems().filter((item) => item.featured);
}

export function getNewShopItems() {
  return getAllShopItems().filter((item) => item.isNew);
}

export function getShopItemByKey(key: string) {
  return SHOP_ITEMS.find((item) => item.key === key);
}

export function getShopItemBySlug(slug: string) {
  return SHOP_ITEMS.find((item) => item.slug === slug);
}

export function getItemsByCategory(category: ShopCategory) {
  return getAllShopItems().filter((item) => item.category === category);
}

export function getItemsByRarity(rarity: ShopRarity) {
  return getAllShopItems().filter((item) => item.rarity === rarity);
}

export function searchShopItems(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return getAllShopItems();

  return getAllShopItems().filter((item) => {
    const haystack = [
      item.name,
      item.shortName,
      item.description,
      item.longDescription ?? "",
      item.category,
      item.rarity,
      ...(item.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortShopItems(
  items: ShopItem[],
  sortBy: "featured" | "price-asc" | "price-desc" | "rarity" | "newest" = "featured"
) {
  const copy = [...items];

  if (sortBy === "price-asc") {
    return copy.sort((a, b) => a.price - b.price);
  }

  if (sortBy === "price-desc") {
    return copy.sort((a, b) => b.price - a.price);
  }

  if (sortBy === "rarity") {
    return copy.sort(
      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    );
  }

  if (sortBy === "newest") {
    return copy.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  }

  return copy.sort((a, b) => {
    const featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featuredDelta !== 0) return featuredDelta;

    const rarityDelta =
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if (rarityDelta !== 0) return rarityDelta;

    return a.price - b.price;
  });
}

export function getRarityLabel(rarity: ShopRarity) {
  switch (rarity) {
    case "common":
      return "Commun";
    case "rare":
      return "Rare";
    case "epic":
      return "Épique";
    case "legendary":
      return "Légendaire";
    case "exclusive":
      return "Exclusif";
    default:
      return rarity;
  }
}

export function getRarityClasses(rarity: ShopRarity) {
  switch (rarity) {
    case "common":
      return "border-white/10 bg-white/5 text-white";
    case "rare":
      return "border-sky-400/30 bg-sky-400/10 text-sky-300";
    case "epic":
      return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
    case "legendary":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "exclusive":
      return "border-yellow-300/40 bg-yellow-300/10 text-yellow-200";
    default:
      return "border-white/10 bg-white/5 text-white";
  }
}

export function getCategoryLabel(category: ShopCategory) {
  switch (category) {
    case "particles":
      return "Particules";
    case "frames":
      return "Cadres";
    case "sounds":
      return "Sons";
    case "stickers":
      return "Stickers";
    case "special":
      return "Spéciaux";
    case "vip":
      return "VIP";
    default:
      return category;
  }
}

export function canEquipTogether(
  currentEquippedKeys: string[],
  nextItemKey: string
) {
  const nextItem = getShopItemByKey(nextItemKey);
  if (!nextItem) return false;

  const equippedItems = currentEquippedKeys
    .map(getShopItemByKey)
    .filter(Boolean) as ShopItem[];

  const exclusiveGroup = nextItem.equip?.exclusiveGroup;
  const maxEquipped = nextItem.equip?.maxEquipped ?? 1;

  if (!exclusiveGroup) return true;

  const sameGroupEquipped = equippedItems.filter(
    (item) => item.equip?.exclusiveGroup === exclusiveGroup
  );

  return sameGroupEquipped.length < maxEquipped;
}

export function getConflictingEquippedItems(
  currentEquippedKeys: string[],
  nextItemKey: string
) {
  const nextItem = getShopItemByKey(nextItemKey);
  if (!nextItem?.equip?.exclusiveGroup) return [];

  const equippedItems = currentEquippedKeys
    .map(getShopItemByKey)
    .filter(Boolean) as ShopItem[];

  return equippedItems.filter(
    (item) => item.equip?.exclusiveGroup === nextItem.equip?.exclusiveGroup
  );
}

export function isOwned(itemKey: string, ownedKeys: string[]) {
  return ownedKeys.includes(itemKey);
}

export function isEquipped(itemKey: string, equippedKeys: string[]) {
  return equippedKeys.includes(itemKey);
}

export function getDiscountPercent(item: ShopItem) {
  if (!item.oldPrice || item.oldPrice <= item.price) return 0;
  return Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100);
}
