
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function formatDate(value) {
  if (!value) return "—";

  const raw = String(value).trim().replace("T", " ").replace(/Z$/, "");
  const [date, time = ""] = raw.split(" ");

  return `${date.replace(/-/g, ".")}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}

function formatStatus(value) {
  if (value === true || value === 1 || value === "1") {
    return true;
  }

  return Boolean(value);
}

export default function EventTicket() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

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
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message || "Тасалбарын мэдээллийг авч чадсангүй."
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

  const checkedIn = formatStatus(ticket?.checked_in_at);

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

    URL.revokeObjectURL(url);
  }

  async function handleDownloadPDF() {
    if (!ticket || downloading) return;

    setDownloading(true);

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
      const image = new Image();

      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = svgUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 700;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas үүсгэж чадсангүй.");

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
        pdf.setFontSize(10);

        const code = String(ticket.ticket_code);
        const codeLines = pdf.splitTextToSize(code, 120);

        pdf.text(codeLines, 74, 147, { align: "center" });

        pdf.setFontSize(11);
        pdf.text(
          checkedIn ? "CHECKED IN" : "REGISTERED",
          74,
          172,
          { align: "center" }
        );

        pdf.save(`registra-ticket-${eventId}.pdf`);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (err) {
      console.error(err);
      setError("PDF татах үед алдаа гарлаа.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <UserShell title="Миний тасалбар">
      <div className="rgt-page">
        <div className="rgt-heading">
          <div>
            <div className="rgt-breadcrumb">
              Нүүр / Миний тасалбарууд
            </div>
            <h1>Миний тасалбар</h1>
          </div>
        </div>

        {loading ? (
          <div className="rgt-state">
            Тасалбарын мэдээллийг ачаалж байна...
          </div>
        ) : error && !ticket ? (
          <div className="rgt-state rgt-error">
            <strong>Тасалбар харуулах боломжгүй</strong>
            <p>{error}</p>
            <button onClick={() => navigate("/user/event")}>
              Эвентүүд рүү буцах
            </button>
          </div>
        ) : ticket ? (
          <div className="rgt-layout">
            <div className="rgt-left">
              <div className="rgt-ticket">
                <div className="rgt-ticketHero">
                  <div className="rgt-brand">
                    <span className="rgt-brandIcon">✦</span>
                    REGISTRA
                  </div>

                  <span className="rgt-heroBadge">
                    {checkedIn ? "Ирц бүртгэгдсэн" : "Хүчинтэй тасалбар"}
                  </span>

                  <h2>{ticket.event_title || "Эвент"}</h2>

                  <div className="rgt-heroMeta">
                    <span>
                      ◷ {formatDate(ticket.start_time)}
                    </span>
                    {ticket.location && (
                      <span>⌖ {ticket.location}</span>
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

                  <div className="rgt-ticketCode">
                    {ticket.ticket_code}
                  </div>

                  <div className="rgt-dashedLine" />

                  <div className="rgt-ticketInfo">
                    <div>
                      <span>Оролцогч</span>
                      <strong>
                        {ticket.attendee_name ||
                          ticket.user_name ||
                          ticket.name ||
                          ticket.attendee_email ||
                          "Бүртгэлтэй хэрэглэгч"}
                      </strong>
                    </div>

                    <div>
                      <span>Тасалбар</span>
                      <strong>Ерөнхий</strong>
                    </div>

                    <div>
                      <span>Ирцийн төлөв</span>
                      <strong>
                        {checkedIn
                          ? "Ирсэн"
                          : "Ирц бүртгэгдээгүй"}
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
                  QR татах
                </button>

                <button
                  type="button"
                  className="rgt-secondaryBtn"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  {downloading ? "Бэлтгэж байна..." : "PDF татах"}
                </button>
              </div>

              <div className="rgt-notice">
                ✧ Үүдэнд энэ QR кодыг үзүүлж, зохион байгуулагчид
                уншуулна уу.
              </div>

              {error && (
                <div className="rgt-inlineError">{error}</div>
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
                      <p>
                        Эвентэд ирэхээсээ өмнө QR кодоо
                        нээж бэлдээрэй.
                      </p>
                    </div>
                  </div>

                  <div className="rgt-step">
                    <span className="rgt-stepNumber">2</span>
                    <div>
                      <strong>Бүртгэлийн ширээнд очих</strong>
                      <p>
                        Зохион байгуулагчид тасалбараа
                        үзүүлнэ.
                      </p>
                    </div>
                  </div>

                  <div className="rgt-step">
                    <span className="rgt-stepNumber">3</span>
                    <div>
                      <strong>Ирцээ баталгаажуулах</strong>
                      <p>
                        QR кодоо уншуулсны дараа ирцийн
                        төлөв шинэчлэгдэнэ.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rgt-panel">
                <div className="rgt-panelTitle">
                  <h3>Ирсэнд нээгдэх боломжууд</h3>
                  <span>Check-in хийсний дараа</span>
                </div>

                <div className="rgt-feature">
                  <span className="rgt-lock">♙</span>
                  <div>
                    <strong>Эвентийн зургийн цомог</strong>
                    <small>Түгжээтэй</small>
                  </div>
                </div>

                <div className="rgt-feature">
                  <span className="rgt-lock">♙</span>
                  <div>
                    <strong>1:1 Zoom уулзалт товлох</strong>
                    <small>Түгжээтэй</small>
                  </div>
                </div>

                <div className="rgt-feature">
                  <span className="rgt-lock">♙</span>
                  <div>
                    <strong>Санал асуулга бөглөх</strong>
                    <small>Түгжээтэй</small>
                  </div>
                </div>

                <div className="rgt-status">
                  <span className="rgt-statusDot" />
                  {checkedIn
                    ? "Ирц баталгаажсан"
                    : "Check-in хийгдээгүй байна"}
                </div>
              </section>

              <section className="rgt-panel rgt-helpPanel">
                <h3>Ирж боломжгүй болсон уу?</h3>
                <p>
                  Эвентэд оролцох боломжгүй болсон бол
                  зохион байгуулагчтай холбогдоно уу.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/user/event")}
                >
                  Эвентүүд рүү буцах
                </button>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </UserShell>
  );
}
