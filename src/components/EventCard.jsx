import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FaCalendarDays,
  FaLocationDot,
  FaUsers,
  FaCircleCheck,
} from "react-icons/fa6";
import { getImageSrc } from "../lib/config";
import eventFallback from "../assets/event.png";

const CATEGORY_MAP = {
  Технологи: {
    label: "Технологи",
    className: "technology",
  },

  Technology: {
    label: "Технологи",
    className: "technology",
  },

  Бизнес: {
    label: "Бизнес",
    className: "business",
  },

  Business: {
    label: "Бизнес",
    className: "business",
  },

  Боловсрол: {
    label: "Боловсрол",
    className: "education",
  },

  Education: {
    label: "Боловсрол",
    className: "education",
  },

  "Хурал, конференц": {
    label: "Хурал, конференц",
    className: "conference",
  },

  Conference: {
    label: "Хурал, конференц",
    className: "conference",
  },

  Сургалт: {
    label: "Сургалт",
    className: "workshop",
  },

  Workshop: {
    label: "Сургалт",
    className: "workshop",
  },

  "Танилцах, харилцаа холбоо": {
    label: "Networking",
    className: "networking",
  },

  Networking: {
    label: "Networking",
    className: "networking",
  },

  Нийгэмлэг: {
    label: "Нийгэмлэг",
    className: "community",
  },

  Community: {
    label: "Нийгэмлэг",
    className: "community",
  },

  Спорт: {
    label: "Спорт",
    className: "sports",
  },

  Sport: {
    label: "Спорт",
    className: "sports",
  },

  Sports: {
    label: "Спорт",
    className: "sports",
  },

  Энтертайнмент: {
    label: "Энтертайнмент",
    className: "entertainment",
  },

  Entertainment: {
    label: "Энтертайнмент",
    className: "entertainment",
  },
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  const raw = String(value)
    .trim()
    .replace("T", " ")
    .replace(/Z$/, "");

  const datePart =
    raw.split(" ")[0];

  if (!datePart) {
    return "";
  }

  const [year, month, day] =
    datePart
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "mn-MN",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function getCategoryInfo(event) {
  const raw = String(
    event?.category ||
      event?.badge ||
      "",
  ).trim();

  if (!raw) {
    return null;
  }

  if (CATEGORY_MAP[raw]) {
    return CATEGORY_MAP[raw];
  }

  return {
    label: raw,
    className: "default",
  };
}

export default function EventCard({
  event,
  joined = false,
  onBook,
  onOpen,
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const bookedCount =
    Number(
      event?.booked_count ||
        0,
    );

  const capacity =
    Number(
      event?.max_participants ||
        0,
    );

  const remaining =
    Math.max(
      0,
      capacity -
        bookedCount,
    );

  const categoryInfo =
    getCategoryInfo(event);

  const percentage =
    useMemo(() => {
      if (!capacity) {
        return Math.min(
          100,
          bookedCount
            ? 50
            : 0,
        );
      }

      return Math.min(
        100,
        Math.round(
          (
            bookedCount /
            capacity
          ) * 100,
        ),
      );
    }, [
      bookedCount,
      capacity,
    ]);

  const imageSrc =
    event?.image_url
      ? getImageSrc(
          event.image_url,
          eventFallback,
        )
      : eventFallback;

  function join(e) {
    e.stopPropagation();

    if (joined) {
      return;
    }

    const token =
      localStorage.getItem(
        "token",
      );

    if (!token) {
      navigate(
        "/login",
        {
          state: {
            from:
              location.pathname,
          },
        },
      );

      return;
    }

    onBook?.(event);
  }

  function openEvent() {
    onOpen?.(event);
  }

  function handleKeyDown(
    e,
  ) {
    if (
      e.key === "Enter" ||
      e.key === " "
    ) {
      e.preventDefault();

      openEvent();
    }
  }

  return (
    <article
      className={`riEventCard ${
        joined
          ? "riEventCardJoined"
          : ""
      }`}
      onClick={openEvent}
      role="button"
      tabIndex={0}
      onKeyDown={
        handleKeyDown
      }
    >
      <div className="riEventCardImage">
        <img
          src={imageSrc}
          alt={
            event?.title ||
            "Event"
          }
          onError={(e) => {
            e.currentTarget.onerror =
              null;

            e.currentTarget.src =
              eventFallback;
          }}
        />

        {categoryInfo && (
          <span
            className={`riCategory riCategory-${categoryInfo.className}`}
          >
            {
              categoryInfo.label
            }
          </span>
        )}

        {joined && (
          <div className="riJoinedBadge">
            <FaCircleCheck />

            <span>
              Бүртгүүлсэн
            </span>
          </div>
        )}
      </div>

      <div className="riEventCardBody">
        <h3>
          {event?.title ||
            "Untitled event"}
        </h3>

        <div className="riEventMeta">
          <span>
            <FaCalendarDays />

            {formatDate(
              event?.start_time,
            )}
          </span>

          <span>
            <FaLocationDot />

            {event?.location ||
              event?.venue ||
              event?.address ||
              "Улаанбаатар"}
          </span>
        </div>

        <div className="riEventProgress">
          <span
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>

        <div className="riEventCardBottom">
          <span>
            <FaUsers />

            {bookedCount}{" "}
            бүртгүүлсэн
          </span>

          {capacity > 0 && (
            <span>
              {remaining}{" "}
              суудал үлдсэн
            </span>
          )}
        </div>

        <button
          type="button"
          className={`riEventJoin ${
            joined
              ? "riEventJoinJoined"
              : ""
          }`}
          onClick={join}
          disabled={joined}
        >
          {joined ? (
            <>
              <FaCircleCheck />

              <span>
                Бүртгүүлсэн
              </span>
            </>
          ) : (
            "Оролцох"
          )}
        </button>
      </div>
    </article>
  );
}