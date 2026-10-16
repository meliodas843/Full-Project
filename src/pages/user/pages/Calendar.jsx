import { formatMonthMN, formatWeekdayMN } from "@/utils/mongolianDate";
import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { FiPlus, FiEdit3, FiCheck, FiX, FiCalendar, FiClock } from "react-icons/fi";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";
import { getToken, isoKey, meetingPersonEmail, meetingPersonName, monthGrid, normalizeArray, parseDate, personInitials, uniqueMeetings } from "./Calendar.helpers";
import CalendarSidebar from "./CalendarSidebar";
import CalendarMonth from "./CalendarMonth";


export default function Calendar() {
  const navigate = useNavigate();

  const [sent, setSent] = useState([]);

  const [accepted, setAccepted] = useState([]);

  const [inbox, setInbox] = useState([]);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");

  const [respondingId, setRespondingId] = useState(null);

  const [events, ] = useState([]);

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

  const title = formatMonthMN(viewDate);

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

  const selectedDateLabel = formatWeekdayMN(selectedDate);

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
          <CalendarMonth
            byDay={byDay}
            events={events}
            eventsByDay={eventsByDay}
            goNextMonth={goNextMonth}
            goPreviousMonth={goPreviousMonth}
            grid={grid}
            myMeetings={myMeetings}
            pendingInbox={pendingInbox}
            selectedKey={selectedKey}
            setSelectedDate={setSelectedDate}
            title={title}
          />

          <CalendarSidebar
            loading={loading}
            message={message}
            openEditMeeting={openEditMeeting}
            openMeetingCreate={openMeetingCreate}
            openZoomMeeting={openZoomMeeting}
            pendingInbox={pendingInbox}
            respondToMeeting={respondToMeeting}
            respondingId={respondingId}
            selectedDateLabel={selectedDateLabel}
            selectedEvents={selectedEvents}
            selectedMeetings={selectedMeetings}
          />
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
