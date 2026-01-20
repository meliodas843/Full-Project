import Sidebar from "../components/Sidebar";
import Calendar from "./Calendar";

export default function Home() {
  return (
    <div className="user-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="user-main">
        <h1>Welcome 👋</h1>
        <p>Here is your schedule</p>

        <Calendar />
      </main>
    </div>
  );
}
