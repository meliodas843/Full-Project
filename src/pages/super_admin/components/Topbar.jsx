import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/config";

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Topbar({ className = "", onNavigate = () => {} } = {}) {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const name = user?.name || user?.email || "User";

  const [openProfile, setOpenProfile] = useState(false);
  const [openBell, setOpenBell] = useState(false);

  const [pending, setPending] = useState([]);
  const [loadingBell, setLoadingBell] = useState(false);

  const wrapRef = useRef(null);

  // close menus on outside click / Esc
  useEffect(() => {
    function onDown(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        setOpenProfile(false);
        setOpenBell(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpenProfile(false);
        setOpenBell(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function loadPendingRequests() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingBell(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setPending([]);
        return;
      }

      const data = await res.json().catch(() => ({ pending: [] }));
      setPending(Array.isArray(data?.pending) ? data.pending : []);
    } finally {
      setLoadingBell(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
    onNavigate(); // ✅ close drawer if this topbar is inside drawer
  }

  function toggleBell() {
    const next = !openBell;
    setOpenBell(next);
    setOpenProfile(false);
    if (next) loadPendingRequests();
  }

  function toggleProfile() {
    const next = !openProfile;
    setOpenProfile(next);
    setOpenBell(false);
  }

  const pendingCount = pending.length;

  return (
    <header className={`app-topbar ${className}`.trim()} ref={wrapRef}>
      <div className="app-topbar-left" />

      <div className="app-topbar-right">
        {/* Notifications */}
        <div className="tb-pop">
          <button
            className="app-topbar-icon"
            type="button"
            aria-label="Notifications"
            onClick={toggleBell}
          >
            🔔
            {pendingCount > 0 && (
              <span className="tb-badge">{pendingCount}</span>
            )}
          </button>

          {openBell && (
            <div className="tb-menu tb-menu-wide">
              <div className="tb-menu-head">
                <div className="tb-menu-title">Requested meetings</div>
                <button
                  className="tb-menu-action"
                  type="button"
                  onClick={loadPendingRequests}
                >
                  Refresh
                </button>
              </div>

              {loadingBell ? (
                <div className="tb-empty">Loading…</div>
              ) : pendingCount === 0 ? (
                <div className="tb-empty">No pending requests</div>
              ) : (
                <div className="tb-list">
                  {pending.map((r) => (
                    <button
                      key={r.id}
                      className="tb-item"
                      type="button"
                      onClick={() => {
                        setOpenBell(false);

                        // ✅ GO TO REQUESTS (Home -> Requests section)
                        // Add id="requests" to Requests card OR just keep this and scroll manually.
                        navigate("/user/home#requests");

                        onNavigate(); // ✅ close drawer after navigation
                      }}
                    >
                      <div className="tb-item-top">
                        <div className="tb-item-title">
                          {r.title || "Meeting"}
                        </div>
                        <div className="tb-item-time">
                          {formatDateTime(r.start_time)}
                        </div>
                      </div>
                      <div className="tb-item-sub">
                        From: <strong>{r.from_company || "Unknown"}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="tb-pop">
          <button
            className="app-topbar-profile"
            type="button"
            aria-label="Profile"
            onClick={toggleProfile}
          >
            <div className="tb-avatar">D</div>
            <div className="tb-user">
              <div className="tb-name">{name}</div>
              <div className="tb-sub">User</div>
            </div>
          </button>

          {openProfile && (
            <div className="tb-menu">
              <button
                className="tb-menu-item"
                type="button"
                onClick={() => {
                  setOpenProfile(false);

                  // ✅ FIX: keep user layout (not /profile)
                  navigate("/user/profile");

                  onNavigate(); // ✅ close drawer after navigation
                }}
              >
                Settings / Profile
              </button>

              <button
                className="tb-menu-item danger"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
