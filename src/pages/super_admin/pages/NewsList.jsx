import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiEdit2, FiExternalLink, FiMapPin, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { getImageSrc } from "../../../lib/config";
import { NEWS_STATES, formatDate, fromTs } from "../adminUtils";

const STATE_BADGE = { published: "green", scheduled: "purple", draft: "" };
const FILTERS = ["all", "published", "scheduled", "draft"];

export default function NewsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice] = useState(location.state?.notice || "");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/api/admin/news"));
      setError("");
    } catch (err) {
      setError(err.message || "Мэдээ ачаалж чадсангүй.");
    }
  }, []);

  useEffect(() => {
    apiFetch("/api/admin/news")
      .then(setData)
      .catch((err) => setError(err.message || "Мэдээ ачаалж чадсангүй."));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows || []).filter(
      (row) =>
        (filter === "all" || row.state === filter) &&
        (!q || `${row.title} ${row.author_name || ""} ${row.category || ""}`.toLowerCase().includes(q)),
    );
  }, [data, filter, query]);

  async function togglePin(row) {
    try {
      await apiFetch(`/api/admin/news/${row.id}/pin`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(row) {
    if (!window.confirm(`"${row.title}" мэдээг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    try {
      await apiFetch(`/api/news/${row.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const stats = data?.stats;
  const count = (key) => (key === "all" ? stats?.total : stats?.[key]) || 0;

  return (
    <AdminShell
      crumb="Супер админ / Агуулга"
      title="Мэдээ"
      actions={
        <>
          <a className="saButton" href="/news" target="_blank" rel="noreferrer">
            <FiExternalLink /> Сайт дээр харах
          </a>
          <button type="button" className="saButton primary" onClick={() => navigate("/super-admin/news/new")}>
            <FiPlus /> Мэдээ нэмэх
          </button>
        </>
      }
    >
      {notice ? <div className="saNotice">{notice}</div> : null}
      {error ? <div className="saError">{error}</div> : null}

      <div className="saGrid saKpis">
        <div className="saCard saKpi">
          <span>Нийт мэдээ</span>
          <strong>{count("all")}</strong>
        </div>
        <div className="saCard saKpi">
          <span>Нийтлэгдсэн</span>
          <strong style={{ color: "var(--sa-green)" }}>{count("published")}</strong>
        </div>
        <div className="saCard saKpi">
          <span>Товлосон / Ноорог</span>
          <strong>
            {count("scheduled")} <span style={{ color: "var(--sa-faint)" }}>/ {count("draft")}</span>
          </strong>
        </div>
        <div className="saCard saKpi">
          <span>Нийт уншилт</span>
          <strong>{Number(stats?.views || 0).toLocaleString("en-US")}</strong>
        </div>
      </div>

      <section className="saCard">
        <div className="saToolbar">
          <div className="saChips">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                className={`saChip${filter === key ? " active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "Бүгд" : NEWS_STATES[key]}
                <em>{count(key)}</em>
              </button>
            ))}
          </div>
          <label className="saSearch">
            <FiSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Гарчиг, зохиогчоор хайх..."
              aria-label="Мэдээ хайх"
            />
          </label>
        </div>

        {data && !rows.length ? (
          <div className="saEmpty">
            {data.rows.length ? "Хайлтад тохирох мэдээ олдсонгүй." : "Одоогоор мэдээ алга. «Мэдээ нэмэх» дээр дарж эхлээрэй."}
          </div>
        ) : (
          <div className="saTableWrap">
            <table className="saTable">
              <thead>
                <tr>
                  <th>Мэдээ</th>
                  <th>Ангилал</th>
                  <th>Төлөв</th>
                  <th>Огноо</th>
                  <th className="num">Уншилт</th>
                  <th className="num">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="saRowTitle">
                        {row.image_url ? (
                          <img className="saThumb" src={getImageSrc(row.image_url)} alt="" />
                        ) : (
                          <div className="saThumb" />
                        )}
                        <div className="saCell2">
                          <strong>{row.title}</strong>
                          <span>
                            {row.author_name || row.creator_name || "—"}
                            {row.is_pinned ? <span className="saPinned"> · ↑ Дээр бэхэлсэн</span> : null}
                            {row.is_featured ? <span className="saPinned"> · ★ Онцлох</span> : null}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{row.category || "—"}</td>
                    <td>
                      <span className={`saBadge ${STATE_BADGE[row.state]}`}>{NEWS_STATES[row.state]}</span>
                    </td>
                    <td className="saMono">{formatDate(fromTs(row.date_ts))}</td>
                    <td className="num">{row.state === "published" ? Number(row.views || 0).toLocaleString("en-US") : "—"}</td>
                    <td>
                      <div className="saActions">
                        <button
                          type="button"
                          className={row.is_pinned ? "on" : ""}
                          title={row.is_pinned ? "Бэхэлгээ авах" : "Дээр нь бэхлэх"}
                          aria-label={row.is_pinned ? "Бэхэлгээ авах" : "Дээр нь бэхлэх"}
                          onClick={() => togglePin(row)}
                        >
                          <FiMapPin />
                        </button>
                        <button
                          type="button"
                          title="Засах"
                          aria-label="Засах"
                          onClick={() => navigate(`/super-admin/news/${row.id}`)}
                        >
                          <FiEdit2 />
                        </button>
                        <button type="button" className="danger" title="Устгах" aria-label="Устгах" onClick={() => remove(row)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
