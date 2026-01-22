import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    storedUser = null;
  }

  const [form, setForm] = useState({
    company_name: storedUser?.company_name || "",
    email: storedUser?.email || "",
    firstName: storedUser?.firstName || "",
    lastName: storedUser?.lastName || "",
    phone: storedUser?.phone || "",
  });

  const [avatarFile, setAvatarFile] = useState(null);

  const avatarPreview = useMemo(() => {
    if (!avatarFile) return "";
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function onPickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setAvatarFile(file);
  }

  // ✅ NOW SAVES TO DB + LOCALSTORAGE
  async function handleSubmit(e) {
    e.preventDefault();

    const company = (form.company_name || "").trim();
    const phone = (form.phone || "").trim();

    if (!company || !phone) {
      alert("Company name and phone number are required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You are not logged in. Please login again.");
      navigate("/login");
      return;
    }

    try {
      // ✅ SAVE TO DB
      const res = await fetch("http://localhost:5000/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: company,
          phone: phone,
          firstName: form.firstName,
          lastName: form.lastName,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "Failed to save profile");
        return;
      }

      // ✅ UPDATE LOCALSTORAGE so ProtectedRoute stops redirecting
      const currentUser = storedUser || {};
      const updatedUser = {
        ...currentUser,
        company_name: company,
        phone: phone,
        firstName: form.firstName,
        lastName: form.lastName,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      console.log("PROFILE SAVED:", data);

      // ✅ Go to homepage after completion
      navigate("/user/home");
    } catch (err) {
      console.error(err);
      alert("Server error saving profile");
    }
  }

  return (
    <div className="ds">
      <Sidebar />

      <main className="ds-main">
        <section className="ds-content">
          <h1 className="ds-title">Profile Settings</h1>

          <div className="ds-card">
            <form className="ds-form" onSubmit={handleSubmit}>
              {/* Upload */}
              <div className="ds-upload">
                <button
                  type="button"
                  className="ds-upload-circle"
                  onClick={onPickFile}
                  aria-label="Upload photo"
                >
                  {avatarPreview ? (
                    <img
                      className="ds-upload-preview"
                      src={avatarPreview}
                      alt="avatar"
                    />
                  ) : (
                    <span className="ds-camera">📷</span>
                  )}
                </button>

                <button
                  type="button"
                  className="ds-upload-link"
                  onClick={onPickFile}
                >
                  Upload Photo
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                />
              </div>

              {/* Grid inputs */}
              <div className="ds-grid">
                <div className="ds-field">
                  <label>Company Name *</label>
                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={onChange}
                    placeholder="Enter your company name"
                    required
                  />
                </div>

                <div className="ds-field">
                  <label>Your email</label>
                  <input
                    name="email"
                    value={form.email}
                    readOnly
                    style={{ cursor: "not-allowed", opacity: 0.8 }}
                  />
                </div>

                <div className="ds-field">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="ds-field">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="ds-field">
                  <label>Phone Number *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div className="ds-actions">
                <button className="ds-primary" type="submit">
                  Save & Continue
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
