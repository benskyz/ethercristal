import type { Metadata } from "next";
import "./globals.css";
import EffectsOverlay from "@/components/EffectsOverlay";

export const metadata: Metadata = {
  title: "EtherCristal",
  description: "EtherCristal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#050507] text-white antialiased">
        <div className="relative min-h-screen">
          <EffectsOverlay effects={[]} />
          {children}
        </div>
      </body>
    </html>
  );
}
