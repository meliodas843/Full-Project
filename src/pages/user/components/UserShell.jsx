import {
  useEffect,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiMenu,
  FiX,
} from "react-icons/fi";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import logo from "../../../assets/registra-logo-def.png";

import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem(
    "token"
  );
}

function isProfileComplete(user) {
  if (!user) {
    return false;
  }

  const firstName = String(
    user.firstName ||
      user.first_name ||
      ""
  ).trim();

  const lastName = String(
    user.lastName ||
      user.last_name ||
      ""
  ).trim();

  const company = String(
    user.company_name ||
      user.company ||
      ""
  ).trim();

  const phone = String(
    user.phone || ""
  )
    .replace(/\D/g, "")
    .trim();

  return Boolean(
    firstName &&
      lastName &&
      company &&
      /^\d{8}$/.test(phone)
  );
}

export default function UserShell({
  title = "Registra",
  children,
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [open, setOpen] =
    useState(false);

  const [
    checkingProfile,
    setCheckingProfile,
  ] = useState(true);

  const [theme, setTheme] =
    useState(() => {
      return (
        localStorage.getItem(
          "registra-theme"
        ) || "light"
      );
    });

  useEffect(() => {
    document.documentElement.dataset.userTheme =
      theme;

    localStorage.setItem(
      "registra-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow =
      open ? "hidden" : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [open]);

  useEffect(() => {
    function handleKey(event) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleKey
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKey
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkProfile() {
      const token =
        getToken();

      if (!token) {
        if (!cancelled) {
          setCheckingProfile(
            false
          );

          navigate(
            "/login",
            {
              replace: true,
            }
          );
        }

        return;
      }

      try {
        setCheckingProfile(
          true
        );

        const response =
          await fetch(
            `${API_BASE}/api/profile/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "profileComplete"
            );

            if (!cancelled) {
              navigate(
                "/login",
                {
                  replace: true,
                }
              );
            }
          }

          return;
        }

        const profile =
          data?.user ||
          data;

        localStorage.setItem(
          "user",
          JSON.stringify(
            profile
          )
        );

        const complete =
          isProfileComplete(
            profile
          );

        localStorage.setItem(
          "profileComplete",
          complete
            ? "true"
            : "false"
        );

        const isProfilePage =
          location.pathname ===
            "/user/profile" ||
          location.pathname ===
            "/profile";

        if (
          !complete &&
          !isProfilePage &&
          !cancelled
        ) {
          navigate(
            "/user/profile",
            {
              replace: true,

              state: {
                profileRequired:
                  true,

                from:
                  location.pathname,
              },
            }
          );

          return;
        }
      } catch (error) {
        console.error(
          "Profile check error:",
          error
        );
      } finally {
        if (!cancelled) {
          setCheckingProfile(
            false
          );
        }
      }
    }

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [
    location.pathname,
    navigate,
  ]);

  if (checkingProfile) {
    return (
      <div
        className="rgProfileChecking"
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
        }}
      >
        <span>
          Профайл шалгаж
          байна...
        </span>
      </div>
    );
  }

  return (
    <div className="rgUserLayout">
      <Sidebar
        theme={theme}
        onThemeChange={
          setTheme
        }
      />

      <div className="rgUserMain">
        <Topbar />

        <header className="rgMobileHeader">
          <img
            src={logo}
            alt="Registra"
          />

          <span>
            {title}
          </span>

          <button
            type="button"
            aria-label="Цэс нээх"
            onClick={() =>
              setOpen(true)
            }
          >
            <FiMenu />
          </button>
        </header>

        <div className="rgUserContent">
          {children}
        </div>
      </div>

      <div
        className={`rgMobileOverlay ${
          open
            ? "show"
            : ""
        }`}
        onClick={() =>
          setOpen(false)
        }
      />

      <aside
        className={`rgMobileDrawer ${
          open
            ? "open"
            : ""
        }`}
      >
        <button
          type="button"
          className="rgMobileClose"
          aria-label="Цэс хаах"
          onClick={() =>
            setOpen(false)
          }
        >
          <FiX />
        </button>

        <Sidebar
          mobile
          theme={theme}
          onThemeChange={
            setTheme
          }
          onNavigate={() =>
            setOpen(false)
          }
        />
      </aside>
    </div>
  );
}