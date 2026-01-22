import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000";

/* =========================
   LocalStorage helpers
========================= */
function getBookedEventIds() {
  try {
    const raw = localStorage.getItem("booked_event_ids");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

function addBookedEventId(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return;

  const ids = getBookedEventIds();
  if (!ids.includes(num)) {
    localStorage.setItem("booked_event_ids", JSON.stringify([...ids, num]));
  }
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

/* =========================
   Component
========================= */
export default function Event() {
  const navigate = useNavigate();
  const rightTopRef = useRef(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start_time, setStartTime] = useState("");
  const [end_time, setEndTime] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [max_participants, setMaxParticipants] = useState("");
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [myMeetings, setMyMeetings] = useState([]);
  const [finishedMeetings, setFinishedMeetings] = useState([]);
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bookedIds, setBookedIds] = useState(() => getBookedEventIds());

  async function fetchEvents() {
    try {
      setErrMsg("");
      setLoadingEvents(true);

      const res = await fetch(`${API_BASE}/api/events`);
      const text = await res.text();

      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        setEvents([]);
        setErrMsg("Server returned non-JSON. Check /api/events route on backend.");
        return;
      }

      if (!res.ok) {
        setEvents([]);
        setErrMsg(data?.message || "Failed to load events");
        return;
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while loading events");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Build My Meetings + Finished Meetings
  useEffect(() => {
    const now = Date.now();
    const bookedSet = new Set(bookedIds.map((x) => Number(x)));
    const bookedEvents = events.filter((ev) => bookedSet.has(Number(ev.id)));

    const upcoming = [];
    const finished = [];

    for (const ev of bookedEvents) {
      const end = ev.end_time ? new Date(ev.end_time).getTime() : null;

      if (end && !Number.isNaN(end) && end < now) finished.push(ev);
      else upcoming.push(ev);
    }

    upcoming.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
    finished.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));

    setMyMeetings(upcoming);
    setFinishedMeetings(finished);
  }, [events, bookedIds]);

  // Selected event object
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => Number(e.id) === Number(selectedEventId)) || null;
  }, [selectedEventId, events]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setImageUrl("");
    setMaxParticipants("");
  }

  function openCreate() {
    setSelectedEventId(null); // ✅ close detail when creating
    setShowCreate(true);
    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closeCreate() {
    setShowCreate(false);
    setErrMsg("");
    setSuccessMsg("");
    resetForm();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");

    if (!title.trim() || !start_time) {
      setErrMsg("Title and start time are required.");
      return;
    }

    try {
      setCreating(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setErrMsg("Please login first.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          start_time,
          end_time: end_time || null,
          image_url: image_url.trim(),
          max_participants: max_participants ? Number(max_participants) : 0,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.message || "Failed to create event");
        return;
      }

    setSuccessMsg("Event created ✅");
    const createdId = data?.event?.id;
    if (createdId) {
      addBookedEventId(createdId);
      setBookedIds(getBookedEventIds());
    }
    await fetchEvents();
    setTimeout(() => closeCreate(), 700);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while creating event");
    } finally {
      setCreating(false);
    }
  }

  // Subscription popup
  function handleAskCreate() {
    setConfirmOpen(true);
  }
  function handleConfirmYes() {
    setConfirmOpen(false);
    openCreate();
  }
  function handleConfirmNo() {
    setConfirmOpen(false);
  }

  // BOOK: add to My Meetings
  async function handleBook(ev) {
    setErrMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrMsg("Please login first.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/${ev.id}/book`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data?.message || "Failed to book event");
        return;
      }

      addBookedEventId(ev.id);
      setBookedIds(getBookedEventIds());

      setSuccessMsg("Booked ✅ Added to My Meetings");
      setTimeout(() => setSuccessMsg(""), 1200);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while booking");
    }
  }

  // open detail panel
  function openDetail(id) {
    setShowCreate(false);
    setSelectedEventId(Number(id));
    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="userLayout">
      <Sidebar />

      <div className="userContent">
        <div className="uep-wrap">
          {/* LEFT PANEL */}
          <aside className="uep-left">
            <button className="uep-createBtnTop" onClick={handleAskCreate} type="button">
              + Create Event
            </button>

            <div className="uep-sections">
              <Section
                title="My Meetings"
                items={myMeetings}
                emptyText="No meetings yet."
                onClickItem={(ev) => openDetail(ev.id)} 
              />

              <Section
                title="Finished Meetings"
                items={finishedMeetings}
                emptyText="No finished meetings."
                onClickItem={(ev) => openDetail(ev.id)} 
              />
            </div>

            <button
              className="uep-historyBtn"
              onClick={() => navigate("/user/history")}
              type="button"
            >
              History
            </button>
          </aside>

          {/* RIGHT SIDE */}
          <main className="uep-right">
            <div ref={rightTopRef} />

            {errMsg ? <div className="uep-error">{errMsg}</div> : null}
            {successMsg ? <div className="uep-success">{successMsg}</div> : null}

            {/* DETAIL VIEW */}
            {!showCreate && selectedEvent ? (
              <div className="uep-createRightCard">
                <div className="uep-createRightHeader">
                  <h4 className="uep-createRightTitle">Event Details</h4>
                  <button
                    className="uep-closeBtn"
                    type="button"
                    onClick={() => setSelectedEventId(null)}
                    title="Back"
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 220, borderRadius: 12, overflow: "hidden", background: "#f3f4f6" }}>
                    <img
                      src={selectedEvent.image_url || "https://via.placeholder.com/600x400"}
                      alt={selectedEvent.title || "Event"}
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{selectedEvent.title}</h3>
                    <p style={{ margin: "6px 0", color: "#6b7280", fontSize: 13 }}>
                      {formatDateTime(selectedEvent.start_time)}
                      {selectedEvent.end_time ? ` – ${formatDateTime(selectedEvent.end_time)}` : ""}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.5 }}>
                      {selectedEvent.description || "No description."}
                    </p>

                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        className="uep-refreshBtn"
                        onClick={() => setSelectedEventId(null)}
                      >
                        Back to events
                      </button>

                      <button
                        type="button"
                        className="uep-bookBtn"
                        onClick={() => handleBook(selectedEvent)}
                        disabled={bookedIds.includes(Number(selectedEvent.id))}
                      >
                        {bookedIds.includes(Number(selectedEvent.id)) ? "Booked" : "Book"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* CREATE VIEW */}
            {showCreate ? (
              <div className="uep-createOnly">
                <div className="uep-createRightCard">
                  <div className="uep-createRightHeader">
                    <h4 className="uep-createRightTitle">Create Event</h4>
                    <button className="uep-closeBtn" onClick={closeCreate} type="button">
                      ✕
                    </button>
                  </div>

                  <form className="uep-formRight" onSubmit={handleCreate}>
                    <div className="uep-row2">
                      <label className="uep-labelDark">
                        Title *
                        <input
                          className="uep-inputLight"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Event title"
                        />
                      </label>

                      <label className="uep-labelDark">
                        Max participants
                        <input
                          className="uep-inputLight"
                          type="number"
                          value={max_participants}
                          onChange={(e) => setMaxParticipants(e.target.value)}
                          min="0"
                          placeholder="0"
                        />
                      </label>
                    </div>

                    <label className="uep-labelDark">
                      Description
                      <textarea
                        className="uep-textareaLight"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Event description"
                      />
                    </label>

                    <div className="uep-row2">
                      <label className="uep-labelDark">
                        Start time *
                        <input
                          className="uep-inputLight"
                          type="datetime-local"
                          value={start_time}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </label>

                      <label className="uep-labelDark">
                        End time
                        <input
                          className="uep-inputLight"
                          type="datetime-local"
                          value={end_time}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </label>
                    </div>

                    <label className="uep-labelDark">
                      Image URL
                      <input
                        className="uep-inputLight"
                        value={image_url}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </label>

                    <div className="uep-actions">
                      <button type="button" className="uep-cancelBtn" onClick={closeCreate}>
                        Cancel
                      </button>
                      <button className="uep-createBtn" disabled={creating}>
                        {creating ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            {/* EVENTS GRID */}
            {!showCreate && !selectedEvent ? (
              <>
                <div className="uep-rightHeader">
                  <h3 className="uep-rightTitle">All Events</h3>
                  <button className="uep-refreshBtn" onClick={fetchEvents} type="button">
                    Refresh
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="uep-empty">Loading events…</div>
                ) : events.length === 0 ? (
                  <div className="uep-empty">No events yet.</div>
                ) : (
                  <div className="uep-grid">
                    {events.map((ev) => {
                      const isBooked = bookedIds.includes(Number(ev.id));

                      return (
                        <div key={ev.id} className="uep-card" role="group">
                          <div
                            className="uep-imgWrap"
                            onClick={() => openDetail(ev.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <img
                              className="uep-img"
                              src={ev.image_url || "https://via.placeholder.com/600x400"}
                              alt={ev.title || "Event"}
                            />
                          </div>

                          <div className="uep-body">
                            <h4
                              className="uep-cardTitle"
                              onClick={() => openDetail(ev.id)}
                              role="button"
                              tabIndex={0}
                            >
                              {ev.title}
                            </h4>

                            <p className="uep-time">
                              {formatDateTime(ev.start_time)}
                              {ev.end_time ? ` – ${formatDateTime(ev.end_time)}` : ""}
                            </p>

                            <p className="uep-desc">{ev.description || "No description"}</p>

                            <button
                              className="uep-bookBtn"
                              type="button"
                              onClick={() => handleBook(ev)}
                              disabled={isBooked}
                              title={isBooked ? "Already booked" : "Book this event"}
                            >
                              {isBooked ? "Booked" : "Book"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </main>
        </div>
      </div>

      {/* CONFIRM POPUP */}
      {confirmOpen && (
        <div className="uep-modalOverlay" onClick={handleConfirmNo} role="presentation">
          <div
            className="uep-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="uep-modalTitle">Create a new event?</h3>
            <p className="uep-modalText">You wanna purchase subscribtion.</p>

            <div className="uep-modalActions">
              <button className="uep-modalNo" type="button" onClick={handleConfirmNo}>
                No
              </button>
              <button className="uep-modalYes" type="button" onClick={handleConfirmYes}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Left list section
========================= */
function Section({ title, items, emptyText, onClickItem }) {
  return (
    <div className="uep-section">
      <h4 className="uep-sectionTitle">{title}</h4>

      {items?.length ? (
        <div className="uep-list">
          {items.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className="uep-listItem"
              onClick={() => onClickItem(item)}
              type="button"
            >
              <span className="uep-listName">{item.title || "Event"}</span>
              <span className="uep-listMeta">
                {item.start_time ? formatDateTime(item.start_time) : ""}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="uep-emptyMini">{emptyText}</p>
      )}
    </div>
  );
}
