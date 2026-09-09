export type UserRole = 'admin' | 'core' | 'member' | 'visitor'
export type EventType = 'workshop' | 'ctf' | 'seminar'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export interface EventItem {
  id: number
  title: string
  date: string
  type: EventType
  description: string
  tags: string[]
  slug?: string
  summary?: string
  venue?: string | null
  starts_at?: string
  ends_at?: string | null
  registration_open_at?: string | null
  registration_close_at?: string | null
  capacity?: number | null
  status?: EventStatus
}

export interface EventInput {
  title: string
  summary: string
  description: string
  starts_at: string
  type: EventType
  tags: string[]
  venue?: string
  ends_at?: string
  registration_open_at?: string
  registration_close_at?: string
  capacity?: number
  status?: EventStatus
  slug?: string
}

export interface MembershipApplicationInput {
  fullName: string
  studentId: string
  branch: string
  academicYear: number
  rollNumber: string
  collegeEmail: string
  personalEmail?: string
  phone?: string
  graduationYear?: number
  interestArea: string
  motivation?: string
}

export interface MembershipApplicationResponse {
  id: number
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
}

export interface AuthUser {
  id: number
  email: string
  displayName: string
  role: UserRole
}

export interface AuthSession {
  authenticated: boolean
  role: UserRole
  user: AuthUser | null
  permissions: string[]
  positions: CorePosition[]
}

export interface CorePosition {
  id: number
  key: string
  name: string
  description: string
  displayOrder: number
}

export type RegistrationRole = 'visitor' | 'admin'

export interface EventRegistrationResponse {
  eventId: number
  status: 'registered' | 'waitlisted' | 'cancelled' | 'attended'
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
