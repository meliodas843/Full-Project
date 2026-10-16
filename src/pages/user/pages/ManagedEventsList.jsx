import { fallbackImgSrc, formatDateTime, resolveUrl } from "./Event.helpers";
import { FaCalendarDays, FaUsers } from "react-icons/fa6";

// Extracted from Event.jsx; receives the page state it reads as props.
export default function ManagedEventsList({
  eventSearch,
  eventSort,
  eventTab,
  handleAskCreate,
  loadingEvents,
  managedCounts,
  managedEvents,
  openDetail,
  setEventSearch,
  setEventSort,
  setEventTab,
}) {
  return (
    <div className="myEventsPage">
      <div
        className="myEventsPageHeading"
        style={{ marginBottom: 18 }}
      ></div>
    
      <div className="myEventsToolbar">
        <div className="myEventTabs">
          {[
            ["all", "Бүгд", managedCounts.all],
    
            [
              "participating",
              "Миний оролцож буй",
              managedCounts.participating,
            ],
    
            ["finished", "Дууссан", managedCounts.finished],
          ].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={eventTab === key ? "active" : ""}
              onClick={() => setEventTab(key)}
            >
              {label} · {count}
            </button>
          ))}
        </div>
    
        <div className="myEventTools">
          <label className="myEventSearch">
            <span>⌕</span>
    
            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Эвэнт хайх..."
            />
          </label>
    
          <select
            value={eventSort}
            onChange={(e) => setEventSort(e.target.value)}
          >
            <option value="newest">Шинэ нь эхэнд</option>
    
            <option value="oldest">Хуучин нь эхэнд</option>
          </select>
    
          <button
            type="button"
            className="createEventButton"
            onClick={handleAskCreate}
          >
            ＋ Эвэнт үүсгэх
          </button>
        </div>
      </div>
    
      {loadingEvents ? (
        <div className="myEventsEmpty">
          Эвэнтүүдийг ачаалж байна...
        </div>
      ) : managedEvents.length === 0 ? (
        <div className="myEventsEmpty">
          <strong>Эвент олдсонгүй</strong>
    
          <span>Хайлт эсвэл сонгосон төлвөө өөрчилж үзнэ үү.</span>
        </div>
      ) : (
        <div className="myEventCardGrid">
          {managedEvents.map((ev) => {
            const cover =
              resolveUrl(ev.image_url) ||
              fallbackImgSrc(ev?.id || ev?.event_id || 0);
    
            const registered =
              Number(
                ev.booked_count ??
                  ev.participants_count ??
                  ev.registered_count ??
                  ev.bookings_count ??
                  0,
              ) || 0;
    
            const max = Number(ev.max_participants || 0) || 0;
    
            const percent =
              max > 0
                ? Math.min(100, Math.round((registered / max) * 100))
                : 0;
    
            return (
              <article className="myEventCard" key={ev.id}>
                <button
                  type="button"
                  className="myEventCover"
                  onClick={() => openDetail(ev.id)}
                >
                  <img
                    src={cover}
                    alt={ev.title || "Эвэнт"}
                    onError={(e) => {
                      e.currentTarget.src = fallbackImgSrc();
                    }}
                  />
                </button>
    
                <div className="myEventCardBody">
                  <h3>{ev.title || "Нэргүй эвэнт"}</h3>
    
                  <div className="myEventCardMeta">
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FaCalendarDays size={13} aria-hidden="true" />
    
                      {formatDateTime(ev.start_time)}
                    </span>
    
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FaUsers size={13} aria-hidden="true" />
                      {registered}
                      {max > 0 ? ` / ${max}` : ""} оролцогч
                    </span>
                  </div>
    
                  {max > 0 ? (
                    <div className="myEventCapacity">
                      <div>
                        <span>Бөглөсөн</span>
    
                        <b>{percent}%</b>
                      </div>
    
                      <i>
                        <em style={{ width: `${percent}%` }} />
                      </i>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
