import { useEffect, useMemo, useState } from "react";

import { NavLink, useNavigate } from "react-router-dom";

import {
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiLock,
  FiUser,
  FiVideo,
} from "react-icons/fi";

import UserShell from "../components/UserShell";

import { API_BASE } from "@/lib/config";

const INTEREST_OPTIONS = [
  { value: "Technology", label: "Технологи" },

  { value: "Design", label: "Дизайн" },

  { value: "Startups", label: "Стартап" },

  { value: "AI & ML", label: "Хиймэл оюун ба машин сургалт" },

  { value: "Finance", label: "Санхүү" },

  { value: "Marketing", label: "Маркетинг" },

  { value: "Leadership", label: "Манлайлал" },

  { value: "Data Science", label: "Өгөгдлийн шинжлэх ухаан" },
];

function getToken() {
  return localStorage.getItem("token");
}

function getText(value) {
  return String(value ?? "").trim();
}

function getPhone(value) {
  return String(value ?? "")
    .replace(/\D/g, "")

    .slice(0, 8);
}

function getInterests(profile) {
  const value =
    profile?.interests ||
    profile?.professional_interests ||
    profile?.professionalInterests ||
    [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value

        .split(",")

        .map((item) => item.trim())

        .filter(Boolean);
    }
  }

  return [];
}

function createProfileForm(profile) {
  return {
    firstName: getText(profile?.firstName || profile?.first_name),

    lastName: getText(profile?.lastName || profile?.last_name),

    company_name: getText(
      profile?.company_name || profile?.company || profile?.organization,
    ),

    phone: getPhone(profile?.phone),

    job_title: getText(profile?.job_title || profile?.jobTitle),

    interests: getInterests(profile),
  };
}

function getCompletion(form) {
  const checks = [
    Boolean(form.firstName.trim() && form.lastName.trim()),

    /^\d{8}$/.test(form.phone),

    Boolean(form.company_name.trim() && form.job_title.trim()),

    form.interests.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function initials(user, form) {
  const first = form.firstName || user?.firstName || user?.first_name || "";

  const last = form.lastName || user?.lastName || user?.last_name || "";

  const value = `${first} ${last}`.trim();

  if (!value) return "U";

  return value

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase())

    .join("");
}

function getAvatarSource(value) {
  const image = getText(value);
  if (!image) return "";
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  )
    return image;
  if (image.startsWith("/")) return `${API_BASE}${image}`;
  return `${API_BASE}/${image}`;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Зураг уншихад алдаа гарлаа."));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);

  const [meetingEnabled, setMeetingEnabled] = useState(true);

  const [duration, setDuration] = useState("30 минут");

  const [availableTime, setAvailableTime] = useState("10:00 - 18:00");

  const [avatarFile, setAvatarFile] = useState(null);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [savedAvatar, setSavedAvatar] = useState("");

  const [form, setForm] = useState({
    firstName: "",

    lastName: "",

    company_name: "",

    phone: "",

    job_title: "",

    interests: [],
  });

  const progress = useMemo(() => getCompletion(form), [form]);

  const fullName = `${form.firstName} ${form.lastName}`.trim() || "Хэрэглэгч";

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const token = getToken();

    if (!token) {
      navigate("/login", { replace: true });

      return;
    }

    setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");

          localStorage.removeItem("user");

          localStorage.removeItem("profileComplete");

          navigate("/login", { replace: true });

          return;
        }

        throw new Error(data?.message || "Профайл уншихад алдаа гарлаа.");
      }

      const profile = data?.user || data;
      const storedUser = getStoredUser();

      const avatarValue =
        profile?.avatar_url ||
        profile?.avatar ||
        profile?.profile_image ||
        profile?.profile_image_url ||
        storedUser?.avatar_url ||
        storedUser?.avatar ||
        storedUser?.profile_image ||
        storedUser?.profile_image_url ||
        "";

      const mergedProfile = {
        ...storedUser,
        ...profile,
        avatar_url: avatarValue,
      };

      const nextForm = createProfileForm(mergedProfile);

      setUser(mergedProfile);
      setForm(nextForm);
      setSavedAvatar(getAvatarSource(avatarValue));

      localStorage.setItem("user", JSON.stringify(mergedProfile));

      localStorage.setItem(
        "profileComplete",

        getCompletion(nextForm) === 100 ? "true" : "false",
      );
    } catch (err) {
      console.error(err);

      setError(err.message || "Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  function change(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 8) : value,
    }));

    setSaved(false);

    setError("");
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг сонгоно уу.");

      event.target.value = "";

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Зургийн хэмжээ 5MB-аас бага байх ёстой.");

      event.target.value = "";

      return;
    }

    setAvatarFile(file);

    setAvatarPreview(URL.createObjectURL(file));

    setSaved(false);

    setError("");
  }

  function toggleInterest(value) {
    setForm((current) => ({
      ...current,

      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));

    setSaved(false);
  }

  function validate() {
    if (!form.firstName.trim()) return (setError("Нэрээ оруулна уу."), false);

    if (!form.lastName.trim()) return (setError("Овгоо оруулна уу."), false);

    if (!/^\d{8}$/.test(form.phone))
      return (setError("Утасны дугаар 8 оронтой байна."), false);

    if (!form.company_name.trim())
      return (setError("Байгууллагын нэрээ оруулна уу."), false);

    if (!form.job_title.trim())
      return (setError("Албан тушаалаа оруулна уу."), false);

    if (!form.interests.length)
      return (
        setError("Сонирхлын чиглэлээс дор хаяж нэгийг сонгоно уу."),
        false
      );

    return true;
  }

  async function save() {
    if (!validate()) return;

    const token = getToken();

    if (!token) return navigate("/login", { replace: true });

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const formData = new FormData();

      formData.append("firstName", form.firstName.trim());
      formData.append("lastName", form.lastName.trim());
      formData.append("company_name", form.company_name.trim());
      formData.append("phone", form.phone.trim());
      formData.append("job_title", form.job_title.trim());
      formData.append("interests", JSON.stringify(form.interests));

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Профайл хадгалахад алдаа гарлаа.");
      }

      const serverUser = data?.user || {};
      const avatarValue =
        serverUser?.avatar_url ||
        serverUser?.avatar ||
        serverUser?.profile_image ||
        serverUser?.profile_image_url ||
        user?.avatar_url ||
        "";

      const updated = {
        ...user,
        ...serverUser,
        avatar_url: avatarValue,
        avatar: avatarValue,
        profile_image: avatarValue,
        profile_image_url: avatarValue,
        firstName: serverUser?.firstName || serverUser?.first_name || form.firstName.trim(),
        first_name: serverUser?.first_name || serverUser?.firstName || form.firstName.trim(),
        lastName: serverUser?.lastName || serverUser?.last_name || form.lastName.trim(),
        last_name: serverUser?.last_name || serverUser?.lastName || form.lastName.trim(),
        company_name: serverUser?.company_name || form.company_name.trim(),
        company: serverUser?.company_name || form.company_name.trim(),
        organization: serverUser?.company_name || form.company_name.trim(),
        phone: serverUser?.phone || form.phone.trim(),
        job_title: serverUser?.job_title || form.job_title.trim(),
        jobTitle: serverUser?.job_title || form.job_title.trim(),
        interests: serverUser?.interests || form.interests,
        professional_interests: serverUser?.interests || form.interests,
        professionalInterests: serverUser?.interests || form.interests,
      };

      setUser(updated);
      setForm(createProfileForm(updated));
      setSavedAvatar(getAvatarSource(avatarValue));
      setAvatarPreview("");
      setAvatarFile(null);

      localStorage.setItem("user", JSON.stringify(updated));
      localStorage.setItem("profileComplete", "true");
      window.dispatchEvent(new Event("profile-updated"));

      setSaved(true);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.message || "Сервертэй холбогдож чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <UserShell title="Профайл">
        <div className="rpLoading">Профайл уншиж байна...</div>
      </UserShell>
    );
  }

  if (!user) {
    return (
      <UserShell title="Профайл">
        <div className="rpLoading">Профайл олдсонгүй.</div>
      </UserShell>
    );
  }

  return (
    <UserShell title="Профайл">
      <div className="rpPage">
        <div className="rpHeading">
          <h1>Профайл</h1>

          <p>Хувийн мэдээлэл, нууц үг, байгууллага, төлбөр</p>
        </div>

        <div className="rpLayout">
          <aside className="rpSidebar">
            <div className="rpProfileCard">
              <div className="rpAvatarWrap">
                <div
                  className={`rpAvatar ${avatarPreview || savedAvatar ? "hasImage" : ""}`}
                  style={
                    avatarPreview || savedAvatar
                      ? { background: "transparent" }
                      : undefined
                  }
                >
                  {avatarPreview || savedAvatar ? (
                    <img
                      src={avatarPreview || savedAvatar}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        borderRadius: "50%",
                        background: "transparent",
                      }}
                    />
                  ) : (
                    initials(user, form)
                  )}
                </div>

                <label className="rpCamera" htmlFor="profileImage">
                  <FiCamera />
                </label>

                <input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </div>

              <h2>{fullName}</h2>

              <p>
                {form.job_title || "Албан тушаал"} ·{" "}
                {form.company_name || "Байгууллага"}
              </p>

              <div className="rpProgressTitle">
                <span>Профайл бөглөлт</span>

                <b>{progress}%</b>
              </div>

              <div className="rpProgress">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>

            <nav className="rpNav">
              <NavLink to="/user/profile" end>
                <FiUser />
                Хувийн мэдээлэл
              </NavLink>

              <NavLink to="/user/password">
                <FiLock />
                Нууц үг солих
              </NavLink>

              {/* <NavLink to="/user/password">
                <FiCreditCard />
                Төлбөр ба багц
              </NavLink> */}
            </nav>
          </aside>

          <main className="rpContent">
            {error && <div className="rpError">{error}</div>}

            <section className="rpCard">
              <header className="rpCardHead">
                <h3>Хувийн мэдээлэл</h3>

                {form.firstName && form.lastName && (
                  <span className="rpComplete">
                    <FiCheck /> Бүрэн
                  </span>
                )}
              </header>

              <div className="rpCardBody">
                <div className="rpGrid2">
                  <div className="rpField">
                    <label>
                      НЭР <span>*</span>
                    </label>

                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={change}
                      placeholder="Нэр"
                    />
                  </div>

                  <div className="rpField">
                    <label>
                      ОВОГ <span>*</span>
                    </label>

                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={change}
                      placeholder="Овог"
                    />
                  </div>
                </div>

                <div className="rpField" style={{ marginTop: 14 }}>
                  <label>И-МЭЙЛ</label>

                  <div className="rpReadonly">
                    <input value={user.email || ""} readOnly />

                    <span className="rpVerified">
                      <FiLock /> Бүртгэлтэй и-мэйл
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rpCard">
              <header className="rpCardHead">
                <h3>Холбоо барих ба ажил</h3>

                {/^[0-9]{8}$/.test(form.phone) &&
                  form.company_name &&
                  form.job_title && (
                    <span className="rpComplete">
                      <FiCheck /> Бүрэн
                    </span>
                  )}
              </header>

              <div className="rpCardBody rpGrid3">
                <div className="rpField">
                  <label>
                    УТАСНЫ ДУГААР <span>*</span>
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={change}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="9909 1442"
                  />
                </div>

                <div className="rpField">
                  <label>
                    БАЙГУУЛЛАГА <span>*</span>
                  </label>

                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={change}
                    placeholder="Байгууллага"
                  />
                </div>

                <div className="rpField">
                  <label>
                    АЛБАН ТУШААЛ <span>*</span>
                  </label>

                  <input
                    name="job_title"
                    value={form.job_title}
                    onChange={change}
                    placeholder="Албан тушаал"
                  />
                </div>
              </div>
            </section>

            <section className="rpCard">
              <header className="rpCardHead">
                <h3>Мэргэжлийн сонирхол</h3>

                <span style={{ fontSize: 12, fontWeight: 700, color: "#777" }}>
                  {form.interests.length} сонгосон
                </span>
              </header>

              <div className="rpCardBody">
                <p
                  style={{ margin: "0 0 12px", fontSize: 12, color: "#8b8c97" }}
                >
                  Танд тохирох эвент, уулзалтын санал болголтод ашиглана
                </p>

                <div className="rpInterests">
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = form.interests.includes(interest.value);

                    return (
                      <button
                        key={interest.value}
                        type="button"
                        className={`rpInterest ${selected ? "selected" : ""}`}
                        onClick={() => toggleInterest(interest.value)}
                      >
                        {selected && <FiCheck />}

                        {interest.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rpCard">
              <header className="rpCardHead">
                <h3>Уулзалтын тохиргоо</h3>
              </header>

              <div className="rpCardBody">
                <p className="rpMeetingIntro">
                  Эвентээс дараах 1:1 Zoom уулзалтын хүсэлтийг хүлээн авах
                  тохиргоо
                </p>

                <div className="rpMeetingToggleRow">
                  <div>
                    <strong>Уулзалтын хүсэлт хүлээн авах</strong>

                    <span>Эвент дууссаны дараа хамт оролцсон хүмүүсээс</span>
                  </div>

                  <button
                    type="button"
                    className={`rpSwitch ${meetingEnabled ? "on" : ""}`}
                    onClick={() => setMeetingEnabled((v) => !v)}
                    aria-label="Уулзалтын хүсэлт"
                  >
                    <i />
                  </button>
                </div>

                <div className="rpZoomRow">
                  <div className="rpZoomLeft">
                    <div className="rpZoomIcon">
                      <FiVideo />
                    </div>

                    <div>
                      <strong>Zoom бүртгэл</strong>

                      <span>Холбогдсон уулзалтын холбоос автоматаар үүснэ</span>
                    </div>
                  </div>

                  <button type="button" className="rpConnect">
                    Салгах
                  </button>
                </div>

                <div className="rpGrid2">
                  <div className="rpField">
                    <label>
                      <FiClock style={{ marginRight: 4 }} />
                      ҮРГЭЛЖЛЭХ ХУГАЦАА
                    </label>

                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option>15 минут</option>

                      <option>30 минут</option>

                      <option>45 минут</option>

                      <option>60 минут</option>
                    </select>
                  </div>

                  <div className="rpField">
                    <label>БОЛОМЖТОЙ ЦАГ</label>

                    <input
                      value={availableTime}
                      onChange={(e) => setAvailableTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="rpActions">
              {saved && <span className="rpSaved">Өөрчлөлт хадгалагдлаа</span>}

              <button
                type="button"
                className="rpSave"
                onClick={save}
                disabled={saving || progress !== 100}
              >
                {saving ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </UserShell>
  );
}
