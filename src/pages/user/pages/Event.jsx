import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

/* =========================
   Helpers
========================= */
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

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "?";
  if (s.includes("@")) return s[0].toUpperCase();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Make sure /uploads/... becomes http://localhost:5000/uploads/...
function resolveUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

// Use local fallback (no internet needed)
function fallbackImgSrc() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

// Download helper
async function downloadFile(url, filename) {
  try {
    const finalUrl = resolveUrl(url);
    const res = await fetch(finalUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = filename || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(a.href);
  } catch (e) {
    window.open(resolveUrl(url), "_blank", "noopener,noreferrer");
  }
}

function isImageName(name) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ""));
}

export default function Event() {
  const navigate = useNavigate();
  const rightTopRef = useRef(null);

  // ====== Files ======
  const fileInputRef = useRef(null);
  const [eventFiles, setEventFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileNote, setFileNote] = useState("");

  // ✅ Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const lbThumbStripRef = useRef(null);

  // ====== Participants ======
  const [participants, setParticipants] = useState([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // ====== UI ======
  const [showCreate, setShowCreate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // ====== Create form ======
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start_time, setStartTime] = useState("");
  const [end_time, setEndTime] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [max_participants, setMaxParticipants] = useState("");

  const [visibility, setVisibility] = useState("public");
  const [inviteLink, setInviteLink] = useState("");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [myEvents, setMyEvents] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  const [finishedMeetings, setFinishedMeetings] = useState([]);

  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // bookedIds from DB
  const [bookedIds, setBookedIds] = useState([]);

  function isEventFinished(ev) {
    if (!ev?.end_time) return false;
    const t = new Date(ev.end_time).getTime();
    return Number.isFinite(t) && t < Date.now();
  }

  /* =========================
     Fetch: Public events only
  ========================= */
  async function fetchEvents() {
    try {
      setErrMsg("");
      setLoadingEvents(true);

      const res = await fetch(`${API_BASE}/api/events`);
      const data = await res.json().catch(() => []);

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

  /* =========================
     Fetch: my booked ids
  ========================= */
  async function fetchMyBookedIds() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBookedIds([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setBookedIds([]);
        return;
      }

      setBookedIds(Array.isArray(data) ? data.map(Number).filter(Number.isFinite) : []);
    } catch (e) {
      console.error(e);
      setBookedIds([]);
    }
  }

  /* =========================
     Fetch: my joined events + accepted meetings
  ========================= */
  async function fetchMyEvents() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMyEvents([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/my-joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setMyEvents([]);
        return;
      }

      setMyEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMyEvents([]);
    }
  }

  async function fetchEventFiles(eventId) {
    try {
      setFilesLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setEventFiles([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/${eventId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setEventFiles([]);
        return;
      }

      setEventFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setEventFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }

  async function fetchParticipants(eventId) {
    try {
      setLoadingParticipants(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setParticipants([]);
        setParticipantsCount(0);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/${eventId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParticipants([]);
        setParticipantsCount(0);
        return;
      }

      const list = Array.isArray(data.participants) ? data.participants : [];
      setParticipants(list);
      setParticipantsCount(Number(data.total_count) || list.length || 0);
    } catch (e) {
      console.error(e);
      setParticipants([]);
      setParticipantsCount(0);
    } finally {
      setLoadingParticipants(false);
    }
  }

  // load everything on first mount
  useEffect(() => {
    fetchEvents();
    fetchMyBookedIds();
    fetchMyEvents();
  }, []);

  // Build My Meetings + Finished Meetings from myEvents
  useEffect(() => {
    const now = Date.now();
    const upcoming = [];
    const finished = [];

    for (const ev of myEvents) {
      const end = ev.end_time ? new Date(ev.end_time).getTime() : null;
      if (end && !Number.isNaN(end) && end < now) finished.push(ev);
      else upcoming.push(ev);
    }

    upcoming.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
    finished.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));

    setMyMeetings(upcoming);
    setFinishedMeetings(finished);
  }, [myEvents]);

  // Selected event object
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return (
      myEvents.find((e) => Number(e.id) === Number(selectedEventId)) ||
      events.find((e) => Number(e.id) === Number(selectedEventId)) ||
      null
    );
  }, [selectedEventId, events, myEvents]);

  // ✅ IMPORTANT: clear data when switching events
  useEffect(() => {
    setParticipants([]);
    setParticipantsCount(0);
    setEventFiles([]);
  }, [selectedEventId]);

  // ✅ FIX #1: participants fetch only for REAL events (not meetings)
  useEffect(() => {
    const id = Number(selectedEvent?.id);
    if (!id) {
      setParticipants([]);
      setParticipantsCount(0);
      return;
    }

    // ✅ meetings: never call participants endpoint
    if (selectedEvent?.type === "meeting") {
      setParticipants([]);
      setParticipantsCount(0);
      return;
    }

    // only fetch participants if joined (booked)
    const joined = bookedIds.includes(id);
    if (!joined) {
      setParticipants([]);
      setParticipantsCount(Number(selectedEvent?.booked_count) || 0);
      return;
    }

    fetchParticipants(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id, selectedEvent?.type, bookedIds]);

  // ✅ FIX #2: files fetch only for REAL finished events (not meetings)
  useEffect(() => {
    const id = Number(selectedEvent?.id);
    if (!id) {
      setEventFiles([]);
      return;
    }

    if (selectedEvent?.type === "meeting") {
      setEventFiles([]);
      return;
    }

    const joined = bookedIds.includes(id);
    if (!joined) {
      setEventFiles([]);
      return;
    }

    if (isEventFinished(selectedEvent)) {
      fetchEventFiles(id);
    } else {
      setEventFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id, selectedEvent?.type, bookedIds]);

  // ✅ build image list for lightbox
  const imageFiles = useMemo(() => {
    return eventFiles
      .filter((f) => isImageName(f.original_name))
      .map((f) => ({
        id: f.id,
        name: f.original_name || "image",
        url: resolveUrl(f.url),
        rawUrl: f.url,
      }));
  }, [eventFiles]);

  const nonImageFiles = useMemo(() => {
    return eventFiles.filter((f) => !isImageName(f.original_name));
  }, [eventFiles]);

  function openLightboxAt(index) {
    const safeIndex = Math.max(0, Math.min(index, imageFiles.length - 1));
    setLbIndex(safeIndex);
    setLbOpen(true);

    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const strip = lbThumbStripRef.current;
      const thumb = strip?.querySelector?.(`[data-lbthumb="${safeIndex}"]`);
      thumb?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 0);
  }

  function closeLightbox() {
    setLbOpen(false);
    document.body.style.overflow = "";
  }

  function goPrev() {
    if (!imageFiles.length) return;
    const next = (lbIndex - 1 + imageFiles.length) % imageFiles.length;
    setLbIndex(next);
  }

  function goNext() {
    if (!imageFiles.length) return;
    const next = (lbIndex + 1) % imageFiles.length;
    setLbIndex(next);
  }

  useEffect(() => {
    if (!lbOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen, lbIndex, imageFiles.length]);

  useEffect(() => {
    if (!lbOpen) return;
    const strip = lbThumbStripRef.current;
    const thumb = strip?.querySelector?.(`[data-lbthumb="${lbIndex}"]`);
    thumb?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [lbIndex, lbOpen]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setImageUrl("");
    setImageFile(null);
    setMaxParticipants("");
    setVisibility("public");
    setInviteLink("");
  }

  function openCreate() {
    setSelectedEventId(null);
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
    setInviteLink("");

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

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("start_time", start_time);
      fd.append("end_time", end_time || "");
      fd.append("image_url", image_url.trim());
      fd.append("max_participants", max_participants ? String(max_participants) : "0");
      fd.append("visibility", visibility);

      if (imageFile) fd.append("image", imageFile);

      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data?.message || "Failed to create event");
        return;
      }

      setSuccessMsg("Event created ✅");

      const created = data?.event;
      if (created?.visibility === "private" && created?.invite_token) {
        const link = `${window.location.origin}/event/invite/${created.invite_token}`;
        setInviteLink(link);
      }

      await fetchEvents();
      await fetchMyBookedIds();
      await fetchMyEvents();

      if (created?.visibility === "private" && created?.invite_token) return;

      setTimeout(() => closeCreate(), 700);
    } catch (e2) {
      console.error(e2);
      setErrMsg("Network error while creating event");
    } finally {
      setCreating(false);
    }
  }

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

  // BOOK (events only)
  async function handleBook(ev) {
    setErrMsg("");
    setSuccessMsg("");

    // ✅ meetings: no booking
    if (ev?.type === "meeting") {
      setErrMsg("This item is a meeting request, not a bookable event.");
      return;
    }

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

      await fetchMyBookedIds();
      await fetchMyEvents();

      if (selectedEvent?.id === ev.id) fetchParticipants(ev.id);

      setSuccessMsg("Booked ✅ Added to My Events");
      setTimeout(() => setSuccessMsg(""), 1200);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while booking");
    }
  }

  // Upload MULTI files (finished only, events only)
  async function handleUploadFinishedFile() {
    setErrMsg("");
    setSuccessMsg("");

    if (!selectedEvent?.id) return;

    if (selectedEvent?.type === "meeting") {
      setErrMsg("Meetings do not support file uploads here.");
      return;
    }

    if (!isEventFinished(selectedEvent)) {
      setErrMsg("You can upload only after the event is finished.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrMsg("Please login first.");
      return;
    }

    const files = Array.from(fileInputRef.current?.files || []);
    if (files.length === 0) {
      setErrMsg("Please choose file(s).");
      return;
    }

    try {
      setUploadingFile(true);

      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("note", fileNote);

      const res = await fetch(`${API_BASE}/api/events/${selectedEvent.id}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data?.message || "Upload failed");
        return;
      }

      setSuccessMsg("Files uploaded ✅");
      setFileNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchEventFiles(selectedEvent.id);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while uploading");
    } finally {
      setUploadingFile(false);
    }
  }

  function openDetail(id) {
    setShowCreate(false);
    setSelectedEventId(Number(id));
    closeLightbox();
    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const currentLb = imageFiles[lbIndex];

  const isSelectedMeeting = selectedEvent?.type === "meeting";
  const isSelectedBooked = bookedIds.includes(Number(selectedEvent?.id));

  return (
    <UserShell title="Events">
      <div className="uep-wrap">
        {/* LEFT PANEL */}
        <aside className="uep-left">
          <div className="uep-leftCard">
            <button className="uep-createBtnTop" onClick={handleAskCreate} type="button">
              + Create Event
            </button>

            <div className="uep-sections">
              <Section
                title="My Events"
                items={myMeetings}
                emptyText="No events yet."
                onClickItem={(ev) => openDetail(ev.id)}
              />

              <Section
                title="Finished Events"
                items={finishedMeetings}
                emptyText="No finished events."
                onClickItem={(ev) => openDetail(ev.id)}
              />
            </div>

            <button className="uep-historyBtn" onClick={() => navigate("/user/history")} type="button">
              History
            </button>
          </div>
        </aside>
        <main className="uep-right">
          <div ref={rightTopRef} />
          {errMsg ? <div className="uep-error">{errMsg}</div> : null}
          {successMsg ? <div className="uep-success">{successMsg}</div> : null}
          {!showCreate && selectedEvent ? (
            <div className="uep-detailCard">
              <div className="uep-detailHead">
                <div>
                  <div className="uep-detailKicker">Event Details</div>
                  <h3 className="uep-detailTitle">{selectedEvent.title}</h3>
                </div>
                <button
                  className="uep-iconBtn"
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="uep-detailBody">
                <div className="uep-detailMedia">
                  <img
                    src={resolveUrl(selectedEvent.image_url) || fallbackImgSrc()}
                    alt={selectedEvent.title || "Event"}
                    onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
                  />
                </div>
                <div className="uep-detailInfo">
                  <div className="uep-detailMetaRow">
                    <span className="uep-badge">{formatDateTime(selectedEvent.start_time)}</span>
                    {selectedEvent.end_time && (
                      <span className="uep-badge uep-badgeLight">
                        Ends: {formatDateTime(selectedEvent.end_time)}
                      </span>
                    )}
                  </div>
                  {!isSelectedMeeting && (
                    <div className="uep-joinedRow">
                      <div className="uep-joinedLabel">
                        {isSelectedBooked
                          ? loadingParticipants
                            ? "Loading…"
                            : `${participantsCount} joined`
                          : `${Number(selectedEvent.booked_count) || 0} joined`}
                      </div>

                      <div className="uep-avatars">
                        {participants.slice(0, 6).map((p) => (
                          <div key={p.id} className="uep-avatar" title={p.name || p.email}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={p.name || "user"} />
                            ) : (
                              <span>{getInitials(p.name || p.email)}</span>
                            )}
                          </div>
                        ))}
                        {participantsCount > 6 && (
                          <div className="uep-avatar uep-avatarMore" title="More people">
                            +{participantsCount - 6}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!isSelectedMeeting && (
                    <div className="uep-detailActions">
                      <button
                        type="button"
                        className="uep-btn uep-btnPrimary"
                        onClick={() => handleBook(selectedEvent)}
                        disabled={bookedIds.includes(Number(selectedEvent.id))}
                      >
                        {bookedIds.includes(Number(selectedEvent.id)) ? "Booked" : "Book"}
                      </button>
                    </div>
                  )}
                  {!isSelectedMeeting && isEventFinished(selectedEvent) && (
                    <div className="uep-filesBox">
                      <h4 className="uep-filesTitle">Files (after event)</h4>

                      <div className="uep-filesUploadRow">
                        <input ref={fileInputRef} type="file" className="uep-fileInput" multiple />

                        <input
                          className="uep-inputLight"
                          value={fileNote}
                          onChange={(e) => setFileNote(e.target.value)}
                          placeholder="Note (optional)"
                        />

                        <button
                          type="button"
                          className="uep-btn uep-btnPrimary"
                          onClick={handleUploadFinishedFile}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? "Uploading..." : "Upload"}
                        </button>
                      </div>

                      {filesLoading ? (
                        <div className="uep-emptyMini">Loading files…</div>
                      ) : eventFiles.length === 0 ? (
                        <div className="uep-emptyMini">
                          {isSelectedBooked ? "No files uploaded yet." : "Book this event to see files later."}
                        </div>
                      ) : (
                        <>
                          {imageFiles.length > 0 && (
                            <div className="uep-gallery" role="list">
                              {imageFiles.slice(0, 6).map((f, idx) => {
                                const name = f.name || "image";
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    className="uep-thumb"
                                    title={name}
                                    onClick={() => openLightboxAt(idx)}
                                    role="listitem"
                                  >
                                    <img
                                      src={f.url}
                                      alt={name}
                                      className="uep-thumbImg"
                                      loading="lazy"
                                      onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
                                    />
                                  </button>
                                );
                              })}

                              {imageFiles.length > 6 && (
                                <button
                                  type="button"
                                  className="uep-thumb uep-thumbMore"
                                  onClick={() => openLightboxAt(6)}
                                  title="Show more images"
                                  role="listitem"
                                >
                                  +{imageFiles.length - 6}
                                </button>
                              )}
                            </div>
                          )}
                          {nonImageFiles.length > 0 && (
                            <div className="uep-filesList">
                              {nonImageFiles.map((f) => {
                                const name = f.original_name || "file";
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    className="uep-fileRow"
                                    onClick={() => downloadFile(f.url, name)}
                                    title={name}
                                  >
                                    <span className="uep-fileRowName">{name}</span>
                                    <span className="uep-fileRowMeta">{f.uploaded_by_email || ""}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="uep-detailDescBottom">{selectedEvent.description || "No description."}</p>
            </div>
          ) : null}
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

                  <div className="uep-row2">
                    <label className="uep-labelDark">
                      Visibility
                      <select
                        className="uep-inputLight"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private (invite link)</option>
                      </select>
                    </label>
                  </div>

                  {visibility === "private" ? (
                    <div className="uep-hintBox">Private events are accessible only via the invite link.</div>
                  ) : null}

                  {inviteLink ? (
                    <div className="uep-inviteBox">
                      <div className="uep-inviteTitle">Invite link</div>
                      <div className="uep-inviteRow">
                        <input className="uep-inputLight" value={inviteLink} readOnly />
                        <button
                          type="button"
                          className="uep-btn uep-btnPrimary"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(inviteLink);
                              setSuccessMsg("Invite link copied ✅");
                              setTimeout(() => setSuccessMsg(""), 1200);
                            } catch {
                              setErrMsg("Copy failed (browser blocked).");
                            }
                          }}
                        >
                          Copy
                        </button>
                      </div>

                      <div className="uep-actions" style={{ marginTop: 10 }}>
                        <button type="button" className="uep-cancelBtn" onClick={closeCreate}>
                          Done
                        </button>
                      </div>
                    </div>
                  ) : null}

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
                    Event Image (upload)
                    <input
                      className="uep-inputLight"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
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
          {!showCreate && !selectedEvent ? (
            <>
              <div className="uep-rightHeader">
                <h3 className="uep-rightTitle">All Events</h3>
                <button
                  className="uep-refreshBtn"
                  onClick={async () => {
                    await fetchEvents();
                    await fetchMyBookedIds();
                    await fetchMyEvents();
                  }}
                  type="button"
                >
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
                    const cover = resolveUrl(ev.image_url) || fallbackImgSrc();

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
                            src={cover}
                            alt={ev.title || "Event"}
                            onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
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
      {confirmOpen && (
        <div className="uep-modalOverlay" onClick={handleConfirmNo} role="presentation">
          <div className="uep-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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
      {lbOpen && currentLb && (
        <div className="uep-lbOverlay" onClick={closeLightbox} role="presentation">
          <button
            className="uep-lbArrow uep-lbArrowLeft"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>

          <div className="uep-lbStage" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="uep-lbTopRight">
              <button
                className="uep-lbIconBtn"
                type="button"
                title="Download"
                onClick={() => downloadFile(currentLb.rawUrl, currentLb.name)}
              >
                ⬇
              </button>

              <button
                className="uep-lbIconBtn"
                type="button"
                title="Open in new tab"
                onClick={() => window.open(currentLb.url, "_blank", "noopener,noreferrer")}
              >
                ⤴
              </button>

              <button className="uep-lbIconBtn" type="button" title="Close" onClick={closeLightbox}>
                ✕
              </button>
            </div>

            <img className="uep-lbImage" src={currentLb.url} alt={currentLb.name} />

            <div className="uep-lbThumbStrip" ref={lbThumbStripRef}>
              {imageFiles.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`uep-lbThumb ${i === lbIndex ? "isActive" : ""}`}
                  onClick={() => setLbIndex(i)}
                  data-lbthumb={i}
                  title={img.name}
                >
                  <img src={img.url} alt={img.name} />
                </button>
              ))}
            </div>
          </div>

          <button
            className="uep-lbArrow uep-lbArrowRight"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
        </div>
      )}
    </UserShell>
  );
}
function Section({ title, items, emptyText, onClickItem }) {
  return (
    <div className="uep-section">
      <h4 className="uep-sectionTitle">{title}</h4>

      {items?.length ? (
        <div className="uep-list">
          {items.slice(0, 4).map((item) => (
            <button key={item.id} className="uep-listItem" onClick={() => onClickItem(item)} type="button">
              <span className="uep-listName">{item.title || "Event"}</span>
              <span className="uep-listMeta">{item.start_time ? new Date(item.start_time).toLocaleString() : ""}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="uep-emptyMini">{emptyText}</p>
      )}
    </div>
  );
}
