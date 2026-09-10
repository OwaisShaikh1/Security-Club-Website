import type {
  AuthSession,
  EventInput,
  EventItem,
  EventRegistrationResponse,
  MembershipApplicationInput,
  MembershipApplicationResponse,
  UserRole,
  CorePosition,
} from '../types'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export type { UserRole } from '../types'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = text
    }
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed: ${response.status}`
    throw new ApiError(message, response.status)
  }
  return body as T
}

function jsonBody(value: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
}

export async function getAuthSession(): Promise<AuthSession> {
  const session = await request<AuthSession & { positions?: CorePosition[] }>('/auth/me')
  return { ...session, positions: session.positions ?? [] }
}

export async function getCurrentRole(): Promise<UserRole> {
  const session = await getAuthSession()
  return session.role
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthRegistration extends AuthCredentials {
  displayName: string
  role?: 'visitor' | 'admin'
  adminKey?: string
}

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  await request('/auth/login', { method: 'POST', ...jsonBody(credentials) })
  return getAuthSession()
}

export async function register(credentials: AuthRegistration): Promise<AuthSession> {
  await request('/auth/register', { method: 'POST', ...jsonBody(credentials) })
  return getAuthSession()
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export async function activateAccount(token: string, password: string): Promise<void> {
  await request('/auth/activate', { method: 'POST', ...jsonBody({ token, password }) })
}

export async function submitMembershipApplication(
  application: MembershipApplicationInput,
): Promise<MembershipApplicationResponse> {
  return request<MembershipApplicationResponse>('/membership-applications', {
    method: 'POST',
    ...jsonBody(application),
  })
}

export async function getEvents(): Promise<EventItem[]> {
  return request<EventItem[]>('/events')
}

export async function getManagedEvents(): Promise<EventItem[]> {
  return request<EventItem[]>('/events/manage')
}

export async function createEvent(input: EventInput): Promise<EventItem> {
  return request<EventItem>('/events', { method: 'POST', ...jsonBody(input) })
}

export async function updateEvent(id: number, input: Partial<EventInput>): Promise<EventItem> {
  return request<EventItem>(`/events/${id}`, { method: 'PATCH', ...jsonBody(input) })
}

export async function publishEvent(id: number): Promise<EventItem> {
  return request<EventItem>(`/events/${id}/publish`, { method: 'POST' })
}

export async function cancelEvent(id: number): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/events/${id}`, { method: 'DELETE' })
}

export async function registerForEvent(id: number): Promise<EventRegistrationResponse> {
  return request<EventRegistrationResponse>(`/events/${id}/registrations`, { method: 'POST' })
}

export async function cancelEventRegistration(id: number): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/events/${id}/registrations`, { method: 'DELETE' })
}

export interface ArchitecturePermission {
  id: number
  key: string
  description: string
  enabled: boolean
}

export interface ArchitectureRole {
  id: number
  key: string
  name: string
  description: string
  hierarchy_level: number
  permissions: ArchitecturePermission[]
}

export interface CorePositionAssignment {
  id: number
  key: string
  name: string
  description: string
  display_order: number
  user_id: number | null
  display_name: string | null
  email: string | null
}

export interface AdminUser {
  id: number
  email: string
  display_name: string
  status: string
  role: UserRole
  position_keys: string[]
}

export interface CommentItem {
  id: number
  entity_type: string
  entity_id: number
  body: string
  created_at: string
  updated_at: string
  author_id: number
  author_name: string
}

export async function getAdminArchitecture(): Promise<{ roles: ArchitectureRole[]; positions: CorePositionAssignment[]; users: AdminUser[] }> {
  return request('/admin/architecture')
}

export async function setRolePermission(roleKey: string, permissionKey: string, enabled: boolean): Promise<void> {
  await request(`/admin/roles/${encodeURIComponent(roleKey)}/permissions/${encodeURIComponent(permissionKey)}`, {
    method: 'PATCH',
    ...jsonBody({ enabled }),
  })
}

export async function assignCorePosition(userId: number, positionKey: string): Promise<void> {
  await request(`/admin/users/${userId}/positions`, {
    method: 'POST',
    ...jsonBody({ positionKey }),
  })
}

export async function removeCorePosition(userId: number, positionKey: string): Promise<void> {
  await request(`/admin/users/${userId}/positions/${encodeURIComponent(positionKey)}`, { method: 'DELETE' })
}

export async function setUserRole(userId: number, role: 'member' | 'core'): Promise<void> {
  await request(`/admin/users/${userId}/role`, { method: 'PATCH', ...jsonBody({ role }) })
}

export async function getComments(entityType: string, entityId: number): Promise<CommentItem[]> {
  return request<CommentItem[]>(`/comments/${encodeURIComponent(entityType)}/${entityId}`)
}

export async function addComment(entityType: string, entityId: number, body: string): Promise<{ id: number; status: 'created' }> {
  return request<{ id: number; status: 'created' }>(`/comments/${encodeURIComponent(entityType)}/${entityId}`, {
    method: 'POST',
    ...jsonBody({ body }),
  })
}

export type { CorePosition }
