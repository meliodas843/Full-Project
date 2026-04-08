import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar__logo">
          <img src={logo} alt="Khural Plus+ Logo" className="navbar__logoImg" />
        </Link>
        <ul className="navbar__links">
          <li>
            <Link to="/">Нүүр</Link>
          </li>
          <li>
            <Link to="/events">Эвэнт</Link>
          </li>
          <li>
            <Link to="/news">Мэдээ</Link>
          </li>
          <li>
            <Link to="/login" className="get-started-btn">
              Нэвтрэх
            </Link>
          </li>
        </ul>

        <button
          className="navbar__toggle"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      <div
        className={`navbar__overlay ${open ? "is-show" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`navbar__drawer ${open ? "is-open" : ""}`}>
        <div className="navbar__drawerHead">
          <span className="navbar__drawerLogo">Khural Plus+</span>
          <button className="navbar__close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        <Link to="/events" onClick={() => setOpen(false)}>
          Эвэнт
        </Link>
        <Link to="/news" onClick={() => setOpen(false)}>
          Мэдээ
        </Link>
        <Link
          to="/login"
          className="get-started-btn"
          onClick={() => setOpen(false)}
        >
          Нэвтрэх
        </Link>
      </aside>
    </>
  );
}
