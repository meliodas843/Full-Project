import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

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

function getProfileComplete() {
  return localStorage.getItem("profileComplete") === "true";
}

export default function Sidebar({
  onNavigate = () => {},
  mobile = false,
  theme = "light",
  onThemeChange = () => {},
} = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const profileComplete = getProfileComplete();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("profileComplete");

    onNavigate();

    navigate("/login", {
      replace: true,
    });
  };

  const isPathActive = (path) => {
    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  };

  const isProfileSection =
    pathname === "/user/profile" ||
    pathname.startsWith("/user/profile/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
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

    navigate("/user/profile", {
      replace: false,
    });

    onNavigate();
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
        <img
          src={logo}
          alt="Registra"
        />
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

                <span>
                  {item.label}
                </span>

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
              to="/user/profile"
              className={getProfileLinkClass()}
              onClick={onNavigate}
            >
              <FiUser />

              <span>
                Профайл
              </span>

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
            {theme === "light"
              ? "Light mode"
              : "Dark mode"}
          </span>

          <button
            type="button"
            className={`rgThemeSwitch ${
              theme === "dark"
                ? "active"
                : ""
            }`}
            onClick={() =>
              onThemeChange(
                theme === "light"
                  ? "dark"
                  : "light"
              )
            }
          >
            <span>
              {theme === "dark" ? (
                <FiMoon />
              ) : (
                <FiSun />
              )}
            </span>
          </button>
        </div>

        <button
          type="button"
          className="rgLogout"
          onClick={handleLogout}
        >
          <FiLogOut />

          <span>
            Гарах
          </span>
        </button>
      </div>
    </aside>
  );
}