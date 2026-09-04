import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCalendarDays,
  FaLocationDot,
  FaUsers,
} from "react-icons/fa6";
import { getImageSrc } from "../lib/config";
import eventFallback from "../assets/event.png";

function formatDate(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCategory(event) {
  const text = `${event?.title || ""} ${event?.description || ""}`.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("cyber") ||
    text.includes("аюулгүй")
  ) {
    return "Security";
  }

  if (text.includes("cloud")) return "Cloud";
  if (
    text.includes("ai") ||
    text.includes("machine learning") ||
    text.includes("artificial")
  ) {
    return "AI/ML";
  }

  if (text.includes("frontend") || text.includes("react")) return "Frontend";
  if (text.includes("data")) return "Data";

  return "DevOps";
}

export default function EventCard({ event, onBook, onOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const joined = Number(event?.booked_count || 0);
  const capacity = Number(event?.max_participants || 0);

  const remaining = Math.max(0, capacity - joined);

  const percentage = useMemo(() => {
    if (!capacity) return Math.min(100, joined ? 50 : 0);
    return Math.min(100, Math.round((joined / capacity) * 100));
  }, [joined, capacity]);

  function join(e) {
    e.stopPropagation();

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        state: {
          from: location.pathname,
        },
      });
      return;
    }

    onBook?.(event);
  }

  return (
    <article
      className="riEventCard"
      onClick={() => onOpen?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(event);
      }}
    >
      <div className="riEventCardImage">
        <img
          src={
            event?.image_url
              ? getImageSrc(event.image_url, eventFallback)
              : eventFallback
          }
          alt={event?.title || "Event"}
          onError={(e) => {
            e.currentTarget.src = eventFallback;
          }}
        />

        <span className={`riCategory ${getCategory(event).toLowerCase()}`}>
          {getCategory(event)}
        </span>
      </div>

      <div className="riEventCardBody">
        <h3>{event?.title || "Untitled event"}</h3>

        <div className="riEventMeta">
          <span>
            <FaCalendarDays />
            {formatDate(event?.start_time)}
          </span>

          <span>
            <FaLocationDot />
            {event?.location ||
              event?.venue ||
              event?.address ||
              "Улаанбаатар"}
          </span>
        </div>

        <div className="riEventProgress">
          <span style={{ width: `${percentage}%` }} />
        </div>

        <div className="riEventCardBottom">
          <span>
            <FaUsers />
            {joined} бүртгүүлсэн
          </span>

          {capacity > 0 && <span>{remaining} суудал үлдсэн</span>}
        </div>

        <button type="button" className="riEventJoin" onClick={join}>
          Оролцох
        </button>
      </div>
    </article>
  );
}