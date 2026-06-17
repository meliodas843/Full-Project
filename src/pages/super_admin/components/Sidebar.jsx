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
      <div
        className="us-brand"
        onClick={() => navigate("/super-admin/home")}
        role="button"
        tabIndex={0}
      >
        <div className="us-logo">A</div>
        <div className="us-brand-text">
          <div className="us-brand-name">Админ</div>
          <div className="us-brand-sub">Супер админ</div>
        </div>
      </div>

      <div className="us-section">
        <div className="us-section-title">Үйлдлүүд</div>
        <nav className="us-menu">
          <NavLink
            to="/super-admin/news-create"
            className={({ isActive }) => `us-link ${isActive ? "active" : ""}`}
          >
            <span className="us-txt">Мэдээ үүсгэх</span>
          </NavLink>
        </nav>
      </div>

      <div className="us-footer">
        <button className="admin-us-logout" onClick={handleLogout} type="button">
          <span className="us-txt">Гарах</span>
        </button>
      </div>
    </aside>
  );
}
