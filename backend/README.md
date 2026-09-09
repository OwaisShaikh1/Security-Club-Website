# Security Club backend

Express API with a SQLite database for page data and role-based access.

## Run

```powershell
npm install
npm start
```

The API listens on `http://localhost:3001`.

The backend requires Node.js 22.13.0 or newer because it uses the built-in
`node:sqlite` module. Set `CORS_ORIGINS` to a comma-separated list of allowed
frontend origins when running outside local development.

Copy `.env.example` to `.env` and set the admin registration key before using
the admin registration page. Local development currently uses
`ADMIN_REGISTRATION_KEY=12345678`. The `.env` file is ignored by git.

The frontend provides `/login` and `/register`. Regular registration creates a
visitor account. Selecting admin registration requires the server-side key and
creates an admin account only when the key matches.

## Roles

The default role is `visitor`. In non-production only, `X-User-Role` may be
used as a development override (`admin`, `core`, or `member`); it is ignored
in production. Production authentication uses an HTTP-only `sc_session` cookie.

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` on first startup to idempotently seed an
administrator account. `DATABASE_PATH`, `PORT`, `CORS_ORIGINS`, and
`SESSION_DAYS` are also configurable.

The API includes cookie authentication (`/api/auth/*`), public content and
contact endpoints, membership application/review/payment workflows, member
challenges and registrations, and event-head/admin event CRUD.

- `visitor`: Home, Events, Gallery, Contact
- `member`: visitor pages plus Dashboard, CTF, Leaderboard, Membership
- `core`: member pages plus Team and Flagships
- `admin`: all pages
