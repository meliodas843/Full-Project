import { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./theme/ThemeProvider";
import { lazyPage } from "./lib/lazyPage";

// Pages load on demand, so the first visit only downloads the page it needs.
const EventShare = lazyPage(() => import("./pages/public/EventShare"));
const Home = lazyPage(() => import("./pages/public/Home"));
const Login = lazyPage(() => import("./pages/public/Login"));
const Signup = lazyPage(() => import("./pages/public/Signup"));
const News = lazyPage(() => import("./pages/public/News"));
const LegalPage = lazyPage(() => import("./pages/public/legal/LegalPage"));
const PublicEvents = lazyPage(() => import("./pages/public/Event"));
const ForgotPassword = lazyPage(() => import("./pages/public/ForgotPassword"));
const ResetPassword = lazyPage(() => import("./pages/public/ResetPassword"));
const EventInvite = lazyPage(() => import("./pages/public/EventInvite"));
const EventCheckin = lazyPage(() => import("./pages/user/pages/EventCheckin"));
const EventTicket = lazyPage(() => import("./pages/user/pages/EventTicket"));
const Organization = lazyPage(() => import("./pages/public/Organization"));
const NewsDetail = lazyPage(() => import("./pages/public/NewsDetail"));
const EventDetail = lazyPage(() => import("./pages/public/EventDetail"));
const UserHome = lazyPage(() => import("./pages/user/pages/Home"));
const Profile = lazyPage(() => import("./pages/user/pages/Profile"));
const Calendar = lazyPage(() => import("./pages/user/pages/Calendar"));
const Meeting = lazyPage(() => import("./pages/user/pages/Meeting"));
const UserEvents = lazyPage(() => import("./pages/user/pages/Event"));
const History = lazyPage(() => import("./pages/user/pages/History"));
const Password = lazyPage(() => import("./pages/user/pages/Password"));
const Bill = lazyPage(() => import("./pages/user/pages/Bill"));
const Organizations = lazyPage(() => import("./pages/user/pages/Organizations"));
const OrganizationDetail = lazyPage(() => import("./pages/user/pages/OrganizationDetail"));
const OrganizationProfile = lazyPage(() => import("./pages/user/pages/OrganizationProfile"));
const EventStatistics = lazyPage(() => import("./pages/user/pages/EventStatistics"));
const EventImages = lazyPage(() => import("./pages/user/pages/EventImages"));
const AdminDashboard = lazyPage(() => import("./pages/super_admin/pages/Dashboard"));
const AdminNewsList = lazyPage(() => import("./pages/super_admin/pages/NewsList"));
const AdminNewsEditor = lazyPage(() => import("./pages/super_admin/pages/NewsEditor"));
const AdminLogs = lazyPage(() => import("./pages/super_admin/pages/Logs"));

const ADMIN_ROLES = ["admin", "super_admin"];
const adminPage = (page) => <ProtectedRoute roles={ADMIN_ROLES}>{page}</ProtectedRoute>;



function AppRoutes() {
  const location = useLocation();
  useTheme();
  const isUserArea = location.pathname.startsWith("/user");
  const isSuperAdminArea = location.pathname.startsWith("/super-admin");

  const isProfilePage =
    location.pathname === "/profile" || location.pathname === "/user/profile";

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  const showPublicNavbar =
    !isUserArea && !isSuperAdminArea && !isProfilePage && !isAuthPage;

  return (
    <>
      <ScrollToTop />

      {showPublicNavbar && <Navbar />}

      {isAuthPage && (
        <div className="regFloatingThemeToggle">
          <ThemeToggle />
        </div>
      )}

      <Suspense fallback={<div className="regPageLoading" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/news" element={<News />} />
        <Route path="/terms" element={<LegalPage docKey="terms" />} />
        <Route path="/privacy" element={<LegalPage docKey="privacy" />} />
        <Route path="/organization-terms" element={<LegalPage docKey="organization" />} />
        <Route path="/news/:id" element={<NewsDetail />} />

        <Route path="/events" element={<PublicEvents />} />
        <Route path="/events/:id" element={<EventDetail />} />

        <Route path="/organization" element={<Organization />} />
        <Route path="/organizations" element={<Navigate to="/organization" replace />} />

        <Route path="/organizations/:id" element={<OrganizationDetail />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/event/invite/:token" element={<EventInvite />} />

        <Route path="/share/event/:id" element={<EventShare />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["user", "super_admin"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="/user" element={<Navigate to="/user/home" replace />} />

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
          path="/user/events/:eventId/checkin"
          element={
            <ProtectedRoute roles={["user"]}>
              <EventCheckin />
            </ProtectedRoute>
          }
        />

        <Route path="/user/event-ticket/:eventId" element={<EventTicket />} />

        <Route
          path="/user/history"
          element={
            <ProtectedRoute roles={["user"]}>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/history/:id/images"
          element={
            <ProtectedRoute roles={["user"]}>
              <EventImages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/history/:id/statistics"
          element={
            <ProtectedRoute roles={["user"]}>
              <EventStatistics />
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
          path="/user/calendar"
          element={
            <ProtectedRoute roles={["user"]}>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/organizations"
          element={
            <ProtectedRoute roles={["user"]}>
              <Organizations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/organizations/:id"
          element={
            <ProtectedRoute roles={["user"]}>
              <OrganizationDetail />
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

        <Route
          path="/user/profile"
          element={
            <ProtectedRoute roles={["user"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/organization"
          element={
            <ProtectedRoute roles={["user"]}>
              <OrganizationProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/company"
          element={<Navigate to="/user/organization" replace />}
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
          path="/user/bill"
          element={
            <ProtectedRoute roles={["user"]}>
              <Bill />
            </ProtectedRoute>
          }
        />

        <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="/super-admin/home" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="/super-admin/news-create" element={<Navigate to="/super-admin/news/new" replace />} />
        <Route path="/super-admin/dashboard" element={adminPage(<AdminDashboard />)} />
        <Route path="/super-admin/news" element={adminPage(<AdminNewsList />)} />
        <Route path="/super-admin/news/new" element={adminPage(<AdminNewsEditor />)} />
        <Route path="/super-admin/news/:id" element={adminPage(<AdminNewsEditor />)} />
        <Route path="/super-admin/logs" element={adminPage(<AdminLogs />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
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
