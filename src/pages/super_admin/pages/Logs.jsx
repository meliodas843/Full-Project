import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiCopy, FiDownload, FiSearch, FiX, FiXCircle } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import { apiFetch, getToken } from "../../../lib/api";
import { API_BASE } from "../../../lib/config";
import { copyText } from "../../../utils/copyText";
import {
  LOG_TYPES,
  LOG_TYPE_LABEL,
  ROLE_LABELS,
  dayLabel,
  describeDevice,
  formatDateTime,
  formatTime,
  fromTs,
  initials,
  shortName,
} from "../adminUtils";

const RANGES = [
  { key: "today", label: "Өнөөдөр" },
  { key: "7", label: "7 хоног" },
  { key: "30", label: "30 хоног" },
];
const STATUSES = [
  { key: "", label: "Бүх төлөв" },
  { key: "ok", label: "Амжилттай" },
  { key: "warn", label: "Анхааруулга" },
  { key: "error", label: "Алдаа" },
];
const TYPE_BADGE = {
  login: "blue",
  create: "green",
  update: "cyan",
  delete: "red",
  decision: "purple",
  system: "",
  error: "red",
};
const BANNER = {
  ok: { icon: FiCheckCircle, text: "Амжилттай" },
  warn: { icon: FiAlertTriangle, text: "Анхааруулга" },
  error: { icon: FiXCircle, text: "Алдаа гарсан" },
};
const LIVE_INTERVAL = 15000;

function rangeQuery(range) {
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return `since=${start.getTime()}`;
  }
  return `days=${range}`;
}

function parseDetails(raw) {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return String(raw);
  }
}

export default function Logs() {
  const [range, setRange] = useState("today");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [copied, setCopied] = useState("");

  // Debounce the search box so typing doesn't fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const params = useMemo(() => {
    const parts = [rangeQuery(range)];
    if (type) parts.push(`type=${type}`);
    if (status) parts.push(`status=${status}`);
    if (search) parts.push(`q=${encodeURIComponent(search)}`);
    return parts.join("&");
  }, [range, type, status, search]);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(`/api/admin/logs?${params}`));
      setError("");
    } catch (err) {
      setError(err.message || "Лог ачаалж чадсангүй.");
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, LIVE_INTERVAL);
    return () => clearInterval(timer);
  }, [live, load]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const selected = rows.find((r) => r.id === selectedId) || null;

  const groups = useMemo(() => {
    const out = [];
    for (const row of rows) {
      const label = dayLabel(fromTs(row.ts));
      const last = out.at(-1);
      if (last && last.label === label) last.rows.push(row);
      else out.push({ label, rows: [row] });
    }
    return out;
  }, [rows]);

  async function downloadCsv() {
    try {
      const response = await fetch(`${API_BASE}/api/admin/logs.csv?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error(`CSV татаж чадсангүй (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `registra-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function copy(label, value) {
    if (await copyText(value)) {
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } else {
      setError("Хуулж чадсангүй.");
    }
  }

  const counts = data?.counts;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label.toLowerCase();

  return (
    <AdminShell
      crumb="Супер админ / Систем"
      title="Лог бүртгэл"
      actions={
        <>
          <button type="button" className="saButton" onClick={downloadCsv}>
            <FiDownload /> CSV
          </button>
          <button
            type="button"
            className={`saButton${live ? " primary" : ""}`}
            onClick={() => setLive(!live)}
            aria-pressed={live}
            title={live ? "15 секунд тутам шинэчилнэ" : "Шууд шинэчлэлт унтарсан"}
          >
            <span className={`saDot${live ? " live" : ""}`} /> Шууд
          </button>
        </>
      }
    >
      {error ? <div className="saError">{error}</div> : null}

      <div className="saLogSummary">
        <span>
          <strong>{counts?.total ?? 0}</strong> үйлдэл {rangeLabel}
        </span>
        <span className="red">
          <strong>{counts?.errors ?? 0}</strong> алдаа
        </span>
        <span className="amber">
          <strong>{counts?.warnings ?? 0}</strong> анхааруулга
        </span>
        <span>
          Хадгалах хугацаа <strong>{data?.retentionDays ?? 365} хоног</strong>
        </span>
      </div>

      <div className="saLogLayout">
        <section className="saCard">
          <div className="saLogTools">
            <div>
              <div className="saChips">
                <button type="button" className={`saChip${type === "" ? " active" : ""}`} onClick={() => setType("")}>
                  Бүгд <em>{counts?.total ?? 0}</em>
                </button>
                {LOG_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`saChip${type === t.key ? " active" : ""}`}
                    onClick={() => setType(t.key)}
                  >
                    {t.label} <em>{counts?.byType?.[t.key] ?? 0}</em>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="saSearch">
                <FiSearch />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Хэрэглэгч, үйлдэл, IP, Request ID..."
                  aria-label="Лог хайх"
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select className="saInput" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Төлөв" style={{ width: "auto" }}>
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="saSegment">
                  {RANGES.map((r) => (
                    <button key={r.key} type="button" className={range === r.key ? "active" : ""} onClick={() => setRange(r.key)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {data && !rows.length ? (
            <div className="saEmpty">Энэ шүүлтүүрт тохирох бүртгэл алга.</div>
          ) : (
            <div className="saTableWrap">
              <table className="saTable">
                <thead>
                  <tr>
                    <th>Цаг</th>
                    <th>Хэн</th>
                    <th>Төрөл</th>
                    <th>Үйлдэл · объект</th>
                    <th>IP · төхөөрөмж</th>
                    <th aria-label="Төлөв" />
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.label}>
                      <tr className="saGroupRow">
                        <td colSpan={6}>
                          {group.label} · {group.rows.length}
                        </td>
                      </tr>
                      {group.rows.map((row) => {
                        const isSystem = !row.user_id && !row.user_email;
                        return (
                          <tr
                            key={row.id}
                            className={`clickable${row.id === selectedId ? " selected" : ""}`}
                            onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                          >
                            <td className="saMono">{formatTime(fromTs(row.ts), true)}</td>
                            <td>
                              <div className="saPersonCell">
                                <div className={`saAvatar${isSystem ? " system" : ""}`}>
                                  {isSystem ? "SYS" : initials(row.user_name || row.user_email)}
                                </div>
                                <div className="saCell2">
                                  <strong>{isSystem ? "Систем" : shortName(row.user_name, row.user_email)}</strong>
                                  <span>{isSystem ? "cron" : ROLE_LABELS[row.user_role] || row.user_role || "—"}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`saBadge ${TYPE_BADGE[row.type] || ""}`}>{LOG_TYPE_LABEL[row.type] || row.type}</span>
                            </td>
                            <td>
                              <div className="saCell2">
                                <strong>
                                  {row.action}
                                  {Number(row.removed) ? <em className="saRemoved">Устгагдсан</em> : null}
                                </strong>
                                <span>{[row.target, row.target_detail].filter(Boolean).join(" · ") || "—"}</span>
                              </div>
                            </td>
                            <td>
                              <div className="saCell2">
                                <strong className="saMono">{row.ip || "—"}</strong>
                                <span>{describeDevice(row.user_agent)}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`saDot ${row.status}`} title={BANNER[row.status]?.text} />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="saCard saDetail">
          {selected ? (
            <LogDetail row={selected} onClose={() => setSelectedId(null)} onCopy={copy} copied={copied} />
          ) : (
            <div className="saEmpty">Дэлгэрэнгүйг харахын тулд мөр сонгоно уу.</div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function LogDetail({ row, onClose, onCopy, copied }) {
  const banner = BANNER[row.status] || BANNER.ok;
  const BannerIcon = banner.icon;
  const details = parseDetails(row.details);
  const who = row.user_name || row.user_email ? `${row.user_name || ""} ${row.user_email ? `(${row.user_email})` : ""}`.trim() : "Систем";

  return (
    <>
      <button type="button" className="saCloseButton" onClick={onClose} aria-label="Хаах">
        <FiX />
      </button>
      <span className={`saBadge ${TYPE_BADGE[row.type] || ""}`}>{LOG_TYPE_LABEL[row.type] || row.type}</span>
      <h3>{row.action}</h3>
      {Number(row.removed) ? <div className="saDetailSub">Энэ зүйл дараа нь устгагдсан тул «Үүсгэсэн» жагсаалтад харагдахгүй.</div> : null}
      <div className="saDetailSub">{[row.target, row.target_detail].filter(Boolean).join(" · ") || "—"}</div>

      <div className={`saDetailBanner ${row.status}`}>
        <BannerIcon /> {banner.text}
      </div>

      <dl className="saDl">
        <dt>Хэн</dt>
        <dd>{who}</dd>
        <dt>Эрх</dt>
        <dd>{ROLE_LABELS[row.user_role] || row.user_role || "—"}</dd>
        <dt>Хэзээ</dt>
        <dd className="saMono">{formatDateTime(fromTs(row.ts))}</dd>
        <dt>IP хаяг</dt>
        <dd className="saMono">{row.ip || "—"}</dd>
        <dt>Төхөөрөмж</dt>
        <dd title={row.user_agent || ""}>{describeDevice(row.user_agent)}</dd>
        <dt>Request ID</dt>
        <dd className="saMono">{row.request_id || "—"}</dd>
      </dl>

      {details ? (
        <>
          <div className="saLabel">Өөрчлөлт</div>
          <pre className="saCode">{details}</pre>
        </>
      ) : null}

      <div className="saDetailButtons">
        <button type="button" className="saButton" disabled={!row.request_id} onClick={() => onCopy("req", row.request_id)}>
          <FiCopy /> {copied === "req" ? "Хуулсан" : "Request ID"}
        </button>
        <button type="button" className="saButton" disabled={!row.ip} onClick={() => onCopy("ip", row.ip)}>
          <FiCopy /> {copied === "ip" ? "Хуулсан" : "IP хуулах"}
        </button>
      </div>
    </>
  );
}
