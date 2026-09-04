import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function valueOrDash(value) {
  const text = String(
    value ?? "",
  ).trim();

  return text || "—";
}

function initials(value) {
  const text = String(
    value || "",
  ).trim();

  if (!text) {
    return "U";
  }

  const parts = text
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [form, setForm] =
    useState({
      firstName: "",
      lastName: "",
      company_name: "",
      phone: "",
    });

  function fill(profile) {
    setForm({
      firstName:
        profile?.firstName ||
        profile?.first_name ||
        "",
      lastName:
        profile?.lastName ||
        profile?.last_name ||
        "",
      company_name:
        profile?.company_name ||
        "",
      phone: String(
        profile?.phone || "",
      )
        .replace(/\D/g, "")
        .slice(0, 8),
    });
  }

  async function loadProfile() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/profile/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.message ||
            "Профайл уншихад алдаа гарлаа.",
        );

        return;
      }

      const profile =
        data?.user || data;

      setUser(profile);
      fill(profile);
    } catch {
      setError(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const fullName = useMemo(() => {
    if (!user) {
      return "";
    }

    return (
      `${user.firstName || user.first_name || ""} ${
        user.lastName ||
        user.last_name ||
        ""
      }`.trim() ||
      user.name ||
      user.email ||
      ""
    );
  }, [user]);

  function change(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "phone"
          ? value
              .replace(/\D/g, "")
              .slice(0, 8)
          : value,
    }));
  }

  async function save() {
    if (
      form.phone &&
      !/^\d{8}$/.test(
        form.phone,
      )
    ) {
      setError(
        "Утасны дугаар 8 оронтой байна.",
      );

      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/profile/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName:
              form.firstName.trim(),
            lastName:
              form.lastName.trim(),
            company_name:
              form.company_name.trim(),
            phone: form.phone.trim(),
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.message ||
            "Хадгалахад алдаа гарлаа.",
        );

        return;
      }

      const updated = {
        ...user,
        ...(data?.user || {}),
        firstName:
          form.firstName.trim(),
        lastName:
          form.lastName.trim(),
        company_name:
          form.company_name.trim(),
        phone: form.phone.trim(),
      };

      setUser(updated);

      localStorage.setItem(
        "user",
        JSON.stringify(updated),
      );

      setEditing(false);

      setMessage(
        "Амжилттай хадгаллаа.",
      );
    } catch {
      setError(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <UserShell title="Профайл">
      <main className="rgProfilePage">
        <aside className="rgProfileTabs">
          <NavLink
            to="/user/profile"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Профайл
          </NavLink>

          <NavLink to="/user/password">
            Нууц үг солих
          </NavLink>

          <NavLink to="/user/company">
            Компани
          </NavLink>

          <NavLink to="/user/bill">
            Төлбөр
          </NavLink>
        </aside>

        <section className="rgProfileCard">
          {loading ? (
            <div className="rgProfileState">
              Профайл уншиж байна...
            </div>
          ) : !user ? (
            <div className="rgProfileState">
              Профайл олдсонгүй.
            </div>
          ) : (
            <>
              <header className="rgProfileHeader">
                <div className="rgProfileIdentity">
                  <div className="rgLargeAvatar">
                    {user.avatar_url ||
                    user.photo_url ? (
                      <img
                        src={
                          user.avatar_url ||
                          user.photo_url
                        }
                        alt={fullName}
                      />
                    ) : (
                      initials(
                        fullName ||
                          user.email,
                      )
                    )}
                  </div>

                  <div>
                    <h2>
                      {valueOrDash(
                        fullName,
                      )}
                    </h2>

                    <a
                      href={`mailto:${user.email}`}
                    >
                      {user.email}
                    </a>
                  </div>
                </div>

                {!editing ? (
                  <button
                    type="button"
                    className="rgEditProfileButton"
                    onClick={() => {
                      fill(user);
                      setEditing(true);
                      setError("");
                    }}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="rgProfileActions">
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fill(user);
                        setEditing(
                          false,
                        );
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </header>

              {error && (
                <div className="rgProfileAlert error">
                  {error}
                </div>
              )}

              {message && (
                <div className="rgProfileAlert success">
                  {message}
                </div>
              )}

              <section className="rgProfileInfo">
                <h3>ХУВИЙН МЭДЭЭЛЭЛ</h3>

                <div className="rgProfileInfoGrid">
                  <div className="rgProfileField">
                    <label>Нэр</label>
                    {editing ? (
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={change}
                      />
                    ) : (
                      <strong>
                        {valueOrDash(
                          user.firstName || user.first_name,
                        )}
                      </strong>
                    )}
                  </div>

                  <div className="rgProfileField">
                    <label>Овог</label>
                    {editing ? (
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={change}
                      />
                    ) : (
                      <strong>
                        {valueOrDash(
                          user.lastName || user.last_name,
                        )}
                      </strong>
                    )}
                  </div>

                  <div className="rgProfileField">
                    <label>Компани</label>
                    {editing ? (
                      <input
                        name="company_name"
                        value={form.company_name}
                        onChange={change}
                      />
                    ) : (
                      <strong>
                        {valueOrDash(user.company_name)}
                      </strong>
                    )}
                  </div>

                  <div className="rgProfileField">
                    <label>Утас</label>
                    {editing ? (
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={change}
                      />
                    ) : (
                      <strong>
                        {valueOrDash(user.phone)}
                      </strong>
                    )}
                  </div>

                  <div className="rgProfileField">
                    <label>Эрх</label>
                    <strong>
                      {valueOrDash(user.role)}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Хэрэглэгчийн ID</label>
                    <strong>
                      {valueOrDash(
                        user.id || user.user_id,
                      )}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Бүртгүүлсэн огноо</label>
                    <strong>
                      {formatDate(user.created_at)}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Google ID</label>
                    <strong>
                      {valueOrDash(user.google_id)}
                    </strong>
                  </div>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </UserShell>
  );
}