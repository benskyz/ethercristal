"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MatchFilter = "random" | "women" | "men" | "vip";
type DesirePreference = "soft" | "vip" | "intense";

export default function DesirPage() {
  const router = useRouter();

  const [isLive, setIsLive] = useState(false);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const [filter, setFilter] = useState<MatchFilter>("random");
  const [preference, setPreference] = useState<DesirePreference>("soft");
  const [chatMessage, setChatMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const pageSubtitle = useMemo(() => {
    if (filter === "random") return "Mode aléatoire gratuit";
    if (filter === "women") return "Filtre femme • 20 Ether / match";
    if (filter === "men") return "Filtre homme • 20 Ether / match";
    return "VIP seulement";
  }, [filter]);

  async function handleStartMatch() {
    if (starting) return;

    setStarting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/desir/start-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter,
          preference,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error || "Impossible de lancer le match.");
        return;
      }

      setIsLive(true);
    } catch {
      setErrorMsg("Erreur réseau.");
    } finally {
      setStarting(false);
    }
  }

  function handleStopMatch() {
    setIsLive(false);
    setErrorMsg("");
  }

  function handleSendMessage() {
    if (!chatMessage.trim()) return;
    setChatMessage("");
  }

  return (
    <main className="di-page">
      <style>{css}</style>

      <div className="di-bg di-bg-a" />
      <div className="di-bg di-bg-b" />
      <div className="di-grid" />

      <div className="di-shell">
        {/* TOPBAR */}
        <header className="di-topbar">
          <div className="di-brandBlock">
            <div className="di-brand">DésirIntense</div>
            <div className="di-sub">{pageSubtitle}</div>
          </div>

          <nav className="di-miniNav">
            <button onClick={() => router.push("/dashboard")}>Accueil</button>
            <button onClick={() => router.push("/messages")}>Messages</button>
            <button onClick={() => router.push("/profile")}>Profil</button>
            <button onClick={() => router.push("/options")}>Options</button>
          </nav>
        </header>

        {/* FILTERS */}
        <section className="di-filters">
          <div className="di-filterGroup">
            <span className="di-filterLabel">Recherche</span>

            <div className="di-pillRow">
              <button
                className={`di-pill random ${filter === "random" ? "active" : ""}`}
                onClick={() => setFilter("random")}
                type="button"
              >
                Aléatoire gratuit
              </button>

              <button
                className={`di-pill ether ${filter === "women" ? "active" : ""}`}
                onClick={() => setFilter("women")}
                type="button"
              >
                Femme • 20 Ether
              </button>

              <button
                className={`di-pill ether ${filter === "men" ? "active" : ""}`}
                onClick={() => setFilter("men")}
                type="button"
              >
                Homme • 20 Ether
              </button>

              <button
                className={`di-pill vip ${filter === "vip" ? "active" : ""}`}
                onClick={() => setFilter("vip")}
                type="button"
              >
                VIP seulement
              </button>
            </div>
          </div>

          <div className="di-filterGroup">
            <span className="di-filterLabel">Préférence désirée</span>

            <div className="di-pillRow">
              <button
                className={`di-pill ${preference === "soft" ? "active" : ""}`}
                onClick={() => setPreference("soft")}
                type="button"
              >
                Désir doux
              </button>

              <button
                className={`di-pill ${preference === "vip" ? "active" : ""}`}
                onClick={() => setPreference("vip")}
                type="button"
              >
                Désir VIP
              </button>

              <button
                className={`di-pill intense ${preference === "intense" ? "active" : ""}`}
                onClick={() => setPreference("intense")}
                type="button"
              >
                Intense
              </button>
            </div>
          </div>

          {errorMsg ? <div className="di-error">{errorMsg}</div> : null}
        </section>

        {/* VIDEO AREA */}
        <section className="di-stage">
          <div className="di-videoCard self">
            <div className="di-videoHeader">
              <span>Toi</span>
              <span className={`di-status ${camEnabled ? "on" : "off"}`}>
                {camEnabled ? "Cam active" : "Cam coupée"}
              </span>
            </div>

            <div className="di-videoViewport">
              <div className="di-videoGlow" />
              <div className="di-videoPlaceholder">
                <div className="di-videoIcon">◉</div>
                <div className="di-videoText">Aperçu webcam</div>
              </div>
            </div>
          </div>

          <div className="di-videoCard match">
            <div className="di-videoHeader">
              <span>Match</span>
              <span className={`di-status ${isLive ? "on" : "waiting"}`}>
                {isLive ? "Connecté" : "En attente"}
              </span>
            </div>

            <div className="di-videoViewport">
              <div className="di-videoGlow alt" />
              <div className="di-videoPlaceholder">
                <div className="di-videoIcon heart">❤</div>
                <div className="di-videoText">
                  {isLive ? "Connexion active" : "Recherche d’un match..."}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACTION BAR */}
        <section className="di-actions">
          <button
            className={`di-actionBtn primary ${isLive ? "danger" : ""}`}
            onClick={() => {
              if (isLive) {
                handleStopMatch();
              } else {
                handleStartMatch();
              }
            }}
            type="button"
            disabled={starting}
          >
            {starting ? "Chargement..." : isLive ? "Arrêter" : "Lancer"}
          </button>

          <button
            className={`di-actionBtn ${camEnabled ? "" : "muted"}`}
            onClick={() => setCamEnabled((v) => !v)}
            type="button"
          >
            {camEnabled ? "Couper cam" : "Activer cam"}
          </button>

          <button
            className={`di-actionBtn ${micEnabled ? "" : "muted"}`}
            onClick={() => setMicEnabled((v) => !v)}
            type="button"
          >
            {micEnabled ? "Couper micro" : "Activer micro"}
          </button>

          <button className="di-actionBtn ghost" type="button">
            Match suivant
          </button>
        </section>

        {/* CHAT */}
        <section className="di-chatBar">
          <div className="di-chatInputWrap">
            <input
              type="text"
              placeholder="Écrire un message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
            />
            <button onClick={handleSendMessage} type="button">
              Envoyer
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const css = `
.di-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:linear-gradient(180deg,#090205 0%, #070205 45%, #030204 100%);
  color:#fff;
  font-family:Inter, system-ui, sans-serif;
}

.di-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.di-bg-a{
  background:
    radial-gradient(circle at 16% 16%, rgba(110,25,40,0.16), transparent 26%),
    radial-gradient(circle at 78% 18%, rgba(44,24,92,0.16), transparent 24%),
    radial-gradient(circle at 60% 80%, rgba(22,42,88,0.12), transparent 28%);
}
.di-bg-b{
  filter:blur(12px);
  background:
    radial-gradient(circle at 42% 50%, rgba(255,255,255,0.02), transparent 16%),
    radial-gradient(circle at 75% 72%, rgba(130,0,35,0.10), transparent 20%);
}
.di-grid{
  position:absolute;
  inset:0;
  opacity:.035;
  pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size:40px 40px;
}

.di-shell{
  position:relative;
  z-index:2;
  min-height:100vh;
  display:grid;
  grid-template-rows:auto auto 1fr auto auto;
  gap:16px;
  padding:18px;
}

.di-topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
  padding:16px 18px;
  border-radius:22px;
  background:rgba(255,255,255,0.035);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(14px);
}

.di-brand{
  font-size:32px;
  font-weight:900;
  letter-spacing:-0.05em;
  background:linear-gradient(
    90deg,
    #7f2434 0%,
    #5d2d7b 34%,
    #294a7a 68%,
    #7f2434 100%
  );
  background-size:220% 220%;
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  animation:diPulse 5.8s ease-in-out infinite;
  filter:drop-shadow(0 0 8px rgba(120,30,60,0.10));
}

@keyframes diPulse{
  0%,100%{
    background-position:0% 50%;
    opacity:.92;
  }
  50%{
    background-position:100% 50%;
    opacity:1;
  }
}

.di-sub{
  margin-top:4px;
  color:rgba(255,245,220,0.62);
  font-size:13px;
}

.di-miniNav{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.di-miniNav button{
  min-height:42px;
  padding:10px 14px;
  border:none;
  border-radius:14px;
  background:rgba(255,255,255,0.05);
  color:#fff;
  font-weight:700;
  cursor:pointer;
  transition:all .22s ease;
}
.di-miniNav button:hover{
  background:rgba(255,255,255,0.10);
  transform:translateY(-1px);
}

.di-filters{
  display:grid;
  gap:14px;
  padding:16px 18px;
  border-radius:22px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(14px);
}
.di-filterGroup{
  display:grid;
  gap:10px;
}
.di-filterLabel{
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#d8c7a4;
}
.di-pillRow{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.di-pill{
  min-height:42px;
  padding:10px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.10);
  background:rgba(255,255,255,0.04);
  color:#fff;
  font-weight:700;
  cursor:pointer;
  transition:all .22s ease;
}
.di-pill:hover{
  transform:translateY(-1px);
  border-color:rgba(255,255,255,0.18);
}
.di-pill.active{
  border-color:transparent;
}

.di-pill.random.active{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}

.di-pill.ether{
  color:#f6dc86;
}
.di-pill.ether.active{
  background:linear-gradient(90deg,#a43a48,#ff7b6b);
  color:#fff;
}

.di-pill.vip{
  color:#e1c8ff;
}
.di-pill.vip.active{
  background:linear-gradient(90deg,#5d2d7b,#8b5cf6);
  color:#fff;
}

.di-pill.intense{
  color:#ff9ca8;
}
.di-pill.intense.active{
  background:linear-gradient(90deg,#7a2232,#c23a62);
  color:#fff;
}

.di-error{
  padding:12px 14px;
  border-radius:16px;
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
  font-weight:700;
}

.di-stage{
  min-height:0;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}

.di-videoCard{
  min-height:100%;
  display:flex;
  flex-direction:column;
  border-radius:26px;
  overflow:hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.02);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(14px);
  box-shadow:
    0 18px 50px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

.di-videoHeader{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:16px 18px;
  font-weight:800;
  border-bottom:1px solid rgba(255,255,255,0.06);
}

.di-status{
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
}
.di-status.on{
  background:rgba(34,197,94,0.14);
  color:#b8ffd0;
}
.di-status.off{
  background:rgba(255,255,255,0.08);
  color:#ddd;
}
.di-status.waiting{
  background:rgba(255,47,67,0.12);
  color:#ffb1ba;
}

.di-videoViewport{
  position:relative;
  flex:1;
  min-height:420px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:
    radial-gradient(circle at 50% 35%, rgba(255,255,255,0.035), transparent 18%),
    linear-gradient(180deg, rgba(14,3,7,0.95), rgba(7,2,5,0.98));
}

.di-videoGlow{
  position:absolute;
  width:240px;
  height:240px;
  border-radius:999px;
  background:radial-gradient(circle, rgba(100,38,120,0.14), transparent 70%);
  filter:blur(24px);
}
.di-videoGlow.alt{
  background:radial-gradient(circle, rgba(140,30,60,0.18), transparent 70%);
}

.di-videoPlaceholder{
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:12px;
}
.di-videoIcon{
  font-size:46px;
  color:#d8c7a4;
}
.di-videoIcon.heart{
  color:#d3364c;
}
.di-videoText{
  color:rgba(255,245,220,0.70);
  font-size:15px;
}

.di-actions{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  padding:14px 18px;
  border-radius:22px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(14px);
}
.di-actionBtn{
  min-height:48px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  cursor:pointer;
  font-weight:800;
  transition:all .22s ease;
  background:rgba(255,255,255,0.06);
  color:#fff;
}
.di-actionBtn:hover{
  transform:translateY(-1px);
}
.di-actionBtn:disabled{
  opacity:.7;
  cursor:not-allowed;
  transform:none;
}
.di-actionBtn.primary{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.di-actionBtn.primary.danger{
  background:linear-gradient(90deg,#a43a48,#ff7b6b);
  color:#fff;
}
.di-actionBtn.muted{
  background:rgba(255,255,255,0.10);
}
.di-actionBtn.ghost{
  background:linear-gradient(90deg,#294a7a,#4b74b9);
  color:#fff;
}

.di-chatBar{
  padding:14px 18px;
  border-radius:22px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(14px);
}
.di-chatInputWrap{
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
}
.di-chatInputWrap input{
  min-height:52px;
  border:none;
  border-radius:16px;
  padding:0 16px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  outline:none;
}
.di-chatInputWrap input::placeholder{
  color:rgba(255,255,255,0.48);
}
.di-chatInputWrap button{
  min-height:52px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-weight:800;
  cursor:pointer;
}

@media (max-width: 980px){
  .di-stage{
    grid-template-columns:1fr;
  }
  .di-videoViewport{
    min-height:320px;
  }
}
@media (max-width: 760px){
  .di-shell{
    padding:12px;
  }
  .di-brand{
    font-size:26px;
  }
  .di-chatInputWrap{
    grid-template-columns:1fr;
  }
}
`;
