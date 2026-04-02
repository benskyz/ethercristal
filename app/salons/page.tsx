"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Profile = {
  id: string;
  username?: string;
  vip_level?: string;
  is_admin?: boolean;
};

type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  is_vip_only: boolean;
};

type RoomCount = {
  room_id: string;
  participants_online: number;
};

export default function SalonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const supabase = getSupabaseBrowserClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.push("/login");

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();

    setProfile(profileData);

    const { data: roomsData } = await supabase
      .from("salon_rooms")
      .select("*")
      .eq("is_active", true);

    const { data: countsData } = await supabase
      .from("salon_room_counts")
      .select("*");

    const map: Record<string, number> = {};
    (countsData || []).forEach((c: any) => {
      map[c.room_id] = c.participants_online || 0;
    });

    setRooms(roomsData || []);
    setCounts(map);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [rooms, search]);

  const publicRooms = filtered.filter((r) => !r.is_vip_only);
  const vipRooms = filtered.filter((r) => r.is_vip_only);

  const totalOnline = Object.values(counts).reduce((a, b) => a + b, 0);

  const isVip = profile?.vip_level && profile.vip_level !== "free";
  const isAdmin = profile?.is_admin;

  if (loading) {
    return (
      <div className="ec-loading-screen">
        <div className="ec-loader" />
      </div>
    );
  }

  return (
    <main className="salons-page">
      <style>{css}</style>

      <div className="ec-page-shell">

        {/* HEADER */}
        <header className="salons-header">
          <div>
            <h1 className="ec-title">Salons EtherCristal</h1>
            <p className="ec-subtitle">
              Explore les salles publiques et VIP en direct
            </p>
          </div>

          <div className="salons-stats">
            <div className="ec-sidecard">
              <span>En ligne</span>
              <strong>{totalOnline}</strong>
            </div>

            <div className="ec-sidecard">
              <span>Salles</span>
              <strong>{rooms.length}</strong>
            </div>
          </div>
        </header>

        {/* ACTIONS */}
        <div className="salons-actions">
          <input
            className="ec-input"
            placeholder="Rechercher une salle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isAdmin && (
            <button
              className="ec-btn ec-btn-gold"
              onClick={() => alert("Créer room (admin)")}
            >
              + Ajouter une room
            </button>
          )}
        </div>

        {/* PUBLIC */}
        <section className="salons-section">
          <h2 className="salons-section-title">Salles publiques</h2>

          <div className="salons-grid">
            {publicRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                online={counts[room.id]}
                isVip={false}
                canAccess={true}
                router={router}
              />
            ))}
          </div>
        </section>

        {/* VIP */}
        <section className="salons-section">
          <h2 className="salons-section-title vip">Salles VIP</h2>

          <div className="salons-grid">
            {vipRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                online={counts[room.id]}
                isVip={true}
                canAccess={isVip}
                router={router}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/* CARD COMPONENT */
function RoomCard({ room, online, isVip, canAccess, router }: any) {
  return (
    <div className={`salon-card ${isVip ? "vip" : ""}`}>

      <div className="salon-glow" />

      <div className="salon-header">
        <span className={`salon-badge ${isVip ? "vip" : "public"}`}>
          {isVip ? "VIP" : "Public"}
        </span>
        <span className="salon-online">{online || 0} en ligne</span>
      </div>

      <h3 className="salon-title">{room.name}</h3>
      <p className="salon-desc">{room.description}</p>

      <div className="salon-footer">
        <span>🎯 {room.capacity}</span>

        <button
          className={`salon-btn ${isVip ? "vip" : ""}`}
          onClick={() => {
            if (!canAccess) {
              router.push("/vip");
            } else {
              router.push(`/salons/${room.id}`);
            }
          }}
        >
          {isVip && !canAccess ? "Débloquer VIP" : "Entrer"}
        </button>
      </div>
    </div>
  );
}

/* CSS */
const css = `
.salons-header{
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:20px;
}

.salons-stats{
  display:flex;
  gap:10px;
}

.salons-actions{
  margin-top:20px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.salons-section{
  margin-top:30px;
}

.salons-section-title{
  font-size:26px;
  font-weight:900;
}

.salons-section-title.vip{
  color:#d4af37;
}

.salons-grid{
  margin-top:20px;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:20px;
}

/* CARD */
.salon-card{
  position:relative;
  border-radius:24px;
  padding:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  transition:.3s;
}

.salon-card:hover{
  transform:translateY(-5px);
  border-color:#d4af37;
}

.salon-glow{
  position:absolute;
  width:200px;
  height:200px;
  bottom:-50px;
  right:-50px;
  border-radius:999px;
  background:#294a7a;
  opacity:.2;
  filter:blur(40px);
}

.salon-card.vip .salon-glow{
  background:#d4af37;
}

.salon-header{
  display:flex;
  justify-content:space-between;
}

.salon-badge{
  padding:5px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:800;
}

.salon-badge.vip{
  background:rgba(212,175,55,0.2);
}

.salon-title{
  margin-top:10px;
  font-size:22px;
  font-weight:900;
}

.salon-desc{
  font-size:14px;
  margin-top:6px;
  color:#ccc;
}

.salon-footer{
  margin-top:15px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.salon-btn{
  padding:8px 12px;
  border:none;
  border-radius:10px;
  font-weight:800;
  background:#294a7a;
  color:#fff;
  cursor:pointer;
}

.salon-btn.vip{
  background:#d4af37;
  color:#000;
}
`;
