import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { CompanyCover, CompanyLogo } from "../components/IdentityImage";

import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiGlobe,
  FiMapPin,
  FiPhone,
  FiShare2,
  FiUsers,
} from "react-icons/fi";

import UserShell from "../components/UserShell";
import Footer from "../../../components/Footer";
import { API_BASE } from "../../../lib/config";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("adminToken") ||
    ""
  );
}

function resolveUrl(value) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(11, 16);
  }

  return date.toLocaleTimeString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function normalizeCategories(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeOrganization(item) {
  const categories = normalizeCategories(
    item?.categories || item?.category || item?.industry,
  );

  return {
    ...item,

    id:
      item?.id ??
      item?.organization_id ??
      item?.org_id,

    name:
      item?.name ||
      item?.organization_name ||
      item?.company_name ||
      "Байгууллага",

    category:
      item?.category ||
      item?.industry ||
      categories[0] ||
      "Байгууллага",

    categories,

    description:
      item?.description ||
      item?.about ||
      item?.bio ||
      "Байгууллагын танилцуулга оруулаагүй байна.",

    logo:
      item?.logo_url ||
      item?.logo ||
      item?.image_url ||
      item?.image ||
      "",

    cover:
      item?.cover_url ||
      item?.cover_image ||
      item?.banner_url ||
      item?.banner ||
      "",

    verified: Boolean(
      item?.verified ??
        item?.is_verified ??
        item?.verification_status === "verified",
    ),

    following: Boolean(
      item?.following ??
        item?.is_following ??
        item?.followed,
    ),

    followers:
      Number(
        item?.followers_count ??
          item?.follower_count ??
          item?.followers ??
          0,
      ) || 0,

    website:
      item?.website ||
      item?.website_url ||
      "",

    phone:
      item?.phone ||
      item?.organization_phone ||
      "",

    address:
      item?.address ||
      item?.location ||
      item?.city ||
      "",
  };
}

function normalizeEvent(item) {
  return {
    ...item,

    id:
      item?.id ??
      item?.event_id,

    title:
      item?.title ||
      item?.name ||
      "Эвэнт",

    badge:
      item?.badge ||
      item?.category ||
      item?.event_type ||
      "Эвэнт",

    image:
      item?.image_url ||
      item?.image ||
      item?.cover_image ||
      item?.cover ||
      "",

    start:
      item?.start_time ||
      item?.start_at ||
      item?.date ||
      "",

    end:
      item?.end_time ||
      item?.end_at ||
      "",

    location:
      item?.location ||
      item?.venue ||
      item?.address ||
      "",

    participants:
      Number(
        item?.participants_count ??
          item?.bookings_count ??
          item?.registered_count ??
          0,
      ) || 0,
  };
}

async function fetchJson(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,

    headers: {
      Accept: "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `HTTP ${response.status}`,
    );
  }

  return data;
}

export default function OrganizationDetail() {
  const { id } = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState("");

  const isUserView =
    location.pathname.startsWith("/user/");

  const isLoggedIn = Boolean(getToken());

  const backPath = isUserView
    ? "/user/organizations"
    : "/organization";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setOrganization(null);
        setEvents([]);
        setError("Байгууллагын ID олдсонгүй.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const organizationData = await fetchJson(
          `${API_BASE}/api/organizations/${id}`,
        );

        const rawOrganization =
          organizationData?.organization ||
          organizationData?.data ||
          organizationData;

        if (!rawOrganization) {
          throw new Error(
            "Байгууллагын мэдээлэл олдсонгүй.",
          );
        }

        if (!cancelled) {
          setOrganization(
            normalizeOrganization(rawOrganization),
          );
        }

        let eventRows = [];

        const eventEndpoints = [
          `${API_BASE}/api/organizations/${id}/events`,
          `${API_BASE}/api/events?organization_id=${encodeURIComponent(id)}`,
        ];

        for (const endpoint of eventEndpoints) {
          try {
            const eventData = await fetchJson(endpoint);

            eventRows = Array.isArray(eventData)
              ? eventData
              : eventData?.events ||
                eventData?.data ||
                eventData?.items ||
                [];

            break;
          } catch {
            eventRows = [];
          }
        }

        if (!cancelled) {
          setEvents(
            eventRows.map(normalizeEvent),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setOrganization(null);

          setError(
            err?.message ||
              "Байгууллагын мэдээлэл ачаалж чадсангүй.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const activeEvents = useMemo(() => {
    const now = Date.now();

    return events.filter((event) => {
      const value =
        event.end ||
        event.start;

      if (!value) {
        return true;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return true;
      }

      return date.getTime() >= now;
    });
  }, [events]);

  const finishedEvents = useMemo(() => {
    const now = Date.now();

    return events.filter((event) => {
      const value =
        event.end ||
        event.start;

      if (!value) {
        return false;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date.getTime() < now;
    });
  }, [events]);

  async function toggleFollow() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        state: {
          from: location.pathname,
        },
      });

      return;
    }

    if (!organization || followBusy) {
      return;
    }

    setFollowBusy(true);
    setError("");

    const nextFollowing =
      !organization.following;

    try {
      const result = await fetchJson(
        `${API_BASE}/api/organizations/${organization.id}/follow`,
        {
          method: nextFollowing
            ? "POST"
            : "DELETE",
        },
      );

      setOrganization((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          following: nextFollowing,

          followers: Number.isFinite(
            Number(result?.followers),
          )
            ? Number(result.followers)
            : Math.max(
                0,
                current.followers +
                  (nextFollowing ? 1 : -1),
              ),
        };
      });
    } catch (err) {
      setError(
        err?.message ||
          "Үйлдэл амжилтгүй боллоо.",
      );
    } finally {
      setFollowBusy(false);
    }
  }

  async function handleShare() {
    const shareData = {
      title:
        organization?.name ||
        "Registra",

      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard?.writeText(
        window.location.href,
      );
    } catch {
      return;
    }
  }

  function renderPage(content) {
    if (isUserView && isLoggedIn) {
      return (
        <UserShell>
          {content}
        </UserShell>
      );
    }

    return (
      <>
        {content}
        <Footer />
      </>
    );
  }

  if (loading) {
    return renderPage(
      <main className="orgDetailPage">
        <div className="orgDetailState">
          <div className="orgDetailLoader" />

          <strong>
            Байгууллагын мэдээллийг ачаалж байна
          </strong>

          <span>
            Түр хүлээнэ үү...
          </span>
        </div>
      </main>,
    );
  }

  if (!organization) {
    return renderPage(
      <main className="orgDetailPage">
        <div className="orgDetailState">
          <strong>
            Байгууллага олдсонгүй
          </strong>

          <span>
            {error ||
              "Байгууллагын мэдээлэл байхгүй байна."}
          </span>

          <Link
            to={backPath}
            className="orgDetailStateButton"
          >
            <FiArrowLeft />

            Байгууллагууд руу буцах
          </Link>
        </div>
      </main>,
    );
  }

  const page = (
    <main className="orgDetailPage">
      <div className="orgDetailContent">
        <div className="orgDetailTopRow">
          <Link
            className="orgDetailBack"
            to={backPath}
          >
            <FiArrowLeft />

            <span>
              Байгууллагууд руу буцах
            </span>
          </Link>
        </div>

        <section className="orgDetailHero">
          <div className="orgDetailCover">
            <CompanyCover
              name={organization.name}
              src={organization.cover}
              apiBase={API_BASE}
            />

            <div className="orgDetailCoverOverlay" />
          </div>

          <div className="orgDetailIdentity">
            <CompanyLogo
              name={organization.name}
              src={organization.logo}
              apiBase={API_BASE}
              size={104}
              className="orgDetailLogo"
            />

            <div className="orgDetailIdentityText">
              <div className="orgDetailNameRow">
                <h1>
                  {organization.name}
                </h1>

                {organization.verified && (
                  <span className="orgVerified">
                    <FiCheck />

                    Баталгаажсан
                  </span>
                )}
              </div>

              <div className="orgDetailCategory">
                <span>
                  {organization.category}
                </span>

                {organization.address && (
                  <>
                    <i />

                    <span>
                      {organization.address}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="orgDetailActions">
              <button
                type="button"
                className={`orgFollowButton ${
                  organization.following
                    ? "following"
                    : ""
                }`}
                disabled={followBusy}
                onClick={toggleFollow}
              >
                {followBusy
                  ? "..."
                  : organization.following
                    ? "✓ Дагаж байна"
                    : "+ Дагах"}
              </button>

              <button
                type="button"
                className="orgShareButton"
                onClick={handleShare}
              >
                <FiShare2 />

                Хуваалцах
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="orgDetailError">
            {error}
          </div>
        )}

        <div className="orgDetailLayout">
          <div className="orgDetailMain">
            <section className="orgDetailSection">
              <h2>
                Танилцуулга
              </h2>

              <p className="orgDetailDescription">
                {organization.description}
              </p>
            </section>

            <section className="orgDetailSection">
              <div className="orgEventsHeading">
                <h2>
                  Зарласан эвэнтүүд
                </h2>

                <div className="orgEventCounters">
                  <span>
                    Удахгүй · {activeEvents.length}
                  </span>

                  <span>
                    Өнгөрсөн · {finishedEvents.length}
                  </span>
                </div>
              </div>

              <div className="orgEventsGrid">
                {activeEvents.length > 0 ? (
                  activeEvents.map((event) => (
                    <article
                      className="orgEventCard"
                      key={
                        event.id ||
                        event.title
                      }
                    >
                      <div className="orgEventImage">
                        {event.image && (
                          <img
                            src={resolveUrl(
                              event.image,
                            )}
                            alt={event.title}
                          />
                        )}

                        <span className="orgEventBadge">
                          {event.badge}
                        </span>
                      </div>

                      <div className="orgEventContent">
                        <h3>
                          {event.title}
                        </h3>

                        <div className="orgEventMeta">
                          <FiCalendar />

                          <span>
                            {formatDate(
                              event.start,
                            )}

                            {event.start
                              ? ` · ${formatTime(
                                  event.start,
                                )}`
                              : ""}
                          </span>
                        </div>

                        {event.location && (
                          <div className="orgEventMeta">
                            <FiMapPin />

                            <span>
                              {event.location}
                            </span>
                          </div>
                        )}

                        <div className="orgEventMeta">
                          <FiUsers />

                          <span>
                            {event.participants} оролцогч
                          </span>
                        </div>

                        <Link
                          to={`/events/${event.id}`}
                          className="orgEventDetailButton"
                        >
                          Дэлгэрэнгүй
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="orgEmptyEvents">
                    <div className="orgEmptyEventIcon">
                      <FiCalendar />
                    </div>

                    <strong>
                      Шинэ эвэнт алга байна
                    </strong>

                    <span>
                      Дагавал шинэ эвэнт зарлахад мэдэгдэл аваарай.
                    </span>
                  </div>
                )}
              </div>
            </section>

            {finishedEvents.length > 0 && (
              <section className="orgDetailSection">
                <div className="orgEventsHeading">
                  <h2>
                    Өнгөрсөн эвэнтүүд
                  </h2>

                  <div className="orgEventCounters">
                    <span>
                      Нийт · {finishedEvents.length}
                    </span>
                  </div>
                </div>

                <div className="orgEventsGrid">
                  {finishedEvents.map((event) => (
                    <article
                      className="orgEventCard"
                      key={
                        event.id ||
                        event.title
                      }
                    >
                      <div className="orgEventImage">
                        {event.image && (
                          <img
                            src={resolveUrl(
                              event.image,
                            )}
                            alt={event.title}
                          />
                        )}

                        <span className="orgEventBadge">
                          {event.badge}
                        </span>
                      </div>

                      <div className="orgEventContent">
                        <h3>
                          {event.title}
                        </h3>

                        <div className="orgEventMeta">
                          <FiCalendar />

                          <span>
                            {formatDate(
                              event.start,
                            )}

                            {event.start
                              ? ` · ${formatTime(
                                  event.start,
                                )}`
                              : ""}
                          </span>
                        </div>

                        {event.location && (
                          <div className="orgEventMeta">
                            <FiMapPin />

                            <span>
                              {event.location}
                            </span>
                          </div>
                        )}

                        <div className="orgEventMeta">
                          <FiUsers />

                          <span>
                            {event.participants} оролцогч
                          </span>
                        </div>

                        <Link
                          to={`/events/${event.id}`}
                          className="orgEventDetailButton"
                        >
                          Дэлгэрэнгүй
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="orgDetailSidebar">
            <div className="orgInfoCard">
              <h3>
                ТОВЧ МЭДЭЭЛЭЛ
              </h3>

              <div className="orgStats">
                <div className="orgStat">
                  <strong>
                    {events.length}
                  </strong>

                  <span>
                    Нийт эвэнт
                  </span>
                </div>

                <div className="orgStat">
                  <strong>
                    {organization.followers}
                  </strong>

                  <span>
                    Дагагч
                  </span>
                </div>

                <div className="orgStat">
                  <strong>
                    {activeEvents.length}
                  </strong>

                  <span>
                    Идэвхтэй
                  </span>
                </div>
              </div>

              <div className="orgInfoDivider" />

              <div className="orgInfoList">
                {organization.website && (
                  <a
                    className="orgInfoItem"
                    href={
                      /^https?:\/\//i.test(
                        organization.website,
                      )
                        ? organization.website
                        : `https://${organization.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FiGlobe />

                    <span>
                      {organization.website}
                    </span>
                  </a>
                )}

                {organization.phone && (
                  <a
                    className="orgInfoItem"
                    href={`tel:${organization.phone}`}
                  >
                    <FiPhone />

                    <span>
                      {organization.phone}
                    </span>
                  </a>
                )}

                {organization.address && (
                  <div className="orgInfoItem">
                    <FiMapPin />

                    <span>
                      {organization.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );

  return renderPage(page);
}