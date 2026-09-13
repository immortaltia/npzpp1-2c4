import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Attendee, EventItem, Review, Rsvp, RsvpStatus } from "../types";
import "./EventDetail.scss";

const STATUS_LABELS: Record<RsvpStatus, string> = {
  GOING: "Going",
  INTERESTED: "Interested",
  NOT_GOING: "Not going",
};

export function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRsvp, setMyRsvp] = useState<Rsvp | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, user]);

  async function load() {
    setLoading(true);
    const [eventData, attendeeData, reviewData] = await Promise.all([
      api.get<EventItem>(`/events/${id}`),
      api.get<Attendee[]>(`/events/${id}/attendees`),
      api.get<Review[]>(`/events/${id}/reviews`),
    ]);
    setEvent(eventData);
    setAttendees(attendeeData);
    setReviews(reviewData);

    if (user) {
      const rsvp = await api.get<Rsvp | null>(`/events/${id}/rsvp/me`);
      setMyRsvp(rsvp);
    } else {
      setMyRsvp(null);
    }
    setLoading(false);
  }

  async function handleRsvp(status: RsvpStatus) {
    if (!user) {
      navigate("/login");
      return;
    }
    setRsvpBusy(true);
    try {
      const rsvp = await api.post<Rsvp>(`/events/${id}/rsvp`, { status });
      setMyRsvp(rsvp);
      const attendeeData = await api.get<Attendee[]>(`/events/${id}/attendees`);
      setAttendees(attendeeData);
    } finally {
      setRsvpBusy(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm("Cancel and delete this event permanently?")) return;
    await api.delete(`/events/${event.id}`);
    navigate("/dashboard");
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const review = await api.post<Review>(`/events/${id}/reviews`, {
        rating,
        comment,
      });
      setReviews((prev) => [review, ...prev]);
      setComment("");
      setRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not post review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading || !event) {
    return <div className="page container">Loading…</div>;
  }

  const isOwner = user?.id === event.organizerId;
  const date = new Date(event.startDate);
  const tags = event.tags.split(",").filter(Boolean);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="page event-detail container">
      <div className="event-detail__header">
        <div>
          <span className="event-detail__category">{event.category}</span>
          <h1>{event.title}</h1>
          <p className="event-detail__meta">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            ·{" "}
            {date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="event-detail__meta">
            {event.isOnline ? "Online event" : event.location}
          </p>
          <p className="event-detail__meta">Hosted by {event.organizer.name}</p>
        </div>

        {isOwner && (
          <div className="event-detail__owner-actions">
            <Link to={`/events/${event.id}/edit`} className="btn btn-outline">
              Edit
            </Link>
            <button className="btn btn-ghost" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="event-detail__tags">
          {tags.map((tag) => (
            <span key={tag} className="event-detail__tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {!isOwner && (
        <div className="event-detail__rsvp">
          {(["GOING", "INTERESTED", "NOT_GOING"] as RsvpStatus[]).map((status) => (
            <button
              key={status}
              className={
                myRsvp?.status === status
                  ? "btn btn-primary"
                  : "btn btn-outline"
              }
              disabled={rsvpBusy}
              onClick={() => handleRsvp(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}

      <div className="event-detail__body">
        <section className="event-detail__description">
          <h2>About this event</h2>
          <p>{event.description}</p>

          {event.isOnline && event.onlineUrl && (isOwner || myRsvp?.status === "GOING") && (
            <p className="event-detail__link">
              Join link: <a href={event.onlineUrl}>{event.onlineUrl}</a>
            </p>
          )}
        </section>

        <aside className="event-detail__sidebar">
          <div className="event-detail__card">
            <h3>{attendees.length} going</h3>
            <ul className="event-detail__attendees">
              {attendees.slice(0, 8).map((a) => (
                <li key={a.id}>{a.user.name}</li>
              ))}
              {attendees.length === 0 && <li>No one yet — be the first.</li>}
            </ul>
          </div>
        </aside>
      </div>

      <section className="event-detail__reviews">
        <h2>
          Reviews{avgRating && <span> · {avgRating} / 5</span>}
        </h2>

        {user && !isOwner && (
          <form className="event-detail__review-form" onSubmit={handleReviewSubmit}>
            {reviewError && <p className="error-text">{reviewError}</p>}
            <div className="field">
              <label htmlFor="rating">Rating</label>
              <select
                id="rating"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="comment">Comment</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={reviewSubmitting}>
              {reviewSubmitting ? "Posting…" : "Post review"}
            </button>
          </form>
        )}

        <ul className="event-detail__review-list">
          {reviews.map((review) => (
            <li key={review.id}>
              <div className="event-detail__review-head">
                <strong>{review.user.name}</strong>
                <span>{review.rating} / 5</span>
              </div>
              <p>{review.comment}</p>
            </li>
          ))}
          {reviews.length === 0 && <li className="event-detail__no-reviews">No reviews yet.</li>}
        </ul>
      </section>
    </div>
  );
}
