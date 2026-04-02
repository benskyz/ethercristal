"use client";

import "./globals.css";
import EffectsOverlay from "@/components/EffectsOverlay";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {children}

        {/* 🔥 GLOBAL EFFECTS SYSTEM */}
        <EffectsOverlay />
      </body>
    </html>
  );
}
