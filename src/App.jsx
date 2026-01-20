import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Signup from "./pages/public/Signup";
import News from "./pages/public/News";
import Events from "./pages/public/Event";

import UserHome from "./pages/user/pages/Home";
import SuperAdminHome from "./pages/super_admin/pages/Home";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />

        {/* USER */}
        <Route
          path="/user"
          element={
            <ProtectedRoute roles={["user"]}>
              <UserHome />
            </ProtectedRoute>
          }
        />

        {/* SUPER ADMIN */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute roles={["super_admin"]}>
              <SuperAdminHome />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
