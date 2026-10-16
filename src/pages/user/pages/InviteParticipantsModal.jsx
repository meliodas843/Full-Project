import { getParticipantEmail, getParticipantInitials, getParticipantName, isValidInviteEmail } from "./History.helpers";
import { FiX } from "react-icons/fi";

// Extracted from History.jsx; receives the page state it reads as props.
export default function InviteParticipantsModal({
  addPeopleError,
  addPeopleForm,
  addPeopleLoading,
  addPeopleSuccess,
  createAndAddPerson,
  handleAddPeopleChange,
  inviteLookupLoading,
  inviteUser,
  selectedEvent,
  setShowAddPeople,
}) {
  return (
    <div
      className="historyModalOverlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !addPeopleLoading) {
          setShowAddPeople(false);
        }
      }}
    >
      <div className="historyModal historyInviteModal">
        <div className="historyModalHeader">
          <div>
            <h2>Хүн урих</h2>
    
            <p>{selectedEvent?.title}</p>
          </div>
    
          <button
            type="button"
            disabled={addPeopleLoading}
            onClick={() => setShowAddPeople(false)}
            aria-label="Хаах"
          >
            <FiX />
          </button>
        </div>
    
        <div className="historyModalBody">
          <form className="historyInviteForm" onSubmit={createAndAddPerson}>
            <div className="historyInviteField">
              <label htmlFor="invite-email">И-мэйл</label>
    
              <input
                id="invite-email"
                type="email"
                name="email"
                value={addPeopleForm.email}
                onChange={handleAddPeopleChange}
                placeholder="user@example.com"
                autoComplete="email"
                disabled={addPeopleLoading}
                autoFocus
              />
    
              <span className="historyInviteHint">
                Урьж буй хүний и-мэйл хаягийг оруулна уу.
              </span>
            </div>
    
            {inviteLookupLoading ? (
              <div className="historyInviteLookup">
                Хэрэглэгчийг шалгаж байна...
              </div>
            ) : null}
    
            {inviteUser && addPeopleForm.email.trim() ? (
              <div
                className={`historyInviteUserCard ${inviteUser.registered === false ? "guest" : "registered"}`}
              >
                <div className="historyInviteAvatar">
                  {inviteUser.registered === false
                    ? addPeopleForm.email.trim().charAt(0).toUpperCase()
                    : getParticipantInitials(inviteUser)}
                </div>
    
                <div className="historyInviteUserInfo">
                  <strong>
                    {inviteUser.registered === false
                      ? addPeopleForm.email.trim()
                      : getParticipantName(inviteUser)}
                  </strong>
    
                  <span>
                    {inviteUser.registered === false
                      ? "Registra бүртгэлгүй хэрэглэгч"
                      : getParticipantEmail(inviteUser) ||
                        addPeopleForm.email.trim()}
                  </span>
                </div>
    
                <div
                  className={`historyInviteStatus ${inviteUser.registered === false ? "guest" : "registered"}`}
                >
                  {inviteUser.registered === false
                    ? "Шинэ"
                    : "Registra хэрэглэгч"}
                </div>
              </div>
            ) : null}
    
            {inviteUser?.registered === false ? (
              <div className="historyInviteGuestNote">
                Урилгын и-мэйлтэй хамт Registra-д бүртгүүлэх холбоос
                илгээгдэнэ.
              </div>
            ) : null}
    
            {addPeopleError ? (
              <div className="historyMessage error">{addPeopleError}</div>
            ) : null}
    
            {addPeopleSuccess ? (
              <div className="historyMessage success">
                {addPeopleSuccess}
              </div>
            ) : null}
    
            <div className="historyInviteActions">
              <button
                type="button"
                className="historyInviteCancelBtn"
                disabled={addPeopleLoading}
                onClick={() => setShowAddPeople(false)}
              >
                Цуцлах
              </button>
    
              <button
                type="submit"
                className="historyInviteSubmitBtn"
                disabled={
                  addPeopleLoading ||
                  inviteLookupLoading ||
                  !isValidInviteEmail(addPeopleForm.email)
                }
              >
                {addPeopleLoading ? "Илгээж байна..." : "Урилга илгээх"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
