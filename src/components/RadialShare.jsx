
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiShare2, FiX, FiLink, FiMail, FiCheck } from "react-icons/fi";
import { FaWhatsapp, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function RadialShare({ title = "Байгууллага", url }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const timerRef = useRef(null);

  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    const radius = window.innerWidth <= 600 ? 115 : 145;

    setPosition({
      x: Math.max(
        radius,
        Math.min(window.innerWidth - radius, rect.left + rect.width / 2)
      ),
      y: Math.max(
        radius + 10,
        Math.min(window.innerHeight - radius, rect.top + rect.height / 2)
      ),
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const toggleShare = () => {
    clearTimeout(timerRef.current);
    setCopied(false);
    if (!open) updatePosition();
    setOpen((previous) => !previous);
  };

  const openShare = (link) => {
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();

      const success = document.execCommand("copy");
      input.remove();

      if (!success) return;
    }

    setCopied(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setOpen(false);
      setCopied(false);
    }, 1200);
  };

  return (
    <div className="radialShare">
      <button
        ref={buttonRef}
        type="button"
        className="orgShareButton"
        aria-expanded={open}
        aria-label="Хуваалцах"
        onClick={toggleShare}
      >
        <FiShare2 />
        Хуваалцах
      </button>

      {open &&
        createPortal(
          <div className="radialShareLayer">
            <div
              className="radialShareOutside"
              onClick={() => setOpen(false)}
            />

            <div
              className="radialShareMenu"
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              <button
                type="button"
                className="radialShareItem whatsapp"
                title="WhatsApp"
                aria-label="Share on WhatsApp"
                onClick={() =>
                  openShare(
                    `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
                  )
                }
              >
                <FaWhatsapp />
              </button>

              <button
                type="button"
                className="radialShareItem linkedin"
                title="LinkedIn"
                aria-label="Share on LinkedIn"
                onClick={() =>
                  openShare(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
                  )
                }
              >
                <FaLinkedinIn />
              </button>

              <button
                type="button"
                className="radialShareItem email"
                title="Email"
                aria-label="Share by email"
                onClick={() => {
                  window.location.href =
                    `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
                  setOpen(false);
                }}
              >
                <FiMail />
              </button>

              <button
                type="button"
                className="radialShareItem twitter"
                title="X"
                aria-label="Share on X"
                onClick={() =>
                  openShare(
                    `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
                  )
                }
              >
                <FaXTwitter />
              </button>

              <button
                type="button"
                className="radialShareItem copy"
                title="Copy link"
                aria-label="Copy link"
                onClick={copyLink}
              >
                {copied ? <FiCheck /> : <FiLink />}
              </button>

              <button
                type="button"
                className="radialShareCenter"
                onClick={() => setOpen(false)}
                aria-label="Close share menu"
              >
                {copied ? <FiCheck /> : <FiX />}
              </button>

              <span className="radialShareLabel">
                {copied ? "Link copied!" : "Pick a channel"}
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
