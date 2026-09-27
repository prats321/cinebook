# 🎬 CineBook

A full-stack movie ticket booking website, like BookMyShow. Built with the MERN stack.

**Stack:** React + Tailwind · Node.js + Express 5 · MongoDB + Mongoose · TMDB API · Razorpay (test mode)

## Features

- JWT auth in httpOnly cookies, bcrypt password hashing, role-based access (user / admin)
- Real movies, posters, cast and trailers imported from TMDB
- City → movie → theatre → showtime → seat selection flow
- **Seat locking that prevents double booking** (see below)
- Admin: import movies, manage theatres and screens, schedule shows (with clash detection)
- Validation with Zod, centralized error handling, rate limiting, Helmet security headers

## How double booking is prevented

When a user selects seats, the API inserts one `SeatLock` document per seat. The
collection has a **unique index on `(show, seat)`**. So if two users click the same
seat at the same moment, MongoDB accepts one insert and rejects the other with a
duplicate-key error. The race is settled by the database, not by application code.

- Locks are all-or-nothing: if any seat fails, the user's other new locks are released.
- A **TTL index** on `expiresAt` makes MongoDB delete abandoned locks automatically
  (default 5 minutes). Reads also check `expiresAt`, because the TTL job runs only about once a minute.
- Each show stores a **snapshot of the screen layout**, so editing a theatre later
  never breaks seats that were already sold.

## Running locally

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, TMDB_READ_TOKEN
npm run seed           # admin user, 6 theatres, TMDB movies, a week of shows
npm run dev            # http://localhost:5000
```

## API

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | public |
| GET / PATCH | `/api/auth/me` | user |
| GET | `/api/movies?status=now_showing\|upcoming&search=&genre=&language=&page=` | public |
| GET | `/api/movies/filters` | public |
| GET | `/api/movies/:id` | public |
| GET | `/api/movies/:id/shows?city=&date=YYYY-MM-DD` | public |
| GET | `/api/movies/tmdb/search?q=` | admin |
| POST | `/api/movies/import/:tmdbId` | admin |
| PATCH | `/api/movies/:id` | admin |
| GET | `/api/theatres?city=` · `/api/theatres/cities` · `/api/theatres/:id` | public |
| POST / PUT / DELETE | `/api/theatres(/:id)` | admin |
| GET | `/api/shows/:id` · `/api/shows/:id/seats` | public |
| POST / DELETE | `/api/shows/:id/lock` | user |
| POST / DELETE | `/api/shows(/:id)` | admin |

## Project structure

```
server/src
├── config/        env + MongoDB connection
├── models/        User, Movie, Theatre, Show, SeatLock
├── services/      TMDB client, seat locking logic
├── controllers/   request handlers
├── routes/        Express routers
├── middleware/    auth, validation, rate limit, errors
├── scripts/       seed.js
├── validators.js  Zod schemas
├── app.js         Express app
└── server.js      entry point + graceful shutdown
```
