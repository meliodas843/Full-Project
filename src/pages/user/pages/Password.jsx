import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiX,
} from "react-icons/fi";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

export default function Password() {
  const navigate = useNavigate();

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

  const passwordRules = {
    length: form.newPassword.length >= 8,
    number: /\d/.test(form.newPassword),
    symbol: /[^A-Za-z0-9]/.test(form.newPassword),
  };

  const isNewPasswordValid =
    passwordRules.length &&
    passwordRules.number &&
    passwordRules.symbol;

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
      setError(
        "Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.",
      );
      return;
    }

    if (!/\d/.test(form.newPassword)) {
      setError(
        "Шинэ нууц үг хамгийн багадаа 1 тоо агуулсан байх ёстой.",
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.newPassword)) {
      setError(
        "Шинэ нууц үг хамгийн багадаа 1 тусгай тэмдэгт агуулсан байх ёстой.",
      );
      return;
    }

    if (!form.confirmPassword) {
      setError(
        "Шинэ нууц үгээ дахин оруулна уу.",
      );
      return;
    }

    if (
      form.newPassword !==
      form.confirmPassword
    ) {
      setError(
        "Шинэ нууц үг таарахгүй байна.",
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password:
              form.currentPassword,
            new_password:
              form.newPassword,
            confirm_password:
              form.confirmPassword,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.message ||
            "Нууц үгийг шинэчилж чадсангүй.",
        );
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

      setSuccess(
        data?.message ||
          "Нууц үг амжилттай шинэчлэгдлээ.",
      );
    } catch {
      setError(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserShell title="Нууц үг солих">
      <main className="rgProfilePage">
        <aside className="rgProfileTabs">
          <NavLink to="/user/profile">
            Профайл
          </NavLink>

          <NavLink
            to="/user/password"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Нууц үг солих
          </NavLink>

          <NavLink to="/user/company">
            Компани
          </NavLink>

          <NavLink to="/user/bill">
            Төлбөр
          </NavLink>
        </aside>

        <div className="passwordProfileContent">
          <section className="rgProfileCard passwordProfileCard">
            <div className="passwordProfileCardHeader">
              <div>
                <h2>Нууц үг солих</h2>
              </div>

              <span className="passwordSecurityBadge">
                Аюулгүй байдал
              </span>
            </div>

            <form
              className="passwordProfileForm"
              onSubmit={handleSubmit}
            >
              <div className="passwordProfileField">
                <label htmlFor="currentPassword">
                  ОДООГИЙН НУУЦ ҮГ
                  <span> *</span>
                </label>

                <div className="passwordProfileInput">
                  <input
                    id="currentPassword"
                    type={
                      showPassword.current
                        ? "text"
                        : "password"
                    }
                    name="currentPassword"
                    value={form.currentPassword}
                    onChange={updateField}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword.current
                        ? "Нууц үг нуух"
                        : "Нууц үг харах"
                    }
                    onClick={() =>
                      togglePassword("current")
                    }
                  >
                    {showPassword.current ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
                  </button>
                </div>
              </div>

              <div className="passwordProfileField">
                <label htmlFor="newPassword">
                  ШИНЭ НУУЦ ҮГ
                  <span> *</span>
                </label>

                <div className="passwordProfileInput">
                  <input
                    id="newPassword"
                    type={
                      showPassword.new
                        ? "text"
                        : "password"
                    }
                    name="newPassword"
                    value={form.newPassword}
                    onChange={updateField}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword.new
                        ? "Нууц үг нуух"
                        : "Нууц үг харах"
                    }
                    onClick={() =>
                      togglePassword("new")
                    }
                  >
                    {showPassword.new ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
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
                  ШИНЭ НУУЦ ҮГИЙГ БАТАЛГААЖУУЛАХ
                  <span> *</span>
                </label>

                <div className="passwordProfileInput">
                  <input
                    id="confirmPassword"
                    type={
                      showPassword.confirm
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword.confirm
                        ? "Нууц үг нуух"
                        : "Нууц үг харах"
                    }
                    onClick={() =>
                      togglePassword("confirm")
                    }
                  >
                    {showPassword.confirm ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
                  </button>
                </div>

                {form.confirmPassword && (
                  <div
                    className={`passwordMatch ${
                      form.newPassword ===
                      form.confirmPassword
                        ? "valid"
                        : "invalid"
                    }`}
                  >
                    {form.newPassword ===
                    form.confirmPassword ? (
                      <>
                        <FiCheck />
                        <span>
                          Нууц үг таарч байна
                        </span>
                      </>
                    ) : (
                      <>
                        <FiX />
                        <span>
                          Нууц үг таарахгүй байна
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="passwordProfileMessage error">
                  {error}
                </div>
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
                  onClick={() =>
                    navigate("/user/profile")
                  }
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
                    form.newPassword !==
                      form.confirmPassword
                  }
                >
                  {loading
                    ? "Шинэчилж байна..."
                    : "Нууц үг шинэчлэх"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </UserShell>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <div
      className={`passwordRequirement ${
        valid ? "valid" : ""
      }`}
    >
      <span className="passwordRequirementIcon">
        {valid ? <FiCheck /> : "•"}
      </span>

      <span>{text}</span>
    </div>
  );
}