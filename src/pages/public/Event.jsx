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
  "All",
  "DevOps",
  "Cloud",
  "AI/ML",
  "Security",
  "Frontend",
  "Data",
];

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.events)) return data.events;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function categoryOf(event) {
  const text = `${event?.title || ""} ${
    event?.description || ""
  }`.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("cyber") ||
    text.includes("аюулгүй")
  ) {
    return "Security";
  }

  if (
    text.includes("cloud") ||
    text.includes("kubernetes") ||
    text.includes("aws") ||
    text.includes("azure")
  ) {
    return "Cloud";
  }

  if (
    text.includes("ai") ||
    text.includes("machine") ||
    text.includes("artificial") ||
    text.includes("хиймэл оюун")
  ) {
    return "AI/ML";
  }

  if (
    text.includes("frontend") ||
    text.includes("react") ||
    text.includes("javascript") ||
    text.includes("typescript")
  ) {
    return "Frontend";
  }

  if (
    text.includes("data") ||
    text.includes("analytics") ||
    text.includes("database")
  ) {
    return "Data";
  }

  return "DevOps";
}

function eventEndTime(event) {
  return (
    event?.end_time ||
    event?.end_date ||
    event?.start_time ||
    event?.start_date
  );
}

function isVisible(event) {
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

  if (!raw) return true;

  const time = new Date(raw).getTime();

  if (!Number.isFinite(time)) {
    return true;
  }

  return time >= Date.now() - 24 * 60 * 60 * 1000;
}

function getEventId(event) {
  return event?.id ?? event?._id;
}

export default function Events() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      setEvents(normalizeArray(data));
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

  useEffect(() => {
    loadEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    return events.filter(isVisible);
  }, [events]);

  const filtered = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase();

    return visibleEvents.filter((event) => {
      const searchableText = [
        event?.title,
        event?.description,
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
        category === "All" ||
        categoryOf(event) === category;

      return matchesQuery && matchesCategory;
    });
  }, [visibleEvents, query, category]);

  function openEvent(event) {
    const eventId = getEventId(event);

    if (!eventId) return;

    navigate(`/events/${eventId}`);
  }

  async function joinEvent(event) {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const eventId = getEventId(event);

    if (!eventId) {
      alert("Эвэнтийн ID олдсонгүй.");
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

      await loadEvents();

      alert(
        data?.message ||
          "Амжилттай бүртгэгдлээ.",
      );
    } catch {
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
                  category === item
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategory(item)
                }
                key={item}
              >
                {item}
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
                onClick={loadEvents}
              >
                Дахин оролдох
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.length === 0 && (
              <div className="riStatusBox">
                <h3>Эвэнт олдсонгүй.</h3>

                <p>
                  Хайлтын үг эсвэл ангиллаа
                  өөрчлөөд дахин оролдоно уу.
                </p>

                {(query ||
                  category !== "All") && (
                  <button
                    type="button"
                    className="riRetryButton"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
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

                  return (
                    <EventCard
                      key={
                        eventId ??
                        `${event.title}-${event.start_time}`
                      }
                      event={event}
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