import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";
import { FiTrash2 } from "react-icons/fi";

function resolveUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-US", {
    timeZone: "Asia/Ulaanbaatar",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isFinished(event) {
  if (!event?.end_time) return false;

  const end = new Date(event.end_time).getTime();

  return Number.isFinite(end) && end < Date.now();
}

function getEventStatus(event) {
  if (isFinished(event)) {
    return "ended";
  }

  const status = String(event?.status || "").trim().toLowerCase();

  if (status === "draft") {
    return "draft";
  }

  return "published";
}

export default function History() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setEvents([]);
        setError("Please login first.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/events/my-joined`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        setEvents([]);
        setError(data?.message || "Failed to load events");
        return;
      }

      const list = Array.isArray(data) ? data : [];

      const created = list.filter((event) => {
        if (event?.relation_type) {
          return String(event.relation_type).toLowerCase() === "created";
        }

        if (event?.is_owner !== undefined) {
          return Boolean(event.is_owner);
        }

        if (event?.is_creator !== undefined) {
          return Boolean(event.is_creator);
        }

        return true;
      });

      setEvents(created);
    } catch (err) {
      console.error(err);
      setEvents([]);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visibleEvents = useMemo(() => {
    let result = [...events];

    if (filter !== "all") {
      result = result.filter((event) => getEventStatus(event) === filter);
    }

    result.sort((a, b) => {
      const aTime = new Date(a.start_time || a.created_at || 0).getTime();
      const bTime = new Date(b.start_time || b.created_at || 0).getTime();

      if (sort === "oldest") {
        return aTime - bTime;
      }

      return bTime - aTime;
    });

    return result;
  }, [events, filter, sort]);

  function createEvent() {
    navigate("/user/event?create=1");
  }

  function viewEvent(event) {
    navigate(`/user/event?eventId=${event.id}`);
  }

  function editEvent(event) {
    navigate(`/user/event?eventId=${event.id}&edit=1`);
  }

  async function deleteEvent(event) {
    const confirmed = window.confirm(
      `"${event.title || "Event"}" эвентыг устгах уу?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(event.id);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please login first.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/events/${event.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message || "Failed to delete event");
        return;
      }

      setEvents((current) =>
        current.filter((item) => Number(item.id) !== Number(event.id)),
      );
    } catch (err) {
      console.error(err);
      setError("Network error while deleting event");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <UserShell title="My Events">
      <div className="myEventsPage">
        <div className="myEventsHeader">
          <div className="myEventsHeading">
            <h1 className="myEventsTitle">My Events</h1>
            <p className="myEventsSubtitle">
              Events you've created and organized
            </p>
          </div>

          <button
            type="button"
            className="myEventsCreateBtn"
            onClick={createEvent}
          >
            <span>+</span>
            Create Event
          </button>
        </div>

        <div className="myEventsToolbar">
          <div className="myEventsFilters">
            <button
              type="button"
              className={
                filter === "all"
                  ? "myEventsFilter active"
                  : "myEventsFilter"
              }
              onClick={() => setFilter("all")}
            >
              All
            </button>

            <button
              type="button"
              className={
                filter === "draft"
                  ? "myEventsFilter active"
                  : "myEventsFilter"
              }
              onClick={() => setFilter("draft")}
            >
              Draft
            </button>

            <button
              type="button"
              className={
                filter === "published"
                  ? "myEventsFilter active"
                  : "myEventsFilter"
              }
              onClick={() => setFilter("published")}
            >
              Published
            </button>

            <button
              type="button"
              className={
                filter === "ended"
                  ? "myEventsFilter active"
                  : "myEventsFilter"
              }
              onClick={() => setFilter("ended")}
            >
              Ended
            </button>
          </div>

          <select
            className="myEventsSort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {error ? <div className="myEventsError">{error}</div> : null}

        {loading ? (
          <div className="myEventsLoading">Loading events...</div>
        ) : visibleEvents.length === 0 ? (
          <div className="myEventsEmpty">
            <div className="myEventsEmptyIcon">☆</div>
            <h3>No events</h3>
            <p>No events found for this filter.</p>
          </div>
        ) : (
          <div className="myEventsGrid">
            {visibleEvents.map((event) => {
              const status = getEventStatus(event);

              return (
                <article className="myEventCard" key={event.id}>
                  <button
                    type="button"
                    className="myEventImageButton"
                    onClick={() => viewEvent(event)}
                  >
                    <img
                      className="myEventImage"
                      src={getEventImage(event)}
                      alt={event.title || "Event"}
                      onError={(e) => {
                        e.currentTarget.src = fallbackImgSrc();
                      }}
                    />

                    <span className={`myEventStatus ${status}`}>
                      {status === "draft"
                        ? "Draft"
                        : status === "ended"
                          ? "Ended"
                          : "Published"}
                    </span>
                  </button>

                  <div className="myEventBody">
                    <h3 className="myEventTitle">
                      {event.title || "Untitled event"}
                    </h3>

                    <p className="myEventDate">
                      {formatDateTime(event.start_time)}
                    </p>

                    <div className="myEventActions">
                      <button
                        type="button"
                        className="myEventEditBtn"
                        onClick={() => editEvent(event)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="myEventViewBtn"
                        onClick={() => viewEvent(event)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="myEventDeleteBtn"
                        onClick={() => deleteEvent(event)}
                        disabled={deletingId === event.id}
                        aria-label="Delete event"
                        title="Delete"
                      >
                        {deletingId === event.id ? "…" : <FiTrash2 />}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </UserShell>
  );
}
