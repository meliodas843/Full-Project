import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiFileText,
  FiInfo,
  FiSend,
  FiUpload,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import { apiFetch } from "../../../lib/api";
import { getImageSrc } from "../../../lib/config";
import { copyText } from "../../../utils/copyText";
import eventFallback from "../../../assets/event.webp";
import { FEE_STATUS, formatTs, maskAccount, money } from "./payments.helpers";
import "./payments.css";

const MAX_RECEIPT = 5 * 1024 * 1024;

function formatEventDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Төлбөр ба нийтлэх": the organizer pays the publish fee by bank transfer
// and tells us; a super admin confirms and the event is published.
export default function EventPayment() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [fee, setFee] = useState(null);
  const [bank, setBank] = useState(null);
  const [payout, setPayout] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [feeData, bankData, payoutData] = await Promise.all([
        apiFetch(`/api/payments/publish-fees/event/${eventId}`),
        apiFetch("/api/payments/settings"),
        apiFetch("/api/payments/payout-account"),
      ]);
      setFee(feeData);
      setBank(bankData);
      setPayout(payoutData);
      setError("");
    } catch (err) {
      setError(err.message || "Төлбөрийн мэдээлэл ачаалж чадсангүй.");
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(key, value) {
    if (await copyText(value)) {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    }
  }

  function pickReceipt(file) {
    if (!file) return;
    if (file.size > MAX_RECEIPT) return setError("Файл 5MB-аас ихгүй байх ёстой.");
    if (!/^image\/(png|jpe?g|webp)$|^application\/pdf$/.test(file.type)) {
      return setError("PNG, JPG эсвэл PDF файл оруулна уу.");
    }
    setError("");
    setReceipt(file);
  }

  async function submit() {
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("paid_amount", String(fee.amount));
      if (receipt) fd.append("receipt", receipt);
      const data = await apiFetch(`/api/payments/publish-fees/${fee.id}/submit`, { method: "POST", body: fd });
      setReceipt(null);
      setNotice(data?.message || "Илгээгдлээ.");
      await load();
    } catch (err) {
      setError(err.message || "Илгээж чадсангүй.");
    } finally {
      setSending(false);
    }
  }

  const status = fee?.status;
  const canPay = status === "awaiting" || status === "rejected";

  const copyRow = (key, label, value, display = value) => (
    <div className="pfRow">
      <span>{label}</span>
      <strong className={key === "ref" ? "pfRef" : ""}>{display}</strong>
      <button type="button" onClick={() => copy(key, value)} aria-label={`${label} хуулах`} title="Хуулах">
        {copied === key ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  );

  return (
    <UserShell title="Төлбөр ба нийтлэх">
      <div className="pfPage">
        <div className="pfHead">
          <div>
            <div className="pfCrumb">
              <Link to="/user/history">Миний эвэнтүүд</Link> / Төлбөр ба нийтлэх
            </div>
            <h1>Төлбөр ба нийтлэх</h1>
          </div>
          <button type="button" className="pfGhost" onClick={() => navigate("/user/history")}>
            <FiArrowLeft /> Миний эвэнтүүд
          </button>
        </div>

        {error ? <div className="pfAlert error">{error}</div> : null}

        {!fee && !error ? <div className="pfEmpty">Ачаалж байна...</div> : null}

        {fee ? (
          <>
            <div className="pfInfo">
              <FiInfo />
              <p>
                <strong>Эвэнт нийтлэх шимтгэл — {money(fee.amount)}.</strong> Шимтгэлийг доорх дансанд шилжүүлсний
                дараа супер админ шалгаж баталгаажуулмагц таны эвэнт нийтэд харагдана.
              </p>
            </div>

            <div className="pfLayout">
              <section className="pfCard">
                {status === "confirmed" ? (
                  <div className="pfState green">
                    <FiCheckCircle />
                    <div>
                      <strong>Төлбөр баталгаажсан. Эвэнт нийтлэгдлээ.</strong>
                      <span>{formatTs(fee.decided_ts)}-д баталгаажсан.</span>
                    </div>
                  </div>
                ) : status === "submitted" ? (
                  <div className="pfState blue">
                    <FiClock />
                    <div>
                      <strong>Төлбөр шалгагдаж байна</strong>
                      <span>
                        {formatTs(fee.submitted_ts)}-д илгээсэн. Супер админ ихэвчлэн {bank?.reviewSlaHours || 4} цагийн
                        дотор шалгадаг.
                      </span>
                    </div>
                  </div>
                ) : status === "rejected" ? (
                  <div className="pfState red">
                    <FiXCircle />
                    <div>
                      <strong>Төлбөр татгалзагдсан</strong>
                      <span>Шалтгаан: {fee.reject_reason || "—"}. Засаад дахин илгээнэ үү.</span>
                    </div>
                  </div>
                ) : null}

                <div className="pfCardHead">
                  <div>
                    <h2>Шимтгэл төлөх</h2>
                    <p>Банкны аппаар доорх дансанд шилжүүлнэ үү.</p>
                  </div>
                  <strong className="pfAmount">{money(fee.amount)}</strong>
                </div>

                {bank?.accountNumber ? (
                  <div className="pfBank">
                    {copyRow("bank", "Банк", bank.bankName, bank.bankName || "—")}
                    {copyRow("acc", "Дансны дугаар", bank.accountNumber)}
                    {copyRow("name", "Данс эзэмшигч", bank.accountName, bank.accountName || "—")}
                    {copyRow("amount", "Дүн", String(Math.round(Number(fee.amount))), money(fee.amount))}
                    {copyRow("ref", "Гүйлгээний утга", fee.reference)}
                  </div>
                ) : (
                  <div className="pfAlert error">Төлбөр хүлээн авах данс тохируулагдаагүй байна. Супер админтай холбогдоно уу.</div>
                )}

                <ol className="pfSteps">
                  <li>
                    <span>1</span>Банкны аппаараа дээрх дансанд <b>{money(fee.amount)}</b> шилжүүлнэ.
                  </li>
                  <li>
                    <span>2</span>Гүйлгээний утгад <b>{fee.reference}</b> кодыг бичнэ.
                  </li>
                  <li>
                    <span>3</span>Төлсний дараа доорх товчийг дарж баталгаажуулалт илгээнэ.
                  </li>
                </ol>

                <div className="pfAlert warn">
                  <FiAlertTriangle />
                  <span>
                    Гүйлгээний утгад <b>{fee.reference}</b> кодыг заавал бичнэ үү. Код байхгүй эсвэл дүн зөрүүтэй бол
                    баталгаажуулалт удаашрах эсвэл татгалзагдаж болно.
                  </span>
                </div>

                {canPay ? (
                  <>
                    <button type="button" className="pfUpload" onClick={() => fileInput.current?.click()}>
                      <FiUpload />
                      <div>
                        <strong>{receipt ? receipt.name : "Гүйлгээний баримт хавсаргах (заавал биш)"}</strong>
                        <span>Банкны апп-ын screenshot · PNG, JPG, PDF · 5MB хүртэл — баталгаажуулалтыг хурдасгана</span>
                      </div>
                      {receipt ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="pfUploadClear"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceipt(null);
                          }}
                          aria-label="Баримт хасах"
                        >
                          <FiX />
                        </span>
                      ) : null}
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => {
                        pickReceipt(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />

                    <div className="pfActions">
                      <button type="button" className="pfGhost" onClick={() => navigate("/user/history")}>
                        Дараа төлөх
                      </button>
                      <button
                        type="button"
                        className="pfPrimary"
                        disabled={sending || !bank?.accountNumber}
                        onClick={submit}
                      >
                        <FiSend />
                        {sending ? "Илгээж байна..." : "Төлбөр төлсөн — баталгаажуулалт илгээх"}
                      </button>
                    </div>
                  </>
                ) : null}

                {notice ? <div className="pfAlert ok">{notice}</div> : null}
              </section>

              <aside className="pfSide">
                <section className="pfCard pfEvent">
                  <img
                    src={fee.event_image ? getImageSrc(fee.event_image, eventFallback) : eventFallback}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = eventFallback;
                    }}
                  />
                  <div>
                    <span className={`pfBadge ${FEE_STATUS[status]?.tone || ""}`}>
                      {status === "confirmed" ? "Нийтлэгдсэн" : FEE_STATUS[status]?.label}
                    </span>
                    <strong>{fee.event_title}</strong>
                    <small>
                      <FiCalendar /> {formatEventDate(fee.event_start)}
                    </small>
                  </div>
                </section>

                <section className="pfCard">
                  <div className="pfMiniHead">
                    <h3>Тасалбарын орлого</h3>
                    <Link to="/user/payments">{payout ? "Солих" : "Нэмэх"}</Link>
                  </div>
                  {payout ? (
                    <div className="pfPayout">
                      <FiCheckCircle />
                      <div>
                        <strong>
                          {payout.bank_name} {maskAccount(payout.account_number)}
                        </strong>
                        <span>{payout.account_name}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="pfMuted">
                      Тасалбарын орлого хүлээн авах дансаа нэмээгүй байна. Төлбөртэй тасалбар зарахаас өмнө нэмнэ үү.
                    </p>
                  )}
                </section>

                <section className="pfCard">
                  <h3 className="pfMiniTitle">Төлбөрийн задаргаа</h3>
                  <div className="pfLine">
                    <span>Эвэнт нийтлэх шимтгэл</span>
                    <span>{money(fee.amount)}</span>
                  </div>
                  <div className="pfLine total">
                    <span>Нийт</span>
                    <strong>{money(fee.amount)}</strong>
                  </div>
                  <div className="pfLine muted">
                    <span>
                      <FiFileText /> Гүйлгээний утга
                    </span>
                    <span>{fee.reference}</span>
                  </div>
                  {bank?.accountNumber ? (
                    <div className="pfLine muted">
                      <span>Хүлээн авах данс</span>
                      <span>
                        {bank.bankName} {maskAccount(bank.accountNumber)}
                      </span>
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </UserShell>
  );
}
