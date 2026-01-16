export default function EventCard({ title, date, time }) {
  return (
    <div className="event-card">
      <h3>{title}</h3>
      <span>{date}</span>
      <span>{time}</span>
      <button className="btn">Book</button>
    </div>
  );
}
