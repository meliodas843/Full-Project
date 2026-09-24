import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import EventCreateWizard from "../components/EventCreateWizard";
import { API_BASE } from "@/lib/config";

function resolveUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_BASE}${
    value.startsWith("/")
      ? value
      : `/${value}`
  }`;
}

function fallbackImgSrc() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

function getEventImage(event) {
  return (
    resolveUrl(event?.image_url) ||
    resolveUrl(event?.image) ||
    resolveUrl(event?.cover_image) ||
    resolveUrl(event?.cover) ||
    resolveUrl(event?.thumbnail) ||
    resolveUrl(event?.banner) ||
    fallbackImgSrc()
  );
}

function formatDateTime(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (
    raw.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(raw)
  ) {
    const date = new Date(raw);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleString(
      "mn-MN",
      {
        timeZone:
          "Asia/Ulaanbaatar",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  const normalized =
    raw.replace(" ", "T");

  const date =
    new Date(normalized);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "mn-MN",
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const raw =
    String(value).trim();

  if (
    raw.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(raw)
  ) {
    const date =
      new Date(raw);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Asia/Ulaanbaatar",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ).formatToParts(date);

    const get = (type) =>
      parts.find(
        (part) =>
          part.type === type
      )?.value;

    return `${get(
      "year"
    )}-${get(
      "month"
    )}-${get(
      "day"
    )}T${get(
      "hour"
    )}:${get(
      "minute"
    )}`;
  }

  return raw
    .replace(" ", "T")
    .slice(0, 16);
}

function parseEventDateTime(value) {
  if (!value) return NaN;

  const raw =
    String(value).trim();

  if (!raw) return NaN;

  if (
    raw.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(raw)
  ) {
    return new Date(
      raw
    ).getTime();
  }

  const normalized =
    raw.replace(" ", "T");

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
    );

  if (!match) {
    return new Date(
      normalized
    ).getTime();
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second = "00",
  ] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ).getTime();
}

function isFinished(event) {
  if (!event) {
    return false;
  }

  const value =
    event.end_time ||
    event.start_time;

  if (!value) {
    return false;
  }

  const time =
    parseEventDateTime(value);

  return (
    Number.isFinite(time) &&
    time <= Date.now()
  );
}

function getEventStatus(event) {
  if (isFinished(event)) {
    return "ended";
  }

  const status =
    String(
      event?.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    status === "draft"
  ) {
    return "draft";
  }

  return "published";
}

function makeSpeaker() {
  return {
    name: "",
    organization: "",
    topic: "",
    avatar: null,
  };
}

function parseИлтгэгчид(value) {
  if (!value) return [];

  if (
    Array.isArray(value)
  ) {
    return value;
  }

  try {
    const parsed =
      JSON.parse(value);

    if (
      Array.isArray(parsed)
    ) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      return [parsed];
    }

    return [];
  } catch {
    return [];
  }
}

function parseХөтөлбөр(value) {
  if (!value) return [];

  if (
    Array.isArray(value)
  ) {
    return value;
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getSpeakerAvatar(
  speaker
) {
  return (
    speaker?.avatar_url ||
    speaker?.avatar ||
    speaker?.image_url ||
    speaker?.profile ||
    speaker?.photo ||
    ""
  );
}

function isSvgFile(file) {
  return (
    file?.type ===
      "image/svg+xml" ||
    String(
      file?.name || ""
    )
      .toLowerCase()
      .endsWith(".svg")
  );
}

function getParticipantName(
  user
) {
  if (!user) {
    return "Тодорхойгүй хэрэглэгч";
  }

  if (
    typeof user === "string"
  ) {
    return user;
  }

  return (
    user.name ||
    user.full_name ||
    user.display_name ||
    user.fullName ||
    [
      user.first_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    [
      user.last_name,
      user.first_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    [
      user.firstName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    user.user?.name ||
    user.user?.full_name ||
    user.user?.display_name ||
    [
      user.user?.first_name,
      user.user?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    user.user?.email ||
    "Тодорхойгүй хэрэглэгч"
  );
}

function getParticipantEmail(
  user
) {
  if (
    !user ||
    typeof user === "string"
  ) {
    return "";
  }

  return (
    user.email ||
    user.user_email ||
    user.user?.email ||
    ""
  );
}

function getParticipantAvatar(
  user
) {
  if (
    !user ||
    typeof user === "string"
  ) {
    return "";
  }

  return (
    resolveUrl(
      user.profile_image
    ) ||
    resolveUrl(
      user.profile_img
    ) ||
    resolveUrl(
      user.avatar
    ) ||
    resolveUrl(
      user.avatar_url
    ) ||
    resolveUrl(
      user.image_url
    ) ||
    resolveUrl(
      user.image
    ) ||
    resolveUrl(
      user.photo
    ) ||
    resolveUrl(
      user.photo_url
    ) ||
    resolveUrl(
      user.user
        ?.profile_image
    ) ||
    resolveUrl(
      user.user?.avatar
    ) ||
    resolveUrl(
      user.user?.avatar_url
    ) ||
    ""
  );
}

function getParticipantInitials(
  user
) {
  const name =
    getParticipantName(
      user
    ).trim();

  if (!name) {
    return "?";
  }

  const parts =
    name
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[1].charAt(
    0
  )}`.toUpperCase();
}

function getParticipantId(
  user
) {
  const value =
    user?.user_id ||
    user?.id ||
    user?.user?.id;

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

export default function History() {
  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    filter,
    setFilter,
  ] = useState("all");

  const [
    sort,
    setSort,
  ] = useState("newest");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingEventId,
    setEditingEventId,
  ] = useState(null);

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState(null);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    successMsg,
    setSuccessMsg,
  ] = useState("");

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    badge,
    setBadge,
  ] = useState("");

  const [
    speakers,
    setИлтгэгчид,
  ] = useState([
    makeSpeaker(),
  ]);

  const [
    agendas,
    setХөтөлбөрs,
  ] = useState([
    {
      text: "",
      time: "",
    },
  ]);

  const [
    start_time,
    setЭхлэхTime,
  ] = useState("");

  const [
    end_time,
    setДуусахTime,
  ] = useState("");

  const [
    image_url,
    setImageUrl,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState(null);

  const [
    max_participants,
    setMaxParticipants,
  ] = useState("");

  const [
    visibility,
    setVisibility,
  ] = useState(
    "public"
  );

  const [
    showParticipants,
    setShowParticipants,
  ] = useState(false);

  const [
    participants,
    setParticipants,
  ] = useState([]);

  const [
    participantsLoading,
    setParticipantsLoading,
  ] = useState(false);

    const [
    showAddPeople,
    setShowAddPeople,
  ] = useState(false);

  const [
    addPeopleForm,
    setAddPeopleForm,
  ] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  const [
    addPeopleLoading,
    setAddPeopleLoading,
  ] = useState(false);

  const [
    addPeopleError,
    setAddPeopleError,
  ] = useState("");

  const [
    addPeopleSuccess,
    setAddPeopleSuccess,
  ] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setEvents([]);

        setError(
          "Эхлээд нэвтэрнэ үү."
        );

        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/events/my-joined`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => []);

      if (
        !response.ok
      ) {
        setEvents([]);

        setError(
          data?.message ||
            "Эвентүүдийг ачаалж чадсангүй."
        );

        return;
      }

      const list =
        Array.isArray(data)
          ? data
          : [];

      setEvents(
        list
      );
    } catch (err) {
      console.error(err);

      setEvents([]);

      setError(
        "Сүлжээний алдаа гарлаа."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadParticipants(
    eventId
  ) {
    try {
      setParticipantsLoading(
        true
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setParticipants(
          []
        );

        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/events/${eventId}/participants`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok
      ) {
        setParticipants(
          []
        );

        return;
      }

      const list =
        Array.isArray(data)
          ? data
          : Array.isArray(
                data?.participants
              )
            ? data.participants
            : Array.isArray(
                  data?.users
                )
              ? data.users
              : Array.isArray(
                    data?.data
                  )
                ? data.data
                : Array.isArray(
                      data?.results
                    )
                  ? data.results
                  : [];

      setParticipants(
        list
      );
    } catch (err) {
      console.error(err);

      setParticipants(
        []
      );
    } finally {
      setParticipantsLoading(
        false
      );
    }
  }

    function handleAddPeopleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddPeopleForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setAddPeopleError("");
    setAddPeopleSuccess("");
  }

  async function createAndAddPerson(
    event
  ) {
    event.preventDefault();

    if (addPeopleLoading) {
      return;
    }

    const eventId =
      selectedEvent?.id;

    const email =
      addPeopleForm.email
        .trim()
        .toLowerCase();

    const firstName =
      addPeopleForm.firstName.trim();

    const lastName =
      addPeopleForm.lastName.trim();

    const phone =
      addPeopleForm.phone.trim();

    if (!eventId) {
      setAddPeopleError(
        "Эвент олдсонгүй."
      );

      return;
    }

    if (!email) {
      setAddPeopleError(
        "И-мэйл хаяг оруулна уу."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setAddPeopleError(
        "Зөв и-мэйл хаяг оруулна уу."
      );

      return;
    }

    if (!firstName) {
      setAddPeopleError(
        "Нэр оруулна уу."
      );

      return;
    }

    if (!lastName) {
      setAddPeopleError(
        "Овог оруулна уу."
      );

      return;
    }

    if (!phone) {
      setAddPeopleError(
        "Утасны дугаар оруулна уу."
      );

      return;
    }

    try {
      setAddPeopleLoading(true);

      setAddPeopleError(
        ""
      );

      setAddPeopleSuccess(
        ""
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setAddPeopleError(
          "Эхлээд нэвтэрнэ үү."
        );

        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/events/${eventId}/participants`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              email,
              first_name: firstName,
              last_name: lastName,
              phone,
            }),
          }
        );
        
      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setAddPeopleError(
          data?.message ||
            data?.error ||
            "Хэрэглэгч үүсгэж эвентэд нэмж чадсангүй."
        );

        return;
      }

      if (data?.already_joined) {
        setAddPeopleSuccess(
          "Энэ хэрэглэгч эвентэд аль хэдийн нэмэгдсэн байна."
        );
      } else if (data?.created) {
        setAddPeopleSuccess(
          "Хэрэглэгч үүсгэж эвентэд амжилттай нэмлээ."
        );
      } else {
        setAddPeopleSuccess(
          "Бүртгэлтэй хэрэглэгчийг эвентэд амжилттай нэмлээ."
        );
      }

      setAddPeopleForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
      });

      await loadParticipants(
        eventId
      );
    } catch (err) {
      console.error(err);

      setAddPeopleError(
        "Хэрэглэгч нэмэх үед сүлжээний алдаа гарлаа."
      );
    } finally {
      setAddPeopleLoading(
        false
      );
    }
  }

  async function addPersonToEvent(
    person
  ) {
    const eventId =
      selectedEvent?.id;

    const userId =
      getParticipantId(
        person
      );

    if (
      !eventId ||
      !userId
    ) {
      setAddPeopleError(
        "Хэрэглэгчийн мэдээлэл буруу байна."
      );

      return;
    }

    try {
      setAddingUserId(
        userId
      );

      setAddPeopleError(
        ""
      );

      setAddPeopleSuccess(
        ""
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setAddPeopleError(
          "Эхлээд нэвтэрнэ үү."
        );

        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/events/${eventId}/participants`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify(
              {
                user_id:
                  userId,
              }
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok
      ) {
        setAddPeopleError(
          data?.message ||
            "Хэрэглэгчийг нэмж чадсангүй."
        );

        return;
      }

      setAddPeopleSuccess(
        `${getParticipantName(
          person
        )} амжилттай нэмэгдлээ.`
      );

      setPeopleResults(
        (current) =>
          current.filter(
            (item) =>
              getParticipantId(
                item
              ) !== userId
          )
      );

      await loadParticipants(
        eventId
      );
    } catch (err) {
      console.error(err);

      setAddPeopleError(
        "Хэрэглэгч нэмэх үед сүлжээний алдаа гарлаа."
      );
    } finally {
      setAddingUserId(
        null
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visibleEvents =
    useMemo(() => {
      let result = [
        ...events,
      ];

      if (filter === "all") {
        result = result.filter(
          (event) =>
            getEventStatus(event) !== "ended"
        );
      } else {
        result = result.filter(
          (event) =>
            getEventStatus(event) === filter
        );
      }

      result.sort(
        (a, b) => {
          const aTime =
            parseEventDateTime(
              a.start_time ||
                a.created_at
            );

          const bTime =
            parseEventDateTime(
              b.start_time ||
                b.created_at
            );

          return sort ===
            "oldest"
            ? aTime -
                bTime
            : bTime -
                aTime;
        }
      );

      return result;
    }, [
      events,
      filter,
      sort,
    ]);

  const minDateTime =
    new Date(
      Date.now() -
        new Date().getTimezoneOffset() *
          60000
    )
      .toISOString()
      .slice(0, 16);

  const viewИлтгэгчид =
    useMemo(
      () =>
        parseИлтгэгчид(
          selectedEvent?.speaker
        ),
      [selectedEvent]
    );

  const viewХөтөлбөр =
    useMemo(
      () =>
        parseХөтөлбөр(
          selectedEvent?.agenda
        ),
      [selectedEvent]
    );

  function resetForm() {
    setTitle("");
    setDescription("");
    setBadge("");

    setИлтгэгчид([
      makeSpeaker(),
    ]);

    setХөтөлбөрs([
      {
        text: "",
        time: "",
      },
    ]);

    setЭхлэхTime("");
    setДуусахTime("");
    setImageUrl("");
    setImageFile(null);

    setMaxParticipants(
      ""
    );

    setVisibility(
      "Нийтийн"
    );

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

    setEditingEventId(
      null
    );

    setSelectedEvent(
      null
    );

    setShowForm(true);

    scrollTop();
  }

  function openEdit(
    event
  ) {
    resetForm();

    setSelectedEvent(
      null
    );

    setEditingEventId(
      event.id
    );

    setTitle(
      event.title || ""
    );

    setDescription(
      event.description ||
        ""
    );

    setBadge(
      event.badge || ""
    );

    const parsedИлтгэгчид =
      parseИлтгэгчид(
        event.speaker
      );

    const parsedХөтөлбөр =
      parseХөтөлбөр(
        event.agenda
      );

    setИлтгэгчид(
      parsedИлтгэгчид.length
        ? parsedИлтгэгчид
        : [makeSpeaker()]
    );

    setХөтөлбөрs(
      parsedХөтөлбөр.length
        ? parsedХөтөлбөр
        : [
            {
              text: "",
              time: "",
            },
          ]
    );

    setЭхлэхTime(
      toDateTimeLocal(
        event.start_time
      )
    );

    setДуусахTime(
      toDateTimeLocal(
        event.end_time
      )
    );

    setImageUrl(
      event.image_url || ""
    );

    setImageFile(null);

    setMaxParticipants(
      event.max_participants ||
        ""
    );

    setVisibility(
      event.visibility ||
        "public"
    );

    setShowForm(true);

    scrollTop();
  }

  function openView(
    event
  ) {
    setShowForm(false);

    setEditingEventId(
      null
    );

    setSelectedEvent(
      event
    );

    setShowParticipants(
      false
    );

    setShowAddPeople(
      false
    );

    scrollTop();
  }

  function closeForm() {
    setShowForm(false);

    setEditingEventId(
      null
    );

    resetForm();

    scrollTop();
  }

  function closeView() {
    setSelectedEvent(
      null
    );

    setShowParticipants(
      false
    );

    setShowAddPeople(
      false
    );

    scrollTop();
  }

  async function openAddPeople() {
    setAddPeopleForm({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
    });

    setAddPeopleError(
      ""
    );

    setAddPeopleSuccess(
      ""
    );

    setShowAddPeople(
      true
    );

    await loadParticipants(
      selectedEvent.id
    );
  }

  function handleХөтөлбөрChange(
    index,
    field,
    value
  ) {
    setХөтөлбөрs(
      (current) =>
        current.map(
          (item, i) =>
            i === index
              ? {
                  ...item,
                  [field]:
                    value,
                }
              : item
        )
    );
  }

  function addХөтөлбөрItem() {
    setХөтөлбөрs(
      (current) => [
        ...current,
        {
          text: "",
          time: "",
        },
      ]
    );
  }

  function removeХөтөлбөрItem(
    index
  ) {
    setХөтөлбөрs(
      (current) => {
        if (
          current.length ===
          1
        ) {
          return current;
        }

        return current.filter(
          (_, i) =>
            i !== index
        );
      }
    );
  }

  function handleSpeakerChange(
    index,
    field,
    value
  ) {
    setИлтгэгчид(
      (current) =>
        current.map(
          (speaker, i) =>
            i === index
              ? {
                  ...speaker,
                  [field]:
                    value,
                }
              : speaker
        )
    );
  }

  function addSpeaker() {
    setИлтгэгчид(
      (current) => [
        ...current,
        makeSpeaker(),
      ]
    );
  }

  function removeSpeaker(
    index
  ) {
    setИлтгэгчид(
      (current) => {
        if (
          current.length ===
          1
        ) {
          return current;
        }

        return current.filter(
          (_, i) =>
            i !== index
        );
      }
    );
  }

  async function handleSave(
    event
  ) {
    event.preventDefault();

    if (creating) return;

    setFormError("");
    setSuccessMsg("");

    if (
      !title.trim() ||
      !badge.trim() ||
      !start_time
    ) {
      setFormError(
        "Гарчиг, төрөл болон эхлэх огноо, цагийг заавал оруулна уу."
      );

      return;
    }

    if (
      !editingEventId &&
      new Date(
        start_time
      ) < new Date()
    ) {
      setFormError(
        "Өнгөрсөн огноо сонгох боломжгүй."
      );

      return;
    }

    if (
      end_time &&
      new Date(
        end_time
      ) <
        new Date(
          start_time
        )
    ) {
      setFormError(
        "Дуусах цаг эхлэх цагаас өмнө байж болохгүй."
      );

      return;
    }

    if (
      imageFile &&
      isSvgFile(
        imageFile
      )
    ) {
      setFormError(
        "SVG зураг оруулах боломжгүй."
      );

      return;
    }

    try {
      setCreating(
        true
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setFormError(
          "Эхлээд нэвтэрнэ үү."
        );

        return;
      }

      const cleanedХөтөлбөрs =
        agendas
          .map(
            (item) => ({
              text: String(
                item.text || ""
              ).trim(),

              time: String(
                item.time || ""
              ).trim(),
            })
          )
          .filter(
            (item) =>
              item.text ||
              item.time
          );

      const cleanedИлтгэгчид =
        speakers
          .map(
            (speaker) => ({
              name: String(
                speaker.name ||
                  ""
              ).trim(),

              organization:
                String(
                  speaker.organization ||
                    ""
                ).trim(),

              topic: String(
                speaker.topic ||
                  ""
              ).trim(),
            })
          )
          .filter(
            (speaker) =>
              speaker.name ||
              speaker.organization ||
              speaker.topic
          );

      const formData =
        new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "badge",
        badge.trim()
      );

      formData.append(
        "speaker",
        JSON.stringify(
          cleanedИлтгэгчид
        )
      );

      formData.append(
        "agenda",
        JSON.stringify(
          cleanedХөтөлбөрs
        )
      );

      formData.append(
        "start_time",
        start_time.replace(
          "T",
          " "
        )
      );

      formData.append(
        "end_time",
        end_time
          ? end_time.replace(
              "T",
              " "
            )
          : ""
      );

      formData.append(
        "image_url",
        image_url.trim()
      );

      formData.append(
        "max_participants",
        max_participants
          ? String(
              max_participants
            )
          : "0"
      );

      formData.append(
        "visibility",
        visibility
      );

      if (imageFile) {
        formData.append(
          "image",
          imageFile
        );
      }

      speakers.forEach(
        (speaker) => {
          if (
            speaker.avatar instanceof
            File
          ) {
            formData.append(
              "speaker_avatars",
              speaker.avatar
            );
          }
        }
      );

      const url =
        editingEventId
          ? `${API_BASE}/api/events/${editingEventId}`
          : `${API_BASE}/api/events`;

      const response =
        await fetch(
          url,
          {
            method:
              editingEventId
                ? "PUT"
                : "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: formData,
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok
      ) {
        setFormError(
          data?.message ||
            (editingEventId
              ? "Эвентийг шинэчилж чадсангүй."
              : "Эвент үүсгэж чадсангүй.")
        );

        return;
      }

      await load();

      setShowForm(false);

      setEditingEventId(
        null
      );

      resetForm();

      scrollTop();
    } catch (err) {
      console.error(err);

      setFormError(
        "Сүлжээний алдаа гарлаа."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteEvent(
    event
  ) {
    const confirmed =
      window.confirm(
        `"${event.title ||
          "Эвент"}" эвентыг устгах уу?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        event.id
      );

      const token =
        localStorage.getItem(
          "token"
        );

      const response =
        await fetch(
          `${API_BASE}/api/events/${event.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (
        !response.ok
      ) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        setError(
          data?.message ||
            "Эвентийг устгаж чадсангүй."
        );

        return;
      }

      setEvents(
        (current) =>
          current.filter(
            (item) =>
              Number(
                item.id
              ) !==
              Number(
                event.id
              )
          )
      );
    } catch {
      setError(
        "Сүлжээний алдаа гарлаа."
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  return (
    <UserShell title="Миний эвентүүд">
      <div className="myEventsPage">
        {showForm ? (
          <EventCreateWizard
            key={
              editingEventId ||
              "new-event"
            }
            editingEventId={
              editingEventId
            }
            title={title}
            setTitle={setTitle}
            description={
              description
            }
            setDescription={
              setDescription
            }
            badge={badge}
            setBadge={setBadge}
            speakers={speakers}
            handleSpeakerChange={
              handleSpeakerChange
            }
            addSpeaker={
              addSpeaker
            }
            removeSpeaker={
              removeSpeaker
            }
            agendas={agendas}
            handleХөтөлбөрChange={
              handleХөтөлбөрChange
            }
            addХөтөлбөрItem={
              addХөтөлбөрItem
            }
            removeХөтөлбөрItem={
              removeХөтөлбөрItem
            }
            start_time={
              start_time
            }
            setЭхлэхTime={
              setЭхлэхTime
            }
            end_time={
              end_time
            }
            setДуусахTime={
              setДуусахTime
            }
            image_url={
              image_url
            }
            imageFile={
              imageFile
            }
            setImageFile={
              setImageFile
            }
            max_participants={
              max_participants
            }
            setMaxParticipants={
              setMaxParticipants
            }
            visibility={
              visibility
            }
            setVisibility={
              setVisibility
            }
            creating={
              creating
            }
            errMsg={
              formError
            }
            setErrMsg={
              setFormError
            }
            successMsg={
              successMsg
            }
            minDateTime={
              minDateTime
            }
            resolveUrl={
              resolveUrl
            }
            getSpeakerAvatar={
              getSpeakerAvatar
            }
            isSvgFile={
              isSvgFile
            }
            handleCreate={
              handleSave
            }
            closeCreate={
              closeForm
            }
          />
        ) : selectedEvent ? (
          <div className="eventDetailPage">
            <button
              type="button"
              className="eventDetailBack"
              onClick={
                closeView
              }
            >
              ← Миний эвентүүд рүү буцах
            </button>

            <div className="eventDetailHero">
              <img
                className="eventDetailHeroImage"
                src={getEventImage(
                  selectedEvent
                )}
                alt={
                  selectedEvent.title ||
                  "Эвент"
                }
              />

              <div className="eventDetailHeroShade" />

              <div className="eventDetailHeroContent">
                <span className="eventDetailTag">
                  {selectedEvent.visibility ||
                    "Нийтийн"}
                </span>

                <h1>
                  {selectedEvent.title}
                </h1>
              </div>
            </div>

            <div className="eventDetailLayout">
              <div className="eventDetailMain">
                <section className="eventDetailSection">
                  <h2>
                    Эвентийн тухай
                  </h2>

                  <p>
                    {selectedEvent.description ||
                      "Тайлбар байхгүй."}
                  </p>
                </section>

                {viewИлтгэгчид.length >
                0 ? (
                  <section className="eventDetailSection">
                    <h2>
                      Илтгэгчид
                    </h2>

                    <div className="eventDetailИлтгэгчид">
                      {viewИлтгэгчид.map(
                        (
                          speaker,
                          index
                        ) => (
                          <div
                            className="eventDetailSpeaker"
                            key={
                              index
                            }
                          >
                            <div className="eventDetailSpeakerAvatar">
                              {speaker.name
                                ?.charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  speaker.name
                                }
                              </strong>

                              <span>
                                {
                                  speaker.organization
                                }
                              </span>

                              <small>
                                {
                                  speaker.topic
                                }
                              </small>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                ) : null}

                {viewХөтөлбөр.length >
                0 ? (
                  <section className="eventDetailSection">
                    <h2>
                      Хөтөлбөр
                    </h2>

                    {viewХөтөлбөр.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="eventDetailХөтөлбөрItem"
                          key={
                            index
                          }
                        >
                          <span>
                            {
                              item.time
                            }
                          </span>

                          <strong>
                            {
                              item.text
                            }
                          </strong>
                        </div>
                      )
                    )}
                  </section>
                ) : null}
              </div>

              <aside className="eventDetailSidebar">
                <section className="eventDetailSideCard">
                  <h2>
                    Эвентийн мэдээлэл
                  </h2>

                  <p>
                    Эхлэх
                  </p>

                  <strong>
                    {formatDateTime(
                      selectedEvent.start_time
                    )}
                  </strong>

                  <p>
                    Дуусах
                  </p>

                  <strong>
                    {formatDateTime(
                      selectedEvent.end_time
                    )}
                  </strong>
                </section>

                <section className="eventDetailActionsCard">
                  {!isFinished(
                    selectedEvent
                  ) ? (
                    <button
                      type="button"
                      className="eventDetailEditBtn"
                      onClick={() =>
                        openEdit(
                          selectedEvent
                        )
                      }
                    >
                      Эвент засах
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="eventDetailAddPeopleBtn"
                    onClick={
                      openAddPeople
                    }
                  >
                    <FiUserPlus />
                    Хүн нэмэх
                  </button>

                  <button
                    type="button"
                    className="eventDetailAttendeesBtn"
                    onClick={async () => {
                      setShowParticipants(
                        true
                      );

                      await loadParticipants(
                        selectedEvent.id
                      );
                    }}
                  >
                    <FiUsers />
                    Оролцогчдыг харах
                  </button>
                </section>
              </aside>
            </div>
          </div>
        ) : (
          <>
            <div className="myEventsHeader">
              <div>
                <h1>
                  Миний эвентүүд
                </h1>

                <p>
                  Таны үүсгэсэн болон зохион байгуулсан эвентүүд
                </p>
              </div>

              <button
                className="myEventsCreateBtn"
                onClick={
                  openCreate
                }
              >
                + Эвент үүсгэх
              </button>
            </div>

            <div className="myEventsToolbar">
              <div className="myEventsFilters">
                {[
                  "all",
                  "draft",
                  "published",
                  "ended",
                ].map(
                  (item) => (
                    <button
                      key={
                        item
                      }
                      className={`myEventsFilter ${
                        filter ===
                        item
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setFilter(
                          item
                        )
                      }
                    >
                      {{
                        all: "Бүгд",
                        draft: "Ноорог",
                        published: "Нийтлэгдсэн",
                        ended: "Дууссан",
                      }[item]}
                    </button>
                  )
                )}
              </div>

              <select
                className="myEventsSort"
                value={sort}
                onChange={(
                  event
                ) =>
                  setSort(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="newest">
                  Шинэ нь эхэнд
                </option>

                <option value="oldest">
                  Хуучин нь эхэнд
                </option>
              </select>
            </div>

            {loading ? (
              <div className="myEventsLoading">
                Уншиж байна...
              </div>
            ) : (
              <div className="myEventsGrid">
                {visibleEvents.map(
                  (event) => (
                    <article
                      className="myEventCard"
                      key={
                        event.id
                      }
                    >
                      <button
                        className="myEventImageButton"
                        onClick={() =>
                          openView(
                            event
                          )
                        }
                      >
                        <img
                          src={getEventImage(
                            event
                          )}
                          alt={
                            event.title
                          }
                        />
                      </button>

                      <div className="myEventBody">
                        <h3>
                          {
                            event.title
                          }
                        </h3>

                        <p>
                          {formatDateTime(
                            event.start_time
                          )}
                        </p>

                        <div className="myEventActions">
                          <button
                            onClick={() =>
                              openEdit(
                                event
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              openView(
                                event
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              deleteEvent(
                                event
                              )
                            }
                          >
                            {deletingId ===
                            event.id
                              ? "..."
                              : (
                                <FiTrash2 />
                              )}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

            {showAddPeople ? (
        <div
          className="historyModalOverlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !addPeopleLoading
            ) {
              setShowAddPeople(
                false
              );
            }
          }}
        >
          <div className="historyModal">
            <div className="historyModalHeader">
              <div>
                <h2>
                  Хүн нэмэх
                </h2>

                <p>
                  {
                    selectedEvent
                      ?.title
                  }
                </p>
              </div>

              <button
                type="button"
                disabled={
                  addPeopleLoading
                }
                onClick={() =>
                  setShowAddPeople(
                    false
                  )
                }
              >
                <FiX />
              </button>
            </div>

            <div className="historyModalBody">
              <form
                className="historyInviteForm"
                onSubmit={
                  createAndAddPerson
                }
              >
                <div className="historyInviteField">
                  <label htmlFor="invite-email">
                    И-мэйл
                  </label>

                  <input
                    id="invite-email"
                    type="email"
                    name="email"
                    value={
                      addPeopleForm.email
                    }
                    onChange={
                      handleAddPeopleChange
                    }
                    placeholder="user@example.com"
                    autoComplete="email"
                    disabled={
                      addPeopleLoading
                    }
                  />
                </div>

                <div className="historyInviteGrid">
                  <div className="historyInviteField">
                    <label htmlFor="invite-first-name">
                      Name
                    </label>

                    <input
                      id="invite-first-name"
                      type="text"
                      name="firstName"
                      value={
                        addPeopleForm.firstName
                      }
                      onChange={
                        handleAddPeopleChange
                      }
                      placeholder="Нэр"
                      autoComplete="given-name"
                      disabled={
                        addPeopleLoading
                      }
                    />
                  </div>

                  <div className="historyInviteField">
                    <label htmlFor="invite-last-name">
                      Овог
                    </label>

                    <input
                      id="invite-last-name"
                      type="text"
                      name="lastName"
                      value={
                        addPeopleForm.lastName
                      }
                      onChange={
                        handleAddPeopleChange
                      }
                      placeholder="Овог"
                      autoComplete="family-name"
                      disabled={
                        addPeopleLoading
                      }
                    />
                  </div>
                </div>

                <div className="historyInviteField">
                  <label htmlFor="invite-phone">
                    Утасны дугаар
                  </label>

                  <input
                    id="invite-phone"
                    type="tel"
                    name="phone"
                    value={
                      addPeopleForm.phone
                    }
                    onChange={
                      handleAddPeopleChange
                    }
                    placeholder="99112233"
                    autoComplete="tel"
                    disabled={
                      addPeopleLoading
                    }
                  />
                </div>

                {addPeopleError ? (
                  <div className="historyMessage error">
                    {
                      addPeopleError
                    }
                  </div>
                ) : null}

                {addPeopleSuccess ? (
                  <div className="historyMessage success">
                    {
                      addPeopleSuccess
                    }
                  </div>
                ) : null}

                <div className="historyInviteActions">
                  <button
                    type="button"
                    className="historyInviteЦуцлахBtn"
                    disabled={
                      addPeopleLoading
                    }
                    onClick={() =>
                      setShowAddPeople(
                        false
                      )
                    }
                  >
                    Цуцлах
                  </button>

                  <button
                    type="submit"
                    className="historyInviteSubmitBtn"
                    disabled={
                      addPeopleLoading
                    }
                  >
                    {addPeopleLoading
                      ? "Үүсгэж байна..."
                      : "Үүсгээд нэмэх"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showParticipants ? (
        <div className="historyModalOverlay">
          <div className="historyModal">
            <div className="historyModalHeader">
              <h2>
                Оролцогчид
              </h2>

              <button
                onClick={() =>
                  setShowParticipants(
                    false
                  )
                }
              >
                <FiX />
              </button>
            </div>

            <div className="historyModalBody">
              {participantsLoading ? (
                <p>
                  Уншиж байна...
                </p>
              ) : participants.length ===
                0 ? (
                <p>
                  Оролцогч байхгүй.
                </p>
              ) : (
                participants.map(
                  (
                    person,
                    index
                  ) => (
                    <div
                      className="historyPersonRow"
                      key={
                        getParticipantId(
                          person
                        ) ||
                        index
                      }
                    >
                      <div className="historyPersonAvatar">
                        {getParticipantInitials(
                          person
                        )}
                      </div>

                      <div className="historyPersonInfo">
                        <strong>
                          {getParticipantName(
                            person
                          )}
                        </strong>

                        <span>
                          {getParticipantИ-мэйл(
                            person
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </UserShell>
  );
}