import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { API_BASE } from "@/lib/config";
import logo from "../../assets/reigistra-logo-def.png";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setIsError(true);
      setMessage("И-мэйл хаягаа оруулна уу.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_BASE}/api/password/forgot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setIsError(true);
        setMessage(
          data?.message ||
            "Сэргээх код илгээж чадсангүй."
        );
        return;
      }

      setIsError(false);
      setMessage(
        data?.message ||
          "Сэргээх код таны и-мэйл хаяг руу илгээгдлээ."
      );
    } catch (error) {
      console.error(error);

      setIsError(true);
      setMessage(
        "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgotPasswordPage">
      <section className="forgotPasswordLeft">
        <button
          type="button"
          className="forgotPasswordLogoButton"
          onClick={() => navigate("/")}
        >
          <img
            src={logo}
            alt="Registra"
            className="forgotPasswordLogo"
          />
        </button>

        <div className="forgotPasswordLeftContent">
          <h1>
            Бүртгэлдээ аюулгүй буцаж
            ороорой.
          </h1>

          <p className="forgotPasswordLeftDescription">
            Сэргээх код зөвхөн таны и-мэйл рүү
            очно. Код 10 минутын турш хүчинтэй
            бөгөөд нэг удаа ашиглагдана.
          </p>

          <div className="forgotPasswordSecurity">
            <div className="forgotPasswordSecurityIcon">
              <ShieldCheck size={21} />
            </div>

            <div className="forgotPasswordSecurityText">
              <span>АЮУЛГҮЙ БАЙДАЛ</span>

              <strong>
                Registra ажилтнууд таны нууц үг,
                кодыг хэзээ ч асуухгүй.
              </strong>
            </div>
          </div>
        </div>

        <div className="forgotPasswordCopyright">
          © 2026 Registra
        </div>

        <div className="forgotPasswordCircle forgotPasswordCircleLarge" />
        <div className="forgotPasswordCircle forgotPasswordCircleSmall" />
      </section>

      <section className="forgotPasswordRight">
        <button
          type="button"
          className="forgotPasswordHome"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={15} />
          <span>Нүүр хуудас</span>
        </button>

        <div className="forgotPasswordFormContainer">
          <div className="forgotPasswordProgress">
            <span className="active" />
            <span />
            <span />
          </div>

          <div className="forgotPasswordLock">
            <LockKeyhole size={24} />
          </div>

          <h2>Нууц үгээ мартсан уу?</h2>

          <p className="forgotPasswordDescription">
            Бүртгэлтэй и-мэйл хаягаа оруулна уу.
            Бид танд 6 оронтой сэргээх код илгээнэ.
          </p>

          <form
            className="forgotPasswordForm"
            onSubmit={submit}
          >
            <label htmlFor="forgot-email">
              И-мэйл хаяг
            </label>

            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            {message && (
              <div
                className={`forgotPasswordMessage ${
                  isError ? "error" : "success"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="forgotPasswordSubmit"
              disabled={loading}
            >
              {loading
                ? "Илгээж байна..."
                : "Сэргээх код илгээх"}
            </button>
          </form>

          <button
            type="button"
            className="forgotPasswordBack"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft size={15} />
            <span>
              Нэвтрэх хуудас руу буцах
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}