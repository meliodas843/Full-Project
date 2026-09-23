import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem(
    "token",
  );
}

export default function Notifications() {
  const navigate =
    useNavigate();

  const [tab, setTab] =
    useState("inbox");

  const [
    inbox,
    setInbox,
  ] = useState([]);

  const [
    sent,
    setSent,
  ] = useState([]);

  const [
    accepted,
    setAccepted,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    msg,
    setMsg,
  ] = useState("");

  const authFetch =
    useCallback(
      async (
        url,
        options = {},
      ) => {
        const token =
          getToken();

        if (!token) {
          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return null;
        }

        const res =
          await fetch(
            url,
            {
              ...options,

              headers: {
                ...(options.headers ||
                  {}),

                Authorization: `Bearer ${token}`,
              },
            },
          );

        if (
          res.status ===
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

          return null;
        }

        return res;
      },
      [navigate],
    );

  const loadInbox =
    useCallback(
      async () => {
        const res =
          await authFetch(
            `${API_BASE}/api/meetings/inbox`,
          );

        if (!res) return;

        const data =
          await res
            .json()
            .catch(
              () => [],
            );

        setInbox(
          Array.isArray(
            data,
          )
            ? data
            : [],
        );
      },
      [authFetch],
    );

  const loadSent =
    useCallback(
      async () => {
        const res =
          await authFetch(
            `${API_BASE}/api/meetings/sent`,
          );

        if (!res) return;

        const data =
          await res
            .json()
            .catch(
              () => [],
            );

        setSent(
          Array.isArray(
            data,
          )
            ? data
            : [],
        );
      },
      [authFetch],
    );

  const loadAccepted =
    useCallback(
      async () => {
        const res =
          await authFetch(
            `${API_BASE}/api/meetings/accepted`,
          );

        if (!res) return;

        const data =
          await res
            .json()
            .catch(
              () => [],
            );

        setAccepted(
          Array.isArray(
            data,
          )
            ? data
            : [],
        );
      },
      [authFetch],
    );

  const refreshAll =
    useCallback(
      async (
        showLoading = true,
      ) => {
        try {
          setMsg("");

          if (
            showLoading
          ) {
            setLoading(
              true,
            );
          }

          await Promise.all([
            loadInbox(),
            loadSent(),
            loadAccepted(),
          ]);
        } catch (
          error
        ) {
          console.error(
            error,
          );

          setMsg(
            "Failed to load meetings.",
          );
        } finally {
          if (
            showLoading
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        loadInbox,
        loadSent,
        loadAccepted,
      ],
    );

  useEffect(() => {
    refreshAll();

    const interval =
      window.setInterval(
        () => {
          refreshAll(
            false,
          );
        },
        30000,
      );

    function handleFocus() {
      refreshAll(
        false,
      );
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshAll(
          false,
        );
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
  }, [refreshAll]);

  function fmt(dt) {
    if (!dt) {
      return "";
    }

    const d =
      new Date(dt);

    if (
      Number.isNaN(
        d.getTime(),
      )
    ) {
      return String(dt);
    }

    return d.toLocaleString(
      "mn-MN",
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

  async function acceptMeeting(
    id,
  ) {
    try {
      setMsg("");
      setLoading(true);

      const res =
        await authFetch(
          `${API_BASE}/api/meetings/${id}/accept`,
          {
            method:
              "PATCH",
          },
        );

      if (!res) return;

      const data =
        await res
          .json()
          .catch(
            () => ({}),
          );

      if (!res.ok) {
        setMsg(
          data?.message ||
            "Failed to accept",
        );

        return;
      }

      if (
        data.zoom_join_url
      ) {
        window.open(
          data.zoom_join_url,
          "_blank",
          "noopener,noreferrer",
        );
      }

      await refreshAll(
        false,
      );
    } catch (
      error
    ) {
      console.error(
        error,
      );

      setMsg(
        "Server error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function declineMeeting(
    id,
  ) {
    try {
      setMsg("");
      setLoading(true);

      const res =
        await authFetch(
          `${API_BASE}/api/meetings/${id}/decline`,
          {
            method:
              "PATCH",
          },
        );

      if (!res) return;

      const data =
        await res
          .json()
          .catch(
            () => ({}),
          );

      if (!res.ok) {
        setMsg(
          data?.message ||
            "Failed to decline",
        );

        return;
      }

      await refreshAll(
        false,
      );
    } catch (
      error
    ) {
      console.error(
        error,
      );

      setMsg(
        "Server error",
      );
    } finally {
      setLoading(false);
    }
  }

  const pendingInbox =
    inbox.filter(
      (meeting) =>
        meeting.status ===
        "pending",
    );

  const pendingSent =
    sent.filter(
      (meeting) =>
        meeting.status ===
        "pending",
    );

  return (
    <div className="userLayout">
      <Sidebar />

      <div className="userContent">
        <div className="noti-wrap">
          <div className="noti-head">
            <div>
              <h2 className="noti-title">
                Хүсэлт &
                Уулзалт
              </h2>

              <p className="noti-sub">
                Хүлээгдэж буй |
                Илгээсэн |
                Зөвшөөрөгдсөн
                уулзалтууд.
              </p>
            </div>

            <div className="noti-actions">
              <button
                type="button"
                className="noti-btn"
                onClick={() =>
                  navigate(
                    "/user/meeting",
                  )
                }
              >
                + Уулзалт
                үүсгэх
              </button>

              <button
                type="button"
                className="noti-btn ghost"
                onClick={() =>
                  refreshAll()
                }
              >
                Шинэчлэх
              </button>
            </div>
          </div>

          <div className="noti-tabs">
            <button
              className={
                tab ===
                "inbox"
                  ? "noti-tab active"
                  : "noti-tab"
              }
              onClick={() =>
                setTab(
                  "inbox",
                )
              }
              type="button"
            >
              Хүлээгдэж буй
              (Ирсэн мэйл) (
              {
                pendingInbox.length
              }
              )
            </button>

            <button
              className={
                tab ===
                "sent"
                  ? "noti-tab active"
                  : "noti-tab"
              }
              onClick={() =>
                setTab(
                  "sent",
                )
              }
              type="button"
            >
              Илгээсэн хүсэлт (
              {
                pendingSent.length
              }
              )
            </button>

            <button
              className={
                tab ===
                "accepted"
                  ? "noti-tab active"
                  : "noti-tab"
              }
              onClick={() =>
                setTab(
                  "accepted",
                )
              }
              type="button"
            >
              Миний уулзалтууд (
              {
                accepted.length
              }
              )
            </button>
          </div>

          {msg && (
            <div className="noti-msg">
              {msg}
            </div>
          )}

          {loading ? (
            <div className="noti-empty">
              Уншиж байна...
            </div>
          ) : tab ===
            "inbox" ? (
            <div className="noti-list">
              {pendingInbox.length ===
              0 ? (
                <div className="noti-empty">
                  Хүлээгдэж буй
                  хүсэлт байхгүй
                </div>
              ) : (
                pendingInbox.map(
                  (
                    meeting,
                  ) => (
                    <div
                      className="noti-card"
                      key={
                        meeting.id
                      }
                    >
                      <div className="noti-card-top">
                        <div className="noti-card-title">
                          {meeting.title ||
                            "Meeting"}
                        </div>

                        <div className="noti-card-time">
                          {fmt(
                            meeting.start_time,
                          )}
                        </div>
                      </div>

                      <div className="noti-card-sub">
                        Хэнээс:{" "}
                        <strong>
                          {
                            meeting.creator_email
                          }
                        </strong>
                      </div>

                      {meeting.description && (
                        <div className="noti-card-desc">
                          {
                            meeting.description
                          }
                        </div>
                      )}

                      <div className="noti-card-actions">
                        <button
                          className="noti-small-btn ok"
                          type="button"
                          onClick={() =>
                            acceptMeeting(
                              meeting.id,
                            )
                          }
                        >
                          Зөвшөөрөх
                        </button>

                        <button
                          className="noti-small-btn danger"
                          type="button"
                          onClick={() =>
                            declineMeeting(
                              meeting.id,
                            )
                          }
                        >
                          Цуцлах
                        </button>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          ) : tab ===
            "sent" ? (
            <div className="noti-list">
              {sent.length ===
              0 ? (
                <div className="noti-empty">
                  Илгээсэн хүсэлт
                  байхгүй
                </div>
              ) : (
                sent.map(
                  (
                    meeting,
                  ) => (
                    <div
                      className="noti-card"
                      key={
                        meeting.id
                      }
                    >
                      <div className="noti-card-top">
                        <div className="noti-card-title">
                          {meeting.title ||
                            "Meeting"}
                        </div>

                        <div className="noti-card-time">
                          {fmt(
                            meeting.start_time,
                          )}
                        </div>
                      </div>

                      <div className="noti-card-sub">
                        To:{" "}
                        <strong>
                          {
                            meeting.recipient_email
                          }
                        </strong>{" "}
                        <span
                          className={`pill ${meeting.status}`}
                        >
                          {
                            meeting.status
                          }
                        </span>
                      </div>

                      {meeting.description && (
                        <div className="noti-card-desc">
                          {
                            meeting.description
                          }
                        </div>
                      )}
                    </div>
                  ),
                )
              )}
            </div>
          ) : (
            <div className="noti-list">
              {accepted.length ===
              0 ? (
                <div className="noti-empty">
                  Зөвшөөрсөн
                  уулзалт байхгүй
                </div>
              ) : (
                accepted.map(
                  (
                    meeting,
                  ) => (
                    <div
                      className="noti-card"
                      key={
                        meeting.id
                      }
                    >
                      <div className="noti-card-top">
                        <div className="noti-card-title">
                          {meeting.title ||
                            "Meeting"}
                        </div>

                        <div className="noti-card-time">
                          {fmt(
                            meeting.start_time,
                          )}
                        </div>
                      </div>

                      <div className="noti-card-sub">
                        Хамтдаа:{" "}
                        <strong>
                          {
                            meeting.creator_email
                          }
                        </strong>{" "}
                        &nbsp;↔&nbsp;{" "}
                        <strong>
                          {
                            meeting.recipient_email
                          }
                        </strong>

                        <span className="pill accepted">
                          Зөвшөөрсөн
                        </span>
                      </div>

                      {meeting.description && (
                        <div className="noti-card-desc">
                          {
                            meeting.description
                          }
                        </div>
                      )}

                      <div className="noti-card-actions">
                        {meeting.zoom_join_url ? (
                          <a
                            className="btn"
                            href={
                              meeting.zoom_join_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Zoom руу
                            орох
                          </a>
                        ) : (
                          <span className="muted">
                            Zoom холбоос
                            олдсонгүй
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}