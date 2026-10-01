import { useEffect, useMemo, useRef, useState } from "react";

import UserShell from "../components/UserShell";

import { API_BASE, defaultEventCover, getImageSrc } from "@/lib/config";

import { useSearchParams } from "react-router-dom";

import EventCreateWizard from "../components/EventCreateWizard";

function formatDateTime(dt) {
  if (!dt) return "";

  const raw = String(dt).trim().replace("T", " ").replace(/Z$/, "");

  const [datePart, timePart = ""] = raw.split(" ");
  if (!datePart) return "";

  const [year, month, day] = datePart.split("-");
  const time = timePart.slice(0, 5);

  return `${year}/${month}/${day}${time ? ` ${time}` : ""}`;
}

function toDateTimeLocal(dt) {
  if (!dt) return "";

  return String(dt).trim().replace(" ", "T").replace(/Z$/, "").slice(0, 16);
}

function isSvgFile(file) {
  return (
    file?.type === "image/svg+xml" ||
    String(file?.name || "")
      .toLowerCase()

      .endsWith(".svg")
  );
}

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();

  if (!s) return "?";

  if (s.includes("@")) {
    return s[0].toUpperCase();
  }

  const parts = s.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function resolveUrl(url) {
  return getImageSrc(url, "");
}

function fallbackImgSrc(seed = 0) {
  return defaultEventCover(seed);
}

function isImageName(name) {
  return /(png|jpe?g|gif|webp|bmp)$/i.test(String(name || ""));
}

function parseAgenda(agendaValue) {
  if (!agendaValue) return [];

  if (Array.isArray(agendaValue)) {
    return agendaValue;
  }

  try {
    const parsed = JSON.parse(agendaValue);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSpeakers(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      return [parsed];
    }

    return [];
  } catch {
    if (typeof value === "string" && value.trim()) {
      return [
        {
          name: value.trim(),

          organization: "",

          topic: "",

          avatar: null,
        },
      ];
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

function getCurrentUser() {
  const keys = ["user", "authUser", "currentUser", "profile"];

  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");

      if (value) {
        return value;
      }
    } catch {}
  }

  const email =
    localStorage.getItem("email") || localStorage.getItem("userEmail");

  return email ? { email } : null;
}

function canEditEvent(ev) {
  if (!ev) return false;

  const user = getCurrentUser();

  const userId = Number(
    user?.id || user?.user_id || user?.userId || user?.user?.id,
  );

  const eventCreatorId = Number(
    ev?.created_by ||
      ev?.created_by_id ||
      ev?.creator_id ||
      ev?.user_id ||
      ev?.organizer_id,
  );

  const userEmail = String(
    user?.email ||
      user?.user?.email ||
      localStorage.getItem("email") ||
      localStorage.getItem("userEmail") ||
      "",
  ).toLowerCase();

  const creatorEmail = String(
    ev?.created_by_email ||
      ev?.creator_email ||
      ev?.user_email ||
      ev?.organizer_email ||
      "",
  ).toLowerCase();

  return (
    ev?.relation_type === "created" ||
    (Number.isFinite(userId) &&
      Number.isFinite(eventCreatorId) &&
      userId === eventCreatorId) ||
    (userEmail && creatorEmail && userEmail === creatorEmail)
  );
}

function normalizeDateTimeLocalValue(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    return raw.replace(" ", "T").slice(0, 16);
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  const [badge, setBadge] = useState("");

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

  const [now, setNow] = useState(Date.now());

  const [eventSearch, setEventSearch] = useState("");

  const [eventTab, setEventTab] = useState("all");

  const [eventSort, setEventSort] = useState("newest");

  const [reportEvent, setReportEvent] = useState(null);

  const [creating, setCreating] = useState(false);

  const [errMsg, setErrMsg] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const [bookedIds, setBookedIds] = useState([]);

  const [agendas, setAgendas] = useState([{ text: "", time: "" }]);

  const [lbOpen, setLbOpen] = useState(false);

  const [lbIndex, setLbIndex] = useState(0);

  const lbThumbStripRef = useRef(null);

  function parseEventDateTime(value) {
    if (!value) return NaN;

    const raw = String(value).trim();

    if (!raw) return NaN;

    if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
      return new Date(raw).getTime();
    }

    const normalized = raw.replace(" ", "T");

    const match = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
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

      Number(second),
    ).getTime();
  }

  function isEventFinished(ev) {
    if (!ev) return false;

    const value = ev.end_time || ev.start_time;

    if (!value) return false;

    const time = parseEventDateTime(value);

    return Number.isFinite(time) && time <= now;
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
      if (prev.length === 1) {
        return prev;
      }

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
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  async function fetchEvents() {
    try {
      setErrMsg("");

      setLoadingEvents(true);

      const res = await fetch(`${API_BASE}/api/events`);

      const data = await res

        .json()

        .catch(() => []);

      if (!res.ok) {
        setEvents([]);

        setErrMsg(data?.message || "Эвентүүдийг ачаалж чадсангүй.");

        return;
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);

      setErrMsg("Эвентүүдийг ачаалах үед сүлжээний алдаа гарлаа.");

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

      const res = await fetch(
        `${API_BASE}/api/events/my-bookings`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res

        .json()

        .catch(() => []);

      if (!res.ok) {
        setBookedIds([]);

        return;
      }

      setBookedIds(
        Array.isArray(data)
          ? data

              .map(Number)

              .filter(Number.isFinite)
          : [],
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

      const res = await fetch(
        `${API_BASE}/api/events/my-joined`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res

        .json()

        .catch(() => []);

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

      const res = await fetch(
        `${API_BASE}/api/events/${eventId}/files`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res

        .json()

        .catch(() => []);

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res

        .json()

        .catch(() => ({}));

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
    fetchEvents();

    fetchMyBookedIds();

    fetchMyEvents();
  }, []);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) {
      return null;
    }

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

  const minDateTime = normalizeDateTimeLocalValue(new Date());

  function handleStartTimeChange(value) {
    const nextValue = normalizeDateTimeLocalValue(value);

    setStartTime(nextValue);

    if (
      end_time &&
      nextValue &&
      normalizeDateTimeLocalValue(end_time) < nextValue
    ) {
      setEndTime("");
    }
  }

  function handleEndTimeChange(value) {
    setEndTime(normalizeDateTimeLocalValue(value));
  }

  function resetForm() {
    setEditingEventId(null);

    setTitle("");

    setDescription("");

    setBadge("");

    setSpeakers([makeSpeaker()]);

    setAgendas([
      {
        text: "",

        time: "",
      },
    ]);

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

    setBadge(ev.category || "");

    setSpeakers(parsedSpeakers.length ? parsedSpeakers : [makeSpeaker()]);

    setAgendas(parsedAgenda.length ? parsedAgenda : [{ text: "", time: "" }]);

    setStartTime(normalizeDateTimeLocalValue(toDateTimeLocal(ev.start_time)));

    setEndTime(normalizeDateTimeLocalValue(toDateTimeLocal(ev.end_time)));

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
    if (!paymentEvent) {
      return;
    }

    setCheckingPayment(true);

    setTimeout(async () => {
      await handleBook(paymentEvent);

      setCheckingPayment(false);

      setPaymentEvent(null);
    }, 1800);
  }

  async function handleCreate(e) {
    e.preventDefault();

    if (creating) {
      return;
    }

    setErrMsg("");

    setSuccessMsg("");

    setInviteLink("");

    if (!title.trim() || !badge.trim() || !start_time) {
      setErrMsg("Гарчиг болон эхлэх огноо, цагийг заавал оруулна уу.");

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
        setErrMsg("Эхлээд нэвтэрнэ үү.");

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

      fd.append(
        "title",

        title.trim(),
      );

      fd.append(
        "description",

        description.trim(),
      );

      fd.append(
        "category",

        badge.trim(),
      );

      fd.append(
        "speaker",

        JSON.stringify(cleanedSpeakers),
      );

      fd.append(
        "agenda",

        JSON.stringify(cleanedAgendas),
      );

      fd.append(
        "start_time",

        start_time.replace(
          "T",

          " ",
        ),
      );

      fd.append(
        "end_time",

        end_time
          ? end_time.replace(
              "T",

              " ",
            )
          : "",
      );

      fd.append(
        "image_url",

        image_url.trim(),
      );

      fd.append(
        "max_participants",

        max_participants ? String(max_participants) : "0",
      );

      fd.append(
        "visibility",

        visibility,
      );

      if (imageFile) {
        fd.append(
          "image",

          imageFile,
        );
      }

      speakers.forEach((sp) => {
        if (sp.avatar instanceof File) {
          fd.append(
            "speaker_avatars",

            sp.avatar,
          );
        }
      });

      const url = editingEventId
        ? `${API_BASE}/api/events/${editingEventId}`
        : `${API_BASE}/api/events`;

      const res = await fetch(
        url,

        {
          method: editingEventId ? "PUT" : "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: fd,
        },
      );

      const data = await res

        .json()

        .catch(() => ({}));

      if (!res.ok) {
        setErrMsg(
          data?.message ||
            (editingEventId
              ? "Эвентийг шинэчилж чадсангүй."
              : "Эвент үүсгэж чадсангүй."),
        );

        return;
      }

      const saved = data?.event || data;

      setSuccessMsg(
        editingEventId
          ? "Эвент амжилттай шинэчлэгдлээ ✅"
          : "Эвент амжилттай үүслээ ✅",
      );

      await fetchEvents();

      await fetchMyBookedIds();

      await fetchMyEvents();

      resetForm();

      setShowCreate(false);

      setEditingEventId(null);

      setSelectedEventId(saved?.id || null);
    } catch (e2) {
      console.error(e2);

      setErrMsg(
        editingEventId
          ? "Эвентийг шинэчлэх үед сүлжээний алдаа гарлаа."
          : "Эвент үүсгэх үед сүлжээний алдаа гарлаа.",
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
        setErrMsg("Эхлээд нэвтэрнэ үү.");

        return;
      }

      const res = await fetch(
        `${API_BASE}/api/events/${ev.id}/join-request`,

        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res

        .json()

        .catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.message || "Хүсэлт илгээж чадсангүй.");

        return;
      }

      await Promise.all([fetchEvents(), fetchMyBookedIds(), fetchMyEvents()]);

      setSuccessMsg("Хүсэлт амжилттай илгээгдлээ ✅");

      setTimeout(() => {
        setSuccessMsg("");
      }, 2000);
    } catch (e) {
      console.error(e);

      setErrMsg("Хүсэлт илгээх үед сүлжээний алдаа гарлаа.");
    }
  }

  async function handleUploadFinishedFile() {
    setErrMsg("");

    setSuccessMsg("");

    if (!selectedEvent?.id) {
      return;
    }

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

      files.forEach((f) => {
        fd.append(
          "files",

          f,
        );
      });

      fd.append(
        "note",

        fileNote,
      );

      const res = await fetch(
        `${API_BASE}/api/events/${selectedEvent.id}/files`,

        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: fd,
        },
      );

      const data = await res

        .json()

        .catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.message || "Файл оруулж чадсангүй.");

        return;
      }

      setSuccessMsg("Файлууд амжилттай орлоо ✅");

      setFileNote("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchEventFiles(selectedEvent.id);
    } catch (e) {
      console.error(e);

      setErrMsg("Оруулж байхдаа сүлжээний алдаа гарлаа");
    } finally {
      setUploadingFile(false);
    }
  }

  async function downloadFile(
    url,

    filename,
  ) {
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
      window.open(
        resolveUrl(url),

        "_blank",

        "noopener,noreferrer",
      );
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
    const safeIndex = Math.max(
      0,

      Math.min(
        index,

        imageFiles.length - 1,
      ),
    );

    setLbIndex(safeIndex);

    setLbOpen(true);

    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    setLbOpen(false);

    document.body.style.overflow = "";
  }

  function goPrev() {
    if (!imageFiles.length) {
      return;
    }

    setLbIndex((lbIndex - 1 + imageFiles.length) % imageFiles.length);
  }

  function goNext() {
    if (!imageFiles.length) {
      return;
    }

    setLbIndex((lbIndex + 1) % imageFiles.length);
  }

  useEffect(() => {
    if (!lbOpen) {
      return;
    }

    const onKey = (e) => {
      if (e.key === "Escape") {
        closeLightbox();
      }

      if (e.key === "ArrowLeft") {
        goPrev();
      }

      if (e.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener(
      "keydown",

      onKey,
    );

    return () =>
      window.removeEventListener(
        "keydown",

        onKey,
      );
  }, [lbOpen, lbIndex, imageFiles.length]);

  useEffect(() => {
    if (!lbOpen) {
      return;
    }

    const strip = lbThumbStripRef.current;

    const thumb = strip?.querySelector?.(`[data-lbthumb="${lbIndex}"]`);

    thumb?.scrollIntoView?.({
      behavior: "smooth",

      inline: "center",

      block: "nearest",
    });
  }, [lbIndex, lbOpen]);

  const currentLb = imageFiles[lbIndex];

  const visibleEvents = useMemo(() => {
    return events.filter((ev) => {
      if (isEventFinished(ev)) {
        return false;
      }

      if (ev.visibility === "private") {
        return canEditEvent(ev);
      }

      return true;
    });
  }, [events, now]);

  const managedEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();

    let list = events.filter((ev) => canEditEvent(ev));

    list = list.filter((ev) => {
      const finished = isEventFinished(ev);

      const status = String(ev.status || "").toLowerCase();

      const isDraft =
        status === "draft" || ev.is_draft === 1 || ev.is_draft === true;

      if (eventTab === "draft" && !isDraft) return false;

      if (eventTab === "published" && (isDraft || finished)) return false;

      if (eventTab === "finished" && !finished) return false;

      if (!query) return true;

      return [ev.title, ev.description, ev.category]

        .join(" ")

        .toLowerCase()

        .includes(query);
    });

    return [...list].sort((a, b) => {
      const aTime = parseEventDateTime(a.start_time);

      const bTime = parseEventDateTime(b.start_time);

      return eventSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [events, eventSearch, eventTab, eventSort, now]);

  const managedCounts = useMemo(() => {
    const own = events.filter((ev) => canEditEvent(ev));

    return {
      all: own.length,

      draft: own.filter((ev) => {
        const status = String(ev.status || "").toLowerCase();

        return status === "draft" || ev.is_draft === 1 || ev.is_draft === true;
      }).length,

      published: own.filter((ev) => {
        const status = String(ev.status || "").toLowerCase();

        const draft =
          status === "draft" || ev.is_draft === 1 || ev.is_draft === true;

        return !draft && !isEventFinished(ev);
      }).length,

      finished: own.filter((ev) => isEventFinished(ev)).length,
    };
  }, [events, now]);

  return (
    <UserShell title={reportEvent ? "Статистик & тайлан" : "Миний эвэнтүүд"}>
      <div
        className={`uep-wrap ${
          selectedEvent && !showCreate ? "is-detail" : ""
        }`}
        style={{
          gridTemplateColumns: "1fr",
        }}
      >
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
                Буцах
              </button>

              <div className="eventDetailHero">
                <img
                  src={resolveUrl(selectedEvent.image_url) || fallbackImgSrc(selectedEvent?.id || selectedEvent?.event_id || 0)}
                  alt={selectedEvent.title || "Эвент"}
                  className="eventDetailHeroImage"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImgSrc();
                  }}
                />

                <div className="eventDetailHeroShade" />

                <div className="eventDetailHeroContent">
                  <h1 className="eventDetailHeroTitle">
                    {selectedEvent.title || "Нэргүй эвент"}
                  </h1>
                </div>

                <span className="eventDetailStatus">
                  {isEventFinished(selectedEvent)
                    ? "Дууссан"
                    : bookedIds.includes(Number(selectedEvent.id))
                      ? "Бүртгэгдсэн"
                      : "Нийтлэгдсэн"}
                </span>
              </div>

              <div className="eventDetailLayout">
                <div className="eventDetailMain">
                  <section className="eventDetailSection">
                    <h2>Эвентийн тухай</h2>

                    <p className="eventDetailDescription">
                      {selectedEvent.description ||
                        "Эвентийн тайлбар оруулаагүй байна."}
                    </p>
                  </section>

                  <section className="eventDetailSection">
                    <h2>Зохион байгуулагч</h2>

                    <div className="eventOrganizer">
                      <div className="eventOrganizerAvatar">
                        {getInitials(
                          selectedEvent.created_by_name ||
                            selectedEvent.created_by_email ||
                            "Зохион байгуулагч",
                        )}
                      </div>

                      <div className="eventOrganizerInfo">
                        <strong>
                          {selectedEvent.created_by_name ||
                            selectedEvent.organizer_name ||
                            selectedEvent.created_by_email ||
                            "Зохион байгуулагч"}
                        </strong>

                        <span>Зохион байгуулагч</span>
                      </div>
                    </div>
                  </section>

                  {selectedSpeakers.length > 0 ? (
                    <section className="eventDetailSection">
                      <h2>Илтгэгчид</h2>

                      <div className="eventDetailSpeakers">
                        {selectedSpeakers.map(
                          (
                            speaker,

                            index,
                          ) => {
                            const avatar = getSpeakerAvatar(speaker);

                            return (
                              <div className="eventDetailSpeaker" key={index}>
                                <div className="eventDetailSpeakerAvatar">
                                  {avatar ? (
                                    <img
                                      src={resolveUrl(avatar)}
                                      alt={speaker.name || "Илтгэгч"}
                                    />
                                  ) : (
                                    <span>
                                      {getInitials(speaker.name || "Илтгэгч")}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <strong>{speaker.name || "-"}</strong>

                                  <span>{speaker.organization || ""}</span>

                                  {speaker.topic ? (
                                    <small>{speaker.topic}</small>
                                  ) : null}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>
                  ) : null}

                  {selectedAgendaItems.length > 0 ? (
                    <section className="eventDetailSection">
                      <h2>Хөтөлбөр</h2>

                      <div className="eventDetailAgenda">
                        {selectedAgendaItems.map(
                          (
                            item,

                            index,
                          ) => (
                            <div className="eventDetailAgendaItem" key={index}>
                              <span>{item.time || "--:--"}</span>

                              <strong>{item.text || ""}</strong>
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="eventDetailSidebar">
                  <section className="eventDetailSideCard">
                    <h2>Эвентийн мэдээлэл</h2>

                    <div className="eventDetailInfoRow">
                      <div className="eventDetailInfoIcon">📅</div>

                      <div>
                        <span>Эхлэх</span>

                        <strong>
                          {formatDateTime(selectedEvent.start_time)}
                        </strong>

                        {selectedEvent.end_time ? (
                          <>
                            <span className="eventDetailInfoSub">Дуусах</span>

                            <strong>
                              {formatDateTime(selectedEvent.end_time)}
                            </strong>
                          </>
                        ) : null}
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
                          Эвент удирдах
                        </button>

                        <button
                          type="button"
                          className="eventDetailEditBtn"
                          onClick={() => openEdit(selectedEvent)}
                        >
                          Мэдээлэл засах
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="eventDetailManageBtn"
                        onClick={() => handleBook(selectedEvent)}
                        disabled={bookedIds.includes(Number(selectedEvent.id))}
                      >
                        {bookedIds.includes(Number(selectedEvent.id))
                          ? "Бүртгэгдсэн"
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
              badge={badge}
              setBadge={setBadge}
              speakers={speakers}
              handleSpeakerChange={handleSpeakerChange}
              addSpeaker={addSpeaker}
              removeSpeaker={removeSpeaker}
              agendas={agendas}
              handleAgendaChange={handleAgendaChange}
              addAgendaItem={addAgendaItem}
              removeAgendaItem={removeAgendaItem}
              start_time={start_time}
              setStartTime={handleStartTimeChange}
              end_time={end_time}
              setEndTime={handleEndTimeChange}
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
            reportEvent ? (
              <div className="myEventReport">
                <div className="reportTopline">
                  <button
                    type="button"
                    className="reportBack"
                    onClick={() => setReportEvent(null)}
                  >
                    ←
                  </button>

                  <div>
                    <span className="reportBreadcrumb">
                      Миний эвэнтүүд / {reportEvent.title}
                    </span>

                    <h2>Статистик & тайлан</h2>
                  </div>
                </div>

                <section className="reportEventBar">
                  <div className="reportEventCover">
                    {reportEvent.image_url ? (
                      <img
                        src={resolveUrl(reportEvent.image_url)}
                        alt={reportEvent.title || "Эвэнт"}
                      />
                    ) : null}
                  </div>

                  <div className="reportEventInfo">
                    <strong>{reportEvent.title || "Нэргүй эвэнт"}</strong>

                    <span>
                      {formatDateTime(reportEvent.start_time)}

                      {reportEvent.end_time
                        ? ` – ${formatDateTime(reportEvent.end_time)}`
                        : ""}
                    </span>
                  </div>

                  <div className="reportBarActions">
                    <button type="button">CSV</button>

                    <button type="button">Excel</button>

                    <button type="button" className="primary">
                      Тайлан татах
                    </button>
                  </div>
                </section>

                <section className="reportMetrics">
                  <article>
                    <span>БҮРТГҮҮЛСЭН</span>

                    <strong>{participantsCount || 0}</strong>

                    <small>Оролцогч</small>
                  </article>

                  <article>
                    <span>ИРСЭН</span>

                    <strong>
                      {participants.filter(
                        (p) =>
                          p.attended || p.checked_in || p.status === "attended",
                      ).length || 0}
                    </strong>

                    <small>Ирц бүртгэгдсэн</small>
                  </article>

                  <article>
                    <span>1:1 ZOOM УУЛЗАЛТ</span>

                    <strong>0</strong>

                    <small>Уулзалтын тоо</small>
                  </article>

                  <article>
                    <span>СЭТГЭЛ ХАНАМЖ</span>

                    <strong>—</strong>

                    <small>Үнэлгээ</small>
                  </article>
                </section>

                <div className="reportMainGrid">
                  <section className="reportPanel reportChartPanel">
                    <div className="reportPanelHead">
                      <div>
                        <h3>Өдөр тутмын бүртгэл</h3>

                        <p>Эвэнтийн бүртгэлийн ерөнхий үзүүлэлт</p>
                      </div>
                    </div>

                    <div
                      className="fakeBarChart"
                      aria-label="Registration chart"
                    >
                      {[28, 42, 34, 55, 38, 65, 48, 74, 61, 86, 72, 64, 88].map(
                        (height, index) => (
                          <span key={index} style={{ height: `${height}%` }} />
                        ),
                      )}
                    </div>
                  </section>

                  <section className="reportPanel">
                    <div className="reportPanelHead">
                      <div>
                        <h3>Бүртгэлээс уулзалт хүртэл</h3>

                        <p>Нийт бүртгүүлэгчдийн харьцуулалт</p>
                      </div>
                    </div>

                    <div className="reportProgressList">
                      <div>
                        <div>
                          <span>Бүртгүүлсэн</span>

                          <b>{participantsCount || 0}</b>
                        </div>

                        <i>
                          <em style={{ width: "100%" }} />
                        </i>
                      </div>

                      <div>
                        <div>
                          <span>Ирсэн</span>

                          <b>
                            {participants.filter(
                              (p) =>
                                p.attended ||
                                p.checked_in ||
                                p.status === "attended",
                            ).length || 0}
                          </b>
                        </div>

                        <i>
                          <em style={{ width: "82%" }} />
                        </i>
                      </div>

                      <div>
                        <div>
                          <span>1:1 Zoom уулзалт хийсэн</span>

                          <b>0</b>
                        </div>

                        <i>
                          <em className="cyan" style={{ width: "35%" }} />
                        </i>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="reportSecondaryGrid">
                  <section className="reportPanel">
                    <div className="reportPanelHead">
                      <div>
                        <h3>Оролцогчдын байгууллага</h3>

                        <p>Бүртгүүлсэн оролцогчдын мэдээлэл</p>
                      </div>
                    </div>

                    <div className="reportRows">
                      {participants.slice(0, 5).map((person, index) => (
                        <div key={person.id || index}>
                          <span>
                            {person.organization ||
                              person.company ||
                              "Байгууллага"}
                          </span>

                          <i>
                            <em style={{ width: `${90 - index * 12}%` }} />
                          </i>

                          <b>1</b>
                        </div>
                      ))}

                      {!participants.length ? (
                        <div className="reportNoData">Өгөгдөл алга</div>
                      ) : null}
                    </div>
                  </section>

                  <section className="reportPanel">
                    <div className="reportPanelHead">
                      <div>
                        <h3>Бүртгэлийн суваг</h3>

                        <p>Хаанаас орж ирж бүртгүүлсэн</p>
                      </div>
                    </div>

                    <div className="reportRows">
                      {[
                        ["Шууд холбоос", 92, participantsCount || 0],

                        ["Registra нүүр", 68, 0],

                        ["Facebook", 51, 0],

                        ["И-мэйл урилга", 34, 0],
                      ].map(([label, width, count]) => (
                        <div key={label}>
                          <span>{label}</span>

                          <i>
                            <em style={{ width: `${width}%` }} />
                          </i>

                          <b>{count}</b>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="reportPanel reportTablePanel">
                  <div className="reportPanelHead tableHead">
                    <div>
                      <h3>Оролцогчдын жагсаалт</h3>

                      <p>
                        Нийт {participantsCount || participants.length || 0}{" "}
                        оролцогч
                      </p>
                    </div>

                    <button type="button">Жагсаалт татах</button>
                  </div>

                  <div className="reportTableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ОРОЛЦОГЧ</th>

                          <th>БАЙГУУЛЛАГА</th>

                          <th>БҮРТГҮҮЛСЭН</th>

                          <th>ИРЦ</th>

                          <th>1:1 УУЛЗАЛТ</th>
                        </tr>
                      </thead>

                      <tbody>
                        {participants.slice(0, 8).map((person, index) => (
                          <tr key={person.id || index}>
                            <td>
                              <span className="participantAvatar">
                                {getInitials(
                                  person.name ||
                                    person.full_name ||
                                    person.email,
                                )}
                              </span>

                              {person.name ||
                                person.full_name ||
                                person.email ||
                                "Оролцогч"}
                            </td>

                            <td>
                              {person.organization || person.company || "—"}
                            </td>

                            <td>
                              {person.created_at
                                ? formatDateTime(person.created_at)
                                : "—"}
                            </td>

                            <td>
                              <span
                                className={
                                  person.attended ||
                                  person.checked_in ||
                                  person.status === "attended"
                                    ? "attendance yes"
                                    : "attendance"
                                }
                              >
                                {person.attended ||
                                person.checked_in ||
                                person.status === "attended"
                                  ? "Ирсэн"
                                  : "Ирээгүй"}
                              </span>
                            </td>

                            <td>—</td>
                          </tr>
                        ))}

                        {!participants.length ? (
                          <tr>
                            <td colSpan="5" className="reportTableEmpty">
                              Оролцогчийн мэдээлэл алга
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : (
              <div className="myEventsPage">
                <div className="myEventsToolbar">
                  <div className="myEventTabs">
                    {[
                      ["all", "Бүгд", managedCounts.all],

                      ["draft", "Draft", managedCounts.draft],

                      ["published", "Нийтлэгдсэн", managedCounts.published],

                      ["finished", "Дууссан", managedCounts.finished],
                    ].map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        className={eventTab === key ? "active" : ""}
                        onClick={() => setEventTab(key)}
                      >
                        {label} · {count}
                      </button>
                    ))}
                  </div>

                  <div className="myEventTools">
                    <label className="myEventSearch">
                      <span>⌕</span>

                      <input
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="Эвэнт хайх..."
                      />
                    </label>

                    <select
                      value={eventSort}
                      onChange={(e) => setEventSort(e.target.value)}
                    >
                      <option value="newest">Шинэ нь эхэнд</option>

                      <option value="oldest">Хуучин нь эхэнд</option>
                    </select>

                    <button
                      type="button"
                      className="createEventButton"
                      onClick={handleAskCreate}
                    >
                      ＋ Эвэнт үүсгэх
                    </button>
                  </div>
                </div>

                {loadingEvents ? (
                  <div className="myEventsEmpty">
                    Эвэнтүүдийг ачаалж байна...
                  </div>
                ) : managedEvents.length === 0 ? (
                  <div className="myEventsEmpty">
                    <strong>Эвэнт олдсонгүй</strong>

                    <span>Хайлт эсвэл сонгосон төлвөө өөрчилж үзнэ үү.</span>
                  </div>
                ) : (
                  <div className="myEventCardGrid">
                    {managedEvents.map((ev) => {
                      const finished = isEventFinished(ev);

                      const status = String(ev.status || "").toLowerCase();

                      const draft =
                        status === "draft" ||
                        ev.is_draft === 1 ||
                        ev.is_draft === true;

                      const cover =
                        resolveUrl(ev.image_url) || fallbackImgSrc(ev?.id || ev?.event_id || 0);

                      const registered =
                        Number(
                          ev.participants_count ||
                            ev.registered_count ||
                            ev.bookings_count ||
                            0,
                        ) || 0;

                      const max = Number(ev.max_participants || 0) || 0;

                      const percent =
                        max > 0
                          ? Math.min(100, Math.round((registered / max) * 100))
                          : 0;

                      return (
                        <article className="myEventCard" key={ev.id}>
                          <button
                            type="button"
                            className="myEventCover"
                            onClick={() => openDetail(ev.id)}
                          >
                            <img
                              src={cover}
                              alt={ev.title || "Эвэнт"}
                              onError={(e) => {
                                e.currentTarget.src = fallbackImgSrc();
                              }}
                            />

                            <span
                              className={`myEventStatus ${
                                finished
                                  ? "finished"
                                  : draft
                                    ? "draft"
                                    : "published"
                              }`}
                            >
                              {finished
                                ? "Дууссан"
                                : draft
                                  ? "Draft"
                                  : "Нийтлэгдсэн"}
                            </span>
                          </button>

                          <div className="myEventCardBody">
                            <h3>{ev.title || "Нэргүй эвэнт"}</h3>

                            <div className="myEventCardMeta">
                              <span>▣ {formatDateTime(ev.start_time)}</span>

                              <span>
                                ♙ {registered}
                                {max > 0 ? ` / ${max}` : ""} оролцогч
                              </span>
                            </div>

                            {max > 0 ? (
                              <div className="myEventCapacity">
                                <div>
                                  <span>Бөглөсөн</span>

                                  <b>{percent}%</b>
                                </div>

                                <i>
                                  <em style={{ width: `${percent}%` }} />
                                </i>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )
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

      {lbOpen && currentLb ? (
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
                onClick={() =>
                  downloadFile(
                    currentLb.rawUrl,

                    currentLb.name,
                  )
                }
              >
                ⬇
              </button>

              <button
                className="uep-lbIconBtn"
                type="button"
                title="Шинэ хуудас дээр нээх"
                onClick={() =>
                  window.open(
                    currentLb.url,

                    "_blank",

                    "noopener,noreferrer",
                  )
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
      ) : null}

      {paymentEvent && (
        <div className="uep-modalOverlay">
          <div className="uep-modal payment-modal">
            {!checkingPayment ? (
              <>
                <h3 className="uep-modalTitle">Төлбөрийн мэдээлэл</h3>

                <div className="payment-info">
                  <p>
                    <strong>Банк:</strong> Хаан банк
                  </p>

                  <p>
                    <strong>Данс:</strong> 5000000000
                  </p>

                  <p>
                    <strong>Хүлээн авагч:</strong> IT Insight
                  </p>

                  <p>
                    <strong>Гүйлгээний утга:</strong> {paymentEvent.title}
                  </p>
                </div>

                <p className="payment-desc">
                  Төлбөрөө шилжүүлсний дараа админаас баталгаажтал түр хүлээнэ
                  үү. Баталгаажсаны дараа эвентэд бүртгэгдэх болно. Баярлалаа
                </p>

                <div className="uep-modalActions">
                  <button
                    className="uep-modalNo"
                    type="button"
                    onClick={() => setPaymentEvent(null)}
                  >
                    Цуцлах
                  </button>

                  <button
                    className="uep-modalYes"
                    type="button"
                    onClick={handleCheckPayment}
                  >
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

                <div className="payment-loader" />
              </>
            )}
          </div>
        </div>
      )}
    </UserShell>
  );
}
