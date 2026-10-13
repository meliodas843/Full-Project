
import { useEffect, useRef, useState } from "react";
import {
  FaWhatsapp,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";
import { FiMail, FiLink, FiShare2, FiX } from "react-icons/fi";

export default function RadialShare({
  title = "Байгууллага",
  url,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const openShare = (link) => {
    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1400);
    } catch {
      setCopied(false);
    }
  };

  const channels = [
    {
      name: "WhatsApp",
      icon: <FaWhatsapp />,
      className: "whatsapp",
      action: () =>
        openShare(
          `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
        ),
    },
    {
      name: "LinkedIn",
      icon: <FaLinkedinIn />,
      className: "linkedin",
      action: () =>
        openShare(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        ),
    },
    {
      name: "Email",
      icon: <FiMail />,
      className: "email",
      action: () => {
        window.location.href =
          `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
        setOpen(false);
      },
    },
    {
      name: "X",
      icon: <FaXTwitter />,
      className: "twitter",
      action: () =>
        openShare(
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
        ),
    },
    {
      name: "Copy link",
      icon: <FiLink />,
      className: "copy",
      action: copyLink,
    },
  ];

  return (
    <>
      <button
        type="button"
        className="orgShareButton"
        onClick={() => setOpen(true)}
      >
        <FiShare2 />
        Хуваалцах
      </button>

      {open && (
        <div
          className="radialShareOverlay"
          onClick={() => {
            if (!copied) setOpen(false);
          }}
        >
          <div
            className="radialSharePanel"
            role="dialog"
            aria-modal="true"
            aria-label="Байгууллага хуваалцах"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="radialShareMenu">
              {channels.map((channel, index) => (
                <button
                  key={channel.name}
                  type="button"
                  aria-label={channel.name}
                  className={`radialShareChannel ${channel.className}`}
                  style={{
                    "--index": index,
                  }}
                  onClick={channel.action}
                  disabled={copied}
                >
                  {channel.icon}
                </button>
              ))}

              <button
                type="button"
                className={`radialShareCenter ${
                  copied ? "isCopied" : ""
                }`}
                onClick={() => {
                  if (!copied) setOpen(false);
                }}
                aria-label="Close share menu"
              >
                {copied ? <FiLink /> : <FiX />}
              </button>

              <div className="radialShareLabel">
                {copied ? "Link copied" : "Pick a channel"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
