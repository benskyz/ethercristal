"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type RoomRow = {
  id: string;
  name: string;
  description?: string | null;
  tag?: string | null;
  capacity?: number | null;
  is_active?: boolean | null;
  is_vip_only?: boolean | null;
  cover_image?: string | null;
  room_type?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  vip_level?: string | null;
  is_admin?: boolean | null;
  is_verified?: boolean | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type MemberRow = {
  id: string;
  room_id: string;
  user_id: string;
  role?: string | null;
  is_active?: boolean | null;
  joined_at?: string | null;
  last_seen_at?: string | null;
};

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at?: string | null;
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
        : "0 0 14px rgba(212,175,55,0.12)",
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 16px ${profile.display_name_glow}`
      : "0 0 14px rgba(212,175,55,0.12)",
  };
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-CA");
}

export default function SalonRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = String(params.roomId || "");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [me, setMe] = useState<ProfileRow | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, ProfileRow>>({});
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messageProfiles, setMessageProfiles] = useState<Record<string, ProfileRow>>({});
  const [draft, setDraft] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!roomId) return;
    void initPage();

    return () => {
      void leaveRoom();
      stopLocalMedia();
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const stream = mediaStreamRef.current;
    if (!stream) return;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });

    stream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [cameraEnabled, micEnabled]);

  async function initPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const userId = authData.user.id;
      setMyUserId(userId);

      const [{ data: meData, error: meError }, { data: roomData, error: roomError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("salon_rooms").select("*").eq("id", roomId).single(),
        ]);

      if (meError || !meData) {
        setErrorMsg(meError?.message || "Impossible de charger ton profil.");
        setLoading(false);
        return;
      }

      if (roomError || !roomData) {
        setErrorMsg(roomError?.message || "Salle introuvable.");
        setLoading(false);
        return;
      }

      const myProfile = meData as ProfileRow;
      const roomRow = roomData as RoomRow;

      const isVipMember =
        String(myProfile.vip_level || "").toLowerCase() !== "" &&
        String(myProfile.vip_level || "").toLowerCase() !== "free" &&
        String(myProfile.vip_level || "").toLowerCase() !== "standard";

      const isAdmin = Boolean(myProfile.is_admin);

      if (roomRow.is_vip_only && !isVipMember && !isAdmin) {
        router.push("/vip");
        return;
      }

      setMe(myProfile);
      setRoom(roomRow);

      await joinRoom(userId);
      await Promise.all([loadMembers(), loadMessages(), startLocalMedia()]);
      setupRealtime();

    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement salle.");
    } finally {
      setLoading(false);
    }
  }

  function setupRealtime() {
    const supabase = getSupabaseBrowserClient();

    const roomChannel = supabase
      .channel(`salon-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "salon_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          await loadMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "salon_room_members",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          await loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }

  async function joinRoom(userId: string) {
    try {
      const supabase = getSupabaseBrowserClient();

      const { data: existing } = await supabase
        .from("salon_room_members")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("salon_room_members")
          .update({
            is_active: true,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("salon_room_members").insert({
          room_id: roomId,
          user_id: userId,
          role: "member",
          is_active: true,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  async function leaveRoom() {
    try {
      if (!myUserId || !roomId) return;
      const supabase = getSupabaseBrowserClient();

      await supabase
        .from("salon_room_members")
        .update({
          is_active: false,
          last_seen_at: new Date().toISOString(),
        })
        .eq("room_id", roomId)
        .eq("user_id", myUserId);
    } catch {}
  }

  async function loadMembers() {
    try {
      const supabase = getSupabaseBrowserClient();

      const { data: memberRows, error } = await supabase
        .from("salon_room_members")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_active", true)
        .order("joined_at", { ascending: true });

      if (error) return;

      const nextMembers = (memberRows || []) as MemberRow[];
      setMembers(nextMembers);

      const missingIds = Array.from(
        new Set(nextMembers.map((m) => m.user_id).filter(Boolean))
      );

      if (missingIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", missingIds);

        const map: Record<string, ProfileRow> = {};
        (profilesData || []).forEach((p: any) => {
          map[String(p.id)] = p as ProfileRow;
        });

        setMemberProfiles(map);
      }
    } catch {}
  }

  async function loadMessages() {
    try {
      const supabase = getSupabaseBrowserClient();

      const { data: rows, error } = await supabase
        .from("salon_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(250);

      if (error) return;

      const nextMessages = (rows || []) as MessageRow[];
      setMessages(nextMessages);

      const profileIds = Array.from(
        new Set(nextMessages.map((m) => m.user_id).filter(Boolean))
      );

      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds);

        const map: Record<string, ProfileRow> = {};
        (profilesData || []).forEach((p: any) => {
          map[String(p.id)] = p as ProfileRow;
        });

        setMessageProfiles(map);
      }
    } catch {}
  }

  async function startLocalMedia() {
    try {
      setMediaError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      setMediaError("Caméra ou micro non disponible.");
    }
  }

  function stopLocalMedia() {
    const stream = mediaStreamRef.current;
    if (!stream) return;

    stream.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !myUserId) return;

    try {
      setSending(true);
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase.from("salon_messages").insert({
        room_id: roomId,
        user_id: myUserId,
        content,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible d’envoyer le message.");
        return;
      }

      setDraft("");
      setNotice("Message envoyé.");
      await loadMessages();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur envoi message.");
    } finally {
      setSending(false);
    }
  }

  const onlineCount = useMemo(() => members.length, [members]);

  const isVipRoom = Boolean(room?.is_vip_only);

  if (loading) {
    return (
      <main className="room-page">
        <style>{css}</style>
        <div className="ec-loading-screen">
          <div className="ec-loader" />
        </div>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="room-page">
      <style>{css}</style>

      <div className="room-bg room-bg-a" />
      <div className="room-bg room-bg-b" />
      <div className="ec-grid-noise" />
      <div className="ec-gold-orb room-orb-a" />
      <div className="ec-gold-orb room-orb-b" />

      <div className="ec-page-shell">
        <header className="room-header">
          <div>
            <div className="room-kickerRow">
              <span className="ec-kicker">Salle</span>
              <span className={`room-badge ${isVipRoom ? "vip" : "public"}`}>
                {isVipRoom ? "VIP" : "Public"}
              </span>
              {room.tag ? <span className="room-tag">{room.tag}</span> : null}
            </div>

            <h1 className="ec-title">{room.name}</h1>
            <p className="ec-subtitle">
              {room.description || "Salle privée EtherCristal."}
            </p>
          </div>

          <div className="room-stats">
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">En ligne</span>
              <strong>{onlineCount}</strong>
            </div>

            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Capacité</span>
              <strong>{room.capacity || "—"}</strong>
            </div>

            <button
              className="ec-btn ec-btn-ghost"
              onClick={() => router.push("/salons")}
              type="button"
            >
              Quitter
            </button>
          </div>
        </header>

        {notice ? <div className="ec-notice">{notice}</div> : null}
        {errorMsg ? <div className="ec-error">{errorMsg}</div> : null}

        <section className="room-layout ec-section">
          <aside className="ec-card room-sidebar">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Infos salle</div>
            <h2 className="ec-card-title">Ambiance</h2>
            <p className="ec-card-text">
              Espace réservé aux adultes, ambiance plus chaude, visuelle plus premium, navigation directe.
            </p>

            <div className="room-memberListTitle">Membres présents</div>

            <div className="room-memberList">
              {members.length > 0 ? (
                members.map((member) => {
                  const profile = memberProfiles[member.user_id] || null;
                  return (
                    <div key={member.id} className="room-memberItem">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={getProfileName(profile)}
                          className="room-memberAvatar"
                        />
                      ) : (
                        <div className="room-memberAvatar placeholder">
                          {getProfileName(profile).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="room-memberMain">
                        <div
                          className="room-memberName"
                          style={getProfileNameStyle(profile)}
                        >
                          {getProfileName(profile)}
                        </div>
                        <div className="room-memberMeta">
                          {profile?.vip_level || "Standard"}
                          {profile?.is_verified ? " • Vérifié" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="room-emptyBox">Personne pour le moment.</div>
              )}
            </div>
          </aside>

          <div className="ec-card room-stage">
            <div className="ec-card-shine" />

            <div className="room-stageTop">
              <div>
                <div className="ec-card-kicker">Zone live</div>
                <h2 className="ec-card-title">Scène principale</h2>
              </div>

              <div className="room-stageActions">
                <button
                  className={`ec-btn ${cameraEnabled ? "ec-btn-gold" : "ec-btn-ghost"}`}
                  onClick={() => setCameraEnabled((v) => !v)}
                  type="button"
                >
                  {cameraEnabled ? "Cam active" : "Cam coupée"}
                </button>

                <button
                  className={`ec-btn ${micEnabled ? "ec-btn-vip" : "ec-btn-ghost"}`}
                  onClick={() => setMicEnabled((v) => !v)}
                  type="button"
                >
                  {micEnabled ? "Micro actif" : "Micro coupé"}
                </button>
              </div>
            </div>

            <div className="room-stageViewport">
              {room.cover_image ? (
                <img
                  src={room.cover_image}
                  alt={room.name}
                  className="room-coverImage"
                />
              ) : (
                <div className="room-stageBackdrop" />
              )}

              <div className="room-stageOverlay" />

              <div className="room-liveShell">
                <div className="room-liveMain">
                  <div className="room-liveLabel">Zone principale</div>
                  <div className="room-livePlaceholder">
                    LIVE ROOM
                  </div>
                </div>

                <div className="room-selfCam">
                  {mediaError ? (
                    <div className="room-selfFallback">{mediaError}</div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="room-selfVideo"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="ec-card room-chatPanel">
            <div className="ec-card-shine" />

            <div className="room-chatHeader">
              <div>
                <div className="ec-card-kicker">Chat</div>
                <h2 className="ec-card-title">Discussion</h2>
              </div>
            </div>

            <div className="room-chatBody">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const mine = message.user_id === myUserId;
                  const profile = messageProfiles[message.user_id] || null;

                  return (
                    <div
                      key={message.id}
                      className={`room-messageRow ${mine ? "mine" : "theirs"}`}
                    >
                      <div className={`room-messageBubble ${mine ? "mine" : "theirs"}`}>
                        <div
                          className="room-messageAuthor"
                          style={getProfileNameStyle(profile)}
                        >
                          {getProfileName(profile)}
                        </div>
                        <div className="room-messageContent">{message.content}</div>
                        <div className="room-messageTime">
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="room-emptyBox">
                  Aucun message pour le moment.
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="room-chatComposer">
              <textarea
                className="ec-textarea room-chatInput"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire dans la salle..."
              />
              <button
                className="ec-btn ec-btn-gold"
                onClick={() => void sendMessage()}
                disabled={sending || !draft.trim()}
                type="button"
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

const css = `
.room-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:linear-gradient(180deg,#0e0206 0%, #080205 42%, #040205 100%);
  color:#fff;
}

.room-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.room-bg-a{
  background:
    radial-gradient(circle at 18% 18%, rgba(212,175,55,0.10), transparent 34%),
    radial-gradient(circle at 80% 20%, rgba(180,30,60,0.08), transparent 28%),
    radial-gradient(circle at 58% 76%, rgba(80,0,20,0.20), transparent 42%);
}
.room-bg-b{
  background:
    radial-gradient(circle at 72% 52%, rgba(255,255,255,0.03), transparent 18%),
    radial-gradient(circle at 35% 70%, rgba(212,175,55,0.07), transparent 24%);
  filter:blur(8px);
}

.room-orb-a{
  width:180px;
  height:180px;
  left:180px;
  top:80px;
  background:rgba(212,175,55,0.55);
}
.room-orb-b{
  width:220px;
  height:220px;
  right:120px;
  top:180px;
  background:rgba(255,60,90,0.18);
}

.room-header{
  display:flex;
  justify-content:space-between;
  gap:20px;
  flex-wrap:wrap;
}

.room-kickerRow{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
  margin-bottom:10px;
}

.room-badge,
.room-tag{
  display:inline-flex;
  align-items:center;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
}

.room-badge.public{
  background:rgba(80,170,255,0.14);
  color:#cdeeff;
  border:1px solid rgba(80,170,255,0.22);
}
.room-badge.vip{
  background:rgba(212,175,55,0.16);
  color:#f6dc86;
  border:1px solid rgba(212,175,55,0.26);
}
.room-tag{
  background:rgba(255,255,255,0.08);
  color:#fff3d2;
  border:1px solid rgba(255,255,255,0.10);
}

.room-stats{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.room-layout{
  display:grid;
  grid-template-columns:320px 1fr 380px;
  gap:24px;
  min-height:760px;
}

.room-sidebar,
.room-chatPanel{
  display:flex;
  flex-direction:column;
}

.room-memberListTitle{
  margin-top:20px;
  font-size:14px;
  font-weight:900;
  color:#fff0c6;
}

.room-memberList{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:14px;
}

.room-memberItem{
  display:flex;
  gap:12px;
  align-items:center;
  padding:12px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.room-memberAvatar{
  width:46px;
  height:46px;
  border-radius:14px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}
.room-memberAvatar.placeholder{
  width:46px;
  height:46px;
  border-radius:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  color:#fff3c2;
  border:1px solid rgba(255,255,255,0.10);
}

.room-memberMain{
  min-width:0;
}
.room-memberName{
  font-size:15px;
  font-weight:900;
}
.room-memberMeta{
  margin-top:4px;
  font-size:12px;
  color:rgba(255,245,220,0.64);
}

.room-stage{
  display:flex;
  flex-direction:column;
}

.room-stageTop{
  display:flex;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
}
.room-stageActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.room-stageViewport{
  position:relative;
  flex:1;
  margin-top:18px;
  border-radius:28px;
  overflow:hidden;
  min-height:620px;
  background:linear-gradient(180deg, rgba(28,6,12,0.90), rgba(8,2,5,0.96));
  border:1px solid rgba(255,255,255,0.08);
}

.room-coverImage{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  opacity:.22;
}
.room-stageBackdrop{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(212,175,55,0.16), transparent 25%),
    radial-gradient(circle at 80% 30%, rgba(180,30,60,0.16), transparent 24%),
    linear-gradient(180deg, rgba(20,4,8,0.85), rgba(7,2,5,0.96));
}
.room-stageOverlay{
  position:absolute;
  inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.28));
}

.room-liveShell{
  position:relative;
  z-index:2;
  display:grid;
  grid-template-columns:1fr 220px;
  gap:18px;
  height:100%;
  padding:20px;
}

.room-liveMain{
  border-radius:24px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  padding:20px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}
.room-liveLabel{
  display:inline-flex;
  align-self:flex-start;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(212,175,55,0.14);
  color:#f6dc86;
  font-size:12px;
  font-weight:800;
}
.room-livePlaceholder{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:40px;
  font-weight:900;
  letter-spacing:.06em;
  color:rgba(255,245,220,0.72);
}

.room-selfCam{
  border-radius:24px;
  overflow:hidden;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  min-height:220px;
}
.room-selfVideo{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  background:#080808;
}
.room-selfFallback{
  width:100%;
  height:100%;
  min-height:220px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:20px;
  color:rgba(255,245,220,0.68);
}

.room-chatHeader{
  padding-bottom:14px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}

.room-chatBody{
  flex:1;
  overflow:auto;
  padding:16px 2px;
  display:flex;
  flex-direction:column;
  gap:12px;
}

.room-messageRow{
  display:flex;
}
.room-messageRow.mine{
  justify-content:flex-end;
}
.room-messageRow.theirs{
  justify-content:flex-start;
}

.room-messageBubble{
  max-width:88%;
  padding:12px 14px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.08);
}
.room-messageBubble.mine{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.room-messageBubble.theirs{
  background:rgba(255,255,255,0.05);
  color:#fff;
}

.room-messageAuthor{
  font-size:13px;
  font-weight:900;
  margin-bottom:6px;
}
.room-messageContent{
  line-height:1.65;
  white-space:pre-wrap;
  word-break:break-word;
}
.room-messageTime{
  margin-top:8px;
  font-size:11px;
  opacity:.70;
}

.room-chatComposer{
  padding-top:16px;
  border-top:1px solid rgba(255,255,255,0.08);
  display:flex;
  flex-direction:column;
  gap:12px;
}
.room-chatInput{
  min-height:110px;
}

.room-emptyBox{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.72);
}

@media (max-width: 1180px){
  .room-layout{
    grid-template-columns:1fr;
  }

  .room-stageViewport{
    min-height:540px;
  }
}

@media (max-width: 760px){
  .room-liveShell{
    grid-template-columns:1fr;
  }

  .room-stageViewport{
    min-height:620px;
  }
}
`;
