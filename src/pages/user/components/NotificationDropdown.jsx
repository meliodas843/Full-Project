import { formatDateTime, getNotificationKey, getRequestId } from "./Topbar.helpers";
import { FiTrash2 } from "react-icons/fi";

// Extracted from Topbar.jsx; receives the page state it reads as props.
export default function NotificationDropdown({
  bellMenuRef,
  bellPosition,
  deleteNotification,
  deletingId,
  loading,
  openNotification,
  pending,
}) {
  return (
    <div
      ref={bellMenuRef}
      className="rgDropdown rgNotificationDropdown"
      style={{
        position: "fixed",
    
        top: bellPosition.top,
    
        left: bellPosition.left,
    
        width: bellPosition.width,
    
        zIndex: 99999,
      }}
    >
      <div className="rgNotificationHeader">
        <h4>Notifications</h4>
    
        {loading && pending.length > 0 && (
          <span className="rgNotificationRefreshing">Уншиж байна...</span>
        )}
      </div>
    
      {loading && pending.length === 0 ? (
        <div className="rgNotificationEmpty">Уншиж байна...</div>
      ) : pending.length === 0 ? (
        <div className="rgNotificationEmpty">Шинэ мэдэгдэл байхгүй.</div>
      ) : (
        <div className="rgNotificationList">
          {pending
    
            .slice(
              0,
    
              10,
            )
    
            .map(
              (
                item,
    
                index,
              ) => {
                const requestId = getRequestId(item);
    
                const isDeleting =
                  String(deletingId) === String(requestId);
    
                return (
                  <div
                    className="rgNotificationItemRow"
                    key={getNotificationKey(
                      item,
    
                      index,
                    )}
                  >
                    <button
                      type="button"
                      className="rgNotificationItem"
                      onClick={() => openNotification(item)}
                    >
                      <span className="rgNotificationBullet" />
    
                      <span className="rgNotificationContent">
                        <strong>
                          {item.title ||
                            item.event_title ||
                            item.meeting_title ||
                            "Notification"}
                        </strong>
    
                        {(item.start_time || item.created_at) && (
                          <small>
                            {formatDateTime(
                              item.start_time || item.created_at,
                            )}
                          </small>
                        )}
                      </span>
                    </button>
    
                    <button
                      type="button"
                      className="rgNotificationDelete"
                      title="Мэдэгдэл устгах"
                      aria-label="Мэдэгдэл устгах"
                      disabled={isDeleting}
                      onClick={(event) =>
                        deleteNotification(
                          item,
    
                          event,
                        )
                      }
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              },
            )}
        </div>
      )}
    </div>
  );
}
