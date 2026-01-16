import EventCard from "../components/EventCard";

export default function Events() {
  return (
    <div className="page">
      <h2>Available Events</h2>

      <div className="event-grid">
        <EventCard title="Team Meeting" date="June 12" time="30 min" />
        <EventCard title="Client Call" date="June 14" time="45 min" />
        <EventCard title="Interview" date="June 16" time="1 hour" />
      </div>
    </div>
  );
}
