import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/security-club.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'core', 'member', 'visitor'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL
  );
`)

const eventCount = db.prepare('SELECT COUNT(*) AS count FROM events').get().count
if (eventCount === 0) {
  const insert = db.prepare('INSERT INTO events (id, title, date, type, description, tags) VALUES (?, ?, ?, ?, ?, ?)')
  insert.run(1, 'Ethical Hacking Workshop', '2026-05-10', 'workshop', 'Hands-on Kali Linux and penetration testing fundamentals.', 'kali,web-security,beginner')
  insert.run(2, 'Network Defense Lab', '2026-05-24', 'seminar', 'Threat modeling and blue-team monitoring with practical labs.', 'networking,soc,defense')
  insert.run(3, 'Mini Capture The Flag', '2026-06-05', 'ctf', 'Solve web, crypto, and forensics challenges for leaderboard points.', 'ctf,crypto,forensics')
}
