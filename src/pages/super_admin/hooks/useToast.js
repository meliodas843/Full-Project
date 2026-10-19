import { useCallback, useEffect, useRef, useState } from "react";

export const TOAST_MS = 5000;

// A single toast that hides itself after TOAST_MS. show() replaces any
// toast already on screen and restarts the timer. `initial` shows a
// toast straight away, e.g. a message handed over by the previous page.
export default function useToast(initial = null) {
  const [toast, setToast] = useState(() =>
    initial?.message ? { type: "success", ...initial, key: Date.now() } : null,
  );
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message, type = "success") => {
    clearTimeout(timer.current);
    setToast({ message, type, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => {
    if (initial?.message) timer.current = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer.current);
    // Only the first render's toast gets the initial timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { toast, show, hide };
}
