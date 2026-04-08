import { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Sidebar from "../components/Sidebar";
import { API_BASE } from "@/lib/config";

const API = API_BASE;

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export default function NewsCreate() {
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [cover, setCover] = useState(null);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [newsList, setNewsList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const quillRef = useRef(null);
  const token = localStorage.getItem("token");

  async function fetchNews() {
    try {
      setListLoading(true);
      const res = await fetch(`${API}/api/news`);
      const data = await safeJson(res);
      setNewsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch news error:", err);
      setNewsList([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    fetchNews();
  }, []);

  function resetForm() {
    setTitle("");
    setBodyHtml("");
    setCover(null);
    setEditingId(null);
  }

  function openCreateForm() {
    resetForm();
    setMsg("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setTitle(item.title || "");
    setBodyHtml(item.body || "");
    setCover(null);
    setMsg("✏️ Editing news");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const ok = window.confirm("Are you sure you want to delete this news?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/news/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg(data.message || "Failed to delete news");
        return;
      }

      setMsg("🗑️ News deleted successfully");

      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }

      await fetchNews();
    } catch (err) {
      console.error(err);
      setMsg("❌ Server error");
    }
  }

  async function handleBodyImageUpload() {
    if (!token) {
      setMsg("❌ You must be logged in (token missing).");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setMsg("");

        const fd = new FormData();
        fd.append("image", file);

        const res = await fetch(`${API}/api/news/body-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const data = await safeJson(res);

        if (!res.ok) {
          setMsg(data.message || "❌ Failed to upload body image");
          return;
        }

        const rawUrl = data.url || "";
        const imageUrl = rawUrl.startsWith("http")
          ? rawUrl
          : `${API}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;

        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength();

        quill.insertEmbed(index, "image", imageUrl, "user");
        quill.setSelection(index + 1);
      } catch (e) {
        console.error(e);
        setMsg("❌ Server error uploading image");
      }
    };
  }

  const modules = useMemo(() => {
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: handleBodyImageUpload,
        },
      },
    };
  }, []);

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "blockquote",
    "code-block",
    "link",
    "image",
  ];

  const filteredNews = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return newsList;
    return newsList.filter((item) =>
      (item.title || "").toLowerCase().includes(q),
    );
  }, [newsList, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (!token) {
        setMsg("❌ You must be logged in (token missing).");
        return;
      }

      const fd = new FormData();
      fd.append("title", title);
      fd.append("body", bodyHtml);
      if (cover) fd.append("cover", cover);

      const url = editingId
        ? `${API}/api/news/${editingId}`
        : `${API}/api/news`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg(data.message || "Failed to save news");
        return;
      }

      setMsg(
        editingId
          ? "✅ News updated successfully!"
          : "✅ News posted successfully!",
      );

      resetForm();
      setShowForm(false);
      await fetchNews();
    } catch (err) {
      console.error(err);
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  function stripHtml(html = "") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="admin-content">
        <div className="news-page-wrap">
          <div className="news-topbar">
            <div>
              <h2 className="news-page-title">Мэдээ</h2>
              <p className="news-page-subtitle">
                Админаас мэдээний хамгийн шинэ мэдээллийг удирдах
              </p>
            </div>

            <button
              type="button"
              className="create-btn"
              onClick={openCreateForm}
            >
              + Мэдээ Үүсгэх
            </button>
          </div>

          {msg && <p className="news-msg">{msg}</p>}

          {showForm && (
            <div className="news-form-card">
              <div className="news-form-head">
                <h3>{editingId ? "Edit News" : "Create News"}</h3>
                <button
                  type="button"
                  className="form-close-btn"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                    setMsg("");
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="news-create-form">
                <div className="form-group full">
                  <label>Гарчиг</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Мэдээний гарчиг"
                  />
                </div>

                <div className="form-group full">
                  <label>Мэдээний агуулга (зураг оруулах боломжтой)</label>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={bodyHtml}
                    onChange={setBodyHtml}
                    modules={modules}
                    formats={formats}
                    placeholder="Мэдээний агуулга оруулна уу..."
                    className="news-editor"
                  />
                </div>

                <div className="form-group full">
                  <label>Хавсралт зураг (ингэж үлдэх боломжтой)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCover(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="news-form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                      setMsg("");
                    }}
                  >
                    Цуцлах
                  </button>

                  <button type="submit" disabled={loading} className="save-btn">
                    {loading
                      ? "Хадгалж байна..."
                      : editingId
                        ? "Мэдээг шинэчиллээ"
                        : "Мэдээ үүсгэх"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="news-list-header">
            <h3>Бүх мэдээ</h3>

            <div className="news-search-wrap">
              <input
                type="text"
                className="news-search"
                placeholder="Мэдээ хайх..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {listLoading ? (
            <p>Мэдээг ачааллаж байна...</p>
          ) : filteredNews.length === 0 ? (
            <p>Мэдээ олдсонгүй.</p>
          ) : (
            <div className="news-clean-list">
              {filteredNews.map((item) => (
                <div key={item.id} className="news-row-card">
                  <div className="news-row-left">
                    <div className="news-thumb-wrap">
                      {item.image_url ? (
                        <img
                          src={
                            item.image_url.startsWith("http")
                              ? item.image_url
                              : `${API}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`
                          }
                          alt={item.title}
                          className="news-thumb"
                        />
                      ) : (
                        <div className="news-thumb placeholder">
                          {(item.title || "N").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="news-row-info">
                      <h4>{item.title}</h4>
                      <p>
                        {stripHtml(item.body).slice(0, 140) || "No content"}
                      </p>
                    </div>
                  </div>

                  <div className="news-row-actions">
                    <button type="button" onClick={() => handleEdit(item)}>
                      Засах
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDelete(item.id)}
                    >
                      Устгах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
