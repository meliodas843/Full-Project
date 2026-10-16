import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";
import {
  downloadCsv,
  downloadExcel,
  downloadPdf,
  formatDate,
  formatTime,
  getInitials,
  getName,
} from "./EventStatistics.helpers";


export default function EventStatistics() {
  const { id } = useParams();

  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [event, setEvent] = useState(null);

  const [participants, setParticipants] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 5;

  useEffect(() => {
    loadStatistics();
  }, [id]);

  async function loadStatistics() {
    try {
      setLoading(true);

      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Нэвтэрнэ үү.");

        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [eventsResponse, participantsResponse] = await Promise.all([
        fetch(
          `${API_BASE}/api/events/my-joined?includeFinished=1`,

          { headers },
        ),

        fetch(
          `${API_BASE}/api/events/${id}/participants`,

          { headers },
        ),
      ]);

      const eventsData = await eventsResponse

        .json()

        .catch(() => []);

      const participantsData = await participantsResponse

        .json()

        .catch(() => ({}));

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData?.message || "Эвэнтийн мэдээлэл авахад алдаа гарлаа.",
        );
      }

      if (!participantsResponse.ok) {
        throw new Error(
          participantsData?.message ||
            "Оролцогчдын мэдээлэл авахад алдаа гарлаа.",
        );
      }

      const events = Array.isArray(eventsData) ? eventsData : [];

      const selectedEvent = events.find(
        (item) => Number(item.id) === Number(id),
      );

      if (!selectedEvent) {
        throw new Error("Эвэнт олдсонгүй.");
      }

      setEvent(selectedEvent);

      setParticipants(
        Array.isArray(participantsData?.participants)
          ? participantsData.participants
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(err.message || "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return participants;

    return participants.filter((person) => {
      const text = [getName(person), person.email, person.company_name]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      return text.includes(keyword);
    });
  }, [participants, search]);

  const totalPages = Math.max(
    1,

    Math.ceil(filteredParticipants.length / pageSize),
  );

  const paginatedParticipants = useMemo(() => {
    const start = (page - 1) * pageSize;

    return filteredParticipants.slice(
      start,

      start + pageSize,
    );
  }, [filteredParticipants, page]);

  const organizations = useMemo(() => {
    const map = new Map();

    participants.forEach((person) => {
      const organization = String(person.company_name || "").trim() || "Бусад";

      map.set(
        organization,

        (map.get(organization) || 0) + 1,
      );
    });

    return Array.from(map.entries())

      .map(([name, count]) => ({
        name,

        count,
      }))

      .sort((a, b) => b.count - a.count)

      .slice(0, 5);
  }, [participants]);

  const maxOrganization = Math.max(
    1,

    ...organizations.map((item) => item.count),
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <UserShell title="Статистик & тайлан">
        <div className="statisticsState">Мэдээлэл ачаалж байна...</div>
      </UserShell>
    );
  }

  if (error || !event) {
    return (
      <UserShell title="Статистик & тайлан">
        <div className="statisticsState">
          <p>{error || "Эвэнт олдсонгүй."}</p>

          <button type="button" onClick={() => navigate("/user/history")}>
            Буцах
          </button>
        </div>
      </UserShell>
    );
  }

  const registeredCount = Number(event.booked_count) || participants.length;

  const maxParticipants = Number(event.max_participants) || 0;

  const registrationPercent =
    maxParticipants > 0
      ? Math.min(
          100,

          Math.round((registeredCount / maxParticipants) * 100),
        )
      : 0;

  return (
    <UserShell title="Статистик & тайлан">
      <div className="eventStatisticsPage" ref={reportRef}>
        <div className="statisticsTopbar">
          <div className="statisticsTitleGroup">
            <button
              type="button"
              className="statisticsBackButton"
              onClick={() => navigate("/user/history")}
            >
              ←
            </button>

            <div>
              <div className="statisticsBreadcrumb">
                Миний эвэнтүүд / Статистик
              </div>

              <h1>Статистик & тайлан</h1>
            </div>
          </div>
        </div>

        <section className="statisticsEventCard">
          <div className="statisticsEventMain">
            <div className="statisticsEventCover">
              {event.image_url ? (
                <img
                  src={
                    event.image_url.startsWith("http")
                      ? event.image_url
                      : `${API_BASE}${event.image_url}`
                  }
                  alt={event.title}
                />
              ) : (
                <div className="statisticsCoverPlaceholder" />
              )}
            </div>

            <div className="statisticsEventInfo">
              <div className="statisticsEventTitleRow">
                <h2>{event.title}</h2>

                <span className="statisticsEndedBadge">Дууссан</span>
              </div>

              <div className="statisticsEventMeta">
                <span>{formatDate(event.start_time)}</span>

                <span>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="statisticsEventActions"
            data-html2canvas-ignore="true"
          >
            <button
              type="button"
              className="statisticsExportButton"
              onClick={() => downloadCsv(event, participants)}
            >
              ↓ CSV
            </button>

            <button
              type="button"
              className="statisticsExportButton"
              onClick={() => downloadExcel(event, participants)}
            >
              ↓ Excel
            </button>

            <button
              type="button"
              className="statisticsReportButton"
              onClick={() => downloadPdf(event, reportRef.current)}
            >
              ↓ Тайлан PDF
            </button>
          </div>
        </section>

        <div className="statisticsKpiGrid">
          <article className="statisticsKpiCard">
            <div className="statisticsKpiLabel">БҮРТГҮҮЛСЭН</div>

            <div className="statisticsKpiValueRow">
              <strong>{registeredCount}</strong>

              {maxParticipants > 0 ? <span>/ {maxParticipants}</span> : null}
            </div>

            <p>
              {maxParticipants > 0
                ? `${registrationPercent}% бүртгүүлсэн`
                : "Нийт бүртгүүлсэн"}
            </p>
          </article>

          <article className="statisticsKpiCard">
            <div className="statisticsKpiLabel">ОРОЛЦОГЧ</div>

            <div className="statisticsKpiValueRow">
              <strong>{participants.length}</strong>
            </div>

            <p>Бүртгэгдсэн оролцогч</p>
          </article>

          <article className="statisticsKpiCard">
            <div className="statisticsKpiLabel">1:1 ZOOM УУЛЗАЛТ</div>

            <div className="statisticsUnavailable">—</div>

            <p>Өгөгдөл хадгалагдаагүй</p>
          </article>

          <article className="statisticsKpiCard">
            <div className="statisticsKpiLabel">СЭТГЭЛ ХАНАМЖ</div>

            <div className="statisticsUnavailable">—</div>

            <p>Өгөгдөл хадгалагдаагүй</p>
          </article>
        </div>

        <div className="statisticsTwoColumn">
          <section className="statisticsPanel">
            <div className="statisticsPanelHeader">
              <div>
                <h3>Бүртгэлийн төлөв</h3>

                <p>Эвэнтийн бүртгэлийн одоогийн мэдээлэл</p>
              </div>
            </div>

            <div className="statisticsRegistrationOverview">
              <div className="statisticsRegistrationNumber">
                <strong>{registeredCount}</strong>

                {maxParticipants > 0 ? <span>/ {maxParticipants}</span> : null}
              </div>

              <div className="statisticsLargeProgress">
                <div
                  style={{
                    width: `${
                      maxParticipants > 0
                        ? registrationPercent
                        : registeredCount > 0
                          ? 100
                          : 0
                    }%`,
                  }}
                />
              </div>

              <div className="statisticsProgressLabels">
                <span>Бүртгүүлсэн</span>

                <strong>
                  {maxParticipants > 0
                    ? `${registrationPercent}%`
                    : registeredCount}
                </strong>
              </div>
            </div>
          </section>

          <section className="statisticsPanel">
            <div className="statisticsPanelHeader">
              <div>
                <h3>Бүртгэлээс уулзалт хүртэл</h3>

                <p>Одоогоор хадгалагдсан бодит өгөгдөл</p>
              </div>
            </div>

            <div className="statisticsFunnel">
              <div className="statisticsFunnelItem">
                <div className="statisticsFunnelHeader">
                  <span>Бүртгүүлсэн</span>

                  <strong>
                    {registeredCount}

                    {maxParticipants > 0 ? ` · ${registrationPercent}%` : ""}
                  </strong>
                </div>

                <div className="statisticsProgress purple">
                  <div
                    style={{
                      width: `${
                        maxParticipants > 0
                          ? registrationPercent
                          : registeredCount > 0
                            ? 100
                            : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="statisticsFunnelItem">
                <div className="statisticsFunnelHeader">
                  <span>Ирсэн</span>

                  <strong>—</strong>
                </div>

                <div className="statisticsProgress cyan">
                  <div style={{ width: "0%" }} />
                </div>
              </div>

              <div className="statisticsFunnelItem">
                <div className="statisticsFunnelHeader">
                  <span>1:1 Zoom уулзалт хийсэн</span>

                  <strong>—</strong>
                </div>

                <div className="statisticsProgress blue">
                  <div style={{ width: "0%" }} />
                </div>
              </div>

              <p className="statisticsDataNotice">
                Ирц болон Zoom уулзалтын өгөгдөл backend-д одоогоор
                хадгалагдаагүй.
              </p>
            </div>
          </section>
        </div>

        <div className="statisticsTwoColumn">
          <section className="statisticsPanel">
            <div className="statisticsPanelHeader">
              <div>
                <h3>Оролцогчдын байгууллага</h3>

                <p>Бүртгүүлсэн оролцогчдын байгууллага</p>
              </div>
            </div>

            <div className="statisticsOrganizations">
              {organizations.length === 0 ? (
                <div className="statisticsNoData">
                  Байгууллагын мэдээлэл алга
                </div>
              ) : (
                organizations.map((item) => (
                  <div className="statisticsOrganizationRow" key={item.name}>
                    <span>{item.name}</span>

                    <div className="statisticsOrganizationBar">
                      <div
                        style={{
                          width: `${(item.count / maxOrganization) * 100}%`,
                        }}
                      />
                    </div>

                    <strong>{item.count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="statisticsPanel">
            <div className="statisticsPanelHeader">
              <div>
                <h3>Бүртгэлийн суваг</h3>

                <p>Сувгийн мэдээлэл хадгалагдаагүй</p>
              </div>
            </div>

            <div className="statisticsSourceEmpty">
              <div className="statisticsSourceIcon">↗</div>

              <strong>Өгөгдөл алга</strong>

              <span>
                Одоогийн backend бүртгэлийн эх сурвалжийг хадгалдаггүй.
              </span>
            </div>
          </section>
        </div>

        <section className="statisticsPanel statisticsParticipantsPanel">
          <div className="statisticsParticipantsHeader">
            <div>
              <h3>Оролцогчдын жагсаалт</h3>

              <p>Нийт оролцогч: {participants.length}</p>
            </div>

            <div className="statisticsParticipantsActions">
              <div className="statisticsSearch">
                <span>⌕</span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Нэрээр хайх..."
                />
              </div>

              <button
                type="button"
                className="statisticsExportButton"
                onClick={() => downloadCsv(event, participants)}
              >
                ↓ Жагсаалт татах
              </button>
            </div>
          </div>

          <div className="statisticsTableWrapper">
            <table className="statisticsTable">
              <thead>
                <tr>
                  <th>ОРОЛЦОГЧ</th>

                  <th>БАЙГУУЛЛАГА</th>

                  <th>И-МЭЙЛ</th>

                  <th>ТӨЛӨВ</th>
                </tr>
              </thead>

              <tbody>
                {paginatedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="statisticsEmptyCell">
                      Оролцогч олдсонгүй.
                    </td>
                  </tr>
                ) : (
                  paginatedParticipants.map((person) => (
                    <tr key={person.id || person.email}>
                      <td>
                        <div className="statisticsPerson">
                          <div className="statisticsAvatar">
                            {person.avatar_url ? (
                              <img
                                src={
                                  person.avatar_url.startsWith("http")
                                    ? person.avatar_url
                                    : `${API_BASE}${person.avatar_url}`
                                }
                                alt=""
                              />
                            ) : (
                              getInitials(person)
                            )}
                          </div>

                          <strong>{getName(person)}</strong>
                        </div>
                      </td>

                      <td>{person.company_name || "-"}</td>

                      <td>{person.email || "-"}</td>

                      <td>
                        <span className="statisticsRegisteredBadge">
                          Бүртгүүлсэн
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="statisticsPagination">
            <span>
              {filteredParticipants.length === 0
                ? "0"
                : `${(page - 1) * pageSize + 1}-${Math.min(
                    page * pageSize,

                    filteredParticipants.length,
                  )}`}{" "}
              / {filteredParticipants.length}
            </span>

            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Өмнөх
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,

                      current + 1,
                    ),
                  )
                }
              >
                Дараах
              </button>
            </div>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
