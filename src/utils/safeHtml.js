import DOMPurify from "dompurify";

// Event descriptions and news bodies come from users and are rendered as HTML,
// so strip scripts, event handlers and javascript: links before rendering.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(String(html ?? ""), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  });
}
