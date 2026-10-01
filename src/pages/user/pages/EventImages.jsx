import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FiArrowLeft,
  FiCheck,
  FiDownload,
  FiEye,
  FiImage,
  FiMessageSquare,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";

import { useNavigate, useParams } from "react-router-dom";

import UserShell from "../components/UserShell";

import { API_BASE, getImageSrc } from "@/lib/config";

function normalizeImages(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.images)) return data.images;

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function formatDate(value) {
  if (!value) return "—";

  const text = String(value).trim().replace(" ", "T");

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10).replaceAll("-", ".");
  }

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  })

    .format(date)

    .replaceAll("/", ".");
}

function imageCategory(image) {
  return String(
    image?.category ||
      image?.tag ||
      image?.type ||
      image?.album ||
      "Хамтын зураг",
  ).trim();
}

function safeFileName(name) {
  return String(name || "event-image")
    .replace(/[<>:"/\|?*]+/g, "-")
    .trim();
}

export default function EventImages() {
  const { id } = useParams();

  const navigate = useNavigate();

  const fileRef = useRef(null);

  const [event, setEvent] = useState(null);

  const [participantMessage, setParticipantMessage] = useState("");

  const [images, setImages] = useState([]);

  const [canManage, setCanManage] = useState(false);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [activeFilter, setActiveFilter] = useState("Бүгд");

  const [visibility, setVisibility] = useState("participants");

  const [allowDownload, setAllowDownload] = useState(true);

  const [showNames, setShowNames] = useState(true);

  const [watermark, setWatermark] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);

  const [settingsSaved, setSettingsSaved] = useState(false);

  const token = localStorage.getItem("token");

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      const response = await fetch(`${API_BASE}/api/event-gallery/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Зургийн цомгийг ачаалж чадсангүй.");
      }

      setEvent(data?.event || null);

      setImages(normalizeImages(data));

      setCanManage(Boolean(data?.can_manage));

      const settings = data?.settings || {};

      setParticipantMessage(settings.participant_message || "");

      setVisibility(
        settings.visibility === "public" ? "public" : "participants",
      );

      setAllowDownload(settings.allow_download !== false);

      setShowNames(settings.notify_participants !== false);

      setWatermark(Boolean(settings.watermark));
    } catch (err) {
      setError(err.message || "Зургийн цомгийг ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const categories = useMemo(() => {
    const counts = new Map();

    images.forEach((image) => {
      const category = imageCategory(image);

      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,

      count,
    }));
  }, [images]);

  const filteredImages = useMemo(() => {
    if (activeFilter === "Бүгд") return images;

    return images.filter((image) => imageCategory(image) === activeFilter);
  }, [images, activeFilter]);

  const allVisibleSelected = useMemo(() => {
    if (!filteredImages.length) return false;

    return filteredImages.every((image) => selectedIds.includes(image.id));
  }, [filteredImages, selectedIds]);

  function toggleImage(imageId) {
    setSelectedIds((current) =>
      current.includes(imageId)
        ? current.filter((value) => value !== imageId)
        : [...current, imageId],
    );
  }

  function toggleAllVisible() {
    const visibleIds = filteredImages.map((image) => image.id);

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((imageId) => !visibleIds.includes(imageId)),
      );

      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...visibleIds])),
    );
  }

  async function saveSettings(nextSettings) {
    if (!canManage) return;

    const payload = {
      visibility:
        nextSettings?.visibility !== undefined
          ? nextSettings.visibility
          : visibility,

      allow_download:
        nextSettings?.allow_download !== undefined
          ? nextSettings.allow_download
          : allowDownload,

      notify_participants:
        nextSettings?.notify_participants !== undefined
          ? nextSettings.notify_participants
          : showNames,

      watermark:
        nextSettings?.watermark !== undefined
          ? nextSettings.watermark
          : watermark,

      participant_message:
        nextSettings?.participant_message !== undefined
          ? nextSettings.participant_message
          : participantMessage,
    };

    try {
      setSavingSettings(true);

      setSettingsSaved(false);

      setError("");

      const response = await fetch(
        `${API_BASE}/api/event-gallery/${id}/settings`,

        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Тохиргоог хадгалж чадсангүй.");
      }

      const settings = data?.settings || payload;

      setVisibility(
        settings.visibility === "public" ? "public" : "participants",
      );

      setAllowDownload(settings.allow_download !== false);

      setShowNames(settings.notify_participants !== false);

      setWatermark(Boolean(settings.watermark));

      setSettingsSaved(true);

      window.setTimeout(() => {
        setSettingsSaved(false);
      }, 1800);
    } catch (err) {
      setError(err.message || "Тохиргоог хадгалж чадсангүй.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function uploadImages(files) {
    const selectedFiles = Array.from(files || []).filter((file) =>
      String(file.type || "").startsWith("image/"),
    );

    if (!selectedFiles.length) return;

    try {
      setUploading(true);

      setError("");

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`${API_BASE}/api/event-gallery/${id}`, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Зураг нэмж чадсангүй.");
      }

      setImages(normalizeImages(data));

      setSelectedIds([]);

      setActiveFilter("Бүгд");
    } catch (err) {
      setError(err.message || "Зураг нэмж чадсангүй.");
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(`${selectedIds.length} зураг устгах уу?`);

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_BASE}/api/event-gallery/${id}`, {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          image_ids: selectedIds,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Зураг устгаж чадсангүй.");
      }

      setImages(normalizeImages(data));

      setSelectedIds([]);
    } catch (err) {
      setError(err.message || "Зураг устгаж чадсангүй.");
    }
  }

  async function downloadImage(image) {
    if (!allowDownload && !canManage) {
      setError("Зохион байгуулагч зураг татахыг зөвшөөрөөгүй байна.");

      return;
    }

    try {
      const url = getImageSrc(image.image_url, "");

      const response = await fetch(url);

      const blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;

      link.download = safeFileName(
        image.original_name || `event-${id}-image-${image.id}.jpg`,
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(
        getImageSrc(image.image_url, ""),

        "_blank",

        "noopener,noreferrer",
      );
    }
  }

  async function downloadAll() {
    if (!allowDownload && !canManage) {
      setError("Зохион байгуулагч зураг татахыг зөвшөөрөөгүй байна.");

      return;
    }

    const targets = selectedIds.length
      ? images.filter((image) => selectedIds.includes(image.id))
      : filteredImages;

    for (const image of targets) {
      await downloadImage(image);
    }
  }

  const eventCover = getImageSrc(event?.image_url, "");

  const participantCount =
    Number(event?.participant_count) ||
    Number(event?.participants_count) ||
    Number(event?.joined_count) ||
    0;

  return (
    <UserShell title="Эвэнтийн зургууд">
      <main className="egPage">
        <div className="egTopbar">
          <button
            type="button"
            className="egBackButton"
            onClick={() => navigate("/user/history")}
            aria-label="Буцах"
          >
            <FiArrowLeft />
          </button>

          <div>
            <div className="egBreadcrumb">
              Нүүр / Оролцсон эвентүүд / Зургууд
            </div>

            <h1 className="egPageTitle">Эвэнтийн зургууд</h1>
          </div>
        </div>

        {error ? (
          <div className="egError">
            <span>{error}</span>

            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        ) : null}

        <section className="egSummaryCard">
          <div className="egSummaryMain">
            <div className="egSummaryCover">
              {eventCover ? (
                <img src={eventCover} alt={event?.title || "Event"} />
              ) : (
                <div className="egSummaryCoverPlaceholder">
                  <FiImage />
                </div>
              )}

              <span className="egHomeBadge">⌂ Нүүр зураг</span>
            </div>

            <div className="egSummaryInfo">
              <div className="egSummaryBadges">
                <span className="egSummaryStatus">Эвент дууссан</span>

                <span className="egSummaryType">Draft</span>
              </div>

              <h2>{event?.title || "Эвент"}</h2>

              <div className="egSummaryMeta">
                <span>{formatDate(event?.start_time)}</span>

                {event?.category ? <span>{event.category}</span> : null}

                <span>{images.length} зураг</span>

                {participantCount > 0 ? (
                  <span>{participantCount} оролцогч</span>
                ) : null}

                <span>
                  {visibility === "public"
                    ? "Нийтэд нээлттэй"
                    : "Зөвхөн оролцогчид"}
                </span>
              </div>
            </div>
          </div>

          {canManage ? (
            <div className="egSummaryPublish">
              <div className="egPublishStep done">
                <span>
                  <FiCheck />
                </span>

                <strong>Эвент дууссан</strong>
              </div>

              <div className="egPublishStep done">
                <span>
                  <FiCheck />
                </span>

                <strong>Зураг нэмсэн ({images.length})</strong>
              </div>

              <div
                className={`egPublishStep ${visibility === "public" ? "done" : ""}`}
              >
                <span>{visibility === "public" ? <FiCheck /> : ""}</span>

                <strong>Оролцогчдод нийтэлсэн</strong>
              </div>

              <button
                type="button"
                className="egPublishButton"
                disabled={savingSettings || visibility === "public"}
                onClick={() => {
                  setVisibility("public");

                  saveSettings({ visibility: "public" });
                }}
              >
                {visibility === "public"
                  ? "Цомог нийтлэгдсэн"
                  : "Цомгийг нийтлэх"}
              </button>

              <button
                type="button"
                className="egParticipantViewButton"
                onClick={() =>
                  window.open(`/user/events/${id}/images`, "_blank")
                }
              >
                <FiEye />
                Оролцогчийн харагдац
              </button>
            </div>
          ) : null}
        </section>

        <div className="egContentLayout">
          <section className="egMainColumn">
            {canManage ? (
              <div className="egUploadBox">
                <div className="egUploadInfo">
                  <div className="egUploadIcon">
                    <FiUploadCloud />
                  </div>

                  <div>
                    <strong>
                      Зургаа чирч оруулах эсвэл{" "}
                      <button
                        type="button"
                        className="egUploadLink"
                        onClick={() => fileRef.current?.click()}
                      >
                        компьютерээс сонгох
                      </button>
                    </strong>

                    <span>
                      JPG, PNG, WEBP · Нэг зураг 20MB хүртэл · нэг удаад 200
                      зураг
                    </span>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  hidden
                  onChange={(e) => uploadImages(e.target.files)}
                />

                <button
                  type="button"
                  className="egUploadButton"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <FiUploadCloud />

                  {uploading ? "Нэмж байна..." : "Зураг нэмэх"}
                </button>
              </div>
            ) : null}

            <div className="egFilterRow">
              <div className="egFilters">
                <button
                  type="button"
                  className={`egFilterPill ${
                    activeFilter === "Бүгд" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("Бүгд")}
                >
                  Бүгд <span>{images.length}</span>
                </button>

                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.name}
                    className={`egFilterPill ${
                      activeFilter === category.name ? "active" : ""
                    }`}
                    onClick={() => setActiveFilter(category.name)}
                  >
                    {category.name} <span>{category.count}</span>
                  </button>
                ))}
              </div>

              {canManage && filteredImages.length ? (
                <button
                  type="button"
                  className="egSelectAll"
                  onClick={toggleAllVisible}
                >
                  <FiCheck />

                  {allVisibleSelected ? "Сонголт цуцлах" : "Бүгдийг сонгох"}
                </button>
              ) : null}
            </div>

            {selectedIds.length && canManage ? (
              <div className="egSelectionBar">
                <span>{selectedIds.length} зураг сонгосон</span>

                <div>
                  <button type="button" onClick={downloadAll}>
                    <FiDownload />
                    Татах
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={deleteSelected}
                  >
                    <FiTrash2 />
                    Устгах
                  </button>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="egState">Уншиж байна...</div>
            ) : filteredImages.length ? (
              <div className="egGalleryGrid">
                {filteredImages.map((image) => {
                  const selected = selectedIds.includes(image.id);

                  return (
                    <article
                      className={`egGalleryCard ${selected ? "selected" : ""}`}
                      key={image.id}
                    >
                      {canManage ? (
                        <button
                          type="button"
                          className={`egImageCheck ${
                            selected ? "selected" : ""
                          }`}
                          onClick={() => toggleImage(image.id)}
                          aria-label="Зураг сонгох"
                        >
                          {selected ? <FiCheck /> : null}
                        </button>
                      ) : null}

                      <img
                        src={getImageSrc(image.image_url, "")}
                        alt={event?.title || "Event"}
                        loading="lazy"
                      />

                      {watermark ? (
                        <div className="egWatermark">
                          {event?.title || "REGISTRA"}
                        </div>
                      ) : null}

                      <div className="egImageOverlay">
                        <span>{imageCategory(image)}</span>

                        {allowDownload || canManage ? (
                          <button
                            type="button"
                            onClick={() => downloadImage(image)}
                            aria-label="Зураг татах"
                          >
                            <FiDownload />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="egEmpty">
                <div className="egEmptyIcon">
                  <FiImage />
                </div>

                <strong>Зураг алга байна</strong>

                <span>
                  {activeFilter === "Бүгд"
                    ? "Энэ эвентэд одоогоор зураг нэмээгүй байна."
                    : "Энэ ангилалд зураг алга байна."}
                </span>
              </div>
            )}
          </section>

          <aside className="egSideColumn">
            <section className="egSideCard">
              <h3>ХЭН ХАРАХ ВЭ?</h3>

              <label
                className={`egRadioCard ${
                  visibility === "participants" ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="galleryVisibility"
                  value="participants"
                  checked={visibility === "participants"}
                  disabled={!canManage || savingSettings}
                  onChange={() => {
                    setVisibility("participants");

                    saveSettings({ visibility: "participants" });
                  }}
                />

                <span className="egCustomRadio" />

                <span>
                  <strong>Зөвхөн оролцогчид</strong>

                  <small>Эвентэд ирсэн 41 хүн нэвтэрч харна.</small>
                </span>
              </label>

              <label
                className={`egRadioCard ${
                  visibility === "public" ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="galleryVisibility"
                  value="public"
                  checked={visibility === "public"}
                  disabled={!canManage || savingSettings}
                  onChange={() => {
                    setVisibility("public");

                    saveSettings({ visibility: "public" });
                  }}
                />

                <span className="egCustomRadio" />

                <span>
                  <strong>Нийтэд нээлттэй</strong>

                  <small>Эвентийн нийтэд нээлттэй хуудсаас харагдана.</small>
                </span>
              </label>
            </section>

            <section className="egSideCard">
              <div className="egSettingsHeading">
                <h3>ТОХИРГОО</h3>

                <span className={settingsSaved ? "visible" : ""}>
                  Хадгалагдлаа
                </span>
              </div>

              <div className="egSettingRow">
                <span>
                  <strong>Татахыг зөвшөөрөх</strong>

                  <small>Бүрэн чанараар татна</small>
                </span>

                <button
                  type="button"
                  className={`egSwitch ${allowDownload ? "on" : ""}`}
                  onClick={() => {
                    const next = !allowDownload;

                    setAllowDownload(next);

                    saveSettings({ allow_download: next });
                  }}
                  disabled={!canManage || savingSettings}
                  aria-label="Татахыг зөвшөөрөх"
                >
                  <span />
                </button>
              </div>

              <div className="egSettingRow">
                <span>
                  <strong>Оролцогчдод мэдэгдэх</strong>

                  <small>Имэйл + апп мэдэгдэл</small>
                </span>

                <button
                  type="button"
                  className={`egSwitch ${showNames ? "on" : ""}`}
                  onClick={() => {
                    const next = !showNames;

                    setShowNames(next);

                    saveSettings({ notify_participants: next });
                  }}
                  disabled={!canManage || savingSettings}
                  aria-label="Оролцогчдод мэдэгдэх"
                >
                  <span />
                </button>
              </div>

              <div className="egSettingRow">
                <span>
                  <strong>Усан тэмдэг</strong>

                  <small>Байгууллагын лого буланд</small>
                </span>

                <button
                  type="button"
                  className={`egSwitch ${watermark ? "on" : ""}`}
                  onClick={() => {
                    const next = !watermark;

                    setWatermark(next);

                    saveSettings({ watermark: next });
                  }}
                  disabled={!canManage || savingSettings}
                  aria-label="Усан тэмдэг"
                >
                  <span />
                </button>
              </div>

              <div className="egParticipantMessage">
                <div className="egParticipantMessageHeader">
                  <div className="egParticipantMessageIcon">
                    <FiMessageSquare />
                  </div>

                  <div>
                    <strong>Оролцогчдод хандах үг</strong>
                    <small>Цомог дээр харагдах мессеж</small>
                  </div>
                </div>

                <textarea
                  value={participantMessage}
                  onChange={(e) => setParticipantMessage(e.target.value)}
                  onBlur={() =>
                    saveSettings({
                      participant_message: participantMessage.trim(),
                    })
                  }
                  disabled={!canManage || savingSettings}
                  placeholder="Жишээ: Манай эвентэд хүрэлцэн ирсэн та бүхэнд баярлалаа!"
                  maxLength={500}
                  rows={3}
                />

                <div className="egParticipantMessageFooter">
                  <span>
                    {savingSettings
                      ? "Хадгалж байна..."
                      : settingsSaved
                        ? "Хадгалагдлаа"
                        : "Автоматаар хадгална"}
                  </span>

                  <span>{participantMessage.length}/500</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </UserShell>
  );
}
