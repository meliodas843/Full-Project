import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="user-sidebar">
      <div className="us-brand" onClick={() => navigate("/user/home")} role="button" tabIndex={0}>
        <div className="us-logo">A</div>
        <div className="us-brand-text">
          <div className="us-brand-name">Admin</div>
          <div className="us-brand-sub">User</div>
        </div>
      </div>

      <div className="us-section">
        <div className="us-section-title">Main</div>
        <nav className="us-menu">
          <NavLink to="/user/home" className={({ isActive }) => `us-link ${isActive ? "active" : ""}`}>
            <span className="us-ic"></span>
            <span className="us-txt">Home</span>
          </NavLink>

          <NavLink to="/user/calendar" className={({ isActive }) => `us-link ${isActive ? "active" : ""}`}>
            <span className="us-ic"></span>
            <span className="us-txt">Calendar</span>
          </NavLink>
        </nav>
      </div>

      <div className="us-section">
        <div className="us-section-title">Settings</div>
        <nav className="us-menu">
          <NavLink to="/user/profile" className={({ isActive }) => `us-link ${isActive ? "active" : ""}`}>
            <span className="us-ic"></span>
            <span className="us-txt">Profile</span>
          </NavLink>
        </nav>
      </div>

      <div className="us-footer">
        <button className="us-logout" onClick={handleLogout} type="button">
          <span className="us-ic"></span>
          <span className="us-txt">Logout</span>
        </button>
      </div>
    </aside>
  );
}
