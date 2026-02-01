import fs from 'node:fs';
import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

export function getDatabasePath(): string {
  const envPath = process.env.DATABASE_PATH?.trim();

  const candidates: string[] = [];

  if (envPath && envPath.length > 0) {
    if (path.isAbsolute(envPath)) return envPath;
    candidates.push(path.resolve(process.cwd(), envPath));
    candidates.push(path.resolve(process.cwd(), '..', envPath));
  }

  // Support running from either repo root or within `seo-site/`.
  candidates.push(path.resolve(process.cwd(), 'data/ari.db'));
  candidates.push(path.resolve(process.cwd(), '../data/ari.db'));
  candidates.push(path.resolve(process.cwd(), '..', 'data/ari.db'));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0] ?? path.resolve(process.cwd(), '../data/ari.db');
}

export function openDatabaseReadOnly(): SqliteDatabase {
  const databasePath = getDatabasePath();
  const database = new BetterSqlite3(databasePath, { fileMustExist: true, readonly: true });
  database.pragma('foreign_keys = ON');
  database.pragma('query_only = ON');
  return database;
}

export const db: SqliteDatabase = openDatabaseReadOnly();
