import { CSSProperties } from "react";
import {
  InventoryRow,
  ProfileRow,
  ShopCategory,
  ShopItem,
  ShopRarity,
  ShopScope,
  SortMode,
} from "./shop-types";

export const FALLBACK_ITEMS: ShopItem[] = [
  {
    id: "vip-pass",
    slug: "vip-pass",
    title: "Pass VIP",
    description:
      "Accès premium, filtres exclusifs, visibilité renforcée et avantages réservés aux membres privilégiés.",
    price_usd: 19.99,
    category: "vip",
    badge: "Premium",
    metadata: {
      scope: "global",
      unique: true,
      target: "vip",
      rarity: "epic",
      preview_variant: "vip-pass",
      affects: ["profil", "désir", "salons"],
    },
  },
  {
    id: "desir-boost",
    slug: "desir-boost",
    title: "Boost Désir",
    description:
      "Ajoute une aura rouge sensuelle à ton nom et accentue ta présence dans DésirIntense.",
    price_ether: 40,
    category: "effect",
    badge: "Hot",
    metadata: {
      scope: "desir",
      unique: true,
      target: "name_fx",
      rarity: "rare",
      preview_variant: "desir-boost",
      affects: ["nom", "désir"],
    },
  },
  {
    id: "gold-frame",
    slug: "gold-frame",
    title: "Cadre Gold",
    description:
      "Nom premium doré avec reflet luxueux visible sur le profil, le dashboard et les espaces sociaux.",
    price_ether: 25,
    category: "theme",
    badge: "Gold",
    metadata: {
      scope: "profile",
      unique: true,
      target: "theme",
      rarity: "rare",
      preview_variant: "gold-frame",
      affects: ["profil", "dashboard"],
    },
  },
  {
    id: "midnight-theme",
    slug: "midnight-theme",
    title: "Thème Midnight",
    description:
      "Style sombre, froid et plus mystérieux pour une identité plus chic et plus sérieuse.",
    price_ether: 30,
    category: "theme",
    badge: "Dark",
    metadata: {
      scope: "profile",
      unique: true,
      target: "theme",
      rarity: "rare",
      preview_variant: "midnight-theme",
      affects: ["profil", "dashboard"],
    },
  },
  {
    id: "cristal-pack",
    slug: "cristal-pack",
    title: "Pack Cristal",
    description:
      "Bundle haut de gamme avec glow, thème rare et rendu visuel premium sur l’ensemble du compte.",
    price_usd: 29.99,
    category: "bundle",
    badge: "Bundle",
    metadata: {
      scope: "global",
      unique: true,
      target: "bundle",
      rarity: "legendary",
      preview_variant: "cristal-pack",
      affects: ["profil", "désir", "salons", "rooms"],
    },
  },
  {
    id: "match-priority",
    slug: "match-priority",
    title: "Priorité Match",
    description:
      "Accentue ton identité premium et renforce l’impression visuelle liée à DésirIntense.",
    price_ether: 60,
    category: "effect",
    badge: "Fast",
    metadata: {
      scope: "desir",
      unique: true,
      target: "priority",
      rarity: "epic",
      preview_variant: "match-priority",
      affects: ["désir", "nom"],
    },
  },
  {
    id: "salon-flare",
    slug: "salon-flare",
    title: "Salon Flare",
    description:
      "Effet premium pensé pour les salons webcam avec présence visuelle plus chaude et plus visible.",
    price_ether: 35,
    category: "effect",
    badge: "Salons",
    metadata: {
      scope: "salons",
      unique: true,
      target: "salon_fx",
      rarity: "rare",
      preview_variant: "salon-flare",
      affects: ["salons", "nom"],
    },
  },
  {
    id: "room-glow",
    slug: "room-glow",
    title: "Room Glow",
    description:
      "Accent lumineux premium pour les salles webcam avec rendu plus net dans les rooms.",
    price_ether: 45,
    category: "effect",
    badge: "Cam",
    metadata: {
      scope: "rooms",
      unique: true,
      target: "room_fx",
      rarity: "rare",
      preview_variant: "room-glow",
      affects: ["rooms", "cam"],
    },
  },
  {
    id: "velvet-signal",
    slug: "velvet-signal",
    title: "Velvet Signal",
    description:
      "Signature visuelle plus chaude et plus sensuelle, idéale pour le profil et les salons.",
    price_ether: 55,
    category: "effect",
    badge: "Velvet",
    metadata: {
      scope: "salons",
      unique: true,
      target: "salon_fx",
      rarity: "epic",
      preview_variant: "velvet-signal",
      affects: ["profil", "salons"],
    },
  },
  {
    id: "diamond-vault",
    slug: "diamond-vault",
    title: "Diamond Vault",
    description:
      "Effet premium très rare avec rendu cristal, éclat vif et présence plus noble partout.",
    price_usd: 49.99,
    category: "bundle",
    badge: "Diamond",
    metadata: {
      scope: "global",
      unique: true,
      target: "bundle",
      rarity: "legendary",
      preview_variant: "diamond-vault",
      affects: ["profil", "désir", "salons", "rooms"],
    },
  },
];

export function getPreviewName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

export function getPreviewNameStyle(profile: ProfileRow | null): CSSProperties {
  if (!profile) {
    return {
      color: "#fff6d6",
      textShadow: "0 0 16px rgba(212,175,55,0.14)",
    };
  }

  if (profile.display_name_gradient) {
    return {
      background: profile.display_name_gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: profile.display_name_glow
        ? `0 0 18px ${profile.display_name_glow}`
        : "0 0 16px rgba(212,175,55,0.14)",
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 18px ${profile.display_name_glow}`
      : "0 0 16px rgba(212,175,55,0.14)",
  };
}

export function getThemeLabel(theme?: string | null) {
  const value = String(theme || "gold").toLowerCase();
  if (value === "dark") return "Dark";
  if (value === "velvet") return "Velvet";
  return "Gold";
}

export function getScopeLabel(scope?: ShopScope) {
  if (scope === "desir") return "DésirIntense";
  if (scope === "salons") return "Salons";
  if (scope === "rooms") return "Salles webcam";
  if (scope === "profile") return "Profil";
  return "Global";
}

export function getRarityLabel(rarity?: ShopRarity) {
  if (rarity === "legendary") return "Légendaire";
  if (rarity === "epic") return "Épique";
  if (rarity === "rare") return "Rare";
  return "Standard";
}

export function getRarityClass(rarity?: ShopRarity) {
  if (rarity === "legendary") return "legendary";
  if (rarity === "epic") return "epic";
  if (rarity === "rare") return "rare";
  return "common";
}

export function itemTheme(category: ShopCategory) {
  if (category === "vip") return "vip";
  if (category === "effect") return "effect";
  if (category === "theme") return "theme";
  return "bundle";
}

export function buildEffectTitleStyle(item: ShopItem): CSSProperties {
  switch (item.slug) {
    case "gold-frame":
      return {
        background:
          "linear-gradient(90deg,#fff5c4 0%,#d4af37 42%,#fff0a8 78%,#b8871b 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 0 18px rgba(212,175,55,0.28)",
      };
    case "midnight-theme":
      return { color: "#d9e4ff", textShadow: "0 0 18px rgba(80,110,255,0.28)" };
    case "desir-boost":
      return { color: "#ffd6de", textShadow: "0 0 18px rgba(255,47,67,0.32)" };
    case "match-priority":
      return { color: "#fff1c4", textShadow: "0 0 18px rgba(255,140,60,0.28)" };
    case "cristal-pack":
      return {
        background:
          "linear-gradient(90deg,#fff5c4 0%,#d4af37 30%,#c86bff 60%,#8b5cf6 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 0 18px rgba(200,107,255,0.28)",
      };
    case "salon-flare":
      return { color: "#ffe3a8", textShadow: "0 0 18px rgba(255,200,90,0.30)" };
    case "room-glow":
      return { color: "#d6f1ff", textShadow: "0 0 18px rgba(90,190,255,0.30)" };
    case "vip-pass":
      return { color: "#f7e8bf", textShadow: "0 0 18px rgba(212,175,55,0.26)" };
    case "velvet-signal":
      return { color: "#ffd6f1", textShadow: "0 0 18px rgba(216,88,152,0.30)" };
    case "diamond-vault":
      return {
        background:
          "linear-gradient(90deg,#f8f5ff 0%,#d4af37 25%,#9edfff 55%,#c86bff 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 0 20px rgba(160,210,255,0.28)",
      };
    default:
      return { color: "#fff6d6" };
  }
}

export function buildMiniPreviewStyle(item: ShopItem): CSSProperties {
  switch (item.slug) {
    case "gold-frame":
      return {
        background:
          "linear-gradient(90deg,#fff5c4 0%,#d4af37 42%,#fff0a8 78%,#b8871b 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      };
    case "midnight-theme":
      return { color: "#d9e4ff" };
    case "desir-boost":
      return { color: "#ffd6de" };
    case "match-priority":
      return { color: "#fff1c4" };
    case "cristal-pack":
      return {
        background:
          "linear-gradient(90deg,#fff5c4 0%,#d4af37 30%,#c86bff 60%,#8b5cf6 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      };
    case "salon-flare":
      return { color: "#ffe3a8" };
    case "room-glow":
      return { color: "#d6f1ff" };
    case "velvet-signal":
      return { color: "#ffd6f1" };
    case "diamond-vault":
      return {
        background:
          "linear-gradient(90deg,#f8f5ff 0%,#d4af37 25%,#9edfff 55%,#c86bff 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      };
    default:
      return { color: "#fff7da" };
  }
}

export function sortItems(items: ShopItem[], mode: SortMode) {
  const next = [...items];

  if (mode === "price_low") {
    next.sort((a, b) => {
      const aValue = a.price_ether ?? a.price_usd ?? 0;
      const bValue = b.price_ether ?? b.price_usd ?? 0;
      return aValue - bValue;
    });
    return next;
  }

  if (mode === "price_high") {
    next.sort((a, b) => {
      const aValue = a.price_ether ?? a.price_usd ?? 0;
      const bValue = b.price_ether ?? b.price_usd ?? 0;
      return bValue - aValue;
    });
    return next;
  }

  if (mode === "rarity") {
    const rank: Record<string, number> = {
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1,
    };

    next.sort((a, b) => {
      const aRank = rank[a.metadata?.rarity || "common"] || 1;
      const bRank = rank[b.metadata?.rarity || "common"] || 1;
      return bRank - aRank;
    });
    return next;
  }

  return next;
}

export function makeOwnedMap(inventory: InventoryRow[]) {
  const map = new Map<string, InventoryRow>();
  inventory.forEach((entry) => {
    map.set(String(entry.item_slug || ""), entry);
  });
  return map;
}
