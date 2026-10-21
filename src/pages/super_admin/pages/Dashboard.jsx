import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiDownload, FiX } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { getImageSrc } from "../../../lib/config";
import {
  LOG_TYPE_LABEL,
  downloadText,
  formatTime,
  fromTs,
  initials,
  shortName,
  timeAgo,
} from "../adminUtils";

const RANGES = [7, 30, 90];
const SERIES = [
  { key: "users", label: "Хэрэглэгч", unit: "шинэ хэрэглэгч" },
  { key: "bookings", label: "Эвэнт", unit: "эвэнтийн бүртгэл" },
];
const number = (n) => Number(n || 0).toLocaleString("en-US");
const money = (n) => `₮${Math.round(Number(n || 0)).toLocaleString("en-US")}`;

function Change({ value, days }) {
  const v = Number(value || 0);
  return (
    <small>
      <span className={v >= 0 ? "saUp" : "saDown"}>
        {v >= 0 ? "+" : ""}
        {v}%
      </span>{" "}
      өмнөх {days} хоногоос
    </small>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState("users");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);
  const [busyOrg, setBusyOrg] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      // Minutes east of UTC, so the chart's days follow the viewer's clock.
      const tz = -new Date().getTimezoneOffset();
      setData(await apiFetch(`/api/admin/dashboard?days=${days}&tz=${tz}`));
      setLoadedAt(new Date());
    } catch (err) {
      setError(err.message || "Мэдээлэл ачаалж чадсангүй.");
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id, decision) {
    setBusyOrg(id);
    try {
      await apiFetch(`/api/admin/organizations/${id}/review`, { method: "PATCH", body: { decision } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOrg(null);
    }
  }

  function exportReport() {
    if (!data) return;
    const k = data.kpis;
    const rows = [
      ["Үзүүлэлт", "Нийт", `Сүүлийн ${data.days} хоног`],
      ["Хэрэглэгч", k.users.total, k.users.current],
      ["Ашиг (₮)", k.profit.total, k.profit.current],
      ["Эвэнтийн бүртгэл", k.bookings.total, k.bookings.current],
      ["Эвэнт", k.events.total, k.events.current],
      ["Идэвхтэй эвэнт", k.events.active, ""],
      ["Байгууллага", k.organizations.total, k.organizations.current],
      [],
      ["Өдөр", "Шинэ хэрэглэгч", "Эвэнтийн бүртгэл"],
      ...data.daily.map((d) => [d.day, d.users, d.bookings]),
      [],
      ["Шилдэг эвэнт", "Бүртгэл", "Дээд тоо"],
      ...data.topEvents.map((e) => [e.title, e.booked, e.max_participants || ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadText(`registra-tailan-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + csv);
  }

  const k = data?.kpis;
  const activeSeries = SERIES.find((x) => x.key === series);
  const values = (data?.daily || []).map((d) => ({ day: d.day, total: Number(d[series] || 0) }));
  const maxDaily = Math.max(1, ...values.map((d) => d.total));
  const dailyTotal = values.reduce((sum, d) => sum + d.total, 0);
  const categoryTotal = (data?.categories || []).reduce((sum, c) => sum + c.total, 0);

  return (
    <AdminShell
      crumb="Супер админ"
      title="Хянах самбар"
      actions={
        <>
          {loadedAt ? <span className="saCrumb">Сүүлд шинэчлэгдсэн {formatTime(loadedAt)}</span> : null}
          <button type="button" className="saButton" onClick={exportReport} disabled={!data}>
            <FiDownload /> Тайлан татах
          </button>
        </>
      }
    >
      {error ? <div className="saError">{error}</div> : null}

      <div className="saGrid saKpis">
        <div className="saCard saKpi">
          <span>Шинэ хэрэглэгч · {days} хоног</span>
          <strong>{number(k?.users.current)}</strong>
          {k ? <Change value={k.users.change} days={days} /> : null}
        </div>
        <div className="saCard saKpi">
          <span>Эвэнтийн бүртгэл</span>
          <strong>{number(k?.bookings.total)}</strong>
          {k ? <Change value={k.bookings.change} days={days} /> : null}
        </div>
        <div className="saCard saKpi">
          <span>Идэвхтэй эвэнт</span>
          <strong>{number(k?.events.active)}</strong>
          {k ? (
            <small>
              <span className="saUp">+{number(k.events.current)}</span> шинэ, сүүлийн {days} хоногт
            </small>
          ) : null}
        </div>
        <div className="saCard saKpi">
          <span>Ашиг · {days} хоног</span>
          <strong>{money(k?.profit.current)}</strong>
          {k ? <Change value={k.profit.change} days={days} /> : null}
        </div>
      </div>

      <div className="saGrid saDashGrid">
        <section className="saCard saCardPad">
          <div className="saCardHead">
            <div>
              <h2>Өдөр тутмын бүртгэл</h2>
              <p>
                Нийт {number(dailyTotal)} {activeSeries.unit} · сүүлийн {days} хоног
              </p>
            </div>
            <div className="saChartControls">
              <div className="saSegment">
                {SERIES.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    className={series === x.key ? "active" : ""}
                    onClick={() => setSeries(x.key)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
              <div className="saSegment dark">
                {RANGES.map((r) => (
                  <button key={r} type="button" className={days === r ? "active" : ""} onClick={() => setDays(r)}>
                    {r} хоног
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="saChart" role="img" aria-label={`Өдөр тутмын ${activeSeries.unit}`}>
            {values.map((d) => (
              <div
                key={d.day}
                className={d.total ? "" : "zero"}
                style={{ height: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}
                title={`${d.day}: ${d.total}`}
              />
            ))}
          </div>
          <div className="saChartAxis">
            <span>{data?.daily?.[0]?.day.slice(5).replace("-", ".")}</span>
            <span>{data?.daily?.[Math.floor((data?.daily?.length || 1) / 2)]?.day.slice(5).replace("-", ".")}</span>
            <span>{data?.daily?.at(-1)?.day.slice(5).replace("-", ".")}</span>
          </div>
        </section>

        <section className="saCard saCardPad">
          <div className="saCardHead">
            <div>
              <h2>Хүлээгдэж буй</h2>
              <p>Баталгаажуулахыг хүлээж буй байгууллагууд</p>
            </div>
            {k?.organizations.pending ? <span className="saBadge amber">{k.organizations.pending}</span> : null}
          </div>

          {data && !data.pendingOrganizations.length ? (
            <div className="saEmpty">Хүлээгдэж буй хүсэлт алга.</div>
          ) : (
            <div className="saList">
              {(data?.pendingOrganizations || []).map((org) => (
                <div className="saListItem" key={org.id}>
                  <div className="saOrgIcon">
                    {org.logo_url ? <img src={getImageSrc(org.logo_url)} alt="" /> : initials(org.name)}
                  </div>
                  <div className="saCell2">
                    <strong>{org.name}</strong>
                    <span>
                      {org.industry || "Байгууллага"} · {timeAgo(fromTs(org.created_ts))}
                    </span>
                  </div>
                  <div className="saActions">
                    <button
                      type="button"
                      className="danger"
                      title="Татгалзах"
                      aria-label={`${org.name} татгалзах`}
                      disabled={busyOrg === org.id}
                      onClick={() => review(org.id, "reject")}
                    >
                      <FiX />
                    </button>
                    <button
                      type="button"
                      className="on"
                      title="Батлах"
                      aria-label={`${org.name} батлах`}
                      disabled={busyOrg === org.id}
                      onClick={() => review(org.id, "approve")}
                    >
                      <FiCheck />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="saGrid saDashBottom">
        <section className="saCard">
          <div className="saCardHead saCardPad" style={{ marginBottom: 0, paddingBottom: 6 }}>
            <h2>Шилдэг эвэнтүүд</h2>
          </div>
          {data && !data.topEvents.length ? (
            <div className="saEmpty">Идэвхтэй эвэнт алга.</div>
          ) : (
            <div className="saTableWrap">
              <table className="saTable">
                <thead>
                  <tr>
                    <th>Эвэнт</th>
                    <th className="num">Бүртгэл</th>
                    <th className="num">Дүүргэлт</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topEvents || []).map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="saCell2">
                          <strong>{e.title}</strong>
                          <span>{e.organization_name || "—"}</span>
                        </div>
                      </td>
                      <td className="num">{number(e.booked)}</td>
                      <td className="num">
                        {e.max_participants ? `${Math.round((e.booked / e.max_participants) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="saCard saCardPad">
          <div className="saCardHead">
            <div>
              <h2>Ангилал</h2>
              <p>Сүүлийн {days} хоногт үүссэн эвэнт</p>
            </div>
          </div>
          {data && !data.categories.length ? (
            <div className="saEmpty">Энэ хугацаанд эвэнт үүсээгүй.</div>
          ) : (
            <div className="saList">
              {(data?.categories || []).map((c) => {
                const pct = categoryTotal ? Math.round((c.total / categoryTotal) * 1000) / 10 : 0;
                return (
                  <div className="saBarRow" key={c.name}>
                    <span>{c.name}</span>
                    <div className="saBarTrack">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                    <strong className="saMono">{pct}%</strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="saCard saCardPad">
          <div className="saCardHead">
            <h2>Сүүлийн үйлдлүүд</h2>
            <Link to="/super-admin/logs" className="saCrumb">
              Бүгд →
            </Link>
          </div>
          {data && !data.recent.length ? (
            <div className="saEmpty">Одоогоор бүртгэл алга.</div>
          ) : (
            <ul className="saFeed">
              {(data?.recent || []).map((r) => (
                <li key={r.id} className={r.status}>
                  {shortName(r.user_name, r.user_email)} · {r.action}
                  {r.target ? ` · ${r.target}` : ""}
                  <small>
                    {LOG_TYPE_LABEL[r.type]} · {timeAgo(fromTs(r.ts))}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
