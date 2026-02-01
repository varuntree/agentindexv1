import type { Database as SqliteDatabase } from 'better-sqlite3';

export const ENRICHMENT_TRACKING_SCHEMA_VERSION = 2;

function hasColumn(database: SqliteDatabase, table: string, column: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: unknown }>;
  return rows.some((row) => row.name === column);
}

export function applyEnrichmentTrackingMigration(database: SqliteDatabase): void {
  if (!hasColumn(database, 'agents', 'enrichment_sources')) {
    database.exec(`ALTER TABLE agents ADD COLUMN enrichment_sources TEXT`);
  }

  if (!hasColumn(database, 'agents', 'enrichment_error')) {
    database.exec(`ALTER TABLE agents ADD COLUMN enrichment_error TEXT`);
  }

  database.pragma(`user_version = ${ENRICHMENT_TRACKING_SCHEMA_VERSION}`);
}

