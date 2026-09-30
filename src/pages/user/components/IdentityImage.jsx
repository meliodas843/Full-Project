import { FiBriefcase, FiUser } from "react-icons/fi";

const USER_THEMES = [
  ["#6C4CF5", "#8B5CF6"],
  ["#2563EB", "#06B6D4"],
  ["#7C3AED", "#EC4899"],
  ["#0F766E", "#14B8A6"],
  ["#EA580C", "#F59E0B"],
  ["#DB2777", "#8B5CF6"],
];

const COMPANY_THEMES = [
  ["#111827", "#374151"],
  ["#4F46E5", "#7C3AED"],
  ["#0369A1", "#0891B2"],
  ["#047857", "#10B981"],
  ["#B45309", "#F59E0B"],
  ["#BE123C", "#E11D48"],
];

function hashString(value = "") {
  const text = String(value || "");

  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getTheme(value, themes) {
  return themes[hashString(value) % themes.length];
}

export function getInitials(value, fallback = "U") {
  const text = String(value || "").trim();

  if (!text) {
    return fallback;
  }

  if (text.includes("@")) {
    return text
      .split("@")[0]
      .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || fallback;
  }

  const words = text
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return fallback;
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function resolveImageUrl(value, apiBase = "") {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;
}

export function UserAvatar({
  name = "",
  email = "",
  src = "",
  apiBase = "",
  size = 44,
  className = "",
}) {
  const identity = name || email || "User";
  const initials = getInitials(identity, "U");

  const [startColor, endColor] = getTheme(
    email || name || identity,
    USER_THEMES,
  );

  const imageUrl = resolveImageUrl(src, apiBase);

  if (imageUrl) {
    return (
      <span
        className={`identityUserAvatar ${className}`.trim()}
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src={imageUrl}
          alt={identity}
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback =
              event.currentTarget.parentElement?.querySelector(
                ".identityUserAvatarFallback",
              );

            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />

        <span
          className="identityUserAvatarFallback"
          style={{
            display: "none",
            background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
          }}
        >
          <span className="identityAvatarDecoration identityAvatarDecorationOne" />
          <span className="identityAvatarDecoration identityAvatarDecorationTwo" />

          <span className="identityUserIcon">
            <FiUser />
          </span>

          <strong>{initials}</strong>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`identityUserAvatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
      }}
    >
      <span
        className="identityUserAvatarFallback"
        style={{
          display: "flex",
          background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
        }}
      >
        <span className="identityAvatarDecoration identityAvatarDecorationOne" />
        <span className="identityAvatarDecoration identityAvatarDecorationTwo" />

        <span className="identityUserIcon">
          <FiUser />
        </span>

        <strong>{initials}</strong>
      </span>
    </span>
  );
}

export function CompanyLogo({
  name = "",
  src = "",
  apiBase = "",
  size = 58,
  className = "",
}) {
  const companyName = String(name || "Company").trim();

  const initials = getInitials(companyName, "CO");

  const [startColor, endColor] = getTheme(
    companyName,
    COMPANY_THEMES,
  );

  const imageUrl = resolveImageUrl(src, apiBase);

  if (imageUrl) {
    return (
      <span
        className={`identityCompanyLogo ${className}`.trim()}
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src={imageUrl}
          alt={`${companyName} logo`}
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback =
              event.currentTarget.parentElement?.querySelector(
                ".identityCompanyLogoFallback",
              );

            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />

        <span
          className="identityCompanyLogoFallback"
          style={{
            display: "none",
            background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
          }}
        >
          <span className="identityCompanyLogoGlow" />

          <span className="identityCompanyIcon">
            <FiBriefcase />
          </span>

          <strong>{initials}</strong>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`identityCompanyLogo ${className}`.trim()}
      style={{
        width: size,
        height: size,
      }}
    >
      <span
        className="identityCompanyLogoFallback"
        style={{
          display: "flex",
          background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
        }}
      >
        <span className="identityCompanyLogoGlow" />

        <span className="identityCompanyIcon">
          <FiBriefcase />
        </span>

        <strong>{initials}</strong>
      </span>
    </span>
  );
}

export function CompanyCover({
  name = "",
  src = "",
  apiBase = "",
  className = "",
}) {
  const companyName = String(name || "Company").trim();

  const initials = getInitials(companyName, "CO");

  const [startColor, endColor] = getTheme(
    companyName,
    COMPANY_THEMES,
  );

  const imageUrl = resolveImageUrl(src, apiBase);

  if (imageUrl) {
    return (
      <div
        className={`identityCompanyCover ${className}`.trim()}
      >
        <img
          src={imageUrl}
          alt={`${companyName} cover`}
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback =
              event.currentTarget.parentElement?.querySelector(
                ".identityCompanyCoverFallback",
              );

            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />

        <div
          className="identityCompanyCoverFallback"
          style={{
            display: "none",
            background: `linear-gradient(120deg, ${startColor}, ${endColor})`,
          }}
        >
          <span className="identityCoverCircle identityCoverCircleOne" />
          <span className="identityCoverCircle identityCoverCircleTwo" />

          <div className="identityCoverBrand">
            <span>{initials}</span>

            <strong>{companyName}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`identityCompanyCover ${className}`.trim()}
    >
      <div
        className="identityCompanyCoverFallback"
        style={{
          display: "flex",
          background: `linear-gradient(120deg, ${startColor}, ${endColor})`,
        }}
      >
        <span className="identityCoverCircle identityCoverCircleOne" />
        <span className="identityCoverCircle identityCoverCircleTwo" />

        <div className="identityCoverBrand">
          <span>{initials}</span>

          <strong>{companyName}</strong>
        </div>
      </div>
    </div>
  );
}