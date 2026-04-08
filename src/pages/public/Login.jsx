import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { API_BASE } from "@/lib/config";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const redirectByRole = (user) => {
    if (user.role === "super_admin") {
      navigate("/super-admin/home");
      return;
    }

    if (!user.company_name || !user.phone) {
      navigate("/profile");
      return;
    }

    navigate("/user/home");
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      redirectByRole(data.user);
    } catch (err) {
      console.error(err);
      setMessage("Server error. Try again.");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Google login failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      redirectByRole(data.user);
    } catch (err) {
      console.error(err);
      setMessage("Google login failed");
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Нэвтрэх</h2>

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
            autoComplete="current-password"
          />

          <p className="forgot">
            Нууц үгээ мартсан? <Link to="/forgot-password">Нууц үг шинэчлэх</Link>
          </p>

          <button className="sign-btn" type="submit">
            Нэвтрэх
          </button>
        </form>

        {message && <p className="auth-error">{message}</p>}

        <p className="login-footer">
          Таньд бүртгэл байхгүй үү? <Link to="/signup">Бүртгүүлэх</Link>
        </p>

        <div className="divider">
          <span>эсвэл</span>
        </div>

        <div className="google-wrap">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setMessage("Google login failed")}
          />
        </div>
      </div>
    </div>
  );
}
