import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { useLocation, useNavigate } from "react-router-dom";

import { UserAvatar } from "./IdentityImage";

import { FiBell, FiChevronDown, FiLogOut, FiUser } from "react-icons/fi";

import { API_BASE } from "../../../lib/config";
import { cleanValue, getEventId, getMeetingId, getNotificationKey, getNotificationStorageKey, getNotificationType, getRequestId, loadSeenNotificationKeys, resolveOrganizationImage, stableOrganizationLogo } from "./Topbar.helpers";
import NotificationDropdown from "./NotificationDropdown";


export default function Topbar({
  className = "",

  onNavigate = () => {},
} = {}) {
  const navigate = useNavigate();

  const location = useLocation();

  const [openBell, setOpenBell] = useState(false);

  const [openProfile, setOpenProfile] = useState(false);

  const [pending, setPending] = useState([]);

  const [seenNotificationKeys, setSeenNotificationKeys] = useState(
    loadSeenNotificationKeys,
  );

  const [loading, setLoading] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const bellRef = useRef(null);

  const profileRef = useRef(null);

  const bellMenuRef = useRef(null);

  const profileMenuRef = useRef(null);

  const [bellPosition, setBellPosition] = useState(null);

  const [profilePosition, setProfilePosition] = useState(null);

  const [organizationLogo, setOrganizationLogo] = useState("");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const refreshUserIdentity = useCallback(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    } catch {
      setUser({});
    }
  }, []);

  useEffect(() => {
    refreshUserIdentity();

    const handleProfileUpdated = () => {
      refreshUserIdentity();
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === "user") {
        refreshUserIdentity();
      }
    };

    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshUserIdentity]);

  const fullName =
    `${user?.firstName || user?.first_name || ""} ${
      user?.lastName || user?.last_name || ""
    }`.trim() ||
    user?.name ||
    user?.email ||
    "User";

  const role = user?.role === "super_admin" ? "Administrator" : "Хэрэглэгч";

  const accountType = cleanValue(
    user?.accountType ||
      user?.account_type ||
      user?.type ||
      localStorage.getItem("accountType") ||
      localStorage.getItem("account_type"),
  ).toLowerCase();

  const isOrganizationAccount = accountType === "organization";

  const organizationIdentityKey =
    user?.id ||
    user?.user_id ||
    user?.email ||
    fullName ||
    "registra-organization";

  const organizationFallbackLogo = useMemo(
    () =>
      stableOrganizationLogo(`${organizationIdentityKey}-organization-logo`),

    [organizationIdentityKey],
  );

  const topbarOrganizationLogo =
    resolveOrganizationImage(organizationLogo) || organizationFallbackLogo;

  const loadOrganizationIdentity = useCallback(async () => {
    if (!isOrganizationAccount) {
      setOrganizationLogo("");

      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");

    if (!token) {
      setOrganizationLogo("");

      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/organizations/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setOrganizationLogo("");

        return;
      }

      const data = await response.json().catch(() => ({}));

      const organization =
        data?.organization || data?.company || data?.data || data || {};

      setOrganizationLogo(
        organization?.logo_url ||
          organization?.logoUrl ||
          organization?.logo ||
          "",
      );
    } catch {
      setOrganizationLogo("");
    }
  }, [isOrganizationAccount]);

  useEffect(() => {
    loadOrganizationIdentity();

    const handleOrganizationUpdated = () => {
      loadOrganizationIdentity();
    };

    window.addEventListener("organization-updated", handleOrganizationUpdated);

    return () => {
      window.removeEventListener(
        "organization-updated",

        handleOrganizationUpdated,
      );
    };
  }, [loadOrganizationIdentity]);

  function menuPosition(
    reference,

    width,
  ) {
    const rect = reference.current?.getBoundingClientRect();

    if (!rect) return null;

    const maxLeft = window.innerWidth - width - 14;

    return {
      top: rect.bottom + 10,

      left: Math.min(
        Math.max(
          14,

          rect.right - width,
        ),

        Math.max(
          14,

          maxLeft,
        ),
      ),

      width,
    };
  }

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setPending([]);

      return;
    }

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

      if (response.status === 401) {
        localStorage.removeItem("token");

        localStorage.removeItem("user");

        localStorage.removeItem("role");

        setPending([]);

        navigate(
          "/login",

          {
            replace: true,
          },
        );

        return;
      }

      const data = await response

        .json()

        .catch(() => ({}));

      if (!response.ok) {
        setPending([]);

        return;
      }

      if (Array.isArray(data?.pending)) {
        setPending(data.pending);
      } else if (Array.isArray(data?.notifications)) {
        setPending(data.notifications);
      } else if (Array.isArray(data?.requests)) {
        setPending(data.requests);
      } else if (Array.isArray(data)) {
        setPending(data);
      } else {
        setPending([]);
      }
    } catch (error) {
      console.error(
        "Notification load error:",

        error,
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const unreadPending = useMemo(() => {
    const seen = new Set(seenNotificationKeys.map((value) => String(value)));

    return pending.filter((item, index) => {
      const key = String(getNotificationKey(item, index));

      return !seen.has(key);
    });
  }, [pending, seenNotificationKeys]);

  const markCurrentNotificationsViewed = useCallback(() => {
    if (pending.length === 0) {
      return;
    }

    const currentKeys = pending.map((item, index) =>
      String(getNotificationKey(item, index)),
    );

    setSeenNotificationKeys((current) => {
      const next = Array.from(
        new Set([...current.map((value) => String(value)), ...currentKeys]),
      );

      localStorage.setItem(getNotificationStorageKey(), JSON.stringify(next));

      return next;
    });
  }, [pending]);

  useEffect(() => {
    if (openBell && pending.length > 0) {
      markCurrentNotificationsViewed();
    }
  }, [openBell, pending, markCurrentNotificationsViewed]);

  async function deleteNotification(
    item,

    event,
  ) {
    event.preventDefault();

    event.stopPropagation();

    const token = localStorage.getItem("token");

    if (!token) {
      navigate(
        "/login",

        {
          replace: true,
        },
      );

      return;
    }

    const requestId = getRequestId(item);

    if (!requestId) {
      console.error(
        "Notification ID not found:",

        item,
      );

      return;
    }

    setDeletingId(requestId);

    try {
      const response = await fetch(
        `${API_BASE}/api/events/requests/${requestId}`,

        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",
          },
        },
      );

      const data = await response

        .json()

        .catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("token");

        localStorage.removeItem("user");

        localStorage.removeItem("role");

        navigate(
          "/login",

          {
            replace: true,
          },
        );

        return;
      }

      if (!response.ok) {
        console.error(
          data?.message || data?.error || "Failed to delete notification",
        );

        return;
      }

      setPending((current) =>
        current.filter((notification) => {
          const id = getRequestId(notification);

          return String(id) !== String(requestId);
        }),
      );
    } catch (error) {
      console.error(
        "Delete notification error:",

        error,
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(
      () => {
        loadNotifications();
      },

      30000,
    );

    function handleFocus() {
      loadNotifications();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }

    window.addEventListener(
      "focus",

      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",

      handleVisibility,
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",

        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",

        handleVisibility,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [location.pathname, loadNotifications]);

  useEffect(() => {
    if (!openBell) {
      return;
    }

    setBellPosition(
      menuPosition(
        bellRef,

        340,
      ),
    );
  }, [openBell, pending.length]);

  useEffect(() => {
    if (!openProfile) {
      return;
    }

    setProfilePosition(
      menuPosition(
        profileRef,

        250,
      ),
    );
  }, [openProfile]);

  useEffect(() => {
    function handleClick(event) {
      const target = event.target;

      if (
        bellRef.current?.contains(target) ||
        profileRef.current?.contains(target) ||
        bellMenuRef.current?.contains(target) ||
        profileMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOpenBell(false);

      setOpenProfile(false);
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        setOpenBell(false);

        setOpenProfile(false);
      }
    }

    function handleResize() {
      setOpenBell(false);

      setOpenProfile(false);
    }

    document.addEventListener(
      "mousedown",

      handleClick,
    );

    document.addEventListener(
      "keydown",

      handleKey,
    );

    window.addEventListener(
      "resize",

      handleResize,
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

      window.removeEventListener(
        "resize",

        handleResize,
      );
    };
  }, []);

  function toggleBell() {
    const next = !openBell;

    setOpenBell(next);

    setOpenProfile(false);

    if (next) {
      markCurrentNotificationsViewed();

      setBellPosition(
        menuPosition(
          bellRef,

          340,
        ),
      );

      loadNotifications();
    }
  }

  function toggleProfile() {
    const next = !openProfile;

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

    setPending([]);

    onNavigate();

    navigate(
      "/login",

      {
        replace: true,
      },
    );
  }

  function openNotification(item) {
    setOpenBell(false);

    const type = getNotificationType(item);

    const eventId = getEventId(item);

    const meetingId = getMeetingId(item);

    onNavigate();

    if (type === "meeting") {
      navigate(
        "/user/calendar",

        {
          state: {
            meetingId,

            notification: item,
          },
        },
      );

      return;
    }

    if (eventId) {
      navigate(
        `/user/event/${eventId}`,

        {
          state: {
            eventId,

            notification: item,
          },
        },
      );

      return;
    }

    navigate(
      "/user/event",

      {
        state: {
          notification: item,
        },
      },
    );
  }

  return (
    <header className={`rgTopbar ${className}`.trim()}>
      <div className="rgTopbarSpacer" />

      <div className="rgTopbarActions">
        <button
          ref={bellRef}
          type="button"
          className="rgBellButton"
          onClick={toggleBell}
          aria-label="Notifications"
          aria-expanded={openBell}
        >
          <FiBell />

          {unreadPending.length > 0 && (
            <span className="rgBellDot">
              {unreadPending.length > 99 ? "99+" : unreadPending.length}
            </span>
          )}
        </button>

        <button
          ref={profileRef}
          type="button"
          className="rgTopProfile"
          onClick={toggleProfile}
          aria-expanded={openProfile}
        >
          {isOrganizationAccount ? (
            <img
              className="rgTopOrganizationLogo"
              src={topbarOrganizationLogo}
              alt={fullName}
              width={42}
              height={42}
              onError={(event) => {
                event.currentTarget.onerror = null;

                event.currentTarget.src = organizationFallbackLogo;
              }}
              style={{
                width: 42,

                height: 42,

                flex: "0 0 42px",

                display: "block",

                objectFit: "contain",

                borderRadius: 10,
              }}
            />
          ) : (
            <UserAvatar
              name={fullName}
              email={user?.email}
              src={
                user?.avatar_url ||
                user?.avatar ||
                user?.profile_image ||
                user?.profile_image_url ||
                ""
              }
              apiBase={API_BASE}
              size={42}
            />
          )}

          <span className="rgTopUserText">
            <strong>{user?.email || fullName}</strong>

            <small>{role}</small>
          </span>

          <FiChevronDown className="rgTopChevron" />
        </button>
      </div>

      {openBell &&
        bellPosition &&
        createPortal(
          <NotificationDropdown
            bellMenuRef={bellMenuRef}
            bellPosition={bellPosition}
            deleteNotification={deleteNotification}
            deletingId={deletingId}
            loading={loading}
            openNotification={openNotification}
            pending={pending}
          />,

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

              top: profilePosition.top,

              left: profilePosition.left,

              width: profilePosition.width,

              zIndex: 99999,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenProfile(false);

                onNavigate();

                navigate("/user/profile");
              }}
            >
              <FiUser />
              Профайл
            </button>

            <button type="button" className="danger" onClick={logout}>
              <FiLogOut />
              Гарах
            </button>
          </div>,

          document.body,
        )}
    </header>
  );
}
