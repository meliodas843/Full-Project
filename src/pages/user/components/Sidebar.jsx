import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiHome, FiCalendar, FiUser, FiLogOut, FiGrid } from "react-icons/fi";
import logo from "../../../assets/logo.png";

export default function Sidebar({ onNavigate = () => {}, mobile = false } = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
    onNavigate();
  };

  const getLinkClass = (path) =>
    pathname === path || pathname.startsWith(path + "/")
      ? "us-link active"
      : "us-link";

  return (
    <aside className={mobile ? "drawer-sidebar" : "user-sidebar"}>
      {!mobile && (
        <div className="us-logo">
          <img src={logo} alt="Insight Digital Solution Provider" />
        </div>
      )}

      <div className="us-section">
        <div className="us-section-title">Main</div>

        <nav className="us-menu">
          <NavLink to="/user/home" className={getLinkClass("/user/home")} onClick={onNavigate}>
            <FiHome className="us-icon" />
            <span className="us-txt">Нүүр</span>
          </NavLink>

          <NavLink to="/user/event" className={getLinkClass("/user/event")} onClick={onNavigate}>
            <FiGrid className="us-icon" />
            <span className="us-txt">Эвэнт</span>
          </NavLink>

          <NavLink to="/user/calendar" className={getLinkClass("/user/calendar")} onClick={onNavigate}>
            <FiCalendar className="us-icon" />
            <span className="us-txt">Календар</span>
          </NavLink>
        </nav>
      </div>

      <div className="us-section">
        <div className="us-section-title">Тохиргоо</div>

        <nav className="us-menu">
          <NavLink to="/user/profile" className={getLinkClass("/user/profile")} onClick={onNavigate}>
            <FiUser className="us-icon" />
            <span className="us-txt">Профайл</span>
          </NavLink>
        </nav>
      </div>

      <div className="us-footer">
        <button className="us-logout" onClick={handleLogout} type="button">
          <FiLogOut className="us-icon" />
          <span>Гарах</span>
        </button>
      </div>
    </aside>
  );
}