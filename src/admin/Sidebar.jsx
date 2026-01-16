import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h3>Admin</h3>
      <ul>
        <li><Link to="/admin">Dashboard</Link></li>
        <li><Link to="/events">Manage Events</Link></li>
        <li><Link to="/calendar">Calendar</Link></li>
      </ul>
    </aside>
  );
}
//ehlvvlegv baiga