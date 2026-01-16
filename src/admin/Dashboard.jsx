import Sidebar from "./Sidebar";

export default function Dashboard() {
  return (
    <div className="admin-container">
      <Sidebar />

      <div className="admin-main">
        <h2>Dashboard</h2>

        <div className="stats">
          <div className="stat-box">Total Events: 12</div>
          <div className="stat-box">Bookings: 42</div>
          <div className="stat-box">Users: 8</div>
        </div>
      </div>
    </div>
  );
}
//ehlvvlegv baiga