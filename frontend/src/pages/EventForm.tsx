import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EventItem } from "../types";
import "./EventForm.scss";

const CATEGORIES = [
  "Music",
  "Tech",
  "Sports",
  "Art",
  "Business",
  "Food",
  "Community",
];

interface FormState {
  title: string;
  description: string;
  category: string;
  startDate: string;
  location: string;
  isOnline: boolean;
  onlineUrl: string;
  coverImage: string;
  tags: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  category: CATEGORIES[0],
  startDate: "",
  location: "",
  isOnline: false,
  onlineUrl: "",
  coverImage: "",
  tags: "",
};

export function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    api.get<EventItem>(`/events/${id}`).then((event) => {
      setForm({
        title: event.title,
        description: event.description,
        category: event.category,
        startDate: toLocalInput(event.startDate),
        location: event.location,
        isOnline: event.isOnline,
        onlineUrl: event.onlineUrl ?? "",
        coverImage: event.coverImage ?? "",
        tags: event.tags,
      });
      setLoading(false);
    });
  }, [id]);

  function toLocalInput(iso: string): string {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      startDate: new Date(form.startDate).toISOString(),
      location: form.location,
      isOnline: form.isOnline,
      onlineUrl: form.onlineUrl || undefined,
      coverImage: form.coverImage || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit) {
        const updated = await api.put<EventItem>(`/events/${id}`, payload);
        navigate(`/events/${updated.id}`);
      } else {
        const created = await api.post<EventItem>("/events", payload);
        navigate(`/events/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="page container">Loading…</div>;
  }

  return (
    <div className="page event-form container">
      <h1>{isEdit ? "Edit event" : "Host a new event"}</h1>
      <p className="event-form__subtitle">
        Tell people what to expect and when to show up.
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
          />
        </div>

        <div className="event-form__row">
          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="startDate">Date and time</label>
            <input
              id="startDate"
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field field--checkbox">
          <label>
            <input
              type="checkbox"
              checked={form.isOnline}
              onChange={(e) => update("isOnline", e.target.checked)}
            />
            This is an online event
          </label>
        </div>

        {form.isOnline ? (
          <div className="field">
            <label htmlFor="onlineUrl">Online link</label>
            <input
              id="onlineUrl"
              value={form.onlineUrl}
              onChange={(e) => update("onlineUrl", e.target.value)}
              placeholder="https://"
            />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Venue name and address"
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="coverImage">Cover image URL</label>
          <input
            id="coverImage"
            value={form.coverImage}
            onChange={(e) => update("coverImage", e.target.value)}
            placeholder="https://"
          />
        </div>

        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? "Saving…"
            : isEdit
            ? "Save changes"
            : "Publish event"}
        </button>
      </form>
    </div>
  );
}
