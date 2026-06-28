import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || '/data/spacemountain.db';

// Ensure the directory exists
try {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created SQLite directory at ${dir}`);
  }
} catch (err) {
  console.warn(`Could not create directory for SQLite at ${DB_PATH}. Falling back to standard cwd database.`);
}

let sqliteDbPath = DB_PATH;
try {
  // Test if we can open and write to the preferred database path.
  const testDb = new Database(sqliteDbPath);
  testDb.exec('CREATE TABLE IF NOT EXISTS __write_test (id INTEGER); DROP TABLE __write_test;');
  testDb.close();
  console.log(`Successfully verified database file access at ${sqliteDbPath}`);
} catch (err) {
  // Fallback to local cwd database if /data is not writable (e.g. dev sandboxes)
  sqliteDbPath = path.join(process.cwd(), 'dashboard.db');
  console.log(`Using fallback SQLite path at ${sqliteDbPath}`);
}

export const sqlite = new Database(sqliteDbPath);

// Enable WAL mode for high concurrency
sqlite.pragma('journal_mode = WAL');

// Ensure tables exist on boot (SQLite direct table initialization)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    recovery_email TEXT,
    role TEXT NOT NULL DEFAULT 'Passenger',
    status TEXT NOT NULL DEFAULT 'Offline',
    points INTEGER NOT NULL DEFAULT 0,
    avatar_speaking INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    badge TEXT NOT NULL,
    mini_label TEXT NOT NULL,
    status_text TEXT NOT NULL,
    status_type TEXT NOT NULL DEFAULT 'default',
    route TEXT NOT NULL,
    points_flow INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'Nebula Purple',
    glow_intensity INTEGER NOT NULL DEFAULT 75,
    star_density INTEGER NOT NULL DEFAULT 70,
    shooting_stars INTEGER NOT NULL DEFAULT 1,
    sidebar_collapsed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS forwarded_forum_posts (
    id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL DEFAULT 'discord-stream-hub',
    source_server_id TEXT,
    source_channel_id TEXT,
    source_channel_name TEXT,
    source_message_id TEXT,
    source_message_url TEXT,
    author_id TEXT,
    author_name TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Discord Forward',
    posted_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_shoutouts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'mountaineers',
    group_name TEXT,
    twitch_login TEXT,
    display_name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    game_name TEXT,
    viewer_count INTEGER NOT NULL DEFAULT 0,
    stream_url TEXT,
    avatar_url TEXT,
    image_url TEXT,
    video_url TEXT,
    banner_url TEXT,
    source_message_url TEXT,
    discord_user_id TEXT,
    server_id TEXT,
    is_live INTEGER NOT NULL DEFAULT 1,
    is_spotlight INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const ensureColumn = (table: string, column: string, definition: string) => {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((row) => row.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

ensureColumn('community_shoutouts', 'video_url', 'TEXT');
ensureColumn('forwarded_forum_posts', 'embeds', 'TEXT');
ensureColumn('forwarded_forum_posts', 'attachments', 'TEXT');
ensureColumn('forwarded_forum_posts', 'mentioned_users', 'TEXT');

console.log('SQLite database structures successfully verified and prepared!');

export const db = drizzle(sqlite, { schema });
