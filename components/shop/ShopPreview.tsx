"use client";

import type { ShopProfile } from "./shop-types";

type Props = {
  credits: number;
  profile?: Partial<ShopProfile> | null;
};

export default function ShopPreview({ credits, profile }: Props) {
  return (
    <div className="rounded-[24px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
        aperçu compte
      </div>

      <div className="mt-3 text-lg font-black text-white">
        {profile?.pseudo || "Membre Ether"}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-amber-400/18 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
          {credits} Ξ
        </span>
        {profile?.is_vip ? (
          <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-100">
            VIP
          </span>
        ) : null}
      </div>
    </div>
  );
}
