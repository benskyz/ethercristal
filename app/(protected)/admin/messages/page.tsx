"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Bell,
  Crown,
  Eye,
  Flame,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";

type ViewerProfile = {
  id: string;
  pseudo: string;
  isAdmin: boolean;
  isVip: boolean;
  role: string;
  masterTitle: string;
};

type ThreadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

type MemberRow = {
  thread_id: string;
  user_id: string;
  user_pseudo: string;
  avatar_url: string | null;
  name_fx_key: string | null;
  badge_key: string | null;
  joined_at?: string | null;
  last_read_at?: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_pseudo: string;
  sender_avatar_url: string | null;
  sender_name_fx_key: string | null;
  content: string;
  created_at: string;
};

type ReportRow = {
  id: string;
  message_id: string;
  thread_id: string;
  reporter_id: string;
  reason: string;
  notes: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type ThreadCard = {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string | null;
  updatedAt: string;
  totalMessages: number;
};

type ActivityCard = {
  userId: string;
  pseudo: string;
  count: number;
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function isTableMissing(error: any) {
  const code = error?.code;
  return code === "42P01" || code === "42703";
}

function getNameStyle(effectKey?: string | null): CSSProperties {
  const key = (effectKey || "").toLowerCase();

  if (!key) return { color: "#ffffff" };

  if (key.includes("matrix")) {
    return {
      backgroundImage: "linear-gradient(90deg,#00ff88,#9dff00,#00ff88)",
      backgroundSize: "220% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: "0 0 18px rgba(0,255,136,0.18)",
    };
  }

  if (key.includes("nebula") || key.includes("void")) {
    return {
      backgroundImage: "linear-gradient(90deg,#f0abfc,#a855f7,#ec4899,#f0abfc)",
      backgroundSize: "220% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: "0 0 18px rgba(168,85,247,0.18)",
    };
  }

  if (key.includes("diamond") || key.includes("crystal")) {
    return {
      backgroundImage: "linear-gradient(90deg,#ffffff,#a5f3fc,#dbeafe,#ffffff)",
      backgroundSize: "220% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: "0 0 18px rgba(125,211,252,0.18)",
    };
  }

  if (key.includes("ember") || key.includes("flame")) {
    return {
      backgroundImage: "linear-gradient(90deg,#fb923c,#ef4444,#fbbf24,#fb923c)",
      backgroundSize: "220% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: "0 0 18px rgba(239,68,68,0.18)",
    };
  }

  return {
    backgroundImage: "linear-gradient(90deg,#ffffff,#e9d5ff,#ffffff)",
    backgroundSize: "220% auto",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

function normalizeViewerSnake(row: any): ViewerProfile {
  return {
    id: row.id,
    pseudo: row.pseudo?.trim() || "Admin",
    isAdmin: Boolean(row.is_admin),
    isVip: Boolean(row.is_vip),
    role: row.role?.trim() || "member",
    masterTitle: row.master_title?.trim() || "Membre",
  };
}

function normalizeViewerCamel(row: any): ViewerProfile {
  return {
    id: row.id,
    pseudo: row.username?.trim() || "Admin",
    isAdmin: Boolean(row.isAdmin),
    isVip: Boolean(row.isPremium),
    role: row.role?.trim() || "member",
    masterTitle: row.masterTitle?.trim() || "Membre",
  };
}

async function loadViewerProfileCompat(userId: string, email?: string | null): Promise<ViewerProfile> {
  const snake = await supabase
    .from("profiles")
    .select("id, pseudo, is_admin, is_vip, role, master_title")
    .eq("id", userId)
    .maybeSingle();

  if (!snake.error && snake.data) {
    return normalizeViewerSnake(snake.data);
  }

  if (snake.error && !isTableMissing(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("profiles")
    .select('id, username, "isAdmin", "isPremium", role, "masterTitle"')
    .eq("id", userId)
    .maybeSingle();

  if (!camel.error && camel.data) {
    return normalizeViewerCamel(camel.data);
  }

  if (camel.error && !isTableMissing(camel.error)) {
    throw camel.error;
  }

  return {
    id: userId,
    pseudo: email?.split("@")[0]?.slice(0, 24) || "Admin",
    isAdmin: false,
    isVip: false,
    role: "member",
    masterTitle: "Membre",
  };
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/70";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        toneClass
      )}
    >
      {children}
    </span>
  );
}

function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  return (
    <div
      className={cx(
        "rounded-[22px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.24)]",
        flash.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      )}
    >
      {flash.text}
    </div>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-red-500/14 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[24px] border border-red-500/12 bg-black/20 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">
        {value}
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<FlashState>(null);

  const [viewer, setViewer] = useState<ViewerProfile | null>(null);

  const [threads, setThreads] = useState<ThreadCard[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [recentMessages, setRecentMessages] = useState<MessageRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const [reportFilter, setReportFilter] = useState<"all" | "open" | "reviewing" | "resolved" | "dismissed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    const clean = sanitizeText(searchTerm.toLowerCase(), 60);

    return reports.filter((report) => {
      const statusOk = reportFilter === "all" ? true : report.status === reportFilter;
      const textOk =
        !clean ||
        report.reason.toLowerCase().includes(clean) ||
        (report.notes || "").toLowerCase().includes(clean) ||
        (recentMessages.find((msg) => msg.id === report.message_id)?.content || "")
          .toLowerCase()
          .includes(clean);

      return statusOk && textOk;
    });
  }, [reportFilter, reports, recentMessages, searchTerm]);

  const threadCount = threads.length;
  const reportOpenCount = reports.filter((r) => r.status === "open" || r.status === "reviewing").length;
  const message24hCount = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return recentMessages.filter((msg) => new Date(msg.created_at).getTime() >= since).length;
  }, [recentMessages]);

  const uniqueMembersCount = useMemo(() => {
    return new Set(members.map((m) => m.user_id)).size;
  }, [members]);

  const topSenders = useMemo<ActivityCard[]>(() => {
    const countMap = new Map<string, ActivityCard>();

    for (const msg of recentMessages) {
      const current = countMap.get(msg.sender_id);
      if (current) {
        current.count += 1;
      } else {
        countMap.set(msg.sender_id, {
          userId: msg.sender_id,
          pseudo: msg.sender_pseudo,
          count: 1,
        });
      }
    }

    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [recentMessages]);

  const reportMessageMap = useMemo(() => {
    return new Map(recentMessages.map((msg) => [msg.id, msg]));
  }, [recentMessages]);

  const loadAll = useCallback(
    async (firstLoad = false) => {
      if (firstLoad) setLoading(true);
      else setRefreshing(true);

      try {
        setFlash(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextViewer = await loadViewerProfileCompat(user.id, user.email);
        setViewer(nextViewer);

        if (!nextViewer.isAdmin) {
          router.replace("/dashboard");
          return;
        }

        const threadsRes = await supabase
          .from("private_threads")
          .select("id, created_at, updated_at, last_message_at")
          .order("updated_at", { ascending: false })
          .limit(60);

        if (threadsRes.error) throw threadsRes.error;

        const threadRows = (threadsRes.data as ThreadRow[] | null) ?? [];
        const threadIds = threadRows.map((row) => row.id);

        let memberRows: MemberRow[] = [];
        let msgRows: MessageRow[] = [];

        if (threadIds.length > 0) {
          const [membersRes, messagesRes] = await Promise.all([
            supabase
              .from("private_thread_members")
              .select("thread_id, user_id, user_pseudo, avatar_url, name_fx_key, badge_key, joined_at, last_read_at")
              .in("thread_id", threadIds),
            supabase
              .from("private_messages")
              .select("id, thread_id, sender_id, sender_pseudo, sender_avatar_url, sender_name_fx_key, content, created_at")
              .in("thread_id", threadIds)
              .order("created_at", { ascending: false })
              .limit(500),
          ]);

          if (membersRes.error) throw membersRes.error;
          if (messagesRes.error) throw messagesRes.error;

          memberRows = (membersRes.data as MemberRow[] | null) ?? [];
          msgRows = (messagesRes.data as MessageRow[] | null) ?? [];
        }

        const reportsRes = await supabase
          .from("private_message_reports")
          .select("id, message_id, thread_id, reporter_id, reason, notes, status, created_at, reviewed_at, reviewed_by")
          .order("created_at", { ascending: false })
          .limit(120);

        if (reportsRes.error) throw reportsRes.error;

        const membersByThread = new Map<string, MemberRow[]>();
        const messagesByThread = new Map<string, MessageRow[]>();

        for (const row of memberRows) {
          const arr = membersByThread.get(row.thread_id) || [];
          arr.push(row);
          membersByThread.set(row.thread_id, arr);
        }

        for (const row of msgRows) {
          const arr = messagesByThread.get(row.thread_id) || [];
          arr.push(row);
          messagesByThread.set(row.thread_id, arr);
        }

        const builtThreads: ThreadCard[] = threadRows.map((thread) => {
          const threadMembers = membersByThread.get(thread.id) || [];
          const threadMessages = messagesByThread.get(thread.id) || [];
          const lastMessage = threadMessages[0];

          return {
            id: thread.id,
            participants: threadMembers.map((m) => m.user_pseudo),
            lastMessage: lastMessage?.content || "Aucun message",
            lastMessageAt: lastMessage?.created_at || thread.last_message_at || thread.updated_at,
            updatedAt: thread.updated_at,
            totalMessages: threadMessages.length,
          };
        });

        setThreads(builtThreads);
        setMembers(memberRows);
        setRecentMessages(msgRows);
        setReports((reportsRes.data as ReportRow[] | null) ?? []);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger l’administration des messages.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadAll(true);
  }, [loadAll]);

  async function updateReportStatus(
    reportId: string,
    nextStatus: ReportRow["status"]
  ) {
    setUpdatingReportId(reportId);
    setFlash(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const res = await supabase
        .from("private_message_reports")
        .update({
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq("id", reportId);

      if (res.error) throw res.error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: nextStatus,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id ?? null,
              }
            : report
        )
      );

      setFlash({
        tone: "success",
        text: "Signalement mis à jour.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier le signalement.",
      });
    } finally {
      setUpdatingReportId(null);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Admin messages
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

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
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
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
              onClick={() => void loadAll(false)}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-red-500/14 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    Administration
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Messages privés
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span>
                      <span className="font-black text-white">{viewer?.pseudo}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Rôle <span className="font-black text-white">{viewer?.role?.toUpperCase() || "ADMIN"}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Titre <span className="font-black text-white">{viewer?.masterTitle || "Admin"}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="green">
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </Tag>
                    {viewer?.isVip ? <Tag tone="gold"><Crown className="h-3.5 w-3.5" />VIP</Tag> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadAll(false)}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                >
                  <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                  Actualiser
                </button>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<MessageSquare className="h-4 w-4 text-red-200" />}
                label="Conversations"
                value={threadCount}
              />
              <StatCard
                icon={<AlertTriangle className="h-4 w-4 text-red-200" />}
                label="Signalements ouverts"
                value={reportOpenCount}
              />
              <StatCard
                icon={<Bell className="h-4 w-4 text-red-200" />}
                label="Messages 24h"
                value={message24hCount}
              />
              <StatCard
                icon={<Users className="h-4 w-4 text-red-200" />}
                label="Membres actifs"
                value={uniqueMembersCount}
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Conversations récentes" right={<Tag>{threads.length}</Tag>}>
                <div className="space-y-3">
                  {threads.length === 0 ? (
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                      Aucune conversation.
                    </div>
                  ) : (
                    threads.slice(0, 12).map((thread) => (
                      <div
                        key={thread.id}
                        className="rounded-[20px] border border-red-500/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-black uppercase tracking-[0.12em] text-white">
                            {thread.participants.join(" • ")}
                          </div>
                          <Tag>{thread.totalMessages} msg</Tag>
                        </div>

                        <div className="mt-2 text-sm text-white/60">
                          {truncate(thread.lastMessage, 100)}
                        </div>

                        <div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/35">
                          {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString("fr-CA") : "Aucune activité"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Membres les plus actifs" right={<Flame className="h-4 w-4 text-red-200" />}>
                <div className="space-y-3">
                  {topSenders.length === 0 ? (
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                      Aucun message récent.
                    </div>
                  ) : (
                    topSenders.map((sender) => (
                      <div
                        key={sender.userId}
                        className="flex items-center justify-between rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {sender.pseudo}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/38">
                            Utilisateur
                          </div>
                        </div>

                        <Tag tone="red">{sender.count} msg</Tag>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>

            <Panel
              title="Signalements"
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.slice(0, 60))}
                    placeholder="Recherche"
                    className="w-[160px] rounded-[14px] border border-red-500/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/28"
                  />
                  <select
                    value={reportFilter}
                    onChange={(e) =>
                      setReportFilter(
                        e.target.value as "all" | "open" | "reviewing" | "resolved" | "dismissed"
                      )
                    }
                    className="rounded-[14px] border border-red-500/10 bg-black/20 px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="all">Tous</option>
                    <option value="open">Ouverts</option>
                    <option value="reviewing">En cours</option>
                    <option value="resolved">Résolus</option>
                    <option value="dismissed">Rejetés</option>
                  </select>
                </div>
              }
            >
              <div className="space-y-4">
                {filteredReports.length === 0 ? (
                  <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                    Aucun signalement.
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const linkedMessage = reportMessageMap.get(report.message_id);

                    return (
                      <div
                        key={report.id}
                        className="rounded-[22px] border border-red-500/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag
                                tone={
                                  report.status === "resolved"
                                    ? "green"
                                    : report.status === "dismissed"
                                    ? "default"
                                    : "red"
                                }
                              >
                                {report.status}
                              </Tag>
                              <Tag>{report.reason}</Tag>
                              <Tag>{new Date(report.created_at).toLocaleDateString("fr-CA")}</Tag>
                            </div>

                            {report.notes ? (
                              <div className="mt-3 text-sm text-white/70">
                                <span className="font-black text-white">Notes :</span> {report.notes}
                              </div>
                            ) : null}

                            <div className="mt-3 rounded-[18px] border border-red-500/10 bg-[#09090d] p-4">
                              <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/38">
                                Message signalé
                              </div>

                              {linkedMessage ? (
                                <>
                                  <div
                                    className="text-sm font-black"
                                    style={getNameStyle(linkedMessage.sender_name_fx_key)}
                                  >
                                    {linkedMessage.sender_pseudo}
                                  </div>
                                  <div className="mt-2 whitespace-pre-wrap break-words text-sm text-white/78">
                                    {linkedMessage.content}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-white/45">
                                  Message non chargé dans le lot courant.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={updatingReportId === report.id}
                              onClick={() => void updateReportStatus(report.id, "reviewing")}
                              className="inline-flex items-center gap-2 rounded-[16px] border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100 transition hover:bg-amber-500/16 disabled:opacity-60"
                            >
                              <Clock3 className="h-3.5 w-3.5" />
                              En cours
                            </button>

                            <button
                              type="button"
                              disabled={updatingReportId === report.id}
                              onClick={() => void updateReportStatus(report.id, "resolved")}
                              className="inline-flex items-center gap-2 rounded-[16px] border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/16 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Résoudre
                            </button>

                            <button
                              type="button"
                              disabled={updatingReportId === report.id}
                              onClick={() => void updateReportStatus(report.id, "dismissed")}
                              className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/85 transition hover:bg-white/[0.08] disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rejeter
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel title="Derniers messages" right={<Eye className="h-4 w-4 text-red-200" />}>
              <div className="space-y-3">
                {recentMessages.length === 0 ? (
                  <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                    Aucun message récent.
                  </div>
                ) : (
                  recentMessages.slice(0, 20).map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-[18px] border border-red-500/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="text-sm font-black"
                          style={getNameStyle(msg.sender_name_fx_key)}
                        >
                          {msg.sender_pseudo}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.12em] text-white/38">
                          {new Date(msg.created_at).toLocaleString("fr-CA")}
                        </div>
                      </div>

                      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-white/72">
                        {truncate(msg.content, 280)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
