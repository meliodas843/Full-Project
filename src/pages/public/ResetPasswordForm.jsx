import { CODE_LENGTH } from "./ResetPassword.helpers";
import { FiCheck } from "react-icons/fi";

// Extracted from ResetPassword.jsx; receives the page state it reads as props.
export default function ResetPasswordForm({
  code,
  fullCode,
  handleCodeChange,
  handleCodeKeyDown,
  handlePaste,
  inputsRef,
  loading,
  message,
  otpError,
  otpPhase,
  resendCode,
  resending,
  success,
  verifyCode,
}) {
  return (
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
    
        <div className={`rgOtpStage rgOtp-${otpPhase}`}>
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
              disabled={otpPhase !== "idle"}
    
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
    
        {otpPhase !== "idle" && (
        <div className={`rgOtpOverlay rgOtpOverlay-${otpPhase}`} role="status" aria-live="polite">
          <div className="rgOtpOrbit">
            {otpPhase === "checking" || otpPhase === "merging" ? (
              <span className="rgOtpSpinner" />
            ) : otpPhase === "valid" ? (
              <FiCheck className="rgOtpResultIcon" />
            ) : (
              <span className="rgOtpResultIcon">×</span>
            )}
          </div>
          {otpPhase === "checking" && <strong>Код шалгаж байна...</strong>}
          {otpPhase === "valid" && <strong>Амжилттай баталгаажлаа</strong>}
          {otpPhase === "invalid" && <strong>{otpError || "Код буруу байна"}</strong>}
        </div>
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
    
          loading || otpPhase !== "idle" ||
    
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
  );
}
