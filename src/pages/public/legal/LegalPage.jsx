import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiFileText, FiPrinter, FiTag } from "react-icons/fi";
import Footer from "../../../components/Footer";
import LegalDocument from "./LegalDocument";
import { LEGAL_DOCS } from "./legalContent";
import "./legal.css";

// Full-page view of /terms and /privacy: header, sticky contents with the
// current section, reading progress and print.
export default function LegalPage({ docKey }) {
  const doc = LEGAL_DOCS[docKey];
  const other = docKey === "terms" ? LEGAL_DOCS.privacy : LEGAL_DOCS.terms;
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(doc.sections[0].id);

  useEffect(() => {
    document.title = `${doc.title} · Registra`;
    window.scrollTo({ top: 0 });
    document.body.scrollTo?.({ top: 0 });
  }, [doc]);

  // The public layout scrolls <body>; capture catches either scroller.
  useEffect(() => {
    const update = () => {
      const article = document.querySelector(".lgArticle");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const read = (window.innerHeight - rect.top) / Math.max(rect.height, 1);
      setProgress(Math.round(Math.min(1, Math.max(0, read)) * 100));

      let current = doc.sections[0].id;
      for (const section of doc.sections) {
        const el = document.getElementById(`${doc.key}-${section.id}`);
        if (el && el.getBoundingClientRect().top < 140) current = section.id;
      }
      setActive(current);
    };

    const options = { capture: true, passive: true };
    update();
    document.addEventListener("scroll", update, options);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, options);
      window.removeEventListener("resize", update);
    };
  }, [doc]);

  const goTo = (id) =>
    document.getElementById(`${doc.key}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="riPublicPage">
      <div className="lgProgress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="lgPage">
        <header className="lgHero">
          <div className="lgContainer">
            <Link to="/" className="lgBack">
              <FiArrowLeft /> Нүүр хуудас
            </Link>
            <span className="lgEyebrow">
              <FiFileText /> Эрх зүйн баримт бичиг
            </span>
            <h1>{doc.title}</h1>
            <p>{doc.subtitle}</p>
            <div className="lgMeta">
              <span>
                <FiCalendar /> Хүчин төгөлдөр болсон: {doc.effective}
              </span>
              <span>
                <FiTag /> Хувилбар {doc.version}
              </span>
              <button type="button" onClick={() => window.print()}>
                <FiPrinter /> Хэвлэх
              </button>
            </div>
          </div>
        </header>

        <div className="lgContainer lgLayout">
          <aside className="lgToc" aria-label="Агуулга">
            <div className="lgTocHead">
              <span>Агуулга</span>
              <strong>{progress}%</strong>
            </div>
            <ol>
              {doc.sections.map((section, index) => (
                <li key={section.id} className={active === section.id ? "active" : ""}>
                  <button type="button" onClick={() => goTo(section.id)}>
                    <em>{index + 1}</em>
                    {section.title}
                  </button>
                </li>
              ))}
            </ol>
            <Link to={other.path} className="lgOther">
              {other.title} →
            </Link>
          </aside>

          <article className="lgArticle">
            <LegalDocument doc={doc} />
            <p className="lgClosing">
              Энэхүү {doc.title.toLowerCase()} нь {doc.effectiveText}-өөс эхлэн хүчин төгөлдөр мөрдөгдөнө.
            </p>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
}
