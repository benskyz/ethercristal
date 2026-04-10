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
  Bell,
  Check,
  Eye,
  Menu,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type AdminProfile = {
  id: string;
  pseudo: string;
  credits: number;
  isVip: boolean;
  isAdmin: boolean;
  vipExpiresAt: string | null;
  role: string;
  masterTitle: string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: string;
  isActive: boolean;
  createdAt: string | null;
  schema: "snake" | "camel";
  table: "announcements" | "site_announcements";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "active" | "inactive";

type AnnouncementForm = {
  id: string | null;
  title: string;
  body: string;
  audience: string;
  isActive: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function isSchemaMismatch(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01";
}

async function loadAdminProfileCompat(userId: string): Promise<AdminProfile | null> {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase
    .from("profiles")
    .select(
      "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!snake.error && snake.data) {
    return {
      id: snake.data.id,
      pseudo: sanitizeText(snake.data.pseudo, "Membre Ether"),
      credits: Number(snake.data.credits ?? 0),
      isVip: Boolean(snake.data.is_vip),
      isAdmin: Boolean(snake.data.is_admin),
      vipExpiresAt: snake.data.vip_expires_at ?? null,
      role: sanitizeText(snake.data.role, "member"),
      masterTitle: sanitizeText(snake.data.master_title, "Aucun titre"),
    };
  }

  if (snake.error && !isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("profiles")
    .select(
      'id, username, "etherBalance", "isPremium", "isAdmin", "premiumExpiresAt", role, "masterTitle"'
    )
    .eq("id", userId)
    .maybeSingle();

  if (!camel.error && camel.data) {
    return {
      id: camel.data.id,
      pseudo: sanitizeText(camel.data.username, "Membre Ether"),
      credits: Number(camel.data.etherBalance ?? 0),
      isVip: Boolean(camel.data.isPremium),
      isAdmin: Boolean(camel.data.isAdmin),
      vipExpiresAt: camel.data.premiumExpiresAt ?? null,
      role: sanitizeText(camel.data.role, "member"),
      masterTitle: sanitizeText(camel.data.masterTitle, "Aucun titre"),
    };
  }

  if (camel.error && !isSchemaMismatch(camel.error)) {
    throw camel.error;
  }

  return null;
}

async function loadAnnouncementsCompat(): Promise<AnnouncementRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const attempts = [
    {
      table: "announcements" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("announcements")
          .select("id, title, body, audience, is_active, created_at")
          .order("created_at", { ascending: false }),
      map: (row: any): AnnouncementRow => ({
        id: String(row.id),
        title: sanitizeText(row.title, "Annonce"),
        body: sanitizeText(row.body, ""),
        audience: sanitizeText(row.audience, "all"),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at || null,
        schema: "snake",
        table: "announcements",
      }),
    },
    {
      table: "announcements" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("announcements")
          .select('id, title, body, audience, "isActive", "createdAt"')
          .order("createdAt", { ascending: false }),
      map: (row: any): AnnouncementRow => ({
        id: String(row.id),
        title: sanitizeText(row.title, "Annonce"),
        body: sanitizeText(row.body, ""),
        audience: sanitizeText(row.audience, "all"),
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt || null,
        schema: "camel",
        table: "announcements",
      }),
    },
    {
      table: "site_announcements" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("site_announcements")
          .select("id, title, body, audience, is_active, created_at")
          .order("created_at", { ascending: false }),
      map: (row: any): AnnouncementRow => ({
        id: String(row.id),
        title: sanitizeText(row.title, "Annonce"),
        body: sanitizeText(row.body, ""),
        audience: sanitizeText(row.audience, "all"),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at || null,
        schema: "snake",
        table: "site_announcements",
      }),
    },
    {
      table: "site_announcements" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("site_announcements")
          .select('id, title, body, audience, "isActive", "createdAt"')
          .order("createdAt", { ascending: false }),
      map: (row: any): AnnouncementRow => ({
        id: String(row.id),
        title: sanitizeText(row.title, "Annonce"),
        body: sanitizeText(row.body, ""),
        audience: sanitizeText(row.audience, "all"),
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt || null,
        schema: "camel",
        table: "site_announcements",
      }),
    },
  ];

  for (const attempt of attempts) {
    const res = await attempt.query();
    if (!res.error) {
      return ((res.data ?? []) as any[]).map(attempt.map);
    }
    if (!isSchemaMismatch(res.error)) {
      throw res.error;
    }
  }

  return [];
}

async function createAnnouncement(
  payload: AnnouncementForm,
  target: { table: "announcements" | "site_announcements"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();

  if (target.schema === "snake") {
    const res = await supabase.from(target.table).insert({
      title: payload.title,
      body: payload.body,
      audience: payload.audience,
      is_active: payload.isActive,
    });
    if (res.error) throw res.error;
    return;
  }

  const res = await supabase.from(target.table).insert({
    title: payload.title,
    body: payload.body,
    audience: payload.audience,
    isActive: payload.isActive,
  });
  if (res.error) throw res.error;
}

async function updateAnnouncement(
  payload: AnnouncementForm,
  target: { table: "announcements" | "site_announcements"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();

  if (!payload.id) throw new Error("ID annonce manquant.");

  if (target.schema === "snake") {
    const res = await supabase
      .from(target.table)
      .update({
        title: payload.title,
        body: payload.body,
        audience: payload.audience,
        is_active: payload.isActive,
      })
      .eq("id", payload.id);
    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(target.table)
    .update({
      title: payload.title,
      body: payload.body,
      audience: payload.audience,
      isActive: payload.isActive,
    })
    .eq("id", payload.id);
  if (res.error) throw res.error;
}

async function toggleAnnouncementActive(row: AnnouncementRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (row.schema === "snake") {
    const res = await supabase
      .from(row.table)
      .update({ is_active: nextValue })
      .eq("id", row.id);
    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(row.table)
    .update({ isActive: nextValue })
    .eq("id", row.id);
  if (res.error) throw res.error;
}

async function deleteAnnouncement(row: AnnouncementRow) {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase.from(row.table).delete().eq("id", row.id);
  if (res.error) throw res.error;
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
        "rounded-[20px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
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

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10"
      : "border-white/10 bg-black/20";

  return (
    <div
      className={cx(
        "rounded-[22px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]",
        toneClass
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [targetTable, setTargetTable] = useState<"announcements" | "site_announcements">(
    "announcements"
  );
  const [targetSchema, setTargetSchema] = useState<"snake" | "camel">("snake");
  const [form, setForm] = useState<AnnouncementForm>({
    id: null,
    title: "",
    body: "",
    audience: "all",
    isActive: true,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return announcements.filter((row) => {
      if (filter === "active" && !row.isActive) return false;
      if (filter === "inactive" && row.isActive) return false;

      if (!q) return true;

      return (
        row.title.toLowerCase().includes(q) ||
        row.body.toLowerCase().includes(q) ||
        row.audience.toLowerCase().includes(q)
      );
    });
  }, [announcements, search, filter]);

  const activeCount = useMemo(
    () => announcements.filter((row) => row.isActive).length,
    [announcements]
  );

  const audienceCount = useMemo(() => {
    return new Set(announcements.map((row) => row.audience)).size;
  }, [announcements]);

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      title: "",
      body: "",
      audience: "all",
      isActive: true,
    });
  }, []);

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setFlash(null);

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextAdmin = await loadAdminProfileCompat(user.id);

        if (!nextAdmin || !nextAdmin.isAdmin) {
          router.replace("/dashboard");
          return;
        }

        const rows = await loadAnnouncementsCompat();

        setAdminProfile(nextAdmin);
        setAnnouncements(rows);

        if (rows.length > 0) {
          setTargetTable(rows[0].table);
          setTargetSchema(rows[0].schema);
        }
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les annonces.",
        });
        console.error("Admin announcements error:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  function startEdit(row: AnnouncementRow) {
    setTargetTable(row.table);
    setTargetSchema(row.schema);
    setForm({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      isActive: row.isActive,
    });
  }

  async function handleSave() {
    try {
      setSaving(true);

      const title = form.title.trim();
      const body = form.body.trim();
      const audience = slugify(form.audience || "all") || "all";

      if (!title) {
        throw new Error("Le titre de l’annonce est obligatoire.");
      }

      if (!body) {
        throw new Error("Le contenu de l’annonce est obligatoire.");
      }

      const payload: AnnouncementForm = {
        ...form,
        title,
        body,
        audience,
      };

      if (payload.id) {
        await updateAnnouncement(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Annonce mise à jour.",
        });
      } else {
        await createAnnouncement(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Annonce créée.",
        });
      }

      resetForm();
      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer cette annonce.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(row: AnnouncementRow) {
    try {
      setBusyId(row.id);
      await toggleAnnouncementActive(row, !row.isActive);

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, isActive: !row.isActive } : item
        )
      );

      setFlash({
        tone: "success",
        text: row.isActive ? "Annonce désactivée." : "Annonce activée.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier cette annonce.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: AnnouncementRow) {
    try {
      setBusyId(row.id);
      await deleteAnnouncement(row);

      setAnnouncements((prev) => prev.filter((item) => item.id !== row.id));

      if (form.id === row.id) {
        resetForm();
      }

      setFlash({
        tone: "success",
        text: "Annonce supprimée.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de supprimer cette annonce.",
      });
    } finally {
      setBusyId(null);
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
            Admin Announcements
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="w-full max-w-md rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-8 text-center">
          <div className="text-lg font-black text-white">Accès admin refusé</div>
          <div className="mt-2 text-sm text-white/56">
            Recharge la page ou reconnecte-toi.
          </div>
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
              onClick={() => void loadPage(false)}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    Messages & communication
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Annonces
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Total <span className="font-black text-white">{announcements.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Actives <span className="font-black text-white">{activeCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <Megaphone className="h-3.5 w-3.5" />
                      annonces
                    </Tag>
                    <Tag tone="violet">
                      <Bell className="h-3.5 w-3.5" />
                      audience
                    </Tag>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setFlash(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvelle annonce
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadPage(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total annonces"
                value={announcements.length}
                icon={<Megaphone className="h-4 w-4" />}
              />
              <StatCard
                label="Actives"
                value={activeCount}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Inactives"
                value={announcements.length - activeCount}
                icon={<X className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Audiences"
                value={audienceCount}
                icon={<Bell className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={form.id ? "Éditer annonce" : "Créer annonce"} right={<Tag>{form.id ? "édition" : "création"}</Tag>}>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Titre
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Ex: Maintenance prévue ce soir"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Audience
                    </label>
                    <input
                      value={form.audience}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          audience: e.target.value,
                        }))
                      }
                      placeholder="all / vip / members / admins"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Message
                    </label>
                    <textarea
                      value={form.body}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      rows={8}
                      placeholder="Contenu de l’annonce..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isActive
                          ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isActive ? "Annonce active" : "Annonce inactive"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition disabled:opacity-60"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {form.id ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </Panel>

              <Panel title="Liste des annonces" right={<Tag>{filteredRows.length} affichées</Tag>}>
                <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Titre, message, audience..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Toutes" },
                      { key: "active", label: "Actives" },
                      { key: "inactive", label: "Inactives" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key as FilterValue)}
                        className={cx(
                          "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                          filter === item.key
                            ? "border-red-400/18 bg-red-500/10 text-red-100"
                            : "border-white/10 bg-white/[0.04] text-white/70"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRows.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucune annonce trouvée avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredRows.map((row) => {
                      const busy = busyId === row.id;

                      return (
                        <div
                          key={`${row.table}-${row.id}`}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xl font-black tracking-[-0.02em] text-white">
                                {row.title}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {row.isActive ? (
                                  <Tag tone="green">
                                    <Check className="h-3.5 w-3.5" />
                                    active
                                  </Tag>
                                ) : (
                                  <Tag>inactive</Tag>
                                )}

                                <Tag tone="violet">{row.audience}</Tag>
                              </div>

                              <div className="mt-3 text-sm leading-6 text-white/58">
                                {row.body}
                              </div>

                              <div className="mt-3 text-xs text-white/42">
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString()
                                  : "Date inconnue"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Sparkles className="h-4 w-4" />
                              Éditer
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleToggle(row)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                row.isActive
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                              )}
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : row.isActive ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {row.isActive ? "Désactiver" : "Activer"}
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push("/dashboard")}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                            >
                              <Eye className="h-4 w-4" />
                              Voir site
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-60"
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
