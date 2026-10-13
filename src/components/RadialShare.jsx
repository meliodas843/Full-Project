
import { useEffect, useRef, useState } from "react";
import {
  FiShare2,
  FiX,
  FiLink,
  FiMail,
  FiCheck,
} from "react-icons/fi";
import { FaWhatsapp, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function RadialShare({ title = "Байгууллага", url }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  const openShare = (link) => {
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    }
  };

  return (
    <div className="radialShare" ref={rootRef}>
      <button
        type="button"
        className="orgShareButton"
        aria-expanded={open}
        aria-label="Хуваалцах"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <FiX /> : <FiShare2 />}
        Хуваалцах
      </button>

      {open && (
        <div className="radialShareMenu">
          <button
            type="button"
            className="radialShareItem whatsapp"
            title="WhatsApp"
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
            onClick={copyLink}
          >
            {copied ? <FiCheck /> : <FiLink />}
          </button>

          <span className="radialShareLabel">
            {copied ? "Link copied!" : "Pick a channel"}
          </span>
        </div>
      )}
    </div>
  );
}
