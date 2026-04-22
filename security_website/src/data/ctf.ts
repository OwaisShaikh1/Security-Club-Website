import type { Challenge } from '../types'

export const challenges: Challenge[] = [
  {
    id: 1,
    title: 'Packet Ghost',
    category: 'Forensics',
    difficulty: 'easy',
    points: 100,
    solved: true,
    description: 'Inspect packet captures and recover the hidden flag.',
  },
  {
    id: 2,
    title: 'Cipher Crawl',
    category: 'Crypto',
    difficulty: 'medium',
    points: 200,
    solved: false,
    description: 'Break layered substitution ciphers and decode the payload.',
  },
  {
    id: 3,
    title: 'Blind Endpoint',
    category: 'Web',
    difficulty: 'hard',
    points: 350,
    solved: false,
    description: 'Exploit blind injection and chain it into account takeover.',
  },
]
