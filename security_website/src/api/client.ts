import type { EventItem } from '../types'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export type UserRole = 'admin' | 'core' | 'member' | 'visitor'

export async function getCurrentRole(): Promise<UserRole> {
  const response = await fetch(`${apiBaseUrl}/auth/me`)
  if (!response.ok) throw new Error(`Unable to load role: ${response.status}`)
  const data = await response.json() as { role: UserRole }
  return data.role
}

export async function getEvents(): Promise<EventItem[]> {
  const response = await fetch(`${apiBaseUrl}/events`)
  if (!response.ok) throw new Error(`Unable to load events: ${response.status}`)
  return response.json() as Promise<EventItem[]>
}
