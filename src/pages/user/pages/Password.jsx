import { NavLink, useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";

export default function Password() {
  const navigate = useNavigate();

  return (
    <UserShell title="Change Password">
      <div className="profileGrid">
        <aside className="profileNav">
          <div className="profileNavCard">
            <NavLink
              to="/user/profile"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Профайл
            </NavLink>

            <NavLink
              to="/user/password"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Нууц үг солих
            </NavLink>

            <NavLink
              to="/user/company"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Компани
            </NavLink>

            <NavLink
              to="/user/bill"
              className={({ isActive }) =>
                `profileNavBtn ${isActive ? "isActive" : ""}`
              }
            >
              Төлбөр
            </NavLink>
          </div>
        </aside>

        {/* RIGHT */}
        <main className="profileMain">
          <section className="profileCard">
            <div className="profileMainHeader">
              <h3 className="profileTitle">Нууц үг солих</h3>
            </div>

            <div className="profileSection">
              <form
                className="profileForm"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <label className="profileField">
                  Одоогийн нууц үг
                  <input className="profileInput" type="password" />
                </label>

                <label className="profileField">
                  Шинэ нууц үг
                  <input className="profileInput" type="password" />
                </label>

                <label className="profileField">
                  Шинэ нууц үгийг баталгаажуулах
                  <input className="profileInput" type="password" />
                </label>

                <div className="profileActions">
                  <button
                    type="button"
                    className="profileBtnGhost"
                    onClick={() => navigate("/user/profile")}
                  >
                    Цуцлах
                  </button>

                  <button type="submit" className="profileBtnPrimary">
                    Нууц үг шинэчлэх
                  </button>
                </div>
              </form>
            </div>
          </section>
        </main>
      </div>
    </UserShell>
  );
}
