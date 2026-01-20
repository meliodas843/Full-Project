import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        EventFlow
      </Link>

      <ul>
        <li>
          <Link to="/events">Events</Link>
        </li>
        <li>
          <Link to="/news">News</Link>
        </li>
        <li>
          <Link to="/login" className="login-btn">
            Get Started
          </Link>
        </li>
      </ul>
    </nav>
  );
}
