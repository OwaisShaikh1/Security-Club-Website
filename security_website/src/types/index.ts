export type EventType = 'workshop' | 'ctf' | 'seminar'

export interface EventItem {
  id: number
  title: string
  date: string
  type: EventType
  description: string
  tags: string[]
}

export interface Flagship {
  id: number
  title: string
  description: string
  image: string
  year: string
}

export interface TeamMember {
  id: number
  name: string
  role: string
  image: string
  linkedin: string
  quote: string
}

export interface GalleryItem {
  id: number
  imageUrl: string
  caption: string
  event: string
  date: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  badges: string[]
}

export interface Challenge {
  id: number
  title: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  solved: boolean
  description: string
}

export interface Testimonial {
  name: string
  role: string
  quote: string
}
