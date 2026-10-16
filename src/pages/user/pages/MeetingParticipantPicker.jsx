import { getDisplayName, getInitials } from "./Meeting.helpers";
import { FiCheck, FiSearch, FiUsers, FiX } from "react-icons/fi";

// Extracted from Meeting.jsx; receives the page state it reads as props.
export default function MeetingParticipantPicker({
  company,
  companySearch,
  employeesFiltered,
  eventPeopleFiltered,
  eventSearch,
  findSelectedPerson,
  loadingPeople,
  mode,
  people,
  removeSelected,
  selectAllCompanyPeople,
  selectAllEventPeople,
  selectedAll,
  selectedEmails,
  selectedEventId,
  setCompanySearch,
  setEventSearch,
  toggleCompanyPerson,
  toggleEventPerson,
}) {
  return (
    <section className="rgMeetingSection">
      <div className="rgMeetingPeopleHeader">
        <div>
          <h3>
            <FiUsers />
            Оролцогч сонгох
          </h3>
    
          <p>
            {selectedEmails.length}
            {" "}хүн сонгогдсон
          </p>
        </div>
    
        {people.length > 0 && (
          <button
            type="button"
            className="rgMeetingSelectAll"
            onClick={
              mode === "event"
                ? selectAllEventPeople
                : selectAllCompanyPeople
            }
          >
            <FiCheck />
    
            {selectedAll
              ? "Бүгдийг болиулах"
              : "Бүгдийг сонгох"}
          </button>
        )}
      </div>
    
      {selectedEmails.length >
        0 && (
        <div className="rgMeetingSelected">
          {selectedEmails.map(
            (email) => {
              const person =
                findSelectedPerson(
                  email,
                );
    
              return (
                <div
                  key={email}
                  className="rgMeetingSelectedChip"
                >
                  <span>
                    {getInitials(
                      person || {
                        email,
                      },
                    )}
                  </span>
    
                  <div>
                    <strong>
                      {getDisplayName(
                        person || {
                          email,
                        },
                      )}
                    </strong>
    
                    <small>
                      {email}
                    </small>
                  </div>
    
                  <button
                    type="button"
                    onClick={() =>
                      removeSelected(
                        email,
                      )
                    }
                  >
                    <FiX />
                  </button>
                </div>
              );
            },
          )}
        </div>
      )}
    
      {(mode === "event" &&
        selectedEventId) ||
      (mode === "company" &&
        company) ? (
        <>
          <div className="rgMeetingSearch">
            <FiSearch />
    
            <input
              value={
                mode === "event"
                  ? eventSearch
                  : companySearch
              }
              onChange={(event) => {
                if (
                  mode === "event"
                ) {
                  setEventSearch(
                    event.target.value,
                  );
                } else {
                  setCompanySearch(
                    event.target.value,
                  );
                }
              }}
              placeholder="Нэр эсвэл и-мэйлээр хайх..."
            />
    
            {(mode === "event"
              ? eventSearch
              : companySearch) && (
              <button
                type="button"
                onClick={() => {
                  if (
                    mode ===
                    "event"
                  ) {
                    setEventSearch(
                      "",
                    );
                  } else {
                    setCompanySearch(
                      "",
                    );
                  }
                }}
              >
                <FiX />
              </button>
            )}
          </div>
    
          {loadingPeople ? (
            <div className="rgMeetingPeopleEmpty">
              Оролцогчдыг
              ачаалж байна...
            </div>
          ) : (
            <div className="rgMeetingPeopleGrid">
              {(mode === "event"
                ? eventPeopleFiltered
                : employeesFiltered
              ).map((person) => {
                const email =
                  person?.email;
    
                const checked =
                  selectedEmails.includes(
                    email,
                  );
    
                return (
                  <button
                    type="button"
                    key={
                      person?.id ||
                      email
                    }
                    className={
                      checked
                        ? "rgMeetingPerson active"
                        : "rgMeetingPerson"
                    }
                    onClick={() => {
                      if (
                        mode ===
                        "event"
                      ) {
                        toggleEventPerson(
                          email,
                        );
                      } else {
                        toggleCompanyPerson(
                          email,
                        );
                      }
                    }}
                  >
                    <span className="rgMeetingPersonAvatar">
                      {getInitials(
                        person,
                      )}
                    </span>
    
                    <span className="rgMeetingPersonInfo">
                      <strong>
                        {getDisplayName(
                          person,
                        )}
                      </strong>
    
                      <small>
                        {person.email}
                      </small>
                    </span>
    
                    <span className="rgMeetingPersonCheck">
                      {checked && (
                        <FiCheck />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
    
          {!loadingPeople &&
            (mode === "event"
              ? eventPeopleFiltered
              : employeesFiltered
            ).length === 0 && (
              <div className="rgMeetingPeopleEmpty">
                Хэрэглэгч
                олдсонгүй.
              </div>
            )}
        </>
      ) : (
        <div className="rgMeetingPeopleEmpty">
          {mode === "event"
            ? "Эхлээд эвент сонгоно уу."
            : "Эхлээд байгууллага сонгоно уу."}
        </div>
      )}
    </section>
  );
}
