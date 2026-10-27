import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiCreditCard, FiEdit2, FiEye, FiGift, FiInfo } from "react-icons/fi";
import UserShell from "../components/UserShell";
import { apiFetch, getToken } from "../../../lib/api";
import { API_BASE } from "../../../lib/config";
import { BANKS, FEE_STATUS, formatTs, maskAccount, money } from "./payments.helpers";
import "./payments.css";

const EMPTY_FORM = { bank_name: BANKS[0], account_number: "", account_name: "" };

// Organizer payments: the account ticket income is paid to, and the history
// of event publish fees.
export default function Payments() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(undefined);
  const [fees, setFees] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [trial, setTrial] = useState(false);

  const load = useCallback(async () => {
    try {
      const [acc, list, settings] = await Promise.all([
        apiFetch("/api/payments/payout-account"),
        apiFetch("/api/payments/publish-fees"),
        apiFetch("/api/payments/settings").catch(() => null),
      ]);
      setAccount(acc);
      setTrial(Boolean(settings?.trialMode));
      setFees(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      setError(err.message || "Мэдээлэл ачаалж чадсангүй.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit() {
    setForm(account ? { ...account } : EMPTY_FORM);
    setEditing(true);
    setNotice("");
  }

  async function saveAccount(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/payments/payout-account", { method: "PUT", body: form });
      setEditing(false);
      setNotice("Данс хадгалагдлаа.");
      await load();
    } catch (err) {
      setError(err.message || "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  async function openReceipt(fee) {
    try {
      const res = await fetch(`${API_BASE}/api/payments/publish-fees/${fee.id}/receipt`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Баримт олдсонгүй.");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    }
  }

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const since = monthStart.getTime() / 1000;
    return {
      paidThisMonth: fees
        .filter((f) => f.status === "confirmed" && !Number(f.trial) && Number(f.decided_ts) >= since)
        .reduce((sum, f) => sum + Number(f.amount), 0),
      inReview: fees.filter((f) => f.status === "submitted").length,
      unpaid: fees.filter((f) => f.status === "awaiting" || f.status === "rejected").length,
    };
  }, [fees]);

  const shown = filter === "all" ? fees : fees.filter((f) => f.status === filter);

  return (
    <UserShell title="Төлбөр">
      <div className="pfPage">
        <div className="pfHead">
          <div>
            <div className="pfCrumb">Тохиргоо / Төлбөр</div>
            <h1>Төлбөр ба орлого хүлээн авах данс</h1>
          </div>
        </div>

        {trial ? (
          <div className="pfInfo trial">
            <FiGift />
            <p>
              <strong>Туршилтын хугацаа — төлбөр төлөх шаардлагагүй.</strong> Одоогоор эвэнт нийтлэх үнэгүй. Эвэнтийн
              төлбөрийн хуудсанд «Төлбөр төлсөн» товчийг дармагц эвэнт шууд нийтлэгдэнэ.
            </p>
          </div>
        ) : null}

        {error ? <div className="pfAlert error">{error}</div> : null}
        {notice ? <div className="pfAlert ok">{notice}</div> : null}

        <div className="pfKpis">
          <div className="pfCard pfKpi dark">
            <span>Нийтлэх шимтгэл (энэ сар)</span>
            <strong>{money(stats.paidThisMonth)}</strong>
            <small>Баталгаажсан төлбөр</small>
          </div>
          <div className="pfCard pfKpi">
            <span>Шалгагдаж буй</span>
            <strong>{stats.inReview}</strong>
            <small>Супер админ шалгаж байна</small>
          </div>
          <div className="pfCard pfKpi">
            <span>Төлбөр хүлээгдэж буй эвэнт</span>
            <strong>{stats.unpaid}</strong>
            <small>Төлсний дараа нийтлэгдэнэ</small>
          </div>
        </div>

        <section className="pfCard">
          <div className="pfCardHead">
            <div>
              <h2>Орлого хүлээн авах данс</h2>
              <p>Төлбөртэй эвэнтийн тасалбарын орлого энэ дансанд шилжинэ.</p>
            </div>
            {account ? <span className="pfBadge green">Идэвхтэй</span> : null}
          </div>

          {editing ? (
            <form className="pfForm" onSubmit={saveAccount}>
              <label>
                Банк
                <select value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}>
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label>
                Дансны дугаар
                <input
                  inputMode="numeric"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/[^\d]/g, "") })}
                  placeholder="5039482107"
                  required
                />
              </label>
              <label>
                Данс эзэмшигчийн нэр
                <input
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  placeholder="Э. Ануударь"
                  required
                />
              </label>
              <div className="pfActions">
                <button type="button" className="pfGhost" onClick={() => setEditing(false)}>
                  Болих
                </button>
                <button type="submit" className="pfPrimary" disabled={saving}>
                  {saving ? "Хадгалж байна..." : "Хадгалах"}
                </button>
              </div>
            </form>
          ) : account === undefined ? (
            <div className="pfEmpty">Ачаалж байна...</div>
          ) : account ? (
            <div className="pfAccount">
              <span className="pfBankIcon">
                <FiCreditCard />
              </span>
              <div>
                <small>Банк</small>
                <strong>{account.bank_name}</strong>
              </div>
              <div>
                <small>Дансны дугаар</small>
                <strong>{maskAccount(account.account_number)}</strong>
              </div>
              <div>
                <small>Данс эзэмшигч</small>
                <strong>{account.account_name}</strong>
              </div>
              <button type="button" className="pfGhost" onClick={startEdit}>
                <FiEdit2 /> Засах
              </button>
            </div>
          ) : (
            <div className="pfAccountEmpty">
              <p>Дансаа нэмээгүй байна.</p>
              <button type="button" className="pfPrimary" onClick={startEdit}>
                Данс нэмэх
              </button>
            </div>
          )}

          <ol className="pfFlow">
            <li>
              <span>1</span>
              <div>
                <strong>Оролцогч тасалбар авна</strong>
                <small>Төлбөр Registra-ийн дансанд төвлөрнө</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Супер админ шалгана</strong>
                <small>Дүн, гүйлгээний утгыг тулгана</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Танд шилжинэ</strong>
                <small>Энэ дансанд шилжүүлнэ</small>
              </div>
            </li>
          </ol>
        </section>

        <section className="pfCard">
          <div className="pfCardHead">
            <div>
              <h2>Нийтлэх шимтгэлийн түүх</h2>
              <p>Эвэнт бүрийг нийтлэхэд төлсөн шимтгэл.</p>
            </div>
            <div className="pfTabs">
              {[
                ["all", "Бүгд"],
                ["awaiting", "Төлөөгүй"],
                ["submitted", "Шалгагдаж буй"],
                ["confirmed", "Баталгаажсан"],
              ].map(([key, label]) => (
                <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {shown.length ? (
            <div className="pfTableWrap">
              <table className="pfTable">
                <thead>
                  <tr>
                    <th>Огноо</th>
                    <th>Эвэнт</th>
                    <th>Утга</th>
                    <th className="num">Дүн</th>
                    <th>Төлөв</th>
                    <th aria-label="Үйлдэл" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((fee) => (
                    <tr key={fee.id}>
                      <td>{formatTs(fee.submitted_ts || fee.created_ts, false)}</td>
                      <td>
                        <strong>{fee.event_title}</strong>
                        {fee.status === "rejected" && fee.reject_reason ? (
                          <small className="pfReason">{fee.reject_reason}</small>
                        ) : null}
                      </td>
                      <td className="pfMono">{fee.reference}</td>
                      <td className="num">{money(fee.amount)}</td>
                      <td>
                        <span className={`pfBadge ${FEE_STATUS[fee.status]?.tone || ""}`}>
                          {Number(fee.trial) ? "Үнэгүй · туршилт" : FEE_STATUS[fee.status]?.label || fee.status}
                        </span>
                      </td>
                      <td className="pfRowActions">
                        {fee.has_receipt ? (
                          <button type="button" className="pfIcon" title="Баримт" onClick={() => openReceipt(fee)}>
                            <FiEye />
                          </button>
                        ) : null}
                        {fee.status === "awaiting" || fee.status === "rejected" ? (
                          <button
                            type="button"
                            className="pfLink"
                            onClick={() => navigate(`/user/events/${fee.event_id}/payment`)}
                          >
                            Төлөх <FiArrowRight />
                          </button>
                        ) : fee.status === "confirmed" ? (
                          <FiCheckCircle className="pfOk" />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="pfEmpty">
              <FiInfo /> Энд таны эвэнт нийтлэх шимтгэлүүд харагдана.
            </div>
          )}
        </section>
      </div>
    </UserShell>
  );
}
