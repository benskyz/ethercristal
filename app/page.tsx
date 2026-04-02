"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !data.session) {
          router.replace("/login");
          return;
        }

        router.replace("/dashboard");
      } catch {
        router.replace("/login");
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main style={page}>
      <style>{css}</style>

      <div className="bg" />
      <div className="noise" />
      <div className="bloom left" />
      <div className="bloom right" />

      <div className="center">
        <div className="logoWrap">
          <div className="mark">EC</div>
          <div className="brand">
            <div className="title">EtherCristal</div>
            <div className="sub">Vérification de session…</div>
          </div>
        </div>

        <div className="loader" />
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(180deg, #05050a 0%, #090912 45%, #05050a 100%)",
  color: "white",
};

const css = `
*{box-sizing:border-box}

.bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(1200px 600px at 20% 15%, rgba(122,11,58,0.20), transparent 60%),
    radial-gradient(900px 500px at 80% 20%, rgba(42,15,74,0.18), transparent 60%),
    radial-gradient(900px 600px at 70% 80%, rgba(212,175,55,0.08), transparent 65%);
  pointer-events:none;
}

.noise{
  position:absolute;
  inset:0;
  opacity:0.05;
  background-image:
    linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
  background-size:48px 48px;
  pointer-events:none;
}

.bloom{
  position:absolute;
  width:520px;
  height:520px;
  border-radius:999px;
  filter:blur(110px);
  pointer-events:none;
  animation: floaty 8s ease-in-out infinite;
}

.bloom.left{
  top:-120px;
  left:-180px;
  background:rgba(212,175,55,0.10);
}

.bloom.right{
  bottom:-160px;
  right:-180px;
  background:rgba(122,11,58,0.12);
  animation-delay:1s;
}

@keyframes floaty{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(18px)}
}

.center{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:22px;
  position:relative;
  z-index:2;
  padding:20px;
}

.logoWrap{
  display:flex;
  align-items:center;
  gap:14px;
}

.mark{
  width:54px;
  height:54px;
  border-radius:18px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  font-size:18px;
  color:#111;
  background:linear-gradient(135deg,#d4af37,#f6e6a6);
  box-shadow:0 16px 50px rgba(212,175,55,0.22);
}

.brand{
  display:flex;
  flex-direction:column;
  gap:2px;
}

.title{
  font-size:24px;
  font-weight:900;
  letter-spacing:-0.03em;
  color:rgba(255,255,255,0.94);
}

.sub{
  font-size:13px;
  color:rgba(255,255,255,0.55);
  letter-spacing:0.08em;
  text-transform:uppercase;
}

.loader{
  width:38px;
  height:38px;
  border-radius:999px;
  border:3px solid rgba(255,255,255,0.16);
  border-top:3px solid #d4af37;
  animation: spin 1s linear infinite;
}

@keyframes spin{
  to{transform:rotate(360deg)}
}
`;
