import express from 'express'
import { randomBytes } from 'node:crypto'
import {
  db, hashPassword, verifyPassword, hashToken, sha256, slugify, now, transaction,
} from './db.js'
import { roles } from './access.js'
import { timingSafeEqual } from 'node:crypto'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const production = process.env.NODE_ENV === 'production'
const allowedOrigins = new Set((process.env.CORS_ORIGINS ?? (production ? '' : 'http://localhost:5173,http://127.0.0.1:5173'))
  .split(',').map((origin) => origin.trim()).filter(Boolean))
const sessionDays = Number(process.env.SESSION_DAYS ?? 7)

app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))
app.use((request, response, next) => {
  const origin = request.header('origin')
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-User-Role')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  if (!production && origin && !allowedOrigins.has(origin)) return response.status(403).json({ error: 'Origin is not allowed' })
  if (production && origin && !allowedOrigins.has(origin)) return response.status(403).json({ error: 'Origin is not allowed' })
  next()
})

const publicRole = () => ({ id: null, role: 'visitor', email: null, display_name: null, permissions: permissionKeys('visitor') })
function permissionKeys(role) {
  return db.prepare(`SELECT p.key FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id
    JOIN roles r ON r.id=rp.role_id WHERE r.key=?`).all(role).map((row) => row.key)
}
function userPermissionKeys(userId, role) {
  const permissions = permissionKeys(role)
  if (userId) {
    const positionPermissions = db.prepare(`SELECT p.key
      FROM position_permissions pp
      JOIN permissions p ON p.id=pp.permission_id
      JOIN user_positions up ON up.position_id=pp.position_id
      WHERE up.user_id=?`).all(userId)
    for (const { key } of positionPermissions) {
      if (!permissions.includes(key)) permissions.push(key)
    }
  }
  return permissions
}
function userPositions(userId) {
  if (!userId) return []
  return db.prepare(`SELECT cp.id,cp.key,cp.name,cp.description,cp.display_order AS displayOrder
    FROM core_positions cp JOIN user_positions up ON up.position_id=cp.id
    WHERE up.user_id=? ORDER BY cp.display_order`).all(userId)
}
function loadUser(request) {
  const token = parseCookies(request.headers.cookie ?? '').sc_session
  if (!token) return null
  const row = db.prepare(`SELECT u.id,u.email,u.display_name,u.status,r.key AS role,r.hierarchy_level,s.id AS session_id
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
    WHERE s.token_hash=? AND s.expires_at > ?`).get(hashToken(token), now())
  if (!row || row.status !== 'active') return null
  db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(now(), row.session_id)
  return { ...row, permissions: userPermissionKeys(row.id, row.role), positions: userPositions(row.id) }
}
app.use((request, _response, next) => {
  request.user = loadUser(request)
  if (!request.user && !production) {
    const role = request.header('x-user-role')
    if (roles.includes(role)) request.user = {
      id: null, email: null, display_name: 'Development user', role, permissions: permissionKeys(role), positions: [],
    }
  }
  next()
})

const send = (response, body, status = 200) => response.status(status).json(body)
const fail = (status, message, details) => {
  const error = new Error(message)
  error.status = status
  error.details = details
  return error
}
const value = (body, key, { required = true, max = 500 } = {}) => {
  const result = body?.[key]
  if (result === undefined || result === null || result === '') {
    if (required) throw fail(400, `${key} is required`)
    return null
  }
  if (typeof result !== 'string' || result.trim().length > max) throw fail(400, `${key} must be a string of at most ${max} characters`)
  return result.trim()
}
const email = (body, key = 'email', required = true) => {
  const result = value(body, key, { required, max: 320 })
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw fail(400, `${key} must be a valid email address`)
  return result?.toLowerCase() ?? null
}
const integer = (body, key, { required = true, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const result = body?.[key]
  if (result === undefined || result === null || result === '') {
    if (required) throw fail(400, `${key} is required`)
    return null
  }
  const number = Number(result)
  if (!Number.isSafeInteger(number) || number < min || number > max) throw fail(400, `${key} must be a valid integer`)
  return number
}
const iso = (body, key, required = false) => {
  const result = value(body, key, { required, max: 40 })
  if (result && Number.isNaN(Date.parse(result))) throw fail(400, `${key} must be an ISO date`)
  return result
}
const requireAuth = (request, _response, next) => {
  if (!request.user || (!request.user.id && production)) return next(fail(401, 'Authentication required'))
  next()
}
const requirePermission = (permission) => (request, _response, next) => {
  if (!request.user || !request.user.permissions.includes(permission)) return next(fail(403, 'Permission denied'))
  next()
}
const requireMember = requirePermission('pages.view_member')
const roleOf = (request) => request.user?.role ?? 'visitor'
const parseCookies = (header) => Object.fromEntries(header.split(';').map((part) => {
  const index = part.indexOf('=')
  return index < 0 ? [] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
}).filter((part) => part.length))
function setSessionCookie(response, token) {
  const flags = [`sc_session=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${sessionDays * 86400}`]
  if (production) flags.push('Secure')
  response.setHeader('Set-Cookie', flags.join('; '))
}
function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', 'sc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
}
function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const timestamp = now()
  const expires = new Date(Date.now() + sessionDays * 86400_000).toISOString()
  db.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?)')
    .run(randomBytes(16).toString('hex'), userId, hashToken(token), expires, timestamp, timestamp)
  return token
}
function audit(request, action, entityType, entityId, before, after) {
  db.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(request.user?.id ?? null, action, entityType, entityId ?? null,
    before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), request.ip, now())
}
function eventRow(idOrSlug, bySlug = false, includeDrafts = false) {
  const where = bySlug ? 'e.slug=?' : 'e.id=?'
  const row = db.prepare(`SELECT e.*, et.key AS type, et.name AS type_name FROM events e JOIN event_types et ON et.id=e.event_type_id
    WHERE ${where}${includeDrafts ? '' : " AND e.status='published'"}`).get(idOrSlug)
  if (!row) return null
  const tags = db.prepare('SELECT t.name,t.slug FROM tags t JOIN event_tags et ON et.tag_id=t.id WHERE et.event_id=? ORDER BY t.name').all(row.id)
  return { ...row, date: row.starts_at, type: row.type, tags: tags.map((tag) => tag.name), tag_slugs: tags.map((tag) => tag.slug) }
}
function eventManager(request, event) {
  if (roleOf(request) === 'admin') return true
  if (!production && roleOf(request) === 'core' && !request.user?.id) return true
  return Boolean(request.user?.id && db.prepare('SELECT 1 FROM event_heads WHERE event_id=? AND user_id=?').get(event.id, request.user.id))
}
function saveTags(eventId, tags) {
  db.prepare('DELETE FROM event_tags WHERE event_id=?').run(eventId)
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags(name,slug) VALUES(?,?)')
  const link = db.prepare('INSERT OR IGNORE INTO event_tags(event_id,tag_id) SELECT ?,id FROM tags WHERE slug=?')
  ;(Array.isArray(tags) ? tags : []).slice(0, 20).forEach((tag) => {
    if (typeof tag !== 'string' || !tag.trim()) return
    const name = tag.trim().slice(0, 60)
    insertTag.run(name, slugify(name))
    link.run(eventId, slugify(name))
  })
}
function eventInput(body, partial = false) {
  const result = {}
  if (!partial || body.title !== undefined) result.title = value(body, 'title', { max: 160 })
  if (!partial || body.summary !== undefined) result.summary = value(body, 'summary', { max: 500 })
  if (!partial || body.description !== undefined) result.description = value(body, 'description', { max: 10_000 })
  if (!partial || body.starts_at !== undefined) result.starts_at = iso(body, 'starts_at', true)
  for (const key of ['venue', 'ends_at', 'registration_open_at', 'registration_close_at']) {
    if (!partial || body[key] !== undefined) result[key] = key === 'venue' ? value(body, key, { required: false, max: 300 }) : iso(body, key)
  }
  if (!partial || body.capacity !== undefined) result.capacity = integer(body, 'capacity', { required: false, min: 1, max: 1_000_000 })
  if (!partial || body.status !== undefined) {
    result.status = body.status ?? 'draft'
    if (!['draft', 'published', 'cancelled', 'completed'].includes(result.status)) throw fail(400, 'Invalid event status')
  }
  if (!partial || body.type !== undefined || body.event_type !== undefined) {
    result.type = value(body, body.type !== undefined ? 'type' : 'event_type', { max: 40 })
    if (!db.prepare('SELECT 1 FROM event_types WHERE key=?').get(result.type)) throw fail(400, 'Unknown event type')
  }
  if (!partial || body.tags !== undefined) {
    if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== 'string'))) throw fail(400, 'tags must be an array of strings')
    result.tags = body.tags ?? []
  }
  return result
}

app.get('/api/health', (_request, response) => send(response, { ok: true, database: 'sqlite' }))
app.get('/api/auth/me', (request, response) => send(response, {
  authenticated: Boolean(request.user?.id), role: roleOf(request), user: request.user?.id ? {
    id: request.user.id, email: request.user.email, displayName: request.user.display_name,
  } : null, permissions: request.user?.permissions ?? permissionKeys('visitor'),
  positions: request.user?.positions ?? [],
}))
app.post('/api/auth/register', (request, response, next) => {
  try {
    const address = email(request.body)
    const password = value(request.body, 'password', { max: 200 })
    if (password.length < 8) throw fail(400, 'password must be at least 8 characters')
    const displayName = value(request.body, 'displayName', { max: 160 })
    const requestedRole = request.body.role ?? 'visitor'
    if (!roles.includes(requestedRole) || requestedRole === 'visitor') {
      request.body.role = 'visitor'
    } else if (requestedRole !== 'admin') {
      throw fail(403, 'Only visitor or admin accounts can be registered')
    } else {
      const configuredKey = process.env.ADMIN_REGISTRATION_KEY
      const submittedKey = value(request.body, 'adminKey', { max: 200 })
      if (!configuredKey || configuredKey.length !== submittedKey.length ||
        !timingSafeEqual(Buffer.from(configuredKey), Buffer.from(submittedKey))) {
        throw fail(403, 'Invalid admin registration key')
      }
    }
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(address)) throw fail(409, 'An account with that email already exists')
    const roleId = db.prepare('SELECT id FROM roles WHERE key=?').get(requestedRole).id
    const userId = transaction(() => {
      const timestamp = now()
      const result = db.prepare(`INSERT INTO users(email,password_hash,display_name,role_id,status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?)`).run(address, hashPassword(password), displayName, roleId, 'active', timestamp, timestamp)
      return Number(result.lastInsertRowid)
    })
    const token = createSession(userId)
    setSessionCookie(response, token)
    send(response, { user: { id: userId, email: address, displayName, role: requestedRole } }, 201)
  } catch (error) { next(error) }
})
app.post('/api/auth/login', (request, response, next) => {
  try {
    const address = email(request.body)
    const password = value(request.body, 'password', { max: 200 })
    const row = db.prepare(`SELECT u.*,r.key AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?`).get(address)
    if (!row || row.status !== 'active' || !verifyPassword(password, row.password_hash)) throw fail(401, 'Invalid email or password')
    const timestamp = now()
    db.prepare('UPDATE users SET last_login_at=?,updated_at=? WHERE id=?').run(timestamp, timestamp, row.id)
    const token = createSession(row.id)
    setSessionCookie(response, token)
    send(response, { user: { id: row.id, email: row.email, displayName: row.display_name, role: row.role } })
  } catch (error) { next(error) }
})
app.post('/api/auth/logout', (request, response, next) => {
  try {
    const token = parseCookies(request.headers.cookie ?? '').sc_session
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token))
    clearSessionCookie(response)
    send(response, { ok: true })
  } catch (error) { next(error) }
})
app.post('/api/auth/refresh', requireAuth, (request, response, next) => {
  try {
    if (!request.user.id) throw fail(401, 'A real session is required to refresh')
    const old = parseCookies(request.headers.cookie ?? '').sc_session
    if (old) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(old))
    setSessionCookie(response, createSession(request.user.id))
    send(response, { ok: true, expiresIn: sessionDays * 86400 })
  } catch (error) { next(error) }
})

app.post('/api/auth/activate', (request, response, next) => {
  try {
    const token = value(request.body, 'token', { max: 200 })
    const password = value(request.body, 'password', { max: 200 })
    if (password.length < 8) throw fail(400, 'password must be at least 8 characters')
    const tokenRow = db.prepare(`SELECT id,user_id FROM activation_tokens
      WHERE token_hash=? AND used_at IS NULL AND expires_at > ?`).get(hashToken(token), now())
    if (!tokenRow) throw fail(400, 'Activation token is invalid or expired')
    const timestamp = now()
    transaction(() => {
      db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').run(hashPassword(password), timestamp, tokenRow.user_id)
      db.prepare('UPDATE activation_tokens SET used_at=? WHERE id=?').run(timestamp, tokenRow.id)
    })
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.get('/api/events', (_request, response, next) => {
  try { send(response, db.prepare("SELECT slug FROM events WHERE status='published' ORDER BY starts_at").all().map((row) => eventRow(row.slug, true))) } catch (error) { next(error) }
})
app.get('/api/events/manage', requireAuth, requirePermission('events.create'), (request, response, next) => {
  try {
    const rows = roleOf(request) === 'admin'
      ? db.prepare('SELECT slug FROM events ORDER BY starts_at').all()
      : db.prepare('SELECT e.slug FROM events e JOIN event_heads h ON h.event_id=e.id WHERE h.user_id=? ORDER BY e.starts_at').all(request.user.id)
    send(response, rows.map((row) => eventRow(row.slug, true, true)))
  } catch (error) { next(error) }
})
app.get('/api/events/:slug', (request, response, next) => {
  try {
    const numericId = /^\d+$/.test(request.params.slug)
    const event = numericId
      ? eventRow(Number(request.params.slug), false, Boolean(request.user && (roleOf(request) === 'admin' || (request.user.id && request.user.permissions.includes('events.create')))))
      : eventRow(request.params.slug, true)
    if (!event) return next(fail(404, 'Event not found'))
    if (event.status !== 'published' && !eventManager(request, event)) return next(fail(404, 'Event not found'))
    send(response, event)
  } catch (error) { next(error) }
})
app.post('/api/events', requireAuth, (request, response, next) => {
  try {
    if (!request.user.permissions.includes('events.create')) throw fail(403, 'Permission denied')
    const input = eventInput(request.body)
    const slug = slugify(request.body.slug || input.title)
    if (!slug) throw fail(400, 'title produces an invalid slug')
    const eventId = transaction(() => {
      const timestamp = now()
      const typeId = db.prepare('SELECT id FROM event_types WHERE key=?').get(input.type).id
      const result = db.prepare(`INSERT INTO events(title,slug,event_type_id,summary,description,venue,starts_at,ends_at,registration_open_at,registration_close_at,capacity,status,created_by,updated_by,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(input.title, slug, typeId, input.summary, input.description, input.venue, input.starts_at, input.ends_at, input.registration_open_at, input.registration_close_at, input.capacity, input.status, request.user.id, request.user.id, timestamp, timestamp)
      const id = Number(result.lastInsertRowid)
      saveTags(id, input.tags)
      if (request.user.id) db.prepare('INSERT OR IGNORE INTO event_heads(event_id,user_id,assigned_by,assigned_at) VALUES(?,?,?,?)').run(id, request.user.id, request.user.id, timestamp)
      audit(request, 'create', 'event', id, null, eventRow(id, false, true))
      return id
    })
    send(response, eventRow(eventId, false, true), 201)
  } catch (error) { next(error) }
})
app.patch('/api/events/:id', requireAuth, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id')
    const before = eventRow(id, false, true)
    if (!before) throw fail(404, 'Event not found')
    if (!eventManager(request, before)) throw fail(403, 'You are not an event head')
    const input = eventInput(request.body, true)
    const updates = []; const params = []
    const fields = { title: 'title', summary: 'summary', description: 'description', venue: 'venue', starts_at: 'starts_at', ends_at: 'ends_at', registration_open_at: 'registration_open_at', registration_close_at: 'registration_close_at', capacity: 'capacity', status: 'status' }
    Object.entries(fields).forEach(([key, column]) => { if (input[key] !== undefined) { updates.push(`${column}=?`); params.push(input[key]) } })
    if (input.type !== undefined) { updates.push('event_type_id=?'); params.push(db.prepare('SELECT id FROM event_types WHERE key=?').get(input.type).id) }
    if (request.body.slug !== undefined) { const slug = slugify(value(request.body, 'slug', { max: 100 })); if (!slug) throw fail(400, 'Invalid slug'); updates.push('slug=?'); params.push(slug) }
    transaction(() => {
      if (updates.length) { updates.push('updated_by=?', 'updated_at=?'); params.push(request.user.id, now(), id); db.prepare(`UPDATE events SET ${updates.join(',')} WHERE id=?`).run(...params) }
      if (input.tags !== undefined) saveTags(id, input.tags)
      audit(request, 'update', 'event', id, before, eventRow(id, false, true))
    })
    send(response, eventRow(id, false, true))
  } catch (error) { next(error) }
})
app.delete('/api/events/:id', requireAuth, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id'); const before = eventRow(id, false, true)
    if (!before) throw fail(404, 'Event not found')
    if (!eventManager(request, before)) throw fail(403, 'You are not an event head')
    db.prepare("UPDATE events SET status='cancelled',updated_by=?,updated_at=? WHERE id=?").run(request.user.id, now(), id)
    audit(request, 'cancel', 'event', id, before, eventRow(id, false, true))
    send(response, { ok: true })
  } catch (error) { next(error) }
})
app.post('/api/events/:id/publish', requireAuth, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id'); const before = eventRow(id, false, true)
    if (!before) throw fail(404, 'Event not found')
    if (!eventManager(request, before)) throw fail(403, 'You are not an event head')
    db.prepare("UPDATE events SET status='published',updated_by=?,updated_at=? WHERE id=?").run(request.user.id, now(), id)
    audit(request, 'publish', 'event', id, before, eventRow(id, false, true))
    send(response, eventRow(id, false, true))
  } catch (error) { next(error) }
})
app.post('/api/events/:id/heads', requireAuth, requirePermission('events.heads'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id'); const userId = integer(request.body, 'userId', { min: 1 })
    if (!eventRow(id, false, true) || !db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) throw fail(404, 'Event or user not found')
    db.prepare('INSERT OR IGNORE INTO event_heads(event_id,user_id,assigned_by,assigned_at) VALUES(?,?,?,?)').run(id, userId, request.user.id, now())
    audit(request, 'assign_head', 'event', id, null, { userId }); send(response, { ok: true })
  } catch (error) { next(error) }
})
app.delete('/api/events/:id/heads/:userId', requireAuth, requirePermission('events.heads'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id'); const userId = integer({ userId: request.params.userId }, 'userId', { min: 1 })
    db.prepare('DELETE FROM event_heads WHERE event_id=? AND user_id=?').run(id, userId)
    audit(request, 'remove_head', 'event', id, null, { userId }); send(response, { ok: true })
  } catch (error) { next(error) }
})

app.post('/api/events/:id/registrations', requireAuth, requireMember, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); const event = eventRow(id, false)
    if (!event) throw fail(404, 'Published event not found')
    const existing = db.prepare('SELECT id,status FROM event_registrations WHERE event_id=? AND user_id=?').get(id, request.user.id)
    if (existing?.status === 'registered') return send(response, existing)
    const registered = db.prepare("SELECT COUNT(*) AS count FROM event_registrations WHERE event_id=? AND status='registered'").get(id).count
    const status = event.capacity && registered >= event.capacity ? 'waitlisted' : 'registered'
    if (existing) db.prepare('UPDATE event_registrations SET status=?,registered_at=? WHERE id=?').run(status, now(), existing.id)
    else db.prepare('INSERT INTO event_registrations(event_id,user_id,status,registered_at) VALUES(?,?,?,?)').run(id, request.user.id, status, now())
    send(response, { eventId: id, status })
  } catch (error) { next(error) }
})
app.delete('/api/events/:id/registrations', requireAuth, requireMember, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); db.prepare("UPDATE event_registrations SET status='cancelled' WHERE event_id=? AND user_id=?").run(id, request.user.id); send(response, { ok: true })
  } catch (error) { next(error) }
})

app.get('/api/flagships', (_request, response, next) => { try { send(response, db.prepare("SELECT * FROM flagships WHERE status='published' ORDER BY year DESC,id").all()) } catch (error) { next(error) } })
app.get('/api/gallery', (_request, response, next) => { try { send(response, db.prepare(`SELECT g.*,e.title AS event FROM gallery_items g LEFT JOIN events e ON e.id=g.event_id WHERE g.published=1 ORDER BY g.taken_at DESC,g.id DESC`).all()) } catch (error) { next(error) } })
app.get('/api/team', (_request, response, next) => { try { send(response, db.prepare(`SELECT tp.*,COALESCE(tp.name_override,u.display_name) AS name FROM team_profiles tp LEFT JOIN users u ON u.id=tp.user_id WHERE tp.published=1 ORDER BY tp.display_order,tp.id`).all()) } catch (error) { next(error) } })
app.get('/api/testimonials', (_request, response, next) => { try { send(response, db.prepare("SELECT id,name,role_label AS role,quote,image_url FROM testimonials WHERE published=1 ORDER BY display_order,id").all()) } catch (error) { next(error) } })
app.get('/api/site-settings', (_request, response, next) => {
  try {
    const settings = {}
    db.prepare('SELECT key,value_json FROM site_settings ORDER BY key').all().forEach((row) => {
      try { settings[row.key] = JSON.parse(row.value_json) } catch { settings[row.key] = row.value_json }
    })
    send(response, settings)
  } catch (error) { next(error) }
})

app.post('/api/gallery', requireAuth, requirePermission('gallery.manage'), (request, response, next) => {
  try {
    const eventId = integer(request.body, 'eventId', { required: false, min: 1 })
    const imageUrl = value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 })
    const caption = value(request.body, 'caption', { required: false, max: 500 })
    const takenAt = iso(request.body, 'takenAt', false) ?? iso(request.body, 'taken_at', false)
    const published = request.body?.published !== undefined ? Boolean(request.body.published) : true
    if (!imageUrl) throw fail(400, 'imageUrl is required')
    if (eventId && !db.prepare('SELECT 1 FROM events WHERE id=?').get(eventId)) throw fail(404, 'Event not found')
    const timestamp = now();
    const result = db.prepare(`INSERT INTO gallery_items(event_id,image_url,caption,taken_at,published,created_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(eventId ?? null, imageUrl, caption, takenAt, published ? 1 : 0, request.user.id, timestamp, timestamp)
    audit(request, 'create', 'gallery_item', Number(result.lastInsertRowid), null, { id: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), event_id: eventId ?? null, image_url: imageUrl, caption, taken_at: takenAt, published }, 201)
  } catch (error) { next(error) }
})
app.patch('/api/gallery/:id', requireAuth, requirePermission('gallery.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM gallery_items WHERE id=?').get(id)
    if (!before) throw fail(404, 'Gallery item not found')
    const eventId = request.body.eventId !== undefined ? integer(request.body, 'eventId', { required: false, min: 1 }) : before.event_id
    const imageUrl = request.body.imageUrl !== undefined ? value(request.body, 'imageUrl', { required: false, max: 500 }) : before.image_url
    const caption = request.body.caption !== undefined ? value(request.body, 'caption', { required: false, max: 500 }) : before.caption
    const takenAt = request.body.takenAt !== undefined ? iso(request.body, 'takenAt', false) : before.taken_at
    const published = request.body.published !== undefined ? Boolean(request.body.published) : Boolean(before.published)
    if (!imageUrl) throw fail(400, 'imageUrl is required')
    if (eventId && !db.prepare('SELECT 1 FROM events WHERE id=?').get(eventId)) throw fail(404, 'Event not found')
    const timestamp = now();
    db.prepare(`UPDATE gallery_items SET event_id=?,image_url=?,caption=?,taken_at=?,published=?,updated_at=? WHERE id=?`)
      .run(eventId ?? null, imageUrl, caption, takenAt, published ? 1 : 0, timestamp, id)
    audit(request, 'update', 'gallery_item', id, before, db.prepare('SELECT * FROM gallery_items WHERE id=?').get(id))
    send(response, { id, event_id: eventId ?? null, image_url: imageUrl, caption, taken_at: takenAt, published })
  } catch (error) { next(error) }
})
app.delete('/api/gallery/:id', requireAuth, requirePermission('gallery.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM gallery_items WHERE id=?').get(id)
    if (!before) throw fail(404, 'Gallery item not found')
    db.prepare('UPDATE gallery_items SET published=0,updated_at=? WHERE id=?').run(now(), id)
    audit(request, 'archive', 'gallery_item', id, before, db.prepare('SELECT * FROM gallery_items WHERE id=?').get(id))
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.post('/api/testimonials', requireAuth, requirePermission('testimonials.manage'), (request, response, next) => {
  try {
    const name = value(request.body, 'name', { max: 160 })
    const quote = value(request.body, 'quote', { max: 2000 })
    const roleLabel = value(request.body, 'roleLabel', { required: false, max: 160 }) ?? value(request.body, 'role_label', { required: false, max: 160 })
    const imageUrl = value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 })
    const published = request.body?.published !== undefined ? Boolean(request.body.published) : true
    const displayOrder = integer(request.body, 'displayOrder', { required: false, min: 0, max: 1_000_000 }) ?? 0
    const timestamp = now()
    const result = db.prepare(`INSERT INTO testimonials(name,role_label,quote,image_url,published,display_order,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(name, roleLabel, quote, imageUrl, published ? 1 : 0, displayOrder, timestamp, timestamp)
    audit(request, 'create', 'testimonial', Number(result.lastInsertRowid), null, { id: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), name, role_label: roleLabel, quote, image_url: imageUrl, published, display_order: displayOrder }, 201)
  } catch (error) { next(error) }
})
app.patch('/api/testimonials/:id', requireAuth, requirePermission('testimonials.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM testimonials WHERE id=?').get(id)
    if (!before) throw fail(404, 'Testimonial not found')
    const name = request.body.name !== undefined ? value(request.body, 'name', { max: 160 }) : before.name
    const quote = request.body.quote !== undefined ? value(request.body, 'quote', { max: 2000 }) : before.quote
    const roleLabel = request.body.roleLabel !== undefined ? value(request.body, 'roleLabel', { required: false, max: 160 }) ?? value(request.body, 'role_label', { required: false, max: 160 }) : before.role_label
    const imageUrl = request.body.imageUrl !== undefined ? value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 }) : before.image_url
    const published = request.body.published !== undefined ? Boolean(request.body.published) : Boolean(before.published)
    const displayOrder = request.body.displayOrder !== undefined ? integer(request.body, 'displayOrder', { required: false, min: 0, max: 1_000_000 }) ?? before.display_order : before.display_order
    const timestamp = now();
    db.prepare(`UPDATE testimonials SET name=?,role_label=?,quote=?,image_url=?,published=?,display_order=?,updated_at=? WHERE id=?`)
      .run(name, roleLabel, quote, imageUrl, published ? 1 : 0, displayOrder, timestamp, id)
    audit(request, 'update', 'testimonial', id, before, db.prepare('SELECT * FROM testimonials WHERE id=?').get(id))
    send(response, { id, name, role_label: roleLabel, quote, image_url: imageUrl, published, display_order: displayOrder })
  } catch (error) { next(error) }
})
app.delete('/api/testimonials/:id', requireAuth, requirePermission('testimonials.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM testimonials WHERE id=?').get(id)
    if (!before) throw fail(404, 'Testimonial not found')
    db.prepare('UPDATE testimonials SET published=0,updated_at=? WHERE id=?').run(now(), id)
    audit(request, 'archive', 'testimonial', id, before, db.prepare('SELECT * FROM testimonials WHERE id=?').get(id))
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.post('/api/flagships', requireAuth, requirePermission('flagships.manage'), (request, response, next) => {
  try {
    const title = value(request.body, 'title', { max: 200 })
    const description = value(request.body, 'description', { max: 5000 })
    const imageUrl = value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 })
    const year = integer(request.body, 'year', { required: false, min: 2000, max: 2200 }) ?? new Date().getFullYear()
    const status = value(request.body, 'status', { required: false, max: 40 }) ?? 'published'
    if (!['published', 'draft', 'archived'].includes(status)) throw fail(400, 'Invalid flagship status')
    const slug = slugify(value(request.body, 'slug', { required: false, max: 200 }) ?? title)
    const timestamp = now();
    const result = db.prepare(`INSERT INTO flagships(title,slug,description,image_url,year,status,created_by,updated_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(title, slug, description, imageUrl, year, status, request.user.id, request.user.id, timestamp, timestamp)
    audit(request, 'create', 'flagship', Number(result.lastInsertRowid), null, { id: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), title, slug, description, image_url: imageUrl, year, status }, 201)
  } catch (error) { next(error) }
})
app.patch('/api/flagships/:id', requireAuth, requirePermission('flagships.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM flagships WHERE id=?').get(id)
    if (!before) throw fail(404, 'Flagship not found')
    const title = request.body.title !== undefined ? value(request.body, 'title', { max: 200 }) : before.title
    const description = request.body.description !== undefined ? value(request.body, 'description', { max: 5000 }) : before.description
    const imageUrl = request.body.imageUrl !== undefined ? value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 }) : before.image_url
    const year = request.body.year !== undefined ? integer(request.body, 'year', { required: false, min: 2000, max: 2200 }) ?? before.year : before.year
    const status = request.body.status !== undefined ? value(request.body, 'status', { required: false, max: 40 }) : before.status
    if (status && !['published', 'draft', 'archived'].includes(status)) throw fail(400, 'Invalid flagship status')
    const slug = request.body.slug !== undefined ? slugify(value(request.body, 'slug', { required: false, max: 200 }) ?? title) : before.slug
    const timestamp = now();
    db.prepare(`UPDATE flagships SET title=?,slug=?,description=?,image_url=?,year=?,status=?,updated_by=?,updated_at=? WHERE id=?`)
      .run(title, slug, description, imageUrl, year, status, request.user.id, timestamp, id)
    audit(request, 'update', 'flagship', id, before, db.prepare('SELECT * FROM flagships WHERE id=?').get(id))
    send(response, { id, title, slug, description, image_url: imageUrl, year, status })
  } catch (error) { next(error) }
})
app.delete('/api/flagships/:id', requireAuth, requirePermission('flagships.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM flagships WHERE id=?').get(id)
    if (!before) throw fail(404, 'Flagship not found')
    db.prepare('UPDATE flagships SET status="archived",updated_by=?,updated_at=? WHERE id=?').run(request.user.id, now(), id)
    audit(request, 'archive', 'flagship', id, before, db.prepare('SELECT * FROM flagships WHERE id=?').get(id))
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.post('/api/team', requireAuth, requirePermission('team.manage'), (request, response, next) => {
  try {
    const userId = integer(request.body, 'userId', { required: false, min: 1 }) ?? null
    const nameOverride = value(request.body, 'nameOverride', { required: false, max: 160 }) ?? value(request.body, 'name_override', { required: false, max: 160 })
    const roleTitle = value(request.body, 'roleTitle', { max: 160 }) ?? value(request.body, 'role_title', { max: 160 })
    const imageUrl = value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 })
    const linkedinUrl = value(request.body, 'linkedinUrl', { required: false, max: 500 }) ?? value(request.body, 'linkedin_url', { required: false, max: 500 })
    const quote = value(request.body, 'quote', { required: false, max: 2000 })
    const displayOrder = integer(request.body, 'displayOrder', { required: false, min: 0, max: 1_000_000 }) ?? 0
    const published = request.body?.published !== undefined ? Boolean(request.body.published) : true
    if (userId && !db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) throw fail(404, 'User not found')
    const result = db.prepare(`INSERT INTO team_profiles(user_id,name_override,role_title,image_url,linkedin_url,quote,display_order,published)
      VALUES(?,?,?,?,?,?,?,?)`).run(userId, nameOverride, roleTitle, imageUrl, linkedinUrl, quote, displayOrder, published ? 1 : 0)
    audit(request, 'create', 'team_profile', Number(result.lastInsertRowid), null, { id: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), user_id: userId, name_override: nameOverride, role_title: roleTitle, image_url: imageUrl, linkedin_url: linkedinUrl, quote, display_order: displayOrder, published }, 201)
  } catch (error) { next(error) }
})
app.patch('/api/team/:id', requireAuth, requirePermission('team.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM team_profiles WHERE id=?').get(id)
    if (!before) throw fail(404, 'Team profile not found')
    const userId = request.body.userId !== undefined ? integer(request.body, 'userId', { required: false, min: 1 }) ?? null : before.user_id
    const nameOverride = request.body.nameOverride !== undefined ? (value(request.body, 'nameOverride', { required: false, max: 160 }) ?? value(request.body, 'name_override', { required: false, max: 160 })) : before.name_override
    const roleTitle = request.body.roleTitle !== undefined ? (value(request.body, 'roleTitle', { max: 160 }) ?? value(request.body, 'role_title', { max: 160 })) : before.role_title
    const imageUrl = request.body.imageUrl !== undefined ? (value(request.body, 'imageUrl', { required: false, max: 500 }) ?? value(request.body, 'image_url', { required: false, max: 500 })) : before.image_url
    const linkedinUrl = request.body.linkedinUrl !== undefined ? (value(request.body, 'linkedinUrl', { required: false, max: 500 }) ?? value(request.body, 'linkedin_url', { required: false, max: 500 })) : before.linkedin_url
    const quote = request.body.quote !== undefined ? value(request.body, 'quote', { required: false, max: 2000 }) : before.quote
    const displayOrder = request.body.displayOrder !== undefined ? integer(request.body, 'displayOrder', { required: false, min: 0, max: 1_000_000 }) ?? before.display_order : before.display_order
    const published = request.body.published !== undefined ? Boolean(request.body.published) : Boolean(before.published)
    if (userId && !db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) throw fail(404, 'User not found')
    db.prepare(`UPDATE team_profiles SET user_id=?,name_override=?,role_title=?,image_url=?,linkedin_url=?,quote=?,display_order=?,published=? WHERE id=?`)
      .run(userId, nameOverride, roleTitle, imageUrl, linkedinUrl, quote, displayOrder, published ? 1 : 0, id)
    audit(request, 'update', 'team_profile', id, before, db.prepare('SELECT * FROM team_profiles WHERE id=?').get(id))
    send(response, { id, user_id: userId, name_override: nameOverride, role_title: roleTitle, image_url: imageUrl, linkedin_url: linkedinUrl, quote, display_order: displayOrder, published })
  } catch (error) { next(error) }
})
app.delete('/api/team/:id', requireAuth, requirePermission('team.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM team_profiles WHERE id=?').get(id)
    if (!before) throw fail(404, 'Team profile not found')
    db.prepare('UPDATE team_profiles SET published=0 WHERE id=?').run(id)
    audit(request, 'archive', 'team_profile', id, before, db.prepare('SELECT * FROM team_profiles WHERE id=?').get(id))
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.get('/api/challenges/manage', requireAuth, requirePermission('challenges.manage'), (request, response, next) => {
  try {
    send(response, db.prepare(`SELECT id,title,slug,category,difficulty,points,description,status,created_by,created_at,updated_at
      FROM challenges ORDER BY created_at DESC`).all())
  } catch (error) { next(error) }
})
app.post('/api/challenges', requireAuth, requirePermission('challenges.manage'), (request, response, next) => {
  try {
    const title = value(request.body, 'title', { max: 200 })
    const slug = slugify(value(request.body, 'slug', { required: false, max: 200 }) ?? title)
    const category = value(request.body, 'category', { max: 80 })
    const difficulty = value(request.body, 'difficulty', { max: 40 })
    const points = integer(request.body, 'points', { min: 0, max: 1000000 })
    const description = value(request.body, 'description', { max: 5000 })
    const flag = value(request.body, 'flag', { max: 500 })
    const status = value(request.body, 'status', { required: false, max: 20 }) ?? 'published'
    if (!['draft', 'published', 'archived'].includes(status)) throw fail(400, 'Invalid challenge status')
    const timestamp = now();
    const result = db.prepare(`INSERT INTO challenges(title,slug,category,difficulty,points,description,flag_hash,status,created_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(title, slug, category, difficulty, points, description, sha256(flag), status, request.user.id, timestamp, timestamp)
    audit(request, 'create', 'challenge', Number(result.lastInsertRowid), null, { id: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), title, slug, category, difficulty, points, description, status }, 201)
  } catch (error) { next(error) }
})
app.patch('/api/challenges/:id', requireAuth, requirePermission('challenges.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM challenges WHERE id=?').get(id)
    if (!before) throw fail(404, 'Challenge not found')
    const title = request.body.title !== undefined ? value(request.body, 'title', { max: 200 }) : before.title
    const slug = request.body.slug !== undefined ? slugify(value(request.body, 'slug', { required: false, max: 200 }) ?? title) : before.slug
    const category = request.body.category !== undefined ? value(request.body, 'category', { max: 80 }) : before.category
    const difficulty = request.body.difficulty !== undefined ? value(request.body, 'difficulty', { max: 40 }) : before.difficulty
    const points = request.body.points !== undefined ? integer(request.body, 'points', { min: 0, max: 1000000 }) : before.points
    const description = request.body.description !== undefined ? value(request.body, 'description', { max: 5000 }) : before.description
    const status = request.body.status !== undefined ? value(request.body, 'status', { required: false, max: 20 }) : before.status
    if (status && !['draft', 'published', 'archived'].includes(status)) throw fail(400, 'Invalid challenge status')
    const flag = request.body.flag !== undefined ? value(request.body, 'flag', { max: 500 }) : null
    const timestamp = now();
    db.prepare(`UPDATE challenges SET title=?,slug=?,category=?,difficulty=?,points=?,description=?,${flag ? 'flag_hash=?,':''}status=?,updated_at=? WHERE id=?`)
      .run(...([title, slug, category, difficulty, points, description].concat(flag ? [sha256(flag)] : []).concat([status, timestamp, id])))
    audit(request, 'update', 'challenge', id, before, db.prepare('SELECT * FROM challenges WHERE id=?').get(id))
    send(response, { id, title, slug, category, difficulty, points, description, status })
  } catch (error) { next(error) }
})
app.delete('/api/challenges/:id', requireAuth, requirePermission('challenges.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM challenges WHERE id=?').get(id)
    if (!before) throw fail(404, 'Challenge not found')
    db.prepare('UPDATE challenges SET status="archived",updated_at=? WHERE id=?').run(now(), id)
    audit(request, 'archive', 'challenge', id, before, db.prepare('SELECT * FROM challenges WHERE id=?').get(id))
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.patch('/api/site-settings/:key', requireAuth, requirePermission('site_settings.manage'), (request, response, next) => {
  try {
    const key = value(request.params, 'key', { max: 100 })
    const valueToSave = request.body?.value
    if (valueToSave === undefined) throw fail(400, 'value is required')
    const timestamp = now();
    db.prepare('INSERT INTO site_settings(key,value_json,updated_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at')
      .run(key, JSON.stringify(valueToSave), request.user.id, timestamp)
    audit(request, 'update', 'site_setting', key, null, { key, value: valueToSave })
    send(response, { key, value: valueToSave })
  } catch (error) { next(error) }
})

app.get('/api/admin/contact-messages', requireAuth, requirePermission('contact.manage'), (request, response, next) => {
  try {
    send(response, db.prepare(`SELECT c.*,u.display_name AS assigned_name FROM contact_messages c LEFT JOIN users u ON u.id=c.assigned_to ORDER BY c.created_at DESC`).all())
  } catch (error) { next(error) }
})
app.patch('/api/admin/contact-messages/:id', requireAuth, requirePermission('contact.manage'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 })
    const before = db.prepare('SELECT * FROM contact_messages WHERE id=?').get(id)
    if (!before) throw fail(404, 'Contact message not found')
    const status = request.body.status !== undefined ? value(request.body, 'status', { max: 40 }) : before.status
    if (status && !['new', 'in_progress', 'resolved', 'spam'].includes(status)) throw fail(400, 'Invalid contact status')
    const assignedTo = request.body.assignedTo !== undefined ? integer(request.body, 'assignedTo', { required: false, min: 1 }) : before.assigned_to
    if (assignedTo && !db.prepare('SELECT 1 FROM users WHERE id=?').get(assignedTo)) throw fail(404, 'Assigned user not found')
    const resolvedAt = status === 'resolved' && !before.resolved_at ? now() : before.resolved_at
    db.prepare('UPDATE contact_messages SET status=?,assigned_to=?,resolved_at=? WHERE id=?').run(status, assignedTo ?? null, resolvedAt, id)
    audit(request, 'triage', 'contact_message', id, before, db.prepare('SELECT * FROM contact_messages WHERE id=?').get(id))
    send(response, { id, status, assigned_to: assignedTo ?? null, resolved_at: resolvedAt })
  } catch (error) { next(error) }
})

app.get('/api/admin/memberships/pending-payment', requireAuth, requirePermission('membership.payment'), (request, response, next) => {
  try {
    send(response, db.prepare(`SELECT m.id,m.user_id,m.application_id,m.status,m.starts_at,m.expires_at,p.name AS plan_name,p.fee_paise,p.currency,
      u.email,u.display_name
      FROM memberships m JOIN membership_plans p ON p.id=m.plan_id JOIN users u ON u.id=m.user_id
      WHERE m.status='pending_payment' ORDER BY m.created_at DESC`).all())
  } catch (error) { next(error) }
})

app.post('/api/contact-messages', (request, response, next) => {
  try {
    const name = value(request.body, 'name', { max: 160 }); const address = email(request.body); const message = value(request.body, 'message', { max: 5000 })
    const result = db.prepare('INSERT INTO contact_messages(name,email,user_id,message,created_at) VALUES(?,?,?,?,?)').run(name, address, request.user?.id ?? null, message, now())
    send(response, { id: Number(result.lastInsertRowid), status: 'new' }, 201)
  } catch (error) { next(error) }
})
app.post('/api/membership-applications', (request, response, next) => {
  try {
    const body = request.body; const fullName = value(body, 'fullName', { max: 160 }); const studentId = value(body, 'studentId', { max: 80 })
    const branch = value(body, 'branch', { max: 120 }); const academicYear = integer(body, 'academicYear', { min: 1, max: 10 })
    const rollNumber = value(body, 'rollNumber', { max: 80 }); const collegeEmail = email(body, 'collegeEmail')
    const personalEmail = email(body, 'personalEmail', false); const phone = value(body, 'phone', { required: false, max: 40 })
    const graduationYear = integer(body, 'graduationYear', { required: false, min: 2000, max: 2200 }); const interestArea = value(body, 'interestArea', { max: 160 })
    const motivation = value(body, 'motivation', { required: false, max: 5000 })
    const result = transaction(() => {
      const timestamp = now(); let profile = db.prepare('SELECT * FROM student_profiles WHERE student_id=? OR college_email=? LIMIT 1').get(studentId, collegeEmail)
      if (profile) {
        db.prepare(`UPDATE student_profiles SET full_name=?,student_id=?,branch=?,academic_year=?,roll_number=?,college_email=?,personal_email=?,phone=?,graduation_year=?,updated_at=? WHERE id=?`)
          .run(fullName, studentId, branch, academicYear, rollNumber, collegeEmail, personalEmail, phone, graduationYear, timestamp, profile.id)
      } else {
        const inserted = db.prepare(`INSERT INTO student_profiles(full_name,student_id,branch,academic_year,roll_number,college_email,personal_email,phone,graduation_year,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(fullName, studentId, branch, academicYear, rollNumber, collegeEmail, personalEmail, phone, graduationYear, timestamp, timestamp)
        profile = { id: Number(inserted.lastInsertRowid) }
      }
      const inserted = db.prepare(`INSERT INTO membership_applications(student_profile_id,interest_area,motivation,submitted_at,updated_at)
        VALUES(?,?,?,?,?)`).run(profile.id, interestArea, motivation, timestamp, timestamp)
      return Number(inserted.lastInsertRowid)
    })
    send(response, { id: result, status: 'submitted' }, 201)
  } catch (error) { next(error) }
})

app.get('/api/me/profile', requireAuth, (request, response, next) => { try { send(response, db.prepare('SELECT * FROM student_profiles WHERE user_id=?').get(request.user.id) ?? null) } catch (error) { next(error) } })
app.patch('/api/me/profile', requireAuth, (request, response, next) => {
  try {
    const fields = { fullName: 'full_name', branch: 'branch', academicYear: 'academic_year', rollNumber: 'roll_number', personalEmail: 'personal_email', phone: 'phone', graduationYear: 'graduation_year' }
    const updates = []; const params = []
    Object.entries(fields).forEach(([key, column]) => { if (request.body[key] !== undefined) { const parsed = key.includes('Year') ? integer(request.body, key, { min: key === 'academicYear' ? 1 : 2000, max: key === 'academicYear' ? 10 : 2200 }) : key === 'personalEmail' ? email(request.body, key, false) : value(request.body, key, { required: false, max: 200 }); updates.push(`${column}=?`); params.push(parsed) } })
    if (!updates.length) throw fail(400, 'No profile fields supplied')
    params.push(now(), request.user.id); db.prepare(`UPDATE student_profiles SET ${updates.join(',')},updated_at=? WHERE user_id=?`).run(...params); send(response, db.prepare('SELECT * FROM student_profiles WHERE user_id=?').get(request.user.id) ?? null)
  } catch (error) { next(error) }
})
app.get('/api/me/membership', requireAuth, (request, response, next) => { try { send(response, db.prepare(`SELECT m.*,p.name AS plan_name,p.fee_paise,p.currency FROM memberships m JOIN membership_plans p ON p.id=m.plan_id WHERE m.user_id=? ORDER BY m.created_at DESC`).all(request.user.id)) } catch (error) { next(error) } })
app.get('/api/me/dashboard', requireAuth, requireMember, (request, response, next) => {
  try {
    const solved = db.prepare('SELECT COALESCE(SUM(points_awarded),0) AS points,COUNT(*) AS solved FROM challenge_solves WHERE user_id=?').get(request.user.id)
    send(response, { user: request.user, membership: db.prepare(`SELECT m.*,p.name AS plan_name FROM memberships m JOIN membership_plans p ON p.id=m.plan_id WHERE m.user_id=? ORDER BY m.created_at DESC LIMIT 1`).get(request.user.id) ?? null, solved, registrations: db.prepare(`SELECT er.*,e.title,e.slug FROM event_registrations er JOIN events e ON e.id=er.event_id WHERE er.user_id=? ORDER BY er.registered_at DESC LIMIT 10`).all(request.user.id) })
  } catch (error) { next(error) }
})
app.get('/api/challenges', requireMember, (request, response, next) => { try { send(response, db.prepare(`SELECT c.id,c.title,c.slug,c.category,c.difficulty,c.points,c.description,c.status,EXISTS(SELECT 1 FROM challenge_solves s WHERE s.challenge_id=c.id AND s.user_id=?) AS solved FROM challenges c WHERE c.status='published' ORDER BY c.id`).all(request.user.id)) } catch (error) { next(error) } })
app.post('/api/challenges/:id/submissions', requireMember, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); const flag = value(request.body, 'flag', { max: 1000 }); const challenge = db.prepare("SELECT * FROM challenges WHERE id=? AND status='published'").get(id)
    if (!challenge) throw fail(404, 'Challenge not found')
    const correct = sha256(flag) === challenge.flag_hash; const timestamp = now()
    db.prepare('INSERT INTO challenge_submissions(challenge_id,user_id,submitted_value_hash,is_correct,submitted_at) VALUES(?,?,?,?,?)').run(id, request.user.id, sha256(flag), correct ? 1 : 0, timestamp)
    if (correct) db.prepare('INSERT OR IGNORE INTO challenge_solves(challenge_id,user_id,points_awarded,solved_at) VALUES(?,?,?,?)').run(id, request.user.id, challenge.points, timestamp)
    send(response, { correct, solved: Boolean(db.prepare('SELECT 1 FROM challenge_solves WHERE challenge_id=? AND user_id=?').get(id, request.user.id)), points: correct ? challenge.points : 0 })
  } catch (error) { next(error) }
})
app.get('/api/leaderboard', requireMember, (request, response, next) => { try { send(response, db.prepare(`SELECT u.id,u.display_name AS name,COALESCE(SUM(s.points_awarded),0) AS score,COUNT(s.id) AS solves FROM users u LEFT JOIN challenge_solves s ON s.user_id=u.id GROUP BY u.id ORDER BY score DESC,name LIMIT 100`).all()) } catch (error) { next(error) } })

function requireReview(request, _response, next) { return requirePermission('membership.review')(request, _response, next) }
app.get('/api/admin/membership-applications', requireAuth, requireReview, (request, response, next) => { try { send(response, db.prepare(`SELECT a.*,p.* FROM membership_applications a JOIN student_profiles p ON p.id=a.student_profile_id ORDER BY a.submitted_at DESC`).all()) } catch (error) { next(error) } })
app.get('/api/admin/membership-applications/:id', requireAuth, requireReview, (request, response, next) => { try { const id = integer({ id: request.params.id }, 'id', { min: 1 }); const row = db.prepare(`SELECT a.*,p.* FROM membership_applications a JOIN student_profiles p ON p.id=a.student_profile_id WHERE a.id=?`).get(id); if (!row) throw fail(404, 'Application not found'); send(response, row) } catch (error) { next(error) } })
app.post('/api/admin/membership-applications/:id/approve', requireAuth, requireReview, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); const result = transaction(() => {
      const appRow = db.prepare(`SELECT a.*,p.* FROM membership_applications a JOIN student_profiles p ON p.id=a.student_profile_id WHERE a.id=?`).get(id)
      if (!appRow) throw fail(404, 'Application not found')
      const timestamp = now(); const memberRole = db.prepare("SELECT id FROM roles WHERE key='member'").get().id
      let user = db.prepare('SELECT * FROM users WHERE email=?').get(appRow.college_email)
      if (!user) {
        const inserted = db.prepare(`INSERT INTO users(email,display_name,role_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(appRow.college_email, appRow.full_name, memberRole, 'pending', timestamp, timestamp)
        user = { id: Number(inserted.lastInsertRowid) }
      } else db.prepare('UPDATE users SET role_id=?,updated_at=? WHERE id=?').run(memberRole, timestamp, user.id)
      db.prepare('UPDATE student_profiles SET user_id=?,updated_at=? WHERE id=?').run(user.id, timestamp, appRow.student_profile_id)
      db.prepare("UPDATE membership_applications SET status='approved',reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?").run(request.user.id, timestamp, timestamp, id)
      const plan = db.prepare('SELECT id FROM membership_plans WHERE active=1 ORDER BY id LIMIT 1').get()
      const membership = db.prepare('SELECT id FROM memberships WHERE application_id=?').get(id)
      const membershipId = membership?.id ?? Number(db.prepare(`INSERT INTO memberships(user_id,application_id,plan_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(user.id, id, plan.id, 'pending_payment', timestamp, timestamp).lastInsertRowid)
      const activationToken = randomBytes(32).toString('base64url')
      db.prepare(`INSERT INTO activation_tokens(id,user_id,token_hash,expires_at,created_at)
        VALUES(?,?,?,?,?)`).run(randomBytes(16).toString('hex'), user.id, hashToken(activationToken),
        new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), timestamp)
      return { userId: user.id, membershipId, applicationId: id, activationToken }
    })
    audit(request, 'approve', 'membership_application', id, null, result); send(response, result)
  } catch (error) { next(error) }
})
app.post('/api/admin/membership-applications/:id/reject', requireAuth, requireReview, (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); const reason = value(request.body, 'reason', { required: false, max: 1000 }); const result = db.prepare("UPDATE membership_applications SET status='rejected',rejection_reason=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=? AND status NOT IN ('approved','withdrawn')").run(reason, request.user.id, now(), now(), id)
    if (!result.changes) throw fail(404, 'Application not found or already decided')
    audit(request, 'reject', 'membership_application', id, null, { reason }); send(response, { ok: true })
  } catch (error) { next(error) }
})
app.post('/api/admin/memberships/:id/confirm-payment', requireAuth, requirePermission('membership.payment'), (request, response, next) => {
  try {
    const id = integer({ id: request.params.id }, 'id', { min: 1 }); const membership = db.prepare(`SELECT m.*,p.fee_paise,p.duration_days,p.currency FROM memberships m JOIN membership_plans p ON p.id=m.plan_id WHERE m.id=?`).get(id)
    if (!membership) throw fail(404, 'Membership not found')
    const amount = integer(request.body, 'amountPaise', { required: false, min: 0 }) ?? membership.fee_paise
    if (amount !== membership.fee_paise) throw fail(400, 'Payment amount does not match the membership plan')
    const timestamp = now(); const expires = new Date(Date.now() + membership.duration_days * 86400_000).toISOString()
    transaction(() => {
      db.prepare(`INSERT INTO payments(membership_id,provider,provider_reference,amount_paise,currency,status,paid_at,metadata_json,created_at,updated_at)
        VALUES(?,?,?,?,?,'paid',?,?,?,?)`).run(id, request.body.provider || 'manual', request.body.providerReference || null, amount, membership.currency, timestamp, request.body.metadata ? JSON.stringify(request.body.metadata) : null, timestamp, timestamp)
      db.prepare("UPDATE memberships SET status='active',starts_at=?,expires_at=?,updated_at=? WHERE id=?").run(timestamp, expires, timestamp, id)
      db.prepare("UPDATE users SET status='active',email_verified_at=COALESCE(email_verified_at,?),updated_at=? WHERE id=?").run(timestamp, timestamp, membership.user_id)
    })
    audit(request, 'confirm_payment', 'membership', id, membership, { status: 'active', expires_at: expires }); send(response, { id, status: 'active', startsAt: timestamp, expiresAt: expires })
  } catch (error) { next(error) }
})

app.get('/api/admin/architecture', requireAuth, requirePermission('permissions.manage'), (request, response, next) => {
  try {
    const permissionRows = db.prepare('SELECT id,key,description FROM permissions ORDER BY key').all()
    const roleRows = db.prepare('SELECT id,key,name,description,hierarchy_level FROM roles ORDER BY hierarchy_level DESC').all()
    const enabled = db.prepare('SELECT role_id,permission_id FROM role_permissions').all()
    const enabledSet = new Set(enabled.map((row) => `${row.role_id}:${row.permission_id}`))
    const rolePermissions = roleRows.map((role) => ({
      ...role,
      permissions: permissionRows.map((permission) => ({
        ...permission,
        enabled: enabledSet.has(`${role.id}:${permission.id}`),
      })),
    }))
    const positions = db.prepare(`SELECT cp.id,cp.key,cp.name,cp.description,
      up.user_id,u.display_name,u.email
      FROM core_positions cp
      LEFT JOIN user_positions up ON up.position_id=cp.id
      LEFT JOIN users u ON u.id=up.user_id
      ORDER BY cp.display_order,u.display_name`).all()
    const users = db.prepare(`SELECT u.id,u.email,u.display_name,u.status,r.key AS role,
      GROUP_CONCAT(cp.key) AS position_keys
      FROM users u JOIN roles r ON r.id=u.role_id
      LEFT JOIN user_positions up ON up.user_id=u.id
      LEFT JOIN core_positions cp ON cp.id=up.position_id
      GROUP BY u.id ORDER BY u.display_name`).all().map((user) => ({
      ...user,
      position_keys: user.position_keys ? user.position_keys.split(',') : [],
    }))
    send(response, { roles: rolePermissions, positions, users })
  } catch (error) { next(error) }
})

app.patch('/api/admin/users/:userId/role', requireAuth, requirePermission('users.manage'), (request, response, next) => {
  try {
    const userId = integer(request.params, 'userId', { min: 1 })
    const roleKey = value(request.body, 'role', { max: 40 })
    if (!roles.includes(roleKey) || roleKey === 'visitor') throw fail(400, 'Role must be member or core')
    if (userId === request.user.id && roleKey !== 'admin') throw fail(400, 'You cannot remove your own admin role')
    const role = db.prepare('SELECT id FROM roles WHERE key=?').get(roleKey)
    const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(userId)
    if (!role || !user) throw fail(404, 'User or role not found')
    db.prepare('UPDATE users SET role_id=?,updated_at=? WHERE id=?').run(role.id, now(), userId)
    audit(request, 'change_role', 'user', userId, null, { role: roleKey })
    send(response, { id: userId, role: roleKey })
  } catch (error) { next(error) }
})

app.patch('/api/admin/roles/:roleKey/permissions/:permissionKey', requireAuth, requirePermission('permissions.manage'), (request, response, next) => {
  try {
    const roleKey = value(request.params, 'roleKey', { max: 80 })
    const permissionKey = value(request.params, 'permissionKey', { max: 120 })
    const enabled = request.body?.enabled
    if (typeof enabled !== 'boolean') throw fail(400, 'enabled must be a boolean')
    if (roleKey === 'admin' && permissionKey === 'permissions.manage' && !enabled) {
      throw fail(400, 'The admin permission manager cannot disable its own access')
    }
    const role = db.prepare('SELECT id FROM roles WHERE key=?').get(roleKey)
    const permission = db.prepare('SELECT id FROM permissions WHERE key=?').get(permissionKey)
    if (!role || !permission) throw fail(404, 'Role or permission not found')
    if (enabled) {
      db.prepare('INSERT OR IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)').run(role.id, permission.id)
    } else {
      db.prepare('DELETE FROM role_permissions WHERE role_id=? AND permission_id=?').run(role.id, permission.id)
    }
    audit(request, enabled ? 'enable_permission' : 'disable_permission', 'role', role.id, null, { roleKey, permissionKey, enabled })
    send(response, { role: roleKey, permission: permissionKey, enabled })
  } catch (error) { next(error) }
})

app.post('/api/admin/users/:userId/positions', requireAuth, requirePermission('positions.manage'), (request, response, next) => {
  try {
    const userId = integer(request.params, 'userId', { min: 1 })
    const positionKey = value(request.body, 'positionKey', { max: 80 })
    const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId)
    const position = db.prepare('SELECT id FROM core_positions WHERE key=?').get(positionKey)
    if (!user || !position) throw fail(404, 'User or core position not found')
    db.prepare('INSERT OR IGNORE INTO user_positions(user_id,position_id,assigned_by,assigned_at) VALUES(?,?,?,?)').run(userId, position.id, request.user.id, now())
    audit(request, 'assign_position', 'user', userId, null, { positionKey })
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.delete('/api/admin/users/:userId/positions/:positionKey', requireAuth, requirePermission('positions.manage'), (request, response, next) => {
  try {
    const userId = integer(request.params, 'userId', { min: 1 })
    const positionKey = value(request.params, 'positionKey', { max: 80 })
    const result = db.prepare(`DELETE FROM user_positions
      WHERE user_id=? AND position_id=(SELECT id FROM core_positions WHERE key=?)`).run(userId, positionKey)
    if (!result.changes) throw fail(404, 'Position assignment not found')
    audit(request, 'remove_position', 'user', userId, null, { positionKey })
    send(response, { ok: true })
  } catch (error) { next(error) }
})

app.get('/api/comments/:entityType/:entityId', requireAuth, requirePermission('content.read'), (request, response, next) => {
  try {
    const entityId = integer(request.params, 'entityId', { min: 1 })
    send(response, db.prepare(`SELECT c.id,c.entity_type,c.entity_id,c.body,c.created_at,c.updated_at,
      u.id AS author_id,u.display_name AS author_name
      FROM comments c JOIN users u ON u.id=c.author_user_id
      WHERE c.entity_type=? AND c.entity_id=? ORDER BY c.created_at`).all(request.params.entityType, entityId))
  } catch (error) { next(error) }
})

app.post('/api/comments/:entityType/:entityId', requireAuth, requirePermission('content.comment'), (request, response, next) => {
  try {
    const entityId = integer(request.params, 'entityId', { min: 1 })
    const body = value(request.body, 'body', { max: 5000 })
    const timestamp = now()
    const result = db.prepare(`INSERT INTO comments(author_user_id,entity_type,entity_id,body,created_at,updated_at)
      VALUES(?,?,?,?,?,?)`).run(request.user.id, request.params.entityType, entityId, body, timestamp, timestamp)
    audit(request, 'comment', request.params.entityType, entityId, null, { commentId: Number(result.lastInsertRowid) })
    send(response, { id: Number(result.lastInsertRowid), status: 'created' }, 201)
  } catch (error) { next(error) }
})

app.use((error, _request, response, _next) => {
  const status = error.status ?? (error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500)
  if (status >= 500) console.error(error)
  send(response, { error: status === 500 ? 'Internal server error' : error.message, ...(error.details ? { details: error.details } : {}) }, status)
})

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => console.log(`Security Club API listening on http://localhost:${port}`))
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the existing backend process or set PORT to another value.`)
      process.exitCode = 1
      return
    }
    console.error('Unable to start the Security Club API:', error)
    process.exitCode = 1
  })
}
export { app }
