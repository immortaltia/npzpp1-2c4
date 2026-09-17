# Gather — Events Platform

Web app for creating and finding events. Users can organize an event (online or in person), browse and filter events other people made, RSVP to them, and leave a review afterward.

Backend: Express + Prisma + SQLite.
Frontend: React + Vite + TypeScript.

## Contents

- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Running the project](#running-the-project)
- [Authentication](#authentication)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Known limitations](#known-limitations)

## Architecture

The backend doesn't have separate controller/service layers — routes call Prisma directly, and request bodies are validated with Zod right in the route handler. Nothing fancy, just:

```
React frontend -> Express routes -> Prisma -> SQLite
```

Two auth middlewares:

- `requireAuth` — blocks the request with 401 if there's no valid token, otherwise puts the decoded payload on `req.auth`.
- `optionalAuth` — same decoding, but doesn't block the request if there's no token.

On the frontend, all API calls go through `src/api/client.ts`, a thin wrapper around `fetch` that attaches the JWT from localStorage and throws on non-2xx responses. In dev, Vite proxies `/api` to the backend on port 4000.

## Project structure

```
backend/
  prisma/
    schema.prisma        User, Event, Rsvp, Review models
    migrations/
  src/
    index.ts             mounts routers, starts the server
    db.ts                Prisma client
    types.ts             AuthPayload type, Express Request augmentation
    middleware/auth.ts    requireAuth / optionalAuth
    routes/
      auth.ts             register, login, /me
      events.ts           CRUD, rsvp, attendees, reviews
      users.ts            current user's events and rsvps

frontend/
  src/
    App.tsx               routes
    api/client.ts          fetch wrapper with auth header
    context/AuthContext.tsx
    components/            Header, EventCard, ProtectedRoute
    pages/
      Home.tsx             listing + filters
      EventDetail.tsx      single event, rsvp, reviews
      EventForm.tsx        create/edit event
      Dashboard.tsx        "my events" / "my rsvps"
      Login.tsx, Register.tsx
    types/index.ts
```

## Environment variables

Backend, in `backend/.env`:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | e.g. `file:./dev.db` |
| `JWT_SECRET` | yes | falls back to `dev-secret` if missing | signs and verifies JWTs |
| `PORT` | no | 4000 | |

Frontend has no required env vars for dev — `/api` requests are proxied to `http://localhost:4000` via `vite.config.ts`.

## Running the project

Backend:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

Runs on http://localhost:4000.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173, proxying API calls to the backend.

Build for production:

```bash
# backend
npm run build && npm run start

# frontend
npm run build   # -> frontend/dist
```

## Authentication

JWT-based, no server sessions.

1. Register or login signs a token containing `{ userId, email }`, valid 7 days.
2. Frontend stores it in localStorage under `gather_token` and sends it as `Authorization: Bearer <token>` on every request.
3. `requireAuth` checks the token on protected routes; missing or invalid token -> 401.

Logging out just removes the token client-side. There's no refresh token and no way to revoke a token before it expires.

## Data model

From `backend/prisma/schema.prisma`:

- **User** — email, password hash, name, optional bio/avatar. Organizes events, has rsvps and reviews.
- **Event** — title, description, optional cover image, startDate, location, isOnline/onlineUrl, category, tags (stored as a comma-separated string, not a real array). Belongs to one organizer.
- **Rsvp** — status is `GOING`, `INTERESTED`, or `NOT_GOING`. One per user per event (upsert on repeat calls).
- **Review** — rating 1–5 plus a comment, tied to a user and an event.

## API reference

JSON in, JSON out. "Protected" = needs `Authorization: Bearer <token>`.

### Auth

**POST /api/auth/register** — `{ email, password, name }`. Password min 6 chars. Returns `201 { token, user }`, `400` on bad input, `409` if email taken.

**POST /api/auth/login** — `{ email, password }`. Returns `200 { token, user }` or `401` on wrong credentials.

**GET /api/auth/me** (protected) — current user's profile. `404` if the user was deleted after the token was issued.

### Events

**GET /api/events** — public listing, sorted by startDate ascending. Query params: `search` (title/description/tags), `category`, `mode` (`online`/`offline`), `from`/`to` (date range). Includes organizer name and rsvp/review counts.

**GET /api/events/:id** — public, single event with organizer info. `404` if not found.

**POST /api/events** (protected) — creates an event owned by the caller. Body: `title, description, startDate, location, isOnline, category, tags[]` (coverImage/onlineUrl optional).

**PUT /api/events/:id** (protected) — partial update, organizer only. `403` if you're not the organizer, `404` if the event doesn't exist.

**DELETE /api/events/:id** (protected) — organizer only, also deletes the event's rsvps and reviews. `204` on success.

**POST /api/events/:id/rsvp** (protected) — `{ status }`, one of the three enum values. Upserts, so calling it again just updates your existing rsvp.

**GET /api/events/:id/rsvp/me** (protected) — your own rsvp for that event, or `null`.

**GET /api/events/:id/attendees** — public, users with status `GOING`.

**GET /api/events/:id/reviews** — public, newest first.

**POST /api/events/:id/reviews** (protected) — `{ rating (1-5), comment }`.

### Users

**GET /api/users/me/events** (protected) — events you organized.

**GET /api/users/me/rsvps** (protected) — events you rsvp'd to, with event + organizer info attached.

### Health check

**GET /api/health** — `{ status: "ok" }`, no auth.

## Known limitations

- Passwords are hashed with bcryptjs (cost 10) before storage — plain text is never saved.
- Ownership is checked by comparing `event.organizerId` to the token's `userId` before edit/delete.
- All write endpoints validate input with Zod before hitting the database.
- No refresh tokens or token revocation — a stolen token stays valid for its full 7-day lifetime.
- `backend/.env` (including `JWT_SECRET`) is currently committed to the repo, and `.gitignore` only excludes `.env.local`. Fine for a school project running locally, but not something to carry over if this ever gets deployed somewhere real.