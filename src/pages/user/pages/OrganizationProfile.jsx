import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { FiCamera, FiCheck, FiEdit3, FiEye, FiUsers } from "react-icons/fi";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";
import { DEFAULT_COVERS, DEFAULT_LOGOS, clean, createForm, formatNumber, getToken, normalizeOrganization, resolveImage, stableDefault } from "./OrganizationProfile.helpers";
import OrganizationProfileForm from "./OrganizationProfileForm";


export default function OrganizationProfile() {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);

  const totalEvents = formatNumber(organization?.event_count);
  const totalParticipants = formatNumber(organization?.participant_count);
  const followers = formatNumber(organization?.follower_count);

  const [form, setForm] = useState(createForm());

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

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

      setError(err?.message || "Байгууллагын мэдээлэл уншихад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFieldErrors((current) => ({ ...current, [name]: undefined }));

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

    const required = {
      name: clean(form.name),

      registration_number: clean(form.registration_number),

      industry: clean(form.industry),

      employee_count: clean(form.employee_count),

      description: clean(form.description),

      email: clean(form.email),

      phone: clean(form.phone),

      address: clean(form.address),
    };

    const labels = {
      name: "Байгууллагын нэр",

      registration_number: "Регистрийн дугаар",

      industry: "Салбар",

      employee_count: "Ажилтны тоо",

      description: "Товч танилцуулга",

      email: "Албан и-мэйл",

      phone: "Утас",

      address: "Хаяг",
    };

    const missing = Object.fromEntries(
      Object.entries(required)

        .filter(([, value]) => !value)

        .map(([key]) => [key, `${labels[key]} талбарыг бөглөнө үү.`]),
    );

    setFieldErrors(missing);

    if (Object.keys(missing).length) {
      setError(
        `Дутуу талбар: ${Object.keys(missing)

          .map((key) => labels[key])

          .join(", ")}`,
      );

      document

        .querySelector(`[name="${Object.keys(missing)[0]}"]`)

        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const body = new FormData();

      body.append("name", required.name);

      body.append("registration_number", required.registration_number);

      body.append("industry", required.industry);

      body.append("employee_count", required.employee_count);

      body.append("description", required.description);

      body.append("website", clean(form.website));

      body.append("email", required.email);

      body.append("phone", required.phone);

      body.append("address", required.address);

      body.append("facebook", clean(form.facebook));

      body.append("linkedin", clean(form.linkedin));

      body.append("contact_person", clean(form.contact_person));

      if (logoFile) {
        body.append("logo", logoFile);
      } else if (organization?.logo_url) {
        body.append("logo_url", organization.logo_url);
      }

      if (coverFile) {
        body.append("cover", coverFile);
      } else if (organization?.cover_url) {
        body.append("cover_url", organization.cover_url);
      }

      const response = await fetch(`${API_BASE}/api/organizations/me`, {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");

        localStorage.removeItem("adminToken");

        localStorage.removeItem("user");

        localStorage.removeItem("profileComplete");

        localStorage.removeItem("organizationProfileComplete");

        navigate("/login", { replace: true });

        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Organization save failed");
      }

      const normalized = normalizeOrganization(data);

      setOrganization(normalized);

      setForm(createForm(normalized));

      setFieldErrors({});

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

      localStorage.setItem("organizationProfileComplete", "true");

      localStorage.setItem("profileComplete", "true");

      localStorage.setItem("accountType", "organization");

      localStorage.setItem("account_type", "organization");

      window.dispatchEvent(new Event("organization-updated"));

      window.dispatchEvent(new Event("profile-updated"));

      setSuccess("Байгууллагын мэдээлэл амжилттай хадгалагдлаа.");

      setShowCompleteModal(true);

      setTimeout(() => {
        window.location.replace("/user/home");
      }, 900);
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
    const img = event.currentTarget;
    const fallback = img.src.endsWith(defaultCover)
      ? DEFAULT_COVERS[0]
      : defaultCover;

    if (img.src.endsWith(fallback)) {
      img.onerror = null;
      return;
    }

    img.src = fallback;
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

                  objectFit: "contain",
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
              <div className="orgStat">
                <strong>{totalEvents}</strong>

                <span>Эвент зохион байгуулсан</span>
              </div>

              <div className="orgStat">
                <strong>{totalParticipants}</strong>

                <span>Нийт оролцогч</span>
              </div>

              <div className="orgStat">
                <strong>{followers}</strong>

                <span>Дагагч</span>
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

          <OrganizationProfileForm
            activeSection={activeSection}
            coverSrc={coverSrc}
            fieldErrors={fieldErrors}
            form={form}
            handleChange={handleChange}
            handleCoverError={handleCoverError}
            handleLogoError={handleLogoError}
            logoSrc={logoSrc}
            selectCover={selectCover}
            selectLogo={selectLogo}
          />
        </div>

        <footer className="orgStickyFooter">
          <button type="button" onClick={saveOrganization} disabled={saving}>
            {saving ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
          </button>
        </footer>

        {showCompleteModal && (
          <div className="orgCompleteModalBackdrop">
            <div className="orgCompleteModal">
              <FiCheck />

              <h2>Байгууллагын профайл бүрэн боллоо!</h2>

              <p>Мэдээлэл, лого болон cover зураг амжилттай хадгалагдлаа.</p>

              <button type="button" onClick={goToDashboard}>
                Нүүр хуудас руу очих
              </button>
            </div>
          </div>
        )}
      </main>
    </UserShell>
  );
}
