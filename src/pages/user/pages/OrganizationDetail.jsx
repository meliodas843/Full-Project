import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import RadialShare from "../../../components/RadialShare";
import { CompanyCover, CompanyLogo } from "../components/IdentityImage";

import { FiArrowLeft, FiCalendar, FiCheck, FiGlobe, FiMapPin, FiPhone, FiUsers } from "react-icons/fi";

import UserShell from "../components/UserShell";
import Footer from "../../../components/Footer";
import { API_BASE } from "../../../lib/config";
import {
  fetchJson,
  formatDate,
  formatTime,
  getToken,
  normalizeEvent,
  normalizeOrganization,
  resolveUrl,
} from "./OrganizationDetail.helpers";


export default function OrganizationDetail() {
  const { id } = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState("");

  const totalEvents = Number(
    organization?.event_count ??
      organization?.events_count ??
      organization?.total_events ??
      events.length,
  );

  const totalParticipants = Number(
    organization?.participant_count ??
      organization?.participants_count ??
      organization?.total_participants ??
      events.reduce((sum, event) => sum + (Number(event.participants) || 0), 0),
  );

  const followers = Number(organization?.followers ?? 0);

  const isUserView = location.pathname.startsWith("/user/");

  const isLoggedIn = Boolean(getToken());

  const backPath = isUserView ? "/user/organizations" : "/organization";

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
          throw new Error("Байгууллагын мэдээлэл олдсонгүй.");
        }

        if (!cancelled) {
          setOrganization(normalizeOrganization(rawOrganization));
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
              : eventData?.events || eventData?.data || eventData?.items || [];

            break;
          } catch {
            eventRows = [];
          }
        }

        if (!cancelled) {
          setEvents(eventRows.map(normalizeEvent));
        }
      } catch (err) {
        if (!cancelled) {
          setOrganization(null);

          setError(err?.message || "Байгууллагын мэдээлэл ачаалж чадсангүй.");
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
      const value = event.end || event.start;

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
      const value = event.end || event.start;

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

    const nextFollowing = !organization.following;

    try {
      const result = await fetchJson(
        `${API_BASE}/api/organizations/${organization.id}/follow`,
        {
          method: nextFollowing ? "POST" : "DELETE",
        },
      );

      setOrganization((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          following: nextFollowing,

          followers: Number.isFinite(Number(result?.followers))
            ? Number(result.followers)
            : Math.max(0, current.followers + (nextFollowing ? 1 : -1)),
        };
      });
    } catch (err) {
      setError(err?.message || "Үйлдэл амжилтгүй боллоо.");
    } finally {
      setFollowBusy(false);
    }
  }

  function renderPage(content) {
    if (isUserView && isLoggedIn) {
      return <UserShell>{content}</UserShell>;
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

          <strong>Байгууллагын мэдээллийг ачаалж байна</strong>

          <span>Түр хүлээнэ үү...</span>
        </div>
      </main>,
    );
  }

  if (!organization) {
    return renderPage(
      <main className="orgDetailPage">
        <div className="orgDetailState">
          <strong>Байгууллага олдсонгүй</strong>

          <span>{error || "Байгууллагын мэдээлэл байхгүй байна."}</span>

          <Link to={backPath} className="orgDetailStateButton">
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
          <Link className="orgDetailBack" to={backPath}>
            <FiArrowLeft />

            <span>Байгууллагууд руу буцах</span>
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
                <h1>{organization.name}</h1>

                {organization.verified && (
                  <span className="orgVerified">
                    <FiCheck />
                    Баталгаажсан
                  </span>
                )}
              </div>

              <div className="orgDetailCategory">
                <span>{organization.category}</span>

                {organization.address && (
                  <>
                    <i />

                    <span>{organization.address}</span>
                  </>
                )}
              </div>
            </div>

            <div className="orgDetailActions">
              <button
                type="button"
                className={`orgFollowButton ${
                  organization.following ? "following" : ""
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

              <RadialShare
                title={organization?.name || "Байгууллага"}
                url={window.location.href}
              />
            </div>
          </div>
        </section>

        {error && <div className="orgDetailError">{error}</div>}

        <div className="orgDetailLayout">
          <div className="orgDetailMain">
            <section className="orgDetailSection">
              <h2>Танилцуулга</h2>

              <p className="orgDetailDescription">{organization.description}</p>
            </section>

            <section className="orgDetailSection">
              <div className="orgEventsHeading">
                <h2>Зарласан эвэнтүүд</h2>

                <div className="orgEventCounters">
                  <span>Удахгүй · {activeEvents.length}</span>

                  <span>Өнгөрсөн · {finishedEvents.length}</span>
                </div>
              </div>

              <div className="orgEventsGrid">
                {activeEvents.length > 0 ? (
                  activeEvents.map((event) => (
                    <article
                      className="orgEventCard"
                      key={event.id || event.title}
                    >
                      <div className="orgEventImage">
                        {event.image && (
                          <img
                            src={resolveUrl(event.image)}
                            alt={event.title}
                          />
                        )}

                        <span className="orgEventBadge">{event.badge}</span>
                      </div>

                      <div className="orgEventContent">
                        <h3>{event.title}</h3>

                        <div className="orgEventMeta">
                          <FiCalendar />

                          <span>
                            {formatDate(event.start)}

                            {event.start ? ` · ${formatTime(event.start)}` : ""}
                          </span>
                        </div>

                        {event.location && (
                          <div className="orgEventMeta">
                            <FiMapPin />

                            <span>{event.location}</span>
                          </div>
                        )}

                        <div className="orgEventMeta">
                          <FiUsers />

                          <span>{event.participants} оролцогч</span>
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

                    <strong>Шинэ эвэнт алга байна</strong>

                    <span>Дагавал шинэ эвэнт зарлахад мэдэгдэл аваарай.</span>
                  </div>
                )}
              </div>
            </section>

            {finishedEvents.length > 0 && (
              <section className="orgDetailSection">
                <div className="orgEventsHeading">
                  <h2>Өнгөрсөн эвэнтүүд</h2>

                  <div className="orgEventCounters">
                    <span>Нийт · {finishedEvents.length}</span>
                  </div>
                </div>

                <div className="orgEventsGrid">
                  {finishedEvents.map((event) => (
                    <article
                      className="orgEventCard"
                      key={event.id || event.title}
                    >
                      <div className="orgEventImage">
                        {event.image && (
                          <img
                            src={resolveUrl(event.image)}
                            alt={event.title}
                          />
                        )}

                        <span className="orgEventBadge">{event.badge}</span>
                      </div>

                      <div className="orgEventContent">
                        <h3>{event.title}</h3>

                        <div className="orgEventMeta">
                          <FiCalendar />

                          <span>
                            {formatDate(event.start)}

                            {event.start ? ` · ${formatTime(event.start)}` : ""}
                          </span>
                        </div>

                        {event.location && (
                          <div className="orgEventMeta">
                            <FiMapPin />

                            <span>{event.location}</span>
                          </div>
                        )}

                        <div className="orgEventMeta">
                          <FiUsers />

                          <span>{event.participants} оролцогч</span>
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
              <h3>ТОВЧ МЭДЭЭЛЭЛ</h3>

              <div className="orgStats">
                <div className="orgStat">
                  <strong>{totalEvents}</strong>
                  <span>Эвент зохион байгуулсан</span>
                </div>

                <div className="orgStat">
                  <strong>{totalParticipants}</strong>
                  <span>Нийт оролцогч</span>
                </div>

                <div className="orgStat">
                  <strong>{followers}</strong>
                  <span>Дагагч</span>
                </div>
              </div>

              <div className="orgInfoDivider" />

              <div className="orgInfoList">
                {organization.website && (
                  <a
                    className="orgInfoItem"
                    href={
                      /^https?:\/\//i.test(organization.website)
                        ? organization.website
                        : `https://${organization.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FiGlobe />

                    <span>{organization.website}</span>
                  </a>
                )}

                {organization.phone && (
                  <a className="orgInfoItem" href={`tel:${organization.phone}`}>
                    <FiPhone />

                    <span>{organization.phone}</span>
                  </a>
                )}

                {organization.address && (
                  <div className="orgInfoItem">
                    <FiMapPin />

                    <span>{organization.address}</span>
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
