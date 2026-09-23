import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FiArrowLeft,
  FiCheckCircle,
  FiMail,
} from "react-icons/fi";

import Navbar from "../../components/Navbar";
import { API_BASE } from "@/lib/config";

export default function ForgotPassword() {
  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [sent, setSent] =
    useState(false);

  useEffect(() => {
    setMessage("");
    setError("");
  }, [email]);

  const submit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError(
        "И-мэйл хаягаа оруулна уу."
      );

      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE}/api/password/forgot`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.message ||
            "Нууц үг сэргээх хүсэлт илгээхэд алдаа гарлаа."
        );

        return;
      }

      setSent(true);

      setMessage(
        data?.message ||
          "Нууц үг сэргээх холбоос таны и-мэйл хаяг руу илгээгдлээ."
      );
    } catch (err) {
      console.error(
        "Forgot password error:",
        err
      );

      setError(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="rgForgotPage">
        <section className="rgForgotCard">
          {!sent ? (
            <>
              <div className="rgForgotHeading">
                <h1>
                  Нууц үг сэргээх
                </h1>

                <p>
                  Бүртгэлтэй и-мэйл
                  хаягаа оруулна уу
                </p>
              </div>

              <form
                className="rgForgotForm"
                onSubmit={submit}
              >
                <label
                  htmlFor="forgot-email"
                >
                  И-МЭЙЛ ХАЯГ
                </label>

                <div className="rgForgotInput">
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {error && (
                  <div className="rgForgotAlert error">
                    {error}
                  </div>
                )}

                <button
                  className="rgForgotSubmit"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Илгээж байна..."
                    : "Сэргээх холбоос илгээх"}
                </button>
              </form>

              <div className="rgForgotBack">
                <Link to="/login">
                  <FiArrowLeft />

                  <span>
                    Нэвтрэх хэсэг рүү
                    буцах
                  </span>
                </Link>
              </div>
            </>
          ) : (
            <div className="rgForgotSuccess">
              <div className="rgForgotSuccessIcon">
                <FiCheckCircle />
              </div>

              <h1>
                И-мэйлээ шалгана уу
              </h1>

              <p>
                {message}
              </p>

              <div className="rgForgotSentEmail">
                <FiMail />

                <span>
                  {email}
                </span>
              </div>

              <button
                type="button"
                className="rgForgotSubmit"
                onClick={() => {
                  setSent(false);
                  setMessage("");
                  setError("");
                }}
              >
                Дахин илгээх
              </button>

              <div className="rgForgotBack">
                <Link to="/login">
                  <FiArrowLeft />

                  <span>
                    Нэвтрэх хэсэг рүү
                    буцах
                  </span>
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}