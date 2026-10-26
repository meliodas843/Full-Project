import { FiBarChart2, FiCamera, FiCheckCircle, FiCheckSquare, FiVideo } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import "./homeSections.css";

const ZOOM_SLOTS = ["10:00", "11:30", "14:00", "16:30"];
const BARS = [32, 44, 38, 58, 72, 90, 64];
const COVERS = ["cloud", "ai", "devops"];

// "Бүртгэлээс уулзалт хүртэл": what the platform covers, as a bento grid.
export default function HomeLifecycle() {
  return (
    <section className="riSection riLifeSection" id="lifecycle">
      <div className="riContainer">
        <div className="riSectionHead riRevealUp" data-ri-reveal>
          <div className="riPill">НЭГ ПЛАТФОРМ</div>
          <h2>
            Бүртгэлээс уулзалт хүртэл —
            <br />
            эвэнтийн бүх мөчлөг нэг дор
          </h2>
        </div>

        <div className="riLifeGrid">
          <article className="riLifeCard wide soft riRevealUp" data-ri-reveal>
            <div>
              <span className="riLifeIcon">
                <FiCheckSquare />
              </span>
              <h3>Бүртгэл ба QR тасалбар</h3>
              <p>Нэг товшилтоор бүртгүүлж, хувийн QR тасалбараа шууд аваарай. Тасалбар таны бүртгэлд хадгалагдана.</p>
            </div>
            <div className="riLifeTicket" aria-hidden="true">
              <BsQrCode />
              <div>
                <strong>Workshop</strong>
                <span>Бүртгэгдсэн</span>
              </div>
            </div>
          </article>

          <article
            className="riLifeCard wide dark riRevealUp"
            data-ri-reveal
            style={{ "--ri-delay": "90ms" }}
          >
            <span className="riLifeIcon">
              <FiVideo />
            </span>
            <h3>Эвэнтийн дараах 1:1 Zoom уулзалт</h3>
            <p>
              Эвэнтэд оролцсон хүмүүсээс сонгож уулзалтын хүсэлт илгээнэ. Тэр зөвшөөрмөгц Zoom холбоос автоматаар
              үүснэ.
            </p>
            <div className="riLifeSlots" aria-hidden="true">
              {ZOOM_SLOTS.map((slot, i) => (
                <span key={slot} className={i === 1 ? "active" : ""}>
                  {slot}
                </span>
              ))}
            </div>
          </article>

          <article className="riLifeCard cyan riRevealUp" data-ri-reveal>
            <span className="riLifeIcon">
              <FiCheckCircle />
            </span>
            <h3>Хурдан check-in</h3>
            <p>Үүдэнд QR кодыг уншуулахад ирц шууд бүртгэгдэнэ.</p>
            <div className="riLifeBig">
              1 <small>уншуулалт</small>
            </div>
          </article>

          <article className="riLifeCard riRevealUp" data-ri-reveal style={{ "--ri-delay": "90ms" }}>
            <span className="riLifeIcon">
              <FiBarChart2 />
            </span>
            <h3>Статистик ба тайлан</h3>
            <p>Бүртгэл, ирцийн статистикийг графикаар харж, PDF, Excel, CSV тайлан татаж авна.</p>
            <div className="riLifeBars" aria-hidden="true">
              {BARS.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </article>

          <article className="riLifeCard riRevealUp" data-ri-reveal style={{ "--ri-delay": "180ms" }}>
            <span className="riLifeIcon">
              <FiCamera />
            </span>
            <h3>Эвэнтийн зургийн цомог</h3>
            <p>Эвэнтийн зургуудаа нэг дор хадгалж, оролцогчидтойгоо хуваалцана.</p>
            <div className="riLifePhotos" aria-hidden="true">
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
