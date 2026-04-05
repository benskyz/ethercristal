"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronRight,
  Crown,
  DoorOpen,
  Gem,
  Lock,
  MessageCircle,
  Package,
  RefreshCw,
  Shield,
  ShoppingBag,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type Profile = {
  id: string;
  pseudo?: string | null;
  email?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
  role?: string | null;
  created_at?: string | null;
};

type RoomPresenceRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

type DashboardNotification = {
  id: string;
  label: string;
  tone: "rose" | "cyan" | "emerald" | "gold";
};

type ActiveEffect = {
  id: string;
  label: string;
  value: string;
  tone: "gold" | "cyan" | "violet";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-CA").format(value);
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presence, setPresence] = useState<RoomPresenceRow[]>([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [error, setError] = useState("");

  // Mock propre pour le dashboard.
  // Branche ensuite sur Supabase quand tu veux.
  const [notifications] = useState<DashboardNotification[]>([
    { id: "1", label: "Accès VIP confirmé", tone: "gold" },
    { id: "2", label: "Présence en direct synchronisée", tone: "emerald" },
    { id: "3", label: "Effet de pseudo actuellement actif", tone: "cyan" },
  ]);

  const [activeEffects] = useState<ActiveEffect[]>([
    { id: "1", label: "Pseudo", value: "Aura Cristal", tone: "gold" },
    { id: "2", label: "Style", value: "Glow Premium", tone: "cyan" },
  ]);

  async function load(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!user) {
        router.push("/enter");
        return;
      }

      const [profileRes, roomsRes, presenceRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, pseudo, email, credits, is_vip, is_admin, role, created_at")
          .eq("id", user.id)
          .single(),
        supabase.from("rooms").select("id"),
        supabase
          .from("room_presence")
          .select("id, room_id, user_id, pseudo, joined_at, updated_at"),
      ]);

      if (profileRes.error) {
        setError((prev) => prev || profileRes.error.message);
      } else {
        setProfile((profileRes.data as Profile) ?? null);
      }

      if (roomsRes.error) {
        setError((prev) => prev || roomsRes.error.message);
      } else {
        setRoomsCount((roomsRes.data ?? []).length);
      }

      if (presenceRes.error) {
        setError((prev) => prev || presenceRes.error.message);
      } else {
        setPresence((presenceRes.data ?? []) as RoomPresenceRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load("initial");
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-room-presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_presence",
        },
        async () => {
          const { data, error } = await supabase
            .from("room_presence")
            .select("id, room_id, user_id, pseudo, joined_at, updated_at");

          if (!error) {
            setPresence((data ?? []) as RoomPresenceRow[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pseudo = profile?.pseudo || "Membre";
  const email = profile?.email || "Email privé";
  const credits = profile?.credits ?? 0;
  const isVip = Boolean(profile?.is_vip);
  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  const onlinePresence = useMemo(() => {
    const now = Date.now();

    return presence.filter((row) => {
      if (!row.updated_at) return false;
      const updated = new Date(row.updated_at).getTime();
      return !Number.isNaN(updated) && now - updated < 60_000;
    });
  }, [presence]);

  const onlineCount = useMemo(() => {
    return new Set(onlinePresence.map((row) => row.user_id)).size;
  }, [onlinePresence]);

  const myRoomsCount = useMemo(() => {
    if (!profile?.id) return 0;

    return new Set(
      onlinePresence
        .filter((row) => row.user_id === profile.id)
        .map((row) => row.room_id)
    ).size;
  }, [onlinePresence, profile?.id]);

  const profileLabel = useMemo(() => {
    if (isAdmin) return "Administrateur privé";
    if (isVip) return "Membre VIP";
    return "Membre standard";
  }, [isAdmin, isVip]);

  const quickActions = [
    {
      title: "Salons",
      desc: "Entrer dans les salles actives et rejoindre le direct.",
      badge: `${roomsCount} salle${roomsCount > 1 ? "s" : ""}`,
      icon: DoorOpen,
      onClick: () => router.push("/salons"),
      accent: "cyan" as const,
    },
    {
      title: "Désir Intense",
      desc: "Accéder à l’espace dédié sans casser le style du site.",
      badge: "Privé",
      icon: Sparkles,
      onClick: () => router.push("/desir"),
      accent: "rose" as const,
    },
    {
      title: "Boutique",
      desc: "Acheter objets, statuts, effets et personnalisations.",
      badge: "Premium",
      icon: ShoppingBag,
      onClick: () => router.push("/boutique"),
      accent: "gold" as const,
    },
    {
      title: "Inventaire",
      desc: "Gérer ce que tu possèdes et activer tes éléments.",
      badge: "Objets",
      icon: Package,
      onClick: () => router.push("/inventaire"),
      accent: "violet" as const,
    },
    {
      title: "Messages",
      desc: "Ouvrir tes conversations privées rapidement.",
      badge: "Direct",
      icon: MessageCircle,
      onClick: () => router.push("/messages"),
      accent: "emerald" as const,
    },
    {
      title: "Profil",
      desc: "Voir ton identité, tes accès et les infos du compte.",
      badge: "Compte",
      icon: UserRound,
      onClick: () => router.push("/profile"),
      accent: "white" as const,
    },
    {
      title: "VIP",
      desc: "Voir ton accès premium et ses avantages.",
      badge: isVip ? "Actif" : "Standard",
      icon: Crown,
      onClick: () => router.push("/vip"),
      accent: "gold" as const,
    },
  ];

  if (isAdmin) {
    quickActions.push({
      title: "Admin",
      desc: "Gérer utilisateurs, salons et activité.",
      badge: "Contrôle",
      icon: Shield,
      onClick: () => router.push("/admin"),
      accent: "rose" as const,
    });
  }

  const timeline = [
    `Compte créé le ${formatDate(profile?.created_at)}`,
    `${onlineCount} membre${onlineCount > 1 ? "s" : ""} en ligne`,
    `${roomsCount} salon${roomsCount > 1 ? "s" : ""} disponible${roomsCount > 1 ? "s" : ""}`,
    isVip || isAdmin ? "Accès VIP autorisé" : "Accès standard actif",
  ];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-140px] h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute left-[-100px] top-[260px] h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-80px] h-[320px] w-[320px] rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.16),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,190,90,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                <Lock className="h-3.5 w-3.5" />
                Dashboard privé
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                Bon retour,
                <span className="block bg-gradient-to-r from-rose-500 via-amber-300 to-white bg-clip-text text-transparent">
                  {pseudo}
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                Un centre de contrôle propre, organisé et premium. Ici tu gères
                ton compte, tes accès et ta navigation. Les caméras restent dans
                les salons. Pas dans le dashboard.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge
                  label={profileLabel}
                  tone={isAdmin ? "red" : isVip ? "gold" : "white"}
                />
                <StatusBadge label={`${formatNumber(credits)} crédits`} tone="cyan" />
                <StatusBadge label={`${onlineCount} en ligne`} tone="emerald" />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => load("refresh")}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                Actualiser
              </button>

              <button
                type="button"
                onClick={() => router.push("/salons")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-3 text-sm font-bold text-black shadow-[0_10px_30px_rgba(255,120,80,0.24)] transition hover:scale-[1.02]"
              >
                <DoorOpen className="h-4 w-4" />
                Ouvrir les salons
              </button>
            </div>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Salons"
              value={roomsCount}
              sub="Disponibles"
              icon={DoorOpen}
              tone="cyan"
            />
            <StatCard
              title="Présence"
              value={onlineCount}
              sub="Utilisateurs actifs"
              icon={Activity}
              tone="emerald"
            />
            <StatCard
              title="Crédits"
              value={formatNumber(credits)}
              sub="Solde actuel"
              icon={Gem}
              tone="amber"
            />
            <StatCard
              title="Mes salons"
              value={myRoomsCount}
              sub="Présence active"
              icon={Bell}
              tone="rose"
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/38">
                    Navigation
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Accès principal
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
                  Hub central
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {quickActions.map((item) => (
                  <ActionCard
                    key={item.title}
                    title={item.title}
                    desc={item.desc}
                    icon={item.icon}
                    badge={item.badge}
                    accent={item.accent}
                    onClick={item.onClick}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-white/38">
                Identité privée
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Ton compte
              </h2>

              <div className="mt-5 flex items-start gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[24px] border border-white/10 bg-white/5 text-3xl shadow-[0_0_35px_rgba(255,70,120,0.12)]">
                  💎
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-2xl font-black text-white">{pseudo}</h3>
                  <p className="mt-1 truncate text-sm text-white/50">{email}</p>
                  <p className="mt-3 text-sm text-white/62">
                    Compte créé le {formatDate(profile?.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <InfoRow label="Statut" value={profileLabel} />
                <InfoRow label="Crédits" value={formatNumber(credits)} />
                <InfoRow
                  label="Accès salons VIP"
                  value={isVip || isAdmin ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Administration"
                  value={isAdmin ? "Autorisée" : "Aucun accès"}
                />
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/38">
                    Apparence active
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Effets équipés
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                  <Wand2 className="h-4.5 w-4.5 text-white/70" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {activeEffects.map((effect) => (
                  <ActiveEffectRow
                    key={effect.id}
                    label={effect.label}
                    value={effect.value}
                    tone={effect.tone}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => router.push("/inventaire")}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                <Package className="h-4 w-4" />
                Gérer mes effets
              </button>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/38">
                    Notifications
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Résumé utile
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                  <Bell className="h-4.5 w-4.5 text-white/70" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {notifications.map((notif) => (
                  <NotificationRow
                    key={notif.id}
                    label={notif.label}
                    tone={notif.tone}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-cyan-400/15 bg-cyan-500/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/60">
                Activité
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                Résumé récent
              </h3>

              <div className="mt-4 space-y-3">
                {timeline.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-rose-400 to-amber-300" />
                    <p className="text-sm leading-6 text-white/72">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            Chargement du dashboard…
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    cyan: "from-cyan-500/18 to-cyan-500/[0.03]",
    emerald: "from-emerald-500/18 to-emerald-500/[0.03]",
    amber: "from-amber-500/18 to-amber-500/[0.03]",
    rose: "from-rose-500/18 to-rose-500/[0.03]",
  };

  return (
    <div
      className={cx(
        "rounded-[26px] border border-white/10 bg-gradient-to-br p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl",
        tones[tone]
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/48">{title}</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <Icon className="h-4.5 w-4.5 text-white/75" />
        </div>
      </div>

      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-white/50">{sub}</p>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon: Icon,
  badge,
  accent,
  onClick,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  accent: "cyan" | "rose" | "gold" | "violet" | "emerald" | "white";
  onClick: () => void;
}) {
  const accentStyles = {
    cyan: "from-cyan-400 to-cyan-200",
    rose: "from-rose-500 to-pink-300",
    gold: "from-amber-400 to-yellow-200",
    violet: "from-violet-500 to-fuchsia-300",
    emerald: "from-emerald-400 to-emerald-200",
    white: "from-white to-zinc-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
          <Icon className="h-5 w-5 text-white/85" />
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/65">
          {badge}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/58">{desc}</p>

      <div
        className={cx(
          "mt-5 h-1.5 w-14 rounded-full bg-gradient-to-r transition-all duration-300 group-hover:w-28",
          accentStyles[accent]
        )}
      />

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/78">
        Ouvrir
        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "red" | "gold" | "white" | "cyan" | "emerald";
}) {
  const styles = {
    red: "border-red-400/20 bg-red-500/10 text-red-300",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    white: "border-white/10 bg-white/10 text-white/70",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <span
      className={cx(
        "rounded-full border px-3 py-1.5 text-xs font-bold",
        styles[tone]
      )}
    >
      {label}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className="mt-2 text-sm font-bold text-white/88">{value}</p>
    </div>
  );
}

function NotificationRow({
  label,
  tone,
}: {
  label: string;
  tone: "rose" | "cyan" | "emerald" | "gold";
}) {
  const dots = {
    rose: "bg-rose-400",
    cyan: "bg-cyan-400",
    emerald: "bg-emerald-400",
    gold: "bg-amber-300",
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className={cx("mt-1 h-2.5 w-2.5 rounded-full", dots[tone])} />
      <p className="text-sm leading-6 text-white/72">{label}</p>
    </div>
  );
}

function ActiveEffectRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "cyan" | "violet";
}) {
  const styles = {
    gold: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <div className={cx("rounded-2xl border p-4", styles[tone])}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}
