import { canEditEvent, fallbackImgSrc, formatDateTime, getInitials, getSpeakerAvatar, resolveUrl } from "./Event.helpers";

// Extracted from Event.jsx; receives the page state it reads as props.
export default function EventDetailView({
  bookedIds,
  handleBook,
  isEventFinished,
  navigate,
  openEdit,
  selectedAgendaItems,
  selectedEvent,
  selectedSpeakers,
  setSelectedEventId,
}) {
  return (
    <div className="eventDetailPage">
      <button
        type="button"
        className="eventDetailBack"
        onClick={() => setSelectedEventId(null)}
      >
        <span>←</span>
        Буцах
      </button>
    
      <div className="eventDetailHero">
        <img
          src={
            resolveUrl(selectedEvent.image_url) ||
            fallbackImgSrc(
              selectedEvent?.id || selectedEvent?.event_id || 0,
            )
          }
          alt={selectedEvent.title || "Эвент"}
          className="eventDetailHeroImage"
          onError={(e) => {
            e.currentTarget.src = fallbackImgSrc();
          }}
        />
    
        <div className="eventDetailHeroShade" />
    
        <div className="eventDetailHeroContent">
          <h1 className="eventDetailHeroTitle">
            {selectedEvent.title || "Нэргүй эвент"}
          </h1>
        </div>
    
        <span className="eventDetailStatus">
          {isEventFinished(selectedEvent)
            ? "Дууссан"
            : bookedIds.includes(Number(selectedEvent.id))
              ? "Бүртгэгдсэн"
              : "Нийтлэгдсэн"}
        </span>
      </div>
    
      <div className="eventDetailLayout">
        <div className="eventDetailMain">
          <section className="eventDetailSection">
            <h2>Эвентийн тухай</h2>
    
            <p className="eventDetailDescription">
              {selectedEvent.description ||
                "Эвентийн тайлбар оруулаагүй байна."}
            </p>
          </section>
    
          <section className="eventDetailSection">
            <h2>Зохион байгуулагч</h2>
    
            <div className="eventOrganizer">
              <div className="eventOrganizerAvatar">
                {getInitials(
                  selectedEvent.created_by_name ||
                    selectedEvent.created_by_email ||
                    "Зохион байгуулагч",
                )}
              </div>
    
              <div className="eventOrganizerInfo">
                <strong>
                  {selectedEvent.created_by_name ||
                    selectedEvent.organizer_name ||
                    selectedEvent.created_by_email ||
                    "Зохион байгуулагч"}
                </strong>
    
                <span>Зохион байгуулагч</span>
              </div>
            </div>
          </section>
    
          {selectedSpeakers.length > 0 ? (
            <section className="eventDetailSection">
              <h2>Илтгэгчид</h2>
    
              <div className="eventDetailSpeakers">
                {selectedSpeakers.map(
                  (
                    speaker,
    
                    index,
                  ) => {
                    const avatar = getSpeakerAvatar(speaker);
    
                    return (
                      <div className="eventDetailSpeaker" key={index}>
                        <div className="eventDetailSpeakerAvatar">
                          {avatar ? (
                            <img
                              src={resolveUrl(avatar)}
                              alt={speaker.name || "Илтгэгч"}
                            />
                          ) : (
                            <span>
                              {getInitials(speaker.name || "Илтгэгч")}
                            </span>
                          )}
                        </div>
    
                        <div>
                          <strong>{speaker.name || "-"}</strong>
    
                          <span>{speaker.organization || ""}</span>
    
                          {speaker.topic ? (
                            <small>{speaker.topic}</small>
                          ) : null}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          ) : null}
    
          {selectedAgendaItems.length > 0 ? (
            <section className="eventDetailSection">
              <h2>Хөтөлбөр</h2>
    
              <div className="eventDetailAgenda">
                {selectedAgendaItems.map(
                  (
                    item,
    
                    index,
                  ) => (
                    <div className="eventDetailAgendaItem" key={index}>
                      <span>{item.time || "--:--"}</span>
    
                      <strong>{item.text || ""}</strong>
                    </div>
                  ),
                )}
              </div>
            </section>
          ) : null}
        </div>
    
        <aside className="eventDetailSidebar">
          <section className="eventDetailSideCard">
            <h2>Эвентийн мэдээлэл</h2>
    
            <div className="eventDetailInfoRow">
              <div className="eventDetailInfoIcon">📅</div>
    
              <div>
                <span>Эхлэх</span>
    
                <strong>
                  {formatDateTime(selectedEvent.start_time)}
                </strong>
    
                {selectedEvent.end_time ? (
                  <>
                    <span className="eventDetailInfoSub">Дуусах</span>
    
                    <strong>
                      {formatDateTime(selectedEvent.end_time)}
                    </strong>
                  </>
                ) : null}
              </div>
            </div>
          </section>
    
          <section className="eventDetailActionsCard">
            {canEditEvent(selectedEvent) ? (
              <>
                <button
                  type="button"
                  className="eventDetailEditBtn"
                  onClick={() => openEdit(selectedEvent)}
                >
                  Мэдээлэл засах
                </button>
              </>
            ) : (
              <button
                type="button"
                className="eventDetailManageBtn"
                onClick={() => {
                  if (bookedIds.includes(Number(selectedEvent.id))) {
                    navigate(`/user/event-ticket/${selectedEvent.id}`);
                  } else {
                    handleBook(selectedEvent);
                  }
                }}
              >
                {bookedIds.includes(Number(selectedEvent.id))
                  ? "QR код харах"
                  : "Бүртгүүлэх"}
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
