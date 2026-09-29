import { useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";

import brandLogo from "../../assets/registra-logo-def.png";

import { API_BASE } from "../../lib/config";

const categories = [
  "Мэдээллийн технологи",

  "Cloud",

  "Кибер аюулгүй байдал",

  "Санхүү",

  "Боловсрол",

  "Бусад",
];

const getPasswordRules = (password) => ({
  length: password.length >= 10,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
});

export default function Signup() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [accountType, setAccountType] = useState("individual");

  const [form, setForm] = useState({
    firstName: "",

    lastName: "",

    phone: "",

    position: "",

    companyName: "",

    email: "",

    password: "",

    confirmPassword: "",

    organizationName: "",

    registrationNumber: "",

    establishedYear: "",

    description: "",

    website: "",

    organizationPhone: "",

    address: "",
  });

  const [categoriesSelected, setCategoriesSelected] = useState([
    "Мэдээллийн технологи",
  ]);

  const [organizationLogo, setOrganizationLogo] = useState(null);

  const [logoPreview, setLogoPreview] = useState("");

  const [gender, setGender] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: value,
    }));

    setMessage("");
  };

  const toggleCategory = (category) => {
    setCategoriesSelected((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setOrganizationLogo(file);

    const preview = URL.createObjectURL(file);

    setLogoPreview(preview);
  };

  const validatePassword = (password) => {
    const rules = getPasswordRules(password);
    return Object.values(rules).every(Boolean);
  };

  const passwordRules = getPasswordRules(form.password);
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    if (!validatePassword(form.password)) {
      setMessage("Нууц үг бүх шаардлагыг хангасан байх ёстой.");

      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Нууц үг таарахгүй байна.");

      return;
    }

    if (!termsAccepted) {
      setMessage("Үйлчилгээний нөхцөл болон Нууцлалын бодлогыг зөвшөөрнө үү.");

      return;
    }

    if (accountType === "organization" && !form.organizationName.trim()) {
      setMessage("Байгууллагын нэрээ оруулна уу.");

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/register`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: form.email.trim(),

            password: form.password,

            accountType,

            firstName: form.firstName.trim(),

            lastName: form.lastName.trim(),

            phone: form.phone.trim(),

            position: form.position.trim(),

            companyName: form.companyName.trim(),

            gender,

            organization:
              accountType === "organization"
                ? {
                    name: form.organizationName.trim(),

                    registrationNumber: form.registrationNumber.trim(),

                    establishedYear: form.establishedYear.trim(),

                    categories: categoriesSelected,

                    description: form.description.trim(),

                    website: form.website.trim(),

                    phone: form.organizationPhone.trim(),

                    address: form.address.trim(),
                  }
                : null,
          }),
        },
      );

      const data = await response

        .json()

        .catch(() => ({}));

      if (!response.ok) {
        setMessage(data?.message || "Бүртгүүлэхэд алдаа гарлаа.");

        return;
      }

      if (data?.user) {
        localStorage.setItem(
          "user",

          JSON.stringify(data.user),
        );
      }

      if (data?.token) {
        localStorage.setItem(
          "token",

          data.token,
        );
      }

      if (data?.user?.role) {
        localStorage.setItem(
          "role",

          data.user.role,
        );
      }

      navigate("/profile", {
        replace: true,
      });
    } catch {
      setMessage("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const renderLeftPanel = () => {
    if (accountType === "organization") {
      return (
        <>
          <div className="rgSplitBrand">
            <img src={brandLogo} alt="Registra" className="rgSplitBrandLogo" />
          </div>

          <div className="rgSplitHeroContent">
            <h2>
              Байгууллагаа
              <br />
              бүртгүүлээд эвэнтээ
              <br />
              зарла.
            </h2>

            <div className="rgSplitBenefits">
              <div>
                <FiCheck />

                <span>Логотой байгууллагын профайл хуудас</span>
              </div>

              <div>
                <FiCheck />

                <span>Зарласан бүх эвэнт нэг дор</span>
              </div>

              <div>
                <FiCheck />

                <span>Дагагчдад шинэ эвэнтийн мэдэгдэл очно</span>
              </div>
            </div>

            <div className="rgSplitMiniCard">
              <div className="rgSplitCompanyIcon">IT</div>

              <div>
                <strong>IT Insight</strong>

                <span>Мэдээллийн технологи · 2 эвэнт</span>
              </div>

              <div className="rgSplitVerified">
                <FiCheck />
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="rgSplitBrand">
          <img src={brandLogo} alt="Registra" className="rgSplitBrandLogo" />
        </div>

        <div className="rgSplitHeroContent">
          <h2>
            Эвэнтэд оролцоод,
            <br />
            дараа нь хүмүүстэй
            <br />
            уулз.
          </h2>

          <div className="rgSplitBenefits">
            <div>
              <FiCheck />

              <span>Сонирхсон эвэнтэд хэдхэн секундэд бүртгүүлнэ</span>
            </div>

            <div>
              <FiCheck />

              <span>Эвэнтийн дараа 1:1 Zoom уулзалт</span>
            </div>

            <div>
              <FiCheck />

              <span>Дагасан байгууллагын шинэ эвэнтийн мэдэгдэл</span>
            </div>
          </div>

          <div className="rgSplitMiniCard">
            <div className="rgSplitCompanyIcon">IT</div>

            <div>
              <strong>IT Insight</strong>

              <span>Мэдээллийн технологи · 2 эвэнт</span>
            </div>

            <div className="rgSplitVerified">
              <FiCheck />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <main className="rgSplitAuth">
      <section className="rgSplitLeft">
        {renderLeftPanel()}

        <div className="rgSplitCircle rgSplitCircleOne" />

        <div className="rgSplitCircle rgSplitCircleTwo" />

        <div className="rgSplitCopyright">© 2026 Registra</div>
      </section>

      <section className="rgSplitRight">
        <div className="rgSplitRightInner">
          <button
            type="button"
            className="rgSplitBack"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />

            <span>Нүүр хуудас</span>
          </button>

          <div className="rgSignupHeader">
            <h1>Бүртгүүлэх</h1>

            <p>Бүртгэлийн төрлөө сонгоно уу.</p>
          </div>

          <div className="rgAccountTypes">
            <button
              type="button"
              className={accountType === "individual" ? "active" : ""}
              onClick={() => setAccountType("individual")}
            >
              <div className="rgAccountTypeIcon">
                <FiUser />
              </div>

              <div>
                <strong>Хувь хүн</strong>

                <span>Эвэнтэд оролцох, 1:1 Zoom уулзалт хийх</span>
              </div>
            </button>

            <button
              type="button"
              className={accountType === "organization" ? "active" : ""}
              onClick={() => setAccountType("organization")}
            >
              <div className="rgAccountTypeIcon">
                <FiBriefcase />
              </div>

              <div>
                <strong>Байгууллага</strong>

                <span>Эвэнт зарлах, байгууллагын профайлтай болох</span>
              </div>
            </button>
          </div>

          <form className="rgSplitSignupForm" onSubmit={handleSubmit}>
            {accountType === "individual" ? (
              <div className="rgSignupBox">
                <div className="rgSignupBoxTitle">ХУВИЙН МЭДЭЭЛЭЛ</div>

                <div className="rgProfileUpload">
                  <div className="rgProfileCircle">
                    <FiUser />

                    <span>Зураг</span>
                  </div>

                  <div>
                    <strong>Профайл зураг</strong>

                    <p>JPG, PNG · 5MB хүртэл · дөрвөлжин зураг</p>

                    <button type="button">Зураг сонгох</button>
                  </div>
                </div>

                <div className="rgFormGrid">
                  <div className="rgFormField">
                    <label>НЭР *</label>

                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Нэр"
                      required
                    />
                  </div>

                  <div className="rgFormField">
                    <label>ОВОГ *</label>

                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Овог"
                      required
                    />
                  </div>

                  <div className="rgFormField">
                    <label>УТАС</label>

                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="9900 0000"
                    />
                  </div>

                  <div className="rgFormField">
                    <label>АЛБАН ТУШААЛ</label>

                    <input
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Жишээ: PM"
                    />
                  </div>
                </div>

                <div className="rgFormField">
                  <label>АЖИЛЛАДАГ БАЙГУУЛЛАГА (ЗААВАЛ БИШ)</label>

                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="Байгууллагын нэр"
                  />
                </div>
              </div>
            ) : (
              <div className="rgSignupBox">
                <div className="rgSignupBoxTitle">БАЙГУУЛЛАГЫН МЭДЭЭЛЭЛ</div>

                <div className="rgOrgLogoRow">
                  <button
                    type="button"
                    className="rgOrgLogo"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="" />
                    ) : (
                      <>
                        <FiImage />

                        <span>Лого</span>
                      </>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    hidden
                    onChange={handleLogoChange}
                  />

                  <div>
                    <strong>Байгууллагын лого *</strong>

                    <p>PNG, SVG, JPG · 512×512px зөвлөмж</p>

                    <button
                      type="button"
                      className="rgSmallOutlineButton"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Лого оруулах
                    </button>
                  </div>
                </div>

                <div className="rgFormField">
                  <label>БАЙГУУЛЛАГЫН НЭР *</label>

                  <input
                    name="organizationName"
                    value={form.organizationName}
                    onChange={handleChange}
                    placeholder="Жишээ: IT Insight ХХК"
                    required
                  />
                </div>

                <div className="rgFormGrid">
                  <div className="rgFormField">
                    <label>РЕГИСТРИЙН ДУГААР</label>

                    <input
                      name="registrationNumber"
                      value={form.registrationNumber}
                      onChange={handleChange}
                      placeholder="7 оронтой"
                    />
                  </div>

                  <div className="rgFormField">
                    <label>БАЙГУУЛАГДСАН ОН</label>

                    <input
                      name="establishedYear"
                      value={form.establishedYear}
                      onChange={handleChange}
                      placeholder="Жишээ: 2015"
                    />
                  </div>
                </div>

                <div className="rgFormField">
                  <label>САЛБАР *</label>

                  <div className="rgCategoryList">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={
                          categoriesSelected.includes(category) ? "active" : ""
                        }
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rgFormField">
                  <label>ТОВЧ ТАНИЛЦУУЛГА</label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Байгууллага юу хийдэг, ямар эвэнт зохион байгуулдаг вэ..."
                    rows={4}
                  />
                </div>

                <div className="rgFormGrid">
                  <div className="rgFormField">
                    <label>ВЭБ САЙТ</label>

                    <div className="rgInputIcon">
                      <FiGlobe />

                      <input
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https\://"
                      />
                    </div>
                  </div>

                  <div className="rgFormField">
                    <label>УТАС *</label>

                    <div className="rgInputIcon">
                      <FiPhone />

                      <input
                        name="organizationPhone"
                        value={form.organizationPhone}
                        onChange={handleChange}
                        placeholder="7700 0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="rgFormField">
                  <label>ХАЯГ</label>

                  <div className="rgInputIcon">
                    <FiMapPin />

                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Хот, дүүрэг, хороо, байр"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="rgSignupBox">
              <div className="rgSignupBoxTitle">НЭВТРЭХ МЭДЭЭЛЭЛ</div>

              <div className="rgFormField">
                <label>И-МЭЙЛ *</label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="rgFormField">
                <label>НУУЦ ҮГ *</label>

                <div className="rgSignupPassword">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Нууц үг үүсгэх"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>{" "}
                </div>

                {form.password.length > 0 && (
                  <div className="rgPasswordRequirements">
                    <div className="rgPasswordRequirementsHead">
                      <span>Нууц үгийн шаардлага</span>

                      <span className={passwordValid ? "complete" : ""}>
                        {passwordValid ? "Бэлэн" : "Шаардлагатай"}
                      </span>
                    </div>

                    <div className="rgPasswordRequirementGrid">
                      <div className={passwordRules.length ? "passed" : ""}>
                        <span className="rgPasswordRuleIcon">
                          {passwordRules.length ? <FiCheck /> : "•"}
                        </span>
                        <span>8-аас дээш тэмдэгт</span>
                      </div>

                      <div className={passwordRules.uppercase ? "passed" : ""}>
                        <span className="rgPasswordRuleIcon">
                          {passwordRules.uppercase ? <FiCheck /> : "•"}
                        </span>
                        <span>Том үсэг (A-Z)</span>
                      </div>

                      <div className={passwordRules.lowercase ? "passed" : ""}>
                        <span className="rgPasswordRuleIcon">
                          {passwordRules.lowercase ? <FiCheck /> : "•"}
                        </span>
                        <span>Жижиг үсэг (a-z)</span>
                      </div>

                      <div className={passwordRules.number ? "passed" : ""}>
                        <span className="rgPasswordRuleIcon">
                          {passwordRules.number ? <FiCheck /> : "•"}
                        </span>
                        <span>Тоо (0-9)</span>
                      </div>

                      <div className={passwordRules.symbol ? "passed" : ""}>
                        <span className="rgPasswordRuleIcon">
                          {passwordRules.symbol ? <FiCheck /> : "•"}
                        </span>
                        <span>Тусгай тэмдэгт (!@#$)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rgFormField">
                <label>НУУЦ ҮГ БАТАЛГААЖУУЛАХ *</label>

                <div className="rgSignupPassword">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Нууц үгээ давтах"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {accountType === "individual" && (
                <div className="rgGenderRow">
                  <label>
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === "male"}
                      onChange={() => setGender("male")}
                    />

                    <span>♂ Эрэгтэй</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === "female"}
                      onChange={() => setGender("female")}
                    />

                    <span>♀ Эмэгтэй</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === "other"}
                      onChange={() => setGender("other")}
                    />

                    <span>◯ Тусгай тэмдэгт</span>
                  </label>
                </div>
              )}
            </div>

            <label className="rgTerms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />

              <span>
                <Link to="/terms">Үйлчилгээний нөхцөл</Link> болон{" "}
                <Link to="/privacy">Нууцлалын бодлого</Link>
                -ыг зөвшөөрч байна
              </span>
            </label>

            {message && <div className="rgSignupError">{message}</div>}

            <button className="rgSignupSubmit" type="submit" disabled={loading}>
              {loading
                ? "Бүртгэж байна..."
                : accountType === "organization"
                  ? "Байгууллагаар бүртгүүлэх"
                  : "Бүртгүүлэх"}
            </button>

            <div className="rgSignupLogin">
              Бүртгэлтэй юу? <Link to="/login">Нэвтрэх</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
