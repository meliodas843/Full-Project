import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

/* PUBLIC */
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Signup from "./pages/public/Signup";
import News from "./pages/public/News";
import PublicEvents from "./pages/public/Event";

/* USER */
import UserHome from "./pages/user/pages/Home";
import Profile from "./pages/user/pages/Profile";
import Calendar from "./pages/user/pages/Calendar";
import Meeting from "./pages/user/pages/Meeting";
import UserEvents from "./pages/user/pages/Event";

/* SUPER ADMIN */
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

        {/* PROFILE */}
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

        {/* USER */}
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

        {/* SUPER ADMIN */}
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
