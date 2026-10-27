import { useEffect, useId, useState } from "react";
import { FiMinus, FiPlus, FiSend } from "react-icons/fi";
import { API_BASE } from "../../lib/config";
import { SUPPORT_EMAIL } from "../../lib/contact";
import "./homeFaq.css";

const money = (n) => `₮${Number(n || 0).toLocaleString("en-US")}`;

// The fee answers follow the live settings from Super admin → Тохиргоо:
// `fee` is null while loading or if the request fails.
function buildFaq(fee) {
  const trial = Boolean(fee?.required && fee.trialMode);

  const feeText = !fee
    ? "Эвэнт бүрийг нийтлэхэд нэг удаагийн үйлчилгээний шимтгэл төлнө. Эвэнт үүсгэсний дараа гарч ирэх дансны дугаар руу шилжүүлээд «Төлбөр төлсөн» товчийг дарна."
    : trial
      ? `Одоогоор туршилтын хугацаа тул эвэнт нийтлэх үнэгүй. Туршилт дууссаны дараа эвэнт бүрт ${money(fee.amount)} үйлчилгээний шимтгэл төлнө.`
      : fee.required
        ? `Хувь хүн болон байгууллага эвэнт нийтлэх бүрт ${money(fee.amount)} үйлчилгээний шимтгэл төлнө. Эвэнт үүсгэсний дараа гарч ирэх дансны дугаар руу шилжүүлээд «Төлбөр төлсөн» товчийг дарна.`
        : "Одоогоор эвэнт нийтлэх үнэгүй. Эвэнтээ үүсгэхэд л хангалттай.";

  const publishText =
    fee && !fee.required
      ? "Эвэнтээ үүсгэмэгц шууд нийтэд харагдана."
      : trial
        ? "Туршилтын хугацаанд төлбөрийн хуудсан дээрх «Төлбөр төлсөн» товчийг дармагц шууд нийтэд харагдана."
        : `Төлбөрийг супер админ шалгаж баталгаажуулмагц нийтлэгдэнэ — ихэвчлэн ${fee?.reviewSlaHours || 4} цагийн дотор. Түүнээс өмнө эвэнт зөвхөн танд «Миний эвэнтүүд» хэсэгт харагдана.`;

  return [
    {
      q: "Оролцогчоор бүртгүүлэхэд төлбөртэй юу?",
      a: "Үгүй. Registra-д бүртгүүлэх болон эвэнтэд оролцохоор бүртгүүлэх нь үнэгүй.",
    },
    { q: "Эвэнт нийтлэхэд хэдэн төгрөг вэ?", a: feeText },
    {
      q: "Эвэнт маань хэзээ нийтэд харагдах вэ?",
      a: `${publishText} Хаалттай эвэнт зөвхөн урилгын холбоосоор нээгдэнэ.`,
    },
    {
      q: "Тасалбарын орлогыг хэзээ авах вэ?",
      a: "Одоогоор эвэнтэд оролцох нь үнэгүй тул тасалбарын орлого үүсэхгүй. Төлбөртэй тасалбар нэмэгдэхэд орлогыг «Тохиргоо → Төлбөр» хэсэгт бүртгэсэн дансанд тань шилжүүлнэ.",
    },
    {
      q: "1:1 Zoom уулзалт хэрхэн ажилладаг вэ?",
      a: "Календар хэсгийн «Уулзалт зохион байгуулах»-аас эвэнт эсвэл байгууллагын хүнийг сонгож уулзалтын хүсэлт илгээнэ. Тэр зөвшөөрмөгц Zoom холбоос автоматаар үүснэ.",
    },
    {
      q: "QR тасалбараа хаанаас олох вэ?",
      a: "Эвэнтэд бүртгүүлсний дараа тухайн эвэнтийн хуудсан дээрх «QR код харах» товчийг дарна. Эвэнтийн өдөр зохион байгуулагч энэ кодыг уншуулж ирц бүртгэнэ.",
    },
  ];
}

export default function HomeFaq() {
  const baseId = useId();
  const [fee, setFee] = useState(null);
  const [open, setOpen] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/payments/publish-fee`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setFee(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const items = buildFaq(fee);

  return (
    <section className="riSection riFaqSection" id="faq">
      <div className="riContainer riFaqLayout">
        <div className="riFaqIntro riRevealUp" data-ri-reveal>
          <div className="riPill">ТҮГЭЭМЭЛ АСУУЛТ</div>
          <h2>Асуулт байна уу?</h2>
          <p>Хариулт олдохгүй бол бидэнтэй холбогдоорой.</p>
          <a className="riFaqHelp" href={`mailto:${SUPPORT_EMAIL}`}>
            <FiSend /> Тусламж авах
          </a>
        </div>

        <div className="riFaqList riRevealUp" data-ri-reveal style={{ "--ri-delay": "90ms" }}>
          {items.map((item, index) => {
            const isOpen = open === index;
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-button-${index}`;
            return (
              <div className={`riFaqItem${isOpen ? " open" : ""}`} key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <i aria-hidden="true">{isOpen ? <FiMinus /> : <FiPlus />}</i>
                  </button>
                </h3>
                <div className="riFaqAnswer" id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
