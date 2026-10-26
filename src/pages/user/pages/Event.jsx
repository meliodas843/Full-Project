import { useEffect, useMemo, useRef, useState } from "react";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";

import { useNavigate, useSearchParams } from "react-router-dom";

import EventCreateWizard from "../components/EventCreateWizard";
import { canEditEvent, getSpeakerAvatar, isImageName, isSvgFile, makeSpeaker, normalizeDateTimeLocalValue, parseAgenda, parseSpeakers, resolveUrl, toDateTimeLocal } from "./Event.helpers";
import EventCreateConfirmModal from "./EventCreateConfirmModal";
import EventImageLightbox from "./EventImageLightbox";
import ManagedEventsList from "./ManagedEventsList";
import EventReport from "./EventReport";
import EventDetailView from "./EventDetailView";


export default function Event() {
  const rightTopRef = useRef(null);

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [editingEventId, setEditingEventId] = useState(null);

  const [paymentEvent, setPaymentEvent] = useState(null);

  const [checkingPayment, setCheckingPayment] = useState(false);

  const [eventFiles, setEventFiles] = useState([]);

  const [, setFilesLoading] = useState(false);

  const [, ] = useState(false);

  const [, ] = useState("");

  const [participants, setParticipants] = useState([]);

  const [participantsCount, setParticipantsCount] = useState(0);

  const [, setLoadingParticipants] = useState(false);

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

  const [, setInviteLink] = useState("");

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
        `${API_BASE}/api/events/my-joined?includeFinished=1`,

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

      if (!ev?.id) {
        setErrMsg("Эвентийн мэдээлэл олдсонгүй.");

        return;
      }

      const isPublic = String(ev.visibility || "").toLowerCase() === "public";

      const endpoint = isPublic
        ? `${API_BASE}/api/events/${ev.id}/book`
        : `${API_BASE}/api/events/${ev.id}/join-request`;

      const res = await fetch(endpoint, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrMsg(
          data?.message ||
            (isPublic
              ? "Эвентэд бүртгүүлж чадсангүй."
              : "Хүсэлт илгээж чадсангүй."),
        );

        return;
      }

      await Promise.all([fetchEvents(), fetchMyBookedIds(), fetchMyEvents()]);

      setSuccessMsg(
        isPublic
          ? "Эвентэд амжилттай бүртгүүллээ ✅"
          : "Хүсэлт амжилттай илгээгдлээ ✅",
      );

      setTimeout(() => {
        setSuccessMsg("");
      }, 2000);
    } catch (error) {
      console.error(error);

      setErrMsg("Эвентэд бүртгүүлэх үед сүлжээний алдаа гарлаа.");
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

  const allMyEvents = useMemo(() => {
    const merged = new Map();

    for (const ev of events) {
      const id = Number(ev.id ?? ev.event_id);
      if (Number.isFinite(id)) merged.set(id, { ...ev, id });
    }

    for (const ev of myEvents) {
      const id = Number(ev.id ?? ev.event_id);
      if (!Number.isFinite(id)) continue;
      merged.set(id, { ...merged.get(id), ...ev, id });
    }

    return [...merged.values()];
  }, [events, myEvents]);

  const isDraftEvent = (ev) => {
    const status = String(ev.status || "").toLowerCase();
    return status === "draft" || ev.is_draft === 1 || ev.is_draft === true;
  };

  const isRegisteredEvent = (ev) => {
    const id = Number(ev.id ?? ev.event_id);
    // The creator must not count as a participant merely for creating an event.
    if (String(ev.relation_type || "").toLowerCase() === "created")
      return false;
    return (
      ev.is_registered === true ||
      ev.is_registered === 1 ||
      ev.relation_type === "joined" ||
      bookedIds.some((bookedId) => Number(bookedId) === id)
    );
  };

  const isFinishedEvent = (ev) =>
    isEventFinished(ev) ||
    ev.is_finished === 1 ||
    ev.is_finished === true ||
    ["finished", "completed", "ended"].includes(
      String(ev.status || "").toLowerCase(),
    );

  const isAllTabEvent = (ev) =>
    !isDraftEvent(ev) &&
    (String(ev.visibility || "public").toLowerCase() === "public" ||
      canEditEvent(ev));

  const managedEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();

    return allMyEvents
      .filter((ev) => {
        if (eventTab === "all" && !isAllTabEvent(ev)) return false;
        if (
          eventTab === "participating" &&
          (!isRegisteredEvent(ev) || isFinishedEvent(ev))
        )
          return false;
        if (
          eventTab === "finished" &&
          (!isRegisteredEvent(ev) || !isFinishedEvent(ev))
        )
          return false;

        if (
          query &&
          ![ev.title, ev.description, ev.category]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
          return false;

        return true;
      })
      .sort((a, b) => {
        const aTime = parseEventDateTime(a.start_time);
        const bTime = parseEventDateTime(b.start_time);
        return eventSort === "oldest" ? aTime - bTime : bTime - aTime;
      });
  }, [allMyEvents, bookedIds, eventSearch, eventTab, eventSort, now]);

  const managedCounts = useMemo(
    () => ({
      all: allMyEvents.filter(isAllTabEvent).length,
      participating: allMyEvents.filter(
        (ev) => isRegisteredEvent(ev) && !isFinishedEvent(ev),
      ).length,
      finished: allMyEvents.filter(
        (ev) => isRegisteredEvent(ev) && isFinishedEvent(ev),
      ).length,
    }),
    [allMyEvents, bookedIds, now],
  );

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
            <EventDetailView
              bookedIds={bookedIds}
              handleBook={handleBook}
              isEventFinished={isEventFinished}
              navigate={navigate}
              openEdit={openEdit}
              selectedAgendaItems={selectedAgendaItems}
              selectedEvent={selectedEvent}
              selectedSpeakers={selectedSpeakers}
              setSelectedEventId={setSelectedEventId}
            />
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
              <EventReport
                participants={participants}
                participantsCount={participantsCount}
                reportEvent={reportEvent}
                setReportEvent={setReportEvent}
              />
            ) : (
              <ManagedEventsList
                eventSearch={eventSearch}
                eventSort={eventSort}
                eventTab={eventTab}
                handleAskCreate={handleAskCreate}
                loadingEvents={loadingEvents}
                managedCounts={managedCounts}
                managedEvents={managedEvents}
                openDetail={openDetail}
                setEventSearch={setEventSearch}
                setEventSort={setEventSort}
                setEventTab={setEventTab}
              />
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
        <EventImageLightbox
          closeLightbox={closeLightbox}
          currentLb={currentLb}
          downloadFile={downloadFile}
          goNext={goNext}
          goPrev={goPrev}
          imageFiles={imageFiles}
          lbIndex={lbIndex}
          lbThumbStripRef={lbThumbStripRef}
          setLbIndex={setLbIndex}
        />
      ) : null}

      {paymentEvent && (
        <EventCreateConfirmModal
          checkingPayment={checkingPayment}
          handleCheckPayment={handleCheckPayment}
          paymentEvent={paymentEvent}
          setPaymentEvent={setPaymentEvent}
        />
      )}
    </UserShell>
  );
}
