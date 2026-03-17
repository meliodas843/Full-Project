import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/config";

function resolveImageSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "https://via.placeholder.com/900x600";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const normalized = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${normalized}`;
}

export default function Project() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadProjects() {
    try {
      setError("");
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/projects`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setError(data?.message || "Failed to load projects");
        setProjects([]);
        return [];
      }

      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      return list;
    } catch (err) {
      console.error(err);
      setError("Network error");
      setProjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((project) =>
      String(project.title || "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <div className="eventsGradientBg">
      <div className="eventsPage">
        <div className="eventsHeaderRow">
          <div className="eventsHeader">
            <h2 className="eventsTitle">Төсөл болон Хөтөлбөрүүд</h2>
            <p className="eventsSub">Хийгдсэн төсөл болон хөтөлбөрүүд</p>
          </div>

          <div className="eventsActions">
            <div className="eventsSearchWrap">
              <input
                className="eventsSearch"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title..."
              />
              {query && (
                <button
                  className="eventsClear"
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              className="eventsRefresh"
              onClick={loadProjects}
              type="button"
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && <div className="eventsError">{error}</div>}

        {loading ? (
          <div className="eventsEmpty">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="eventsEmpty">
            {projects.length === 0
              ? "No projects available."
              : "No projects match that title."}
          </div>
        ) : (
          <div className="eventsGrid">
            {filtered.map((project) => (
              <div className="eventCard" key={project.id}>
                <img
                  className="eventCardImg"
                  src={resolveImageSrc(project.image || project.image_url)}
                  alt={project.title || "Project"}
                  onError={(e) =>
                    (e.currentTarget.src = "https://via.placeholder.com/900x600")
                  }
                />

                <div className="eventCardBody">
                  <h3 className="eventCardTitle">{project.title}</h3>
                  <p className="eventCardDesc">
                    {project.description || "No description."}
                  </p>

                  {project.demo_link && (
                    <a
                      className="eventCardBtn"
                      href={project.demo_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Project
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}