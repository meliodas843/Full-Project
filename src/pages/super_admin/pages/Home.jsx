import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="super-admin-layout">
      <UserShell />
      <main className="super-admin-content">
        <h1>Super Admin Dashboard</h1>
        <p>Welcome, Super Admin</p>
        <button onClick={() => navigate("/super-admin/news-create")}>
          + Create News
        </button>
      </main>
    </div>
  );
}
