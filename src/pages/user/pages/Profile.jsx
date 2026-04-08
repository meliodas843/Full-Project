import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function safeText(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "?";
  if (s.includes("@")) return s[0].toUpperCase();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    company_name: "",
  });

  const tokenUser = useMemo(() => {
    try {
      const token = getToken();
      if (!token) return null;
      const [, payload] = token.split(".");
      if (!payload) return null;
      const json = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      );
      return json || null;
    } catch {
      return null;
    }
  }, []);

  function fillForm(profile) {
    setForm({
      firstName: profile?.firstName || profile?.first_name || "",
      lastName: profile?.lastName || profile?.last_name || "",
      phone: profile?.phone || "",
      company_name: profile?.company_name || "",
    });
  }

  async function fetchProfile() {
    try {
      setErrMsg("");
      setSuccessMsg("");
      setLoading(true);

      const token = getToken();
      if (!token) {
        setUser(null);
        setErrMsg("Please login first.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUser(null);
        setErrMsg(data?.message || "Failed to load profile");
        return;
      }

      const profileUser = data?.user || null;
      setUser(profileUser);
      fillForm(profileUser);
    } catch (e) {
      console.error(e);
      setUser(null);
      setErrMsg("Network error while loading profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  const display = user || tokenUser || null;

  const fullName =
    `${display?.firstName || display?.first_name || ""} ${display?.lastName || display?.last_name || ""}`.trim() ||
    display?.full_name ||
    display?.name ||
    display?.email ||
    "";

  const email = display?.email || "";
  const avatarUrl = display?.avatar_url || display?.photo_url || "";
  const initials = getInitials(fullName || email);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEdit() {
    setErrMsg("");
    setSuccessMsg("");
    fillForm(display || {});
    setIsEditing(true);
  }

  function handleCancel() {
    fillForm(display || {});
    setErrMsg("");
    setSuccessMsg("");
    setIsEditing(false);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setErrMsg("");
      setSuccessMsg("");

      const token = getToken();
      if (!token) {
        setErrMsg("Please login first.");
        return;
      }

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        company_name: form.company_name,
      };

      const res = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.message || "Failed to save profile");
        return;
      }

      const updatedUser = data?.user || { ...user, ...payload };
      setUser(updatedUser);
      fillForm(updatedUser);
      setIsEditing(false);
      setSuccessMsg("Бүртгэл амжилттай хадгалагдлаа.");
    } catch (e) {
      console.error(e);
      setErrMsg("Интернэтэд холбогдоход алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UserShell title="My Profile">
      <div className="profileGrid">
        <aside className="profileNav">
          <div className="profileNavCard">
            <NavLink
              to="/user/profile"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Профайл
            </NavLink>

            <NavLink
              to="/user/password"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Нууц үг солих
            </NavLink>

            <NavLink
              to="/user/company"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Компанийн мэдээлэл
            </NavLink>

            <NavLink
              to="/user/bill"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Төлбөрийн мэдээлэл
            </NavLink>
          </div>
        </aside>

        <main className="profileMain">
          {errMsg ? (
            <div className="profileAlert profileAlertError">{errMsg}</div>
          ) : null}
          {successMsg ? (
            <div className="profileAlert profileAlertSuccess">{successMsg}</div>
          ) : null}

          {loading ? (
            <div className="profileEmpty">Профайл уншиж байна...</div>
          ) : !display ? (
            <div className="profileEmpty">Профайл олдсонгүй.</div>
          ) : (
            <section className="profileCard">
              <div className="profileMainHeader">
                <h3 className="profileTitle">Профайл</h3>
              </div>

              <div className="profileCardTop">
                <div className="profileIdentity">
                  <div className="profileAvatar" aria-label="Profile picture">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className="profileIdentityText">
                    <div className="profileName">
                      {isEditing
                        ? `${form.firstName} ${form.lastName}`.trim() || "—"
                        : safeText(fullName)}
                    </div>
                    <div className="profileEmail">{safeText(email)}</div>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    className="profileIconBtn"
                    type="button"
                    title="Edit profile"
                    onClick={handleEdit}
                  >
                    Засах
                  </button>
                ) : (
                  <div className="profileActionRow">
                    <button
                      className="profileSaveBtn"
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="profileCancelBtn"
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Цуцлах
                    </button>
                  </div>
                )}
              </div>

              <div className="profileSection">
                <div className="profileSectionTitle">Хувийн мэдээлэл</div>

                <div className="profileInfoGrid">
                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Нэр</div>
                    <div className="profileInfoValue">
                      {isEditing ? (
                        <input
                          className="profileInput"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                        />
                      ) : (
                        safeText(display.firstName || display.first_name)
                      )}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Овог</div>
                    <div className="profileInfoValue">
                      {isEditing ? (
                        <input
                          className="profileInput"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                        />
                      ) : (
                        safeText(display.lastName || display.last_name)
                      )}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Компани</div>
                    <div className="profileInfoValue">
                      {isEditing ? (
                        <input
                          className="profileInput"
                          name="company_name"
                          value={form.company_name}
                          onChange={handleChange}
                        />
                      ) : (
                        safeText(display.company_name)
                      )}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Утас</div>
                    <div className="profileInfoValue">
                      {isEditing ? (
                        <input
                          className="profileInput"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                        />
                      ) : (
                        safeText(display.phone)
                      )}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Роль</div>
                    <div className="profileInfoValue">
                      {safeText(display.role)}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Хэрэглэгч ID</div>
                    <div className="profileInfoValue">
                      {safeText(display.id)}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Үүссэн</div>
                    <div className="profileInfoValue">
                      {formatDate(display.created_at || display.created_time)}
                    </div>
                  </div>

                  <div className="profileInfoItem">
                    <div className="profileInfoLabel">Google ID</div>
                    <div className="profileInfoValue">
                      {safeText(display.google_id)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </UserShell>
  );
}
