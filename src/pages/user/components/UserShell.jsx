import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import logo from "../../../assets/registra-logo-def.png";
import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAccountType(user) {
  return String(
    user?.accountType ||
      user?.account_type ||
      localStorage.getItem("accountType") ||
      localStorage.getItem("account_type") ||
      "",
  )
    .trim()
    .toLowerCase();
}

function getInterests(user) {
  const value =
    user?.interests ||
    user?.professional_interests ||
    user?.professionalInterests ||
    [];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function isProfileComplete(user) {
  if (!user) return false;

  const firstName = String(user.firstName || user.first_name || "").trim();
  const lastName = String(user.lastName || user.last_name || "").trim();
  const company = String(
    user.company_name ||
      user.companyName ||
      user.company ||
      user.organization ||
      "",
  ).trim();
  const phone = String(user.phone || "").replace(/\D/g, "").trim();
  const jobTitle = String(
    user.job_title || user.jobTitle || user.position || "",
  ).trim();
  const interests = getInterests(user);

  return Boolean(
    firstName &&
      lastName &&
      company &&
      /^\d{8}$/.test(phone) &&
      jobTitle &&
      interests.length > 0,
  );
}

function getInitialTheme() {
  const saved = localStorage.getItem("registra-theme");
  return saved === "dark" ? "dark" : "light";
}

export default function UserShell({ title = "Registra", children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.userTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    document.body.dataset.userTheme = theme;
    localStorage.setItem("registra-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    async function checkProfile() {
      const token = getToken();

      if (!token) {
        if (!cancelled) {
          setCheckingProfile(false);
          navigate("/login", { replace: true });
        }
        return;
      }

      const storedUser = getStoredUser();
      const storedAccountType = getAccountType(storedUser);

      if (storedAccountType === "organization") {
        localStorage.setItem("accountType", "organization");
        localStorage.removeItem("profileComplete");
        if (!cancelled) setCheckingProfile(false);
        return;
      }

      const isProfilePage =
        location.pathname === "/user/profile" ||
        location.pathname.startsWith("/user/profile/") ||
        location.pathname === "/profile" ||
        location.pathname.startsWith("/profile/");

      const savedComplete =
        localStorage.getItem("profileComplete") === "true";

      if (savedComplete && !isProfilePage) {
        if (!cancelled) setCheckingProfile(false);
        return;
      }

      try {
        if (!cancelled) setCheckingProfile(true);

        const response = await fetch(`${API_BASE}/api/profile/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("role");
            localStorage.removeItem("profileComplete");
            localStorage.removeItem("accountType");
            localStorage.removeItem("account_type");

            if (!cancelled) {
              setCheckingProfile(false);
              navigate("/login", { replace: true });
            }
          } else if (!cancelled) {
            setCheckingProfile(false);
          }
          return;
        }

        const profile = data?.user || data?.profile || data;

        if (!profile) {
          if (!cancelled) setCheckingProfile(false);
          return;
        }

        localStorage.setItem("user", JSON.stringify(profile));

        const freshAccountType = getAccountType(profile);

        if (freshAccountType) {
          localStorage.setItem("accountType", freshAccountType);
        }

        if (freshAccountType === "organization") {
          localStorage.setItem("accountType", "organization");
          localStorage.removeItem("profileComplete");
          if (!cancelled) setCheckingProfile(false);
          return;
        }

        const complete = isProfileComplete(profile);
        localStorage.setItem("profileComplete", complete ? "true" : "false");

        if (!complete && !isProfilePage) {
          if (!cancelled) {
            setCheckingProfile(false);
            navigate("/user/profile", {
              replace: true,
              state: {
                profileRequired: true,
                from: location.pathname,
              },
            });
          }
          return;
        }

        if (!cancelled) setCheckingProfile(false);
      } catch {
        if (!cancelled) setCheckingProfile(false);
      }
    }

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (checkingProfile) {
    return (
      <div className="rgProfileChecking">
        <span>Профайл шалгаж байна...</span>
      </div>
    );
  }

  return (
    <div className={`rgUserLayout rgTheme-${theme}`} data-user-theme={theme}>
      <Sidebar theme={theme} onThemeChange={setTheme} />

      <div className="rgUserMain">
        <Topbar title={title} />

        <header className="rgMobileHeader">
          <img src={logo} alt="Registra" />
          <span>{title}</span>
          <button
            type="button"
            aria-label="Цэс нээх"
            onClick={() => setOpen(true)}
          >
            <FiMenu />
          </button>
        </header>

        <div className="rgUserContent">{children}</div>
      </div>

      <button
        type="button"
        className={`rgMobileOverlay ${open ? "show" : ""}`}
        aria-label="Цэс хаах"
        onClick={() => setOpen(false)}
      />

      <aside className={`rgMobileDrawer ${open ? "open" : ""}`}>
        <button
          type="button"
          className="rgMobileClose"
          aria-label="Цэс хаах"
          onClick={() => setOpen(false)}
        >
          <FiX />
        </button>

        <Sidebar
          mobile
          theme={theme}
          onThemeChange={setTheme}
          onNavigate={() => setOpen(false)}
        />
      </aside>
    </div>
  );
}
