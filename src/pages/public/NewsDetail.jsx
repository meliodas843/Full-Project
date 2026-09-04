import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaClock,
} from "react-icons/fa6";
import Footer from "../../components/Footer";
import {
  API_BASE,
  getImageSrc,
} from "../../lib/config";
import eventFallback from "../../assets/event.png";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.news)) return data.news;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function htmlToText(value) {
  const html = String(value || "");

  if (typeof document !== "undefined") {
    const element =
      document.createElement("div");

    element.innerHTML = html;

    return String(
      element.textContent ||
        element.innerText ||
        "",
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "mn-MN",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
}

function readingTime(body) {
  const words = htmlToText(body)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(
    3,
    Math.ceil(words / 180),
  );
}

function getCategory(item) {
  const text =
    `${item?.title || ""} ${
      item?.body || ""
    }`.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("cyber") ||
    text.includes("аюулгүй")
  ) {
    return "Security";
  }

  if (
    text.includes("cloud") ||
    text.includes("kubernetes")
  ) {
    return "Cloud";
  }

  if (
    text.includes("ai") ||
    text.includes("machine") ||
    text.includes("llm")
  ) {
    return "AI/ML";
  }

  if (
    text.includes("frontend") ||
    text.includes("react") ||
    text.includes("javascript")
  ) {
    return "Frontend";
  }

  if (text.includes("data")) {
    return "Data";
  }

  return "DevOps";
}

function getAuthor(item) {
  return (
    item?.author_name ||
    item?.author ||
    item?.author_email ||
    item?.created_by_name ||
    item?.created_by?.name ||
    "Khural Plus"
  );
}

function getInitials(value) {
  const name = String(value || "")
    .trim();

  if (!name) return "KP";

  if (name.includes("@")) {
    return name
      .slice(0, 2)
      .toUpperCase();
  }

  const words = name
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`
    .toUpperCase();
}

export default function NewsDetail() {
  const { id } = useParams();

  const [article, setArticle] =
    useState(null);

  const [allNews, setAllNews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let alive = true;

    async function loadArticle() {
      try {
        setLoading(true);
        setError("");

        const listResponse =
          await fetch(
            `${API_BASE}/api/news`,
          );

        const listData =
          await listResponse
            .json()
            .catch(() => []);

        if (!listResponse.ok) {
          throw new Error(
            listData?.message ||
              "Мэдээг ачаалж чадсангүй.",
          );
        }

        const list =
          normalizeArray(listData);

        const found = list.find(
          (item) =>
            String(
              item.id ?? item._id,
            ) === String(id),
        );

        if (alive) {
          setAllNews(list);
          setArticle(found || null);

          if (!found) {
            setError(
              "Мэдээ олдсонгүй.",
            );
          }
        }
      } catch (err) {
        if (alive) {
          setError(
            err.message ||
              "Сервертэй холбогдож чадсангүй.",
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadArticle();

    return () => {
      alive = false;
    };
  }, [id]);

  const related = useMemo(() => {
    if (!article) return null;

    const currentCategory =
      getCategory(article);

    return allNews.find(
      (item) =>
        String(
          item.id ?? item._id,
        ) !==
          String(
            article.id ??
              article._id,
          ) &&
        getCategory(item) ===
          currentCategory,
    );
  }, [article, allNews]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [id]);

  if (loading) {
    return (
      <main className="riPublicPage">
        <div className="riNewsDetailLoading">
          Мэдээг ачаалж байна...
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="riPublicPage">
        <section className="riNewsDetailNotFound">
          <h1>
            {error ||
              "Мэдээ олдсонгүй."}
          </h1>

          <Link
            to="/news"
            className="riPrimaryButton"
          >
            <FaArrowLeft />
            Мэдээ рүү буцах
          </Link>
        </section>

        <Footer />
      </main>
    );
  }

  const author =
    getAuthor(article);

  const body =
    article.body ||
    article.content ||
    "<p>Мэдээлэл байхгүй.</p>";

  const image =
    article.image_url
      ? getImageSrc(
          article.image_url,
          eventFallback,
        )
      : eventFallback;

  return (
    <main className="riPublicPage">
      <article className="riNewsDetailPage">
        <div className="riNewsDetailContainer">
          <Link
            to="/news"
            className="riNewsBack"
          >
            <FaArrowLeft />
            Мэдээ рүү буцах
          </Link>

          <header className="riNewsDetailHeader">
            <span className="riNewsDetailCategory">
              {getCategory(article)}
            </span>

            <h1>
              {article.title ||
                "Untitled"}
            </h1>

            <div className="riNewsDetailMeta">
              <div className="riNewsDetailAuthor">
                <span>
                  {getInitials(author)}
                </span>

                <div>
                  <strong>
                    {author}
                  </strong>

                  <small>
                    {article.author_role ||
                      "Khural Plus"}
                  </small>
                </div>
              </div>

              <span className="riNewsMetaDivider" />

              <span>
                {formatDate(
                  article.created_at,
                )}
              </span>

              <span>·</span>

              <span className="riNewsReadTime">
                <FaClock />
                {readingTime(body)} мин
                унших
              </span>
            </div>
          </header>

          <div className="riNewsDetailHero">
            <img
              src={image}
              alt={article.title}
              onError={(e) => {
                e.currentTarget.src =
                  eventFallback;
              }}
            />
          </div>

          <div className="riNewsDetailArticle">
            <div
              className="riNewsDetailContent"
              dangerouslySetInnerHTML={{
                __html: body,
              }}
            />

            <div className="riNewsRelatedBox">
              <h3>
                Холбоотой эвэнтэд
                оролцох
              </h3>

              <p>
                Энэ сэдэвтэй холбоотой
                эвэнтүүдтэй танилцаж,
                өөрийн оролцох арга
                хэмжээг сонгоорой.
              </p>

              <Link
                to="/events"
                className="riPrimaryButton"
              >
                Эвэнтүүд үзэх
                <FaArrowRight />
              </Link>
            </div>

            {related && (
              <Link
                to={`/news/${
                  related.id ??
                  related._id
                }`}
                className="riNextArticle"
              >
                <div>
                  <small>
                    ДАРААГИЙН МЭДЭЭ
                  </small>

                  <strong>
                    {related.title}
                  </strong>
                </div>

                <FaArrowRight />
              </Link>
            )}
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}