import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendar,
  FaCheck,
  FaClock,
  FaEye,
  FaFacebookF,
  FaLink,
  FaXTwitter,
} from "react-icons/fa6";
import Footer from "../../components/Footer";
import { API_BASE, getImageSrc } from "../../lib/config";
import eventFallback from "../../assets/event.webp";
import { sanitizeHtml } from "../../utils/safeHtml";
import { categoryClass, getCategory } from "./newsUtils";
import "./newsDetail.css";

const RELATED_COUNT = 3;

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

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function readingTime(body) {
  const words = htmlToText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getAuthor(item) {
  return item?.author_name || item?.author || item?.created_by_name || "Registra";
}

function getInitials(value) {
  const words = String(value || "").replace(/[.]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "R";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const newsId = (item) => String(item?.id ?? item?._id ?? "");

export default function NewsDetail() {
  const { id } = useParams();
  const articleRef = useRef(null);

  const [article, setArticle] = useState(null);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

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
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked; still count the view.
    }
    fetch(`${API_BASE}/api/news/${articleId}/view`, { method: "POST" }).catch(() => {});
  }, [articleId]);

  // Reading progress bar across the article body.
  useEffect(() => {
    if (!articleId) return undefined;

    const update = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 0 when the body enters the screen, 1 once its end is visible.
      const read = (window.innerHeight - rect.top) / Math.max(rect.height, 1);
      const done = Math.min(1, Math.max(0, read));
      setProgress(done * 100);
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
  }, [articleId]);

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
  const body = article.body || article.content || "<p>Мэдээлэл байхгүй.</p>";
  const views = Number(article.views || 0);
  const pageUrl = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
  const shareTitle = encodeURIComponent(article.title || "");

  return (
    <main className="riPublicPage">
      <div className="naProgress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <article className="naPage">
        <div className="naContainer">
          <nav className="naCrumbs" aria-label="Breadcrumb">
            <Link to="/news">
              <FaArrowLeft />
              Мэдээ
            </Link>
            <span>/</span>
            <span>{category}</span>
          </nav>

          <header className="naHeader">
            <span className={`naCategory ${categoryClass(category)}`}>{category}</span>
            <h1>{article.title || "Гарчиггүй"}</h1>
            {article.summary ? <p className="naLead">{article.summary}</p> : null}

            <div className="naMeta">
              <div className="naAuthor">
                <span className="naAvatar">{getInitials(author)}</span>
                <div>
                  <strong>{author}</strong>
                  <small>Нийтлэлч</small>
                </div>
              </div>

              <ul className="naFacts">
                {formatDate(article.created_at) ? (
                  <li>
                    <FaCalendar />
                    {formatDate(article.created_at)}
                  </li>
                ) : null}
                <li>
                  <FaClock />
                  {readingTime(body)} мин унших
                </li>
                {views > 0 ? (
                  <li>
                    <FaEye />
                    {views.toLocaleString("en-US")} уншсан
                  </li>
                ) : null}
              </ul>
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

          <div className="naBody" ref={articleRef}>
            <div className="naContent" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />

            <div className="naShare">
              <span>Хуваалцах</span>
              <div>
                <button type="button" onClick={copyLink} aria-label="Холбоос хуулах" title="Холбоос хуулах">
                  {copied ? <FaCheck /> : <FaLink />}
                </button>
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
                  href={`https://twitter.com/intent/tweet?url=${pageUrl}&text=${shareTitle}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X-д хуваалцах"
                  title="X"
                >
                  <FaXTwitter />
                </a>
              </div>
              {copied ? <em>Холбоос хуулагдлаа</em> : null}
            </div>

            <section className="naCta">
              <div>
                <h3>Холбоотой эвэнтэд оролцох</h3>
                <p>Энэ сэдэвтэй холбоотой эвэнтүүдтэй танилцаж, өөрийн оролцох арга хэмжээг сонгоорой.</p>
              </div>
              <Link to="/events" className="riPrimaryButton">
                Эвэнтүүд үзэх
                <FaArrowRight />
              </Link>
            </section>
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
