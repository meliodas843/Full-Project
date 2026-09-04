import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import { API_BASE } from "../../../lib/config";

function initials(value) {
  const text = String(
    value || "",
  ).trim();

  if (!text) return "U";

  if (text.includes("@")) {
    return text
      .slice(0, 2)
      .toUpperCase();
  }

  const words = text
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "mn-MN",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function Topbar({
  className = "",
  onNavigate = () => {},
} = {}) {
  const navigate = useNavigate();

  const [openBell, setOpenBell] =
    useState(false);

  const [openProfile, setOpenProfile] =
    useState(false);

  const [pending, setPending] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const bellMenuRef = useRef(null);
  const profileMenuRef =
    useRef(null);

  const [bellPosition, setBellPosition] =
    useState(null);

  const [
    profilePosition,
    setProfilePosition,
  ] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "user",
        ) || "{}",
      );
    } catch {
      return {};
    }
  }, []);

  const fullName =
    `${user?.firstName || user?.first_name || ""} ${
      user?.lastName ||
      user?.last_name ||
      ""
    }`.trim() ||
    user?.name ||
    user?.email ||
    "User";

  const role =
    user?.role === "super_admin"
      ? "Administrator"
      : "Хэрэглэгч";

  function menuPosition(
    reference,
    width,
  ) {
    const rect =
      reference.current?.getBoundingClientRect();

    if (!rect) return null;

    return {
      top: rect.bottom + 10,
      left: Math.max(
        14,
        rect.right - width,
      ),
      width,
    };
  }

  async function loadNotifications() {
    const token =
      localStorage.getItem("token");

    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/events/requests`,
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
        setPending([]);
        return;
      }

      if (
        Array.isArray(
          data?.pending,
        )
      ) {
        setPending(data.pending);
      } else if (
        Array.isArray(data)
      ) {
        setPending(data);
      } else {
        setPending([]);
      }
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleBell() {
    const next = !openBell;

    setOpenBell(next);
    setOpenProfile(false);

    if (next) {
      setBellPosition(
        menuPosition(
          bellRef,
          310,
        ),
      );

      loadNotifications();
    }
  }

  function toggleProfile() {
    const next =
      !openProfile;

    setOpenProfile(next);
    setOpenBell(false);

    if (next) {
      setProfilePosition(
        menuPosition(
          profileRef,
          250,
        ),
      );
    }
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    onNavigate();

    navigate("/login", {
      replace: true,
    });
  }

  useEffect(() => {
    function handleClick(event) {
      const target =
        event.target;

      if (
        bellRef.current?.contains(
          target,
        ) ||
        profileRef.current?.contains(
          target,
        ) ||
        bellMenuRef.current?.contains(
          target,
        ) ||
        profileMenuRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setOpenBell(false);
      setOpenProfile(false);
    }

    function handleKey(event) {
      if (
        event.key === "Escape"
      ) {
        setOpenBell(false);
        setOpenProfile(false);
      }
    }

    window.addEventListener(
      "resize",
      () => {
        setOpenBell(false);
        setOpenProfile(false);
      },
    );

    document.addEventListener(
      "mousedown",
      handleClick,
    );

    document.addEventListener(
      "keydown",
      handleKey,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick,
      );

      document.removeEventListener(
        "keydown",
        handleKey,
      );
    };
  }, []);

  return (
    <header
      className={`rgTopbar ${className}`.trim()}
    >
      <div className="rgTopbarSpacer" />

      <div className="rgTopbarActions">
        <button
          ref={bellRef}
          type="button"
          className="rgBellButton"
          onClick={toggleBell}
        >
          <FiBell />

          {pending.length > 0 && (
            <span className="rgBellDot">
              {pending.length}
            </span>
          )}
        </button>

        <button
          ref={profileRef}
          type="button"
          className="rgTopProfile"
          onClick={toggleProfile}
        >
          <span className="rgTopAvatar">
            {initials(fullName)}
          </span>

          <span className="rgTopUserText">
            <strong>
              {user?.email ||
                fullName}
            </strong>

            <small>
              {role}
            </small>
          </span>

          <FiChevronDown className="rgTopChevron" />
        </button>
      </div>

      {openBell &&
        bellPosition &&
        createPortal(
          <div
            ref={bellMenuRef}
            className="rgDropdown rgNotificationDropdown"
            style={{
              position: "fixed",
              top: bellPosition.top,
              left: bellPosition.left,
              width:
                bellPosition.width,
            }}
          >
            <h4>
              Notifications
            </h4>

            {loading ? (
              <div className="rgNotificationEmpty">
                Уншиж байна...
              </div>
            ) : pending.length ===
              0 ? (
              <div className="rgNotificationEmpty">
                Шинэ мэдэгдэл
                байхгүй.
              </div>
            ) : (
              <div className="rgNotificationList">
                {pending
                  .slice(0, 6)
                  .map((item) => (
                    <button
                      type="button"
                      className="rgNotificationItem"
                      key={
                        item.id
                      }
                      onClick={() => {
                        setOpenBell(
                          false,
                        );

                        navigate(
                          "/user/calendar",
                        );
                      }}
                    >
                      <span className="rgNotificationBullet" />

                      <span>
                        <strong>
                          {item.title ||
                            "Meeting request"}
                        </strong>

                        {item.start_time && (
                          <small>
                            {formatDateTime(
                              item.start_time,
                            )}
                          </small>
                        )}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>,
          document.body,
        )}

      {openProfile &&
        profilePosition &&
        createPortal(
          <div
            ref={profileMenuRef}
            className="rgDropdown rgProfileDropdown"
            style={{
              position: "fixed",
              top:
                profilePosition.top,
              left:
                profilePosition.left,
              width:
                profilePosition.width,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenProfile(
                  false,
                );

                navigate(
                  "/user/profile",
                );
              }}
            >
              <FiUser />

              Профайл
            </button>

            <button
              type="button"
              className="danger"
              onClick={logout}
            >
              <FiLogOut />

              Гарах
            </button>
          </div>,
          document.body,
        )}
    </header>
  );
}