import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";
import { API_BASE } from "@/lib/config";

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function resolveUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function fallbackImgSrc() {
  return `${API_BASE}/uploads/fallbacks/event-placeholder.png`;
}

function getEventImage(ev) {
  return (
    resolveUrl(ev?.image_url) ||
    resolveUrl(ev?.image) ||
    resolveUrl(ev?.cover_image) ||
    resolveUrl(ev?.cover) ||
    resolveUrl(ev?.thumbnail) ||
    resolveUrl(ev?.banner) ||
    ""
  );
}

function getEventFiles(ev) {
  const raw =
    ev?.files ||
    ev?.uploads ||
    ev?.attachments ||
    ev?.event_files ||
    ev?.uploaded_files ||
    ev?.documents ||
    ev?.media ||
    ev?.photos ||
    ev?.images ||
    ev?.gallery ||
    ev?.eventImages ||
    ev?.event_images ||
    ev?.file_list ||
    [];

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;

  return [];
}

function getFallbackFilesFromEvent(ev) {
  const files = getEventFiles(ev);
  if (files.length > 0) return files;

  const cover = getEventImage(ev);
  if (!cover) return [];

  return [
    {
      id: `cover-${ev?.id || "event"}`,
      file_url: cover,
      filename: "event-image",
      mime_type: "image/*",
      note: "Main event image",
      uploaded_by_email: ev?.created_by || ev?.email || "",
    },
  ];
}

function getFileUrl(file) {
  if (!file) return "";
  if (typeof file === "string") return resolveUrl(file);

  return (
    resolveUrl(file.url) ||
    resolveUrl(file.file_url) ||
    resolveUrl(file.path) ||
    resolveUrl(file.file) ||
    resolveUrl(file.file_path) ||
    resolveUrl(file.image_url) ||
    resolveUrl(file.image) ||
    resolveUrl(file.photo) ||
    resolveUrl(file.photo_url) ||
    resolveUrl(file.src) ||
    resolveUrl(file.download_url) ||
    resolveUrl(file.preview_url) ||
    resolveUrl(file.attachment_url) ||
    resolveUrl(file.media_url) ||
    ""
  );
}

function getFileName(file) {
  if (!file) return "File";
  if (typeof file === "string") return file.split("/").pop() || "File";

  return (
    file.name ||
    file.filename ||
    file.original_name ||
    file.original_filename ||
    file.title ||
    file.label ||
    "File"
  );
}

function getFileNote(file) {
  if (!file || typeof file === "string") return "";
  return file.note || file.description || file.caption || file.text || "";
}

function getFileUploader(file) {
  if (!file || typeof file === "string") return "";
  return (
    file.uploaded_by_email ||
    file.user_email ||
    file.owner_email ||
    file.created_by ||
    file.uploaded_by?.email ||
    file.user?.email ||
    ""
  );
}

function isImageFile(file) {
  const url = getFileUrl(file).toLowerCase();
  const type = String(file?.mime_type || file?.type || "").toLowerCase();
  const name = getFileName(file).toLowerCase();

  return (
    type.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".heic"].some(
      (ext) => url.includes(ext) || name.endsWith(ext),
    )
  );
}

function isPdfFile(file) {
  const url = getFileUrl(file).toLowerCase();
  const type = String(file?.mime_type || file?.type || "").toLowerCase();
  const name = getFileName(file).toLowerCase();

  return type.includes("pdf") || url.includes(".pdf") || name.endsWith(".pdf");
}

function getParticipants(ev) {
  const raw =
    ev?.participants ||
    ev?.participant_profiles ||
    ev?.attendees ||
    ev?.joined_users ||
    ev?.joinedUsers ||
    ev?.bookings ||
    ev?.members ||
    ev?.users ||
    ev?.joined_people ||
    ev?.registrations ||
    ev?.participant_details ||
    ev?.participant_list ||
    [];

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;

  return [];
}

function getParticipantName(user) {
  if (!user) return "Unknown user";
  if (typeof user === "string") return user;

  return (
    user.name ||
    user.full_name ||
    user.display_name ||
    user.fullName ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    [user.last_name, user.first_name].filter(Boolean).join(" ") ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    [user.lastName, user.firstName].filter(Boolean).join(" ") ||
    user.username ||
    user.user?.name ||
    user.user?.full_name ||
    user.user?.display_name ||
    [user.user?.first_name, user.user?.last_name].filter(Boolean).join(" ") ||
    [user.user?.firstName, user.user?.lastName].filter(Boolean).join(" ") ||
    user.email ||
    user.user?.email ||
    "Unknown user"
  );
}

function getParticipantEmail(user) {
  if (!user || typeof user === "string") return "";
  return user.email || user.user_email || user.user?.email || "";
}

function getParticipantProfile(user) {
  if (!user || typeof user === "string") return "";

  return (
    resolveUrl(user.profile_image) ||
    resolveUrl(user.profile_img) ||
    resolveUrl(user.avatar) ||
    resolveUrl(user.avatar_url) ||
    resolveUrl(user.image_url) ||
    resolveUrl(user.image) ||
    resolveUrl(user.photo) ||
    resolveUrl(user.photo_url) ||
    resolveUrl(user.profile?.image) ||
    resolveUrl(user.profile?.avatar) ||
    resolveUrl(user.profile?.photo) ||
    resolveUrl(user.user?.profile_image) ||
    resolveUrl(user.user?.profile_img) ||
    resolveUrl(user.user?.avatar) ||
    resolveUrl(user.user?.avatar_url) ||
    resolveUrl(user.user?.image_url) ||
    resolveUrl(user.user?.image) ||
    resolveUrl(user.user?.photo) ||
    resolveUrl(user.user?.photo_url) ||
    ""
  );
}

function getParticipantInitials(user) {
  const name = getParticipantName(user).trim();
  if (!name) return "?";

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getParticipantCount(ev) {
  const participants = getParticipants(ev);
  if (participants.length > 0) return participants.length;

  return (
    Number(ev?.booked_count) ||
    Number(ev?.participant_count) ||
    Number(ev?.attendee_count) ||
    Number(ev?.joined_count) ||
    0
  );
}

function hasMissingParticipantDetails(ev) {
  const count = getParticipantCount(ev);
  return count > 0 && getParticipants(ev).length === 0;
}

export default function History() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [imgErrorMap, setImgErrorMap] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setErr("Please login first.");
        setRows([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/my-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setErr(data?.message || "Failed to load history");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function openEvent(ev) {
    setSelected(ev);
    setSelectedDetail(ev);
    setImgErrorMap({});
    setDetailLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setDetailLoading(false);
        return;
      }

      const [participantsRes, filesRes] = await Promise.all([
        fetch(`${API_BASE}/api/events/${ev.id}/participants`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/events/${ev.id}/files`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const participants = await participantsRes.json().catch(() => []);
      const files = await filesRes.json().catch(() => []);

      setSelectedDetail({
        ...ev,
        participants: Array.isArray(participants) ? participants : [],
        files: Array.isArray(files) ? files : [],
      });

      console.log("EVENT LIST ITEM =", ev);
      console.log("FETCHED PARTICIPANTS =", participants);
      console.log("FETCHED FILES =", files);
    } catch (e) {
      console.error(e);
      setSelectedDetail(ev);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setSelectedDetail(null);
    setImgErrorMap({});
    setDetailLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const activeEvent = selectedDetail || selected;

  return (
    <UserShell title="My History">
      <div className="uep-rightHeader">
        <h3 className="uep-rightTitle">Түүх</h3>

        <button className="uep-refreshBtn" onClick={load} type="button">
          Шинэчлэх
        </button>

        <button
          className="uep-refreshBtn"
          onClick={() => navigate(-1)}
          type="button"
          aria-label="Back"
          title="Back"
        >
          X
        </button>
      </div>

      {err ? <div className="uep-error">{err}</div> : null}

      {loading ? (
        <div className="uep-empty">Түүх уншиж байна...</div>
      ) : rows.length === 0 ? (
        <div className="uep-empty">Түүх алга.</div>
      ) : (
        <div className="uep-grid">
          {rows.map((ev) => {
            const cover = getEventImage(ev) || fallbackImgSrc();

            return (
              <div
                key={ev.id}
                className="uep-card"
                onClick={() => openEvent(ev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    openEvent(ev);
                  }
                }}
              >
                <div className="uep-imgWrap">
                  <img
                    className="uep-img"
                    src={cover}
                    alt={ev.title || "Event"}
                    onError={(e) => {
                      e.currentTarget.src = fallbackImgSrc();
                    }}
                  />
                </div>

                <div className="uep-body">
                  <h4 className="uep-cardTitle">{ev.title}</h4>

                  <p className="uep-time">
                    {formatDateTime(ev.start_time)}
                    {ev.end_time ? ` - ${formatDateTime(ev.end_time)}` : ""}
                  </p>

                  <p
                    className="uep-desc"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {ev.description || "No description"}
                  </p>

                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                    Орсон хүний тоо: {getParticipantCount(ev)}
                    {" · "}
                    Харагдах байдал: {ev.visibility || "public"}
                  </div>

                  <button
                    type="button"
                    className="uep-refreshBtn"
                    style={{ marginTop: 12 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEvent(ev);
                    }}
                  >
                    Дэлгэрэнгүй
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && activeEvent && (
        <div
          className="uep-modalOverlay"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            className="uep-modalCard"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 96vw)",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 320,
                minHeight: 320,
                background: "#f8fafc",
                flexShrink: 0,
              }}
            >
              <img
                src={getEventImage(activeEvent) || fallbackImgSrc()}
                alt={activeEvent.title || "Event"}
                onError={(e) => {
                  e.currentTarget.src = fallbackImgSrc();
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              <button
                type="button"
                onClick={closeModal}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.95)",
                  fontSize: 18,
                  fontWeight: 700,
                  zIndex: 2,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: 24,
                overflowY: "auto",
                maxHeight: "calc(90vh - 320px)",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {activeEvent.title}
              </h2>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  fontSize: 14,
                  color: "#475569",
                }}
              >
                <span>
                  Эхлэх: {formatDateTime(activeEvent.start_time) || "-"}
                </span>
                <span>•</span>
                <span>
                  Дуусах: {formatDateTime(activeEvent.end_time) || "-"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  fontSize: 14,
                  color: "#475569",
                }}
              >
                <span>Орсон хүний тоо: {getParticipantCount(activeEvent)}</span>
                <span>•</span>
                <span>
                  Харагдах байдал: {activeEvent.visibility || "public"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: "#0f172a",
                  }}
                >
                  Тайлбар
                </div>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.75,
                    color: "#334155",
                    fontSize: 15,
                  }}
                >
                  {activeEvent.description || "No description"}
                </div>
              </div>

              {detailLoading ? (
                <div style={{ marginTop: 20, color: "#64748b", fontSize: 14 }}>
                  Дэлгэрэнгүй мэдээлэл ачааллаж байна...
                </div>
              ) : null}

              {(getParticipants(activeEvent).length > 0 ||
                hasMissingParticipantDetails(activeEvent)) && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 18,
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px solid rgba(15,23,42,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 12,
                      color: "#0f172a",
                    }}
                  >
                    Оролцогчид ({getParticipantCount(activeEvent)})
                  </div>

                  {getParticipants(activeEvent).length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {getParticipants(activeEvent).map((user, idx) => {
                        const name = getParticipantName(user);
                        const email = getParticipantEmail(user);
                        const profile = getParticipantProfile(user);
                        const initials = getParticipantInitials(user);
                        const key = user?.id || email || `${name}-${idx}`;
                        const hasImgError = !!imgErrorMap[key];

                        return (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: 12,
                              borderRadius: 14,
                              background: "#fff",
                              border: "1px solid rgba(15,23,42,0.08)",
                            }}
                          >
                            {profile && !hasImgError ? (
                              <img
                                src={profile}
                                alt={name}
                                onError={() =>
                                  setImgErrorMap((prev) => ({
                                    ...prev,
                                    [key]: true,
                                  }))
                                }
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  background: "#e5e7eb",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: "50%",
                                  background: "#e2e8f0",
                                  color: "#0f172a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                            )}

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  wordBreak: "break-word",
                                }}
                              >
                                {name}
                              </div>

                              {email ? (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    color: "#64748b",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {email}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: "#fff",
                        border: "1px solid rgba(15,23,42,0.08)",
                        color: "#475569",
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      Нийт {getParticipantCount(activeEvent)} хүн орсон байна.
                      Гэхдээ participant profile/detail мэдээлэл ирээгүй байна.
                    </div>
                  )}
                </div>
              )}

              {getFallbackFilesFromEvent(activeEvent).length > 0 && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 18,
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px solid rgba(15,23,42,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 12,
                      color: "#0f172a",
                    }}
                  >
                    Оруулсан файлууд
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {getFallbackFilesFromEvent(activeEvent).map((file, idx) => {
                      const fileUrl = getFileUrl(file);
                      const fileName = getFileName(file);
                      const fileNote = getFileNote(file);
                      const uploader = getFileUploader(file);
                      const image = isImageFile(file);
                      const pdf = isPdfFile(file);

                      return (
                        <a
                          key={file?.id || fileUrl || `${fileName}-${idx}`}
                          href={fileUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!fileUrl) e.preventDefault();
                          }}
                          style={{
                            textDecoration: "none",
                            color: "#0f172a",
                            border: "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 14,
                            overflow: "hidden",
                            background: "#fff",
                            display: "block",
                          }}
                        >
                          {image ? (
                            <img
                              src={fileUrl}
                              alt={fileName}
                              onError={(e) => {
                                e.currentTarget.src = fallbackImgSrc();
                              }}
                              style={{
                                width: "100%",
                                height: 130,
                                objectFit: "cover",
                                display: "block",
                                background: "#e5e7eb",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                height: 130,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#e5e7eb",
                                fontWeight: 700,
                                fontSize: 18,
                                color: "#334155",
                              }}
                            >
                              {pdf ? "PDF" : "FILE"}
                            </div>
                          )}

                          <div style={{ padding: 10 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                lineHeight: 1.4,
                                wordBreak: "break-word",
                              }}
                            >
                              {fileName}
                            </div>

                            {uploader ? (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  color: "#64748b",
                                  wordBreak: "break-word",
                                }}
                              >
                                {uploader}
                              </div>
                            ) : null}

                            {fileNote ? (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  color: "#475569",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {fileNote}
                              </div>
                            ) : null}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                <button
                  type="button"
                  className="uep-refreshBtn"
                  onClick={closeModal}
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserShell>
  );
}
