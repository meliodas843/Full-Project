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
  "Technology",
  "Design",
  "Startups",
  "AI & ML",
  "Finance",
  "Marketing",
  "Leadership",
  "Data Science",
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
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
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

function getInitials(profile) {
  const firstName = getText(
    profile?.firstName ||
      profile?.first_name
  );

  const lastName = getText(
    profile?.lastName ||
      profile?.last_name
  );

  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`
      .toUpperCase();
  }

  const email = getText(profile?.email);

  if (email) {
    return email
      .slice(0, 2)
      .toUpperCase();
  }

  return "U";
}

function getSectionStatus(form) {
  const personal =
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim());

  const contact =
    /^\d{8}$/.test(form.phone);

  const organization =
    Boolean(form.company_name.trim()) &&
    Boolean(form.job_title.trim());

  const interests =
    form.interests.length > 0;

  return {
    personal,
    contact,
    organization,
    interests,
  };
}

function getRequiredProfileComplete(form) {
  return Boolean(
    form.firstName.trim() &&
      form.lastName.trim() &&
      form.company_name.trim() &&
      /^\d{8}$/.test(form.phone)
  );
}

function SectionStatus({ complete }) {
  return (
    <span
      className={`rgOnboardingStatus ${
        complete
          ? "complete"
          : "incomplete"
      }`}
    >
      {complete
        ? "Complete"
        : "Incomplete"}
    </span>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showCompleteModal, setShowCompleteModal] =
    useState(false);

  const [form, setForm] =
    useState({
      firstName: "",
      lastName: "",
      company_name: "",
      phone: "",
      job_title: "",
      interests: [],
    });

  function fillForm(profile) {
    setForm({
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
    });
  }

  async function loadProfile() {
    const token = getToken();

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

      setUser(profile);
      fillForm(profile);

      localStorage.setItem(
        "user",
        JSON.stringify(profile)
      );

      const initialForm = {
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

      localStorage.setItem(
        "profileComplete",
        getRequiredProfileComplete(
          initialForm
        )
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
        getSectionStatus(form),
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

  const requiredComplete =
    useMemo(
      () =>
        getRequiredProfileComplete(
          form
        ),
      [form]
    );

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
                .replace(/\D/g, "")
                .slice(0, 8)
            : value,
      })
    );

    setError("");
  }

  function toggleInterest(
    interest
  ) {
    setForm((current) => {
      const selected =
        current.interests.includes(
          interest
        );

      return {
        ...current,

        interests: selected
          ? current.interests.filter(
              (item) =>
                item !== interest
            )
          : [
              ...current.interests,
              interest,
            ],
      };
    });

    setError("");
  }

  function validate() {
    if (!form.firstName.trim()) {
      setError(
        "Нэрээ оруулна уу."
      );

      return false;
    }

    if (!form.lastName.trim()) {
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
      form.interests.length === 0
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

    const token = getToken();

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
      };

      setUser(updated);

      localStorage.setItem(
        "user",
        JSON.stringify(updated)
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

      setShowCompleteModal(true);
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
    setShowCompleteModal(false);

    navigate(
      "/user/home",
      {
        replace: true,
      }
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
          <section className="rgOnboardingWelcome">
              <div className="rgOnboardingWelcomeIcon">
                <FiShield />
              </div>

              <div className="rgOnboardingWelcomeContent">
                <h1>
                  Welcome to Registra!
                  Complete your profile
                  to get started
                </h1>

                <p>
                  To register for events
                  and connect with other
                  attendees, please fill
                  in all required fields
                  below. Other pages will
                  unlock once your
                  profile is complete.
                </p>

                <strong className="rgOnboardingProgressText">
                  Profile completion:{" "}
                  {progress}% (
                  {completedCount} of 4
                  sections done)
                </strong>

                <div className="rgOnboardingProgress">
                  <span
                    style={{
                      width: `${progress}%`,
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

                    Personal information
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

                    Contact details
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

                    Organization & job title
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

                    Professional interests
                  </span>
                </div>
              </div>
            </section>

          <div className="rgOnboardingRequiredText">
            <span>*</span>
            Required fields
          </div>

          {error && (
            <div className="rgOnboardingError">
              {error}
            </div>
          )}

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Personal Information
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
                    FIRST NAME
                    <span>*</span>
                  </label>

                  <input
                    name="firstName"
                    value={
                      form.firstName
                    }
                    onChange={change}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>

                <div className="rgOnboardingField">
                  <label>
                    LAST NAME
                    <span>*</span>
                  </label>

                  <input
                    name="lastName"
                    value={
                      form.lastName
                    }
                    onChange={change}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="rgOnboardingReadonly">
                <span>
                  Email (from account)
                </span>

                <strong>
                  {user.email || "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Contact Details
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
                  PHONE NUMBER
                  <span>*</span>
                </label>

                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={change}
                  placeholder="e.g. 9909 1442"
                  maxLength={8}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Organization & Job Title
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
                    ORGANIZATION
                    <span>*</span>
                  </label>

                  <input
                    name="company_name"
                    value={
                      form.company_name
                    }
                    onChange={change}
                    placeholder="Please enter your organization name"
                    autoComplete="organization"
                  />
                </div>

                <div className="rgOnboardingField">
                  <label>
                    JOB TITLE
                    <span>*</span>
                  </label>

                  <input
                    name="job_title"
                    value={
                      form.job_title
                    }
                    onChange={change}
                    placeholder="e.g. Software Engineer"
                    autoComplete="organization-title"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rgOnboardingSection">
            <header className="rgOnboardingSectionHeader">
              <h2>
                Professional Interests
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
                  SELECT YOUR INTERESTS
                  <span>*</span>
                </label>

                <div className="rgOnboardingInterests">
                  {INTEREST_OPTIONS.map(
                    (interest) => {
                      const selected =
                        form.interests.includes(
                          interest
                        );

                      return (
                        <button
                          key={interest}
                          type="button"
                          className={
                            selected
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            toggleInterest(
                              interest
                            )
                          }
                        >
                          {selected && (
                            <FiCheck />
                          )}

                          {interest}
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
                ? "Saving..."
                : "Save & Continue"}
            </span>

            {!saving && (
              <FiArrowRight />
            )}
          </button>
        </footer>
      </main>

      {showCompleteModal && (
        <div className="rgProfileCompleteOverlay">
          <div className="rgProfileCompleteModal">
            <div className="rgProfileCompleteIcon">
              <FiCheckCircle />
            </div>

            <h2>
              Your profile is complete!
            </h2>

            <p>
              You now have full access
              to Registra. Explore
              upcoming IT events and
              connect with other
              attendees.
            </p>

            <button
              type="button"
              onClick={
                goToDashboard
              }
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </UserShell>
  );
}