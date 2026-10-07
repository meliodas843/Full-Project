import {
  useMemo,
  useRef,
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

export default function ResetPassword() {
  const navigate =
    useNavigate();

  const email =
    useMemo(() => {
      return (
        new URLSearchParams(
          window.location.search
        ).get("email") || ""
      )
        .trim()
        .toLowerCase();
    }, []);

  const [
    step,
    setStep,
  ] = useState("code");

  const [
    digits,
    setDigits,
  ] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const inputsRef =
    useRef([]);

  const [p1, setP1] =
    useState("");

  const [p2, setP2] =
    useState("");

  const [msg, setMsg] =
    useState("");

  const [
    msgType,
    setMsgType,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const code =
    digits.join("");

  const setError = (
    message
  ) => {
    setMsg(message);
    setMsgType("error");
  };

  const setSuccess = (
    message
  ) => {
    setMsg(message);
    setMsgType("success");
  };

  const clearMessage = () => {
    setMsg("");
    setMsgType("");
  };

  const changeDigit = (
    index,
    value
  ) => {
    const clean =
      String(value)
        .replace(/\D/g, "")
        .slice(-1);

    const next = [
      ...digits,
    ];

    next[index] =
      clean;

    setDigits(next);

    if (
      clean &&
      index < 5
    ) {
      inputsRef.current[
        index + 1
      ]?.focus();
    }
  };

  const handleKeyDown = (
    index,
    event
  ) => {
    if (
      event.key ===
        "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputsRef.current[
        index - 1
      ]?.focus();
    }

    if (
      event.key ===
        "ArrowLeft" &&
      index > 0
    ) {
      inputsRef.current[
        index - 1
      ]?.focus();
    }

    if (
      event.key ===
        "ArrowRight" &&
      index < 5
    ) {
      inputsRef.current[
        index + 1
      ]?.focus();
    }
  };

  const handlePaste = (
    event
  ) => {
    const pasted =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!pasted) {
      return;
    }

    event.preventDefault();

    const next = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    pasted
      .split("")
      .forEach(
        (
          digit,
          index
        ) => {
          next[index] =
            digit;
        }
      );

    setDigits(next);

    const focusIndex =
      Math.min(
        pasted.length,
        6
      ) - 1;

    if (
      focusIndex >= 0
    ) {
      inputsRef.current[
        focusIndex
      ]?.focus();
    }
  };

  const verifyCode =
    async (event) => {
      event.preventDefault();

      clearMessage();

      if (!email) {
        setError(
          "Имэйл хаяг олдсонгүй. Нууц үг сэргээх хүсэлтээ дахин илгээнэ үү."
        );

        return;
      }

      if (
        !/^\d{6}$/.test(
          code
        )
      ) {
        setError(
          "6 оронтой кодыг бүрэн оруулна уу."
        );

        return;
      }

      setLoading(true);

      try {
        const res =
          await fetch(
            `${API}/api/password/verify-code`,
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
                    email,
                    code,
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
          setError(
            data?.message ||
              "Код баталгаажуулж чадсангүй."
          );

          return;
        }

        clearMessage();

        setStep(
          "password"
        );
      } catch (err) {
        console.error(err);

        setError(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setLoading(false);
      }
    };

  const resendCode =
    async () => {
      if (
        !email ||
        loading
      ) {
        return;
      }

      clearMessage();

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
                    email,
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
          setError(
            data?.message ||
              "Шинэ код илгээж чадсангүй."
          );

          return;
        }

        setDigits([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setSuccess(
          "Шинэ 6 оронтой код таны имэйл хаяг руу илгээгдлээ."
        );

        setTimeout(
          () => {
            inputsRef.current[
              0
            ]?.focus();
          },
          100
        );
      } catch (err) {
        console.error(err);

        setError(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setLoading(false);
      }
    };

  const resetPassword =
    async (event) => {
      event.preventDefault();

      clearMessage();

      const strong =
        p1.length >= 10 &&
        /[a-z]/.test(p1) &&
        /[A-Z]/.test(p1) &&
        /\d/.test(p1) &&
        /[^A-Za-z0-9]/.test(
          p1
        );

      if (!strong) {
        setError(
          "Нууц үг хамгийн багадаа 10 тэмдэгттэй бөгөөд том үсэг, жижиг үсэг, тоо, тусгай тэмдэгт агуулсан байх ёстой."
        );

        return;
      }

      if (p1 !== p2) {
        setError(
          "Нууц үгүүд таарахгүй байна."
        );

        return;
      }

      setLoading(true);

      try {
        const res =
          await fetch(
            `${API}/api/password/reset-with-code`,
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
                    email,
                    code,
                    newPassword:
                      p1,
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
          setError(
            data?.message ||
              "Нууц үг шинэчилж чадсангүй."
          );

          return;
        }

        setStep(
          "success"
        );

        setSuccess(
          "Нууц үг амжилттай шинэчлэгдлээ."
        );

        setTimeout(
          () => {
            navigate(
              "/login",
              {
                replace:
                  true,
              }
            );
          },
          1800
        );
      } catch (err) {
        console.error(err);

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

      <div className="login-page">
        <div
          className="login-box"
          style={{
            maxWidth: 500,
          }}
        >
          {step ===
            "code" && (
            <>
              <h2>
                Нууц үг
                сэргээх
              </h2>

              <p
                style={{
                  lineHeight:
                    1.6,
                }}
              >
                Таны{" "}
                <strong>
                  {email ||
                    "имэйл"}
                </strong>{" "}
                хаяг руу
                илгээсэн 6
                оронтой
                баталгаажуулах
                кодыг оруулна
                уу.
              </p>

              <form
                onSubmit={
                  verifyCode
                }
              >
                <div
                  onPaste={
                    handlePaste
                  }
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    gap: 10,
                    margin:
                      "28px 0",
                  }}
                >
                  {digits.map(
                    (
                      digit,
                      index
                    ) => (
                      <input
                        key={
                          index
                        }
                        ref={(
                          el
                        ) => {
                          inputsRef.current[
                            index
                          ] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={
                          1
                        }
                        autoFocus={
                          index ===
                          0
                        }
                        autoComplete={
                          index ===
                          0
                            ? "one-time-code"
                            : "off"
                        }
                        value={
                          digit
                        }
                        onChange={(
                          e
                        ) =>
                          changeDigit(
                            index,
                            e
                              .target
                              .value
                          )
                        }
                        onKeyDown={(
                          e
                        ) =>
                          handleKeyDown(
                            index,
                            e
                          )
                        }
                        style={{
                          width:
                            50,
                          height:
                            58,
                          padding:
                            0,
                          textAlign:
                            "center",
                          fontSize:
                            22,
                          fontWeight:
                            700,
                          border:
                            "1px solid #d9d9e3",
                          borderRadius:
                            10,
                          outline:
                            "none",
                          boxSizing:
                            "border-box",
                        }}
                      />
                    )
                  )}
                </div>

                <p
                  style={{
                    textAlign:
                      "center",
                    fontSize:
                      13,
                    color:
                      "#777",
                    marginBottom:
                      20,
                  }}
                >
                  Код 10
                  минутын
                  турш
                  хүчинтэй.
                </p>

                <button
                  className="sign-btn"
                  type="submit"
                  disabled={
                    loading ||
                    code.length !==
                      6
                  }
                >
                  {loading
                    ? "Шалгаж байна..."
                    : "Код баталгаажуулах"}
                </button>
              </form>

              <div
                style={{
                  textAlign:
                    "center",
                  marginTop:
                    18,
                }}
              >
                <span
                  style={{
                    fontSize:
                      14,
                  }}
                >
                  Код
                  ирээгүй юу?
                </span>

                <button
                  type="button"
                  onClick={
                    resendCode
                  }
                  disabled={
                    loading
                  }
                  style={{
                    border: 0,
                    background:
                      "transparent",
                    cursor:
                      "pointer",
                    fontWeight:
                      600,
                    marginLeft:
                      5,
                    padding:
                      0,
                    color:
                      "#6847ef",
                  }}
                >
                  Дахин
                  илгээх
                </button>
              </div>
            </>
          )}

          {step ===
            "password" && (
            <>
              <h2>
                Шинэ нууц
                үг
              </h2>

              <p
                style={{
                  lineHeight:
                    1.6,
                  marginBottom:
                    22,
                }}
              >
                Код
                амжилттай
                баталгаажлаа.
                Шинэ нууц
                үгээ
                тохируулна
                уу.
              </p>

              <form
                onSubmit={
                  resetPassword
                }
              >
                <label>
                  Шинэ нууц
                  үг
                </label>

                <input
                  type="password"
                  value={p1}
                  onChange={(
                    e
                  ) =>
                    setP1(
                      e.target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  required
                />

                <label>
                  Нууц үгээ
                  дахин
                  оруулах
                </label>

                <input
                  type="password"
                  value={p2}
                  onChange={(
                    e
                  ) =>
                    setP2(
                      e.target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  required
                />

                <p
                  style={{
                    fontSize:
                      12,
                    lineHeight:
                      1.6,
                    color:
                      "#777",
                    margin:
                      "10px 0 18px",
                  }}
                >
                  Хамгийн
                  багадаа 10
                  тэмдэгт,
                  том болон
                  жижиг үсэг,
                  тоо, тусгай
                  тэмдэгт
                  агуулсан
                  байна.
                </p>

                <button
                  className="sign-btn"
                  type="submit"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Хадгалж байна..."
                    : "Нууц үг шинэчлэх"}
                </button>
              </form>
            </>
          )}

          {step ===
            "success" && (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "20px 0",
              }}
            >
              <div
                style={{
                  width:
                    64,
                  height:
                    64,
                  borderRadius:
                    "50%",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  margin:
                    "0 auto 20px",
                  background:
                    "#f0ebff",
                  color:
                    "#6847ef",
                  fontSize:
                    30,
                  fontWeight:
                    700,
                }}
              >
                ✓
              </div>

              <h2>
                Амжилттай
              </h2>

              <p>
                Нууц үг
                амжилттай
                шинэчлэгдлээ.
                Нэвтрэх
                хуудас руу
                шилжиж
                байна...
              </p>
            </div>
          )}

          {msg && (
            <div
              style={{
                marginTop:
                  18,
                padding:
                  "12px 14px",
                borderRadius:
                  8,
                fontSize:
                  13,
                lineHeight:
                  1.5,

                background:
                  msgType ===
                  "success"
                    ? "#ecfdf3"
                    : "#fff1f2",

                color:
                  msgType ===
                  "success"
                    ? "#16794b"
                    : "#c62828",
              }}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}