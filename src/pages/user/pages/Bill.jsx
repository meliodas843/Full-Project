import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function valueOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function initials(value) {
  const text = String(value || "").trim();

  if (!text) return "U";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Bill() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProfile() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    try {
      setLoading(true);
      setError("");

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
        setUser(null);
        return;
      }

      setUser(data?.user || data);
    } catch {
      setError(
        "Сервертэй холбогдож чадсангүй.",
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const fullName = useMemo(() => {
    if (!user) return "";

    return (
      `${user.firstName || user.first_name || ""} ${
        user.lastName || user.last_name || ""
      }`.trim() ||
      user.full_name ||
      user.name ||
      user.email ||
      ""
    );
  }, [user]);

  return (
    <UserShell title="Төлбөр">
      <main className="rgProfilePage">
        <aside className="rgProfileTabs">
          <NavLink to="/user/profile">
            Профайл
          </NavLink>

          <NavLink to="/user/password">
            Нууц үг солих
          </NavLink>

          <NavLink to="/user/company">
            Компани
          </NavLink>

          <NavLink
            to="/user/bill"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
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
              {error || "Профайл олдсонгүй."}
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
                        fullName || user.email,
                      )
                    )}
                  </div>

                  <div>
                    <h2>
                      {valueOrDash(fullName)}
                    </h2>

                    <a
                      href={`mailto:${user.email}`}
                    >
                      {valueOrDash(user.email)}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  className="rgEditProfileButton"
                  onClick={() =>
                    navigate("/user/profile")
                  }
                >
                  Засах
                </button>
              </header>

              {error && (
                <div className="rgProfileAlert error">
                  {error}
                </div>
              )}

              <section className="rgProfileInfo">
                <h3>ТӨЛБӨРИЙН МЭДЭЭЛЭЛ</h3>

                <div className="rgProfileInfoGrid">
                  <div className="rgProfileField">
                    <label>Компани</label>

                    <strong>
                      {valueOrDash(
                        user.company_name,
                      )}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Утас</label>

                    <strong>
                      {valueOrDash(user.phone)}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Эрх</label>

                    <strong>
                      {valueOrDash(user.role)}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>
                      Хэрэглэгчийн ID
                    </label>

                    <strong>
                      {valueOrDash(
                        user.id || user.user_id,
                      )}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>
                      Бүртгүүлсэн огноо
                    </label>

                    <strong>
                      {formatDate(
                        user.created_at ||
                          user.created_time,
                      )}
                    </strong>
                  </div>

                  <div className="rgProfileField">
                    <label>Google ID</label>

                    <strong>
                      {valueOrDash(
                        user.google_id,
                      )}
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