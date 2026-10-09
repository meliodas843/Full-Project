import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  ScanLine,
  Users,
  X,
} from "lucide-react";
import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";

const api = (path) => `${API_BASE}/api/checkin${path}`;
function getToken() {
  return (
    localStorage.getItem("token") || localStorage.getItem("adminToken") || ""
  );
}
function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function getName(person) {
  const name = [person.last_name, person.first_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || person.name || person.email || "Оролцогч";
}
function getInitials(person) {
  const first = String(person.first_name || "").trim();
  const last = String(person.last_name || "").trim();
  if (first || last) {
    return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase();
  }
  return String(person.email || "?")
    .slice(0, 2)
    .toUpperCase();
}
function getCode(person) {
  return (
    person.short_ticket_code ||
    person.display_code ||
    person.ticket_short_code ||
    person.ticket_code ||
    person.code ||
    "—"
  );
}

function getScanCode(person) {
  return person.ticket_code || person.code || "";
}

function formatTicketCode(person) {
  const code = String(getCode(person));
  if (/^HTL-[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(code)) return code.toUpperCase();
  // Keep the original identifier if the backend has not supplied a short code.
  return code;
}
export default function EventCheckin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef("");
  const successTimerRef = useRef(null);
  const participantsRef = useRef([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadAttendance = useCallback(async () => {
    try {
      const response = await fetch(api(`/${eventId}/attendance`), {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.message || "Ирцийн мэдээлэл ачаалж чадсангүй.");
      }
      setData(json);
      participantsRef.current = json.participants || [];
      setError("");
    } catch (err) {
      setError(err.message || "Сүлжээний алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);
  useEffect(() => {
    loadAttendance();
    const timer = setInterval(loadAttendance, 10000);
    return () => clearInterval(timer);
  }, [loadAttendance]);
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) {
      setScanning(false);
      return;
    }
    try {
      const state = scanner.getState();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn("Scanner stop skipped:", err.message);
    }
    try {
      scanner.clear();
    } catch (err) {
      console.warn("Scanner clear skipped:", err.message);
    }
    setScanning(false);
  }, []);
  const verifyCode = useCallback(
    async (rawCode) => {
      const inputCode = String(rawCode || "").trim();
      const matchingParticipant = participantsRef.current.find(
        (person) =>
          formatTicketCode(person).toLowerCase() === inputCode.toLowerCase(),
      );
      const code = matchingParticipant
        ? getScanCode(matchingParticipant)
        : inputCode;
      if (!code || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setResult(null);
      try {
        const response = await fetch(api(`/${eventId}/scan`), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ticket_code: code }),
        });
        const json = await response.json().catch(() => ({}));
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
          successTimerRef.current = null;
        }
        if (response.ok) {
          const participant =
            json.participant ||
            participantsRef.current.find(
              (person) =>
                getScanCode(person) === code || getCode(person) === code,
            );
          setResult({
            status: "success",
            message: "Амжилттай бүртгэгдлээ.",
            participant,
          });
          successTimerRef.current = setTimeout(() => {
            setResult(null);
            successTimerRef.current = null;
          }, 5000);
        } else {
          setResult({
            status: json.status || "invalid",
            message: json.message || "QR кодыг шалгаж чадсангүй.",
            participant: json.participant,
          });
        }
        if (response.ok) {
          setManualCode("");
          await loadAttendance();
        }
      } catch {
        setResult({
          status: "invalid",
          message: "Сүлжээний алдаа гарлаа.",
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId, loadAttendance],
  );
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let scanner = null;
    let startPromise = null;
    let cleanupPromise = null;
    const cleanupScanner = async () => {
      if (cleanupPromise) return cleanupPromise;
      cleanupPromise = (async () => {
        if (startPromise) {
          try {
            await startPromise;
          } catch {}
        }
        if (!scanner) return;
        try {
          const state = scanner.getState();
          if (state === 2 || state === 3) {
            await scanner.stop();
          }
        } catch (err) {
          console.warn("Scanner cleanup:", err.message);
        }
        try {
          scanner.clear();
        } catch {}
        if (scannerRef.current === scanner) {
          scannerRef.current = null;
        }
      })();
      return cleanupPromise;
    };
    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode("registra-qr-reader");
        scannerRef.current = scanner;
        startPromise = scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height, 250);
              return {
                width: size,
                height: size,
              };
            },
          },
          async (decodedText) => {
            if (
              cancelled ||
              busyRef.current ||
              decodedText === lastScanRef.current
            ) {
              return;
            }
            lastScanRef.current = decodedText;
            cancelled = true;
            await cleanupScanner();
            setScanning(false);
            await verifyCode(decodedText);
          },
          () => {},
        );
        await startPromise;
        if (cancelled) {
          await cleanupScanner();
        }
      } catch (err) {
        if (!cancelled) {
          console.error("QR scanner error:", err);
          setError(
            "Камер нээж чадсангүй. HTTPS болон камерын зөвшөөрлийг шалгана уу.",
          );
          setScanning(false);
        }
        await cleanupScanner();
      }
    };
    startScanner();
    return () => {
      cancelled = true;
      void cleanupScanner();
    };
  }, [scanning, verifyCode]);
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const allParticipants = data?.participants || [];
  const checkedIn = allParticipants.filter((person) =>
    Boolean(person.checked_in_at),
  ).length;
  const total = Number(data?.total ?? allParticipants.length);
  const arrived = Number(data?.checked_in ?? checkedIn);
  const remaining = Number(data?.remaining ?? Math.max(total - arrived, 0));
  const attendanceRate = total ? Math.round((arrived / total) * 100) : 0;
  const participants = allParticipants.filter((person) => {
    const text = [
      person.first_name,
      person.last_name,
      person.name,
      person.email,
      person.ticket_code,
      formatTicketCode(person),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase().trim());
    const matchesFilter =
      filter === "all" ||
      (filter === "present" && Boolean(person.checked_in_at)) ||
      (filter === "pending" && !person.checked_in_at);
    return matchesSearch && matchesFilter;
  });
  function exportCSV() {
    const rows = [
      ["Нэр", "Имэйл", "Тасалбарын код", "Төлөв", "Ирсэн цаг"],
      ...participants.map((person) => [
        getName(person),
        person.email || "",
        getCode(person),
        person.checked_in_at ? "Ирсэн" : "Ирээгүй",
        formatTime(person.checked_in_at),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `registra-checkin-${eventId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <UserShell title="QR Check-in">
      <main className="rci-page">
        <header className="rci-heading rci-heading-back-left">
          <button
            type="button"
            className="rgt-backButton"
            onClick={handleBack}
            aria-label="Буцах"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="rci-breadcrumb">
              Миний эвентүүд / {data?.event?.title || "Эвент"} / Check-in
            </div>
            <h1>Ирц бүртгэл · QR Check-in</h1>
          </div>
        </header>
        {error && (
          <div className="rci-error">
            {error}
            <button type="button" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <section className="rci-stats">
          <div className="rci-stat rci-stat-main">
            <div className="rci-stat-label">Ирсэн</div>
            <div className="rci-stat-row">
              <strong>
                {arrived} <small>/ {total}</small>
              </strong>
              <span>{attendanceRate}%</span>
            </div>
            <div className="rci-progress">
              <span style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
            </div>
          </div>
          <div className="rci-stat">
            <div className="rci-stat-label">Хүлээгдэж буй</div>
            <div className="rci-stat-value">{remaining}</div>
            <div className="rci-stat-foot">Ирээгүй оролцогч</div>
          </div>
        </section>
        <div className="rci-columns">
          <section className="rci-panel rci-scannerPanel">
            <div className="rci-panelHeading">
              <h2>QR уншуулах</h2>
              <span className="rci-cameraBadge">
                <span />
                Камер {scanning ? "идэвхтэй" : "идэвхгүй"}
              </span>
            </div>
            <div className="rci-camera">
              {scanning ? (
                <div className="rci-liveCamera">
                  <div id="registra-qr-reader" />
                  <div
                    className="rci-scanBeam rci-scanBeam-animated rci-liveBeam"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div className="rci-cameraPlaceholder rci-cameraPlaceholder-animated">
                  <div className="rci-scanCorners">
                    <ScanLine size={90} strokeWidth={1.2} />
                  </div>
                  <div className="rci-scanBeam rci-scanBeam-animated" />
                  <span>Тасалбарын QR кодыг уншуулна уу</span>
                </div>
              )}
            </div>
            <div className="rci-demoLabel">QR УНШУУЛАХ</div>
            <div className="rci-scanActions">
              <button
                type="button"
                onClick={() => {
                  if (scanning) {
                    setScanning(false);
                  } else {
                    lastScanRef.current = "";
                    setResult(null);
                    setError("");
                    setScanning(true);
                  }
                }}
              >
                <Camera size={15} />
                {scanning ? "Камер хаах" : "Камер нээх"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  lastScanRef.current = "";
                  if (!scanning) setScanning(true);
                }}
              >
                <RefreshCw size={15} />
                Дахин
              </button>
            </div>
            <form
              className="rci-manualForm"
              onSubmit={(event) => {
                event.preventDefault();
                verifyCode(manualCode);
              }}
            >
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Тасалбарын код оруулах"
                aria-label="Тасалбарын код"
              />
              <button disabled={busy || !manualCode.trim()} type="submit">
                {busy ? "Шалгаж байна..." : "Бүртгэх"}
              </button>
            </form>
            {result && (
              <div className={`rci-result ${result.status}`}>
                {result.status === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <X size={18} />
                )}
                <div>
                  <strong>{result.message}</strong>
                  {result.participant && <p>{getName(result.participant)}</p>}
                </div>
              </div>
            )}
          </section>
          <section className="rci-panel rci-attendancePanel">
            <div className="rci-toolbar">
              <div className="rci-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Нэр, байгууллага эсвэл тасалбар"
                />
              </div>
              <div className="rci-filters">
                <button
                  type="button"
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Бүгд
                </button>
                <button
                  type="button"
                  className={filter === "present" ? "active" : ""}
                  onClick={() => setFilter("present")}
                >
                  Ирсэн
                </button>
                <button
                  type="button"
                  className={filter === "pending" ? "active" : ""}
                  onClick={() => setFilter("pending")}
                >
                  Ирэээгүй
                </button>
              </div>
              <button
                type="button"
                className="rci-csvButton"
                onClick={exportCSV}
                title="CSV татах"
              >
                <Download size={15} />
                CSV
              </button>
            </div>
            <div className="rci-tableWrap">
              <table className="rci-table">
                <thead>
                  <tr>
                    <th>ОРОЛЦОГЧ</th>
                    <th>КОД</th>
                    <th>ТӨЛӨВ</th>
                    <th>ҮЙЛДЭЛ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="rci-empty">
                        Мэдээлэл ачаалж байна...
                      </td>
                    </tr>
                  ) : participants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="rci-empty">
                        <Users size={24} />
                        Оролцогч олдсонгүй.
                      </td>
                    </tr>
                  ) : (
                    participants.map((person, index) => {
                      const isPresent = Boolean(person.checked_in_at);
                      return (
                        <tr key={person.user_id || person.email || index}>
                          <td>
                            <div className="rci-person">
                              <div
                                className={`rci-avatar rci-avatar-${index % 5}`}
                              >
                                {getInitials(person)}
                              </div>
                              <div>
                                <strong>{getName(person)}</strong>
                                <small>
                                  {person.organization || person.email || "—"}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="rci-code">
                              {formatTicketCode(person)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`rci-status ${isPresent ? "present" : "pending"}`}
                            >
                              {isPresent ? (
                                <>
                                  Ирсэн
                                  {formatTime(person.checked_in_at) &&
                                    ` · ${formatTime(person.checked_in_at)}`}
                                </>
                              ) : (
                                "Ирээгүй"
                              )}
                            </span>
                          </td>
                          <td>
                            {isPresent ? (
                              <span className="rci-doneButton">
                                <Check size={14} />
                                Бүртгэсэн
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="rci-checkinButton"
                                disabled={busy || !getScanCode(person)}
                                onClick={() => verifyCode(getScanCode(person))}
                              >
                                Check-in
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="rci-tableFooter">
              <span>Нийт {participants.length} оролцогч</span>
              <button type="button" onClick={loadAttendance}>
                <RefreshCw size={14} />
                Шинэчлэх
              </button>
            </div>
          </section>
        </div>
      </main>
    </UserShell>
  );
}
