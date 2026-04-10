"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  Camera,
  Crown,
  Gem,
  Heart,
  MapPin,
  Menu,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
  vip_expires_at?: string | null;
  role?: string | null;
  master_title?: string | null;
  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  interests?: string | null;
  city?: string | null;
  age?: number | null;
  gender?: string | null;
  looking_for?: string | null;
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

const MAX_PSEUDO = 24;
const MAX_BIO = 500;
const MAX_INTERESTS = 140;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isVipActive(profile?: ProfileRow | null) {
  if (profile?.is_admin) return true;
  if (profile?.is_vip) return true;
  if (!profile?.vip_expires_at) return false;
  const d = new Date(profile.vip_expires_at);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

function getNameStyle(effectKey?: string | null): React.CSSProperties {
  const key = (effectKey || "").toLowerCase();

  if (!key) {
    return { color: "#ffffff" };
  }

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

function Tag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
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

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
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

export default function ProfilePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [flash, setFlash] = useState<FlashState>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [pseudo, setPseudo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("not_specified");
  const [lookingFor, setLookingFor] = useState("discussion");

  const vipActive = isVipActive(profile);
  const credits = profile?.credits ?? 0;
  const isAdmin = Boolean(profile?.is_admin);
  const role = profile?.role?.trim() || "member";
  const masterTitle = profile?.master_title?.trim() || "Membre";
  const activeEffects = useMemo(() => {
    return [
      profile?.active_name_fx_key,
      profile?.active_badge_key,
      profile?.active_title_key,
    ].filter(Boolean) as string[];
  }, [profile?.active_name_fx_key, profile?.active_badge_key, profile?.active_title_key]);

  const previewName = sanitizeText(pseudo || "Membre Ether", MAX_PSEUDO);
  const previewBio = sanitizeText(bio, MAX_BIO);
  const previewInterests = sanitizeText(interests, MAX_INTERESTS)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setFlash(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/enter");
        return;
      }

      setAuthUserId(user.id);

      let { data, error } = await supabase
        .from("profiles")
        .select(
          "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title, active_name_fx_key, active_badge_key, active_title_key, avatar_url, bio, interests, city, age, gender, looking_for"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const fallbackPseudo =
          user.email?.split("@")[0]?.slice(0, MAX_PSEUDO) || "Membre Ether";

        const createRes = await supabase.from("profiles").upsert(
          {
            id: user.id,
            pseudo: fallbackPseudo,
            credits: 0,
            is_vip: false,
            is_admin: false,
            role: "member",
            master_title: "Membre",
          },
          { onConflict: "id" }
        );

        if (createRes.error) throw createRes.error;

        const retry = await supabase
          .from("profiles")
          .select(
            "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title, active_name_fx_key, active_badge_key, active_title_key, avatar_url, bio, interests, city, age, gender, looking_for"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (retry.error) throw retry.error;
        data = retry.data;
      }

      const nextProfile = (data as ProfileRow | null) ?? null;
      setProfile(nextProfile);

      setPseudo(nextProfile?.pseudo?.trim() || "");
      setAvatarUrl(nextProfile?.avatar_url?.trim() || "");
      setBio(nextProfile?.bio?.trim() || "");
      setInterests(nextProfile?.interests?.trim() || "");
      setCity(nextProfile?.city?.trim() || "");
      setAge(nextProfile?.age ? String(nextProfile.age) : "");
      setGender(nextProfile?.gender?.trim() || "not_specified");
      setLookingFor(nextProfile?.looking_for?.trim() || "discussion");
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de charger le profil.",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !authUserId) return;

    setUploading(true);
    setFlash(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${authUserId}/${Date.now()}.${ext}`;

      const uploadRes = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadRes.error) throw uploadRes.error;

      const publicUrlRes = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = publicUrlRes.data.publicUrl;

      setAvatarUrl(publicUrl);
      setFlash({
        tone: "success",
        text: "Photo téléchargée avec succès.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text:
          e?.message ||
          "Impossible de téléverser la photo. Vérifie le bucket avatars.",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSave() {
    if (!authUserId) return;

    const cleanPseudo = sanitizeText(pseudo, MAX_PSEUDO);
    const cleanBio = sanitizeText(bio, MAX_BIO);
    const cleanInterests = sanitizeText(interests, MAX_INTERESTS);
    const cleanCity = sanitizeText(city, 60);
    const cleanAvatar = avatarUrl.trim().slice(0, 500);

    if (!cleanPseudo || cleanPseudo.length < 3) {
      setFlash({
        tone: "error",
        text: "Le nom de profil doit contenir au moins 3 caractères.",
      });
      return;
    }

    const parsedAge = age.trim() ? Number(age.trim()) : null;
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 99)) {
      setFlash({
        tone: "error",
        text: "L’âge doit être entre 18 et 99.",
      });
      return;
    }

    setSaving(true);
    setFlash(null);

    try {
      const payload = {
        pseudo: cleanPseudo,
        avatar_url: cleanAvatar || null,
        bio: cleanBio || null,
        interests: cleanInterests || null,
        city: cleanCity || null,
        age: parsedAge,
        gender,
        looking_for: lookingFor,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", authUserId);

      if (error) throw error;

      setFlash({
        tone: "success",
        text: "Profil enregistré avec succès.",
      });

      await loadProfile();
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer le profil.",
      });
    } finally {
      setSaving(false);
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
            Profil
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
              onClick={() => void loadProfile()}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-red-500/14 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    Mon profil
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Profil membre
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span>
                      Ether <span className="font-black text-white">{credits}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Statut <span className="font-black text-white">{vipActive ? "VIP" : "Standard"}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Rôle <span className="font-black text-white">{role.toUpperCase()}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vipActive ? <Tag tone="gold">VIP</Tag> : <Tag>Standard</Tag>}
                    {isAdmin ? <Tag tone="green">Admin</Tag> : null}
                    {masterTitle ? <Tag tone="violet">{masterTitle}</Tag> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/90 transition hover:bg-red-900/16 disabled:opacity-60"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <Panel title="Aperçu du profil">
                <div className="space-y-5">
                  <div className="relative overflow-hidden rounded-[26px] border border-red-500/12 bg-black/25 p-5">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(190,20,20,0.10),rgba(255,0,90,0.06),rgba(255,255,255,0.01))]" />
                    <div className="relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[24px] border border-red-500/16 bg-red-950/12">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={previewName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center">
                              <Camera className="h-8 w-8 text-white/45" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-3xl font-black tracking-[-0.04em]"
                            style={getNameStyle(profile?.active_name_fx_key)}
                          >
                            {previewName || "Membre Ether"}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {vipActive ? <Tag tone="gold">VIP</Tag> : <Tag>Standard</Tag>}
                            {isAdmin ? <Tag tone="green">Admin</Tag> : null}
                            {masterTitle ? <Tag tone="violet">{masterTitle}</Tag> : null}
                          </div>

                          <div className="mt-3 text-sm text-white/56">
                            {city ? `${city}${age ? ` • ${age} ans` : ""}` : age ? `${age} ans` : "Informations de base"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-red-100/34">
                          Description
                        </div>
                        <div className="text-sm leading-6 text-white/72">
                          {previewBio || "Aucune description pour le moment."}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-red-100/34">
                          Intérêts
                        </div>
                        {previewInterests.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {previewInterests.map((item) => (
                              <Tag key={item}>{item}</Tag>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-white/48">Aucun intérêt renseigné.</div>
                        )}
                      </div>

                      {activeEffects.length > 0 ? (
                        <div className="mt-4 rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-red-100/34">
                            Effets boutique actifs
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeEffects.map((effect) => (
                              <Tag key={effect} tone="violet">
                                <Zap className="h-3 w-3" />
                                {effect}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="Informations du profil">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Nom de profil
                      </label>
                      <input
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value.slice(0, MAX_PSEUDO))}
                        placeholder="Nom de profil"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                      <div className="text-xs text-white/38">{pseudo.length}/{MAX_PSEUDO}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Âge
                      </label>
                      <input
                        value={age}
                        onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                        placeholder="18"
                        inputMode="numeric"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Ville
                      </label>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value.slice(0, 60))}
                        placeholder="Montréal"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Genre
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                      >
                        <option value="not_specified">Non précisé</option>
                        <option value="male">Homme</option>
                        <option value="female">Femme</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Je cherche
                      </label>
                      <select
                        value={lookingFor}
                        onChange={(e) => setLookingFor(e.target.value)}
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                      >
                        <option value="discussion">Discussion</option>
                        <option value="friendship">Amitié</option>
                        <option value="dating">Rencontre</option>
                        <option value="serious">Relation sérieuse</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Description
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                        placeholder="Parle un peu de toi..."
                        rows={5}
                        className="w-full resize-none rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                      <div className="text-xs text-white/38">{bio.length}/{MAX_BIO}</div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Intérêts
                      </label>
                      <input
                        value={interests}
                        onChange={(e) => setInterests(e.target.value.slice(0, MAX_INTERESTS))}
                        placeholder="musique, cinéma, jeux, sport..."
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                      <div className="text-xs text-white/38">Sépare avec des virgules.</div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Photo de profil & options">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        URL de la photo
                      </label>
                      <input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value.slice(0, 500))}
                        placeholder="https://..."
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/42">
                        Téléverser une photo
                      </label>
                      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/86 transition hover:bg-red-900/12">
                        {uploading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploading ? "Upload..." : "Choisir une image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                        <User className="h-4 w-4 text-red-200" />
                        Nom
                      </div>
                      <div className="mt-2 text-sm text-white/58">
                        Modifiable facilement
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                        <MapPin className="h-4 w-4 text-red-200" />
                        Infos
                      </div>
                      <div className="mt-2 text-sm text-white/58">
                        Ville, âge, genre
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                        <Heart className="h-4 w-4 text-red-200" />
                        Description
                      </div>
                      <div className="mt-2 text-sm text-white/58">
                        Bio claire et rapide
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                        <Sparkles className="h-4 w-4 text-red-200" />
                        Effets
                      </div>
                      <div className="mt-2 text-sm text-white/58">
                        Liés à ta boutique
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/90 transition hover:bg-red-900/16 disabled:opacity-60"
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "Enregistrement..." : "Enregistrer le profil"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadProfile()}
                      className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/86 transition hover:bg-white/[0.07]"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recharger
                    </button>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
