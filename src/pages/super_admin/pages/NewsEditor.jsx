import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { FiArrowLeft, FiClock, FiEye, FiImage, FiTrash2, FiX } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { apiFetch } from "../../../lib/api";
import { getImageSrc } from "../../../lib/config";
import { sanitizeHtml } from "../../../utils/safeHtml";
import { NEWS_CATEGORIES, NEWS_STATES, fromTs } from "../adminUtils";

const SUMMARY_MAX = 160;
// Only what the toolbar offers. Anything else in pasted text (colours,
// highlights, fonts) is dropped so it can't clash with the site theme.
const QUILL_FORMATS = ["bold", "italic", "header", "list", "blockquote", "link", "image", "code-block"];
const MODES = [
  { key: "published", label: "Одоо" },
  { key: "scheduled", label: "Товлох" },
  { key: "draft", label: "Ноорог" },
];

const pad = (n) => String(n).padStart(2, "0");
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", ө: "u", п: "p", р: "r", с: "s", т: "t", у: "u",
  ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e",
  ю: "yu", я: "ya",
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in CYRILLIC ? CYRILLIC[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function readingMinutes(html) {
  const words = String(html || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const tomorrow9 = () => {
  const d = new Date(Date.now() + 86400000);
  d.setHours(9, 0, 0, 0);
  return d;
};

export default function NewsEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const quillRef = useRef(null);
  const coverInput = useRef(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast, show: showToast, hide: hideToast } = useToast();
  const fail = (message) => showToast(message, "error");
  const [preview, setPreview] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState("published");
  const [date, setDate] = useState(localDate(tomorrow9()));
  const [time, setTime] = useState(localTime(tomorrow9()));
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [author, setAuthor] = useState("");
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [state, setState] = useState("draft");

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;

    apiFetch(`/api/admin/news/${id}`)
      .then((news) => {
        if (cancelled) return;
        setTitle(news.title || "");
        setSlug(news.slug || "");
        setSlugTouched(Boolean(news.slug));
        setBody(news.body || "");
        setCategory(news.category || "");
        setSummary(news.summary || "");
        setAuthor(news.author_name || "");
        setFeatured(Boolean(news.is_featured));
        setPinned(Boolean(news.is_pinned));
        setCoverUrl(news.image_url || "");
        setState(news.state);
        setMode(news.state);
        const when = fromTs(news.publish_ts);
        if (when && news.state === "scheduled") {
          setDate(localDate(when));
          setTime(localTime(when));
        }
      })
      .catch((err) => setError(err.message || "Мэдээ олдсонгүй."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const scheduledAt = new Date(`${date}T${time}`);
  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : removeCover ? "" : getImageSrc(coverUrl)),
    [coverFile, coverUrl, removeCover],
  );

  useEffect(() => () => coverFile && URL.revokeObjectURL(coverPreview), [coverFile, coverPreview]);

  // Images inside the article are uploaded first, then inserted as links.
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["bold", "italic", { header: 2 }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image", "code-block"],
          ["clean"],
        ],
        handlers: {
          image: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png,image/jpeg,image/webp,image/gif";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("image", file);
                const data = await apiFetch("/api/news/body-image", { method: "POST", body: fd });
                const quill = quillRef.current?.getEditor?.();
                if (!quill) return;
                const range = quill.getSelection(true);
                const index = range ? range.index : quill.getLength();
                quill.insertEmbed(index, "image", getImageSrc(data.url), "user");
                quill.setSelection(index + 1);
              } catch (err) {
                showToast(err.message || "Зураг оруулж чадсангүй.", "error");
              }
            };
            input.click();
          },
        },
      },
    }),
    [showToast],
  );

  async function save(saveMode = mode) {
    if (!title.trim()) return fail("Гарчиг оруулна уу.");
    if (saveMode !== "draft" && !body.replace(/<[^>]*>/g, "").trim()) {
      return fail("Мэдээний агуулга хоосон байна.");
    }
    if (saveMode === "scheduled" && !(scheduledAt.getTime() > Date.now())) {
      return fail("Товлох огноо, цаг ирээдүйд байх ёстой.");
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("body", body);
    fd.append("status", saveMode);
    if (saveMode === "scheduled") fd.append("publish_at", scheduledAt.toISOString());
    fd.append("slug", effectiveSlug);
    fd.append("summary", summary.trim());
    fd.append("category", category);
    fd.append("author_name", author.trim());
    fd.append("is_featured", featured ? "1" : "0");
    fd.append("is_pinned", pinned ? "1" : "0");
    if (coverFile) fd.append("cover", coverFile);
    if (removeCover && !coverFile) fd.append("remove_cover", "1");

    setSaving(true);
    try {
      await apiFetch(isNew ? "/api/news" : `/api/news/${id}`, { method: isNew ? "POST" : "PUT", body: fd });
      const notice = {
        published: "Мэдээ нийтлэгдлээ.",
        scheduled: `Мэдээ ${date} ${time}-д нийтлэгдэхээр товлогдлоо.`,
        draft: "Ноорог хадгалагдлаа.",
      }[saveMode];
      navigate("/super-admin/news", { state: { notice } });
    } catch (err) {
      fail(err.message || "Мэдээ хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  const primaryLabel =
    mode === "scheduled"
      ? `Товлох · ${date.slice(5).replace("-", ".")} ${time}`
      : mode === "draft"
        ? "Ноорог хадгалах"
        : isNew || state !== "published"
          ? "Нийтлэх"
          : "Хадгалах";

  return (
    <AdminShell
      crumb={`Супер админ / Мэдээ / ${isNew ? "Шинэ" : "Засах"}`}
      title={isNew ? "Шинэ мэдээ" : "Мэдээ засах"}
      actions={
        <button type="button" className="saButton" onClick={() => navigate("/super-admin/news")}>
          <FiArrowLeft /> Жагсаалт руу
        </button>
      }
    >
      <Toast toast={toast} onClose={hideToast} />
      {error ? <div className="saError">{error}</div> : null}

      {loading ? (
        <div className="saEmpty">Ачаалж байна...</div>
      ) : (
        <div className="saEditor">
          <div className="saGrid">
            <section className="saCard">
              <div className="saCover">
                {coverPreview ? <img src={coverPreview} alt="" /> : <div className="saCoverEmpty">Нүүр зураг алга</div>}
                <div className="saCoverActions">
                  {coverPreview ? (
                    <button
                      type="button"
                      className="saButton"
                      onClick={() => {
                        setCoverFile(null);
                        setRemoveCover(true);
                      }}
                    >
                      <FiTrash2 /> Арилгах
                    </button>
                  ) : null}
                  <button type="button" className="saButton" onClick={() => coverInput.current?.click()}>
                    <FiImage /> Зураг оруулах
                  </button>
                </div>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverFile(file);
                      setRemoveCover(false);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="saCardPad">
                <input
                  className="saTitleInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мэдээний гарчиг"
                  aria-label="Гарчиг"
                />
                <div className="saSlug">
                  <span>registra.mn/news/</span>
                  <input
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugTouched(true);
                    }}
                    aria-label="Холбоос"
                  />
                  <span>· {readingMinutes(body)} мин унших</span>
                </div>
              </div>
            </section>

            <section className="saCard saCardPad saQuill">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={body}
                onChange={setBody}
                modules={modules}
                formats={QUILL_FORMATS}
                placeholder="Мэдээний агуулгаа энд бичнэ үү..."
              />
            </section>
          </div>

          <div className="saGrid">
            <section className="saCard saCardPad">
              <div className="saCardHead">
                <h2>Нийтлэх</h2>
                {!isNew ? <span className="saBadge">{NEWS_STATES[state]}</span> : null}
              </div>
              <div className="saSegment" style={{ display: "flex" }}>
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    style={{ flex: 1 }}
                    className={mode === m.key ? "active" : ""}
                    onClick={() => setMode(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {mode === "scheduled" ? (
                <div className="saTwoInputs">
                  <input className="saInput" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Огноо" />
                  <input className="saInput" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Цаг" />
                </div>
              ) : null}

              <button
                type="button"
                className="saButton primary block"
                style={{ marginTop: 12 }}
                disabled={saving}
                onClick={() => save(mode)}
              >
                {mode === "scheduled" ? <FiClock /> : null}
                {saving ? "Хадгалж байна..." : primaryLabel}
              </button>

              <div className="saTwoInputs">
                <button type="button" className="saButton" disabled={saving || mode === "draft"} onClick={() => save("draft")}>
                  Ноорог хадгалах
                </button>
                <button type="button" className="saButton" onClick={() => setPreview(true)}>
                  <FiEye /> Урьдчилан харах
                </button>
              </div>
              {mode === "scheduled" ? (
                <div className="saHint">Товлосон цагт мэдээ сайт дээр автоматаар гарч ирнэ.</div>
              ) : null}
            </section>

            <section className="saCard saCardPad">
              <div className="saLabel">Ангилал</div>
              <div className="saChips">
                {NEWS_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`saChip${category === c ? " active" : ""}`}
                    onClick={() => setCategory(category === c ? "" : c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <label className="saLabel" htmlFor="sa-summary">
                <span>Товч тайлбар</span>
                <span style={{ color: summary.length > SUMMARY_MAX ? "var(--sa-red)" : undefined }}>
                  {summary.length}/{SUMMARY_MAX}
                </span>
              </label>
              <textarea
                id="sa-summary"
                className="saTextarea"
                value={summary}
                maxLength={SUMMARY_MAX}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Жагсаалт болон хуваалцах үед харагдах 1-2 өгүүлбэр"
              />

              <label className="saLabel" htmlFor="sa-author">
                Зохиогч
              </label>
              <input id="sa-author" className="saInput" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Б. Ганбаатар" />
            </section>

          </div>
        </div>
      )}

      {preview ? (
        <div className="saModalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && setPreview(false)}>
          <div className="saCard saModal" role="dialog" aria-modal="true" aria-label="Урьдчилан харах">
            <button type="button" className="saCloseButton" onClick={() => setPreview(false)} aria-label="Хаах">
              <FiX />
            </button>
            {category ? <span className="saBadge purple">{category}</span> : null}
            <h2 style={{ fontSize: 26, margin: "10px 0 4px" }}>{title || "Гарчиггүй"}</h2>
            <div className="saCrumb" style={{ marginBottom: 16 }}>
              {author || "—"} · {readingMinutes(body)} мин унших
            </div>
            {coverPreview ? <img src={coverPreview} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 16 }} /> : null}
            {summary ? <p style={{ fontWeight: 600 }}>{summary}</p> : null}
            <div className="saPreviewBody" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
