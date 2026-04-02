"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  is_admin?: boolean | null;
  vip_level?: string | null;
};

type SalonRoomRow = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  tag?: string | null;
  capacity?: number | null;
  is_active?: boolean | null;
  is_vip_only?: boolean | null;
  cover_image?: string | null;
  room_type?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type SalonRoomCountRow = {
  room_id: string;
  participants_online?: number | null;
  spectators_online?: number | null;
};

type RoomForm = {
  name: string;
  slug: string;
  description: string;
  tag: string;
  capacity: string;
  is_active: boolean;
  is_vip_only: boolean;
  cover_image: string;
  room_type: string;
  sort_order: string;
};

const emptyForm: RoomForm = {
  name: "",
  slug: "",
  description: "",
  tag: "",
  capacity: "25",
  is_active: true,
  is_vip_only: false,
  cover_image: "",
  room_type: "public",
  sort_order: "0",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA");
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [rooms, setRooms] = useState<SalonRoomRow[]>([]);
  const [countsMap, setCountsMap] = useState<Record<string, number>>({});

  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, is_admin, vip_level")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setErrorMsg(profileError?.message || "Impossible de charger le profil admin.");
        setLoading(false);
        return;
      }

      if (!profileData.is_admin) {
        router.push("/dashboard");
        return;
      }

      setProfile(profileData as ProfileRow);

      const [{ data: roomRows, error: roomError }, { data: countRows }] =
        await Promise.all([
          supabase
            .from("salon_rooms")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
          supabase.from("salon_room_counts").select("*"),
        ]);

      if (roomError) {
        setErrorMsg(roomError.message || "Impossible de charger les rooms.");
        setLoading(false);
        return;
      }

      const map: Record<string, number> = {};
      (countRows || []).forEach((row: any) => {
        map[String(row.room_id)] =
          Number(row.participants_online || 0) + Number(row.spectators_online || 0);
      });

      setCountsMap(map);
      setRooms((roomRows || []) as SalonRoomRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement admin.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(room: SalonRoomRow) {
    setEditingId(room.id);
    setForm({
      name: room.name || "",
      slug: room.slug || "",
      description: room.description || "",
      tag: room.tag || "",
      capacity: String(room.capacity ?? 25),
      is_active: room.is_active ?? true,
      is_vip_only: room.is_vip_only ?? false,
      cover_image: room.cover_image || "",
      room_type: room.room_type || "public",
      sort_order: String(room.sort_order ?? 0),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function patchForm<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();

      const name = form.name.trim();
      const slug = slugify(form.slug || form.name);
      const description = form.description.trim();
      const tag = form.tag.trim();
      const coverImage = form.cover_image.trim();
      const capacity = Math.max(2, Number(form.capacity || 25));
      const sortOrder = Number(form.sort_order || 0);
      const roomType = form.room_type.trim() || "public";

      if (!name) {
        setErrorMsg("Le nom de la room est obligatoire.");
        setSaving(false);
        return;
      }

      if (!slug) {
        setErrorMsg("Le slug est invalide.");
        setSaving(false);
        return;
      }

      const payload = {
        name,
        slug,
        description: description || null,
        tag: tag || null,
        capacity,
        is_active: form.is_active,
        is_vip_only: form.is_vip_only,
        cover_image: coverImage || null,
        room_type: roomType,
        sort_order: sortOrder,
      };

      if (editingId) {
        const { error } = await supabase
          .from("salon_rooms")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          setErrorMsg(error.message || "Impossible de modifier la room.");
          setSaving(false);
          return;
        }

        setNotice("Room modifiée.");
      } else {
        const { error } = await supabase.from("salon_rooms").insert(payload);

        if (error) {
          setErrorMsg(error.message || "Impossible de créer la room.");
          setSaving(false);
          return;
        }

        setNotice("Room créée.");
      }

      resetForm();
      await loadPage();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur sauvegarde room.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoomActive(room: SalonRoomRow) {
    try {
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("salon_rooms")
        .update({
          is_active: !(room.is_active ?? true),
        })
        .eq("id", room.id);

      if (error) {
        setErrorMsg(error.message || "Impossible de changer le statut.");
        return;
      }

      setNotice(
        room.is_active ? "Room désactivée." : "Room réactivée."
      );
      await loadPage();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur statut room.");
    }
  }

  async function toggleRoomVip(room: SalonRoomRow) {
    try {
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("salon_rooms")
        .update({
          is_vip_only: !(room.is_vip_only ?? false),
        })
        .eq("id", room.id);

      if (error) {
        setErrorMsg(error.message || "Impossible de changer le mode VIP.");
        return;
      }

      setNotice(
        room.is_vip_only ? "Room passée en publique." : "Room passée en VIP."
      );
      await loadPage();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur mode VIP.");
    }
  }

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;

    return rooms.filter((room) => {
      const text = [
        room.name,
        room.slug,
        room.description,
        room.tag,
        room.room_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [rooms, search]);

  const totalOnline = useMemo(() => {
    return Object.values(countsMap).reduce((sum, n) => sum + Number(n || 0), 0);
  }, [countsMap]);

  const activeCount = useMemo(() => {
    return rooms.filter((r) => r.is_active).length;
  }, [rooms]);

  if (loading) {
    return (
      <main className="admin-page">
        <style>{css}</style>
        <div className="admin-loading">
          <div className="admin-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <style>{css}</style>

      <div className="admin-bg admin-bg-a" />
      <div className="admin-bg admin-bg-b" />
      <div className="admin-noise" />
      <div className="admin-orb admin-orb-a" />
      <div className="admin-orb admin-orb-b" />

      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <div className="admin-kicker">Admin rooms</div>
            <h1 className="admin-title">Gestion essentielle des salons</h1>
            <p className="admin-subtitle">
              Crée, modifie, active, désactive et passe les rooms en VIP sans toucher au SQL à chaque fois.
            </p>
          </div>

          <div className="admin-actionsTop">
            <button className="admin-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="admin-navBtn gold" type="button" onClick={() => router.push("/salons")}>
              Voir salons
            </button>
          </div>
        </header>

        <section className="admin-stats">
          <div className="admin-statCard">
            <span>Admin</span>
            <strong>{profile?.username || "Admin"}</strong>
          </div>
          <div className="admin-statCard">
            <span>Rooms total</span>
            <strong>{rooms.length}</strong>
          </div>
          <div className="admin-statCard">
            <span>Rooms actives</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="admin-statCard">
            <span>En ligne</span>
            <strong>{totalOnline}</strong>
          </div>
        </section>

        {notice ? <div className="admin-notice">{notice}</div> : null}
        {errorMsg ? <div className="admin-error">{errorMsg}</div> : null}

        <section className="admin-grid">
          <article className="admin-card formCard">
            <div className="admin-cardShine" />

            <div className="admin-cardHeader">
              <div>
                <div className="admin-cardKicker">
                  {editingId ? "Modification" : "Nouvelle room"}
                </div>
                <h2 className="admin-cardTitle">
                  {editingId ? "Modifier la room" : "Créer une room"}
                </h2>
              </div>

              {editingId ? (
                <button className="admin-miniBtn" type="button" onClick={resetForm}>
                  Annuler
                </button>
              ) : null}
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <label className="admin-field">
                <span>Nom</span>
                <input
                  value={form.name}
                  onChange={(e) => patchForm("name", e.target.value)}
                  placeholder="Velvet Lounge"
                />
              </label>

              <div className="admin-row">
                <label className="admin-field">
                  <span>Slug</span>
                  <input
                    value={form.slug}
                    onChange={(e) => patchForm("slug", e.target.value)}
                    placeholder="velvet-lounge"
                  />
                </label>

                <label className="admin-field">
                  <span>Tag</span>
                  <input
                    value={form.tag}
                    onChange={(e) => patchForm("tag", e.target.value)}
                    placeholder="Velvet / Lounge / Hot"
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => patchForm("description", e.target.value)}
                  placeholder="Salle premium à l’ambiance sombre, élégante et adulte."
                />
              </label>

              <div className="admin-row triple">
                <label className="admin-field">
                  <span>Capacité</span>
                  <input
                    type="number"
                    min={2}
                    value={form.capacity}
                    onChange={(e) => patchForm("capacity", e.target.value)}
                  />
                </label>

                <label className="admin-field">
                  <span>Type</span>
                  <select
                    value={form.room_type}
                    onChange={(e) => patchForm("room_type", e.target.value)}
                  >
                    <option value="public">public</option>
                    <option value="vip">vip</option>
                    <option value="lounge">lounge</option>
                    <option value="private">private</option>
                    <option value="special">special</option>
                  </select>
                </label>

                <label className="admin-field">
                  <span>Ordre</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => patchForm("sort_order", e.target.value)}
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Image de couverture (URL)</span>
                <input
                  value={form.cover_image}
                  onChange={(e) => patchForm("cover_image", e.target.value)}
                  placeholder="https://..."
                />
              </label>

              <div className="admin-toggleGrid">
                <button
                  type="button"
                  className={`admin-toggle ${form.is_active ? "on" : ""}`}
                  onClick={() => patchForm("is_active", !form.is_active)}
                >
                  <span>{form.is_active ? "Active" : "Inactive"}</span>
                </button>

                <button
                  type="button"
                  className={`admin-toggle vip ${form.is_vip_only ? "on" : ""}`}
                  onClick={() => patchForm("is_vip_only", !form.is_vip_only)}
                >
                  <span>{form.is_vip_only ? "VIP" : "Publique"}</span>
                </button>
              </div>

              <div className="admin-formActions">
                <button className="admin-mainBtn" type="submit" disabled={saving}>
                  {saving
                    ? "Sauvegarde..."
                    : editingId
                    ? "Enregistrer les changements"
                    : "Créer la room"}
                </button>

                <button className="admin-secondaryBtn" type="button" onClick={resetForm}>
                  Reset
                </button>
              </div>
            </form>
          </article>

          <article className="admin-card listCard">
            <div className="admin-cardShine" />

            <div className="admin-cardHeader">
              <div>
                <div className="admin-cardKicker">Rooms existantes</div>
                <h2 className="admin-cardTitle">Liste des salons</h2>
              </div>
            </div>

            <div className="admin-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher une room..."
              />
            </div>

            <div className="admin-roomList">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => {
                  const online = countsMap[room.id] || 0;

                  return (
                    <div key={room.id} className="admin-roomCard">
                      <div className="admin-roomTop">
                        <div>
                          <div className="admin-roomTitle">{room.name}</div>
                          <div className="admin-roomMeta">
                            /{room.slug || "sans-slug"} • {room.room_type || "public"} • {room.tag || "sans-tag"}
                          </div>
                        </div>

                        <div className="admin-badgeRow">
                          <span className={`admin-badge ${room.is_active ? "active" : "inactive"}`}>
                            {room.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className={`admin-badge ${room.is_vip_only ? "vip" : "public"}`}>
                            {room.is_vip_only ? "VIP" : "Public"}
                          </span>
                        </div>
                      </div>

                      <p className="admin-roomDesc">
                        {room.description || "Aucune description."}
                      </p>

                      <div className="admin-roomStats">
                        <div className="admin-roomStat">
                          <span>En ligne</span>
                          <strong>{online}</strong>
                        </div>
                        <div className="admin-roomStat">
                          <span>Capacité</span>
                          <strong>{room.capacity || "—"}</strong>
                        </div>
                        <div className="admin-roomStat">
                          <span>Créée</span>
                          <strong>{formatDate(room.created_at)}</strong>
                        </div>
                      </div>

                      <div className="admin-roomActions">
                        <button className="admin-miniBtn gold" type="button" onClick={() => startEdit(room)}>
                          Modifier
                        </button>

                        <button className="admin-miniBtn" type="button" onClick={() => void toggleRoomVip(room)}>
                          {room.is_vip_only ? "Passer public" : "Passer VIP"}
                        </button>

                        <button className="admin-miniBtn" type="button" onClick={() => void toggleRoomActive(room)}>
                          {room.is_active ? "Désactiver" : "Réactiver"}
                        </button>

                        <button className="admin-miniBtn" type="button" onClick={() => router.push(`/salons/${room.id}`)}>
                          Ouvrir
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="admin-empty">Aucune room trouvée.</div>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

const css = `
.admin-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.admin-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.admin-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.admin-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}

.admin-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.admin-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.admin-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.admin-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.admin-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.admin-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.admin-kicker{
  display:inline-flex;
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

.admin-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.admin-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
  font-size:17px;
}

.admin-actionsTop{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.admin-navBtn{
  min-height:46px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  font-weight:800;
  cursor:pointer;
}
.admin-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.admin-stats{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
}

.admin-statCard{
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(212,175,55,0.14);
}
.admin-statCard span{
  display:block;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.admin-statCard strong{
  display:block;
  margin-top:10px;
  font-size:28px;
  color:#fff2cb;
}

.admin-notice,
.admin-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.admin-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.admin-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.admin-grid{
  margin-top:24px;
  display:grid;
  grid-template-columns:480px 1fr;
  gap:24px;
}

.admin-card{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(16px);
  box-shadow:
    0 24px 80px rgba(0,0,0,0.40),
    inset 0 1px 0 rgba(255,255,255,0.05);
}
.admin-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:adminShine 7s linear infinite;
  pointer-events:none;
}
@keyframes adminShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.admin-cardHeader{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
  flex-wrap:wrap;
}
.admin-cardKicker{
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
.admin-cardTitle{
  margin:16px 0 0;
  font-size:34px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}

.admin-form{
  margin-top:22px;
  display:grid;
  gap:14px;
}
.admin-field{
  display:grid;
  gap:10px;
}
.admin-field span{
  font-size:13px;
  color:rgba(255,255,255,0.76);
}
.admin-field input,
.admin-field textarea,
.admin-field select{
  width:100%;
  min-height:54px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.admin-field textarea{
  min-height:120px;
  padding:14px 16px;
  resize:vertical;
}
.admin-field input::placeholder,
.admin-field textarea::placeholder{
  color:rgba(255,255,255,0.42);
}

.admin-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}
.admin-row.triple{
  grid-template-columns:1fr 1fr 1fr;
}

.admin-toggleGrid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

.admin-toggle{
  min-height:54px;
  border:none;
  border-radius:18px;
  cursor:pointer;
  font-weight:900;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
}
.admin-toggle.on{
  background:linear-gradient(90deg,#2f8f58,#59d38b);
  color:#071b10;
  border-color:transparent;
}
.admin-toggle.vip.on{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}

.admin-formActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.admin-mainBtn,
.admin-secondaryBtn,
.admin-miniBtn{
  min-height:54px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.admin-mainBtn{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.admin-secondaryBtn,
.admin-miniBtn{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.admin-miniBtn{
  min-height:42px;
  padding:10px 14px;
}
.admin-miniBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.admin-search{
  margin-top:20px;
}
.admin-search input{
  width:100%;
  min-height:54px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}

.admin-roomList{
  margin-top:20px;
  display:grid;
  gap:16px;
}

.admin-roomCard{
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.admin-roomTop{
  display:flex;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
  align-items:flex-start;
}
.admin-roomTitle{
  font-size:22px;
  font-weight:900;
}
.admin-roomMeta{
  margin-top:6px;
  color:rgba(255,245,220,0.64);
  font-size:13px;
}

.admin-badgeRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.admin-badge{
  display:inline-flex;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:900;
}
.admin-badge.active{
  background:rgba(47,143,88,0.16);
  color:#b9ffd4;
  border:1px solid rgba(47,143,88,0.24);
}
.admin-badge.inactive{
  background:rgba(255,255,255,0.08);
  color:#ddd;
  border:1px solid rgba(255,255,255,0.10);
}
.admin-badge.vip{
  background:rgba(212,175,55,0.16);
  color:#f6dc86;
  border:1px solid rgba(212,175,55,0.24);
}
.admin-badge.public{
  background:rgba(80,170,255,0.14);
  color:#cdeeff;
  border:1px solid rgba(80,170,255,0.22);
}

.admin-roomDesc{
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
}

.admin-roomStats{
  margin-top:16px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}
.admin-roomStat{
  padding:12px 14px;
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.admin-roomStat span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.52);
}
.admin-roomStat strong{
  display:block;
  margin-top:8px;
  color:#fff3c2;
  font-size:15px;
}

.admin-roomActions{
  margin-top:16px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.admin-empty{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}

.admin-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.admin-loader{
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

@media (max-width: 1180px){
  .admin-grid{
    grid-template-columns:1fr;
  }

  .admin-stats{
    grid-template-columns:1fr 1fr;
  }
}

@media (max-width: 760px){
  .admin-title{
    font-size:40px;
  }

  .admin-subtitle{
    font-size:16px;
  }

  .admin-row,
  .admin-row.triple,
  .admin-toggleGrid,
  .admin-roomStats{
    grid-template-columns:1fr;
  }

  .admin-stats{
    grid-template-columns:1fr;
  }

  .admin-card{
    padding:20px;
    border-radius:24px;
  }
}
`;
