import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CompanyLogo } from "../components/IdentityImage";
import {
  FiCheck,
  FiSearch,
  FiUsers,
} from "react-icons/fi";

import UserShell from "../components/UserShell";
import { API_BASE } from "../../../lib/config";

const CATEGORIES = [
  "Бүгд",
  "Мэдээллийн технологи",
  "Cloud",
  "Кибер аюулгүй байдал",
  "Санхүү",
  "Боловсрол",
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function resolveUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "O";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeOrganization(item) {
  let parsedCategories = [];

  if (Array.isArray(item?.categories)) {
    parsedCategories = item.categories;
  } else if (typeof item?.categories === "string") {
    try {
      const parsed = JSON.parse(item.categories);

      if (Array.isArray(parsed)) {
        parsedCategories = parsed;
      } else {
        parsedCategories = item.categories
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      parsedCategories = item.categories
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  const category =
    item?.category ||
    item?.industry ||
    parsedCategories[0] ||
    "Мэдээллийн технологи";

  return {
    ...item,

    id:
      item?.id ??
      item?.organization_id ??
      item?.org_id,

    name:
      item?.name ||
      item?.organization_name ||
      item?.company_name ||
      "Байгууллага",

    category,

    categories:
      parsedCategories.length > 0
        ? parsedCategories
        : [category],

    description:
      item?.description ||
      item?.about ||
      item?.bio ||
      "Байгууллагын танилцуулга оруулаагүй байна.",

    location:
      item?.location ||
      item?.address ||
      item?.city ||
      "Улаанбаатар",

    logo:
      item?.logo_url ||
      item?.logo ||
      item?.image_url ||
      item?.image ||
      "",

    verified: Boolean(
      item?.verified ??
        item?.is_verified ??
        item?.verification_status === "verified"
    ),

    followers:
      Number(
        item?.followers_count ??
          item?.follower_count ??
          item?.followers ??
          0
      ) || 0,

    activeEvents:
      Number(
        item?.active_events_count ??
          item?.upcoming_events_count ??
          item?.event_count ??
          0
      ) || 0,

    following: Boolean(
      item?.following ??
        item?.is_following ??
        item?.followed
    ),
  };
}

async function fetchJson(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,

    headers: {
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `HTTP ${response.status}`
    );
  }

  return data;
}

export default function Organizations() {
  const navigate = useNavigate();

  const [organizations, setOrganizations] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("Бүгд");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [followBusy, setFollowBusy] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      setLoading(true);
      setError("");

      const endpoints = [
        `${API_BASE}/api/organizations`,
        `${API_BASE}/api/organizations/public`,
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const data =
            await fetchJson(endpoint);

          const rows = Array.isArray(data)
            ? data
            : data?.organizations ||
              data?.data ||
              data?.items ||
              [];

          if (!cancelled) {
            setOrganizations(
              rows.map(normalizeOrganization)
            );

            setLoading(false);
          }

          return;
        } catch (err) {
          lastError = err;
        }
      }

      if (!cancelled) {
        setError(
          lastError?.message ||
            "Байгууллагын мэдээлэл ачаалж чадсангүй."
        );

        setLoading(false);
      }
    }

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrganizations =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return organizations.filter(
        (organization) => {
          const categoryMatch =
            category === "Бүгд" ||
            organization.category === category ||
            organization.categories.includes(
              category
            );

          if (!categoryMatch) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            organization.name,
            organization.category,
            organization.description,
            organization.location,
            ...organization.categories,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(query);
        }
      );
    }, [
      organizations,
      search,
      category,
    ]);

  async function toggleFollow(
    organization
  ) {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    setFollowBusy(
      organization.id
    );

    setError("");

    const nextFollowing =
      !organization.following;

    try {
      await fetchJson(
        `${API_BASE}/api/organizations/${organization.id}/follow`,
        {
          method: nextFollowing
            ? "POST"
            : "DELETE",
        }
      );

      setOrganizations(
        (current) =>
          current.map((item) =>
            item.id === organization.id
              ? {
                  ...item,

                  following:
                    nextFollowing,

                  followers:
                    Math.max(
                      0,
                      item.followers +
                        (nextFollowing
                          ? 1
                          : -1)
                    ),
                }
              : item
          )
      );
    } catch (err) {
      setError(
        err.message ||
          "Үйлдэл амжилтгүй боллоо."
      );
    } finally {
      setFollowBusy(null);
    }
  }

  return (
    <UserShell>
      <main className="organizationsPage">
        <div className="organizationsContainer">
          <header className="organizationsHero">
            <span className="organizationsBadge">
              БАЙГУУЛЛАГУУД
            </span>

            <h1>
              Эвэнт зохион байгуулагчид
            </h1>

            <p>
              Registra дээр эвэнт зарладаг
              байгууллагуудтай танилцаж,
              дагаарай.
            </p>
          </header>

          {error && (
            <div className="organizationsError">
              {error}
            </div>
          )}

          <section className="organizationsControls">
            <div className="organizationsSearchRow">
              <label className="organizationsSearch">
                <FiSearch />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Байгууллагын нэрээр хайх..."
                />
              </label>

              <span className="organizationsCount">
                {filteredOrganizations.length} байгууллага
              </span>
            </div>

            <div className="organizationsFilters">
              {CATEGORIES.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      category === item
                        ? "organizationsFilter active"
                        : "organizationsFilter"
                    }
                    onClick={() =>
                      setCategory(item)
                    }
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="organizationsGrid">
            {loading ? (
              <div className="organizationsEmpty">
                <FiUsers />

                <strong>
                  Байгууллагуудыг ачаалж байна...
                </strong>
              </div>
            ) : filteredOrganizations.length ? (
              filteredOrganizations.map(
                (organization) => (
                  <article
                    className="organizationCard"
                    key={
                      organization.id ||
                      organization.name
                    }
                  >
                    <div className="organizationCardTop">
<CompanyLogo
  name={organization.name}
  src={organization.logo}
  apiBase={API_BASE}
  size={64}
  className="organizationLogo"
/>

                      <div className="organizationIdentity">
                        <div className="organizationName">
                          <h3>
                            {
                              organization.name
                            }
                          </h3>

                          {organization.verified && (
                            <span className="organizationVerified">
                              <FiCheck />
                            </span>
                          )}
                        </div>

                        <div className="organizationMeta">
                          <span>
                            {
                              organization.category
                            }
                          </span>

                          {organization.location && (
                            <>
                              <i>•</i>

                              <span>
                                {
                                  organization.location
                                }
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="organizationDescription">
                      {
                        organization.description
                      }
                    </p>

                    <div className="organizationStats">
                      <span className="organizationEventCount">
                        {
                          organization.activeEvents
                        }{" "}
                        удахгүй эвэнт
                      </span>

                      <span className="organizationFollowerCount">
                        Нийт{" "}
                        {
                          organization.followers
                        }
                      </span>
                    </div>

                    <div className="organizationActions">
                      <Link
                        to={`/user/organizations/${organization.id}`}
                        className="organizationProfileButton"
                      >
                        Профайл үзэх
                      </Link>

                      <button
                        type="button"
                        className={
                          organization.following
                            ? "organizationFollowButton following"
                            : "organizationFollowButton"
                        }
                        disabled={
                          followBusy ===
                          organization.id
                        }
                        onClick={() =>
                          toggleFollow(
                            organization
                          )
                        }
                      >
                        {followBusy ===
                        organization.id
                          ? "..."
                          : organization.following
                            ? "✓ Дагаж байна"
                            : "+ Дагах"}
                      </button>
                    </div>
                  </article>
                )
              )
            ) : (
              <div className="organizationsEmpty">
                <FiUsers />

                <strong>
                  Байгууллага олдсонгүй
                </strong>

                <span>
                  Хайлтын утга эсвэл ангиллаа
                  өөрчилж үзнэ үү.
                </span>
              </div>
            )}
          </section>

          <section className="organizationJoinBanner">
            <div>
              <h2>
                Та эвэнт зохион байгуулагч уу?
              </h2>

              <p>
                Байгууллагаар бүртгүүлээд
                профайл, логотой болж эвэнтээ
                зарлаарай.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/user/profile")
              }
            >
              Байгууллагаар бүртгүүлэх
            </button>
          </section>
        </div>
      </main>
    </UserShell>
  );
}