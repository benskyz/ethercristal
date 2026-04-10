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
  Check,
  Eye,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Type,
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

type ContentRow = {
  id: string;
  contentKey: string;
  title: string;
  body: string;
  section: string;
  isPublished: boolean;
  schema: "snake" | "camel";
  table: "content_blocks" | "site_content";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "published" | "draft";

type ContentForm = {
  id: string | null;
  contentKey: string;
  title: string;
  body: string;
  section: string;
  isPublished: boolean;
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

async function loadContentCompat(): Promise<ContentRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const attempts = [
    {
      table: "content_blocks" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("content_blocks")
          .select("id, content_key, title, body, section, is_published")
          .order("section", { ascending: true }),
      map: (row: any): ContentRow => ({
        id: String(row.id),
        contentKey: sanitizeText(row.content_key, ""),
        title: sanitizeText(row.title, "Bloc"),
        body: sanitizeText(row.body, ""),
        section: sanitizeText(row.section, "general"),
        isPublished: Boolean(row.is_published),
        schema: "snake",
        table: "content_blocks",
      }),
    },
    {
      table: "content_blocks" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("content_blocks")
          .select('id, "contentKey", title, body, section, "isPublished"')
          .order("section", { ascending: true }),
      map: (row: any): ContentRow => ({
        id: String(row.id),
        contentKey: sanitizeText(row.contentKey, ""),
        title: sanitizeText(row.title, "Bloc"),
        body: sanitizeText(row.body, ""),
        section: sanitizeText(row.section, "general"),
        isPublished: Boolean(row.isPublished),
        schema: "camel",
        table: "content_blocks",
      }),
    },
    {
      table: "site_content" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("site_content")
          .select("id, content_key, title, body, section, is_published")
          .order("section", { ascending: true }),
      map: (row: any): ContentRow => ({
        id: String(row.id),
        contentKey: sanitizeText(row.content_key, ""),
        title: sanitizeText(row.title, "Bloc"),
        body: sanitizeText(row.body, ""),
        section: sanitizeText(row.section, "general"),
        isPublished: Boolean(row.is_published),
        schema: "snake",
        table: "site_content",
      }),
    },
    {
      table: "site_content" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("site_content")
          .select('id, "contentKey", title, body, section, "isPublished"')
          .order("section", { ascending: true }),
      map: (row: any): ContentRow => ({
        id: String(row.id),
        contentKey: sanitizeText(row.contentKey, ""),
        title: sanitizeText(row.title, "Bloc"),
        body: sanitizeText(row.body, ""),
        section: sanitizeText(row.section, "general"),
        isPublished: Boolean(row.isPublished),
        schema: "camel",
        table: "site_content",
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

async function createContentEntry(
  payload: ContentForm,
  target: { table: "content_blocks" | "site_content"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();

  if (target.schema === "snake") {
    const res = await supabase.from(target.table).insert({
      content_key: payload.contentKey,
      title: payload.title,
      body: payload.body,
      section: payload.section,
      is_published: payload.isPublished,
    });

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase.from(target.table).insert({
    contentKey: payload.contentKey,
    title: payload.title,
    body: payload.body,
    section: payload.section,
    isPublished: payload.isPublished,
  });

  if (res.error) throw res.error;
}

async function updateContentEntry(
  payload: ContentForm,
  target: { table: "content_blocks" | "site_content"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();

  if (!payload.id) throw new Error("ID contenu manquant.");

  if (target.schema === "snake") {
    const res = await supabase
      .from(target.table)
      .update({
        content_key: payload.contentKey,
        title: payload.title,
        body: payload.body,
        section: payload.section,
        is_published: payload.isPublished,
      })
      .eq("id", payload.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(target.table)
    .update({
      contentKey: payload.contentKey,
      title: payload.title,
      body: payload.body,
      section: payload.section,
      isPublished: payload.isPublished,
    })
    .eq("id", payload.id);

  if (res.error) throw res.error;
}

async function toggleContentPublish(row: ContentRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (row.schema === "snake") {
    const res = await supabase
      .from(row.table)
      .update({ is_published: nextValue })
      .eq("id", row.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(row.table)
    .update({ isPublished: nextValue })
    .eq("id", row.id);

  if (res.error) throw res.error;
}

async function deleteContentEntry(row: ContentRow) {
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

export default function AdminContentPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [entries, setEntries] = useState<ContentRow[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [targetTable, setTargetTable] = useState<"content_blocks" | "site_content">(
    "content_blocks"
  );
  const [targetSchema, setTargetSchema] = useState<"snake" | "camel">("snake");
  const [form, setForm] = useState<ContentForm>({
    id: null,
    contentKey: "",
    title: "",
    body: "",
    section: "general",
    isPublished: true,
  });

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (filter === "published" && !entry.isPublished) return false;
      if (filter === "draft" && entry.isPublished) return false;

      if (!q) return true;

      return (
        entry.title.toLowerCase().includes(q) ||
        entry.contentKey.toLowerCase().includes(q) ||
        entry.section.toLowerCase().includes(q) ||
        entry.body.toLowerCase().includes(q)
      );
    });
  }, [entries, search, filter]);

  const totalPublished = useMemo(
    () => entries.filter((entry) => entry.isPublished).length,
    [entries]
  );

  const uniqueSections = useMemo(() => {
    return new Set(entries.map((entry) => entry.section)).size;
  }, [entries]);

  const averageLength = useMemo(() => {
    if (!entries.length) return 0;
    return Math.round(
      entries.reduce((sum, entry) => sum + entry.body.length, 0) / entries.length
    );
  }, [entries]);

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      contentKey: "",
      title: "",
      body: "",
      section: "general",
      isPublished: true,
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

        const rows = await loadContentCompat();

        setAdminProfile(nextAdmin);
        setEntries(rows);

        if (rows.length > 0) {
          setTargetTable(rows[0].table);
          setTargetSchema(rows[0].schema);
        }
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger le contenu.",
        });
        console.error("Admin content error:", e);
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

  function startEdit(entry: ContentRow) {
    setTargetTable(entry.table);
    setTargetSchema(entry.schema);
    setForm({
      id: entry.id,
      contentKey: entry.contentKey,
      title: entry.title,
      body: entry.body,
      section: entry.section,
      isPublished: entry.isPublished,
    });
  }

  async function handleSave() {
    try {
      setSaving(true);

      const cleanTitle = form.title.trim();
      const cleanKey = slugify(form.contentKey || form.title);
      const cleanBody = form.body.trim();
      const cleanSection = slugify(form.section || "general");

      if (!cleanTitle) {
        throw new Error("Le titre du contenu est obligatoire.");
      }

      if (!cleanKey) {
        throw new Error("La clé du contenu est obligatoire.");
      }

      if (!cleanBody) {
        throw new Error("Le contenu ne peut pas être vide.");
      }

      const payload: ContentForm = {
        ...form,
        title: cleanTitle,
        contentKey: cleanKey,
        body: cleanBody,
        section: cleanSection,
      };

      if (payload.id) {
        await updateContentEntry(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Contenu mis à jour.",
        });
      } else {
        await createContentEntry(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Contenu créé.",
        });
      }

      resetForm();
      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer ce contenu.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(entry: ContentRow) {
    try {
      setBusyId(entry.id);
      await toggleContentPublish(entry, !entry.isPublished);

      setEntries((prev) =>
        prev.map((row) =>
          row.id === entry.id ? { ...row, isPublished: !row.isPublished } : row
        )
      );

      setFlash({
        tone: "success",
        text: `Contenu ${!entry.isPublished ? "publié" : "passé en brouillon"}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier ce contenu.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(entry: ContentRow) {
    try {
      setBusyId(entry.id);
      await deleteContentEntry(entry);

      setEntries((prev) => prev.filter((row) => row.id !== entry.id));

      if (form.id === entry.id) {
        resetForm();
      }

      setFlash({
        tone: "success",
        text: "Contenu supprimé.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de supprimer ce contenu.",
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
            Admin Content
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
                    Textes & blocs
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Contenu
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Blocs <span className="font-black text-white">{entries.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Publiés <span className="font-black text-white">{totalPublished}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <FileText className="h-3.5 w-3.5" />
                      éditorial
                    </Tag>
                    <Tag tone="violet">
                      <Type className="h-3.5 w-3.5" />
                      sections
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
                    Nouveau bloc
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
                label="Total blocs"
                value={entries.length}
                icon={<FileText className="h-4 w-4" />}
              />
              <StatCard
                label="Publiés"
                value={totalPublished}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Sections"
                value={uniqueSections}
                icon={<TagIcon className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Longueur moyenne"
                value={averageLength}
                icon={<Type className="h-4 w-4" />}
                tone="gold"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={form.id ? "Éditer contenu" : "Créer contenu"} right={<Tag>{form.id ? "édition" : "création"}</Tag>}>
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
                          contentKey: prev.id ? prev.contentKey : slugify(e.target.value),
                        }))
                      }
                      placeholder="Ex: Hero Enter Page"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Clé contenu
                    </label>
                    <input
                      value={form.contentKey}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          contentKey: slugify(e.target.value),
                        }))
                      }
                      placeholder="hero_enter_page"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Section
                    </label>
                    <input
                      value={form.section}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          section: e.target.value,
                        }))
                      }
                      placeholder="homepage"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Contenu
                    </label>
                    <textarea
                      value={form.body}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      rows={10}
                      placeholder="Texte, description, message d’accueil, contenu de bloc..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isPublished: !prev.isPublished,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isPublished
                          ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isPublished ? "Publié" : "Brouillon"}
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

              <Panel title="Blocs de contenu" right={<Tag>{filteredEntries.length} affichés</Tag>}>
                <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Titre, clé, section, texte..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "published", label: "Publiés" },
                      { key: "draft", label: "Brouillons" },
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

                {filteredEntries.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun contenu trouvé avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredEntries.map((entry) => {
                      const busy = busyId === entry.id;

                      return (
                        <div
                          key={`${entry.table}-${entry.id}`}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xl font-black tracking-[-0.02em] text-white">
                                {entry.title}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {entry.isPublished ? (
                                  <Tag tone="green">
                                    <Check className="h-3.5 w-3.5" />
                                    publié
                                  </Tag>
                                ) : (
                                  <Tag>brouillon</Tag>
                                )}

                                <Tag tone="violet">
                                  <TagIcon className="h-3.5 w-3.5" />
                                  {entry.section}
                                </Tag>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/58">
                                <span>
                                  Clé <span className="font-black text-white">{entry.contentKey}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-[18px] border border-red-500/10 bg-[#0f0f14] p-4 text-sm leading-6 text-white/62">
                            {entry.body.length > 280
                              ? `${entry.body.slice(0, 280)}...`
                              : entry.body}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => startEdit(entry)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Sparkles className="h-4 w-4" />
                              Éditer
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleTogglePublish(entry)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                entry.isPublished
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                              )}
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : entry.isPublished ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {entry.isPublished ? "Dépublier" : "Publier"}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(entry)}
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

            <Panel title="Accès rapides" right={<Tag tone="gold">admin</Tag>}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="font-black uppercase tracking-[0.14em]">Dashboard</span>
                  </div>
                  <div className="text-sm text-white/58">Retour au menu admin principal.</div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/shop")}
                  className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-black uppercase tracking-[0.14em]">Boutique</span>
                  </div>
                  <div className="text-sm text-white/58">Gérer les items et effets.</div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/subscriptions")}
                  className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <Shield className="h-4 w-4" />
                    <span className="font-black uppercase tracking-[0.14em]">VIP</span>
                  </div>
                  <div className="text-sm text-white/58">Gérer les plans d’abonnement.</div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="font-black uppercase tracking-[0.14em]">Site</span>
                  </div>
                  <div className="text-sm text-white/58">Retour au dashboard utilisateur.</div>
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
