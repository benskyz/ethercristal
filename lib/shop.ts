export type ShopCategory = "name_fx" | "badge" | "title" | "vip_plan" | "master_ether";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export type ShopItem = {
  key: string;
  category: ShopCategory;
  name: string;
  description: string;
  price: number; // credits (0 for master ether)
  rarity: Rarity;
  vibe: string;

  previewClass?: string; // name_fx and ether preview
  badgeClass?: string; // badge preview
  titleText?: string; // title / ether title text

  requiresMaster?: boolean;
  meta?: Record<string, any>;
};

export const SHOP: ShopItem[] = [
  // ==========================
  // NAME EFFECTS (PUBLIC) — BASE
  // ==========================
  {
    key: "name_crystal_prism",
    category: "name_fx",
    name: "CRISTAL PRISM",
    description: "Reflets prismatiques nets + halo cristal premium.",
    price: 250,
    rarity: "RARE",
    vibe: "Cristal",
    previewClass:
      "bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(90,220,255,0.28)]",
  },
  {
    key: "name_neon_pulse",
    category: "name_fx",
    name: "NEON PULSE",
    description: "Neon lisible + halo doux. Très adulte, très propre.",
    price: 320,
    rarity: "EPIC",
    vibe: "Neon",
    previewClass:
      "text-white drop-shadow-[0_0_16px_rgba(255,60,160,0.45)] [text-shadow:0_0_30px_rgba(255,60,160,0.20)]",
  },
  {
    key: "name_aurora_silk",
    category: "name_fx",
    name: "AURORA SILK",
    description: "Aurora fluide multicolore, doux, très premium.",
    price: 480,
    rarity: "LEGENDARY",
    vibe: "Aurora",
    previewClass:
      "bg-gradient-to-r from-emerald-300 via-cyan-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(120,255,210,0.22)]",
  },
  {
    key: "name_gold_royal",
    category: "name_fx",
    name: "GOLD ROYAL",
    description: "Or royal clean, pas bling cheap. Vibe VIP.",
    price: 520,
    rarity: "LEGENDARY",
    vibe: "Royal",
    previewClass:
      "bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,200,80,0.22)]",
  },
  {
    key: "name_glitch_revenant",
    category: "name_fx",
    name: "GLITCH REVENANT",
    description: "Glitch maîtrisé, readable, dark-tech.",
    price: 620,
    rarity: "MYTHIC",
    vibe: "Glitch",
    previewClass:
      "text-white drop-shadow-[0_0_18px_rgba(120,90,255,0.22)] [text-shadow:-1px_0_0_rgba(255,0,120,0.33),1px_0_0_rgba(0,220,255,0.33),0_0_28px_rgba(120,90,255,0.16)]",
  },
  {
    key: "name_void_obsidian",
    category: "name_fx",
    name: "VOID OBSIDIAN",
    description: "Obsidienne sombre + contour froid. Très ‘void luxe’.",
    price: 420,
    rarity: "EPIC",
    vibe: "Void",
    previewClass:
      "bg-gradient-to-r from-zinc-200 via-white to-zinc-300 bg-clip-text text-transparent [text-shadow:0_0_26px_rgba(0,0,0,0.75)]",
  },
  {
    key: "name_plasma_core",
    category: "name_fx",
    name: "PLASMA CORE",
    description: "Plasma électrique/chaud. Power sans être illisible.",
    price: 760,
    rarity: "MYTHIC",
    vibe: "Plasma",
    previewClass:
      "bg-gradient-to-r from-fuchsia-300 via-amber-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_26px_rgba(255,90,200,0.16)]",
  },
  {
    key: "name_ice_fang",
    category: "name_fx",
    name: "ICE FANG",
    description: "Froid tranchant, net, très lisible.",
    price: 260,
    rarity: "RARE",
    vibe: "Glace",
    previewClass:
      "bg-gradient-to-r from-sky-200 via-white to-sky-200 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(160,220,255,0.20)]",
  },
  {
    key: "name_scarlet_sin",
    category: "name_fx",
    name: "SCARLET SIN",
    description: "Rouge profond + aura chaude. Mature, intense.",
    price: 380,
    rarity: "EPIC",
    vibe: "Scarlet",
    previewClass:
      "bg-gradient-to-r from-rose-300 via-red-200 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,60,90,0.18)]",
  },

  // ==========================
  // NAME EFFECTS (PUBLIC) — MORE
  // ==========================
  {
    key: "name_diamond_dust",
    category: "name_fx",
    name: "DIAMOND DUST",
    description: "Cristal ultra fin, micro halo premium.",
    price: 340,
    rarity: "EPIC",
    vibe: "Cristal",
    previewClass:
      "bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(180,240,255,0.18)]",
  },
  {
    key: "name_crystal_edge",
    category: "name_fx",
    name: "CRYSTAL EDGE",
    description: "Tranchant froid, contour clean.",
    price: 300,
    rarity: "RARE",
    vibe: "Cristal",
    previewClass:
      "bg-gradient-to-r from-slate-100 via-white to-cyan-100 bg-clip-text text-transparent [text-shadow:0_0_26px_rgba(120,220,255,0.16)]",
  },
  {
    key: "name_ice_vein",
    category: "name_fx",
    name: "ICE VEIN",
    description: "Glace veineuse, discret mais chic.",
    price: 360,
    rarity: "EPIC",
    vibe: "Glace",
    previewClass:
      "bg-gradient-to-r from-sky-200 via-white to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(150,220,255,0.20)]",
  },
  {
    key: "name_prism_shard",
    category: "name_fx",
    name: "PRISM SHARD",
    description: "Prisme cassé, reflets contrôlés.",
    price: 520,
    rarity: "LEGENDARY",
    vibe: "Cristal",
    previewClass:
      "bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_26px_rgba(180,120,255,0.16)]",
  },
  {
    key: "name_abyss_ink",
    category: "name_fx",
    name: "ABYSS INK",
    description: "Noir abyssal + contour argent froid.",
    price: 420,
    rarity: "EPIC",
    vibe: "Void",
    previewClass:
      "bg-gradient-to-r from-zinc-200 via-white to-zinc-300 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(0,0,0,0.75)]",
  },
  {
    key: "name_null_halo",
    category: "name_fx",
    name: "NULL HALO",
    description: "Halo minimal, aura froide.",
    price: 280,
    rarity: "RARE",
    vibe: "Void",
    previewClass: "text-white/90 drop-shadow-[0_0_18px_rgba(80,220,255,0.20)]",
  },
  {
    key: "name_obsidian_veil",
    category: "name_fx",
    name: "OBSIDIAN VEIL",
    description: "Voile sombre, luxe discret.",
    price: 500,
    rarity: "LEGENDARY",
    vibe: "Void",
    previewClass:
      "bg-gradient-to-r from-zinc-100 via-white to-zinc-200 bg-clip-text text-transparent [text-shadow:0_0_34px_rgba(0,0,0,0.85)]",
  },
  {
    key: "name_laser_rose",
    category: "name_fx",
    name: "LASER ROSE",
    description: "Neon rose minimal, très lisible.",
    price: 390,
    rarity: "EPIC",
    vibe: "Neon",
    previewClass:
      "text-white drop-shadow-[0_0_18px_rgba(255,70,160,0.38)] [text-shadow:0_0_26px_rgba(255,70,160,0.18)]",
  },
  {
    key: "name_neon_noir",
    category: "name_fx",
    name: "NEON NOIR",
    description: "Neon sombre contrôlé (pas flashy).",
    price: 430,
    rarity: "EPIC",
    vibe: "Neon",
    previewClass:
      "bg-gradient-to-r from-white via-zinc-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(120,90,255,0.18)]",
  },
  {
    key: "name_chromatic_split",
    category: "name_fx",
    name: "CHROMATIC SPLIT",
    description: "Split RGB soft, glitch premium.",
    price: 780,
    rarity: "MYTHIC",
    vibe: "Glitch",
    previewClass:
      "text-white [text-shadow:-1px_0_0_rgba(0,220,255,0.35),1px_0_0_rgba(255,60,160,0.35),0_0_28px_rgba(120,90,255,0.22)]",
  },

  // ==========================
  // BADGES
  // ==========================
  {
    key: "badge_diamond",
    category: "badge",
    name: "Badge Diamant",
    description: "Badge 💎 affiché à côté du nom.",
    price: 300,
    rarity: "EPIC",
    vibe: "Cristal",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-black text-cyan-200",
    meta: { icon: "💎" },
  },
  {
    key: "badge_vip_gold",
    category: "badge",
    name: "Badge Or VIP",
    description: "Badge doré propre + aura légère.",
    price: 420,
    rarity: "LEGENDARY",
    vibe: "VIP",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-200",
    meta: { icon: "👑" },
  },
  {
    key: "badge_void",
    category: "badge",
    name: "Badge Void",
    description: "Badge dark premium discret.",
    price: 260,
    rarity: "RARE",
    vibe: "Void",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-black text-white/70",
    meta: { icon: "⬛" },
  },
  {
    key: "badge_royal",
    category: "badge",
    name: "Badge Royal",
    description: "Badge 👑 royal premium.",
    price: 360,
    rarity: "EPIC",
    vibe: "Royal",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-200",
    meta: { icon: "👑" },
  },
  {
    key: "badge_abyss_sigil",
    category: "badge",
    name: "Badge Abyss",
    description: "Sigil abyssal discret.",
    price: 340,
    rarity: "EPIC",
    vibe: "Void",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-zinc-200/15 bg-black/30 px-2 py-1 text-[11px] font-black text-white/75",
    meta: { icon: "🜂" },
  },
  {
    key: "badge_pulse",
    category: "badge",
    name: "Badge Pulse",
    description: "Badge ⚡ énergie propre.",
    price: 280,
    rarity: "RARE",
    vibe: "Neon",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-black text-fuchsia-200",
    meta: { icon: "⚡" },
  },
  {
    key: "badge_velvet",
    category: "badge",
    name: "Badge Velvet",
    description: "Badge 🥀 velvet.",
    price: 280,
    rarity: "RARE",
    vibe: "Velvet",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] font-black text-rose-200",
    meta: { icon: "🥀" },
  },
  {
    key: "badge_nocturne",
    category: "badge",
    name: "Badge Nocturne",
    description: "Badge 🌙 night vibe.",
    price: 240,
    rarity: "RARE",
    vibe: "Noir",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-black text-white/70",
    meta: { icon: "🌙" },
  },
  {
    key: "badge_verified",
    category: "badge",
    name: "Badge Verified",
    description: "Badge ✅ style vérifié.",
    price: 520,
    rarity: "LEGENDARY",
    vibe: "Premium",
    badgeClass:
      "inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-200",
    meta: { icon: "✅" },
  },

  // ==========================
  // TITLES
  // ==========================
  {
    key: "title_nocturne",
    category: "title",
    name: "Titre: NOCTURNE",
    description: "Titre sous le pseudo, vibe nocturne luxe.",
    price: 240,
    rarity: "RARE",
    vibe: "Noir",
    titleText: "NOCTURNE",
  },
  {
    key: "title_velvet",
    category: "title",
    name: "Titre: VELVET",
    description: "Titre doux mais dangereux.",
    price: 320,
    rarity: "EPIC",
    vibe: "Velvet",
    titleText: "VELVET",
  },
  {
    key: "title_sinister",
    category: "title",
    name: "Titre: SINISTER",
    description: "Titre dark premium.",
    price: 380,
    rarity: "EPIC",
    vibe: "Dark",
    titleText: "SINISTER",
  },
  {
    key: "title_obsidian",
    category: "title",
    name: "Titre: OBSIDIAN",
    description: "Titre sombre, luxe, propre.",
    price: 360,
    rarity: "EPIC",
    vibe: "Void",
    titleText: "OBSIDIAN",
  },
  {
    key: "title_aurora",
    category: "title",
    name: "Titre: AURORA",
    description: "Titre cosmique doux.",
    price: 360,
    rarity: "EPIC",
    vibe: "Aurora",
    titleText: "AURORA",
  },
  {
    key: "title_private_host",
    category: "title",
    name: "Titre: PRIVATE HOST",
    description: "Titre premium discret.",
    price: 520,
    rarity: "LEGENDARY",
    vibe: "Premium",
    titleText: "PRIVATE HOST",
  },
  {
    key: "title_night_shift",
    category: "title",
    name: "Titre: NIGHT SHIFT",
    description: "Titre nocturne moderne.",
    price: 520,
    rarity: "LEGENDARY",
    vibe: "Noir",
    titleText: "NIGHT SHIFT",
  },

  // ==========================
  // VIP PLANS — 7/30/90
  // ==========================
  {
    key: "vip_7d",
    category: "vip_plan",
    name: "VIP 7 jours",
    description: "Test VIP : accès salons VIP + statut.",
    price: 420,
    rarity: "EPIC",
    vibe: "VIP",
    meta: { days: 7, tier: "VIP" },
  },
  {
    key: "vip_30d",
    category: "vip_plan",
    name: "VIP 30 jours",
    description: "Accès VIP + salons VIP.",
    price: 1200,
    rarity: "LEGENDARY",
    vibe: "VIP",
    meta: { days: 30, tier: "VIP" },
  },
  {
    key: "vip_90d",
    category: "vip_plan",
    name: "VIP 90 jours",
    description: "VIP 90 jours — meilleur ratio.",
    price: 3000,
    rarity: "MYTHIC",
    vibe: "VIP",
    meta: { days: 90, tier: "VIP" },
  },

  // ==========================
  // MASTER ETHER (ADMIN ONLY)
  // ==========================
  {
    key: "ether_master_title_dominus",
    category: "master_ether",
    name: "MAÎTRE ETHER — DOMINUS",
    description: "Titre unique réservé au Maître Ether.",
    price: 0,
    rarity: "MYTHIC",
    vibe: "Ether",
    requiresMaster: true,
    titleText: "MAÎTRE ETHER • DOMINUS",
    previewClass:
      "bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(160,120,255,0.22)]",
  },
  {
    key: "ether_master_title_abyssal",
    category: "master_ether",
    name: "MAÎTRE ETHER — ABYSSAL",
    description: "Titre abyssal réservé au Maître Ether.",
    price: 0,
    rarity: "MYTHIC",
    vibe: "Ether",
    requiresMaster: true,
    titleText: "MAÎTRE ETHER • ABYSSAL",
    previewClass:
      "bg-gradient-to-r from-zinc-200 via-white to-cyan-200 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(0,0,0,0.75),0_0_18px_rgba(120,220,255,0.16)]",
  },
];

// Helpers
export function getShopItemByKey(key: string) {
  return SHOP.find((x) => x.key === key) || null;
}
export function getItemsByCategory(cat: ShopCategory) {
  return SHOP.filter((x) => x.category === cat);
}
export function rarityBadgeClass(r: Rarity) {
  const map: Record<Rarity, string> = {
    COMMON: "border-white/10 bg-white/10 text-white/70",
    RARE: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    EPIC: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
    LEGENDARY: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    MYTHIC: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  };
  return map[r];
}

// Compat exports expected by inventaire page
export function getRarityLabel(r: string) {
  const v = String(r || "").toUpperCase();
  if (v === "COMMON") return "Commun";
  if (v === "RARE") return "Rare";
  if (v === "EPIC") return "Épique";
  if (v === "LEGENDARY") return "Légendaire";
  if (v === "MYTHIC") return "Mythique";
  return v || "—";
}
export function getRarityClasses(r: string) {
  const v = String(r || "").toUpperCase();
  if (v === "COMMON") return "border-white/10 bg-white/10 text-white/70";
  if (v === "RARE") return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  if (v === "EPIC") return "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200";
  if (v === "LEGENDARY") return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  if (v === "MYTHIC") return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  return "border-white/10 bg-white/10 text-white/70";
}
export function getCategoryLabel(cat: string) {
  const c = String(cat || "").toLowerCase();
  if (c === "name_fx") return "Effet de nom";
  if (c === "badge") return "Badge";
  if (c === "title") return "Titre";
  if (c === "vip_plan") return "VIP";
  if (c === "master_ether") return "Maître Ether";
  return cat || "—";
}
