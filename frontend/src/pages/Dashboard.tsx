import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { EventItem, RsvpWithEvent } from "../types";
import "./Dashboard.scss";

export function Dashboard() {
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [myRsvps, setMyRsvps] = useState<RsvpWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<EventItem[]>("/users/me/events"),
      api.get<RsvpWithEvent[]>("/users/me/rsvps"),
    ]).then(([events, rsvps]) => {
      setMyEvents(events);
      setMyRsvps(rsvps);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="page container">Loading…</div>;
  }

  return (
    <div className="page dashboard container">
      <div className="dashboard__head">
        <h1>Your dashboard</h1>
        <Link to="/events/new" className="btn btn-primary">
          Host an event
        </Link>
      </div>

      <section className="dashboard__section">
        <h2>Events you host</h2>
        {myEvents.length === 0 && (
          <p className="dashboard__empty">
            You haven't hosted anything yet. Create your first event.
          </p>
        )}
        <ul className="dashboard__list">
          {myEvents.map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.id}`}>{event.title}</Link>
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
              <span>{event._count.rsvps} RSVPs</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard__section">
        <h2>Events you're attending</h2>
        {myRsvps.length === 0 && (
          <p className="dashboard__empty">
            No RSVPs yet. Browse events to find something you like.
          </p>
        )}
        <ul className="dashboard__list">
          {myRsvps.map((rsvp) => (
            <li key={rsvp.id}>
              <Link to={`/events/${rsvp.event.id}`}>{rsvp.event.title}</Link>
              <span>{new Date(rsvp.event.startDate).toLocaleDateString()}</span>
              <span className={`dashboard__status dashboard__status--${rsvp.status.toLowerCase()}`}>
                {rsvp.status.replace("_", " ").toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
