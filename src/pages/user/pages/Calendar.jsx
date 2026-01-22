import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function getToken() {
  return localStorage.getItem("token");
}

function getMyEmail() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.email || "";
  } catch {
    return "";
  }
}

function isoDateOnly(dt) {
  const s = String(dt || "");
  return s.slice(0, 10);
}

function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar() {
  const navigate = useNavigate();
  const myEmail = useMemo(() => getMyEmail(), []);

  const [sentAll, setSentAll] = useState([]);
  const [acceptedAll, setAcceptedAll] = useState([]);
  const [inbox, setInbox] = useState([]);

  const [selected, setSelected] = useState(null);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());

  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // ✅ Inbox pending (sent TO me)
  const inboxPending = useMemo(() => {
    return inbox.filter(
      (m) => m.status === "pending" && m.recipient_email === myEmail
    );
  }, [inbox, myEmail]);

  // ✅ Sent pending (created BY me)
  const sentPending = useMemo(() => {
    return sentAll.filter(
      (m) => m.status === "pending" && m.creator_email === myEmail
    );
  }, [sentAll, myEmail]);

  // ✅ My Meetings: accepted meetings involving me + my sent done (accepted/declined)
  const myMeetings = useMemo(() => {
    const sentDoneByMe = sentAll.filter(
      (m) => m.status !== "pending" && m.creator_email === myEmail
    );

    const map = new Map();
    [...acceptedAll, ...sentDoneByMe].forEach((m) => map.set(m.id, m));

    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || a.start_time || 0).getTime();
      const tb = new Date(b.updated_at || b.created_at || b.start_time || 0).getTime();
      return tb - ta;
    });
  }, [acceptedAll, sentAll, myEmail]);

  // dots on calendar
  const allForCalendar = useMemo(
    () => [...sentAll, ...acceptedAll, ...inbox],
    [sentAll, acceptedAll, inbox]
  );

  const meetingDaysSet = useMemo(() => {
    const set = new Set();
    allForCalendar.forEach((m) => {
      if (m.start_time) set.add(isoDateOnly(m.start_time));
    });
    return set;
  }, [allForCalendar]);

  async function loadAll() {
    setMsg("");
    setLoading(true);
    try {
      const [rSent, rAccepted, rInbox] = await Promise.all([
        fetch("http://localhost:5000/api/meetings/sent", {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch("http://localhost:5000/api/meetings/accepted", {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch("http://localhost:5000/api/meetings/inbox", {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const sentData = await rSent.json().catch(() => []);
      const acceptedData = await rAccepted.json().catch(() => []);
      const inboxData = await rInbox.json().catch(() => []);

      const s = Array.isArray(sentData) ? sentData : [];
      const a = Array.isArray(acceptedData) ? acceptedData : [];
      const i = Array.isArray(inboxData) ? inboxData : [];

      setSentAll(s);
      setAcceptedAll(a);
      setInbox(i);

      // keep selection if still exists
      const allNow = [...s, ...a, ...i];
      if (selected && allNow.some((x) => x.id === selected.id)) return;

      // auto select priority: inbox pending -> sent pending -> meetings
      const inboxP = i.filter((m) => m.status === "pending" && m.recipient_email === myEmail);
      const sentP = s.filter((m) => m.status === "pending" && m.creator_email === myEmail);

      setSelected(inboxP[0] || sentP[0] || a[0] || s[0] || i[0] || null);
    } catch {
      setMsg("Server error while loading");
    } finally {
      setLoading(false);
    }
  }

  async function action(meetingId, act) {
    setMsg("");
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meetingId}/${act}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data?.message || "Action failed");

      setMsg(data?.message || "Done");
      setEditingId(null);
      await loadAll();
    } catch {
      setMsg("Server error. Try again.");
    }
  }

  async function saveEdit(meetingId) {
    setMsg("");
    if (!editDate || !editStart) return setMsg("Date and start time are required");
    if (editEnd && editEnd <= editStart) return setMsg("End time must be after start time");

    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meetingId}/edit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          date: editDate,
          startTime: editStart,
          endTime: editEnd || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data?.message || "Edit failed");

      setMsg(data?.message || "Meeting updated");
      setEditingId(null);
      setEditDate("");
      setEditStart("");
      setEditEnd("");
      await loadAll();
    } catch {
      setMsg("Server error while saving edit");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goPrevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const grid = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(viewDate);
  }, [viewDate]);

  function timeText(dt) {
    return dt ? String(dt).slice(11, 16) : "";
  }

  function pillClass(status) {
    return `nt-pill ${status || ""}`.trim();
  }

  const canRespond = useMemo(() => {
    if (!selected) return false;
    return selected.recipient_email === myEmail && selected.status === "pending";
  }, [selected, myEmail]);

  function renderCard(m, line) {
    const active = selected?.id === m.id;
    const dateText = m.start_time ? isoDateOnly(m.start_time) : "";
    const t = timeText(m.start_time);

    return (
      <button
        key={m.id}
        type="button"
        className={`nt-item ${active ? "is-active" : ""}`}
        onClick={() => setSelected(m)}
      >
        <div className="nt-item-top">
          <div className="nt-item-title">{m.title}</div>
          <div className={pillClass(m.status)}>{String(m.status).toUpperCase()}</div>
        </div>

        <div className="nt-item-meta">
          <span>{dateText}</span>
          {t ? <span className="nt-dot">•</span> : null}
          {t ? <span>{t}</span> : null}
        </div>

        <div className="nt-item-from">{line}</div>
        {m.description ? <div className="nt-item-desc">{m.description}</div> : null}
      </button>
    );
  }

  function withLine(m) {
    const other = m.creator_email === myEmail ? m.recipient_email : m.creator_email;
    return `With: ${other || ""}`;
  }

  return (
  <div className="userLayout">
    <Sidebar />

    <div className="userContent">
      <div className="nt-wrap">
        <div className="nt-shell">
          {/* LEFT */}
          <aside className="nt-left">
            {/* Inbox */}
            <div className="nt-left-head">
              <div>
                <div className="nt-left-title">Inbox Requests</div>
                <div className="nt-left-sub">
                  {loading ? "Loading..." : `${inboxPending.length} pending`}
                </div>
              </div>
            </div>

            {msg && <div className="nt-msg">{msg}</div>}

            <div className="nt-list nt-inbox-list">
              {inboxPending.length === 0 ? (
                <div className="nt-empty">No incoming requests.</div>
              ) : (
                inboxPending.map((m) => renderCard(m, `From: ${m.creator_email || ""}`))
              )}
            </div>

            {/* Sent */}
            <div className="nt-left-head">
              <div>
                <div className="nt-left-title">Sent Requests</div>
                <div className="nt-left-sub">
                  {loading ? "Loading..." : `${sentPending.length} pending`}
                </div>
              </div>

              <button
                className="nt-plus"
                type="button"
                onClick={() => navigate("/user/meeting/create")}
                title="Create meeting"
              >
                +
              </button>
            </div>

            <div className="nt-list nt-sent-list">
              {sentPending.length === 0 ? (
                <div className="nt-empty">No pending requests.</div>
              ) : (
                sentPending.map((m) => renderCard(m, `To: ${m.recipient_email || ""}`))
              )}
            </div>

            {/* My Meetings */}
            <div className="nt-split-head">
              <div className="nt-left-title">My Meetings</div>
              <div className="nt-left-sub">
                {loading ? "Loading..." : `${myMeetings.length} item(s)`}
              </div>
            </div>

            <div className="nt-list nt-meetings-list">
              {myMeetings.length === 0 ? (
                <div className="nt-empty">No meetings yet.</div>
              ) : (
                myMeetings.map((m) => renderCard(m, withLine(m)))
              )}
            </div>
          </aside>

          {/* RIGHT */}
          <main className="nt-right">
            <div className="nt-cal-head">
              <div className="nt-cal-title">{monthTitle}</div>
              <div className="nt-cal-actions">
                <button className="nt-cal-btn" type="button" onClick={goPrevMonth}>
                  ←
                </button>
                <button className="nt-cal-btn" type="button" onClick={goNextMonth}>
                  →
                </button>
              </div>
            </div>

            <div className="nt-detail">
              {selected ? (
                <>
                  <div className="nt-detail-title">{selected.title}</div>

                  <div className="nt-detail-meta">
                    <span className={pillClass(selected.status)}>
                      {String(selected.status).toUpperCase()}
                    </span>
                    <span className="nt-dot">•</span>
                    <span>{selected.start_time ? String(selected.start_time).slice(0, 16) : ""}</span>
                  </div>

                  <div className="nt-detail-desc">
                    {selected.description || "No reason provided."}
                  </div>

                  {canRespond && (
                    <>
                      <div className="nt-detail-actions">
                        <button className="nt-action accept" type="button" onClick={() => action(selected.id, "accept")}>
                          Accept
                        </button>
                        <button className="nt-action decline" type="button" onClick={() => action(selected.id, "decline")}>
                          Decline
                        </button>
                        <button
                          className="nt-action edit"
                          type="button"
                          onClick={() => {
                            setEditingId(selected.id);
                            setEditDate(isoDateOnly(selected.start_time));
                            setEditStart(String(selected.start_time).slice(11, 16));
                            setEditEnd(selected.end_time ? String(selected.end_time).slice(11, 16) : "");
                          }}
                        >
                          Edit
                        </button>
                      </div>

                      {editingId === selected.id && (
                        <div className="nt-edit-box">
                          <div className="nt-edit-row">
                            <label>Date</label>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                          </div>

                          <div className="nt-edit-row">
                            <label>Start</label>
                            <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                          </div>

                          <div className="nt-edit-row">
                            <label>End (optional)</label>
                            <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                          </div>

                          <div className="nt-edit-actions">
                            <button className="nt-action accept" type="button" onClick={() => saveEdit(selected.id)}>
                              Save
                            </button>
                            <button className="nt-action decline" type="button" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="nt-muted">Select a card to see details.</div>
              )}
            </div>

            <div className="nt-cal-grid">
              <div className="nt-weekdays">
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
              </div>

              <div className="nt-cells">
                {grid.map((d, idx) => {
                  if (!d) return <div key={idx} className="nt-cell is-empty" />;

                  const day = d.getDate();
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasMeeting = meetingDaysSet.has(iso);

                  return (
                    <div key={idx} className={`nt-cell ${hasMeeting ? "has-meeting" : ""}`}>
                      <div className="nt-day">{day}</div>
                      {hasMeeting && <div className="nt-dotmark" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
  );
}
