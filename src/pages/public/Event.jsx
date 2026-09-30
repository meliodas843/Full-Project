import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMagnifyingGlass,
  FaXmark,
} from "react-icons/fa6";
import EventCard from "../../components/EventCard";
import Footer from "../../components/Footer";
import { API_BASE } from "../../lib/config";

const categories = [
  { value: "Бүгд", label: "Бүгд" },
  { value: "Технологи", label: "Технологи" },
  { value: "Бизнес", label: "Бизнес" },
  { value: "Боловсрол", label: "Боловсрол" },
  {
    value: "Хурал, конференц",
    label: "Хурал, конференц",
  },
  { value: "Сургалт", label: "Сургалт" },
  {
    value: "Танилцах, харилцаа холбоо",
    label: "Танилцах, харилцаа холбоо",
  },
  { value: "Нийгэмлэг", label: "Нийгэмлэг" },
  { value: "Спорт", label: "Спорт" },
  {
    value: "Энтертайнмент",
    label: "Энтертайнмент",
  },
];

const CATEGORY_ALIASES = {
  Technology: "Технологи",
  Технологи: "Технологи",

  Business: "Бизнес",
  Бизнес: "Бизнес",

  Education: "Боловсрол",
  Боловсрол: "Боловсрол",

  Conference: "Хурал, конференц",
  "Хурал, конференц": "Хурал, конференц",

  Workshop: "Сургалт",
  Сургалт: "Сургалт",

  Networking: "Танилцах, харилцаа холбоо",
  "Танилцах, харилцаа холбоо":
    "Танилцах, харилцаа холбоо",

  Community: "Нийгэмлэг",
  Нийгэмлэг: "Нийгэмлэг",

  Sports: "Спорт",
  Sport: "Спорт",
  Спорт: "Спорт",

  Entertainment: "Энтертайнмент",
  Энтертайнмент: "Энтертайнмент",
};

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.events)) return data.events;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function normalizeCategory(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  return CATEGORY_ALIASES[raw] || raw;
}

function categoryOf(event) {
  return normalizeCategory(event?.category);
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object") {
    return event;
  }

  return {
    ...event,
    category: normalizeCategory(event.category),
  };
}

function eventEndTime(event) {
  return (
    event?.end_time ||
    event?.end_date ||
    event?.start_time ||
    event?.start_date
  );
}

function parseEventDate(value) {
  if (!value) return NaN;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  const raw = String(value).trim().replace(/Z$/, "");

  if (!raw) return NaN;

  const normalized = raw.includes("T")
    ? raw
    : raw.replace(" ", "T");

  return new Date(normalized).getTime();
}

function isVisible(event, now) {
  if (!event) return false;

  const visibility = String(
    event.visibility ||
      event.privacy ||
      event.type ||
      "public",
  ).toLowerCase();

  if (
    visibility === "private" ||
    visibility === "хувийн"
  ) {
    return false;
  }

  const raw = eventEndTime(event);

  if (!raw) {
    return true;
  }

  const endTime = parseEventDate(raw);

  if (!Number.isFinite(endTime)) {
    return true;
  }

  return endTime > now;
}

function getEventId(event) {
  return event?.id ?? event?._id;
}

export default function Events() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Бүгд");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  async function loadMyBookings() {
    const token = localStorage.getItem("token");

    if (!token) {
      setMyBookings([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/events/my-bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setMyBookings([]);
        return;
      }

      const data = await response
        .json()
        .catch(() => []);

      const ids = Array.isArray(data)
        ? data
            .map((id) => Number(id))
            .filter(Number.isFinite)
        : [];

      setMyBookings(ids);
    } catch (err) {
      console.error(
        "Failed to load my event bookings:",
        err,
      );

      setMyBookings([]);
    }
  }

  async function loadEvents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/events`,
      );

      const data = await response
        .json()
        .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Эвэнтүүдийг ачаалж чадсангүй.",
        );
      }

      const loadedEvents =
        normalizeArray(data).map(normalizeEvent);

      setEvents(loadedEvents);
      setNow(Date.now());
    } catch (err) {
      setError(
        err?.message ||
          "Сервертэй холбогдож чадсангүй.",
      );

      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPage() {
    await Promise.all([
      loadEvents(),
      loadMyBookings(),
    ]);
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const visibleEvents = useMemo(() => {
    return events.filter((event) =>
      isVisible(event, now),
    );
  }, [events, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return visibleEvents.filter((event) => {
      const searchableText = [
        event?.title,
        event?.description,
        categoryOf(event),
        event?.location,
        event?.venue,
        event?.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !q || searchableText.includes(q);

      const matchesCategory =
        category === "Бүгд" ||
        categoryOf(event) === category;

      return matchesQuery && matchesCategory;
    });
  }, [visibleEvents, query, category]);

  function openEvent(event) {
    const eventId = getEventId(event);

    if (!eventId) return;

    navigate(`/events/${eventId}`);
  }

  function isEventJoined(event) {
    const eventId = Number(getEventId(event));

    if (!Number.isFinite(eventId)) {
      return false;
    }

    return myBookings.includes(eventId);
  }

  async function joinEvent(event) {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const eventId = Number(getEventId(event));

    if (!Number.isFinite(eventId)) {
      alert("Эвэнтийн ID олдсонгүй.");
      return;
    }

    if (myBookings.includes(eventId)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/book`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        alert(
          data?.message ||
            "Эвэнтэд бүртгүүлж чадсангүй.",
        );

        return;
      }

      setMyBookings((current) => {
        if (current.includes(eventId)) {
          return current;
        }

        return [...current, eventId];
      });

      setEvents((current) =>
        current.map((item) => {
          const currentId = Number(
            getEventId(item),
          );

          if (currentId !== eventId) {
            return item;
          }

          return {
            ...item,
            booked_count:
              Number(item?.booked_count || 0) + 1,
          };
        }),
      );

      await Promise.all([
        loadEvents(),
        loadMyBookings(),
      ]);
    } catch (err) {
      console.error("Join event error:", err);

      alert(
        "Сервертэй холбогдож чадсангүй.",
      );
    }
  }

  return (
    <main className="riPublicPage riEventsPage">
      <section className="riListingHero">
        <div className="riContainer">
          <div className="riPill">
            ЭВЭНТҮҮД
          </div>

          <h1>
            Удахгүй болох эвэнтүүд
          </h1>

          <p>
            Сонирхолтой хурал, workshop болон
            технологийн арга хэмжээнүүдийг олж
            бүртгүүлээрэй.
          </p>

          <div className="riSearchBox">
            <FaMagnifyingGlass />

            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Эвэнт эсвэл байршлаар хайх..."
            />

            {query && (
              <button
                type="button"
                aria-label="Хайлтыг цэвэрлэх"
                onClick={() => setQuery("")}
              >
                <FaXmark />
              </button>
            )}
          </div>

          <div className="riCategoryTabs">
            {categories.map((item) => (
              <button
                type="button"
                className={
                  category === item.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategory(item.value)
                }
                key={item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="riEventsContent">
        <div className="riContainer">
          {loading && (
            <div className="riStatusBox">
              Эвэнтүүдийг ачаалж байна...
            </div>
          )}

          {!loading && error && (
            <div className="riStatusBox error">
              <span>{error}</span>

              <button
                type="button"
                className="riRetryButton"
                onClick={loadPage}
              >
                Дахин оролдох
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.length === 0 && (
              <div className="riStatusBox">
                <h3>
                  Эвэнт олдсонгүй.
                </h3>

                <p>
                  Хайлтын үг эсвэл ангиллаа
                  өөрчлөөд дахин оролдоно уу.
                </p>

                {(query ||
                  category !== "Бүгд") && (
                  <button
                    type="button"
                    className="riRetryButton"
                    onClick={() => {
                      setQuery("");
                      setCategory("Бүгд");
                    }}
                  >
                    Бүх эвэнтийг харах
                  </button>
                )}
              </div>
            )}

          {!loading &&
            !error &&
            filtered.length > 0 && (
              <div className="riEventsGrid">
                {filtered.map((event) => {
                  const eventId =
                    getEventId(event);

                  const joined =
                    isEventJoined(event);

                  return (
                    <EventCard
                      key={
                        eventId ??
                        `${event.title}-${event.start_time}`
                      }
                      event={event}
                      joined={joined}
                      onOpen={() =>
                        openEvent(event)
                      }
                      onBook={() =>
                        joinEvent(event)
                      }
                    />
                  );
                })}
              </div>
            )}
        </div>
      </section>

      <Footer />
    </main>
  );
}