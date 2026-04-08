import { useEffect, useMemo, useState } from "react";
import UserShell from "../components/UserShell";
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
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Ulaanbaatar",
  });
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKeyFromValue(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return toDateKey(d);
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function buildCalendarCells(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const mondayOffset = startWeekday === 0 ? 6 : startWeekday - 1;

  const gridStart = new Date(year, month, 1 - mondayOffset);
  const totalCells = 42;

  return Array.from({ length: totalCells }, (_, i) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);

    return {
      date: cellDate,
      key: toDateKey(cellDate),
      inCurrentMonth: cellDate.getMonth() === month,
      isToday: isSameDay(cellDate, new Date()),
    };
  });
}

export default function Home() {
  const [meetings, setMeetings] = useState([]);
  const [requests, setRequests] = useState({ pending: [], accepted: [] });
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [err, setErr] = useState("");

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));

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
    } catch (e) {
      console.error(e);
      setErr("Эвентүүд уншихад алдаа гарлаа.");
      setMeetings([]);
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

      const data = await res.json().catch(() => []);

      if (res.ok) {
        if (Array.isArray(data)) {
          setRequests({ pending: [], accepted: data });
        } else {
          setRequests({
            pending: Array.isArray(data.pending) ? data.pending : [],
            accepted: Array.isArray(data.accepted) ? data.accepted : [],
          });
        }
      } else {
        setRequests({ pending: [], accepted: [] });
      }
    } catch (e) {
      console.error(e);
      setErr("Хүсэлтүүд уншихад алдаа гарлаа.");
      setRequests({ pending: [], accepted: [] });
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

  const calendarEvents = useMemo(() => {
    const meetingItems = meetings.map((ev) => ({
      id: `meeting-${ev.id}`,
      source: "meeting",
      title: ev.title || "Эвент",
      description: ev.description || "",
      image_url: ev.image_url || "",
      start_time: ev.start_time,
      end_time: ev.end_time,
      raw: ev,
    }));

    const acceptedItems = (requests.accepted || []).map((r) => ({
      id: `accepted-${r.id}`,
      source: "accepted",
      title: r.title || "Хүсэлт",
      description: r.description || "",
      image_url: r.image_url || "",
      start_time: r.start_time,
      end_time: r.end_time,
      raw: r,
    }));

    return [...meetingItems, ...acceptedItems].sort(
      (a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0),
    );
  }, [meetings, requests.accepted]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const item of calendarEvents) {
      const key = dateKeyFromValue(item.start_time);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    Object.keys(map).forEach((key) => {
      map[key].sort(
        (a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0),
      );
    });

    return map;
  }, [calendarEvents]);

  const calendarCells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateKey] || [];
  }, [eventsByDate, selectedDateKey]);

  function goPrevMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function goToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(toDateKey(today));
  }

  const weekdayLabels = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

  return (
    <UserShell title="Khural Plus+">
      <main className="home-main">
        {err && <div className="uep-error">{err}</div>}

        <section className="home-top">
          <div className="card events-card">
            <div className="card-head meetings-head">
              <h2 className="card-title">Эвентүүд</h2>
              <div className="slider-actions">
                <button
                  type="button"
                  onClick={() => {
                    document
                      .querySelector(".meetings-slider")
                      ?.scrollBy({ left: -320, behavior: "smooth" });
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
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
                <div className="empty">Уулзалт уншиж байна...</div>
              ) : meetings.length === 0 ? (
                <div className="empty">Уулзалт алга.</div>
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
                        <div className="meeting-time">
                          {formatDateTime(ev.start_time)}
                        </div>
                        <p className="meeting-desc">
                          {ev.description || "No description"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card requests-card">
            <div className="card-head">
              <h2 className="card-title">Хүсэлт</h2>
            </div>

            {loadingRequests ? (
              <div className="empty small">Уншиж байна</div>
            ) : (
              <>
                <div className="request-section">
                  <h4>Pending</h4>
                  {requests.pending.length === 0 ? (
                    <div className="empty small">
                      Хүлээгдэж буй хүсэлт байхгүй
                    </div>
                  ) : (
                    requests.pending.map((r) => (
                      <div key={r.id} className="request-item">
                        <strong>{r.from_company}</strong>
                        <div>{r.title}</div>
                        <div className="req-meta">
                          {formatDateTime(r.start_time)}
                        </div>

                        <div className="req-actions">
                          <button
                            type="button"
                            onClick={() => acceptRequest(r.id)}
                          >
                            Зөвшөөрөх
                          </button>
                          <button
                            type="button"
                            onClick={() => declineRequest(r.id)}
                          >
                            Цуцлах
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="request-section accepted-section">
                  <h4>Зөвшөөрсөн</h4>

                  {requests.accepted.length === 0 ? (
                    <div className="empty small">Хүлээн аваагүй</div>
                  ) : (
                    <div className="accepted-list">
                      {requests.accepted.map((r) => (
                        <div key={r.id} className="request-item accepted">
                          <strong>{r.from_company}</strong>
                          <div>{r.title}</div>
                          <div className="req-meta">
                            {formatDateTime(r.start_time)}
                          </div>
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
          <div className="card calendar-card compact-calendar-card">
            <div className="card-head calendar-head-clean">
              <h2 className="card-title">Календар</h2>

              <div className="calendar-toolbar">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={goPrevMonth}
                >
                  ‹
                </button>

                <div className="calendar-month-label">
                  {formatMonthLabel(viewDate)}
                </div>

                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={goNextMonth}
                >
                  ›
                </button>

                <button
                  type="button"
                  className="calendar-today-btn"
                  onClick={goToday}
                >
                  Өнөөдөр
                </button>
              </div>
            </div>
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot meeting"></span>
                <span>Эвент</span>
              </div>

              <div className="legend-item">
                <span className="legend-dot accepted"></span>
                <span>Уулзалт</span>
              </div>
            </div>

            <div className="calendar-shell">
              <div className="calendar-layout compact">
                <div className="calendar-grid-wrap compact">
                  <div className="calendar-weekdays compact">
                    {weekdayLabels.map((day) => (
                      <div key={day} className="calendar-weekday">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-grid compact">
                    {calendarCells.map((cell) => {
                      const dayEvents = eventsByDate[cell.key] || [];
                      const isSelected = cell.key === selectedDateKey;

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          className={[
                            "calendar-day",
                            "compact",
                            cell.inCurrentMonth ? "" : "is-other-month",
                            cell.isToday ? "is-today" : "",
                            isSelected ? "is-selected" : "",
                            dayEvents.length > 0 ? "has-events" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelectedDateKey(cell.key)}
                        >
                          <div className="calendar-day-top">
                            <span className="calendar-day-number">
                              {cell.date.getDate()}
                            </span>
                          </div>

                          <div className="calendar-dots compact">
                            {dayEvents.length > 0 && (
                              <>
                                {dayEvents.some(
                                  (ev) => ev.source === "meeting",
                                ) && <span className="calendar-dot meeting" />}
                                {dayEvents.some(
                                  (ev) => ev.source === "accepted",
                                ) && <span className="calendar-dot accepted" />}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="calendar-side compact">
                  <div className="calendar-side-head">{selectedDateKey}</div>

                  {selectedDayEvents.length === 0 ? (
                    <div className="calendar-empty">Энэ өдөрт эвент алга.</div>
                  ) : (
                    <div className="calendar-event-list">
                      {selectedDayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="calendar-event-item compact"
                        >
                          <div className="calendar-event-badge">
                            {ev.source === "meeting" ? "Эвент" : "Уулзалт"}
                          </div>

                          <div className="calendar-event-title">{ev.title}</div>

                          <div className="calendar-event-time">
                            {formatDateTime(ev.start_time)}
                            {ev.end_time
                              ? ` - ${formatDateTime(ev.end_time)}`
                              : ""}
                          </div>

                          <div className="calendar-event-desc">
                            {ev.description || "Тайлбар байхгүй"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-left">
            <div className="card mini-card">
              <div className="card-head">
                <h3 className="card-title small">Байгууллага / Мэдээ</h3>
              </div>
              <div className="empty small">News goes here</div>
            </div>
          </div>
        </section>
      </main>
    </UserShell>
  );
}
