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
    if (!payload) return null;

    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children, roles = [] }) {
  const location = useLocation();
  const path = location.pathname;

  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(() => safeParseUser());

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setStatus("login");
      return;
    }

    const tokenUser = parseTokenUser(token);
    const storedUser = safeParseUser();

    const mergedUser = {
      ...(tokenUser || {}),
      ...(storedUser || {}),
      role: storedUser?.role || tokenUser?.role || "user",
    };

    if (mergedUser?.id || mergedUser?.email) {
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser);
      setStatus("ok");
      return;
    }

    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (!cancelled) setStatus("login");
          return;
        }

        const data = await res.json().catch(() => null);
        const me = data?.user || data;

        const finalUser = {
          ...(tokenUser || {}),
          ...(me || {}),
          role: me?.role || tokenUser?.role || "user",
        };

        localStorage.setItem("user", JSON.stringify(finalUser));

        if (!cancelled) {
          setUser(finalUser);
          setStatus("ok");
        }
      } catch (err) {
        console.error("ProtectedRoute error:", err);
        if (!cancelled) setStatus("login");
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (status === "checking") return null;

  if (status === "login") {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  const userRole = user?.role || "user";

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  const isProfilePage = path === "/profile" || path === "/user/profile";

  const needsProfile =
    userRole === "user" &&
    (!String(user?.company_name || "").trim() ||
      !String(user?.phone || "").trim());

  if (needsProfile && !isProfilePage) {
    return <Navigate to="/user/profile" replace />;
  }

  return children;
}