import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import logo from "../../assets/registra-logo-def.png";
import { API_BASE } from "../../lib/config";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(
        "registra-theme",
      ) || "light",
  );

  useEffect(() => {
    document.documentElement.dataset.userTheme =
      theme;

    localStorage.setItem(
      "registra-theme",
      theme,
    );
  }, [theme]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    if (
      form.password !==
      form.confirmPassword
    ) {
      setMessage(
        "Нууц үг таарахгүй байна.",
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Бүртгүүлэхэд алдаа гарлаа.",
        );

        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user),
      );

      localStorage.setItem(
        "token",
        data.token,
      );

      navigate("/profile", {
        replace: true,
      });
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rgAuthPage">
      <button
        type="button"
        className="rgAuthTheme"
        onClick={() =>
          setTheme((current) =>
            current === "light"
              ? "dark"
              : "light",
          )
        }
      >
        {theme === "light" ? (
          <FiMoon />
        ) : (
          <FiSun />
        )}
      </button>

      <div className="rgAuthCenter">
        <Link
          to="/"
          className="rgAuthLogo"
        >
          <img
            src={logo}
            alt="Registra"
          />
        </Link>

        <section className="rgAuthCard">
          <div className="rgAuthHeading">
            <h1>Бүртгүүлэх</h1>

            <p>
              Registra бүртгэл үүсгэнэ үү
            </p>
          </div>

          <form
            className="rgAuthForm"
            onSubmit={handleSubmit}
          >
            <label>
              И-МЭЙЛ ХАЯГ
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label>
              НУУЦ ҮГ
            </label>

            <div className="rgPasswordField">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current,
                  )
                }
              >
                {showPassword ? (
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
            </div>

            <label>
              НУУЦ ҮГ БАТАЛГААЖУУЛАХ
            </label>

            <div className="rgPasswordField">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                value={
                  form.confirmPassword
                }
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current,
                  )
                }
              >
                {showConfirmPassword ? (
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
            </div>

            {message && (
              <div className="rgAuthError">
                {message}
              </div>
            )}

            <button
              className="rgAuthSubmit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Бүртгэж байна..."
                : "Бүртгүүлэх"}
            </button>
          </form>

          <div className="rgAuthSignup">
            <span>
              Бүртгэлтэй хэрэглэгч?
            </span>

            <Link to="/login">
              Нэвтрэх
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}