// src/components/EventCard.jsx
import { useNavigate } from "react-router-dom";

export default function EventCard({ event }) {
  const navigate = useNavigate();

  const max = Number(event.max_participants || 0);
  const joined = Number(event.joined_count || 0);
  const isFull = max > 0 && joined >= max;

  function capacityText() {
    if (max === 0) return `${joined} joined (Unlimited)`;
    return `${joined} / ${max} joined`;
  }

  function handleBook() {
    const token = localStorage.getItem("token");

    // ✅ not logged in -> login
    if (!token) {
      navigate("/login");
      return;
    }

    // ✅ logged in -> go to event details
    navigate(`/user/event/${event.id}`);
  }

  return (
    <div className="card">
      <h3>{event.title}</h3>

      {event.description && <p>{event.description}</p>}

      <small>📅 {new Date(event.start_time).toLocaleString()}</small>

      <div className="event-capacity">👥 {capacityText()}</div>

      <button
        onClick={handleBook}
        disabled={isFull}
        className={isFull ? "disabled" : ""}
      >
        {isFull ? "Full" : "Book"}
      </button>
    </div>
  );
}
