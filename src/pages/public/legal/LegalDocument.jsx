import { SUB_LETTERS, chapterNumber } from "./legalContent";

// Renders one legal document from legalContent.js as a numbered contract:
// "НЭГ. ЕРӨНХИЙ ЗҮЙЛ", clauses 1.1, 1.2 …, sub-points а), б) ….
export default function LegalDocument({ doc, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;

  return (
    <div className="lgDoc">
      {doc.sections.map((section, index) => (
        <section key={section.id} id={`${doc.key}-${section.id}`} className="lgSection">
          <Heading>
            <span>{chapterNumber(index + 1)}.</span>
            {section.title}
          </Heading>
          <ol className="lgClauses">
            {section.clauses.map((clause, clauseIndex) => {
              const text = typeof clause === "string" ? clause : clause.text;
              return (
                <li key={clauseIndex}>
                  <span className="lgNum">
                    {index + 1}.{clauseIndex + 1}.
                  </span>
                  <div>
                    <p>{text}</p>
                    {clause.items ? (
                      <ul className="lgItems">
                        {clause.items.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <span>{SUB_LETTERS[itemIndex]})</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
