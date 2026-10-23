import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiCreditCard, FiFileText, FiGrid, FiList, FiLogOut, FiMenu, FiSettings, FiShield, FiX } from "react-icons/fi";
import logo from "../../../assets/registra-logo-def.png";
import ThemeToggle from "../../../components/ThemeToggle";
import { apiFetch, clearAuth } from "../../../lib/api";
import { ROLE_LABELS, initials, readStoredUser } from "../adminUtils";
import "../admin.css";

const SECTIONS = [
  {
    title: "Агуулга",
    links: [
      { to: "/super-admin/dashboard", label: "Хянах самбар", icon: FiGrid },
      { to: "/super-admin/news", label: "Мэдээ", icon: FiFileText },
      { to: "/super-admin/payments", label: "Төлбөр", icon: FiCreditCard, badge: "payments" },
    ],
  },
  {
    title: "Систем",
    links: [
      { to: "/super-admin/logs", label: "Лог бүртгэл", icon: FiList },
      { to: "/super-admin/settings", label: "Тохиргоо", icon: FiSettings },
    ],
  },
];

export default function AdminShell({ crumb, title, actions, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = readStoredUser();
  const [menuOpen, setMenuOpen] = useState(false);
  // Payments waiting for a decision, shown as a badge on "Төлбөр".
  const [pendingPayments, setPendingPayments] = useState(0);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/admin/payments/pending-count")
      .then((data) => alive && setPendingPayments(Number(data?.submitted || 0)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  // On small screens the sidebar is a drawer: close it after navigating
  // and on Escape.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const name =
    [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Админ";

  const logout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`saApp${menuOpen ? " menuOpen" : ""}`}>
      <div className="saMobileBar">
        <button type="button" className="saIconButton" onClick={() => setMenuOpen(true)} aria-label="Цэс нээх">
          <FiMenu />
        </button>
        <img src={logo} alt="Registra" />
        <div className="saAvatar">{initials(name, "A")}</div>
      </div>

      <div className="saBackdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <aside className="saSidebar" aria-label="Админ цэс">
        <div className="saBrand">
          <img src={logo} alt="Registra" />
          <button type="button" className="saIconButton saDrawerClose" onClick={() => setMenuOpen(false)} aria-label="Цэс хаах">
            <FiX />
          </button>
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
                  {link.badge === "payments" && pendingPayments > 0 ? (
                    <em className="saNavBadge">{pendingPayments}</em>
                  ) : null}
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
