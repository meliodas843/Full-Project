import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FiCheck,
  FiCheckCircle,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";

import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

const INTEREST_OPTIONS = [
  { value: "Technology", label: "Технологи" },
  { value: "Design", label: "Дизайн" },
  { value: "Startups", label: "Стартап" },
  { value: "AI & ML", label: "Хиймэл оюун ба машин сургалт" },
  { value: "Finance", label: "Санхүү" },
  { value: "Marketing", label: "Маркетинг" },
  { value: "Leadership", label: "Манлайлал" },
  { value: "Data Science", label: "Өгөгдлийн шинжлэх ухаан" },
];

function getToken() {
  return localStorage.getItem("token");
}

function getText(value) {
  return String(value ?? "").trim();
}

function getPhone(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function getInterests(profile) {
  const value =
    profile?.interests ||
    profile?.professional_interests ||
    profile?.professionalInterests ||
    [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(",")
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);
    }
  }

  return [];
}

function createProfileForm(profile) {
  return {
    firstName: getText(
      profile?.firstName ||
        profile?.first_name
    ),

    lastName: getText(
      profile?.lastName ||
        profile?.last_name
    ),

    company_name: getText(
      profile?.company_name ||
        profile?.company ||
        profile?.organization
    ),

    phone: getPhone(
      profile?.phone
    ),

    job_title: getText(
      profile?.job_title ||
        profile?.jobTitle
    ),

    interests:
      getInterests(profile),
  };
}

function getSectionStatus(form) {
  const personal =
    Boolean(
      form.firstName.trim()
    ) &&
    Boolean(
      form.lastName.trim()
    );

  const contact =
    /^\d{8}$/.test(
      form.phone
    );

  const organization =
    Boolean(
      form.company_name.trim()
    ) &&
    Boolean(
      form.job_title.trim()
    );

  const interests =
    form.interests.length > 0;

  return {
    personal,
    contact,
    organization,
    interests,
  };
}

function isProfileComplete(profile) {
  const form =
    createProfileForm(profile);

  const status =
    getSectionStatus(form);

  return (
    status.personal &&
    status.contact &&
    status.organization &&
    status.interests
  );
}

function SectionStatus({
  complete,
}) {
  return (
    <span
      className={`rgOnboardingStatus ${
        complete
          ? "complete"
          : "incomplete"
      }`}
    >
      {complete
        ? "Бүрэн"
        : "Дутуу"}
    </span>
  );
}

export default function Profile() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    profileSaved,
    setProfileSaved,
  ] = useState(false);

  const [
    showCompleteModal,
    setShowCompleteModal,
  ] = useState(false);

  const [form, setForm] =
    useState({
      firstName: "",
      lastName: "",
      company_name: "",
      phone: "",
      job_title: "",
      interests: [],
    });

  async function loadProfile() {
    const token =
      getToken();

    if (!token) {
      navigate(
        "/login",
        {
          replace: true,
        }
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE}/api/profile/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          localStorage.removeItem(
            "profileComplete"
          );

          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        setError(
          data?.message ||
            "Профайл уншихад алдаа гарлаа."
        );

        return;
      }

      const profile =
        data?.user || data;

      const loadedForm =
        createProfileForm(
          profile
        );

      const complete =
        isProfileComplete(
          profile
        );

      setUser(profile);

      setForm(
        loadedForm
      );

      setProfileSaved(
        complete
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          profile
        )
      );

      localStorage.setItem(
        "profileComplete",
        complete
          ? "true"
          : "false"
      );
    } catch (err) {
      console.error(
        "Load profile error:",
        err
      );

      setError(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const sectionStatus =
    useMemo(
      () =>
        getSectionStatus(
          form
        ),
      [form]
    );

  const completedCount =
    useMemo(() => {
      return Object.values(
        sectionStatus
      ).filter(Boolean).length;
    }, [sectionStatus]);

  const progress =
    completedCount * 25;

  const allSectionsComplete =
    completedCount === 4;

  function change(event) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,

        [name]:
          name === "phone"
            ? value
                .replace(
                  /\D/g,
                  ""
                )
                .slice(0, 8)
            : value,
      })
    );

    setError("");
  }

  function toggleInterest(
    interest
  ) {
    setForm(
      (current) => {
        const selected =
          current.interests.includes(
            interest
          );

        return {
          ...current,

          interests:
            selected
              ? current.interests.filter(
                  (item) =>
                    item !==
                    interest
                )
              : [
                  ...current.interests,
                  interest,
                ],
        };
      }
    );

    setError("");
  }

  function validate() {
    if (
      !form.firstName.trim()
    ) {
      setError(
        "Нэрээ оруулна уу."
      );

      return false;
    }

    if (
      !form.lastName.trim()
    ) {
      setError(
        "Овгоо оруулна уу."
      );

      return false;
    }

    if (
      !/^\d{8}$/.test(
        form.phone
      )
    ) {
      setError(
        "Утасны дугаар 8 оронтой байна."
      );

      return false;
    }

    if (
      !form.company_name.trim()
    ) {
      setError(
        "Байгууллагын нэрээ оруулна уу."
      );

      return false;
    }

    if (
      !form.job_title.trim()
    ) {
      setError(
        "Албан тушаалаа оруулна уу."
      );

      return false;
    }

    if (
      form.interests.length ===
      0
    ) {
      setError(
        "Сонирхлын чиглэлээс дор хаяж нэгийг сонгоно уу."
      );

      return false;
    }

    setError("");

    return true;
  }

  async function save() {
    if (!validate()) {
      return;
    }

    const token =
      getToken();

    if (!token) {
      navigate(
        "/login",
        {
          replace: true,
        }
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        firstName:
          form.firstName.trim(),

        lastName:
          form.lastName.trim(),

        company_name:
          form.company_name.trim(),

        phone:
          form.phone.trim(),

        job_title:
          form.job_title.trim(),

        interests:
          form.interests,
      };

      const response =
        await fetch(
          `${API_BASE}/api/profile/me`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.message ||
            "Профайл хадгалахад алдаа гарлаа."
        );

        return;
      }

      const updated = {
        ...user,
        ...(data?.user || {}),

        firstName:
          payload.firstName,

        first_name:
          payload.firstName,

        lastName:
          payload.lastName,

        last_name:
          payload.lastName,

        company_name:
          payload.company_name,

        company:
          payload.company_name,

        organization:
          payload.company_name,

        phone:
          payload.phone,

        job_title:
          payload.job_title,

        jobTitle:
          payload.job_title,

        interests:
          payload.interests,

        professional_interests:
          payload.interests,

        professionalInterests:
          payload.interests,
      };

      setUser(updated);

      setForm(
        createProfileForm(
          updated
        )
      );

      setProfileSaved(
        true
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          updated
        )
      );

      localStorage.setItem(
        "profileComplete",
        "true"
      );

      window.dispatchEvent(
        new Event(
          "profile-updated"
        )
      );

      if (
        location.state
          ?.profileRequired
      ) {
        window.history.replaceState(
          {},
          document.title,
          location.pathname
        );
      }

      setShowCompleteModal(
        true
      );
    } catch (err) {
      console.error(
        "Save profile error:",
        err
      );

      setError(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setSaving(false);
    }
  }

  function goToDashboard() {
    localStorage.setItem(
      "profileComplete",
      "true"
    );

    setShowCompleteModal(
      false
    );

    window.location.replace(
      "/user/home"
    );
  }

  if (loading) {
    return (
      <UserShell title="Профайл">
        <div className="rgOnboardingLoading">
          Профайл уншиж байна...
        </div>
      </UserShell>
    );
  }

  if (!user) {
    return (
      <UserShell title="Профайл">
        <div className="rgOnboardingLoading">
          Профайл олдсонгүй.
        </div>
      </UserShell>
    );
  }

  return (
    <UserShell title="Профайл">
      <main className="rgOnboardingPage">
        <div className="rgOnboardingContainer">
          {!profileSaved && (
            <section className="rgOnboardingWelcome">
              <div className="rgOnboardingWelcomeIcon">
                <FiShield />
              </div>

              <div className="rgOnboardingWelcomeContent">
                <h1>
                  Registra-д тавтай морил!
                  Эхлэхийн тулд профайлаа бүрэн бөглөнө үү.
                </h1>

                <p>
                  Эвентүүдэд бүртгүүлж, бусад оролцогчидтой холбогдохын тулд доорх шаардлагатай бүх талбарыг бөглөнө үү. Таны профайл бүрэн бөглөгдсөний дараа бусад хуудсууд нээгдэнэ.
                </p>

                <strong className="rgOnboardingProgressText">
                  Профайл бөглөлт:{" "}
                  {progress}% (
                  {completedCount} of 4
                  sections done)
                </strong>

                <div className="rgOnboardingProgress">
                  <span
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>

                <div className="rgOnboardingProgressLabels">
                  <span
                    className={
                      sectionStatus.personal
                        ? "done"
                        : ""
                    }
                  >
                    <i>
                      {sectionStatus.personal ? (
                        <FiCheck />
                      ) : null}
                    </i>

                    Хувийн мэдээлэл
                  </span>

                  <span
                    className={
                      sectionStatus.contact
                        ? "done"
                        : ""
                    }
                  >
                    <i>
                      {sectionStatus.contact ? (
                        <FiCheck />
                      ) : null}
                    </i>

                    Холбоо барих мэдээлэл
                  </span>

                  <span
                    className={
                      sectionStatus.organization
                        ? "done"
                        : ""
                    }
                  >
                    <i>
                      {sectionStatus.organization ? (
                        <FiCheck />
                      ) : null}
                    </i>

                    Байгууллага ба албан тушаал
                  </span>

                  <span
                    className={
                      sectionStatus.interests
                        ? "done"
                        : ""
                    }
                  >
                    <i>
                      {sectionStatus.interests ? (
                        <FiCheck />
                      ) : null}
                    </i>

                    Мэргэжлийн сонирхол
                  </span>
                </div>
              </div>
            </section>
          )}

          <div className="rgOnboardingRequiredText">
            <span>*</span>
            Заавал бөглөх талбарууд
          </div>

          {error && (
            <div className="rgOnboardingError">
              {error}
            </div>
          )}

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Хувийн мэдээлэл
              </h2>

              <SectionStatus
                complete={
                  sectionStatus.personal
                }
              />
            </header>

            <div className="rgOnboardingSectionBody">
              <div className="rgOnboardingTwoColumns">
                <div className="rgOnboardingField">
                  <label>
                    НЭР
                    <span>*</span>
                  </label>

                  <input
                    name="firstName"
                    value={
                      form.firstName
                    }
                    onChange={
                      change
                    }
                    placeholder="Нэр"
                    autoComplete="given-name"
                  />
                </div>

                <div className="rgOnboardingField">
                  <label>
                    ОВОГ
                    <span>*</span>
                  </label>

                  <input
                    name="lastName"
                    value={
                      form.lastName
                    }
                    onChange={
                      change
                    }
                    placeholder="Овог"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="rgOnboardingReadonly">
                <span>
                  И-мэйл (бүртгэлээс)
                </span>

                <strong>
                  {user.email ||
                    "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Холбоо барих мэдээлэл
              </h2>

              <SectionStatus
                complete={
                  sectionStatus.contact
                }
              />
            </header>

            <div className="rgOnboardingSectionBody">
              <div className="rgOnboardingField">
                <label>
                  УТАСНЫ ДУГААР
                  <span>*</span>
                </label>

                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={
                    form.phone
                  }
                  onChange={
                    change
                  }
                  placeholder="Жишээ: 99091442"
                  maxLength={8}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Байгууллага ба албан тушаал
              </h2>

              <SectionStatus
                complete={
                  sectionStatus.organization
                }
              />
            </header>

            <div className="rgOnboardingSectionBody">
              <div className="rgOnboardingTwoColumns">
                <div className="rgOnboardingField">
                  <label>
                    БАЙГУУЛЛАГА
                    <span>*</span>
                  </label>

                  <input
                    name="company_name"
                    value={
                      form.company_name
                    }
                    onChange={
                      change
                    }
                    placeholder="Байгууллагын нэрээ оруулна уу"
                    autoComplete="organization"
                  />
                </div>

                <div className="rgOnboardingField">
                  <label>
                    АЛБАН ТУШААЛ
                    <span>*</span>
                  </label>

                  <input
                    name="job_title"
                    value={
                      form.job_title
                    }
                    onChange={
                      change
                    }
                    placeholder="Жишээ: Програм хангамжийн инженер"
                    autoComplete="organization-title"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Мэргэжлийн сонирхол
              </h2>

              <SectionStatus
                complete={
                  sectionStatus.interests
                }
              />
            </header>

            <div className="rgOnboardingSectionBody">
              <div className="rgOnboardingField">
                <label>
                  СОНИРХЛЫН ЧИГЛЭЛЭЭ СОНГОНО УУ
                  <span>*</span>
                </label>

                <div className="rgOnboardingInterests">
                  {INTEREST_OPTIONS.map(
                    (interest) => {
                      const selected =
                        form.interests.includes(
                          interest.value
                        );

                      return (
                        <button
                          key={
                            interest.value
                          }
                          type="button"
                          className={
                            selected
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            toggleInterest(
                              interest.value
                            )
                          }
                        >
                          {selected && (
                            <FiCheck />
                          )}

                          {interest.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="rgOnboardingBottomSpace" />
        </div>

        <footer className="rgOnboardingStickyFooter">
          <button
            type="button"
            onClick={save}
            disabled={
              saving ||
              !allSectionsComplete
            }
          >
            <span>
              {saving
                ? "Хадгалж байна..."
                : profileSaved
                  ? "Өөрчлөлт хадгалах"
                  : "Хадгалаад үргэлжлүүлэх"}
            </span>

            {!saving && (
              <FiArrowRight />
            )}
          </button>
        </footer>

        {showCompleteModal && (
          <div className="rgProfileCompleteOverlay">
            <div className="rgProfileCompleteModal">
              <div className="rgProfileCompleteIcon">
                <FiCheckCircle />
              </div>

              <h2>
                Таны профайл бүрэн боллоо!
              </h2>

              <p>
                Та одоо Registra-ийн бүх боломжийг ашиглах эрхтэй боллоо. Удахгүй болох IT эвентүүдийг үзэж, бусад оролцогчидтой холбогдоорой.
              </p>

              <button
                type="button"
                onClick={
                  goToDashboard
                }
              >
                Дашбоард руу очих
              </button>
            </div>
          </div>
        )}
      </main>
    </UserShell>
  );
}