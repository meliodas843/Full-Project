import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiGrid,
  FiHome,
  FiLock,
  FiLogOut,
  FiMoon,
  FiStar,
  FiSun,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import logo from "../../../assets/reigistra-logo-def.png";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getAccountType() {
  const user = getStoredUser();

  return String(
    user?.accountType ||
      user?.account_type ||
      localStorage.getItem("accountType") ||
      localStorage.getItem("account_type") ||
      "",
  )
    .trim()
    .toLowerCase();
}

function getProfileComplete(accountType) {
  if (accountType === "organization") {
    return (
      localStorage.getItem("organizationProfileComplete") === "true" ||
      localStorage.getItem("profileComplete") === "true"
    );
  }

  return localStorage.getItem("profileComplete") === "true";
}

export default function Sidebar({
  onNavigate = () => {},
  mobile = false,
  theme = "light",
  onThemeChange = () => {},
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const accountType = getAccountType();
  const isOrganization = accountType === "organization";
  const profileComplete = getProfileComplete(accountType);
  const profilePath = isOrganization
    ? "/user/organization"
    : "/user/profile";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("profileComplete");
    localStorage.removeItem("organizationProfileComplete");
    localStorage.removeItem("accountType");
    localStorage.removeItem("account_type");

    onNavigate();

    navigate("/login", {
      replace: true,
    });
  };

  const isPathActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const isProfileSection =
    pathname === "/user/profile" ||
    pathname.startsWith("/user/profile/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/user/organization" ||
    pathname.startsWith("/user/organization/") ||
    pathname === "/user/password" ||
    pathname.startsWith("/user/password/") ||
    pathname === "/user/company" ||
    pathname.startsWith("/user/company/") ||
    pathname === "/user/bill" ||
    pathname.startsWith("/user/bill/");

  const getLinkClass = (path) => {
    if (!profileComplete) {
      return "rgSideLink rgSideLinkLocked";
    }

    return isPathActive(path)
      ? "rgSideLink active"
      : "rgSideLink";
  };

  const getProfileLinkClass = () => {
    return isProfileSection
      ? "rgSideLink active"
      : "rgSideLink";
  };

  const handleLockedClick = (event) => {
    if (profileComplete) {
      onNavigate();
      return;
    }

    event.preventDefault();
    navigate(profilePath);
    onNavigate();
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    onThemeChange(nextTheme);
  };

  const mainLinks = [
    {
      to: "/user/home",
      icon: <FiHome />,
      label: "Нүүр",
    },
    {
      to: "/user/history",
      icon: <FiStar />,
      label: "Миний эвэнтүүд",
    },
    {
      to: "/user/event",
      icon: <FiGrid />,
      label: "Эвэнт",
    },
    {
      to: "/user/calendar",
      icon: <FiCalendar />,
      label: "Календар",
    },
    {
      to: "/user/organizations",
      icon: <FiUsers />,
      label: "Байгууллагууд",
    },
  ];

  return (
    <aside
      className={
        mobile
          ? "rgSidebar rgSidebarMobile"
          : "rgSidebar"
      }
    >
      <div className="rgSidebarLogo">
        <img src={logo} alt="Registra" />
      </div>

      <div className="rgSidebarBody">
        <section className="rgSidebarSection">
          <h5>MAIN</h5>

          <nav className="rgSidebarMenu">
            {mainLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={getLinkClass(item.to)}
                onClick={handleLockedClick}
                aria-disabled={!profileComplete}
              >
                {item.icon}
                <span>{item.label}</span>

                {!profileComplete && (
                  <FiLock className="rgSideLock" />
                )}
              </NavLink>
            ))}
          </nav>
        </section>

        <section className="rgSidebarSection">
          <h5>ТОХИРГОО</h5>

          <nav className="rgSidebarMenu">
            <NavLink
              to={profilePath}
              className={getProfileLinkClass()}
              onClick={onNavigate}
            >
              <FiUser />
              <span>Профайл</span>

              {!profileComplete && (
                <span className="rgProfileRequired">
                  Required
                </span>
              )}
            </NavLink>
          </nav>
        </section>
      </div>

      <div className="rgSidebarBottom">
        <div className="rgThemeRow">
          <span>
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>

          <button
            type="button"
            className={`rgThemeSwitch ${
              theme === "dark" ? "active" : ""
            }`}
            onClick={handleThemeToggle}
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            aria-pressed={theme === "dark"}
          >
            <span>
              {theme === "dark" ? <FiMoon /> : <FiSun />}
            </span>
          </button>
        </div>

        <button
          type="button"
          className="rgLogout"
          onClick={handleLogout}
        >
          <FiLogOut />
          <span>Гарах</span>
        </button>
      </div>
    </aside>
  );
}
