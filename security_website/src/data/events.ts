import type { EventItem } from '../types'

export const events: EventItem[] = [
  {
    id: 1,
    title: 'Ethical Hacking Workshop',
    date: '2026-05-10',
    type: 'workshop',
    description: 'Hands-on Kali Linux and penetration testing fundamentals.',
    tags: ['kali', 'web-security', 'beginner'],
  },
  {
    id: 2,
    title: 'Network Defense Lab',
    date: '2026-05-24',
    type: 'seminar',
    description: 'Threat modeling and blue-team monitoring with practical labs.',
    tags: ['networking', 'soc', 'defense'],
  },
  {
    id: 3,
    title: 'Mini Capture The Flag',
    date: '2026-06-05',
    type: 'ctf',
    description: 'Solve web, crypto, and forensics challenges for leaderboard points.',
    tags: ['ctf', 'crypto', 'forensics'],
  },
]
