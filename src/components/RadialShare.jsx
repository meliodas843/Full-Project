
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiShare2,
  FiX,
  FiLink,
  FiMail,
  FiCheck,
} from "react-icons/fi";
import { FaWhatsapp, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const ICONS = {
  whatsapp: FaWhatsapp,
  linkedin: FaLinkedinIn,
  email: FiMail,
  twitter: FaXTwitter,
  copy: FiLink,
};

export default function RadialShare({
  title = "Байгууллага",
  url,
}) {
  const [phase, setPhase] = useState("closed");
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const buttonRef = useRef(null);
  const timersRef = useRef([]);

  const isOpen = phase !== "closed";

  const shareUrl =
    url || (typeof window !== "undefined"
      ? window.location.href
      : "");

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const margin = window.innerWidth <= 600 ? 100 : 115;

    setPosition({
      x: Math.max(
        margin,
        Math.min(
          window.innerWidth - margin,
          rect.left + rect.width / 2
        )
      ),
      y: Math.max(
        margin,
        Math.min(
          window.innerHeight - margin,
          rect.top + rect.height / 2
        )
      ),
    });
  };

  const close = () => {
    clearTimers();
    setPhase("closed");
    setSelected(null);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") close();
    };

    const handleMove = () => updatePosition();

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleMove);
    window.addEventListener("scroll", handleMove, true);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleMove);
      window.removeEventListener("scroll", handleMove, true);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }

    clearTimers();
    setSelected(null);
    updatePosition();
    setPhase("opening");

    schedule(() => setPhase("open"), 420);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      try {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();

        const success = document.execCommand("copy");
        input.remove();
        return success;
      } catch {
        return false;
      }
    }
  };

  const share = async (channel) => {
    if (phase !== "open") return;

    setSelected(channel);
    setPhase("collapsing");

    let success = true;

    if (channel === "copy") {
      success = await copyLink();
    } else {
      let link = "";

      if (channel === "whatsapp") {
        link = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
      }

      if (channel === "linkedin") {
        link =
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      }

      if (channel === "twitter") {
        link =
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
      }

      if (channel === "email") {
        link = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
      }

      if (channel === "email") {
        window.location.href = link;
      } else if (link) {
        const popup = window.open(
          link,
          "_blank",
          "noopener,noreferrer"
        );
        success = Boolean(popup);
      }
    }

    schedule(() => {
      setPhase(success ? "selected" : "failed");
    }, 420);

    schedule(() => {
      setPhase(success ? "success" : "failed");
    }, 850);

    schedule(close, 1750);
  };

  const SelectedIcon = selected ? ICONS[selected] : null;

  return (
    <div className="radialShare">
      <button
        ref={buttonRef}
        type="button"
        className="orgShareButton"
        aria-label="Хуваалцах"
        aria-expanded={isOpen}
        onClick={toggle}
        style={{
          visibility: isOpen ? "hidden" : "visible",
        }}
      >
        <FiShare2 />
        Хуваалцах
      </button>

      {isOpen &&
        createPortal(
          <div className="radialShareLayer">
            <div
              className="radialShareOutside"
              onClick={close}
            />

            <div
              className={`radialShareMenu phase-${phase}`}
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              <button
                type="button"
                className="radialShareItem whatsapp"
                aria-label="WhatsApp"
                disabled={phase !== "open"}
                onClick={() => share("whatsapp")}
              >
                <FaWhatsapp />
              </button>

              <button
                type="button"
                className="radialShareItem linkedin"
                aria-label="LinkedIn"
                disabled={phase !== "open"}
                onClick={() => share("linkedin")}
              >
                <FaLinkedinIn />
              </button>

              <button
                type="button"
                className="radialShareItem email"
                aria-label="Email"
                disabled={phase !== "open"}
                onClick={() => share("email")}
              >
                <FiMail />
              </button>

              <button
                type="button"
                className="radialShareItem twitter"
                aria-label="X"
                disabled={phase !== "open"}
                onClick={() => share("twitter")}
              >
                <FaXTwitter />
              </button>

              <button
                type="button"
                className="radialShareItem copy"
                aria-label="Copy link"
                disabled={phase !== "open"}
                onClick={() => share("copy")}
              >
                <FiLink />
              </button>

              <button
                type="button"
                className="radialShareCenter"
                aria-label="Close sharing"
                onClick={close}
              >
                {phase === "success" ? (
                  <FiCheck />
                ) : phase === "failed" ? (
                  <FiX />
                ) : selected && SelectedIcon ? (
                  <SelectedIcon />
                ) : (
                  <FiX />
                )}
              </button>

              <span className="radialShareLabel">
                {phase === "success"
                  ? "Амжилттай!"
                  : phase === "failed"
                    ? "Үйлдэл амжилтгүй"
                    : phase === "collapsing" ||
                        phase === "selected"
                      ? "Сонгогдлоо"
                      : "Хуваалцах"}
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
