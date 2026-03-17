  import { useEffect, useMemo, useState } from "react";
  import EventCard from "../../components/EventCard";
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

  function resolveImageSrc(url) {
    const u = String(url || "").trim();
    if (!u) return "https://via.placeholder.com/900x600";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    const normalized = u.startsWith("/") ? u : `/${u}`;
    return `${API_BASE}${normalized}`;
  }

  export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [openEvent, setOpenEvent] = useState(null);

    async function loadEvents() {
      try {
        setError("");
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/events`);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setError(data?.message || "Failed to load events");
          setEvents([]);
          return [];
        }

        const list = Array.isArray(data) ? data : [];
        setEvents(list);
        return list;
      } catch (err) {
        console.error(err);
        setError("Network error");
        setEvents([]);
        return [];
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      loadEvents();
    }, []);
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return events;
      return events.filter((ev) => String(ev.title || "").toLowerCase().includes(q));
    }, [events, query]);
    function handleOpen(ev) {
      setOpenEvent(ev);
    }

    function closePopup() {
      setOpenEvent(null);
    }
    async function handleBook(ev) {
      try {
        setError("");
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login first.");
          return;
        }

        const res = await fetch(`${API_BASE}/api/events/${ev.id}/book`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message || "Failed to book event");
          return;
        }
        const fresh = await loadEvents();
        setOpenEvent((prev) => {
          if (!prev) return prev;
          const updated = fresh.find((x) => Number(x.id) === Number(prev.id));
          return updated || prev;
        });
      } catch (e) {
        console.error(e);
        setError("Network error while booking");
      }
    }

    return (
      <div className="eventsGradientBg">
        <div className="eventsPage">
          <div className="eventsHeaderRow">
            <div className="eventsHeader">
              <h2 className="eventsTitle">Events</h2>
              <p className="eventsSub">Discover and join upcoming events</p>
            </div>
            <div className="eventsActions">
              <div className="eventsSearchWrap">
                <input
                  className="eventsSearch"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title..."
                />
                {query && (
                  <button
                    className="eventsClear"
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button className="eventsRefresh" onClick={loadEvents} type="button" disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
          {error && <div className="eventsError">{error}</div>}

          {loading ? (
            <div className="eventsEmpty">Loading events…</div>
          ) : filtered.length === 0 ? (
            <div className="eventsEmpty">
              {events.length === 0 ? "No events available." : "No events match that title."}
            </div>
          ) : (
            <div className="eventsGrid">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} onOpen={handleOpen} onBook={handleBook} />
              ))}
            </div>
          )}
        </div>
        {openEvent && (
          <div className="evModalOverlay" onClick={closePopup} role="presentation">
            <div className="evModal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="evModalHead">
                <div>
                  <div className="evModalKicker">Event Details</div>
                  <h3 className="evModalTitle">{openEvent.title}</h3>
                </div>

                <button className="evModalClose" type="button" onClick={closePopup} title="Close">
                  ✕
                </button>
              </div>

              <div className="evModalImgWrap">
                <img
                  className="evModalImg"
                  src={resolveImageSrc(openEvent.image_url)}
                  alt={openEvent.title || "Event"}
                  onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/900x600")}
                />
              </div>

              <div className="evModalMetaRow">
                <span className="evModalBadge">{formatDateTime(openEvent.start_time)}</span>
                {openEvent.end_time ? (
                  <span className="evModalBadge evModalBadgeLight">
                    Ends: {formatDateTime(openEvent.end_time)}
                  </span>
                ) : null}
              </div>

              <p className="evModalDesc">{openEvent.description || "No description."}</p>

              <div className="evModalActions">
                <button className="evModalBook" type="button" onClick={() => handleBook(openEvent)}>
                  Book
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
