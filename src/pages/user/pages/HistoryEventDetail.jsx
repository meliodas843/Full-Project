import { formatDateTime, getEventImage, isFinished } from "./History.helpers";
import { FiUserPlus, FiUsers } from "react-icons/fi";

// Extracted from History.jsx; receives the page state it reads as props.
export default function HistoryEventDetail({
  closeView,
  loadParticipants,
  openAddPeople,
  openEdit,
  selectedEvent,
  setShowParticipants,
  viewAgenda,
  viewSpeakers,
}) {
  return (
    <div className="eventDetailPage">
      <button
        type="button"
        className="eventDetailBack"
        onClick={closeView}
      >
        ← Миний эвентүүд рүү буцах
      </button>
    
      <div className="eventDetailHero">
        <img
          className="eventDetailHeroImage"
          src={getEventImage(selectedEvent)}
          alt={selectedEvent.title || "Эвент"}
        />
    
        <div className="eventDetailHeroShade" />
    
        <div className="eventDetailHeroContent">
          <span className="eventDetailTag">
            {selectedEvent.visibility || "Нийтийн"}
          </span>
    
          <h1>{selectedEvent.title}</h1>
        </div>
      </div>
    
      <div className="eventDetailLayout">
        <div className="eventDetailMain">
          <section className="eventDetailSection">
            <h2>Эвентийн тухай</h2>
    
            <p>{selectedEvent.description || "Тайлбар байхгүй."}</p>
          </section>
    
          {viewSpeakers.length > 0 ? (
            <section className="eventDetailSection">
              <h2>Илтгэгчид</h2>
    
              <div className="eventDetailSpeakers">
                {viewSpeakers.map(
                  (
                    speaker,
    
                    index,
                  ) => (
                    <div className="eventDetailSpeaker" key={index}>
                      <div className="eventDetailSpeakerAvatar">
                        {speaker.name
    
                          ?.charAt(0)
    
                          .toUpperCase()}
                      </div>
    
                      <div>
                        <strong>{speaker.name}</strong>
    
                        <span>{speaker.organization}</span>
    
                        <small>{speaker.topic}</small>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          ) : null}
    
          {viewAgenda.length > 0 ? (
            <section className="eventDetailSection">
              <h2>Хөтөлбөр</h2>
    
              {viewAgenda.map(
                (
                  item,
    
                  index,
                ) => (
                  <div className="eventDetailAgendaItem" key={index}>
                    <span>{item.time}</span>
    
                    <strong>{item.text}</strong>
                  </div>
                ),
              )}
            </section>
          ) : null}
        </div>
    
        <aside className="eventDetailSidebar">
          <section className="eventDetailSideCard">
            <h2>Эвентийн мэдээлэл</h2>
    
            <p>Эхлэх</p>
    
            <strong>{formatDateTime(selectedEvent.start_time)}</strong>
    
            <p>Дуусах</p>
    
            <strong>{formatDateTime(selectedEvent.end_time)}</strong>
          </section>
    
          <section className="eventDetailActionsCard">
            {!isFinished(selectedEvent) ? (
              <button
                type="button"
                className="eventDetailEditBtn"
                onClick={() => openEdit(selectedEvent)}
              >
                Эвент засах
              </button>
            ) : null}
    
            <button
              type="button"
              className="eventDetailAddPeopleBtn"
              onClick={openAddPeople}
            >
              <FiUserPlus />
              Хүн нэмэх
            </button>
    
            <button
              type="button"
              className="eventDetailAttendeesBtn"
              onClick={async () => {
                setShowParticipants(true);
    
                await loadParticipants(selectedEvent.id);
              }}
            >
              <FiUsers />
              Оролцогчдыг харах
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
