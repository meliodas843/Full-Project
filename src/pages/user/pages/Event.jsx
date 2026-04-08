import { useEffect, useMemo, useRef, useState } from "react";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

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

function resolveUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function fallbackImgSrc() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

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
  } catch {
    window.open(resolveUrl(url), "_blank", "noopener,noreferrer");
  }
}

function isImageName(name) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ""));
}

function parseAgenda(agendaValue) {
  if (!agendaValue) return [];
  if (Array.isArray(agendaValue)) return agendaValue;

  try {
    const parsed = JSON.parse(agendaValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSpeakers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  } catch {
    if (typeof value === "string" && value.trim()) {
      return [{ name: value.trim(), organization: "", topic: "", avatar: "" }];
    }
    return [];
  }
}

function getSpeakerAvatar(sp) {
  return (
    sp?.avatar_url ||
    sp?.avatar ||
    sp?.image_url ||
    sp?.profile ||
    sp?.photo ||
    ""
  );
}

function makeSpeaker() {
  return {
    name: "",
    organization: "",
    topic: "",
    avatar: null,
  };
}

export default function Event() {
  const rightTopRef = useRef(null);

  const fileInputRef = useRef(null);
  const [eventFiles, setEventFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileNote, setFileNote] = useState("");

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const lbThumbStripRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speakers, setSpeakers] = useState([makeSpeaker()]);
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

  const [bookedIds, setBookedIds] = useState([]);
  const [agendas, setAgendas] = useState([{ text: "", time: "" }]);

  const [mode, setMode] = useState("all"); // all | history

  function isEventFinished(ev) {
    if (!ev?.end_time) return false;
    const t = new Date(ev.end_time).getTime();
    return Number.isFinite(t) && t < Date.now();
  }

  function handleAgendaChange(index, field, value) {
    setAgendas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addAgendaItem() {
    setAgendas((prev) => [...prev, { text: "", time: "" }]);
  }

  function removeAgendaItem(index) {
    setAgendas((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSpeakerChange(index, field, value) {
    setSpeakers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, makeSpeaker()]);
  }

  function removeSpeaker(index) {
    setSpeakers((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

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

  async function fetchHistory() {
    try {
      setErrMsg("");
      setLoadingEvents(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setEvents([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/my-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setEvents([]);
        setErrMsg(data?.message || "Failed to load history");
        return;
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

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

      setBookedIds(
        Array.isArray(data) ? data.map(Number).filter(Number.isFinite) : [],
      );
    } catch (e) {
      console.error(e);
      setBookedIds([]);
    }
  }

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

      const res = await fetch(
        `${API_BASE}/api/events/${eventId}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

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

  useEffect(() => {
    if (mode === "history") {
      fetchHistory();
    } else {
      fetchEvents();
    }

    fetchMyBookedIds();
    fetchMyEvents();
  }, [mode]);

  useEffect(() => {
    const now = Date.now();
    const upcoming = [];
    const finished = [];

    for (const ev of myEvents) {
      const end = ev.end_time ? new Date(ev.end_time).getTime() : null;
      if (end && !Number.isNaN(end) && end < now) finished.push(ev);
      else upcoming.push(ev);
    }

    upcoming.sort(
      (a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0),
    );
    finished.sort(
      (a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0),
    );

    setMyMeetings(upcoming);
    setFinishedMeetings(finished);
  }, [myEvents]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return (
      myEvents.find((e) => Number(e.id) === Number(selectedEventId)) ||
      events.find((e) => Number(e.id) === Number(selectedEventId)) ||
      null
    );
  }, [selectedEventId, events, myEvents]);

  const selectedSpeakers = useMemo(
    () => parseSpeakers(selectedEvent?.speaker),
    [selectedEvent?.speaker],
  );

  const selectedAgendaItems = useMemo(
    () => parseAgenda(selectedEvent?.agenda),
    [selectedEvent?.agenda],
  );

  useEffect(() => {
    setParticipants([]);
    setParticipantsCount(0);
    setEventFiles([]);
  }, [selectedEventId]);

  useEffect(() => {
    const id = Number(selectedEvent?.id);
    if (!id) {
      setParticipants([]);
      setParticipantsCount(0);
      return;
    }

    const joined = bookedIds.includes(id);
    if (!joined) {
      setParticipants([]);
      setParticipantsCount(Number(selectedEvent?.booked_count) || 0);
      return;
    }

    fetchParticipants(id);
  }, [selectedEvent?.id, bookedIds, selectedEvent?.booked_count]);

  useEffect(() => {
    const id = Number(selectedEvent?.id);
    if (!id) {
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
  }, [selectedEvent?.id, bookedIds, selectedEvent]);

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
      thumb?.scrollIntoView?.({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
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
  }, [lbOpen, lbIndex, imageFiles.length]);

  useEffect(() => {
    if (!lbOpen) return;
    const strip = lbThumbStripRef.current;
    const thumb = strip?.querySelector?.(`[data-lbthumb="${lbIndex}"]`);
    thumb?.scrollIntoView?.({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [lbIndex, lbOpen]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setSpeakers([makeSpeaker()]);
    setAgendas([{ text: "", time: "" }]);
    setStartTime("");
    setEndTime("");
    setImageUrl("");
    setImageFile(null);
    setMaxParticipants("");
    setVisibility("public");
    setInviteLink("");
  }

  function openCreate() {
    setMode("all");
    setSelectedEventId(null);
    setShowCreate(true);
    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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

      const cleanedAgendas = agendas
        .map((item) => ({
          text: String(item.text || "").trim(),
          time: String(item.time || "").trim(),
        }))
        .filter((item) => item.text || item.time);

      const cleanedSpeakers = speakers
        .map((sp) => ({
          name: String(sp.name || "").trim(),
          organization: String(sp.organization || "").trim(),
          topic: String(sp.topic || "").trim(),
        }))
        .filter((sp) => sp.name || sp.organization || sp.topic);

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("speaker", JSON.stringify(cleanedSpeakers));
      fd.append("agenda", JSON.stringify(cleanedAgendas));
      fd.append("start_time", start_time);
      fd.append("end_time", end_time || "");
      fd.append("image_url", image_url.trim());
      fd.append(
        "max_participants",
        max_participants ? String(max_participants) : "0",
      );
      fd.append("visibility", visibility);

      if (imageFile) fd.append("image", imageFile);

      speakers.forEach((sp) => {
        if (sp.avatar) fd.append("speaker_avatars", sp.avatar);
      });

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

      await fetchMyBookedIds();
      await fetchMyEvents();

      if (selectedEvent?.id === ev.id) fetchParticipants(ev.id);

      setSuccessMsg("Бүртгэл амжилттай ✅");
      setTimeout(() => setSuccessMsg(""), 1200);
    } catch (e) {
      console.error(e);
      setErrMsg("Network error while booking");
    }
  }

  async function handleUploadFinishedFile() {
    setErrMsg("");
    setSuccessMsg("");

    if (!selectedEvent?.id) return;

    if (!isEventFinished(selectedEvent)) {
      setErrMsg("Эвент дууссан үед файл оруулах боломжтой.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrMsg("Эхлээд нэвтрэнэ үү.");
      return;
    }

    const files = Array.from(fileInputRef.current?.files || []);
    if (files.length === 0) {
      setErrMsg("Файл сонгоогүй байна.");
      return;
    }

    try {
      setUploadingFile(true);

      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("note", fileNote);

      const res = await fetch(
        `${API_BASE}/api/events/${selectedEvent.id}/files`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );

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
      setErrMsg("Оруулж байхдаа сүлжээний алдаа гарлаа");
    } finally {
      setUploadingFile(false);
    }
  }

  function openDetail(id) {
    setShowCreate(false);
    setSelectedEventId(Number(id));
    closeLightbox();
    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  const currentLb = imageFiles[lbIndex];
  const isSelectedBooked = bookedIds.includes(Number(selectedEvent?.id));

  return (
    <UserShell title="Events">
      <div className="uep-wrap">
        <aside className="uep-left">
          <div className="uep-leftCard">
            <button
              className="uep-createBtnTop"
              onClick={handleAskCreate}
              type="button"
            >
              + Эвент Зохиох
            </button>

            <div className="uep-sections">
              <Section
                title="Миний Эвентүүд"
                items={myMeetings}
                emptyText="No events yet."
                onClickItem={(ev) => openDetail(ev.id)}
              />

              <Section
                title="Дууссан Эвентүүд"
                items={finishedMeetings}
                emptyText="Дууссан эвентүүд байхгүй."
                onClickItem={(ev) => openDetail(ev.id)}
              />
            </div>

            <button
              className="uep-historyBtn"
              onClick={() => {
                setMode("history");
                setSelectedEventId(null);
                setShowCreate(false);
              }}
              type="button"
            >
              Түүх
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
                  <div className="uep-detailKicker">
                    {mode === "history" ? "Түүхэн Эвент" : "Эвент Мэдээлэл"}
                  </div>
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
                    src={
                      resolveUrl(selectedEvent.image_url) || fallbackImgSrc()
                    }
                    alt={selectedEvent.title || "Event"}
                    onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
                  />
                </div>

                <div className="uep-detailInfo">
                  <div className="uep-detailMetaRow">
                    <span className="uep-badge">
                      {formatDateTime(selectedEvent.start_time)}
                    </span>

                    {selectedEvent.end_time && (
                      <span className="uep-badge uep-badgeLight">
                        Дууссан: {formatDateTime(selectedEvent.end_time)}
                      </span>
                    )}

                    {mode === "history" && selectedEvent?.relation_type ? (
                      <span className="uep-badge uep-badgeLight">
                        {selectedEvent.relation_type === "created"
                          ? "Таны үүсгэсэн"
                          : "Та оролцсон"}
                      </span>
                    ) : null}
                  </div>

                  {selectedSpeakers.length > 0 && (
                    <div className="uep-detailField">
                      <strong>Элтгэгч:</strong>
                      <div className="uep-speakersDisplayList">
                        {selectedSpeakers.map((sp, idx) => {
                          const avatar = getSpeakerAvatar(sp);

                          return (
                            <div className="uep-speakerDisplay" key={idx}>
                              <div className="uep-speakerAvatarSmall">
                                {avatar ? (
                                  <img
                                    src={resolveUrl(avatar)}
                                    alt={sp.name || "Speaker"}
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const parent =
                                        e.currentTarget.parentElement;
                                      if (
                                        parent &&
                                        !parent.querySelector("span")
                                      ) {
                                        const span =
                                          document.createElement("span");
                                        span.textContent = getInitials(sp.name);
                                        parent.appendChild(span);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span>{getInitials(sp.name)}</span>
                                )}
                              </div>

                              <div className="uep-speakerInfo">
                                <div className="sp-row">
                                  <span className="sp-label">Нэр:</span>
                                  <span className="sp-value">
                                    {sp.name || "-"}
                                  </span>
                                </div>

                                <div className="sp-row">
                                  <span className="sp-label">Байгууллага:</span>
                                  <span className="sp-value">
                                    {sp.organization || "-"}
                                  </span>
                                </div>

                                <div className="sp-row">
                                  <span className="sp-label">Сэдэв:</span>
                                  <span className="sp-value">
                                    {sp.topic || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedAgendaItems.length > 0 && (
                    <div className="uep-detailField">
                      <strong>Хөтөлбөр:</strong>
                      <div className="uep-detailAgendaList">
                        {selectedAgendaItems.map((item, idx) => (
                          <div key={idx} className="uep-detailAgendaItem">
                            <span className="uep-detailAgendaText">
                              {item.time || "--:--"}
                            </span>
                            <span className="uep-detailAgendaTime">
                              {item.text || ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                        <div
                          key={p.id}
                          className="uep-avatar"
                          title={p.name || p.email}
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.name || "user"} />
                          ) : (
                            <span>{getInitials(p.name || p.email)}</span>
                          )}
                        </div>
                      ))}

                      {participantsCount > 6 && (
                        <div
                          className="uep-avatar uep-avatarMore"
                          title="More people"
                        >
                          +{participantsCount - 6}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="uep-detailActions">
                    {mode === "history" ? (
                      <button
                        type="button"
                        className="uep-btn uep-btnPrimary"
                        onClick={() => {
                          setSelectedEventId(null);
                        }}
                      >
                        Буцах
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="uep-btn uep-btnPrimary"
                        onClick={() => handleBook(selectedEvent)}
                        disabled={bookedIds.includes(Number(selectedEvent.id))}
                      >
                        {bookedIds.includes(Number(selectedEvent.id))
                          ? "Бүртгэлтэй"
                          : "Бүртгүүлэх"}
                      </button>
                    )}
                  </div>

                  {isEventFinished(selectedEvent) && (
                    <div className="uep-filesBox">
                      <h4 className="uep-filesTitle">
                        Файлууд (эвент дууссаны дараа)
                      </h4>

                      <div className="uep-filesUploadRow">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="uep-fileInput"
                          multiple
                        />

                        <button
                          type="button"
                          className="uep-btn uep-btnPrimary"
                          onClick={handleUploadFinishedFile}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? "Оруулж байна..." : "Оруулах"}
                        </button>
                      </div>

                      {filesLoading ? (
                        <div className="uep-emptyMini">
                          Файлууд уншиж байна...
                        </div>
                      ) : eventFiles.length === 0 ? (
                        <div className="uep-emptyMini">
                          {isSelectedBooked
                            ? "Файл байхгүй байна."
                            : "Эвентийг бүртгүүлж файлуудыг харна уу."}
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
                                      onError={(e) =>
                                        (e.currentTarget.src = fallbackImgSrc())
                                      }
                                    />
                                  </button>
                                );
                              })}

                              {imageFiles.length > 6 && (
                                <button
                                  type="button"
                                  className="uep-thumb uep-thumbMore"
                                  onClick={() => openLightboxAt(6)}
                                  title="Өөр зурагнууд"
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
                                    <span className="uep-fileRowName">
                                      {name}
                                    </span>
                                    <span className="uep-fileRowMeta">
                                      {f.uploaded_by_email || ""}
                                    </span>
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

              <p className="uep-detailDescBottom">
                {selectedEvent.description || "Бичсэн тайлбар байхгүй."}
              </p>
            </div>
          ) : null}

          {showCreate ? (
            <div className="uep-createOnly">
              <div className="uep-createRightCard">
                <div className="uep-createRightHeader">
                  <h4 className="uep-createRightTitle">Эвент Зохиох</h4>
                </div>

                <form className="uep-formRight" onSubmit={handleCreate}>
                  <div className="uep-row2">
                    <label className="uep-labelDark">
                      Гарчиг *
                      <input
                        className="uep-inputLight"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Эвентийн гарчиг"
                      />
                    </label>

                    <label className="uep-labelDark">
                      Орох Хүмүүсийн Тоо
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
                      Нууцлал
                      <select
                        className="uep-inputLight"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        <option value="public">Нийт</option>
                        <option value="private">Нууцлал (линк)</option>
                      </select>
                    </label>
                  </div>

                  {visibility === "private" ? (
                    <div className="uep-hintBox">
                      Нууц эвентүүд нь зөвхөн урилга линкээр хандалттай.
                    </div>
                  ) : null}

                  {inviteLink ? (
                    <div className="uep-inviteBox">
                      <div className="uep-inviteTitle">Урилга линк</div>

                      <div className="uep-inviteRow">
                        <input
                          className="uep-inputLight"
                          value={inviteLink}
                          readOnly
                        />

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
                          Хуулах
                        </button>
                      </div>

                      <div className="uep-actions" style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="uep-cancelBtn"
                          onClick={closeCreate}
                        >
                          Болсон
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <label className="uep-labelDark">
                    Тайлбар
                    <textarea
                      className="uep-textareaLight"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Эвентийн дэлгэрэнгүй тайлбар"
                    />
                  </label>

                  <div className="uep-speakerBox">
                    <span className="uep-labelDark">Элтгэгч</span>

                    <div className="uep-speakersWrap">
                      {speakers.map((sp, index) => {
                        const preview = sp.avatar
                          ? URL.createObjectURL(sp.avatar)
                          : "";

                        return (
                          <div key={index} className="uep-speakerRow">
                            <label className="uep-speakerAvatar">
                              {preview ? (
                                <img src={preview} alt="speaker preview" />
                              ) : (
                                <span>+</span>
                              )}

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleSpeakerChange(
                                    index,
                                    "avatar",
                                    e.target.files?.[0] || null,
                                  )
                                }
                              />
                            </label>

                            <div className="uep-speakerFields">
                              <input
                                className="uep-inputLight"
                                placeholder="Нэр"
                                value={sp.name}
                                onChange={(e) =>
                                  handleSpeakerChange(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                              />

                              <input
                                className="uep-inputLight"
                                placeholder="Байгууллага / Бусад"
                                value={sp.organization}
                                onChange={(e) =>
                                  handleSpeakerChange(
                                    index,
                                    "organization",
                                    e.target.value,
                                  )
                                }
                              />

                              <input
                                className="uep-inputLight"
                                placeholder="Сэдэв"
                                value={sp.topic}
                                onChange={(e) =>
                                  handleSpeakerChange(
                                    index,
                                    "topic",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="uep-speakerActions">
                              {speakers.length > 1 && (
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => removeSpeaker(index)}
                                  title="delete speaker"
                                >
                                  <img src="/assets/delete.png" alt="delete" />
                                </button>
                              )}

                              {index === speakers.length - 1 && (
                                <button
                                  type="button"
                                  className="uep-btn uep-btnPrimary"
                                  onClick={addSpeaker}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="uep-labelDark">
                    <span>Хөтөлбөр</span>

                    <div className="uep-agendaWrap">
                      {agendas.map((item, index) => (
                        <div key={index} className="uep-agendaItem">
                          <div className="uep-agendaRow">
                            <input
                              className="uep-inputLight uep-agendaTime"
                              type="time"
                              value={item.time}
                              onChange={(e) =>
                                handleAgendaChange(
                                  index,
                                  "time",
                                  e.target.value,
                                )
                              }
                            />

                            <textarea
                              className="uep-textareaLight uep-agendaText"
                              value={item.text}
                              onChange={(e) =>
                                handleAgendaChange(
                                  index,
                                  "text",
                                  e.target.value,
                                )
                              }
                              placeholder="Хөтөлбөр тайлбар"
                            />
                          </div>

                          <div className="uep-agendaActions">
                            {agendas.length > 1 && (
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => removeAgendaItem(index)}
                                title="delete agenda"
                              >
                                <img src="/assets/delete.png" alt="delete" />
                              </button>
                            )}

                            {index === agendas.length - 1 && (
                              <button
                                type="button"
                                className="uep-btn uep-btnPrimary"
                                onClick={addAgendaItem}
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="uep-row2">
                    <label className="uep-labelDark">
                      Эхлэх цаг *
                      <input
                        className="uep-inputLight"
                        type="datetime-local"
                        value={start_time}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </label>

                    <label className="uep-labelDark">
                      Дуусах цаг
                      <input
                        className="uep-inputLight"
                        type="datetime-local"
                        value={end_time}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="uep-labelDark fileUpload">
                    Эвент Зураг (оруулах)
                    <div className="fileUpload__box">
                      <span className="fileUpload__btn">Зураг сонгох</span>
                      <span className="fileUpload__text">
                        {imageFile ? imageFile.name : "Файл сонгогдоогүй"}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setImageFile(e.target.files?.[0] || null)
                        }
                      />
                    </div>
                  </label>

                  <div className="uep-actions">
                    <button
                      type="button"
                      className="uep-cancelBtn"
                      onClick={closeCreate}
                    >
                      Цуцлах
                    </button>

                    <button className="uep-createBtn" disabled={creating}>
                      {creating ? "Бүтээж байна..." : "Бүтээх"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {!showCreate && !selectedEvent ? (
            <>
              <div className="uep-rightHeader">
                <h3 className="uep-rightTitle">
                  {mode === "history" ? "Түүх" : "Бүх Эвент"}
                </h3>

                <div style={{ display: "flex", gap: 10 }}>
                  {mode === "history" && (
                    <button
                      className="uep-refreshBtn"
                      onClick={() => setMode("all")}
                      type="button"
                    >
                      Бүх эвент
                    </button>
                  )}

                  <button
                    className="uep-refreshBtn"
                    onClick={async () => {
                      if (mode === "history") {
                        await fetchHistory();
                      } else {
                        await fetchEvents();
                      }
                      await fetchMyBookedIds();
                      await fetchMyEvents();
                    }}
                    type="button"
                  >
                    Шинэчлэх
                  </button>
                </div>
              </div>

              {loadingEvents ? (
                <div className="uep-empty">
                  {mode === "history"
                    ? "Түүх уншиж байна..."
                    : "Эвент уншиж байна..."}
                </div>
              ) : events.length === 0 ? (
                <div className="uep-empty">
                  {mode === "history"
                    ? "Түүх байхгүй байна."
                    : "Эвент байхгүй байна."}
                </div>
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              openDetail(ev.id);
                            }
                          }}
                        >
                          <img
                            className="uep-img"
                            src={cover}
                            alt={ev.title || "Event"}
                            onError={(e) =>
                              (e.currentTarget.src = fallbackImgSrc())
                            }
                          />
                        </div>

                        <div className="uep-body">
                          <h4
                            className="uep-cardTitle"
                            onClick={() => openDetail(ev.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                openDetail(ev.id);
                              }
                            }}
                          >
                            {ev.title}
                          </h4>

                          <p className="uep-time">
                            {formatDateTime(ev.start_time)}
                            {ev.end_time
                              ? ` – ${formatDateTime(ev.end_time)}`
                              : ""}
                          </p>

                          <p className="uep-desc">
                            {ev.description || "No description"}
                          </p>

                          {mode === "history" && (
                            <div
                              style={{
                                fontSize: 12,
                                opacity: 0.7,
                                marginBottom: 10,
                              }}
                            >
                              {ev.relation_type === "created"
                                ? "Таны үүсгэсэн"
                                : "Та оролцсон"}
                            </div>
                          )}

                          <button
                            className="uep-bookBtn"
                            type="button"
                            onClick={() =>
                              mode === "history"
                                ? openDetail(ev.id)
                                : handleBook(ev)
                            }
                            disabled={mode === "history" ? false : isBooked}
                            title={
                              mode === "history"
                                ? "Дэлгэрэнгүй"
                                : isBooked
                                  ? "Бүртгэгдсэн"
                                  : "Бүртгүүлэх (энэ эвентэд бүртгүүлнэ)"
                            }
                          >
                            {mode === "history"
                              ? "Дэлгэрэнгүй"
                              : isBooked
                                ? "Бүртгэгдсэн"
                                : "Бүртгэх"}
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
        <div
          className="uep-modalOverlay"
          onClick={handleConfirmNo}
          role="presentation"
        >
          <div
            className="uep-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="uep-modalTitle">Шинэ эвент үүсгэх үү?</h3>
            <p className="uep-modalText">Та гишүүнчлэл авах уу.</p>

            <div className="uep-modalActions">
              <button
                className="uep-modalNo"
                type="button"
                onClick={handleConfirmNo}
              >
                Үгүй
              </button>

              <button
                className="uep-modalYes"
                type="button"
                onClick={handleConfirmYes}
              >
                Тийм
              </button>
            </div>
          </div>
        </div>
      )}

      {lbOpen && currentLb && (
        <div
          className="uep-lbOverlay"
          onClick={closeLightbox}
          role="presentation"
        >
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

          <div
            className="uep-lbStage"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="uep-lbTopRight">
              <button
                className="uep-lbIconBtn"
                type="button"
                title="Суулгах"
                onClick={() => downloadFile(currentLb.rawUrl, currentLb.name)}
              >
                ⬇
              </button>

              <button
                className="uep-lbIconBtn"
                type="button"
                title="Шинэ хуудас дээр нээх"
                onClick={() =>
                  window.open(currentLb.url, "_blank", "noopener,noreferrer")
                }
              >
                ⤴
              </button>

              <button
                className="uep-lbIconBtn"
                type="button"
                title="Хаах"
                onClick={closeLightbox}
              >
                ✕
              </button>
            </div>

            <img
              className="uep-lbImage"
              src={currentLb.url}
              alt={currentLb.name}
            />

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
            <button
              key={item.id}
              className="uep-listItem"
              onClick={() => onClickItem(item)}
              type="button"
            >
              <span className="uep-listName">{item.title || "Event"}</span>
              <span className="uep-listMeta">
                {item.start_time
                  ? new Date(item.start_time).toLocaleString()
                  : ""}
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
