import { useEffect, useRef, useState } from "react";
import { FiPrinter, FiX } from "react-icons/fi";
import LegalDocument from "./LegalDocument";
import { PRIVACY, TERMS } from "./legalContent";
import "./legal.css";

const DOCS = [TERMS, PRIVACY];

// Reading window used on sign-up. Both documents are shown in one scroll
// (Terms, then Privacy Policy); a single accept at the bottom covers both
// and unlocks only after the reader has scrolled to the end.
export default function LegalReader({ startAt = "terms", alreadyRead, onAccept, onClose }) {
  const bodyRef = useRef(null);
  const [progress, setProgress] = useState(alreadyRead ? 100 : 0);
  const [current, setCurrent] = useState(startAt);
  const reachedEnd = progress >= 100;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;

    // Opened from the "Нууцлалын бодлого" link: start at that document.
    const start = body.querySelector(`#lgdoc-${startAt}`);
    body.scrollTop = start && startAt !== "terms" ? start.offsetTop - 8 : 0;

    const update = () => {
      const max = body.scrollHeight - body.clientHeight;
      // Within 24px of the bottom counts as read.
      const value = max <= 24 ? 100 : Math.min(100, Math.round((body.scrollTop / (max - 24)) * 100));
      setProgress((prev) => (alreadyRead ? 100 : Math.max(prev, value)));

      const privacyTop = body.querySelector("#lgdoc-privacy")?.offsetTop ?? Infinity;
      setCurrent(body.scrollTop + 40 >= privacyTop ? "privacy" : "terms");
    };

    update();
    body.addEventListener("scroll", update, { passive: true });
    return () => body.removeEventListener("scroll", update);
  }, [startAt, alreadyRead]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const jumpTo = (key) => {
    const body = bodyRef.current;
    const target = body?.querySelector(`#lgdoc-${key}`);
    if (body && target) body.scrollTo({ top: key === "terms" ? 0 : target.offsetTop - 8, behavior: "smooth" });
  };

  const currentDoc = current === "privacy" ? PRIVACY : TERMS;

  return (
    <div className="lgModalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lgModal" role="dialog" aria-modal="true" aria-labelledby="lg-modal-title">
        <header className="lgModalHead">
          <div>
            <h2 id="lg-modal-title">Үйлчилгээний нөхцөл ба Нууцлалын бодлого</h2>
            <div className="lgModalTabs" role="tablist">
              {DOCS.map((doc) => (
                <button
                  key={doc.key}
                  type="button"
                  role="tab"
                  aria-selected={current === doc.key}
                  className={current === doc.key ? "active" : ""}
                  onClick={() => jumpTo(doc.key)}
                >
                  {doc.title}
                </button>
              ))}
            </div>
          </div>
          <div className="lgModalTools">
            <a href={currentDoc.path} target="_blank" rel="noreferrer" title="Шинэ цонхонд нээх / хэвлэх">
              <FiPrinter />
            </a>
            <button type="button" onClick={onClose} aria-label="Хаах">
              <FiX />
            </button>
          </div>
        </header>

        <div className="lgModalProgress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="lgModalBody" ref={bodyRef} tabIndex={0}>
          {DOCS.map((doc) => (
            <div key={doc.key} id={`lgdoc-${doc.key}`} className="lgModalDoc">
              <h2 className="lgModalDocTitle">{doc.title}</h2>
              <p className="lgLead">
                {doc.subtitle} Хувилбар {doc.version} · Хүчин төгөлдөр: {doc.effective}
              </p>
              <LegalDocument doc={doc} headingLevel={3} />
            </div>
          ))}
        </div>

        <footer className="lgModalFoot">
          <button type="button" className="lgPrimary" disabled={!reachedEnd} onClick={onAccept}>
            Уншиж танилцсан, зөвшөөрч байна
          </button>
        </footer>
      </div>
    </div>
  );
}
