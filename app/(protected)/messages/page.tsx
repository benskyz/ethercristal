"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import { Search, Send, RefreshCw, MessageCircle, Users } from "lucide-react";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = DisplayProfile & {
  id: string;
  pseudo?: string | null;
};

type MessageRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_pseudo?: string | null;
  to_pseudo?: string | null;
  content: string;
  created_at?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [threads, setThreads] = useState<
    Array<{ otherId: string; otherPseudo: string; lastAt: string; lastText: string; lastFromMe: boolean }>
  >([]);

  const [activeOtherId, setActiveOtherId] = useState<string>("");
  const [activeOtherPseudo, setActiveOtherPseudo] = useState<string>("");

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // ====== LOAD ======
  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    setInfo("");

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      router.replace("/enter");
      return;
    }

    const myId = auth.user.id;
    setMe({ id: myId });

    const [pRes, msgRes] = await Promise.all([
      supabase.from("profiles").select("id, pseudo, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style").eq("id", myId).maybeSingle(),
      supabase
        .from("messages")
        .select("id, from_user_id, to_user_id, from_pseudo, to_pseudo, content, created_at")
        .or(`from_user_id.eq.${myId},to_user_id.eq.${myId}`)
        .order("created_at", { ascending: true }),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setProfile((pRes.data as any) ?? null);

    if (msgRes.error) {
      setError((prev) => prev || msgRes.error!.message);
      setThreads([]);
      setMessages([]);
      if (!silent) setLoading(false);
      return;
    }

    const all = (msgRes.data ?? []) as MessageRow[];

    // Build threads (1:1) from messages
    const map = new Map<
      string,
      { otherId: string; otherPseudo: string; lastAt: string; lastText: string; lastFromMe: boolean }
    >();

    for (const m of all) {
      const otherId = m.from_user_id === myId ? m.to_user_id : m.from_user_id;
      const otherPseudo =
        (m.from_user_id === myId ? m.to_pseudo : m.from_pseudo) ||
        "Membre";

      const lastAt = m.created_at ?? "";
      const lastText = m.content ?? "";
      const lastFromMe = m.from_user_id === myId;

      const existing = map.get(otherId);
      if (!existing) {
        map.set(otherId, { otherId, otherPseudo, lastAt, lastText, lastFromMe });
      } else {
        // compare by created_at string (ISO works lexicographically)
        if ((existing.lastAt || "") <= (lastAt || "")) {
          map.set(otherId, { otherId, otherPseudo, lastAt, lastText, lastFromMe });
        }
      }
    }

    const list = Array.from(map.values()).sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
    setThreads(list);

    // pick default thread if none selected
    if (!activeOtherId && list.length > 0) {
      setActiveOtherId(list[0].otherId);
      setActiveOtherPseudo(list[0].otherPseudo);
    }

    // load active messages
    const activeId = activeOtherId || (list[0]?.otherId ?? "");
    if (activeId) {
      const convo = all.filter(
        (m) =>
          (m.from_user_id === myId && m.to_user_id === activeId) ||
          (m.from_user_id === activeId && m.to_user_id === myId)
      );
      setMessages(convo);
    } else {
      setMessages([]);
    }

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll chat on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function refresh() {
    setRefreshing(true);
    await loadAll(true);
    setRefreshing(false);
  }

  // ====== REALTIME (safe) ======
  useEffect(() => {
    if (!me?.id) return;

    let alive = true;
    let channel: any = null;

    (async () => {
      const myId = me.id;
      const channelName = `messages-user-${myId}-${Date.now()}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            if (!alive) return;
            const row = payload.new as MessageRow;

            // Keep only messages that involve me
            if (row.from_user_id !== myId && row.to_user_id !== myId) return;

            setMessages((prev) => {
              // only append if belongs to current convo
              if (!activeOtherId) return prev;
              const belongs =
                (row.from_user_id === myId && row.to_user_id === activeOtherId) ||
                (row.from_user_id === activeOtherId && row.to_user_id === myId);
              if (!belongs) return prev;

              const exists = prev.some((m) => m.id === row.id);
              return exists ? prev : [...prev, row];
            });

            // Update threads list quickly
            setThreads((prev) => {
              const otherId = row.from_user_id === myId ? row.to_user_id : row.from_user_id;
              const otherPseudo =
                (row.from_user_id === myId ? row.to_pseudo : row.from_pseudo) || "Membre";

              const next = [...prev];
              const idx = next.findIndex((t) => t.otherId === otherId);
              const entry = {
                otherId,
                otherPseudo,
                lastAt: row.created_at ?? new Date().toISOString(),
                lastText: row.content ?? "",
                lastFromMe: row.from_user_id === myId,
              };

              if (idx === -1) next.unshift(entry);
              else {
                next.splice(idx, 1);
                next.unshift(entry);
              }
              return next;
            });
          }
        )
        .subscribe();
    })();

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, activeOtherId]);

  // ====== THREAD SELECT ======
  async function openThread(otherId: string, otherPseudo: string) {
    if (!me?.id) return;
    setActiveOtherId(otherId);
    setActiveOtherPseudo(otherPseudo);

    // reload conversation from DB to be safe
    const myId = me.id;
    const { data, error } = await supabase
      .from("messages")
      .select("id, from_user_id, to_user_id, from_pseudo, to_pseudo, content, created_at")
      .or(`and(from_user_id.eq.${myId},to_user_id.eq.${otherId}),and(from_user_id.eq.${otherId},to_user_id.eq.${myId})`)
      .order("created_at", { ascending: true });

    if (!error) setMessages((data ?? []) as MessageRow[]);
  }

  // ====== SEND ======
  async function send() {
    if (!me?.id) return;
    setError("");
    setInfo("");

    const content = text.trim();
    if (!content) return;
    if (!activeOtherId) {
      setError("Choisis une conversation.");
      return;
    }

    try {
      const fromPseudo = profile?.pseudo || "Membre";

      const { data, error } = await supabase
        .from("messages")
        .insert({
          from_user_id: me.id,
          to_user_id: activeOtherId,
          from_pseudo: fromPseudo,
          to_pseudo: activeOtherPseudo || "Membre",
          content,
        })
        .select("id, from_user_id, to_user_id, from_pseudo, to_pseudo, content, created_at")
        .single();

      if (error) throw new Error(error.message);

      if (data) {
        const row = data as MessageRow;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        setText("");
      }
    } catch (e: any) {
      setError(e?.message || "Impossible d’envoyer.");
    }
  }

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => `${t.otherPseudo} ${t.lastText}`.toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <div className="space-y-6">
      {/* Header premium */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <MessageCircle className="h-3.5 w-3.5" />
              Messages
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Conversations privées
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Propre, rapide, stable. Realtime sécurisé (pas de crash).
            </p>

            {profile ? (
              <div className="mt-5">
                <ProfileName profile={profile} size="md" showTitle showBadge />
              </div>
            ) : null}
          </div>

          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10 disabled:opacity-70"
          >
            <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
            Actualiser
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {info}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="h-[560px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          <div className="h-[560px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
          {/* Left: threads */}
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-black text-white">Conversations</div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <Users className="h-4 w-4 text-white/80" />
              </div>
            </div>

            <div className="mt-4 relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
              />
            </div>

            <div className="mt-4 space-y-3">
              {filteredThreads.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Aucune conversation.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const active = t.otherId === activeOtherId;
                  return (
                    <button
                      key={t.otherId}
                      onClick={() => openThread(t.otherId, t.otherPseudo)}
                      className={cx(
                        "w-full rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-white/10 bg-white/12"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {t.otherPseudo}
                          </div>
                          <div className="mt-1 truncate text-xs text-white/55">
                            {t.lastFromMe ? "Toi: " : ""}{t.lastText}
                          </div>
                        </div>
                        <div className="text-[11px] text-white/45">
                          {fmtTime(t.lastAt)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right: chat */}
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Conversation
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  {activeOtherId ? activeOtherPseudo : "Aucune sélection"}
                </div>
              </div>
            </div>

            <div className="mt-4 h-[360px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <div className="text-sm font-black text-white">Aucun message</div>
                    <div className="mt-2 text-xs text-white/55">
                      Choisis une conversation et écris.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.from_user_id === me?.id;
                    return (
                      <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cx(
                            "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                            mine
                              ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                              : "border border-white/10 bg-white/10 text-white"
                          )}
                        >
                          <div className={cx("mb-1 text-[11px] font-black", mine ? "text-black/70" : "text-white/60")}>
                            {mine ? (profile?.pseudo || "Toi") : (m.from_pseudo || activeOtherPseudo || "Membre")}
                            <span className={cx("ml-2 font-normal", mine ? "text-black/60" : "text-white/45")}>
                              {fmtTime(m.created_at)}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap leading-6">{m.content}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={activeOtherId ? "Écris un message..." : "Choisis une conversation"}
                className="min-h-[66px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
              />
              <button
                onClick={send}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3 text-sm font-black text-black hover:opacity-95"
              >
                <Send className="h-4 w-4" />
                Envoyer
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
