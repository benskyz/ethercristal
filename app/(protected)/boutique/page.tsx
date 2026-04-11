import type { Metadata } from "next";
import { BoutiqueHero } from "@/components/shop/BoutiqueHero";
import { BoutiqueGrid } from "@/components/shop/BoutiqueGrid";

export const metadata: Metadata = {
  title: "Boutique — EtherCristal",
  description:
    "Forge ton identité cristal. Effets de pseudo, badges, titres et aura de prestige.",
};

export default function BoutiquePage() {
  return (
    <main className="min-h-screen bg-[#06060f] text-white antialiased">
      <BoutiqueHero />
      <BoutiqueGrid />
    </main>
  );
}
