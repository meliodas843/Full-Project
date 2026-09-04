  import { useEffect, useMemo, useRef, useState } from "react";
  import UserShell from "../components/UserShell";
  import { API_BASE } from "@/lib/config";
  import { useSearchParams } from "react-router-dom";
  import EventCreateWizard from "../components/EventCreateWizard";

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
    const [now, setNow] = useState(Date.now());

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

    function parseEventDateTime(value) {
      if (!value) return NaN;

      const raw = String(value).trim();

      if (!raw) return NaN;

      if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
        return new Date(raw).getTime();
      }

      const normalized = raw.replace(" ", "T");

      const match = normalized.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
      );

      if (!match) {
        return new Date(normalized).getTime();
      }

      const [, year, month, day, hour, minute, second = "00"] = match;

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      ).getTime();
    }

    function isEventFinished(ev) {
      if (!ev) return false;

      const value = ev.end_time || ev.start_time;

      if (!value) return false;

      const time = parseEventDateTime(value);

      return Number.isFinite(time) && time <= now;
    }

    function isWithinFinishedDay(ev) {
      if (!ev) return false;

      const value = ev.end_time || ev.start_time;

      if (!value) return false;

      const time = parseEventDateTime(value);

      if (!Number.isFinite(time)) return false;

      const oneDay = 24 * 60 * 60 * 1000;

      return time <= now && now - time < oneDay;
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
      const timer = setInterval(() => {
        setNow(Date.now());
      }, 30000);

      return () => clearInterval(timer);
    }, []);

    useEffect(() => {
      if (mode === "history") fetchHistory();
      else fetchEvents();

      fetchMyBookedIds();
      fetchMyEvents();
    }, [mode]);

    useEffect(() => {
      const upcoming = [];
      const finished = [];

      for (const ev of myEvents) {
        const normalized = {
          ...ev,
          relation_type:
            ev.relation_type || (canEditEvent(ev) ? "created" : "joined"),
        };

        if (!isEventFinished(normalized)) {
          upcoming.push(normalized);
          continue;
        }

        if (isWithinFinishedDay(normalized)) {
          finished.push(normalized);
        }
      }

      upcoming.sort(
        (a, b) =>
          parseEventDateTime(a.start_time) -
          parseEventDateTime(b.start_time)
      );

      finished.sort(
        (a, b) =>
          parseEventDateTime(b.end_time || b.start_time) -
          parseEventDateTime(a.end_time || a.start_time)
      );

      setMyMeetings(upcoming);
      setFinishedMeetings(finished);
    }, [myEvents, now]);

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
    }, [events, mode, now]);

    return (
      <UserShell title="Events">
        <div className={`uep-wrap ${selectedEvent && !showCreate ? "is-detail" : ""}`}>
          {!selectedEvent && (
            <aside className="uep-left">
            <div className="uep-leftCard">
              <button
                className="uep-createBtnTop"
                onClick={handleAskCreate}
                type="button"
              >
                + Create Event
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
            </div>
            </aside>
          )}

          <main className="uep-right">
            <div ref={rightTopRef} />

            {errMsg ? <div className="uep-error">{errMsg}</div> : null}
            {successMsg ? <div className="uep-success">{successMsg}</div> : null}

            {!showCreate && selectedEvent ? (
              <div className="eventDetailPage">
                <button
                  type="button"
                  className="eventDetailBack"
                  onClick={() => setSelectedEventId(null)}
                >
                  <span>←</span>
                  Back
                </button>

                <div className="eventDetailHero">
                  <img
                    src={resolveUrl(selectedEvent.image_url) || fallbackImgSrc()}
                    alt={selectedEvent.title || "Event"}
                    className="eventDetailHeroImage"
                    onError={(e) => {
                      e.currentTarget.src = fallbackImgSrc();
                    }}
                  />

                  <div className="eventDetailHeroShade" />

                  <div className="eventDetailHeroContent">
                    <div className="eventDetailTags">
                      {selectedEvent.visibility ? (
                        <span className="eventDetailTag purple">
                          {selectedEvent.visibility}
                        </span>
                      ) : null}

                      {selectedEvent.category ? (
                        <span className="eventDetailTag cyan">
                          {selectedEvent.category}
                        </span>
                      ) : null}

                      {selectedEvent.type ? (
                        <span className="eventDetailTag cyan">
                          {selectedEvent.type}
                        </span>
                      ) : null}
                    </div>

                    <h1 className="eventDetailHeroTitle">
                      {selectedEvent.title || "Untitled Event"}
                    </h1>
                  </div>

                  <span className="eventDetailStatus">
                    {isEventFinished(selectedEvent)
                      ? "Ended"
                      : bookedIds.includes(Number(selectedEvent.id))
                        ? "Registered"
                        : "Published"}
                  </span>
                </div>

                <div className="eventDetailLayout">
                  <div className="eventDetailMain">
                    <section className="eventDetailSection">
                      <h2>About this Event</h2>

                      <p className="eventDetailDescription">
                        {selectedEvent.description || "No event description."}
                      </p>
                    </section>

                    <section className="eventDetailSection">
                      <h2>Organizer</h2>

                      <div className="eventOrganizer">
                        <div className="eventOrganizerAvatar">
                          {getInitials(
                            selectedEvent.created_by_name ||
                              selectedEvent.created_by_email ||
                              "Organizer"
                          )}
                        </div>

                        <div className="eventOrganizerInfo">
                          <strong>
                            {selectedEvent.created_by_name ||
                              selectedEvent.organizer_name ||
                              selectedEvent.created_by_email ||
                              "Organizer"}
                          </strong>

                          <span>Organizer</span>
                        </div>
                      </div>
                    </section>

                    <section className="eventDetailSection eventRegistrationSection">
                      <div className="eventRegistrationHeader">
                        <h2>Registrations</h2>

                        <span>
                          {participants.length ||
                            participantsCount ||
                            Number(selectedEvent.booked_count) ||
                            0}
                          {" / "}
                          {Number(selectedEvent.max_participants) || 0}
                        </span>
                      </div>

                      <div className="eventRegistrationProgress">
                        <div
                          className="eventRegistrationProgressBar"
                          style={{
                            width: `${
                              Number(selectedEvent.max_participants) > 0
                                ? Math.min(
                                    100,
                                    ((participants.length ||
                                      participantsCount ||
                                      Number(selectedEvent.booked_count) ||
                                      0) /
                                      Number(selectedEvent.max_participants)) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="eventRegistrationStats">
                        <div>
                          <strong>
                            {participants.length ||
                              participantsCount ||
                              Number(selectedEvent.booked_count) ||
                              0}
                          </strong>
                          <span>Registered</span>
                        </div>

                        <div>
                          <strong>
                            {Number(selectedEvent.max_participants) || 0}
                          </strong>
                          <span>Capacity</span>
                        </div>

                        <div>
                          <strong>
                            {Math.max(
                              0,
                              (Number(selectedEvent.max_participants) || 0) -
                                (participants.length ||
                                  participantsCount ||
                                  Number(selectedEvent.booked_count) ||
                                  0)
                            )}
                          </strong>
                          <span>Remaining</span>
                        </div>
                      </div>
                    </section>

                    {selectedSpeakers.length > 0 ? (
                      <section className="eventDetailSection">
                        <h2>Speakers</h2>

                        <div className="eventDetailSpeakers">
                          {selectedSpeakers.map((speaker, index) => {
                            const avatar = getSpeakerAvatar(speaker);

                            return (
                              <div
                                className="eventDetailSpeaker"
                                key={index}
                              >
                                <div className="eventDetailSpeakerAvatar">
                                  {avatar ? (
                                    <img
                                      src={resolveUrl(avatar)}
                                      alt={speaker.name || "Speaker"}
                                    />
                                  ) : (
                                    <span>
                                      {getInitials(speaker.name || "Speaker")}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <strong>{speaker.name || "-"}</strong>

                                  <span>
                                    {speaker.organization || ""}
                                  </span>

                                  {speaker.topic ? (
                                    <small>{speaker.topic}</small>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}

                    {selectedAgendaItems.length > 0 ? (
                      <section className="eventDetailSection">
                        <h2>Agenda</h2>

                        <div className="eventDetailAgenda">
                          {selectedAgendaItems.map((item, index) => (
                            <div
                              className="eventDetailAgendaItem"
                              key={index}
                            >
                              <span>{item.time || "--:--"}</span>
                              <strong>{item.text || ""}</strong>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>

                  <aside className="eventDetailSidebar">
                    <section className="eventDetailSideCard">
                      <h2>Event Details</h2>

                      <div className="eventDetailInfoRow">
                        <div className="eventDetailInfoIcon">
                          📅
                        </div>

                        <div>
                          <span>Start</span>
                          <strong>
                            {formatDateTime(selectedEvent.start_time)}
                          </strong>

                          {selectedEvent.end_time ? (
                            <>
                              <span className="eventDetailInfoSub">
                                End
                              </span>

                              <strong>
                                {formatDateTime(selectedEvent.end_time)}
                              </strong>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="eventDetailInfoRow">
                        <div className="eventDetailInfoIcon cyan">
                          ⌖
                        </div>

                        <div>
                          <span>Location</span>

                          <strong>
                            {selectedEvent.location ||
                              selectedEvent.venue ||
                              selectedEvent.meeting_link ||
                              "Online"}
                          </strong>
                        </div>
                      </div>
                    </section>

                    <section className="eventDetailActionsCard">
                      {canEditEvent(selectedEvent) ? (
                        <>
                          <button
                            type="button"
                            className="eventDetailManageBtn"
                            onClick={() => openEdit(selectedEvent)}
                          >
                            Manage Event
                          </button>

                          <button
                            type="button"
                            className="eventDetailEditBtn"
                            onClick={() => openEdit(selectedEvent)}
                          >
                            Edit Details
                          </button>

                          <button
                            type="button"
                            className="eventDetailAttendeesBtn"
                          >
                            View Attendees
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="eventDetailManageBtn"
                          onClick={() => handleBook(selectedEvent)}
                          disabled={bookedIds.includes(
                            Number(selectedEvent.id)
                          )}
                        >
                          {bookedIds.includes(Number(selectedEvent.id))
                            ? "Registered"
                            : "Register"}
                        </button>
                      )}
                    </section>
                  </aside>
                </div>
              </div>
            ) : null}

            {showCreate ? (
              <EventCreateWizard
                key={editingEventId || "new-event"}
                editingEventId={editingEventId}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                speakers={speakers}
                handleSpeakerChange={handleSpeakerChange}
                addSpeaker={addSpeaker}
                removeSpeaker={removeSpeaker}
                agendas={agendas}
                handleAgendaChange={handleAgendaChange}
                addAgendaItem={addAgendaItem}
                removeAgendaItem={removeAgendaItem}
                start_time={start_time}
                setStartTime={setStartTime}
                end_time={end_time}
                setEndTime={setEndTime}
                image_url={image_url}
                setImageUrl={setImageUrl}
                imageFile={imageFile}
                setImageFile={setImageFile}
                max_participants={max_participants}
                setMaxParticipants={setMaxParticipants}
                visibility={visibility}
                setVisibility={setVisibility}
                creating={creating}
                errMsg={errMsg}
                setErrMsg={setErrMsg}
                successMsg={successMsg}
                minDateTime={minDateTime}
                resolveUrl={resolveUrl}
                getSpeakerAvatar={getSpeakerAvatar}
                isSvgFile={isSvgFile}
                handleCreate={handleCreate}
                closeCreate={closeCreate}
              />
            ) : null}

            {!showCreate && !selectedEvent ? (
              <>
                <div className="uep-rightHeader">
                  <h3 className="uep-rightTitle">
                    {mode === "history" ? "Түүх" : "All Events"}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {mode === "history" && (
                      <button
                        className="uep-refreshBtn"
                        onClick={() => setMode("all")}
                        type="button"
                      >
                        All Events
                      </button>
                    )}

                    {mode !== "history" && (
                      <span className="uep-refreshBtn">
                        {visibleEvents.length} events
                      </span>
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