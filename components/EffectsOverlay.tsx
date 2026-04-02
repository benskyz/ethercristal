"use client";

import { useEffects } from "@/hooks/useEffects";
import { useEffect } from "react";

export default function EffectsOverlay() {
  const effect = useEffects();

  useEffect(() => {
    if (!effect) return;

    // 🔊 SON
    const audio = new Audio(`/sounds/${effect.effect_id}.mp3`);
    audio.volume = 0.9;
    audio.play().catch(() => {});
  }, [effect]);

  if (!effect) return null;

  return (
    <>
      <div className="effectOverlay">
        <div className="effectBox">
          <div className="effectUser">{effect.username}</div>
          <div className="effectText">{effect.effect_id}</div>
        </div>
      </div>

      <style jsx>{`
        .effectOverlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fade 2.5s ease;
        }

        .effectBox {
          background: rgba(0, 0, 0, 0.6);
          padding: 30px 40px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(20px);
          text-align: center;
        }

        .effectUser {
          font-size: 18px;
          color: #fff;
          margin-bottom: 8px;
          opacity: 0.8;
        }

        .effectText {
          font-size: 36px;
          font-weight: 900;
          color: gold;
          text-shadow: 0 0 25px gold;
        }

        @keyframes fade {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  );
}
