  import { useEffect, useMemo, useRef, useState } from "react";
  import UserShell from "../components/UserShell";
  import { API_BASE } from "@/lib/config";
  import { useSearchParams } from "react-router-dom";

  function formatDateTime(dt) {
  if (!dt) return "";

  const raw = String(dt);

  // backend UTC ISO: 2026-05-19T08:30:00.000Z
  if (raw.endsWith("Z")) {
    const d = new Date(raw);
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

  // local MySQL DATETIME: 2026-05-19 16:30:00
  const s = raw.replace("T", " ");
  const [datePart, timePart] = s.split(" ");
  if (!datePart) return "";

  const [year, month, day] = datePart.split("-");
  const time = (timePart || "").slice(0, 5);

  return `${year}/${month}/${day} ${time}`;
}

  function toDateTimeLocal(dt) {
  if (!dt) return "";

  const raw = String(dt);

  if (raw.endsWith("Z")) {
    const d = new Date(raw);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  }

  const s = raw.replace("T", " ");
  const [datePart, timePart] = s.split(" ");
  return `${datePart}T${(timePart || "").slice(0, 5)}`;
}

  function isSvgFile(file) {
    return (
      file?.type === "image/svg+xml" ||
      String(file?.name || "").toLowerCase().endsWith(".svg")
    );
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

  function isImageName(name) {
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(name || ""));
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
        return [{ name: value.trim(), organization: "", topic: "", avatar: null }];
      }
      return [];
    }
  }

  function getSpeakerAvatar(sp) {
    return sp?.avatar_url || sp?.avatar || sp?.image_url || sp?.profile || sp?.photo || "";
  }

  function makeSpeaker() {
    return {
      name: "",
      organization: "",
      topic: "",
      avatar: null,
    };
  }

  function getCurrentUser() {
    const keys = ["user", "authUser", "currentUser", "profile"];
    for (const key of keys) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value) return value;
      } catch {}
    }

    const email = localStorage.getItem("email") || localStorage.getItem("userEmail");
    return email ? { email } : null;
  }

  function canEditEvent(ev) {
    if (!ev) return false;

    const user = getCurrentUser();

    const userId = Number(
      user?.id ||
        user?.user_id ||
        user?.userId ||
        user?.user?.id
    );

    const eventCreatorId = Number(
      ev?.created_by ||
        ev?.created_by_id ||
        ev?.creator_id ||
        ev?.user_id ||
        ev?.organizer_id
    );

    const userEmail = String(
      user?.email ||
        user?.user?.email ||
        localStorage.getItem("email") ||
        localStorage.getItem("userEmail") ||
        ""
    ).toLowerCase();

    const creatorEmail = String(
      ev?.created_by_email ||
        ev?.creator_email ||
        ev?.user_email ||
        ev?.organizer_email ||
        ""
    ).toLowerCase();

    return (
      ev?.relation_type === "created" ||
      (Number.isFinite(userId) && Number.isFinite(eventCreatorId) && userId === eventCreatorId) ||
      (userEmail && creatorEmail && userEmail === creatorEmail)
    );
  }

  export default function Event() {
    const rightTopRef = useRef(null);
    const fileInputRef = useRef(null);
    const [searchParams] = useSearchParams();
    const [editingEventId, setEditingEventId] = useState(null);
    const [paymentEvent, setPaymentEvent] = useState(null);
    const [checkingPayment, setCheckingPayment] = useState(false);
    const [eventFiles, setEventFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [fileNote, setFileNote] = useState("");

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
    const [mode, setMode] = useState("all");

    const [lbOpen, setLbOpen] = useState(false);
    const [lbIndex, setLbIndex] = useState(0);
    const lbThumbStripRef = useRef(null);

    function handleSelectEvent(item) {
    setSelectedEventId(item.id);
    setShowCreate(false);
    setEditingEventId(null);

    setTimeout(() => {
      rightTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

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

      const res = await fetch(`${API_BASE}/api/events/my-joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setEvents([]);
        setErrMsg(data?.message || "Failed to load history");
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setEvents(list.filter((ev) => isEventFinished(ev)));
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

        setBookedIds(Array.isArray(data) ? data.map(Number).filter(Number.isFinite) : []);
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

    useEffect(() => {
      if (mode === "history") fetchHistory();
      else fetchEvents();

      fetchMyBookedIds();
      fetchMyEvents();
    }, [mode]);

    useEffect(() => {
    const now = Date.now();
    const upcoming = [];
    const finished = [];

    for (const ev of myEvents) {
      const end = ev.end_time ? new Date(ev.end_time).getTime() : null;

      const normalized = {
        ...ev,
        relation_type:
          ev.relation_type || (canEditEvent(ev) ? "created" : "joined"),
      };

      if (end && !Number.isNaN(end) && end < now) {
        finished.push(normalized);
      } else {
        upcoming.push(normalized);
      }
    }

    upcoming.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
    finished.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));

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
    const eventId = searchParams.get("eventId");

    if (eventId) {
      setSelectedEventId(Number(eventId));
      setShowCreate(false);
      setEditingEventId(null);
    }
  }, [searchParams]);

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

      fetchParticipants(id);
    }, [selectedEvent?.id]);

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

      if (isEventFinished(selectedEvent)) fetchEventFiles(id);
      else setEventFiles([]);
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

    const minDateTime = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    function resetForm() {
      setEditingEventId(null);
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
      resetForm();
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

    function openEdit(ev) {
      if (!ev) return;

      if (!canEditEvent(ev)) {
        setErrMsg("Та зөвхөн өөрийн үүсгэсэн эвентийг засах боломжтой.");
        return;
      }

      setErrMsg("");
      setSuccessMsg("");
      setInviteLink("");

      setEditingEventId(ev.id);
      setShowCreate(true);
      setSelectedEventId(null);

      const parsedSpeakers = parseSpeakers(ev.speaker);
      const parsedAgenda = parseAgenda(ev.agenda);

      setTitle(ev.title || "");
      setDescription(ev.description || "");
      setSpeakers(parsedSpeakers.length ? parsedSpeakers : [makeSpeaker()]);
      setAgendas(parsedAgenda.length ? parsedAgenda : [{ text: "", time: "" }]);
      setStartTime(toDateTimeLocal(ev.start_time));
      setEndTime(toDateTimeLocal(ev.end_time));
      setImageUrl(ev.image_url || "");
      setImageFile(null);
      setMaxParticipants(ev.max_participants || "");
      setVisibility(ev.visibility || "public");

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
    async function handleCheckPayment() {
      if (!paymentEvent) return;

      setCheckingPayment(true);

      setTimeout(async () => {
        await handleBook(paymentEvent);
        setCheckingPayment(false);
        setPaymentEvent(null);
      }, 1800);
    }

    async function handleCreate(e) {
      e.preventDefault();

      if (creating) return;

      setErrMsg("");
      setSuccessMsg("");
      setInviteLink("");

      if (!title.trim() || !start_time) {
        setErrMsg("Title and start time are required.");
        return;
      }

      if (!editingEventId && new Date(start_time) < new Date()) {
        setErrMsg("Өнгөрсөн огноо сонгох боломжгүй.");
        return;
      }

      if (end_time && new Date(end_time) < new Date(start_time)) {
        setErrMsg("Дуусах цаг эхлэх цагаас өмнө байж болохгүй.");
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
        fd.append("start_time", start_time.replace("T", " "));
        fd.append("end_time", end_time ? end_time.replace("T", " ") : "");
        fd.append("image_url", image_url.trim());
        fd.append("max_participants", max_participants ? String(max_participants) : "0");
        fd.append("visibility", visibility);

        if (imageFile) fd.append("image", imageFile);

        speakers.forEach((sp) => {
          if (sp.avatar instanceof File) {
            fd.append("speaker_avatars", sp.avatar);
          }
        });

        const url = editingEventId
          ? `${API_BASE}/api/events/${editingEventId}`
          : `${API_BASE}/api/events`;

        const res = await fetch(url, {
          method: editingEventId ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrMsg(
            data?.message ||
              (editingEventId ? "Failed to update event" : "Failed to create event")
          );
          return;
        }

        const saved = data?.event || data;

        setSuccessMsg(editingEventId ? "Event updated ✅" : "Event created ✅");

        await fetchEvents();
        await fetchMyBookedIds();
        await fetchMyEvents();

        resetForm();
        setShowCreate(false);
        setEditingEventId(null);
        setSelectedEventId(saved?.id || null);
        setMode("all");
      } catch (e2) {
        console.error(e2);
        setErrMsg(
          editingEventId
            ? "Network error while updating event"
            : "Network error while creating event"
        );
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

        // SEND JOIN REQUEST INSTEAD OF DIRECT BOOK
        const res = await fetch(
          `${API_BASE}/api/events/${ev.id}/join-request`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrMsg(data?.message || "Failed to send request");
          return;
        }

        // refresh
        await Promise.all([
          fetchEvents(),
          fetchMyBookedIds(),
          fetchMyEvents(),
        ]);

        setSuccessMsg("Хүсэлт амжилттай илгээгдлээ ✅");

        setTimeout(() => {
          setSuccessMsg("");
        }, 2000);

      } catch (e) {
        console.error(e);
        setErrMsg("Network error while sending request");
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
        if (isSvgFile(imageFile)) {
          setErrMsg("SVG зураг оруулах боломжгүй.");
          setCreating(false);
          return;
        }

        for (const sp of speakers) {
          if (sp.avatar instanceof File && isSvgFile(sp.avatar)) {
            setErrMsg("SVG avatar оруулах боломжгүй.");
            setCreating(false);
            return;
          }
        }
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
        setErrMsg("Оруулж байхдаа сүлжээний алдаа гарлаа");
      } finally {
        setUploadingFile(false);
      }
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

    function openDetail(id) {
      setShowCreate(false);
      setEditingEventId(null);
      setSelectedEventId(Number(id));
      closeLightbox();

      setTimeout(() => {
        rightTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }

    function openLightboxAt(index) {
      const safeIndex = Math.max(0, Math.min(index, imageFiles.length - 1));
      setLbIndex(safeIndex);
      setLbOpen(true);
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      setLbOpen(false);
      document.body.style.overflow = "";
    }

    function goPrev() {
      if (!imageFiles.length) return;
      setLbIndex((lbIndex - 1 + imageFiles.length) % imageFiles.length);
    }

    function goNext() {
      if (!imageFiles.length) return;
      setLbIndex((lbIndex + 1) % imageFiles.length);
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

    const currentLb = imageFiles[lbIndex];
    const isSelectedBooked = bookedIds.includes(Number(selectedEvent?.id));
    const visibleEvents = useMemo(() => {
      if (mode === "history") {
        return events.filter((ev) => isEventFinished(ev));
      }

      return events.filter((ev) => {
        if (isEventFinished(ev)) return false;

        if (ev.visibility === "private") {
          return canEditEvent(ev);
        }

        return true;
      });
    }, [events, mode]);

    return (
      <UserShell title="Events">
        <div className="uep-wrap">
          <aside className="uep-left">
            <div className="uep-leftCard">
              <button className="uep-createBtnTop" onClick={handleAskCreate} type="button">
                + Эвент Зохиох
              </button>

              <div className="uep-sections">
                <Section
                  title="МИНИЙ ЭВЕНТҮҮД"
                  items={myMeetings}
                  emptyText="Хоосон байна"
                  onClickItem={handleSelectEvent}
                  showBadge={true}
                />

                <Section
                  title="ДУУССАН ЭВЕНТҮҮД"
                  items={finishedMeetings}
                  emptyText="Хоосон байна"
                  onClickItem={handleSelectEvent}
                  showBadge={true}
                />
              </div>

              <button
                className="uep-historyBtn"
                onClick={() => {
                  setMode("history");
                  setSelectedEventId(null);
                  setShowCreate(false);
                  setEditingEventId(null);
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
                          Дууссан: {formatDateTime(selectedEvent.end_time)}
                        </span>
                      )}

                      {mode === "history" && selectedEvent?.relation_type ? (
                        <span className="uep-badge uep-badgeLight">
                          <div
                            className={`event-top-badge ${
                              selectedEvent.relation_type === "created"
                                ? "created"
                                : "joined"
                            }`}
                          >
                            {selectedEvent.relation_type === "created"
                              ? "Үүсгэсэн"
                              : "Бүртгүүлсэн"}
                          </div>
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
                                      }}
                                    />
                                  ) : (
                                    <span>{getInitials(sp.name)}</span>
                                  )}
                                </div>

                                <div className="uep-speakerInfo">
                                  <div className="sp-row">
                                    <span className="sp-label">Нэр:</span>
                                    <span className="sp-value">{sp.name || "-"}</span>
                                  </div>

                                  <div className="sp-row">
                                    <span className="sp-label">Байгууллага:</span>
                                    <span className="sp-value">{sp.organization || "-"}</span>
                                  </div>

                                  <div className="sp-row">
                                    <span className="sp-label">Сэдэв:</span>
                                    <span className="sp-value">{sp.topic || "-"}</span>
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
                              <span className="uep-detailAgendaText">{item.time || "--:--"}</span>
                              <span className="uep-detailAgendaTime">{item.text || ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="uep-joinedRow">
                      <div className="uep-joinedLabel">
                        {loadingParticipants
                          ? "Loading…"
                          : `${participants.length || participantsCount || Number(selectedEvent?.booked_count) || 0} joined`}
                      </div>

                      <div className="uep-avatarsCompact">
                        {participants && participants.length > 0 ? (
                          participants.map((p, index) => {
                            const displayName =
                              p?.name ||
                              `${p?.first_name || ""} ${p?.last_name || ""}`.trim() ||
                              p?.email ||
                              "User";

                            return (
                              <div
                                key={p?.id || index}
                                className="uep-avatarCompact"
                                title={displayName}
                              >
                                <span>{getInitials(displayName)}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="uep-avatarCompact">
                            <span>{getInitials(selectedEvent?.created_by_email || "U")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="uep-detailActions">
                      {canEditEvent(selectedEvent) && !isEventFinished(selectedEvent) && (
                        <button
                          type="button"
                          className="uep-btn uep-btnPrimary"
                          onClick={() => openEdit(selectedEvent)}
                        >
                          Засах
                        </button>
                      )}

                      {mode === "history" ? (
                        <button
                          type="button"
                          className="uep-btn uep-btnPrimary"
                          onClick={() => setSelectedEventId(null)}
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
                          {bookedIds.includes(Number(selectedEvent.id)) ? "Бүртгэлтэй" : "Бүртгүүлэх"}
                        </button>
                      )}
                    </div>

                    {isEventFinished(selectedEvent) && (
                      <div className="uep-filesBox">
                        <h4 className="uep-filesTitle">Файлууд (эвент дууссаны дараа)</h4>

                        <div className="uep-filesUploadRow">
                          <input ref={fileInputRef} type="file" className="uep-fileInput" multiple />

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
                          <div className="uep-emptyMini">Файлууд уншиж байна...</div>
                        ) : eventFiles.length === 0 ? (
                          <div className="uep-emptyMini">
                            {isSelectedBooked ? "Файл байхгүй байна." : "Эвентийг бүртгүүлж файлуудыг харна уу."}
                          </div>
                        ) : (
                          <>
                            {imageFiles.length > 0 && (
                              <div className="uep-gallery" role="list">
                                {imageFiles.slice(0, 6).map((f, idx) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    className="uep-thumb"
                                    title={f.name}
                                    onClick={() => openLightboxAt(idx)}
                                    role="listitem"
                                  >
                                    <img
                                      src={f.url}
                                      alt={f.name}
                                      className="uep-thumbImg"
                                      loading="lazy"
                                      onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
                                    />
                                  </button>
                                ))}
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

                <p className="uep-detailDescBottom">
                  {selectedEvent.description || "Бичсэн тайлбар байхгүй."}
                </p>
              </div>
            ) : null}

            {showCreate ? (
              <div className="uep-createOnly">
                <div className="uep-createRightCard">
                  <div className="uep-createRightHeader">
                    <h4 className="uep-createRightTitle">
                      {editingEventId ? "Эвент Засах" : "Эвент Зохиох"}
                    </h4>
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
                          const preview =
                            sp.avatar instanceof File
                              ? URL.createObjectURL(sp.avatar)
                              : resolveUrl(getSpeakerAvatar(sp));

                          return (
                            <div key={index} className="uep-speakerRow">
                              <label className="uep-speakerAvatar">
                                {preview ? <img src={preview} alt="speaker preview" /> : <span>+</span>}

                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg,.webp,.gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;

                                    if (!file) {
                                      handleSpeakerChange(index, "avatar", null);
                                      return;
                                    }

                                    if (isSvgFile(file)) {
                                      setErrMsg("SVG avatar оруулах боломжгүй.");
                                      handleSpeakerChange(index, "avatar", null);
                                      e.target.value = "";
                                      return;
                                    }

                                    setErrMsg("");
                                    handleSpeakerChange(index, "avatar", file);
                                  }}
                                />
                              </label>

                              <div className="uep-speakerFields">
                                <input
                                  className="uep-inputLight"
                                  placeholder="Нэр"
                                  value={sp.name || ""}
                                  onChange={(e) => handleSpeakerChange(index, "name", e.target.value)}
                                />

                                <input
                                  className="uep-inputLight"
                                  placeholder="Байгууллага / Бусад"
                                  value={sp.organization || ""}
                                  onChange={(e) =>
                                    handleSpeakerChange(index, "organization", e.target.value)
                                  }
                                />

                                <input
                                  className="uep-inputLight"
                                  placeholder="Сэдэв"
                                  value={sp.topic || ""}
                                  onChange={(e) => handleSpeakerChange(index, "topic", e.target.value)}
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
                                value={item.time || ""}
                                onChange={(e) => handleAgendaChange(index, "time", e.target.value)}
                              />

                              <textarea
                                className="uep-textareaLight uep-agendaText"
                                value={item.text || ""}
                                onChange={(e) => handleAgendaChange(index, "text", e.target.value)}
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
                          min={editingEventId ? undefined : minDateTime}
                          onChange={(e) => {
                            const nextStart = e.target.value;

                            if (!editingEventId && nextStart && nextStart < minDateTime) {
                              setErrMsg("Өнгөрсөн огноо сонгох боломжгүй.");
                              setStartTime("");
                              return;
                            }

                            setErrMsg("");
                            setStartTime(nextStart);

                            if (end_time && nextStart && end_time < nextStart) {
                              setEndTime("");
                            }
                          }}
                        />
                      </label>

                      <label className="uep-labelDark">
                        Дуусах цаг
                        <input
                          className="uep-inputLight"
                          type="datetime-local"
                          value={end_time}
                          min={start_time || minDateTime}
                          onChange={(e) => {
                            const nextEnd = e.target.value;

                            if (start_time && nextEnd && nextEnd < start_time) {
                              setErrMsg("Дуусах цаг эхлэх цагаас өмнө байж болохгүй.");
                              setEndTime("");
                              return;
                            }

                            setErrMsg("");
                            setEndTime(nextEnd);
                          }}
                          disabled={!start_time}
                        />
                      </label>
                    </div>
                    <label className="uep-labelDark fileUpload">
                      Эвент Зураг (оруулах)

                      <div className="fileUpload__box">
                        <span className="fileUpload__btn">Зураг сонгох</span>

                        <span className="fileUpload__text">
                          {imageFile
                            ? imageFile.name
                            : editingEventId
                              ? "Шинэ зураг сонгоогүй"
                              : "Файл сонгогдоогүй"}
                        </span>

                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;

                            if (!file) {
                              setImageFile(null);
                              return;
                            }

                            /* BLOCK SVG */
                            if (
                              file.type === "image/svg+xml" ||
                              file.name.toLowerCase().endsWith(".svg")
                            ) {
                              setErrMsg("SVG зураг оруулах боломжгүй.");
                              setImageFile(null);
                              e.target.value = "";
                              return;
                            }

                            setErrMsg("");
                            setImageFile(file);
                          }}
                        />
                      </div>
                    </label>

                    {inviteLink ? (
                      <div className="uep-inviteBox">
                        <div className="uep-inviteTitle">Урилга линк</div>

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
                                setErrMsg("Copy failed.");
                              }
                            }}
                          >
                            Хуулах
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="uep-actions">
                      <button type="button" className="uep-cancelBtn" onClick={closeCreate}>
                        Цуцлах
                      </button>

                      <button
                        type="submit"
                        className="uep-createBtn"
                        disabled={creating}
                      >
                        {creating
                          ? editingEventId
                            ? "Засаж байна..."
                            : "Бүтээж байна..."
                          : editingEventId
                            ? "Хадгалах"
                            : "Бүтээх"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            {!showCreate && !selectedEvent ? (
              <>
                <div className="uep-rightHeader">
                  <h3 className="uep-rightTitle">{mode === "history" ? "Түүх" : "Бүх Эвент"}</h3>

                  <div style={{ display: "flex", gap: 10 }}>
                    {mode === "history" && (
                      <button className="uep-refreshBtn" onClick={() => setMode("all")} type="button">
                        Бүх эвент
                      </button>
                    )}

                    <button
                      className="uep-refreshBtn"
                      onClick={async () => {
                        if (mode === "history") await fetchHistory();
                        else await fetchEvents();

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
                    {mode === "history" ? "Түүх уншиж байна..." : "Эвент уншиж байна..."}
                  </div>
                ) : visibleEvents.length === 0 ? (
                  <div className="uep-empty">
                    {mode === "history" ? "Түүх байхгүй байна." : "Эвент байхгүй байна."}
                  </div>
                ) : (
                  <div className="uep-grid">
                    {visibleEvents.map((ev) => {
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
                            <h4 className="uep-cardTitle" onClick={() => openDetail(ev.id)}>
                              {ev.title}
                            </h4>

                            <p className="uep-time">
                              {formatDateTime(ev.start_time)}
                              {ev.end_time ? ` – ${formatDateTime(ev.end_time)}` : ""}
                            </p>

                            <p className="uep-desc">{ev.description || "No description"}</p>

                            {mode === "history" && (
                              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                                {ev.relation_type === "created" ? "Таны үүсгэсэн" : "Та оролцсон"}
                              </div>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="uep-bookBtn"
                                type="button"
                                onClick={() => {
                                  if (mode === "history") openDetail(ev.id);
                                  else setPaymentEvent(ev);
                                }}
                                disabled={mode === "history" ? false : isBooked}
                              >
                                {mode === "history" ? "Дэлгэрэнгүй" : isBooked ? "Бүртгэгдсэн" : "Бүртгэх"}
                              </button>

                              {canEditEvent(ev) && !isEventFinished(ev) && (
                                <button
                                  className="uep-bookBtn"
                                  type="button"
                                  onClick={() => openEdit(ev)}
                                >
                                  Засах
                                </button>
                              )}
                            </div>
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
            <div
              className="uep-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <h3 className="uep-modalTitle">Шинэ эвент үүсгэх үү?</h3>
              <p className="uep-modalText">Та гишүүнчлэл авах уу.</p>

              <div className="uep-modalActions">
                <button className="uep-modalNo" type="button" onClick={handleConfirmNo}>
                  Үгүй
                </button>

                <button className="uep-modalYes" type="button" onClick={handleConfirmYes}>
                  Тийм
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
                  onClick={() => window.open(currentLb.url, "_blank", "noopener,noreferrer")}
                >
                  ⤴
                </button>

                <button className="uep-lbIconBtn" type="button" title="Хаах" onClick={closeLightbox}>
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
        {paymentEvent && (
          <div className="uep-modalOverlay">
            <div className="uep-modal payment-modal">
              {!checkingPayment ? (
                <>
                  <h3 className="uep-modalTitle">Төлбөрийн мэдээлэл</h3>

                  <div className="payment-info">
                    <p><strong>Банк:</strong> Хаан банк</p>
                    <p><strong>Данс:</strong> 5000000000</p>
                    <p><strong>Хүлээн авагч:</strong> IT Insight</p>
                    <p><strong>Гүйлгээний утга:</strong> {paymentEvent.title}</p>
                  </div>

                  <p className="payment-desc">
                    Төлбөрөө шилжүүлсний дараа админаас баталгаажтал түр хүлээнэ үү. Баталгаажсаны дараа эвентэд бүртгэгдэх болно. Баярлалаа
                  </p>

                  <div className="uep-modalActions">
                    <button className="uep-modalNo" type="button" onClick={() => setPaymentEvent(null)}>
                      Цуцлах
                    </button>

                    <button className="uep-modalYes" type="button" onClick={handleCheckPayment}>
                      Хүсэлт явуулах
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="uep-modalTitle">Төлбөр шалгаж байна...</h3>
                  <p className="payment-desc">
                    Банкны дансыг шалгаж байна. Түр хүлээнэ үү.
                  </p>
                  <div className="payment-loader"></div>
                </>
              )}
            </div>
          </div>
        )}
      </UserShell>
    );
  }

   function Section({
  title,
  items,
  emptyText,
  onClickItem,
  showBadge = false,
}) {
  return (
    <div className="uep-section">
      <h4 className="uep-sectionTitle">{title}</h4>

      {items?.length ? (
        <div className="uep-list">
          {items.slice(0, 4).map((item) => {
            const isCreated =
              item.relation_type === "created";

            return (
              <button
                key={item.id}
                className={`uep-listItem ${
                  showBadge ? "with-badge" : ""
                } ${
                  isCreated
                    ? "is-created"
                    : "is-joined"
                }`}
                onClick={() => onClickItem(item)}
                type="button"
              >
                {showBadge && (
                  <span
                    className={`uep-listBadge ${
                      isCreated
                        ? "created"
                        : "joined"
                    }`}
                  >
                    {isCreated
                      ? "Бүртгүүлсэн"
                      : "Нэгдсэн"}
                  </span>
                )}

                <div className="uep-listLeft">
                  <span className="uep-listName">
                    {item.title || "Event"}
                  </span>

                  <span className="uep-listMeta">
                    {item.start_time
                      ? formatDateTime(item.start_time)
                      : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="uep-emptyMini">
          {emptyText}
        </p>
      )}
    </div>
  );
}