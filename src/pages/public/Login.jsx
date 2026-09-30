import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FiArrowLeft,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import logo from "../../assets/registra-logo-def.png";
import { API_BASE } from "../../lib/config";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [
    rememberMe,
    setRememberMe,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
   * ==========================================
   * LOAD REMEMBERED EMAIL
   * ==========================================
   */

  useEffect(() => {
    const rememberedEmail =
      localStorage.getItem(
        "rememberEmail"
      );

    if (rememberedEmail) {
      setForm((current) => ({
        ...current,
        email: rememberedEmail,
      }));

      setRememberMe(true);
    }
  }, []);

  /*
   * ==========================================
   * INPUT
   * ==========================================
   */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  };

  /*
   * ==========================================
   * ACCOUNT TYPE
   * ==========================================
   */

  function getAccountType(data) {
    return String(
      data?.user
        ?.accountType ||
        data?.user
          ?.account_type ||
        ""
    )
      .trim()
      .toLowerCase();
  }

  /*
   * ==========================================
   * SAVE AUTH
   * ==========================================
   */

  const saveAuth = (data) => {
    /*
     * Clear data that may belong to the
     * previously logged-in account.
     */

    localStorage.removeItem(
      "profileComplete"
    );

    localStorage.removeItem(
      "accountType"
    );

    localStorage.removeItem(
      "account_type"
    );

    /*
     * Save user
     */

    if (data?.user) {
      localStorage.setItem(
        "user",
        JSON.stringify(
          data.user
        )
      );
    }

    /*
     * Save token
     */

    if (data?.token) {
      localStorage.setItem(
        "token",
        data.token
      );
    }

    /*
     * Save role
     */

    if (
      data?.user?.role
    ) {
      localStorage.setItem(
        "role",
        data.user.role
      );
    }

    /*
     * Save account type
     */

    const accountType =
      getAccountType(data);

    if (accountType) {
      localStorage.setItem(
        "accountType",
        accountType
      );

      localStorage.setItem(
        "account_type",
        accountType
      );
    }

    /*
     * Remember email
     */

    if (rememberMe) {
      localStorage.setItem(
        "rememberEmail",
        form.email
          .trim()
          .toLowerCase()
      );
    } else {
      localStorage.removeItem(
        "rememberEmail"
      );
    }

    return accountType;
  };

  /*
   * ==========================================
   * LOGIN
   * ==========================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
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

            body: JSON.stringify({
              email:
                form.email
                  .trim()
                  .toLowerCase(),

              password:
                form.password,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      /*
       * ========================================
       * LOGIN ERROR
       * ========================================
       */

      if (!response.ok) {
        setMessage(
          data?.message ||
            "И-мэйл эсвэл нууц үг буруу байна."
        );

        return;
      }

      /*
       * ========================================
       * SAVE LOGIN
       * ========================================
       */

      const accountType =
        saveAuth(data);

      console.log(
        "[LOGIN] response:",
        data
      );

      console.log(
        "[LOGIN] accountType:",
        accountType
      );

      /*
       * ========================================
       * ORGANIZATION
       * ========================================
       */

      if (
        accountType ===
        "organization"
      ) {
        console.log(
          "[LOGIN] navigating to organization profile"
        );

        navigate(
          "/user/organization",
          {
            replace: true,
          }
        );

        return;
      }

      /*
       * ========================================
       * INDIVIDUAL USER
       * ========================================
       */

      console.log(
        "[LOGIN] navigating to user home"
      );

      navigate(
        "/user/home",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "[LOGIN] error:",
        error
      );

      setMessage(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * GOOGLE LOGIN
   * ==========================================
   */

  const handleGoogleLogin =
    () => {
      window.location.href =
        `${API_BASE}/api/auth/google`;
    };

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <main className="rgLoginPage">
      <section className="rgLoginLeft">
        <Link
          to="/"
          className="rgLoginBrand"
        >
          <img
            src={logo}
            alt="Registra"
            className="rgLoginBrandLogo"
          />
        </Link>

        <div className="rgLoginHero">
          <h1>
            Эвэнтээ бүртгэж,
            <br />
            хүмүүстэй уулз.
          </h1>

          <p>
            Бүртгэл, хуваарь,
            уулзалтын хүсэлт —
            бүгд нэг календарьт.
          </p>

          <div className="rgLoginMeetingCard">
            <div className="rgLoginAvatar">
              БГ
            </div>

            <div className="rgLoginMeetingInfo">
              <span>
                ДАРААГИЙН УУЛЗАЛТ
              </span>

              <strong>
                14:00 · Бат-Эрдэнэ Г.
              </strong>
            </div>

            <div className="rgLoginZoom">
              1:1 Zoom
            </div>
          </div>
        </div>

        <div className="rgLoginCircle rgLoginCircleOne" />

        <div className="rgLoginCircle rgLoginCircleTwo" />

        <div className="rgLoginCopyright">
          © 2026 Registra
        </div>
      </section>

      <section className="rgLoginRight">
        <button
          type="button"
          className="rgLoginBack"
          onClick={() =>
            navigate("/")
          }
        >
          <FiArrowLeft />

          <span>
            Нүүр хуудас
          </span>
        </button>

        <div className="rgLoginContent">
          <div className="rgLoginHeading">
            <h2>
              Тавтай морил
            </h2>

            <p>
              Registra бүртгэлдээ
              нэвтэрнэ үү.
            </p>
          </div>

          <button
            type="button"
            className="rgGoogleLogin"
            onClick={
              handleGoogleLogin
            }
          >
            <span className="rgGoogleIcon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z"
                />

                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.258c-.805.54-1.834.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
                />

                <path
                  fill="#FBBC05"
                  d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z"
                />

                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.58C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
                />
              </svg>
            </span>

            <span>
              Google-ээр нэвтрэх
            </span>
          </button>

          <div className="rgLoginDivider">
            <span />

            <p>
              эсвэл и-мэйлээр
            </p>

            <span />
          </div>

          <form
            className="rgLoginForm"
            onSubmit={
              handleSubmit
            }
          >
            <div className="rgLoginField">
              <label htmlFor="email">
                И-МЭЙЛ ХАЯГ
              </label>

              <input
                id="email"
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={
                  handleChange
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="rgLoginField">
              <div className="rgLoginPasswordLabel">
                <label htmlFor="password">
                  НУУЦ ҮГ
                </label>

                <Link to="/forgot-password">
                  Нууц үгээ мартсан
                  уу?
                </Link>
              </div>

              <div className="rgLoginPassword">
                <input
                  id="password"
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
                  placeholder="Нууц үгээ оруулна уу"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Нууц үг нуух"
                      : "Нууц үг харах"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </div>

            <label className="rgLoginRemember">
              <input
                type="checkbox"
                checked={
                  rememberMe
                }
                onChange={(
                  event
                ) =>
                  setRememberMe(
                    event.target
                      .checked
                  )
                }
              />

              <span>
                Намайг сана
              </span>
            </label>

            {message && (
              <div className="rgLoginError">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="rgLoginSubmit"
              disabled={
                loading
              }
            >
              {loading
                ? "Нэвтэрч байна..."
                : "Нэвтрэх"}
            </button>
          </form>

          <div className="rgLoginSignup">
            <span>
              Бүртгэлгүй юу?
            </span>

            <Link to="/signup">
              Үнэгүй бүртгүүлэх
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}