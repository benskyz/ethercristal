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
  Crown,
  Eye,
  Flame,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Video,
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

type SalonRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isLive: boolean;
  isVip: boolean;
  membersCount: number;
  schema: "snake" | "camel";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "live" | "vip" | "offline";

type SalonForm = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  isLive: boolean;
  isVip: boolean;
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

async function loadSalonsCompat(): Promise<SalonRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase
    .from("rooms")
    .select("id, slug, name, description, is_live, is_vip, members_count")
    .order("name", { ascending: true });

  if (!snake.error) {
    return ((snake.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      slug: sanitizeText(row.slug, ""),
      name: sanitizeText(row.name, "Salon"),
      description: sanitizeText(row.description, ""),
      isLive: Boolean(row.is_live),
      isVip: Boolean(row.is_vip),
      membersCount: Number(row.members_count ?? 0),
      schema: "snake" as const,
    }));
  }

  if (snake.error && !isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("rooms")
    .select('id, slug, title, description, "isLive", "isVip", "membersCount"')
    .order("title", { ascending: true });

  if (!camel.error) {
    return ((camel.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      slug: sanitizeText(row.slug, ""),
      name: sanitizeText(row.title, "Salon"),
      description: sanitizeText(row.description, ""),
      isLive: Boolean(row.isLive),
      isVip: Boolean(row.isVip),
      membersCount: Number(row.membersCount ?? 0),
      schema: "camel" as const,
    }));
  }

  if (camel.error) {
    throw camel.error;
  }

  return [];
}

async function createSalon(payload: SalonForm) {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase.from("rooms").insert({
    slug: payload.slug,
    name: payload.name,
    description: payload.description,
    is_live: payload.isLive,
    is_vip: payload.isVip,
    members_count: 0,
  });

  if (!snake.error) return;

  if (!isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase.from("rooms").insert({
    slug: payload.slug,
    title: payload.name,
    description: payload.description,
    isLive: payload.isLive,
    isVip: payload.isVip,
    membersCount: 0,
  });

  if (camel.error) throw camel.error;
}

async function updateSalon(payload: SalonForm, schema: "snake" | "camel") {
  const supabase = requireSupabaseBrowserClient();

  if (!payload.id) throw new Error("ID salon manquant.");

  if (schema === "snake") {
    const res = await supabase
      .from("rooms")
      .update({
        slug: payload.slug,
        name: payload.name,
        description: payload.description,
        is_live: payload.isLive,
        is_vip: payload.isVip,
      })
      .eq("id", payload.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from("rooms")
    .update({
      slug: payload.slug,
      title: payload.name,
      description: payload.description,
      isLive: payload.isLive,
      isVip: payload.isVip,
    })
    .eq("id", payload.id);

  if (res.error) throw res.error;
}

async function toggleSalonLive(room: SalonRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (room.schema === "snake") {
    const res = await supabase
      .from("rooms")
      .update({ is_live: nextValue })
      .eq("id", room.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from("rooms")
    .update({ isLive: nextValue })
    .eq("id", room.id);

  if (res.error) throw res.error;
}

async function deleteSalon(room: SalonRow) {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase.from("rooms").delete().eq("id", room.id);
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

export default function AdminSalonsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [salons, setSalons] = useState<SalonRow[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSchema, setEditingSchema] = useState<"snake" | "camel">("snake");
  const [form, setForm] = useState<SalonForm>({
    id: null,
    slug: "",
    name: "",
    description: "",
    isLive: false,
    isVip: false,
  });

  const filteredSalons = useMemo(() => {
    const q = search.trim().toLowerCase();

    return salons.filter((room) => {
      if (filter === "live" && !room.isLive) return false;
      if (filter === "vip" && !room.isVip) return false;
      if (filter === "offline" && room.isLive) return false;

      if (!q) return true;

      return (
        room.name.toLowerCase().includes(q) ||
        room.slug.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q)
      );
    });
  }, [salons, search, filter]);

  const totalLive = useMemo(() => salons.filter((s) => s.isLive).length, [salons]);
  const totalVip = useMemo(() => salons.filter((s) => s.isVip).length, [salons]);
  const totalMembers = useMemo(
    () => salons.reduce((sum, s) => sum + Number(s.membersCount || 0), 0),
    [salons]
  );

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      slug: "",
      name: "",
      description: "",
      isLive: false,
      isVip: false,
    });
    setEditingSchema("snake");
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

        const roomRows = await loadSalonsCompat();

        setAdminProfile(nextAdmin);
        setSalons(roomRows);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les salons.",
        });
        console.error("Admin salons error:", e);
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

  function startEdit(room: SalonRow) {
    setEditingSchema(room.schema);
    setForm({
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isLive: room.isLive,
      isVip: room.isVip,
    });
  }

  async function handleSaveSalon() {
    try {
      setSaving(true);

      const cleanName = form.name.trim();
      const cleanSlug = slugify(form.slug || form.name);
      const cleanDescription = form.description.trim();

      if (!cleanName) {
        throw new Error("Le nom du salon est obligatoire.");
      }

      if (!cleanSlug) {
        throw new Error("Le slug du salon est obligatoire.");
      }

      const payload: SalonForm = {
        ...form,
        name: cleanName,
        slug: cleanSlug,
        description: cleanDescription,
      };

      if (payload.id) {
        await updateSalon(payload, editingSchema);
        setFlash({
          tone: "success",
          text: "Salon mis à jour.",
        });
      } else {
        await createSalon(payload);
        setFlash({
          tone: "success",
          text: "Salon créé.",
        });
      }

      resetForm();
      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer ce salon.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLive(room: SalonRow) {
    try {
      setBusyId(room.id);
      await toggleSalonLive(room, !room.isLive);

      setSalons((prev) =>
        prev.map((row) =>
          row.id === room.id ? { ...row, isLive: !row.isLive } : row
        )
      );

      setFlash({
        tone: "success",
        text: `Salon ${!room.isLive ? "activé" : "désactivé"}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier ce salon.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(room: SalonRow) {
    try {
      setBusyId(room.id);
      await deleteSalon(room);

      setSalons((prev) => prev.filter((row) => row.id !== room.id));

      if (form.id === room.id) {
        resetForm();
      }

      setFlash({
        tone: "success",
        text: "Salon supprimé.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de supprimer ce salon.",
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
            Admin Salons
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
                    Gestion live
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Salons
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Salons <span className="font-black text-white">{salons.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Live <span className="font-black text-white">{totalLive}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="violet">
                      <Video className="h-3.5 w-3.5" />
                      rooms webcam
                    </Tag>
                    <Tag tone="gold">
                      <Crown className="h-3.5 w-3.5" />
                      accès vip
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
                    Nouveau salon
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
                label="Total salons"
                value={salons.length}
                icon={<Video className="h-4 w-4" />}
              />
              <StatCard
                label="En direct"
                value={totalLive}
                icon={<Flame className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="VIP"
                value={totalVip}
                icon={<Crown className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Membres présents"
                value={totalMembers}
                icon={<Users className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={form.id ? "Éditer salon" : "Créer salon"} right={<Tag>{form.id ? "édition" : "création"}</Tag>}>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Nom
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                          slug: prev.id ? prev.slug : slugify(e.target.value),
                        }))
                      }
                      placeholder="Ex: Salon Obsidienne"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Slug
                    </label>
                    <input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          slug: slugify(e.target.value),
                        }))
                      }
                      placeholder="salon-obsidienne"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Décris l’ambiance du salon, son accès, son style..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isLive: !prev.isLive,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isLive
                          ? "border-red-400/18 bg-red-500/10 text-red-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isLive ? "Live activé" : "Live désactivé"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isVip: !prev.isVip,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isVip
                          ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isVip ? "Accès VIP" : "Accès standard"}
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveSalon()}
                      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {form.id ? "Mettre à jour" : "Créer"}
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
                </div>
              </Panel>

              <Panel title="Liste salons" right={<Tag>{filteredSalons.length} affichés</Tag>}>
                <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nom, slug, description..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "live", label: "Live" },
                      { key: "vip", label: "VIP" },
                      { key: "offline", label: "Offline" },
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

                {filteredSalons.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun salon trouvé avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredSalons.map((room) => {
                      const isBusy = busyId === room.id;

                      return (
                        <div
                          key={room.id}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xl font-black tracking-[-0.02em] text-white">
                                {room.name}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/58">
                                <span>/{room.slug}</span>
                                <span className="text-white/20">•</span>
                                <span>
                                  Membres <span className="font-black text-white">{room.membersCount}</span>
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {room.isLive ? (
                                  <Tag tone="red">
                                    <Flame className="h-3.5 w-3.5" />
                                    live
                                  </Tag>
                                ) : (
                                  <Tag>offline</Tag>
                                )}

                                {room.isVip ? (
                                  <Tag tone="gold">
                                    <Crown className="h-3.5 w-3.5" />
                                    vip
                                  </Tag>
                                ) : null}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => router.push(`/salons/${room.id}`)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 rounded-[18px] border border-red-500/10 bg-[#0f0f14] p-4 text-sm leading-6 text-white/62">
                            {room.description || "Aucune description pour ce salon."}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => startEdit(room)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Sparkles className="h-4 w-4" />
                              Éditer
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleLive(room)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                room.isLive
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                              )}
                            >
                              {isBusy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : room.isLive ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {room.isLive ? "Stop live" : "Passer live"}
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push(`/admin/members?room=${room.id}`)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                            >
                              <Users className="h-4 w-4" />
                              Membres
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDelete(room)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-60"
                            >
                              {isBusy ? (
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
