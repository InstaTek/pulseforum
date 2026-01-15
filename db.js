// db.js
const Database = require("better-sqlite3");

const db = new Database("forum.db");

// Speed + safety defaults for SQLite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(topic_id) REFERENCES topics(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_name TEXT NOT NULL,
      contact TEXT,
      report_type TEXT NOT NULL,
      subject_choice TEXT,
      what_sighted TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      location TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ✅ SEED DEFAULT CATEGORIES (runs once)
  const count = db.prepare(
    "SELECT COUNT(*) AS c FROM categories"
  ).get().c;

  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO categories (name, description) VALUES (?, ?)"
    );

    insert.run(
      "General",
      "Introductions, announcements, and community updates."
    );

    insert.run(
      "Build Logs",
      "Project diaries, photos, and progress updates."
    );

    insert.run(
      "Help & Support",
      "Ask questions, share solutions, and report issues."
    );

    insert.run(
      "Tips & Guides",
      "Write-ups, checklists, and best practices."
    );
  }
}

module.exports = { db, init };
