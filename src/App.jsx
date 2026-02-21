import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Signup from "./pages/public/Signup";
import News from "./pages/public/News";
import PublicEvents from "./pages/public/Event";
import ForgotPassword from "./pages/public/ForgotPassword";
import ResetPassword from "./pages/public/ResetPassword";
import EventInvite from "./pages/public/EventInvite";

import UserHome from "./pages/user/pages/Home";
import Profile from "./pages/user/pages/Profile";
import Calendar from "./pages/user/pages/Calendar";
import Meeting from "./pages/user/pages/Meeting";
import UserEvents from "./pages/user/pages/Event";
import History from "./pages/user/pages/History";
import Password from "./pages/user/pages/Password";
import Company from "./pages/user/pages/Company";
import Bill from "./pages/user/pages/Bill";

import SuperAdminHome from "./pages/super_admin/pages/Home";
import NewsCreate from "./pages/super_admin/pages/NewsCreate";

function AppRoutes() {
  const location = useLocation();

  const isUserArea = location.pathname.startsWith("/user");
  const isSuperAdminArea = location.pathname.startsWith("/super-admin");
  const isProfilePage = location.pathname.startsWith("/profile");

  const showPublicNavbar = !isUserArea && !isSuperAdminArea && !isProfilePage;

  return (
    <>
      {showPublicNavbar && <Navbar />}

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<PublicEvents />} />

        {/* Password reset (public) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Invite link public */}
        <Route path="/event/invite/:token" element={<EventInvite />} />

        {/* PROFILE (protected for both roles) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["user", "super_admin"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* REDIRECT BASE */}
        <Route path="/user" element={<Navigate to="/user/home" replace />} />
        <Route
          path="/super-admin"
          element={<Navigate to="/super-admin/home" replace />}
        />

        {/* USER (protected) */}
        <Route
          path="/user/home"
          element={
            <ProtectedRoute roles={["user"]}>
              <UserHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/event"
          element={
            <ProtectedRoute roles={["user"]}>
              <UserEvents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/history"
          element={
            <ProtectedRoute roles={["user"]}>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/notifications"
          element={
            <ProtectedRoute roles={["user"]}>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/meeting/create"
          element={
            <ProtectedRoute roles={["user"]}>
              <Meeting />
            </ProtectedRoute>
          }
        />

        {/* alias */}
        <Route
          path="/user/calendar"
          element={<Navigate to="/user/notifications" replace />}
        />

        {/* ✅ FIXED: these must also be protected */}
        <Route
          path="/user/profile"
          element={
            <ProtectedRoute roles={["user"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/password"
          element={
            <ProtectedRoute roles={["user"]}>
              <Password />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/company"
          element={
            <ProtectedRoute roles={["user"]}>
              <Company />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/bill"
          element={
            <ProtectedRoute roles={["user"]}>
              <Bill />
            </ProtectedRoute>
          }
        />

        {/* SUPER ADMIN (protected) */}
        <Route
          path="/super-admin/home"
          element={
            <ProtectedRoute roles={["super_admin"]}>
              <SuperAdminHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/news-create"
          element={
            <ProtectedRoute roles={["super_admin"]}>
              <NewsCreate />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
