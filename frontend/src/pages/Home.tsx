import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { EventCard } from "../components/EventCard";
import { EventItem } from "../types";
import "./Home.scss";

const CATEGORIES = [
  "Music",
  "Tech",
  "Sports",
  "Art",
  "Business",
  "Food",
  "Community",
];

export function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (mode) params.set("mode", mode);
    return params.toString();
  }, [search, category, mode]);

  useEffect(() => {
    setLoading(true);
    api
      .get<EventItem[]>(`/events${query ? `?${query}` : ""}`)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="page home">
      <section className="home__hero container">
        <h1>
          Find your next
          <br />
          gathering.
        </h1>
        <p>
          Concerts, workshops, meetups and everything between — hosted by
          people in your community.
        </p>
      </section>

      <section className="container home__filters">
        <input
          type="text"
          placeholder="Search events, topics, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="home__search"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Online & offline</option>
          <option value="online">Online only</option>
          <option value="offline">In person only</option>
        </select>
      </section>

      <section className="container home__list">
        {loading && <p className="home__status">Loading events…</p>}
        {!loading && events.length === 0 && (
          <p className="home__status">
            No events match yet. Be the first to host one.
          </p>
        )}
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </section>
    </div>
  );
}
