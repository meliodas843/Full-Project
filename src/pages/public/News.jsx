import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaClock } from "react-icons/fa6";
import Footer from "../../components/Footer";
import { API_BASE, getImageSrc } from "../../lib/config";
import eventFallback from "../../assets/event.png";

const categories = [
  "All",
  "DevOps",
  "Cloud",
  "AI/ML",
  "Security",
  "Frontend",
  "Data",
];

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
    const element = document.createElement("div");
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

function truncate(value, length) {
  const text = htmlToText(value);

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCategory(item) {
  if (item?.category) {
    return item.category;
  }

  const text = `${item?.title || ""} ${
    item?.body ||
    item?.content ||
    item?.description ||
    ""
  }`.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("cyber") ||
    text.includes("zero-trust") ||
    text.includes("zero trust") ||
    text.includes("аюулгүй")
  ) {
    return "Security";
  }

  if (
    text.includes("cloud") ||
    text.includes("kubernetes") ||
    text.includes("docker") ||
    text.includes("aws") ||
    text.includes("azure")
  ) {
    return "Cloud";
  }

  if (
    text.includes("ai") ||
    text.includes("llm") ||
    text.includes("machine learning") ||
    text.includes("artificial")
  ) {
    return "AI/ML";
  }

  if (
    text.includes("frontend") ||
    text.includes("react") ||
    text.includes("javascript") ||
    text.includes("typescript")
  ) {
    return "Frontend";
  }

  if (
    text.includes("data") ||
    text.includes("analytics") ||
    text.includes("database")
  ) {
    return "Data";
  }

  return "DevOps";
}

function categoryClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readingTime(value) {
  const words = htmlToText(value)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(
    3,
    Math.ceil(words / 180),
  );
}

function getBody(item) {
  return (
    item?.body ||
    item?.content ||
    item?.description ||
    ""
  );
}

function getImage(item) {
  const source =
    item?.image_url ||
    item?.image ||
    item?.cover_image;

  if (!source) {
    return eventFallback;
  }

  return getImageSrc(
    source,
    eventFallback,
  );
}

function getId(item) {
  return item?.id ?? item?._id;
}

function getAuthor(item) {
  return (
    item?.author_name ||
    item?.author ||
    item?.author_email ||
    item?.created_by_name ||
    "Khural Plus"
  );
}

function getInitials(value) {
  const text = String(value || "")
    .trim();

  if (!text) {
    return "KP";
  }

  if (text.includes("@")) {
    return text
      .slice(0, 2)
      .toUpperCase();
  }

  const words = text
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
}

export default function News() {
  const [news, setNews] = useState([]);
  const [category, setCategory] =
    useState("All");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [visible, setVisible] =
    useState(7);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/api/news`,
        );

        const data = await response
          .json()
          .catch(() => []);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Мэдээг ачаалж чадсангүй.",
          );
        }

        if (alive) {
          setNews(normalizeArray(data));
        }
      } catch (err) {
        if (alive) {
          setError(
            err?.message ||
              "Сервертэй холбогдож чадсангүй.",
          );

          setNews([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...news].sort((a, b) => {
      const first = new Date(
        a?.created_at ||
          a?.updated_at ||
          a?.date ||
          0,
      ).getTime();

      const second = new Date(
        b?.created_at ||
          b?.updated_at ||
          b?.date ||
          0,
      ).getTime();

      return second - first;
    });
  }, [news]);

  const filtered = useMemo(() => {
    if (category === "All") {
      return sorted;
    }

    return sorted.filter(
      (item) =>
        getCategory(item) === category,
    );
  }, [sorted, category]);

  const featured = filtered[0];

  const others = filtered.slice(
    1,
    visible,
  );

  return (
    <main className="riPublicPage riNewsPage">
      <section className="riNewsHero">
        <div className="riContainer">
          <span className="riNewsPill">
            МЭДЭЭ & НИЙТЛЭЛ
          </span>

          <h1>
            Сүүлийн үеийн технологийн мэдээ
          </h1>

          <p>
            Технологи, хөгжүүлэлт, кибер
            аюулгүй байдал болон IT салбарын
            сонирхолтой нийтлэлүүд.
          </p>

          <div className="riNewsTabs">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={
                  category === item
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setCategory(item);
                  setVisible(7);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="riNewsContent">
        <div className="riContainer">
          {loading && (
            <div className="riStatusBox">
              Мэдээг ачаалж байна...
            </div>
          )}

          {!loading && error && (
            <div className="riStatusBox error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            filtered.length === 0 && (
              <div className="riStatusBox">
                Мэдээ олдсонгүй.
              </div>
            )}

          {!loading &&
            !error &&
            featured && (
              <>
                <Link
                  to={`/news/${getId(
                    featured,
                  )}`}
                  className="riFeaturedNews"
                >
                  <div className="riFeaturedNewsImage">
                    <img
                      src={getImage(
                        featured,
                      )}
                      alt={
                        featured?.title ||
                        "News"
                      }
                      onError={(event) => {
                        event.currentTarget.src =
                          eventFallback;
                      }}
                    />
                  </div>

                  <div className="riFeaturedNewsContent">
                    <div className="riNewsMeta">
                      <span
                        className={`riNewsCategory ${categoryClass(
                          getCategory(
                            featured,
                          ),
                        )}`}
                      >
                        {getCategory(
                          featured,
                        )}
                      </span>

                      <span className="riNewsReadTime">
                        <FaClock />
                        {readingTime(
                          getBody(
                            featured,
                          ),
                        )}{" "}
                        мин
                      </span>
                    </div>

                    <h2>
                      {featured?.title ||
                        "Untitled"}
                    </h2>

                    <p>
                      {truncate(
                        getBody(featured),
                        280,
                      )}
                    </p>

                    <div className="riFeaturedAuthor">
                      <span>
                        {getInitials(
                          getAuthor(
                            featured,
                          ),
                        )}
                      </span>

                      <div>
                        <strong>
                          {getAuthor(
                            featured,
                          )}
                        </strong>

                        <small>
                          {formatDate(
                            featured?.created_at ||
                              featured?.date,
                          )}
                        </small>
                      </div>
                    </div>
                  </div>
                </Link>

                {others.length > 0 && (
                  <div className="riNewsGrid">
                    {others.map(
                      (item) => (
                        <Link
                          to={`/news/${getId(
                            item,
                          )}`}
                          className="riNewsCard"
                          key={getId(item)}
                        >
                          <div className="riNewsCardImage">
                            <img
                              src={getImage(
                                item,
                              )}
                              alt={
                                item?.title ||
                                "News"
                              }
                              onError={(
                                event,
                              ) => {
                                event.currentTarget.src =
                                  eventFallback;
                              }}
                            />

                            <span
                              className={categoryClass(
                                getCategory(
                                  item,
                                ),
                              )}
                            >
                              {getCategory(
                                item,
                              )}
                            </span>
                          </div>

                          <div className="riNewsCardBody">
                            <h3>
                              {item?.title ||
                                "Untitled"}
                            </h3>

                            <p>
                              {truncate(
                                getBody(
                                  item,
                                ),
                                145,
                              )}
                            </p>

                            <div className="riNewsCardFooter">
                              <span>
                                {formatDate(
                                  item?.created_at ||
                                    item?.date,
                                )}
                              </span>

                              <span>
                                <FaClock />
                                {readingTime(
                                  getBody(
                                    item,
                                  ),
                                )}{" "}
                                мин
                              </span>
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                )}

                {filtered.length >
                  visible && (
                  <div className="riNewsLoadMore">
                    <button
                      type="button"
                      onClick={() =>
                        setVisible(
                          (current) =>
                            current +
                            6,
                        )
                      }
                    >
                      Илүү ихийг үзэх
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </section>

      <Footer />
    </main>
  );
}