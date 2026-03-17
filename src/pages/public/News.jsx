import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE } from "@/lib/config";

const API = API_BASE;

function safeText(s) {
  return String(s || "").trim();
}

function truncate(text, max = 220) {
  const t = safeText(text);
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

function htmlToText(html) {
  const s = String(html || "");
  if (typeof window !== "undefined" && window.DOMParser) {
    const doc = new DOMParser().parseFromString(s, "text/html");
    const text = doc.body?.textContent || "";
    return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImageSrc(image_url) {
  const u = safeText(image_url);
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const normalized = u.startsWith("/") ? u : `/${u}`;
  return `${API}${normalized}`;
}

function formatDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

/* =========================
   MODAL (Portal)
========================= */
function NewsModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const modal = (
    <div className="newsModalBackdrop" onClick={onClose} role="presentation">
      <div
        className="newsModalCard"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="newsModalClose" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>

        <div className="newsModalInner">
          <div className="newsModalMedia">
            {getImageSrc(item.image_url) ? (
              <img
                className="newsModalImg"
                src={getImageSrc(item.image_url)}
                alt={safeText(item.title) || "News image"}
              />
            ) : (
              <div className="newsModalImg newsModalImgPlaceholder">No image</div>
            )}
          </div>

          <div className="newsModalBody">
            <div className="newsModalMeta">
              {item.created_at && <span className="newsMetaPill">{formatDate(item.created_at)}</span>}
              {item.author_email && <span className="newsMetaPill">{item.author_email}</span>}
            </div>

            <h2 className="newsModalTitle">{safeText(item.title) || "Untitled"}</h2>

            <div className="newsModalText" dangerouslySetInnerHTML={{ __html: item.body || "" }} />
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

export default function News() {
  const [news, setNews] = useState([]);
  const [msg, setMsg] = useState("Loading...");
  const [active, setActive] = useState(0);
  const [sortOrder, setSortOrder] = useState("new")
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setMsg("Loading...");
      const res = await fetch(`${API}/api/news`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMsg((data && data.message) || "Failed to load news");
        return;
      }

      const arr = Array.isArray(data) ? data : [];
      setNews(arr);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Server error loading news");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedNews = useMemo(() => {
    const copy = [...news];
    copy.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "new" ? tb - ta : ta - tb;
    });
    return copy;
  }, [news, sortOrder]);

  const special = useMemo(() => sortedNews.slice(0, 5), [sortedNews]);
  const latest = useMemo(() => sortedNews.slice(0, 4), [sortedNews]);
  const rest = useMemo(() => sortedNews.slice(4), [sortedNews]);

  useEffect(() => {
    if (special.length <= 1) return;
    const t = setInterval(() => setActive((p) => (p + 1) % special.length), 5500);
    return () => clearInterval(t);
  }, [special.length]);

  const onPrev = () => special.length && setActive((p) => (p - 1 + special.length) % special.length);
  const onNext = () => special.length && setActive((p) => (p + 1) % special.length);

  useEffect(() => {
    if (!showMore) return;
    const t = setTimeout(() => {
      moreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(t);
  }, [showMore]);

  const isEmpty = !msg && sortedNews.length === 0;

  return (
    <div className="newsWrap">
      <div className="newsPageBg">
        <div className="newsHeaderRow">
          <div className="newsHeader">
            <h1 className="newsTitle">News</h1>
            <p className="newsSub">Latest updates and announcements</p>
          </div>

          <div className="newsActions">
            <div className="newsSelectWrap">
              <select className="newsSelect" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {msg && <div className="newsMsg">{msg}</div>}
        {isEmpty && <div className="newsEmptyBox">No news available.</div>}

        {!msg && special.length > 0 && (
          <section className="special">
            <div className="special-top">
              <h2 className="section-title">Special News</h2>
              <div className="special-controls">
                <button className="special-btn" onClick={onPrev} type="button" aria-label="Previous">‹</button>
                <button className="special-btn" onClick={onNext} type="button" aria-label="Next">›</button>
              </div>
            </div>

            <div className="special-card">
              <div className="special-track" style={{ transform: `translateX(-${active * 100}%)` }}>
                {special.map((item, i) => (
                  <div className="special-slide" key={item.id}>
                    <div className={`special-grid ${i % 2 === 0 ? "img-left" : "img-right"}`}>
                      <div className="special-media">
                        {getImageSrc(item.image_url) ? (
                          <img src={getImageSrc(item.image_url)} alt={item.title} className="special-img" />
                        ) : (
                          <div className="special-img placeholder">No image</div>
                        )}
                      </div>

                      <div className="special-content">
                        <div className="special-meta">
                          <span>{formatDate(item.created_at)}</span>
                          <span>{item.author_email || ""}</span>
                        </div>

                        <h3 className="special-title">{safeText(item.title) || "Untitled"}</h3>
                        <p className="special-body">{truncate(htmlToText(item.body), 260)}</p>

                        <button className="special-read" onClick={() => setSelected(item)} type="button">
                          Read more
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="special-glow" />
            </div>
          </section>
        )}

        {!msg && sortedNews.length > 0 && (
          <section className="latest">
            <div className="latest-top">
              <h2 className="section-title">Latest</h2>
            </div>

            <div className="latest-grid">
              {latest.map((n) => (
                <article className="news-card" key={n.id}>
                  {getImageSrc(n.image_url) ? (
                    <img className="news-card-img" src={getImageSrc(n.image_url)} alt={n.title} />
                  ) : (
                    <div className="news-card-img placeholder">No image</div>
                  )}

                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                      <span>{n.author_email || ""}</span>
                    </div>

                    <h3 className="news-card-title">{safeText(n.title) || "Untitled"}</h3>
                    <p className="news-card-text">{truncate(htmlToText(n.body), 120)}</p>

                    <button className="news-card-link" type="button" onClick={() => setSelected(n)}>
                      Read →
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {rest.length > 0 && (
              <div className="latest-footer">
                <button className="news-more" type="button" onClick={() => setShowMore((v) => !v)}>
                  {showMore ? "Hide" : "See more news"}
                </button>
              </div>
            )}
          </section>
        )}

        {!msg && showMore && rest.length > 0 && (
          <section className="latest" ref={moreRef}>
            <div className="latest-top">
              <h2 className="section-title">More News</h2>
            </div>

            <div className="latest-grid">
              {rest.map((n) => (
                <article className="news-card" key={n.id}>
                  {getImageSrc(n.image_url) ? (
                    <img className="news-card-img" src={getImageSrc(n.image_url)} alt={n.title} />
                  ) : (
                    <div className="news-card-img placeholder">No image</div>
                  )}

                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                      <span>{n.author_email || ""}</span>
                    </div>

                    <h3 className="news-card-title">{safeText(n.title) || "Untitled"}</h3>
                    <p className="news-card-text">{truncate(htmlToText(n.body), 120)}</p>

                    <button className="news-card-link" type="button" onClick={() => setSelected(n)}>
                      Read →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
      {selected && <NewsModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
