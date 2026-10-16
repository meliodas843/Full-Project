import { useEffect, useMemo, useState } from "react";

import { FiX } from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import UserShell from "../components/UserShell";

import EventCreateWizard from "../components/EventCreateWizard";

import { API_BASE } from "@/lib/config";
import { EVENT_STATUS_LABELS, getEventStatus, getParticipantEmail, getParticipantId, getParticipantInitials, getParticipantName, getSpeakerAvatar, isSvgFile, isValidInviteEmail, makeSpeaker, parseAgenda, parseEventDateTime, parseSpeakers, resolveUrl, toDateTimeLocal } from "./History.helpers";
import InviteParticipantsModal from "./InviteParticipantsModal";
import MyEventCard from "./MyEventCard";
import HistoryEventDetail from "./HistoryEventDetail";


export default function History() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);

  const [filter, setFilter] = useState("all");

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);

  const [, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);

  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    if (openMenuId === null) return undefined;

    const closeMenu = () => {
      setOpenMenuId(null);

      setMenuPosition(null);
    };

    document.addEventListener("pointerdown", closeMenu);

    window.addEventListener("scroll", closeMenu, true);

    window.addEventListener("resize", closeMenu);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);

      window.removeEventListener("scroll", closeMenu, true);

      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenuId]);

  const [, ] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [editingEventId, setEditingEventId] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [creating, setCreating] = useState(false);

  const [formError, setFormError] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [badge, setBadge] = useState("");

  const [speakers, setSpeakers] = useState([makeSpeaker()]);

  const [agendas, setAgendas] = useState([
    {
      text: "",

      time: "",
    },
  ]);

  const [start_time, setStartTime] = useState("");

  const [end_time, setEndTime] = useState("");

  const [image_url, setImageUrl] = useState("");

  const [imageFile, setImageFile] = useState(null);

  const [max_participants, setMaxParticipants] = useState("");

  const [visibility, setVisibility] = useState("public");

  const [showParticipants, setShowParticipants] = useState(false);

  const [participants, setParticipants] = useState([]);

  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [showAddPeople, setShowAddPeople] = useState(false);

  const [addPeopleForm, setAddPeopleForm] = useState({ email: "" });

  const [addPeopleLoading, setAddPeopleLoading] = useState(false);

  const [addPeopleError, setAddPeopleError] = useState("");

  const [addPeopleSuccess, setAddPeopleSuccess] = useState("");

  const [inviteUser, setInviteUser] = useState(null);

  const [inviteLookupLoading, setInviteLookupLoading] = useState(false);

  const [, ] = useState([]);

  const [, ] = useState(null);

  async function load() {
    try {
      setLoading(true);

      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setEvents([]);

        setError("Эхлээд нэвтэрнэ үү.");

        return;
      }

      const response = await fetch(
        `${API_BASE}/api/events/my-events`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response

        .json()

        .catch(() => []);

      if (!response.ok) {
        setEvents([]);

        setError(data?.message || "Эвентүүдийг ачаалж чадсангүй.");

        return;
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.events)
          ? data.events
          : [];

      setEvents(list);
    } catch (err) {
      console.error(err);

      setEvents([]);

      setError("Сүлжээний алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  async function loadParticipants(eventId) {
    try {
      setParticipantsLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setParticipants([]);

        return;
      }

      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/participants`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response

        .json()

        .catch(() => ({}));

      if (!response.ok) {
        setParticipants([]);

        return;
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.participants)
          ? data.participants
          : Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.results)
                ? data.results
                : [];

      setParticipants(list);
    } catch (err) {
      console.error(err);

      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  }

  function handleAddPeopleChange(event) {
    const value = event.target.value;

    setAddPeopleForm({ email: value });

    setInviteUser(null);

    setAddPeopleError("");

    setAddPeopleSuccess("");
  }

  useEffect(() => {
    if (!showAddPeople) return undefined;

    const email = String(addPeopleForm.email || "")
      .trim()

      .toLowerCase();

    if (!isValidInviteEmail(email)) {
      setInviteUser(null);

      setInviteLookupLoading(false);

      return undefined;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setInviteUser(null);

      setInviteLookupLoading(false);

      setAddPeopleError("Эхлээд нэвтэрнэ үү.");

      return undefined;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setInviteLookupLoading(true);

        setAddPeopleError("");

        const response = await fetch(
          `${API_BASE}/api/email/user-lookup?email=${encodeURIComponent(email)}`,

          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,

              Accept: "application/json",
            },
          },
        );

        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setInviteUser(null);

          setAddPeopleError(
            data?.message || data?.error || "Хэрэглэгчийг шалгаж чадсангүй.",
          );

          return;
        }

        const foundUser =
          data?.user ||
          data?.data?.user ||
          data?.result?.user ||
          (data?.id || data?.email ? data : null);

        const registered =
          data?.registered === true ||
          data?.exists === true ||
          data?.found === true ||
          Boolean(foundUser?.id || foundUser?.user_id);

        if (registered && foundUser) {
          setInviteUser({
            ...foundUser,

            email: foundUser.email || email,

            registered: true,
          });
        } else {
          setInviteUser({
            email,

            registered: false,
          });
        }
      } catch (err) {
        console.error("INVITE USER LOOKUP ERROR:", err);

        if (!cancelled) {
          setInviteUser(null);

          setAddPeopleError("Хэрэглэгчийг шалгах үед сүлжээний алдаа гарлаа.");
        }
      } finally {
        if (!cancelled) {
          setInviteLookupLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;

      window.clearTimeout(timer);
    };
  }, [addPeopleForm.email, showAddPeople]);

  async function createAndAddPerson(event) {
    event.preventDefault();

    if (addPeopleLoading) return;

    const eventId = selectedEvent?.id;

    const email = addPeopleForm.email.trim().toLowerCase();

    if (!eventId) {
      setAddPeopleError("Эвент олдсонгүй.");

      return;
    }

    if (!email) {
      setAddPeopleError("И-мэйл хаяг оруулна уу.");

      return;
    }

    if (!isValidInviteEmail(email)) {
      setAddPeopleError("Зөв и-мэйл хаяг оруулна уу.");

      return;
    }

    try {
      setAddPeopleLoading(true);

      setAddPeopleError("");

      setAddPeopleSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        setAddPeopleError("Эхлээд нэвтэрнэ үү.");

        return;
      }

      const response = await fetch(`${API_BASE}/api/email/event-invite`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({ event_id: eventId, email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAddPeopleError(
          data?.message || data?.error || "Урилга илгээж чадсангүй.",
        );

        return;
      }

      setAddPeopleSuccess(`Урилгыг ${email} хаяг руу амжилттай илгээлээ.`);

      setAddPeopleForm({ email: "" });

      setInviteUser(null);
    } catch (err) {
      console.error("EVENT INVITE ERROR:", err);

      setAddPeopleError("Урилга илгээх үед сүлжээний алдаа гарлаа.");
    } finally {
      setAddPeopleLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visibleEvents = useMemo(() => {
    let result = [...events];

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();

      result = result.filter((event) =>
        String(event?.title || "")
          .toLowerCase()

          .includes(keyword),
      );
    }

    if (filter !== "all") {
      result = result.filter((event) => getEventStatus(event) === filter);
    }

    result.sort((a, b) => {
      const aTime = parseEventDateTime(a.start_time || a.created_at);

      const bTime = parseEventDateTime(b.start_time || b.created_at);

      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [events, filter, sort, search]);

  const minDateTime = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000,
  )

    .toISOString()

    .slice(0, 16);

  const viewSpeakers = useMemo(
    () => parseSpeakers(selectedEvent?.speaker),

    [selectedEvent],
  );

  const viewAgenda = useMemo(
    () => parseAgenda(selectedEvent?.agenda),

    [selectedEvent],
  );

  function resetForm() {
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

    setFormError("");

    setSuccessMsg("");
  }

  function scrollTop() {
    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  }

  function openCreate() {
    resetForm();

    setEditingEventId(null);

    setSelectedEvent(null);

    setShowForm(true);

    scrollTop();
  }

  function openEdit(event) {
    resetForm();

    setSelectedEvent(null);

    setEditingEventId(event.id);

    setTitle(event.title || "");

    setDescription(event.description || "");

    setBadge(String(event.category || event.badge || "").trim());

    const parsedSpeakers = parseSpeakers(event.speaker);

    const parsedAgenda = parseAgenda(event.agenda);

    setSpeakers(parsedSpeakers.length ? parsedSpeakers : [makeSpeaker()]);

    setAgendas(
      parsedAgenda.length
        ? parsedAgenda
        : [
            {
              text: "",

              time: "",
            },
          ],
    );

    setStartTime(toDateTimeLocal(event.start_time));

    setEndTime(toDateTimeLocal(event.end_time));

    setImageUrl(event.image_url || "");

    setImageFile(null);

    setMaxParticipants(event.max_participants || "");

    setVisibility(event.visibility || "public");

    setShowForm(true);

    scrollTop();
  }

  async function handleSave(event, saveStatus = "published") {
    event.preventDefault();

    if (creating) {
      return;
    }

    setFormError("");

    setSuccessMsg("");

    const cleanTitle = String(title || "").trim();

    const cleanDescription = String(description || "").trim();

    const cleanCategory = String(badge || "").trim();

    const cleanVisibility = String(visibility || "public").trim();

    console.log("========== EVENT FORM ==========");

    console.log("title:", cleanTitle);

    console.log("badge state:", badge);

    console.log("category to send:", cleanCategory);

    console.log("start_time:", start_time);

    console.log("visibility:", cleanVisibility);

    console.log("================================");

    if (!cleanTitle) {
      setFormError("Эвентийн нэрийг оруулна уу.");

      return;
    }

    if (!cleanCategory) {
      setFormError("Эвентийн төрлийг сонгоно уу.");

      return;
    }

    if (!start_time) {
      setFormError("Эхлэх огноо, цагийг сонгоно уу.");

      return;
    }

    if (!editingEventId && new Date(start_time) < new Date()) {
      setFormError("Өнгөрсөн огноо сонгох боломжгүй.");

      return;
    }

    if (end_time && new Date(end_time) < new Date(start_time)) {
      setFormError("Дуусах цаг эхлэх цагаас өмнө байж болохгүй.");

      return;
    }

    if (imageFile && isSvgFile(imageFile)) {
      setFormError("SVG зураг оруулах боломжгүй.");

      return;
    }

    try {
      setCreating(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setFormError("Эхлээд нэвтэрнэ үү.");

        return;
      }

      const cleanedAgendas = agendas

        .map((item) => ({
          text: String(item?.text || "").trim(),

          time: String(item?.time || "").trim(),
        }))

        .filter((item) => item.text || item.time);

      const cleanedSpeakers = speakers

        .map((speaker) => ({
          name: String(speaker?.name || "").trim(),

          organization: String(speaker?.organization || "").trim(),

          topic: String(speaker?.topic || "").trim(),
        }))

        .filter(
          (speaker) => speaker.name || speaker.organization || speaker.topic,
        );

      const formData = new FormData();

      formData.append("title", cleanTitle);

      formData.append("description", cleanDescription);

      formData.append("category", cleanCategory);

      formData.append("speaker", JSON.stringify(cleanedSpeakers));

      formData.append("agenda", JSON.stringify(cleanedAgendas));

      formData.append("start_time", String(start_time).replace("T", " "));

      formData.append(
        "end_time",

        end_time ? String(end_time).replace("T", " ") : "",
      );

      formData.append("image_url", String(image_url || "").trim());

      formData.append(
        "max_participants",

        max_participants ? String(max_participants) : "0",
      );

      formData.append("visibility", cleanVisibility || "public");

      formData.append("status", saveStatus === "draft" ? "draft" : "published");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      speakers.forEach((speaker) => {
        if (typeof File !== "undefined" && speaker?.avatar instanceof File) {
          formData.append("speaker_avatars", speaker.avatar);
        }
      });

      console.log("======= FORMDATA =======");

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(key, value.name);
        } else {
          console.log(key, value);
        }
      }

      console.log("========================");

      const url = editingEventId
        ? `${API_BASE}/api/events/${editingEventId}`
        : `${API_BASE}/api/events`;

      const method = editingEventId ? "PUT" : "POST";

      console.log("EVENT REQUEST:", method, url);

      console.log("CATEGORY REQUEST:", cleanCategory);

      const response = await fetch(url, {
        method,

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log("EVENT RESPONSE STATUS:", response.status);

      console.log("EVENT RESPONSE:", data);

      if (!response.ok) {
        setFormError(
          data?.message ||
            data?.error ||
            (editingEventId
              ? "Эвентийг шинэчилж чадсангүй."
              : "Эвент үүсгэж чадсангүй."),
        );

        return;
      }

      console.log("EVENT SAVED:", data);

      console.log("SENT CATEGORY:", cleanCategory);

      await load();

      setSuccessMsg(
        editingEventId
          ? "Эвент амжилттай шинэчлэгдлээ."
          : "Эвент амжилттай үүслээ.",
      );

      setShowForm(false);

      setEditingEventId(null);

      resetForm();

      scrollTop();
    } catch (err) {
      console.error("EVENT SAVE ERROR:", err);

      setFormError("Сүлжээний алдаа гарлаа.");
    } finally {
      setCreating(false);
    }
  }

  function openView(event) {
    setShowForm(false);

    setEditingEventId(null);

    setSelectedEvent(event);

    setShowParticipants(false);

    setShowAddPeople(false);

    scrollTop();
  }

  function closeForm() {
    setShowForm(false);

    setEditingEventId(null);

    resetForm();

    scrollTop();
  }

  function closeView() {
    setSelectedEvent(null);

    setShowParticipants(false);

    setShowAddPeople(false);

    scrollTop();
  }

  async function openAddPeople() {
    setAddPeopleForm({ email: "" });

    setInviteUser(null);

    setInviteLookupLoading(false);

    setAddPeopleError("");

    setAddPeopleSuccess("");

    setShowAddPeople(true);

    await loadParticipants(selectedEvent.id);
  }

  function handleAgendaChange(
    index,

    field,

    value,
  ) {
    setAgendas((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,

              [field]: value,
            }
          : item,
      ),
    );
  }

  function addAgendaItem() {
    setAgendas((current) => [
      ...current,

      {
        text: "",

        time: "",
      },
    ]);
  }

  function removeAgendaItem(index) {
    setAgendas((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, i) => i !== index);
    });
  }

  function handleSpeakerChange(
    index,

    field,

    value,
  ) {
    setSpeakers((current) =>
      current.map((speaker, i) =>
        i === index
          ? {
              ...speaker,

              [field]: value,
            }
          : speaker,
      ),
    );
  }

  function addSpeaker() {
    setSpeakers((current) => [...current, makeSpeaker()]);
  }

  function removeSpeaker(index) {
    setSpeakers((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, i) => i !== index);
    });
  }

  async function deleteEvent(event) {
    const confirmed = window.confirm(
      `"${event.title || "Эвент"}" эвентыг устгах уу?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(event.id);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/api/events/${event.id}`,

        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response

          .json()

          .catch(() => ({}));

        setError(data?.message || "Эвентийг устгаж чадсангүй.");

        return;
      }

      setEvents((current) =>
        current.filter((item) => Number(item.id) !== Number(event.id)),
      );
    } catch {
      setError("Сүлжээний алдаа гарлаа.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <UserShell title="Миний эвентүүд">
      <div className="myEventsPage">
        {showForm ? (
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
            setStartTime={setStartTime}
            end_time={end_time}
            setEndTime={setEndTime}
            image_url={image_url}
            imageFile={imageFile}
            setImageFile={setImageFile}
            max_participants={max_participants}
            setMaxParticipants={setMaxParticipants}
            visibility={visibility}
            setVisibility={setVisibility}
            creating={creating}
            errMsg={formError}
            setErrMsg={setFormError}
            successMsg={successMsg}
            minDateTime={minDateTime}
            resolveUrl={resolveUrl}
            getSpeakerAvatar={getSpeakerAvatar}
            isSvgFile={isSvgFile}
            handleCreate={handleSave}
            closeCreate={closeForm}
          />
        ) : selectedEvent ? (
          <HistoryEventDetail
            closeView={closeView}
            loadParticipants={loadParticipants}
            openAddPeople={openAddPeople}
            openEdit={openEdit}
            selectedEvent={selectedEvent}
            setShowParticipants={setShowParticipants}
            viewAgenda={viewAgenda}
            viewSpeakers={viewSpeakers}
          />
        ) : (
          <>
            <div className="myEventsHeader">
              <div>
                <h1>Миний эвентүүд</h1>

                <p>Таны үүсгэсэн болон зохион байгуулсан эвентүүд</p>
              </div>

              <button className="myEventsCreateBtn" onClick={openCreate}>
                + Эвент үүсгэх
              </button>
            </div>

            <div className="myEventsToolbar">
              <div className="myEventsFilters">
                {[
                  ["all", "Бүгд"],

                  ["draft", EVENT_STATUS_LABELS.draft],

                  ["published", EVENT_STATUS_LABELS.published],

                  ["ended", EVENT_STATUS_LABELS.ended],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`myEventsFilter ${
                      filter === value ? "active" : ""
                    }`}
                    onClick={() => setFilter(value)}
                  >
                    {label}

                    <span>
                      {value === "all"
                        ? events.length
                        : events.filter(
                            (event) => getEventStatus(event) === value,
                          ).length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="myEventsToolbarRight">
                <div className="myEventsSearch">
                  <span>⌕</span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Эвент хайх..."
                  />
                </div>

                <select
                  className="myEventsSort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Шинэ нь эхэнд</option>

                  <option value="oldest">Хуучин нь эхэнд</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="myEventsLoading">Уншиж байна...</div>
            ) : (
              <div className="myEventsGrid">
                {visibleEvents.map((event) => (
                  <MyEventCard key={event.id}
                    deleteEvent={deleteEvent}
                    deletingId={deletingId}
                    event={event}
                    menuPosition={menuPosition}
                    navigate={navigate}
                    openEdit={openEdit}
                    openMenuId={openMenuId}
                    openView={openView}
                    setMenuPosition={setMenuPosition}
                    setOpenMenuId={setOpenMenuId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddPeople ? (
        <InviteParticipantsModal
          addPeopleError={addPeopleError}
          addPeopleForm={addPeopleForm}
          addPeopleLoading={addPeopleLoading}
          addPeopleSuccess={addPeopleSuccess}
          createAndAddPerson={createAndAddPerson}
          handleAddPeopleChange={handleAddPeopleChange}
          inviteLookupLoading={inviteLookupLoading}
          inviteUser={inviteUser}
          selectedEvent={selectedEvent}
          setShowAddPeople={setShowAddPeople}
        />
      ) : null}

      {showParticipants ? (
        <div className="historyModalOverlay">
          <div className="historyModal">
            <div className="historyModalHeader">
              <h2>Оролцогчид</h2>

              <button onClick={() => setShowParticipants(false)}>
                <FiX />
              </button>
            </div>

            <div className="historyModalBody">
              {participantsLoading ? (
                <p>Уншиж байна...</p>
              ) : participants.length === 0 ? (
                <p>Оролцогч байхгүй.</p>
              ) : (
                participants.map(
                  (
                    person,

                    index,
                  ) => (
                    <div
                      className="historyPersonRow"
                      key={getParticipantId(person) || index}
                    >
                      <div className="historyPersonAvatar">
                        {getParticipantInitials(person)}
                      </div>

                      <div className="historyPersonInfo">
                        <strong>{getParticipantName(person)}</strong>

                        <span>{getParticipantEmail(person)}</span>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </UserShell>
  );
}
