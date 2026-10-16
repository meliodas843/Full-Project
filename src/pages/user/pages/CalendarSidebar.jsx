import { formatTime, meetingPersonName, personInitials } from "./Calendar.helpers";
import { FiCalendar, FiCheck, FiEdit3, FiPlus, FiVideo, FiX } from "react-icons/fi";

// Extracted from Calendar.jsx; receives the page state it reads as props.
export default function CalendarSidebar({
  loading,
  message,
  openEditMeeting,
  openMeetingCreate,
  openZoomMeeting,
  pendingInbox,
  respondToMeeting,
  respondingId,
  selectedDateLabel,
  selectedEvents,
  selectedMeetings,
}) {
  return (
    <aside className="calRight">
      <section className="calSideCard">
        <div className="calSideHeading">
          <div>
            <small>СОНГОСОН ӨДӨР</small>
    
            <h3>{selectedDateLabel}</h3>
          </div>
        </div>
    
        <div className="calSchedule">
          {selectedEvents.length === 0 &&
          selectedMeetings.length === 0 ? (
            <div className="calEmpty">Энэ өдөр товлосон зүйл алга.</div>
          ) : (
            <>
              {selectedEvents.map((event) => (
                <article
                  className="calScheduleItem event"
                  key={`side-event-${event.id}`}
                >
                  <div className="calScheduleTime">
                    {formatTime(event.start_time || event.start_date)}
                  </div>
    
                  <div className="calScheduleBody">
                    <strong>{event.title || "Эвэнт"}</strong>
    
                    <span>
                      {event.location || event.address || "Эвэнт"}
                    </span>
                  </div>
    
                  <span className="calVideoIcon">
                    <FiCalendar />
                  </span>
                </article>
              ))}
    
              {selectedMeetings.map((meeting) => (
                <article
                  className={`calScheduleItem ${
                    String(meeting.status || "").toLowerCase() ===
                    "pending"
                      ? "pending"
                      : "meeting"
                  }`}
                  key={`side-meeting-${meeting.id}-${meeting.start_time}`}
                >
                  <div className="calScheduleTime">
                    {formatTime(meeting.start_time)}
                  </div>
    
                  <div className="calAvatar">
                    {personInitials(meetingPersonName(meeting))}
                  </div>
    
                  <div className="calScheduleBody">
                    <strong>{meetingPersonName(meeting)}</strong>
    
                    <span>{meeting.title || "1:1 уулзалт"}</span>
                  </div>
    
                  <button
                    type="button"
                    className="calVideoIcon"
                    onClick={() => openZoomMeeting(meeting)}
                    disabled={
                      String(meeting?.status || "").toLowerCase() !==
                        "accepted" || !meeting?.zoom_join_url
                    }
                    title={
                      String(meeting?.status || "").toLowerCase() ===
                        "accepted" && meeting?.zoom_join_url
                        ? "Zoom уулзалтад орох"
                        : "Zoom холбоос хараахан бэлэн болоогүй"
                    }
                  >
                    <FiVideo />
                  </button>
                </article>
              ))}
            </>
          )}
        </div>
    
        <button
          type="button"
          className="calAddMeeting"
          onClick={openMeetingCreate}
        >
          <FiPlus />
          Сул цаг — уулзалт товлох
        </button>
      </section>
    
      <section className="calSideCard calRequests">
        <div className="calRequestHeader">
          <h3>Хүсэлтүүд</h3>
    
          <span>Ирсэн · {pendingInbox.length}</span>
        </div>
    
        {loading ? (
          <div className="calEmpty">Уншиж байна...</div>
        ) : pendingInbox.length === 0 ? (
          <div className="calEmpty">Хүлээгдэж буй хүсэлт алга.</div>
        ) : (
          <div className="calRequestList">
            {pendingInbox.slice(0, 5).map((meeting) => {
              const busy = respondingId === meeting.id;
    
              const name = meetingPersonName(meeting);
    
              return (
                <article className="calRequest" key={meeting.id}>
                  <div className="calAvatar">{personInitials(name)}</div>
    
                  <div className="calRequestInfo">
                    <strong>{name}</strong>
    
                    <span>
                      {formatTime(meeting.start_time)} ·{" "}
                      {meeting.title || "Уулзалт"}
                    </span>
                  </div>
    
                  <div className="calRequestActions">
                    <button
                      type="button"
                      className="edit"
                      disabled={busy}
                      onClick={() => openEditMeeting(meeting)}
                      title="Цаг өөрчлөх"
                    >
                      <FiEdit3 />
                    </button>
    
                    <button
                      type="button"
                      className="decline"
                      disabled={busy}
                      onClick={() =>
                        respondToMeeting(meeting, "declined")
                      }
                      title="Татгалзах"
                    >
                      <FiX />
                    </button>
    
                    <button
                      type="button"
                      className="accept"
                      disabled={busy}
                      onClick={() =>
                        respondToMeeting(meeting, "accepted")
                      }
                      title="Зөвшөөрөх"
                    >
                      <FiCheck />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    
      {message && <div className="calMessage">{message}</div>}
    </aside>
  );
}
