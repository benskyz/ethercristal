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
  Globe,
  Lock,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
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

type SettingRow = {
  id: string;
  settingKey: string;
  settingValue: string;
  settingType: string;
  isPublic: boolean;
  updatedAt: string | null;
  schema: "snake" | "camel";
  table: "site_settings" | "app_settings";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "public" | "private";

type SettingForm = {
  id: string | null;
  settingKey: string;
  settingValue: string;
  settingType: string;
  isPublic: boolean;
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
    .slice(0, 100);
}

function isSchemaMismatch(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01";
}

function dbValueToString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formValueToDbValue(type: string, raw: string) {
  const normalizedType = sanitizeText(type, "string").toLowerCase();
  const trimmed = raw.trim();

  if (normalizedType === "number") {
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error("La valeur numérique est invalide.");
    }
    return parsed;
  }

  if (normalizedType === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    throw new Error('Pour un booléen, utilise "true" ou "false".');
  }

  if (normalizedType === "json") {
    try {
      return JSON.parse(trimmed || "{}");
    } catch {
      throw new Error("Le JSON est invalide.");
    }
  }

  return raw;
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

async function loadSettingsCompat(): Promise<SettingRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const attempts = [
    {
      table: "site_settings" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("site_settings")
          .select("id, setting_key, setting_value, setting_type, is_public, updated_at")
          .order("setting_key", { ascending: true }),
      map: (row: any): SettingRow => ({
        id: String(row.id),
        settingKey: sanitizeText(row.setting_key, ""),
        settingValue: dbValueToString(row.setting_value),
        settingType: sanitizeText(row.setting_type, "string"),
        isPublic: Boolean(row.is_public),
        updatedAt: row.updated_at || null,
        schema: "snake",
        table: "site_settings",
      }),
    },
    {
      table: "site_settings" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("site_settings")
          .select('id, "settingKey", "settingValue", "settingType", "isPublic", "updatedAt"')
          .order("settingKey", { ascending: true }),
      map: (row: any): SettingRow => ({
        id: String(row.id),
        settingKey: sanitizeText(row.settingKey, ""),
        settingValue: dbValueToString(row.settingValue),
        settingType: sanitizeText(row.settingType, "string"),
        isPublic: Boolean(row.isPublic),
        updatedAt: row.updatedAt || null,
        schema: "camel",
        table: "site_settings",
      }),
    },
    {
      table: "app_settings" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("app_settings")
          .select("id, setting_key, setting_value, setting_type, is_public, updated_at")
          .order("setting_key", { ascending: true }),
      map: (row: any): SettingRow => ({
        id: String(row.id),
        settingKey: sanitizeText(row.setting_key, ""),
        settingValue: dbValueToString(row.setting_value),
        settingType: sanitizeText(row.setting_type, "string"),
        isPublic: Boolean(row.is_public),
        updatedAt: row.updated_at || null,
        schema: "snake",
        table: "app_settings",
      }),
    },
    {
      table: "app_settings" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("app_settings")
          .select('id, "settingKey", "settingValue", "settingType", "isPublic", "updatedAt"')
          .order("settingKey", { ascending: true }),
      map: (row: any): SettingRow => ({
        id: String(row.id),
        settingKey: sanitizeText(row.settingKey, ""),
        settingValue: dbValueToString(row.settingValue),
        settingType: sanitizeText(row.settingType, "string"),
        isPublic: Boolean(row.isPublic),
        updatedAt: row.updatedAt || null,
        schema: "camel",
        table: "app_settings",
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

async function createSetting(
  payload: SettingForm,
  target: { table: "site_settings" | "app_settings"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();
  const dbValue = formValueToDbValue(payload.settingType, payload.settingValue);

  if (target.schema === "snake") {
    const res = await supabase.from(target.table).insert({
      setting_key: payload.settingKey,
      setting_value: dbValue,
      setting_type: payload.settingType,
      is_public: payload.isPublic,
    });

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase.from(target.table).insert({
    settingKey: payload.settingKey,
    settingValue: dbValue,
    settingType: payload.settingType,
    isPublic: payload.isPublic,
  });

  if (res.error) throw res.error;
}

async function updateSetting(
  payload: SettingForm,
  target: { table: "site_settings" | "app_settings"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();
  if (!payload.id) throw new Error("ID setting manquant.");

  const dbValue = formValueToDbValue(payload.settingType, payload.settingValue);

  if (target.schema === "snake") {
    const res = await supabase
      .from(target.table)
      .update({
        setting_key: payload.settingKey,
        setting_value: dbValue,
        setting_type: payload.settingType,
        is_public: payload.isPublic,
      })
      .eq("id", payload.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(target.table)
    .update({
      settingKey: payload.settingKey,
      settingValue: dbValue,
      settingType: payload.settingType,
      isPublic: payload.isPublic,
    })
    .eq("id", payload.id);

  if (res.error) throw res.error;
}

async function toggleSettingPublic(row: SettingRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (row.schema === "snake") {
    const res = await supabase
      .from(row.table)
      .update({ is_public: nextValue })
      .eq("id", row.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(row.table)
    .update({ isPublic: nextValue })
    .eq("id", row.id);

  if (res.error) throw res.error;
}

async function deleteSetting(row: SettingRow) {
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

export default function AdminSettingsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [settingsRows, setSettingsRows] = useState<SettingRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [targetTable, setTargetTable] = useState<"site_settings" | "app_settings">(
    "site_settings"
  );
  const [targetSchema, setTargetSchema] = useState<"snake" | "camel">("snake");
  const [form, setForm] = useState<SettingForm>({
    id: null,
    settingKey: "",
    settingValue: "",
    settingType: "string",
    isPublic: false,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return settingsRows.filter((row) => {
      if (filter === "public" && !row.isPublic) return false;
      if (filter === "private" && row.isPublic) return false;

      if (!q) return true;

      return (
        row.settingKey.toLowerCase().includes(q) ||
        row.settingValue.toLowerCase().includes(q) ||
        row.settingType.toLowerCase().includes(q)
      );
    });
  }, [settingsRows, search, filter]);

  const publicCount = useMemo(
    () => settingsRows.filter((row) => row.isPublic).length,
    [settingsRows]
  );

  const privateCount = useMemo(
    () => settingsRows.filter((row) => !row.isPublic).length,
    [settingsRows]
  );

  const typeCount = useMemo(() => {
    return new Set(settingsRows.map((row) => row.settingType)).size;
  }, [settingsRows]);

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      settingKey: "",
      settingValue: "",
      settingType: "string",
      isPublic: false,
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

        const rows = await loadSettingsCompat();

        setAdminProfile(nextAdmin);
        setSettingsRows(rows);

        if (rows.length > 0) {
          setTargetTable(rows[0].table);
          setTargetSchema(rows[0].schema);
        }
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les réglages.",
        });
        console.error("Admin settings error:", e);
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

  function startEdit(row: SettingRow) {
    setTargetTable(row.table);
    setTargetSchema(row.schema);
    setForm({
      id: row.id,
      settingKey: row.settingKey,
      settingValue: row.settingValue,
      settingType: row.settingType || "string",
      isPublic: row.isPublic,
    });
  }

  async function handleSave() {
    try {
      setSaving(true);

      const settingKey = slugify(form.settingKey);
      const settingType = sanitizeText(form.settingType, "string").toLowerCase();
      const settingValue = form.settingValue;

      if (!settingKey) {
        throw new Error("La clé du réglage est obligatoire.");
      }

      if (!settingType) {
        throw new Error("Le type du réglage est obligatoire.");
      }

      const payload: SettingForm = {
        ...form,
        settingKey,
        settingType,
        settingValue,
      };

      if (payload.id) {
        await updateSetting(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Réglage mis à jour.",
        });
      } else {
        await createSetting(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Réglage créé.",
        });
      }

      resetForm();
      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer ce réglage.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublic(row: SettingRow) {
    try {
      setBusyId(row.id);
      await toggleSettingPublic(row, !row.isPublic);

      setSettingsRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, isPublic: !row.isPublic } : item
        )
      );

      setFlash({
        tone: "success",
        text: row.isPublic
          ? "Réglage passé en privé."
          : "Réglage rendu public.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier la visibilité.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: SettingRow) {
    try {
      setBusyId(row.id);
      await deleteSetting(row);

      setSettingsRows((prev) => prev.filter((item) => item.id !== row.id));

      if (form.id === row.id) {
        resetForm();
      }

      setFlash({
        tone: "success",
        text: "Réglage supprimé.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de supprimer ce réglage.",
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
            Admin Settings
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
                    Configuration globale
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Settings
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Total <span className="font-black text-white">{settingsRows.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Publics <span className="font-black text-white">{publicCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <Settings2 className="h-3.5 w-3.5" />
                      config
                    </Tag>
                    <Tag tone="violet">
                      <Shield className="h-3.5 w-3.5" />
                      admin
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
                    Nouveau réglage
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
                label="Total réglages"
                value={settingsRows.length}
                icon={<Settings2 className="h-4 w-4" />}
              />
              <StatCard
                label="Publics"
                value={publicCount}
                icon={<Globe className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Privés"
                value={privateCount}
                icon={<Lock className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Types"
                value={typeCount}
                icon={<Sparkles className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={form.id ? "Éditer réglage" : "Créer réglage"} right={<Tag>{form.id ? "édition" : "création"}</Tag>}>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Clé
                    </label>
                    <input
                      value={form.settingKey}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          settingKey: e.target.value,
                        }))
                      }
                      placeholder="maintenance_mode"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Type
                    </label>
                    <input
                      value={form.settingType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          settingType: e.target.value,
                        }))
                      }
                      placeholder="string / boolean / number / json"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Valeur
                    </label>
                    <textarea
                      value={form.settingValue}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          settingValue: e.target.value,
                        }))
                      }
                      rows={8}
                      placeholder='Ex: true, 25, {"mode":"soft"}, "EtherCristal"'
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isPublic: !prev.isPublic,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isPublic
                          ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isPublic ? "Réglage public" : "Réglage privé"}
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

              <Panel title="Réglages du site" right={<Tag>{filteredRows.length} affichés</Tag>}>
                <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Clé, valeur, type..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "public", label: "Publics" },
                      { key: "private", label: "Privés" },
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
                    Aucun réglage trouvé avec ce filtre.
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
                                {row.settingKey}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {row.isPublic ? (
                                  <Tag tone="green">
                                    <Globe className="h-3.5 w-3.5" />
                                    public
                                  </Tag>
                                ) : (
                                  <Tag tone="red">
                                    <Lock className="h-3.5 w-3.5" />
                                    privé
                                  </Tag>
                                )}

                                <Tag tone="violet">{row.settingType}</Tag>
                                <Tag>{row.table}</Tag>
                              </div>

                              <div className="mt-4 rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                                  Valeur
                                </div>
                                <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/62">
                                  {row.settingValue || "Valeur vide"}
                                </pre>
                              </div>

                              <div className="mt-3 text-xs text-white/42">
                                {row.updatedAt
                                  ? `Mis à jour : ${new Date(row.updatedAt).toLocaleString()}`
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
                              onClick={() => void handleTogglePublic(row)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                row.isPublic
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                              )}
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : row.isPublic ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              {row.isPublic ? "Rendre privé" : "Rendre public"}
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push("/admin/system")}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                            >
                              <Settings2 className="h-4 w-4" />
                              Voir système
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
                                <X className="h-4 w-4" />
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
