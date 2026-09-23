import type { EventItem } from '../types'

export const events: EventItem[] = [
  {
    id: 1,
    title: 'The Inauguration Ceremony',
    date: '2026-04-20',
    type: 'inauguration',
    description:
      'Security Club DBIT officially launches with its Inauguration Ceremony. Join us to mark the beginning of a new era in cybersecurity at Don Bosco Institute of Technology.',
    tags: ['inauguration', 'security-club', 'dbit'],
    venue: 'Seminar Hall',
    starts_at: '2026-04-20T14:00:00',
    status: 'completed',
    poster: '/src/assets/data/Inauguration Poster.png',
  },
  {
    id: 2,
    title: 'Career Opportunities in IT Audits',
    date: '2026-04-20',
    type: 'seminar',
    description:
      'Session 1 presented by Security Club DBIT. Explore career paths in IT auditing — covering What is Audit?, Qualifications & Skills required, Job Opportunities, and Possible Challenges. Speaker: Prof. Prasad Padalkar (Asst. Prof & IQAC Coordinator) with 15+ years of experience across India, Nepal, Sri Lanka, Middle East, Europe & Africa.',
    tags: ['it-audit', 'career', 'session-1', 'seminar'],
    venue: 'Seminar Hall',
    starts_at: '2026-04-20T14:15:00',
    ends_at: '2026-04-20T15:00:00',
    status: 'completed',
    poster: '/src/assets/data/Session 1 Poster.jpg',
  },
  {
    id: 3,
    title: '2 Day Advance Cyber Security Bootcamp',
    date: '2026-08-03',
    type: 'bootcamp',
    description:
      'Security Club DBIT in association with Employment Express & DSCI (A NASSCOM Initiative) organizes a 2-day intensive Cyber Security Bootcamp. Gain practical cybersecurity skills, industry mentorship, hands-on labs, live CTF experience, real-world exposure, and a certificate of participation (subject to DSCI assessment). Open to B.E & T.E students.',
    tags: ['bootcamp', 'cyber-security', 'dsci', 'ctf', 'hands-on'],
    venue: 'Computer Center 1&2',
    starts_at: '2026-08-03T09:00:00',
    ends_at: '2026-08-04T17:00:00',
    status: 'completed',
    poster: '/src/assets/data/Poster DSCI Bootcamp.png',
  },
]
