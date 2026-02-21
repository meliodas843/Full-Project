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

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const path = location.pathname;

  const [status, setStatus] = useState("checking"); // checking | ok | login
  const [user, setUser] = useState(() => safeParseUser());

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = safeParseUser();

    if (!token) {
      setStatus("login");
      return;
    }

    if (storedUser) {
      setUser(storedUser);
      setStatus("ok");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (!cancelled) setStatus("login");
          return;
        }

        const me = await res.json().catch(() => null);
        if (!me) {
          if (!cancelled) setStatus("login");
          return;
        }

        localStorage.setItem("user", JSON.stringify(me));

        if (!cancelled) {
          setUser(me);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (status === "checking") return null;

  if (status === "login") {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  const isProfilePage = path.startsWith("/profile");
  const needsProfile =
    user?.role === "user" &&
    (!String(user?.company_name || "").trim() ||
      !String(user?.phone || "").trim());

  if (needsProfile && !isProfilePage) {
    return <Navigate to="/profile" replace state={{ from: path }} />;
  }

  return children;
}
