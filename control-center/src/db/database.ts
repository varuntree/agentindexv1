import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

import { applyInitialSchema, INITIAL_SCHEMA_VERSION } from '@/db/migrations/001_initial_schema';
import { seedScrapeProgress } from '@/db/seed';

export function getDatabasePath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath && envPath.trim().length > 0) {
    return path.resolve(process.cwd(), envPath);
  }
  return path.resolve(process.cwd(), '../data/ari.db');
}

function getUserVersion(database: SqliteDatabase): number {
  const version = database.pragma('user_version', { simple: true });
  if (typeof version === 'number') return version;
  return Number(version);
}

export function migrateDatabase(database: SqliteDatabase): void {
  try {
    const currentVersion = getUserVersion(database);
    if (currentVersion >= INITIAL_SCHEMA_VERSION) return;

    const migrate = database.transaction(() => {
      applyInitialSchema(database);
      seedScrapeProgress(database);
    });

    migrate();
  } catch (error) {
    console.error('[migrateDatabase]', { error });
    throw error;
  }
}

export function openDatabase(): SqliteDatabase {
  const databasePath = getDatabasePath();
  const database = new BetterSqlite3(databasePath);

  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  migrateDatabase(database);

  return database;
}

export const db: SqliteDatabase = openDatabase();

