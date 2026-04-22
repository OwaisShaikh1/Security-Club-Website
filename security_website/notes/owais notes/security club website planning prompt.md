

# 🧠 OVERALL ARCHITECTURE DECISION

### 🔹 Tech Stack (Recommended)

* React (Vite or CRA)
* React Router (routing)
* Context API / Zustand (state)
* Tailwind CSS (fast styling)
* Axios (API calls)

---

# 📁 ROOT PROJECT STRUCTURE

```
src/
│
├── app/
│   ├── App.jsx
│   ├── routes.jsx
│
├── pages/
│   ├── Home/
│   ├── Events/
│   ├── Flagships/
│   ├── Team/
│   ├── Gallery/
│   ├── Leaderboard/
│   ├── Membership/
│   ├── Contact/
│   ├── Dashboard/        ← NEW (cyber upgrade)
│   ├── CTF/              ← NEW (security feature)
│
├── components/
│   ├── layout/
│   ├── common/
│   ├── cards/
│   ├── sections/
│   ├── ui/
│
├── data/
├── services/
├── hooks/
├── context/
├── utils/
```

---

# 🌐 ROUTING STRUCTURE

### `routes.jsx`

```js
[
  { path: "/", element: <Home /> },
  { path: "/events", element: <Events /> },
  { path: "/flagships", element: <Flagships /> },
  { path: "/team", element: <Team /> },
  { path: "/gallery", element: <Gallery /> },
  { path: "/leaderboard", element: <Leaderboard /> },
  { path: "/membership", element: <Membership /> },
  { path: "/contact", element: <Contact /> },

  // Cybersecurity upgrades
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/ctf", element: <CTF /> }
]
```

---

# 🧱 GLOBAL LAYOUT COMPONENTS

## 1. `Navbar.jsx`

### Responsibilities:

* Navigation links
* Mobile hamburger
* Sticky behavior

### Props:

```js
links: NavLink[]
```

### Data:

```js
{
  name: "Events",
  path: "/events"
}
```

### Subcomponents:

* `NavItem`
* `MobileMenu`

---

## 2. `Footer.jsx`

### Sections:

* Links
* Social icons
* Contact

---

## 3. `Container.jsx`

Reusable wrapper:

```jsx
<div className="max-w-7xl mx-auto px-4">
```

---

# 🏠 HOME PAGE STRUCTURE

## `Home.jsx`

### Sections:

```
HeroSection
AboutSection
HighlightsSection
EventsPreview
FlagshipPreview
Testimonials
CTASection
```

---

## 🔹 HeroSection.jsx

### Components:

* Heading
* Subheading
* CTA buttons

### Data:

```js
{
  title: "Security Club DBIT",
  tagline: "Hack. Defend. Secure.",
  cta: ["Explore Events", "Join Now"]
}
```

---

## 🔹 AboutSection.jsx

### Data:

```js
{
  heading: "Who We Are",
  description: "Cybersecurity enthusiasts..."
}
```

---

## 🔹 HighlightsSection.jsx

### Components:

* `FeatureCard`

### Data:

```js
[
  { title: "Workshops", icon: "🛠️" },
  { title: "CTFs", icon: "🏁" },
  { title: "Research", icon: "🔬" }
]
```

---

## 🔹 EventsPreview.jsx

### Components:

* `EventCard`

### Data:

```js
[
  {
    id: 1,
    title: "Ethical Hacking Workshop",
    date: "2026-05-10",
    description: "Hands-on Kali Linux"
  }
]
```

---

## 🔹 FlagshipPreview.jsx

### Components:

* `FlagshipCard`

---

## 🔹 Testimonials.jsx

### Data:

```js
[
  {
    name: "Student A",
    role: "Member",
    quote: "Amazing experience"
  }
]
```

---

# 📅 EVENTS PAGE

## `Events.jsx`

### Structure:

```
PageHeader
EventList
```

---

## 🔹 EventList.jsx

### Components:

* `EventCard`
* `EventFilter` (NEW upgrade)

### Data Model:

```js
{
  id,
  title,
  date,
  type, // workshop | ctf | seminar
  description,
  tags: ["kali", "networking"]
}
```

---

# 🚀 FLAGSHIP PAGE

## `Flagships.jsx`

### Components:

* `FlagshipSection`

### Data:

```js
{
  title: "Cyber Siege",
  description: "...",
  image: "/images/cybersiege.png"
}
```

---

# 👥 TEAM PAGE

## `Team.jsx`

### Components:

* `TeamGrid`
* `TeamCard`

### Data:

```js
{
  name: "John Doe",
  role: "Security Lead",
  image: "...",
  linkedin: "...",
  quote: "Security is mindset"
}
```

---

# 🖼️ GALLERY PAGE

## `Gallery.jsx`

### Components:

* `GalleryGrid`
* `ImageModal`

### Data:

```js
{
  id,
  imageUrl,
  caption,
  event
}
```

---

# 📊 LEADERBOARD PAGE

## `Leaderboard.jsx`

### Components:

* `LeaderboardTable`
* `LeaderboardRow`

### Data:

```js
{
  rank,
  name,
  score,
  badges
}
```

---

# 🎯 MEMBERSHIP PAGE

## `Membership.jsx`

### Components:

* `BenefitsList`
* `JoinForm`

### Data:

```js
{
  benefits: [
    "Access to CTFs",
    "Workshops",
    "Networking"
  ]
}
```

---

# 📍 CONTACT PAGE

## `Contact.jsx`

### Components:

* `ContactInfo`
* `ContactForm`

---

# 🔐 CYBERSECURITY-SPECIFIC PAGES (IMPORTANT)

---

## 🧠 Dashboard (NEW)

## `Dashboard.jsx`

### Sections:

* Stats
* Recent Activity
* User Rank

### Components:

* `StatCard`
* `ActivityFeed`

### Data:

```js
{
  user: { name, rank, points },
  activity: []
}
```

---

## 🏁 CTF PAGE (CORE FEATURE)

## `CTF.jsx`

### Sections:

* Challenge list
* Submission panel

### Components:

* `ChallengeCard`
* `SubmissionForm`

### Data:

```js
{
  id,
  title,
  difficulty,
  points,
  solved,
  description
}
```

---

# 🧩 REUSABLE COMPONENTS

## 🔹 Card System

### `BaseCard.jsx`

* Used by all cards

### Variants:

* EventCard
* TeamCard
* FlagshipCard
* ChallengeCard

---

## 🔹 Buttons

### `Button.jsx`

```js
variant: "primary" | "secondary" | "outline"
```

---

## 🔹 Modal

### `Modal.jsx`

* Used in gallery, CTF, forms

---

# 🗃️ DATA LAYER

## `/data/`

* `events.js`
* `team.js`
* `flagships.js`
* `leaderboard.js`
* `ctf.js`

---

# 🔌 SERVICES (API READY)

## `/services/api.js`

```js
axios.get("/events")
axios.post("/ctf/submit")
```

---

# 🧠 STATE MANAGEMENT

## Contexts:

### `AuthContext`

* user login

### `CTFContext`

* challenge state

### `LeaderboardContext`

* scores

---

# 🎨 DESIGN SYSTEM (IMPLEMENTATION)

## Tailwind Config

```js
colors: {
  primary: "#000000",
  accent: "#00d9ff",
}
```

---

# ⚠️ KEY IMPROVEMENTS OVER CSI SITE

Based on your audit :

### ❌ Old:

* Static pages
* No interaction
* No personalization

### ✅ New:

* Dynamic data rendering
* Dashboard system
* CTF gamification
* Filtering/search
* Modular components

---

# 🧠 FINAL CODEx-FRIENDLY SUMMARY

This architecture ensures:

✔ Every UI section → mapped to component
✔ Every component → mapped to data
✔ Every page → fully modular
✔ Easily API-integratable
✔ Cybersecurity-focused features included

---

