import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const redirectByRole = (user) => {
    if (user.role === "super_admin") {
      navigate("/super-admin/home");
      return;
    }

    // ✅ Normal users: if profile not complete -> /profile
    if (!user.company_name || !user.phone) {
      navigate("/profile");
      return;
    }

    // ✅ Existing users with completed profile -> /user/home
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
        <h2>Sign in</h2>

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button className="sign-btn" type="submit">
            Sign in
          </button>
        </form>

        {message && <p style={{ color: "red", marginTop: 10 }}>{message}</p>}

        <p style={{ marginTop: 12 }}>
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>

        <div className="divider">
          <span>or</span>
        </div>

        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => setMessage("Google login failed")}
        />
      </div>
    </div>
  );
}
