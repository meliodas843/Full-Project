import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaMoon, FaSun, FaBars, FaXmark } from "react-icons/fa6";
import logo from "../assets/registra-logo-def.png";

function getInitialTheme() {
  const savedTheme = localStorage.getItem("public-theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "dark";
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.publicTheme = theme;
    localStorage.setItem("public-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      return current === "dark" ? "light" : "dark";
    });
  };

  const navClass = ({ isActive }) => {
    return isActive ? "riNavLink active" : "riNavLink";
  };

  return (
    <>
      <nav className="riNavbar">
        <div className="riNavbarInner">
          <Link
            to="/"
            className="riBrand"
            onClick={() => setOpen(false)}
          >
            <img
              src={logo}
              alt="Registra"
              className="riBrandLogo"
            />
          </Link>

          <div className="riDesktopNav">
            <NavLink to="/" end className={navClass}>
              Нүүр
            </NavLink>

            <NavLink to="/events" className={navClass}>
              Эвэнт
            </NavLink>

            <NavLink to="/news" className={navClass}>
              Мэдээ
            </NavLink>
          </div>

          <div className="riNavbarActions">
            <button
              type="button"
              className="riThemeButton"
              onClick={toggleTheme}
              aria-label="Theme"
            >
              {theme === "dark" ? <FaSun /> : <FaMoon />}
            </button>

            <Link to="/login" className="riLoginButton">
              Нэвтрэх
            </Link>

            <button
              type="button"
              className="riMenuButton"
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`riMobileOverlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`riMobileMenu ${open ? "open" : ""}`}>
        <div className="riMobileMenuHead">
          <Link
            to="/"
            className="riBrand"
            onClick={() => setOpen(false)}
          >
            <img
              src={logo}
              alt="Registra"
              className="riBrandLogo"
            />
          </Link>

          <button
            type="button"
            className="riMenuClose"
            onClick={() => setOpen(false)}
          >
            <FaXmark />
          </button>
        </div>

        <NavLink
          to="/"
          end
          className={navClass}
          onClick={() => setOpen(false)}
        >
          Нүүр
        </NavLink>

        <NavLink
          to="/events"
          className={navClass}
          onClick={() => setOpen(false)}
        >
          Эвэнт
        </NavLink>

        <NavLink
          to="/news"
          className={navClass}
          onClick={() => setOpen(false)}
        >
          Мэдээ
        </NavLink>

        <button
          type="button"
          className="riMobileThemeButton"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <FaSun /> : <FaMoon />}
          <span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <Link
          to="/login"
          className="riLoginButton"
          onClick={() => setOpen(false)}
        >
          Нэвтрэх
        </Link>
      </aside>
    </>
  );
}