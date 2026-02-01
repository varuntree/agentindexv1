import type { Database as SqliteDatabase } from 'better-sqlite3';

export const INITIAL_SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agencies (
    -- Identifiers
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Basic info (from Discovery Skill)
    name TEXT NOT NULL,
    brand_name TEXT,
    logo_url TEXT,
    website TEXT,
    description TEXT,

    -- Contact
    phone TEXT,
    email TEXT,

    -- Location
    street_address TEXT,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,

    -- Team
    principal_name TEXT,
    agent_count INTEGER DEFAULT 0,

    -- Listing counts (from API)
    properties_for_sale INTEGER,
    properties_for_rent INTEGER,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_fetched_at DATETIME
);

CREATE TABLE IF NOT EXISTS agents (
    -- Identifiers
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Agency relationship
    agency_id INTEGER REFERENCES agencies(id),

    -- Basic info (from Discovery Skill)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    photo_url TEXT,
    profile_text TEXT,

    -- Location (from agency)
    primary_suburb TEXT,
    primary_state TEXT,
    primary_postcode TEXT,

    -- Enriched data (from Claude sub-agents)
    enriched_bio TEXT,
    years_experience INTEGER,
    years_experience_source TEXT,
    career_start_year INTEGER,
    languages TEXT,
    specializations TEXT,
    property_types TEXT,
    awards TEXT,

    -- Social links (from enrichment)
    linkedin_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    personal_website_url TEXT,
    domain_profile_url TEXT,

    -- Enrichment tracking
    enrichment_status TEXT DEFAULT 'pending',
    enrichment_quality TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_fetched_at DATETIME,
    enriched_at DATETIME
);

CREATE TABLE IF NOT EXISTS scrape_progress (
    id INTEGER PRIMARY KEY,
    suburb_id TEXT NOT NULL UNIQUE,
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    slug TEXT NOT NULL,

    -- Priority
    priority_tier INTEGER DEFAULT 3,
    region TEXT,

    -- Progress tracking
    status TEXT DEFAULT 'pending',
    agencies_found INTEGER DEFAULT 0,
    agents_found INTEGER DEFAULT 0,

    -- Timestamps
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);
`;

export function applyInitialSchema(database: SqliteDatabase): void {
  database.exec(INITIAL_SCHEMA_SQL);
  database.pragma(`user_version = ${INITIAL_SCHEMA_VERSION}`);
}

