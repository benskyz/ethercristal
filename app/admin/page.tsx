"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_verified?: boolean | null;
  is_admin?: boolean | null;
  is_blocked?: boolean | null;
  warning_count?: number | null;
  admin_note?: string | null;
  city?: string | null;
  age?: number | null;
  bio?: string | null;
  created_at?: string | null;
  last_warning_at?: string | null;
  allow_messages?: boolean | null;
  show_online?: boolean | null;
};

type RoomCountRow = {
  room_id?: string | number | null;
  room_name?: string | null;
  viewers_count?: number | null;
  members_count?: number | null;
  is_live?: boolean | null;
};

type FilterMode = "all" | "admins" | "vip" | "blocked" | "warned";

function getName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

function getInitial(profile: ProfileRow | null) {
  return getName(profile).trim().charAt(0).toUpperCase() || "M";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA");
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [me, setMe] = useState<ProfileRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rooms, setRooms] = useState<RoomCountRow[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedId, setSelectedId] = useState("");

  const [etherDelta, setEtherDelta] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadAdmin();
  }, []);

  async function loadAdmin() {
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

      const { data: meProfile, error: meError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (meError) {
        throw new Error(meError.message || "Impossible de charger ton profil admin.");
      }

      if (!meProfile?.is_admin) {
        router.push("/dashboard");
        return;
      }

      const [{ data: profileRows, error: profileError }, { data: roomRows, error: roomError }] =
        await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("salon_room_counts").select("*").order("viewers_count", { ascending: false }),
        ]);

      if (profileError) {
        throw new Error(profileError.message || "Impossible de charger les membres.");
      }

      if (roomError) {
        throw new Error(roomError.message || "Impossible de charger les salons.");
      }

      const safeProfiles = (profileRows || []) as ProfileRow[];
      setMe(meProfile as ProfileRow);
      setProfiles(safeProfiles);
      setRooms((roomRows || []) as RoomCountRow[]);

      if (safeProfiles.length > 0) {
        setSelectedId((prev) => prev || safeProfiles[0].id);
      }

      const nextNotes: Record<string, string> = {};
      safeProfiles.forEach((p) => {
        nextNotes[p.id] = String(p.admin_note || "");
      });
      setNoteDraft(nextNotes);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur admin.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfiles(selectedKeepId?: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Impossible d’actualiser les membres.");
    }

    const safe = (data || []) as ProfileRow[];
    setProfiles(safe);

    if (selectedKeepId) {
      setSelectedId(selectedKeepId);
    }

    const nextNotes: Record<string, string> = {};
    safe.forEach((p) => {
      nextNotes[p.id] = noteDraft[p.id] ?? String(p.admin_note || "");
    });
    setNoteDraft(nextNotes);
  }

  async function updateProfile(userId: string, patch: Record<string, any>, successText: string) {
    try {
      setSavingId(userId);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);

      if (error) {
        throw new Error(error.message || "Modification refusée.");
      }

      await refreshProfiles(userId);
      setNotice(successText);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur modification.");
    } finally {
      setSavingId("");
    }
  }

  const stats = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter((p) => p.is_admin).length;
    const vip = profiles.filter((p) => {
      const v = String(p.vip_level || "").toLowerCase();
      return v !== "" && v !== "standard" && v !== "free";
    }).length;
    const blocked = profiles.filter((p) => p.is_blocked).length;
    const warned = profiles.filter((p) => Number(p.warning_count || 0) > 0).length;
    const liveRooms = rooms.filter((r) => r.is_live || Number(r.viewers_count || 0) > 0).length;
    const viewers = rooms.reduce((acc, r) => acc + Number(r.viewers_count || 0), 0);

    return { total, admins, vip, blocked, warned, liveRooms, viewers };
  }, [profiles, rooms]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return profiles.filter((p) => {
      const text = [p.username, p.city, p.bio, p.vip_level, p.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchOk = !q ? true : text.includes(q);
      if (!searchOk) return false;

      if (filter === "admins") return Boolean(p.is_admin);
      if (filter === "vip") {
        const v = String(p.vip_level || "").toLowerCase();
        return v !== "" && v !== "standard" && v !== "free";
      }
      if (filter === "blocked") return Boolean(p.is_blocked);
      if (filter === "warned") return Number(p.warning_count || 0) > 0;

      return true;
    });
  }, [profiles, search, filter]);

  const selectedProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedId) || null;
  }, [profiles, selectedId]);

  async function applyEther(userId: string) {
    const delta = Number(etherDelta[userId] || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      setErrorMsg("Entre une quantité Ether valide.");
      return;
    }

    const target = profiles.find((p) => p.id === userId);
    if (!target) return;

    const nextBalance = Math.max(0, Number(target.ether_balance || 0) + delta);

    await updateProfile(
      userId,
      { ether_balance: nextBalance },
      `${delta > 0 ? "Ajout" : "Retrait"} de ${Math.abs(delta)} Ξ effectué.`
    );
  }

  async function warnMember(userId: string) {
    const target = profiles.find((p) => p.id === userId);
    if (!target) return;

    await updateProfile(
      userId,
      {
        warning_count: Number(target.warning_count || 0) + 1,
        last_warning_at: new Date().toISOString(),
      },
      "Avertissement ajouté."
    );
  }

  async function clearWarnings(userId: string) {
    await updateProfile(
      userId,
      { warning_count: 0, last_warning_at: null },
      "Avertissements supprimés."
    );
  }

  async function saveNote(userId: string) {
    await updateProfile(
      userId,
      { admin_note: String(noteDraft[userId] || "") },
      "Note admin enregistrée."
    );
  }

  async function toggleBlock(userId: string, blocked: boolean) {
    await updateProfile(
      userId,
      { is_blocked: blocked, allow_messages: blocked ? false : true },
      blocked ? "Membre bloqué." : "Membre débloqué."
    );
  }

  async function setVip(userId: string, value: string) {
    await updateProfile(userId, { vip_level: value }, `Niveau mis à jour : ${value}`);
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    if (userId === me?.id && !isAdmin) {
      setErrorMsg("Tu ne peux pas te retirer toi-même les droits admin ici.");
      return;
    }

    await updateProfile(
      userId,
      { is_admin: isAdmin },
      isAdmin ? "Droits admin accordés." : "Droits admin retirés."
    );
  }

  async function toggleMessages(userId: string, allowed: boolean) {
    await updateProfile(
      userId,
      { allow_messages: allowed },
      allowed ? "Messages autorisés." : "Messages bloqués."
    );
  }

  async function toggleOnline(userId: string, visible: boolean) {
    await updateProfile(
      userId,
      { show_online: visible },
      visible ? "Visibilité online activée." : "Visibilité online masquée."
    );
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setErrorMsg("Impossible de se déconnecter.");
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <style>{css}</style>
        <div className="admin-loadingWrap">
          <div className="admin-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <style>{css}</style>

      <div className="admin-bg admin-bg-a" />
      <div className="admin-bg admin-bg-b" />
      <div className="admin-smoke admin-smoke-a" />
      <div className="admin-smoke admin-smoke-b" />
      <div className="admin-glow admin-glow-red" />
      <div className="admin-glow admin-glow-blue" />
      <div className="admin-glow admin-glow-violet" />

      <div className="admin-shell">
        <header className="admin-top">
          <div className="admin-brandBlock">
            <div className="admin-brandRow">
              <div className="admin-gem">💎</div>
              <div>
                <div className="admin-logo">EtherCristal Admin</div>
                <div className="admin-kicker">Control lounge</div>
              </div>
            </div>

            <h1 className="admin-title">Centre de contrôle total</h1>
            <p className="admin-subtitle">
              Gère les membres, le statut VIP, l’Ether, les blocages, les avertissements,
              les notes internes et l’ensemble des accès critiques.
            </p>
          </div>

          <div className="admin-topActions">
            <button className="admin-btn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="admin-btn" type="button" onClick={() => router.push("/salons")}>
              Salons
            </button>
            <button className="admin-btn" type="button" onClick={() => router.push("/shop")}>
              Shop
            </button>
            <button className="admin-btn danger" type="button" disabled={loggingOut} onClick={() => void handleLogout()}>
              {loggingOut ? "Déconnexion..." : "Déconnexion"}
            </button>
          </div>
        </header>

        <section className="admin-statsGrid">
          <div className="admin-statCard"><span>Membres</span><strong>{stats.total}</strong></div>
          <div className="admin-statCard"><span>Admins</span><strong>{stats.admins}</strong></div>
          <div className="admin-statCard diamond"><span>VIP / VIP+</span><strong>{stats.vip}</strong></div>
          <div className="admin-statCard danger"><span>Bloqués</span><strong>{stats.blocked}</strong></div>
          <div className="admin-statCard"><span>Avertis</span><strong>{stats.warned}</strong></div>
          <div className="admin-statCard diamond"><span>Salons live</span><strong>{stats.liveRooms}</strong></div>
          <div className="admin-statCard"><span>Viewers live</span><strong>{stats.viewers}</strong></div>
        </section>

        {notice ? <div className="admin-notice">{notice}</div> : null}
        {errorMsg ? <div className="admin-error">{errorMsg}</div> : null}

        <div className="admin-layout">
          <section className="admin-panel admin-listPanel">
            <div className="admin-panelKicker">Membres</div>
            <h2 className="admin-panelTitle">Gestion utilisateurs</h2>

            <div className="admin-toolbar">
              <input
                className="admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher un membre, une ville, un badge..."
              />

              <div className="admin-filterRow">
                {(["all", "admins", "vip", "blocked", "warned"] as FilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`admin-pill ${filter === mode ? "active" : ""}`}
                    onClick={() => setFilter(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-memberList">
              {filteredProfiles.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`admin-memberItem ${selectedId === member.id ? "active" : ""}`}
                  onClick={() => setSelectedId(member.id)}
                >
                  <div className="admin-memberAvatar">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={getName(member)} className="admin-avatarImg" />
                    ) : (
                      <span>{getInitial(member)}</span>
                    )}
                  </div>

                  <div className="admin-memberInfo">
                    <strong>{getName(member)}</strong>
                    <span>
                      {member.vip_level || "Standard"}
                      {member.is_admin ? " • Admin" : ""}
                      {member.is_blocked ? " • Bloqué" : ""}
                    </span>
                  </div>

                  {Number(member.warning_count || 0) > 0 ? (
                    <div className="admin-warningBubble">{member.warning_count}</div>
                  ) : null}
                </button>
              ))}

              {filteredProfiles.length === 0 ? (
                <div className="admin-empty">Aucun membre trouvé.</div>
              ) : null}
            </div>
          </section>

          <section className="admin-panel admin-detailPanel">
            {selectedProfile ? (
              <>
                <div className="admin-detailTop">
                  <div className="admin-detailIdentity">
                    <div className="admin-detailAvatar">
                      {selectedProfile.avatar_url ? (
                        <img src={selectedProfile.avatar_url} alt={getName(selectedProfile)} className="admin-detailAvatarImg" />
                      ) : (
                        <span>{getInitial(selectedProfile)}</span>
                      )}
                    </div>

                    <div>
                      <h2 className="admin-detailName">{getName(selectedProfile)}</h2>
                      <div className="admin-detailMeta">
                        <span>{selectedProfile.vip_level || "Standard"}</span>
                        <span>•</span>
                        <span>{selectedProfile.city || "Ville inconnue"}</span>
                        <span>•</span>
                        <span>{selectedProfile.age ? `${selectedProfile.age} ans` : "Âge non défini"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-quickBadges">
                    {selectedProfile.is_admin ? <span className="admin-badge diamond">Admin</span> : null}
                    {selectedProfile.is_blocked ? <span className="admin-badge danger">Bloqué</span> : null}
                    {selectedProfile.is_verified ? <span className="admin-badge success">Vérifié</span> : null}
                    {Number(selectedProfile.warning_count || 0) > 0 ? (
                      <span className="admin-badge warn">{selectedProfile.warning_count} avert.</span>
                    ) : null}
                  </div>
                </div>

                <div className="admin-detailGrid">
                  <div className="admin-box"><span>ID membre</span><strong>{selectedProfile.id}</strong></div>
                  <div className="admin-box"><span>Ether</span><strong>{Number(selectedProfile.ether_balance || 0)} Ξ</strong></div>
                  <div className="admin-box"><span>Inscription</span><strong>{formatDate(selectedProfile.created_at)}</strong></div>
                  <div className="admin-box"><span>Dernier avertissement</span><strong>{formatDate(selectedProfile.last_warning_at)}</strong></div>
                </div>

                <div className="admin-cardAction">
                  <div className="admin-cardTitle">Ether</div>
                  <div className="admin-inline">
                    <input
                      className="admin-smallInput"
                      value={etherDelta[selectedProfile.id] || ""}
                      onChange={(e) =>
                        setEtherDelta((prev) => ({ ...prev, [selectedProfile.id]: e.target.value }))
                      }
                      placeholder="+100 ou -50"
                    />
                    <button
                      className="admin-btn primary"
                      type="button"
                      disabled={savingId === selectedProfile.id}
                      onClick={() => void applyEther(selectedProfile.id)}
                    >
                      Appliquer
                    </button>
                  </div>
                </div>

                <div className="admin-cardAction">
                  <div className="admin-cardTitle">Statut VIP</div>
                  <div className="admin-inline wrap">
                    <button className="admin-btn" type="button" onClick={() => void setVip(selectedProfile.id, "Standard")}>Standard</button>
                    <button className="admin-btn primary" type="button" onClick={() => void setVip(selectedProfile.id, "VIP")}>VIP</button>
                    <button className="admin-btn diamond" type="button" onClick={() => void setVip(selectedProfile.id, "VIP+")}>VIP+</button>
                  </div>
                </div>

                <div className="admin-cardAction">
                  <div className="admin-cardTitle">Administration</div>
                  <div className="admin-inline wrap">
                    <button className="admin-btn diamond" type="button" onClick={() => void toggleAdmin(selectedProfile.id, true)}>Donner admin</button>
                    <button className="admin-btn" type="button" onClick={() => void toggleAdmin(selectedProfile.id, false)}>Retirer admin</button>
                  </div>
                </div>

                <div className="admin-cardAction">
                  <div className="admin-cardTitle">Blocage / avertissements</div>
                  <div className="admin-inline wrap">
                    <button className="admin-btn danger" type="button" onClick={() => void toggleBlock(selectedProfile.id, true)}>Bloquer</button>
                    <button className="admin-btn success" type="button" onClick={() => void toggleBlock(selectedProfile.id, false)}>Débloquer</button>
                    <button className="admin-btn warn" type="button" onClick={() => void warnMember(selectedProfile.id)}>Avertir</button>
                    <button className="admin-btn" type="button" onClick={() => void clearWarnings(selectedProfile.id)}>Reset avert.</button>
                  </div>
                </div>

                <div className="admin-cardAction">
                  <div className="admin-cardTitle">Messages / visibilité</div>
                  <div className="admin-inline wrap">
                    <button className="admin-btn" type="button" onClick={() => void toggleMessages(selectedProfile.id, true)}>Autoriser messages</button>
                    <button className="admin-btn danger" type="button" onClick={() => void toggleMessages(selectedProfile.id, false)}>Couper messages</button>
                    <button className="admin-btn success" type="button" onClick={() => void toggleOnline(selectedProfile.id, true)}>Montrer online</button>
                    <button className="admin-btn" type="button" onClick={() => void toggleOnline(selectedProfile.id, false)}>Masquer online</button>
                  </div>
                </div>

                <div className="admin-notesPanel">
                  <div className="admin-cardTitle">Note admin privée</div>
                  <textarea
                    className="admin-textarea"
                    value={noteDraft[selectedProfile.id] || ""}
                    onChange={(e) =>
                      setNoteDraft((prev) => ({ ...prev, [selectedProfile.id]: e.target.value }))
                    }
                    placeholder="Ajoute une note interne sur ce membre..."
                  />
                  <div className="admin-inline">
                    <button className="admin-btn primary" type="button" onClick={() => void saveNote(selectedProfile.id)}>
                      Enregistrer note
                    </button>
                  </div>
                </div>

                <div className="admin-bioPanel">
                  <div className="admin-cardTitle">Bio membre</div>
                  <div className="admin-bioText">{selectedProfile.bio || "Aucune bio."}</div>
                </div>
              </>
            ) : (
              <div className="admin-empty">Sélectionne un membre pour l’administrer.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const css = `
.admin-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 0%, rgba(255,0,72,0.08), transparent 20%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02), transparent 38%),
    linear-gradient(180deg,#030304 0%, #120007 42%, #070312 75%, #030304 100%);
  color:#fff;
}
.admin-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.admin-bg-a{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.12;
}
.admin-bg-b{
  background:
    radial-gradient(circle at 24% 30%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 76% 70%, rgba(255,255,255,0.018), transparent 20%);
}
.admin-smoke{
  position:absolute;
  pointer-events:none;
  z-index:1;
  filter:blur(70px);
  opacity:.22;
  mix-blend-mode:screen;
  animation:adminSmokeFloat 18s ease-in-out infinite alternate;
}
.admin-smoke-a{
  top:8%;
  left:-8%;
  width:560px;
  height:260px;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 22%, transparent 58%),
    radial-gradient(ellipse at 60% 40%, rgba(255,0,72,0.16) 0%, rgba(255,0,72,0.06) 28%, transparent 62%),
    radial-gradient(ellipse at 82% 60%, rgba(96,165,250,0.14) 0%, rgba(96,165,250,0.05) 24%, transparent 58%);
}
.admin-smoke-b{
  bottom:10%;
  right:-10%;
  width:620px;
  height:300px;
  background:
    radial-gradient(ellipse at 30% 55%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 24%, transparent 58%),
    radial-gradient(ellipse at 58% 42%, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0.05) 24%, transparent 60%),
    radial-gradient(ellipse at 78% 58%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.04) 22%, transparent 56%);
}
.admin-glow{
  position:absolute;
  border-radius:999px;
  pointer-events:none;
  z-index:1;
  filter:blur(120px);
  opacity:.14;
  animation:adminFogPulse 8s ease-in-out infinite;
}
.admin-glow-red{
  top:18%;
  left:18%;
  width:260px;
  height:260px;
  background:rgba(255,0,72,0.34);
}
.admin-glow-blue{
  top:16%;
  right:22%;
  width:280px;
  height:280px;
  background:rgba(59,130,246,0.30);
  animation-delay:1.2s;
}
.admin-glow-violet{
  bottom:16%;
  left:38%;
  width:300px;
  height:300px;
  background:rgba(139,92,246,0.26);
  animation-delay:2.1s;
}
.admin-shell{
  position:relative;
  z-index:2;
  max-width:1600px;
  margin:0 auto;
  padding:24px;
}
.admin-top{
  display:flex;
  justify-content:space-between;
  gap:24px;
  align-items:flex-start;
  flex-wrap:wrap;
  margin-bottom:20px;
  padding:24px;
  border-radius:32px;
  background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(18px);
}
.admin-brandBlock{
  flex:1 1 700px;
}
.admin-brandRow{
  display:flex;
  align-items:center;
  gap:14px;
}
.admin-gem{
  width:58px;
  height:58px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:18px;
  background:linear-gradient(135deg,#7c3aed,#2563eb);
  box-shadow:0 0 24px rgba(96,165,250,0.22);
  font-size:26px;
}
.admin-logo{
  font-size:42px;
  line-height:1;
  font-weight:900;
  letter-spacing:-1.4px;
  background:linear-gradient(90deg,#ef4444 0%, #ec4899 34%, #60a5fa 68%, #a78bfa 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.admin-kicker{
  margin-top:5px;
  color:rgba(255,255,255,0.52);
  font-size:12px;
  font-weight:800;
  letter-spacing:.18em;
  text-transform:uppercase;
}
.admin-title{
  margin:22px 0 0;
  font-size:34px;
  font-weight:900;
  line-height:1.08;
}
.admin-subtitle{
  margin:14px 0 0;
  max-width:820px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
}
.admin-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  align-items:center;
}
.admin-btn{
  min-height:46px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.08);
  color:#fff;
  font-weight:900;
  cursor:pointer;
}
.admin-btn.primary{ background:linear-gradient(90deg,#b91c1c,#ec4899); }
.admin-btn.diamond{ background:linear-gradient(90deg,#2563eb,#8b5cf6); }
.admin-btn.success{ background:linear-gradient(90deg,#166534,#22c55e); }
.admin-btn.warn{ background:linear-gradient(90deg,#a16207,#f59e0b); }
.admin-btn.danger{ background:linear-gradient(90deg,#7f1d1d,#dc2626); }

.admin-statsGrid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:14px;
}
.admin-statCard{
  padding:16px;
  border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
}
.admin-statCard.diamond{ box-shadow:inset 0 0 0 1px rgba(96,165,250,0.14); }
.admin-statCard.danger{ box-shadow:inset 0 0 0 1px rgba(239,68,68,0.14); }
.admin-statCard span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.admin-statCard strong{
  display:block;
  margin-top:10px;
  font-size:28px;
}
.admin-notice,
.admin-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.admin-notice{
  background:rgba(34,197,94,0.10);
  border:1px solid rgba(34,197,94,0.20);
  color:#b7ffd0;
}
.admin-error{
  background:rgba(255,60,80,0.12);
  border:1px solid rgba(255,60,80,0.18);
  color:#ffbcc8;
}
.admin-layout{
  margin-top:20px;
  display:grid;
  grid-template-columns:420px minmax(0,1fr);
  gap:20px;
}
.admin-panel{
  border-radius:30px;
  background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(18px);
}
.admin-listPanel{ padding:20px; }
.admin-detailPanel{ padding:24px; }
.admin-panelKicker{
  display:inline-flex;
  min-height:30px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}
.admin-panelTitle{
  margin:14px 0 0;
  font-size:30px;
  font-weight:900;
}
.admin-toolbar{
  margin-top:18px;
  display:grid;
  gap:12px;
}
.admin-search{
  width:100%;
  min-height:54px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
}
.admin-filterRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.admin-pill{
  min-height:40px;
  padding:10px 14px;
  border:none;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  font-weight:800;
  cursor:pointer;
  text-transform:uppercase;
}
.admin-pill.active{
  background:linear-gradient(90deg,#ef4444,#8b5cf6);
}
.admin-memberList{
  margin-top:18px;
  display:grid;
  gap:10px;
  max-height:72vh;
  overflow:auto;
  padding-right:4px;
}
.admin-memberItem{
  width:100%;
  padding:12px;
  border:none;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.06);
  color:#fff;
  display:flex;
  align-items:center;
  gap:12px;
  text-align:left;
  cursor:pointer;
}
.admin-memberItem.active{
  background:linear-gradient(90deg, rgba(239,68,68,0.12), rgba(96,165,250,0.10));
  border-color:rgba(96,165,250,0.20);
}
.admin-memberAvatar{
  width:52px;
  height:52px;
  border-radius:16px;
  overflow:hidden;
  background:linear-gradient(135deg,#2563eb,#8b5cf6);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  flex:0 0 auto;
}
.admin-avatarImg{
  width:100%;
  height:100%;
  object-fit:cover;
}
.admin-memberInfo{
  display:grid;
  gap:4px;
}
.admin-memberInfo strong{
  font-size:15px;
}
.admin-memberInfo span{
  font-size:12px;
  color:rgba(255,255,255,0.58);
}
.admin-warningBubble{
  margin-left:auto;
  min-width:28px;
  height:28px;
  padding:0 8px;
  border-radius:999px;
  background:linear-gradient(90deg,#a16207,#f59e0b);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:12px;
  font-weight:900;
}
.admin-detailTop{
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:flex-start;
  flex-wrap:wrap;
}
.admin-detailIdentity{
  display:flex;
  gap:14px;
  align-items:center;
}
.admin-detailAvatar{
  width:74px;
  height:74px;
  border-radius:22px;
  overflow:hidden;
  background:linear-gradient(135deg,#2563eb,#8b5cf6);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30px;
  font-weight:900;
}
.admin-detailAvatarImg{
  width:100%;
  height:100%;
  object-fit:cover;
}
.admin-detailName{
  margin:0;
  font-size:32px;
  font-weight:900;
}
.admin-detailMeta{
  margin-top:8px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  color:rgba(255,255,255,0.62);
}
.admin-quickBadges{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.admin-badge{
  min-height:30px;
  padding:6px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:900;
  display:inline-flex;
  align-items:center;
}
.admin-badge.diamond{
  background:rgba(96,165,250,0.16);
  border:1px solid rgba(96,165,250,0.24);
  color:#d7e9ff;
}
.admin-badge.danger{
  background:rgba(239,68,68,0.16);
  border:1px solid rgba(239,68,68,0.24);
  color:#ffd0d0;
}
.admin-badge.success{
  background:rgba(34,197,94,0.16);
  border:1px solid rgba(34,197,94,0.24);
  color:#d4ffe1;
}
.admin-badge.warn{
  background:rgba(245,158,11,0.16);
  border:1px solid rgba(245,158,11,0.24);
  color:#ffe8b7;
}
.admin-detailGrid{
  margin-top:18px;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
}
.admin-box{
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);
}
.admin-box span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  color:rgba(255,255,255,0.54);
}
.admin-box strong{
  display:block;
  margin-top:8px;
  font-size:16px;
  word-break:break-word;
}
.admin-cardAction,
.admin-notesPanel,
.admin-bioPanel{
  margin-top:18px;
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);
}
.admin-cardTitle{
  font-size:16px;
  font-weight:900;
}
.admin-inline{
  margin-top:14px;
  display:flex;
  gap:10px;
  align-items:center;
}
.admin-inline.wrap{
  flex-wrap:wrap;
}
.admin-smallInput{
  min-height:44px;
  padding:0 14px;
  border:none;
  outline:none;
  border-radius:14px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
}
.admin-textarea{
  margin-top:14px;
  width:100%;
  min-height:140px;
  padding:14px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  resize:vertical;
}
.admin-bioText{
  margin-top:12px;
  color:rgba(255,245,220,0.76);
  line-height:1.8;
}
.admin-empty{
  padding:18px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  color:rgba(255,245,220,0.70);
}
.admin-loadingWrap{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}
.admin-loader{
  width:72px;
  height:72px;
  border:6px solid rgba(96,165,250,0.18);
  border-top:6px solid #ec4899;
  border-radius:50%;
  animation:adminSpin 1.2s linear infinite;
}
@keyframes adminSpin{
  to{transform:rotate(360deg)}
}
@keyframes adminSmokeFloat{
  0%{ transform:translate3d(0,0,0) scale(1) rotate(0deg); }
  50%{ transform:translate3d(18px,-10px,0) scale(1.05) rotate(1deg); }
  100%{ transform:translate3d(-22px,12px,0) scale(1.08) rotate(-1deg); }
}
@keyframes adminFogPulse{
  0%,100%{ opacity:.10; transform:scale(1); }
  50%{ opacity:.18; transform:scale(1.08); }
}
@media (max-width: 1380px){
  .admin-statsGrid{ grid-template-columns:repeat(4,minmax(0,1fr)); }
  .admin-detailGrid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width: 1120px){
  .admin-layout{ grid-template-columns:1fr; }
}
@media (max-width: 760px){
  .admin-statsGrid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  .admin-detailGrid{ grid-template-columns:1fr; }
  .admin-logo{ font-size:34px; }
  .admin-title{ font-size:28px; }
}
`;
