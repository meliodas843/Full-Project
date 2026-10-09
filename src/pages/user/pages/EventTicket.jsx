import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileDown,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Ticket,
  X,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function formatDate(value) {
  if (!value) return "—";

  const raw = String(value).trim().replace("T", " ").replace(/Z$/, "");

  const [date, time = ""] = raw.split(" ");

  return `${date.replace(/-/g, ".")}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}

function isCheckedIn(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== false &&
    value !== 0 &&
    value !== "0" &&
    value !== ""
  );
}

// A short, deterministic display identifier.
// The original ticket_code is still used in the QR code.
function shortTicketCode(ticketCode) {
  if (!ticketCode) return "—";

  const raw = String(ticketCode);

  let hash = 2166136261;

  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const chars = (hash >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")
    .slice(-6);

  return `HTL-${chars.slice(0, 3)}-${chars.slice(3)}`;
}

export default function EventTicket() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");

    async function loadTicket() {
      setLoading(true);
      setError("");
      setTicket(null);

      if (!token) {
        setError("Тасалбараа харахын тулд нэвтэрнэ үү.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/checkin/${encodeURIComponent(eventId)}/my-ticket`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message || "Тасалбарын мэдээллийг авч чадсангүй.",
          );
        }

        if (!data?.ticket_code) {
          throw new Error("QR тасалбарын код олдсонгүй.");
        }

        setTicket(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Сүлжээний алдаа гарлаа.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => controller.abort();
  }, [eventId]);

  const checkedIn = isCheckedIn(ticket?.checked_in_at);
  const displayCode = shortTicketCode(ticket?.ticket_code);

  const attendeeName =
    ticket?.attendee_name ||
    ticket?.user_name ||
    ticket?.name ||
    ticket?.attendee_email ||
    "Бүртгэлтэй хэрэглэгч";

  function handleBack() {
    navigate("/user/event");
  }

  function handleDownloadQR() {
    const svg = qrRef.current?.querySelector("svg");

    if (!svg || !ticket?.ticket_code) return;

    const clonedSvg = svg.cloneNode(true);

    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const serialized = new XMLSerializer().serializeToString(clonedSvg);

    const blob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `registra-ticket-${eventId}.svg`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleDownloadPDF() {
    if (!ticket || downloading) return;

    setDownloading(true);
    setActionError("");

    try {
      const { default: jsPDF } = await import("jspdf");
      const svg = qrRef.current?.querySelector("svg");

      if (!svg) throw new Error("QR код олдсонгүй.");

      const clonedSvg = svg.cloneNode(true);

      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const svgString = new XMLSerializer().serializeToString(clonedSvg);

      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });

      const svgUrl = URL.createObjectURL(blob);

      try {
        const image = new Image();

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = svgUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 700;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas үүсгэж чадсангүй.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 700, 700);
        context.drawImage(image, 0, 0, 700, 700);

        const qrImage = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a5",
        });

        pdf.setFillColor(30, 25, 68);
        pdf.rect(0, 0, 148, 42, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("REGISTRA", 14, 20);

        pdf.setFontSize(10);
        pdf.text("EVENT TICKET", 14, 29);

        pdf.addImage(qrImage, "PNG", 34, 53, 80, 80);

        pdf.setTextColor(35, 35, 50);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");

        pdf.text(displayCode, 74, 147, {
          align: "center",
        });

        pdf.setFontSize(11);
        pdf.text(checkedIn ? "CHECKED IN" : "REGISTERED", 74, 172, {
          align: "center",
        });

        pdf.save(`registra-ticket-${eventId}.pdf`);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (err) {
      console.error(err);
      setActionError("PDF татах үед алдаа гарлаа.");
    } finally {
      setDownloading(false);
    }
  }

  function handleCancel() {
    setCancelOpen(false);
    setActionError(
      "Тасалбар цуцлах серверийн үйлдэл хараахан холбогдоогүй байна.",
    );
  }

  function handleTransfer() {
    if (!transferEmail.trim()) {
      setActionError("Шилжүүлэх хэрэглэгчийн имэйл оруулна уу.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(transferEmail.trim())) {
      setActionError("Зөв имэйл хаяг оруулна уу.");
      return;
    }

    setTransferOpen(false);
    setActionError(
      "Тасалбар шилжүүлэх серверийн үйлдэл хараахан холбогдоогүй байна.",
    );
  }

  const features = [
    "Эвентийн зургийн цомог",
    "1:1 Zoom уулзалт товлох",
    "Санал асуулга бөглөх",
  ];

  return (
    <UserShell title="Миний тасалбар">
      <div className="rgt-page">
        <div className="rgt-heading">
          <div>
            <div className="rgt-breadcrumb">Нүүр / Миний тасалбарууд</div>

            <div className="rgt-headingRow">
              <button
                type="button"
                className="rgt-backButton"
                onClick={handleBack}
                aria-label="Буцах"
              >
                <ArrowLeft size={20} />
              </button>

              <h1>Миний тасалбар</h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rgt-state">Тасалбарын мэдээллийг ачаалж байна...</div>
        ) : error && !ticket ? (
          <div className="rgt-state rgt-error">
            <strong>Тасалбар харуулах боломжгүй</strong>
            <p>{error}</p>

            <button type="button" onClick={handleBack}>
              Буцах
            </button>
          </div>
        ) : ticket ? (
          <div className="rgt-layout">
            <div className="rgt-left">
              <div className="rgt-ticket">
                <div className="rgt-ticketHero">
                  <div className="rgt-brand">
                    <LockKeyhole size={15} />
                    <span>REGISTRA</span>
                  </div>

                  <span className="rgt-heroBadge">
                    {checkedIn ? "Ирц бүртгэгдсэн" : "Хүчинтэй тасалбар"}
                  </span>

                  <h2>{ticket.event_title || "Эвент"}</h2>

                  <div className="rgt-heroMeta">
                    <span>
                      <CalendarDays size={13} />
                      {formatDate(ticket.start_time)}
                    </span>

                    {ticket.location && (
                      <span>
                        <MapPin size={13} />
                        {ticket.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rgt-ticketContent">
                  <div className="rgt-qr" ref={qrRef}>
                    <QRCode
                      value={String(ticket.ticket_code)}
                      size={210}
                      level="H"
                      bgColor="#FFFFFF"
                      fgColor="#17152B"
                    />
                  </div>

                  <div className="rgt-ticketCode">{displayCode}</div>

                  <div className="rgt-dashedLine" />

                  <div className="rgt-ticketInfo">
                    <div>
                      <span>Оролцогч</span>
                      <strong>{attendeeName}</strong>
                    </div>

                    <div>
                      <span>Тасалбар</span>
                      <strong>Ерөнхий</strong>
                    </div>

                    <div>
                      <span>Ирцийн төлөв</span>
                      <strong>
                        {checkedIn ? "Ирсэн" : "Ирц бүртгэгдээгүй"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rgt-buttons">
                <button
                  type="button"
                  className="rgt-primaryBtn"
                  onClick={handleDownloadQR}
                >
                  <Download size={15} />
                  QR татах
                </button>

                <button
                  type="button"
                  className="rgt-secondaryBtn"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  <FileDown size={15} />
                  {downloading ? "Бэлтгэж байна..." : "PDF татах"}
                </button>
              </div>

              <div className="rgt-notice">
                <ShieldCheck size={17} />
                <span>
                  Үүдэнд энэ QR кодыг үзүүлж, зохион байгуулагчид уншуулна уу.
                </span>
              </div>

              {actionError && (
                <div className="rgt-inlineError">{actionError}</div>
              )}
            </div>

            <div className="rgt-right">
              <section className="rgt-panel">
                <h3>Ирэхдээ</h3>

                <div className="rgt-steps">
                  <div className="rgt-step">
                    <span className="rgt-stepNumber">1</span>
                    <div>
                      <strong>QR-аа бэлдэх</strong>
                      <p>Эвентэд ирэхээсээ өмнө QR кодоо нээж бэлдээрэй.</p>
                    </div>
                  </div>

                  <div className="rgt-step">
                    <span className="rgt-stepNumber">2</span>
                    <div>
                      <strong>Бүртгэлийн ширээнд очих</strong>
                      <p>Зохион байгуулагчид тасалбараа үзүүлнэ.</p>
                    </div>
                  </div>

                  <div className="rgt-step">
                    <span className="rgt-stepNumber">3</span>
                    <div>
                      <strong>Ирцээ баталгаажуулах</strong>
                      <p>QR кодоо уншуулсны дараа ирцийн төлөв шинэчлэгдэнэ.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rgt-panel">
                <div className="rgt-panelTitle">
                  <h3>Ирсэнд нээгдэх боломжууд</h3>
                  <span>Check-in хийсний дараа</span>
                </div>

                {features.map((feature) => (
                  <div className="rgt-feature" key={feature}>
                    <span className="rgt-lock">
                      <LockKeyhole size={17} />
                    </span>

                    <div>
                      <strong>{feature}</strong>
                      <small>Түгжээтэй</small>
                    </div>
                  </div>
                ))}

                <div className="rgt-status">
                  {checkedIn ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <LockKeyhole size={15} />
                  )}

                  {checkedIn ? "Ирц баталгаажсан" : "Check-in хийгдээгүй байна"}
                </div>
              </section>

              <section className="rgt-panel rgt-helpPanel">
                <div className="rgt-helpContent">
                  <div className="rgt-helpText">
                    <h3>Ирж боломжгүй болсон уу?</h3>
                    <p>
                      Эвентэд оролцох боломжгүй болсон бол тасалбараа цуцлах
                      эсвэл өөр хэрэглэгчид шилжүүлэх хүсэлт гаргаж болно.
                    </p>
                  </div>

                  <div className="rgt-helpActions">
                    <button
                      type="button"
                      className="rgt-transferBtn"
                      onClick={() => {
                        setActionError("");
                        setTransferOpen(true);
                      }}
                    >
                      <ArrowRightLeft size={15} />
                      Шилжүүлэх
                    </button>

                    <button
                      type="button"
                      className="rgt-cancelBtn"
                      onClick={() => {
                        setActionError("");
                        setCancelOpen(true);
                      }}
                    >
                      <X size={15} />
                      Цуцлах
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {cancelOpen && (
          <div className="rgt-modalOverlay" role="presentation">
            <div
              className="rgt-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rgt-cancel-title"
            >
              <div className="rgt-modalIcon">
                <AlertTriangle size={24} />
              </div>

              <h3 id="rgt-cancel-title">Тасалбар цуцлах уу?</h3>

              <p>Та энэ эвентийн бүртгэлээ цуцлахыг хүсэж байна уу?</p>

              <div className="rgt-modalActions">
                <button type="button" onClick={() => setCancelOpen(false)}>
                  Болих
                </button>

                <button type="button" className="danger" onClick={handleCancel}>
                  Цуцлах
                </button>
              </div>
            </div>
          </div>
        )}

        {transferOpen && (
          <div className="rgt-modalOverlay" role="presentation">
            <div
              className="rgt-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rgt-transfer-title"
            >
              <div className="rgt-modalIcon">
                <Ticket size={24} />
              </div>

              <h3 id="rgt-transfer-title">Тасалбар шилжүүлэх</h3>

              <p>Тасалбар шилжүүлэх хэрэглэгчийн имэйл хаягийг оруулна уу.</p>

              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="example@gmail.com"
              />

              <div className="rgt-modalActions">
                <button type="button" onClick={() => setTransferOpen(false)}>
                  Болих
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={handleTransfer}
                >
                  Шилжүүлэх
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserShell>
  );
}
