import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

export function getDatabasePath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath && envPath.trim().length > 0) {
    return path.resolve(process.cwd(), envPath);
  }
  return path.resolve(process.cwd(), '../data/ari.db');
}

export function openDatabaseReadOnly(): SqliteDatabase {
  const databasePath = getDatabasePath();
  const database = new BetterSqlite3(databasePath, { fileMustExist: true, readonly: true });
  database.pragma('foreign_keys = ON');
  database.pragma('query_only = ON');
  return database;
}

export const db: SqliteDatabase = openDatabaseReadOnly();

