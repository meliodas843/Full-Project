import React, { useState } from "react";

const sampleEvents = [
  {
    id: 1,
    name: "Music Concert",
    description: "Experience live music with top artists from around the world.",
    dateTime: "2026-02-25 19:00",
    img: "https://source.unsplash.com/400x250/?concert",
  },
  {
    id: 2,
    name: "Art Exhibition",
    description: "Explore breathtaking art pieces by local and international artists.",
    dateTime: "2026-03-01 10:00",
    img: "https://source.unsplash.com/400x250/?art",
  },
  {
    id: 3,
    name: "Food Festival",
    description: "Taste a variety of delicious dishes from different cultures.",
    dateTime: "2026-03-10 12:00",
    img: "https://source.unsplash.com/400x250/?food",
  },
];

export default function Events() {
  const [events] = useState(sampleEvents);

  const handleBook = (event) => {
    alert(`You booked: ${event.name} on ${event.dateTime}`);
  };

  return (
    <section className="events-section">
      <h2 className="events-title">Upcoming Events</h2>
      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <div className="event-image-wrapper">
              <img src={event.img} alt={event.name} className="event-image" />
              <div className="event-date">
                {new Date(event.dateTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <div className="event-content">
              <h3 className="event-name">{event.name}</h3>
              <p className="event-description">{event.description}</p>
              <p className="event-time">
                <strong>Time:</strong>{" "}
                {new Date(event.dateTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <button className="book-btn" onClick={() => handleBook(event)}>
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
