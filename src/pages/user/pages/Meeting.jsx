import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiClock,
  FiSearch,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function getDisplayName(person) {
  return (
    String(person?.name || "").trim() ||
    `${person?.first_name || ""} ${person?.last_name || ""}`.trim() ||
    String(person?.email || "").trim() ||
    "User"
  );
}

function getInitials(person) {
  const name = getDisplayName(person);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.participants)) return data.participants;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
}

export default function Meeting() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("event");

  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventPeople, setEventPeople] = useState([]);
  const [selectedEventEmails, setSelectedEventEmails] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedCompanyEmails, setSelectedCompanyEmails] = useState([]);

  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [eventSearch, setEventSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [message, setMessage] = useState("");

  const timeSlots = useMemo(() => {
    return Array.from({ length: 37 }, (_, index) => {
      const totalMinutes = 9 * 60 + index * 15;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0",
      )}`;
    });
  }, []);

  async function readError(response) {
    try {
      const text = await response.text();

      if (!text) {
        return `HTTP ${response.status}`;
      }

      try {
        const data = JSON.parse(text);
        return data?.message || data?.error || text;
      } catch {
        return text;
      }
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  async function authFetch(url, options = {}) {
    const token = getToken();

    if (!token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/login", {
        replace: true,
      });

      return null;
    }

    return response;
  }

  async function loadMyEvents() {
    try {
      const response = await authFetch(
        `${API_BASE}/api/events/my-joined`,
      );

      if (!response) return;

      if (!response.ok) {
        const error = await readError(response);
        setMessage(error);
        return;
      }

      const data = await response.json().catch(() => []);

      setMyEvents(normalizeArray(data));
    } catch {
      setMessage("Эвэнтүүдийг ачаалж чадсангүй.");
    }
  }

  async function loadCompanies() {
    try {
      const response = await authFetch(
        `${API_BASE}/api/companies`,
      );

      if (!response) return;

      if (!response.ok) {
        const error = await readError(response);
        setMessage(error);
        return;
      }

      const data = await response.json().catch(() => []);

      setCompanies(normalizeArray(data));
    } catch {
      setMessage("Байгууллагуудыг ачаалж чадсангүй.");
    }
  }

  async function loadEventPeople(eventId) {
    if (!eventId) {
      setEventPeople([]);
      setSelectedEventEmails([]);
      return;
    }

    try {
      setLoadingPeople(true);
      setMessage("");

      const response = await authFetch(
        `${API_BASE}/api/events/${eventId}/participants`,
      );

      if (!response) return;

      if (!response.ok) {
        const error = await readError(response);

        setEventPeople([]);
        setSelectedEventEmails([]);
        setMessage(error);

        return;
      }

      const data = await response.json().catch(() => []);

      setEventPeople(normalizeArray(data));
      setSelectedEventEmails([]);
    } catch {
      setEventPeople([]);
      setSelectedEventEmails([]);
      setMessage("Оролцогчдыг ачаалж чадсангүй.");
    } finally {
      setLoadingPeople(false);
    }
  }

  async function loadEmployees(companyName) {
    if (!companyName) {
      setEmployees([]);
      setSelectedCompanyEmails([]);
      return;
    }

    try {
      setLoadingPeople(true);
      setMessage("");

      const response = await authFetch(
        `${API_BASE}/api/companies/employees?company=${encodeURIComponent(
          companyName,
        )}`,
      );

      if (!response) return;

      if (!response.ok) {
        const error = await readError(response);

        setEmployees([]);
        setSelectedCompanyEmails([]);
        setMessage(error);

        return;
      }

      const data = await response.json().catch(() => []);

      setEmployees(normalizeArray(data));
      setSelectedCompanyEmails([]);
    } catch {
      setEmployees([]);
      setSelectedCompanyEmails([]);
      setMessage("Ажилтнуудыг ачаалж чадсангүй.");
    } finally {
      setLoadingPeople(false);
    }
  }

  useEffect(() => {
    loadMyEvents();
    loadCompanies();
  }, []);

  useEffect(() => {
    loadEventPeople(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    loadEmployees(company);
  }, [company]);

  useEffect(() => {
    setMessage("");
    setEventSearch("");
    setCompanySearch("");

    if (mode === "event") {
      setCompany("");
      setEmployees([]);
      setSelectedCompanyEmails([]);
    } else {
      setSelectedEventId("");
      setEventPeople([]);
      setSelectedEventEmails([]);
    }
  }, [mode]);

  const eventPeopleFiltered = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();

    if (!query) {
      return eventPeople;
    }

    return eventPeople.filter((person) => {
      const text = [
        getDisplayName(person),
        person?.email,
        person?.company_name,
        person?.company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [eventPeople, eventSearch]);

  const employeesFiltered = useMemo(() => {
    const query = companySearch.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((person) => {
      const text = [
        getDisplayName(person),
        person?.email,
        person?.company_name,
        person?.company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [employees, companySearch]);

  const selectedEmails =
    mode === "event"
      ? selectedEventEmails
      : selectedCompanyEmails;

  const people =
    mode === "event"
      ? eventPeople
      : employees;

  function toggleEventPerson(email) {
    if (!email) return;

    setSelectedEventEmails((current) => {
      if (current.includes(email)) {
        return current.filter(
          (item) => item !== email,
        );
      }

      return [...current, email];
    });
  }

  function toggleCompanyPerson(email) {
    if (!email) return;

    setSelectedCompanyEmails((current) => {
      if (current.includes(email)) {
        return current.filter(
          (item) => item !== email,
        );
      }

      return [...current, email];
    });
  }

  function selectAllEventPeople() {
    const emails = eventPeople
      .map((person) => person?.email)
      .filter(Boolean);

    if (
      emails.length > 0 &&
      emails.every((email) =>
        selectedEventEmails.includes(email),
      )
    ) {
      setSelectedEventEmails([]);
      return;
    }

    setSelectedEventEmails(emails);
  }

  function selectAllCompanyPeople() {
    const emails = employees
      .map((person) => person?.email)
      .filter(Boolean);

    if (
      emails.length > 0 &&
      emails.every((email) =>
        selectedCompanyEmails.includes(email),
      )
    ) {
      setSelectedCompanyEmails([]);
      return;
    }

    setSelectedCompanyEmails(emails);
  }

  function removeSelected(email) {
    if (mode === "event") {
      setSelectedEventEmails((current) =>
        current.filter((item) => item !== email),
      );
    } else {
      setSelectedCompanyEmails((current) =>
        current.filter((item) => item !== email),
      );
    }
  }

  function findSelectedPerson(email) {
    return people.find(
      (person) => person?.email === email,
    );
  }

  async function handleSend(event) {
    event.preventDefault();

    if (loading) return;

    setMessage("");

    if (!meetingDate) {
      setMessage("Уулзалтын огноог сонгоно уу.");
      return;
    }

    if (!startTime) {
      setMessage("Эхлэх цагийг сонгоно уу.");
      return;
    }

    if (
      endTime &&
      startTime &&
      endTime <= startTime
    ) {
      setMessage(
        "Дуусах цаг эхлэх цагаас хойш байх ёстой.",
      );
      return;
    }

    if (!reason.trim()) {
      setMessage("Уулзалтын зорилгыг оруулна уу.");
      return;
    }

    const invitees =
      mode === "event"
        ? selectedEventEmails
        : selectedCompanyEmails;

    if (!invitees.length) {
      setMessage(
        "Хамгийн багадаа нэг хүн сонгоно уу.",
      );
      return;
    }

    if (
      mode === "event" &&
      !selectedEventId
    ) {
      setMessage("Эвэнт сонгоно уу.");
      return;
    }

    if (
      mode === "company" &&
      !company
    ) {
      setMessage("Байгууллага сонгоно уу.");
      return;
    }

    const selectedEvent = myEvents.find(
      (item) =>
        String(item.id) ===
        String(selectedEventId),
    );

    try {
      setLoading(true);

      const payload = {
        date: meetingDate,
        startTime,
        endTime: endTime || null,
        reason: reason.trim(),
        invitees,
        mode,
        eventId:
          mode === "event"
            ? Number(selectedEventId) || null
            : null,
        title:
          mode === "event"
            ? selectedEvent?.title ||
              "Event Meeting"
            : `${company} Meeting`,
      };

      if (mode === "company") {
        payload.company = company;
      }

      const response = await authFetch(
        `${API_BASE}/api/meetings`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response) return;

      if (!response.ok) {
        const error =
          await readError(response);

        setMessage(
          error ||
            "Уулзалтын хүсэлт илгээж чадсангүй.",
        );

        return;
      }

      await response
        .json()
        .catch(() => ({}));

      setMessage(
        "Уулзалтын хүсэлт амжилттай илгээгдлээ.",
      );

      setTimeout(() => {
        navigate("/user/calendar");
      }, 700);
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const selectedAll =
    people.length > 0 &&
    people
      .map((person) => person?.email)
      .filter(Boolean)
      .every((email) =>
        selectedEmails.includes(email),
      );

  return (
    <UserShell title="Уулзалт үүсгэх">
      <main className="rgMeetingPage">
        <section className="rgMeetingCard">
          <header className="rgMeetingHeader">
            <div>
              <div className="rgMeetingHeaderIcon">
                <FiCalendar />
              </div>

              <div>
                <h1>
                  Уулзалт зохион байгуулах
                </h1>

                <p>
                  Эвэнт эсвэл байгууллагын
                  хүмүүсээс сонгон уулзалтын
                  хүсэлт илгээнэ үү.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rgMeetingBack"
              onClick={() =>
                navigate("/user/calendar")
              }
            >
              <FiArrowLeft />
              Буцах
            </button>
          </header>

          <form
            className="rgMeetingForm"
            onSubmit={handleSend}
          >
            <div className="rgMeetingTabs">
              <button
                type="button"
                className={
                  mode === "event"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setMode("event")
                }
              >
                <FiCalendar />
                Миний эвэнтүүдээр
              </button>

              <button
                type="button"
                className={
                  mode === "company"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setMode("company")
                }
              >
                <FiBriefcase />
                Байгууллагаар
              </button>
            </div>

            <section className="rgMeetingSection">
              <div className="rgMeetingSectionTitle">
                <span>
                  {mode === "event"
                    ? "Эвэнт сонгох"
                    : "Байгууллага сонгох"}
                </span>
              </div>

              {mode === "event" ? (
                <div className="rgMeetingField">
                  <label>
                    Миний эвэнт
                  </label>

                  <select
                    value={
                      selectedEventId
                    }
                    onChange={(event) =>
                      setSelectedEventId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Эвэнт сонгоно уу
                    </option>

                    {myEvents.map(
                      (event) => (
                        <option
                          key={event.id}
                          value={event.id}
                        >
                          {event.title}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ) : (
                <div className="rgMeetingField">
                  <label>
                    Байгууллага
                  </label>

                  <select
                    value={company}
                    onChange={(event) =>
                      setCompany(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Байгууллага сонгоно уу
                    </option>

                    {companies.map(
                      (item) => (
                        <option
                          key={
                            item.id ||
                            item.name
                          }
                          value={
                            item.name
                          }
                        >
                          {item.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </section>

            <section className="rgMeetingSection">
              <div className="rgMeetingPeopleHeader">
                <div>
                  <h3>
                    <FiUsers />
                    Оролцогч сонгох
                  </h3>

                  <p>
                    {selectedEmails.length}
                    {" "}хүн сонгогдсон
                  </p>
                </div>

                {people.length > 0 && (
                  <button
                    type="button"
                    className="rgMeetingSelectAll"
                    onClick={
                      mode === "event"
                        ? selectAllEventPeople
                        : selectAllCompanyPeople
                    }
                  >
                    <FiCheck />

                    {selectedAll
                      ? "Бүгдийг болиулах"
                      : "Бүгдийг сонгох"}
                  </button>
                )}
              </div>

              {selectedEmails.length >
                0 && (
                <div className="rgMeetingSelected">
                  {selectedEmails.map(
                    (email) => {
                      const person =
                        findSelectedPerson(
                          email,
                        );

                      return (
                        <div
                          key={email}
                          className="rgMeetingSelectedChip"
                        >
                          <span>
                            {getInitials(
                              person || {
                                email,
                              },
                            )}
                          </span>

                          <div>
                            <strong>
                              {getDisplayName(
                                person || {
                                  email,
                                },
                              )}
                            </strong>

                            <small>
                              {email}
                            </small>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelected(
                                email,
                              )
                            }
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {(mode === "event" &&
                selectedEventId) ||
              (mode === "company" &&
                company) ? (
                <>
                  <div className="rgMeetingSearch">
                    <FiSearch />

                    <input
                      value={
                        mode === "event"
                          ? eventSearch
                          : companySearch
                      }
                      onChange={(event) => {
                        if (
                          mode === "event"
                        ) {
                          setEventSearch(
                            event.target.value,
                          );
                        } else {
                          setCompanySearch(
                            event.target.value,
                          );
                        }
                      }}
                      placeholder="Нэр эсвэл имэйлээр хайх..."
                    />

                    {(mode === "event"
                      ? eventSearch
                      : companySearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            mode ===
                            "event"
                          ) {
                            setEventSearch(
                              "",
                            );
                          } else {
                            setCompanySearch(
                              "",
                            );
                          }
                        }}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>

                  {loadingPeople ? (
                    <div className="rgMeetingPeopleEmpty">
                      Оролцогчдыг
                      ачаалж байна...
                    </div>
                  ) : (
                    <div className="rgMeetingPeopleGrid">
                      {(mode === "event"
                        ? eventPeopleFiltered
                        : employeesFiltered
                      ).map((person) => {
                        const email =
                          person?.email;

                        const checked =
                          selectedEmails.includes(
                            email,
                          );

                        return (
                          <button
                            type="button"
                            key={
                              person?.id ||
                              email
                            }
                            className={
                              checked
                                ? "rgMeetingPerson active"
                                : "rgMeetingPerson"
                            }
                            onClick={() => {
                              if (
                                mode ===
                                "event"
                              ) {
                                toggleEventPerson(
                                  email,
                                );
                              } else {
                                toggleCompanyPerson(
                                  email,
                                );
                              }
                            }}
                          >
                            <span className="rgMeetingPersonAvatar">
                              {getInitials(
                                person,
                              )}
                            </span>

                            <span className="rgMeetingPersonInfo">
                              <strong>
                                {getDisplayName(
                                  person,
                                )}
                              </strong>

                              <small>
                                {person.email}
                              </small>
                            </span>

                            <span className="rgMeetingPersonCheck">
                              {checked && (
                                <FiCheck />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!loadingPeople &&
                    (mode === "event"
                      ? eventPeopleFiltered
                      : employeesFiltered
                    ).length === 0 && (
                      <div className="rgMeetingPeopleEmpty">
                        Хэрэглэгч
                        олдсонгүй.
                      </div>
                    )}
                </>
              ) : (
                <div className="rgMeetingPeopleEmpty">
                  {mode === "event"
                    ? "Эхлээд эвэнт сонгоно уу."
                    : "Эхлээд байгууллага сонгоно уу."}
                </div>
              )}
            </section>

            <section className="rgMeetingSection">
              <div className="rgMeetingSectionTitle">
                <span>
                  Уулзалтын хугацаа
                </span>
              </div>

              <div className="rgMeetingDateGrid">
                <div className="rgMeetingField">
                  <label>
                    <FiCalendar />
                    Огноо
                  </label>

                  <input
                    type="date"
                    min={today}
                    value={meetingDate}
                    onChange={(event) =>
                      setMeetingDate(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="rgMeetingField">
                  <label>
                    <FiClock />
                    Эхлэх цаг
                  </label>

                  <select
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Сонгох
                    </option>

                    {timeSlots.map(
                      (time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="rgMeetingField">
                  <label>
                    <FiClock />
                    Дуусах цаг
                  </label>

                  <select
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Сонгох
                    </option>

                    {timeSlots.map(
                      (time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section className="rgMeetingSection">
              <div className="rgMeetingField">
                <label>
                  Уулзалтын зорилго
                </label>

                <textarea
                  rows={5}
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value,
                    )
                  }
                  placeholder="Уулзалтын зорилго, хэлэлцэх сэдэв..."
                />
              </div>
            </section>

            {message && (
              <div
                className={`rgMeetingMessage ${
                  message.includes(
                    "амжилттай",
                  )
                    ? "success"
                    : ""
                }`}
              >
                {message}
              </div>
            )}

            <footer className="rgMeetingActions">
              <div>
                <strong>
                  {
                    selectedEmails.length
                  }
                </strong>

                <span>
                  оролцогч сонгосон
                </span>
              </div>

              <button
                type="submit"
                className="rgMeetingSubmit"
                disabled={loading}
              >
                <FiSend />

                {loading
                  ? "Илгээж байна..."
                  : "Хүсэлт илгээх"}
              </button>
            </footer>
          </form>
        </section>
      </main>
    </UserShell>
  );
}