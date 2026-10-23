import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiDownload, FiEye, FiSearch, FiSettings, FiX } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { apiFetch, getToken } from "../../../lib/api";
import { API_BASE } from "../../../lib/config";
import { PENDING_PAYMENTS_EVENT, formatDateTime, fromTs } from "../adminUtils";

const TABS = [
  { key: "submitted", label: "Баталгаажуулах" },
  { key: "awaiting", label: "Төлөөгүй" },
  { key: "confirmed", label: "Баталгаажсан" },
  { key: "rejected", label: "Татгалзсан" },
];

const STATUS_BADGE = {
  awaiting: ["amber", "Төлөөгүй"],
  submitted: ["blue", "Шалгах"],
  confirmed: ["green", "Баталгаажсан"],
  rejected: ["red", "Татгалзсан"],
};

const REJECT_REASONS = ["Гүйлгээ дансанд ороогүй", "Дүн дутуу", "Гүйлгээний утга буруу", "Баримт тодорхойгүй"];

const money = (n) => `₮${Math.round(Number(n || 0)).toLocaleString("en-US")}`;

// How the organizer's stated amount compares with the fee.
function matchInfo(row) {
  if (row.paid_amount === null || row.paid_amount === undefined) return ["", "Дүн оруулаагүй"];
  const diff = Number(row.paid_amount) - Number(row.amount);
  if (diff === 0) return ["green", "Дүн таарсан"];
  return ["red", diff < 0 ? `Дутуу ${money(-diff)}` : `Илүү ${money(diff)}`];
}

async function openReceipt(id) {
  const res = await fetch(`${API_BASE}/api/admin/payments/publish-fees/${id}/receipt`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Баримт олдсонгүй.");
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function Payments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("submitted");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: tab });
      if (search) params.set("q", search);
      const next = await apiFetch(`/api/admin/payments/publish-fees?${params}`);
      setData(next);
      setError("");
      // Keep the sidebar badge in step with what this page shows.
      window.dispatchEvent(new CustomEvent(PENDING_PAYMENTS_EVENT, { detail: Number(next?.stats?.submitted || 0) }));
    } catch (err) {
      setError(err.message || "Ачаалж чадсангүй.");
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirm(row) {
    if (!window.confirm(`${row.reference} — ${money(row.amount)} төлбөрийг баталгаажуулж, «${row.event_title}» эвэнтийг нийтлэх үү?`)) {
      return;
    }
    setBusy(row.id);
    try {
      const res = await apiFetch(`/api/admin/payments/publish-fees/${row.id}/confirm`, { method: "POST" });
      showToast(res?.message || "Баталгаажлаа.");
      await load();
    } catch (err) {
      showToast(err.message || "Баталгаажуулж чадсангүй.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setBusy(rejecting.id);
    try {
      const res = await apiFetch(`/api/admin/payments/publish-fees/${rejecting.id}/reject`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      showToast(res?.message || "Татгалзлаа.");
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      showToast(err.message || "Татгалзаж чадсангүй.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function viewReceipt(row) {
    try {
      await openReceipt(row.id);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function downloadCsv() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/payments/publish-fees.csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Тайлан татаж чадсангүй.");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `registra-publish-fees-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  const stats = data?.stats || {};
  const rows = data?.rows || [];
  const sla = data?.reviewSlaHours || 4;
  const decidable = (row) => row.status !== "confirmed";

  return (
    <AdminShell
      crumb="Супер админ / Төлбөр"
      title="Төлбөр баталгаажуулах"
      actions={
        <>
          <label className="saSearch">
            <FiSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Код, эвэнт, төлөгч..."
              aria-label="Төлбөр хайх"
            />
          </label>
          <button type="button" className="saButton" onClick={() => navigate("/super-admin/settings")}>
            <FiSettings /> Данс ба шимтгэл
          </button>
          <button type="button" className="saButton" onClick={downloadCsv}>
            <FiDownload /> Тайлан
          </button>
        </>
      }
    >
      <Toast toast={toast} onClose={hideToast} />
      {error ? <div className="saError">{error}</div> : null}

      <div className="saGrid saKpis">
        <div className="saCard saKpi">
          <span>Баталгаажуулах шимтгэл</span>
          <strong>{stats.submitted ?? 0}</strong>
          <small>шалгаж, шийдвэр гаргах</small>
        </div>
        <div className="saCard saKpi">
          <span>Өнөөдөр баталгаажсан</span>
          <strong>{stats.confirmed_today ?? 0}</strong>
          <small>эвэнт нийтлэгдсэн</small>
        </div>
        <div className="saCard saKpi">
          <span>Энэ сарын шимтгэлийн орлого</span>
          <strong>{money(stats.month_total)}</strong>
          <small>баталгаажсан төлбөр</small>
        </div>
        <div className="saCard saKpi">
          <span>Хугацаа хэтэрсэн</span>
          <strong style={{ color: stats.overdue ? "var(--sa-red)" : undefined }}>{stats.overdue ?? 0}</strong>
          <small>{sla} цагаас удаан хүлээж буй</small>
        </div>
      </div>

      <section className="saCard">
        <div className="saToolbar">
          <div className="saChips">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`saChip${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === "submitted" || t.key === "awaiting" ? <em>{stats[t.key] ?? 0}</em> : null}
              </button>
            ))}
          </div>
          <span className="saCrumb">Банкны хуулгатай дүн, гүйлгээний утгыг тулгаад баталгаажуулна уу.</span>
        </div>

        {data && !rows.length ? (
          <div className="saEmpty">
            {tab === "submitted" ? "Баталгаажуулах төлбөр алга." : "Энэ ангилалд төлбөр алга."}
          </div>
        ) : (
          <div className="saTableWrap">
            <table className="saTable">
              <thead>
                <tr>
                  <th>Эвэнт</th>
                  <th>Төлөгч</th>
                  <th>Утга</th>
                  <th className="num">Дүн</th>
                  <th>Тулгалт</th>
                  <th className="num">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const [tone, label] = matchInfo(row);
                  const waitedHours = row.submitted_ts ? (Date.now() / 1000 - Number(row.submitted_ts)) / 3600 : 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="saCell2">
                          <strong>{row.event_title}</strong>
                          <span>
                            {row.submitted_ts
                              ? `Илгээсэн ${formatDateTime(fromTs(row.submitted_ts))}`
                              : `Үүсгэсэн ${formatDateTime(fromTs(row.created_ts))}`}
                            {row.status === "submitted" && waitedHours > sla ? (
                              <b style={{ color: "var(--sa-red)" }}> · хугацаа хэтэрсэн</b>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="saCell2">
                          <strong>{row.payer_name || row.payer_email}</strong>
                          <span>{row.organization_name || "Хувь хүн"}</span>
                        </div>
                      </td>
                      <td className="saMono">{row.reference}</td>
                      <td className="num">{money(row.amount)}</td>
                      <td>
                        {row.status === "submitted" ? (
                          <span className={`saBadge ${tone}`}>{label}</span>
                        ) : (
                          <div className="saCell2">
                            <span className={`saBadge ${STATUS_BADGE[row.status]?.[0] || ""}`}>
                              {STATUS_BADGE[row.status]?.[1]}
                            </span>
                            {row.decided_ts ? (
                              <span>
                                {row.decided_by_name || ""} · {formatDateTime(fromTs(row.decided_ts))}
                              </span>
                            ) : null}
                            {row.reject_reason ? <span style={{ color: "var(--sa-red)" }}>{row.reject_reason}</span> : null}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="saActions">
                          {row.has_receipt ? (
                            <button type="button" title="Баримт харах" aria-label="Баримт харах" onClick={() => viewReceipt(row)}>
                              <FiEye />
                            </button>
                          ) : null}
                          {decidable(row) ? (
                            <>
                              {row.status !== "rejected" ? (
                                <button
                                  type="button"
                                  className="danger"
                                  title="Татгалзах"
                                  aria-label="Татгалзах"
                                  disabled={busy === row.id}
                                  onClick={() => {
                                    setRejecting(row);
                                    setReason("");
                                  }}
                                >
                                  <FiX />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="on"
                                title="Баталгаажуулах"
                                aria-label="Баталгаажуулах"
                                disabled={busy === row.id}
                                onClick={() => confirm(row)}
                              >
                                <FiCheck />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data?.recent?.length ? (
        <section className="saCard saCardPad" style={{ marginTop: 18 }}>
          <div className="saCardHead">
            <h2>Сүүлд шийдвэрлэсэн</h2>
          </div>
          <ul className="saFeed">
            {data.recent.map((r) => (
              <li key={r.id} className={r.status === "rejected" ? "error" : ""}>
                <span className={`saBadge ${STATUS_BADGE[r.status]?.[0] || ""}`}>{STATUS_BADGE[r.status]?.[1]}</span>{" "}
                <span className="saMono">{r.reference}</span> · {r.event_title} · {money(r.amount)}
                <small>
                  {r.decided_by_name || "Админ"} · {formatDateTime(fromTs(r.decided_ts))}
                  {r.reject_reason ? ` · ${r.reject_reason}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rejecting ? (
        <div className="saModalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && setRejecting(null)}>
          <div className="saCard saModal" role="dialog" aria-modal="true" aria-label="Төлбөр татгалзах" style={{ maxWidth: 480 }}>
            <button type="button" className="saCloseButton" onClick={() => setRejecting(null)} aria-label="Хаах">
              <FiX />
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Төлбөр татгалзах</h2>
            <p className="saCrumb" style={{ margin: "0 0 14px" }}>
              {rejecting.reference} · {rejecting.event_title}. Зохион байгуулагч шалтгааныг хараад дахин илгээх боломжтой.
            </p>
            <div className="saChips" style={{ marginBottom: 10 }}>
              {REJECT_REASONS.map((r) => (
                <button key={r} type="button" className={`saChip${reason === r ? " active" : ""}`} onClick={() => setReason(r)}>
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="saTextarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              placeholder="Татгалзсан шалтгаан"
              aria-label="Татгалзсан шалтгаан"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="saButton" onClick={() => setRejecting(null)}>
                Болих
              </button>
              <button
                type="button"
                className="saButton danger"
                disabled={!reason.trim() || busy === rejecting.id}
                onClick={reject}
              >
                Татгалзах
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
