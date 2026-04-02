"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

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

  async function loadMessagesPage() {
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

      const me = authData.user.id;
      setUserId(me);

      const { data: allMessages, error: msgError } = await supabase
        .from("private_messages")
        .select("*")
        .or(`from_user.eq.${me},to_user.eq.${me}`)
        .order("created_at", { ascending: true });

      if (msgError) {
        setErrorMsg(msgError.message || "Impossible de charger les messages.");
        setLoading(false);
        return;
      }

      const nextMessages = (allMessages || []) as PrivateMessageRow[];
      setMessages(nextMessages);

      const otherUserIds = Array.from(
        new Set(
          nextMessages.map((m) => (m.from_user === me ? m.to_user : m.from_user)).filter(Boolean)
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
        const firstConversationUserId = buildConversations(nextMessages, me, map)[0]?.userId || "";
        setSelectedUserId(firstConversationUserId);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement messages.");
    } finally {
      setLoading(false);
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

    const conversations: ConversationItem[] = Array.from(grouped.entries()).map(([otherId, msgs]) => {
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
    });

    conversations.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.created_at || "").getTime();
      const bTime = new Date(b.lastMessage?.created_at || "").getTime();
      return bTime - aTime;
    });

    return conversations;
  }

  async function isBlockedWith(targetUserId: string) {
    if (!userId || !targetUserId) return false;

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("users_blocked_either_way", {
      user_a: userId,
      user_b: targetUserId,
    });

    if (error) return false;
    return Boolean(data);
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

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("private_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
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
        setErrorMsg("Impossible d’envoyer un message. Un blocage est actif entre vous.");
        return;
      }

      const supabase = getSupabaseBrowserClient();

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

      const supabase = getSupabaseBrowserClient();
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
        <div className="ec-loading-screen">
          <div className="ec-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="messages-page">
      <style>{css}</style>

      <div className="messages-bg messages-bg-a" />
      <div className="messages-bg messages-bg-b" />
      <div className="ec-grid-noise" />
      <div className="ec-gold-orb messages-orb-a" />
      <div className="ec-gold-orb messages-orb-b" />

      <div className="ec-page-shell">
        <header className="ec-header">
          <div>
            <div className="ec-kicker">Messages privés</div>
            <h1 className="ec-title">Messagerie</h1>
            <p className="ec-subtitle">
              Conversations privées, propres et bloquées automatiquement si une relation est coupée.
            </p>
          </div>

          <div className="ec-sidecards">
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Conversations</span>
              <strong>{conversations.length}</strong>
            </div>
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Non lus</span>
              <strong>{totalUnread}</strong>
            </div>
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Actif</span>
              <strong>{selectedConversation ? getProfileName(selectedConversation.profile) : "—"}</strong>
            </div>
          </div>
        </header>

        {notice ? <div className="ec-notice">{notice}</div> : null}
        {errorMsg ? <div className="ec-error">{errorMsg}</div> : null}

        <section className="messages-layout ec-section">
          <aside className="ec-card messages-sidebar">
            <div className="ec-card-shine" />
            <div className="messages-sidebarTop">
              <div>
                <div className="ec-card-kicker">Conversations</div>
                <h2 className="ec-card-title">Privé</h2>
              </div>

              <div className="messages-sidebarActions">
                <button
                  className="ec-btn ec-btn-vip"
                  onClick={() => setShowNewConversation((v) => !v)}
                  type="button"
                >
                  Nouveau
                </button>

                <button
                  className="ec-btn ec-btn-ghost"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  Retour
                </button>
              </div>
            </div>

            {showNewConversation ? (
              <div className="messages-newConversationBox">
                <div className="messages-newConversationTitle">Nouvelle conversation</div>

                <div className="messages-newConversationSearch">
                  <input
                    className="ec-input"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Chercher un membre..."
                  />
                  <button
                    className="ec-btn ec-btn-gold"
                    onClick={() => void searchMembers()}
                    disabled={searchingMembers || !memberSearch.trim()}
                    type="button"
                  >
                    {searchingMembers ? "Recherche..." : "Chercher"}
                  </button>
                </div>

                <div className="messages-memberResults">
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      className="messages-memberResult"
                      onClick={() => openConversationWithProfile(member)}
                      type="button"
                    >
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={getProfileName(member)} className="messages-avatar" />
                      ) : (
                        <div className="messages-avatar placeholder">
                          {getProfileName(member).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="messages-memberResultMain">
                        <div
                          className="messages-conversationName"
                          style={getProfileNameStyle(member)}
                        >
                          {getProfileName(member)}
                        </div>
                        <p className="messages-memberMeta">
                          {member.vip_level || "Standard"}
                          {member.is_verified ? " • Vérifié" : ""}
                        </p>
                      </div>
                    </button>
                  ))}

                  {memberSearch && memberResults.length === 0 && !searchingMembers ? (
                    <div className="messages-emptyState">Aucun membre trouvable.</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="messages-searchWrap">
              <input
                className="ec-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher une conversation..."
              />
            </div>

            <div className="messages-conversationList">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const active = conv.userId === selectedUserId;
                  return (
                    <button
                      key={conv.userId}
                      className={`messages-conversationItem ${active ? "active" : ""}`}
                      onClick={() => openConversation(conv.userId)}
                      type="button"
                    >
                      <div className="messages-avatarWrap">
                        {conv.profile?.avatar_url ? (
                          <img
                            src={conv.profile.avatar_url}
                            alt={getProfileName(conv.profile)}
                            className="messages-avatar"
                          />
                        ) : (
                          <div className="messages-avatar placeholder">
                            {getProfileName(conv.profile).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="messages-conversationMain">
                        <div className="messages-conversationTop">
                          <div
                            className="messages-conversationName"
                            style={getProfileNameStyle(conv.profile)}
                          >
                            {getProfileName(conv.profile)}
                          </div>
                          <span className="messages-time">
                            {formatTime(conv.lastMessage?.created_at)}
                          </span>
                        </div>

                        <div className="messages-conversationBottom">
                          <p className="messages-lastSnippet">
                            {conv.lastMessage?.content || "Aucun message"}
                          </p>

                          {conv.unreadCount > 0 ? (
                            <span className="messages-unreadBadge">{conv.unreadCount}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="messages-emptyState">
                  Aucune conversation trouvée.
                </div>
              )}
            </div>
          </aside>

          <section className="ec-card messages-mainPanel">
            <div className="ec-card-shine" />

            {selectedConversation || selectedUserId ? (
              <>
                <div className="messages-threadHeader">
                  <div className="messages-threadIdentity">
                    {profilesMap[selectedUserId]?.avatar_url ? (
                      <img
                        src={profilesMap[selectedUserId].avatar_url!}
                        alt={getProfileName(profilesMap[selectedUserId])}
                        className="messages-threadAvatar"
                      />
                    ) : (
                      <div className="messages-threadAvatar placeholder">
                        {getProfileName(profilesMap[selectedUserId] || null).charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div
                        className="messages-threadName"
                        style={getProfileNameStyle(profilesMap[selectedUserId] || null)}
                      >
                        {getProfileName(profilesMap[selectedUserId] || null)}
                      </div>

                      <div className="messages-threadMeta">
                        {profilesMap[selectedUserId]?.vip_level || "Standard"}
                        {profilesMap[selectedUserId]?.is_verified ? " • Vérifié" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBlocked ? (
                  <div className="messages-blockedBox">
                    Un blocage est actif entre vous. Aucun nouveau message n’est possible.
                  </div>
                ) : null}

                <div className="messages-threadBody">
                  {selectedConversation?.messages?.length ? (
                    selectedConversation.messages.map((msg) => {
                      const mine = msg.from_user === userId;
                      return (
                        <div
                          key={msg.id}
                          className={`messages-bubbleRow ${mine ? "mine" : "theirs"}`}
                        >
                          <div className={`messages-bubble ${mine ? "mine" : "theirs"}`}>
                            <div className="messages-bubbleContent">{msg.content}</div>
                            <div className="messages-bubbleMeta">
                              {formatDateTime(msg.created_at)}
                              {mine ? (
                                <span className="messages-readState">
                                  {msg.is_read ? " • Lu" : " • Envoyé"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="messages-threadStarter">
                      Aucun message encore. Écris le premier.
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="messages-composeBar">
                  <textarea
                    className="ec-textarea messages-composeInput"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      selectedBlocked
                        ? "Blocage actif..."
                        : "Écrire un message privé..."
                    }
                    disabled={selectedBlocked}
                  />

                  <div className="messages-composeActions">
                    <button
                      className="ec-btn ec-btn-gold"
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
              <div className="messages-threadEmpty">
                <div className="messages-threadEmptyInner">
                  <div className="ec-card-kicker">Messagerie</div>
                  <h2 className="ec-card-title">Aucune conversation sélectionnée</h2>
                  <p className="ec-card-text">
                    Choisis une conversation à gauche ou démarre-en une nouvelle.
                  </p>
                </div>
              </div>
            )}
          </section>
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
  background:linear-gradient(180deg,#100307 0%, #090205 42%, #050205 100%);
  color:#fff;
}

.messages-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.messages-bg-a{
  background:
    radial-gradient(circle at 18% 18%, rgba(212,175,55,0.10), transparent 34%),
    radial-gradient(circle at 80% 20%, rgba(255,170,40,0.06), transparent 28%),
    radial-gradient(circle at 58% 76%, rgba(130,0,25,0.18), transparent 42%);
}
.messages-bg-b{
  background:
    radial-gradient(circle at 70% 55%, rgba(255,255,255,0.03), transparent 18%),
    radial-gradient(circle at 35% 70%, rgba(212,175,55,0.07), transparent 24%);
  filter:blur(8px);
}

.messages-orb-a{
  width:180px;
  height:180px;
  left:180px;
  top:80px;
  background:rgba(212,175,55,0.55);
}
.messages-orb-b{
  width:220px;
  height:220px;
  right:120px;
  top:180px;
  background:rgba(255,140,60,0.24);
}

.messages-layout{
  display:grid;
  grid-template-columns:380px 1fr;
  gap:24px;
  min-height:720px;
}

.messages-sidebar{
  display:flex;
  flex-direction:column;
  min-height:720px;
}

.messages-sidebarTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
  flex-wrap:wrap;
}

.messages-sidebarActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.messages-newConversationBox{
  margin-top:18px;
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.messages-newConversationTitle{
  font-weight:900;
  margin-bottom:12px;
}

.messages-newConversationSearch{
  display:grid;
  grid-template-columns:1fr auto;
  gap:10px;
}

.messages-memberResults{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:12px;
}

.messages-memberResult{
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

.messages-memberMeta{
  margin:4px 0 0;
  color:rgba(255,245,220,0.64);
  font-size:12px;
}

.messages-searchWrap{
  margin-top:18px;
}

.messages-conversationList{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:18px;
  overflow:auto;
  padding-right:4px;
}

.messages-conversationItem{
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

.messages-conversationItem:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.18);
}

.messages-conversationItem.active{
  background:rgba(212,175,55,0.08);
  border-color:rgba(212,175,55,0.26);
}

.messages-avatarWrap{
  flex-shrink:0;
}

.messages-avatar,
.messages-threadAvatar{
  width:52px;
  height:52px;
  border-radius:16px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}

.messages-avatar.placeholder,
.messages-threadAvatar.placeholder{
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

.messages-conversationMain{
  min-width:0;
  flex:1;
}

.messages-conversationTop{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:flex-start;
}

.messages-conversationName{
  font-size:16px;
  font-weight:900;
  line-height:1.1;
}

.messages-time{
  font-size:12px;
  color:rgba(255,255,255,0.56);
  white-space:nowrap;
}

.messages-conversationBottom{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
  margin-top:8px;
}

.messages-lastSnippet{
  margin:0;
  color:rgba(255,245,220,0.68);
  line-height:1.5;
  font-size:13px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.messages-unreadBadge{
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

.messages-emptyState{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}

.messages-mainPanel{
  display:flex;
  flex-direction:column;
  min-height:720px;
}

.messages-threadHeader{
  padding-bottom:18px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}

.messages-threadIdentity{
  display:flex;
  gap:14px;
  align-items:center;
}

.messages-threadName{
  font-size:24px;
  font-weight:900;
  line-height:1;
}

.messages-threadMeta{
  margin-top:6px;
  color:rgba(255,245,220,0.64);
  font-size:13px;
}

.messages-blockedBox{
  margin-top:16px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.messages-threadBody{
  flex:1;
  overflow:auto;
  padding:18px 2px;
  display:flex;
  flex-direction:column;
  gap:12px;
}

.messages-bubbleRow{
  display:flex;
}
.messages-bubbleRow.mine{
  justify-content:flex-end;
}
.messages-bubbleRow.theirs{
  justify-content:flex-start;
}

.messages-bubble{
  max-width:72%;
  padding:14px 16px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,0.08);
}
.messages-bubble.mine{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.messages-bubble.theirs{
  background:rgba(255,255,255,0.05);
  color:#fff;
}

.messages-bubbleContent{
  line-height:1.7;
  white-space:pre-wrap;
  word-break:break-word;
}

.messages-bubbleMeta{
  margin-top:8px;
  font-size:11px;
  opacity:.74;
}

.messages-threadStarter{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}

.messages-composeBar{
  padding-top:18px;
  border-top:1px solid rgba(255,255,255,0.08);
}

.messages-composeInput{
  min-height:120px;
}

.messages-composeActions{
  margin-top:12px;
  display:flex;
  justify-content:flex-end;
  gap:12px;
}

.messages-threadEmpty{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
}

.messages-threadEmptyInner{
  max-width:420px;
  text-align:center;
}

@media (max-width: 980px){
  .messages-layout{
    grid-template-columns:1fr;
  }

  .messages-sidebar,
  .messages-mainPanel{
    min-height:unset;
  }
}

@media (max-width: 760px){
  .messages-newConversationSearch{
    grid-template-columns:1fr;
  }

  .messages-bubble{
    max-width:88%;
  }
}
`;
