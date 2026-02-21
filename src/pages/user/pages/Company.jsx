import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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

export default function Company() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [user, setUser] = useState(null);

  // Optional fallback from JWT payload
  const tokenUser = useMemo(() => {
    try {
      const token = getToken();
      if (!token) return null;
      const [, payload] = token.split(".");
      if (!payload) return null;
      const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      return json || null;
    } catch {
      return null;
    }
  }, []);

  async function fetchProfile() {
    try {
      setErrMsg("");
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

      setUser(data?.user || null);
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
    `${display?.firstName || ""} ${display?.lastName || ""}`.trim() ||
    display?.full_name ||
    display?.name ||
    display?.email ||
    "";

  const email = display?.email || "";
  const avatarUrl = display?.avatar_url || display?.photo_url || "";
  const initials = getInitials(fullName || email);

  return (
      <UserShell title="Company">
        <div className="profileGrid">
          <aside className="profileNav">
            <div className="profileNavCard">
              <NavLink
                to="/user/profile"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Profile
              </NavLink>

              <NavLink
                to="/user/password"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Change Password
              </NavLink>

              <NavLink
                to="/user/company"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Company
              </NavLink>

              <NavLink
                to="/user/bill"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Bill
              </NavLink>
            </div>
          </aside>

          {/* RIGHT */}
          <main className="profileMain">
            {errMsg ? <div className="profileAlert profileAlertError">{errMsg}</div> : null}

            {loading ? (
              <div className="profileEmpty">Loading profile…</div>
            ) : !display ? (
              <div className="profileEmpty">No profile data.</div>
            ) : (
              <section className="profileCard">
                <div className="profileMainHeader">
                  <h3 className="profileTitle">Company</h3>
                </div>

                {/* TOP */}
                <div className="profileCardTop">
                  <div className="profileIdentity">
                    <div className="profileAvatar" aria-label="Profile picture">
                      {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span>{initials}</span>}
                    </div>

                    <div className="profileIdentityText">
                      <div className="profileName">{safeText(fullName)}</div>
                      <div className="profileEmail">{safeText(email)}</div>
                    </div>
                  </div>

                  <button
                    className="profileIconBtn"
                    type="button"
                    title="Edit profile"
                    onClick={() => navigate("/user/edit")}
                  >
                    Edit
                  </button>
                </div>

                {/* PERSONAL INFO */}
                <div className="profileSection">
                  <div className="profileSectionTitle">Personal info</div>

                  <div className="profileInfoGrid">
                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">Company</div>
                      <div className="profileInfoValue">{safeText(display.company_name)}</div>
                    </div>

                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">Phone</div>
                      <div className="profileInfoValue">{safeText(display.phone)}</div>
                    </div>

                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">Role</div>
                      <div className="profileInfoValue">{safeText(display.role)}</div>
                    </div>

                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">User ID</div>
                      <div className="profileInfoValue">{safeText(display.id)}</div>
                    </div>

                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">Created</div>
                      <div className="profileInfoValue">
                        {formatDate(display.created_at || display.created_time)}
                      </div>
                    </div>

                    <div className="profileInfoItem">
                      <div className="profileInfoLabel">Google ID</div>
                      <div className="profileInfoValue">{safeText(display.google_id)}</div>
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
