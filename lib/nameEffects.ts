export type NameEffectRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type NameEffectDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  category: "flame" | "cosmic" | "crystal" | "mist" | "nature" | "water" | "ice" | "organic";
  rarity: NameEffectRarity;
  price: number;
  unlockLevel?: number;
  colors: string[];
  tags: string[];
  cssClass: string;
  previewText: string;
};

export const NAME_EFFECTS: NameEffectDefinition[] = [
  {
    key: "flame_to_text",
    label: "Transition flamme → texte",
    shortLabel: "Flamme vive",
    description:
      "Une flamme intense embrase l’espace autour du pseudo avant de se transformer en lettres brûlantes qui se stabilisent lentement.",
    category: "flame",
    rarity: "epic",
    price: 2200,
    colors: ["#ff5a36", "#ff9a3c", "#ffd36e"],
    tags: ["feu", "transformation", "brûlant", "intense"],
    cssClass: "fx-flame-to-text",
    previewText: "ETHERCRISTAL",
  },
  {
    key: "starburst_letters",
    label: "Explosion d’étoiles",
    shortLabel: "Étoiles explosives",
    description:
      "Une pluie d’étincelles et de particules lumineuses explose puis s’assemble pour dessiner les lettres comme un feu d’artifice cosmique.",
    category: "cosmic",
    rarity: "legendary",
    price: 3100,
    colors: ["#ffffff", "#8be9ff", "#b388ff"],
    tags: ["étoiles", "particules", "cosmique", "lumière"],
    cssClass: "fx-starburst-letters",
    previewText: "QUEBECTOPL3SS",
  },
  {
    key: "liquid_crystal_form",
    label: "Liquide cristallisé",
    shortLabel: "Cristal liquide",
    description:
      "Une matière translucide coule, se fige et cristallise pour former le texte avec un effet précieux, froid et éclatant.",
    category: "crystal",
    rarity: "legendary",
    price: 3400,
    colors: ["#7ff5ff", "#d5f7ff", "#89b4ff"],
    tags: ["cristal", "liquide", "glacé", "luxueux"],
    cssClass: "fx-liquid-crystal-form",
    previewText: "ETHER",
  },
  {
    key: "smoke_condense_text",
    label: "Fumée condensée",
    shortLabel: "Brume dense",
    description:
      "Des volutes de fumée tournoyantes se resserrent et se condensent jusqu’à révéler un nom spectral et dense.",
    category: "mist",
    rarity: "rare",
    price: 1400,
    colors: ["#d8d8e6", "#8f93b3", "#4f536d"],
    tags: ["fumée", "brume", "spectral", "ombre"],
    cssClass: "fx-smoke-condense-text",
    previewText: "CRISTAL",
  },
  {
    key: "fractal_name_evolution",
    label: "Fractales évolutives",
    shortLabel: "Fractales",
    description:
      "Des motifs géométriques complexes se déploient et se transforment progressivement en lettres vivantes et mystiques.",
    category: "cosmic",
    rarity: "mythic",
    price: 4200,
    colors: ["#8a7dff", "#59d0ff", "#f0f6ff"],
    tags: ["fractale", "géométrie", "mystique", "évolution"],
    cssClass: "fx-fractal-name-evolution",
    previewText: "NCQ LIVE",
  },
  {
    key: "organic_growth_text",
    label: "Croissance organique",
    shortLabel: "Floraison",
    description:
      "Des tiges, racines et pétales émergent et poussent ensemble pour dessiner le texte comme une entité vivante.",
    category: "nature",
    rarity: "epic",
    price: 2300,
    colors: ["#8effb1", "#5fd67a", "#d7ffd9"],
    tags: ["nature", "croissance", "vivant", "floral"],
    cssClass: "fx-organic-growth-text",
    previewText: "DESIR",
  },
  {
    key: "ice_crystallization",
    label: "Cristallisation de glace",
    shortLabel: "Glace royale",
    description:
      "Des éclats gelés se forment en temps réel, gèlent l’espace et composent un texte froid, net et scintillant.",
    category: "ice",
    rarity: "legendary",
    price: 3200,
    colors: ["#dff7ff", "#9fe7ff", "#7fc8ff"],
    tags: ["glace", "gel", "scintillant", "froid"],
    cssClass: "fx-ice-crystallization",
    previewText: "VIP",
  },
  {
    key: "stardust_assembly",
    label: "Sable / poussière d’étoiles",
    shortLabel: "Poussière stellaire",
    description:
      "Des grains cosmiques, comme du sable lumineux, se rassemblent lentement et donnent naissance au texte dans un souffle galactique.",
    category: "cosmic",
    rarity: "epic",
    price: 2500,
    colors: ["#ffe8b6", "#ffd1ff", "#8be9ff"],
    tags: ["sable", "poussière", "étoiles", "galactique"],
    cssClass: "fx-stardust-assembly",
    previewText: "OBSIDIENNE",
  },
  {
    key: "water_flow_text",
    label: "Écoulement d’eau",
    shortLabel: "Flux aquatique",
    description:
      "Un courant d’eau dessine d’abord le contour du nom avant de se stabiliser en lettres fluides et brillantes.",
    category: "water",
    rarity: "rare",
    price: 1500,
    colors: ["#67dfff", "#3da2ff", "#d8f8ff"],
    tags: ["eau", "flux", "aquatique", "fluide"],
    cssClass: "fx-water-flow-text",
    previewText: "SALON",
  },
  {
    key: "coral_branch_growth",
    label: "Croissance de coraux / branches",
    shortLabel: "Branches vivantes",
    description:
      "Des structures organiques s’entrelacent, ramifient et prennent forme jusqu’à bâtir le texte comme une matière naturelle sacrée.",
    category: "organic",
    rarity: "epic",
    price: 2400,
    colors: ["#ff9f80", "#ff7fbd", "#ffd8bf"],
    tags: ["corail", "branche", "organique", "naturel"],
    cssClass: "fx-coral-branch-growth",
    previewText: "ETHERWORLD",
  },
];
