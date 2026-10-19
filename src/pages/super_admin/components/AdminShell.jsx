import { NavLink, useNavigate } from "react-router-dom";
import { FiFileText, FiGrid, FiList, FiLogOut, FiShield } from "react-icons/fi";
import logo from "../../../assets/registra-logo-def.png";
import ThemeToggle from "../../../components/ThemeToggle";
import { clearAuth } from "../../../lib/api";
import { ROLE_LABELS, initials, readStoredUser } from "../adminUtils";
import "../admin.css";

const SECTIONS = [
  {
    title: "Агуулга",
    links: [
      { to: "/super-admin/dashboard", label: "Хянах самбар", icon: FiGrid },
      { to: "/super-admin/news", label: "Мэдээ", icon: FiFileText },
    ],
  },
  {
    title: "Систем",
    links: [{ to: "/super-admin/logs", label: "Лог бүртгэл", icon: FiList }],
  },
];

export default function AdminShell({ crumb, title, actions, children }) {
  const navigate = useNavigate();
  const user = readStoredUser();
  const name =
    [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Админ";

  const logout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <div className="saApp">
      <aside className="saSidebar">
        <div className="saBrand">
          <img src={logo} alt="Registra" />
        </div>

        <div className="saRoleChip">
          <FiShield />
          {ROLE_LABELS[user.role] || "Админ"}
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="saNavSection">{section.title}</div>
            <nav className="saNav">
              {section.links.map((link) => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `saNavLink${isActive ? " active" : ""}`}>
                  <link.icon />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="saSidebarFooter">
          <div className="saThemeRow">
            <span>Харагдах байдал</span>
            <ThemeToggle />
          </div>

          <div className="saUserCard">
            <div className="saAvatar">{initials(name, "A")}</div>
            <div className="saUserText">
              <strong>{name}</strong>
              <span>{user.email}</span>
            </div>
            <button type="button" className="saIconButton" onClick={logout} aria-label="Гарах" title="Гарах">
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      <div className="saMain">
        <header className="saHeader">
          <div>
            <div className="saCrumb">{crumb}</div>
            <h1>{title}</h1>
          </div>
          {actions ? <div className="saHeaderActions">{actions}</div> : null}
        </header>

        <main className="saContent">{children}</main>
      </div>
    </div>
  );
}
