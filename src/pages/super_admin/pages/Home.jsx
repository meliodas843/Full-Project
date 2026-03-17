import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="super-admin-layout">
      <main className="super-admin-content">
        <h1>Super Admin Dashboard</h1>
        <p>Welcome, Super Admin</p>
        <button onClick={() => navigate("/super-admin/news-create")}>
          + Create News
        </button>
        <button onClick={() => navigate("/super-admin/add-mentor")}> 
          +Add Mentor
        </button>
        <button onClick={() => navigate("/super-admin/add-project")}>
          +Add Project
        </button>
      </main>
    </div>
  );
}
