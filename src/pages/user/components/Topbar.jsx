import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const bellMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [bellPos, setBellPos] = useState(null);
  const [profilePos, setProfilePos] = useState(null);

  function getMenuPos(ref, width = 260) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      top: rect.bottom + 12,
      left: Math.max(12, rect.right - width),
      width,
    };
  }

  useEffect(() => {
    function onDown(e) {
      const target = e.target;

      const insideTopbar = wrapRef.current?.contains(target);
      const insideBellMenu = bellMenuRef.current?.contains(target);
      const insideProfileMenu = profileMenuRef.current?.contains(target);

      if (!insideTopbar && !insideBellMenu && !insideProfileMenu) {
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
    localStorage.removeItem("role");

    setOpenProfile(false);
    onNavigate();
    navigate("/login", { replace: true });
  }

  function toggleBell() {
    const next = !openBell;
    setOpenBell(next);
    setOpenProfile(false);

    if (next) {
      setBellPos(getMenuPos(bellRef, 360));
      loadPendingRequests();
    }
  }

  function toggleProfile() {
    const next = !openProfile;
    setOpenProfile(next);
    setOpenBell(false);

    if (next) {
      setProfilePos(getMenuPos(profileRef, 260));
    }
  }

  const pendingCount = pending.length;

  return (
    <header className={`app-topbar ${className}`.trim()} ref={wrapRef}>
      <div className="app-topbar-right">
        <div className="tb-pop">
          <button
            ref={bellRef}
            className="app-topbar-icon"
            type="button"
            aria-label="Notifications"
            onClick={toggleBell}
          >
            🔔
            {pendingCount > 0 && <span className="tb-badge">{pendingCount}</span>}
          </button>

          {openBell &&
            bellPos &&
            createPortal(
              <div
                ref={bellMenuRef}
                className="tb-menu tb-menu-wide"
                style={{
                  position: "fixed",
                  top: bellPos.top,
                  left: bellPos.left,
                  width: bellPos.width,
                }}
              >
                <div className="tb-menu-head">
                  <div className="tb-menu-title">Уулзалтын хүсэлт</div>
                  <button className="tb-menu-action" type="button" onClick={loadPendingRequests}>
                    Шинэчлэх
                  </button>
                </div>

                {loadingBell ? (
                  <div className="tb-empty">Унших…</div>
                ) : pendingCount === 0 ? (
                  <div className="tb-empty">Хүсэлт байхгүй</div>
                ) : (
                  <div className="tb-list">
                    {pending.map((r) => (
                      <button
                        key={r.id}
                        className="tb-item"
                        type="button"
                        onClick={() => {
                          setOpenBell(false);
                          onNavigate();
                          navigate("/user/home#requests");
                        }}
                      >
                        <div className="tb-item-top">
                          <div className="tb-item-title">{r.title || "Meeting"}</div>
                          <div className="tb-item-time">{formatDateTime(r.start_time)}</div>
                        </div>

                        <div className="tb-item-sub">
                          Хэнээс: <strong>{r.from_company || "Unknown"}</strong>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>

        <div className="tb-pop">
          <button
            ref={profileRef}
            className="app-topbar-profile"
            type="button"
            aria-label="Profile"
            onClick={toggleProfile}
          >
            <div className="tb-avatar">D</div>
            <div className="tb-user">
              <div className="tb-name">{name}</div>
              <div className="tb-sub">Хэрэглэгч</div>
            </div>
          </button>

          {openProfile &&
            profilePos &&
            createPortal(
              <div
                ref={profileMenuRef}
                className="tb-menu"
                style={{
                  position: "fixed",
                  top: profilePos.top,
                  left: profilePos.left,
                  width: profilePos.width,
                }}
              >
                <button
                  className="tb-menu-item"
                  type="button"
                  onClick={() => {
                    setOpenProfile(false);
                    onNavigate();
                    navigate("/user/profile");
                  }}
                >
                  Тохиргоо / Профайл
                </button>

                <button className="tb-menu-item danger" type="button" onClick={handleLogout}>
                  Гарах
                </button>
              </div>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
}