import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendar,
  FaCheck,
  FaChevronLeft,
  FaClock,
  FaEnvelope,
  FaEye,
  FaFacebookF,
  FaHeart,
  FaLink,
  FaLinkedinIn,
  FaRegHeart,
} from "react-icons/fa6";
import Footer from "../../components/Footer";
import { API_BASE, getImageSrc } from "../../lib/config";
import eventFallback from "../../assets/event.webp";
import { sanitizeHtml } from "../../utils/safeHtml";
import { categoryClass, getCategory } from "./newsUtils";
import "./newsDetail.css";

const RELATED_COUNT = 3;
const FONT_SIZES = ["sm", "md", "lg"];
const FONT_KEY = "news-font-size";
const likedKey = (id) => `news-liked-${id}`;

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.news)) return data.news;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const pad = (n) => String(n).padStart(2, "0");

function toDate(value) {
  if (!value) return null;
  const date = new Date(typeof value === "string" ? value.replace(" ", "T") : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  return date ? `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}` : "";
}

function formatDateTime(value) {
  const date = toDate(value);
  return date ? `${formatDate(date)} · ${pad(date.getHours())}:${pad(date.getMinutes())}` : "";
}

function readingTime(body) {
  const words = htmlToText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getAuthor(item) {
  return item?.author_name || item?.author || item?.created_by_name || "Registra";
}

const newsId = (item) => String(item?.id ?? item?._id ?? "");

function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the page still works without it.
  }
}

// Gives every <h2> an id and returns the list for the table of contents.
function withSections(html) {
  const clean = sanitizeHtml(html);
  if (typeof DOMParser === "undefined") return { html: clean, sections: [] };

  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
  const sections = [];
  doc.querySelectorAll("h2").forEach((heading, index) => {
    const title = heading.textContent.trim();
    if (!title) return;
    heading.id = `section-${index + 1}`;
    sections.push({ id: heading.id, title });
  });
  return { html: doc.body.firstChild.innerHTML, sections };
}

export default function NewsDetail() {
  const { id } = useParams();
  const bodyRef = useRef(null);

  const [article, setArticle] = useState(null);
  const [allNews, setAllNews] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = readStorage(localStorage, FONT_KEY);
    return FONT_SIZES.includes(saved) ? saved : "md";
  });
  const [email, setEmail] = useState("");
  const [subscribe, setSubscribe] = useState({ state: "idle", message: "" });

  useEffect(() => {
    let alive = true;

    async function loadArticle() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE}/api/news`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.message || "Мэдээг ачаалж чадсангүй.");
        }

        const list = normalizeArray(data);
        const found = list.find((item) => newsId(item) === String(id));

        if (alive) {
          setAllNews(list);
          setArticle(found || null);
          setLikes(Number(found?.likes || 0));
          setLiked(Boolean(found && readStorage(localStorage, likedKey(newsId(found)))));
          if (!found) setError("Мэдээ олдсонгүй.");
        }
      } catch (err) {
        if (alive) setError(err.message || "Сервертэй холбогдож чадсангүй.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadArticle();

    return () => {
      alive = false;
    };
  }, [id]);

  // The next public event with free seats, for the sidebar card.
  useEffect(() => {
    let alive = true;

    fetch(`${API_BASE}/api/events`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!alive) return;
        const now = Date.now();
        const upcoming = normalizeArray(data)
          .filter((e) => (toDate(e.start_time)?.getTime() || 0) > now)
          .sort((a, b) => toDate(a.start_time) - toDate(b.start_time));
        setEvent(upcoming[0] || null);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // The public layout scrolls <body>, not the window, so reset both.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.body.scrollTo?.({ top: 0, behavior: "instant" });
  }, [id]);

  // Count one view per article per browser session.
  const articleId = newsId(article);

  useEffect(() => {
    if (!articleId) return;
    const key = `news-viewed-${articleId}`;
    if (readStorage(sessionStorage, key)) return;
    writeStorage(sessionStorage, key, "1");
    fetch(`${API_BASE}/api/news/${articleId}/view`, { method: "POST" }).catch(() => {});
  }, [articleId]);

  const content = useMemo(
    () => withSections(article?.body || article?.content || "<p>Мэдээлэл байхгүй.</p>"),
    [article],
  );

  // Reading progress and the current table-of-contents section.
  useEffect(() => {
    if (!articleId) return undefined;

    const update = () => {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 0 when the body enters the screen, 1 once its end is visible.
      const read = (window.innerHeight - rect.top) / Math.max(rect.height, 1);
      setProgress(Math.min(1, Math.max(0, read)) * 100);

      let current = "";
      for (const section of content.sections) {
        const heading = document.getElementById(section.id);
        if (heading && heading.getBoundingClientRect().top < 140) current = section.id;
      }
      setActiveSection(current);
    };

    // Capture catches scrolling on <body> as well as on the window.
    const options = { capture: true, passive: true };
    update();
    document.addEventListener("scroll", update, options);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, options);
      window.removeEventListener("resize", update);
    };
  }, [articleId, content]);

  const related = useMemo(() => {
    if (!article) return [];
    const category = getCategory(article);
    const others = allNews.filter((item) => newsId(item) !== articleId);
    const same = others.filter((item) => getCategory(item) === category);
    const rest = others.filter((item) => getCategory(item) !== category);
    return [...same, ...rest].slice(0, RELATED_COUNT);
  }, [article, allNews, articleId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    writeStorage(localStorage, likedKey(articleId), next ? "1" : null);

    try {
      const response = await fetch(`${API_BASE}/api/news/${articleId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: next }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && Number.isFinite(data?.likes)) setLikes(data.likes);
    } catch {
      // Keep the optimistic count; it corrects itself on the next visit.
    }
  }

  function changeFontSize(size) {
    setFontSize(size);
    writeStorage(localStorage, FONT_KEY, size);
  }

  function goToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitNewsletter(e) {
    e.preventDefault();
    setSubscribe({ state: "busy", message: "" });
    try {
      const response = await fetch(`${API_BASE}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Бүртгэж чадсангүй.");
      setEmail("");
      setSubscribe({ state: "done", message: "Баярлалаа! Та бүртгэгдлээ." });
    } catch (err) {
      setSubscribe({ state: "error", message: err.message });
    }
  }

  if (loading) {
    return (
      <main className="riPublicPage">
        <div className="naState">Мэдээг ачаалж байна...</div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="riPublicPage">
        <section className="naState">
          <h1>{error || "Мэдээ олдсонгүй."}</h1>
          <Link to="/news" className="riPrimaryButton">
            <FaArrowLeft />
            Мэдээ рүү буцах
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const author = getAuthor(article);
  const category = getCategory(article);
  const views = Number(article.views || 0);
  const pageUrl = encodeURIComponent(window.location.href);
  const passedIndex = content.sections.findIndex((s) => s.id === activeSection);

  const shareLinks = (
    <>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook-т хуваалцах"
        title="Facebook"
      >
        <FaFacebookF />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`}
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn-д хуваалцах"
        title="LinkedIn"
      >
        <FaLinkedinIn />
      </a>
      <button type="button" onClick={copyLink} aria-label="Холбоос хуулах" title={copied ? "Хуулагдлаа" : "Холбоос хуулах"}>
        {copied ? <FaCheck /> : <FaLink />}
      </button>
    </>
  );

  const seats = Number(event?.max_participants || 0);
  const booked = Number(event?.booked_count || 0);

  return (
    <main className="riPublicPage">
      <div className="naProgress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <article className="naPage">
        <div className="naContainer">
          <nav className="naCrumbs" aria-label="Breadcrumb">
            <Link to="/news" className="naBack">
              <FaChevronLeft />
              Мэдээ руу буцах
            </Link>
            <span className="naCrumbSep" />
            <Link to="/news">Мэдээ</Link>
            <span>/</span>
            <span>{category}</span>
          </nav>

          <header className="naHeader">
            <div className="naTags">
              <span className={`naCategory ${categoryClass(category)}`}>{category}</span>
              <span>
                <FaClock />
                {readingTime(article.body)} мин унших
              </span>
              {views > 0 ? (
                <span>
                  <FaEye />
                  {views.toLocaleString("en-US")} үзсэн
                </span>
              ) : null}
            </div>

            <h1>{article.title || "Гарчиггүй"}</h1>

            <div className="naLeadRow">
              <div>
                {article.summary ? <p className="naLead">{article.summary}</p> : null}
                <div className="naByline">
                  <strong>{author}</strong>
                  {formatDate(article.created_at) ? <span>{formatDate(article.created_at)}</span> : null}
                </div>
              </div>
              <div className="naShareInline">
                <span>Хуваалцах</span>
                {shareLinks}
              </div>
            </div>
          </header>

          {article.image_url ? (
            <figure className="naHero">
              <img
                src={getImageSrc(article.image_url, eventFallback)}
                alt={article.title}
                onError={(e) => {
                  e.currentTarget.src = eventFallback;
                }}
              />
            </figure>
          ) : null}

          <div className="naLayout">
            <aside className="naRail" aria-label="Үйлдэл">
              <button
                type="button"
                className={`naLike${liked ? " on" : ""}`}
                onClick={toggleLike}
                aria-pressed={liked}
                aria-label={liked ? "Таалагдсанаа болих" : "Таалагдлаа"}
              >
                {liked ? <FaHeart /> : <FaRegHeart />}
                <small>{likes}</small>
              </button>
              <i />
              {shareLinks}
            </aside>

            <div className="naBody" ref={bodyRef}>
              <div
                className={`naContent size-${fontSize}`}
                dangerouslySetInnerHTML={{ __html: content.html }}
              />
            </div>

            <aside className="naSidebar">
              {content.sections.length ? (
                <section className="naPanel naToc">
                  <div className="naPanelHead">
                    <span>Энэ нийтлэлд</span>
                    <strong>{Math.round(progress)}%</strong>
                  </div>
                  <ol>
                    {content.sections.map((section, index) => (
                      <li
                        key={section.id}
                        className={`${section.id === activeSection ? "active" : ""}${index < passedIndex ? " passed" : ""}`}
                      >
                        <button type="button" onClick={() => goToSection(section.id)}>
                          <em>{index < passedIndex ? <FaCheck /> : pad(index + 1)}</em>
                          <span>{section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <div className="naFontRow">
                    <span>Текстийн хэмжээ</span>
                    <div role="group" aria-label="Текстийн хэмжээ">
                      {FONT_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`${size}${fontSize === size ? " active" : ""}`}
                          onClick={() => changeFontSize(size)}
                          aria-pressed={fontSize === size}
                        >
                          A
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {event ? (
                <section className="naPanel naEvent">
                  <div className="naEventImage">
                    <img
                      src={event.image_url ? getImageSrc(event.image_url, eventFallback) : eventFallback}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = eventFallback;
                      }}
                    />
                    <span>Удахгүй болох эвэнт</span>
                  </div>
                  <div className="naEventBody">
                    <strong>{event.title}</strong>
                    <small>
                      <FaCalendar />
                      {formatDateTime(event.start_time)}
                    </small>
                    {seats ? (
                      <div className="naSeats">
                        <div>
                          <i style={{ width: `${Math.min(100, (booked / seats) * 100)}%` }} />
                        </div>
                        <span>
                          {booked} / {seats}
                        </span>
                      </div>
                    ) : null}
                    <Link to={`/events/${event.id}`} className="naEventButton">
                      Эвэнтэд нэгдэх
                      <FaArrowRight />
                    </Link>
                  </div>
                </section>
              ) : null}

              <section className="naPanel naNewsletter">
                <span className="naNewsletterIcon">
                  <FaEnvelope />
                </span>
                <strong>Долоо хоног бүрийн тойм</strong>
                <p>Шилдэг мэдээ, удахгүй болох эвэнтүүдийг и-мэйлээр аваарай.</p>
                {subscribe.state === "done" ? (
                  <div className="naNewsletterDone">
                    <FaCheck />
                    {subscribe.message}
                  </div>
                ) : (
                  <form onSubmit={submitNewsletter}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tani@email.mn"
                      aria-label="И-мэйл хаяг"
                    />
                    <button type="submit" disabled={subscribe.state === "busy"}>
                      {subscribe.state === "busy" ? "Илгээж байна..." : "Бүртгүүлэх"}
                    </button>
                    {subscribe.state === "error" ? <em>{subscribe.message}</em> : null}
                  </form>
                )}
              </section>
            </aside>
          </div>

          {related.length ? (
            <section className="naRelated">
              <div className="naRelatedHead">
                <h2>Холбоотой мэдээ</h2>
                <Link to="/news">
                  Бүх мэдээ
                  <FaArrowRight />
                </Link>
              </div>

              <div className="naRelatedGrid">
                {related.map((item) => {
                  const itemCategory = getCategory(item);
                  return (
                    <Link key={newsId(item)} to={`/news/${newsId(item)}`} className="naCard">
                      <div className="naCardImage">
                        <img
                          src={item.image_url ? getImageSrc(item.image_url, eventFallback) : eventFallback}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = eventFallback;
                          }}
                        />
                      </div>
                      <div className="naCardBody">
                        <span className={`naCategory ${categoryClass(itemCategory)}`}>{itemCategory}</span>
                        <strong>{item.title}</strong>
                        <small>
                          {formatDate(item.created_at)} · {readingTime(item.body)} мин
                        </small>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </article>

      <Footer />
    </main>
  );
}
