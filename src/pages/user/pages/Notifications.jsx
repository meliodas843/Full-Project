import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

export default function Notifications() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("inbox"); 

  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [accepted, setAccepted] = useState([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function authFetch(url, options = {}) {
    const token = getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      return null;
    }

    return res;
  }

  async function loadInbox() {
    const res = await authFetch(`${API_BASE}/api/meetings/inbox`);
    if (!res) return;
    const data = await res.json().catch(() => []);
    setInbox(Array.isArray(data) ? data : []);
  }

  async function loadSent() {
    const res = await authFetch(`${API_BASE}/api/meetings/sent`);
    if (!res) return;
    const data = await res.json().catch(() => []);
    setSent(Array.isArray(data) ? data : []);
  }

  async function loadAccepted() {
    const res = await authFetch(`${API_BASE}/api/meetings/accepted`);
    if (!res) return;
    const data = await res.json().catch(() => []);
    setAccepted(Array.isArray(data) ? data : []);
  }

  async function refreshAll() {
    try {
      setMsg("");
      setLoading(true);
      await Promise.all([loadInbox(), loadSent(), loadAccepted()]);
    } catch {
      setMsg("Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString("mn-MN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  async function acceptMeeting(id) {
    try {
      setMsg("");
      setLoading(true);

      const res = await authFetch(`${API_BASE}/api/meetings/${id}/accept`, {
        method: "PATCH",
      });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || "Failed to accept");
        return;
      }

      // ✅ open zoom automatically if returned
      if (data.zoom_join_url) {
        window.open(data.zoom_join_url, "_blank", "noopener,noreferrer");
      }

      await refreshAll();
    } catch {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  }

  async function declineMeeting(id) {
    try {
      setMsg("");
      setLoading(true);

      const res = await authFetch(`${API_BASE}/api/meetings/${id}/decline`, {
        method: "PATCH",
      });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || "Failed to decline");
        return;
      }

      await refreshAll();
    } catch {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  }

  // Helpers to filter lists
  const pendingInbox = inbox.filter((m) => m.status === "pending");
  const pendingSent = sent.filter((m) => m.status === "pending");

  return (
    <div className="userLayout">
      <Sidebar />

      <div className="userContent">
        <div className="noti-wrap">
          <div className="noti-head">
            <div>
              <h2 className="noti-title">Requests & Meetings</h2>
              <p className="noti-sub">
                Pending requests, Sent requests, and Accepted meetings.
              </p>
            </div>

            <div className="noti-actions">
              <button
                type="button"
                className="noti-btn"
                onClick={() => navigate("/user/meeting")}
              >
                + Create Meeting
              </button>

              <button type="button" className="noti-btn ghost" onClick={refreshAll}>
                Refresh
              </button>
            </div>
          </div>

          <div className="noti-tabs">
            <button
              className={tab === "inbox" ? "noti-tab active" : "noti-tab"}
              onClick={() => setTab("inbox")}
              type="button"
            >
              Pending (Inbox) ({pendingInbox.length})
            </button>

            <button
              className={tab === "sent" ? "noti-tab active" : "noti-tab"}
              onClick={() => setTab("sent")}
              type="button"
            >
              Sent Requests ({pendingSent.length})
            </button>

            <button
              className={tab === "accepted" ? "noti-tab active" : "noti-tab"}
              onClick={() => setTab("accepted")}
              type="button"
            >
              My Meetings ({accepted.length})
            </button>
          </div>

          {msg && <div className="noti-msg">{msg}</div>}

          {loading ? (
            <div className="noti-empty">Loading…</div>
          ) : tab === "inbox" ? (
            <div className="noti-list">
              {pendingInbox.length === 0 ? (
                <div className="noti-empty">No pending requests.</div>
              ) : (
                pendingInbox.map((m) => (
                  <div className="noti-card" key={m.id}>
                    <div className="noti-card-top">
                      <div className="noti-card-title">{m.title || "Meeting"}</div>
                      <div className="noti-card-time">{fmt(m.start_time)}</div>
                    </div>

                    <div className="noti-card-sub">
                      From: <strong>{m.creator_email}</strong>
                    </div>

                    {m.description && <div className="noti-card-desc">{m.description}</div>}

                    <div className="noti-card-actions">
                      <button
                        className="noti-small-btn ok"
                        type="button"
                        onClick={() => acceptMeeting(m.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="noti-small-btn danger"
                        type="button"
                        onClick={() => declineMeeting(m.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : tab === "sent" ? (
            <div className="noti-list">
              {sent.length === 0 ? (
                <div className="noti-empty">No sent requests.</div>
              ) : (
                sent.map((m) => (
                  <div className="noti-card" key={m.id}>
                    <div className="noti-card-top">
                      <div className="noti-card-title">{m.title || "Meeting"}</div>
                      <div className="noti-card-time">{fmt(m.start_time)}</div>
                    </div>

                    <div className="noti-card-sub">
                      To: <strong>{m.recipient_email}</strong>{" "}
                      <span className={`pill ${m.status}`}>{m.status}</span>
                    </div>

                    {m.description && <div className="noti-card-desc">{m.description}</div>}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="noti-list">
              {accepted.length === 0 ? (
                <div className="noti-empty">No accepted meetings yet.</div>
              ) : (
                accepted.map((m) => (
                  <div className="noti-card" key={m.id}>
                    <div className="noti-card-top">
                      <div className="noti-card-title">{m.title || "Meeting"}</div>
                      <div className="noti-card-time">{fmt(m.start_time)}</div>
                    </div>

                    <div className="noti-card-sub">
                      With: <strong>{m.creator_email}</strong> &nbsp;↔&nbsp;{" "}
                      <strong>{m.recipient_email}</strong>
                      <span className="pill accepted">accepted</span>
                    </div>

                    {m.description && <div className="noti-card-desc">{m.description}</div>}

                    <div className="noti-card-actions">
                      {/* ✅ Your snippet added here */}
                      {m.zoom_join_url ? (
                        <a
                          className="btn"
                          href={m.zoom_join_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join Zoom
                        </a>
                      ) : (
                        <span className="muted">Zoom link not created yet</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
