"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type ThemeMode = "gold" | "dark" | "velvet";
type MatchPreference = "soft" | "vip" | "intense";

type ProfileRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_verified?: boolean | null;
  show_online?: boolean | null;
  allow_messages?: boolean | null;
  theme_mode?: ThemeMode | null;
  match_preference?: MatchPreference | null;
  avatar_url?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type LocalPrefs = {
  blurAdultVisuals: boolean;
  ambientEffects: boolean;
  compactChat: boolean;
  autoStartCamera: boolean;
  autoStartMic: boolean;
  showMembersPanel: boolean;
  autoplayRoomAudio: boolean;
  desktopNotifications: boolean;
  soundEffects: boolean;
  reducedAnimations: boolean;
};

type UserBlockRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at?: string | null;
};

const LOCAL_KEY = "ethercristal_local_options_v2";

const defaultLocalPrefs: LocalPrefs = {
  blurAdultVisuals: false,
  ambientEffects: true,
  compactChat: false,
  autoStartCamera: true,
  autoStartMic: true,
  showMembersPanel: true,
  autoplayRoomAudio: false,
  desktopNotifications: false,
  soundEffects: true,
  reducedAnimations: false,
};

function getProfileName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

function getProfileNameStyle(profile: ProfileRow | null) {
  if (!profile) return {};

  if (profile.display_name_gradient) {
    return {
      background: profile.display_name_gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: profile.display_name_glow
        ? `0 0 16px ${profile.display_name_glow}`
        : "0 0 14px rgba(212,175,55,0.14)",
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 16px ${profile.display_name_glow}`
      : "0 0 14px rgba(212,175,55,0.14)",
  };
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="opt-toggleRow">
      <div className="opt-toggleCopy">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`opt-toggle ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  );
}

export default function OptionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [searchingBlocks, setSearchingBlocks] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState("");
  const [myUserId, setMyUserId] = useState("");

  const [themeMode, setThemeMode] = useState<ThemeMode>("gold");
  const [matchPreference, setMatchPreference] = useState<MatchPreference>("soft");
  const [showOnline, setShowOnline] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);

  const [localPrefs, setLocalPrefs] = useState<LocalPrefs>(defaultLocalPrefs);

  const [blockSearch, setBlockSearch] = useState("");
  const [blockResults, setBlockResults] = useState<ProfileRow[]>([]);
  const [blockedRows, setBlockedRows] = useState<UserBlockRow[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, ProfileRow>>({});

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = requireSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      setMyUserId(auth.user.id);
      setEmail(auth.user.email || "");

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message || "Impossible de charger les options.");
        setLoading(false);
        return;
      }

      const nextProfile = (profileData || null) as ProfileRow | null;
      setProfile(nextProfile);

      setThemeMode((nextProfile?.theme_mode as ThemeMode) || "gold");
      setMatchPreference((nextProfile?.match_preference as MatchPreference) || "soft");
      setShowOnline(nextProfile?.show_online ?? true);
      setAllowMessages(nextProfile?.allow_messages ?? true);

      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setLocalPrefs({
            ...defaultLocalPrefs,
            ...parsed,
          });
        }
      } catch {
        setLocalPrefs(defaultLocalPrefs);
      }

      await loadBlockedUsers(auth.user.id);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement options.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBlockedUsers(userId: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data: blocks, error } = await supabase
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });

    if (error) return;

    const nextRows = (blocks || []) as UserBlockRow[];
    setBlockedRows(nextRows);

    const ids = Array.from(new Set(nextRows.map((b) => b.blocked_id).filter(Boolean)));

    if (ids.length === 0) {
      setBlockedProfiles({});
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids);

    const map: Record<string, ProfileRow> = {};
    (profilesData || []).forEach((p: any) => {
      map[String(p.id)] = p as ProfileRow;
    });
    setBlockedProfiles(map);
  }

  const isVip = useMemo(() => {
    const value = String(profile?.vip_level || "").toLowerCase();
    return value !== "" && value !== "free" && value !== "standard";
  }, [profile?.vip_level]);

  const blockedIds = useMemo(() => {
    return new Set(blockedRows.map((b) => b.blocked_id));
  }, [blockedRows]);

  async function handleSave() {
    if (!profile?.id) return;

    try {
      setSaving(true);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          theme_mode: themeMode,
          match_preference: matchPreference,
          show_online: showOnline,
          allow_messages: allowMessages,
        })
        .eq("id", profile.id);

      if (error) {
        setErrorMsg(error.message || "Impossible de sauvegarder les options.");
        return;
      }

      localStorage.setItem(LOCAL_KEY, JSON.stringify(localPrefs));

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              theme_mode: themeMode,
              match_preference: matchPreference,
              show_online: showOnline,
              allow_messages: allowMessages,
            }
          : prev
      );

      setNotice("Options sauvegardées.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur sauvegarde options.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!email) {
      setErrorMsg("Aucun email disponible pour ce compte.");
      return;
    }

    try {
      setResetLoading(true);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible d’envoyer le mail de réinitialisation.");
        return;
      }

      setNotice("Mail de réinitialisation envoyé.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur réinitialisation mot de passe.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  }

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !myUserId) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Le fichier doit être une image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image trop lourde. Maximum 5 MB.");
      return;
    }

    try {
      setAvatarUploading(true);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${myUserId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
        });

      if (uploadError) {
        setErrorMsg(uploadError.message || "Impossible d’envoyer l’avatar.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", myUserId);

      if (profileError) {
        setErrorMsg(profileError.message || "Impossible de sauvegarder l’avatar.");
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setNotice("Avatar mis à jour.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur upload avatar.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleAvatarRemove() {
    if (!myUserId) return;

    try {
      setAvatarUploading(true);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
        })
        .eq("id", myUserId);

      if (error) {
        setErrorMsg(error.message || "Impossible de retirer l’avatar.");
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      setNotice("Avatar retiré.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur suppression avatar.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSearchBlockedCandidates() {
    if (!blockSearch.trim() || !myUserId) return;

    try {
      setSearchingBlocks(true);
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `%${blockSearch.trim()}%`)
        .neq("id", myUserId)
        .limit(10);

      if (error) {
        setErrorMsg(error.message || "Impossible de chercher les membres.");
        return;
      }

      setBlockResults((data || []) as ProfileRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur recherche membres.");
    } finally {
      setSearchingBlocks(false);
    }
  }

  async function handleBlockUser(target: ProfileRow) {
    if (!myUserId || !target.id) return;

    try {
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: myUserId,
        blocked_id: target.id,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible de bloquer cet utilisateur.");
        return;
      }

      setNotice(`${getProfileName(target)} a été bloqué.`);
      setBlockResults((prev) => prev.filter((p) => p.id !== target.id));
      await loadBlockedUsers(myUserId);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur blocage utilisateur.");
    }
  }

  async function handleUnblockUser(blockedId: string) {
    if (!myUserId) return;

    try {
      setNotice("");
      setErrorMsg("");

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", myUserId)
        .eq("blocked_id", blockedId);

      if (error) {
        setErrorMsg(error.message || "Impossible de débloquer cet utilisateur.");
        return;
      }

      setNotice("Utilisateur débloqué.");
      await loadBlockedUsers(myUserId);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur déblocage utilisateur.");
    }
  }

  async function toggleDesktopNotifications(next: boolean) {
    if (next && typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setErrorMsg("Les notifications navigateur n’ont pas été autorisées.");
        return;
      }
    }

    setLocalPrefs((prev) => ({
      ...prev,
      desktopNotifications: next,
    }));
  }

  if (loading) {
    return (
      <main className="options-page">
        <style>{css}</style>
        <div className="options-loading">
          <div className="options-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="options-page">
      <style>{css}</style>

      <div className="options-bg options-bg-a" />
      <div className="options-bg options-bg-b" />
      <div className="options-noise" />
      <div className="options-orb options-orb-a" />
      <div className="options-orb options-orb-b" />
      <div className="options-orb options-orb-c" />

      <div className="options-shell">
        <header className="options-topbar">
          <button className="options-navBtn" onClick={() => router.push("/dashboard")} type="button">
            Retour
          </button>

          <div className="options-topbarRight">
            <button className="options-navBtn" onClick={() => router.push("/profile")} type="button">
              Profil
            </button>
            <button className="options-navBtn gold" onClick={() => router.push("/shop")} type="button">
              Shop
            </button>
          </div>
        </header>

        <section className="options-hero">
          <div className="options-brand">
            <span className="ether">Ether</span>
            <span className="cristal">Cristal</span>
          </div>

          <div className="options-kicker">Réglages avancés</div>

          <h1 className="options-title">Options du compte</h1>
          <p className="options-subtitle">
            Gère ton identité, tes préférences privées, ton appareil, la sécurité de ton accès et les membres bloqués.
          </p>

          <div className="options-statusCard">
            <div className="options-statusLeft">
              <div className="options-statusAvatarWrap">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={getProfileName(profile)} className="options-statusAvatar" />
                ) : (
                  <div className="options-statusAvatar placeholder">
                    {getProfileName(profile).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div className="options-statusLabel">Compte actif</div>
                <div className="options-statusName" style={getProfileNameStyle(profile)}>
                  {getProfileName(profile)}
                </div>
                <div className="options-statusMeta">
                  {isVip ? "VIP" : "Standard"} • {Number(profile?.ether_balance || 0)} Ξ
                  {profile?.is_verified ? " • Vérifié" : ""}
                </div>
              </div>
            </div>

            <div className="options-statusPills">
              <span className="options-pill gold">{themeMode}</span>
              <span className="options-pill">{showOnline ? "Visible" : "Invisible"}</span>
              <span className="options-pill">{allowMessages ? "Messages ouverts" : "Messages limités"}</span>
            </div>
          </div>
        </section>

        {notice ? <div className="options-notice">{notice}</div> : null}
        {errorMsg ? <div className="options-error">{errorMsg}</div> : null}

        <section className="options-grid">
          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Identité</div>
            <h2 className="options-cardTitle">Avatar & profil</h2>

            <div className="opt-profileBox">
              <div className="opt-avatarArea">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={getProfileName(profile)} className="opt-avatarBig" />
                ) : (
                  <div className="opt-avatarBig placeholder">
                    {getProfileName(profile).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="opt-profileMain">
                <div className="opt-profileName" style={getProfileNameStyle(profile)}>
                  {getProfileName(profile)}
                </div>
                <div className="opt-profileMeta">
                  {email || "Aucun email"} • {isVip ? "VIP" : "Standard"}
                </div>

                <div className="opt-avatarActions">
                  <label className="opt-mainBtn fileBtn">
                    {avatarUploading ? "Envoi..." : "Changer l’avatar"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      hidden
                    />
                  </label>

                  <button
                    className="opt-secondaryBtn"
                    type="button"
                    onClick={() => void handleAvatarRemove()}
                    disabled={avatarUploading}
                  >
                    Retirer
                  </button>
                </div>

                <div className="opt-note">
                  Bucket requis : <strong>avatars</strong>. Le bucket doit exister côté Supabase Storage.
                </div>
              </div>
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Confidentialité</div>
            <h2 className="options-cardTitle">Présence & messages</h2>

            <div className="opt-stack">
              <ToggleRow
                label="Afficher mon statut en ligne"
                description="Autorise l’affichage de ta présence active dans l’écosystème."
                checked={showOnline}
                onChange={setShowOnline}
              />

              <ToggleRow
                label="Autoriser les messages privés"
                description="Permet aux autres membres de t’écrire directement."
                checked={allowMessages}
                onChange={setAllowMessages}
              />

              <ToggleRow
                label="Flouter certains visuels adultes sur cet appareil"
                description="Préférence locale utile si tu veux un rendu plus discret."
                checked={localPrefs.blurAdultVisuals}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    blurAdultVisuals: v,
                  }))
                }
              />
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Apparence</div>
            <h2 className="options-cardTitle">Style général</h2>

            <div className="opt-stack">
              <div className="opt-field">
                <span className="opt-label">Thème visuel</span>
                <div className="opt-pillRow">
                  {(["gold", "dark", "velvet"] as ThemeMode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`opt-pill ${themeMode === value ? "active" : ""}`}
                      onClick={() => setThemeMode(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                label="Effets visuels ambiants"
                description="Active les halos, pulsations et éléments décoratifs sur cet appareil."
                checked={localPrefs.ambientEffects}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    ambientEffects: v,
                  }))
                }
              />

              <ToggleRow
                label="Animations réduites"
                description="Réduit certains mouvements si tu veux une interface plus calme."
                checked={localPrefs.reducedAnimations}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    reducedAnimations: v,
                  }))
                }
              />

              <ToggleRow
                label="Chat compact"
                description="Réduit l’espace occupé par certains blocs de discussion."
                checked={localPrefs.compactChat}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    compactChat: v,
                  }))
                }
              />
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">DésirIntense</div>
            <h2 className="options-cardTitle">Préférences privées</h2>

            <div className="opt-stack">
              <div className="opt-field">
                <span className="opt-label">Préférence désirée</span>
                <div className="opt-pillRow">
                  {(["soft", "vip", "intense"] as MatchPreference[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`opt-pill ${matchPreference === value ? "active" : ""}`}
                      onClick={() => setMatchPreference(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                label="Caméra active par défaut"
                description="Active automatiquement la caméra au lancement sur cet appareil."
                checked={localPrefs.autoStartCamera}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    autoStartCamera: v,
                  }))
                }
              />

              <ToggleRow
                label="Micro actif par défaut"
                description="Active automatiquement le micro au lancement sur cet appareil."
                checked={localPrefs.autoStartMic}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    autoStartMic: v,
                  }))
                }
              />
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Salons & rooms</div>
            <h2 className="options-cardTitle">Préférences de salle</h2>

            <div className="opt-stack">
              <ToggleRow
                label="Afficher le panneau membres"
                description="Conserve la liste des membres visible par défaut sur cet appareil."
                checked={localPrefs.showMembersPanel}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    showMembersPanel: v,
                  }))
                }
              />

              <ToggleRow
                label="Lecture audio d’ambiance auto"
                description="Active automatiquement certains sons d’ambiance dans les rooms."
                checked={localPrefs.autoplayRoomAudio}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    autoplayRoomAudio: v,
                  }))
                }
              />
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Notifications</div>
            <h2 className="options-cardTitle">Sons & alertes</h2>

            <div className="opt-stack">
              <ToggleRow
                label="Notifications navigateur"
                description="Demande l’autorisation d’envoyer des alertes locales sur cet appareil."
                checked={localPrefs.desktopNotifications}
                onChange={(v) => void toggleDesktopNotifications(v)}
              />

              <ToggleRow
                label="Effets sonores"
                description="Active les sons d’interface, de message et de certaines interactions."
                checked={localPrefs.soundEffects}
                onChange={(v) =>
                  setLocalPrefs((prev) => ({
                    ...prev,
                    soundEffects: v,
                  }))
                }
              />
            </div>
          </article>

          <article className="options-card">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Blocages</div>
            <h2 className="options-cardTitle">Utilisateurs bloqués</h2>

            <div className="opt-blockSearch">
              <input
                className="opt-input"
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                placeholder="Chercher un membre à bloquer..."
              />
              <button
                className="opt-mainBtn"
                type="button"
                onClick={() => void handleSearchBlockedCandidates()}
                disabled={searchingBlocks || !blockSearch.trim()}
              >
                {searchingBlocks ? "Recherche..." : "Chercher"}
              </button>
            </div>

            {blockResults.length > 0 ? (
              <div className="opt-userList">
                {blockResults.map((item) => (
                  <div key={item.id} className="opt-userCard">
                    <div className="opt-userMain">
                      <div className="opt-userName" style={getProfileNameStyle(item)}>
                        {getProfileName(item)}
                      </div>
                      <div className="opt-userMeta">
                        {item.vip_level || "Standard"}
                        {item.is_verified ? " • Vérifié" : ""}
                      </div>
                    </div>

                    <button
                      className="opt-dangerBtn small"
                      type="button"
                      disabled={blockedIds.has(String(item.id))}
                      onClick={() => void handleBlockUser(item)}
                    >
                      {blockedIds.has(String(item.id)) ? "Déjà bloqué" : "Bloquer"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="opt-blockedTitle">Liste actuelle</div>

            {blockedRows.length > 0 ? (
              <div className="opt-userList">
                {blockedRows.map((row) => {
                  const blocked = blockedProfiles[row.blocked_id] || null;

                  return (
                    <div key={row.id} className="opt-userCard">
                      <div className="opt-userMain">
                        <div className="opt-userName" style={getProfileNameStyle(blocked)}>
                          {getProfileName(blocked)}
                        </div>
                        <div className="opt-userMeta">
                          {blocked?.vip_level || "Standard"}
                        </div>
                      </div>

                      <button
                        className="opt-secondaryBtn small"
                        type="button"
                        onClick={() => void handleUnblockUser(row.blocked_id)}
                      >
                        Débloquer
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="opt-note">Aucun utilisateur bloqué.</div>
            )}
          </article>

          <article className="options-card security">
            <div className="options-cardShine" />
            <div className="options-cardKicker">Sécurité</div>
            <h2 className="options-cardTitle">Accès & session</h2>

            <div className="opt-securityActions">
              <button
                className="opt-mainBtn"
                type="button"
                onClick={() => void handleSendPasswordReset()}
                disabled={resetLoading}
              >
                {resetLoading ? "Envoi..." : "Réinitialiser le mot de passe"}
              </button>

              <button
                className="opt-secondaryBtn"
                type="button"
                onClick={() => router.push("/age")}
              >
                Vérification 18+
              </button>

              <button
                className="opt-dangerBtn"
                type="button"
                onClick={() => void handleLogout()}
              >
                Déconnexion
              </button>
            </div>

            <div className="opt-securityNote">
              La vraie gestion multi-appareils / multi-sessions demande une couche backend dédiée en plus. Ici on verrouille déjà le reset, la déconnexion et les préférences de compte.
            </div>
          </article>
        </section>

        <div className="options-saveBar">
          <button
            className="options-saveBtn"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder les options"}
          </button>
        </div>
      </div>
    </main>
  );
}

const css = `
.options-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 20%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    radial-gradient(circle at 50% 82%, rgba(70,20,110,0.16), transparent 30%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.options-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.options-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.options-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.22;
  mask-image:linear-gradient(180deg, rgba(255,255,255,0.55), transparent 100%);
}

.options-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.035;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
  mix-blend-mode:screen;
}

.options-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.18;
  pointer-events:none;
}
.options-orb-a{
  width:220px;
  height:220px;
  left:80px;
  top:100px;
  background:rgba(212,175,55,0.46);
  animation:floatA 9s ease-in-out infinite;
}
.options-orb-b{
  width:260px;
  height:260px;
  right:100px;
  top:140px;
  background:rgba(180,30,60,0.24);
  animation:floatB 12s ease-in-out infinite;
}
.options-orb-c{
  width:230px;
  height:230px;
  left:50%;
  bottom:30px;
  transform:translateX(-50%);
  background:rgba(100,40,170,0.18);
  animation:floatC 11s ease-in-out infinite;
}

@keyframes floatA{
  0%,100%{transform:translateY(0) scale(1)}
  50%{transform:translateY(-18px) scale(1.06)}
}
@keyframes floatB{
  0%,100%{transform:translateX(0) scale(1)}
  50%{transform:translateX(-22px) scale(1.05)}
}
@keyframes floatC{
  0%,100%{transform:translateX(-50%) translateY(0) scale(1)}
  50%{transform:translateX(-50%) translateY(-14px) scale(1.04)}
}

.options-shell{
  position:relative;
  z-index:2;
  max-width:1440px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.options-topbar{
  display:flex;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.options-topbarRight{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.options-navBtn{
  min-height:46px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  font-weight:800;
  cursor:pointer;
  transition:all .22s ease;
}
.options-navBtn:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.20);
}
.options-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.options-hero{
  margin-top:28px;
  text-align:center;
}

.options-brand{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  justify-content:center;
  align-items:center;
  font-size:54px;
  font-weight:900;
  letter-spacing:-2px;
  line-height:1;
}

.options-brand .ether{
  background:linear-gradient(90deg,#b8871b 0%, #fff0a8 35%, #d4af37 65%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(212,175,55,0.18);
  animation:etherPulse 3.2s ease-in-out infinite;
}

.options-brand .cristal{
  color:#f8f1de;
  text-shadow:0 0 18px rgba(255,255,255,0.10);
}

@keyframes etherPulse{
  0%,100%{
    filter:drop-shadow(0 0 6px rgba(212,175,55,0.18));
    transform:scale(1);
    opacity:.94;
  }
  50%{
    filter:drop-shadow(0 0 14px rgba(212,175,55,0.34));
    transform:scale(1.02);
    opacity:1;
  }
}

.options-kicker{
  margin:18px auto 0;
  display:inline-flex;
  align-items:center;
  min-height:36px;
  padding:8px 14px;
  border-radius:999px;
  background:rgba(212,175,55,0.10);
  color:#f6dc86;
  border:1px solid rgba(212,175,55,0.18);
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
}

.options-title{
  margin:18px 0 0;
  font-size:56px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.options-subtitle{
  max-width:920px;
  margin:16px auto 0;
  font-size:18px;
  line-height:1.8;
  color:rgba(255,245,220,0.74);
}

.options-statusCard{
  margin:26px auto 0;
  max-width:980px;
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  flex-wrap:wrap;
  padding:20px 22px;
  border-radius:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
}

.options-statusLeft{
  display:flex;
  gap:14px;
  align-items:center;
  flex-wrap:wrap;
}

.options-statusAvatarWrap{
  flex-shrink:0;
}
.options-statusAvatar{
  width:72px;
  height:72px;
  border-radius:20px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}
.options-statusAvatar.placeholder{
  width:72px;
  height:72px;
  border-radius:20px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  color:#fff3c2;
  border:1px solid rgba(255,255,255,0.10);
}

.options-statusLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}
.options-statusName{
  margin-top:8px;
  font-size:32px;
  font-weight:900;
  line-height:1;
}
.options-statusMeta{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}
.options-statusPills{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.options-pill{
  min-height:38px;
  padding:10px 14px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.options-pill.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.options-notice,
.options-error{
  max-width:1280px;
  margin:18px auto 0;
  padding:14px 16px;
  border-radius:18px;
}
.options-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.options-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.options-grid{
  margin-top:28px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
}

.options-card{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:26px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(16px);
  box-shadow:
    0 24px 80px rgba(0,0,0,0.40),
    inset 0 1px 0 rgba(255,255,255,0.05);
}
.options-card.security{
  grid-column:1 / -1;
}
.options-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:optionsShine 7s linear infinite;
  pointer-events:none;
}
@keyframes optionsShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.options-cardKicker{
  display:inline-flex;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}

.options-cardTitle{
  margin:16px 0 0;
  font-size:34px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}

.opt-stack{
  margin-top:22px;
  display:grid;
  gap:16px;
}

.opt-profileBox{
  margin-top:22px;
  display:grid;
  grid-template-columns:140px 1fr;
  gap:18px;
  align-items:start;
}

.opt-avatarBig{
  width:140px;
  height:140px;
  border-radius:28px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}
.opt-avatarBig.placeholder{
  width:140px;
  height:140px;
  border-radius:28px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:42px;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  color:#fff3c2;
  border:1px solid rgba(255,255,255,0.10);
}

.opt-profileName{
  font-size:30px;
  font-weight:900;
  line-height:1;
}
.opt-profileMeta{
  margin-top:10px;
  color:rgba(255,245,220,0.70);
  line-height:1.7;
}

.opt-avatarActions{
  margin-top:16px;
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.opt-note{
  margin-top:14px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,245,220,0.72);
  line-height:1.7;
}

.opt-toggleRow{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.opt-toggleCopy strong{
  display:block;
  font-size:16px;
  color:#fff3d2;
}
.opt-toggleCopy p{
  margin:8px 0 0;
  color:rgba(255,245,220,0.70);
  line-height:1.7;
  font-size:14px;
}

.opt-toggle{
  width:62px;
  min-width:62px;
  height:36px;
  border:none;
  border-radius:999px;
  background:rgba(255,255,255,0.12);
  position:relative;
  cursor:pointer;
}
.opt-toggle span{
  position:absolute;
  top:4px;
  left:4px;
  width:28px;
  height:28px;
  border-radius:999px;
  background:#fff;
  transition:all .22s ease;
}
.opt-toggle.on{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
}
.opt-toggle.on span{
  left:30px;
  background:#1a0014;
}

.opt-field{
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.opt-label{
  display:block;
  font-size:14px;
  color:#fff3d2;
  font-weight:800;
}
.opt-pillRow{
  margin-top:14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.opt-pill{
  min-height:42px;
  padding:10px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.10);
  background:rgba(255,255,255,0.04);
  color:#fff;
  font-weight:800;
  cursor:pointer;
  transition:all .22s ease;
  text-transform:uppercase;
}
.opt-pill:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.24);
}
.opt-pill.active{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.opt-input{
  width:100%;
  min-height:56px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.opt-input::placeholder{
  color:rgba(255,255,255,0.42);
}

.opt-blockSearch{
  margin-top:22px;
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
}

.opt-userList{
  margin-top:18px;
  display:grid;
  gap:12px;
}

.opt-userCard{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  padding:14px 16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.opt-userMain{
  min-width:0;
}
.opt-userName{
  font-size:16px;
  font-weight:900;
}
.opt-userMeta{
  margin-top:6px;
  color:rgba(255,245,220,0.68);
  font-size:13px;
}

.opt-blockedTitle{
  margin-top:18px;
  font-size:15px;
  font-weight:900;
  color:#fff3d2;
}

.opt-securityActions{
  margin-top:22px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
}

.opt-mainBtn,
.opt-secondaryBtn,
.opt-dangerBtn{
  min-height:58px;
  border:none;
  border-radius:18px;
  font-size:15px;
  font-weight:900;
  cursor:pointer;
  transition:transform .22s ease, opacity .22s ease, box-shadow .22s ease;
}
.opt-mainBtn.small,
.opt-secondaryBtn.small,
.opt-dangerBtn.small{
  min-height:44px;
  padding:0 14px;
  font-size:13px;
  border-radius:14px;
}

.opt-mainBtn{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  box-shadow:0 12px 30px rgba(212,175,55,0.18);
}
.opt-mainBtn:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}
.opt-mainBtn:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.opt-secondaryBtn{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.10);
}
.opt-secondaryBtn:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.18);
}

.opt-dangerBtn{
  background:linear-gradient(90deg,#a43a48,#ff7b6b);
  color:#fff;
}
.opt-dangerBtn:hover{
  transform:translateY(-1px);
}

.fileBtn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:0 18px;
}

.opt-securityNote{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,245,220,0.72);
  line-height:1.7;
}

.options-saveBar{
  margin-top:26px;
  display:flex;
  justify-content:center;
}

.options-saveBtn{
  min-height:60px;
  min-width:300px;
  padding:12px 26px;
  border:none;
  border-radius:18px;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
  transition:transform .22s ease, opacity .22s ease, box-shadow .22s ease;
  box-shadow:0 12px 30px rgba(212,175,55,0.18);
}
.options-saveBtn:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}
.options-saveBtn:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.options-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.options-loader{
  width:64px;
  height:64px;
  border:6px solid rgba(212,175,55,0.2);
  border-top:6px solid #d4af37;
  border-radius:50%;
  animation:spin 1.3s linear infinite;
}
@keyframes spin{
  to{transform:rotate(360deg)}
}

@media (max-width: 1120px){
  .options-grid{
    grid-template-columns:1fr;
  }

  .options-card.security{
    grid-column:auto;
  }

  .opt-securityActions{
    grid-template-columns:1fr;
  }
}

@media (max-width: 760px){
  .options-brand{
    font-size:42px;
  }

  .options-title{
    font-size:40px;
  }

  .options-subtitle{
    font-size:16px;
  }

  .options-card{
    padding:22px;
    border-radius:24px;
  }

  .options-statusCard{
    padding:18px;
  }

  .opt-toggleRow{
    flex-direction:column;
    align-items:flex-start;
  }

  .opt-profileBox{
    grid-template-columns:1fr;
  }

  .opt-blockSearch{
    grid-template-columns:1fr;
  }

  .opt-userCard{
    flex-direction:column;
    align-items:flex-start;
  }
}

@media (max-width: 560px){
  .options-title{
    font-size:34px;
  }

  .options-brand{
    font-size:34px;
  }

  .options-saveBtn{
    width:100%;
    min-width:0;
  }
}
`;
