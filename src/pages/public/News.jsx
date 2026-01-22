import { useEffect, useState } from "react";

export default function News() {
  const [news, setNews] = useState([]);
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/news");
        const data = await res.json();

        if (!res.ok) {
          setMsg(data.message || "Failed to load news");
          return;
        }

        // ✅ backend returns an array, not { news: [...] }
        setNews(Array.isArray(data) ? data : []);
        setMsg("");
      } catch (err) {
        console.error(err);
        setMsg("Server error loading news");
      }
    };

    load();
  }, []);

  return (
    <div className="page">
      <h2>News</h2>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {news.map((n) => (
          <div
            key={n.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ margin: 0 }}>{n.title}</h3>
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
              </span>
            </div>

            {n.image_url && (
              <img
                src={n.image_url}
                alt={n.title}
                style={{
                  marginTop: 12,
                  width: "100%",
                  maxHeight: 280,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
              />
            )}

            <p style={{ marginTop: 12, color: "#334155", lineHeight: 1.6 }}>
              {n.body}
            </p>

            <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
              Posted by: {n.author_email || "Unknown"}
            </div>
          </div>
        ))}

        {!msg && news.length === 0 && <p>No news yet.</p>}
      </div>
    </div>
  );
}
