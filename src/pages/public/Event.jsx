  import { useEffect, useMemo, useState } from "react";
  import EventCard from "../../components/EventCard";
  import { useNavigate } from "react-router-dom";
  import { API_BASE } from "@/lib/config";
  import {
  FaFacebookF,
  FaLinkedinIn,
  FaLink,
  FaShareNodes,
  FaXTwitter,
} from "react-icons/fa6";
const PUBLIC_SITE_URL = "http://103.168.56.224";

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

  function getEventEndTime(ev) {
  return ev?.end_time || ev?.start_time;
}

function shouldShowPublicEvent(ev) {
  if (!ev) return false;

  if (String(ev.visibility || "public").toLowerCase() === "private") {
    return false;
  }

  const endRaw = getEventEndTime(ev);
  if (!endRaw) return true;

  const end = new Date(endRaw).getTime();
  if (!Number.isFinite(end)) return true;

  const ONE_DAY = 24 * 60 * 60 * 1000;

  return end >= Date.now() - ONE_DAY;
}

function SocialShare({ title, url, image, description }) {
  const [open, setOpen] = useState(false);

  const finalImage =
    image && !image.includes("undefined")
      ? image
      : "https://via.placeholder.com/900x600?text=Event";

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    alert("Link copied ✅");
  }

  return (
    <>
      <div className="evSocialShare">
       <button
        type="button"
        className="evSocialBtn facebook"
        onClick={() =>
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank",
            "width=700,height=700"
          )
        }
      >
        <FaFacebookF />
      </button>

        <button
          type="button"
          className="evSocialBtn linkedin"
          onClick={() =>
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
              "_blank"
            )
          }
        >
          <FaLinkedinIn />
        </button>

        <button type="button" className="evSocialBtn copy" onClick={copyLink}>
          <FaLink />
        </button>

        <button type="button" className="evSocialBtn share" onClick={() => setOpen(true)}>
          <FaShareNodes />
        </button>
      </div>

      {open && (
        <div className="fbShareOverlay" onClick={() => setOpen(false)}>
          <div className="fbShareModal" onClick={(e) => e.stopPropagation()}>
            <div className="fbShareHead">
              <h3>Create post</h3>
              <button type="button" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="fbShareUser">
              <div className="fbAvatar">D</div>
              <div>
                <strong>Enh Tuvshin</strong>
                <div className="fbPrivacy">Найзын найз ▾</div>
              </div>
            </div>

            <textarea className="fbShareText" placeholder="Та юу бодож байна?" />

            <div className="fbPreviewCard">
              <img
                src={finalImage}
                alt={title || "Event"}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/900x600?text=Event";
                }}
              />

              <div className="fbPreviewBody">
                <span>{window.location.hostname.toUpperCase()}</span>
                <h4>{title}</h4>
                <p>{description || ""}</p>
              </div>
            </div>

            <div className="fbShareAdd">
              <strong>Нийтлэл дээрээ нэмэх</strong>
              <div className="fbShareSocials">
                <span>🖼️</span>
                <span>👥</span>
                <span>😊</span>
                <span>📍</span>
                <span>GIF</span>
                <span>🎥</span>
              </div>
            </div>

            <button
              type="button"
              className="fbShareSubmit"
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                  "_blank"
                )
              }
            >
              Хуваалцах
            </button>
          </div>
        </div>
      )}
    </>
  );
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

      return events
        .filter(shouldShowPublicEvent)
        .filter((ev) => {
          if (!q) return true;
          return String(ev.title || "").toLowerCase().includes(q);
        });
    }, [events, query]);
    function handleOpen(ev) {
      setOpenEvent(ev);
    }

    function closePopup() {
      setOpenEvent(null);
    }
      async function handleBook(ev) {
        try {
          const token = localStorage.getItem("token");

          if (!token) {
            window.location.href = "/login";
            return;
          }

          const res = await fetch(`${API_BASE}/api/events/${ev.id}/book`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            alert(data?.message || "Failed to join event");
            return;
          }

          await loadEvents();
          alert("Амжилттай бүртгэгдлээ");
        } catch (err) {
          console.error(err);
          alert("Network error");
        }
      }

    return (
      <div className="eventsGradientBg">
        <div className="eventsPage">
          <div className="eventsHeaderRow">
            <div className="eventsHeader">
              <h2 className="eventsTitle">Эвентүүд</h2>
              <p className="eventsSub">Олдсон эвентүүд</p>
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
            <div className="eventsEmpty">Эвентүүдийг ачааллаж байна...</div>
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
                  <div className="evModalKicker">Эвент дэлгэрэнгүй</div>
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

              <div className="evModalTopRow">
                <div className="evModalMetaRow">
                  <span className="evModalBadge">
                    {formatDateTime(openEvent.start_time)}
                  </span>

                  {openEvent.end_time ? (
                    <span className="evModalBadge evModalBadgeLight">
                      Ends: {formatDateTime(openEvent.end_time)}
                    </span>
                  ) : null}
                </div>

                <SocialShare
                  title={openEvent.title}
                  description={openEvent.description}
                  image={resolveImageSrc(openEvent.image_url)}
                  url={`${PUBLIC_SITE_URL}/share/event/${openEvent.id}`}
                />
              </div>

              <p className="evModalDesc">
                {openEvent.description || "No description."}
              </p>

              <div className="evModalActions">
                <button className="evModalBook" type="button" onClick={() => handleBook(openEvent)}>
                  Оролцох
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
