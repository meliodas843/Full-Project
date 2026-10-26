import { EVENT_STATUS_LABELS, formatDateTime, getEventImage, getEventStatus } from "./History.helpers";
import { createPortal } from "react-dom";
import { FiImage, FiMoreVertical, FiTrash2 } from "react-icons/fi";

// Extracted from History.jsx; receives the page state it reads as props.
export default function MyEventCard({
  deleteEvent,
  deletingId,
  event,
  menuPosition,
  navigate,
  openEdit,
  openMenuId,
  openView,
  setMenuPosition,
  setOpenMenuId,
}) {
  return (
    <article className="myEventCard" key={event.id}>
      <button
        className="myEventImageButton"
        onClick={() => openView(event)}
      >
        <img src={getEventImage(event)} alt={event.title} />
    
        <span
          className={`myEventStatusBadge ${getEventStatus(event)}`}
        >
          {EVENT_STATUS_LABELS[getEventStatus(event)]}
        </span>
      </button>
    
      <div className="myEventBody">
        <h3>{event.title}</h3>
    
        <p>{formatDateTime(event.start_time)}</p>
    
        <div className="myEventActions">
          {getEventStatus(event) === "ended" ? (
            <>
              <button
                type="button"
                className="myEventStatisticsBtn"
                onClick={() =>
                  navigate(`/user/history/${event.id}/statistics`)
                }
              >
                Статистик
              </button>
    
              <button
                type="button"
                onClick={() => openView(event)}
              >
                Харах
              </button>
    
              <div className="endedEventMenuWrap">
                <button
                  type="button"
                  className="endedEventMoreBtn"
                  aria-label="More"
                  aria-expanded={openMenuId === event.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
    
                    if (openMenuId === event.id) {
                      setOpenMenuId(null);
    
                      setMenuPosition(null);
    
                      return;
                    }
    
                    const rect =
                      e.currentTarget.getBoundingClientRect();
    
                    const menuWidth = 155;
    
                    const gap = 10;
    
                    const spaceOnRight =
                      window.innerWidth - rect.right;
    
                    const left =
                      spaceOnRight >= menuWidth + gap
                        ? rect.right + gap
                        : Math.max(
                            8,
    
                            rect.left - menuWidth - gap,
                          );
    
                    const top = Math.min(
                      rect.top,
    
                      window.innerHeight - 105,
                    );
    
                    setMenuPosition({
                      top: Math.max(8, top),
    
                      left,
                    });
    
                    setOpenMenuId(event.id);
                  }}
                >
                  <FiMoreVertical size={20} />
                </button>
    
                {openMenuId === event.id &&
                menuPosition &&
                typeof document !== "undefined"
                  ? createPortal(
                      <div
                        className="endedEventMenu"
                        style={{
                          top: `${menuPosition.top}px`,
    
                          left: `${menuPosition.left}px`,
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="endedEventMenuItem endedEventImageItem"
                          onClick={() => {
                            setOpenMenuId(null);
    
                            setMenuPosition(null);
    
                            navigate(
                              `/user/history/${event.id}/images`,
                            );
                          }}
                        >
                          <FiImage size={17} />
    
                          <span>Зураг оруулах</span>
                        </button>
    
                        <button
                          type="button"
                          className="endedEventMenuItem endedEventDeleteItem"
                          disabled={deletingId === event.id}
                          onClick={() => {
                            setOpenMenuId(null);
    
                            setMenuPosition(null);
    
                            deleteEvent(event);
                          }}
                        >
                          <FiTrash2 size={17} />
    
                          <span>
                            {deletingId === event.id
                              ? "Устгаж байна..."
                              : "Устгах"}
                          </span>
                        </button>
                      </div>,
    
                      document.body,
                    )
                  : null}
              </div>
            </>
          ) : (
            <>
              {getEventStatus(event) === "draft" ? (
                <button
                  type="button"
                  onClick={() => openEdit(event)}
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/user/events/${event.id}/checkin`)
                  }
                >
                  Check-in
                </button>
              )}
    
              <button
                type="button"
                onClick={() => openView(event)}
              >
                View
              </button>
    
              <button
                type="button"
                onClick={() => deleteEvent(event)}
                disabled={deletingId === event.id}
              >
                {deletingId === event.id ? "..." : <FiTrash2 />}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
