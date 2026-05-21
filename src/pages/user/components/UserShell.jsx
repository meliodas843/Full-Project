import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function UserShell({ title = "Khural Plus+", children }) {
  const [open, setOpen] = useState(false);

  function closeDrawer() {
    setOpen(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="user-layout">
      <Sidebar />

      <div className="user-main">
        <Topbar className="topbar-desktop" />

        <div className="mobile-header">
          <div className="mobile-header__title">{title}</div>

          <div className="mobile-header__actions">
            <Topbar className="topbar-mobile-icons" onNavigate={closeDrawer} />

            <button
              className="mobile-header__hamburger"
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>

        <div
          className={`mobile-drawer-overlay ${open ? "is-show" : ""}`}
          onClick={closeDrawer}
        />

        <aside className={`mobile-drawer ${open ? "is-open" : ""}`}>
          <div className="mobile-drawer__head">
            <div className="mobile-drawer__title">Menu</div>

            <button
              className="mobile-drawer__close"
              type="button"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </div>

          <div className="mobile-drawer__nav">
            <Sidebar onNavigate={closeDrawer} />
          </div>
        </aside>

        <div className="user-page-content">{children}</div>
      </div>
    </div>
  );
}