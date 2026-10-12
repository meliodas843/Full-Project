
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiCheck,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUsers,
  FiArrowLeft,
  FiFacebook,
  FiLinkedin,
} from "react-icons/fi";
import { API_BASE } from "@/lib/config";

const DEFAULT_LOGOS = [
  "/registra-default-images/logos/logo-color-1-example.svg",
  "/registra-default-images/logos/logo-color-2-example.svg",
  "/registra-default-images/logos/logo-color-3-example.svg",
  "/registra-default-images/logos/logo-color-4-example.svg",
  "/registra-default-images/logos/logo-color-5-example.svg",
  "/registra-default-images/logos/logo-color-6-example.svg",
];

const DEFAULT_COVERS = [
  "/registra-default-images/org-covers/org-cover-1.svg",
  "/registra-default-images/org-covers/org-cover-2.svg",
  "/registra-default-images/org-covers/org-cover-3.svg",
  "/registra-default-images/org-covers/org-cover-4.svg",
  "/registra-default-images/org-covers/org-cover-5.svg",
  "/registra-default-images/org-covers/org-cover-6.svg",
];

function clean(value) {
  return String(value ?? "").trim();
}

function hashString(value) {
  const text = clean(value) || "registra";
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function stableDefault(list, key) {
  return list[hashString(key) % list.length];
}

function resolveImage(value) {
  const image = clean(value);

  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/registra-default-images/")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_BASE}${image}`;
  }

  return `${API_BASE}/${image}`;
}

function normalizeOrganization(data) {
  const source =
    data?.organization || data?.company || data?.data || data || {};

  return {
    id: source.id || source.organization_id || source.company_id,
    name: clean(
      source.name || source.organization_name || source.company_name
    ),
    registration_number: clean(
      source.registration_number ||
        source.registrationNumber ||
        source.register_number ||
        source.reg_number
    ),
    industry: clean(
      source.industry || source.sector || source.category
    ),
    employee_count: clean(
      source.employee_count ||
        source.employeeCount ||
        source.company_size ||
        source.size
    ),
    description: clean(
      source.description || source.about || source.bio
    ),
    website: clean(source.website),
    email: clean(source.email || source.contact_email),
    phone: clean(source.phone || source.contact_phone),
    address: clean(source.address),
    facebook: clean(source.facebook),
    linkedin: clean(source.linkedin),
    contact_person: clean(
      source.contact_person || source.contactPerson
    ),
    logo_url: clean(
      source.logo_url || source.logoUrl || source.logo
    ),
    cover_url: clean(
      source.cover_url || source.coverUrl || source.cover
    ),
    event_count: Number(
      source.event_count ??
        source.eventCount ??
        source.events_count ??
        0
    ),
    participant_count: Number(
      source.participant_count ??
        source.participantCount ??
        source.participants_count ??
        0
    ),
    follower_count: Number(
      source.follower_count ??
        source.followerCount ??
        source.followers_count ??
        0
    ),
    rating: Number(
      source.rating ?? source.average_rating ?? 0
    ),
    verified: Boolean(
      source.verified ||
        source.is_verified ||
        source.isVerified
    ),
  };
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString()
    : "0";
}

function externalUrl(value) {
  const url = clean(value);
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function InfoField({ label, value, icon: Icon, href }) {
  if (!value) return null;

  return (
    <div className="orgField">
      <label>{label}</label>

      <div className="orgInputIcon">
        {Icon && <Icon />}

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </a>
        ) : (
          <div
            style={{
              width: "100%",
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicOrganizationProfile() {
  const { id } = useParams();

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrganization() {
      setLoading(true);
      setError("");
      setOrganization(null);

      try {
        const response = await fetch(
          `${API_BASE}/api/organizations/public`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Байгууллагын мэдээлэл авахад алдаа гарлаа."
          );
        }

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.organizations)
            ? data.organizations
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.data?.organizations)
                ? data.data.organizations
                : [];

        const selected = items.find((item) => {
          const normalized = normalizeOrganization(item);
          return String(normalized.id) === String(id);
        });

        if (!selected) {
          throw new Error("Байгууллага олдсонгүй.");
        }

        if (!controller.signal.aborted) {
          setOrganization(normalizeOrganization(selected));
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message ||
              "Байгууллагын мэдээлэл уншихад алдаа гарлаа."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrganization();

    return () => controller.abort();
  }, [id]);

  const organizationKey =
    organization?.id || organization?.name || id;

  const defaultLogo = useMemo(
    () =>
      stableDefault(
        DEFAULT_LOGOS,
        `${organizationKey}-organization-logo`
      ),
    [organizationKey]
  );

  const defaultCover = useMemo(
    () =>
      stableDefault(
        DEFAULT_COVERS,
        `${organizationKey}-cover`
      ),
    [organizationKey]
  );

  const logoSrc =
    resolveImage(organization?.logo_url) || defaultLogo;

  const coverSrc =
    resolveImage(organization?.cover_url) || defaultCover;

  function handleLogoError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = defaultLogo;
  }

  function handleCoverError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = defaultCover;
  }

  if (loading) {
    return (
      <main className="orgProfilePage">
        <div className="orgProfileLoading">
          Байгууллагын мэдээлэл уншиж байна...
        </div>
      </main>
    );
  }

  if (error || !organization) {
    return (
      <main className="orgProfilePage">
        <Link to="/organization" className="orgPublicButton">
          <FiArrowLeft />
          Байгууллагууд
        </Link>

        <div className="orgMessage error" role="alert">
          {error || "Байгууллага олдсонгүй."}
        </div>
      </main>
    );
  }

  return (
    <main className="orgProfilePage">
      <div className="orgProfileTopbar">
        <div>
          <h1>Байгууллагын профайл</h1>
          <p>
            Байгууллагын танилцуулга болон холбоо барих мэдээлэл
          </p>
        </div>

        <Link to="/organization" className="orgPublicButton">
          <FiArrowLeft />
          Байгууллагууд
        </Link>
      </div>

      <section className="orgHero">
        <div className="orgCover">
          <img
            src={coverSrc}
            alt={`${organization.name} cover`}
            onError={handleCoverError}
          />
        </div>

        <div className="orgHeroBottom">
          <div className="orgLogoWrap">
            <img
              className="orgLogo"
              src={logoSrc}
              alt={`${organization.name} logo`}
              onError={handleLogoError}
              style={{
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          <div className="orgIdentity">
            <div className="orgNameRow">
              <h2>{organization.name || "Байгууллага"}</h2>

              {organization.verified && (
                <span className="orgVerified">
                  <FiCheck />
                  Баталгаажсан
                </span>
              )}
            </div>

            <p>
              <span>
                {organization.industry || "Байгууллага"}
              </span>

              {organization.address && (
                <>
                  <span>•</span>
                  <span>{organization.address}</span>
                </>
              )}
            </p>
          </div>

          <div className="orgStats">
            <div className="orgStat">
              <strong>
                {formatNumber(organization.event_count)}
              </strong>
              <span>Эвент зохион байгуулсан</span>
            </div>

            <div className="orgStat">
              <strong>
                {formatNumber(organization.participant_count)}
              </strong>
              <span>Нийт оролцогч</span>
            </div>

            <div className="orgStat">
              <strong>
                {formatNumber(organization.follower_count)}
              </strong>
              <span>Дагагч</span>
            </div>

            <div className="orgStat">
              <strong>
                {Number.isFinite(organization.rating)
                  ? organization.rating.toFixed(1)
                  : "0.0"}
              </strong>
              <span>Дундаж үнэлгээ</span>
            </div>
          </div>
        </div>
      </section>

      <div className="orgContent">
        <aside className="orgSettingsMenu">
          <div className="active">
            <FiUsers />
            Байгууллагын мэдээлэл
          </div>
        </aside>

        <section className="orgFormArea">
          <section className="orgCard">
            <div className="orgCardHeader">
              <h3>Байгууллагын мэдээлэл</h3>

              <span className="orgComplete">
                <FiCheck />
                Нийтэд харагдана
              </span>
            </div>

            <div className="orgCardBody">
              <div className="orgGrid2">
                <InfoField
                  label="БАЙГУУЛЛАГЫН НЭР"
                  value={organization.name}
                />

                <InfoField
                  label="САЛБАР"
                  value={organization.industry}
                />
              </div>

              <div className="orgGrid2">
                <InfoField
                  label="АЖИЛТНЫ ТОО"
                  value={organization.employee_count}
                />
              </div>

              <div className="orgField">
                <label>ТОВЧ ТАНИЛЦУУЛГА</label>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                  }}
                >
                  {organization.description ||
                    "Байгууллагын танилцуулга оруулаагүй байна."}
                </div>
              </div>
            </div>
          </section>

          <section className="orgCard">
            <div className="orgCardHeader">
              <h3>Холбоо барих</h3>
            </div>

            <div className="orgCardBody">
              <div className="orgGrid3">
                <InfoField
                  label="ВЭБСАЙТ"
                  value={organization.website}
                  icon={FiGlobe}
                  href={externalUrl(organization.website)}
                />

                <InfoField
                  label="АЛБАН И-МЭЙЛ"
                  value={organization.email}
                  icon={FiMail}
                  href={
                    organization.email
                      ? `mailto:${organization.email}`
                      : ""
                  }
                />

                <InfoField
                  label="УТАС"
                  value={organization.phone}
                  icon={FiPhone}
                  href={
                    organization.phone
                      ? `tel:${organization.phone.replace(/\s/g, "")}`
                      : ""
                  }
                />
              </div>

              <InfoField
                label="ХАЯГ"
                value={organization.address}
                icon={FiMapPin}
              />

              <div className="orgGrid3">
                <InfoField
                  label="FACEBOOK"
                  value={organization.facebook}
                  icon={FiFacebook}
                  href={externalUrl(organization.facebook)}
                />

                <InfoField
                  label="LINKEDIN"
                  value={organization.linkedin}
                  icon={FiLinkedin}
                  href={externalUrl(organization.linkedin)}
                />

                <InfoField
                  label="ХОЛБОГДОХ АЖИЛТАН"
                  value={organization.contact_person}
                  icon={FiUsers}
                />
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
