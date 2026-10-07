import { useEffect, useMemo, useState } from "react";

import { NavLink, useNavigate } from "react-router-dom";

import {
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUser,
  FiX,
} from "react-icons/fi";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getText(value) {
  return value == null ? "" : String(value).trim();
}

function getAvatarValue(profile) {
  return (
    profile?.avatar_url ||
    profile?.avatar ||
    profile?.profile_image ||
    profile?.profile_image_url ||
    ""
  );
}

function getAvatarSource(value) {
  const image = getText(value);
  if (!image) return "";
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  )
    return image;
  if (image.startsWith("/")) return `${API_BASE}${image}`;
  return `${API_BASE}/${image}`;
}

function getInterests(profile) {
  if (Array.isArray(profile?.interests)) {
    return profile.interests.filter(Boolean);
  }

  if (typeof profile?.interests === "string") {
    try {
      const parsed = JSON.parse(profile.interests);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return profile.interests

        .split(",")

        .map((item) => item.trim())

        .filter(Boolean);
    }
  }

  return [];
}

function getProfileCompletion(profile) {
  const firstName = getText(
    profile?.firstName || profile?.first_name || profile?.name,
  );

  const lastName = getText(
    profile?.lastName || profile?.last_name || profile?.surname,
  );

  const phone = getText(profile?.phone).replace(/\D/g, "");

  const company = getText(
    profile?.company_name || profile?.company || profile?.organization,
  );

  const jobTitle = getText(profile?.job_title || profile?.jobTitle);

  const interests = getInterests(profile);

  const sections = [
    Boolean(firstName && lastName),

    /^\d{8}$/.test(phone),

    Boolean(company && jobTitle),

    interests.length > 0,
  ];

  return sections.filter(Boolean).length * 25;
}

function getInitials(profile) {
  const firstName = getText(
    profile?.firstName || profile?.first_name || profile?.name,
  );

  const lastName = getText(
    profile?.lastName || profile?.last_name || profile?.surname,
  );

  const first = firstName.charAt(0);

  const last = lastName.charAt(0);

  return `${first}${last}`.toUpperCase() || "U";
}

function getFullName(profile) {
  const firstName = getText(
    profile?.firstName || profile?.first_name || profile?.name,
  );

  const lastName = getText(
    profile?.lastName || profile?.last_name || profile?.surname,
  );

  return [firstName, lastName].filter(Boolean).join(" ") || "Хэрэглэгч";
}

function getSubtitle(profile) {
  const jobTitle = getText(profile?.job_title || profile?.jobTitle);

  const company = getText(
    profile?.company_name || profile?.company || profile?.organization,
  );

  if (jobTitle && company) {
    return `${jobTitle} · ${company}`;
  }

  return jobTitle || company || "";
}

export default function Password() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => getStoredUser());

  const [profileLoading, setProfileLoading] = useState(true);

  const [form, setForm] = useState({
    currentPassword: "",

    newPassword: "",

    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,

    new: false,

    confirm: false,
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });

        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");

            localStorage.removeItem("user");

            localStorage.removeItem("profileComplete");

            navigate("/login", { replace: true });
          }

          return;
        }

        const loadedProfile = data?.user || data;
        const storedProfile = getStoredUser();
        const avatarValue =
          getAvatarValue(loadedProfile) || getAvatarValue(storedProfile);
        const mergedProfile = {
          ...storedProfile,
          ...loadedProfile,
          avatar_url: avatarValue,
        };

        if (!cancelled) {
          setProfile(mergedProfile);
          localStorage.setItem("user", JSON.stringify(mergedProfile));
        }
      } catch {
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    const refreshProfile = () => setProfile(getStoredUser());

    const handleStorage = (event) => {
      if (!event.key || event.key === "user") refreshProfile();
    };

    window.addEventListener("profile-updated", refreshProfile);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("profile-updated", refreshProfile);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const completion = useMemo(
    () => getProfileCompletion(profile),

    [profile],
  );

  const initials = useMemo(
    () => getInitials(profile),

    [profile],
  );

  const fullName = useMemo(
    () => getFullName(profile),

    [profile],
  );

  const subtitle = useMemo(() => getSubtitle(profile), [profile]);

  const avatarSource = useMemo(
    () => getAvatarSource(getAvatarValue(profile)),
    [profile],
  );

  const passwordRules = {
    length: form.newPassword.length >= 8,

    number: /\d/.test(form.newPassword),

    symbol: /[^A-Za-z0-9]/.test(form.newPassword),
  };

  const isNewPasswordValid =
    passwordRules.length && passwordRules.number && passwordRules.symbol;

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: value,
    }));

    setError("");

    setSuccess("");
  }

  function togglePassword(field) {
    setShowPassword((current) => ({
      ...current,

      [field]: !current[field],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    setSuccess("");

    if (!form.currentPassword.trim()) {
      setError("Одоогийн нууц үгээ оруулна уу.");

      return;
    }

    if (!form.newPassword) {
      setError("Шинэ нууц үгээ оруулна уу.");

      return;
    }

    if (form.newPassword.length < 8) {
      setError("Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.");

      return;
    }

    if (!/\d/.test(form.newPassword)) {
      setError("Шинэ нууц үг хамгийн багадаа 1 тоо агуулсан байх ёстой.");

      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.newPassword)) {
      setError(
        "Шинэ нууц үг хамгийн багадаа 1 тусгай тэмдэгт агуулсан байх ёстой.",
      );

      return;
    }

    if (!form.confirmPassword) {
      setError("Шинэ нууц үгээ дахин оруулна уу.");

      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Шинэ нууц үг таарахгүй байна.");

      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/auth/change-password`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            current_password: form.currentPassword,

            new_password: form.newPassword,

            confirm_password: form.confirmPassword,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message || "Нууц үгийг шинэчилж чадсангүй.");

        return;
      }

      setForm({
        currentPassword: "",

        newPassword: "",

        confirmPassword: "",
      });

      setShowPassword({
        current: false,

        new: false,

        confirm: false,
      });

      setSuccess(data?.message || "Нууц үг амжилттай шинэчлэгдлээ.");
    } catch {
      setError("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserShell title="Нууц үг солих">
      <main className="rpPage">
        <div className="rpHeading">
          <h1>Профайл</h1>

          <p>Хувийн мэдээлэл, нууц үг, байгууллага, төлбөр</p>
        </div>

        <div className="rpLayout">
          <aside className="rpSidebar">
            <div className="rpProfileCard">
              <div className="rpAvatarWrap">
                <div
                  className={`rpAvatar ${avatarSource ? "hasImage" : ""}`}
                  style={
                    avatarSource ? { background: "transparent" } : undefined
                  }
                >
                  {profileLoading ? (
                    ""
                  ) : avatarSource ? (
                    <img
                      src={avatarSource}
                      alt={fullName}
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        borderRadius: "50%",
                        background: "transparent",
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div className="rpCamera">
                  <FiCamera />
                </div>
              </div>

              <h2>{profileLoading ? "..." : fullName}</h2>

              <p>{profileLoading ? "" : subtitle}</p>

              <div className="rpProgressTitle">
                <span>Профайл бөглөлт</span>

                <b>{completion}%</b>
              </div>

              <div className="rpProgress">
                <span
                  style={{
                    width: `${completion}%`,
                  }}
                />
              </div>
            </div>

            <nav className="rpNav">
              <NavLink
                to="/user/profile"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <FiUser />

                <span>Хувийн мэдээлэл</span>
              </NavLink>

              <NavLink
                to="/user/password"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <FiLock />

                <span>Нууц үг солих</span>
              </NavLink>

              {/* <NavLink
                to="/user/password"
              >
                <FiCreditCard />

                <span>Төлбөр ба багц</span>
              </NavLink> */}
            </nav>
          </aside>

          <div className="rpContent">
            <section className="rpCard passwordProfileCard">
              <div className="rpCardHead passwordProfileCardHeader">
                <h3>Нууц үг солих</h3>

                <span className="passwordSecurityBadge">Аюулгүй байдал</span>
              </div>

              <form className="passwordProfileForm" onSubmit={handleSubmit}>
                <div className="passwordProfileField">
                  <label htmlFor="currentPassword">
                    ОДООГИЙН НУУЦ ҮГ <span>*</span>
                  </label>

                  <div className="passwordProfileInput">
                    <input
                      id="currentPassword"
                      type={showPassword.current ? "text" : "password"}
                      name="currentPassword"
                      value={form.currentPassword}
                      onChange={updateField}
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword.current ? "Нууц үг нуух" : "Нууц үг харах"
                      }
                      onClick={() => togglePassword("current")}
                    >
                      {showPassword.current ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="passwordProfileField">
                  <label htmlFor="newPassword">
                    ШИНЭ НУУЦ ҮГ <span>*</span>
                  </label>

                  <div className="passwordProfileInput">
                    <input
                      id="newPassword"
                      type={showPassword.new ? "text" : "password"}
                      name="newPassword"
                      value={form.newPassword}
                      onChange={updateField}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword.new ? "Нууц үг нуух" : "Нууц үг харах"
                      }
                      onClick={() => togglePassword("new")}
                    >
                      {showPassword.new ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  <div className="passwordRequirements">
                    <PasswordRule
                      valid={passwordRules.length}
                      text="Хамгийн багадаа 8 тэмдэгт"
                    />

                    <PasswordRule
                      valid={passwordRules.number}
                      text="Хамгийн багадаа 1 тоо"
                    />

                    <PasswordRule
                      valid={passwordRules.symbol}
                      text="Хамгийн багадаа 1 тусгай тэмдэгт"
                    />
                  </div>
                </div>

                <div className="passwordProfileField">
                  <label htmlFor="confirmPassword">
                    ШИНЭ НУУЦ ҮГИЙГ БАТАЛГААЖУУЛАХ <span>*</span>
                  </label>

                  <div className="passwordProfileInput">
                    <input
                      id="confirmPassword"
                      type={showPassword.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={updateField}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword.confirm ? "Нууц үг нуух" : "Нууц үг харах"
                      }
                      onClick={() => togglePassword("confirm")}
                    >
                      {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  {form.confirmPassword && (
                    <div
                      className={`passwordMatch ${
                        form.newPassword === form.confirmPassword
                          ? "valid"
                          : "invalid"
                      }`}
                    >
                      {form.newPassword === form.confirmPassword ? (
                        <>
                          <FiCheck />

                          <span>Нууц үг таарч байна</span>
                        </>
                      ) : (
                        <>
                          <FiX />

                          <span>Нууц үг таарахгүй байна</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="passwordProfileMessage error">{error}</div>
                )}

                {success && (
                  <div className="passwordProfileMessage success">
                    <FiCheckCircle />

                    <span>{success}</span>
                  </div>
                )}

                <div className="passwordProfileActions">
                  <button
                    type="button"
                    className="passwordProfileCancel"
                    onClick={() => navigate("/user/profile")}
                    disabled={loading}
                  >
                    Цуцлах
                  </button>

                  <button
                    type="submit"
                    className="passwordProfileSave"
                    disabled={
                      loading ||
                      !form.currentPassword ||
                      !isNewPasswordValid ||
                      !form.confirmPassword ||
                      form.newPassword !== form.confirmPassword
                    }
                  >
                    {loading ? "Шинэчилж байна..." : "Нууц үг шинэчлэх"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </UserShell>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <div className={`passwordRequirement ${valid ? "valid" : ""}`}>
      <span className="passwordRequirementIcon">
        {valid ? <FiCheck /> : "•"}
      </span>

      <span>{text}</span>
    </div>
  );
}
