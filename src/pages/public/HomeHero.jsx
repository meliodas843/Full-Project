import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiClock, FiSearch, FiVideo } from "react-icons/fi";
import { API_BASE, getImageSrc } from "../../lib/config";
import AnimatedNumber from "./AnimatedNumber";
import "./homeHero.css";

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const DEFAULT_COVER = "/registra-default-images/event-covers/event-cover-general.svg";
const BACK_COVERS = [
  "/registra-default-images/event-covers/event-cover-ai.svg",
  "/registra-default-images/event-covers/event-cover-devops.svg",
];
const AVATARS = [
  ["БО", "#8656ee"],
  ["ЭА", "#20bfe0"],
  ["ТГ", "#ff7a59"],
];

const toDate = (value) => new Date(String(value || "").replace(" ", "T"));
const pad = (n) => String(n).padStart(2, "0");
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const initial = (name) => String(name || "?").trim().charAt(0).toUpperCase();

// Home page hero: search, and a card for the next upcoming public event. A
// super admin can replace the card image in Тохиргоо.
export default function HomeHero({ events }) {
  const navigate = useNavigate();
  const gradientId = useId().replace(/:/g, "");
  const [query, setQuery] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/site/home`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setHeroImage(data.heroImage || ""))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const upcoming = events
    .filter((ev) => String(ev.visibility || "public").toLowerCase() !== "private")
    .filter((ev) => toDate(ev.end_time || ev.start_time).getTime() > now)
    .sort((a, b) => toDate(a.start_time) - toDate(b.start_time));

  const event = upcoming[0];
  const start = event ? toDate(event.start_time) : null;
  const end = event?.end_time ? toDate(event.end_time) : null;
  const booked = Number(event?.booked_count) || 0;
  const capacity = Number(event?.max_participants) || 0;
  const filled = capacity ? Math.min(1, booked / capacity) : 0;
  const cover = heroImage || event?.image_url || DEFAULT_COVER;
  const backCovers = [1, 2].map((i, k) => upcoming[i]?.image_url || BACK_COVERS[k]);

  function search(e) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/events?q=${encodeURIComponent(q)}` : "/events");
  }

  return (
    <section className="hh">
      <div className="hhAurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="hhGrid" aria-hidden="true" />

      <div className="riContainer hhLayout">
        <div className="hhCopy">
          <Link to="/events" className="hhNew">
            <b>ШИНЭ</b> Эвэнтийн дараа 1:1 Zoom уулзалт <FiArrowRight />
          </Link>

          <h1>
            Монголын IT
            <br />
            эвэнтүүд{" "}
            <span className="hhGradient">
              нэг дор
              <svg viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`${gradientId}-u`} x1="0" x2="1">
                    <stop offset="0" stopColor="#5847ee" />
                    <stop offset="1" stopColor="#20bfe0" />
                  </linearGradient>
                </defs>
                <path d="M4 15 C70 5 150 3 296 11" fill="none" stroke={`url(#${gradientId}-u)`} strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="hhLead">
            Хурал, workshop, meetup-аа олж бүртгүүл. Эвэнтийн дараа хэрэгтэй хүмүүстэйгээ 1:1 Zoom уулзалт товлоорой.
          </p>

          <form className="hhSearch" role="search" onSubmit={search}>
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Эвэнт эсвэл байгууллага хайх..."
              aria-label="Эвэнт хайх"
            />
            <button type="submit">Хайх</button>
          </form>

          <div className="hhStats">
            <div className="hhAvatars" aria-hidden="true">
              {AVATARS.map(([text, color]) => (
                <span key={text} style={{ background: color }}>
                  {text}
                </span>
              ))}
            </div>
            <div>
              <strong>
                <AnimatedNumber value={5200} suffix="+" />
              </strong>
              <span>хэрэглэгч</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>
                <AnimatedNumber value={340} />
              </strong>
              <span>эвэнт</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>
                <AnimatedNumber value={98} suffix="%" />
              </strong>
              <span>сэтгэл ханамж</span>
            </div>
          </div>
        </div>

        <div className="hhStage">
          {backCovers.map((src, i) => (
            <div key={i} className={`hhCard hhBack hhBack${i + 1}`} aria-hidden="true">
              <img src={getImageSrc(src, DEFAULT_COVER)} alt="" />
            </div>
          ))}

          <article className="hhCard hhMain">
            <div className="hhImage">
              <img
                src={getImageSrc(cover, DEFAULT_COVER)}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER;
                }}
              />
              {start ? (
                <div className="hhDate">
                  <small>{start.getMonth() + 1} САР</small>
                  <b>{start.getDate()}</b>
                  <span>{WEEKDAYS[start.getDay()]}</span>
                </div>
              ) : null}
              {event?.category ? <span className="hhCat">{event.category}</span> : null}
            </div>

            <div className="hhBody">
              <h3>{event?.title || "Шинэ эвэнтүүд удахгүй"}</h3>
              {event ? (
                <div className="hhMeta">
                  <span>
                    <FiClock /> {clock(start)}
                    {end ? ` – ${clock(end)}` : ""}
                  </span>
                  {event.organizer_name ? (
                    <span>
                      <i className="hhOrg">
                        {event.organizer_logo ? <img src={getImageSrc(event.organizer_logo)} alt="" /> : initial(event.organizer_name)}
                      </i>
                      {event.organizer_name}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="hhMeta">
                  <span>Нийтлэгдсэн эвэнтүүдийг үзээрэй.</span>
                </div>
              )}

              <div className="hhFoot">
                {event ? (
                  <div className="hhRing">
                    <svg viewBox="0 0 44 44" aria-hidden="true">
                      <defs>
                        <linearGradient id={`${gradientId}-r`}>
                          <stop offset="0" stopColor="#5847ee" />
                          <stop offset="1" stopColor="#20bfe0" />
                        </linearGradient>
                      </defs>
                      <circle className="hhRingTrack" cx="22" cy="22" r="18" />
                      <circle
                        className="hhRingFill"
                        cx="22"
                        cy="22"
                        r="18"
                        stroke={`url(#${gradientId}-r)`}
                        pathLength="100"
                        style={{ "--fill": capacity ? Math.max(3, Math.round(filled * 100)) : 100 }}
                      />
                    </svg>
                    <div>
                      <b>{capacity ? `${booked} / ${capacity}` : booked}</b>
                      {capacity ? "суудал дүүрсэн" : "бүртгүүлсэн"}
                    </div>
                  </div>
                ) : (
                  <span />
                )}
                <Link to={event ? `/events/${event.id}` : "/events"} className="hhRegister">
                  {event ? "Бүртгүүлэх" : "Эвэнтүүд үзэх"} <FiArrowRight />
                </Link>
              </div>
            </div>
          </article>

          {event ? (
            <div className="hhChip hhChipLive" aria-hidden="true">
              <i className="hhLive" />
              <div className="hhAvatars small">
                {AVATARS.map(([text, color]) => (
                  <span key={text} style={{ background: color }}>
                    {text}
                  </span>
                ))}
              </div>
              <div>
                <b>{booked > 0 ? `${booked} хүн` : "Бүртгэл"}</b>
                {booked > 0 ? "бүртгүүлсэн" : "нээлттэй"}
              </div>
            </div>
          ) : null}

          <div className="hhChip hhChipStats" aria-hidden="true">
            <div>
              <b>{upcoming.length} эвэнт</b>
              удахгүй болно
            </div>
            <svg viewBox="0 0 90 30">
              <path d="M2 26 C15 22 22 14 34 16 S55 6 66 9 S82 3 88 2" />
            </svg>
          </div>

          <div className="hhChip hhChipZoom" aria-hidden="true">
            <span className="hhZoomIcon">
              <FiVideo />
            </span>
            <div>
              <b>1:1 Zoom уулзалт</b>
              Эвэнтийн дараа
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
