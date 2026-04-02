"use client";

import React, { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Profile = {
  id: string;
  username?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  vibe_score?: number | null;
  avatar_url?: string | null;
  verified?: boolean | null;
  bio?: string | null;
  city?: string | null;
  last_seen?: string | null;
};

type Viewer = {
  id: number;
  user_id?: string | null;
  user_email?: string | null;
  joined_at?: string | null;
};

type Notice = {
  type: "idle" | "success" | "error" | "info";
  msg: string;
};

async function safeMaybeSingle<T = any>(table: string, select: string, query?: (q: any) => any): Promise<T | null> {
  try {
    let q = supabase.from(table).select(select);
    q = query ? query(q) : q;
    const { data, error } = await q.maybeSingle();
    if (error) return null;
    return (data || null) as T | null;
  } catch {
    return null;
  }
}

async function safeSelect<T = any>(table: string, select: string, query?: (q: any) => any): Promise<T[]> {
  try {
    let q = supabase.from(table).select(select);
    q = query ? query(q) : q;
    const { data, error } = await q;
    if (error) return [];
    return (data || []) as T[];
  } catch {
    return [];
  }
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l’instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  return `${days} j`;
}

function onlineState(lastSeen?: string | null) {
  if (!lastSeen) return "offline";
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 60_000) return "online";
  if (diff < 5 * 60_000) return "recent";
  return "offline";
}

function displayName(profile?: Profile | null, fallbackEmail?: string | null) {
  const u = (profile?.username || "").trim();
  if (u) return u;
  if (fallbackEmail) return String(fallbackEmail).split("@")[0];
  return "Membre";
}

function vipTone(vip?: string | null) {
  const v = (vip || "").toLowerCase();
  if (v.includes("diamond")) return "diamond";
  if (v.includes("gold")) return "gold";
  if (v.includes("silver")) return "silver";
  if (v.includes("vip")) return "gold";
  return "standard";
}

function Card({
  children,
  style,
  className,
  soft = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  soft?: boolean;
}) {
  return (
    <div className={`vip-card ${soft ? "vip-card-soft" : ""} ${className || ""}`.trim()} style={style}>
      {children}
    </div>
  );
}

export default function VipDetailPage() {
  const router = useRouter();
  const params = useParams();

  const rawId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [target, setTarget] = useState<Profile | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [notice, setNotice] = useState<Notice>({ type: "idle", msg: "" });

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.replace("/login");
        return;
      }

      if (!mounted) return;
      setUser(auth.user);

      const targetId = rawId === "me" ? auth.user.id : rawId;

      const [me, targetProfile, liveViewers] = await Promise.all([
        safeMaybeSingle<Profile>(
          "profiles",
          "id,username,vip_level,ether_balance,vibe_score,avatar_url,verified,bio,city,last_seen",
          (q) => q.eq("id", auth.user.id)
        ),
        safeMaybeSingle<Profile>(
          "profiles",
          "id,username,vip_level,ether_balance,vibe_score,avatar_url,verified,bio,city,last_seen",
          (q) => q.eq("id", targetId)
        ),
        safeSelect<Viewer>(
          "vip_viewers",
          "id,user_id,user_email,joined_at",
          (q) => q.eq("vip_id", targetId).order("joined_at", { ascending: false }).limit(24)
        ),
      ]);

      if (!mounted) return;

      setMyProfile(me);

      if (!targetProfile) {
        setTarget(null);
        setNotice({ type: "error", msg: "Profil VIP introuvable." });
        setLoading(false);
        return;
      }

      setTarget(targetProfile);
      setViewers(liveViewers);
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, rawId]);

  async function handleInterest() {
    if (!user || !target) return;

    setBusy(true);
    setNotice({ type: "idle", msg: "" });

    try {
      const { error } = await supabase.from("vip_viewers").insert({
        vip_id: target.id,
        user_id: user.id,
        user_email: user.email || null,
        joined_at: new Date().toISOString(),
      } as any);

      if (error) {
        setNotice({
          type: "info",
          msg: "Intérêt enregistré côté interface. Branche la table vip_viewers pour le live réel.",
        });
      } else {
        const refreshed = await safeSelect<Viewer>(
          "vip_viewers",
          "id,user_id,user_email,joined_at",
          (q) => q.eq("vip_id", target.id).order("joined_at", { ascending: false }).limit(24)
        );
        setViewers(refreshed);
        setNotice({ type: "success", msg: "Ta présence a été ajoutée." });
      }
    } finally {
      setBusy(false);
    }
  }

  const isOwnPage = useMemo(() => !!user?.id && !!target?.id && user.id === target.id, [user?.id, target?.id]);
  const name = useMemo(() => displayName(target), [target]);
  const myName = useMemo(() => displayName(myProfile, user?.email || null), [myProfile, user?.email]);
  const tone = useMemo(() => vipTone(target?.vip_level), [target?.vip_level]);
  const state = useMemo(() => onlineState(target?.last_seen), [target?.last_seen]);

  if (loading) {
    return (
      <main style={page}>
        <style>{css}</style>
        <div className="vip-center">
          <div className="vip-loader" />
          <div className="vip-muted">Chargement du profil VIP…</div>
        </div>
      </main>
    );
  }

  if (!target) {
    return (
      <main style={page}>
        <style>{css}</style>
        <div className="vip-wrap">
          <Card>
            <h1 className="vip-h1">Profil introuvable</h1>
            <p className="vip-muted" style={{ marginTop: 12 }}>
              L’identifiant demandé ne correspond à aucun profil disponible.
            </p>
            <div className="vip-actions" style={{ marginTop: 18 }}>
              <button className="vip-btn vip-btn-primary" onClick={() => router.push("/vip")}>
                Retour VIP
              </button>
              <button className="vip-btn vip-btn-ghost" onClick={() => router.push("/dashboard")}>
                Dashboard
              </button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <style>{css}</style>

      <div className="vip-bg" />
      <div className="vip-noise" />
      <div className="vip-bloom left" />
      <div className="vip-bloom right" />

      <div className="vip-wrap">
        <header className="vip-topbar">
          <div className="vip-brand" onClick={() => router.push("/dashboard")}>
            <div className="vip-mark">EC</div>
            <div>
              <div className="vip-brand-title">EtherCristal</div>
              <div className="vip-brand-sub">VIP • détail • premium</div>
            </div>
          </div>

          <div className="vip-nav">
            <a className="vip-navbtn" href="/vip">Retour VIP</a>
            <a className="vip-navbtn" href="/messages">Messages</a>
            <a className="vip-navbtn" href="/shop">Boutique</a>
            <a className="vip-navbtn" href="/profile">Profil</a>
          </div>
        </header>

        <section className={`vip-hero ${tone}`}>
          <div className="vip-hero-overlay" />

          <div className="vip-hero-content">
            <div className="vip-hero-left">
              <div className="vip-avatar-wrap">
                <img
                  className="vip-avatar"
                  src={target.avatar_url || "/images/default-avatar.png"}
                  alt="avatar"
                />
                <span className={`vip-state ${state}`} />
              </div>

              <div className="vip-main-copy">
                <div className="vip-kicker">Profil VIP</div>
                <h1 className="vip-h1">{name}</h1>

                <div className="vip-tags">
                  <span className="vip-chip">{target.vip_level || "Standard"}</span>
                  {target.verified ? (
                    <span className="vip-chip ok">Vérifié ✓</span>
                  ) : (
                    <span className="vip-chip soft">Non vérifié</span>
                  )}
                  <span className="vip-chip soft">Vu il y a {timeAgo(target.last_seen)}</span>
                  {target.city ? <span className="vip-chip soft">{target.city}</span> : null}
                </div>

                <p className="vip-hero-text">
                  {target.bio?.trim()
                    ? target.bio
                    : "Présence premium, image plus forte, espace plus sélectif. Cette page met en avant le statut, la présence et l’attraction autour du profil."}
                </p>

                <div className="vip-actions">
                  {isOwnPage ? (
                    <>
                      <a className="vip-btn vip-btn-primary" href="/profile">Modifier mon profil</a>
                      <a className="vip-btn vip-btn-ghost" href="/options">Options</a>
                    </>
                  ) : (
                    <>
                      <a className="vip-btn vip-btn-primary" href={`/messages?to=${target.id}`}>Écrire</a>
                      <button className="vip-btn vip-btn-ghost" onClick={handleInterest} disabled={busy}>
                        {busy ? "Patiente…" : "Montrer mon intérêt"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="vip-hero-right">
              <Card soft>
                <div className="vip-stat-label">Éther</div>
                <div className="vip-stat-value">{Number(target.ether_balance || 0)} Ξ</div>
              </Card>

              <Card soft>
                <div className="vip-stat-label">Vibe</div>
                <div className="vip-stat-value">{Number(target.vibe_score || 0)}</div>
              </Card>

              <Card soft>
                <div className="vip-stat-label">Viewers live</div>
                <div className="vip-stat-value">{viewers.length}</div>
              </Card>

              <Card soft>
                <div className="vip-stat-label">Toi</div>
                <div className="vip-stat-value" style={{ fontSize: 22 }}>{myName}</div>
              </Card>
            </div>
          </div>
        </section>

        {notice.type !== "idle" ? <div className={`vip-notice ${notice.type}`}>{notice.msg}</div> : null}

        <div className="vip-grid">
          <section className="vip-col">
            <Card>
              <div className="vip-section-kicker">Présentation</div>
              <h2 className="vip-h2">Image & statut</h2>
              <p className="vip-paragraph">
                Cette fiche met en avant le statut VIP, la présence, et l’attraction globale du profil.
              </p>

              <div className="vip-bullets">
                <div className="vip-bullet">✓ Présence plus visible</div>
                <div className="vip-bullet">✓ Image premium renforcée</div>
                <div className="vip-bullet">✓ Valeur perçue plus haute</div>
                <div className="vip-bullet">✓ Lecture mobile propre</div>
              </div>
            </Card>
          </section>

          <section className="vip-col">
            <Card>
              <div className="vip-section-kicker">Live</div>
              <h2 className="vip-h2">Viewers présents</h2>

              {viewers.length === 0 ? (
                <div className="vip-empty">
                  <h3>Aucun viewer pour l’instant</h3>
                  <p>
                    Si ta table <b>vip_viewers</b> n’est pas encore branchée, c’est normal.
                  </p>
                </div>
              ) : (
                <div className="vip-list">
                  {viewers.map((viewer) => (
                    <Card key={viewer.id} soft>
                      <strong>{viewer.user_email || viewer.user_id || "Viewer"}</strong>
                      <p className="vip-muted" style={{ marginBottom: 0, marginTop: 6 }}>
                        Présent depuis {timeAgo(viewer.joined_at)}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(180deg, #05050a 0%, #090912 45%, #05050a 100%)",
  color: "white",
};

const css = `
*{box-sizing:border-box}
a{text-decoration:none;color:inherit}
button{font:inherit}

.vip-bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(1200px 650px at 18% 12%, rgba(122,11,58,0.22), transparent 60%),
    radial-gradient(1000px 560px at 82% 18%, rgba(42,15,74,0.22), transparent 60%),
    radial-gradient(900px 620px at 70% 88%, rgba(212,175,55,0.08), transparent 65%);
  pointer-events:none;
}
.vip-noise{
  position:absolute;
  inset:0;
  opacity:0.05;
  background-image:
    linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
  background-size:48px 48px;
  pointer-events:none;
}
.vip-bloom{
  position:absolute;
  width:560px;
  height:560px;
  border-radius:999px;
  filter:blur(120px);
  pointer-events:none;
  animation: vipFloaty 9s ease-in-out infinite;
}
.vip-bloom.left{top:-150px;left:-180px;background:rgba(212,175,55,0.10)}
.vip-bloom.right{right:-180px;bottom:-220px;background:rgba(122,11,58,0.14);animation-delay:1.2s}
@keyframes vipFloaty{0%,100%{transform:translateY(0)}50%{transform:translateY(20px)}}

.vip-wrap{position:relative;z-index:2;max-width:1320px;margin:0 auto;padding:18px 14px 40px}
.vip-topbar{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.vip-brand{display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none}
.vip-mark{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#111;background:linear-gradient(135deg,#d4af37,#f6e6a6);box-shadow:0 16px 50px rgba(212,175,55,0.18)}
.vip-brand-title{font-size:22px;font-weight:900;letter-spacing:-0.03em}
.vip-brand-sub{font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.18em;text-transform:uppercase;margin-top:3px}
.vip-nav{display:flex;gap:10px;flex-wrap:wrap}
.vip-navbtn{min-height:46px;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.88);font-weight:800;display:inline-flex;align-items:center;justify-content:center}

.vip-hero{position:relative;margin-top:18px;border-radius:30px;overflow:hidden;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.04);backdrop-filter:blur(16px)}
.vip-hero.gold,.vip-hero.diamond{border-color:rgba(212,175,55,0.16)}
.vip-hero-overlay{position:absolute;inset:0;background:linear-gradient(135deg, rgba(130,0,60,0.14), rgba(255,255,255,0.02), rgba(212,175,55,0.08));pointer-events:none}
.vip-hero-content{position:relative;z-index:2;padding:24px 18px;display:grid;grid-template-columns:1.15fr 0.85fr;gap:16px}
.vip-hero-left{display:flex;gap:16px;align-items:flex-start}
.vip-avatar-wrap{position:relative;width:110px;height:110px;border-radius:26px;overflow:hidden;flex-shrink:0;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04)}
.vip-avatar{width:100%;height:100%;object-fit:cover;display:block}
.vip-state{position:absolute;right:8px;bottom:8px;width:14px;height:14px;border-radius:999px;border:2px solid rgba(0,0,0,0.6);background:#7c7c86}
.vip-state.online{background:#22c55e;box-shadow:0 0 12px rgba(34,197,94,0.8)}
.vip-state.recent{background:#ffb020;box-shadow:0 0 10px rgba(255,176,32,0.6)}
.vip-main-copy{min-width:0}
.vip-kicker{font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(212,175,55,0.92);font-weight:900}
.vip-h1{margin:10px 0 8px;font-size:clamp(34px, 5vw, 56px);line-height:0.96;letter-spacing:-0.05em}
.vip-tags{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.vip-chip{min-height:34px;padding:8px 12px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;background:rgba(212,175,55,0.10);border:1px solid rgba(212,175,55,0.18);color:#f3e4a6}
.vip-chip.ok{background:rgba(34,197,94,0.10);border-color:rgba(34,197,94,0.18);color:#cffff0}
.vip-chip.soft{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.10);color:rgba(255,255,255,0.78)}
.vip-hero-text{margin:16px 0 0;color:rgba(255,255,255,0.74);line-height:1.8;font-size:16px;max-width:820px}
.vip-actions{margin-top:18px;display:flex;gap:12px;flex-wrap:wrap}
.vip-btn{min-height:54px;padding:12px 18px;border-radius:18px;font-size:15px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent}
.vip-btn-primary{background:linear-gradient(135deg, rgba(130,0,60,1), rgba(185,20,95,1));color:white;box-shadow:0 20px 60px rgba(130,0,60,0.24)}
.vip-btn-ghost{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.88)}
.vip-btn:disabled{opacity:.65;cursor:not-allowed}
.vip-hero-right{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px;align-content:start}

.vip-card{border-radius:24px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);padding:18px}
.vip-card-soft{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);box-shadow:none}
.vip-stat-label{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.48);font-weight:900}
.vip-stat-value{margin-top:10px;font-size:30px;line-height:1;font-weight:900;letter-spacing:-0.04em;color:#fff}

.vip-notice{margin-top:14px;border-radius:18px;padding:14px 16px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06)}
.vip-notice.success{border-color:rgba(34,197,94,0.20);background:rgba(34,197,94,0.10);color:#cffff0}
.vip-notice.error{border-color:rgba(255,77,79,0.20);background:rgba(255,77,79,0.10);color:#ffd9dc}
.vip-notice.info{border-color:rgba(212,175,55,0.22);background:rgba(212,175,55,0.10);color:#f3e4a6}

.vip-grid{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.vip-col{display:grid;gap:16px}
.vip-section-kicker{font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(212,175,55,0.90);font-weight:900}
.vip-h2{margin:10px 0 0;font-size:30px;line-height:1;letter-spacing:-0.04em}
.vip-paragraph{margin:16px 0 0;color:rgba(255,255,255,0.72);line-height:1.8}
.vip-bullets{margin-top:18px;display:grid;gap:10px}
.vip-bullet{padding:12px 14px;border-radius:18px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.82)}
.vip-list{margin-top:16px;display:grid;gap:12px}
.vip-empty{margin-top:16px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.18);padding:18px}
.vip-empty h3{margin:0;font-size:20px}
.vip-empty p{margin:10px 0 0;color:rgba(255,255,255,0.62);line-height:1.7}
.vip-center{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.vip-loader{width:40px;height:40px;border-radius:999px;border:3px solid rgba(255,255,255,0.14);border-top:3px solid #d4af37;animation: vipSpin 1s linear infinite}
@keyframes vipSpin{to{transform:rotate(360deg)}}
.vip-muted{color:rgba(255,255,255,0.68)}

@media (max-width: 1100px){
  .vip-hero-content{grid-template-columns:1fr}
  .vip-grid{grid-template-columns:1fr}
}
@media (max-width: 760px){
  .vip-wrap{padding:14px 12px 30px}
  .vip-nav{width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
  .vip-navbtn{white-space:nowrap;flex-shrink:0}
  .vip-hero-content{padding:20px 14px}
  .vip-hero-left{flex-direction:column}
  .vip-hero-right{grid-template-columns:1fr}
  .vip-actions{flex-direction:column}
  .vip-btn{width:100%}
}
`;
