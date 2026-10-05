import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  FiCamera,
  FiCheck,
  FiEdit3,
  FiEye,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUsers,
} from "react-icons/fi";

import UserShell from "../components/UserShell";

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

const INDUSTRIES = [
  "IT / Программ хангамж",

  "Санхүү",

  "Банк",

  "Боловсрол",

  "Маркетинг",

  "Барилга",

  "Худалдаа",

  "Үйлчилгээ",

  "Үйлдвэрлэл",

  "Тээвэр, логистик",

  "Эрүүл мэнд",

  "Бусад",
];

const EMPLOYEE_COUNTS = [
  "1-10",

  "11-50",

  "51-100",

  "101-250",

  "251-500",

  "501-1000",

  "1000+",
];

function getToken() {
  return (
    localStorage.getItem("token") || localStorage.getItem("adminToken") || ""
  );
}

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
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }

  return list[hashString(key) % list.length];
}

function resolveImage(value) {
  const image = clean(value);

  if (!image) {
    return "";
  }

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
    id: source.id || source.organization_id || source.company_id || null,

    name: clean(source.name || source.organization_name || source.company_name),

    registration_number: clean(
      source.registration_number ||
        source.registrationNumber ||
        source.register_number ||
        source.registerNumber ||
        source.reg_number,
    ),

    industry: clean(source.industry || source.sector || source.category),

    employee_count: clean(
      source.employee_count ||
        source.employeeCount ||
        source.company_size ||
        source.size,
    ),

    description: clean(source.description || source.about || source.bio),

    website: clean(source.website),

    email: clean(source.email || source.contact_email),

    phone: clean(source.phone || source.contact_phone),

    address: clean(source.address),

    facebook: clean(source.facebook),

    linkedin: clean(source.linkedin),

    contact_person: clean(source.contact_person || source.contactPerson),

    logo_url: clean(source.logo_url || source.logoUrl || source.logo),

    cover_url: clean(source.cover_url || source.coverUrl || source.cover),

    event_count: Number(
      source.event_count ?? source.eventCount ?? source.events_count ?? 0,
    ),

    participant_count: Number(
      source.participant_count ??
        source.participantCount ??
        source.participants_count ??
        0,
    ),

    follower_count: Number(
      source.follower_count ??
        source.followerCount ??
        source.followers_count ??
        0,
    ),

    rating: Number(source.rating ?? source.average_rating ?? 0),

    verified: Boolean(
      source.verified || source.is_verified || source.isVerified,
    ),
  };
}

function createForm(organization = {}) {
  return {
    name: organization.name || "",

    registration_number: organization.registration_number || "",

    industry: organization.industry || "",

    employee_count: organization.employee_count || "",

    description: organization.description || "",

    website: organization.website || "",

    email: organization.email || "",

    phone: organization.phone || "",

    address: organization.address || "",

    facebook: organization.facebook || "",

    linkedin: organization.linkedin || "",

    contact_person: organization.contact_person || "",
  };
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();
}

export default function OrganizationProfile() {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);

  const [form, setForm] = useState(createForm());

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [logoPreview, setLogoPreview] = useState("");

  const [coverPreview, setCoverPreview] = useState("");

  const [logoFile, setLogoFile] = useState(null);

  const [coverFile, setCoverFile] = useState(null);

  const [activeSection, setActiveSection] = useState("information");

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const organizationIdentityKey =
    storedUser?.id ||
    storedUser?.user_id ||
    storedUser?.email ||
    organization?.id ||
    organization?.name ||
    form.name ||
    "registra-organization";

  const organizationKey =
    organization?.id ||
    organization?.name ||
    form.name ||
    organizationIdentityKey;

  const defaultLogo = useMemo(() => {
    return stableDefault(
      DEFAULT_LOGOS,

      `${organizationIdentityKey}-organization-logo`,
    );
  }, [organizationIdentityKey]);

  const defaultCover = useMemo(() => {
    return stableDefault(DEFAULT_COVERS, `${organizationKey}-cover`);
  }, [organizationKey]);

  const logoSrc =
    logoPreview || resolveImage(organization?.logo_url) || defaultLogo;

  const coverSrc =
    coverPreview || resolveImage(organization?.cover_url) || defaultCover;

  const completion = useMemo(() => {
    const values = [
      form.name,

      form.registration_number,

      form.industry,

      form.employee_count,

      form.description,

      form.website,

      form.email,

      form.phone,

      form.address,

      form.contact_person,
    ];

    const completed = values.filter((value) => clean(value).length > 0).length;

    if (!values.length) {
      return 0;
    }

    return Math.round((completed / values.length) * 100);
  }, [form]);

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }

      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [logoPreview, coverPreview]);

  async function loadOrganization() {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/organizations/me`, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");

        localStorage.removeItem("adminToken");

        localStorage.removeItem("user");

        navigate("/login", { replace: true });

        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Organization endpoint error");
      }

      const normalized = normalizeOrganization(data);

      setOrganization(normalized);

      setForm(createForm(normalized));
    } catch (err) {
      console.error(
        "Load organization error:",

        err,
      );

      setError("Байгууллагын мэдээлэл уншихад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: value,
    }));

    setError("");

    setSuccess("");
  }

  function selectLogo(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг файл сонгоно уу.");

      event.target.value = "";

      return;
    }

    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);

    setLogoPreview(URL.createObjectURL(file));

    setError("");

    setSuccess("");

    event.target.value = "";
  }

  function selectCover(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг файл сонгоно уу.");

      event.target.value = "";

      return;
    }

    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);

    setCoverPreview(URL.createObjectURL(file));

    setError("");

    setSuccess("");

    event.target.value = "";
  }

  async function saveOrganization() {
    const token = getToken();

    if (!token) {
      navigate("/login", { replace: true });

      return;
    }

    if (!clean(form.name)) {
      setError("Байгууллагын нэрээ оруулна уу.");

      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const payload = {
        name: clean(form.name),

        registration_number: clean(form.registration_number),

        industry: clean(form.industry),

        employee_count: clean(form.employee_count),

        description: clean(form.description),

        website: clean(form.website),

        email: clean(form.email),

        phone: clean(form.phone),

        address: clean(form.address),

        facebook: clean(form.facebook),

        linkedin: clean(form.linkedin),

        contact_person: clean(form.contact_person),

        logo_url: organization?.logo_url || defaultLogo,

        cover_url: organization?.cover_url || defaultCover,
      };

      const response = await fetch(`${API_BASE}/api/organizations/me`, {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");

        localStorage.removeItem("adminToken");

        localStorage.removeItem("user");

        navigate("/login", { replace: true });

        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Organization save failed");
      }

      const normalized = normalizeOrganization(data);

      setOrganization(normalized);

      setForm(createForm(normalized));

      setLogoFile(null);

      setCoverFile(null);

      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }

      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }

      setLogoPreview("");

      setCoverPreview("");

      setSuccess("Байгууллагын мэдээлэл амжилттай хадгалагдлаа.");

      window.dispatchEvent(new Event("organization-updated"));
    } catch (err) {
      console.error("Save organization error:", err);

      setError(
        err?.message || "Байгууллагын мэдээлэл хадгалахад алдаа гарлаа.",
      );
    } finally {
      setSaving(false);
    }
  }

  function goToDashboard() {
    setShowCompleteModal(false);
    window.location.replace("/user/home");
  }

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
      <UserShell title="Байгууллагын профайл">
        <div className="orgProfileLoading">
          Байгууллагын мэдээлэл уншиж байна...
        </div>
      </UserShell>
    );
  }

  return (
    <UserShell title="Байгууллагын профайл">
      <main className="orgProfilePage">
        <div className="orgProfileTopbar">
          <div>
            <h1>Байгууллагын профайл</h1>

            <p>
              Байгууллагын бүртгэл, мэдээлэл, зураг болон холбоо барих
              мэдээллийг удирдана.
            </p>
          </div>

          <button type="button" className="orgPublicButton">
            <FiEye />
            Нийтийн профайл харах
          </button>
        </div>

        <section className="orgHero">
          <div className="orgCover">
            <img
              src={coverSrc}
              alt={form.name ? `${form.name} cover` : "Organization cover"}
              onError={handleCoverError}
            />

            <label className="orgCoverButton">
              <FiCamera />
              Ковер солих
              <input type="file" accept="image/*" onChange={selectCover} />
            </label>
          </div>

          <div className="orgHeroBottom">
            <div className="orgLogoWrap">
              <img
                className="orgLogo"
                src={logoSrc}
                alt={form.name ? `${form.name} logo` : "Organization logo"}
                onError={handleLogoError}
                style={{
                  display: "block",

                  objectFit: "cover",
                }}
              />

              <label className="orgLogoEdit">
                <FiCamera />

                <input type="file" accept="image/*" onChange={selectLogo} />
              </label>
            </div>

            <div className="orgIdentity">
              <div className="orgNameRow">
                <h2>{form.name || "Байгууллагын нэр"}</h2>

                {organization?.verified && (
                  <span className="orgVerified">
                    <FiCheck />
                    Баталгаажсан
                  </span>
                )}
              </div>

              <p>
                <span>{form.industry || "Салбар сонгоогүй"}</span>

                {form.address && (
                  <>
                    <span>•</span>

                    <span>{form.address}</span>
                  </>
                )}
              </p>
            </div>

            <div className="orgStats">
              <div>
                <strong>{formatNumber(organization?.event_count)}</strong>

                <span>
                  Эвент зохион
                  <br />
                  байгуулсан
                </span>
              </div>

              <div>
                <strong>{formatNumber(organization?.participant_count)}</strong>

                <span>
                  Нийт
                  <br />
                  оролцогч
                </span>
              </div>

              <div>
                <strong>{formatNumber(organization?.follower_count)}</strong>

                <span>Дагагч</span>
              </div>

              <div>
                <strong>
                  {organization?.rating
                    ? Number(organization.rating).toFixed(1)
                    : "0.0"}
                </strong>

                <span>
                  Дундаж
                  <br />
                  үнэлгээ
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="orgMessage error">{error}</div>}

        {success && <div className="orgMessage success">{success}</div>}

        <div className="orgContent">
          <aside className="orgSettingsMenu">
            <button
              type="button"
              className={activeSection === "information" ? "active" : ""}
              onClick={() => setActiveSection("information")}
            >
              <FiEdit3 />
              Байгууллагын мэдээлэл
            </button>

            <button
              type="button"
              className={activeSection === "media" ? "active" : ""}
              onClick={() => setActiveSection("media")}
            >
              <FiCamera />
              Лого ба ковер
            </button>

            <button
              type="button"
              className={activeSection === "team" ? "active" : ""}
              onClick={() => setActiveSection("team")}
            >
              <FiUsers />
              Баг ба эрх
            </button>

            <button
              type="button"
              className={activeSection === "verification" ? "active" : ""}
              onClick={() => setActiveSection("verification")}
            >
              <FiCheck />
              Баталгаажуулалт
            </button>

            <div className="orgProgressBox">
              <div className="orgProgressHeader">
                <span>Профайл бөглөлт</span>

                <strong>{completion}%</strong>
              </div>

              <div className="orgProgress">
                <span
                  style={{
                    width: `${completion}%`,
                  }}
                />
              </div>
            </div>
          </aside>

          <section className="orgFormArea">
            {activeSection === "information" && (
              <>
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
                      <div className="orgField">
                        <label>
                          БАЙГУУЛЛАГЫН НЭР
                          <span> *</span>
                        </label>

                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="IT Insight"
                        />
                      </div>

                      <div className="orgField">
                        <label>РЕГИСТРИЙН ДУГААР</label>

                        <input
                          type="text"
                          name="registration_number"
                          value={form.registration_number}
                          onChange={handleChange}
                          placeholder="6012345"
                        />
                      </div>
                    </div>

                    <div className="orgGrid2">
                      <div className="orgField">
                        <label>САЛБАР</label>

                        <select
                          name="industry"
                          value={form.industry}
                          onChange={handleChange}
                        >
                          <option value="">Сонгоно уу</option>

                          {INDUSTRIES.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="orgField">
                        <label>АЖИЛТНЫ ТОО</label>

                        <select
                          name="employee_count"
                          value={form.employee_count}
                          onChange={handleChange}
                        >
                          <option value="">Сонгоно уу</option>

                          {EMPLOYEE_COUNTS.map((count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="orgField">
                      <label>ТОВЧ ТАНИЛЦУУЛГА</label>

                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Байгууллагынхаа тухай товч мэдээлэл оруулна уу..."
                      />
                    </div>
                  </div>
                </section>

                <section className="orgCard">
                  <div className="orgCardHeader">
                    <h3>Холбоо барих</h3>
                  </div>

                  <div className="orgCardBody">
                    <div className="orgGrid3">
                      <div className="orgField">
                        <label>
                          ВЭБСАЙТ <span>(Сонголттой)</span>
                        </label>

                        <div className="orgInputIcon">
                          <FiGlobe />

                          <input
                            type="text"
                            name="website"
                            value={form.website}
                            onChange={handleChange}
                            placeholder="itinsight.mn"
                          />
                        </div>
                      </div>

                      <div className="orgField">
                        <label>АЛБАН И-МЭЙЛ</label>

                        <div className="orgInputIcon">
                          <FiMail />

                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="info@itinsight.mn"
                          />
                        </div>
                      </div>

                      <div className="orgField">
                        <label>УТАС</label>

                        <div className="orgInputIcon">
                          <FiPhone />

                          <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="7711 2233"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="orgField">
                      <label>ХАЯГ</label>

                      <div className="orgInputIcon">
                        <FiMapPin />

                        <input
                          type="text"
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          placeholder="Улаанбаатар, Сүхбаатар дүүрэг..."
                        />
                      </div>
                    </div>

                    <div className="orgGrid3">
                      <div className="orgField">
                        <label>
                          FACEBOOK <span>(Сонголттой)</span>
                        </label>

                        <input
                          type="text"
                          name="facebook"
                          value={form.facebook}
                          onChange={handleChange}
                          placeholder="fb.com/company"
                        />
                      </div>

                      <div className="orgField">
                        <label>
                          LINKEDIN <span>(Сонголттой)</span>
                        </label>

                        <input
                          type="text"
                          name="linkedin"
                          value={form.linkedin}
                          onChange={handleChange}
                          placeholder="linkedin.com/company/..."
                        />
                      </div>

                      <div className="orgField">
                        <label>
                          ХОЛБОГДОХ АЖИЛТАН <span>(Сонголттой)</span>
                        </label>

                        <input
                          type="text"
                          name="contact_person"
                          value={form.contact_person}
                          onChange={handleChange}
                          placeholder="Нэр - Албан тушаал"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeSection === "media" && (
              <section className="orgCard">
                <div className="orgCardHeader">
                  <h3>Лого ба ковер</h3>
                </div>

                <div className="orgCardBody">
                  <div className="orgMediaGrid">
                    <div className="orgMediaItem">
                      <h4>Байгууллагын лого</h4>

                      <div className="orgMediaLogo">
                        <img
                          src={logoSrc}
                          alt={form.name || "Organization logo"}
                          onError={handleLogoError}
                        />
                      </div>

                      <label className="orgUploadButton">
                        <FiCamera />
                        Лого солих
                        <input
                          type="file"
                          accept="image/*"
                          onChange={selectLogo}
                        />
                      </label>
                    </div>

                    <div className="orgMediaItem">
                      <h4>Профайлын ковер</h4>

                      <div className="orgMediaCover">
                        <img
                          src={coverSrc}
                          alt="Organization cover"
                          onError={handleCoverError}
                        />
                      </div>

                      <label className="orgUploadButton">
                        <FiCamera />
                        Ковер солих
                        <input
                          type="file"
                          accept="image/*"
                          onChange={selectCover}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "team" && (
              <section className="orgCard">
                <div className="orgEmptyState">
                  <FiUsers />

                  <h3>Баг ба эрх</h3>

                  <p>
                    Байгууллагын гишүүд болон хэрэглэгчийн эрхийг энд удирдана.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "verification" && (
              <section className="orgCard">
                <div className="orgEmptyState">
                  <FiCheck />

                  <h3>Баталгаажуулалт</h3>

                  <p>Байгууллагын баталгаажуулалтын мэдээлэл энд харагдана.</p>
                </div>
              </section>
            )}
          </section>
        </div>

        <footer className="orgStickyFooter">
          <button type="button" onClick={saveOrganization} disabled={saving}>
            {saving ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
          </button>
        </footer>
      </main>
    </UserShell>
  );
}
