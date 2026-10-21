// Renders one legal document (sections, paragraphs, lists) from legalContent.js.
export default function LegalDocument({ doc, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;

  return (
    <div className="lgDoc">
      {doc.sections.map((section, index) => (
        <section key={section.id} id={`${doc.key}-${section.id}`} className="lgSection">
          <Heading>
            <span>{index + 1}.</span>
            {section.title}
          </Heading>
          {section.body.map((block, blockIndex) =>
            block.list ? (
              <ul key={blockIndex}>
                {block.list.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <span className="lgNum">
                      {index + 1}.{itemIndex + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p key={blockIndex}>{block.p}</p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
