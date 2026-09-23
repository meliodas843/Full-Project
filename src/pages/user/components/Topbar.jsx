import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiTrash2,
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

function getNotificationType(item) {
  const raw = String(
    item?.type ||
      item?.notification_type ||
      item?.kind ||
      item?.request_type ||
      "",
  )
    .trim()
    .toLowerCase();

  if (
    raw.includes("meeting")
  ) {
    return "meeting";
  }

  if (
    raw.includes("event")
  ) {
    return "event";
  }

  if (
    item?.meeting_id ||
    item?.meeting?.id
  ) {
    return "meeting";
  }

  if (
    item?.event_id ||
    item?.event?.id
  ) {
    return "event";
  }

  return "event";
}

function getEventId(item) {
  return (
    item?.event_id ||
    item?.event?.id ||
    item?.eventId ||
    item?.eventID ||
    null
  );
}

function getMeetingId(item) {
  return (
    item?.meeting_id ||
    item?.meeting?.id ||
    item?.meetingId ||
    item?.meetingID ||
    null
  );
}

function getRequestId(item) {
  return (
    item?.request_id ||
    item?.notification_id ||
    item?.id ||
    null
  );
}

function getNotificationKey(
  item,
  index,
) {
  return (
    item?.request_id ||
    item?.notification_id ||
    item?.id ||
    item?.event_id ||
    item?.meeting_id ||
    `${item?.title || "notification"}-${index}`
  );
}

export default function Topbar({
  className = "",
  onNavigate = () => {},
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [openBell, setOpenBell] =
    useState(false);

  const [
    openProfile,
    setOpenProfile,
  ] = useState(false);

  const [
    pending,
    setPending,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const bellMenuRef = useRef(null);
  const profileMenuRef =
    useRef(null);

  const [
    bellPosition,
    setBellPosition,
  ] = useState(null);

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

    const maxLeft =
      window.innerWidth -
      width -
      14;

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

  const loadNotifications =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "token",
        );

      if (!token) {
        setPending([]);
        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/events/requests`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "token",
          );

          localStorage.removeItem(
            "user",
          );

          localStorage.removeItem(
            "role",
          );

          setPending([]);

          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return;
        }

        const data =
          await response
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
          setPending(
            data.pending,
          );
        } else if (
          Array.isArray(
            data?.notifications,
          )
        ) {
          setPending(
            data.notifications,
          );
        } else if (
          Array.isArray(
            data?.requests,
          )
        ) {
          setPending(
            data.requests,
          );
        } else if (
          Array.isArray(data)
        ) {
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

  async function deleteNotification(
    item,
    event,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const token =
      localStorage.getItem(
        "token",
      );

    if (!token) {
      navigate(
        "/login",
        {
          replace: true,
        },
      );

      return;
    }

    const requestId =
      getRequestId(item);

    if (!requestId) {
      console.error(
        "Notification ID not found:",
        item,
      );

      return;
    }

    setDeletingId(
      requestId,
    );

    try {
      const response =
        await fetch(
          `${API_BASE}/api/events/requests/${requestId}`,
          {
            method: "DELETE",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        response.status ===
        401
      ) {
        localStorage.removeItem(
          "token",
        );

        localStorage.removeItem(
          "user",
        );

        localStorage.removeItem(
          "role",
        );

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
          data?.message ||
            data?.error ||
            "Failed to delete notification",
        );

        return;
      }

      setPending(
        (current) =>
          current.filter(
            (
              notification,
            ) => {
              const id =
                getRequestId(
                  notification,
                );

              return (
                String(id) !==
                String(
                  requestId,
                )
              );
            },
          ),
      );
    } catch (error) {
      console.error(
        "Delete notification error:",
        error,
      );
    } finally {
      setDeletingId(
        null,
      );
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval =
      window.setInterval(
        () => {
          loadNotifications();
        },
        30000,
      );

    function handleFocus() {
      loadNotifications();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
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
      window.clearInterval(
        interval,
      );

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
  }, [
    location.pathname,
    loadNotifications,
  ]);

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
  }, [
    openBell,
    pending.length,
  ]);

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
    const next =
      !openBell;

    setOpenBell(next);
    setOpenProfile(false);

    if (next) {
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
    localStorage.removeItem(
      "user",
    );

    localStorage.removeItem(
      "token",
    );

    localStorage.removeItem(
      "role",
    );

    setPending([]);

    onNavigate();

    navigate(
      "/login",
      {
        replace: true,
      },
    );
  }

  function openNotification(
    item,
  ) {
    setOpenBell(false);

    const type =
      getNotificationType(
        item,
      );

    const eventId =
      getEventId(item);

    const meetingId =
      getMeetingId(item);

    onNavigate();

    if (
      type === "meeting"
    ) {
      navigate(
        "/user/calendar",
        {
          state: {
            meetingId,
            notification:
              item,
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
            notification:
              item,
          },
        },
      );

      return;
    }

    navigate(
      "/user/event",
      {
        state: {
          notification:
            item,
        },
      },
    );
  }

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
          onClick={
            toggleBell
          }
          aria-label="Notifications"
          aria-expanded={
            openBell
          }
        >
          <FiBell />

          {pending.length >
            0 && (
            <span className="rgBellDot">
              {pending.length >
              99
                ? "99+"
                : pending.length}
            </span>
          )}
        </button>

        <button
          ref={profileRef}
          type="button"
          className="rgTopProfile"
          onClick={
            toggleProfile
          }
          aria-expanded={
            openProfile
          }
        >
          <span className="rgTopAvatar">
            {initials(
              fullName,
            )}
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
            ref={
              bellMenuRef
            }
            className="rgDropdown rgNotificationDropdown"
            style={{
              position:
                "fixed",

              top:
                bellPosition.top,

              left:
                bellPosition.left,

              width:
                bellPosition.width,

              zIndex: 99999,
            }}
          >
            <div className="rgNotificationHeader">
              <h4>
                Notifications
              </h4>

              {loading &&
                pending.length >
                  0 && (
                  <span className="rgNotificationRefreshing">
                    Уншиж
                    байна...
                  </span>
                )}
            </div>

            {loading &&
            pending.length ===
              0 ? (
              <div className="rgNotificationEmpty">
                Уншиж
                байна...
              </div>
            ) : pending.length ===
              0 ? (
              <div className="rgNotificationEmpty">
                Шинэ
                мэдэгдэл
                байхгүй.
              </div>
            ) : (
              <div className="rgNotificationList">
                {pending
                  .slice(
                    0,
                    10,
                  )
                  .map(
                    (
                      item,
                      index,
                    ) => {
                      const requestId =
                        getRequestId(
                          item,
                        );

                      const isDeleting =
                        String(
                          deletingId,
                        ) ===
                        String(
                          requestId,
                        );

                      return (
                        <div
                          className="rgNotificationItemRow"
                          key={getNotificationKey(
                            item,
                            index,
                          )}
                        >
                          <button
                            type="button"
                            className="rgNotificationItem"
                            onClick={() =>
                              openNotification(
                                item,
                              )
                            }
                          >
                            <span className="rgNotificationBullet" />

                            <span className="rgNotificationContent">
                              <strong>
                                {item.title ||
                                  item.event_title ||
                                  item.meeting_title ||
                                  "Notification"}
                              </strong>

                              {(item.start_time ||
                                item.created_at) && (
                                <small>
                                  {formatDateTime(
                                    item.start_time ||
                                      item.created_at,
                                  )}
                                </small>
                              )}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="rgNotificationDelete"
                            title="Мэдэгдэл устгах"
                            aria-label="Мэдэгдэл устгах"
                            disabled={
                              isDeleting
                            }
                            onClick={(
                              event,
                            ) =>
                              deleteNotification(
                                item,
                                event,
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      );
                    },
                  )}
              </div>
            )}
          </div>,
          document.body,
        )}

      {openProfile &&
        profilePosition &&
        createPortal(
          <div
            ref={
              profileMenuRef
            }
            className="rgDropdown rgProfileDropdown"
            style={{
              position:
                "fixed",

              top:
                profilePosition.top,

              left:
                profilePosition.left,

              width:
                profilePosition.width,

              zIndex: 99999,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenProfile(
                  false,
                );

                onNavigate();

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
              onClick={
                logout
              }
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