import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/config";

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getImageSrc(image_url) {
  const u = String(image_url || "").trim();
  if (!u) return "https://via.placeholder.com/900x600";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const normalized = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${normalized}`;
}

export default function EventCard({ event, onBook, onOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [msg, setMsg] = useState("");

  const joined = Number(event.booked_count) || 0;
  const max = Number(event.max_participants) || 0;

  const capacityText = useMemo(() => {
    if (max <= 0) return `${joined} joined (Unlimited)`;
    return `${joined} / ${max} joined`;
  }, [joined, max]);

  function handleCardClick() {
    // open popup details
    if (typeof onOpen === "function") onOpen(event);
  }

  function handleBookClick(e) {
    e.stopPropagation(); // ✅ don't open modal
    setMsg("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    if (typeof onBook !== "function") {
      setMsg("Booking handler is missing.");
      return;
    }

    onBook(event);
  }

  return (
    <div className="evCard" role="button" tabIndex={0} onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
    >
      {/* IMAGE */}
      <div className="evCardImgWrap">
        <img
          className="evCardImg"
          src={getImageSrc(event.image_url)}
          alt={event.title || "Event"}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/900x600")}
        />
        <div className="evCardPill">
          <span className="evCardIcon">📅</span>
          {formatDateTime(event.start_time)}
        </div>
      </div>

      {/* BODY */}
      <div className="evCardBody">
        <div className="evCardTitleRow">
          <h3 className="evCardTitle">{event.title || "Untitled event"}</h3>
          {event.visibility === "private" ? <span className="evCardPrivate">Private</span> : null}
        </div>

        <p className="evCardDesc">{event.description || "No description."}</p>

        <div className="evCardFooter">
          <div className="evCardMeta">
            <span className="evCardMetaIcon">👥</span>
            <span>{capacityText}</span>
          </div>

          <button className="evCardBtn" type="button" onClick={handleBookClick}>
            Book
          </button>
        </div>

        {msg ? <div className="evCardMsg">{msg}</div> : null}
      </div>
    </div>
  );
}
