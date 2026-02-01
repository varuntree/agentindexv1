import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

import { applyInitialSchema, INITIAL_SCHEMA_VERSION } from '@/db/migrations/001_initial_schema';
import {
  applyEnrichmentTrackingMigration,
  ENRICHMENT_TRACKING_SCHEMA_VERSION
} from '@/db/migrations/002_add_enrichment_tracking';
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
    const migrate = database.transaction(() => {
      let version = currentVersion;
      if (version < INITIAL_SCHEMA_VERSION) {
        applyInitialSchema(database);
        seedScrapeProgress(database);
        version = INITIAL_SCHEMA_VERSION;
      }

      if (version < ENRICHMENT_TRACKING_SCHEMA_VERSION) {
        applyEnrichmentTrackingMigration(database);
        version = ENRICHMENT_TRACKING_SCHEMA_VERSION;
      }

      if (version !== getUserVersion(database)) {
        database.pragma(`user_version = ${version}`);
      }
    });

    if (currentVersion < ENRICHMENT_TRACKING_SCHEMA_VERSION) {
      migrate();
    }
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
