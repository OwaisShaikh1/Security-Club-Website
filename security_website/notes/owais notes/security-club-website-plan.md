# Security Club Website Plan

## 1. Project Goal
Build a modern, fast, and maintainable website for the Security Club that:
- Showcases events, flagship initiatives, and team members.
- Supports member engagement through leaderboard and membership flows.
- Introduces cybersecurity-specific experiences like a CTF page and member dashboard.
- Can start as frontend-first (mock/static data) and evolve into API-backed production.

---

## 2. Target Users
- Students curious about cybersecurity.
- Existing club members who need updates, rankings, and activities.
- Organizers/admins who publish events and track participation.
- External visitors (faculty, sponsors, collaborators) viewing club impact.

---

## 3. Success Criteria
- Clear navigation across all core pages.
- Event discovery in under 3 clicks.
- Working forms for membership and contact.
- Responsive UI on mobile and desktop.
- Lighthouse performance target: 90+ on key pages.
- Foundation ready for backend integration without major refactor.

---

## 4. Recommended Tech Stack
The workspace is already a Vite + React + TypeScript setup, so keep that baseline.

- Frontend: React + TypeScript + Vite
- Routing: react-router-dom
- State: Context API (start) and move to Zustand only if state grows
- Styling: Tailwind CSS (or CSS modules if you want to stay minimal)
- API layer: Axios
- Forms: React Hook Form + Zod (recommended)

---

## 5. Information Architecture (Site Map)
- /
- /events
- /flagships
- /team
- /gallery
- /leaderboard
- /membership
- /contact
- /dashboard (member-focused)
- /ctf (challenge-focused)

Navigation behavior:
- Sticky top navbar on desktop.
- Hamburger + slide menu on mobile.
- Footer with quick links, contact details, social links.

---

## 6. Page-by-Page Plan

### 6.1 Home
Sections:
- Hero (club identity + CTA)
- About
- Highlights (workshops, CTFs, research)
- Upcoming events preview
- Flagship preview
- Testimonials
- Final CTA (join now)

Primary actions:
- Explore Events
- Join Membership

### 6.2 Events
Sections:
- Page header
- Filter controls (type/date/tag)
- Event card list

Event model:
- id
- title
- date
- type (workshop | ctf | seminar)
- description
- tags

### 6.3 Flagships
Sections:
- Flagship introduction
- Flagship cards (Cyber Siege, etc.)

Flagship model:
- id
- title
- description
- image
- year

### 6.4 Team
Sections:
- Leadership group
- Core members
- Faculty advisor (optional)

Team model:
- id
- name
- role
- image
- linkedin
- quote

### 6.5 Gallery
Sections:
- Filter by event/year
- Masonry or responsive grid
- Image modal with caption

Gallery model:
- id
- imageUrl
- caption
- event
- date

### 6.6 Leaderboard
Sections:
- Ranking table
- Badge display
- Time period switch (weekly/monthly/all-time)

Leaderboard model:
- rank
- name
- score
- badges

### 6.7 Membership
Sections:
- Benefits list
- Eligibility
- Join form

Join form fields:
- Name
- Email
- Department/Year
- Interest areas
- Experience level

### 6.8 Contact
Sections:
- Contact cards (email/location/social)
- Contact form

Contact form fields:
- Name
- Email
- Subject
- Message

### 6.9 Dashboard (Cyber Upgrade)
Sections:
- Member stats cards
- Recent activity
- Rank progress

Dashboard model:
- user { name, rank, points }
- activity[]
- recentChallenges[]

### 6.10 CTF (Core Security Feature)
Sections:
- Challenge list with difficulty
- Challenge details drawer/modal
- Flag submission panel

Challenge model:
- id
- title
- category
- difficulty
- points
- solved
- description

---

## 7. Component Architecture

### 7.1 Global Layout
- Navbar
- Footer
- Container
- SectionHeader

### 7.2 Reusable UI
- Button (primary/secondary/outline)
- Card (base + variants)
- Modal
- Input/Textarea/Select
- Badge
- Tabs
- EmptyState
- SkeletonLoader

### 7.3 Card Variants
- EventCard
- TeamCard
- FlagshipCard
- ChallengeCard
- StatCard

---

## 8. Suggested Source Structure (TypeScript-first)

```text
src/
  app/
    App.tsx
    routes.tsx
  pages/
    Home/
    Events/
    Flagships/
    Team/
    Gallery/
    Leaderboard/
    Membership/
    Contact/
    Dashboard/
    CTF/
  components/
    layout/
    common/
    cards/
    sections/
    ui/
  data/
  services/
  hooks/
  context/
  utils/
  types/
```

---

## 9. Data and API Plan

### 9.1 Phase 1 (Static)
Create typed mock files in `src/data`:
- events.ts
- team.ts
- flagships.ts
- leaderboard.ts
- ctf.ts

### 9.2 Phase 2 (API-ready)
Create `src/services/api.ts` with Axios instance:
- GET /events
- GET /flagships
- GET /leaderboard
- GET /ctf/challenges
- POST /ctf/submit
- POST /membership/apply
- POST /contact

### 9.3 Type Safety
Define shared interfaces in `src/types` for:
- Event
- TeamMember
- Flagship
- LeaderboardEntry
- Challenge
- MemberProfile

---

## 10. State Management Plan
- AuthContext: login state and member identity.
- CTFContext: challenge state, solved status, submissions.
- LeaderboardContext: ranking data and filters.

Start with Context API. Introduce Zustand only if state updates become deeply nested or performance-sensitive.

---

## 11. Design and UX Direction
- Visual direction: cyber-academic, clean, high contrast.
- Color anchors:
  - Primary: #0B1220
  - Accent: #00D9FF
  - Success: #22C55E
  - Warning: #F59E0B
- Typography:
  - Headings: Space Grotesk (or Sora)
  - Body: Manrope (or DM Sans)
- Motion:
  - Lightweight reveal transitions for sections.
  - Hover elevation for cards and buttons.

Accessibility requirements:
- Keyboard accessible nav and modals.
- Minimum AA color contrast.
- Alt text for gallery and meaningful icons.

---

## 12. Security and Quality Checklist
- Input validation on all forms.
- Basic client-side rate limiting for submissions.
- Sanitize all rendered external/user text.
- Do not expose admin-only routes without auth guard.
- Error boundaries for page-level failure handling.

Quality:
- ESLint clean.
- TypeScript strict mode compatibility.
- Responsive breakpoints tested.
- Empty/error/loading states for async views.

---

## 13. Delivery Roadmap

### Milestone 1: Foundation
- Routing
- Global layout
- Home + Events pages
- Static data integration

### Milestone 2: Core Club Presence
- Flagships, Team, Gallery, Contact
- Membership form UX

### Milestone 3: Security Features
- Leaderboard
- Dashboard
- CTF flow (list + submit)

### Milestone 4: Production Hardening
- API integration
- Validation and error handling
- Performance and accessibility audit

---

## 14. MVP Scope (First Working Release)
Include:
- Home
- Events
- Team
- Membership
- Contact
- Basic Leaderboard

Defer to v2:
- Full CTF submissions backend
- Personalized dashboard analytics
- Admin panel

---

## 15. Immediate Next Build Steps
1. Create `src/app/routes.tsx` and wire all page routes.
2. Build shared layout (`Navbar`, `Footer`, `Container`).
3. Add typed mock data for events/team.
4. Implement `Home` and `Events` pages end-to-end.
5. Add form handling + validation for Membership and Contact.
6. Add initial Leaderboard and CTF UI shells.
