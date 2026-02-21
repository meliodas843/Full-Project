import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiCalendar, FiUser, FiLogOut, FiGrid } from "react-icons/fi";
import logo from "../../../assets/logo.png";

export default function Sidebar({ onNavigate = () => {} } = {}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
    onNavigate();
  };

  const linkClass = ({ isActive }) =>
    `us-link ${isActive ? "active" : ""}`;

  return (
    <aside className="user-sidebar">
      {/* LOGO */}
      <div className="us-logo">
        <img src={logo} alt="Insight Digital Solution Provider" />
      </div>

      {/* MAIN */}
      <div className="us-section">
        <div className="us-section-title">Main</div>

        <nav className="us-menu">
          <NavLink to="/user/home" className={linkClass} onClick={onNavigate}>
            <FiHome className="us-icon" />
            <span className="us-txt">Home</span>
          </NavLink>

          <NavLink to="/user/event" className={linkClass} onClick={onNavigate}>
            <FiGrid className="us-icon" />
            <span className="us-txt">Events</span>
          </NavLink>

          <NavLink to="/user/calendar" className={linkClass} onClick={onNavigate}>
            <FiCalendar className="us-icon" />
            <span className="us-txt">Calendar</span>
          </NavLink>
        </nav>
      </div>

      {/* SETTINGS */}
      <div className="us-section">
        <div className="us-section-title">Settings</div>

        <nav className="us-menu">
          <NavLink to="/user/profile" className={linkClass} onClick={onNavigate}>
            <FiUser className="us-icon" />
            <span className="us-txt">Profile</span>
          </NavLink>
        </nav>
      </div>

      {/* FOOTER */}
      <div className="us-footer">
        <button className="us-logout" onClick={handleLogout} type="button">
          <FiLogOut className="us-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
