"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  email?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
  is_banned?: boolean | null;
  role?: string | null;
  created_at?: string | null;
};

type RoomRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  is_live?: boolean | null;
  is_vip?: boolean | null;
  members_count?: number | null;
  created_at?: string | null;
};

type AdminLogRow = {
  id: string;
  actor_id: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: string | null;
  created_at?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [creditsInput, setCreditsInput] = useState("100");

  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomVip, setNewRoomVip] = useState(false);
  const [newRoomLive, setNewRoomLive] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/enter");
      return;
    }

    const [meRes, profilesRes, roomsRes, logsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, pseudo, email, credits, is_vip, is_admin, is_banned, role, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, pseudo, email, credits, is_vip, is_admin, is_banned, role, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("rooms")
        .select("id, title, description, is_live, is_vip, members_count, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_logs")
        .select("id, actor_id, action, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (meRes.error) {
      setError(meRes.error.message);
      setLoading(false);
      return;
    }

    const me = (meRes.data as ProfileRow | null) ?? null;
    const isAdmin = Boolean(me?.is_admin || me?.role === "admin");

    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    setAdminProfile(me);
    setProfiles((profilesRes.data as ProfileRow[]) ?? []);
    setRooms((roomsRes.data as RoomRow[]) ?? []);
    setLogs((logsRes.data as AdminLogRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createLog(
    actorId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: string
  ) {
    await supabase.from("admin_logs").insert({
      actor_id: actorId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details: details ?? null,
    });
  }

  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((p) =>
      [
        p.pseudo ?? "",
        p.email ?? "",
        p.id ?? "",
        p.role ?? "",
        p.is_vip ? "vip" : "",
        p.is_admin ? "admin" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [profiles, userSearch]);

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return rooms;

    return rooms.filter((r) =>
      [r.title ?? "", r.description ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [rooms, roomSearch]);

  const selectedUser = useMemo(
    () => profiles.find((p) => p.id === selectedUserId) ?? null,
    [profiles, selectedUserId]
  );

  const totalUsers = profiles.length;
  const vipUsers = profiles.filter((p) => Boolean(p.is_vip)).length;
  const adminUsers = profiles.filter((p) => Boolean(p.is_admin || p.role === "admin")).length;
  const bannedUsers = profiles.filter((p) => Boolean(p.is_banned)).length;
  const liveRooms = rooms.filter((r) => Boolean(r.is_live)).length;
  const vipRooms = rooms.filter((r) => Boolean(r.is_vip)).length;
  const totalCredits = profiles.reduce((sum, p) => sum + Number(p.credits ?? 0), 0);

  async function toggleVip(user: ProfileRow) {
    if (!adminProfile?.id) return;

    const nextValue = !user.is_vip;
    const ok = window.confirm(
      nextValue
        ? `Donner le VIP à ${user.pseudo || user.email || "cet utilisateur"} ?`
        : `Retirer le VIP à ${user.pseudo || user.email || "cet utilisateur"} ?`
    );
    if (!ok) return;

    setBusy(`vip-${user.id}`);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_vip: nextValue })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        nextValue ? "grant_vip" : "remove_vip",
        "profile",
        user.id,
        user.pseudo || user.email || user.id
      );

      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, is_vip: nextValue } : p))
      );

      setMessage(nextValue ? "VIP activé." : "VIP retiré.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur VIP.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAdmin(user: ProfileRow) {
    if (!adminProfile?.id) return;

    const nextValue = !Boolean(user.is_admin);
    const ok = window.confirm(
      nextValue
        ? `Donner les droits admin à ${user.pseudo || user.email || "cet utilisateur"} ?`
        : `Retirer les droits admin à ${user.pseudo || user.email || "cet utilisateur"} ?`
    );
    if (!ok) return;

    setBusy(`admin-${user.id}`);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_admin: nextValue,
          role: nextValue ? "admin" : "member",
        })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        nextValue ? "grant_admin" : "remove_admin",
        "profile",
        user.id,
        user.pseudo || user.email || user.id
      );

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === user.id
            ? { ...p, is_admin: nextValue, role: nextValue ? "admin" : "member" }
            : p
        )
      );

      setMessage(nextValue ? "Admin activé." : "Admin retiré.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur admin.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBan(user: ProfileRow) {
    if (!adminProfile?.id) return;

    const nextValue = !Boolean(user.is_banned);
    const ok = window.confirm(
      nextValue
        ? `Bannir ${user.pseudo || user.email || "cet utilisateur"} ?`
        : `Débannir ${user.pseudo || user.email || "cet utilisateur"} ?`
    );
    if (!ok) return;

    setBusy(`ban-${user.id}`);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: nextValue })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        nextValue ? "ban_user" : "unban_user",
        "profile",
        user.id,
        user.pseudo || user.email || user.id
      );

      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, is_banned: nextValue } : p))
      );

      setMessage(nextValue ? "Utilisateur banni." : "Utilisateur débanni.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur ban.");
    } finally {
      setBusy(null);
    }
  }

  async function adjustCredits() {
    if (!adminProfile?.id) return;
    if (!selectedUser) {
      setError("Choisis un utilisateur.");
      return;
    }

    const amount = Number(creditsInput);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("Entre un montant valide, ex: 100 ou -50.");
      return;
    }

    const nextCredits = Math.max(0, Number(selectedUser.credits ?? 0) + amount);
    const ok = window.confirm(
      `Modifier les crédits de ${selectedUser.pseudo || selectedUser.email || "cet utilisateur"} à ${nextCredits} ?`
    );
    if (!ok) return;

    setBusy("credits");
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ credits: nextCredits })
        .eq("id", selectedUser.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        "adjust_credits",
        "profile",
        selectedUser.id,
        `${selectedUser.pseudo || selectedUser.email || selectedUser.id} => ${nextCredits}`
      );

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === selectedUser.id ? { ...p, credits: nextCredits } : p
        )
      );

      setMessage("Crédits mis à jour.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur crédits.");
    } finally {
      setBusy(null);
    }
  }

  async function createRoom() {
    if (!adminProfile?.id) return;
    setBusy("create-room");
    setError("");
    setMessage("");

    try {
      const title = newRoomTitle.trim();
      if (!title) {
        throw new Error("Le titre du salon est requis.");
      }

      const { error } = await supabase.from("rooms").insert({
        title,
        description: newRoomDescription.trim() || null,
        is_live: newRoomLive,
        is_vip: newRoomVip,
        members_count: 0,
      });

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        "create_room",
        "room",
        null,
        title
      );

      setNewRoomTitle("");
      setNewRoomDescription("");
      setNewRoomVip(false);
      setNewRoomLive(false);

      setMessage("Salon créé.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création salon.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRoom(room: RoomRow) {
    if (!adminProfile?.id) return;

    const ok = window.confirm(
      `Supprimer définitivement le salon "${room.title || "Sans titre"}" ?`
    );
    if (!ok) return;

    setBusy(`delete-room-${room.id}`);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.from("rooms").delete().eq("id", room.id);
      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        "delete_room",
        "room",
        room.id,
        room.title || room.id
      );

      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      setMessage("Salon supprimé.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression salon.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleRoomLive(room: RoomRow) {
    if (!adminProfile?.id) return;
    setBusy(`live-room-${room.id}`);
    setError("");
    setMessage("");

    try {
      const nextValue = !Boolean(room.is_live);

      const { error } = await supabase
        .from("rooms")
        .update({ is_live: nextValue })
        .eq("id", room.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        nextValue ? "room_live_on" : "room_live_off",
        "room",
        room.id,
        room.title || room.id
      );

      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_live: nextValue } : r))
      );

      setMessage(nextValue ? "Salon mis en live." : "Salon retiré du live.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur live salon.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleRoomVip(room: RoomRow) {
    if (!adminProfile?.id) return;

    const nextValue = !Boolean(room.is_vip);
    const ok = window.confirm(
      nextValue
        ? `Rendre le salon "${room.title || "Sans titre"}" VIP ?`
        : `Retirer le mode VIP du salon "${room.title || "Sans titre"}" ?`
    );
    if (!ok) return;

    setBusy(`vip-room-${room.id}`);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_vip: nextValue })
        .eq("id", room.id);

      if (error) throw new Error(error.message);

      await createLog(
        adminProfile.id,
        nextValue ? "room_vip_on" : "room_vip_off",
        "room",
        room.id,
        room.title || room.id
      );

      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_vip: nextValue } : r))
      );

      setMessage(nextValue ? "Salon VIP activé." : "Salon VIP retiré.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur VIP salon.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="h-[650px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          <div className="h-[650px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Admin
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Contrôle complet de la plateforme
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
              Utilisateurs, salons, crédits, VIP, bans et logs, avec confirmations avant les actions lourdes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Admin connecté</p>
            <p className="mt-1 text-lg font-black text-white">
              {adminProfile?.pseudo || adminProfile?.email || "Administrateur"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={totalUsers} />
        <StatCard label="VIP" value={vipUsers} />
        <StatCard label="Admins" value={adminUsers} />
        <StatCard label="Bannis" value={bannedUsers} />
        <StatCard label="Salons" value={rooms.length} />
        <StatCard label="Salons live" value={liveRooms} />
        <StatCard label="Salons VIP" value={vipRooms} />
        <StatCard label="Crédits totaux" value={totalCredits} />
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Utilisateurs</h2>
                <p className="mt-1 text-sm text-white/58">
                  Recherche, sélection et actions rapides.
                </p>
              </div>

              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Chercher un utilisateur..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35 md:max-w-sm"
              />
            </div>

            <div className="mt-5 max-h-[480px] space-y-3 overflow-auto pr-1">
              {filteredProfiles.map((user) => {
                const selected = selectedUserId === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cx(
                      "w-full rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-rose-400/25 bg-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-white">
                          {user.pseudo || "Sans pseudo"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {user.email || user.id}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {user.is_admin ? (
                          <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
                            ADMIN
                          </span>
                        ) : null}
                        {user.is_vip ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                            VIP
                          </span>
                        ) : null}
                        {user.is_banned ? (
                          <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
                            BANNI
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/58">
                      <span>Crédits : {user.credits ?? 0}</span>
                      <span>Rôle : {user.role || "member"}</span>
                      <span>Créé : {formatDate(user.created_at)}</span>
                    </div>
                  </button>
                );
              })}

              {filteredProfiles.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  Aucun utilisateur trouvé.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Salons</h2>
                <p className="mt-1 text-sm text-white/58">
                  Création, live, VIP et suppression.
                </p>
              </div>

              <input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Chercher un salon..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35 md:max-w-sm"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {room.title || "Salon"}
                      </h3>
                      <p className="mt-1 text-sm text-white/55">
                        {room.description || "Sans description"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/45">
                        <span>{room.members_count ?? 0} présent(s)</span>
                        <span>{formatDate(room.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy === `live-room-${room.id}`}
                        onClick={() => toggleRoomLive(room)}
                        className={cx(
                          "rounded-xl px-3 py-2 text-xs font-bold transition",
                          room.is_live
                            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border border-white/10 bg-white/10 text-white/70"
                        )}
                      >
                        {busy === `live-room-${room.id}` ? "..." : room.is_live ? "LIVE" : "OFF"}
                      </button>

                      <button
                        type="button"
                        disabled={busy === `vip-room-${room.id}`}
                        onClick={() => toggleRoomVip(room)}
                        className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-300 transition"
                      >
                        {busy === `vip-room-${room.id}` ? "..." : "VIP"}
                      </button>

                      <button
                        type="button"
                        disabled={busy === `delete-room-${room.id}`}
                        onClick={() => deleteRoom(room)}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition"
                      >
                        {busy === `delete-room-${room.id}` ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRooms.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  Aucun salon trouvé.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <h2 className="text-2xl font-black text-white">Actions utilisateur</h2>
            <p className="mt-1 text-sm text-white/58">
              Sélectionne un membre à gauche pour agir dessus.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Cible</p>
                <p className="mt-2 text-sm font-bold text-white">
                  {selectedUser
                    ? `${selectedUser.pseudo || "Sans pseudo"} — ${selectedUser.email || selectedUser.id}`
                    : "Aucun utilisateur sélectionné"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Ajuster les crédits
                </label>
                <input
                  value={creditsInput}
                  onChange={(e) => setCreditsInput(e.target.value)}
                  placeholder="Ex: 100 ou -50"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
                />
              </div>

              <button
                type="button"
                disabled={busy === "credits" || !selectedUser}
                onClick={adjustCredits}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-black text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {busy === "credits" ? "Traitement..." : "Modifier les crédits"}
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!selectedUser || busy === `vip-${selectedUser?.id}`}
                  onClick={() => selectedUser && toggleVip(selectedUser)}
                  className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-500/15 disabled:opacity-60"
                >
                  {selectedUser?.is_vip ? "Retirer VIP" : "Donner VIP"}
                </button>

                <button
                  type="button"
                  disabled={!selectedUser || busy === `admin-${selectedUser?.id}`}
                  onClick={() => selectedUser && toggleAdmin(selectedUser)}
                  className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                >
                  {selectedUser?.is_admin ? "Retirer admin" : "Donner admin"}
                </button>

                <button
                  type="button"
                  disabled={!selectedUser || busy === `ban-${selectedUser?.id}`}
                  onClick={() => selectedUser && toggleBan(selectedUser)}
                  className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  {selectedUser?.is_banned ? "Débannir" : "Bannir"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <h2 className="text-2xl font-black text-white">Créer un salon</h2>

            <div className="mt-5 space-y-4">
              <input
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="Titre du salon"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
              />

              <textarea
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="Description"
                className="min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
              />

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={newRoomLive}
                  onChange={(e) => setNewRoomLive(e.target.checked)}
                />
                Salon en live à la création
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={newRoomVip}
                  onChange={(e) => setNewRoomVip(e.target.checked)}
                />
                Salon VIP
              </label>

              <button
                type="button"
                disabled={busy === "create-room"}
                onClick={createRoom}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 text-sm font-black text-black transition hover:opacity-95 disabled:opacity-60"
              >
                {busy === "create-room" ? "Création..." : "Créer le salon"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <h2 className="text-2xl font-black text-white">Logs admin</h2>
            <p className="mt-1 text-sm text-white/58">
              Historique récent des actions sensibles.
            </p>

            <div className="mt-5 max-h-[380px] space-y-3 overflow-auto pr-1">
              {logs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  Aucun log pour l’instant.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-bold text-white">{log.action}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {log.target_type || "—"} • {log.target_id || "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/60">{log.details || "—"}</p>
                    <p className="mt-2 text-xs text-white/35">{formatDate(log.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
