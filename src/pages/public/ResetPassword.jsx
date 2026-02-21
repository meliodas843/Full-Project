import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/config";

const API =API_BASE;

export default function ResetPassword() {
  const navigate = useNavigate();

  const token = useMemo(() => {
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!token) return setMsg("Missing token.");
    if (p1.length < 6) return setMsg("Password must be at least 6 characters.");
    if (p1 !== p2) return setMsg("Passwords do not match.");

    try {
      const res = await fetch(`${API}/api/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: p1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Reset failed");
        return;
      }

      setMsg("Password updated. Redirecting...");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      console.error(err);
      setMsg("Server error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Нууц үг солих</h2>

        <form onSubmit={submit}>
          <label>Шинэ нууц үг</label>
          <input
            type="password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            required
          />

          <label>Дахин бичих</label>
          <input
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            required
          />

          <button className="sign-btn" type="submit">
            Хадгалах
          </button>
        </form>

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </div>
    </div>
  );
}
