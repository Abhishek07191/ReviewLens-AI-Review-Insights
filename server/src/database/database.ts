import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function createDatabase(databasePath = process.env.SQLITE_PATH ?? './data/reviewlens.sqlite'): Database.Database {
  const resolvedPath = databasePath === ':memory:'
    ? databasePath
    : isAbsolute(databasePath)
      ? databasePath
      : resolve(projectRoot, databasePath);

  if (resolvedPath !== ':memory:') {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const database = new Database(resolvedPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      valid_reviews INTEGER NOT NULL,
      unique_reviews INTEGER NOT NULL,
      empty_review_rows INTEGER NOT NULL,
      malformed_rows INTEGER NOT NULL,
      duplicate_rows INTEGER NOT NULL,
      cache_hits INTEGER NOT NULL DEFAULT 0,
      ai_calls INTEGER NOT NULL DEFAULT 0,
      processing_duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      review_hash TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'analysis_failed')),
      sentiment TEXT,
      topics_json TEXT,
      summary TEXT,
      needs_reply INTEGER,
      error_message TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      review_id TEXT NOT NULL,
      product TEXT NOT NULL,
      rating REAL,
      review_text TEXT NOT NULL,
      review_hash TEXT NOT NULL REFERENCES analyses(review_hash),
      UNIQUE(upload_id, row_number)
    );

    CREATE TABLE IF NOT EXISTS api_usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      review_hash TEXT NOT NULL REFERENCES analyses(review_hash),
      purpose TEXT NOT NULL CHECK (purpose IN ('analysis', 'reply_suggestion')),
      api_calls INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS reviews_upload_id_idx ON reviews(upload_id);
    CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product);
    CREATE INDEX IF NOT EXISTS reviews_review_hash_idx ON reviews(review_hash);
    CREATE INDEX IF NOT EXISTS usage_events_upload_id_idx ON api_usage_events(upload_id);
  `);

  return database;
}
