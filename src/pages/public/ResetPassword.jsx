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
  FiCheck,
  FiEye,
  FiEyeOff,
  FiShield,
} from "react-icons/fi";

import logo from "../../assets/registra-logo-def.png";
import { API_BASE } from "../../lib/config";

const CODE_LENGTH = 6;

export default function ResetPassword() {
  const navigate = useNavigate();

  const inputsRef = useRef([]);

  const emailFromUrl = useMemo(() => {
    return (
      new URLSearchParams(
        window.location.search
      ).get("email") || ""
    )
      .trim()
      .toLowerCase();
  }, []);

  const [email, setEmail] = useState(
    emailFromUrl ||
      sessionStorage.getItem(
        "passwordResetEmail"
      ) ||
      ""
  );

  const [step, setStep] =
    useState("code");

  const [code, setCode] = useState(
    Array(CODE_LENGTH).fill("")
  );

  const [
    verificationToken,
    setVerificationToken,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

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

  const fullCode = code.join("");

  /* =========================================================
     PASSWORD REQUIREMENTS
     ========================================================= */

  const passwordChecks = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol:
      /[^A-Za-z0-9]/.test(password),
  };

  const lettersValid =
    passwordChecks.upper &&
    passwordChecks.lower;

  const passwordValid =
    passwordChecks.length &&
    lettersValid &&
    passwordChecks.number &&
    passwordChecks.symbol;

  const passedRequirements = [
    passwordChecks.length,
    lettersValid,
    passwordChecks.number,
    passwordChecks.symbol,
  ].filter(Boolean).length;

  const passwordStrength =
    passedRequirements * 25;

  const strengthLabel = useMemo(() => {
    if (!password.length) {
      return "";
    }

    if (passedRequirements === 1) {
      return "Сул";
    }

    if (passedRequirements === 2) {
      return "Дунд";
    }

    if (passedRequirements === 3) {
      return "Сайн";
    }

    if (passedRequirements === 4) {
      return "Хүчтэй";
    }

    return "Сул";
  }, [
    password.length,
    passedRequirements,
  ]);

  /* =========================================================
     CODE INPUT
     ========================================================= */

  const handleCodeChange = (
    index,
    value
  ) => {
    const digit = value
      .replace(/\D/g, "")
      .slice(-1);

    const next = [...code];

    next[index] = digit;

    setCode(next);
    setMessage("");
    setSuccess(false);

    if (
      digit &&
      index < CODE_LENGTH - 1
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

  /* =========================================================
     VERIFY CODE
     ========================================================= */

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

  /* =========================================================
     RESEND CODE
     ========================================================= */

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

  /* =========================================================
     RESET PASSWORD
     ========================================================= */

  const submitPassword =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (!passwordValid) {
        setMessage(
          "Нууц үгийн бүх шаардлагыг хангана уу."
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
      {/* =====================================================
          LEFT SIDE
          ===================================================== */}

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

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}

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
              {/* ===============================================
                  CODE STEP
                  =============================================== */}

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
              {/* ===============================================
                  NEW PASSWORD STEP
                  =============================================== */}

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
                noValidate
              >
                {/* NEW PASSWORD */}

                <div className="rgNewPasswordField">
                  <label htmlFor="new-password">
                    ШИНЭ НУУЦ ҮГ
                  </label>

                  <div className="rgNewPasswordInput">
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
                    />

                    <button
                      type="button"
                      className="rgNewPasswordEye"
                      aria-label={
                        showPassword
                          ? "Нууц үг нуух"
                          : "Нууц үг харах"
                      }
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

                  {/* ===========================================
                      REQUIREMENTS
                      Completely hidden while password is empty
                      =========================================== */}

                  {password.length >
                    0 && (
                    <div className="rgPasswordGuide">
                      <div className="rgPasswordGuideHeader">
                        <div className="rgPasswordGuideShield">
                          <FiShield />
                        </div>

                        <div className="rgPasswordGuideTitle">
                          <strong>
                            Нууц үгийн
                            шаардлага
                          </strong>

                          <span>
                            Аюулгүй,
                            найдвартай
                            нууц үг
                            үүсгэнэ үү.
                          </span>
                        </div>
                      </div>

                      <div className="rgPasswordGuideGrid">
                        <div
                          className={`rgPasswordGuideItem ${
                            passwordChecks.length
                              ? "valid"
                              : ""
                          }`}
                        >
                          <span className="rgPasswordGuideCheck">
                            <FiCheck />
                          </span>

                          <span>
                            10-аас
                            доошгүй
                            тэмдэгт
                          </span>
                        </div>

                        <div
                          className={`rgPasswordGuideItem ${
                            lettersValid
                              ? "valid"
                              : ""
                          }`}
                        >
                          <span className="rgPasswordGuideCheck">
                            <FiCheck />
                          </span>

                          <span>
                            Том болон
                            жижиг үсэг
                          </span>
                        </div>

                        <div
                          className={`rgPasswordGuideItem ${
                            passwordChecks.number
                              ? "valid"
                              : ""
                          }`}
                        >
                          <span className="rgPasswordGuideCheck">
                            <FiCheck />
                          </span>

                          <span>
                            Дор хаяж
                            нэг тоо
                          </span>
                        </div>

                        <div
                          className={`rgPasswordGuideItem ${
                            passwordChecks.symbol
                              ? "valid"
                              : ""
                          }`}
                        >
                          <span className="rgPasswordGuideCheck">
                            <FiCheck />
                          </span>

                          <span>
                            Дор хаяж
                            нэг тусгай
                            тэмдэг
                          </span>
                        </div>
                      </div>

                      <div className="rgPasswordStrength">
                        <div className="rgPasswordStrengthText">
                          <span>
                            Нууц үгийн
                            хамгаалалт
                          </span>

                          <strong
                            className={
                              passwordValid
                                ? "valid"
                                : ""
                            }
                          >
                            {
                              strengthLabel
                            }
                          </strong>
                        </div>

                        <div className="rgPasswordStrengthTrack">
                          <span
                            className={
                              passwordValid
                                ? "valid"
                                : ""
                            }
                            style={{
                              width: `${passwordStrength}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONFIRM PASSWORD */}

                <div className="rgNewPasswordField rgConfirmPasswordField">
                  <label htmlFor="confirm-password">
                    НУУЦ ҮГ ДАВТАХ
                  </label>

                  <div
                    className={`rgNewPasswordInput ${
                      confirmPassword &&
                      password ===
                        confirmPassword
                        ? "match"
                        : ""
                    } ${
                      confirmPassword &&
                      password !==
                        confirmPassword
                        ? "mismatch"
                        : ""
                    }`}
                  >
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
                    />

                    <button
                      type="button"
                      className="rgNewPasswordEye"
                      aria-label={
                        showConfirmPassword
                          ? "Нууц үг нуух"
                          : "Нууц үг харах"
                      }
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

                  {confirmPassword &&
                    password ===
                      confirmPassword && (
                      <div className="rgPasswordMatchMessage valid">
                        <FiCheck />

                        <span>
                          Нууц үгүүд
                          таарч байна
                        </span>
                      </div>
                    )}

                  {confirmPassword &&
                    password !==
                      confirmPassword && (
                      <div className="rgPasswordMatchMessage invalid">
                        <span>
                          Нууц үгүүд
                          таарахгүй
                          байна
                        </span>
                      </div>
                    )}
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
                  className="rgNewPasswordSubmit"
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