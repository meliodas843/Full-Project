import { NavLink, useNavigate } from "react-router-dom";
import UserShell from "../components/UserShell";

export default function Password() {
  const navigate = useNavigate();

  return (
      <UserShell title="Change Password">
        <div className="profileGrid">
          {/* LEFT NAV */}
          <aside className="profileNav">
            <div className="profileNavCard">
              <NavLink
                to="/user/profile"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Profile
              </NavLink>

              <NavLink
                to="/user/password"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Change Password
              </NavLink>

              <NavLink
                to="/user/company"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Company
              </NavLink>

              <NavLink
                to="/user/bill"
                className={({ isActive }) => `profileNavBtn ${isActive ? "isActive" : ""}`}
              >
                Bill
              </NavLink>
            </div>
          </aside>

          {/* RIGHT */}
          <main className="profileMain">
            <section className="profileCard">
              <div className="profileMainHeader">
                <h3 className="profileTitle">Change Password</h3>
              </div>

              <div className="profileSection">
                <form
                  className="profileForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <label className="profileField">
                    Current password
                    <input className="profileInput" type="password" />
                  </label>

                  <label className="profileField">
                    New password
                    <input className="profileInput" type="password" />
                  </label>

                  <label className="profileField">
                    Confirm new password
                    <input className="profileInput" type="password" />
                  </label>

                  <div className="profileActions">
                    <button
                      type="button"
                      className="profileBtnGhost"
                      onClick={() => navigate("/user/profile")}
                    >
                      Cancel
                    </button>

                    <button type="submit" className="profileBtnPrimary">
                      Update Password
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
