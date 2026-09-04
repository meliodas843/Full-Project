import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiCalendar,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMoon,
  FiStar,
  FiSun,
  FiUser,
} from "react-icons/fi";
import logo from "../../../assets/registra-logo-def.png";

export default function Sidebar({
  onNavigate = () => {},
  mobile = false,
  theme = "light",
  onThemeChange = () => {},
} = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    onNavigate();

    navigate("/login", {
      replace: true,
    });
  };

  const getLinkClass = (path) => {
    const active =
      pathname === path ||
      pathname.startsWith(
        `${path}/`,
      );

    return active
      ? "rgSideLink active"
      : "rgSideLink";
  };

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
            <NavLink
              to="/user/home"
              className={getLinkClass(
                "/user/home",
              )}
              onClick={onNavigate}
            >
              <FiHome />

              <span>Нүүр</span>
            </NavLink>

            <NavLink
              to="/user/event"
              className={getLinkClass(
                "/user/event",
              )}
              onClick={onNavigate}
            >
              <FiGrid />

              <span>Эвэнт</span>
            </NavLink>

            <NavLink
              to="/user/history"
              className={getLinkClass(
                "/user/history",
              )}
              onClick={onNavigate}
            >
              <FiStar />

              <span>
                Миний эвэнтүүд
              </span>
            </NavLink>

            <NavLink
              to="/user/calendar"
              className={getLinkClass(
                "/user/calendar",
              )}
              onClick={onNavigate}
            >
              <FiCalendar />

              <span>Календар</span>
            </NavLink>
          </nav>
        </section>

        <section className="rgSidebarSection">
          <h5>ТОХИРГОО</h5>

          <nav className="rgSidebarMenu">
            <NavLink
              to="/user/profile"
              className={getLinkClass(
                "/user/profile",
              )}
              onClick={onNavigate}
            >
              <FiUser />

              <span>Профайл</span>
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
                  : "light",
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

          <span>Гарах</span>
        </button>
      </div>
    </aside>
  );
}