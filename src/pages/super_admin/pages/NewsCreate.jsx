import { useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
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

  const quillRef = useRef(null);
  const token = localStorage.getItem("token");

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
          [{ list: "ordered" }, { list: "bullet" }], // ✅ OK
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: handleBodyImageUpload,
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIXED formats (remove "bullet")
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
      fd.append("body", bodyHtml); // ✅ HTML (with inline images)
      if (cover) fd.append("cover", cover); // ✅ cover image (optional)

      const res = await fetch(`${API}/api/news`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg(data.message || "Failed to post news");
        return;
      }

      setMsg("✅ News posted successfully!");
      setTitle("");
      setBodyHtml("");
      setCover(null);
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

      <form onSubmit={handleSubmit} className="news-create-form">
        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="News title"
        />

        <label>Body (you can insert images)</label>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={bodyHtml}
          onChange={setBodyHtml}
          modules={modules}
          formats={formats}
          placeholder="Write your news..."
        />

        <label>Cover Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] || null)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post News"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
