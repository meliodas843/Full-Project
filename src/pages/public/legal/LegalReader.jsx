import { useEffect, useRef, useState } from "react";
import { FiPrinter, FiX } from "react-icons/fi";
import LegalDocument from "./LegalDocument";
import { LEGAL_DOCS } from "./legalContent";
import "./legal.css";

// Reading window used on sign-up. The accept button unlocks only after the
// reader has scrolled to the end of the document.
export default function LegalReader({ docKey, alreadyRead, onAccept, onClose }) {
  const doc = LEGAL_DOCS[docKey];
  const bodyRef = useRef(null);
  const [progress, setProgress] = useState(alreadyRead ? 100 : 0);
  const reachedEnd = progress >= 100;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    body.scrollTop = 0;

    const update = () => {
      const max = body.scrollHeight - body.clientHeight;
      // Within 24px of the bottom counts as read; short text is read at once.
      const value = max <= 24 ? 100 : Math.min(100, Math.round((body.scrollTop / (max - 24)) * 100));
      setProgress((prev) => (alreadyRead ? 100 : Math.max(prev, value)));
    };

    update();
    body.addEventListener("scroll", update, { passive: true });
    return () => body.removeEventListener("scroll", update);
  }, [docKey, alreadyRead]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lgModalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lgModal" role="dialog" aria-modal="true" aria-labelledby="lg-modal-title">
        <header className="lgModalHead">
          <div>
            <h2 id="lg-modal-title">{doc.title}</h2>
            <p>
              Хувилбар {doc.version} · Хүчин төгөлдөр: {doc.effective}
            </p>
          </div>
          <div className="lgModalTools">
            <a href={doc.path} target="_blank" rel="noreferrer" title="Шинэ цонхонд нээх / хэвлэх">
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
          <p className="lgLead">{doc.subtitle}</p>
          <LegalDocument doc={doc} headingLevel={3} />
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
