import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/security-club.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')

const hasTable = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
const columns = (name) => hasTable(name)
  ? db.prepare(`PRAGMA table_info("${name}")`).all().map((row) => row.name)
  : []

// The first migration also makes an existing development database safe to upgrade
// from the original two-table prototype.
if (hasTable('users') && !columns('users').includes('role_id')) {
  db.exec('ALTER TABLE users RENAME TO legacy_users_v1')
}
if (hasTable('events') && !columns('events').includes('slug')) {
  db.exec('ALTER TABLE events RENAME TO legacy_events_v1')
}

db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`)

const schemaVersion = Number(db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version)
if (schemaVersion < 1) {
  db.exec('BEGIN IMMEDIATE')
  try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      hierarchy_level INTEGER NOT NULL DEFAULT 0, description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT, display_name TEXT NOT NULL, role_id INTEGER NOT NULL REFERENCES roles(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','disabled')),
      email_verified_at TEXT, last_login_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL, student_id TEXT NOT NULL UNIQUE, branch TEXT NOT NULL,
      academic_year INTEGER NOT NULL, roll_number TEXT NOT NULL, college_email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      personal_email TEXT, phone TEXT, graduation_year INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, fee_paise INTEGER NOT NULL CHECK (fee_paise >= 0),
      currency TEXT NOT NULL DEFAULT 'INR', duration_days INTEGER NOT NULL CHECK (duration_days > 0),
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership_applications (
      id INTEGER PRIMARY KEY, student_profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','withdrawn')),
      interest_area TEXT NOT NULL, motivation TEXT, reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TEXT, rejection_reason TEXT, submitted_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER NOT NULL REFERENCES membership_applications(id), plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
      status TEXT NOT NULL CHECK (status IN ('pending_payment','active','expired','cancelled')),
      starts_at TEXT, expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY, membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('manual','razorpay','other')), provider_reference TEXT UNIQUE,
      amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0), currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL CHECK (status IN ('created','pending','paid','failed','refunded')),
      paid_at TEXT, metadata_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS event_types (id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT);
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, event_type_id INTEGER NOT NULL REFERENCES event_types(id),
      summary TEXT NOT NULL, description TEXT NOT NULL, venue TEXT, starts_at TEXT NOT NULL, ends_at TEXT,
      registration_open_at TEXT, registration_close_at TEXT, capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS event_tags (
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (event_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS event_heads (
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by INTEGER NOT NULL REFERENCES users(id), assigned_at TEXT NOT NULL, PRIMARY KEY (event_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY, event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','waitlisted','cancelled','attended')),
      registered_at TEXT NOT NULL, checked_in_at TEXT, UNIQUE (event_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, category TEXT NOT NULL,
      difficulty TEXT NOT NULL, points INTEGER NOT NULL CHECK (points >= 0), description TEXT NOT NULL,
      flag_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenge_submissions (
      id INTEGER PRIMARY KEY, challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, submitted_value_hash TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0, submitted_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenge_solves (
      id INTEGER PRIMARY KEY, challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, points_awarded INTEGER NOT NULL,
      solved_at TEXT NOT NULL, UNIQUE (challenge_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS flagships (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL,
      image_url TEXT, year INTEGER, status TEXT NOT NULL DEFAULT 'published', created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_profiles (
      id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name_override TEXT,
      role_title TEXT NOT NULL, image_url TEXT, linkedin_url TEXT, quote TEXT, display_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY, event_id INTEGER REFERENCES events(id) ON DELETE SET NULL, image_url TEXT NOT NULL,
      caption TEXT, taken_at TEXT, published INTEGER NOT NULL DEFAULT 1, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, role_label TEXT, quote TEXT NOT NULL, image_url TEXT,
      published INTEGER NOT NULL DEFAULT 1, display_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0, rank_snapshot INTEGER, season TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE (user_id, season)
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved','spam')),
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL, resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY, actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id INTEGER, before_json TEXT, after_json TEXT, ip_address TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON student_profiles(student_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications(status);
    CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON memberships(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, starts_at);
    CREATE INDEX IF NOT EXISTS idx_event_heads_user ON event_heads(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_user ON challenge_submissions(challenge_id, user_id, submitted_at);
    CREATE INDEX IF NOT EXISTS idx_solves_user ON challenge_solves(user_id);
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  `)
  db.prepare('INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)').run(1, 'initial schema', new Date().toISOString())
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* preserve original migration error */ }
    throw error
  }
}

export const now = () => new Date().toISOString()
export const transaction = (callback) => {
  db.exec('BEGIN IMMEDIATE')
  try {
    const value = callback()
    db.exec('COMMIT')
    return value
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* preserve original error */ }
    throw error
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }).toString('hex')
  return `scrypt$16384$8$1$${salt}$${derived}`
}

export function verifyPassword(password, stored) {
  try {
    const [, n, r, p, salt, encoded] = String(stored).split('$')
    const derived = scryptSync(password, salt, 64, { N: Number(n), r: Number(r), p: Number(p), maxmem: 32 * 1024 * 1024 })
    return timingSafeEqual(derived, Buffer.from(encoded, 'hex'))
  } catch {
    return false
  }
}

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
export const slugify = (value) => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
export const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex')

function seed() {
  const timestamp = now()
  const roles = [
    ['admin', 'Administrator', 3, 'Full access'],
    ['core', 'Core Team', 2, 'Club core team access'],
    ['member', 'Member', 1, 'Approved member access'],
    ['visitor', 'Visitor', 0, 'Public access'],
  ]
  const permissions = [
    ['pages.view_public', 'View public content'], ['contact.create', 'Submit contact messages'],
    ['membership.apply', 'Submit membership applications'], ['pages.view_member', 'View member content'],
    ['challenges.submit', 'Submit challenge flags'], ['events.register', 'Register for events'],
    ['events.create', 'Create events'], ['events.update', 'Update events'], ['events.delete', 'Delete events'],
    ['events.publish', 'Publish events'], ['events.heads', 'Assign event heads'], ['membership.review', 'Review applications'],
    ['membership.payment', 'Confirm payments'], ['content.manage', 'Manage content'], ['users.manage', 'Manage users'],
  ]
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles(key,name,hierarchy_level,description) VALUES(?,?,?,?)')
  roles.forEach((row) => insertRole.run(...row))
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions(key,description) VALUES(?,?)')
  permissions.forEach((row) => insertPermission.run(...row))
  const roleId = (key) => db.prepare('SELECT id FROM roles WHERE key = ?').get(key).id
  const permissionId = (key) => db.prepare('SELECT id FROM permissions WHERE key = ?').get(key).id
  const mappings = {
    visitor: ['pages.view_public', 'contact.create', 'membership.apply'],
    member: ['pages.view_public', 'contact.create', 'membership.apply', 'pages.view_member', 'challenges.submit', 'events.register'],
    core: permissions.map(([key]) => key).filter((key) => !['users.manage', 'membership.review', 'membership.payment'].includes(key)),
    admin: permissions.map(([key]) => key),
  }
  const map = db.prepare('INSERT OR IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)')
  Object.entries(mappings).forEach(([role, keys]) => keys.forEach((key) => map.run(roleId(role), permissionId(key))))

  const typeRows = [['workshop', 'Workshop', 'Hands-on learning'], ['ctf', 'Capture The Flag', 'Competitive security challenge'], ['seminar', 'Seminar', 'Talk or seminar']]
  const typeInsert = db.prepare('INSERT OR IGNORE INTO event_types(key,name,description) VALUES(?,?,?)')
  typeRows.forEach((row) => typeInsert.run(...row))
  if (hasTable('legacy_users_v1')) {
    const legacyUsers = db.prepare('SELECT id,username,role FROM legacy_users_v1').all()
    const insertLegacyUser = db.prepare(`INSERT OR IGNORE INTO users
      (id,email,display_name,role_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`)
    legacyUsers.forEach((user) => {
      const username = String(user.username).trim()
      const role = roles.some(([key]) => key === user.role) ? user.role : 'visitor'
      const timestamp = now()
      insertLegacyUser.run(user.id, `${username}@legacy.invalid`, username, roleId(role), 'active', timestamp, timestamp)
    })
  }
  db.prepare('INSERT OR IGNORE INTO membership_plans(name,fee_paise,currency,duration_days,active,created_at) VALUES(?,?,?,?,?,?)')
    .run('Standard Membership', 10000, 'INR', 365, 1, timestamp)

  const typeId = (key) => db.prepare('SELECT id FROM event_types WHERE key = ?').get(key).id
  const eventInsert = db.prepare(`INSERT OR IGNORE INTO events
    (title,slug,event_type_id,summary,description,venue,starts_at,ends_at,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
  eventInsert.run('Ethical Hacking Workshop', 'ethical-hacking-workshop', typeId('workshop'), 'Kali Linux and penetration testing fundamentals.', 'Hands-on Kali Linux and penetration testing fundamentals.', 'Security Lab', '2026-05-10T10:00:00.000Z', '2026-05-10T13:00:00.000Z', 'published', timestamp, timestamp)
  eventInsert.run('Network Defense Lab', 'network-defense-lab', typeId('seminar'), 'Threat modeling and blue-team monitoring.', 'Threat modeling and blue-team monitoring with practical labs.', 'Computer Lab', '2026-05-24T10:00:00.000Z', '2026-05-24T13:00:00.000Z', 'published', timestamp, timestamp)
  eventInsert.run('Mini Capture The Flag', 'mini-capture-the-flag', typeId('ctf'), 'Solve web, crypto, and forensics challenges.', 'Solve web, crypto, and forensics challenges for leaderboard points.', 'Online', '2026-06-05T16:00:00.000Z', '2026-06-05T19:00:00.000Z', 'published', timestamp, timestamp)
  if (hasTable('legacy_events_v1')) {
    const legacyEvents = db.prepare('SELECT id,title,date,type,description,tags FROM legacy_events_v1').all()
    const insertLegacyEvent = db.prepare(`INSERT OR IGNORE INTO events
      (id,title,slug,event_type_id,summary,description,starts_at,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,'published',?,?)`)
    const insertLegacyTag = db.prepare('INSERT OR IGNORE INTO tags(name,slug) VALUES(?,?)')
    const linkLegacyTag = db.prepare('INSERT OR IGNORE INTO event_tags(event_id,tag_id) SELECT ?,id FROM tags WHERE slug=?')
    legacyEvents.forEach((event) => {
      const slug = slugify(event.title)
      const eventType = typeRows.some(([key]) => key === event.type) ? event.type : 'seminar'
      const eventTimestamp = now()
      insertLegacyEvent.run(event.id, event.title, slug, typeId(eventType), event.description, event.description, event.date, eventTimestamp, eventTimestamp)
      String(event.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean).forEach((tag) => {
        insertLegacyTag.run(tag, slugify(tag))
        linkLegacyTag.run(event.id, slugify(tag))
      })
    })
  }
  const tagInsert = db.prepare('INSERT OR IGNORE INTO tags(name,slug) VALUES(?,?)')
  ;[['Kali', 'kali'], ['Web Security', 'web-security'], ['Beginner', 'beginner'], ['Networking', 'networking'], ['SOC', 'soc'], ['Defense', 'defense'], ['CTF', 'ctf'], ['Crypto', 'crypto'], ['Forensics', 'forensics']].forEach((row) => tagInsert.run(...row))
  const eventTag = db.prepare('INSERT OR IGNORE INTO event_tags(event_id,tag_id) SELECT e.id,t.id FROM events e,tags t WHERE e.slug=? AND t.slug=?')
  ;[['ethical-hacking-workshop', 'kali'], ['ethical-hacking-workshop', 'web-security'], ['ethical-hacking-workshop', 'beginner'], ['network-defense-lab', 'networking'], ['network-defense-lab', 'soc'], ['network-defense-lab', 'defense'], ['mini-capture-the-flag', 'ctf'], ['mini-capture-the-flag', 'crypto'], ['mini-capture-the-flag', 'forensics']].forEach((row) => eventTag.run(...row))
  const site = db.prepare('INSERT OR IGNORE INTO site_settings(key,value_json,updated_at) VALUES(?,?,?)')
  ;[['club_name', JSON.stringify('Security Club')], ['membership_fee', JSON.stringify({ amount: 100, currency: 'INR' })], ['contact_email', JSON.stringify('securityclub@example.edu')]].forEach(([key, value]) => site.run(key, value, timestamp))
  const challenge = db.prepare(`INSERT OR IGNORE INTO challenges
    (title,slug,category,difficulty,points,description,flag_hash,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`)
  challenge.run('Welcome Challenge', 'welcome-challenge', 'web', 'beginner', 100, 'Find the flag hidden in the club welcome challenge.', sha256('flag{welcome_to_security_club}'), 'published', timestamp, timestamp)
  const flagship = db.prepare('INSERT OR IGNORE INTO flagships(title,slug,description,year,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
  flagship.run('Secure Campus Initiative', 'secure-campus-initiative', 'A student-led initiative for practical security awareness.', 2026, 'published', timestamp, timestamp)
  const testimonial = db.prepare('INSERT OR IGNORE INTO testimonials(name,role_label,quote,published,display_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
  testimonial.run('Security Club Alumni', 'Alumni', 'The club turns curiosity into practical security skills.', 1, 1, timestamp, timestamp)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && !db.prepare('SELECT 1 FROM users WHERE email = ?').get(process.env.ADMIN_EMAIL.trim().toLowerCase())) {
    db.prepare(`INSERT INTO users(email,password_hash,display_name,role_id,status,email_verified_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(process.env.ADMIN_EMAIL.trim().toLowerCase(), hashPassword(process.env.ADMIN_PASSWORD), process.env.ADMIN_NAME ?? 'Club Administrator', roleId('admin'), 'active', timestamp, timestamp, timestamp)
  }
}

transaction(seed)
