"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  vip_level?: string | null;
  is_verified?: boolean | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type PrivateMessageRow = {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  is_read?: boolean | null;
  created_at?: string | null;
};

type ConversationItem = {
  userId: string;
  profile: ProfileRow | null;
  messages: PrivateMessageRow[];
  lastMessage: PrivateMessageRow | null;
  unreadCount: number;
};

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

export default function MessagesPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState("");
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [messages, setMessages] = useState<PrivateMessageRow[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBlocked, setSelectedBlocked] = useState(false);

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const [showNewConversation, setShowNewConversation] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<ProfileRow[]>([]);

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadMessagesPage();
  }, []);

  useEffect(() => {
    if (selectedConversation?.messages?.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedUserId, messages.length]);

  useEffect(() => {
    if (!selectedUserId || !userId) {
      setSelectedBlocked(false);
      return;
    }

    void verifySelectedBlockedState();
  }, [selectedUserId, userId]);

  async function verifySelectedBlockedState() {
    const blocked = await isBlockedWith(selectedUserId);
    setSelectedBlocked(blocked);
  }

  async function loadMessagesPage(silent = false) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setNotice("");
      setErrorMsg("");
    }

    try {
      const supabase = requireSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const me = authData.user.id;
      setUserId(me);

      const { data: allMessages, error: msgError } = await supabase
        .from("private_messages")
        .select("*")
        .or(`from_user.eq.${me},to_user.eq.${me}`)
        .order("created_at", { ascending: true });

      if (msgError) {
        setErrorMsg(msgError.message || "Impossible de charger les messages.");
        return;
      }

      const nextMessages = (allMessages || []) as PrivateMessageRow[];
      setMessages(nextMessages);

      const otherUserIds = Array.from(
        new Set(
          nextMessages
            .map((m) => (m.from_user === me ? m.to_user : m.from_user))
            .filter(Boolean)
        )
      );

      const map: Record<string, ProfileRow> = {};

      if (otherUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", otherUserIds);

        (profilesData || []).forEach((p: any) => {
          map[String(p.id)] = p as ProfileRow;
        });
      }

      setProfilesMap(map);

      if (!selectedUserId) {
        const firstConversationUserId =
          buildConversations(nextMessages, me, map)[0]?.userId || "";
        setSelectedUserId(firstConversationUserId);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function buildConversations(
    allMessages: PrivateMessageRow[],
    me: string,
    profileMap: Record<string, ProfileRow>
  ): ConversationItem[] {
    const grouped = new Map<string, PrivateMessageRow[]>();

    for (const msg of allMessages) {
      const otherId = msg.from_user === me ? msg.to_user : msg.from_user;
      if (!otherId) continue;
      if (!grouped.has(otherId)) grouped.set(otherId, []);
      grouped.get(otherId)!.push(msg);
    }

    const conversations: ConversationItem[] = Array.from(grouped.entries()).map(
      ([otherId, msgs]) => {
        const sorted = [...msgs].sort((a, b) => {
          const aTime = new Date(a.created_at || "").getTime();
          const bTime = new Date(b.created_at || "").getTime();
          return aTime - bTime;
        });

        const lastMessage = sorted[sorted.length - 1] || null;
        const unreadCount = sorted.filter(
          (m) => m.to_user === me && !m.is_read
        ).length;

        return {
          userId: otherId,
          profile: profileMap[otherId] || null,
          messages: sorted,
          lastMessage,
          unreadCount,
        };
      }
    );

    conversations.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.created_at || "").getTime();
      const bTime = new Date(b.lastMessage?.created_at || "").getTime();
      return bTime - aTime;
    });

    return conversations;
  }

  async function isBlockedWith(targetUserId: string) {
    if (!userId || !targetUserId) return false;

    try {
      const supabase = requireSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("users_blocked_either_way", {
        user_a: userId,
        user_b: targetUserId,
      });

      if (error) return false;
      return Boolean(data);
    } catch {
      return false;
    }
  }

  const conversations = useMemo(
    () => buildConversations(messages, userId, profilesMap),
    [messages, userId, profilesMap]
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((conv) => {
      const name = getProfileName(conv.profile).toLowerCase();
      const last = String(conv.lastMessage?.content || "").toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [conversations, search]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.userId === selectedUserId) || null,
    [conversations, selectedUserId]
  );

  const selectedProfile = useMemo(() => {
    return selectedConversation?.profile || profilesMap[selectedUserId] || null;
  }, [selectedConversation, profilesMap, selectedUserId]);

  useEffect(() => {
    if (!selectedConversation || !userId) return;
    void markConversationAsRead(selectedConversation);
  }, [selectedConversation?.userId]);

  async function markConversationAsRead(conversation: ConversationItem) {
    try {
      const unreadIds = conversation.messages
        .filter((m) => m.to_user === userId && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length === 0) return;

      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase
        .from("private_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) =>
            unreadIds.includes(m.id) ? { ...m, is_read: true } : m
          )
        );
      }
    } catch {}
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || !selectedUserId || !userId) return;

    try {
      setSending(true);
      setNotice("");
      setErrorMsg("");

      const blocked = await isBlockedWith(selectedUserId);

      if (blocked) {
        setSelectedBlocked(true);
        setErrorMsg(
          "Impossible d’envoyer un message. Un blocage est actif entre vous."
        );
        return;
      }

      const supabase = requireSupabaseBrowserClient();

      const payload = {
        from_user: userId,
        to_user: selectedUserId,
        content,
        is_read: false,
      };

      const { data, error } = await supabase
        .from("private_messages")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        setErrorMsg(error.message || "Impossible d’envoyer le message.");
        return;
      }

      setMessages((prev) => [...prev, data as PrivateMessageRow]);
      setDraft("");
      setNotice("Message envoyé.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur envoi message.");
    } finally {
      setSending(false);
    }
  }

  async function searchMembers() {
    const q = memberSearch.trim();
    if (!q || !userId) return;

    try {
      setSearchingMembers(true);
      setErrorMsg("");
      setNotice("");

      const supabase = requireSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `%${q}%`)
        .neq("id", userId)
        .limit(12);

      if (error) {
        setErrorMsg(error.message || "Impossible de chercher des membres.");
        return;
      }

      const rawResults = (data || []) as ProfileRow[];

      const checks = await Promise.all(
        rawResults.map(async (member) => ({
          member,
          blocked: await isBlockedWith(String(member.id)),
        }))
      );

      const filtered = checks
        .filter((item) => !item.blocked)
        .map((item) => item.member);

      setMemberResults(filtered);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur recherche membres.");
    } finally {
      setSearchingMembers(false);
    }
  }

  function openConversation(userIdToOpen: string) {
    setSelectedUserId(userIdToOpen);
    setShowNewConversation(false);
    setMemberSearch("");
    setMemberResults([]);
    setDraft("");
    setNotice("");
    setErrorMsg("");
  }

  function openConversationWithProfile(profile: ProfileRow) {
    setProfilesMap((prev) => ({
      ...prev,
      [String(profile.id)]: profile,
    }));
    openConversation(String(profile.id));
  }

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  if (loading) {
    return (
      <main className="messages-page">
        <style>{css}</style>
        <div className="msg-loading">
          <div className="msg-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="messages-page">
      <style>{css}</style>

      <div className="msg-bg msg-bg-a" />
      <div className="msg-bg msg-bg-b" />
      <div className="msg-noise" />
      <div className="msg-orb msg-orb-a" />
      <div className="msg-orb msg-orb-b" />

      <div className="msg-shell">
        <header className="msg-topbar">
          <div>
            <div className="msg-kicker">Messages privés</div>
            <h1 className="msg-title">Messagerie</h1>
            <p className="msg-subtitle">
              Conversations privées, structurées, lisibles et prêtes à être
              utilisées pour de vrai.
            </p>
          </div>

          <div className="msg-topActions">
            <button
              className="msg-navBtn"
              type="button"
              onClick={() => void loadMessagesPage(true)}
            >
              {refreshing ? "Actualisation..." : "Actualiser"}
            </button>
            <button
              className="msg-navBtn"
              type="button"
              onClick={() => router.push("/options")}
            >
              Options
            </button>
            <button
              className="msg-navBtn gold"
              type="button"
              onClick={() => router.push("/dashboard")}
            >
              Retour
            </button>
          </div>
        </header>

        <section className="msg-stats">
          <div className="msg-statCard">
            <span>Conversations</span>
            <strong>{conversations.length}</strong>
          </div>
          <div className="msg-statCard">
            <span>Non lus</span>
            <strong>{totalUnread}</strong>
          </div>
          <div className="msg-statCard">
            <span>Actif</span>
            <strong>{selectedProfile ? getProfileName(selectedProfile) : "—"}</strong>
          </div>
        </section>

        {notice ? <div className="msg-notice">{notice}</div> : null}
        {errorMsg ? <div className="msg-error">{errorMsg}</div> : null}

        <section className="msg-layout">
          <aside className="msg-card msg-sidebar">
            <div className="msg-cardShine" />

            <div className="msg-cardHeader">
              <div>
                <div className="msg-cardKicker">Conversations</div>
                <h2 className="msg-cardTitle">Privé</h2>
              </div>

              <div className="msg-sideBtns">
                <button
                  className="msg-miniBtn violet"
                  onClick={() => setShowNewConversation((v) => !v)}
                  type="button"
                >
                  Nouveau
                </button>
              </div>
            </div>

            {showNewConversation ? (
              <div className="msg-newBox">
                <div className="msg-newTitle">Démarrer une conversation</div>

                <div className="msg-newSearch">
                  <input
                    className="msg-input"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Chercher un membre..."
                  />
                  <button
                    className="msg-miniBtn gold"
                    onClick={() => void searchMembers()}
                    disabled={searchingMembers || !memberSearch.trim()}
                    type="button"
                  >
                    {searchingMembers ? "Recherche..." : "Chercher"}
                  </button>
                </div>

                <div className="msg-memberResults">
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      className="msg-memberResult"
                      onClick={() => openConversationWithProfile(member)}
                      type="button"
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={getProfileName(member)}
                          className="msg-avatar"
                        />
                      ) : (
                        <div className="msg-avatar placeholder">
                          {getProfileName(member).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="msg-memberMain">
                        <div
                          className="msg-memberName"
                          style={getProfileNameStyle(member)}
                        >
                          {getProfileName(member)}
                        </div>
                        <div className="msg-memberMeta">
                          {member.vip_level || "Standard"}
                          {member.is_verified ? " • Vérifié" : ""}
                        </div>
                      </div>
                    </button>
                  ))}

                  {memberSearch && memberResults.length === 0 && !searchingMembers ? (
                    <div className="msg-emptyState">
                      Aucun membre disponible.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="msg-searchWrap">
              <input
                className="msg-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher une conversation..."
              />
            </div>

            <div className="msg-conversationList">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const active = conv.userId === selectedUserId;
                  return (
                    <button
                      key={conv.userId}
                      className={`msg-conversationItem ${active ? "active" : ""}`}
                      onClick={() => openConversation(conv.userId)}
                      type="button"
                    >
                      {conv.profile?.avatar_url ? (
                        <img
                          src={conv.profile.avatar_url}
                          alt={getProfileName(conv.profile)}
                          className="msg-avatar"
                        />
                      ) : (
                        <div className="msg-avatar placeholder">
                          {getProfileName(conv.profile).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="msg-conversationMain">
                        <div className="msg-conversationTop">
                          <div
                            className="msg-conversationName"
                            style={getProfileNameStyle(conv.profile)}
                          >
                            {getProfileName(conv.profile)}
                          </div>
                          <span className="msg-time">
                            {formatTime(conv.lastMessage?.created_at)}
                          </span>
                        </div>

                        <div className="msg-conversationBottom">
                          <p className="msg-lastSnippet">
                            {conv.lastMessage?.content || "Aucun message"}
                          </p>

                          {conv.unreadCount > 0 ? (
                            <span className="msg-unreadBadge">
                              {conv.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="msg-emptyState">
                  Aucune conversation trouvée.
                </div>
              )}
            </div>
          </aside>

          <section className="msg-card msg-thread">
            <div className="msg-cardShine" />

            {selectedUserId ? (
              <>
                <div className="msg-threadHeader">
                  <div className="msg-threadIdentity">
                    {selectedProfile?.avatar_url ? (
                      <img
                        src={selectedProfile.avatar_url}
                        alt={getProfileName(selectedProfile)}
                        className="msg-threadAvatar"
                      />
                    ) : (
                      <div className="msg-threadAvatar placeholder">
                        {getProfileName(selectedProfile).charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div
                        className="msg-threadName"
                        style={getProfileNameStyle(selectedProfile)}
                      >
                        {getProfileName(selectedProfile)}
                      </div>
                      <div className="msg-threadMeta">
                        {selectedProfile?.vip_level || "Standard"}
                        {selectedProfile?.is_verified ? " • Vérifié" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBlocked ? (
                  <div className="msg-blockedBox">
                    Un blocage est actif entre vous. Aucun nouveau message n’est
                    possible.
                  </div>
                ) : null}

                <div className="msg-threadBody">
                  {selectedConversation?.messages?.length ? (
                    selectedConversation.messages.map((msg) => {
                      const mine = msg.from_user === userId;

                      return (
                        <div
                          key={msg.id}
                          className={`msg-bubbleRow ${mine ? "mine" : "theirs"}`}
                        >
                          <div
                            className={`msg-bubble ${mine ? "mine" : "theirs"}`}
                          >
                            <div className="msg-bubbleContent">{msg.content}</div>
                            <div className="msg-bubbleMeta">
                              {formatDateTime(msg.created_at)}
                              {mine ? (
                                <span>
                                  {msg.is_read ? " • Lu" : " • Envoyé"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="msg-threadStarter">
                      Aucune conversation encore avec ce membre. Tu peux lancer
                      le premier message.
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                <div className="msg-compose">
                  <textarea
                    className="msg-textarea"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      selectedBlocked
                        ? "Blocage actif..."
                        : "Écrire un message privé..."
                    }
                    disabled={selectedBlocked}
                  />

                  <div className="msg-composeActions">
                    <button
                      className="msg-mainBtn"
                      onClick={() => void handleSend()}
                      disabled={sending || !draft.trim() || selectedBlocked}
                      type="button"
                    >
                      {sending ? "Envoi..." : "Envoyer"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="msg-threadEmpty">
                <div className="msg-threadEmptyInner">
                  <div className="msg-cardKicker">Messagerie</div>
                  <h2 className="msg-cardTitle big">
                    Aucune conversation sélectionnée
                  </h2>
                  <p className="msg-threadEmptyText">
                    Choisis une conversation à gauche ou démarre-en une nouvelle
                    avec le bouton <strong>Nouveau</strong>.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="msg-card msg-sideinfo">
            <div className="msg-cardShine" />

            <div className="msg-cardKicker">Infos</div>
            <h2 className="msg-cardTitle">Panneau rapide</h2>

            <div className="msg-infoBlock">
              <span>Statut</span>
              <strong>{selectedProfile ? "Conversation ouverte" : "Aucune cible"}</strong>
            </div>

            <div className="msg-infoBlock">
              <span>Nom</span>
              <strong>{selectedProfile ? getProfileName(selectedProfile) : "—"}</strong>
            </div>

            <div className="msg-infoBlock">
              <span>Rang</span>
              <strong>{selectedProfile?.vip_level || "Standard"}</strong>
            </div>

            <div className="msg-infoBlock">
              <span>Messages dans ce thread</span>
              <strong>{selectedConversation?.messages?.length || 0}</strong>
            </div>

            <div className="msg-sideNote">
              Les blocages se gèrent dans les options. Si un blocage est actif,
              l’envoi est automatiquement coupé.
            </div>

            <div className="msg-sideActionCol">
              <button
                className="msg-miniBtn ghost"
                type="button"
                onClick={() => router.push("/options")}
              >
                Gérer les blocages
              </button>
              <button
                className="msg-miniBtn ghost"
                type="button"
                onClick={() => router.push("/profile")}
              >
                Voir mon profil
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

const css = `
.messages-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.msg-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.msg-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.msg-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}
.msg-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}
.msg-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.msg-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.msg-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.msg-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.msg-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.msg-kicker{
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

.msg-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.msg-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
  font-size:17px;
}

.msg-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.msg-navBtn{
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
.msg-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.msg-stats{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
}

.msg-statCard{
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(212,175,55,0.14);
}
.msg-statCard span{
  display:block;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.msg-statCard strong{
  display:block;
  margin-top:10px;
  font-size:28px;
  color:#fff2cb;
}

.msg-notice,
.msg-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.msg-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.msg-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.msg-layout{
  margin-top:24px;
  display:grid;
  grid-template-columns:360px 1fr 280px;
  gap:20px;
}

.msg-card{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  padding:20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  min-height:620px;
  display:flex;
  flex-direction:column;
}

.msg-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:msgShine 7s linear infinite;
  pointer-events:none;
}
@keyframes msgShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.msg-cardHeader{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
  flex-wrap:wrap;
}
.msg-cardKicker{
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
.msg-cardTitle{
  margin:14px 0 0;
  font-size:34px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}
.msg-cardTitle.big{
  font-size:42px;
}

.msg-sideBtns{
  display:flex;
  gap:8px;
}

.msg-miniBtn,
.msg-mainBtn{
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.msg-miniBtn{
  min-height:42px;
  padding:10px 14px;
}
.msg-mainBtn{
  min-height:54px;
  padding:12px 18px;
}
.msg-miniBtn.violet{
  background:linear-gradient(90deg,#6b42b8,#9c6cff);
  color:#fff;
}
.msg-miniBtn.gold,
.msg-mainBtn{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.msg-miniBtn.ghost{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.10);
}

.msg-newBox{
  margin-top:18px;
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.msg-newTitle{
  font-weight:900;
  margin-bottom:12px;
}
.msg-newSearch{
  display:grid;
  grid-template-columns:1fr auto;
  gap:10px;
}

.msg-input,
.msg-textarea{
  width:100%;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.msg-input{
  min-height:54px;
  padding:0 16px;
}
.msg-input::placeholder,
.msg-textarea::placeholder{
  color:rgba(255,255,255,0.42);
}
.msg-textarea{
  min-height:120px;
  padding:14px 16px;
  resize:vertical;
}

.msg-memberResults{
  margin-top:12px;
  display:grid;
  gap:10px;
}

.msg-memberResult{
  border:none;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:16px;
  padding:12px;
  display:flex;
  gap:10px;
  text-align:left;
  cursor:pointer;
}
.msg-memberMain{
  min-width:0;
}
.msg-memberName{
  font-size:15px;
  font-weight:900;
}
.msg-memberMeta{
  margin-top:4px;
  color:rgba(255,245,220,0.64);
  font-size:12px;
}

.msg-searchWrap{
  margin-top:18px;
}

.msg-conversationList{
  margin-top:18px;
  display:flex;
  flex-direction:column;
  gap:10px;
  overflow:auto;
  padding-right:4px;
}

.msg-conversationItem{
  width:100%;
  border:none;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:20px;
  padding:14px;
  display:flex;
  gap:12px;
  text-align:left;
  cursor:pointer;
  transition:all .22s ease;
}
.msg-conversationItem:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.18);
}
.msg-conversationItem.active{
  background:rgba(212,175,55,0.08);
  border-color:rgba(212,175,55,0.26);
}

.msg-avatar,
.msg-threadAvatar{
  width:52px;
  height:52px;
  border-radius:16px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}
.msg-avatar.placeholder,
.msg-threadAvatar.placeholder{
  width:52px;
  height:52px;
  border-radius:16px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  color:#fff3c2;
  border:1px solid rgba(255,255,255,0.10);
}

.msg-conversationMain{
  min-width:0;
  flex:1;
}
.msg-conversationTop{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:flex-start;
}
.msg-conversationName{
  font-size:16px;
  font-weight:900;
  line-height:1.1;
}
.msg-time{
  font-size:12px;
  color:rgba(255,255,255,0.56);
  white-space:nowrap;
}
.msg-conversationBottom{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
  margin-top:8px;
}
.msg-lastSnippet{
  margin:0;
  color:rgba(255,245,220,0.68);
  line-height:1.5;
  font-size:13px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.msg-unreadBadge{
  min-width:24px;
  height:24px;
  padding:0 8px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-size:12px;
  font-weight:900;
}

.msg-threadHeader{
  padding-bottom:18px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.msg-threadIdentity{
  display:flex;
  gap:14px;
  align-items:center;
}
.msg-threadName{
  font-size:24px;
  font-weight:900;
  line-height:1;
}
.msg-threadMeta{
  margin-top:6px;
  color:rgba(255,245,220,0.64);
  font-size:13px;
}
.msg-blockedBox{
  margin-top:16px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}
.msg-threadBody{
  flex:1;
  overflow:auto;
  padding:18px 2px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.msg-bubbleRow{
  display:flex;
}
.msg-bubbleRow.mine{
  justify-content:flex-end;
}
.msg-bubbleRow.theirs{
  justify-content:flex-start;
}
.msg-bubble{
  max-width:74%;
  padding:14px 16px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,0.08);
}
.msg-bubble.mine{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.msg-bubble.theirs{
  background:rgba(255,255,255,0.05);
  color:#fff;
}
.msg-bubbleContent{
  line-height:1.7;
  white-space:pre-wrap;
  word-break:break-word;
}
.msg-bubbleMeta{
  margin-top:8px;
  font-size:11px;
  opacity:.74;
}
.msg-threadStarter,
.msg-emptyState{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}
.msg-compose{
  padding-top:18px;
  border-top:1px solid rgba(255,255,255,0.08);
}
.msg-composeActions{
  margin-top:12px;
  display:flex;
  justify-content:flex-end;
}
.msg-threadEmpty{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
}
.msg-threadEmptyInner{
  max-width:420px;
  text-align:center;
}
.msg-threadEmptyText{
  margin-top:14px;
  line-height:1.8;
  color:rgba(255,245,220,0.72);
}

.msg-sideinfo{
  gap:14px;
}
.msg-infoBlock{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.msg-infoBlock span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.msg-infoBlock strong{
  display:block;
  margin-top:8px;
  font-size:18px;
  color:#fff2cb;
}
.msg-sideNote{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,245,220,0.72);
  line-height:1.7;
}
.msg-sideActionCol{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.msg-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.msg-loader{
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
  .msg-layout{
    grid-template-columns:320px 1fr;
  }
  .msg-sideinfo{
    grid-column:1 / -1;
    min-height:auto;
  }
}

@media (max-width: 860px){
  .msg-layout{
    grid-template-columns:1fr;
  }

  .msg-card{
    min-height:auto;
  }

  .msg-stats{
    grid-template-columns:1fr;
  }

  .msg-newSearch{
    grid-template-columns:1fr;
  }
}

@media (max-width: 560px){
  .msg-title{
    font-size:38px;
  }

  .msg-bubble{
    max-width:90%;
  }
}
`;
