import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { API_BASE } from "../../lib/config";
import Navbar from "../../components/Navbar";

export default function Signup() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
      confirmPassword: "",
    });

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const handleChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");

    if (
      form.password !==
      form.confirmPassword
    ) {
      setMessage(
        "Нууц үг таарахгүй байна."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE}/api/auth/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                email:
                  form.email,
                password:
                  form.password,
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
            "Бүртгүүлэхэд алдаа гарлаа."
        );

        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(
          data.user
        )
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

      navigate("/profile", {
        replace: true,
      });
    } catch {
      setMessage(
        "Сервертэй холбогдож чадсангүй."
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
                Бүртгүүлэх
              </h1>

              <p>
                Registra бүртгэл
                үүсгэнэ үү
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
                  value={
                    form.password
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
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

              <label>
                НУУЦ ҮГ
                БАТАЛГААЖУУЛАХ
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
                  onChange={
                    handleChange
                  }
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Нууц үг нуух"
                      : "Нууц үг харах"
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
                disabled={
                  loading
                }
              >
                {loading
                  ? "Бүртгэж байна..."
                  : "Бүртгүүлэх"}
              </button>
            </form>

            <div className="rgAuthSignup">
              <span>
                Бүртгэлтэй
                хэрэглэгч?
              </span>

              <Link to="/login">
                Нэвтрэх
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}