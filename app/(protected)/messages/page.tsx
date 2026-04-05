"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

type ConversationPreview = {
  userId: string;
  pseudo: string;
  lastMessage: string;
  lastDate: string;
  isVip: boolean;
  isAdmin: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default function MessagesPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messageInfo, setMessageInfo] = useState("");

  async function loadInitialData() {
    setLoading(true);
    setError("");
    setMessageInfo("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/enter");
      return;
    }

    setCurrentUserId(user.id);

    const [profilesRes, messagesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, pseudo, is_vip, is_admin")
        .neq("id", user.id)
        .order("pseudo", { ascending: true }),
      supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true }),
    ]);

    if (profilesRes.error) {
      setError(profilesRes.error.message);
    } else {
      setProfiles((profilesRes.data ?? []) as ProfileRow[]);
    }

    if (messagesRes.error) {
      setError(messagesRes.error.message);
    } else {
      setMessages((messagesRes.data ?? []) as MessageRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages-user-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as MessageRow;

          if (
            row.sender_id === currentUserId ||
            row.recipient_id === currentUserId
          ) {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === row.id);
              if (exists) return prev;
              return [...prev, row];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((profile) =>
      [profile.pseudo ?? "", profile.id].join(" ").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const conversations = useMemo(() => {
    if (!currentUserId) return [];

    const map = new Map<string, ConversationPreview>();

    for (const msg of messages) {
      const otherUserId =
        msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;

      const profile = profiles.find((p) => p.id === otherUserId);
      const pseudo = profile?.pseudo || "Membre";

      const existing = map.get(otherUserId);
      if (!existing || new Date(msg.created_at) > new Date(existing.lastDate)) {
        map.set(otherUserId, {
          userId: otherUserId,
          pseudo,
          lastMessage: msg.content,
          lastDate: msg.created_at,
          isVip: Boolean(profile?.is_vip),
          isAdmin: Boolean(profile?.is_admin),
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
    );
  }, [messages, profiles, currentUserId]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedUserId) ?? null,
    [profiles, selectedUserId]
  );

  const threadMessages = useMemo(() => {
    if (!selectedUserId || !currentUserId) return [];

    return messages.filter(
      (msg) =>
        (msg.sender_id === currentUserId && msg.recipient_id === selectedUserId) ||
        (msg.sender_id === selectedUserId && msg.recipient_id === currentUserId)
    );
  }, [messages, selectedUserId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length, selectedUserId]);

  async function handleSendMessage() {
    setError("");
    setMessageInfo("");

    try {
      if (!currentUserId) {
        throw new Error("Utilisateur non connecté.");
      }

      if (!selectedUserId) {
        throw new Error("Choisis une conversation.");
      }

      const content = draft.trim();
      if (!content) {
        throw new Error("Le message est vide.");
      }

      setSending(true);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedUserId,
          content,
        })
        .select("id, sender_id, recipient_id, content, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const row = data as MessageRow;
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === row.id);
          if (exists) return prev;
          return [...prev, row];
        });
      }

      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  }

  function startConversation(userId: string) {
    setSelectedUserId(userId);
    setError("");
    setMessageInfo("");
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Messages
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Conversations privées
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
              Une messagerie privée propre, utile et cohérente avec le reste du site.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TopPill label="Conversations" value={conversations.length} />
            <TopPill label="Contacts" value={profiles.length} />
          </div>
        </div>
      </section>

      {messageInfo ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {messageInfo}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.4fr]">
          <div className="h-[680px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          <div className="h-[680px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.4fr]">
          <aside className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-xl font-black text-white">Nouveau contact</h2>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher un membre..."
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
              />

              <div className="mt-4 max-h-[250px] space-y-2 overflow-auto pr-1">
                {filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => startConversation(profile.id)}
                    className={cx(
                      "w-full rounded-2xl border p-4 text-left transition",
                      selectedUserId === profile.id
                        ? "border-rose-400/25 bg-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {profile.pseudo || "Membre"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">{profile.id}</p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {profile.is_admin ? (
                          <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300">
                            ADMIN
                          </span>
                        ) : null}
                        {profile.is_vip ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                            VIP
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredProfiles.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    Aucun profil trouvé.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-xl font-black text-white">Conversations</h2>

              <div className="mt-4 max-h-[340px] space-y-2 overflow-auto pr-1">
                {conversations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    Aucune conversation pour l’instant.
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      type="button"
                      onClick={() => startConversation(conv.userId)}
                      className={cx(
                        "w-full rounded-2xl border p-4 text-left transition",
                        selectedUserId === conv.userId
                          ? "border-rose-400/25 bg-white/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">{conv.pseudo}</p>
                            {conv.isAdmin ? (
                              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                                ADMIN
                              </span>
                            ) : null}
                            {conv.isVip ? (
                              <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                                VIP
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 line-clamp-1 text-sm text-white/55">
                            {conv.lastMessage}
                          </p>
                        </div>

                        <p className="shrink-0 text-xs text-white/38">
                          {formatTime(conv.lastDate)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            {!selectedUserId ? (
              <div className="flex h-[620px] items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-center">
                <div>
                  <h2 className="text-2xl font-black text-white">Aucune conversation ouverte</h2>
                  <p className="mt-2 text-sm text-white/58">
                    Choisis un membre à gauche pour commencer à discuter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[620px] flex-col">
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/45">Conversation avec</p>
                      <h2 className="mt-1 text-2xl font-black text-white">
                        {selectedProfile?.pseudo || "Membre"}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedUserId("")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Fermer
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-3 overflow-auto rounded-[24px] border border-white/10 bg-black/20 p-4">
                  {threadMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                      <div>
                        <p className="text-lg font-bold text-white">Aucun message</p>
                        <p className="mt-2 text-sm text-white/55">
                          Écris le premier message de cette conversation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    threadMessages.map((msg) => {
                      const mine = msg.sender_id === currentUserId;

                      return (
                        <div
                          key={msg.id}
                          className={cx("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cx(
                              "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.16)]",
                              mine
                                ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                                : "border border-white/10 bg-white/10 text-white"
                            )}
                          >
                            <p className="whitespace-pre-wrap leading-6">{msg.content}</p>
                            <p
                              className={cx(
                                "mt-2 text-[11px]",
                                mine ? "text-black/70" : "text-white/38"
                              )}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-4 flex gap-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écris ton message..."
                    className="min-h-[68px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
                  />
                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleSendMessage}
                    className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3 text-sm font-black text-black transition hover:opacity-95 disabled:opacity-70"
                  >
                    {sending ? "..." : "Envoyer"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TopPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
