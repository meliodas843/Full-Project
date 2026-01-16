import { Navigate } from "react-router-dom";
import { auth } from "../auth/auth";

export default function ProtectedRoute({ children, roles }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (roles && !auth.hasRole(roles)) {
    return <Navigate to="/" />;
  }

  return children;
}
