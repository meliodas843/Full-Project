import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function getToken() {
  return localStorage.getItem("token");
}

function getMyEmail() {
  const raw = localStorage.getItem("user");
  if (!raw) return "";
  try {
    const u = JSON.parse(raw);
    return u?.email || "";
  } catch {
    return "";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default function Meeting() {
  const navigate = useNavigate();
  const myEmail = useMemo(() => getMyEmail(), []);

  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [company, setCompany] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");

  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitees, setInvitees] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // load companies
  useEffect(() => {
    fetch("http://localhost:5000/api/companies", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setCompanies(Array.isArray(d) ? d : []))
      .catch(() => setMessage("Failed to load companies"));
  }, []);

  // load employees
  useEffect(() => {
    if (!company) {
      setEmployees([]);
      setEmployeeEmail("");
      return;
    }

    fetch(
      `http://localhost:5000/api/companies/employees?company=${encodeURIComponent(
        company
      )}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => setMessage("Failed to load employees"));
  }, [company]);

  function addInvitee() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !isValidEmail(email)) return;
    if (invitees.includes(email)) return;
    setInvitees((p) => [...p, email]);
    setInviteEmail("");
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!company || !employeeEmail || !meetingDate || !startTime || !reason) {
      return setMessage("Please fill all required fields");
    }

    try {
      setLoading(true);

      await fetch("http://localhost:5000/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          company,
          date: meetingDate,
          startTime,
          endTime: endTime || null,
          reason,
          invitees: [employeeEmail, ...invitees],
        }),
      });

      setMessage("✅ Meeting request sent");

      setTimeout(() => {
        navigate("/user/notifications");
      }, 600);
    } catch {
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="userLayout">
      <Sidebar />

      <div className="userContent">
        <div className="meet-wrap">
          <div className="meet-card">
            <div className="meet-head">
              <div>
                <h2 className="meet-title">Create Meeting</h2>
                <p className="meet-sub">Send a meeting request</p>
              </div>

              <button
                className="meet-back"
                type="button"
                onClick={() => navigate("/user/notifications")}
              >
                Back
              </button>
            </div>

            <form className="meet-form" onSubmit={handleSend}>
              <select
                className="meet-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="meet-input"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                disabled={!company}
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.email}>
                    {e.email}
                  </option>
                ))}
              </select>

              <input
                className="meet-input"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />

              <input
                className="meet-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />

              <textarea
                className="meet-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
              />

              {message && <div className="meet-message">{message}</div>}

              <button className="meet-btn" disabled={loading}>
                {loading ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
