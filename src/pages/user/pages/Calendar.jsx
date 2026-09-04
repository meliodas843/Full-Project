import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function parseDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  const date = new Date(
    raw.includes("T")
      ? raw
      : raw.replace(" ", "T"),
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isoKey(value) {
  const date =
    value instanceof Date
      ? value
      : parseDate(value);

  if (!date) return "";

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const first = new Date(
    year,
    month,
    1,
  );

  const start =
    first.getDay() === 0
      ? 6
      : first.getDay() - 1;

  const days = new Date(
    year,
    month + 1,
    0,
  ).getDate();

  const result = [];

  for (
    let index = 0;
    index < start;
    index += 1
  ) {
    result.push(null);
  }

  for (
    let day = 1;
    day <= days;
    day += 1
  ) {
    result.push(
      new Date(year, month, day),
    );
  }

  while (result.length % 7 !== 0) {
    result.push(null);
  }

  return result;
}

function formatTime(value) {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleTimeString(
    "mn-MN",
    {
      timeZone: "Asia/Ulaanbaatar",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

function formatDateTime(value) {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleString(
    "mn-MN",
    {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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

function uniqueMeetings(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.id) return;

    const key = `${item.id}-${item.start_time || ""}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

export default function Calendar() {
  const navigate = useNavigate();

  const [sent, setSent] =
    useState([]);

  const [accepted, setAccepted] =
    useState([]);

  const [inbox, setInbox] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [viewDate, setViewDate] =
    useState(() => {
      const today = new Date();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
    });

  const [selectedDate, setSelectedDate] =
    useState(() => new Date());

  async function authFetch(
    url,
    options = {},
  ) {
    const token = getToken();

    if (!token) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    const response = await fetch(
      url,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (response.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    return response;
  }

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const [
        sentResponse,
        acceptedResponse,
        inboxResponse,
      ] = await Promise.all([
        authFetch(
          `${API_BASE}/api/meetings/sent`,
        ),
        authFetch(
          `${API_BASE}/api/meetings/accepted`,
        ),
        authFetch(
          `${API_BASE}/api/meetings/inbox`,
        ),
      ]);

      if (
        !sentResponse ||
        !acceptedResponse ||
        !inboxResponse
      ) {
        return;
      }

      const sentData =
        await sentResponse
          .json()
          .catch(() => []);

      const acceptedData =
        await acceptedResponse
          .json()
          .catch(() => []);

      const inboxData =
        await inboxResponse
          .json()
          .catch(() => []);

      setSent(
        sentResponse.ok
          ? normalizeArray(sentData)
          : [],
      );

      setAccepted(
        acceptedResponse.ok
          ? normalizeArray(
              acceptedData,
            )
          : [],
      );

      setInbox(
        inboxResponse.ok
          ? normalizeArray(inboxData)
          : [],
      );

      if (
        !sentResponse.ok ||
        !acceptedResponse.ok ||
        !inboxResponse.ok
      ) {
        setMessage(
          "Уулзалтын мэдээлэл уншихад алдаа гарлаа.",
        );
      }
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй.",
      );

      setSent([]);
      setAccepted([]);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingInbox = useMemo(
    () =>
      inbox.filter(
        (meeting) =>
          String(
            meeting?.status || "",
          ).toLowerCase() ===
          "pending",
      ),
    [inbox],
  );

  const pendingSent = useMemo(
    () =>
      sent.filter(
        (meeting) =>
          String(
            meeting?.status || "",
          ).toLowerCase() ===
          "pending",
      ),
    [sent],
  );

  const myMeetings = useMemo(
    () =>
      uniqueMeetings([
        ...accepted,
        ...sent.filter(
          (meeting) =>
            String(
              meeting?.status || "",
            ).toLowerCase() !==
            "pending",
        ),
      ]),
    [accepted, sent],
  );

  const allMeetings = useMemo(
    () =>
      uniqueMeetings([
        ...sent,
        ...accepted,
        ...inbox,
      ]),
    [sent, accepted, inbox],
  );

  const byDay = useMemo(() => {
    const map = {};

    allMeetings.forEach(
      (meeting) => {
        const key = isoKey(
          meeting.start_time,
        );

        if (!key) return;

        if (!map[key]) {
          map[key] = [];
        }

        map[key].push(meeting);
      },
    );

    Object.keys(map).forEach(
      (key) => {
        map[key].sort(
          (a, b) => {
            const first =
              parseDate(
                a.start_time,
              )?.getTime() || 0;

            const second =
              parseDate(
                b.start_time,
              )?.getTime() || 0;

            return first - second;
          },
        );
      },
    );

    return map;
  }, [allMeetings]);

  const grid = useMemo(
    () => monthGrid(viewDate),
    [viewDate],
  );

  const selectedKey =
    isoKey(selectedDate);

  const selectedMeetings =
    byDay[selectedKey] || [];

  const title =
    viewDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      },
    );

  function openMeetingCreate() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    navigate(
      "/user/meeting/create",
    );
  }

  function goPreviousMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    );
  }

  function goNextMonth() {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    );
  }

  function selectMeeting(
    meeting,
  ) {
    const date = parseDate(
      meeting?.start_time,
    );

    if (!date) return;

    setSelectedDate(date);

    setViewDate(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );
  }

  return (
    <UserShell title="Календар">
      <main className="rgCalendarPage">
        <aside className="rgCalendarSidebar">
          <section className="rgDashboardCard rgInboxCard">
            <div className="rgInboxHeader">
              <div>
                <h3>
                  Request Inbox
                </h3>

                <span>
                  {pendingInbox.length}{" "}
                  pending
                </span>
              </div>

              <b>
                {pendingInbox.length}
              </b>
            </div>

            {loading ? (
              <div className="rgInboxEmpty">
                Уншиж байна...
              </div>
            ) : pendingInbox.length ===
              0 ? (
              <div className="rgInboxEmpty">
                Empty
              </div>
            ) : (
              <div className="rgInboxRequests">
                {pendingInbox.map(
                  (meeting) => (
                    <button
                      type="button"
                      key={meeting.id}
                      onClick={() =>
                        selectMeeting(
                          meeting,
                        )
                      }
                    >
                      <div>
                        <strong>
                          {meeting.title ||
                            "Meeting"}
                        </strong>

                        <small>
                          {meeting.creator_email ||
                            meeting.sender_email ||
                            ""}
                        </small>
                      </div>

                      <span>
                        {formatTime(
                          meeting.start_time,
                        )}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
          </section>

          <button
            type="button"
            className="rgSendRequestButton"
            onClick={
              openMeetingCreate
            }
          >
            <FiPlus />

            Send Request
          </button>

          <section className="rgDashboardCard rgMyMeetingsCard">
            <div className="rgMyMeetingsHeading">
              <div>
                <h3>
                  My Meetings
                </h3>

                <span>
                  {myMeetings.length}{" "}
                  item(s)
                </span>
              </div>
            </div>

            {loading ? (
              <div>
                Уншиж байна...
              </div>
            ) : myMeetings.length ===
              0 ? (
              <div>
                No meetings scheduled.
              </div>
            ) : (
              <div className="rgMyMeetingList">
                {myMeetings
                  .slice(0, 6)
                  .map(
                    (meeting) => (
                      <button
                        type="button"
                        key={
                          meeting.id
                        }
                        onClick={() =>
                          selectMeeting(
                            meeting,
                          )
                        }
                      >
                        <div>
                          <strong>
                            {meeting.title ||
                              "Meeting"}
                          </strong>

                          <small>
                            {formatDateTime(
                              meeting.start_time,
                            )}
                          </small>
                        </div>

                        <span
                          className={`rgMeetingStatus ${
                            meeting.status ||
                            ""
                          }`}
                        >
                          {meeting.status ||
                            "accepted"}
                        </span>
                      </button>
                    ),
                  )}
              </div>
            )}
          </section>

          {pendingSent.length >
            0 && (
            <section className="rgDashboardCard rgMyMeetingsCard">
              <div className="rgMyMeetingsHeading">
                <div>
                  <h3>
                    Sent Requests
                  </h3>

                  <span>
                    {
                      pendingSent.length
                    }{" "}
                    pending
                  </span>
                </div>
              </div>

              <div className="rgMyMeetingList">
                {pendingSent
                  .slice(0, 5)
                  .map(
                    (meeting) => (
                      <button
                        key={
                          meeting.id
                        }
                        type="button"
                        onClick={() =>
                          selectMeeting(
                            meeting,
                          )
                        }
                      >
                        <div>
                          <strong>
                            {meeting.title ||
                              "Meeting"}
                          </strong>

                          <small>
                            To:{" "}
                            {meeting.recipient_email ||
                              ""}
                          </small>
                        </div>

                        <span className="rgMeetingStatus pending">
                          pending
                        </span>
                      </button>
                    ),
                  )}
              </div>
            </section>
          )}

          {message && (
            <div className="rgCalendarMessage">
              {message}
            </div>
          )}
        </aside>

        <section className="rgDashboardCard rgBigCalendar">
          <header className="rgBigCalendarHeader">
            <h2>{title}</h2>

            <div>
              <button
                type="button"
                onClick={
                  goPreviousMonth
                }
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                onClick={goNextMonth}
              >
                <FiChevronRight />
              </button>
            </div>
          </header>

          <div className="rgBigWeekdays">
            {[
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
              "Sun",
            ].map((day) => (
              <span key={day}>
                {day}
              </span>
            ))}
          </div>

          <div className="rgBigCalendarGrid">
            {grid.map(
              (date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                    />
                  );
                }

                const key =
                  isoKey(date);

                const meetings =
                  byDay[key] || [];

                const active =
                  key ===
                  selectedKey;

                return (
                  <button
                    type="button"
                    key={key}
                    className={
                      active
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedDate(
                        date,
                      )
                    }
                  >
                    <span>
                      {date.getDate()}
                    </span>

                    {meetings.length >
                      0 && (
                      <div className="rgBigMeetingDots">
                        {meetings
                          .slice(
                            0,
                            3,
                          )
                          .map(
                            (
                              meeting,
                              dotIndex,
                            ) => (
                              <i
                                key={`${meeting.id}-${dotIndex}`}
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

          {selectedMeetings.length >
            0 && (
            <div className="rgCalendarSelected">
              {selectedMeetings.map(
                (meeting) => (
                  <div
                    key={`${meeting.id}-${meeting.start_time}`}
                  >
                    <span>
                      {formatTime(
                        meeting.start_time,
                      )}
                    </span>

                    <div>
                      <strong>
                        {meeting.title ||
                          "Meeting"}
                      </strong>

                      <small>
                        {meeting.creator_email ===
                        JSON.parse(
                          localStorage.getItem(
                            "user",
                          ) || "{}",
                        )?.email
                          ? `To: ${
                              meeting.recipient_email ||
                              ""
                            }`
                          : `From: ${
                              meeting.creator_email ||
                              ""
                            }`}
                      </small>
                    </div>

                    <b
                      className={`rgMeetingStatus ${
                        meeting.status ||
                        ""
                      }`}
                    >
                      {meeting.status ||
                        ""}
                    </b>
                  </div>
                ),
              )}
            </div>
          )}

          {loading && (
            <div className="rgCalendarLoading">
              Loading...
            </div>
          )}
        </section>
      </main>
    </UserShell>
  );
}