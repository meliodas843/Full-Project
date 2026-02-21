import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "@/lib/config";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Sign up failed.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      navigate("/profile");
    } catch (err) {
      console.error(err);
      setMessage("Server error. Try again.");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-box">
        <h2>Бүртгүүлэх</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>И-Майл</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />

          <label>Нууц үг</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          <label>Нууц үгийн баталгаажуулалт</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          <button className="sign-btn" type="submit">
            Бүртгүүлэх
          </button>
        </form>

        {message && <p className="auth-error">{message}</p>}

        <p className="login-footer">
          Таньд бүртгэл байгаа бол <Link to="/login">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
