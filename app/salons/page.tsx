"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  vip_level?: string | null;
  is_admin?: boolean | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type SalonRoomRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  tag?: string | null;
  capacity?: number | null;
  is_active?: boolean | null;
  is_vip_only?: boolean | null;
  room_type?: string | null;
  cover_image?: string | null;
  created_at?: string | null;
};

type SalonRoomCountRow = {
  room_id: string;
  participants_online?: number | null;
  spectators_online?: number | null;
};

function getProfileName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

function getProfileNameStyle(profile: ProfileRow | null) {
  if (!profile) return {};

  if (profile.display_name_gradient) {
    return {
      background: profile.display_name_gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: profile.display_name_glow
        ? `0 0 16px ${profile.display_name_glow}`
        : `0 0 14px rgba(212,175,55,0.16)`,
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 16px ${profile.display_name_glow}`
      : `0 0 14px rgba(212,175,55,0.16)`,
  };
}

function isVipLevel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  return v !== "" && v !== "free" && v !== "standard";
}

function roomMood(room: SalonRoomRow) {
  const slug = String(room.slug || "").toLowerCase();
  const type = String(room.room_type || "").toLowerCase();

  if (room.is_vip_only || type.includes("vip")) return "vip";
  if (slug.includes("velvet") || type.includes("lounge")) return "velvet";
  if (slug.includes("gold")) return "gold";
  if (slug.includes("dark") || slug.includes("midnight")) return "dark";
  return "default";
}

export default function SalonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [rooms, setRooms] = useState<SalonRoomRow[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function ensureProfile(userId: string, fallbackUsername: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || "Impossible de charger le profil.");
    }

    if (profileData) return profileData as ProfileRow;

    const payload = {
      id: userId,
      username: fallbackUsername || "Membre",
      vip_level: "Standard",
      is_admin: false,
      theme_mode: "gold",
      match_preference: "soft",
      show_online: true,
      allow_messages: true,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(upsertError.message || "Impossible de créer le profil.");
    }

    const { data: createdProfile, error: createdError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (createdError) {
      throw new Error(createdError.message || "Impossible de relire le profil.");
    }

    if (!createdProfile) {
      throw new Error("Profil introuvable après création.");
    }

    return createdProfile as ProfileRow;
  }

  async function loadPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = requireSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const authUser = authData.user;
      const fallbackUsername = String(
        authUser.user_metadata?.username || authUser.email || "Membre"
      )
        .split("@")[0]
        .slice(0, 24);

      const ensuredProfile = await ensureProfile(authUser.id, fallbackUsername);

      const [{ data: roomRows, error: roomError }, { data: countRows, error: countError }] =
        await Promise.all([
          supabase
            .from("salon_rooms")
            .select("*")
            .eq("is_active", true)
            .order("is_vip_only", { ascending: true })
            .order("created_at", { ascending: false }),
          supabase.from("salon_room_counts").select("*"),
        ]);

      if (roomError) {
        throw new Error(roomError.message || "Impossible de charger les salons.");
      }

      if (countError) {
        throw new Error(countError.message || "Impossible de charger les compteurs.");
      }

      const map: Record<string, number> = {};
      ((countRows || []) as SalonRoomCountRow[]).forEach((row) => {
        map[String(row.room_id)] =
          Number(row.participants_online || 0) +
          Number(row.spectators_online || 0);
      });

      setProfile(ensuredProfile);
      setRooms((roomRows || []) as SalonRoomRow[]);
      setRoomCounts(map);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement salons.");
    } finally {
      setLoading(false);
    }
  }

  const isVip = useMemo(() => isVipLevel(profile?.vip_level), [profile?.vip_level]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rooms;

    return rooms.filter((room) => {
      const text = [
        room.name,
        room.slug,
        room.description,
        room.tag,
        room.room_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [rooms, search]);

  const publicRooms = useMemo(() => {
    return filteredRooms.filter((room) => !room.is_vip_only);
  }, [filteredRooms]);

  const vipRooms = useMemo(() => {
    return filteredRooms.filter((room) => room.is_vip_only);
  }, [filteredRooms]);

  const totalOnline = useMemo(() => {
    return Object.values(roomCounts).reduce((sum, n) => sum + Number(n || 0), 0);
  }, [roomCounts]);

  function openRoom(room: SalonRoomRow) {
    if (room.is_vip_only && !isVip) {
      setNotice("");
      setErrorMsg("Cette salle est réservée aux membres VIP.");
      return;
    }

    router.push(`/salons/${room.id}`);
  }

  if (loading) {
    return (
      <main className="salons-page">
        <style>{css}</style>
        <div className="salons-loading">
          <div className="salons-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="salons-page">
      <style>{css}</style>

      <div className="salons-bg salons-bg-a" />
      <div className="salons-bg salons-bg-b" />
      <div className="salons-noise" />
      <div className="salons-orb salons-orb-a" />
      <div className="salons-orb salons-orb-b" />

      <div className="salons-shell">
        <header className="salons-topbar">
          <div>
            <div className="salons-kicker">Rooms live</div>
            <h1 className="salons-title">Salons Webcam</h1>
            <p className="salons-subtitle">
              Explore les salles publiques et VIP, entre dans une ambiance précise et rejoins l’univers en direct.
            </p>
          </div>

          <div className="salons-topActions">
            <button className="salons-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="salons-navBtn" type="button" onClick={() => router.push("/messages")}>
              Messages
            </button>
            <button className="salons-navBtn" type="button" onClick={() => router.push("/profile")}>
              Profil
            </button>
            {profile?.is_admin ? (
              <button className="salons-navBtn gold" type="button" onClick={() => router.push("/admin")}>
                Admin
              </button>
            ) : null}
          </div>
        </header>

        <section className="salons-heroCard">
          <div className="salons-heroMain">
            <div className="salons-userName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>

            <div className="salons-badgeRow">
              <span className="salons-badge ether">0 Ξ</span>
              <span className={`salons-badge ${isVip ? "vip" : "standard"}`}>
                {profile?.vip_level || "Standard"}
              </span>
            </div>

            <div className="salons-heroText">
              Choisis une salle, entre dans une room et navigue entre les ambiances publiques ou premium.
            </div>
          </div>

          <div className="salons-statPack">
            <div className="salons-statCard">
              <span>En ligne</span>
              <strong>{totalOnline}</strong>
            </div>
            <div className="salons-statCard">
              <span>Salles</span>
              <strong>{rooms.length}</strong>
            </div>
            <div className="salons-statCard">
              <span>VIP</span>
              <strong>{vipRooms.length}</strong>
            </div>
          </div>
        </section>

        {notice ? <div className="salons-notice">{notice}</div> : null}
        {errorMsg ? <div className="salons-error">{errorMsg}</div> : null}

        <section className="salons-searchRow">
          <input
            className="salons-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une salle..."
          />

          {!isVip ? (
            <button className="salons-vipBtn" type="button" onClick={() => router.push("/vip")}>
              Débloquer VIP
            </button>
          ) : null}
        </section>

        <section className="salons-section">
          <div className="salons-sectionHeader">
            <div>
              <div className="salons-sectionKicker">Ouvert à tous</div>
              <h2 className="salons-sectionTitle">Salles publiques</h2>
            </div>
          </div>

          {publicRooms.length > 0 ? (
            <div className="salons-grid">
              {publicRooms.map((room) => {
                const online = roomCounts[String(room.id)] || 0;
                const mood = roomMood(room);

                return (
                  <article key={room.id} className={`salons-card ${mood}`}>
                    <div className="salons-cardGlow" />

                    <div className="salons-cardTop">
                      <div className="salons-chipRow">
                        <span className="salons-chip">Public</span>
                        <span className="salons-chip">{room.room_type || "room"}</span>
                        {room.tag ? <span className="salons-chip">{room.tag}</span> : null}
                      </div>
                    </div>

                    <h3 className="salons-cardTitle">{room.name || "Salon public"}</h3>
                    <p className="salons-cardText">
                      {room.description || "Ambiance publique EtherCristal."}
                    </p>

                    <div className="salons-cardStats">
                      <div className="salons-miniStat">
                        <span>En ligne</span>
                        <strong>{online}</strong>
                      </div>
                      <div className="salons-miniStat">
                        <span>Places</span>
                        <strong>{room.capacity || 0}</strong>
                      </div>
                    </div>

                    <div className="salons-cardActions">
                      <button className="salons-mainBtn gold" type="button" onClick={() => openRoom(room)}>
                        Entrer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="salons-emptyBox">Aucune salle publique trouvée.</div>
          )}
        </section>

        <section className="salons-section vipSection">
          <div className="salons-sectionHeader">
            <div>
              <div className="salons-sectionKicker">Premium</div>
              <h2 className="salons-sectionTitle vip">Salles VIP</h2>
            </div>
          </div>

          {vipRooms.length > 0 ? (
            <div className="salons-grid">
              {vipRooms.map((room) => {
                const online = roomCounts[String(room.id)] || 0;
                const mood = roomMood(room);

                return (
                  <article key={room.id} className={`salons-card ${mood} vipCard`}>
                    <div className="salons-cardGlow" />

                    <div className="salons-cardTop">
                      <div className="salons-chipRow">
                        <span className="salons-chip vip">VIP</span>
                        <span className="salons-chip">{room.room_type || "room"}</span>
                        {room.tag ? <span className="salons-chip">{room.tag}</span> : null}
                      </div>
                    </div>

                    <h3 className="salons-cardTitle">{room.name || "Salon VIP"}</h3>
                    <p className="salons-cardText">
                      {room.description || "Ambiance premium réservée aux membres VIP."}
                    </p>

                    <div className="salons-cardStats">
                      <div className="salons-miniStat">
                        <span>En ligne</span>
                        <strong>{online}</strong>
                      </div>
                      <div className="salons-miniStat">
                        <span>Places</span>
                        <strong>{room.capacity || 0}</strong>
                      </div>
                    </div>

                    <div className="salons-cardActions">
                      {isVip ? (
                        <button className="salons-mainBtn violet" type="button" onClick={() => openRoom(room)}>
                          Entrer VIP
                        </button>
                      ) : (
                        <button className="salons-mainBtn ghost" type="button" onClick={() => router.push("/vip")}>
                          Débloquer l’accès
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="salons-emptyBox">Aucune salle VIP trouvée.</div>
          )}
        </section>
      </div>
    </main>
  );
}

const css = `
.salons-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.salons-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.salons-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.salons-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}
.salons-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}
.salons-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.salons-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.salons-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.salons-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.salons-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.salons-kicker{
  display:inline-flex;
  min-height:36px;
  padding:8px 14px;
  border-radius:999px;
  background:rgba(212,175,55,0.10);
  color:#f6dc86;
  border:1px solid rgba(212,175,55,0.18);
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
}

.salons-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.salons-subtitle{
  margin:14px 0 0;
  max-width:820px;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
  font-size:17px;
}

.salons-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.salons-navBtn{
  min-height:46px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  font-weight:800;
  cursor:pointer;
}
.salons-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.salons-heroCard{
  margin-top:24px;
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  flex-wrap:wrap;
  padding:22px;
  border-radius:26px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
}

.salons-userName{
  font-size:34px;
  font-weight:900;
  line-height:1;
}
.salons-badgeRow{
  margin-top:12px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.salons-badge{
  display:inline-flex;
  min-height:32px;
  padding:7px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff2d3;
  font-size:12px;
  font-weight:900;
}
.salons-badge.ether{
  background:rgba(212,175,55,0.14);
  border-color:rgba(212,175,55,0.22);
  color:#fff1c4;
}
.salons-badge.vip{
  background:rgba(139,92,246,0.16);
  border-color:rgba(139,92,246,0.26);
  color:#eadcff;
}
.salons-badge.standard{
  background:rgba(255,255,255,0.08);
}
.salons-heroText{
  margin-top:14px;
  color:rgba(255,245,220,0.74);
  line-height:1.75;
  max-width:700px;
}

.salons-statPack{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}
.salons-statCard{
  min-width:150px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.salons-statCard span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.salons-statCard strong{
  display:block;
  margin-top:8px;
  font-size:24px;
  color:#fff2cb;
}

.salons-notice,
.salons-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.salons-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.salons-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.salons-searchRow{
  margin-top:24px;
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
}

.salons-search{
  width:100%;
  min-height:56px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.salons-search::placeholder{
  color:rgba(255,255,255,0.42);
}

.salons-vipBtn{
  min-height:56px;
  padding:0 18px;
  border:none;
  border-radius:18px;
  background:linear-gradient(90deg,#6b42b8,#9c6cff);
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.salons-section{
  margin-top:30px;
}
.salons-sectionHeader{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:end;
  flex-wrap:wrap;
}
.salons-sectionKicker{
  display:inline-flex;
  min-height:30px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}
.salons-sectionTitle{
  margin:14px 0 0;
  font-size:38px;
  line-height:1;
  font-weight:900;
}
.salons-sectionTitle.vip{
  background:linear-gradient(90deg,#fff0c2,#d4af37,#9c6cff);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.salons-grid{
  margin-top:20px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:18px;
}

.salons-card{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  padding:22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  min-height:320px;
  display:flex;
  flex-direction:column;
}
.salons-cardGlow{
  position:absolute;
  width:180px;
  height:180px;
  right:-40px;
  bottom:-40px;
  border-radius:999px;
  filter:blur(36px);
  opacity:.18;
}
.salons-card.default .salons-cardGlow{ background:rgba(255,120,90,0.45); }
.salons-card.gold .salons-cardGlow{ background:rgba(212,175,55,0.75); }
.salons-card.velvet .salons-cardGlow{ background:rgba(174,92,255,0.55); }
.salons-card.dark .salons-cardGlow{ background:rgba(85,110,255,0.60); }
.salons-card.vip .salons-cardGlow{ background:rgba(155,100,255,0.70); }

.salons-chipRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.salons-chip{
  display:inline-flex;
  min-height:30px;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff2d3;
  font-size:11px;
  font-weight:900;
}
.salons-chip.vip{
  background:rgba(139,92,246,0.16);
  border-color:rgba(139,92,246,0.26);
  color:#eadcff;
}

.salons-cardTitle{
  margin:18px 0 0;
  font-size:28px;
  line-height:1;
  font-weight:900;
}
.salons-cardText{
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
  min-height:76px;
}
.salons-cardStats{
  margin-top:18px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.salons-miniStat{
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.salons-miniStat span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.salons-miniStat strong{
  display:block;
  margin-top:8px;
  font-size:22px;
  color:#fff2cb;
}

.salons-cardActions{
  margin-top:auto;
  padding-top:18px;
}

.salons-mainBtn{
  min-height:48px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.salons-mainBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.salons-mainBtn.violet{
  background:linear-gradient(90deg,#6b42b8,#9c6cff);
  color:#fff;
}
.salons-mainBtn.ghost{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
}

.salons-emptyBox{
  margin-top:20px;
  padding:18px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}

.salons-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.salons-loader{
  width:64px;
  height:64px;
  border:6px solid rgba(212,175,55,0.2);
  border-top:6px solid #d4af37;
  border-radius:50%;
  animation:spin 1.3s linear infinite;
}
@keyframes spin{
  to{transform:rotate(360deg)}
}

@media (max-width: 1180px){
  .salons-grid{
    grid-template-columns:1fr 1fr;
  }
}
@media (max-width: 820px){
  .salons-title{
    font-size:40px;
  }

  .salons-searchRow{
    grid-template-columns:1fr;
  }

  .salons-grid{
    grid-template-columns:1fr;
  }
}
@media (max-width: 560px){
  .salons-title{
    font-size:34px;
  }

  .salons-statPack{
    width:100%;
  }

  .salons-statCard{
    flex:1 1 100%;
  }
}
`;
