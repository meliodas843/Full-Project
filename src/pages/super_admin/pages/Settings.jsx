import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiCreditCard, FiInfo, FiSave } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import HomeHeroSettings from "../components/HomeHeroSettings";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { apiFetch } from "../../../lib/api";

const BANKS = [
  "Хаан банк",
  "Голомт банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Хас банк",
  "Капитрон банк",
  "Богд банк",
  "М банк",
  "Ариг банк",
  "Тээвэр хөгжлийн банк",
  "Чингис хаан банк",
  "Үндэсний хөрөнгө оруулалтын банк",
];

const SLA_OPTIONS = [2, 4, 8, 24];

const money = (n) => `₮${Math.round(Number(n || 0)).toLocaleString("en-US")}`;

// Site settings: the home page hero image, then the publish fee and the
// account organizers pay it to (the right column shows what organizers see).
export default function Settings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    apiFetch("/api/admin/payments/settings")
      .then((s) => setForm({ ...s, bankName: s.bankName || BANKS[0] }))
      .catch((err) => setError(err.message || "Тохиргоо ачаалж чадсангүй."));
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      const saved = await apiFetch("/api/admin/payments/settings", { method: "PUT", body: form });
      setForm({ ...saved, bankName: saved.bankName || BANKS[0] });
      showToast("Тохиргоо хадгалагдлаа.");
    } catch (err) {
      showToast(err.message || "Хадгалж чадсангүй.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      crumb="Супер админ / Систем / Тохиргоо"
      title="Тохиргоо"
      actions={
        <>
          <button type="button" className="saButton" onClick={() => navigate("/super-admin/payments")}>
            <FiArrowLeft /> Төлбөр рүү
          </button>
          <button type="button" className="saButton primary" disabled={!form || saving} onClick={save}>
            <FiSave /> {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </>
      }
    >
      <Toast toast={toast} onClose={hideToast} />
      <HomeHeroSettings showToast={showToast} />

      {error ? <div className="saError">{error}</div> : null}

      {form ? (
        <div className="saSettingsLayout">
          <div className="saGrid">
            <section className="saCard saCardPad">
              <div className="saCardHead">
                <div>
                  <h2>Эвэнт нийтлэх шимтгэл</h2>
                  <p>Зохион байгуулагч эвэнт нийтлэх бүрт нэг удаа төлнө.</p>
                </div>
              </div>

              <div className="saTwoInputs">
                <label>
                  <span className="saLabel">Шимтгэлийн дүн (₮)</span>
                  <input
                    className="saInput"
                    type="number"
                    min="0"
                    step="500"
                    value={form.publishFee}
                    onChange={(e) => set("publishFee", e.target.value)}
                  />
                </label>
                <label>
                  <span className="saLabel">Шалгах хугацаа</span>
                  <select
                    className="saInput"
                    value={form.reviewSlaHours}
                    onChange={(e) => set("reviewSlaHours", Number(e.target.value))}
                  >
                    {SLA_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h} цагийн дотор
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="saToggleRow">
                <div>
                  <strong>Эвэнт нийтлэхэд шимтгэл авах</strong>
                  <span>Унтраавал шинэ эвэнт шууд нийтлэгдэнэ</span>
                </div>
                <button
                  type="button"
                  className={`saSwitch${form.feeEnabled ? " on" : ""}`}
                  aria-pressed={form.feeEnabled}
                  aria-label="Эвэнт нийтлэхэд шимтгэл авах"
                  onClick={() => set("feeEnabled", !form.feeEnabled)}
                />
              </div>
              <div className="saHint">
                Шимтгэлийн дүнг өөрчлөхөд аль хэдийн үүссэн төлбөрийн дүн өөрчлөгдөхгүй. Баталгаажуулмагц эвэнт автоматаар
                нийтлэгдэнэ.
              </div>
            </section>

            <section className="saCard saCardPad">
              <div className="saCardHead">
                <div>
                  <h2>Төлбөр хүлээн авах данс</h2>
                  <p>Зохион байгуулагчид энэ дансанд шилжүүлэг хийнэ.</p>
                </div>
              </div>

              <label>
                <span className="saLabel">Банк</span>
                <select className="saInput" value={form.bankName} onChange={(e) => set("bankName", e.target.value)}>
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <div className="saTwoInputs">
                <label>
                  <span className="saLabel">Дансны дугаар</span>
                  <input
                    className="saInput"
                    inputMode="numeric"
                    value={form.accountNumber}
                    onChange={(e) => set("accountNumber", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="5039482107"
                  />
                </label>
                <label>
                  <span className="saLabel">Данс эзэмшигч</span>
                  <input
                    className="saInput"
                    value={form.accountName}
                    onChange={(e) => set("accountName", e.target.value)}
                    placeholder="Registra ХХК"
                  />
                </label>
              </div>
              {!form.accountNumber ? (
                <div className="saHint" style={{ color: "var(--sa-amber)" }}>
                  Данс оруулаагүй үед шимтгэл авахгүй — шинэ эвэнт шууд нийтлэгдэнэ.
                </div>
              ) : null}
            </section>
          </div>

          <aside>
            <div className="saLabel" style={{ marginBottom: 8 }}>
              Хэрэглэгчид ингэж харагдана
            </div>
            <section className="saCard saCardPad saPayPreview">
              <div className="saPayHead">
                <strong>Шимтгэл төлөх</strong>
                <b>{money(form.publishFee)}</b>
              </div>
              <div className="saPayRows">
                <div>
                  <span>Банк</span>
                  <strong>{form.bankName || "—"}</strong>
                </div>
                <div>
                  <span>Дансны дугаар</span>
                  <strong>{form.accountNumber || "—"}</strong>
                </div>
                <div>
                  <span>Данс эзэмшигч</span>
                  <strong>{form.accountName || "—"}</strong>
                </div>
                <div>
                  <span>Гүйлгээний утга</span>
                  <strong className="saMono">REG-[эвэнтийн код]</strong>
                </div>
              </div>
              <div className="saPayButton">
                <FiCheck /> Төлбөр төлсөн — илгээх
              </div>
            </section>
            <div className="saNotice" style={{ marginTop: 12 }}>
              <FiInfo />
              <span>
                Эвэнт үүсгэсний дараа зохион байгуулагч энэ мэдээллийг харж шилжүүлэг хийнэ. Таныг баталгаажуулмагц
                эвэнт нийтлэгдэнэ.
              </span>
            </div>
            {!form.feeEnabled ? (
              <div className="saHint" style={{ marginTop: 8 }}>
                <FiCreditCard /> Шимтгэл одоогоор унтраалттай байна.
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </AdminShell>
  );
}
