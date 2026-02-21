import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
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

function resolveUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

// ✅ Local fallback (no internet needed)
function fallbackImgSrc() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

export default function History() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setErr("Please login first.");
        setRows([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/my-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setErr(data?.message || "Failed to load history");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
      <UserShell title="My History">
        <div className="uep-rightHeader">
          <h3 className="uep-rightTitle">History</h3>

          <button className="uep-refreshBtn" onClick={load} type="button">
            Refresh
          </button>

          <button
            className="uep-refreshBtn"
            onClick={() => navigate(-1)}
            type="button"
            aria-label="Back"
            title="Back"
          >
            X
          </button>
        </div>

        {err ? <div className="uep-error">{err}</div> : null}

        {loading ? (
          <div className="uep-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="uep-empty">No history yet.</div>
        ) : (
          <div className="uep-grid">
            {rows.map((ev) => {
              const cover = resolveUrl(ev.image_url) || fallbackImgSrc();

              return (
                <div key={ev.id} className="uep-card">
                  <div className="uep-imgWrap">
                    <img
                      className="uep-img"
                      src={cover}
                      alt={ev.title || "Event"}
                      onError={(e) => (e.currentTarget.src = fallbackImgSrc())}
                    />
                  </div>

                  <div className="uep-body">
                    <h4 className="uep-cardTitle">{ev.title}</h4>
                    <p className="uep-time">{formatDateTime(ev.start_time)}</p>
                    <p className="uep-desc">{ev.description || "No description"}</p>

                    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                      Joined count: {Number(ev.booked_count) || 0}
                      {" · "}
                      Visibility: {ev.visibility || "public"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </UserShell>
  );
}
