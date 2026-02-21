import { useEffect, useState } from "react";
import UserShell from "../components/UserShell"; // ✅ use shell (hamburger + right drawer)
import { API_BASE } from "@/lib/config";

function resolveUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function fallbackImg() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

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

export default function Home() {
  const [meetings, setMeetings] = useState([]);
  const [requests, setRequests] = useState({ pending: [], accepted: [] });
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [err, setErr] = useState("");

  async function loadMeetings() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingMeetings(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/my-joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);

      if (res.ok) {
        setMeetings(Array.isArray(data) ? data : []);
      } else {
        setMeetings([]);
      }
    } finally {
      setLoadingMeetings(false);
    }
  }

  async function loadRequests() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({ pending: [], accepted: [] }));

      if (res.ok) {
        setRequests({
          pending: Array.isArray(data.pending) ? data.pending : [],
          accepted: Array.isArray(data.accepted) ? data.accepted : [],
        });
      } else {
        setRequests({ pending: [], accepted: [] });
      }
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadMeetings();
    loadRequests();
  }, []);

  async function acceptRequest(id) {
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`${API_BASE}/api/events/requests/${id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    await loadRequests();
    await loadMeetings();
  }

  async function declineRequest(id) {
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`${API_BASE}/api/events/requests/${id}/decline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    await loadRequests();
  }

  return (
    <UserShell title="Khural Plus+">
      <main className="home-main">
        {err && <div className="uep-error">{err}</div>}

        <section className="home-top">
          <div className="card events-card">
            <div className="card-head meetings-head">
              <h2 className="card-title">Meetings</h2>
              <div className="slider-actions">
                <button
                  onClick={() => {
                    document
                      .querySelector(".meetings-slider")
                      ?.scrollBy({ left: -320, behavior: "smooth" });
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() => {
                    document
                      .querySelector(".meetings-slider")
                      ?.scrollBy({ left: 320, behavior: "smooth" });
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="events-body">
              {loadingMeetings ? (
                <div className="empty">Loading…</div>
              ) : meetings.length === 0 ? (
                <div className="empty">No meetings yet</div>
              ) : (
                <div className="meetings-slider">
                  {meetings.map((ev) => (
                    <div key={ev.id} className="meeting-card">
                      <img
                        src={resolveUrl(ev.image_url) || fallbackImg()}
                        alt={ev.title}
                        onError={(e) => (e.currentTarget.src = fallbackImg())}
                      />

                      <div className="meeting-body">
                        <h4>{ev.title}</h4>
                        <div className="meeting-time">{formatDateTime(ev.start_time)}</div>
                        <p className="meeting-desc">{ev.description || "No description"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card requests-card">
            <div className="card-head">
              <h2 className="card-title">Requests</h2>
            </div>

            {loadingRequests ? (
              <div className="empty small">Loading…</div>
            ) : (
              <>
                <div className="request-section">
                  <h4>Pending</h4>
                  {requests.pending.length === 0 ? (
                    <div className="empty small">No pending requests</div>
                  ) : (
                    requests.pending.map((r) => (
                      <div key={r.id} className="request-item">
                        <strong>{r.from_company}</strong>
                        <div>{r.title}</div>
                        <div className="req-meta">{formatDateTime(r.start_time)}</div>

                        <div className="req-actions">
                          <button onClick={() => acceptRequest(r.id)}>Accept</button>
                          <button onClick={() => declineRequest(r.id)}>Decline</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="request-section accepted-section">
                  <h4>Accepted</h4>

                  {requests.accepted.length === 0 ? (
                    <div className="empty small">No accepted</div>
                  ) : (
                    <div className="accepted-list">
                      {requests.accepted.map((r) => (
                        <div key={r.id} className="request-item accepted">
                          <strong>{r.from_company}</strong>
                          <div>{r.title}</div>
                          <div className="req-meta">{formatDateTime(r.start_time)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="home-bottom">
          <div className="card calendar-card">
            <div className="card-head">
              <h2 className="card-title">Calendar</h2>
            </div>

            <div className="calendar-shell">
              <div className="calendar-placeholder">
                Calendar goes here (FullCalendar / custom calendar)
              </div>
            </div>
          </div>

          <div className="bottom-left">
            <div className="card mini-card">
              <div className="card-head">
                <h3 className="card-title small">Company / News</h3>
              </div>
              <div className="empty small">News goes here</div>
            </div>
          </div>
        </section>
      </main>
    </UserShell>
  );
}
