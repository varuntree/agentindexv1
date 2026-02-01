# 02 - Data Schemas

**Domain:** Data Layer
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Database Configuration](#database-configuration)
3. [Agent Schema](#agent-schema)
4. [Agency Schema](#agency-schema)
5. [Scrape Progress Schema](#scrape-progress-schema)
6. [Agency Progress Schema](#agency-progress-schema)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [Sub-Agent Output Schema](#sub-agent-output-schema)
9. [Slug Generation](#slug-generation)
10. [Field Definitions](#field-definitions)
11. [Indexes](#indexes)
12. [Queries](#queries)

---

## Overview

ARI uses **SQLite** as its database for several reasons:

- **Portable** - Single file that can be copied between applications
- **Simple** - No server setup required
- **Fast** - Excellent read performance for static generation
- **Reliable** - ACID compliant with zero configuration

### Database Files

| Application | Path | Access |
|-------------|------|--------|
| Control Center | `control-center/data/ari.db` | Read/Write |
| SEO Site | `seo-site/data/ari.db` | Read-only |

### Tables

| Table | Purpose | Records (Est.) |
|-------|---------|----------------|
| `agents` | Individual agent profiles | 5,000 - 50,000 |
| `agencies` | Agency information | 500 - 2,000 |
| `scrape_progress` | Suburb processing status | 50 - 200 |
| `agency_progress` | Agency fetching status | 500 - 2,000 |

---

## Database Configuration

### SQLite Settings

```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Use WAL mode for better concurrent reads
PRAGMA journal_mode = WAL;

-- Reasonable cache size (10MB)
PRAGMA cache_size = -10000;

-- Store temp tables in memory
PRAGMA temp_store = MEMORY;
```

### Connection Setup (Control Center)

```typescript
// control-center/src/db/database.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/ari.db');

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
```

### Connection Setup (SEO Site)

```typescript
// seo-site/lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');

// Read-only for SEO site
export const db = new Database(dbPath, { readonly: true });
```

---

## Agent Schema

### SQL Definition

```sql
CREATE TABLE agents (
    -- ═══════════════════════════════════════════════════════════════════
    -- IDENTIFIERS
    -- ═══════════════════════════════════════════════════════════════════
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER UNIQUE NOT NULL,           -- ID from Domain.com.au API
    slug TEXT UNIQUE NOT NULL,                   -- URL slug: "john-smith-bondi-rw-a1b2c"

    -- ═══════════════════════════════════════════════════════════════════
    -- AGENCY RELATIONSHIP
    -- ═══════════════════════════════════════════════════════════════════
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

    -- ═══════════════════════════════════════════════════════════════════
    -- BASIC INFO (from Domain API)
    -- ═══════════════════════════════════════════════════════════════════
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,                                  -- Landline number
    mobile TEXT,                                 -- Mobile number
    photo_url TEXT,                              -- Profile photo URL
    profile_text TEXT,                           -- Original bio from API

    -- ═══════════════════════════════════════════════════════════════════
    -- LOCATION (derived from agency)
    -- ═══════════════════════════════════════════════════════════════════
    primary_suburb TEXT NOT NULL,
    primary_state TEXT NOT NULL,                 -- "NSW", "VIC", "QLD"
    primary_postcode TEXT NOT NULL,

    -- ═══════════════════════════════════════════════════════════════════
    -- ENRICHED DATA (from Claude sub-agents)
    -- ═══════════════════════════════════════════════════════════════════
    enriched_bio TEXT,                           -- AI-generated richer description
    years_experience INTEGER,                    -- Years in real estate
    years_experience_source TEXT,                -- 'linkedin', 'agency_website', 'inferred'
    career_start_year INTEGER,                   -- Calculated or found year
    languages TEXT,                              -- JSON array: ["English", "Mandarin"]
    specializations TEXT,                        -- JSON array: ["Luxury Homes", "Apartments"]
    property_types TEXT,                         -- JSON array: ["House", "Apartment", "Townhouse"]
    awards TEXT,                                 -- JSON array of award objects

    -- ═══════════════════════════════════════════════════════════════════
    -- SOCIAL LINKS (from enrichment)
    -- ═══════════════════════════════════════════════════════════════════
    linkedin_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    personal_website_url TEXT,
    domain_profile_url TEXT,                     -- Link to Domain.com.au profile

    -- ═══════════════════════════════════════════════════════════════════
    -- ENRICHMENT TRACKING
    -- ═══════════════════════════════════════════════════════════════════
    enrichment_status TEXT DEFAULT 'pending'
        CHECK (enrichment_status IN ('pending', 'in_progress', 'complete', 'failed', 'skipped')),
    enrichment_quality TEXT
        CHECK (enrichment_quality IN ('high', 'medium', 'low', 'minimal', NULL)),
    enrichment_sources TEXT,                     -- JSON array: ["linkedin", "agency_website"]
    enrichment_error TEXT,                       -- Error message if failed

    -- ═══════════════════════════════════════════════════════════════════
    -- TIMESTAMPS
    -- ═══════════════════════════════════════════════════════════════════
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_fetched_at DATETIME,                     -- When fetched from Domain API
    enriched_at DATETIME                         -- When enrichment completed
);

-- Trigger to update updated_at on any change
CREATE TRIGGER agents_updated_at
AFTER UPDATE ON agents
BEGIN
    UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Field Details

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `domain_id` | INTEGER | API | Unique ID from Domain.com.au |
| `slug` | TEXT | Generated | URL-safe identifier (see Slug Generation) |
| `agency_id` | INTEGER | FK | Link to agencies table |
| `first_name` | TEXT | API | Agent's first name |
| `last_name` | TEXT | API | Agent's last name |
| `email` | TEXT | API | Contact email (may be null) |
| `phone` | TEXT | API | Office/landline phone |
| `mobile` | TEXT | API | Mobile phone number |
| `photo_url` | TEXT | API | URL to profile photo |
| `profile_text` | TEXT | API | Original bio from Domain |
| `primary_suburb` | TEXT | Agency | Suburb where agent works |
| `primary_state` | TEXT | Agency | State abbreviation |
| `primary_postcode` | TEXT | Agency | Postcode |
| `enriched_bio` | TEXT | Claude | AI-written professional description |
| `years_experience` | INTEGER | Claude | Years in real estate |
| `years_experience_source` | TEXT | Claude | Where the data came from |
| `career_start_year` | INTEGER | Claude | Year started in real estate |
| `languages` | TEXT (JSON) | Claude | Languages spoken |
| `specializations` | TEXT (JSON) | Claude | Areas of expertise |
| `property_types` | TEXT (JSON) | Claude | Property types handled |
| `awards` | TEXT (JSON) | Claude | Awards and recognition |
| `linkedin_url` | TEXT | Claude | LinkedIn profile URL |
| `facebook_url` | TEXT | Claude | Facebook page URL |
| `instagram_url` | TEXT | Claude | Instagram profile URL |
| `personal_website_url` | TEXT | Claude | Personal website |
| `domain_profile_url` | TEXT | Generated | Link to Domain.com.au profile |
| `enrichment_status` | TEXT | System | Processing status |
| `enrichment_quality` | TEXT | Claude | Quality of enriched data |
| `enrichment_sources` | TEXT (JSON) | Claude | Sources that provided data |
| `enrichment_error` | TEXT | System | Error message if enrichment failed |

---

## Agency Schema

### SQL Definition

```sql
CREATE TABLE agencies (
    -- ═══════════════════════════════════════════════════════════════════
    -- IDENTIFIERS
    -- ═══════════════════════════════════════════════════════════════════
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER UNIQUE NOT NULL,           -- ID from Domain.com.au API
    slug TEXT UNIQUE NOT NULL,                   -- URL slug: "ray-white-bondi-beach"

    -- ═══════════════════════════════════════════════════════════════════
    -- BASIC INFO (from Domain API)
    -- ═══════════════════════════════════════════════════════════════════
    name TEXT NOT NULL,                          -- Full agency name
    brand_name TEXT,                             -- "Ray White", "McGrath" for tier lookup
    brand_tier INTEGER DEFAULT 6,                -- 1=highest (Ray White), 6=boutique
    logo_url TEXT,                               -- Agency logo URL
    website TEXT,                                -- Agency website
    description TEXT,                            -- Agency description

    -- ═══════════════════════════════════════════════════════════════════
    -- CONTACT
    -- ═══════════════════════════════════════════════════════════════════
    phone TEXT,
    email TEXT,

    -- ═══════════════════════════════════════════════════════════════════
    -- LOCATION
    -- ═══════════════════════════════════════════════════════════════════
    street_address TEXT,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,

    -- ═══════════════════════════════════════════════════════════════════
    -- TEAM INFO
    -- ═══════════════════════════════════════════════════════════════════
    principal_name TEXT,                         -- Principal/Director name
    agent_count INTEGER DEFAULT 0,               -- Number of agents (from our data)

    -- ═══════════════════════════════════════════════════════════════════
    -- LISTING COUNTS (from API - informational only in V1)
    -- ═══════════════════════════════════════════════════════════════════
    properties_for_sale INTEGER,
    properties_for_rent INTEGER,

    -- ═══════════════════════════════════════════════════════════════════
    -- TIMESTAMPS
    -- ═══════════════════════════════════════════════════════════════════
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_fetched_at DATETIME
);

-- Trigger to update updated_at on any change
CREATE TRIGGER agencies_updated_at
AFTER UPDATE ON agencies
BEGIN
    UPDATE agencies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Brand Tier Lookup

```typescript
const BRAND_TIERS: Record<string, number> = {
  // Tier 1 - Major national brands
  'ray white': 1,
  'lj hooker': 1,

  // Tier 2 - Premium brands
  'mcgrath': 2,
  'belle property': 2,

  // Tier 3 - Large franchises
  'harcourts': 3,
  'century 21': 3,
  'raine & horne': 3,
  'raine and horne': 3,

  // Tier 4 - Regional franchises
  'prd': 4,
  'first national': 4,
  'laing+simmons': 4,
  'laing simmons': 4,

  // Tier 5 - Smaller franchises
  'richardson & wrench': 5,
  'richardson and wrench': 5,
  'elders': 5,

  // Tier 6 - Boutique/Independent (default)
};

function getBrandTier(agencyName: string): number {
  const nameLower = agencyName.toLowerCase();

  for (const [brand, tier] of Object.entries(BRAND_TIERS)) {
    if (nameLower.includes(brand)) {
      return tier;
    }
  }

  return 6; // Default: boutique/independent
}
```

---

## Scrape Progress Schema

### SQL Definition

```sql
CREATE TABLE scrape_progress (
    -- ═══════════════════════════════════════════════════════════════════
    -- IDENTIFIERS
    -- ═══════════════════════════════════════════════════════════════════
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suburb_id TEXT NOT NULL UNIQUE,              -- Domain API suburb ID
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    slug TEXT NOT NULL UNIQUE,                   -- "bondi-beach-nsw-2026"

    -- ═══════════════════════════════════════════════════════════════════
    -- PRIORITY
    -- ═══════════════════════════════════════════════════════════════════
    priority_tier INTEGER DEFAULT 3              -- 1=highest, 3=lowest
        CHECK (priority_tier BETWEEN 1 AND 3),
    priority_rank INTEGER,                       -- Order within tier (1-50)
    region TEXT,                                 -- "Eastern Suburbs", "North Shore"

    -- ═══════════════════════════════════════════════════════════════════
    -- PROGRESS TRACKING
    -- ═══════════════════════════════════════════════════════════════════
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'discovered', 'complete', 'failed', 'abandoned')),
    agencies_found INTEGER DEFAULT 0,
    agents_found INTEGER DEFAULT 0,
    agencies_enriched INTEGER DEFAULT 0,         -- Agencies with fully enriched agents

    -- ═══════════════════════════════════════════════════════════════════
    -- TIMESTAMPS
    -- ═══════════════════════════════════════════════════════════════════
    started_at DATETIME,
    completed_at DATETIME,
    last_activity_at DATETIME,

    -- ═══════════════════════════════════════════════════════════════════
    -- ERROR TRACKING
    -- ═══════════════════════════════════════════════════════════════════
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_error_at DATETIME
);
```

### Status Flow

```
pending ─────► in_progress ─────► discovered ─────► complete
    │              │                   │
    │              ▼                   │
    │          failed ◄────────────────┘
    │              │
    └──────────────┴─────► abandoned (manual)
```

| Status | Meaning |
|--------|---------|
| `pending` | Not yet started |
| `in_progress` | Currently fetching from API |
| `discovered` | API data fetched, agents stored |
| `complete` | All agents enriched |
| `failed` | Error occurred (can retry) |
| `abandoned` | Manually marked as skipped |

---

## Agency Progress Schema

### SQL Definition

```sql
CREATE TABLE agency_progress (
    -- ═══════════════════════════════════════════════════════════════════
    -- IDENTIFIERS
    -- ═══════════════════════════════════════════════════════════════════
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    suburb_id TEXT NOT NULL REFERENCES scrape_progress(suburb_id),

    -- ═══════════════════════════════════════════════════════════════════
    -- PROGRESS TRACKING
    -- ═══════════════════════════════════════════════════════════════════
    api_status TEXT DEFAULT 'pending'
        CHECK (api_status IN ('pending', 'in_progress', 'complete', 'failed')),
    enrichment_status TEXT DEFAULT 'pending'
        CHECK (enrichment_status IN ('pending', 'in_progress', 'complete', 'partial', 'failed')),

    agents_total INTEGER DEFAULT 0,              -- Total agents in agency
    agents_enriched INTEGER DEFAULT 0,           -- Agents with enrichment complete
    agents_failed INTEGER DEFAULT 0,             -- Agents with enrichment failed

    -- ═══════════════════════════════════════════════════════════════════
    -- TIMESTAMPS
    -- ═══════════════════════════════════════════════════════════════════
    api_fetched_at DATETIME,
    enrichment_started_at DATETIME,
    enrichment_completed_at DATETIME,

    -- ═══════════════════════════════════════════════════════════════════
    -- ERROR TRACKING
    -- ═══════════════════════════════════════════════════════════════════
    error_message TEXT,

    -- Unique constraint: one record per agency per suburb
    UNIQUE(agency_id, suburb_id)
);
```

---

## TypeScript Interfaces

### Agent Interface

```typescript
// Shared between Control Center and SEO Site
// Located in: control-center/src/types.ts and seo-site/lib/types.ts

interface Agent {
  // Identifiers
  id: number;
  domain_id: number;
  slug: string;
  agency_id: number;

  // Basic info
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  photo_url: string | null;
  profile_text: string | null;

  // Location
  primary_suburb: string;
  primary_state: string;
  primary_postcode: string;

  // Enriched data
  enriched_bio: string | null;
  years_experience: number | null;
  years_experience_source: 'linkedin' | 'agency_website' | 'inferred' | null;
  career_start_year: number | null;
  languages: string[];              // Parsed from JSON
  specializations: string[];        // Parsed from JSON
  property_types: string[];         // Parsed from JSON
  awards: Award[];                  // Parsed from JSON

  // Social links
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  personal_website_url: string | null;
  domain_profile_url: string | null;

  // Enrichment tracking
  enrichment_status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';
  enrichment_quality: 'high' | 'medium' | 'low' | 'minimal' | null;
  enrichment_sources: string[];     // Parsed from JSON
  enrichment_error: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  api_fetched_at: string;
  enriched_at: string | null;

  // Denormalized fields (from joins)
  agency_name?: string;
  agency_slug?: string;
  agency_website?: string;
}

interface Award {
  name: string;
  year: number | null;
  level: 'agency' | 'regional' | 'state' | 'national' | null;
  organization: string | null;
}
```

### Agency Interface

```typescript
interface Agency {
  // Identifiers
  id: number;
  domain_id: number;
  slug: string;

  // Basic info
  name: string;
  brand_name: string | null;
  brand_tier: number;
  logo_url: string | null;
  website: string | null;
  description: string | null;

  // Contact
  phone: string | null;
  email: string | null;

  // Location
  street_address: string | null;
  suburb: string;
  state: string;
  postcode: string;

  // Team
  principal_name: string | null;
  agent_count: number;

  // Listing counts
  properties_for_sale: number | null;
  properties_for_rent: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  api_fetched_at: string;
}
```

### Scrape Progress Interface

```typescript
interface ScrapeProgress {
  id: number;
  suburb_id: string;
  suburb_name: string;
  state: string;
  postcode: string | null;
  slug: string;

  priority_tier: 1 | 2 | 3;
  priority_rank: number | null;
  region: string | null;

  status: 'pending' | 'in_progress' | 'discovered' | 'complete' | 'failed' | 'abandoned';
  agencies_found: number;
  agents_found: number;
  agencies_enriched: number;

  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;

  error_message: string | null;
  retry_count: number;
  last_error_at: string | null;
}
```

---

## Sub-Agent Output Schema

### What Claude Returns

```typescript
// Output structure from the enrichment sub-agents
interface SubAgentOutput {
  batch_id: string;                  // UUID for this batch
  processed_at: string;              // ISO timestamp
  agents: EnrichedAgentData[];       // Results for each agent
  summary: {
    total_processed: number;
    successful: number;              // Full data found
    partial: number;                 // Some data found
    failed: number;                  // No data found
  };
}

interface EnrichedAgentData {
  // Identifier to match with our database
  agent_domain_id: number;

  // Enriched fields
  enriched_bio: string | null;
  years_experience: number | null;
  years_experience_source: 'linkedin' | 'agency_website' | 'google' | 'inferred' | null;
  career_start_year: number | null;

  languages: string[];
  specializations: string[];
  property_types: string[];

  awards: {
    name: string;
    year: number | null;
    level: 'agency' | 'regional' | 'state' | 'national' | null;
    organization: string | null;
  }[];

  // Social links found
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  personal_website_url: string | null;

  // Quality indicators
  confidence: 'high' | 'medium' | 'low' | 'minimal';
  sources_found: string[];           // ["linkedin", "agency_website"]

  // Status
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
}
```

### JSON Schema for Validation

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["batch_id", "processed_at", "agents", "summary"],
  "properties": {
    "batch_id": { "type": "string", "format": "uuid" },
    "processed_at": { "type": "string", "format": "date-time" },
    "agents": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["agent_domain_id", "status", "confidence"],
        "properties": {
          "agent_domain_id": { "type": "integer" },
          "enriched_bio": { "type": ["string", "null"] },
          "years_experience": { "type": ["integer", "null"], "minimum": 0 },
          "years_experience_source": {
            "type": ["string", "null"],
            "enum": ["linkedin", "agency_website", "google", "inferred", null]
          },
          "career_start_year": { "type": ["integer", "null"], "minimum": 1950 },
          "languages": {
            "type": "array",
            "items": { "type": "string" }
          },
          "specializations": {
            "type": "array",
            "items": { "type": "string" }
          },
          "property_types": {
            "type": "array",
            "items": { "type": "string" }
          },
          "awards": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string" },
                "year": { "type": ["integer", "null"] },
                "level": {
                  "type": ["string", "null"],
                  "enum": ["agency", "regional", "state", "national", null]
                },
                "organization": { "type": ["string", "null"] }
              }
            }
          },
          "linkedin_url": { "type": ["string", "null"], "format": "uri" },
          "facebook_url": { "type": ["string", "null"], "format": "uri" },
          "instagram_url": { "type": ["string", "null"], "format": "uri" },
          "personal_website_url": { "type": ["string", "null"], "format": "uri" },
          "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low", "minimal"]
          },
          "sources_found": {
            "type": "array",
            "items": { "type": "string" }
          },
          "status": {
            "type": "string",
            "enum": ["success", "partial", "failed"]
          },
          "error_message": { "type": ["string", "null"] }
        }
      }
    },
    "summary": {
      "type": "object",
      "required": ["total_processed", "successful", "partial", "failed"],
      "properties": {
        "total_processed": { "type": "integer", "minimum": 0 },
        "successful": { "type": "integer", "minimum": 0 },
        "partial": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

---

## Slug Generation

### Agent Slug

Format: `{first}-{last}-{suburb}-{agency-abbr}-{hash}`

```typescript
function generateAgentSlug(agent: {
  first_name: string;
  last_name: string;
  primary_suburb: string;
  agency_name: string;
  domain_id: number;
}): string {
  const first = slugify(agent.first_name);
  const last = slugify(agent.last_name);
  const suburb = slugify(agent.primary_suburb);
  const agencyAbbr = getAgencyAbbreviation(agent.agency_name);
  const hash = generateHash(agent.domain_id);

  return `${first}-${last}-${suburb}-${agencyAbbr}-${hash}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getAgencyAbbreviation(name: string): string {
  // Map known brands to abbreviations
  const abbreviations: Record<string, string> = {
    'ray white': 'rw',
    'lj hooker': 'ljh',
    'mcgrath': 'mc',
    'belle property': 'bp',
    'harcourts': 'hc',
    'century 21': 'c21',
    'raine & horne': 'rh',
    'prd': 'prd',
    'first national': 'fn',
  };

  const nameLower = name.toLowerCase();
  for (const [brand, abbr] of Object.entries(abbreviations)) {
    if (nameLower.includes(brand)) return abbr;
  }

  // For unknown agencies, take first letters
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toLowerCase()
    .slice(0, 3);
}

function generateHash(domainId: number): string {
  // Short hash from domain ID for uniqueness
  return domainId.toString(36).slice(-5);
}
```

**Examples:**
- `john-smith-bondi-beach-rw-a1b2c`
- `mary-chen-mosman-mc-x9y8z`
- `david-wong-paddington-bp-m3n4o`

### Agency Slug

Format: `{brand}-{suburb}` or `{name-slugified}`

```typescript
function generateAgencySlug(agency: {
  name: string;
  suburb: string;
}): string {
  const slugified = slugify(agency.name);

  // If name already contains suburb, use as-is
  if (slugified.includes(slugify(agency.suburb))) {
    return slugified;
  }

  // Otherwise append suburb
  return `${slugified}-${slugify(agency.suburb)}`;
}
```

**Examples:**
- `ray-white-bondi-beach`
- `mcgrath-mosman`
- `belle-property-double-bay`

### Suburb Slug

Format: `{suburb}-{state}-{postcode}`

```typescript
function generateSuburbSlug(suburb: {
  name: string;
  state: string;
  postcode: string;
}): string {
  return `${slugify(suburb.name)}-${suburb.state.toLowerCase()}-${suburb.postcode}`;
}
```

**Examples:**
- `bondi-beach-nsw-2026`
- `mosman-nsw-2088`
- `south-yarra-vic-3141`

---

## Field Definitions

### Enrichment Quality Levels

| Level | Criteria |
|-------|----------|
| `high` | LinkedIn found + 3+ other fields populated |
| `medium` | Agency website bio found + 2+ other fields |
| `low` | Only 1-2 fields populated |
| `minimal` | Only basic info, no enrichment found |

### Years Experience Source

| Source | Meaning | Reliability |
|--------|---------|-------------|
| `linkedin` | Found in LinkedIn employment history | High |
| `agency_website` | Stated on agency website bio | Medium |
| `google` | Found in Google search results | Medium |
| `inferred` | Calculated from other data | Low |

### Enrichment Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Not yet processed | Include in next batch |
| `in_progress` | Currently being enriched | Wait |
| `complete` | Successfully enriched | Ready for display |
| `failed` | Error during enrichment | Review and retry |
| `skipped` | Manually marked to skip | Ignore |

---

## Indexes

### Performance Indexes

```sql
-- Agent lookups
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_agency_id ON agents(agency_id);
CREATE INDEX idx_agents_suburb ON agents(primary_suburb, primary_state);
CREATE INDEX idx_agents_enrichment_status ON agents(enrichment_status);

-- Agency lookups
CREATE INDEX idx_agencies_slug ON agencies(slug);
CREATE INDEX idx_agencies_suburb ON agencies(suburb, state);
CREATE INDEX idx_agencies_brand_tier ON agencies(brand_tier);

-- Progress tracking
CREATE INDEX idx_scrape_progress_status ON scrape_progress(status);
CREATE INDEX idx_scrape_progress_priority ON scrape_progress(priority_tier, priority_rank);
```

---

## Queries

### Common Queries (Control Center)

```typescript
// Get pending agents for enrichment
const pendingAgents = db.prepare(`
  SELECT a.*, ag.name as agency_name, ag.website as agency_website
  FROM agents a
  JOIN agencies ag ON a.agency_id = ag.id
  WHERE a.enrichment_status = 'pending'
  ORDER BY ag.brand_tier ASC, a.photo_url IS NOT NULL DESC
  LIMIT ?
`).all(batchSize);

// Update agent with enriched data
const updateAgent = db.prepare(`
  UPDATE agents SET
    enriched_bio = @enriched_bio,
    years_experience = @years_experience,
    years_experience_source = @years_experience_source,
    career_start_year = @career_start_year,
    languages = @languages,
    specializations = @specializations,
    property_types = @property_types,
    awards = @awards,
    linkedin_url = @linkedin_url,
    facebook_url = @facebook_url,
    instagram_url = @instagram_url,
    personal_website_url = @personal_website_url,
    enrichment_status = 'complete',
    enrichment_quality = @enrichment_quality,
    enrichment_sources = @enrichment_sources,
    enriched_at = CURRENT_TIMESTAMP
  WHERE domain_id = @domain_id
`);
```

### Common Queries (SEO Site)

```typescript
// Get agent by slug
export function getAgentBySlug(slug: string): Agent | null {
  return db.prepare(`
    SELECT
      a.*,
      ag.name as agency_name,
      ag.slug as agency_slug,
      ag.suburb as agency_suburb,
      ag.website as agency_website
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.slug = ?
  `).get(slug) as Agent | null;
}

// Get all agents for static generation
export function getAllAgentSlugs(): { slug: string }[] {
  return db.prepare(`
    SELECT slug FROM agents
    WHERE enrichment_status = 'complete'
  `).all() as { slug: string }[];
}

// Get agents in suburb
export function getAgentsInSuburb(suburb: string, state: string): Agent[] {
  return db.prepare(`
    SELECT a.*, ag.name as agency_name, ag.slug as agency_slug
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.primary_suburb = ? AND a.primary_state = ?
    ORDER BY ag.brand_tier ASC, a.last_name ASC
  `).all(suburb, state) as Agent[];
}
```

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - Database configuration context
- **[03-domain-api.md](./03-domain-api.md)** - Source of API data
- **[04-enrichment-pipeline.md](./04-enrichment-pipeline.md)** - Source of enriched data
- **[06-seo-site.md](./06-seo-site.md)** - How queries are used
