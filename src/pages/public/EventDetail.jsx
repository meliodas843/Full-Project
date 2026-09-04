import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarDays,
  FaCircleCheck,
  FaLocationDot,
} from "react-icons/fa6";
import Footer from "../../components/Footer";
import { API_BASE, getImageSrc } from "../../lib/config";
import eventFallback from "../../assets/event.png";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.events)) return data.events;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getEventId(event) {
  return event?.id ?? event?._id;
}

function parseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  const text = value.trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getSpeakers(event) {
  const values = [
    event?.speaker,
    event?.speakers,
    event?.presenters,
    event?.speaker_list,
  ];

  for (const value of values) {
    const parsed = parseArray(value);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [];
}

function getAgenda(event) {
  const values = [
    event?.agenda,
    event?.program,
    event?.programs,
    event?.schedule,
    event?.schedules,
  ];

  for (const value of values) {
    const parsed = parseArray(value);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [];
}

function categoryOf(event) {
  const text = `${event?.title || ""} ${
    event?.description || ""
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
    text.includes("kubernetes") ||
    text.includes("aws") ||
    text.includes("azure")
  ) {
    return "Cloud";
  }

  if (
    text.includes("ai") ||
    text.includes("machine learning") ||
    text.includes("artificial") ||
    text.includes("хиймэл оюун")
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

function categoryClass(category) {
  return String(category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function formatTime(value) {
  if (!value) return "";

  const stringValue = String(value).trim();

  if (
    /^\d{1,2}:\d{2}$/.test(stringValue)
  ) {
    const [hour, minute] =
      stringValue.split(":");

    return `${String(hour).padStart(
      2,
      "0",
    )}:${minute}`;
  }

  if (
    /^\d{1,2}:\d{2}:\d{2}$/.test(
      stringValue,
    )
  ) {
    return stringValue.slice(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return stringValue;
  }

  return date.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

function getLocation(event) {
  return (
    event?.location ||
    event?.venue ||
    event?.address ||
    "Улаанбаатар"
  );
}

function getRegisteredCount(event) {
  const values = [
    event?.booked_count,
    event?.registered_count,
    event?.participants_count,
    event?.joined_count,
    event?.attendee_count,
  ];

  for (const value of values) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  if (Array.isArray(event?.participants)) {
    return event.participants.length;
  }

  if (Array.isArray(event?.attendees)) {
    return event.attendees.length;
  }

  return 0;
}

function getCapacity(event) {
  const values = [
    event?.max_participants,
    event?.capacity,
    event?.max_attendees,
    event?.total_seats,
    event?.seats,
  ];

  for (const value of values) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number > 0
    ) {
      return number;
    }
  }

  return 0;
}

function getAgendaTime(item) {
  return formatTime(
    item?.time ||
      item?.start_time ||
      item?.start ||
      item?.program_time,
  );
}

function getAgendaTitle(item) {
  return (
    item?.text ||
    item?.title ||
    item?.name ||
    item?.program_title ||
    item?.topic ||
    item?.description ||
    "Хөтөлбөр"
  );
}

function getAgendaSubtitle(item) {
  return (
    item?.speaker ||
    item?.subtitle ||
    item?.organization ||
    item?.company ||
    item?.details ||
    ""
  );
}

function speakerInitials(name) {
  const value = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (value.length === 0) {
    return "SP";
  }

  if (value.length === 1) {
    return value[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${value[0][0]}${
    value[value.length - 1][0]
  }`.toUpperCase();
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [booking, setBooking] =
    useState(false);
  const [message, setMessage] =
    useState("");

  async function loadEvent() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/events`,
      );

      const data = await response
        .json()
        .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Эвэнтийг ачаалж чадсангүй.",
        );
      }

      const list = normalizeArray(data);

      const selected = list.find(
        (item) =>
          String(getEventId(item)) ===
          String(id),
      );

      if (!selected) {
        throw new Error(
          "Эвэнт олдсонгүй.",
        );
      }

      setEvent(selected);
    } catch (err) {
      setEvent(null);

      setError(
        err?.message ||
          "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
  }, [id]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [id]);

  const speakers = useMemo(() => {
    return getSpeakers(event);
  }, [event]);

  const agenda = useMemo(() => {
    return getAgenda(event);
  }, [event]);

  const registered =
    getRegisteredCount(event);

  const capacity =
    getCapacity(event);

  const remaining =
    capacity > 0
      ? Math.max(
          0,
          capacity - registered,
        )
      : 0;

  const percentage = useMemo(() => {
    if (!capacity) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (registered / capacity) * 100,
      ),
    );
  }, [registered, capacity]);

  async function joinEvent() {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        state: {
          from: `/events/${id}`,
        },
      });

      return;
    }

    if (!event || booking) {
      return;
    }

    try {
      setBooking(true);
      setMessage("");

      const eventId =
        getEventId(event);

      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/join-request`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Бүртгүүлэх хүсэлт илгээж чадсангүй.",
        );
      }

      setMessage(
        data?.message ||
          "Хүсэлт амжилттай илгээгдлээ.",
      );

      await loadEvent();
    } catch (err) {
      setMessage(
        err?.message ||
          "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="riPublicPage riEventDetailPage">
        <div className="riEventDetailState">
          Эвэнтийг ачаалж байна...
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="riPublicPage riEventDetailPage">
        <div className="riEventDetailState">
          <h2>
            {error ||
              "Эвэнт олдсонгүй."}
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate("/events")
            }
          >
            Эвэнтүүд рүү буцах
          </button>
        </div>
      </main>
    );
  }

  const eventCategory =
    categoryOf(event);

  const eventImage =
    event?.image_url
      ? getImageSrc(
          event.image_url,
          eventFallback,
        )
      : eventFallback;

  const startDate =
    event?.start_time ||
    event?.start_date;

  const description =
    event?.description ||
    "Эвэнтийн дэлгэрэнгүй мэдээлэл.";

  const eventLocation =
    getLocation(event);

  return (
    <main className="riPublicPage riEventDetailPage">
      <section className="riEventDetailSection">
        <div className="riEventDetailContainer">
          <button
            type="button"
            className="riEventBack"
            onClick={() =>
              navigate("/events")
            }
          >
            <FaArrowLeft />
            Эвэнтүүд рүү буцах
          </button>

          <div className="riEventDetailHeroImage">
            <img
              src={eventImage}
              alt={
                event?.title ||
                "Event"
              }
              onError={(e) => {
                e.currentTarget.src =
                  eventFallback;
              }}
            />
          </div>

          <div className="riEventDetailLayout">
            <div className="riEventDetailMain">
              <span
                className={`riEventDetailCategory ${categoryClass(
                  eventCategory,
                )}`}
              >
                {eventCategory}
              </span>

              <h1>
                {event?.title ||
                  "Untitled Event"}
              </h1>

              <div className="riEventDetailMeta">
                <span>
                  <FaCalendarDays />

                  {formatDate(
                    startDate,
                  )}

                  {formatTime(
                    startDate,
                  ) && (
                    <>
                      {" "}
                      ·{" "}
                      {formatTime(
                        startDate,
                      )}
                    </>
                  )}
                </span>

                <span>
                  <FaLocationDot />
                  {eventLocation}
                </span>
              </div>

              <div
                className="riEventDescription"
                dangerouslySetInnerHTML={{
                  __html:
                    String(
                      description,
                    ).includes("<")
                      ? description
                      : `<p>${description}</p>`,
                }}
              />

              {speakers.length >
                0 && (
                <section className="riEventSpeakersSection">
                  <h2>
                    Илтгэгчид
                  </h2>

                  <div className="riEventSpeakersGrid">
                    {speakers.map(
                      (
                        speaker,
                        index,
                      ) => (
                        <article
                          className="riEventSpeakerCard"
                          key={`${
                            speaker?.name ||
                            "speaker"
                          }-${index}`}
                        >
                          <div className="riEventSpeakerAvatar">
                            {speaker?.image_url ||
                            speaker?.image ||
                            speaker?.avatar_url ? (
                              <img
                                src={getImageSrc(
                                  speaker?.image_url ||
                                    speaker?.image ||
                                    speaker?.avatar_url,
                                  eventFallback,
                                )}
                                alt={
                                  speaker?.name ||
                                  "Илтгэгч"
                                }
                              />
                            ) : (
                              <span>
                                {speakerInitials(
                                  speaker?.name,
                                )}
                              </span>
                            )}
                          </div>

                          <div className="riEventSpeakerInfo">
                            <strong>
                              {speaker?.name ||
                                "Илтгэгч"}
                            </strong>

                            {(speaker?.organization ||
                              speaker?.company ||
                              speaker?.position) && (
                              <small>
                                {speaker?.organization ||
                                  speaker?.company ||
                                  speaker?.position}
                              </small>
                            )}

                            {speaker?.topic && (
                              <p>
                                {
                                  speaker.topic
                                }
                              </p>
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}

              <section className="riEventScheduleSection">
                <h2>
                  Эвэнтийн хөтөлбөр
                </h2>

                {agenda.length >
                0 ? (
                  <div className="riEventSchedule">
                    {agenda.map(
                      (
                        item,
                        index,
                      ) => {
                        const time =
                          getAgendaTime(
                            item,
                          );

                        const title =
                          getAgendaTitle(
                            item,
                          );

                        const subtitle =
                          getAgendaSubtitle(
                            item,
                          );

                        return (
                          <div
                            className="riScheduleItem"
                            key={`${
                              item?.time ||
                              item?.start_time ||
                              index
                            }-${index}`}
                          >
                            <div className="riScheduleTime">
                              {time ||
                                "--:--"}
                            </div>

                            <div className="riScheduleContent">
                              <strong>
                                {
                                  title
                                }
                              </strong>

                              {subtitle && (
                                <span>
                                  {
                                    subtitle
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="riEventScheduleEmpty">
                    Хөтөлбөр
                    оруулаагүй байна.
                  </div>
                )}
              </section>
            </div>

            <aside className="riEventBookingCard">
              <div className="riEventBookingCount">
                <strong>
                  {capacity > 0
                    ? `${registered} / ${capacity}`
                    : registered}
                </strong>

                <span>
                  оролцогч
                </span>
              </div>

              {capacity > 0 && (
                <>
                  <div className="riEventBookingSeats">
                    <span>
                      {registered} /{" "}
                      {capacity} суудал
                    </span>

                    <strong>
                      {percentage}%
                      дүүрсэн
                    </strong>
                  </div>

                  <div className="riEventBookingProgress">
                    <span
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                className="riEventRegisterButton"
                onClick={joinEvent}
                disabled={
                  booking ||
                  (capacity > 0 &&
                    remaining === 0)
                }
              >
                {booking
                  ? "Илгээж байна..."
                  : capacity > 0 &&
                      remaining ===
                        0
                    ? "Суудал дүүрсэн"
                    : "Бүртгүүлэх"}
              </button>

              <div className="riEventBookingBenefits">
                <span>
                  <FaCircleCheck />
                  Хурдан онлайн
                  бүртгэл
                </span>

                <span>
                  <FaCircleCheck />
                  Эвэнтийн мэдээллээ
                  хянах
                </span>

                <span>
                  <FaCircleCheck />
                  Бүртгэлээ
                  профайлаас харах
                </span>
              </div>

              {message && (
                <div className="riEventBookingMessage">
                  {message}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}