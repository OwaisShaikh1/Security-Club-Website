import express from 'express'
import { db } from './db.js'
import { canAccess, pageAccess, roles } from './access.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(express.json())
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Role')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

function requestRole(request) {
  const role = request.header('x-user-role') ?? 'visitor'
  return roles.includes(role) ? role : 'visitor'
}

function requirePageAccess(request, response, next) {
  const pagePath = `/${request.params.pageKey}`
  const requiredRole = pageAccess[pagePath]
  if (!requiredRole || canAccess(requestRole(request), requiredRole)) {
    next()
    return
  }
  response.status(403).json({ error: 'Forbidden', role: requestRole(request), requiredRole })
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/auth/me', (request, response) => {
  const role = requestRole(request)
  response.json({ role, permissions: Object.keys(pageAccess).filter((path) => canAccess(role, pageAccess[path])) })
})

app.get('/api/pages/access', (request, response) => {
  const role = requestRole(request)
  response.json({ role, pages: Object.entries(pageAccess).filter(([, requiredRole]) => canAccess(role, requiredRole)).map(([path]) => path) })
})

app.get('/api/events', (request, response) => {
  const events = db.prepare('SELECT id, title, date, type, description, tags FROM events ORDER BY date').all()
  response.json(events.map((event) => ({ ...event, tags: event.tags.split(',') })))
})

app.get('/api/pages/:pageKey', requirePageAccess, (request, response) => {
  response.json({ pageKey: request.params.pageKey, role: requestRole(request), access: 'granted' })
})

app.listen(port, () => {
  console.log(`Security Club API listening on http://localhost:${port}`)
})
