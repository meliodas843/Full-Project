import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiUsers } from "react-icons/fi";
import { getImageSrc } from "../../lib/config";
import eventFallback from "../../assets/event.webp";
import "./homeSections.css";

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const SHOWN = 3;
const MAX_CHIPS = 4;

const toDate = (value) => new Date(String(value || "").replace(" ", "T"));
const pad = (n) => String(n).padStart(2, "0");

// "11.12, Пүрэв · 09:00"
function formatWhen(value) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}, ${WEEKDAYS[d.getDay()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const initial = (name) => String(name || "?").trim().charAt(0).toUpperCase();

// Upcoming public events, soonest first, with chips for the categories in use.
export default function HomeUpcoming({ events }) {
  const [category, setCategory] = useState("");
  // Taken once per visit; events that end while the page is open stay listed.
  const [now] = useState(() => Date.now());
  const upcoming = events
    .filter((ev) => toDate(ev.end_time || ev.start_time).getTime() > now)
    .sort((a, b) => toDate(a.start_time) - toDate(b.start_time));

  const counts = new Map();
  for (const ev of upcoming) {
    const name = String(ev.category || "").trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  const chips = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CHIPS)
    .map(([name]) => name);

  const shown = upcoming
    .filter((ev) => !category || String(ev.category || "").trim() === category)
    .slice(0, SHOWN);

  return (
    <section className="riSection riUpcomingSection" id="upcoming">
      <div className="riContainer">
        <div className="riUpcomingHead riRevealUp" data-ri-reveal>
          <div>
            <div className="riPill riPurplePill">ОНЦЛОХ ЭВЭНТ</div>
            <h2>Удахгүй болох эвэнтүүд</h2>
          </div>

          <div className="riUpcomingChips" role="group" aria-label="Ангилал">
            {chips.length ? (
              <>
                <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>
                  Бүгд
                </button>
                {chips.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={category === name ? "active" : ""}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                  </button>
                ))}
              </>
            ) : null}
            <Link to="/events" className="riUpcomingAll">
              Бүгдийг үзэх <FiArrowRight />
            </Link>
          </div>
        </div>

        {shown.length ? (
          <div className="riUpcomingGrid">
            {shown.map((ev, index) => {
              const booked = Number(ev.booked_count) || 0;
              const capacity = Number(ev.max_participants) || 0;
              const left = Math.max(capacity - booked, 0);
              const percent = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
              return (
                // Not part of Home's scroll reveal: the cards arrive after it has
                // collected its elements, so they would stay hidden.
                <Link
                  to={`/events/${ev.id}`}
                  className="riUpcomingCard"
                  key={ev.id}
                  style={{ "--ri-up-delay": `${index * 90}ms` }}
                >
                  <div className="riUpcomingMedia">
                    <img
                      src={getImageSrc(ev.image_url, eventFallback)}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = eventFallback;
                      }}
                    />
                    {ev.category ? <span className="riUpcomingBadge">{ev.category}</span> : null}
                  </div>

                  <div className="riUpcomingBody">
                    <h3>{ev.title}</h3>
                    <p className="riUpcomingMeta">
                      <FiCalendar /> {formatWhen(ev.start_time)}
                    </p>
                    {ev.organizer_name ? (
                      <p className="riUpcomingMeta">
                        <span className="riUpcomingOrg">
                          {ev.organizer_logo ? (
                            <img src={getImageSrc(ev.organizer_logo)} alt="" />
                          ) : (
                            initial(ev.organizer_name)
                          )}
                        </span>
                        {ev.organizer_name}
                      </p>
                    ) : null}

                    <div className="riUpcomingSeats">
                      <span>
                        <FiUsers /> {booked} бүртгүүлсэн
                      </span>
                      {capacity ? <strong>{left} суудал үлдсэн</strong> : <strong>Хязгааргүй</strong>}
                    </div>
                    <div className="riUpcomingBar" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="riUpcomingEmpty">Удахгүй болох нийтийн эвэнт одоогоор алга.</div>
        )}
      </div>
    </section>
  );
}
