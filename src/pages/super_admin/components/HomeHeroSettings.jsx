import { useEffect, useRef, useState } from "react";
import { FiImage, FiRotateCcw, FiUpload } from "react-icons/fi";
import { apiFetch } from "../../../lib/api";
import { getImageSrc } from "../../../lib/config";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = /^image\/(png|jpe?g|webp|gif)$/;

// The image on the home page hero card. Without one, the card shows the cover
// of the next upcoming event.
export default function HomeHeroSettings({ showToast }) {
  const fileInput = useRef(null);
  const [image, setImage] = useState(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/site/home")
      .then((data) => setImage(data?.heroImage || ""))
      .catch(() => setImage(""));
  }, []);

  async function upload(file) {
    if (!file) return;
    if (!TYPES.test(file.type)) return showToast("PNG, JPG, WEBP эсвэл GIF зураг оруулна уу.", "error");
    if (file.size > MAX_BYTES) return showToast("Зураг 5MB-аас ихгүй байх ёстой.", "error");

    setBusy(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const data = await apiFetch("/api/admin/site/hero-image", { method: "POST", body });
      setImage(data.heroImage || "");
      showToast(data.message || "Зураг хадгалагдлаа.");
    } catch (err) {
      showToast(err.message || "Зураг хадгалж чадсангүй.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const data = await apiFetch("/api/admin/site/hero-image", { method: "DELETE" });
      setImage("");
      showToast(data.message || "Анхны зураг сэргэлээ.");
    } catch (err) {
      showToast(err.message || "Өөрчилж чадсангүй.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="saCard saCardPad saHeroSet">
      <div className="saHeroPreview">
        {image ? (
          <img src={getImageSrc(image)} alt="Нүүр хуудасны картын зураг" />
        ) : (
          <div className="saHeroEmpty">
            <FiImage />
            <span>{image === undefined ? "Ачаалж байна..." : "Эвэнтийн өөрийн зураг харагдана"}</span>
          </div>
        )}
      </div>

      <div className="saHeroText">
        <div className="saCardHead">
          <div>
            <h2>Нүүр хуудасны картын зураг</h2>
            <p>Нүүр хуудасны дээд хэсэгт байгаа эвэнтийн картын зураг.</p>
          </div>
          {image ? <span className="saBadge green">Өөрчилсөн</span> : <span className="saBadge">Анхны</span>}
        </div>

        <ul className="saHeroTips">
          <li>Зураг оруулаагүй үед удахгүй болох эвэнтийн өөрийн зураг харагдана.</li>
          <li>Өргөн 16:9 хэлбэр, 1200×675px-ээс том, 5MB хүртэл PNG, JPG, WEBP.</li>
          <li>Зүүн дээд буланд огноо, баруун дээд буланд ангилал гарна — гол дүрсээ төвд байрлуулаарай.</li>
        </ul>

        <div className="saHeroActions">
          <button type="button" className="saButton primary" disabled={busy} onClick={() => fileInput.current?.click()}>
            <FiUpload /> {busy ? "Түр хүлээнэ үү..." : image ? "Зураг солих" : "Зураг оруулах"}
          </button>
          {image ? (
            <button type="button" className="saButton" disabled={busy} onClick={reset}>
              <FiRotateCcw /> Анхныхаар болгох
            </button>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </section>
  );
}
