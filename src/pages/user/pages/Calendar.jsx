import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiEdit3,
  FiCheck,
  FiX,
  FiCalendar,
  FiClock,
  FiVideo,
} from "react-icons/fi";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function parseDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  const date = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? null : date;
}

function isoKey(value) {
  const date = value instanceof Date ? value : parseDate(value);

  if (!date) return "";

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthGrid(date) {
  const year = date.getFullYear();

  const month = date.getMonth();

  const first = new Date(
    year,

    month,

    1,
  );

  const start = first.getDay() === 0 ? 6 : first.getDay() - 1;

  const days = new Date(
    year,

    month + 1,

    0,
  ).getDate();

  const result = [];

  for (let index = 0; index < start; index += 1) {
    result.push(null);
  }

  for (let day = 1; day <= days; day += 1) {
    result.push(new Date(year, month, day));
  }

  while (result.length % 7 !== 0) {
    result.push(null);
  }

  return result;
}

function formatTime(value) {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleTimeString(
    "mn-MN",

    {
      timeZone: "Asia/Ulaanbaatar",

      hour: "2-digit",

      minute: "2-digit",

      hour12: false,
    },
  );
}

function formatDateTime(value) {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleString(
    "mn-MN",

    {
      timeZone: "Asia/Ulaanbaatar",

      year: "numeric",

      month: "2-digit",

      day: "2-digit",

      hour: "2-digit",

      minute: "2-digit",

      hour12: false,
    },
  );
}

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function uniqueMeetings(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.id) return;

    const key = `${item.id}-${item.start_time || ""}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function statusLabel(value) {
  const status = String(value || "").toLowerCase();

  if (status === "pending") return "Хүлээгдэж буй";

  if (status === "accepted") return "Зөвшөөрсөн";

  if (status === "declined") return "Татгалзсан";

  if (status === "cancelled") return "Цуцалсан";

  if (status === "completed") return "Дууссан";

  return value || "";
}

function meetingPersonName(meeting) {
  return (
    meeting?.creator_name ||
    meeting?.sender_name ||
    meeting?.creator_full_name ||
    meeting?.sender_full_name ||
    meeting?.creator_email ||
    meeting?.sender_email ||
    "Хэрэглэгч"
  );
}

function meetingPersonEmail(meeting) {
  return meeting?.creator_email || meeting?.sender_email || "";
}

function personInitials(value) {
  const text = String(value || "").trim();

  if (!text) return "U";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Calendar() {
  const navigate = useNavigate();

  const [sent, setSent] = useState([]);

  const [accepted, setAccepted] = useState([]);

  const [inbox, setInbox] = useState([]);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");

  const [respondingId, setRespondingId] = useState(null);

  const [events, setEvents] = useState([]);

  const [editingMeeting, setEditingMeeting] = useState(null);

  const [editDate, setEditDate] = useState("");

  const [editTime, setEditTime] = useState("");

  const [savingEdit, setSavingEdit] = useState(false);

  const [notification, setNotification] = useState(null);

  function showNotification(message, type = "success") {
    setNotification({ message, type });

    window.clearTimeout(window.__registraCalendarToastTimer);

    window.__registraCalendarToastTimer = window.setTimeout(() => {
      setNotification(null);
    }, 3200);
  }

  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();

    return new Date(
      today.getFullYear(),

      today.getMonth(),

      1,
    );
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date());

  async function authFetch(
    url,

    options = {},
  ) {
    const token = getToken();

    if (!token) {
      localStorage.removeItem("user");

      localStorage.removeItem("token");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    const response = await fetch(
      url,

      {
        ...options,

        headers: {
          ...(options.headers || {}),

          Authorization: `Bearer ${token}`,

          Accept: "application/json",
        },
      },
    );

    if (response.status === 401) {
      localStorage.removeItem("user");

      localStorage.removeItem("token");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    return response;
  }

  async function load() {
    setLoading(true);

    setMessage("");

    try {
      const [sentResponse, acceptedResponse, inboxResponse] = await Promise.all(
        [
          authFetch(`${API_BASE}/api/meetings/sent`),

          authFetch(`${API_BASE}/api/meetings/accepted`),

          authFetch(`${API_BASE}/api/meetings/inbox`),
        ],
      );

      if (!sentResponse || !acceptedResponse || !inboxResponse) {
        return;
      }

      const sentData = await sentResponse

        .json()

        .catch(() => []);

      const acceptedData = await acceptedResponse

        .json()

        .catch(() => []);

      const inboxData = await inboxResponse

        .json()

        .catch(() => []);

      setSent(sentResponse.ok ? normalizeArray(sentData) : []);

      setAccepted(acceptedResponse.ok ? normalizeArray(acceptedData) : []);

      setInbox(inboxResponse.ok ? normalizeArray(inboxData) : []);

      if (!sentResponse.ok || !acceptedResponse.ok || !inboxResponse.ok) {
        setMessage("Уулзалтын мэдээлэл уншихад алдаа гарлаа.");
      }
    } catch {
      setMessage("Сервертэй холбогдож чадсангүй.");

      setSent([]);

      setAccepted([]);

      setInbox([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingInbox = useMemo(
    () =>
      inbox.filter(
        (meeting) => String(meeting?.status || "").toLowerCase() === "pending",
      ),

    [inbox],
  );

  const pendingSent = useMemo(
    () =>
      sent.filter(
        (meeting) => String(meeting?.status || "").toLowerCase() === "pending",
      ),

    [sent],
  );
  const myMeetings = useMemo(
    () =>
      uniqueMeetings(
        [...accepted, ...sent, ...inbox].filter(
          (meeting) =>
            String(meeting?.status || "").toLowerCase() === "accepted",
        ),
      ),
    [accepted, sent, inbox],
  );

  const allMeetings = useMemo(
    () =>
      uniqueMeetings([
        ...myMeetings,
        ...inbox.filter(
          (meeting) =>
            String(meeting?.status || "").toLowerCase() === "pending",
        ),
        ...sent.filter(
          (meeting) =>
            String(meeting?.status || "").toLowerCase() === "pending",
        ),
      ]),
    [myMeetings, inbox, sent],
  );

  const byDay = useMemo(() => {
    const map = {};

    allMeetings.forEach((meeting) => {
      const key = isoKey(meeting.start_time);

      if (!key) return;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(meeting);
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const first = parseDate(a.start_time)?.getTime() || 0;

        const second = parseDate(b.start_time)?.getTime() || 0;

        return first - second;
      });
    });

    return map;
  }, [allMeetings]);

  const grid = useMemo(
    () => monthGrid(viewDate),

    [viewDate],
  );

  const selectedKey = isoKey(selectedDate);

  const selectedMeetings = byDay[selectedKey] || [];

  const title = viewDate.toLocaleDateString(
    "mn-MN",

    {
      year: "numeric",

      month: "long",
    },
  );

  async function respondToMeeting(meeting, status) {
    if (!meeting?.id || respondingId) return;

    try {
      setRespondingId(meeting.id);

      const action = status === "accepted" ? "accept" : "decline";

      const response = await authFetch(
        `${API_BASE}/api/meetings/${meeting.id}/${action}`,

        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response) return;

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showNotification(
          data?.message ||
            (status === "accepted"
              ? "Уулзалтын хүсэлтийг зөвшөөрөхөд алдаа гарлаа."
              : "Уулзалтын хүсэлтээс татгалзахад алдаа гарлаа."),

          "error",
        );

        return;
      }
      if (status === "accepted") {
        const updatedMeeting = {
          ...meeting,
          ...data,
          status: "accepted",
          zoom_join_url: data?.zoom_join_url || meeting?.zoom_join_url || null,
        };
        setInbox((current) =>
          current.map((item) =>
            Number(item.id) === Number(meeting.id) ? updatedMeeting : item,
          ),
        );
        setAccepted((current) =>
          uniqueMeetings([
            ...current.filter((item) => Number(item.id) !== Number(meeting.id)),
            updatedMeeting,
          ]),
        );
        showNotification("Уулзалтын хүсэлтийг зөвшөөрлөө.", "success");
      } else {
        setInbox((current) =>
          current.filter((item) => Number(item.id) !== Number(meeting.id)),
        );
        setAccepted((current) =>
          current.filter((item) => Number(item.id) !== Number(meeting.id)),
        );
        showNotification("Уулзалтын хүсэлтээс татгалзлаа.", "success");
      }

      await load();
    } catch {
      showNotification("Сервертэй холбогдож чадсангүй.", "error");
    } finally {
      setRespondingId(null);
    }
  }

  function openZoomMeeting(meeting) {
    const status = String(meeting?.status || "").toLowerCase();

    const zoomUrl = String(meeting?.zoom_join_url || "").trim();

    if (status !== "accepted") {
      showNotification("Уулзалтыг эхлээд зөвшөөрөх шаардлагатай.", "error");

      return;
    }

    if (!zoomUrl) {
      showNotification("Zoom холбоос үүсээгүй байна.", "error");

      return;
    }

    window.open(zoomUrl, "_blank", "noopener,noreferrer");
  }

  function openEditMeeting(meeting) {
    const date = parseDate(meeting?.start_time);

    if (!date) return;

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    const hour = String(date.getHours()).padStart(2, "0");

    const minute = String(date.getMinutes()).padStart(2, "0");

    setEditingMeeting(meeting);

    setEditDate(`${year}-${month}-${day}`);

    setEditTime(`${hour}:${minute}`);

    setMessage("");
  }

  function closeEditMeeting() {
    if (savingEdit) return;

    setEditingMeeting(null);

    setEditDate("");

    setEditTime("");
  }

  async function saveMeetingSchedule() {
    if (!editingMeeting?.id || !editDate || !editTime || savingEdit) return;

    try {
      setSavingEdit(true);

      const currentEnd = parseDate(editingMeeting?.end_time);

      let endTime = null;

      if (currentEnd) {
        endTime = `${String(currentEnd.getHours()).padStart(2, "0")}:${String(
          currentEnd.getMinutes(),
        ).padStart(2, "0")}`;
      }

      const response = await authFetch(
        `${API_BASE}/api/meetings/${editingMeeting.id}/edit`,

        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            date: editDate,

            startTime: editTime,

            endTime,
          }),
        },
      );

      if (!response) return;

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showNotification(
          data?.message || "Уулзалтын огноо, цагийг өөрчлөхөд алдаа гарлаа.",

          "error",
        );

        return;
      }

      showNotification(
        "Уулзалтын огноо, цагийг амжилттай өөрчиллөө.",

        "success",
      );

      setEditingMeeting(null);

      setEditDate("");

      setEditTime("");

      await load();
    } catch {
      showNotification("Сервертэй холбогдож чадсангүй.", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  function openMeetingCreate() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    navigate("/user/meeting/create");
  }

  function goPreviousMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),

          current.getMonth() - 1,

          1,
        ),
    );
  }

  function goNextMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),

          current.getMonth() + 1,

          1,
        ),
    );
  }

  function selectMeeting(meeting) {
    const date = parseDate(meeting?.start_time);

    if (!date) return;

    setSelectedDate(date);

    setViewDate(
      new Date(
        date.getFullYear(),

        date.getMonth(),

        1,
      ),
    );
  }

  const eventsByDay = useMemo(() => {
    const map = {};

    events.forEach((event) => {
      const key = isoKey(event.start_time || event.start_date);

      if (!key) return;

      if (!map[key]) map[key] = [];

      map[key].push(event);
    });

    return map;
  }, [events]);

  const selectedEvents = eventsByDay[selectedKey] || [];

  const selectedDateLabel = selectedDate.toLocaleDateString("mn-MN", {
    month: "long",

    day: "numeric",

    weekday: "long",
  });

  function goToday() {
    const today = new Date();

    setSelectedDate(today);

    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <UserShell title="Календар">
      <main className="calPage">
        <header className="calTop">
          <div>
            <h1>Календар</h1>

            <p>Эвэнт болон эвэнтийн дараах 1:1 уулзалтууд</p>
          </div>

          <div className="calTopActions">
            <button type="button" className="calToday" onClick={goToday}>
              Өнөөдөр
            </button>

            <button
              type="button"
              className="calCreate"
              onClick={openMeetingCreate}
            >
              <FiPlus />
              Уулзалт товлох
            </button>
          </div>
        </header>

        <section className="calWorkspace">
          <div className="calMain">
            <div className="calToolbar">
              <div className="calMonthNav">
                <button type="button" onClick={goPreviousMonth}>
                  <FiChevronLeft />
                </button>

                <button type="button" onClick={goNextMonth}>
                  <FiChevronRight />
                </button>

                <h2>{title}</h2>
              </div>

              <div className="calLegend">
                <span>
                  <i className="eventDot" /> Эвэнт · {events.length}
                </span>

                <span>
                  <i className="meetingDot" /> Уулзалт · {myMeetings.length}
                </span>

                <span>
                  <i className="pendingDot" /> Хүлээгдэж буй ·{" "}
                  {pendingInbox.length}
                </span>
              </div>
            </div>

            <div className="calWeekdays">
              {[
                "ДАВАА",

                "МЯГМАР",

                "ЛХАГВА",

                "ПҮРЭВ",

                "БААСАН",

                "БЯМБА",

                "НЯМ",
              ].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calGrid">
              {grid.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      className="calCell calCellEmpty"
                      key={`empty-${index}`}
                    />
                  );
                }

                const key = isoKey(date);

                const meetings = byDay[key] || [];

                const dayEvents = eventsByDay[key] || [];

                const active = key === selectedKey;

                const today = key === isoKey(new Date());

                return (
                  <button
                    type="button"
                    key={key}
                    className={`calCell ${active ? "selected" : ""} ${today ? "today" : ""}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="calDayNumber">{date.getDate()}</span>

                    <div className="calCellItems">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          className="calItem event"
                          key={`event-${event.id}`}
                        >
                          <FiCalendar />
                          {formatTime(
                            event.start_time || event.start_date,
                          )}{" "}
                          {event.title || "Эвэнт"}
                        </span>
                      ))}

                      {meetings

                        .slice(0, Math.max(0, 3 - dayEvents.length))

                        .map((meeting) => (
                          <span
                            className={`calItem ${
                              String(meeting.status || "").toLowerCase() ===
                              "pending"
                                ? "pending"
                                : "meeting"
                            }`}
                            key={`meeting-${meeting.id}-${meeting.start_time}`}
                          >
                            <FiClock />
                            {formatTime(meeting.start_time)}{" "}
                            {meeting.title || meetingPersonName(meeting)}
                          </span>
                        ))}

                      {dayEvents.length + meetings.length > 3 && (
                        <small>
                          +{dayEvents.length + meetings.length - 3} бусад
                        </small>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="calRight">
            <section className="calSideCard">
              <div className="calSideHeading">
                <div>
                  <small>СОНГОСОН ӨДӨР</small>

                  <h3>{selectedDateLabel}</h3>
                </div>
              </div>

              <div className="calSchedule">
                {selectedEvents.length === 0 &&
                selectedMeetings.length === 0 ? (
                  <div className="calEmpty">Энэ өдөр товлосон зүйл алга.</div>
                ) : (
                  <>
                    {selectedEvents.map((event) => (
                      <article
                        className="calScheduleItem event"
                        key={`side-event-${event.id}`}
                      >
                        <div className="calScheduleTime">
                          {formatTime(event.start_time || event.start_date)}
                        </div>

                        <div className="calScheduleBody">
                          <strong>{event.title || "Эвэнт"}</strong>

                          <span>
                            {event.location || event.address || "Эвэнт"}
                          </span>
                        </div>

                        <span className="calVideoIcon">
                          <FiCalendar />
                        </span>
                      </article>
                    ))}

                    {selectedMeetings.map((meeting) => (
                      <article
                        className={`calScheduleItem ${
                          String(meeting.status || "").toLowerCase() ===
                          "pending"
                            ? "pending"
                            : "meeting"
                        }`}
                        key={`side-meeting-${meeting.id}-${meeting.start_time}`}
                      >
                        <div className="calScheduleTime">
                          {formatTime(meeting.start_time)}
                        </div>

                        <div className="calAvatar">
                          {personInitials(meetingPersonName(meeting))}
                        </div>

                        <div className="calScheduleBody">
                          <strong>{meetingPersonName(meeting)}</strong>

                          <span>{meeting.title || "1:1 уулзалт"}</span>
                        </div>

                        <button
                          type="button"
                          className="calVideoIcon"
                          onClick={() => openZoomMeeting(meeting)}
                          disabled={
                            String(meeting?.status || "").toLowerCase() !==
                              "accepted" || !meeting?.zoom_join_url
                          }
                          title={
                            String(meeting?.status || "").toLowerCase() ===
                              "accepted" && meeting?.zoom_join_url
                              ? "Zoom уулзалтад орох"
                              : "Zoom холбоос хараахан бэлэн болоогүй"
                          }
                        >
                          <FiVideo />
                        </button>
                      </article>
                    ))}
                  </>
                )}
              </div>

              <button
                type="button"
                className="calAddMeeting"
                onClick={openMeetingCreate}
              >
                <FiPlus />
                Сул цаг — уулзалт товлох
              </button>
            </section>

            <section className="calSideCard calRequests">
              <div className="calRequestHeader">
                <h3>Хүсэлтүүд</h3>

                <span>Ирсэн · {pendingInbox.length}</span>
              </div>

              {loading ? (
                <div className="calEmpty">Уншиж байна...</div>
              ) : pendingInbox.length === 0 ? (
                <div className="calEmpty">Хүлээгдэж буй хүсэлт алга.</div>
              ) : (
                <div className="calRequestList">
                  {pendingInbox.slice(0, 5).map((meeting) => {
                    const busy = respondingId === meeting.id;

                    const name = meetingPersonName(meeting);

                    return (
                      <article className="calRequest" key={meeting.id}>
                        <div className="calAvatar">{personInitials(name)}</div>

                        <div className="calRequestInfo">
                          <strong>{name}</strong>

                          <span>
                            {formatTime(meeting.start_time)} ·{" "}
                            {meeting.title || "Уулзалт"}
                          </span>
                        </div>

                        <div className="calRequestActions">
                          <button
                            type="button"
                            className="edit"
                            disabled={busy}
                            onClick={() => openEditMeeting(meeting)}
                            title="Цаг өөрчлөх"
                          >
                            <FiEdit3 />
                          </button>

                          <button
                            type="button"
                            className="decline"
                            disabled={busy}
                            onClick={() =>
                              respondToMeeting(meeting, "declined")
                            }
                            title="Татгалзах"
                          >
                            <FiX />
                          </button>

                          <button
                            type="button"
                            className="accept"
                            disabled={busy}
                            onClick={() =>
                              respondToMeeting(meeting, "accepted")
                            }
                            title="Зөвшөөрөх"
                          >
                            <FiCheck />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {message && <div className="calMessage">{message}</div>}
          </aside>
        </section>
        {notification && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              top: "24px",
              right: "24px",
              zIndex: 9999,
              minWidth: "280px",
              maxWidth: "420px",
              padding: "14px 18px",
              borderRadius: "12px",
              background: notification.type === "error" ? "#ef4444" : "#16a34a",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.45,
              boxShadow: "0 14px 34px rgba(15, 23, 42, 0.22)",
            }}
          >
            {notification.message}
          </div>
        )}

        {editingMeeting && (
          <div className="rgMeetingEditOverlay" onMouseDown={closeEditMeeting}>
            <section
              className="rgMeetingEditModal"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="meeting-edit-title"
            >
              <header className="rgMeetingEditHeader">
                <div className="rgMeetingEditIcon">
                  <FiEdit3 />
                </div>

                <div>
                  <h3 id="meeting-edit-title">Уулзалтын цаг өөрчлөх</h3>

                  <p>Танд тохирох шинэ огноо, цагийг сонгоно уу.</p>
                </div>

                <button
                  type="button"
                  className="rgMeetingEditClose"
                  onClick={closeEditMeeting}
                >
                  <FiX />
                </button>
              </header>

              <div className="rgMeetingEditPerson">
                <span className="rgInviteAvatar">
                  {personInitials(meetingPersonName(editingMeeting))}
                </span>

                <div>
                  <strong>{meetingPersonName(editingMeeting)}</strong>

                  <small>{meetingPersonEmail(editingMeeting)}</small>
                </div>
              </div>

              <div className="rgMeetingEditFields">
                <label>
                  <span>
                    <FiCalendar /> Огноо
                  </span>

                  <input
                    type="date"
                    value={editDate}
                    onChange={(event) => setEditDate(event.target.value)}
                  />
                </label>

                <label>
                  <span>
                    <FiClock /> Цаг
                  </span>

                  <input
                    type="time"
                    value={editTime}
                    onChange={(event) => setEditTime(event.target.value)}
                  />
                </label>
              </div>

              <div className="rgMeetingEditActions">
                <button
                  type="button"
                  className="rgMeetingEditCancel"
                  onClick={closeEditMeeting}
                  disabled={savingEdit}
                >
                  Цуцлах
                </button>

                <button
                  type="button"
                  className="rgMeetingEditSave"
                  onClick={saveMeetingSchedule}
                  disabled={!editDate || !editTime || savingEdit}
                >
                  <FiCheck />

                  {savingEdit ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </UserShell>
  );
}
