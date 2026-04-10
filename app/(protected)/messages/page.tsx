"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  CheckCheck,
  Crown,
  Loader2,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type PartnerProfile = {
  id: string;
  pseudo: string | null;
  is_vip: boolean | null;
  is_admin: boolean | null;
  master_title: string | null;
  active_badge_key: string | null;
  active_name_fx_key: string | null;
  active_title_key: string | null;
};

type ThreadItem = {
  partnerId: string;
  partner: PartnerProfile | null;
  lastMessage: MessageRow;
  unreadCount: number;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name?: string | null) {
  const clean = String(name || "M").trim();
  if (!clean) return "M";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "M";
}

function shortText(value?: string | null, max = 60) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function displayPseudo(profile?: PartnerProfile | null) {
  return String(profile?.pseudo || "Membre");
}

function buildThreads(
  messages: MessageRow[],
  viewerId: string,
  partnersById: Record<string, PartnerProfile>
) {
  const map = new Map<string, ThreadItem>();

  for (const message of messages) {
    const partnerId =
      message.sender_id === viewerId ? message.receiver_id : message.sender_id;

    if (!partnerId) continue;

    const unread =
      message.receiver_id === viewerId && !message.read_at ? 1 : 0;

    if (!map.has(partnerId)) {
      map.set(partnerId, {
        partnerId,
        partner: partnersById[partnerId] || null,
        lastMessage: message,
        unreadCount: unread,
      });
      continue;
    }

    const existing = map.get(partnerId)!;
    existing.unreadCount += unread;
  }

  return Array.from(map.values());
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "violet" | "green" | "red";
}) {
  const styles =
    tone === "gold"
      ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "green"
      ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
      : tone === "red"
      ? "border-red-400/18 bg-red-500/10 text-red-100"
      : "border-white/10 bg-white/[0.04] text-white/72";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]",
        styles
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="bg-gradient-to-r from-red-300/80 via-white/90 to-fuchsia-300/80 bg-clip-text text-[11px] font-black uppercase tracking-[0.35em] text-transparent">
            {title}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
        {label}
      </div>
      <div className="text-right text-sm font-black text-white">{value}</div>
    </div>
  );
}

function ConversationBubble({
  mine,
  content,
  createdAt,
  readAt,
}: {
  mine: boolean;
  content: string;
  createdAt: string;
  readAt: string | null;
}) {
  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[85%] rounded-[22px] border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
          mine
            ? "border-fuchsia-400/18 bg-fuchsia-500/12 text-white"
            : "border-white/10 bg-black/25 text-white/88"
        )}
      >
        <div className="whitespace-pre-wrap text-sm leading-6">{content}</div>
        <div
          className={cx(
            "mt-2 flex items-center gap-2 text-[11px] font-semibold",
            mine ? "justify-end text-white/55" : "text-white/40"
          )}
        >
          <span>{formatDateTime(createdAt)}</span>
          {mine ? (
            <span className="inline-flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" />
              {readAt ? "lu" : "envoyé"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);

  const [viewerId, setViewerId] = useState("");
  const [viewer, setViewer] = useState<ProfileRow | null>(null);

  const [messageIndex, setMessageIndex] = useState<MessageRow[]>([]);
  const [partnersById, setPartnersById] = useState<Record<string, PartnerProfile>>(
    {}
  );

  const [activePartnerId, setActivePartnerId] = useState("");
  const [activeMessages, setActiveMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PartnerProfile[]>([]);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const threads = useMemo(() => {
    if (!viewerId) return [];
    return buildThreads(messageIndex, viewerId, partnersById);
  }, [messageIndex, viewerId, partnersById]);

  const activePartner = useMemo(() => {
    return activePartnerId ? partnersById[activePartnerId] || null : null;
  }, [activePartnerId, partnersById]);

  const fetchPartnerProfiles = useCallback(async (ids: string[]) => {
    if (!ids.length) return {} as Record<string, PartnerProfile>;

    const supabase = requireSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, pseudo, is_vip, is_admin, master_title, active_badge_key, active_name_fx_key, active_title_key"
      )
      .in("id", ids);

    if (error) throw error;

    return Object.fromEntries(
      ((data || []) as PartnerProfile[]).map((row) => [row.id, row])
    );
  }, []);

  const loadThreadIndex = useCallback(
    async (firstLoad = false, forcedViewerId?: string) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setError("");

        const supabase = requireSupabaseBrowserClient();
        let effectiveViewerId = forcedViewerId || viewerId;

        if (!effectiveViewerId) {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            router.replace("/enter");
            return;
          }

          const nextViewer = await ensureProfileRecord(user);
          setViewerId(user.id);
          setViewer(nextViewer);
          effectiveViewerId = user.id;
        }

        const { data: rawMessages, error: messagesError } = await supabase
          .from("private_messages")
          .select("id, sender_id, receiver_id, content, created_at, read_at")
          .or(`sender_id.eq.${effectiveViewerId},receiver_id.eq.${effectiveViewerId}`)
          .order("created_at", { ascending: false })
          .limit(400);

        if (messagesError) throw messagesError;

        const cleanMessages = ((rawMessages || []) as Partial<MessageRow>[])
          .filter(
            (row) =>
              row &&
              typeof row.id === "string" &&
              typeof row.sender_id === "string" &&
              typeof row.receiver_id === "string" &&
              typeof row.content === "string"
          )
          .map((row) => ({
            id: row.id as string,
            sender_id: row.sender_id as string,
            receiver_id: row.receiver_id as string,
            content: row.content as string,
            created_at: String(row.created_at || new Date().toISOString()),
            read_at: row.read_at ? String(row.read_at) : null,
          }));

        const partnerIds = Array.from(
          new Set(
            cleanMessages
              .flatMap((row) => [row.sender_id, row.receiver_id])
              .filter((id) => id && id !== effectiveViewerId)
          )
        );

        const nextPartners = await fetchPartnerProfiles(partnerIds);

        setMessageIndex(cleanMessages);
        setPartnersById((prev) => ({
          ...prev,
          ...nextPartners,
        }));
      } catch (err: any) {
        setError(err?.message || "Impossible de charger les conversations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewerId, router, fetchPartnerProfiles]
  );

  const loadConversation = useCallback(
    async (partnerId: string, markRead = true, forcedViewerId?: string) => {
      const effectiveViewerId = forcedViewerId || viewerId;
      if (!effectiveViewerId || !partnerId) return;

      try {
        setLoadingConversation(true);
        setError("");

        const supabase = requireSupabaseBrowserClient();

        const { data, error: conversationError } = await supabase
          .from("private_messages")
          .select("id, sender_id, receiver_id, content, created_at, read_at")
          .or(
            `and(sender_id.eq.${effectiveViewerId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${effectiveViewerId})`
          )
          .order("created_at", { ascending: true })
          .limit(300);

        if (conversationError) throw conversationError;

        const clean = ((data || []) as Partial<MessageRow>[])
          .filter(
            (row) =>
              row &&
              typeof row.id === "string" &&
              typeof row.sender_id === "string" &&
              typeof row.receiver_id === "string" &&
              typeof row.content === "string"
          )
          .map((row) => ({
            id: row.id as string,
            sender_id: row.sender_id as string,
            receiver_id: row.receiver_id as string,
            content: row.content as string,
            created_at: String(row.created_at || new Date().toISOString()),
            read_at: row.read_at ? String(row.read_at) : null,
          }));

        setActiveMessages(clean);

        if (markRead) {
          await supabase
            .from("private_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("sender_id", partnerId)
            .eq("receiver_id", effectiveViewerId)
            .is("read_at", null);

          await loadThreadIndex(false, effectiveViewerId);
        }
      } catch (err: any) {
        setError(err?.message || "Impossible de charger la conversation.");
      } finally {
        setLoadingConversation(false);
      }
    },
    [viewerId, loadThreadIndex]
  );

  useEffect(() => {
    void loadThreadIndex(true);
  }, [loadThreadIndex]);

  useEffect(() => {
    if (!activePartnerId && threads.length > 0) {
      setActivePartnerId(threads[0].partnerId);
    }
  }, [threads, activePartnerId]);

  useEffect(() => {
    if (!activePartnerId || !viewerId) return;
    void loadConversation(activePartnerId, true, viewerId);
  }, [activePartnerId, viewerId, loadConversation]);

  useEffect(() => {
    if (!viewerId) return;

    const supabase = requireSupabaseBrowserClient();

    const channel = supabase
      .channel(`private-messages-${viewerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const row = payload.new as MessageRow | null;
          if (!row) return;

          const touchesViewer =
            row.sender_id === viewerId || row.receiver_id === viewerId;

          if (!touchesViewer) return;

          void loadThreadIndex(false, viewerId);

          const partnerId =
            row.sender_id === viewerId ? row.receiver_id : row.sender_id;

          if (activePartnerId && partnerId === activePartnerId) {
            void loadConversation(activePartnerId, true, viewerId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const row = payload.new as MessageRow | null;
          if (!row) return;

          const touchesViewer =
            row.sender_id === viewerId || row.receiver_id === viewerId;

          if (!touchesViewer) return;

          void loadThreadIndex(false, viewerId);

          const partnerId =
            row.sender_id === viewerId ? row.receiver_id : row.sender_id;

          if (activePartnerId && partnerId === activePartnerId) {
            void loadConversation(activePartnerId, false, viewerId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const row = payload.old as MessageRow | null;
          if (!row) return;

          const touchesViewer =
            row.sender_id === viewerId || row.receiver_id === viewerId;

          if (!touchesViewer) return;

          void loadThreadIndex(false, viewerId);

          const partnerId =
            row.sender_id === viewerId ? row.receiver_id : row.sender_id;

          if (activePartnerId && partnerId === activePartnerId) {
            void loadConversation(activePartnerId, false, viewerId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerId, activePartnerId, loadThreadIndex, loadConversation]);

  useEffect(() => {
    if (!viewerId) return;

    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const supabase = requireSupabaseBrowserClient();

        const { data, error: searchError } = await supabase
          .from("profiles")
          .select(
            "id, pseudo, is_vip, is_admin, master_title, active_badge_key, active_name_fx_key, active_title_key"
          )
          .ilike("pseudo", `%${q}%`)
          .neq("id", viewerId)
          .limit(12);

        if (searchError) throw searchError;

        setSearchResults((data || []) as PartnerProfile[]);
      } catch {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, viewerId]);

  const handleOpenThread = useCallback(
    async (partner: PartnerProfile) => {
      setActivePartnerId(partner.id);
      setPartnersById((prev) => ({
        ...prev,
        [partner.id]: partner,
      }));
      setSearch("");
      setSearchResults([]);
      await loadConversation(partner.id, true);
    },
    [loadConversation]
  );

  const handleSend = useCallback(async () => {
    if (!viewerId || !activePartnerId) return;

    const content = draft.trim();
    if (!content) return;

    try {
      setSending(true);
      setError("");
      setSuccess("");

      const supabase = requireSupabaseBrowserClient();

      const { error: insertError } = await supabase.from("private_messages").insert({
        sender_id: viewerId,
        receiver_id: activePartnerId,
        content,
      });

      if (insertError) throw insertError;

      setDraft("");
      setSuccess("Message envoyé.");
      await loadThreadIndex(false, viewerId);
      await loadConversation(activePartnerId, false, viewerId);
    } catch (err: any) {
      setError(err?.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  }, [viewerId, activePartnerId, draft, loadThreadIndex, loadConversation]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative min-h-screen lg:pl-[290px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(170,50,170,0.12),transparent_35%),radial-gradient(circle_at_50%_5%,rgba(59,130,246,0.10),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
          <div className="absolute -left-24 top-16 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-red-700/20 via-fuchsia-700/16 to-blue-700/12 blur-[160px]" />
          <div className="absolute right-8 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-red-600/16 via-pink-600/16 to-orange-600/14 blur-[150px]" />
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => void loadThreadIndex(false)}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[32px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />
              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    messagerie privée
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Messages
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(viewer)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      conversations{" "}
                      <span className="font-black text-white">{threads.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      statut{" "}
                      <span className="font-black text-white">
                        {viewer?.is_admin ? "ADMIN" : viewer?.is_vip ? "VIP" : "MEMBRE"}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {viewer?.is_admin ? <Tag tone="red">admin</Tag> : null}
                    {viewer?.is_vip ? <Tag tone="gold">vip</Tag> : <Tag>standard</Tag>}
                    {viewer?.master_title ? (
                      <Tag tone="violet">{viewer.master_title}</Tag>
                    ) : null}
                  </div>

                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/58">
                    Vrai système de messages : conversations, recherche, envoi, lecture et realtime propre.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void loadThreadIndex(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <UserRound className="h-4 w-4" />
                    Profil
                  </button>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
              <Card title="Conversations" right={<Tag>{threads.length} threads</Tag>}>
                <div className="space-y-3">
                  {threads.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/48">
                      Aucune conversation.
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <button
                        key={thread.partnerId}
                        type="button"
                        onClick={() => setActivePartnerId(thread.partnerId)}
                        className={cx(
                          "w-full rounded-[20px] border p-4 text-left transition",
                          activePartnerId === thread.partnerId
                            ? "border-fuchsia-400/18 bg-fuchsia-500/10"
                            : "border-white/8 bg-black/20 hover:bg-white/[0.05]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-white/10 bg-white/[0.06] font-black text-white">
                              {initials(displayPseudo(thread.partner))}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-white">
                                {displayPseudo(thread.partner)}
                              </div>

                              <div className="mt-1 flex flex-wrap gap-2">
                                {thread.partner?.is_admin ? <Tag tone="red">admin</Tag> : null}
                                {thread.partner?.is_vip ? <Tag tone="gold">vip</Tag> : null}
                              </div>
                            </div>
                          </div>

                          {thread.unreadCount > 0 ? (
                            <div className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">
                              {thread.unreadCount}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 text-sm text-white/56">
                          {shortText(thread.lastMessage.content)}
                        </div>

                        <div className="mt-2 text-[11px] text-white/34">
                          {formatDateTime(thread.lastMessage.created_at)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <Card
                title="Conversation active"
                right={
                  activePartner ? (
                    <Tag tone="violet">{displayPseudo(activePartner)}</Tag>
                  ) : (
                    <Tag>aucune</Tag>
                  )
                }
              >
                {!activePartnerId ? (
                  <div className="flex min-h-[520px] items-center justify-center rounded-[22px] border border-white/8 bg-black/20 p-6 text-center text-white/45">
                    Sélectionne une conversation.
                  </div>
                ) : (
                  <div className="flex min-h-[520px] flex-col">
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-white/10 bg-white/[0.06] font-black text-white">
                          {initials(displayPseudo(activePartner))}
                        </div>

                        <div>
                          <div className="text-lg font-black text-white">
                            {displayPseudo(activePartner)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {activePartner?.is_admin ? <Tag tone="red">admin</Tag> : null}
                            {activePartner?.is_vip ? <Tag tone="gold">vip</Tag> : null}
                            {activePartner?.master_title ? (
                              <Tag tone="violet">{activePartner.master_title}</Tag>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {loadingConversation ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white/55" />
                      ) : null}
                    </div>

                    <div className="flex-1 space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4">
                      {activeMessages.length === 0 ? (
                        <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-white/45">
                          Aucun message pour l’instant.
                        </div>
                      ) : (
                        activeMessages.map((message) => (
                          <ConversationBubble
                            key={String(message.id)}
                            mine={message.sender_id === viewerId}
                            content={message.content}
                            createdAt={message.created_at}
                            readAt={message.read_at}
                          />
                        ))
                      )}
                    </div>

                    <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Écris ton message..."
                        rows={4}
                        className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                      />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-white/34">
                          {draft.trim().length} caractères
                        </div>

                        <button
                          type="button"
                          disabled={sending || !draft.trim() || !activePartnerId}
                          onClick={() => void handleSend()}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                            sending || !draft.trim() || !activePartnerId
                              ? "border-white/10 bg-white/[0.05] text-white/42"
                              : "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/16"
                          )}
                        >
                          {sending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Envoi...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Envoyer
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card title="Chercher un membre" right={<Tag tone="violet">nouveau</Tag>}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pseudo..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {search.trim().length < 2 ? (
                      <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/45">
                        Tape au moins 2 lettres.
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/45">
                        Aucun résultat.
                      </div>
                    ) : (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => void handleOpenThread(result)}
                          className="w-full rounded-[18px] border border-white/8 bg-black/20 p-4 text-left transition hover:bg-white/[0.05]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-[15px] border border-white/10 bg-white/[0.06] font-black text-white">
                              {initials(displayPseudo(result))}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-white">
                                {displayPseudo(result)}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {result.is_admin ? <Tag tone="red">admin</Tag> : null}
                                {result.is_vip ? <Tag tone="gold">vip</Tag> : null}
                                {result.master_title ? (
                                  <Tag tone="violet">{result.master_title}</Tag>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </Card>

                <Card title="Résumé" right={<Tag>{threads.length} actifs</Tag>}>
                  <div className="grid gap-3">
                    <Row label="membre" value={profileDisplayName(viewer)} />
                    <Row label="conversations" value={threads.length} />
                    <Row
                      label="non lus"
                      value={threads.reduce((sum, thread) => sum + thread.unreadCount, 0)}
                    />
                    <Row
                      label="conversation active"
                      value={activePartner ? displayPseudo(activePartner) : "Aucune"}
                    />
                  </div>
                </Card>

                <Card title="Fonctions" right={<Tag tone="gold">realtime</Tag>}>
                  <div className="space-y-3">
                    {[
                      "Messages privés en temps réel.",
                      "Marquage automatique en lu quand tu ouvres la conversation.",
                      "Recherche directe par pseudo.",
                    ].map((line) => (
                      <div
                        key={line}
                        className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-black/20 px-4 py-3"
                      >
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
                        <div className="text-sm leading-6 text-white/68">{line}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
