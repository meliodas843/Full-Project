import { formatTime, isoKey, meetingPersonName } from "./Calendar.helpers";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock } from "react-icons/fi";

// Extracted from Calendar.jsx; receives the page state it reads as props.
export default function CalendarMonth({
  byDay,
  events,
  eventsByDay,
  goNextMonth,
  goPreviousMonth,
  grid,
  myMeetings,
  pendingInbox,
  selectedKey,
  setSelectedDate,
  title,
}) {
  return (
    <div className="calMain">
      <div className="calToolbar">
        <div className="calMonthNav">
          <button type="button" onClick={goPreviousMonth}>
            <FiChevronLeft />
          </button>
    
          <button type="button" onClick={goNextMonth}>
            <FiChevronRight />
          </button>
    
          <h2>{title}</h2>
        </div>
    
        <div className="calLegend">
          <span>
            <i className="eventDot" /> Эвэнт · {events.length}
          </span>
    
          <span>
            <i className="meetingDot" /> Уулзалт · {myMeetings.length}
          </span>
    
          <span>
            <i className="pendingDot" /> Хүлээгдэж буй ·{" "}
            {pendingInbox.length}
          </span>
        </div>
      </div>
    
      <div className="calWeekdays">
        {[
          "ДАВАА",
    
          "МЯГМАР",
    
          "ЛХАГВА",
    
          "ПҮРЭВ",
    
          "БААСАН",
    
          "БЯМБА",
    
          "НЯМ",
        ].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    
      <div className="calGrid">
        {grid.map((date, index) => {
          if (!date) {
            return (
              <div
                className="calCell calCellEmpty"
                key={`empty-${index}`}
              />
            );
          }
    
          const key = isoKey(date);
    
          const meetings = byDay[key] || [];
    
          const dayEvents = eventsByDay[key] || [];
    
          const active = key === selectedKey;
    
          const today = key === isoKey(new Date());
    
          return (
            <button
              type="button"
              key={key}
              className={`calCell ${active ? "selected" : ""} ${today ? "today" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="calDayNumber">{date.getDate()}</span>
    
              <div className="calCellItems">
                {dayEvents.slice(0, 2).map((event) => (
                  <span
                    className="calItem event"
                    key={`event-${event.id}`}
                  >
                    <FiCalendar />
                    {formatTime(
                      event.start_time || event.start_date,
                    )}{" "}
                    {event.title || "Эвэнт"}
                  </span>
                ))}
    
                {meetings
    
                  .slice(0, Math.max(0, 3 - dayEvents.length))
    
                  .map((meeting) => (
                    <span
                      className={`calItem ${
                        String(meeting.status || "").toLowerCase() ===
                        "pending"
                          ? "pending"
                          : "meeting"
                      }`}
                      key={`meeting-${meeting.id}-${meeting.start_time}`}
                    >
                      <FiClock />
                      {formatTime(meeting.start_time)}{" "}
                      {meeting.title || meetingPersonName(meeting)}
                    </span>
                  ))}
    
                {dayEvents.length + meetings.length > 3 && (
                  <small>
                    +{dayEvents.length + meetings.length - 3} бусад
                  </small>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
