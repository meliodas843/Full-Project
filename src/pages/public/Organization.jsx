import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBuilding,
  FaCheck,
  FaMagnifyingGlass,
  FaPlus,
} from "react-icons/fa6";

import { API_BASE } from "@/lib/config";
import Footer from "../../components/Footer";

const categories = [
  {
    value: "all",
    label: "Бүгд",
  },
  {
    value: "Мэдээллийн технологи",
    label: "Мэдээллийн технологи",
  },
  {
    value: "Cloud",
    label: "Cloud",
  },
  {
    value: "Кибер аюулгүй байдал",
    label: "Кибер аюулгүй байдал",
  },
  {
    value: "Санхүү",
    label: "Санхүү",
  },
  {
    value: "Боловсрол",
    label: "Боловсрол",
  },
];

function normalizeCategories(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "OR";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getToken() {
  return (
    localStorage.getItem("token") || localStorage.getItem("adminToken") || ""
  );
}

export default function Organization() {
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(null);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const response = await fetch(`${API_BASE}/api/organizations/public`, {
        method: "GET",
        headers: {
          Accept: "application/json",

          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Байгууллагын мэдээлэл авахад алдаа гарлаа.",
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.organizations)
          ? data.organizations
          : [];

      setOrganizations(list);
    } catch (requestError) {
      setOrganizations([]);

      setError(
        requestError?.message || "Байгууллагын мэдээлэл авахад алдаа гарлаа.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return organizations.filter((organization) => {
      const organizationCategories = normalizeCategories(
        organization.categories,
      );

      const searchableText = [
        organization.name,
        organization.description,
        organization.address,
        organization.registration_number,
        ...organizationCategories,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      const matchesCategory =
        selectedCategory === "all" ||
        organizationCategories.some(
          (category) =>
            String(category).toLowerCase() === selectedCategory.toLowerCase(),
        );

      return matchesSearch && matchesCategory;
    });
  }, [organizations, search, selectedCategory]);

  const handleFollow = async (organization) => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setFollowLoading(organization.id);

      const response = await fetch(
        `${API_BASE}/api/organizations/${organization.id}/follow`,
        {
          method: organization.is_following ? "DELETE" : "POST",

          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Үйлдлийг гүйцэтгэхэд алдаа гарлаа.",
        );
      }

      setOrganizations((current) =>
        current.map((item) => {
          if (item.id !== organization.id) {
            return item;
          }

          const nextFollowing = !Boolean(item.is_following);

          const followers = Number(item.followers_count || 0);

          return {
            ...item,

            is_following: nextFollowing,

            followers_count: Math.max(0, followers + (nextFollowing ? 1 : -1)),
          };
        }),
      );
    } catch (requestError) {
      window.alert(
        requestError?.message || "Үйлдлийг гүйцэтгэхэд алдаа гарлаа.",
      );
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="publicOrganizationPage">
      <main className="publicOrganizationMain">
        <div className="publicOrganizationContainer">
          {/* HEADER */}

          <section className="publicOrganizationHeader">
            <span className="publicOrganizationEyebrow">БАЙГУУЛЛАГУУД</span>

            <h1>Эвэнт зохион байгуулагчид</h1>

            <p>
              Registra дээр эвэнт зарладаг байгууллагуудтай танилцаж, дагаарай.
            </p>
          </section>

          {/* SEARCH + FILTER */}

          <section className="publicOrganizationControls">
            <div className="publicOrganizationToolbar">
              <label className="publicOrganizationSearch">
                <FaMagnifyingGlass />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Байгууллагын нэрээр хайх..."
                />
              </label>

              <span className="publicOrganizationCount">
                {filteredOrganizations.length} байгууллага
              </span>
            </div>

            <div className="publicOrganizationFilters">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={
                    selectedCategory === category.value
                      ? "publicOrganizationFilter active"
                      : "publicOrganizationFilter"
                  }
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </section>

          {/* LOADING */}

          {loading ? (
            <div className="publicOrganizationState">
              <div className="publicOrganizationLoader" />

              <h3>Түр хүлээнэ үү</h3>

              <p>Байгууллагуудыг ачаалж байна...</p>
            </div>
          ) : error ? (
            /* ERROR */

            <div className="publicOrganizationState error">
              <div className="publicOrganizationStateIcon">
                <FaBuilding />
              </div>

              <h3>Мэдээлэл авахад алдаа гарлаа</h3>

              <p>{error}</p>

              <button
                type="button"
                className="publicOrganizationRetry"
                onClick={loadOrganizations}
              >
                Дахин оролдох
              </button>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            /* EMPTY */

            <div className="publicOrganizationState">
              <div className="publicOrganizationStateIcon">
                <FaBuilding />
              </div>

              <h3>
                {organizations.length === 0
                  ? "Одоогоор байгууллага бүртгэгдээгүй байна"
                  : "Илэрц олдсонгүй"}
              </h3>

              <p>
                {organizations.length === 0
                  ? "Байгууллагууд бүртгэгдсэний дараа энд харагдана."
                  : "Хайлтын үг эсвэл ангиллаа өөрчилж үзнэ үү."}
              </p>
            </div>
          ) : (
            /* ORGANIZATION GRID */

            <div className="publicOrganizationGrid">
              {filteredOrganizations.map((organization) => {
                const organizationCategories = normalizeCategories(
                  organization.categories,
                );

                return (
                  <article
                    className="publicOrganizationCard"
                    key={organization.id}
                  >
                    {/* CARD TOP */}

                    <div className="publicOrganizationCardTop">
                      {organization.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt={organization.name}
                          className="publicOrganizationLogo"
                        />
                      ) : (
                        <div className="publicOrganizationLogoFallback">
                          {getInitials(organization.name)}
                        </div>
                      )}

                      <div className="publicOrganizationIdentity">
                        <div className="publicOrganizationNameRow">
                          <h2>{organization.name}</h2>

                          {Boolean(organization.is_verified) && (
                            <span
                              className="publicOrganizationVerified"
                              title="Баталгаажсан байгууллага"
                            >
                              <FaCheck />
                            </span>
                          )}
                        </div>

                        <div className="publicOrganizationMeta">
                          <span>
                            {organizationCategories[0] || "Байгууллага"}
                          </span>

                          {organization.address && (
                            <>
                              <span className="publicOrganizationDot">•</span>

                              <span>{organization.address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DESCRIPTION */}

                    <p className="publicOrganizationDescription">
                      {organization.description ||
                        "Байгууллагын танилцуулга оруулаагүй байна."}
                    </p>

                    {/* STATS */}

                    <div className="publicOrganizationStats">
                      <span>
                        {Number(organization.followers_count || 0)} дагагчтай
                      </span>

                      <span>
                        Нийт {Number(organization.active_events_count || 0)}{" "}
                        эвэнт
                      </span>
                    </div>

                    {/* ACTIONS */}

                    <div className="publicOrganizationActions">
                      <Link
                        to={`/organization/${organization.id}`}
                        className="publicOrganizationProfileButton"
                      >
                        Профайл үзэх
                      </Link>

                      <button
                        type="button"
                        className={
                          organization.is_following
                            ? "publicOrganizationFollowButton following"
                            : "publicOrganizationFollowButton"
                        }
                        disabled={followLoading === organization.id}
                        onClick={() => handleFollow(organization)}
                      >
                        {organization.is_following ? (
                          <>
                            <FaCheck />
                            Дагаж байна
                          </>
                        ) : (
                          <>
                            <FaPlus />
                            Дагах
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* CTA */}

          <section className="publicOrganizationCta">
            <div className="publicOrganizationCtaText">
              <h2>Та эвэнт зохион байгуулагч уу?</h2>

              <p>
                Байгууллагаар бүртгүүлээд профайл, логотой болж эвэнтээ
                зарлаарай.
              </p>
            </div>

            <Link to="/signup" className="publicOrganizationCtaButton">
              Байгууллагаар бүртгүүлэх
              <FaArrowRight />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
