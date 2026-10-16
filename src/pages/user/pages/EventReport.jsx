import { formatDateTime, getInitials, resolveUrl } from "./Event.helpers";

// Extracted from Event.jsx; receives the page state it reads as props.
export default function EventReport({
  participants,
  participantsCount,
  reportEvent,
  setReportEvent,
}) {
  return (
    <div className="myEventReport">
      <div className="reportTopline">
        <button
          type="button"
          className="reportBack"
          onClick={() => setReportEvent(null)}
        >
          ←
        </button>
    
        <div>
          <span className="reportBreadcrumb">
            Миний эвэнтүүд / {reportEvent.title}
          </span>
    
          <h2>Статистик & тайлан</h2>
        </div>
      </div>
    
      <section className="reportEventBar">
        <div className="reportEventCover">
          {reportEvent.image_url ? (
            <img
              src={resolveUrl(reportEvent.image_url)}
              alt={reportEvent.title || "Эвэнт"}
            />
          ) : null}
        </div>
    
        <div className="reportEventInfo">
          <strong>{reportEvent.title || "Нэргүй эвэнт"}</strong>
    
          <span>
            {formatDateTime(reportEvent.start_time)}
    
            {reportEvent.end_time
              ? ` – ${formatDateTime(reportEvent.end_time)}`
              : ""}
          </span>
        </div>
    
        <div className="reportBarActions">
          <button type="button">CSV</button>
    
          <button type="button">Excel</button>
    
          <button type="button" className="primary">
            Тайлан татах
          </button>
        </div>
      </section>
    
      <section className="reportMetrics">
        <article>
          <span>БҮРТГҮҮЛСЭН</span>
    
          <strong>{participantsCount || 0}</strong>
    
          <small>Оролцогч</small>
        </article>
    
        <article>
          <span>ИРСЭН</span>
    
          <strong>
            {participants.filter(
              (p) =>
                p.attended || p.checked_in || p.status === "attended",
            ).length || 0}
          </strong>
    
          <small>Ирц бүртгэгдсэн</small>
        </article>
    
        <article>
          <span>1:1 ZOOM УУЛЗАЛТ</span>
    
          <strong>0</strong>
    
          <small>Уулзалтын тоо</small>
        </article>
    
        <article>
          <span>СЭТГЭЛ ХАНАМЖ</span>
    
          <strong>—</strong>
    
          <small>Үнэлгээ</small>
        </article>
      </section>
    
      <div className="reportMainGrid">
        <section className="reportPanel reportChartPanel">
          <div className="reportPanelHead">
            <div>
              <h3>Өдөр тутмын бүртгэл</h3>
    
              <p>Эвэнтийн бүртгэлийн ерөнхий үзүүлэлт</p>
            </div>
          </div>
    
          <div
            className="fakeBarChart"
            aria-label="Registration chart"
          >
            {[28, 42, 34, 55, 38, 65, 48, 74, 61, 86, 72, 64, 88].map(
              (height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ),
            )}
          </div>
        </section>
    
        <section className="reportPanel">
          <div className="reportPanelHead">
            <div>
              <h3>Бүртгэлээс уулзалт хүртэл</h3>
    
              <p>Нийт бүртгүүлэгчдийн харьцуулалт</p>
            </div>
          </div>
    
          <div className="reportProgressList">
            <div>
              <div>
                <span>Бүртгүүлсэн</span>
    
                <b>{participantsCount || 0}</b>
              </div>
    
              <i>
                <em style={{ width: "100%" }} />
              </i>
            </div>
    
            <div>
              <div>
                <span>Ирсэн</span>
    
                <b>
                  {participants.filter(
                    (p) =>
                      p.attended ||
                      p.checked_in ||
                      p.status === "attended",
                  ).length || 0}
                </b>
              </div>
    
              <i>
                <em style={{ width: "82%" }} />
              </i>
            </div>
    
            <div>
              <div>
                <span>1:1 Zoom уулзалт хийсэн</span>
    
                <b>0</b>
              </div>
    
              <i>
                <em className="cyan" style={{ width: "35%" }} />
              </i>
            </div>
          </div>
        </section>
      </div>
    
      <div className="reportSecondaryGrid">
        <section className="reportPanel">
          <div className="reportPanelHead">
            <div>
              <h3>Оролцогчдын байгууллага</h3>
    
              <p>Бүртгүүлсэн оролцогчдын мэдээлэл</p>
            </div>
          </div>
    
          <div className="reportRows">
            {participants.slice(0, 5).map((person, index) => (
              <div key={person.id || index}>
                <span>
                  {person.organization ||
                    person.company ||
                    "Байгууллага"}
                </span>
    
                <i>
                  <em style={{ width: `${90 - index * 12}%` }} />
                </i>
    
                <b>1</b>
              </div>
            ))}
    
            {!participants.length ? (
              <div className="reportNoData">Өгөгдөл алга</div>
            ) : null}
          </div>
        </section>
    
        <section className="reportPanel">
          <div className="reportPanelHead">
            <div>
              <h3>Бүртгэлийн суваг</h3>
    
              <p>Хаанаас орж ирж бүртгүүлсэн</p>
            </div>
          </div>
    
          <div className="reportRows">
            {[
              ["Шууд холбоос", 92, participantsCount || 0],
    
              ["Registra нүүр", 68, 0],
    
              ["Facebook", 51, 0],
    
              ["И-мэйл урилга", 34, 0],
            ].map(([label, width, count]) => (
              <div key={label}>
                <span>{label}</span>
    
                <i>
                  <em style={{ width: `${width}%` }} />
                </i>
    
                <b>{count}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    
      <section className="reportPanel reportTablePanel">
        <div className="reportPanelHead tableHead">
          <div>
            <h3>Оролцогчдын жагсаалт</h3>
    
            <p>
              Нийт {participantsCount || participants.length || 0}{" "}
              оролцогч
            </p>
          </div>
    
          <button type="button">Жагсаалт татах</button>
        </div>
    
        <div className="reportTableWrap">
          <table>
            <thead>
              <tr>
                <th>ОРОЛЦОГЧ</th>
    
                <th>БАЙГУУЛЛАГА</th>
    
                <th>БҮРТГҮҮЛСЭН</th>
    
                <th>ИРЦ</th>
    
                <th>1:1 УУЛЗАЛТ</th>
              </tr>
            </thead>
    
            <tbody>
              {participants.slice(0, 8).map((person, index) => (
                <tr key={person.id || index}>
                  <td>
                    <span className="participantAvatar">
                      {getInitials(
                        person.name ||
                          person.full_name ||
                          person.email,
                      )}
                    </span>
    
                    {person.name ||
                      person.full_name ||
                      person.email ||
                      "Оролцогч"}
                  </td>
    
                  <td>
                    {person.organization || person.company || "—"}
                  </td>
    
                  <td>
                    {person.created_at
                      ? formatDateTime(person.created_at)
                      : "—"}
                  </td>
    
                  <td>
                    <span
                      className={
                        person.attended ||
                        person.checked_in ||
                        person.status === "attended"
                          ? "attendance yes"
                          : "attendance"
                      }
                    >
                      {person.attended ||
                      person.checked_in ||
                      person.status === "attended"
                        ? "Ирсэн"
                        : "Ирээгүй"}
                    </span>
                  </td>
    
                  <td>—</td>
                </tr>
              ))}
    
              {!participants.length ? (
                <tr>
                  <td colSpan="5" className="reportTableEmpty">
                    Оролцогчийн мэдээлэл алга
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
