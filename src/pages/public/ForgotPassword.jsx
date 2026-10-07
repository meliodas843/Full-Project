import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiLock,
  FiShield,
} from "react-icons/fi";

import logo from "../../assets/registra-logo-def.png";
import { API_BASE } from "../../lib/config";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("И-мэйл хаягаа оруулна уу.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/email/password-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message || "Сэргээх код илгээж чадсангүй."
        );
        return;
      }

      sessionStorage.setItem(
        "passwordResetEmail",
        cleanEmail
      );

      navigate(
        `/reset-password?email=${encodeURIComponent(cleanEmail)}`
      );
    } catch (error) {
      console.error(error);
      setMessage("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgotPasswordPage">
      {/* LEFT */}
      <section className="forgotPasswordLeft">
        <Link to="/" className="forgotPasswordLogo">
          <img src={logo} alt="Registra" />
        </Link>

        <div className="forgotPasswordLeftContent">
          <h1>
            Бүртгэлдээ аюулгүй буцах
            <br />
            ороорой.
          </h1>

          <p>
            Сэргээх код зөвхөн таны и-мэйл рүү очно.
            Код 10 минутын турш хүчинтэй бөгөөд нэг удаа
            ашиглагдана.
          </p>

          <div className="forgotSecurityCard">
            <div className="forgotSecurityIcon">
              <FiShield />
            </div>

            <div>
              <span>АЮУЛГҮЙ БАЙДАЛ</span>
              <strong>
                Registra ажилтнууд таны нууц үг, кодыг
                хэзээ ч асуухгүй.
              </strong>
            </div>
          </div>
        </div>

        <div className="forgotCircle forgotCircleOne" />
        <div className="forgotCircle forgotCircleTwo" />

        <div className="forgotCopyright">
          © 2026 Registra
        </div>
      </section>

      {/* RIGHT */}
      <section className="forgotPasswordRight">
        <Link to="/" className="forgotHomeLink">
          <FiArrowLeft />
          Нүүр хуудас
        </Link>

        <div className="forgotPasswordContent">
          {/* PROGRESS */}
          <div className="forgotProgress">
            <span className="active" />
            <span />
            <span />
          </div>

          <div className="forgotIconBox">
            <FiLock />
          </div>

          <div className="forgotHeading">
            <h2>Нууц үгээ мартсан уу?</h2>

            <p>
              Бүртгэлтэй и-мэйл хаягаа оруулна уу.
              Бид танд 6 оронтой сэргээх код илгээнэ.
            </p>
          </div>

          <form
            className="forgotPasswordForm"
            onSubmit={handleSubmit}
          >
            <div className="forgotField">
              <label htmlFor="forgot-email">
                И-мэйл хаяг
              </label>

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {message && (
              <div className="forgotError">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="forgotSubmit"
              disabled={loading}
            >
              {loading
                ? "Код илгээж байна..."
                : "Сэргээх код илгээх"}
            </button>
          </form>

          <button
            type="button"
            className="forgotBackLogin"
            onClick={() => navigate("/login")}
          >
            <FiArrowLeft />
            Нэвтрэх хуудас руу буцах
          </button>
        </div>
      </section>
    </main>
  );
}