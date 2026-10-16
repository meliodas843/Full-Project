import { EMPLOYEE_COUNTS, INDUSTRIES } from "./OrganizationProfile.helpers";
import { FiCamera, FiCheck, FiGlobe, FiMail, FiMapPin, FiPhone, FiUsers } from "react-icons/fi";

// Extracted from OrganizationProfile.jsx; receives the page state it reads as props.
export default function OrganizationProfileForm({
  activeSection,
  coverSrc,
  fieldErrors,
  form,
  handleChange,
  handleCoverError,
  handleLogoError,
  logoSrc,
  selectCover,
  selectLogo,
}) {
  return (
    <section className="orgFormArea">
      {activeSection === "information" && (
        <>
          <section className="orgCard">
            <div className="orgCardHeader">
              <h3>Байгууллагын мэдээлэл</h3>
    
              <span className="orgComplete">
                <FiCheck />
                Нийтэд харагдана
              </span>
            </div>
    
            <div className="orgCardBody">
              <div className="orgGrid2">
                <div className="orgField">
                  <label>
                    БАЙГУУЛЛАГЫН НЭР
                    <span> *</span>
                  </label>
    
                  <input
                    type="text"
                    name="name"
                    aria-invalid={Boolean(fieldErrors.name)}
                    value={form.name}
                    onChange={handleChange}
                    placeholder="IT Insight"
                  />
                </div>
    
                <div className="orgField">
                  <label>
                    РЕГИСТРИЙН ДУГААР{" "}
                    <span className="orgRequiredStar">*</span>
                  </label>
    
                  <input
                    type="text"
                    name="registration_number"
                    aria-invalid={Boolean(
                      fieldErrors.registration_number,
                    )}
                    value={form.registration_number}
                    onChange={handleChange}
                    placeholder="6012345"
                  />
                </div>
              </div>
    
              <div className="orgGrid2">
                <div className="orgField">
                  <label>
                    САЛБАР <span className="orgRequiredStar">*</span>
                  </label>
    
                  <select
                    name="industry"
                    aria-invalid={Boolean(fieldErrors.industry)}
                    value={form.industry}
                    onChange={handleChange}
                  >
                    <option value="">Сонгоно уу</option>
    
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
    
                <div className="orgField">
                  <label>
                    АЖИЛТНЫ ТОО <span className="orgRequiredStar">*</span>
                  </label>
    
                  <select
                    name="employee_count"
                    aria-invalid={Boolean(fieldErrors.employee_count)}
                    value={form.employee_count}
                    onChange={handleChange}
                  >
                    <option value="">Сонгоно уу</option>
    
                    {EMPLOYEE_COUNTS.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
    
              <div className="orgField">
                <label>
                  ТОВЧ ТАНИЛЦУУЛГА{" "}
                  <span className="orgRequiredStar">*</span>
                </label>
    
                <textarea
                  name="description"
                  aria-invalid={Boolean(fieldErrors.description)}
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Байгууллагынхаа тухай товч мэдээлэл оруулна уу..."
                />
              </div>
            </div>
          </section>
    
          <section className="orgCard">
            <div className="orgCardHeader">
              <h3>Холбоо барих</h3>
            </div>
    
            <div className="orgCardBody">
              <div className="orgGrid3">
                <div className="orgField">
                  <label>
                    ВЭБСАЙТ <span>(Сонголттой)</span>
                  </label>
    
                  <div className="orgInputIcon">
                    <FiGlobe />
    
                    <input
                      type="text"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="itinsight.mn"
                    />
                  </div>
                </div>
    
                <div className="orgField">
                  <label>
                    АЛБАН И-МЭЙЛ{" "}
                    <span className="orgRequiredStar">*</span>
                  </label>
    
                  <div className="orgInputIcon">
                    <FiMail />
    
                    <input
                      type="email"
                      name="email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="info\@itinsight.mn"
                    />
                  </div>
                </div>
    
                <div className="orgField">
                  <label>
                    УТАС <span className="orgRequiredStar">*</span>
                  </label>
    
                  <div className="orgInputIcon">
                    <FiPhone />
    
                    <input
                      type="text"
                      name="phone"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="7711 2233"
                    />
                  </div>
                </div>
              </div>
    
              <div className="orgField">
                <label>
                  ХАЯГ <span className="orgRequiredStar">*</span>
                </label>
    
                <div className="orgInputIcon">
                  <FiMapPin />
    
                  <input
                    type="text"
                    name="address"
                    aria-invalid={Boolean(fieldErrors.address)}
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Улаанбаатар, Сүхбаатар дүүрэг..."
                  />
                </div>
              </div>
    
              <div className="orgGrid3">
                <div className="orgField">
                  <label>
                    FACEBOOK <span>(Сонголттой)</span>
                  </label>
    
                  <input
                    type="text"
                    name="facebook"
                    value={form.facebook}
                    onChange={handleChange}
                    placeholder="fb.com/company"
                  />
                </div>
    
                <div className="orgField">
                  <label>
                    LINKEDIN <span>(Сонголттой)</span>
                  </label>
    
                  <input
                    type="text"
                    name="linkedin"
                    value={form.linkedin}
                    onChange={handleChange}
                    placeholder="linkedin.com/company/..."
                  />
                </div>
    
                <div className="orgField">
                  <label>
                    ХОЛБОГДОХ АЖИЛТАН <span>(Сонголттой)</span>
                  </label>
    
                  <input
                    type="text"
                    name="contact_person"
                    value={form.contact_person}
                    onChange={handleChange}
                    placeholder="Нэр - Албан тушаал"
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    
      {activeSection === "media" && (
        <section className="orgCard">
          <div className="orgCardHeader">
            <h3>Лого ба ковер</h3>
          </div>
    
          <div className="orgCardBody">
            <div className="orgMediaGrid">
              <div className="orgMediaItem">
                <h4>Байгууллагын лого</h4>
    
                <div className="orgMediaLogo">
                  <img
                    src={logoSrc}
                    alt={form.name || "Organization logo"}
                    onError={handleLogoError}
                  />
                </div>
    
                <label className="orgUploadButton">
                  <FiCamera />
                  Лого солих
                  <input
                    type="file"
                    accept="image/*"
                    onChange={selectLogo}
                  />
                </label>
              </div>
    
              <div className="orgMediaItem">
                <h4>Профайлын ковер</h4>
    
                <div className="orgMediaCover">
                  <img
                    src={coverSrc}
                    alt="Organization cover"
                    onError={handleCoverError}
                  />
                </div>
    
                <label className="orgUploadButton">
                  <FiCamera />
                  Ковер солих
                  <input
                    type="file"
                    accept="image/*"
                    onChange={selectCover}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      )}
    
      {activeSection === "team" && (
        <section className="orgCard">
          <div className="orgEmptyState">
            <FiUsers />
    
            <h3>Баг ба эрх</h3>
    
            <p>
              Байгууллагын гишүүд болон хэрэглэгчийн эрхийг энд удирдана.
            </p>
          </div>
        </section>
      )}
    
      {activeSection === "verification" && (
        <section className="orgCard">
          <div className="orgEmptyState">
            <FiCheck />
    
            <h3>Баталгаажуулалт</h3>
    
            <p>Байгууллагын баталгаажуулалтын мэдээлэл энд харагдана.</p>
          </div>
        </section>
      )}
    </section>
  );
}
