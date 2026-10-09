
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

export default function EventTicket() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/checkin/${eventId}/my-ticket`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setTicket(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <UserShell title="Миний тасалбар">
      <div className="ticketPage">
        <button onClick={() => navigate(-1)}>
          ← Буцах
        </button>

        <div className="ticketCard">
          <div className="ticketHeader">
            <span>REGISTRA</span>
            <span>ЭВЕНТИЙН ТАСАЛБАР</span>
          </div>

          {loading ? (
            <p>Тасалбар үүсгэж байна...</p>
          ) : error ? (
            <p className="checkinError">{error}</p>
          ) : (
            <>
              <h2>{ticket.event_title}</h2>
              <p>Нэвтрэх QR код</p>

              <div className="ticketQR">
                <QRCode
                  value={ticket.ticket_code}
                  size={220}
                  level="H"
                />
              </div>

              <small className="ticketCode">
                {ticket.ticket_code}
              </small>

              <div className="ticketStatus">
                {ticket.checked_in_at
                  ? "✓ Ирц бүртгэгдсэн"
                  : "○ Ирц бүртгэгдээгүй"}
              </div>

              <p>
                Эвентийн үүдэнд энэ QR кодыг
                зохион байгуулагчид уншуулна уу.
              </p>
            </>
          )}
        </div>
      </div>
    </UserShell>
  );
}
