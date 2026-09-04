import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  FiEye,
  FiEyeOff,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import logo from "../../assets/registra-logo-def.png";
import { API_BASE } from "../../lib/config";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("registra-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.dataset.userTheme = theme;
    localStorage.setItem("registra-theme", theme);
  }, [theme]);

  const redirectByRole = (user) => {
    if (user?.role === "super_admin") {
      navigate("/super-admin/home", {
        replace: true,
      });

      return;
    }

    if (!user?.company_name || !user?.phone) {
      navigate("/profile", {
        replace: true,
      });

      return;
    }

    navigate("/user/home", {
      replace: true,
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveLogin = (data) => {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user),
    );

    localStorage.setItem(
      "token",
      data.token,
    );

    if (data?.user?.role) {
      localStorage.setItem(
        "role",
        data.user.role,
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Нэвтрэхэд алдаа гарлаа.",
        );

        return;
      }

      saveLogin(data);

      redirectByRole(data.user);
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (
    credentialResponse,
  ) => {
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            token:
              credentialResponse.credential,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Google нэвтрэлт амжилтгүй.",
        );

        return;
      }

      saveLogin(data);

      redirectByRole(data.user);
    } catch {
      setMessage(
        "Google нэвтрэлт амжилтгүй.",
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
        aria-label="Theme"
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
            <h1>Тавтай морил</h1>

            <p>
              Registra бүртгэлдээ нэвтэрнэ үү
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
              autoComplete="email"
              placeholder="you@example.com"
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
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />

              <button
                type="button"
                aria-label="Password"
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

            <div className="rgAuthOptions">
              <label className="rgRemember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(
                      event.target.checked,
                    )
                  }
                />

                <span>
                  Намайг сана
                </span>
              </label>

              <Link to="/forgot-password">
                Нууц үгээ мартсан?
              </Link>
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
                ? "Нэвтэрч байна..."
                : "Нэвтрэх"}
            </button>
          </form>

          <div className="rgAuthSignup">
            <span>
              Бүртгэлгүй хэрэглэгч?
            </span>

            <Link to="/signup">
              Үнэгүй бүртгүүлэх
            </Link>
          </div>

          <div className="rgAuthDivider">
            <span>эсвэл</span>
          </div>

          <div className="rgGoogleLogin">
            <GoogleLogin
              onSuccess={
                handleGoogleLogin
              }
              onError={() =>
                setMessage(
                  "Google нэвтрэлт амжилтгүй.",
                )
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}