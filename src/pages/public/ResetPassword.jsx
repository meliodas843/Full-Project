import {
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import { API_BASE } from "@/lib/config";
import Navbar from "../../components/Navbar";

const API = API_BASE;

export default function ResetPassword() {
  const navigate =
    useNavigate();

  const token =
    useMemo(() => {
      return (
        new URLSearchParams(
          window.location.search
        ).get("token") || ""
      );
    }, []);

  const [p1, setP1] =
    useState("");

  const [p2, setP2] =
    useState("");

  const [msg, setMsg] =
    useState("");

  const submit = async (e) => {
    e.preventDefault();

    setMsg("");

    if (!token) {
      setMsg(
        "Нууц үг шинэчлэх токен олдсонгүй."
      );

      return;
    }

    if (p1.length < 6) {
      setMsg(
        "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой."
      );

      return;
    }

    if (p1 !== p2) {
      setMsg(
        "Нууц үгүүд таарахгүй байна."
      );

      return;
    }

    try {
      const res =
        await fetch(
          `${API}/api/password/reset`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                token,
                newPassword:
                  p1,
              }
            ),
          }
        );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        setMsg(
          data?.message ||
            "Нууц үг шинэчилж чадсангүй."
        );

        return;
      }

      setMsg(
        "Нууц үг амжилттай шинэчлэгдлээ. Нэвтрэх хуудас руу шилжиж байна..."
      );

      setTimeout(() => {
        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }, 800);
    } catch (err) {
      console.error(err);

      setMsg(
        "Сервертэй холбогдож чадсангүй."
      );
    }
  };

  return (
    <>
      <Navbar />

      <div className="login-page">
        <div className="login-box">
          <h2>
            Нууц үг солих
          </h2>

          <form
            onSubmit={submit}
          >
            <label>
              Шинэ нууц үг
            </label>

            <input
              type="password"
              value={p1}
              onChange={(e) =>
                setP1(
                  e.target.value
                )
              }
              required
            />

            <label>
              Дахин бичих
            </label>

            <input
              type="password"
              value={p2}
              onChange={(e) =>
                setP2(
                  e.target.value
                )
              }
              required
            />

            <button
              className="sign-btn"
              type="submit"
            >
              Хадгалах
            </button>
          </form>

          {msg && (
            <p
              style={{
                marginTop: 10,
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