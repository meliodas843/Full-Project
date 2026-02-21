import { useState } from "react";
import { API_BASE } from "@/lib/config";

const API = API_BASE;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch(`${API}/api/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Failed");
        return;
      }

      setMsg(data.message || "Reset link sent.");
    } catch (err) {
      console.error(err);
      setMsg("Server error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Нууц үг сэргээх</h2>

        <form onSubmit={submit}>
          <label>И-Майл</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="sign-btn" type="submit">
            Илгээх
          </button>
        </form>

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </div>
    </div>
  );
}
