
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

const api = (path) => `${API_BASE}/api/checkin${path}`;

export default function EventCheckin() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scannerRef = useRef(null);
  const lastScanRef = useRef("");
  const busyRef = useRef(false);

  const token = localStorage.getItem("token");

  const loadAttendance = useCallback(async () => {
    try {
      const response = await fetch(
        api(`/${eventId}/attendance`),
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message);
      }

      setData(json);
      setError("");
    } catch (err) {
      setError(err.message || "Ирц ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  useEffect(() => {
    loadAttendance();
    const timer = setInterval(loadAttendance, 10000);
    return () => clearInterval(timer);
  }, [loadAttendance]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {}

      try {
        scanner.clear();
      } catch {}
    }

    setScanning(false);
  }, []);

  const verifyCode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || "").trim();

      if (!code || busyRef.current) return;

      busyRef.current = true;
      setBusy(true);

      try {
        const response = await fetch(
          api(`/${eventId}/scan`),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ticket_code: code
            })
          }
        );

        const json = await response.json();

        setResult({
          status: json.status || "invalid",
          message: json.message,
          participant: json.participant
        });

        setManualCode("");
        await loadAttendance();
      } catch {
        setResult({
          status: "invalid",
          message: "Сүлжээний алдаа гарлаа."
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId, token, loadAttendance]
  );

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    const start = async () => {
      const scanner = new Html5Qrcode("registra-qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height, 250);
              return { width: size, height: size };
            }
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

            await stopScanner();
            await verifyCode(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setError(
          "Камер нээж чадсангүй. Камерын зөвшөөрөл болон HTTPS холболтыг шалгана уу."
        );
        await stopScanner();
      }
    };

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => {
          try {
            scanner.clear();
          } catch {}
        });
      }
    };
  }, [scanning, stopScanner, verifyCode]);

  const participants = (data?.participants || []).filter((person) => {
    const text = [
      person.first_name,
      person.last_name,
      person.email
    ].join(" ").toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <UserShell title="QR Check-in">
      <div className="checkinPage">
        <div className="checkinTop">
          <button onClick={() => navigate("/user/history")}>
            ← Буцах
          </button>
          <div>
            <small>Миний эвентүүд / Check-in</small>
            <h1>Ирц бүртгэл · QR Check-in</h1>
            <p>{data?.event?.title || "Эвент"}</p>
          </div>
        </div>

        {error && <div className="checkinError">{error}</div>}

        <div className="checkinStats">
          <div>
            <span>Ирсэн</span>
            <strong>{data?.checked_in ?? 0}</strong>
            <small>Бүртгэгдсэн оролцогч</small>
          </div>
          <div>
            <span>Хүлээгдэж буй</span>
            <strong>{data?.remaining ?? 0}</strong>
            <small>Ирээгүй оролцогч</small>
          </div>
          <div>
            <span>Нийт бүртгэл</span>
            <strong>{data?.total ?? 0}</strong>
            <small>Эвентэд нэгдсэн</small>
          </div>
          <div>
            <span>Ирцийн хувь</span>
            <strong>
              {data?.total
                ? Math.round(data.checked_in / data.total * 100)
                : 0}%
            </strong>
            <small>Баталгаажсан ирц</small>
          </div>
        </div>

        <div className="checkinColumns">
          <section className="checkinPanel">
            <h2>QR уншуулах</h2>
            <p>Оролцогчийн тасалбарын QR кодыг уншуулна уу.</p>

            <div className="checkinCamera">
              {scanning ? (
                <div id="registra-qr-reader" />
              ) : (
                <div className="checkinCameraPlaceholder">
                  <div className="checkinScanCorners">
                    <span>▦</span>
                  </div>
                  <p>Камер идэвхгүй байна</p>
                </div>
              )}
            </div>

            <button
              className="checkinPrimary"
              onClick={() => {
                if (scanning) {
                  stopScanner();
                } else {
                  lastScanRef.current = "";
                  setResult(null);
                  setScanning(true);
                }
              }}
            >
              {scanning ? "Камер хаах" : "▣ QR уншуулах"}
            </button>

            <div className="checkinDivider">ЭСВЭЛ</div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                verifyCode(manualCode);
              }}
            >
              <label>Тасалбарын код</label>
              <input
                value={manualCode}
                onChange={(event) =>
                  setManualCode(event.target.value)
                }
                placeholder="RGS-..."
              />
              <button
                className="checkinSecondary"
                disabled={busy || !manualCode.trim()}
              >
                {busy ? "Шалгаж байна..." : "Кодоор бүртгэх"}
              </button>
            </form>

            {result && (
              <div className={`checkinResult ${result.status}`}>
                <strong>
                  {result.status === "success"
                    ? "✓ "
                    : result.status === "duplicate"
                      ? "⚠ "
                      : "✕ "}
                  {result.message}
                </strong>
                {result.participant && (
                  <p>
                    {result.participant.first_name}{" "}
                    {result.participant.last_name}
                  </p>
                )}
                <button
                  onClick={() => {
                    setResult(null);
                    lastScanRef.current = "";
                    setScanning(true);
                  }}
                >
                  Дараагийн QR уншуулах
                </button>
              </div>
            )}
          </section>

          <section className="checkinPanel">
            <div className="checkinListHeader">
              <div>
                <h2>Оролцогчид</h2>
                <p>Ирцийн мэдээлэл автоматаар шинэчлэгдэнэ.</p>
              </div>
              <button onClick={loadAttendance}>↻</button>
            </div>

            <input
              className="checkinSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Нэр, имэйлээр хайх..."
            />

            {loading ? (
              <p>Уншиж байна...</p>
            ) : participants.length === 0 ? (
              <p>Оролцогч олдсонгүй.</p>
            ) : (
              <div className="checkinParticipantList">
                {participants.map((person) => (
                  <div
                    className="checkinPerson"
                    key={person.user_id}
                  >
                    <div className="checkinAvatar">
                      {(person.first_name || "?")[0]}
                    </div>
                    <div className="checkinPersonInfo">
                      <strong>
                        {person.first_name} {person.last_name}
                      </strong>
                      <small>{person.email}</small>
                    </div>
                    <span
                      className={
                        person.checked_in_at
                          ? "checkinPresent"
                          : "checkinPending"
                      }
                    >
                      {person.checked_in_at
                        ? "✓ Ирсэн"
                        : "Хүлээгдэж буй"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </UserShell>
  );
}
