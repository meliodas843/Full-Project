import { Navigate, useLocation } from "react-router-dom";

import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/config";

function safeParseUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function parseTokenUser(token) {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    while (base64.length % 4) {
      base64 += "=";
    }

    return JSON.parse(atob(base64));
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

function isOrganizationAccount(user) {
  return getAccountType(user) === "organization";
}

export default function ProtectedRoute({ children, roles = [] }) {
  const location = useLocation();

  const path = location.pathname;

  const [status, setStatus] = useState("checking");

  const [user, setUser] = useState(() => safeParseUser());

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem("token");

    /*
     * ==============================
     * NO TOKEN
     * ==============================
     */

    if (!token) {
      setStatus("login");
      return undefined;
    }

    /*
     * ==============================
     * TOKEN + STORED USER
     * ==============================
     */

    const tokenUser = parseTokenUser(token);

    const storedUser = safeParseUser();

    const mergedUser = {
      ...(tokenUser || {}),
      ...(storedUser || {}),

      role: storedUser?.role || tokenUser?.role || "user",
    };

    /*
     * Keep account type from the
     * login response/localStorage.
     */

    const mergedAccountType = getAccountType(mergedUser);

    if (mergedAccountType) {
      mergedUser.accountType = mergedAccountType;

      mergedUser.account_type = mergedAccountType;

      localStorage.setItem("accountType", mergedAccountType);

      localStorage.setItem("account_type", mergedAccountType);
    }

    /*
     * ==============================
     * USER ALREADY AVAILABLE
     * ==============================
     */

    if (mergedUser?.id || mergedUser?.email) {
      localStorage.setItem("user", JSON.stringify(mergedUser));

      setUser(mergedUser);

      setStatus("ok");

      return undefined;
    }

    /*
     * ==============================
     * FALLBACK: LOAD USER
     * ==============================
     */

    async function loadMe() {
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (!cancelled) {
            setStatus("login");
          }

          return;
        }

        const data = await res.json().catch(() => null);

        const me = data?.user || data;

        const finalUser = {
          ...(tokenUser || {}),

          ...(me || {}),

          role: me?.role || tokenUser?.role || "user",
        };

        /*
         * Preserve account type.
         */

        const accountType = getAccountType(finalUser);

        if (accountType) {
          finalUser.accountType = accountType;

          finalUser.account_type = accountType;

          localStorage.setItem("accountType", accountType);

          localStorage.setItem("account_type", accountType);
        }

        localStorage.setItem("user", JSON.stringify(finalUser));

        if (!cancelled) {
          setUser(finalUser);

          setStatus("ok");
        }
      } catch (err) {
        console.error("ProtectedRoute error:", err);

        if (!cancelled) {
          setStatus("login");
        }
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [path]);

  /*
   * ==============================
   * CHECKING
   * ==============================
   */

  if (status === "checking") {
    return null;
  }

  /*
   * ==============================
   * LOGIN REQUIRED
   * ==============================
   */

  if (status === "login") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: path,
        }}
      />
    );
  }

  /*
   * ==============================
   * ROLE CHECK
   * ==============================
   */

  const userRole = user?.role || "user";

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  /*
   * ==============================
   * ACCOUNT TYPE
   * ==============================
   */

  const accountType = getAccountType(user);

  const organizationAccount = isOrganizationAccount(user);

  console.log("[ProtectedRoute] path:", path);

  console.log("[ProtectedRoute] role:", userRole);

  console.log("[ProtectedRoute] accountType:", accountType);

  if (organizationAccount) {
    return children;
  }

  const isProfilePage = path === "/profile" || path === "/user/profile";

  const needsProfile =
    userRole === "user" &&
    (!String(user?.company_name || user?.companyName || "").trim() ||
      !String(user?.phone || "").trim());

  /*
   * Only INDIVIDUAL users are sent
   * to /user/profile.
   */

  if (needsProfile && !isProfilePage) {
    return (
      <Navigate
        to="/user/profile"
        replace
        state={{
          profileRequired: true,

          from: path,
        }}
      />
    );
  }

  return children;
}
