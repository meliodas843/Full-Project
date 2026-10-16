import { BADGE_OPTIONS } from "./EventCreateWizard.helpers";
import { FiEye, FiLock, FiTag, FiUploadCloud } from "react-icons/fi";

// Extracted from EventCreateWizard.jsx; receives the page state it reads as props.
export default function WizardBasicsStep({
  badgeMode,
  customBadge,
  description,
  handleBadgeSelect,
  handleCustomBadge,
  imageFile,
  image_url,
  isSvgFile,
  resolveUrl,
  setDescription,
  setErrMsg,
  setImageFile,
  setTitle,
  setVisibility,
  title,
  visibility,
}) {
  return (
    <div className="eventWizardPanel">
      <label className="eventWizardField">
        <span>ЭВЕНТИЙН НЭР *</span>
    
        <input
          value={title || ""}
          onChange={(event) => setTitle?.(event.target.value)}
          placeholder="Жишээ: Tech Summit 2026"
        />
      </label>
    
      <label className="eventWizardField">
        <span>ЭВЕНТИЙН ТӨРӨЛ *</span>
    
        <div className="eventWizardSelectIcon">
          <FiTag />
    
          <select value={badgeMode} onChange={handleBadgeSelect}>
            <option value="">Төрөл сонгох</option>
    
            {BADGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
    
            <option value="custom">Бусад / Өөрөө оруулах</option>
          </select>
        </div>
      </label>
    
      {badgeMode === "custom" && (
        <label className="eventWizardField">
          <span>БУСАД ТӨРӨЛ *</span>
    
          <div className="eventWizardInputIcon">
            <FiTag />
    
            <input
              type="text"
              value={customBadge}
              onChange={handleCustomBadge}
              placeholder="Жишээ: Кибер аюулгүй байдал"
              maxLength={40}
              autoFocus
            />
          </div>
    
          <small
            style={{
              display: "block",
    
              marginTop: 6,
    
              opacity: 0.65,
            }}
          >
            Can't find the right badge? Write your own.
          </small>
        </label>
      )}
    
      <label className="eventWizardField">
        <span>ХАРАГДАХ БАЙДАЛ</span>
    
        <div className="eventWizardSelectIcon">
          {visibility === "private" ? <FiLock /> : <FiEye />}
    
          <select
            value={visibility || "public"}
            onChange={(event) => setVisibility?.(event.target.value)}
          >
            <option value="public">Нийтийн эвент</option>
    
            <option value="private">Хаалттай эвент</option>
          </select>
        </div>
      </label>
    
      <label className="eventWizardField">
        <span>ДЭЛГЭРЭНГҮЙ ТАЙЛБАР</span>
    
        <textarea
          value={description || ""}
          onChange={(event) => setDescription?.(event.target.value)}
          placeholder="Эвентийн тайлбарыг оруулна уу..."
          rows={6}
        />
      </label>
    
      <div className="eventWizardField">
        <span>НҮҮР ЗУРАГ ОРУУЛАХ</span>
    
        <label className="eventWizardUpload">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
    
              if (!file) {
                setImageFile?.(null);
    
                return;
              }
    
              if (typeof isSvgFile === "function" && isSvgFile(file)) {
                setErrMsg?.("SVG зураг дэмжигдэхгүй.");
    
                setImageFile?.(null);
    
                event.target.value = "";
    
                return;
              }
    
              setErrMsg?.("");
    
              setImageFile?.(file);
            }}
          />
    
          <FiUploadCloud />
    
          <div>
            <strong>
              {imageFile
                ? imageFile.name
                : image_url
                  ? "Шинэ нүүр зураг сонгох"
                  : "Нүүр зураг сонгох"}
            </strong>
    
            <small>PNG, JPG, JPEG, WEBP, GIF</small>
          </div>
        </label>
    
        {image_url && !imageFile ? (
          <div
            style={{
              marginTop: 12,
    
              width: "100%",
    
              height: 180,
    
              borderRadius: 12,
    
              overflow: "hidden",
            }}
          >
            <img
              src={
                typeof resolveUrl === "function"
                  ? resolveUrl(image_url)
                  : image_url
              }
              alt="Одоогийн нүүр зураг"
              style={{
                width: "100%",
    
                height: "100%",
    
                objectFit: "cover",
    
                display: "block",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
