import {
  useEffect,
  useState,
} from "react";
import {
  FiMenu,
  FiX,
} from "react-icons/fi";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import logo from "../../../assets/registra-logo-def.png";

export default function UserShell({
  title = "Registra",
  children,
}) {
  const [open, setOpen] =
    useState(false);

  const [theme, setTheme] =
    useState(() => {
      return (
        localStorage.getItem(
          "registra-theme",
        ) || "light"
      );
    });

  useEffect(() => {
    document.documentElement.dataset.userTheme =
      theme;

    localStorage.setItem(
      "registra-theme",
      theme,
    );
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow =
      open ? "hidden" : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [open]);

  useEffect(() => {
    function handleKey(event) {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleKey,
    );

    return () =>
      document.removeEventListener(
        "keydown",
        handleKey,
      );
  }, []);

  return (
    <div className="rgUserLayout">
      <Sidebar
        theme={theme}
        onThemeChange={setTheme}
      />

      <div className="rgUserMain">
        <Topbar />

        <header className="rgMobileHeader">
          <img
            src={logo}
            alt="Registra"
          />

          <span>{title}</span>

          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
          >
            <FiMenu />
          </button>
        </header>

        <div className="rgUserContent">
          {children}
        </div>
      </div>

      <div
        className={`rgMobileOverlay ${
          open ? "show" : ""
        }`}
        onClick={() =>
          setOpen(false)
        }
      />

      <aside
        className={`rgMobileDrawer ${
          open ? "open" : ""
        }`}
      >
        <button
          type="button"
          className="rgMobileClose"
          onClick={() =>
            setOpen(false)
          }
        >
          <FiX />
        </button>

        <Sidebar
          mobile
          theme={theme}
          onThemeChange={setTheme}
          onNavigate={() =>
            setOpen(false)
          }
        />
      </aside>
    </div>
  );
}