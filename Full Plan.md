# Security Club Website - Full Backend and Database Plan

## 1. Scope and goals

Build a backend inside `backend/` using Express and SQLite, then progressively replace the frontend's static data with API-backed data.

The system must support:

- Public browsing without login.
- Member registration with student identity details.
- Membership fee tracking for the INR 100 fee.
- Role-based access for `admin`, `core`, `member`, and `visitor`.
- Event-head access to create, read, update, and delete event records.
- Existing frontend pages backed by a consistent database model.
- Auditable changes to important club content.

The current backend already contains a small `users` table and an `events` table. These should be replaced by the normalized schema below through an explicit migration rather than continued incremental table additions.

## 2. Runtime and transport constraints

The backend uses Node's built-in `node:sqlite` through `DatabaseSync`, not
`better-sqlite3`. This requires Node.js 22.13.0 or newer, is synchronous, and
does not provide a `.transaction()` helper. Migrations and multi-table writes
must therefore use explicit `BEGIN`, `COMMIT`, and `ROLLBACK` statements.

The API's CORS policy is configured with the `CORS_ORIGINS` environment variable.
It supports `GET`, `POST`, `PATCH`, and `DELETE`, and enables credentials for
explicitly allowed origins so cookie-based authentication can be added without
another transport rewrite. The development `X-User-Role` header is scaffolding
only and must be removed or gated outside development before real authentication
ships.

## 3. Current frontend inventory

The frontend is a Vite React TypeScript application in `security_website/`.

### Current routes and data sources

| Page | Current source | Planned database source |
|---|---|---|
| Home | Inline content plus events, flagships, testimonials | Site settings, events, flagships, testimonials |
| Events | `src/data/events.ts`, now also API-loaded | Events, event tags, registrations |
| Flagships | `src/data/flagships.ts` | Flagship projects and media |
| Team | `src/data/team.ts` | Members/users, team profiles, roles |
| Gallery | `src/data/gallery.ts` | Gallery albums and media |
| Leaderboard | `src/data/leaderboard.ts` | Leaderboard entries or challenge submissions |
| Membership | Inline benefits and form | Membership applications, payments, plans |
| Contact | Inline contact details and form | Site settings and contact messages |
| Dashboard | Inline member stats and activity | Member profile, points, solved challenges, activity |
| CTF | `src/data/ctf.ts` | Challenges, submissions, solves, points |

### Existing frontend types to preserve or evolve

- `EventItem`
- `Flagship`
- `TeamMember`
- `GalleryItem`
- `LeaderboardEntry`
- `Challenge`
- `Testimonial`

API DTOs should initially match these shapes where practical, then add IDs, timestamps, status, and pagination metadata.

## 4. Frontend type migration map

The database should be normalized while API DTOs preserve the current frontend
shape until each page is migrated:

| Frontend field | Database representation | Migration rule |
|---|---|---|
| `EventItem.date` | `events.starts_at` and `events.ends_at` | Rename and update date sorting/formatting together |
| `EventItem.tags` | `event_tags` joined to `tags` | Return `tags: string[]` from the API initially |
| `Testimonial.role` | `testimonials.role_label` | Keep `role` in the DTO or update the component explicitly |
| `GalleryItem.event` | `gallery_items.event_id` joined to `events.title` | Do not silently replace the displayed event name with an ID |
| `LeaderboardEntry.badges` | No v1 source of truth | Drop it initially or design badge tables before wiring the API |
| `Challenge.solved` | `challenge_solves` for the authenticated user | Omit or return `false` for anonymous requests |

## 5. Roles and default access

Use a role hierarchy for default access:

```text
visitor < member < core < admin
```

The hierarchy is a default convenience, not the final authorization model. The final design should use explicit permissions so access can be customized later.

### Default permissions

| Capability | visitor | member | core | admin |
|---|---:|---:|---:|---:|
| View public pages | yes | yes | yes | yes |
| Submit contact message | yes | yes | yes | yes |
| Submit membership application | no login required | yes | yes | yes |
| View member dashboard | no | yes | yes | yes |
| View member-only CTF/leaderboard | no | yes | yes | yes |
| View team and flagships management content | no | no | yes | yes |
| Create/update/delete events | no | no | event head only | yes |
| Manage membership applications | no | no | designated membership head | yes |
| Manage users and roles | no | no | no | yes |
| Manage site settings and all content | no | no | no | yes |

`visitor` means unauthenticated browsing. Non-members do not need an account or login to view public content.

## 6. Identity and authentication assumptions

### Students and non-members

Student details are collected for membership applications and member records:

- Full name
- Student ID
- Branch/department
- Academic year
- Roll number
- College email
- Personal email, optional
- Phone number, optional
- Graduation year, optional

Non-members can browse public pages without login. A contact form can accept a name and email without creating a user account.

### Members

Members receive an account only after an application is approved and payment is confirmed. The initial implementation can use email/password authentication, but passwords must be stored as strong password hashes, never plaintext.

Recommended future authentication options:

1. College email verification.
2. Password login with refreshable sessions.
3. Optional college SSO if available.

Do not use the current `X-User-Role` header as real authentication. It is suitable only for local development and must be removed or disabled outside development.

## 7. Proposed SQLite schema

All tables should use integer primary keys, UTC timestamps stored as ISO-8601 text, foreign keys, and indexes for foreign-key and status columns.

### 5.1 `users`

Authentication identity and account state.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| email | TEXT | unique, required for member accounts |
| password_hash | TEXT | nullable for pending/non-login records |
| display_name | TEXT | required |
| role_id | INTEGER | FK to `roles` |
| status | TEXT | `pending`, `active`, `suspended`, `disabled` |
| email_verified_at | TEXT | nullable |
| last_login_at | TEXT | nullable |
| created_at | TEXT | required |
| updated_at | TEXT | required |

### 5.2 `roles`

Seeded rows: `admin`, `core`, `member`, `visitor`.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| key | TEXT | unique |
| name | TEXT | required |
| hierarchy_level | INTEGER | default ordering only |
| description | TEXT | required |

### 5.3 `permissions`

Examples: `pages.view_public`, `pages.view_member`, `events.create`, `events.update`, `events.delete`, `members.review`, `users.manage`.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| key | TEXT | unique |
| description | TEXT | required |

### 5.4 `role_permissions`

Many-to-many role authorization mapping.

| Column | Type | Rules |
|---|---|---|
| role_id | INTEGER | FK to `roles` |
| permission_id | INTEGER | FK to `permissions` |

Primary key: `(role_id, permission_id)`.

### 5.5 `student_profiles`

Student information independent of authentication. This allows a non-member application to exist before login creation.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| user_id | INTEGER | nullable FK to `users`, unique when present |
| full_name | TEXT | required |
| student_id | TEXT | required, indexed |
| branch | TEXT | required |
| academic_year | INTEGER | required |
| roll_number | TEXT | required |
| college_email | TEXT | required |
| personal_email | TEXT | nullable |
| phone | TEXT | nullable |
| graduation_year | INTEGER | nullable |
| created_at | TEXT | required |
| updated_at | TEXT | required |

Recommended uniqueness: `(student_id)`, `(college_email)`, and `(branch, academic_year, roll_number)` subject to college rules.

### 5.6 `membership_applications`

Registration workflow for prospective members.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| student_profile_id | INTEGER | FK |
| status | TEXT | `submitted`, `under_review`, `approved`, `rejected`, `withdrawn` |
| interest_area | TEXT | required |
| motivation | TEXT | nullable |
| reviewed_by | INTEGER | nullable FK to `users` |
| reviewed_at | TEXT | nullable |
| rejection_reason | TEXT | nullable |
| submitted_at | TEXT | required |
| updated_at | TEXT | required |

### 5.7 `membership_plans`

Seed one active plan:

```text
name: Standard Membership
fee_paise: 10000
currency: INR
duration_days: 365
```

Store money as integer paise, not floating-point rupees.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| name | TEXT | required |
| fee_paise | INTEGER | required, non-negative |
| currency | TEXT | default `INR` |
| duration_days | INTEGER | required |
| active | INTEGER | boolean |
| created_at | TEXT | required |

### 5.8 `memberships`

Approved membership periods.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| user_id | INTEGER | FK |
| application_id | INTEGER | FK |
| plan_id | INTEGER | FK |
| status | TEXT | `pending_payment`, `active`, `expired`, `cancelled` |
| starts_at | TEXT | nullable until payment confirmation |
| expires_at | TEXT | nullable until activation |
| created_at | TEXT | required |
| updated_at | TEXT | required |

### 5.9 `payments`

Payment records for the INR 100 membership fee.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| membership_id | INTEGER | FK |
| provider | TEXT | `manual`, `razorpay`, or future provider |
| provider_reference | TEXT | nullable, unique when present |
| amount_paise | INTEGER | required |
| currency | TEXT | default `INR` |
| status | TEXT | `created`, `pending`, `paid`, `failed`, `refunded` |
| paid_at | TEXT | nullable |
| metadata_json | TEXT | nullable |
| created_at | TEXT | required |
| updated_at | TEXT | required |

Never mark a payment as paid solely from a client-side response. Verify the payment server-side or record it as manual pending review.

### 5.10 `event_types`

Seed: `workshop`, `ctf`, `seminar`.

### 5.11 `events`

The event-head CRUD resource.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| title | TEXT | required |
| slug | TEXT | unique |
| event_type_id | INTEGER | FK |
| summary | TEXT | required |
| description | TEXT | required |
| venue | TEXT | nullable |
| starts_at | TEXT | required |
| ends_at | TEXT | nullable |
| registration_open_at | TEXT | nullable |
| registration_close_at | TEXT | nullable |
| capacity | INTEGER | nullable |
| status | TEXT | `draft`, `published`, `cancelled`, `completed` |
| created_by | INTEGER | FK to `users` |
| updated_by | INTEGER | FK to `users` |
| created_at | TEXT | required |
| updated_at | TEXT | required |

### 5.12 `tags` and `event_tags`

Normalize event tags instead of storing comma-separated strings.

`tags`: `id`, `name`, `slug`.

`event_tags`: `event_id`, `tag_id`, composite primary key.

### 5.13 `event_registrations`

Member registration for an event.

| Column | Type | Rules |
|---|---|---|
| id | INTEGER | primary key |
| event_id | INTEGER | FK |
| user_id | INTEGER | FK |
| status | TEXT | `registered`, `waitlisted`, `cancelled`, `attended` |
| registered_at | TEXT | required |
| checked_in_at | TEXT | nullable |

Unique key: `(event_id, user_id)`.

### 5.14 `event_heads`

Allows event CRUD access without making every core member an event administrator.

| Column | Type | Rules |
|---|---|---|
| event_id | INTEGER | FK |
| user_id | INTEGER | FK |
| assigned_by | INTEGER | FK to `users` |
| assigned_at | TEXT | required |

Primary key: `(event_id, user_id)`.

Authorization rule: admin can manage every event; a core user can manage an event only if present in `event_heads`.

### 5.15 `challenges`

Replaces `src/data/ctf.ts`.

Columns: `id`, `title`, `slug`, `category`, `difficulty`, `points`, `description`, `flag_hash`, `status`, `created_by`, `created_at`, `updated_at`.

Do not store plaintext flags.

### 5.16 `challenge_submissions`

Columns: `id`, `challenge_id`, `user_id`, `submitted_value_hash`, `is_correct`, `submitted_at`.

Add an index on `(challenge_id, user_id, submitted_at)`.

### 5.17 `challenge_solves`

Columns: `id`, `challenge_id`, `user_id`, `points_awarded`, `solved_at`.

Unique key: `(challenge_id, user_id)`.

### 5.18 `flagships`

Replaces `src/data/flagships.ts`.

Columns: `id`, `title`, `slug`, `description`, `image_url`, `year`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`.

### 5.19 `team_profiles`

Public team presentation linked to a member/user where applicable.

Columns: `id`, `user_id`, `name_override`, `role_title`, `image_url`, `linkedin_url`, `quote`, `display_order`, `published`.

### 5.20 `gallery_items`

Replaces `src/data/gallery.ts`.

Columns: `id`, `event_id`, `image_url`, `caption`, `taken_at`, `published`, `created_by`, `created_at`, `updated_at`.

### 5.21 `testimonials`

Columns: `id`, `name`, `role_label`, `quote`, `image_url`, `published`, `display_order`, `created_at`, `updated_at`.

### 5.22 `leaderboard_entries`

Use a derived leaderboard from challenge solves where possible. If manual entries are still required, store:

Columns: `id`, `user_id`, `score`, `rank_snapshot`, `season`, `updated_at`.

Prefer calculating score from `challenge_solves` to avoid conflicting sources of truth.

### 5.23 `contact_messages`

Columns: `id`, `name`, `email`, `user_id`, `message`, `status`, `assigned_to`, `created_at`, `resolved_at`.

Statuses: `new`, `in_progress`, `resolved`, `spam`.

### 5.24 `site_settings`

Key/value settings for contact info, office hours, membership text, social links, and payment instructions.

Columns: `key`, `value_json`, `updated_by`, `updated_at`.

### 5.25 `audit_log`

Required for administrative and event-head changes.

Columns: `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `created_at`.

## 6. API plan

### Public endpoints

```text
GET  /api/health
GET  /api/events
GET  /api/events/:slug
GET  /api/flagships
GET  /api/gallery
GET  /api/team
GET  /api/testimonials
POST /api/contact-messages
POST /api/membership-applications
```

Membership application submission is public and does not require login.

### Authentication endpoints

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

Use secure, HTTP-only cookies for production sessions. Do not trust a role supplied by the browser.

### Member endpoints

```text
GET  /api/me/profile
PATCH /api/me/profile
GET  /api/me/membership
GET  /api/me/dashboard
GET  /api/challenges
POST /api/challenges/:id/submissions
GET  /api/leaderboard
POST /api/events/:id/registrations
DELETE /api/events/:id/registrations
```

### Event-head and admin endpoints

```text
POST   /api/events
GET    /api/events/manage
GET    /api/events/:id
PATCH  /api/events/:id
DELETE /api/events/:id
POST   /api/events/:id/publish
POST   /api/events/:id/heads
DELETE /api/events/:id/heads/:userId
```

Event create/update/delete routes must check either `admin` permission or membership in `event_heads`.

### Membership administration endpoints

```text
GET   /api/admin/membership-applications
GET   /api/admin/membership-applications/:id
POST  /api/admin/membership-applications/:id/approve
POST  /api/admin/membership-applications/:id/reject
POST  /api/admin/memberships/:id/confirm-payment
```

## 7. Membership workflow

1. Student submits the public membership form.
2. Backend validates student ID, branch, year, roll number, college email, and required fields.
3. Backend creates or updates `student_profiles`.
4. Backend creates `membership_applications` with `submitted` status.
5. Reviewer moves it to `under_review`.
6. Reviewer approves or rejects the application.
7. Approved applications create a `users` record with `member` role and a `memberships` record in `pending_payment`.
8. Student pays the INR 100 fee.
9. Backend verifies payment and creates a `payments` row with `paid`.
10. Membership becomes `active`, with start and expiry dates.
11. Student receives login activation instructions.

The application and payment states must be separate so an approved application is not incorrectly treated as a paid membership.

## 8. Event-head workflow

1. Admin assigns a core user as an event head.
2. Event head opens the management interface.
3. Event head creates an event as `draft`.
4. Event head edits title, type, dates, venue, description, tags, capacity, and registration settings.
5. Event head previews and publishes the event.
6. Published events appear on public Events and Home pages.
7. Event head can update or cancel the event.
8. Destructive deletion should normally be soft deletion or status change, with audit logging.

## 9. Frontend implementation plan

### Phase 1 - backend foundation

- Replace `backend/src/db.js` with migrations and all seed data.
- Add repository/query modules instead of embedding SQL in route handlers.
- Add environment configuration.
- Add centralized error handling and validation.
- Add authentication/session middleware.
- Add permission middleware.

### Phase 2 - public data

- Replace static events with API data.
- Add API clients and loading/error/empty states for events, flagships, gallery, team, testimonials, and challenges.
- Keep the current static arrays only as development fallback fixtures, not production data.

### Phase 3 - membership

- Replace the current Membership form with the complete student registration form.
- Add field validation and clear fee display: INR 100.
- Add application status UI.
- Add payment initiation and server-side confirmation.
- Add member login activation.

### Phase 4 - member features

- Connect Dashboard to member profile, membership, activity, and challenge solves.
- Connect CTF submissions and leaderboard calculations.
- Add route guards and an access-denied state.

### Phase 5 - event management

- Add an event-head dashboard.
- Add event CRUD form with draft/published/cancelled states.
- Add tag management, event-head assignment, registration controls, and audit history.
- Add optimistic updates only after server validation is reliable.

### Phase 6 - administration

- Add user/role management.
- Add membership review queue.
- Add payment review/refund handling.
- Add site settings and content moderation.

## 10. Validation and security requirements

- Validate every request body on the server.
- Use parameterized SQL statements only.
- Enable SQLite foreign keys.
- Hash passwords with Argon2id or bcrypt.
- Use secure HTTP-only cookies for sessions.
- Add CSRF protection if cookie authentication is used.
- Add rate limits to login, registration, contact, and challenge submission endpoints.
- Store only necessary student data.
- Do not log passwords, payment secrets, or plaintext CTF flags.
- Verify payment webhooks and make them idempotent.
- Use soft deletion for published content.
- Write audit records for role changes, membership decisions, payment changes, and event CRUD.
- Add indexes for email, student ID, event dates, statuses, and foreign keys.

## 11. Migration and seed strategy

1. Create a numbered migration runner.
2. Migrate the current `users` and `events` data into the new tables.
3. Seed roles, permissions, event types, membership plan, public fixture data, and an initial admin account through an environment-provided setup command.
4. Never commit the SQLite database file or credentials.
5. Add a reset/seed command for local development only.

Suggested commands:

```text
npm run db:migrate
npm run db:seed
npm run db:reset:dev
```

## 12. Testing plan

### Backend tests

- Migration creates every table and index.
- Seed is idempotent.
- Public endpoints work without authentication.
- Visitor cannot access member/core/admin endpoints.
- Member can access member endpoints but cannot manage events by default.
- Assigned event head can CRUD only assigned events.
- Admin can manage all events and users.
- Membership application validation rejects incomplete student data.
- INR 100 amount is stored as 10000 paise.
- Duplicate event registration is rejected safely.
- Payment confirmation is idempotent.

### Frontend tests

- Visitor sees only public routes.
- Member sees member routes after role load.
- Loading and API error states render correctly.
- Membership form submits all student fields.
- Event manager can create, edit, publish, and cancel events.
- Unauthorized users see an access-denied state rather than broken content.

## 13. Decisions still requiring confirmation

The implementation can start with the defaults below, but these choices should be confirmed before production:

- Whether student ID or college email is the primary identity.
- Whether payment uses Razorpay, another provider, or manual verification.
- Membership duration after paying INR 100.
- Whether `core` members can manage all events or only assigned events.
- Whether event deletion is allowed or only cancellation/archive.
- Exact academic-year values and branch list.
- Whether alumni can retain accounts after graduation.
- Required privacy/consent text for storing student information.
