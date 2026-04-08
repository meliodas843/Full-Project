import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

export default function Meeting() {
  const navigate = useNavigate();

  // mode: "event" | "company"
  const [mode, setMode] = useState("event");

  // MODE A: my events + participants
  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventPeople, setEventPeople] = useState([]);
  const [selectedEventEmails, setSelectedEventEmails] = useState([]);

  // MODE B: companies + employees
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedCompanyEmails, setSelectedCompanyEmails] = useState([]);

  // meeting fields
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // -------------------------
  // Helper: read backend error body safely (JSON or HTML/text)
  // -------------------------
  async function readError(res) {
    try {
      const text = await res.text();
      if (!text) return `HTTP ${res.status}`;

      // try JSON
      try {
        const json = JSON.parse(text);
        return json?.message || json?.error || text;
      } catch {
        // return raw text (often HTML error page)
        return text;
      }
    } catch {
      return `HTTP ${res.status}`;
    }
  }

  // -------------------------
  // Helper: fetch with auth + 401 handling + prevents Bearer null
  // -------------------------
  async function authFetch(url, options = {}) {
    const token = getToken();

    // ✅ prevent "Authorization: Bearer null" causing backend crash
    if (!token) {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
      return null;
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
      return null;
    }

    return res;
  }

  // -------------------------
  // LOAD: my events (Mode A)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/events/my-events`);
        if (!res || cancelled) return;

        if (!res.ok) {
          const errMsg = await readError(res);
          console.error("MY EVENTS ERROR:", res.status, errMsg);
          if (!cancelled) setMessage(errMsg);
          return;
        }

        const d = await res.json().catch(() => []);
        if (!cancelled) setMyEvents(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("MY EVENTS CRASH:", e);
        if (!cancelled) setMessage("Failed to load your events");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // LOAD: companies (Mode B)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/companies`);
        if (!res || cancelled) return;

        if (!res.ok) {
          const errMsg = await readError(res);
          console.error("COMPANIES ERROR:", res.status, errMsg);
          if (!cancelled) setMessage(errMsg);
          return;
        }

        const d = await res.json().catch(() => []);
        if (!cancelled) setCompanies(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("COMPANIES CRASH:", e);
        if (!cancelled) setMessage("Failed to load companies");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when event selected -> load participants
  useEffect(() => {
    if (!selectedEventId) {
      setEventPeople([]);
      setSelectedEventEmails([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(
          `${API_BASE}/api/events/${selectedEventId}/participants`,
        );
        if (!res || cancelled) return;

        if (!res.ok) {
          const errMsg = await readError(res);
          console.error("PARTICIPANTS ERROR:", res.status, errMsg);
          if (!cancelled) setMessage(errMsg);
          setEventPeople([]);
          setSelectedEventEmails([]);
          return;
        }

        const d = await res.json().catch(() => ({}));
        const list = Array.isArray(d?.participants) ? d.participants : [];

        if (!cancelled) {
          setEventPeople(list);
          setSelectedEventEmails([]);
        }
      } catch (e) {
        console.error("PARTICIPANTS CRASH:", e);
        if (!cancelled) {
          setEventPeople([]);
          setSelectedEventEmails([]);
          setMessage(e?.message || "Failed to load participants");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  // when company selected -> load employees
  useEffect(() => {
    if (!company) {
      setEmployees([]);
      setSelectedCompanyEmails([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(
          `${API_BASE}/api/companies/employees?company=${encodeURIComponent(company)}`,
        );
        if (!res || cancelled) return;

        if (!res.ok) {
          const errMsg = await readError(res);
          console.error("EMPLOYEES ERROR:", res.status, errMsg);
          if (!cancelled) setMessage(errMsg);
          setEmployees([]);
          setSelectedCompanyEmails([]);
          return;
        }

        const d = await res.json().catch(() => []);
        if (!cancelled) {
          setEmployees(Array.isArray(d) ? d : []);
          setSelectedCompanyEmails([]);
        }
      } catch (e) {
        console.error("EMPLOYEES CRASH:", e);
        if (!cancelled) setMessage("Failed to load employees");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // reset on mode switch
  useEffect(() => {
    setMessage("");

    if (mode === "event") {
      setCompany("");
      setEmployees([]);
      setSelectedCompanyEmails([]);
    } else {
      setSelectedEventId("");
      setEventPeople([]);
      setSelectedEventEmails([]);
    }
  }, [mode]);

  async function handleSend(e) {
    e.preventDefault();
    setMessage("");

    if (!meetingDate || !startTime)
      return setMessage("Date and start time are required");
    if (!reason.trim()) return setMessage("Reason is required");

    const invitees =
      mode === "event" ? selectedEventEmails : selectedCompanyEmails;
    if (!invitees.length)
      return setMessage("Select at least one person to invite");

    let sendCompany = "";
    if (mode === "company") {
      sendCompany = String(company || "").trim();
      if (!sendCompany) return setMessage("Company is required");
    }

    const selectedEvent = myEvents.find(
      (x) => String(x.id) === String(selectedEventId),
    );
    const eventTitle = selectedEvent?.title
      ? String(selectedEvent.title).trim()
      : "";

    try {
      setLoading(true);

      const payload = {
        date: meetingDate,
        startTime,
        endTime: endTime || null,
        reason: reason.trim(),
        invitees,
        mode,
        eventId: mode === "event" ? Number(selectedEventId) || null : null,
        title: mode === "event" ? eventTitle || "Event Meeting" : null,
      };

      if (mode === "company") payload.company = sendCompany;

      const res = await authFetch(`${API_BASE}/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res) return;

      if (!res.ok) {
        const errMsg = await readError(res);
        console.error("MEETING API ERROR:", res.status, errMsg);
        return setMessage(errMsg || "Failed to send");
      }

      await res.json().catch(() => ({}));

      setMessage("✅ Meeting request sent");
      setTimeout(() => navigate("/user/notifications"), 600);
    } catch (e) {
      console.error("MEETING API CRASH:", e);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserShell title="Create Meeting">
      <div className="meet-wrap">
        <div className="meet-card">
          <div className="meet-head">
            <div>
              <h2 className="meet-title">Уулзалт зохион байгуулах</h2>
              <p className="meet-sub">
                Компанийн болон Эвэнтийн уулзалт зохион байгуулах
              </p>
            </div>

            <button
              className="meet-back"
              type="button"
              onClick={() => navigate("/user/notifications")}
            >
              Буцах
            </button>
          </div>

          {/* MODE SWITCH */}
          <div className="meet-tabs">
            <button
              type="button"
              className={mode === "event" ? "meet-tab active" : "meet-tab"}
              onClick={() => setMode("event")}
            >
              Миний эвэнтүүдээр
            </button>
            <button
              type="button"
              className={mode === "company" ? "meet-tab active" : "meet-tab"}
              onClick={() => setMode("company")}
            >
              Байгууллагаар
            </button>
          </div>

          <form className="meet-form" onSubmit={handleSend}>
            {/* COMPANY DROPDOWN ONLY IN COMPANY MODE */}
            {mode === "company" && (
              <select
                className="meet-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                <option value="">Байгууллага сонгоно уу</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {mode === "event" ? (
              <>
                <select
                  className="meet-input"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  <option value="">Миний эвэнт сонгоно уу</option>
                  {myEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>

                {eventPeople.length === 0 ? (
                  <div className="meet-hint">
                    Эвэнт дээрх харилцагчдыг сонгоно уу.
                  </div>
                ) : (
                  <select
                    className="meet-input"
                    multiple
                    size={Math.min(8, eventPeople.length)}
                    value={selectedEventEmails}
                    onChange={(e) => {
                      const values = Array.from(
                        e.target.selectedOptions,
                        (o) => o.value,
                      );
                      setSelectedEventEmails(values);
                    }}
                  >
                    {eventPeople.map((p) => (
                      <option key={p.id} value={p.email}>
                        {p.name} — {p.email}
                      </option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              <>
                {employees.length === 0 ? (
                  <div className="meet-hint">
                    Байгууллага дээрх харилцагчдыг сонгоно уу.
                  </div>
                ) : (
                  <select
                    className="meet-input"
                    multiple
                    size={Math.min(10, employees.length)}
                    value={selectedCompanyEmails}
                    onChange={(e) => {
                      const values = Array.from(
                        e.target.selectedOptions,
                        (o) => o.value,
                      );
                      setSelectedCompanyEmails(values);
                    }}
                  >
                    {employees.map((p) => (
                      <option key={p.id} value={p.email}>
                        {p.name} — {p.email}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            <input
              className="meet-input"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />

            <input
              className="meet-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              className="meet-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <textarea
              className="meet-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
            />

            {message && <div className="meet-message">{message}</div>}

            <button className="meet-btn" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </UserShell>
  );
}
