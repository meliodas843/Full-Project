import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import { API_BASE } from "@/lib/config";

function getToken() {
  return localStorage.getItem("token");
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Stored user parse error:", error);

    return null;
  }
}

function getAccountType(user) {
  const type =
    user?.accountType ||
    user?.account_type ||
    localStorage.getItem("accountType") ||
    localStorage.getItem("account_type") ||
    "";

  return String(type)
    .trim()
    .toLowerCase();
}

function isOrganizationAccount(user) {
  return getAccountType(user) === "organization";
}

function getInterests(profile) {
  const value =
    profile?.interests ||
    profile?.professional_interests ||
    profile?.professionalInterests ||
    [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function isProfileComplete(profile) {
  if (!profile) {
    return false;
  }

  const firstName = String(
    profile?.firstName ||
      profile?.first_name ||
      ""
  ).trim();

  const lastName = String(
    profile?.lastName ||
      profile?.last_name ||
      ""
  ).trim();

  const phone = String(
    profile?.phone || ""
  )
    .replace(/\D/g, "")
    .trim();

  const company = String(
    profile?.company_name ||
      profile?.companyName ||
      profile?.company ||
      profile?.organization ||
      ""
  ).trim();

  const jobTitle = String(
    profile?.job_title ||
      profile?.jobTitle ||
      profile?.position ||
      ""
  ).trim();

  const interests = getInterests(profile);

  const personal =
    Boolean(firstName) &&
    Boolean(lastName);

  const contact =
    /^\d{8}$/.test(phone);

  const organization =
    Boolean(company) &&
    Boolean(jobTitle);

  const professional =
    interests.length > 0;

  return (
    personal &&
    contact &&
    organization &&
    professional
  );
}

export default function UserShell({
  children,
  title = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingProfile, setCheckingProfile] =
    useState(true);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkProfile() {
      const token = getToken();

      if (!token) {
        if (!cancelled) {
          setCheckingProfile(false);

          navigate("/login", {
            replace: true,
          });
        }

        return;
      }

      /*
       * ==========================================
       * 1. CHECK STORED ACCOUNT
       * ==========================================
       */

      const storedUser = getStoredUser();

      const storedAccountType =
        getAccountType(storedUser);

      console.log(
        "[UserShell] pathname:",
        location.pathname
      );

      console.log(
        "[UserShell] accountType:",
        storedAccountType
      );

      /*
       * ==========================================
       * 2. ORGANIZATION ACCOUNT
       * ==========================================
       *
       * IMPORTANT:
       *
       * Organization accounts DO NOT use the
       * personal profile completion system.
       *
       * Do NOT navigate here.
       *
       * Login/Signup decides whether the user
       * should initially enter:
       *
       * /user/organization
       *
       * UserShell only allows the page to render.
       * ==========================================
       */

      if (
        storedAccountType === "organization"
      ) {
        localStorage.setItem(
          "accountType",
          "organization"
        );

        localStorage.removeItem(
          "profileComplete"
        );

        if (!cancelled) {
          setCheckingProfile(false);
        }

        return;
      }

      /*
       * ==========================================
       * 3. PERSONAL USER
       * ==========================================
       */

      const isProfilePage =
        location.pathname === "/profile" ||
        location.pathname ===
          "/user/profile";

      /*
       * If we already know that this user's
       * profile is complete, do not request
       * /api/profile/me on every navigation.
       */

      const savedComplete =
        localStorage.getItem(
          "profileComplete"
        ) === "true";

      if (
        savedComplete &&
        !isProfilePage
      ) {
        if (!cancelled) {
          setCheckingProfile(false);
        }

        return;
      }

      /*
       * ==========================================
       * 4. GET PERSONAL PROFILE
       * ==========================================
       */

      try {
        if (!cancelled) {
          setCheckingProfile(true);
        }

        const response = await fetch(
          `${API_BASE}/api/profile/me`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        /*
         * ========================================
         * INVALID LOGIN
         * ========================================
         */

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "user"
            );

            localStorage.removeItem(
              "role"
            );

            localStorage.removeItem(
              "profileComplete"
            );

            localStorage.removeItem(
              "accountType"
            );

            localStorage.removeItem(
              "account_type"
            );

            if (!cancelled) {
              setCheckingProfile(false);

              navigate("/login", {
                replace: true,
              });
            }

            return;
          }

          console.error(
            "Profile request failed:",
            data
          );

          if (!cancelled) {
            setCheckingProfile(false);
          }

          return;
        }

        /*
         * ========================================
         * PROFILE DATA
         * ========================================
         */

        const profile =
          data?.user ||
          data?.profile ||
          data;

        if (!profile) {
          if (!cancelled) {
            setCheckingProfile(false);
          }

          return;
        }

        /*
         * ========================================
         * SAVE FRESH USER DATA
         * ========================================
         */

        localStorage.setItem(
          "user",
          JSON.stringify(profile)
        );

        const freshAccountType =
          getAccountType(profile);

        if (freshAccountType) {
          localStorage.setItem(
            "accountType",
            freshAccountType
          );
        }

        console.log(
          "[UserShell] fresh accountType:",
          freshAccountType
        );

        /*
         * ========================================
         * IMPORTANT SAFETY CHECK
         * ========================================
         *
         * Maybe localStorage contained an old user,
         * but /api/profile/me returned an
         * organization account.
         *
         * Still DO NOT redirect here.
         * Just skip personal profile validation.
         */

        if (
          freshAccountType ===
          "organization"
        ) {
          localStorage.setItem(
            "accountType",
            "organization"
          );

          localStorage.removeItem(
            "profileComplete"
          );

          if (!cancelled) {
            setCheckingProfile(false);
          }

          return;
        }

        /*
         * ========================================
         * PERSONAL PROFILE COMPLETION
         * ========================================
         */

        const complete =
          isProfileComplete(profile);

        localStorage.setItem(
          "profileComplete",
          complete
            ? "true"
            : "false"
        );

        /*
         * ========================================
         * INCOMPLETE PERSONAL PROFILE
         * ========================================
         */

        if (
          !complete &&
          !isProfilePage
        ) {
          if (!cancelled) {
            setCheckingProfile(false);

            navigate(
              "/user/profile",
              {
                replace: true,

                state: {
                  profileRequired: true,

                  from:
                    location.pathname,
                },
              }
            );
          }

          return;
        }

        /*
         * ========================================
         * EVERYTHING OK
         * ========================================
         */

        if (!cancelled) {
          setCheckingProfile(false);
        }
      } catch (error) {
        console.error(
          "Profile check error:",
          error
        );

        if (!cancelled) {
          setCheckingProfile(false);
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

  /*
   * ==========================================
   * MOBILE DRAWER
   * ==========================================
   */

  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === "Escape"
      ) {
        setMobileOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /*
   * ==========================================
   * PROFILE CHECK LOADING
   * ==========================================
   */

  if (checkingProfile) {
    return (
      <div
        className="rgProfileChecking"
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span>
          Профайл шалгаж байна...
        </span>
      </div>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <div className="rgUserShell">
      <Sidebar />

      <div className="rgUserShellMain">
        <Topbar
          title={title}
          onMenuClick={() =>
            setMobileOpen(true)
          }
        />

        <main className="rgUserShellContent">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="rgUserMobileBackdrop"
            aria-label="Close menu"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          <div className="rgUserMobileSidebar">
            <button
              type="button"
              className="rgUserMobileClose"
              aria-label="Close menu"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              <FiX />
            </button>

            <Sidebar />
          </div>
        </>
      )}

      <button
        type="button"
        className="rgUserMobileMenu"
        aria-label="Open menu"
        onClick={() =>
          setMobileOpen(true)
        }
      >
        <FiMenu />
      </button>
    </div>
  );
}