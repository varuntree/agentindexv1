# ARI (Australian Real Estate Agents Index) — Technical Specification v2

**Status:** Ready for Implementation
**Last Updated:** 2026-02-01
**Version:** 2.0 (incorporates findings from 8 research reports)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Work Queue System](#work-queue-system)
4. [Domain.com.au API Analysis](#domaincomau-api-analysis)
5. [Data Model](#data-model)
6. [Agent Orchestration System](#agent-orchestration-system)
7. [Enrichment Sub-Agent System](#enrichment-sub-agent-system)
8. [SEO Strategy](#seo-strategy)
9. [Safe Rollout Strategy](#safe-rollout-strategy)
10. [Thin Content Guidelines](#thin-content-guidelines)
11. [Sydney Suburb Priority List](#sydney-suburb-priority-list)
12. [Rate My Agent Competitive Analysis](#rate-my-agent-competitive-analysis)
13. [Content Expansion Planning](#content-expansion-planning)
14. [Pre-Launch Checklist](#pre-launch-checklist)
15. [Implementation Roadmap](#implementation-roadmap)
16. [Resolved Decisions](#resolved-decisions)
17. [Appendix](#appendix)

---

## Project Overview

### Goal

Build a neutral, public index of Australian real estate agents that:
1. Generates SEO traffic for agent name, location, and agency searches
2. Provides richer data than competitors (Rate My Agent, OpenAgent, etc.)
3. Uses Domain.com.au API for data + Claude Agent SDK for enrichment

### Primary Focus

- **SEO traffic first** — validate that we can rank for agent-related searches
- **Templated content** — scalable page generation, not unique AI-written content per agent
- **Pure static generation** — Next.js SSG with pre-built pages for SEO (no ISR for V1)
- **Quality over quantity** — 20 perfect suburbs before 500 mediocre ones

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary goal | SEO traffic validation | Core hypothesis from PRD |
| Data source | Domain.com.au API | Have access, reliable data |
| Target queries | Agent names, locations, agencies | All three intent types |
| Tech stack | Next.js with pure SSG | SEO-first, simple for V1 |
| Database | SQLite | Simple, no infra overhead |
| API budget | Stay on free tier (500 calls/day) | Validate before investing |
| Initial focus | Sydney top 50 suburbs | Highest value market |
| Enrichment | Web search only, NO RMA scraping | Legal/ethical safety |
| Live data | Skip for V1 | Simplify initial launch |

---

## Architecture

### High-Level System Design (V1 - Static Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│                                                                 │
│  • 6-state work queue (pending → in_progress → complete)        │
│  • Hybrid discovery/processing approach                         │
│  • Graceful shutdown with resume capability                     │
│  • Runs as cron job (nightly at 2am AEST)                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           PHASE 1: DISCOVERY (Suburb-centric)                   │
│                                                                 │
│  For each suburb in priority order:                             │
│  • GET /v1/agencies?q=suburbId:{id}                             │
│  • Store agency IDs in queue (deduplicated)                     │
│  • Mark suburb as "discovered"                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           PHASE 2: PROCESSING (Agency-centric)                  │
│                                                                 │
│  For each unique agency (process ONCE regardless of suburbs):   │
│  • GET /v1/agencies/{id} → agency details + agent list          │
│  • Skip individual /agents/{id} calls (use agency data)         │
│  • Store agency and agents in SQLite                            │
│  • Mark agency as "complete"                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           PHASE 3: ENRICHMENT (Agent-centric)                   │
│                                                                 │
│  For each agent needing enrichment:                             │
│  • Spawn Claude sub-agent for web research                      │
│  • LinkedIn → Agency website → Google search                    │
│  • Store enriched data, mark as "enriched"                      │
│  • DO NOT scrape Rate My Agent                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATIC SITE BUILD (Next.js SSG)              │
│                                                                 │
│  Pre-build ALL pages at deploy time:                            │
│  • /agent/[slug]           → Individual agent profiles          │
│  • /agency/[slug]          → Agency pages with agent roster     │
│  • /agents-in/[state]      → State-level listings               │
│  • /agents-in/[suburb]     → Suburb-level listings              │
│                                                                 │
│  generateStaticParams returns all slugs from SQLite             │
│  Deploy to Vercel as fully static site                          │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Hybrid discovery/processing** — Discover by suburb (natural), process by agency (avoids duplicate API calls when Ray White appears in 5 suburbs)
2. **Skip individual agent calls** — Agency endpoint includes basic agent data; saves ~50 API calls per suburb
3. **Pure SSG for V1** — Simpler to debug, no ISR complexity, full control over what gets indexed
4. **Enrichment as separate phase** — Can run without API budget, parallelizable

---

## Work Queue System

### Six-State Machine Model

Every work item (suburb, agency, agent) uses this state machine:

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ in_progress │
                  └──────┬──────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌─────────┐
      │ complete │ │  failed  │ │ skipped │
      └──────────┘ └────┬─────┘ └─────────┘
                        │
                        ▼
                   ┌─────────┐
                   │  retry  │ (max 3 attempts)
                   └────┬────┘
                        │
                        ▼
                  ┌───────────┐
                  │ abandoned │
                  └───────────┘
```

| State | Description | When to Use |
|-------|-------------|-------------|
| `pending` | Not yet started | Initial state for all items |
| `in_progress` | Currently being processed | Work has begun |
| `complete` | Successfully finished | All API calls succeeded, data stored |
| `failed` | Current attempt failed | API error, timeout, validation error |
| `retry` | Queued for retry | After failure, before next attempt |
| `abandoned` | Permanently failed | Max retries (3) exceeded |
| `skipped` | Intentionally skipped | Duplicate detected, filtered out |

### Error Classification

**Transient Errors (Retry with exponential backoff):**
- 429 Too Many Requests
- 500, 502, 503, 504 Server Errors
- Network timeout
- Connection reset

**Permanent Errors (Don't retry):**
- 400 Bad Request (malformed request)
- 401 Unauthorized (auth issue)
- 403 Forbidden (access denied)
- 404 Not Found (entity doesn't exist)

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterPercent: 0.2
};

// Delays: ~1s, ~2s, ~4s (then abandon)
function getRetryDelay(attempt: number): number {
  const baseDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const jitter = baseDelay * RETRY_CONFIG.jitterPercent * Math.random();
  return Math.min(baseDelay + jitter, RETRY_CONFIG.maxDelayMs);
}
```

### Resume Logic

On orchestrator startup, check in this order:

1. **Check for interrupted runs** — `orchestrator_runs` with `status = 'running'`
2. **Check for active priority overrides** — User-requested suburbs/agencies
3. **Find in_progress agencies** — Resume where we left off
4. **Find pending agencies** — Process before discovering more suburbs
5. **Find pending suburbs** — Discover more agencies
6. **All complete** — Nothing to do

### Graceful Shutdown

On SIGTERM/SIGINT:
1. Stop accepting new work
2. Wait for current API call to complete (max 30s timeout)
3. Record interrupted state with resume point in `orchestrator_runs`
4. Exit cleanly with code 0

---

## Domain.com.au API Analysis

### Authentication

- **Method:** OAuth 2.0 Client Credentials
- **Token URL:** `https://auth.domain.com.au/v1/connect/token`
- **Base URL:** `https://api.domain.com.au/v1/`
- **Required Scope:** `api_agencies_read`, `api_listings_read`

### Rate Limits

- **Free Tier:** 500 API calls/day
- **Headers:** `X-Quota-PerDay-Remaining`, `X-Quota-PerMinute-Remaining`
- **Reset:** 10am AEST daily

### Key Endpoints

#### 1. Search Agencies by Suburb
```
GET /v1/agencies?q=suburbId:{suburbId}
```
- **Note:** NO "get all agencies" endpoint exists
- Must search by suburb, name, or other criteria
- Returns: id, name, suburb, logoUrl, telephone, email, numberForSale, numberForRent

#### 2. Get Agency Details (includes agents)
```
GET /v1/agencies/{id}
```
Returns agency details AND basic agent data:
```json
{
  "id": 0,
  "name": "string",
  "profile": {
    "agencyLogoStandard": "string",
    "agencyWebsite": "string",
    "agencyDescription": "string"
  },
  "details": {
    "streetAddress1": "string",
    "suburb": "string",
    "state": "string",
    "postcode": "string",
    "principalName": "string"
  },
  "agents": [
    {
      "id": 0,
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "mobile": "string",
      "photo": "string",
      "profileText": "string"
    }
  ]
}
```

#### 3. Get Full Agent Profile (SKIP IN V1)
```
GET /v1/agents/{id}
```
**Optimization:** Skip this call in V1. Use agent data from agency endpoint instead. Only fetch full profile for high-priority agents or when claiming profiles.

#### 4. Get Agent's Listings (SKIP IN V1)
```
GET /v1/agents/{id}/listings?includedArchivedListings=true
```
**Skip in V1** — Focus on agent profiles first, add listing stats in V2.

### API Budget Strategy (Optimized)

**V1 Approach: Skip individual agent calls**

| Phase | Operation | Calls per Suburb | Notes |
|-------|-----------|------------------|-------|
| Discovery | Search agencies | 1-3 | Paginated if many |
| Processing | Get agency details | ~10 | Includes agent data |
| **Total per suburb** | | **~13** | vs. ~115 without optimization |

**Daily Capacity with Optimization:**
- 500 calls ÷ 13 calls/suburb = **~38 suburbs/day**
- Tier 1 (20 suburbs) = ~1 day
- All 50 priority suburbs = ~2 days

**Budget Tracking:**

```typescript
async function checkRateLimit(db: Database): Promise<{ remaining: number; canProceed: boolean }> {
  const today = new Date().toISOString().split('T')[0];
  const run = await db.get('SELECT api_calls_made FROM orchestrator_runs WHERE DATE(started_at) = ?', today);

  const remaining = 500 - (run?.api_calls_made || 0);
  const BUFFER = 50; // Keep 50 calls as emergency buffer

  return {
    remaining,
    canProceed: remaining > BUFFER
  };
}
```

**When to Stop:**
```
IF remaining_quota < 50:
    LOG("Low quota buffer reached, stopping for today")
    SAVE checkpoint
    EXIT gracefully
```

---

## Data Model

### SQLite Schema

```sql
-- =============================================================================
-- ORCHESTRATOR TRACKING TABLES
-- =============================================================================

-- Track each orchestrator run
CREATE TABLE orchestrator_runs (
    run_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    status TEXT NOT NULL DEFAULT 'running',
        -- 'running', 'completed', 'interrupted', 'error'
    api_calls_made INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 500,
    suburbs_discovered INTEGER DEFAULT 0,
    agencies_discovered INTEGER DEFAULT 0,
    agencies_processed INTEGER DEFAULT 0,
    agents_processed INTEGER DEFAULT 0,
    error_message TEXT,
    interrupted_at TEXT,  -- JSON: {"type": "agency", "id": "12345"}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Track API errors for debugging
CREATE TABLE api_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT REFERENCES orchestrator_runs(run_id),
    entity_type TEXT NOT NULL,  -- 'suburb', 'agency', 'agent'
    entity_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    http_status INTEGER,
    error_code TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    will_retry BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Allow manual priority overrides (e.g., "do Bondi next")
CREATE TABLE priority_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,  -- 'suburb', 'agency'
    entity_id TEXT NOT NULL,
    override_priority INTEGER NOT NULL DEFAULT 1000,
    reason TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',  -- 'active', 'processed', 'expired'
    UNIQUE(entity_type, entity_id, status)
);

-- =============================================================================
-- PROGRESS TRACKING TABLES
-- =============================================================================

-- Suburb discovery progress
CREATE TABLE scrape_progress (
    id INTEGER PRIMARY KEY,
    suburb_id TEXT NOT NULL UNIQUE,
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    priority_tier INTEGER DEFAULT 3,  -- 1=highest, 3=lowest
    priority_score REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'discovered', 'complete', 'failed', 'abandoned'
    agencies_found INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Agency processing progress
CREATE TABLE agency_progress (
    id INTEGER PRIMARY KEY,
    domain_agency_id INTEGER NOT NULL UNIQUE,
    agency_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'failed', 'skipped', 'abandoned'
    agents_total INTEGER DEFAULT 0,
    agents_processed INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Agency-suburb many-to-many (for deduplication)
CREATE TABLE agency_suburbs (
    agency_domain_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_primary_office BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (agency_domain_id, suburb_id)
);

-- =============================================================================
-- CORE DATA TABLES
-- =============================================================================

-- Agency brand tiers (for priority scoring)
CREATE TABLE agency_brands (
    brand_name TEXT PRIMARY KEY,
    brand_tier INTEGER DEFAULT 5,  -- 1-10, higher = process first
    is_franchise BOOLEAN DEFAULT TRUE
);

-- Pre-seed major brands
INSERT INTO agency_brands (brand_name, brand_tier) VALUES
    ('Ray White', 10),
    ('LJ Hooker', 10),
    ('McGrath', 9),
    ('Belle Property', 9),
    ('Harcourts', 8),
    ('Century 21', 8),
    ('Raine & Horne', 8),
    ('PRD', 7),
    ('First National', 7),
    ('Laing+Simmons', 7),
    ('Richardson & Wrench', 6),
    ('Elders Real Estate', 6);

-- Agencies
CREATE TABLE agencies (
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand_name TEXT,  -- For tier lookup
    logo_url TEXT,
    website TEXT,
    description TEXT,
    street_address TEXT,
    suburb TEXT,
    state TEXT,
    postcode TEXT,
    phone TEXT,
    email TEXT,
    principal_name TEXT,
    latitude REAL,
    longitude REAL,
    agent_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agents
CREATE TABLE agents (
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    agency_id INTEGER REFERENCES agencies(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    photo_url TEXT,
    profile_text TEXT,
    job_position TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    video_url TEXT,
    domain_profile_url TEXT,
    is_sale_active BOOLEAN DEFAULT TRUE,
    is_rental_active BOOLEAN DEFAULT FALSE,

    -- Enriched data (from sub-agents)
    enriched_bio TEXT,
    years_experience INTEGER,
    years_experience_source TEXT,  -- 'linkedin', 'agency_website', 'inferred'
    languages TEXT,  -- JSON array: ["English", "Mandarin"]
    languages_source TEXT,
    specializations TEXT,  -- JSON array: ["luxury homes", "apartments"]
    specializations_source TEXT,
    awards TEXT,  -- JSON array: [{"name": "...", "year": 2024}]
    awards_source TEXT,

    -- Enrichment metadata
    enrichment_status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'failed', 'skipped'
    enrichment_quality TEXT,  -- 'high', 'medium', 'low', 'minimal'
    enrichment_error TEXT,

    -- Calculated stats (V2 - skip for now)
    properties_sold_12mo INTEGER,
    avg_sale_price_12mo REAL,
    median_days_on_market INTEGER,
    total_sales_value_12mo REAL,

    -- Page quality signals
    has_sufficient_content BOOLEAN DEFAULT TRUE,  -- For noindex decisions

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enriched_at DATETIME
);

-- Agent-suburb associations
CREATE TABLE agent_suburbs (
    agent_id INTEGER REFERENCES agents(id),
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    properties_sold INTEGER DEFAULT 0,
    PRIMARY KEY (agent_id, suburb, state)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_orchestrator_runs_status ON orchestrator_runs(status, started_at);
CREATE INDEX idx_api_errors_entity ON api_errors(entity_type, entity_id);
CREATE INDEX idx_scrape_progress_status ON scrape_progress(status, priority_tier);
CREATE INDEX idx_agency_progress_status ON agency_progress(status);
CREATE INDEX idx_agency_suburbs_suburb ON agency_suburbs(suburb_id);
CREATE INDEX idx_agents_agency ON agents(agency_id);
CREATE INDEX idx_agents_suburb ON agent_suburbs(suburb, state);
CREATE INDEX idx_agents_enrichment ON agents(enrichment_status);
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agencies_slug ON agencies(slug);
```

### Agent Slug Generation

```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes (O'Connor -> oconnor)
    .replace(/&/g, 'and')           // Replace ampersands
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Remove multiple hyphens
    .replace(/^-|-$/g, '');         // Trim hyphens from ends
}

function generateAgentSlug(
  firstName: string,
  lastName: string,
  suburb: string,
  agencyName: string,
  domainId: number
): string {
  const namePart = slugify(`${firstName} ${lastName}`);
  const suburbPart = slugify(suburb);
  const agencyInitials = agencyName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toLowerCase()
    .slice(0, 3);
  const shortId = domainId.toString(36).slice(-5);

  return `${namePart}-${suburbPart}-${agencyInitials}-${shortId}`;
}

// Examples:
// John Smith, Bondi, Ray White, 123456 → "john-smith-bondi-rw-1z141"
// Mary O'Connor, St Kilda, Belle Property, 789012 → "mary-oconnor-st-kilda-bp-hj3s"
```

---

## Agent Orchestration System

### Main Orchestrator

```typescript
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface OrchestratorConfig {
  db: Database;
  domainApi: DomainApiClient;
  maxApiCallsPerRun?: number;  // Default: 450 (leave 50 buffer)
}

async function orchestrator(config: OrchestratorConfig): Promise<void> {
  const { db, domainApi, maxApiCallsPerRun = 450 } = config;
  const runId = uuidv4();

  // Initialize run tracking
  db.prepare(`
    INSERT INTO orchestrator_runs (run_id, started_at, status)
    VALUES (?, datetime('now'), 'running')
  `).run(runId);

  let apiCallsMade = 0;

  // Setup graceful shutdown
  let shuttingDown = false;
  const shutdown = async () => {
    shuttingDown = true;
    db.prepare(`
      UPDATE orchestrator_runs
      SET status = 'interrupted', ended_at = datetime('now'), api_calls_made = ?
      WHERE run_id = ?
    `).run(apiCallsMade, runId);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    // PHASE 1: Check for priority overrides
    const override = db.prepare(`
      SELECT * FROM priority_overrides
      WHERE status = 'active'
      ORDER BY override_priority DESC
      LIMIT 1
    `).get();

    if (override) {
      console.log(`Processing priority override: ${override.entity_type} ${override.entity_id}`);
      // Handle override...
      db.prepare(`UPDATE priority_overrides SET status = 'processed' WHERE id = ?`).run(override.id);
    }

    // PHASE 2: Resume any in-progress work
    const inProgressAgency = db.prepare(`
      SELECT * FROM agency_progress WHERE status = 'in_progress' LIMIT 1
    `).get();

    if (inProgressAgency) {
      console.log(`Resuming agency: ${inProgressAgency.agency_name}`);
      apiCallsMade += await processAgency(db, domainApi, inProgressAgency.domain_agency_id);
    }

    // PHASE 3: Process pending agencies (before discovering more)
    while (!shuttingDown && apiCallsMade < maxApiCallsPerRun) {
      const pendingAgency = db.prepare(`
        SELECT ap.*, ab.brand_tier
        FROM agency_progress ap
        LEFT JOIN agencies a ON ap.domain_agency_id = a.domain_id
        LEFT JOIN agency_brands ab ON a.brand_name = ab.brand_name
        WHERE ap.status = 'pending'
        ORDER BY COALESCE(ab.brand_tier, 5) DESC
        LIMIT 1
      `).get();

      if (!pendingAgency) break;

      apiCallsMade += await processAgency(db, domainApi, pendingAgency.domain_agency_id);

      // Update run stats
      db.prepare(`
        UPDATE orchestrator_runs
        SET api_calls_made = ?, agencies_processed = agencies_processed + 1
        WHERE run_id = ?
      `).run(apiCallsMade, runId);
    }

    // PHASE 4: Discover more suburbs if capacity remains
    while (!shuttingDown && apiCallsMade < maxApiCallsPerRun) {
      const pendingSuburb = db.prepare(`
        SELECT * FROM scrape_progress
        WHERE status = 'pending'
        ORDER BY priority_tier ASC, priority_score DESC
        LIMIT 1
      `).get();

      if (!pendingSuburb) {
        console.log('All suburbs processed!');
        break;
      }

      apiCallsMade += await discoverSuburb(db, domainApi, pendingSuburb);

      db.prepare(`
        UPDATE orchestrator_runs
        SET api_calls_made = ?, suburbs_discovered = suburbs_discovered + 1
        WHERE run_id = ?
      `).run(apiCallsMade, runId);
    }

    // Mark run complete
    db.prepare(`
      UPDATE orchestrator_runs
      SET status = 'completed', ended_at = datetime('now'), api_calls_made = ?
      WHERE run_id = ?
    `).run(apiCallsMade, runId);

  } catch (error) {
    db.prepare(`
      UPDATE orchestrator_runs
      SET status = 'error', ended_at = datetime('now'), error_message = ?, api_calls_made = ?
      WHERE run_id = ?
    `).run(error.message, apiCallsMade, runId);
    throw error;
  }
}

async function discoverSuburb(
  db: Database,
  domainApi: DomainApiClient,
  suburb: SuburbRecord
): Promise<number> {
  let apiCalls = 0;

  db.prepare(`UPDATE scrape_progress SET status = 'in_progress', started_at = datetime('now') WHERE id = ?`)
    .run(suburb.id);

  try {
    // Fetch agencies in this suburb
    const agencies = await domainApi.searchAgencies(suburb.suburb_id);
    apiCalls++;

    let newAgenciesFound = 0;

    for (const agency of agencies) {
      // Check if we already have this agency
      const existing = db.prepare(`SELECT 1 FROM agency_progress WHERE domain_agency_id = ?`)
        .get(agency.id);

      if (!existing) {
        // New agency - add to queue
        db.prepare(`
          INSERT INTO agency_progress (domain_agency_id, agency_name, status)
          VALUES (?, ?, 'pending')
        `).run(agency.id, agency.name);
        newAgenciesFound++;
      }

      // Record agency-suburb relationship
      db.prepare(`
        INSERT OR IGNORE INTO agency_suburbs (agency_domain_id, suburb_id)
        VALUES (?, ?)
      `).run(agency.id, suburb.suburb_id);
    }

    db.prepare(`
      UPDATE scrape_progress
      SET status = 'discovered', agencies_found = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(newAgenciesFound, suburb.id);

    console.log(`Discovered ${suburb.suburb_name}: ${agencies.length} agencies (${newAgenciesFound} new)`);

  } catch (error) {
    db.prepare(`
      UPDATE scrape_progress
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1
      WHERE id = ?
    `).run(error.message, suburb.id);

    // Log error for debugging
    db.prepare(`
      INSERT INTO api_errors (entity_type, entity_id, endpoint, error_message)
      VALUES ('suburb', ?, 'searchAgencies', ?)
    `).run(suburb.suburb_id, error.message);
  }

  return apiCalls;
}

async function processAgency(
  db: Database,
  domainApi: DomainApiClient,
  agencyDomainId: number
): Promise<number> {
  let apiCalls = 0;

  db.prepare(`UPDATE agency_progress SET status = 'in_progress', started_at = datetime('now') WHERE domain_agency_id = ?`)
    .run(agencyDomainId);

  try {
    // Fetch agency details (includes agent list)
    const agencyDetails = await domainApi.getAgency(agencyDomainId);
    apiCalls++;

    // Determine brand name for tier lookup
    const brandName = detectBrandName(agencyDetails.name);

    // Upsert agency
    db.prepare(`
      INSERT INTO agencies (domain_id, name, slug, brand_name, logo_url, website, description,
        street_address, suburb, state, postcode, phone, email, principal_name, agent_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(domain_id) DO UPDATE SET
        name = excluded.name, logo_url = excluded.logo_url, website = excluded.website,
        agent_count = excluded.agent_count, updated_at = datetime('now')
    `).run(
      agencyDetails.id,
      agencyDetails.name,
      slugify(agencyDetails.name),
      brandName,
      agencyDetails.profile?.agencyLogoStandard,
      agencyDetails.profile?.agencyWebsite,
      agencyDetails.profile?.agencyDescription,
      agencyDetails.details?.streetAddress1,
      agencyDetails.details?.suburb,
      agencyDetails.details?.state,
      agencyDetails.details?.postcode,
      agencyDetails.details?.telephone,
      agencyDetails.details?.email,
      agencyDetails.details?.principalName,
      agencyDetails.agents?.length || 0
    );

    // Get agency internal ID
    const agency = db.prepare(`SELECT id FROM agencies WHERE domain_id = ?`).get(agencyDomainId);

    // Process each agent from agency data
    for (const agent of agencyDetails.agents || []) {
      const slug = generateAgentSlug(
        agent.firstName,
        agent.lastName,
        agencyDetails.details?.suburb || '',
        agencyDetails.name,
        agent.id
      );

      db.prepare(`
        INSERT INTO agents (domain_id, agency_id, first_name, last_name, slug, email, mobile,
          photo_url, profile_text, enrichment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(domain_id) DO UPDATE SET
          agency_id = excluded.agency_id, photo_url = excluded.photo_url,
          profile_text = excluded.profile_text, updated_at = datetime('now')
      `).run(
        agent.id,
        agency.id,
        agent.firstName,
        agent.lastName,
        slug,
        agent.email,
        agent.mobile,
        agent.photo,
        agent.profileText
      );

      // Record agent-suburb association
      if (agencyDetails.details?.suburb) {
        db.prepare(`
          INSERT OR IGNORE INTO agent_suburbs (agent_id, suburb, state, postcode, is_primary)
          SELECT id, ?, ?, ?, TRUE FROM agents WHERE domain_id = ?
        `).run(
          agencyDetails.details.suburb,
          agencyDetails.details.state,
          agencyDetails.details.postcode,
          agent.id
        );
      }
    }

    db.prepare(`
      UPDATE agency_progress
      SET status = 'complete', agents_total = ?, completed_at = datetime('now')
      WHERE domain_agency_id = ?
    `).run(agencyDetails.agents?.length || 0, agencyDomainId);

    console.log(`Processed ${agencyDetails.name}: ${agencyDetails.agents?.length || 0} agents`);

  } catch (error) {
    const progress = db.prepare(`SELECT retry_count FROM agency_progress WHERE domain_agency_id = ?`)
      .get(agencyDomainId);

    const newStatus = (progress?.retry_count || 0) >= 2 ? 'abandoned' : 'failed';

    db.prepare(`
      UPDATE agency_progress
      SET status = ?, error_message = ?, retry_count = retry_count + 1
      WHERE domain_agency_id = ?
    `).run(newStatus, error.message, agencyDomainId);
  }

  return apiCalls;
}

function detectBrandName(agencyName: string): string | null {
  const brands = [
    'Ray White', 'LJ Hooker', 'McGrath', 'Belle Property', 'Harcourts',
    'Century 21', 'Raine & Horne', 'PRD', 'First National', 'Laing+Simmons'
  ];

  for (const brand of brands) {
    if (agencyName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return null;
}
```

### Cron Job Setup

```bash
# Run nightly at 2am AEST (after Domain API quota reset at 10am AEST previous day)
0 2 * * * cd /path/to/project && npx ts-node src/orchestrator.ts >> logs/orchestrator.log 2>&1
```

---

## Enrichment Sub-Agent System

### Priority Fields to Enrich

| Field | SEO Value | User Value | Priority |
|-------|-----------|------------|----------|
| Years of experience | HIGH | HIGH | **CRITICAL** |
| Languages spoken | HIGH | HIGH | **HIGH** |
| Specializations | HIGH | MEDIUM | **HIGH** |
| Awards/Recognition | MEDIUM | HIGH | **MEDIUM** |
| Extended bio | MEDIUM | MEDIUM | **LOW** |

### Source Priority Order

```
TIER 1: High-Value Sources (Always Check)
├── LinkedIn (if URL provided or easily found)
│   └── Employment history → years of experience
│   └── Skills section → languages, specializations
└── Agency Website (team page)
    └── Bio → specializations, awards
    └── Languages explicitly listed

TIER 2: Secondary Validation (Check if Tier 1 has gaps)
├── realestate.com.au agent profile
├── Domain.com.au web profile (beyond API data)
└── Google search: "{name}" "{agency}" awards

TIER 3: Supplementary (Only if time permits)
├── Facebook business page
├── Industry publications (Elite Agent, REB)
└── REIA state website (for award verification)
```

### Enrichment Prompt Template

```typescript
const enrichmentPrompt = (agent: AgentRecord, agency: AgencyRecord) => `
You are a research specialist for real estate agent profiles.

## Agent to Research
**Name:** ${agent.first_name} ${agent.last_name}
**Agency:** ${agency.name}
**Location:** ${agency.suburb}, ${agency.state} ${agency.postcode}
**LinkedIn:** ${agent.linkedin_url || 'not provided'}
**Agency Website:** ${agency.website || 'not provided'}

## Research Instructions

### Priority 1: Years of Experience
- Check LinkedIn employment history if URL provided
- Look for "X years in real estate" on agency website bio
- Calculate from earliest real estate role if dates available

### Priority 2: Languages Spoken
- ONLY include languages explicitly stated
- Check LinkedIn skills section
- Check agency website bio
- DO NOT assume based on name

### Priority 3: Specializations
- Look for property types (luxury, apartments, houses, commercial)
- Look for buyer types (first home buyers, investors, downsizers)
- Look for area specializations (waterfront, prestige, rural)

### Priority 4: Awards
- Check REIA (Real Estate Institute of Australia) state awards
- Check agency awards mentioned in bio
- Verify year and level (agency, state, national)

## Output Format

Return ONLY valid JSON:
{
  "years_experience": <number or null>,
  "years_experience_source": "linkedin" | "agency_website" | "google" | null,
  "languages": ["English", ...] or [],
  "specializations": ["luxury homes", "apartments", ...] or [],
  "awards": [
    {"name": "Top Sales Agent", "year": 2024, "level": "agency"}
  ] or [],
  "confidence": "high" | "medium" | "low" | "minimal"
}

## Critical Rules
- DO NOT make up information - use null if not found
- DO NOT scrape Rate My Agent (legal/ethical concerns)
- DO NOT assume languages based on names
- Verify awards are real (check official sources)
- If conflicting data, prefer LinkedIn over other sources
`;
```

### DO NOT Scrape Rate My Agent

**Why:**
- Terms of Service violation risk
- Ethical concerns (competitor's user-generated content)
- Reputational risk for ARI as "neutral" index
- Legal liability potential

**Legitimate Alternatives:**
- Check public REIA state award winner pages
- Google search: `site:ratemyagent.com.au "{agent name}" award`
- Allow agents to self-report awards when claiming profile
- Use REIA awards as authoritative alternative

### Enrichment Runner

```typescript
async function runEnrichment(db: Database, batchSize: number = 10): Promise<void> {
  const pendingAgents = db.prepare(`
    SELECT a.*, ag.name as agency_name, ag.suburb as agency_suburb,
           ag.state as agency_state, ag.postcode as agency_postcode, ag.website as agency_website
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.enrichment_status = 'pending'
    LIMIT ?
  `).all(batchSize);

  for (const agent of pendingAgents) {
    db.prepare(`UPDATE agents SET enrichment_status = 'in_progress' WHERE id = ?`).run(agent.id);

    try {
      const session = await createAgentSession({
        model: 'claude-sonnet-4-5-20250929',
        tools: ['WebSearch', 'WebFetch']
      });

      const result = await session.send(enrichmentPrompt(agent, {
        name: agent.agency_name,
        suburb: agent.agency_suburb,
        state: agent.agency_state,
        postcode: agent.agency_postcode,
        website: agent.agency_website
      }));

      const enrichedData = JSON.parse(result);

      db.prepare(`
        UPDATE agents SET
          years_experience = ?,
          years_experience_source = ?,
          languages = ?,
          specializations = ?,
          awards = ?,
          enrichment_status = 'complete',
          enrichment_quality = ?,
          enriched_at = datetime('now')
        WHERE id = ?
      `).run(
        enrichedData.years_experience,
        enrichedData.years_experience_source,
        JSON.stringify(enrichedData.languages),
        JSON.stringify(enrichedData.specializations),
        JSON.stringify(enrichedData.awards),
        enrichedData.confidence,
        agent.id
      );

    } catch (error) {
      db.prepare(`
        UPDATE agents SET enrichment_status = 'failed', enrichment_error = ?
        WHERE id = ?
      `).run(error.message, agent.id);
    }
  }
}
```

---

## SEO Strategy

### URL Structure

```
# Agent pages
/agent/{slug}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency pages
/agency/{slug}
Example: /agency/ray-white-bondi-beach

# State pages
/agents-in/{state}
Example: /agents-in/nsw

# Suburb pages (Primary SEO target)
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026

# Property type pages (Only if thresholds met - see below)
/agents-in/{suburb}-{state}-{postcode}/{property-type}
Example: /agents-in/bondi-nsw-2026/apartments
```

### Property Type Page Thresholds

Only create `/agents-in/{suburb}/{property-type}` pages when:
- **10+ agents** have sales in that property type
- **20+ sales** in that property type (12 months)
- **50+ monthly searches** for that term

Below thresholds: Show as section on main suburb page, not separate page.

### Trailing Slash Policy

**Use NO trailing slashes consistently.**

```javascript
// next.config.js
module.exports = {
  trailingSlash: false,

  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
      // Redirect uppercase state codes
      {
        source: '/agents-in/:suburb-NSW-:postcode',
        destination: '/agents-in/:suburb-nsw-:postcode',
        permanent: true,
      },
      {
        source: '/agents-in/:suburb-VIC-:postcode',
        destination: '/agents-in/:suburb-vic-:postcode',
        permanent: true,
      },
    ];
  },
};
```

### Handling Duplicate Suburb Names

Australian suburbs can share names across states (e.g., "Richmond" in VIC, NSW, QLD).

**Always include state and postcode in URLs:**
- ✅ Correct: `/agents-in/richmond-vic-3121`
- ❌ Wrong: `/agents-in/richmond`

### Schema Markup

#### Agent Page Schema

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c#agent",
  "name": "John Smith",
  "image": "https://...",
  "jobTitle": "Senior Sales Agent",
  "worksFor": {
    "@type": "RealEstateAgent",
    "@id": "https://ari.com.au/agency/ray-white-bondi-beach#agency",
    "name": "Ray White Bondi Beach"
  },
  "areaServed": [
    {
      "@type": "Place",
      "name": "Bondi, NSW",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Bondi",
        "addressRegion": "NSW",
        "postalCode": "2026",
        "addressCountry": "AU"
      }
    }
  ],
  "telephone": "+61...",
  "email": "...",
  "url": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c"
}
```

#### BreadcrumbList Schema (All Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://ari.com.au/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "NSW",
      "item": "https://ari.com.au/agents-in/nsw"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Bondi",
      "item": "https://ari.com.au/agents-in/bondi-nsw-2026"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "John Smith"
    }
  ]
}
```

#### Suburb Page Schema (ItemList)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Real Estate Agents in Bondi, NSW 2026",
  "description": "Compare 85 real estate agents in Bondi, NSW.",
  "numberOfItems": 85,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "RealEstateAgent",
        "name": "John Smith",
        "worksFor": {
          "@type": "RealEstateAgent",
          "name": "Ray White Bondi Beach"
        },
        "url": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c"
      }
    }
  ]
}
```

#### FAQPage Schema (Suburb Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How many real estate agents are there in Bondi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "There are currently 85 active real estate agents operating in Bondi, NSW 2026, representing 12 agencies."
      }
    },
    {
      "@type": "Question",
      "name": "What is the median house price in Bondi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The median house price in Bondi is approximately $4.2 million as of 2026."
      }
    }
  ]
}
```

### Page Title Patterns

```
Agent:   {Name} - Real Estate Agent in {Suburb} | {Agency} | ARI
Agency:  {Agency Name} - Real Estate Agency in {Suburb}, {State} | ARI
Suburb:  {Count} Real Estate Agents in {Suburb}, {State} {Postcode} | ARI
State:   Real Estate Agents in {State Full Name} | ARI
```

**Character limit: 50-60 characters** (truncate with "..." if needed)

### Meta Description Patterns

```typescript
// Agent (with stats if available)
function generateAgentDescription(agent: Agent): string {
  const parts = [
    `${agent.firstName} ${agent.lastName} is a licensed real estate agent`,
    `at ${agent.agencyName} in ${agent.suburb}, ${agent.state}.`
  ];

  if (agent.propertiesSold12mo > 0) {
    parts.push(`${agent.propertiesSold12mo} properties sold in the last 12 months.`);
  }

  if (agent.specializations?.length > 0) {
    parts.push(`Specializes in ${agent.specializations[0]}.`);
  }

  parts.push('View profile and contact details.');

  return truncate(parts.join(' '), 155);
}

// Suburb
function generateSuburbDescription(suburb: Suburb, agentCount: number): string {
  return truncate(
    `Find ${agentCount} real estate agents in ${suburb.name}, ${suburb.state} ${suburb.postcode}. ` +
    `Compare agents by sales history, specializations, and experience. Free, neutral index.`,
    155
  );
}
```

**Character limit: 150-155 characters**

### Internal Linking Architecture

```
Homepage
├── State Pages (/agents-in/nsw)
│   ├── Suburb Pages (/agents-in/bondi-nsw-2026) ← HUB PAGES
│   │   ├── Agent Pages (/agent/john-smith-...)
│   │   └── Property Type Pages (/agents-in/bondi-nsw-2026/apartments)
│   └── Agency Pages (/agency/ray-white-bondi)
```

**Linking Rules:**
1. **Suburb pages are HUBS** — Receive most internal links
2. **Agent pages link UP** — To suburb and agency
3. **Suburb pages link DOWN** — To top agents
4. **Suburb pages link SIDEWAYS** — To nearby suburbs
5. **Footer includes** — Top 10-20 suburbs site-wide

**Minimum Links Per Page:**

| Page Type | Minimum Internal Links |
|-----------|------------------------|
| Agent page | 5+ (agency, suburb, related agents) |
| Suburb page | 15+ (agents, agencies, nearby suburbs) |
| Agency page | 10+ (agents, suburb) |

### Sitemap Strategy

For eventual 10,000+ URLs, use a sitemap index with sub-sitemaps:

```
/sitemap.xml           → Sitemap index (points to sub-sitemaps)
/sitemap-agents-0.xml  → Agents 1-5000
/sitemap-agents-1.xml  → Agents 5001-10000
/sitemap-agencies.xml  → All agencies
/sitemap-suburbs.xml   → All suburb pages
/sitemap-states.xml    → State pages (8 pages)
```

**Keep each sitemap under 50,000 URLs (Google's limit).**

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { db } from '@/lib/database';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
  const sitemapCount = Math.ceil(agentCount / 5000);

  const sitemaps: MetadataRoute.Sitemap = [];

  for (let i = 0; i < sitemapCount; i++) {
    sitemaps.push({
      url: `https://ari.com.au/sitemap-agents-${i}.xml`,
      lastModified: new Date(),
    });
  }

  sitemaps.push(
    { url: 'https://ari.com.au/sitemap-agencies.xml', lastModified: new Date() },
    { url: 'https://ari.com.au/sitemap-suburbs.xml', lastModified: new Date() },
    { url: 'https://ari.com.au/sitemap-states.xml', lastModified: new Date() }
  );

  return sitemaps;
}
```

**Priority Values:**

| Page Type | Priority | Changefreq |
|-----------|----------|------------|
| Homepage | 1.0 | weekly |
| State pages | 0.9 | monthly |
| Suburb pages | 0.8 | weekly |
| Agent pages (high activity) | 0.7 | weekly |
| Agent pages (low activity) | 0.5 | monthly |
| Agency pages | 0.6 | weekly |

### robots.txt Configuration

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/preview/',
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',  // Optional: block AI crawlers
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
    host: 'https://ari.com.au',
  };
}
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',  // Pure static export for V1

  trailingSlash: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.domain.com.au',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,  // Required for static export
  },

  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },
};
```

---

## Safe Rollout Strategy

### Why This Matters

Google's March 2024 Core Update specifically targets "Scaled Content Abuse" — sites that launch thousands of low-quality pages to manipulate rankings. Without proper rollout:
- Risk of manual action (penalty)
- Pages may be "Crawled - currently not indexed"
- Domain authority can be damaged

### Phased Rollout Plan

#### Phase 1: Foundation (Weeks 1-4)
- Launch with **10-20 high-quality pilot pages**
- Focus on agents with most complete data (photo, bio, specializations)
- Select from Tier 1 suburbs only
- Perfect template quality before scaling
- **Goal:** 95%+ indexation rate, positive user signals

#### Phase 2: Controlled Expansion (Weeks 5-12)
- Gradually increase to **50-100 new pages per week**
- Deploy in logical suburb clusters (for internal linking)
- Monitor index coverage in Google Search Console
- Watch for "Crawled - currently not indexed" status
- **Goal:** Maintain 90%+ indexation rate

#### Phase 3: Scale (Months 3-6)
- If metrics healthy, increase to **200-500 pages per week**
- Add Tier 2 and Tier 3 suburbs
- Continue monitoring quality signals
- Build backlinks to hub pages (suburb pages)
- **Goal:** 5,000+ indexed pages

#### Phase 4: Full Deployment (Month 6+)
- 10,000+ pages feasible only after proving quality
- Consider Brisbane/Melbourne expansion
- Evaluate paid Domain API tier if needed

### Quality Gates Before Scaling

| Metric | Target | Action if Not Met |
|--------|--------|-------------------|
| Indexation rate | > 90% | Slow down, improve content |
| Avg position (new pages) | Improving or stable | Review page quality |
| CTR (Search Console) | > 2% | Improve titles/descriptions |
| Bounce rate | < 70% | Improve page content |

### Warning Signs — Slow Down If:

- High "Crawled - currently not indexed" percentage in GSC (> 15%)
- Declining average position across new pages
- Low click-through rates on new pages (< 1%)
- Manual action warnings in Search Console
- Significant bounce rate increases (> 80%)

### Expected Timeline

| Milestone | Expected Timeline |
|-----------|-------------------|
| Initial indexing starts | 2-4 weeks |
| First organic traffic | 4-8 weeks |
| Meaningful organic growth | 3-6 months |
| ROI realization | 6-12 months |

---

## Thin Content Guidelines

### What Is Thin Content?

Pages with insufficient unique value that Google may:
- Refuse to index ("Crawled - not indexed")
- Index but rank poorly
- Penalize (in extreme cases)

### Minimum Content Requirements

| Content Element | Minimum | Optimal |
|-----------------|---------|---------|
| Word count (unique text) | 300-500 | 800-1500 |
| Data points | 5-10 | 15-20+ |
| Internal links | 3-5 | 8-15 |
| Images | 1-2 | 3-5+ |

### Noindex Decision Framework

```
IF (no photo AND no bio AND properties_sold = 0):
    → noindex, follow

ELSE IF (properties_sold < 3 AND no specializations):
    → noindex, follow (reconsider when more data)

ELSE IF (properties_sold < 5 AND bio length < 100 chars):
    → index but monitor performance

ELSE:
    → publish with full optimization
```

### Implementation

```typescript
// lib/seo.ts
export function shouldIndexAgent(agent: Agent): boolean {
  // Must have at least a photo OR bio
  if (!agent.photo_url && !agent.profile_text) {
    return false;
  }

  // Very thin profiles
  if (
    !agent.photo_url &&
    (!agent.profile_text || agent.profile_text.length < 50) &&
    (agent.properties_sold_12mo || 0) === 0
  ) {
    return false;
  }

  return true;
}

// app/agent/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  return {
    title: generateAgentTitle(agent),
    description: generateAgentDescription(agent),
    robots: {
      index: shouldIndexAgent(agent),
      follow: true,  // Always follow links
    },
    alternates: {
      canonical: `https://ari.com.au/agent/${params.slug}`,
    },
  };
}
```

### Raw Data vs Derived Insights

**Critical distinction — Derived insights add SEO value:**

| Raw Data (Low Value) | Derived Insight (High Value) |
|---------------------|------------------------------|
| "23 sales in 2024" | "23 sales in 2024, ranking #3 in Bondi" |
| "Median price $1.2M" | "Median price $1.2M (12% above suburb average)" |
| "42 days on market" | "42 days on market (2 weeks faster than typical)" |
| "Speaks Mandarin" | "One of 5 Mandarin-speaking agents in Bondi" |

### Pages to Noindex

| Scenario | Action |
|----------|--------|
| Agent with no photo, no bio, no sales | `noindex, follow` |
| Duplicate suburb pages (old URLs) | 301 redirect to canonical |
| Paginated results beyond page 5 | `noindex, follow` |
| Filter/sort result pages | `noindex, follow` |
| Property type pages below threshold | Don't create (section only) |
| Inactive/moved agents | `noindex` or remove |

---

## Sydney Suburb Priority List

### Tier 1: Top 20 (Process First)

| Priority | Suburb | Postcode | Median Price | Est. Agents | Rationale |
|----------|--------|----------|--------------|-------------|-----------|
| 1 | Mosman | 2088 | $5.5M | 150+ | Highest transaction values |
| 2 | Bondi Beach | 2026 | $4.2M | 100+ | Iconic brand, high search volume |
| 3 | Double Bay | 2028 | $6.5M | 80+ | Prestige market |
| 4 | Paddington | 2021 | $3.55M | 60+ | Highest per-sqm prices |
| 5 | Manly | 2095 | $4.58M | 100+ | Northern beaches hub |
| 6 | Surry Hills | 2010 | $2.1M | 50+ | Inner city demand |
| 7 | Castle Hill | 2154 | $1.8M | 120+ | Hills district hub |
| 8 | Neutral Bay | 2089 | $3.2M | 60+ | Lower north shore |
| 9 | Chatswood | 2067 | $2.8M | 100+ | Asian buyer market |
| 10 | Balmain | 2041 | $2.4M | 70+ | Inner west prestige |
| 11 | Vaucluse | 2030 | $7.8M | 40+ | Ultra-prestige |
| 12 | Cronulla | 2230 | $2.24M | 80+ | Sutherland hub |
| 13 | Bellevue Hill | 2023 | $9.82M | 50+ | Highest median in Sydney |
| 14 | Parramatta | 2150 | $1.6M | 150+ | Western Sydney hub |
| 15 | Newtown | 2042 | $1.76M | 60+ | Inner west alternative |
| 16 | Randwick | 2031 | $3.55M | 70+ | Eastern suburbs |
| 17 | Lane Cove | 2066 | $2.6M | 60+ | North shore family |
| 18 | Dee Why | 2099 | $2.45M | 80+ | Northern beaches growth |
| 19 | Woollahra | 2025 | $3.9M | 50+ | Eastern prestige |
| 20 | Marrickville | 2204 | $1.98M | 80+ | Gentrifying inner west |

### Tier 2: Suburbs 21-35

| Priority | Suburb | Postcode | Notes |
|----------|--------|----------|-------|
| 21 | Pymble | 2073 | Upper north shore |
| 22 | Strathfield | 2135 | Asian buyer market |
| 23 | Kellyville | 2155 | Hills growth corridor |
| 24 | Coogee | 2034 | Eastern beaches |
| 25 | Kirribilli | 2061 | Harbour views |
| 26 | Cremorne | 2090 | Lower north shore |
| 27 | Drummoyne | 2047 | Inner west waterfront |
| 28 | Maroubra | 2035 | Eastern beaches affordable |
| 29 | Epping | 2121 | Northern growth |
| 30 | Cammeray | 2062 | Lower north shore |
| 31 | Five Dock | 2046 | Inner west family |
| 32 | Crows Nest | 2065 | North shore village |
| 33 | Hunters Hill | 2110 | Waterfront prestige |
| 34 | Willoughby | 2068 | Lower north shore |
| 35 | Gladesville | 2111 | Inner west access |

### Tier 3: Suburbs 36-50

| Priority | Suburb | Postcode | Notes |
|----------|--------|----------|-------|
| 36 | Wahroonga | 2076 | Upper north shore |
| 37 | Collaroy | 2097 | Northern beaches |
| 38 | Rozelle | 2039 | Inner west village |
| 39 | Brookvale | 2100 | Northern beaches hub |
| 40 | Leichhardt | 2040 | Italian quarter |
| 41 | Artarmon | 2064 | North shore access |
| 42 | Ryde | 2112 | Mid-price north |
| 43 | Miranda | 2228 | Sutherland shire |
| 44 | Bondi Junction | 2022 | Eastern hub |
| 45 | Hornsby | 2077 | Upper north hub |
| 46 | Caringbah | 2229 | Shire growth (+13.6%) |
| 47 | Bankstown | 2200 | SW hub (+26.3% growth) |
| 48 | Penrith | 2750 | Western Sydney hub |
| 49 | Liverpool | 2170 | SW Sydney hub |
| 50 | Blacktown | 2148 | Western growth |

### Processing Schedule

| Week | Suburbs | Expected Agents |
|------|---------|-----------------|
| Week 1 | Tier 1 (1-20) | ~1,500 |
| Week 2 | Tier 2 (21-35) | ~900 |
| Week 3 | Tier 3 (36-50) | ~1,000 |

### Regional Clustering (for Internal Linking)

After Tier 1, group remaining suburbs by region:

**Eastern Core:** Paddington, Woollahra, Double Bay, Bondi Junction, Randwick
**Northern Beaches South:** Manly, Freshwater, Dee Why, Collaroy, Brookvale
**Lower North Shore:** Mosman, Neutral Bay, Cremorne, Lane Cove, Crows Nest
**Upper North Shore:** Pymble, Wahroonga, Hornsby, Epping
**Inner West:** Balmain, Newtown, Marrickville, Leichhardt, Rozelle
**Hills District:** Castle Hill, Kellyville
**Sutherland Shire:** Cronulla, Miranda, Caringbah

### National Expansion Path (Post-Sydney)

| Phase | City | Timeline | Rationale |
|-------|------|----------|-----------|
| 2 | Brisbane | Months 7-10 | #2 most expensive, Olympic growth |
| 3 | Melbourne | Months 11-15 | Highest volume, recovery market |
| 4 | Perth | Months 16-18 | Strong 2025-26 growth predicted |
| 5 | Adelaide | Months 19-21 | Affordable market expansion |
| 6 | Regional NSW | Months 22-24 | Byron, Central Coast, Hunter |

---

## Rate My Agent Competitive Analysis

### What They Show (Our Baseline)

| Field | RMA Has | ARI Can Match | ARI Advantage |
|-------|---------|---------------|---------------|
| Agent name/photo | ✅ | ✅ Domain API | Same |
| Agency affiliation | ✅ | ✅ Domain API | Same |
| Contact info | ✅ | ✅ Domain API | Same |
| Bio text | ✅ | ✅ Domain API | Same |
| Star rating | ✅ Reviews | ❌ No reviews | Disadvantage (V1) |
| Properties sold | ✅ | ✅ Calculate | Same |
| Average price | ✅ | ✅ Calculate | Same |
| Days on market | ✅ | ✅ Calculate | Same |
| Awards | ✅ Proprietary | ⚠️ REIA only | Different source |

### Where We Can EXCEED Rate My Agent

| Gap in RMA | Our Opportunity |
|------------|-----------------|
| Years of experience | ✅ Enrichment (LinkedIn) |
| Languages spoken | ✅ Enrichment |
| Property type specialization | ✅ Enrichment |
| Commission transparency | ⚠️ Future feature |
| Neutral positioning | ✅ Not pay-to-rank |
| Better filtering | ✅ UX opportunity |
| No review paywall | ✅ Transparency |

### Their URL Structure (Reference)

```
/real-estate-profile/sales/{suburb}-{state}-{postcode}/agents  → Suburb listing
/real-estate-agent/{name-id}/sales/reviews                     → Agent profile
/real-estate-agency/{name-id}/sales/overview                   → Agency page
```

---

## Content Expansion Planning

### URL Structure Reserved for Future

**V1 - Programmatic Only:**
```
/agent/[slug]                           # Agent profiles
/agency/[slug]                          # Agency pages
/agents-in/[state]                      # State listings
/agents-in/[suburb-state-postcode]      # Suburb listings
```

**V2+ - Editorial Content (Reserve URLs Now):**
```
/insights/                              # Editorial hub
/insights/guides/[topic]                # How-to guides
/insights/market/[location]             # Market analysis
/top-agents/[state]/[location]          # Curated rankings
/suburb-guides/[suburb]                 # Comprehensive suburb guides
```

### Preventing SEO Cannibalization

**Keyword Mapping (Define Before Building):**

| Primary Keyword | Assigned Page | Type |
|-----------------|---------------|------|
| real estate agents bondi | /agents-in/bondi-nsw-2026 | Programmatic |
| best real estate agents bondi | /top-agents/nsw/bondi | Hybrid (V2) |
| how to choose real estate agent | /insights/guides/choosing-agent | Editorial (V2) |

**Intent Differentiation:**
- **Suburb pages:** Navigational/Browse intent ("agents in bondi")
- **Top Agents pages:** Comparative/Decision intent ("best agents bondi")
- **Agent pages:** Brand/Specific intent ("john smith ray white")

### Content Calendar

**Phase 1 (Months 1-6):** Programmatic Excellence Only
- Zero editorial content
- Focus on agent/suburb/agency pages reaching critical mass
- Build internal linking structure
- Achieve indexation targets

**Phase 2 (Months 7-12):** Editorial Foundation
- 3-5 comprehensive pillar guides
- 10-20 suburb guides for top suburbs
- 5-10 market reports

**Phase 3 (Year 2):** Full Content Operation
- Top Agents pages for major suburbs (requires review data)
- Weekly market updates
- Quarterly industry reports

### Warning: Don't Launch "Top 10" Pages Too Early

Minimum requirements before launching curated ranking pages:
- 20+ agents per suburb with reviews or performance data
- Clear, defensible ranking methodology
- Editorial review process in place
- Risk of backlash if methodology questioned

---

## Pre-Launch Checklist

### Content Quality
- [ ] Each page has 300+ words of unique content
- [ ] Agent pages include: photo, name, agency, suburb, contact, bio
- [ ] Suburb pages include: agent count, top agents, FAQ section
- [ ] Performance metrics include derived insights (not just raw numbers)
- [ ] Data sources clearly attributed ("Data from Domain.com.au")
- [ ] Last updated dates displayed on every page

### Technical SEO
- [ ] Clean URL structure implemented (no trailing slashes)
- [ ] Canonical tags on all pages (self-referencing)
- [ ] Noindex applied to thin pages (using shouldIndexAgent logic)
- [ ] XML sitemaps generated and validated
- [ ] robots.txt configured (blocking /api/, /_next/, etc.)
- [ ] Mobile responsive (test on real devices)
- [ ] Core Web Vitals passing (LCP < 2.5s, CLS < 0.1)
- [ ] Structured data validated (Google Rich Results Test)

### E-E-A-T Trust Signals
- [ ] About page with company information
- [ ] Contact details visible (footer or contact page)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data methodology page created and linked
- [ ] HTTPS implemented (Vercel default)

### Site Architecture
- [ ] Clear hierarchy: Home → State → Suburb → Agent
- [ ] Breadcrumb navigation on all pages (with schema)
- [ ] No orphan pages (every page has incoming links)
- [ ] Footer with top suburb links
- [ ] Related agents section on agent pages
- [ ] Nearby suburbs section on suburb pages

### Rollout Preparation
- [ ] Google Search Console property created
- [ ] Bing Webmaster Tools property created
- [ ] Sitemaps submitted to GSC
- [ ] Analytics installed (GA4 or Plausible)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

## Implementation Roadmap

### Week 1-2: Foundation

- [ ] Set up Next.js project with static export
- [ ] Create SQLite database with full schema
- [ ] Implement Domain API client with auth
- [ ] Seed `scrape_progress` with Tier 1 suburbs
- [ ] Seed `agency_brands` with major franchises
- [ ] Build basic orchestrator (discovery phase only)

### Week 3-4: Data Pipeline

- [ ] Complete orchestrator with all phases
- [ ] Implement 6-state machine for work queue
- [ ] Add resume logic and checkpoint tracking
- [ ] Process Tier 1 suburbs (Top 20)
- [ ] Validate data quality in SQLite

### Week 5-6: Static Site

- [ ] Agent page template with `generateStaticParams`
- [ ] Suburb page template with agent listings
- [ ] Agency page template with agent roster
- [ ] State page template
- [ ] Schema markup components (Agent, Breadcrumb, FAQ, ItemList)
- [ ] Breadcrumb navigation component

### Week 7-8: Enrichment & Polish

- [ ] Enrichment sub-agent implementation
- [ ] Run enrichment on Tier 1 agents
- [ ] Noindex logic for thin pages
- [ ] Internal linking between pages
- [ ] Meta title/description generation
- [ ] Image optimization

### Week 9-10: SEO & Launch

- [ ] Sitemap generation (split by type)
- [ ] robots.txt configuration
- [ ] Google Search Console setup and submission
- [ ] Core Web Vitals optimization
- [ ] Pre-launch checklist completion
- [ ] Soft launch with 10-20 pilot pages

### Post-Launch (Ongoing)

- [ ] Monitor GSC for indexation issues
- [ ] Weekly rollout of new pages (50-100/week)
- [ ] Process Tier 2 and Tier 3 suburbs
- [ ] Gather feedback and iterate
- [ ] Plan V2 features (live data, reviews, etc.)

---

## Resolved Decisions

### Previously "Open Decisions" — Now Resolved

| Question | Resolution | Rationale |
|----------|------------|-----------|
| Enrichment source | Web search + agency sites only. **DO NOT scrape Rate My Agent** | Legal/ethical risk; REIA awards as alternative |
| Listing data | Skip for V1. Use agency endpoint data only | Saves ~50 API calls/suburb; add in V2 |
| Suburb priority list | **Defined** — See Sydney Suburb Priority List (50 suburbs in 3 tiers) | Data-backed priority scoring |
| Agency priority | Brand tier scoring (Ray White=10, McGrath=9, etc.) | Major brands = user trust |
| Processing order | Hybrid: Discover by suburb, process by agency | Prevents duplicate API calls |
| Build strategy | Pure SSG with `output: 'export'` | Simpler for V1; ISR in V2 |
| Live data | Skip entirely for V1 | Complexity reduction |
| Caching | Skip for V1 (no Vercel KV) | Not needed without live data |

### Still Open (V2 Considerations)

| Question | Options | Notes |
|----------|---------|-------|
| Domain name | TBD | Need to register |
| Paid API tier | Stay free vs upgrade | Re-evaluate when hitting 400+ daily unique views |
| Review collection | Build own vs integrate | V2+ feature |
| Brisbane priority list | Research needed | Start 3-4 months before expansion |

---

## Appendix

### Project Structure

```
ari/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Homepage
│   │   ├── about/page.tsx
│   │   └── methodology/page.tsx
│   ├── agent/
│   │   └── [slug]/
│   │       ├── page.tsx                # Agent profile
│   │       └── loading.tsx
│   ├── agency/
│   │   └── [slug]/
│   │       ├── page.tsx                # Agency page
│   │       └── loading.tsx
│   ├── agents-in/
│   │   ├── [state]/page.tsx            # State listing
│   │   └── [slug]/
│   │       ├── page.tsx                # Suburb listing
│   │       └── loading.tsx
│   ├── sitemap.ts
│   ├── sitemap-agents-[id].xml/route.ts
│   ├── robots.ts
│   └── layout.tsx
├── components/
│   ├── agent/
│   │   ├── AgentCard.tsx
│   │   ├── AgentHeader.tsx
│   │   └── AgentProfile.tsx
│   ├── agency/
│   │   └── AgencyCard.tsx
│   ├── suburb/
│   │   ├── SuburbHeader.tsx
│   │   ├── AgentGrid.tsx
│   │   └── NearbySuburbs.tsx
│   ├── seo/
│   │   ├── AgentSchema.tsx
│   │   ├── BreadcrumbSchema.tsx
│   │   ├── FAQSchema.tsx
│   │   └── ItemListSchema.tsx
│   └── ui/
│       ├── Breadcrumbs.tsx
│       └── Footer.tsx
├── lib/
│   ├── data/
│   │   ├── agents.ts
│   │   ├── agencies.ts
│   │   ├── suburbs.ts
│   │   └── database.ts
│   ├── domain-api/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── seo/
│   │   ├── metadata.ts
│   │   └── shouldIndex.ts
│   └── utils/
│       ├── slugify.ts
│       └── truncate.ts
├── scripts/
│   ├── orchestrator.ts
│   ├── enrichment.ts
│   └── seed-suburbs.ts
├── data/
│   └── ari.db                          # SQLite database
├── next.config.js
├── package.json
└── tsconfig.json
```

### Daily Operations Checklist

**Morning Check (After 10am AEST - API Reset):**
- [ ] Check orchestrator run status (logs or DB)
- [ ] Verify API calls remaining for day
- [ ] Review any failed entities in `api_errors`
- [ ] Check GSC for manual actions or issues

**Weekly Review:**
- [ ] Index coverage report (GSC)
- [ ] Position tracking for key suburb terms
- [ ] New pages indexed vs submitted
- [ ] Error rate trends

**Monthly Tasks:**
- [ ] Full content quality audit (sample 20 pages)
- [ ] Re-enrichment queue for stale profiles
- [ ] Competitor monitoring (RMA, OpenAgent)
- [ ] Priority list updates based on data

### Key Resources

- Domain API Docs: https://developer.domain.com.au/docs/latest/apis/
- Rate My Agent: https://www.ratemyagent.com.au
- Claude Agent SDK: https://platform.claude.com/docs/en/agent-sdk/
- Original PRD: `prd.md`

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial spec from exploration session |
| 2.0 | 2026-02-01 | Incorporated 8 research reports, resolved decisions, added work queue, rollout strategy, suburb priority list |

### Research Reports Reference

| Report | Key Contributions |
|--------|-------------------|
| 01 - Next.js SEO Patterns | SSG patterns, sitemaps, URL structure, metadata |
| 02 - Programmatic SEO Safety | Rollout cadence, thin content rules, E-E-A-T |
| 03 - Agency Grouping & Sequencing | Work queue, state machine, deduplication |
| 04 - Suburb SEO Strategy | Long-tail keywords, FAQ schema, internal linking |
| 05 - Enrichment Data Sources | Source priority, sub-agent prompts, RMA policy |
| 06 - Sydney Suburb Priority | 50-suburb list, regional grouping, expansion path |
| 07 - Content Expansion Planning | Future URL structure, cannibalization prevention |
| 08 - Live Data Strategy | Static/dynamic split (deferred to V2) |
