import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

const TZ = "Asia/Ulaanbaatar";

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

function parseDB(dt) {
  if (!dt) return null;
  const s = String(dt).trim();
  if (!s) return null;
  const isoLike = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(isoLike);
  const t = d.getTime();
  return Number.isFinite(t) ? d : null;
}

function formatInTZ(dt, opts) {
  const d = parseDB(dt);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    ...opts,
  }).format(d);
}

function isoDateOnlyTZ(dt) {
  const d = parseDB(dt);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function isEnded(m) {
  if (!m?.start_time) return false;

  const start = parseDB(m.start_time);
  if (!start) return false;

  const end = m.end_time
    ? parseDB(m.end_time)
    : new Date(start.getTime() + 30 * 60 * 1000);

  if (!end) return false;

  return Date.now() > end.getTime();
}

// ✅ My Meetings list-ээс meeting-г хэзээ нуух вэ
function shouldHideFromMyMeetings(m) {
  if (!m?.start_time) return false;

  const start = parseDB(m.start_time);
  if (!start) return false;

  const end = m.end_time
    ? parseDB(m.end_time)
    : new Date(start.getTime() + 30 * 60 * 1000);

  if (!end) return false;

  // meeting дууссанаас хойш 24 цагийн дараа алга болно
  const hideAfter = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  return Date.now() > hideAfter.getTime();
}

function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(year, monthIndex, d));
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

  const inboxPending = useMemo(() => {
    return inbox.filter(
      (m) =>
        m.status === "pending" && m.recipient_email === myEmail && !isEnded(m),
    );
  }, [inbox, myEmail]);

  const sentPending = useMemo(() => {
    return sentAll.filter(
      (m) =>
        m.status === "pending" && m.creator_email === myEmail && !isEnded(m),
    );
  }, [sentAll, myEmail]);

  // ✅ accepted/declined meeting нь дууссанаас хойш 1 хоног хүртэл Миний уулзалтууд дээр харагдана
  const myMeetings = useMemo(() => {
    const sentDoneByMe = sentAll.filter(
      (m) => m.status !== "pending" && m.creator_email === myEmail,
    );

    const map = new Map();
    [...acceptedAll, ...sentDoneByMe].forEach((m) => {
      if (!shouldHideFromMyMeetings(m)) {
        map.set(m.id, m);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const ta =
        parseDB(a.updated_at || a.created_at || a.start_time)?.getTime() || 0;
      const tb =
        parseDB(b.updated_at || b.created_at || b.start_time)?.getTime() || 0;
      return tb - ta;
    });
  }, [acceptedAll, sentAll, myEmail]);

  const allForCalendar = useMemo(
    () => [...sentAll, ...acceptedAll, ...inbox].filter((m) => !isEnded(m)),
    [sentAll, acceptedAll, inbox],
  );

  const meetingDaysSet = useMemo(() => {
    const set = new Set();
    allForCalendar.forEach((m) => {
      const iso = isoDateOnlyTZ(m.start_time);
      if (iso) set.add(iso);
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

      const allNow = [...s, ...a, ...i];
      if (selected && allNow.some((x) => x.id === selected.id)) return;

      const inboxP = i.filter(
        (m) =>
          m.status === "pending" &&
          m.recipient_email === myEmail &&
          !isEnded(m),
      );
      const sentP = s.filter(
        (m) =>
          m.status === "pending" && m.creator_email === myEmail && !isEnded(m),
      );

      setSelected(
        inboxP[0] ||
          sentP[0] ||
          a.find((x) => !shouldHideFromMyMeetings(x)) ||
          s.find((x) => !shouldHideFromMyMeetings(x)) ||
          null,
      );
    } catch {
      setMsg("Server error while loading");
    } finally {
      setLoading(false);
    }
  }

  async function action(meetingId, act) {
    setMsg("");
    try {
      const res = await fetch(
        `http://localhost:5000/api/meetings/${meetingId}/${act}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

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
    if (!editDate || !editStart)
      return setMsg("Date and start time are required");
    if (editEnd && editEnd <= editStart)
      return setMsg("End time must be after start time");

    try {
      const res = await fetch(
        `http://localhost:5000/api/meetings/${meetingId}/edit`,
        {
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
        },
      );

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
  }, []);

  function goPrevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const grid = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(viewDate);
  }, [viewDate]);

  function pillClass(status) {
    return `nt-pill ${status || ""}`.trim();
  }

  const canRespond = useMemo(() => {
    if (!selected) return false;
    return (
      selected.recipient_email === myEmail && selected.status === "pending"
    );
  }, [selected, myEmail]);

  const selectedEnded = useMemo(
    () => (selected ? isEnded(selected) : false),
    [selected],
  );

  function renderCard(m, line) {
    const active = selected?.id === m.id;
    const dateText = m.start_time
      ? formatInTZ(m.start_time, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "";
    const t = m.start_time
      ? formatInTZ(m.start_time, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";

    return (
      <button
        key={m.id}
        type="button"
        className={`nt-item ${active ? "is-active" : ""}`}
        onClick={() => setSelected(m)}
      >
        <div className="nt-item-top">
          <div className="nt-item-title">{m.title}</div>
          <div className={pillClass(m.status)}>
            {String(m.status).toUpperCase()}
          </div>
        </div>

        <div className="nt-item-meta">
          <span>{dateText}</span>
          {t ? <span className="nt-dot">•</span> : null}
          {t ? <span>{t}</span> : null}
        </div>

        <div className="nt-item-from">{line}</div>
        {m.description ? (
          <div className="nt-item-desc">{m.description}</div>
        ) : null}
      </button>
    );
  }

  function withLine(m) {
    const other =
      m.creator_email === myEmail ? m.recipient_email : m.creator_email;
    return `With: ${other || ""}`;
  }

  return (
    <UserShell title="My Calendar">
      <div className="nt-wrap">
        <div className="nt-shell">
          <aside className="nt-left">
            <div className="nt-left-head">
              <div>
                <div className="nt-left-title">Хүсэлтийн хайрцаг</div>
                <div className="nt-left-sub">
                  {loading ? "Loading..." : `${inboxPending.length} pending`}
                </div>
              </div>
            </div>

            {msg && <div className="nt-msg">{msg}</div>}

            <div className="nt-list nt-inbox-list">
              {inboxPending.length === 0 ? (
                <div className="nt-empty">Хоосон</div>
              ) : (
                inboxPending.map((m) =>
                  renderCard(m, `From: ${m.creator_email || ""}`),
                )
              )}
            </div>

            <div className="nt-left-head">
              <div>
                <div className="nt-left-title">Хүсэлт явуулах</div>
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
                <div className="nt-empty">Хүлээж буй хүсэлт байхгүй.</div>
              ) : (
                sentPending.map((m) =>
                  renderCard(m, `To: ${m.recipient_email || ""}`),
                )
              )}
            </div>

            <div className="nt-split-head">
              <div className="nt-left-title">Миний уулзалтууд</div>
              <div className="nt-left-sub">
                {loading ? "Loading..." : `${myMeetings.length} item(s)`}
              </div>
            </div>

            <div className="nt-list nt-meetings-list">
              {myMeetings.length === 0 ? (
                <div className="nt-empty">Одоогоор уулзалт байхгүй байна.</div>
              ) : (
                myMeetings.map((m) => renderCard(m, withLine(m)))
              )}
            </div>
          </aside>

          <main className="nt-right">
            <div className="nt-cal-head">
              <div className="nt-cal-title">{monthTitle}</div>
              <div className="nt-cal-actions">
                <button
                  className="nt-cal-btn"
                  type="button"
                  onClick={goPrevMonth}
                >
                  ←
                </button>
                <button
                  className="nt-cal-btn"
                  type="button"
                  onClick={goNextMonth}
                >
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
                    <span>
                      {selected.start_time
                        ? `${formatInTZ(selected.start_time, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })} ${formatInTZ(selected.start_time, {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}`
                        : ""}
                    </span>
                  </div>

                  <div className="nt-detail-desc">
                    {selected.description || "No reason provided."}
                  </div>

                  {selected.status === "accepted" &&
                    selected.zoom_join_url &&
                    !selectedEnded && (
                      <div
                        className="nt-detail-actions"
                        style={{ marginTop: 12 }}
                      >
                        <button
                          className="nt-action accept"
                          type="button"
                          onClick={() =>
                            window.open(
                              selected.zoom_join_url,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          Zoom Орох
                        </button>
                      </div>
                    )}

                  {selected.status === "accepted" && selectedEnded && (
                    <div className="nt-muted" style={{ marginTop: 10 }}>
                      Энэ уулзалт дууссан байна.
                    </div>
                  )}

                  {canRespond && (
                    <>
                      <div className="nt-detail-actions">
                        <button
                          className="nt-action accept"
                          type="button"
                          onClick={() => action(selected.id, "accept")}
                        >
                          Зөвшөөрөх
                        </button>
                        <button
                          className="nt-action decline"
                          type="button"
                          onClick={() => action(selected.id, "decline")}
                        >
                          Цуцлах
                        </button>
                        <button
                          className="nt-action edit"
                          type="button"
                          onClick={() => {
                            setEditingId(selected.id);
                            setEditDate(isoDateOnlyTZ(selected.start_time));
                            setEditStart(
                              formatInTZ(selected.start_time, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              }),
                            );
                            setEditEnd(
                              selected.end_time
                                ? formatInTZ(selected.end_time, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })
                                : "",
                            );
                          }}
                        >
                          Edit
                        </button>
                      </div>

                      {editingId === selected.id && (
                        <div className="nt-edit-box">
                          <div className="nt-edit-row">
                            <label>Он сар</label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          </div>

                          <div className="nt-edit-row">
                            <label>Эхлэх</label>
                            <input
                              type="time"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                            />
                          </div>

                          <div className="nt-edit-row">
                            <label>Дуусгах (optional)</label>
                            <input
                              type="time"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                            />
                          </div>

                          <div className="nt-edit-actions">
                            <button
                              className="nt-action accept"
                              type="button"
                              onClick={() => saveEdit(selected.id)}
                            >
                              Хадгалах
                            </button>
                            <button
                              className="nt-action decline"
                              type="button"
                              onClick={() => setEditingId(null)}
                            >
                              Цуцлах
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
                <div>Даваа</div>
                <div>Ням</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              <div className="nt-cells">
                {grid.map((d, idx) => {
                  if (!d) return <div key={idx} className="nt-cell is-empty" />;

                  const day = d.getDate();
                  const iso = `${d.getFullYear()}-${String(
                    d.getMonth() + 1,
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasMeeting = meetingDaysSet.has(iso);

                  return (
                    <div
                      key={idx}
                      className={`nt-cell ${hasMeeting ? "has-meeting" : ""}`}
                    >
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
    </UserShell>
  );
}
