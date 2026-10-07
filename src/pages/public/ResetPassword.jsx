import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const CODE_LENGTH = 6;

export default function ResetPassword() {
  const navigate =
    useNavigate();

  const inputsRef =
    useRef([]);

  const emailFromUrl =
    useMemo(() => {
      return (
        new URLSearchParams(
          window.location.search
        ).get("email") || ""
      )
        .trim()
        .toLowerCase();
    }, []);

  const [email, setEmail] =
    useState(
      emailFromUrl ||
        sessionStorage.getItem(
          "passwordResetEmail"
        ) ||
        ""
    );

  const [step, setStep] =
    useState("code");

  const [code, setCode] =
    useState(
      Array(CODE_LENGTH).fill("")
    );

  const [verificationToken, setVerificationToken] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  useEffect(() => {
    if (email) {
      sessionStorage.setItem(
        "passwordResetEmail",
        email
      );
    }
  }, [email]);

  useEffect(() => {
    if (
      !email &&
      step === "code"
    ) {
      navigate(
        "/forgot-password",
        {
          replace: true,
        }
      );
    }
  }, [
    email,
    step,
    navigate,
  ]);

  const fullCode =
    code.join("");

  const handleCodeChange = (
    index,
    value
  ) => {
    const digit =
      value
        .replace(/\D/g, "")
        .slice(-1);

    const next = [...code];

    next[index] = digit;

    setCode(next);
    setMessage("");
    setSuccess(false);

    if (
      digit &&
      index <
        CODE_LENGTH - 1
    ) {
      inputsRef.current[
        index + 1
      ]?.focus();
    }
  };

  const handleCodeKeyDown = (
    index,
    event
  ) => {
    if (
      event.key ===
        "Backspace" &&
      !code[index] &&
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
      event.preventDefault();

      inputsRef.current[
        index - 1
      ]?.focus();
    }

    if (
      event.key ===
        "ArrowRight" &&
      index <
        CODE_LENGTH - 1
    ) {
      event.preventDefault();

      inputsRef.current[
        index + 1
      ]?.focus();
    }
  };

  const handlePaste = (
    event
  ) => {
    event.preventDefault();

    const pasted =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(
          0,
          CODE_LENGTH
        );

    if (!pasted) {
      return;
    }

    const next =
      Array(CODE_LENGTH).fill("");

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

    setCode(next);
    setMessage("");
    setSuccess(false);

    const focusIndex =
      Math.min(
        pasted.length,
        CODE_LENGTH
      ) - 1;

    setTimeout(() => {
      inputsRef.current[
        focusIndex
      ]?.focus();
    }, 0);
  };

  const verifyCode =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (
        fullCode.length !==
        CODE_LENGTH
      ) {
        setMessage(
          "6 оронтой баталгаажуулах кодоо бүрэн оруулна уу."
        );

        return;
      }

      setLoading(true);
      setMessage("");
      setSuccess(false);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/password/verify-code`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  email,
                  code:
                    fullCode,
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          setMessage(
            data?.message ||
              "Баталгаажуулах код буруу эсвэл хугацаа дууссан байна."
          );

          return;
        }

        const token =
          data?.verificationToken ||
          data?.resetToken ||
          data?.token ||
          "";

        setVerificationToken(
          token
        );

        setSuccess(true);

        setMessage(
          "Код амжилттай баталгаажлаа."
        );

        setTimeout(() => {
          setStep(
            "password"
          );

          setMessage("");
          setSuccess(false);
        }, 400);
      } catch (error) {
        console.error(
          "Verify code error:",
          error
        );

        setMessage(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setLoading(false);
      }
    };

  const resendCode =
    async () => {
      if (
        resending ||
        !email
      ) {
        return;
      }

      setResending(true);
      setMessage("");
      setSuccess(false);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/email/password-code`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  email,
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          setMessage(
            data?.message ||
              "Код дахин илгээж чадсангүй."
          );

          return;
        }

        setCode(
          Array(
            CODE_LENGTH
          ).fill("")
        );

        setSuccess(true);

        setMessage(
          "Шинэ баталгаажуулах код илгээгдлээ."
        );

        setTimeout(() => {
          inputsRef.current[
            0
          ]?.focus();
        }, 100);
      } catch (error) {
        console.error(
          "Resend code error:",
          error
        );

        setMessage(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setResending(false);
      }
    };

  const submitPassword =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const strongPassword =
        password.length >=
          10 &&
        /[a-z]/.test(
          password
        ) &&
        /[A-Z]/.test(
          password
        ) &&
        /\d/.test(
          password
        ) &&
        /[^A-Za-z0-9]/.test(
          password
        );

      if (!strongPassword) {
        setMessage(
          "Нууц үг хамгийн багадаа 10 тэмдэгт бөгөөд том үсэг, жижиг үсэг, тоо, тусгай тэмдэг агуулсан байх ёстой."
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setMessage(
          "Нууц үгүүд таарахгүй байна."
        );

        return;
      }

      setLoading(true);
      setMessage("");
      setSuccess(false);

      try {
        const body = {
          email,
          code:
            fullCode,
          newPassword:
            password,
        };

        if (
          verificationToken
        ) {
          body.verificationToken =
            verificationToken;
        }

        const response =
          await fetch(
            `${API_BASE}/api/password/reset-with-code`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  body
                ),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          setMessage(
            data?.message ||
              "Нууц үг шинэчилж чадсангүй."
          );

          return;
        }

        sessionStorage.removeItem(
          "passwordResetEmail"
        );

        setSuccess(true);

        setMessage(
          "Нууц үг амжилттай шинэчлэгдлээ. Нэвтрэх хуудас руу шилжиж байна..."
        );

        setTimeout(() => {
          navigate(
            "/login",
            {
              replace: true,
            }
          );
        }, 1000);
      } catch (error) {
        console.error(
          "Reset password error:",
          error
        );

        setMessage(
          "Сервертэй холбогдож чадсангүй."
        );
      } finally {
        setLoading(false);
      }
    };

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
            step ===
            "password"
              ? setStep(
                  "code"
                )
              : navigate(
                  "/login"
                )
          }
        >
          <FiArrowLeft />

          <span>
            {step ===
            "password"
              ? "Буцах"
              : "Нэвтрэх хуудас"}
          </span>
        </button>

        <div className="rgLoginContent">
          {step ===
          "code" ? (
            <>
              <div className="rgLoginHeading">
                <h2>
                  Код баталгаажуулах
                </h2>

                <p>
                  <strong>
                    {email}
                  </strong>{" "}
                  хаяг руу
                  илгээсэн 6
                  оронтой кодыг
                  оруулна уу.
                </p>
              </div>

              <form
                className="rgLoginForm"
                onSubmit={
                  verifyCode
                }
              >
                <div className="rgResetCodeWrap">
                  <label>
                    БАТАЛГААЖУУЛАХ КОД
                  </label>

                  <div
                    className="rgResetCodeInputs"
                    onPaste={
                      handlePaste
                    }
                  >
                    {code.map(
                      (
                        digit,
                        index
                      ) => (
                        <input
                          key={
                            index
                          }
                          ref={(
                            element
                          ) => {
                            inputsRef.current[
                              index
                            ] =
                              element;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={
                            1
                          }
                          value={
                            digit
                          }
                          onChange={(
                            event
                          ) =>
                            handleCodeChange(
                              index,
                              event
                                .target
                                .value
                            )
                          }
                          onKeyDown={(
                            event
                          ) =>
                            handleCodeKeyDown(
                              index,
                              event
                            )
                          }
                          autoFocus={
                            index ===
                            0
                          }
                          aria-label={`Код ${
                            index +
                            1
                          }`}
                        />
                      )
                    )}
                  </div>

                  <p className="rgResetCodeHint">
                    Код 10
                    минутын
                    хугацаанд
                    хүчинтэй.
                  </p>
                </div>

                {message && (
                  <div
                    className={
                      success
                        ? "rgResetSuccess"
                        : "rgLoginError"
                    }
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="rgLoginSubmit"
                  disabled={
                    loading ||
                    fullCode.length !==
                      CODE_LENGTH
                  }
                >
                  {loading
                    ? "Шалгаж байна..."
                    : "Үргэлжлүүлэх"}
                </button>

                <button
                  type="button"
                  className="rgResetResend"
                  disabled={
                    resending
                  }
                  onClick={
                    resendCode
                  }
                >
                  {resending
                    ? "Илгээж байна..."
                    : "Код ирээгүй юу? Дахин илгээх"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="rgLoginHeading">
                <h2>
                  Шинэ нууц үг
                </h2>

                <p>
                  Бүртгэлдээ
                  ашиглах шинэ
                  нууц үгээ
                  тохируулна уу.
                </p>
              </div>

              <form
                className="rgLoginForm"
                onSubmit={
                  submitPassword
                }
              >
                <div className="rgLoginField">
                  <label htmlFor="new-password">
                    ШИНЭ НУУЦ ҮГ
                  </label>

                  <div className="rgLoginPassword">
                    <input
                      id="new-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) => {
                        setPassword(
                          event
                            .target
                            .value
                        );

                        setMessage(
                          ""
                        );
                      }}
                      placeholder="Шинэ нууц үгээ оруулна уу"
                      autoComplete="new-password"
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
                    >
                      {showPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rgLoginField">
                  <label htmlFor="confirm-password">
                    НУУЦ ҮГ
                    ДАВТАХ
                  </label>

                  <div className="rgLoginPassword">
                    <input
                      id="confirm-password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event
                      ) => {
                        setConfirmPassword(
                          event
                            .target
                            .value
                        );

                        setMessage(
                          ""
                        );
                      }}
                      placeholder="Нууц үгээ дахин оруулна уу"
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rgResetRequirements">
                  <span>
                    Нууц үг:
                  </span>

                  <ul>
                    <li>
                      10-аас
                      доошгүй
                      тэмдэгт
                    </li>

                    <li>
                      Том болон
                      жижиг үсэг
                    </li>

                    <li>
                      Тоо
                    </li>

                    <li>
                      Тусгай
                      тэмдэг
                    </li>
                  </ul>
                </div>

                {message && (
                  <div
                    className={
                      success
                        ? "rgResetSuccess"
                        : "rgLoginError"
                    }
                  >
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
                    ? "Хадгалж байна..."
                    : "Нууц үг шинэчлэх"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}