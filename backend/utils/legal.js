// Legal documents a new account must accept, and the record of acceptance.
// Document keys match src/pages/public/legal/legalContent.js.

export const LEGAL_DOCUMENTS = {
  terms: "Үйлчилгээний нөхцөл",
  privacy: "Нууцлалын бодлого",
  organization: "Байгууллагын нэмэлт нөхцөл",
};

const clean = (value) => String(value || "").trim().slice(0, 20);

// Versions sent by the sign-up form, keyed by document. Returns
// { accepted: { terms: "1.1", ... } } or { error } when one is missing.
export function readAcceptances(body, accountType) {
  const accepted = {
    terms: clean(body?.termsVersion),
    privacy: clean(body?.privacyVersion),
  };
  if (accountType === "organization") accepted.organization = clean(body?.organizationTermsVersion);

  const missing = Object.keys(accepted).filter((key) => !accepted[key]);
  if (missing.length) {
    // "бодлого" takes -ыг, "нөхцөл" takes -ийг.
    const suffix = missing.at(-1) === "privacy" ? "-ыг" : "-ийг";
    return {
      error: `${missing.map((key) => LEGAL_DOCUMENTS[key]).join(", ")}${suffix} зөвшөөрөөгүй байна.`,
    };
  }
  return { accepted };
}

// One row per accepted document; rows are never updated, so they stay as
// proof of what was agreed to, when and from where.
export async function recordAcceptances(db, req, { userId, organizationId = null, accepted }) {
  const ip = String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 64) || null;
  const userAgent = String(req.get?.("user-agent") || "").slice(0, 500) || null;
  const rows = Object.entries(accepted).map(([document, version]) => [
    userId,
    organizationId,
    document,
    version,
    ip,
    userAgent,
  ]);

  await db.query(
    `INSERT INTO legal_acceptances (user_id, organization_id, document, version, ip, user_agent)
     VALUES ?`,
    [rows],
  );
}
