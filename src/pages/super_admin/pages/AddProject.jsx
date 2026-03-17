import { useState } from "react";

const API = "http://localhost:5000";

export default function AddProject() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      if (image) fd.append("image", image);

      const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Failed to create project");
        return;
      }

      setMsg("✅ Project created successfully");
      setTitle("");
      setDescription("");
      setImage(null);
    } catch (err) {
      console.error(err);
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Create Project</h2>

      <form onSubmit={handleSubmit} className="project-form">
        <label>Project Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter project title"
          required
        />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          required
        />

        <label>Project Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create Project"}
        </button>
      </form>

      {msg && <p>{msg}</p>}
    </div>
  );
}