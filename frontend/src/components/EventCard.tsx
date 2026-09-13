import { Link } from "react-router-dom";
import { EventItem } from "../types";
import "./EventCard.scss";

interface Props {
  event: EventItem;
}

export function EventCard({ event }: Props) {
  const date = new Date(event.startDate);
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-card__date">
        <span className="event-card__month">{month}</span>
        <span className="event-card__day">{day}</span>
        <span className="event-card__time">{time}</span>
      </div>
      <div className="event-card__stub" />
      <div className="event-card__body">
        <span className="event-card__category">{event.category}</span>
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__meta">
          {event.isOnline ? "Online" : event.location}
        </p>
        <div className="event-card__footer">
          <span>{event._count.rsvps} going</span>
          <span>by {event.organizer.name}</span>
        </div>
      </div>
    </Link>
  );
}
