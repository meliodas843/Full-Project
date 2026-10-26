import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { FiBarChart2, FiCamera, FiCheck, FiCheckSquare, FiMaximize, FiVideo } from "react-icons/fi";
import "./homeLifecycle.css";

const ZOOM_SLOTS = ["10:00", "11:30", "14:00", "16:30"];
const BARS = [30, 45, 38, 60, 74, 95, 66];
const COVERS = ["cloud", "ai", "devops"];

// The selected Zoom slot moves along every couple of seconds, unless the
// visitor prefers reduced motion.
function useCycle(length, ms) {
  const [index, setIndex] = useState(1);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), ms);
    return () => clearInterval(timer);
  }, [length, ms]);
  return index;
}

// "Бүртгэлээс уулзалт хүртэл": what the platform covers, as a bento grid.
export default function HomeLifecycle() {
  const slot = useCycle(ZOOM_SLOTS.length, 2200);
  // A real, scannable code: it opens the public events list.
  const qrValue = `${window.location.origin}/events`;

  return (
    <section className="riSection riLifeSection" id="lifecycle">
      <div className="riContainer">
        <div className="riSectionHead riRevealUp" data-ri-reveal>
          <div className="riPill">НЭГ ПЛАТФОРМ</div>
          <h2>
            Бүртгэлээс уулзалт хүртэл —
            <br />
            <span className="riLifeGradient">эвэнтийн бүх мөчлөг нэг дор</span>
          </h2>
        </div>

        <div className="riLifeGrid">
          <article className="riLifeCard wide ticket riRevealUp" data-ri-reveal>
            <span className="riLifeBlob" aria-hidden="true" />
            <span className="riLifeIcon violet">
              <FiCheckSquare />
            </span>
            <h3>Бүртгэл ба QR тасалбар</h3>
            <p>Нэг товшилтоор бүртгүүлж, хувийн QR тасалбараа шууд аваарай.</p>

            <div className="riLifeTicket">
              <div className="riLifeTicketTop">
                <strong>Tech Summit 2026</strong>
                <span>11.12 · 09:00</span>
              </div>
              <div className="riLifeTicketPerf" aria-hidden="true" />
              <div className="riLifeTicketBottom">
                <div className="riLifeQr" title="Эвэнтүүдийг үзэх">
                  <QRCode value={qrValue} size={64} level="M" bgColor="#ffffff" fgColor="#14162a" />
                </div>
                <div>
                  <strong>Оролцогч #0248</strong>
                  <span className="riLifeOk">
                    <i /> Бүртгэгдсэн
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="riLifeCard wide zoom riRevealUp" data-ri-reveal style={{ "--ri-delay": "90ms" }}>
            <span className="riLifeIcon cyan">
              <FiVideo />
            </span>
            <h3>Эвэнтийн дараах 1:1 Zoom уулзалт</h3>
            <p>Оролцогчоос сонгож хүсэлт илгээнэ. Зөвшөөрмөгц Zoom холбоос автоматаар үүснэ.</p>
            <div className="riLifeZoomRow" aria-hidden="true">
              <div className="riLifeAvatars">
                <span>БО</span>
                <span>ЭА</span>
              </div>
              <div className="riLifeSlots">
                {ZOOM_SLOTS.map((time, i) => (
                  <span key={time} className={i === slot ? "active" : ""}>
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="riLifeCard riRevealUp" data-ri-reveal>
            <span className="riLifeIcon cyan">
              <FiMaximize />
            </span>
            <h3>Хурдан check-in</h3>
            <p>Үүдэнд QR уншуулахад ирц шууд бүртгэгдэнэ.</p>
            <div className="riLifeScan" aria-hidden="true">
              <div className="riLifeFrame">
                <i />
                <i />
                <i />
                <i />
                <div className="riLifeFrameQr">
                  <QRCode value={qrValue} size={52} level="L" bgColor="transparent" fgColor="currentColor" />
                </div>
                <span className="riLifeScanLine" />
              </div>
              <div className="riLifeBadge">
                <FiCheck /> Ирц бүртгэгдлээ
              </div>
            </div>
          </article>

          <article className="riLifeCard riRevealUp" data-ri-reveal style={{ "--ri-delay": "90ms" }}>
            <span className="riLifeIcon violet">
              <FiBarChart2 />
            </span>
            <h3>Статистик ба тайлан</h3>
            <p>Ирцийн график, PDF · Excel · CSV тайлан.</p>
            <div className="riLifeKpi" aria-hidden="true">
              <div>
                <strong>248</strong>
                <span>оролцогч</span>
              </div>
              <em>▲ 18%</em>
            </div>
            <div className="riLifeBars" aria-hidden="true">
              {BARS.map((h, i) => (
                <span key={i} className={i < 3 ? "light" : ""} style={{ height: `${h}%`, "--i": i }} />
              ))}
            </div>
          </article>

          <article className="riLifeCard riRevealUp" data-ri-reveal style={{ "--ri-delay": "180ms" }}>
            <span className="riLifeIcon coral">
              <FiCamera />
            </span>
            <h3>Эвэнтийн зургийн цомог</h3>
            <p>Зургуудаа нэг дор хадгалж, хуваалцана.</p>
            <div className="riLifeFan" aria-hidden="true">
              {COVERS.map((name) => (
                <img key={name} src={`/registra-default-images/event-covers/event-cover-${name}.svg`} alt="" />
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
