import {
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  API_BASE,
} from "@/lib/config";
import Navbar from "../../components/Navbar";

const API = API_BASE;

export default function ForgotPassword() {
  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    msg,
    setMsg,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const submit =
    async (e) => {
      e.preventDefault();

      setMsg("");

      const cleanEmail =
        String(email || "")
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setMsg(
          "Имэйл хаягаа оруулна уу."
        );

        return;
      }

      setLoading(true);

      try {
        const res =
          await fetch(
            `${API}/api/email/password-code`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    email:
                      cleanEmail,
                  }
                ),
            }
          );

        const data =
          await res
            .json()
            .catch(
              () => ({})
            );

        if (!res.ok) {
          setMsg(
            data?.message ||
              "Баталгаажуулах код илгээж чадсангүй."
          );

          return;
        }

        navigate(
          `/reset-password?email=${encodeURIComponent(
            cleanEmail
          )}`
        );
      } catch (err) {
        console.error(err);

        setMsg(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <>
      <Navbar />

      <div className="login-page">
        <div className="login-box">
          <h2>
            Нууц үг
            сэргээх
          </h2>

          <p
            style={{
              lineHeight:
                1.6,
              marginBottom:
                22,
            }}
          >
            Бүртгэлтэй
            имэйл хаягаа
            оруулна уу.
            Танд 6 оронтой
            баталгаажуулах
            код илгээнэ.
          </p>

          <form
            onSubmit={
              submit
            }
          >
            <label>
              Имэйл
            </label>

            <input
              type="email"
              value={email}
              onChange={(
                e
              ) =>
                setEmail(
                  e.target
                    .value
                )
              }
              placeholder="name@example.com"
              autoComplete="email"
              required
            />

            <button
              className="sign-btn"
              type="submit"
              disabled={
                loading
              }
            >
              {loading
                ? "Илгээж байна..."
                : "Код илгээх"}
            </button>
          </form>

          {msg && (
            <p
              style={{
                marginTop:
                  14,
                color:
                  "#c62828",
              }}
            >
              {msg}
            </p>
          )}
        </div>
      </div>
    </>
  );
}