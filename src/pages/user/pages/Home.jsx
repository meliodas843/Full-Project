import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function resolveUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_BASE}${
    value.startsWith("/") ? value : `/${value}`
  }`;
}

function fallbackImg() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatEventDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleString("en-US", {
    timeZone: "Asia/Ulaanbaatar",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function monthTitle(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toKey(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateKey(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return toKey(date);
}

function calendarCells(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const first = new Date(
    year,
    month,
    1,
  );

  const weekday =
    first.getDay() === 0
      ? 6
      : first.getDay() - 1;

  const start = new Date(
    year,
    month,
    1 - weekday,
  );

  return Array.from(
    { length: 42 },
    (_, index) => {
      const date = new Date(start);

      date.setDate(
        start.getDate() + index,
      );

      return {
        date,
        key: toKey(date),
        current:
          date.getMonth() === month,
      };
    },
  );
}

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

export default function Home() {
  const navigate = useNavigate();

  const [events, setEvents] =
    useState([]);

  const [pending, setPending] =
    useState([]);

  const [accepted, setAccepted] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedDate, setSelectedDate] =
    useState(() => new Date());

  const [viewDate, setViewDate] =
    useState(() => {
      const today = new Date();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
    });

  async function loadDashboard() {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    setLoading(true);

    try {
      const [
        eventResponse,
        inboxResponse,
        acceptedResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE}/api/events/my-joined`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
        fetch(
          `${API_BASE}/api/meetings/inbox`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
        fetch(
          `${API_BASE}/api/meetings/accepted`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      ]);

      const eventData =
        await eventResponse
          .json()
          .catch(() => []);

      const inboxData =
        await inboxResponse
          .json()
          .catch(() => []);

      const acceptedData =
        await acceptedResponse
          .json()
          .catch(() => []);

      const joined =
        eventResponse.ok
          ? normalizeArray(eventData)
          : [];

      setEvents(
        joined
          .filter((event) => {
            const end = parseDate(
              event.end_time ||
                event.start_time,
            );

            if (!end) {
              return true;
            }

            return (
              end.getTime() >= Date.now()
            );
          })
          .sort(
            (a, b) =>
              new Date(
                a.start_time || 0,
              ) -
              new Date(
                b.start_time || 0,
              ),
          ),
      );

      setPending(
        normalizeArray(
          inboxData,
        ).filter(
          (item) =>
            item.status === "pending",
        ),
      );

      setAccepted(
        normalizeArray(acceptedData),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const upcoming =
    events[0] || null;

  const allCalendarItems =
    useMemo(() => {
      return [
        ...events.map((event) => ({
          ...event,
          calendarType: "event",
        })),
        ...accepted.map(
          (meeting) => ({
            ...meeting,
            calendarType: "meeting",
          }),
        ),
      ];
    }, [events, accepted]);

  const itemsByDate =
    useMemo(() => {
      const map = {};

      allCalendarItems.forEach(
        (item) => {
          const key = dateKey(
            item.start_time,
          );

          if (!key) {
            return;
          }

          if (!map[key]) {
            map[key] = [];
          }

          map[key].push(item);
        },
      );

      return map;
    }, [allCalendarItems]);

  const cells = useMemo(
    () => calendarCells(viewDate),
    [viewDate],
  );

  const selectedItems =
    itemsByDate[
      toKey(selectedDate)
    ] || [];

  function prevMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    );
  }

  function nextMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    );
  }

  return (
    <UserShell title="Нүүр">
      <main className="rgHomePage">
        <div className="rgHomeMain">
          <section className="rgDashboardCard rgUpcomingCard">
            <div className="rgDashboardCardHeader">
              <div>
                <h2>
                  Удахгүй болох эвэнт
                </h2>
              </div>

              <div className="rgSliderCount">
                <button type="button">
                  <FiChevronLeft />
                </button>

                <span>
                  {events.length
                    ? `1/${events.length}`
                    : "0/0"}
                </span>

                <button type="button">
                  <FiChevronRight />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rgDashboardEmpty">
                Уншиж байна...
              </div>
            ) : !upcoming ? (
              <div className="rgDashboardEmpty">
                Удахгүй болох эвэнт
                байхгүй.
              </div>
            ) : (
              <div className="rgUpcomingEvent">
                <div className="rgUpcomingImage">
                  <img
                    src={
                      upcoming.image_url
                        ? resolveUrl(
                            upcoming.image_url,
                          )
                        : fallbackImg()
                    }
                    alt={
                      upcoming.title ||
                      "Event"
                    }
                    onError={(event) => {
                      event.currentTarget.src =
                        fallbackImg();
                    }}
                  />
                </div>

                <div className="rgUpcomingBody">
                  <div className="rgUpcomingTop">
                    <div>
                      <h3>
                        {upcoming.title}
                      </h3>

                      <span>
                        {formatEventDate(
                          upcoming.start_time,
                        )}
                      </span>
                    </div>

                    <span className="rgRegisteredBadge">
                      Бүртгэгдсэн
                    </span>
                  </div>

                  <p>
                    {upcoming.description ||
                      "Эвэнтийн дэлгэрэнгүй мэдээлэл."}
                  </p>

                  <button
                    type="button"
                    className="rgPurpleButton"
                    onClick={() =>
                      navigate(
                        `/user/event?eventId=${upcoming.id}`,
                      )
                    }
                  >
                    Дэлгэрэнгүй
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rgDashboardCard rgMiniCalendarCard">
            <div className="rgCalendarHeader">
              <div>
                <h3>Календар</h3>

                <span>
                  {monthTitle(viewDate)}
                </span>
              </div>

              <div className="rgCalendarLegend">
                <span>
                  <i className="event" />
                  Events
                </span>

                <span>
                  <i className="meeting" />
                  Meetings
                </span>
              </div>
            </div>

            <div className="rgMiniCalendarLayout">
              <div>
                <div className="rgMiniWeek">
                  {[
                    "M",
                    "T",
                    "W",
                    "T",
                    "F",
                    "S",
                    "S",
                  ].map(
                    (day, index) => (
                      <span
                        key={`${day}-${index}`}
                      >
                        {day}
                      </span>
                    ),
                  )}
                </div>

                <div className="rgMiniDays">
                  {cells.map(
                    (cell) => {
                      const hasItems =
                        itemsByDate[
                          cell.key
                        ] || [];

                      const active =
                        cell.key ===
                        toKey(
                          selectedDate,
                        );

                      return (
                        <button
                          type="button"
                          key={cell.key}
                          className={`${active ? "active" : ""} ${
                            !cell.current
                              ? "outside"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedDate(
                              cell.date,
                            )
                          }
                        >
                          <span>
                            {cell.date.getDate()}
                          </span>

                          {hasItems.length >
                            0 && (
                            <div className="rgCalendarDots">
                              {hasItems
                                .slice(
                                  0,
                                  2,
                                )
                                .map(
                                  (
                                    item,
                                    index,
                                  ) => (
                                    <i
                                      key={
                                        index
                                      }
                                      className={
                                        item.calendarType
                                      }
                                    />
                                  ),
                                )}
                            </div>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="rgSelectedDay">
                <strong>
                  {selectedDate.toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </strong>

                {selectedItems.length ===
                0 ? (
                  <div>
                    Энэ өдөр эвэнт
                    байхгүй.
                  </div>
                ) : (
                  selectedItems
                    .slice(0, 3)
                    .map((item) => (
                      <button
                        type="button"
                        key={`${item.calendarType}-${item.id}`}
                        onClick={() => {
                          if (
                            item.calendarType ===
                            "event"
                          ) {
                            navigate(
                              `/user/event?eventId=${item.id}`,
                            );
                          } else {
                            navigate(
                              "/user/calendar",
                            );
                          }
                        }}
                      >
                        <FiCalendar />

                        <span>
                          {item.title ||
                            "Meeting"}
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="rgRequestPanel">
          <div className="rgRequestHeading">
            <h3>Хүсэлтүүд</h3>

            <span>
              Уулзалтын хүсэлтүүд
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="rgNoRequests">
              <div>📫</div>

              <h4>
                Хүлээгдэж буй хүсэлт
                алга
              </h4>

              <p>
                Бусад оролцогчийн
                уулзалтын хүсэлт энд
                харагдана.
              </p>
            </div>
          ) : (
            <div className="rgRequestList">
              {pending.map(
                (request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        "/user/calendar",
                      )
                    }
                  >
                    <strong>
                      {request.title ||
                        "Meeting"}
                    </strong>

                    <span>
                      {formatEventDate(
                        request.start_time,
                      )}
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </aside>
      </main>
    </UserShell>
  );
}