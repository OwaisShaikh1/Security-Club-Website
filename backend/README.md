# Security Club backend

Express API with a SQLite database for page data and role-based access.

## Run

```powershell
npm install
npm start
```

The API listens on `http://localhost:3001`.

## Roles

The default role is `visitor`. Send `X-User-Role` as `admin`, `core`, or `member` while authentication is being integrated.

- `visitor`: Home, Events, Gallery, Contact
- `member`: visitor pages plus Dashboard, CTF, Leaderboard, Membership
- `core`: member pages plus Team and Flagships
- `admin`: all pages
