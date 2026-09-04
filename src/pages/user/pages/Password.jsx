import { useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
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

  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function updateField(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    if (!form.currentPassword) {
      setError(
        "Одоогийн нууц үгээ оруулна уу.",
      );
      return;
    }

    if (form.newPassword.length < 6) {
      setError(
        "Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна.",
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
            Authorization:
              `Bearer ${token}`,
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

        <section className="rgProfileCard">
          <header className="passwordSettingsHeader">
            <div className="passwordSettingsIcon">
              <FiLock />
            </div>

            <div>
              <h2>Нууц үг солих</h2>

              <p>
                Бүртгэлээ хамгаалахын тулд
                хүчтэй нууц үг ашиглана уу.
              </p>
            </div>
          </header>

          <form
            className="passwordSettingsForm"
            onSubmit={handleSubmit}
          >
            <label className="passwordField">
              <span>
                Одоогийн нууц үг
              </span>

              <div className="passwordInputWrap">
                <input
                  type={
                    show.current
                      ? "text"
                      : "password"
                  }
                  name="currentPassword"
                  value={
                    form.currentPassword
                  }
                  onChange={updateField}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  aria-label="Нууц үг харах"
                  onClick={() =>
                    setShow((current) => ({
                      ...current,
                      current:
                        !current.current,
                    }))
                  }
                >
                  {show.current ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </label>

            <label className="passwordField">
              <span>
                Шинэ нууц үг
              </span>

              <div className="passwordInputWrap">
                <input
                  type={
                    show.next
                      ? "text"
                      : "password"
                  }
                  name="newPassword"
                  value={
                    form.newPassword
                  }
                  onChange={updateField}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  aria-label="Нууц үг харах"
                  onClick={() =>
                    setShow((current) => ({
                      ...current,
                      next: !current.next,
                    }))
                  }
                >
                  {show.next ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </label>

            <label className="passwordField">
              <span>
                Шинэ нууц үгийг
                баталгаажуулах
              </span>

              <div className="passwordInputWrap">
                <input
                  type={
                    show.confirm
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  value={
                    form.confirmPassword
                  }
                  onChange={updateField}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  aria-label="Нууц үг харах"
                  onClick={() =>
                    setShow((current) => ({
                      ...current,
                      confirm:
                        !current.confirm,
                    }))
                  }
                >
                  {show.confirm ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="passwordMessage error">
                {error}
              </div>
            )}

            {success && (
              <div className="passwordMessage success">
                <FiCheckCircle />
                {success}
              </div>
            )}

            <div className="passwordSettingsActions">
              <button
                type="button"
                className="passwordCancel"
                onClick={() =>
                  navigate("/user/profile")
                }
              >
                Цуцлах
              </button>

              <button
                type="submit"
                className="passwordSave"
                disabled={loading}
              >
                {loading
                  ? "Шинэчилж байна..."
                  : "Нууц үг шинэчлэх"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </UserShell>
  );
}