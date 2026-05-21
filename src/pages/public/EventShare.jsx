import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/config";

function resolveImageSrc(url) {
  const u = String(url || "").trim();

  if (!u) return "https://via.placeholder.com/1200x630";

  if (u.startsWith("http")) return u;

  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

export default function EventShare() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/events/${id}`);
        const data = await res.json();

        setEvent(data);

        const image = resolveImageSrc(data?.image_url);

        document.title = data?.title || "Event";

        function setMeta(property, content) {
          let el = document.querySelector(
            `meta[property="${property}"]`
          );

          if (!el) {
            el = document.createElement("meta");
            el.setAttribute("property", property);
            document.head.appendChild(el);
          }

          el.setAttribute("content", content || "");
        }

        setMeta("og:title", data?.title);
        setMeta("og:description", data?.description);
        setMeta("og:image", image);
        setMeta("og:url", window.location.href);
        setMeta("og:type", "website");

      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, [id]);

  if (!event) {
    return (
      <div className="sharePageLoading">
        Loading...
      </div>
    );
  }

  return (
    <div className="sharePage">
      <div className="shareCard">
        <img
          src={resolveImageSrc(event.image_url)}
          alt={event.title}
          className="shareImage"
        />

        <div className="shareBody">
          <h1>{event.title}</h1>

          <p>
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
}