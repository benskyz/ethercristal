"use client";

import { useMemo, useState } from "react";
import { BoutiqueCard } from "./BoutiqueCard";
import type { ShopItem } from "./BoutiqueCard";

const MOCK_ITEMS: ShopItem[] = [
  {
    id: "1",
    slug: "flamme-eternelle",
    name: "Flamme Éternelle",
    description: "Ton pseudo s'embrase en lettres de feu vivant.",
    type: "effect",
    effectClass: "fx-flame-to-text",
    price: 1200,
    currency: "éclats",
    rarity: "legendary",
    status: "equipped",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "2",
    slug: "nova-starburst",
    name: "Nova Starburst",
    description: "Chaque lettre explose en étoiles éclatantes.",
    type: "effect",
    effectClass: "fx-starburst-letters",
    price: 800,
    currency: "éclats",
    rarity: "epic",
    status: "owned",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "3",
    slug: "cristal-liquide",
    name: "Cristal Liquide",
    description: "Ton nom coule et se solidifie en cristal pur.",
    type: "effect",
    effectClass: "fx-liquid-crystal-form",
    price: 950,
    currency: "éclats",
    rarity: "epic",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "4",
    slug: "fumee-condensee",
    name: "Fumée Condensée",
    description: "La brume se condense pour révéler ton identité.",
    type: "effect",
    effectClass: "fx-smoke-condense-text",
    price: 600,
    currency: "éclats",
    rarity: "rare",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "5",
    slug: "evolution-fractale",
    name: "Évolution Fractale",
    description: "Ton pseudo évolue dans des motifs infinis.",
    type: "effect",
    effectClass: "fx-fractal-name-evolution",
    price: 1500,
    currency: "éclats",
    rarity: "legendary",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "6",
    slug: "croissance-organique",
    name: "Croissance Organique",
    description: "Les lettres poussent comme des racines vivantes.",
    type: "effect",
    effectClass: "fx-organic-growth-text",
    price: 700,
    currency: "éclats",
    rarity: "rare",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "7",
    slug: "cristallisation-glacee",
    name: "Cristallisation Glacée",
    description: "Ton nom se fige dans une armure de glace.",
    type: "effect",
    effectClass: "fx-ice-crystallization",
    price: 850,
    currency: "éclats",
    rarity: "epic",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "8",
    slug: "poussiere-etoiles",
    name: "Poussière d'Étoiles",
    description: "Des milliers de particules assemblent ton identité.",
    type: "effect",
    effectClass: "fx-stardust-assembly",
    price: 1100,
    currency: "éclats",
    rarity: "legendary",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "9",
    slug: "flux-eau",
    name: "Flux d'Eau",
    description: "Ton pseudo ondule comme un courant profond.",
    type: "effect",
    effectClass: "fx-water-flow-text",
    price: 500,
    currency: "éclats",
    rarity: "rare",
    status: "owned",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "10",
    slug: "corail-abyssal",
    name: "Corail Abyssal",
    description: "Branches de corail sculptent ton nom lettre par lettre.",
    type: "effect",
    effectClass: "fx-coral-branch-growth",
    price: 750,
    currency: "éclats",
    rarity: "rare",
    status: "available",
    previewName: "EtherUser",
    badgeIcon: null,
    titlePreview: null,
  },
  {
    id: "11",
    slug: "vanguard-obsidien",
    name: "Vanguard Obsidien",
    description: "Badge de pionnier — forgerons de la première heure.",
    type: "badge",
    effectClass: null,
    price: 2000,
    currency: "éclats",
    rarity: "legendary",
    status: "available",
    previewName: null,
    badgeIcon: "⬡",
    titlePreview: null,
  },
  {
    id: "12",
    slug: "ether-absolu",
    name: "Titre : Éther Absolu",
    description: "Titre réservé aux entités transcendantes.",
    type: "title",
    effectClass: null,
    price: 1800,
    currency: "éclats",
    rarity: "legendary",
    status: "available",
    previewName: null,
    badgeIcon: null,
    titlePreview: "Éther Absolu",
  },
];

const FILTERS = ["Tout", "Effets", "Badges", "Titres", "Possédés"] as const;
type Filter = (typeof FILTERS)[number];

const RARITIES = ["Toutes", "legendary", "epic", "rare"] as const;
type Rarity = (typeof RARITIES)[number];

function rarityActiveClass(r: Rarity): string {
  switch (r) {
    case "legendary":
      return "bg-amber-500/20 border-amber-500/50 text-amber-300";
    case "epic":
      return "bg-violet-500/20 border-violet-500/50 text-violet-300";
    case "rare":
      return "bg-cyan-500/20 border-cyan-500/50 text-cyan-300";
    default:
      return "bg-white/10 border-white/20 text-white";
  }
}

function getStats(items: ShopItem[]) {
  const owned = items.filter(
    (item) => item.status === "owned" || item.status === "equipped"
  ).length;
  const equipped = items.filter((item) => item.status === "equipped").length;
  const available = items.filter((item) => item.status === "available").length;

  return {
    total: items.length,
    owned,
    equipped,
    available,
  };
}

export function BoutiqueGrid() {
  const [filter, setFilter] = useState<Filter>("Tout");
  const [rarity, setRarity] = useState<Rarity>("Toutes");

  const filtered = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
      const typeMatch =
        filter === "Tout" ||
        (filter === "Effets" && item.type === "effect") ||
        (filter === "Badges" && item.type === "badge") ||
        (filter === "Titres" && item.type === "title") ||
        (filter === "Possédés" &&
          (item.status === "owned" || item.status === "equipped"));

      const rarityMatch = rarity === "Toutes" || item.rarity === rarity;

      return typeMatch && rarityMatch;
    });
  }, [filter, rarity]);

  const stats = useMemo(() => getStats(MOCK_ITEMS), []);

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 lg:px-16">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">
            Galerie premium
          </div>

          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Collection cosmétique EtherCristal
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Équipe ton identité, impose ton rang et transforme ton aura avec des
            effets rares, badges exclusifs et titres de prestige.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setFilter(entry)}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
                  filter === entry
                    ? "bg-violet-600/20 border-violet-500/50 text-white shadow-[0_0_16px_rgba(139,92,246,0.28)]"
                    : "bg-white/5 border-white/10 text-white/45 hover:border-white/20 hover:text-white/75"
                }`}
              >
                {entry}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {RARITIES.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setRarity(entry)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
                  rarity === entry
                    ? rarityActiveClass(entry)
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                {entry === "Toutes" ? "Toutes raretés" : entry}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
              Total
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.total}
            </div>
          </div>

          <div className="rounded-[24px] border border-emerald-500/15 bg-emerald-500/10 p-4 backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/60">
              Possédés
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.owned}
            </div>
          </div>

          <div className="rounded-[24px] border border-violet-500/15 bg-violet-500/10 p-4 backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-violet-200/60">
              Équipés
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.equipped}
            </div>
          </div>

          <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/10 p-4 backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">
              Disponibles
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.available}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] text-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/30">
              Aucun article trouvé
            </div>
            <div className="mt-3 text-sm text-white/40">
              Change le filtre ou recharge l’inventaire.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <BoutiqueCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
