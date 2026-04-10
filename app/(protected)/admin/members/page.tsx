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
  Crown,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  Copy,
  Check,
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

type MemberRow = {
  id: string;
  pseudo: string;
  credits: number;
  isVip: boolean;
  isAdmin: boolean;
  vipExpiresAt: string | null;
  role: string;
  masterTitle: string;
  schema: "snake" | "camel";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "vip" | "admin" | "standard";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function isSchemaMismatch(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01";
}

function isVipActive(profile?: AdminProfile | null) {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  if (profile.isVip) return true;
  if (!profile.vipExpiresAt) return false;
  const d = new Date(profile.vipExpiresAt);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
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

async function loadMembersCompat(): Promise<MemberRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase
    .from("profiles")
    .select(
      "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title"
    )
    .limit(300);

  if (!snake.error) {
    return ((snake.data ?? []) as any[]).map((row) => ({
      id: row.id,
      pseudo: sanitizeText(row.pseudo, "Membre Ether"),
      credits: Number(row.credits ?? 0),
      isVip: Boolean(row.is_vip),
      isAdmin: Boolean(row.is_admin),
      vipExpiresAt: row.vip_expires_at ?? null,
      role: sanitizeText(row.role, "member"),
      masterTitle: sanitizeText(row.master_title, "Aucun titre"),
      schema: "snake" as const,
    }));
  }

  if (snake.error && !isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("profiles")
    .select(
      'id, username, "etherBalance", "isPremium", "isAdmin", "premiumExpiresAt", role, "masterTitle"'
    )
    .limit(300);

  if (!camel.error) {
    return ((camel.data ?? []) as any[]).map((row) => ({
      id: row.id,
      pseudo: sanitizeText(row.username, "Membre Ether"),
      credits: Number(row.etherBalance ?? 0),
      isVip: Boolean(row.isPremium),
      isAdmin: Boolean(row.isAdmin),
      vipExpiresAt: row.premiumExpiresAt ?? null,
      role: sanitizeText(row.role, "member"),
      masterTitle: sanitizeText(row.masterTitle, "Aucun titre"),
      schema: "camel" as const,
    }));
  }

  if (camel.error) {
    throw camel.error;
  }

  return [];
}

async function updateMemberVip(member: MemberRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (member.schema === "snake") {
    const res = await supabase
      .from("profiles")
      .update({ is_vip: nextValue })
      .eq("id", member.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from("profiles")
    .update({ isPremium: nextValue })
    .eq("id", member.id);

  if (res.error) throw res.error;
}

async function updateMemberAdmin(member: MemberRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (member.schema === "snake") {
    const res = await supabase
      .from("profiles")
      .update({ is_admin: nextValue })
      .eq("id", member.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from("profiles")
    .update({ isAdmin: nextValue })
    .eq("id", member.id);

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

export default function AdminMembersPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return members
      .filter((member) => {
        if (filter === "vip" && !member.isVip) return false;
        if (filter === "admin" && !member.isAdmin) return false;
        if (filter === "standard" && (member.isVip || member.isAdmin)) return false;

        if (!q) return true;

        return (
          member.pseudo.toLowerCase().includes(q) ||
          member.role.toLowerCase().includes(q) ||
          member.masterTitle.toLowerCase().includes(q) ||
          member.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.pseudo.localeCompare(b.pseudo));
  }, [members, search, filter]);

  const totalVip = useMemo(
    () => members.filter((m) => m.isVip).length,
    [members]
  );
  const totalAdmin = useMemo(
    () => members.filter((m) => m.isAdmin).length,
    [members]
  );
  const totalStandard = useMemo(
    () => members.filter((m) => !m.isVip && !m.isAdmin).length,
    [members]
  );

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

        const memberRows = await loadMembersCompat();

        setAdminProfile(nextAdmin);
        setMembers(memberRows);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les membres.",
        });
        console.error("Admin members error:", e);
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

  async function handleToggleVip(member: MemberRow) {
    try {
      setBusyId(member.id);
      await updateMemberVip(member, !member.isVip);

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, isVip: !row.isVip } : row
        )
      );

      setFlash({
        tone: "success",
        text: `VIP ${!member.isVip ? "activé" : "retiré"} pour ${member.pseudo}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier le statut VIP.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleAdmin(member: MemberRow) {
    try {
      setBusyId(member.id);
      await updateMemberAdmin(member, !member.isAdmin);

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, isAdmin: !row.isAdmin } : row
        )
      );

      setFlash({
        tone: "success",
        text: `Accès admin ${!member.isAdmin ? "accordé" : "retiré"} à ${member.pseudo}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier le rôle admin.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setFlash({
        tone: "success",
        text: "ID membre copié.",
      });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setFlash({
        tone: "error",
        text: "Impossible de copier l’ID.",
      });
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
            Admin Members
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
                    Gestion utilisateurs
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Membres
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Admin <span className="font-black text-white">actif</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Membres chargés <span className="font-black text-white">{members.length}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="green">
                      <Shield className="h-3.5 w-3.5" />
                      contrôle membres
                    </Tag>
                    <Tag tone="gold">
                      <Crown className="h-3.5 w-3.5" />
                      rôles & vip
                    </Tag>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void loadPage(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <Shield className="h-4 w-4" />
                    Retour admin
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total membres"
                value={members.length}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="VIP"
                value={totalVip}
                icon={<Crown className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Admins"
                value={totalAdmin}
                icon={<Shield className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Standards"
                value={totalStandard}
                icon={<UserRound className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <Panel title="Recherche & filtres" right={<Tag tone="violet">live</Tag>}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pseudo, rôle, titre, ID..."
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "all", label: "Tous" },
                    { key: "vip", label: "VIP" },
                    { key: "admin", label: "Admins" },
                    { key: "standard", label: "Standards" },
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
            </Panel>

            <Panel
              title="Liste membres"
              right={<Tag>{filteredMembers.length} affichés</Tag>}
            >
              {filteredMembers.length === 0 ? (
                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                  Aucun membre trouvé avec ce filtre.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredMembers.map((member) => {
                    const isBusy = busyId === member.id;
                    const copied = copiedId === member.id;

                    return (
                      <div
                        key={member.id}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xl font-black tracking-[-0.02em] text-white">
                              {member.pseudo}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/58">
                              <span>
                                Ether <span className="font-black text-white">{member.credits}</span>
                              </span>
                              <span className="text-white/20">•</span>
                              <span>
                                Rôle <span className="font-black text-white">{member.role.toUpperCase()}</span>
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {member.isVip ? (
                                <Tag tone="gold">
                                  <Crown className="h-3.5 w-3.5" />
                                  VIP
                                </Tag>
                              ) : null}

                              {member.isAdmin ? (
                                <Tag tone="green">
                                  <Shield className="h-3.5 w-3.5" />
                                  ADMIN
                                </Tag>
                              ) : null}

                              {member.masterTitle !== "Aucun titre" ? (
                                <Tag tone="violet">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  {member.masterTitle}
                                </Tag>
                              ) : (
                                <Tag>Titre vide</Tag>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleCopyId(member.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="mt-4 rounded-[18px] border border-red-500/10 bg-[#0f0f14] p-4">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                            ID membre
                          </div>
                          <div className="mt-2 break-all text-sm text-white/65">{member.id}</div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleVip(member)}
                            className={cx(
                              "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                              member.isVip
                                ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
                                : "border-white/10 bg-white/[0.04] text-white/85"
                            )}
                          >
                            {isBusy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Crown className="h-4 w-4" />
                            )}
                            {member.isVip ? "Retirer VIP" : "Donner VIP"}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleAdmin(member)}
                            className={cx(
                              "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                              member.isAdmin
                                ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                                : "border-white/10 bg-white/[0.04] text-white/85"
                            )}
                          >
                            {isBusy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                            {member.isAdmin ? "Retirer Admin" : "Donner Admin"}
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push(`/messages?member=${member.id}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                          >
                            <Users className="h-4 w-4" />
                            Voir échanges
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push(`/admin/moderation?member=${member.id}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                          >
                            <Wallet className="h-4 w-4" />
                            Modération
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
  );
}
