import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { API_BASE } from "../../lib/config";
import Navbar from "../../components/Navbar";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [message, setMessage] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [remember, setRemember] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    passwordSetupEmail,
    setPasswordSetupEmail,
  ] = useState("");

  const [
    sendingSetup,
    setSendingSetup,
  ] = useState(false);

  const redirectByRole = (
    user
  ) => {
    if (
      user?.role ===
      "super_admin"
    ) {
      navigate(
        "/super-admin/home",
        {
          replace: true,
        }
      );

      return;
    }

    if (
      !user?.company_name ||
      !user?.phone
    ) {
      navigate("/profile", {
        replace: true,
      });

      return;
    }

    navigate("/user/home", {
      replace: true,
    });
  };

  const handleChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "email") {
      setPasswordSetupEmail("");
    }

    setMessage("");
  };

  const saveLogin = (data) => {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    localStorage.setItem(
      "token",
      data.token
    );

    if (data?.user?.role) {
      localStorage.setItem(
        "role",
        data.user.role
      );
    }
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setPasswordSetupEmail("");
    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE}/api/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              form
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        if (
          data?.code ===
          "PASSWORD_NOT_SET"
        ) {
          setPasswordSetupEmail(
            data?.email ||
              form.email
          );

          setMessage(
            "Таны бүртгэл үүссэн байна. Нэвтрэхийн өмнө нууц үгээ үүсгэнэ үү."
          );

          return;
        }

        setMessage(
          data?.message ||
            "Нэвтрэхэд алдаа гарлаа."
        );

        return;
      }

      saveLogin(data);

      redirectByRole(
        data.user
      );
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordSetupLink =
    async () => {
      const email = String(
        passwordSetupEmail ||
          form.email ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!email) {
        setMessage(
          "И-мэйл хаягаа оруулна уу."
        );

        return;
      }

      try {
        setSendingSetup(true);
        setMessage("");

        const response =
          await fetch(
            `${API_BASE}/api/password/forgot`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  email,
                }
              ),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          setMessage(
            data?.message ||
              "Нууц үг үүсгэх холбоос илгээж чадсангүй."
          );

          return;
        }

        setMessage(
          "Нууц үг үүсгэх холбоос таны и-мэйл хаяг руу илгээгдлээ."
        );
      } catch {
        setMessage(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setSendingSetup(
          false
        );
      }
    };

  const handleGoogleLogin =
    async (
      credentialResponse
    ) => {
      setMessage("");
      setPasswordSetupEmail("");
      setLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/auth/google`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  token:
                    credentialResponse
                      .credential,
                }
              ),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          setMessage(
            data?.message ||
              "Google нэвтрэлт амжилтгүй."
          );

          return;
        }

        saveLogin(data);

        redirectByRole(
          data.user
        );
      } catch {
        setMessage(
          "Google нэвтрэлт амжилтгүй."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <>
      <Navbar />

      <main className="rgAuthPage">
        <div className="rgAuthCenter">
          <section className="rgAuthCard">
            <div className="rgAuthHeading">
              <h1>
                Тавтай морил
              </h1>

              <p>
                Registra
                бүртгэлдээ
                нэвтэрнэ үү
              </p>
            </div>

            <form
              className="rgAuthForm"
              onSubmit={
                handleSubmit
              }
            >
              <label>
                И-МЭЙЛ ХАЯГ
              </label>

              <input
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={
                  handleChange
                }
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
                  value={
                    form.password
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Нууц үг нуух"
                      : "Нууц үг харах"
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
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
                    checked={
                      remember
                    }
                    onChange={(
                      event
                    ) =>
                      setRemember(
                        event
                          .target
                          .checked
                      )
                    }
                  />

                  <span>
                    Намайг сана
                  </span>
                </label>

                <Link to="/forgot-password">
                  Нууц үгээ
                  мартсан?
                </Link>
              </div>

              {message && (
                <div className="rgAuthError">
                  {message}
                </div>
              )}

              {passwordSetupEmail && (
                <button
                  type="button"
                  className="rgAuthSetupPassword"
                  onClick={
                    sendPasswordSetupLink
                  }
                  disabled={
                    sendingSetup
                  }
                >
                  {sendingSetup
                    ? "Илгээж байна..."
                    : "Нууц үг үүсгэх холбоос авах"}
                </button>
              )}

              <button
                className="rgAuthSubmit"
                type="submit"
                disabled={
                  loading ||
                  sendingSetup
                }
              >
                {loading
                  ? "Нэвтэрч байна..."
                  : "Нэвтрэх"}
              </button>
            </form>

            <div className="rgAuthSignup">
              <span>
                Бүртгэлгүй
                хэрэглэгч?
              </span>

              <Link to="/signup">
                Үнэгүй
                бүртгүүлэх
              </Link>
            </div>

            <div className="rgAuthDivider">
              <span>
                эсвэл
              </span>
            </div>

            <div className="rgGoogleLogin">
              <GoogleLogin
                onSuccess={
                  handleGoogleLogin
                }
                onError={() =>
                  setMessage(
                    "Google нэвтрэлт амжилтгүй."
                  )
                }
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}