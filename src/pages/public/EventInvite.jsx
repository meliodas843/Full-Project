import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function EventInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/events/invite/${token}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setEvent(null);
          setErr(data?.message || "Invite link not found");
          return;
        }

        setEvent(data);
      } catch (e) {
        console.error(e);
        setErr("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleBook() {
    setErr("");
    setMsg("");

    const jwt = localStorage.getItem("token");
    if (!jwt) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/book`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.message || "Booking failed");
        return;
      }

      setMsg("Booked ✅ Check My Meetings");
      setTimeout(() => navigate("/user/event"), 700);
    } catch (e) {
      console.error(e);
      setErr("Network error");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24, color: "red" }}>{err}</div>;
  if (!event) return <div style={{ padding: 24 }}>Not found</div>;

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
      <h2>{event.title}</h2>
      <p>
        {formatDateTime(event.start_time)}
        {event.end_time ? ` – ${formatDateTime(event.end_time)}` : ""}
      </p>

      {msg ? <div style={{ color: "green", marginBottom: 10 }}>{msg}</div> : null}
      {err ? <div style={{ color: "red", marginBottom: 10 }}>{err}</div> : null}

      <img
        src={event.image_url || "https://via.placeholder.com/900x450"}
        alt="event"
        style={{ width: "100%", borderRadius: 12, margin: "12px 0" }}
      />

      <p>{event.description || "No description"}</p>

      <button
        onClick={handleBook}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
        }}
      >
        Book
      </button>
    </div>
  );
}
