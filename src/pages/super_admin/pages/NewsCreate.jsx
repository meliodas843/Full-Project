import { useState } from "react";

export default function NewsCreate() {
  const [form, setForm] = useState({ title: "", body: "", image_url: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Failed to post news");
        setLoading(false);
        return;
      }

      setMsg("✅ News posted!");
      setForm({ title: "", body: "", image_url: "" });
    } catch (err) {
      console.error(err);
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Create News (Super Admin)</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label>Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="News title"
        />

        <label>Body</label>
        <textarea
          name="body"
          value={form.body}
          onChange={handleChange}
          required
          placeholder="Write your news..."
        />

        <label>Image URL (optional)</label>
        <input
          name="image_url"
          value={form.image_url}
          onChange={handleChange}
          placeholder="https://..."
        />

        <button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post News"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
