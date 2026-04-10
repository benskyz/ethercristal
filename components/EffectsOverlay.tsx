"use client";

type EffectOverlayItem = {
  id: string;
  pseudo: string;
  effectKey?: string | null;
};

type Props = {
  effects?: EffectOverlayItem[];
};

function effectClass(effectKey?: string | null) {
  const key = (effectKey || "").toLowerCase();

  if (key.includes("crystal")) return "border-cyan-300/18 bg-cyan-500/10 text-cyan-100";
  if (key.includes("void")) return "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100";
  if (key.includes("ember")) return "border-orange-400/18 bg-orange-500/10 text-orange-100";

  return "border-white/10 bg-white/[0.04] text-white/80";
}

export default function EffectsOverlay({ effects = [] }: Props) {
  if (effects.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-wrap justify-center gap-2 px-4">
      {effects.map((effect) => (
        <div
          key={effect.id}
          className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur-md ${effectClass(
            effect.effectKey
          )}`}
        >
          {effect.pseudo}
        </div>
      ))}
    </div>
  );
}
