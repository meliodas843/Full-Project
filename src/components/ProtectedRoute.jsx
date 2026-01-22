import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();

  const token = localStorage.getItem("token");

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }

  // ❌ Not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ❌ Logged in but wrong role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ allow /profile and any subpaths like /profile/edit
  const isProfilePage = location.pathname.startsWith("/profile");

  if (
    user.role === "user" &&
    (!user.company_name || !user.phone) &&
    !isProfilePage
  ) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}
