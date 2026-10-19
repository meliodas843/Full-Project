import { FiAlertCircle, FiCheckCircle, FiX } from "react-icons/fi";
import { TOAST_MS } from "../hooks/useToast";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  const Icon = isError ? FiAlertCircle : FiCheckCircle;

  return (
    <div
      key={toast.key}
      className={`saToast ${isError ? "error" : "success"}`}
      role={isError ? "alert" : "status"}
      style={{ "--sa-toast-ms": `${TOAST_MS}ms` }}
    >
      <Icon className="saToastIcon" />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Хаах">
        <FiX />
      </button>
      <i className="saToastBar" aria-hidden="true" />
    </div>
  );
}
