# Agency Grouping & Sequencing Strategy

## Work Queue Design for the ARI Data Pipeline

**Status:** Research Complete
**Date:** 2026-02-01
**Context:** Designing a resilient work queue for Domain.com.au API data extraction with 500 calls/day limit

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Work Queue Structure](#1-work-queue-structure)
3. [Sequencing Strategy](#2-sequencing-strategy)
4. [Handling Multi-Suburb Agencies](#3-handling-multi-suburb-agencies)
5. [Deduplication Strategy](#4-deduplication-strategy)
6. [Priority Queue Design](#5-priority-queue-design)
7. [Resume Logic](#6-resume-logic)
8. [Error Handling and Retries](#7-error-handling-and-retries)
9. [Recommended SQLite Schema](#8-recommended-sqlite-schema)
10. [Orchestrator Pseudocode](#9-orchestrator-pseudocode)
11. [Implementation Checklist](#10-implementation-checklist)

---

## Executive Summary

### The Core Challenge

With only **500 API calls per day** and approximately **100-115 calls per suburb**, you can process only **4-5 suburbs per night**. This means:

- Sydney alone (~650 suburbs) would take **~130 days** to fully index
- Australia (~15,000+ suburbs) would take **years** at this rate

**The solution:** A work queue system that is:
1. **Resumable** — Pick up exactly where you left off
2. **Idempotent** — Never duplicate work or data
3. **Priority-aware** — High-value suburbs and agencies first
4. **Deduplication-smart** — Handle multi-suburb agencies efficiently
5. **Failure-tolerant** — Graceful handling of errors and partial completion

### Key Recommendations Summary

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Processing order | **Agency-centric** (not suburb-centric) | Reduces duplicate work across suburbs |
| Primary key | **Domain API IDs** | Guaranteed unique, stable |
| State machine | **6-state model** | Handles all edge cases |
| Resume strategy | **Checkpoint-based** | Record progress at each API call |
| Priority model | **Weighted scoring** | Balances suburb value + agency size |
| Deduplication | **Process-once, link-many** | One agency record, multiple suburb links |

---

## 1. Work Queue Structure

### 1.1 The State Machine Model

Every work item (suburb, agency, agent) needs a clear state machine. Here's the recommended 6-state model:

```
┌─────────────────────────────────────────────────────────────────┐
│                        STATE MACHINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    start     ┌─────────────┐                     │
│   │ PENDING  │─────────────▶│ IN_PROGRESS │                     │
│   └──────────┘              └─────────────┘                     │
│        │                          │                              │
│        │                    ┌─────┴─────┐                        │
│        │                    │           │                        │
│        │              success│           │failure                │
│        │                    ▼           ▼                        │
│        │            ┌──────────┐  ┌──────────┐                   │
│        │            │ COMPLETE │  │  FAILED  │                   │
│        │            └──────────┘  └──────────┘                   │
│        │                              │                          │
│        │                              │ retry                    │
│        │                              ▼                          │
│        │                        ┌──────────┐                     │
│        └───────────────────────▶│ RETRY    │──────┐              │
│                                 └──────────┘      │              │
│                                      │            │              │
│                                      │ max_retries│              │
│                                      ▼            │              │
│                                ┌───────────┐     │              │
│                                │ ABANDONED │◀────┘              │
│                                └───────────┘                     │
│                                                                  │
│   Special state for skipped items:                               │
│                                ┌──────────┐                      │
│                                │ SKIPPED  │                      │
│                                └──────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 State Definitions

| State | Description | When to Use |
|-------|-------------|-------------|
| `pending` | Not yet started | Initial state for all items |
| `in_progress` | Currently being processed | Set when work begins |
| `complete` | Successfully finished | All API calls succeeded, data stored |
| `failed` | Current attempt failed | API error, timeout, etc. |
| `retry` | Queued for retry | After failure, before next attempt |
| `abandoned` | Permanently failed | Max retries exceeded |
| `skipped` | Intentionally skipped | Duplicate detected, or filtered out |

### 1.3 Partial Completion Handling

The key insight: **Don't track completion at the suburb level—track at the atomic work unit level.**

**Problem:** If you mark "Bondi" as `in_progress` and process 3 of 5 agencies before the daily limit, how do you resume?

**Solution:** Track progress at multiple granularities:

```
Suburb Progress Table:
┌─────────────────────────────────────────────────────────────┐
│ suburb_id │ status      │ agencies_discovered │ agencies_complete │
├───────────┼─────────────┼────────────────────┼──────────────────┤
│ bondi     │ in_progress │ 5                  │ 3                 │
└─────────────────────────────────────────────────────────────┘

Agency Progress Table:
┌─────────────────────────────────────────────────────────────┐
│ agency_id │ status   │ agents_discovered │ agents_complete │
├───────────┼──────────┼──────────────────┼────────────────┤
│ 12345     │ complete │ 12               │ 12             │
│ 12346     │ complete │ 8                │ 8              │
│ 12347     │ complete │ 15               │ 15             │
│ 12348     │ pending  │ 0                │ 0              │
│ 12349     │ pending  │ 0                │ 0              │
└─────────────────────────────────────────────────────────────┘
```

**Resume logic:** When the orchestrator starts, it finds the first incomplete work item and continues from there.

---

## 2. Sequencing Strategy

### 2.1 Deep vs. Wide Processing

There are two fundamental approaches:

#### Option A: Suburb-First (Deep)
```
For each suburb in priority order:
    Discover all agencies in suburb
    For each agency:
        Fetch agency details
        Fetch all agent profiles
        Mark agency complete
    Mark suburb complete
```

**Pros:**
- Simpler mental model
- Complete suburb pages are publishable immediately
- Good for geographic SEO (agents-in/bondi pages)

**Cons:**
- Duplicate work: Ray White Bondi appears when searching Bondi, Bondi Junction, Tamarama
- Same agency fetched multiple times
- Same agents processed multiple times

#### Option B: Agency-First (Wide)
```
Build master agency list from all suburb searches
Deduplicate agencies by domain_id
For each agency in priority order:
    Fetch agency details (once)
    Fetch all agent profiles (once)
    Link agency to all relevant suburbs
    Mark agency complete
```

**Pros:**
- No duplicate API calls for multi-suburb agencies
- Agent data is fetched exactly once
- More efficient use of API budget

**Cons:**
- More complex tracking logic
- Suburb pages are incomplete until all their agencies are done
- Requires two-phase approach (discovery then processing)

### 2.2 Recommended Approach: Hybrid (Discovery + Agency-Centric Processing)

The optimal strategy combines both approaches:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED HYBRID APPROACH                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: DISCOVERY (Suburb-centric)                            │
│  ────────────────────────────────────                           │
│  For each suburb in priority order:                             │
│      Call: GET /agencies?q=suburbId:{id}                        │
│      Store: agency_id, agency_name, suburb_id                   │
│      Mark: suburb as "discovered"                               │
│                                                                  │
│  PHASE 2: PROCESSING (Agency-centric)                           │
│  ─────────────────────────────────────                          │
│  Build deduplicated agency queue from discoveries               │
│  For each agency in priority order:                             │
│      If agency already processed: skip                          │
│      Call: GET /agencies/{id}                                   │
│      Store: agency details + agent list                         │
│      For each agent:                                            │
│          Call: GET /agents/{id}                                 │
│          Store: agent profile                                   │
│      Mark: agency as "complete"                                 │
│                                                                  │
│  PHASE 3: ENRICHMENT (Agent-centric, optional)                  │
│  ───────────────────────────────────────────────                │
│  For each agent needing enrichment:                             │
│      Spawn sub-agent for web research                           │
│      Store: enriched data                                       │
│      Mark: agent as "enriched"                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 API Call Optimization

With this hybrid approach, here's the revised call breakdown:

**Phase 1 (Discovery):**
- 1-5 calls per suburb (depending on agency count)
- For 20 priority suburbs: ~60 calls
- **Outcome:** Master list of ~200 agencies to process

**Phase 2 (Processing):**
- 1 call per unique agency
- ~5 calls per agency for agents (50 agents / 10 per page, approximate)
- For 200 agencies with avg 10 agents: 200 + 2000 = 2,200 calls
- **Timeline:** ~5 days for initial 20 suburbs

**Savings:** If Ray White appears in 5 suburbs, we call their agency endpoint once instead of 5 times. Same for all their agents.

---

## 3. Handling Multi-Suburb Agencies

### 3.1 The Problem

Ray White Bondi Beach might appear in searches for:
- Bondi (primary office location)
- Bondi Junction (adjacent suburb)
- Tamarama (coverage area)
- North Bondi (coverage area)

Without proper handling, you'd:
- Fetch the same agency details 4 times
- Fetch the same 15 agents 4 times (60 calls wasted)
- Store duplicate records

### 3.2 The Solution: Agency-Suburb Junction Table

```sql
-- Agencies table: ONE record per agency
agencies (
    domain_id PRIMARY KEY,  -- The Domain API agency ID
    name, details, etc.
)

-- Agency-Suburb junction: MANY records per agency
agency_suburbs (
    agency_domain_id,
    suburb_id,
    discovered_at,           -- When we found this link
    discovery_source,        -- Which suburb search found it
    is_primary_office,       -- Is this the agency's main office?
    PRIMARY KEY (agency_domain_id, suburb_id)
)
```

### 3.3 Discovery Deduplication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│             AGENCY DISCOVERY DEDUPLICATION FLOW                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Search agencies in suburb "Bondi":                             │
│     ├── Found: Ray White Bondi Beach (ID: 12345)                │
│     │   └── Check: Does agency 12345 exist? NO                  │
│     │       └── Action: Create agency record + suburb link      │
│     │                                                            │
│     ├── Found: LJ Hooker Bondi (ID: 12346)                      │
│     │   └── Check: Does agency 12346 exist? NO                  │
│     │       └── Action: Create agency record + suburb link      │
│     │                                                            │
│     └── Found: McGrath Eastern Suburbs (ID: 12347)              │
│         └── Check: Does agency 12347 exist? YES (from earlier)  │
│             └── Action: Just add suburb link (no duplicate)     │
│                                                                  │
│  Search agencies in suburb "Bondi Junction":                    │
│     ├── Found: Ray White Bondi Beach (ID: 12345)                │
│     │   └── Check: Does agency 12345 exist? YES                 │
│     │       └── Action: Just add suburb link (no duplicate)     │
│     │                                                            │
│     └── Found: Ray White Bondi Junction (ID: 12350)             │
│         └── Check: Does agency 12350 exist? NO                  │
│             └── Action: Create agency record + suburb link      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Processing Strategy

**Question:** When we encounter Ray White in suburb A, should we also fetch all their agents in suburb B?

**Answer:** No. We process agencies independently of suburbs. The agency's agents work across all suburbs the agency covers. We:

1. **Discover** the agency through suburb searches (multiple suburb links)
2. **Process** the agency once (one set of API calls)
3. **Link** agents to suburbs based on their listings/activity

```sql
-- Agent-Suburb activity (from listings or explicit coverage)
agent_suburbs (
    agent_domain_id,
    suburb_id,
    listing_count,           -- How many listings in this suburb
    is_primary_area,         -- Agent's main coverage area
    last_activity_date
)
```

---

## 4. Deduplication Strategy

### 4.1 Primary Key Strategy

**Rule:** Always use Domain API IDs as the primary identifier.

```sql
-- Domain IDs are stable, unique, and authoritative
agencies.domain_id INTEGER UNIQUE NOT NULL
agents.domain_id INTEGER UNIQUE NOT NULL
listings.domain_listing_id INTEGER UNIQUE NOT NULL
```

**Why not use names?**
- "John Smith" is not unique
- Agency names can change (rebranding)
- Slight variations ("Ray White" vs "Ray White Real Estate")

**Why not generate our own IDs?**
- Creates mapping complexity
- Risk of duplicates if same entity enters through different paths
- Domain IDs are already perfect for this purpose

### 4.2 Duplicate Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 DUPLICATE DETECTION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  When processing any entity from Domain API:                    │
│                                                                  │
│  1. Extract domain_id from API response                         │
│  2. Check local database for existing record:                   │
│                                                                  │
│     SELECT * FROM entities WHERE domain_id = ?                  │
│                                                                  │
│  3. If exists:                                                  │
│     ├── Compare updated_at timestamps                           │
│     ├── If API data is newer: UPDATE existing record            │
│     ├── If local data is newer: Keep local (enriched data)      │
│     └── Log: "Skipped duplicate: {domain_id}"                   │
│                                                                  │
│  4. If not exists:                                              │
│     └── INSERT new record                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Merge Strategy for Conflicting Data

When an agent appears through multiple paths (different agencies, different suburbs), you might get slightly different data. Here's the merge priority:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA MERGE PRIORITY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRIORITY 1: Direct agent endpoint (/v1/agents/{id})            │
│  ─────────────────────────────────────────────────              │
│  Most complete, authoritative source                            │
│  Contains: social links, full bio, contact details              │
│                                                                  │
│  PRIORITY 2: Agency endpoint agent array (/v1/agencies/{id})    │
│  ──────────────────────────────────────────────────────────     │
│  Basic info only, good for discovery                            │
│  Contains: name, email, mobile, photo, basic profile            │
│                                                                  │
│  PRIORITY 3: Enrichment data (web research)                     │
│  ──────────────────────────────────────────                     │
│  Supplementary, never overwrites API data                       │
│  Contains: years_experience, languages, awards                  │
│                                                                  │
│  MERGE RULE:                                                    │
│  For each field, use the highest-priority non-null value        │
│  Store source and timestamp for each field update               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Agent Mobility Handling

Agents can change agencies. Handle this gracefully:

```sql
-- Track agency changes
agent_agency_history (
    agent_domain_id,
    agency_domain_id,
    started_at,
    ended_at,            -- NULL if current
    PRIMARY KEY (agent_domain_id, agency_domain_id, started_at)
)

-- When processing an agent:
-- 1. If agency_id differs from stored value:
--    a. Close out previous agency relationship (set ended_at)
--    b. Create new agency relationship
--    c. Update agent.current_agency_id
```

---

## 5. Priority Queue Design

### 5.1 Priority Scoring Model

Not all suburbs and agencies are equal. Use a weighted scoring system:

```
┌─────────────────────────────────────────────────────────────────┐
│                 PRIORITY SCORING MODEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUBURB PRIORITY SCORE = (                                      │
│      search_volume_weight * estimated_monthly_searches +        │
│      property_value_weight * median_property_value +            │
│      competition_weight * (1 / existing_coverage) +             │
│      freshness_weight * days_since_last_update                  │
│  )                                                               │
│                                                                  │
│  Suggested weights:                                              │
│  ├── search_volume_weight: 0.4                                  │
│  ├── property_value_weight: 0.3                                 │
│  ├── competition_weight: 0.2                                    │
│  └── freshness_weight: 0.1                                      │
│                                                                  │
│  AGENCY PRIORITY SCORE = (                                      │
│      brand_weight * brand_tier +                                │
│      agent_count_weight * agent_count +                         │
│      listing_volume_weight * active_listings                    │
│  )                                                               │
│                                                                  │
│  Brand tiers:                                                    │
│  ├── Tier 1 (10): Ray White, LJ Hooker, McGrath, Belle, Barry   │
│  ├── Tier 2 (7): Richardson & Wrench, Raine & Horne, Century21  │
│  ├── Tier 3 (5): Regional chains, mid-size independents         │
│  └── Tier 4 (3): Small independents, boutique agencies          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Priority Tables Schema

```sql
-- Suburb priorities (pre-seeded from Semrush/research)
suburb_priorities (
    suburb_id TEXT PRIMARY KEY,
    suburb_name TEXT,
    state TEXT,
    postcode TEXT,
    priority_score REAL DEFAULT 0,
    search_volume INTEGER,
    median_property_value INTEGER,
    estimated_agent_count INTEGER,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
)

-- Agency brand priorities (pre-seeded)
agency_brands (
    brand_name TEXT PRIMARY KEY,      -- "Ray White", "LJ Hooker"
    brand_tier INTEGER DEFAULT 5,     -- 1-10, higher is more important
    notes TEXT
)
```

### 5.3 Dynamic Re-prioritization

As you process data, update priorities based on what you learn:

```sql
-- After discovering agencies in a suburb:
UPDATE suburb_priorities
SET estimated_agent_count = (
    SELECT COUNT(DISTINCT agent_domain_id)
    FROM agent_suburbs
    WHERE suburb_id = ?
),
updated_at = CURRENT_TIMESTAMP
WHERE suburb_id = ?;

-- Boost priority for suburbs with high-value agencies:
UPDATE suburb_priorities
SET priority_score = priority_score * 1.2
WHERE suburb_id IN (
    SELECT DISTINCT suburb_id
    FROM agency_suburbs
    WHERE agency_domain_id IN (
        SELECT domain_id FROM agencies
        WHERE brand_name IN ('Ray White', 'LJ Hooker', 'McGrath')
    )
);
```

### 5.4 Priority Overrides

Support manual overrides for user requests ("do Bondi next"):

```sql
-- Priority overrides table
priority_overrides (
    id INTEGER PRIMARY KEY,
    entity_type TEXT,           -- 'suburb', 'agency', 'agent'
    entity_id TEXT,
    override_priority INTEGER,  -- High number = process first
    reason TEXT,
    requested_by TEXT,
    requested_at DATETIME,
    expires_at DATETIME,        -- Optional expiry
    status TEXT DEFAULT 'active'
)

-- Query to get next work item with overrides:
SELECT s.* FROM suburb_priorities s
LEFT JOIN priority_overrides o
    ON o.entity_type = 'suburb'
    AND o.entity_id = s.suburb_id
    AND o.status = 'active'
WHERE s.status = 'pending'
ORDER BY
    COALESCE(o.override_priority, 0) DESC,
    s.priority_score DESC
LIMIT 1;
```

---

## 6. Resume Logic

### 6.1 Checkpoint Strategy

Record progress at every meaningful point:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKPOINT STRATEGY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHECKPOINT 1: After suburb discovery                           │
│  ─────────────────────────────────────                          │
│  Record: suburb_id, agencies_found, discovery_timestamp         │
│  Why: Can resume processing without re-calling discovery API    │
│                                                                  │
│  CHECKPOINT 2: After each agency processed                      │
│  ────────────────────────────────────────                       │
│  Record: agency_id, agents_found, processing_timestamp          │
│  Why: If we hit limit mid-suburb, we know which agencies done   │
│                                                                  │
│  CHECKPOINT 3: After each agent processed                       │
│  ──────────────────────────────────────                         │
│  Record: agent_id, data_fetched, processing_timestamp           │
│  Why: Resume mid-agency if needed                               │
│                                                                  │
│  CHECKPOINT 4: After enrichment                                 │
│  ─────────────────────────                                      │
│  Record: agent_id, enrichment_status, enrichment_timestamp      │
│  Why: Track which agents need web research                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Run Tracking

Track each orchestrator run:

```sql
-- Track each run of the orchestrator
orchestrator_runs (
    run_id TEXT PRIMARY KEY,           -- UUID
    started_at DATETIME,
    ended_at DATETIME,
    status TEXT,                        -- 'running', 'completed', 'interrupted', 'error'
    api_calls_made INTEGER DEFAULT 0,
    api_calls_remaining INTEGER,
    suburbs_processed INTEGER DEFAULT 0,
    agencies_processed INTEGER DEFAULT 0,
    agents_processed INTEGER DEFAULT 0,
    error_message TEXT,
    interrupted_at_entity TEXT,         -- 'suburb:bondi' or 'agency:12345'
    config_snapshot TEXT                -- JSON of run configuration
)
```

### 6.3 Resume Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                 ORCHESTRATOR STARTUP FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Check for interrupted runs:                                 │
│     SELECT * FROM orchestrator_runs                             │
│     WHERE status = 'running' OR status = 'interrupted'          │
│     ORDER BY started_at DESC LIMIT 1                            │
│                                                                  │
│  2. If found interrupted run:                                   │
│     ├── Log: "Resuming from interrupted run {run_id}"           │
│     ├── Parse interrupted_at_entity                             │
│     └── Continue from that point                                │
│                                                                  │
│  3. If no interrupted run, find next work:                      │
│                                                                  │
│     a. Check for pending priority overrides                     │
│     b. Check for in_progress suburbs (partially done)           │
│     c. Check for in_progress agencies                           │
│     d. Get highest-priority pending suburb                      │
│                                                                  │
│  4. Create new run record:                                      │
│     INSERT INTO orchestrator_runs (run_id, started_at, status)  │
│     VALUES (uuid(), NOW(), 'running')                           │
│                                                                  │
│  5. Begin processing                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Graceful Shutdown Handling

Handle SIGTERM/SIGINT for clean shutdown:

```typescript
// Pseudocode for graceful shutdown
let currentWorkItem = null;
let isShuttingDown = false;

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, initiating graceful shutdown...');
    isShuttingDown = true;

    // Wait for current API call to complete (max 30 seconds)
    await waitForCurrentWork(30000);

    // Record interrupted state
    await db.updateRun(currentRun.id, {
        status: 'interrupted',
        interrupted_at_entity: currentWorkItem,
        ended_at: new Date()
    });

    process.exit(0);
});

// In main processing loop:
async function processNext() {
    if (isShuttingDown) {
        return; // Don't start new work
    }

    currentWorkItem = await getNextWorkItem();
    // ... process ...
    currentWorkItem = null;
}
```

---

## 7. Error Handling and Retries

### 7.1 Error Classification

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR CLASSIFICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRANSIENT ERRORS (Retry immediately or with backoff):          │
│  ├── 429 Too Many Requests                                      │
│  ├── 500 Internal Server Error                                  │
│  ├── 502 Bad Gateway                                            │
│  ├── 503 Service Unavailable                                    │
│  ├── 504 Gateway Timeout                                        │
│  ├── Network timeout                                            │
│  └── Connection reset                                           │
│                                                                  │
│  PERMANENT ERRORS (Don't retry, mark as failed):                │
│  ├── 400 Bad Request (our bug)                                  │
│  ├── 401 Unauthorized (auth issue)                              │
│  ├── 403 Forbidden (access denied)                              │
│  ├── 404 Not Found (entity doesn't exist)                       │
│  └── 422 Unprocessable Entity                                   │
│                                                                  │
│  SPECIAL CASES:                                                 │
│  ├── Rate limit (X-Quota-PerDay-Remaining = 0): Stop run        │
│  ├── Auth token expired: Refresh and retry once                 │
│  └── Data validation error: Log and skip entity                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Retry Strategy with Exponential Backoff

```typescript
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,      // 1 second
    maxDelayMs: 60000,      // 1 minute
    backoffMultiplier: 2,
    jitterPercent: 0.2      // Add 0-20% random jitter
};

function calculateDelay(attempt: number): number {
    const baseDelay = RETRY_CONFIG.baseDelayMs *
        Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
    const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelayMs);
    const jitter = cappedDelay * RETRY_CONFIG.jitterPercent * Math.random();
    return cappedDelay + jitter;
}

// Retry delays: 1s, 2s, 4s (then fail)
// With jitter: 1-1.2s, 2-2.4s, 4-4.8s
```

### 7.3 Error Tracking Schema

```sql
-- Log all API errors for debugging and monitoring
api_errors (
    id INTEGER PRIMARY KEY,
    run_id TEXT,
    entity_type TEXT,           -- 'suburb', 'agency', 'agent'
    entity_id TEXT,
    endpoint TEXT,              -- The API endpoint that failed
    http_status INTEGER,
    error_code TEXT,
    error_message TEXT,
    request_payload TEXT,       -- For debugging (sanitized)
    response_body TEXT,
    attempt_number INTEGER,
    will_retry BOOLEAN,
    created_at DATETIME
)

-- Index for finding persistent failures
CREATE INDEX idx_api_errors_entity
ON api_errors(entity_type, entity_id, created_at);
```

### 7.4 Alerting Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTING THRESHOLDS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IMMEDIATE ALERT:                                               │
│  ├── Auth failure (401) — can't continue without fix            │
│  ├── Rate limit exhausted early — unexpected usage              │
│  └── Run crashed/error state — needs investigation              │
│                                                                  │
│  DAILY DIGEST:                                                  │
│  ├── Failed entities count (> 5% of processed)                  │
│  ├── Retry rate (> 10% of calls)                                │
│  ├── Abandoned entities (hit max retries)                       │
│  └── Data quality issues (missing required fields)              │
│                                                                  │
│  WEEKLY REVIEW:                                                 │
│  ├── Overall progress (suburbs/agencies/agents completed)       │
│  ├── API efficiency (calls per entity)                          │
│  ├── Error patterns by endpoint                                 │
│  └── Priority queue status                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Recommended SQLite Schema

### 8.1 Complete Schema

```sql
-- =============================================================================
-- ARI DATA PIPELINE - COMPLETE SQLITE SCHEMA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CONFIGURATION & TRACKING
-- ---------------------------------------------------------------------------

-- Orchestrator run tracking
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
    interrupted_at TEXT,            -- JSON: {"type": "agency", "id": "12345"}
    config_json TEXT,               -- Run configuration snapshot
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_status ON orchestrator_runs(status, started_at);

-- API error log
CREATE TABLE api_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT REFERENCES orchestrator_runs(run_id),
    entity_type TEXT NOT NULL,      -- 'suburb', 'agency', 'agent'
    entity_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    http_status INTEGER,
    error_code TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    will_retry BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_errors_entity ON api_errors(entity_type, entity_id);
CREATE INDEX idx_errors_run ON api_errors(run_id);

-- Priority overrides (user requests)
CREATE TABLE priority_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,      -- 'suburb', 'agency', 'agent'
    entity_id TEXT NOT NULL,
    override_priority INTEGER NOT NULL DEFAULT 1000,
    reason TEXT,
    requested_by TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status TEXT DEFAULT 'active',   -- 'active', 'completed', 'expired', 'cancelled'
    UNIQUE(entity_type, entity_id, status)
);

CREATE INDEX idx_overrides_active ON priority_overrides(status, entity_type);

-- ---------------------------------------------------------------------------
-- WORK QUEUE TABLES
-- ---------------------------------------------------------------------------

-- Suburb discovery and priority queue
CREATE TABLE suburbs (
    suburb_id TEXT PRIMARY KEY,     -- Unique identifier (e.g., "bondi-nsw-2026")
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,

    -- Priority scoring
    priority_score REAL DEFAULT 0,
    search_volume INTEGER,
    median_property_value INTEGER,
    estimated_agent_count INTEGER,

    -- Discovery status
    discovery_status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'discovered', 'failed'
    agencies_found INTEGER DEFAULT 0,
    discovered_at DATETIME,
    discovery_run_id TEXT,

    -- Processing status (all agencies in suburb done)
    processing_status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'partial'
    agencies_complete INTEGER DEFAULT 0,
    completed_at DATETIME,

    -- Metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suburbs_discovery ON suburbs(discovery_status, priority_score DESC);
CREATE INDEX idx_suburbs_processing ON suburbs(processing_status);

-- Agency work queue
CREATE TABLE agency_queue (
    domain_id INTEGER PRIMARY KEY,  -- Domain API agency ID
    name TEXT NOT NULL,
    brand_name TEXT,                -- Normalized brand (e.g., "Ray White")

    -- Priority
    priority_score REAL DEFAULT 0,
    brand_tier INTEGER DEFAULT 5,   -- 1-10, higher = more important
    estimated_agent_count INTEGER,

    -- Processing status
    status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'failed', 'retry', 'abandoned'
    agents_found INTEGER DEFAULT 0,
    agents_complete INTEGER DEFAULT 0,

    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at DATETIME,

    -- Timestamps
    discovered_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,

    -- Run tracking
    discovered_in_run TEXT,
    processed_in_run TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agency_queue_status ON agency_queue(status, priority_score DESC);
CREATE INDEX idx_agency_queue_brand ON agency_queue(brand_name);

-- Agency-Suburb junction (many-to-many)
CREATE TABLE agency_suburbs (
    agency_domain_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_primary_office BOOLEAN DEFAULT FALSE,
    discovery_source TEXT,          -- Which suburb search found this link
    PRIMARY KEY (agency_domain_id, suburb_id)
);

CREATE INDEX idx_agency_suburbs_suburb ON agency_suburbs(suburb_id);

-- Agent work queue
CREATE TABLE agent_queue (
    domain_id INTEGER PRIMARY KEY,  -- Domain API agent ID
    agency_domain_id INTEGER,
    first_name TEXT,
    last_name TEXT,

    -- Processing status
    status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'failed', 'retry', 'abandoned'

    -- Enrichment status (separate from API processing)
    enrichment_status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'skipped', 'failed'

    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    discovered_at DATETIME,
    fetched_at DATETIME,            -- When full profile was fetched
    enriched_at DATETIME,

    -- Run tracking
    processed_in_run TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_queue_status ON agent_queue(status);
CREATE INDEX idx_agent_queue_agency ON agent_queue(agency_domain_id);
CREATE INDEX idx_agent_queue_enrichment ON agent_queue(enrichment_status);

-- ---------------------------------------------------------------------------
-- CORE DATA TABLES
-- ---------------------------------------------------------------------------

-- Agencies (final, enriched data)
CREATE TABLE agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER UNIQUE NOT NULL,

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand_name TEXT,

    -- Contact
    phone TEXT,
    email TEXT,
    website TEXT,

    -- Location
    street_address TEXT,
    suburb TEXT,
    state TEXT,
    postcode TEXT,
    latitude REAL,
    longitude REAL,

    -- Profile
    logo_url TEXT,
    description TEXT,
    principal_name TEXT,

    -- Stats (calculated)
    agent_count INTEGER DEFAULT 0,
    active_listings INTEGER DEFAULT 0,

    -- Metadata
    domain_profile_url TEXT,
    data_source TEXT DEFAULT 'domain_api',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agencies_domain ON agencies(domain_id);
CREATE INDEX idx_agencies_slug ON agencies(slug);
CREATE INDEX idx_agencies_suburb ON agencies(suburb, state);

-- Agents (final, enriched data)
CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER UNIQUE NOT NULL,
    agency_id INTEGER REFERENCES agencies(id),

    -- Basic info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Contact
    email TEXT,
    phone TEXT,
    mobile TEXT,

    -- Profile
    photo_url TEXT,
    profile_text TEXT,
    job_position TEXT,

    -- Social
    facebook_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    video_url TEXT,

    -- Activity flags
    is_sale_active BOOLEAN DEFAULT TRUE,
    is_rental_active BOOLEAN DEFAULT FALSE,

    -- Enriched data (from sub-agents)
    enriched_bio TEXT,
    years_experience INTEGER,
    languages TEXT,                 -- JSON array
    specializations TEXT,           -- JSON array
    awards TEXT,                    -- JSON array

    -- Calculated stats
    properties_sold_12mo INTEGER DEFAULT 0,
    avg_sale_price_12mo REAL,
    median_days_on_market INTEGER,
    total_sales_value_12mo REAL,

    -- Metadata
    domain_profile_url TEXT,
    data_source TEXT DEFAULT 'domain_api',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enriched_at DATETIME
);

CREATE INDEX idx_agents_domain ON agents(domain_id);
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_agency ON agents(agency_id);

-- Agent-Suburb activity
CREATE TABLE agent_suburbs (
    agent_domain_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    listing_count INTEGER DEFAULT 0,
    is_primary_area BOOLEAN DEFAULT FALSE,
    last_activity_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_domain_id, suburb_id)
);

CREATE INDEX idx_agent_suburbs_suburb ON agent_suburbs(suburb_id);

-- Agent agency history (for tracking moves)
CREATE TABLE agent_agency_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_domain_id INTEGER NOT NULL,
    agency_domain_id INTEGER NOT NULL,
    started_at DATE,
    ended_at DATE,                  -- NULL if current
    is_current BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_history ON agent_agency_history(agent_domain_id, is_current);

-- Listings (optional, for stats calculation)
CREATE TABLE listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_listing_id INTEGER UNIQUE NOT NULL,
    agent_domain_id INTEGER,
    agency_domain_id INTEGER,

    -- Property details
    property_type TEXT,
    address TEXT,
    suburb TEXT,
    state TEXT,
    postcode TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    carspaces INTEGER,
    land_area_sqm REAL,

    -- Listing details
    listing_type TEXT,              -- 'sale', 'rent'
    status TEXT,                    -- 'live', 'sold', 'leased', 'archived'
    list_price REAL,
    sold_price REAL,
    listed_date DATE,
    sold_date DATE,
    days_on_market INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_agent ON listings(agent_domain_id);
CREATE INDEX idx_listings_agency ON listings(agency_domain_id);
CREATE INDEX idx_listings_suburb ON listings(suburb, state);
CREATE INDEX idx_listings_date ON listings(sold_date);

-- ---------------------------------------------------------------------------
-- REFERENCE DATA
-- ---------------------------------------------------------------------------

-- Agency brand tiers (pre-seeded)
CREATE TABLE agency_brands (
    brand_name TEXT PRIMARY KEY,
    brand_tier INTEGER DEFAULT 5,   -- 1-10
    is_franchise BOOLEAN DEFAULT TRUE,
    notes TEXT
);

-- Pre-seed major brands
INSERT INTO agency_brands (brand_name, brand_tier, is_franchise) VALUES
    ('Ray White', 10, TRUE),
    ('LJ Hooker', 10, TRUE),
    ('McGrath', 9, TRUE),
    ('Belle Property', 9, TRUE),
    ('Barry Plant', 9, TRUE),
    ('Harcourts', 8, TRUE),
    ('Century 21', 8, TRUE),
    ('Raine & Horne', 8, TRUE),
    ('Richardson & Wrench', 7, TRUE),
    ('PRD', 7, TRUE),
    ('First National', 7, TRUE),
    ('Elders', 6, TRUE),
    ('Laing+Simmons', 6, TRUE),
    ('Jellis Craig', 6, TRUE),
    ('Marshall White', 6, TRUE);
```

### 8.2 Common Query Examples

```sql
-- =============================================================================
-- COMMON QUERIES FOR ORCHESTRATOR
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FINDING NEXT WORK ITEM
-- ---------------------------------------------------------------------------

-- Get next suburb to discover (respecting priority overrides)
SELECT s.*
FROM suburbs s
LEFT JOIN priority_overrides o
    ON o.entity_type = 'suburb'
    AND o.entity_id = s.suburb_id
    AND o.status = 'active'
WHERE s.discovery_status = 'pending'
ORDER BY
    COALESCE(o.override_priority, 0) DESC,
    s.priority_score DESC
LIMIT 1;

-- Get next agency to process
SELECT aq.*
FROM agency_queue aq
LEFT JOIN priority_overrides o
    ON o.entity_type = 'agency'
    AND o.entity_id = CAST(aq.domain_id AS TEXT)
    AND o.status = 'active'
WHERE aq.status = 'pending'
    OR (aq.status = 'retry' AND aq.next_retry_at <= CURRENT_TIMESTAMP)
ORDER BY
    COALESCE(o.override_priority, 0) DESC,
    aq.priority_score DESC,
    aq.discovered_at ASC
LIMIT 1;

-- Get all pending agents for an agency
SELECT * FROM agent_queue
WHERE agency_domain_id = ?
    AND status = 'pending'
ORDER BY domain_id;

-- Get agents needing enrichment
SELECT * FROM agent_queue
WHERE status = 'complete'
    AND enrichment_status = 'pending'
ORDER BY domain_id
LIMIT 10;

-- ---------------------------------------------------------------------------
-- UPDATING STATUS
-- ---------------------------------------------------------------------------

-- Mark suburb as discovered
UPDATE suburbs SET
    discovery_status = 'discovered',
    agencies_found = ?,
    discovered_at = CURRENT_TIMESTAMP,
    discovery_run_id = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE suburb_id = ?;

-- Mark agency as in progress
UPDATE agency_queue SET
    status = 'in_progress',
    started_at = CURRENT_TIMESTAMP,
    processed_in_run = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE domain_id = ?;

-- Mark agency as complete
UPDATE agency_queue SET
    status = 'complete',
    agents_complete = agents_found,
    completed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE domain_id = ?;

-- Mark agency as failed (with retry logic)
UPDATE agency_queue SET
    status = CASE
        WHEN retry_count >= 3 THEN 'abandoned'
        ELSE 'retry'
    END,
    retry_count = retry_count + 1,
    last_error = ?,
    next_retry_at = DATETIME('now', '+' || POWER(2, retry_count) || ' minutes'),
    updated_at = CURRENT_TIMESTAMP
WHERE domain_id = ?;

-- ---------------------------------------------------------------------------
-- DEDUPLICATION CHECKS
-- ---------------------------------------------------------------------------

-- Check if agency already exists
SELECT domain_id, status, completed_at
FROM agency_queue
WHERE domain_id = ?;

-- Check if agent already exists
SELECT domain_id, status, fetched_at
FROM agent_queue
WHERE domain_id = ?;

-- ---------------------------------------------------------------------------
-- PROGRESS REPORTING
-- ---------------------------------------------------------------------------

-- Overall progress summary
SELECT
    (SELECT COUNT(*) FROM suburbs WHERE discovery_status = 'discovered') as suburbs_discovered,
    (SELECT COUNT(*) FROM suburbs WHERE processing_status = 'complete') as suburbs_complete,
    (SELECT COUNT(*) FROM agency_queue WHERE status = 'complete') as agencies_complete,
    (SELECT COUNT(*) FROM agency_queue WHERE status = 'pending') as agencies_pending,
    (SELECT COUNT(*) FROM agent_queue WHERE status = 'complete') as agents_complete,
    (SELECT COUNT(*) FROM agent_queue WHERE status = 'pending') as agents_pending,
    (SELECT COUNT(*) FROM agent_queue WHERE enrichment_status = 'complete') as agents_enriched;

-- Today's run progress
SELECT
    run_id,
    started_at,
    api_calls_made,
    api_calls_limit,
    agencies_processed,
    agents_processed,
    status
FROM orchestrator_runs
WHERE DATE(started_at) = DATE('now')
ORDER BY started_at DESC;

-- Error summary for current run
SELECT
    entity_type,
    http_status,
    COUNT(*) as error_count
FROM api_errors
WHERE run_id = ?
GROUP BY entity_type, http_status
ORDER BY error_count DESC;

-- ---------------------------------------------------------------------------
-- UPSERT OPERATIONS
-- ---------------------------------------------------------------------------

-- Upsert agency (from discovery)
INSERT INTO agency_queue (domain_id, name, brand_name, discovered_at, discovered_in_run)
VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
ON CONFLICT(domain_id) DO UPDATE SET
    name = COALESCE(excluded.name, agency_queue.name),
    brand_name = COALESCE(excluded.brand_name, agency_queue.brand_name),
    updated_at = CURRENT_TIMESTAMP;

-- Link agency to suburb (never fails on duplicate)
INSERT INTO agency_suburbs (agency_domain_id, suburb_id, discovery_source)
VALUES (?, ?, ?)
ON CONFLICT(agency_domain_id, suburb_id) DO NOTHING;

-- Upsert full agency data
INSERT INTO agencies (
    domain_id, name, slug, brand_name, phone, email, website,
    street_address, suburb, state, postcode, latitude, longitude,
    logo_url, description, principal_name
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(domain_id) DO UPDATE SET
    name = excluded.name,
    phone = COALESCE(excluded.phone, agencies.phone),
    email = COALESCE(excluded.email, agencies.email),
    website = COALESCE(excluded.website, agencies.website),
    logo_url = COALESCE(excluded.logo_url, agencies.logo_url),
    description = COALESCE(excluded.description, agencies.description),
    updated_at = CURRENT_TIMESTAMP;
```

---

## 9. Orchestrator Pseudocode

### 9.1 Main Orchestrator Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR MAIN LOOP                        │
├─────────────────────────────────────────────────────────────────┤

FUNCTION main():

    // 1. Initialize
    run = createNewRun()
    apiClient = initDomainAPIClient()
    remainingCalls = 500

    // 2. Check for interrupted runs
    interrupted = findInterruptedRun()
    IF interrupted:
        resumePoint = parseResumePoint(interrupted)
        LOG("Resuming from: " + resumePoint)

    // 3. Main processing loop
    WHILE remainingCalls > 0 AND NOT isShuttingDown:

        // Check remaining quota from API headers
        remainingCalls = apiClient.getRemainingQuota()
        IF remainingCalls < 10:
            LOG("Low quota, stopping for today")
            BREAK

        // Get next work item (prioritized)
        workItem = getNextWorkItem()
        IF NOT workItem:
            LOG("No more work items")
            BREAK

        TRY:
            SWITCH workItem.type:
                CASE 'suburb_discovery':
                    processSuburbDiscovery(workItem, run)

                CASE 'agency':
                    processAgency(workItem, run)

                CASE 'agent':
                    processAgent(workItem, run)

        CATCH error:
            handleError(workItem, error, run)

        // Update run stats
        updateRunProgress(run)

    // 4. Finalize
    completeRun(run)

└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Suburb Discovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 SUBURB DISCOVERY FLOW                            │
├─────────────────────────────────────────────────────────────────┤

FUNCTION processSuburbDiscovery(suburb, run):

    // 1. Mark as in progress
    updateSuburbStatus(suburb.id, 'in_progress')

    // 2. Call Domain API
    agencies = []
    page = 1
    WHILE TRUE:
        response = domainAPI.searchAgencies(suburb.id, page)
        agencies.extend(response.results)

        IF response.hasNextPage:
            page++
        ELSE:
            BREAK

    // 3. Process discovered agencies
    FOR agency IN agencies:

        // Check if we already know this agency
        existing = getAgencyByDomainId(agency.id)

        IF existing:
            // Just link to this suburb
            linkAgencyToSuburb(agency.id, suburb.id)
            LOG("Linked existing agency: " + agency.name)
        ELSE:
            // Create new agency in queue
            createAgencyQueueEntry(agency)
            linkAgencyToSuburb(agency.id, suburb.id)
            LOG("Discovered new agency: " + agency.name)

    // 4. Mark suburb as discovered
    updateSuburbStatus(suburb.id, 'discovered', agencies.length)

    RETURN agencies.length

└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Agency Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 AGENCY PROCESSING FLOW                           │
├─────────────────────────────────────────────────────────────────┤

FUNCTION processAgency(agency, run):

    // 1. Check if already processed
    IF agency.status == 'complete':
        LOG("Agency already complete, skipping")
        RETURN 'skipped'

    // 2. Mark as in progress
    updateAgencyStatus(agency.domain_id, 'in_progress')

    // 3. Fetch full agency details
    details = domainAPI.getAgency(agency.domain_id)

    // 4. Store/update agency data
    upsertAgency(details)

    // 5. Process agent list from agency response
    agentCount = 0
    FOR agentBasic IN details.agents:

        // Check if agent already exists
        existing = getAgentByDomainId(agentBasic.id)

        IF NOT existing:
            // Add to agent queue
            createAgentQueueEntry(agentBasic, agency.domain_id)
            agentCount++
        ELSE IF existing.agency_domain_id != agency.domain_id:
            // Agent changed agencies
            handleAgencyChange(existing, agency.domain_id)

    // 6. Update agency with agent count
    updateAgencyAgentCount(agency.domain_id, details.agents.length)

    // 7. Now process each pending agent
    pendingAgents = getPendingAgentsForAgency(agency.domain_id)

    FOR agent IN pendingAgents:
        // Check if we have API budget
        IF getRemainingQuota() < 5:
            LOG("Low quota, pausing agency processing")
            updateAgencyStatus(agency.domain_id, 'in_progress')
            RETURN 'paused'

        processAgent(agent, run)

    // 8. Mark agency complete
    updateAgencyStatus(agency.domain_id, 'complete')

    RETURN 'complete'

└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Agent Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 AGENT PROCESSING FLOW                            │
├─────────────────────────────────────────────────────────────────┤

FUNCTION processAgent(agent, run):

    // 1. Check if already processed
    IF agent.status == 'complete':
        LOG("Agent already complete, skipping")
        RETURN 'skipped'

    // 2. Mark as in progress
    updateAgentStatus(agent.domain_id, 'in_progress')

    // 3. Fetch full agent profile
    profile = domainAPI.getAgent(agent.domain_id)

    // 4. Store/update agent data
    upsertAgent(profile)

    // 5. Mark as complete (ready for enrichment)
    updateAgentStatus(agent.domain_id, 'complete')

    RETURN 'complete'


FUNCTION processAgentEnrichment(agent, run):
    // This runs separately, potentially with sub-agents

    // 1. Mark enrichment as in progress
    updateAgentEnrichmentStatus(agent.domain_id, 'in_progress')

    // 2. Spawn sub-agent for web research
    enrichedData = subAgent.research({
        name: agent.first_name + ' ' + agent.last_name,
        agency: agent.agency_name,
        location: agent.suburb,
        linkedin: agent.linkedin_url,
        website: agent.website_url
    })

    // 3. Store enriched data
    updateAgentEnrichment(agent.domain_id, enrichedData)

    // 4. Mark as enriched
    updateAgentEnrichmentStatus(agent.domain_id, 'complete')

    RETURN 'complete'

└─────────────────────────────────────────────────────────────────┘
```

### 9.5 Priority Work Item Selection

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIORITY WORK ITEM SELECTION                        │
├─────────────────────────────────────────────────────────────────┤

FUNCTION getNextWorkItem():

    // Priority 1: Check for active overrides
    override = db.query("""
        SELECT * FROM priority_overrides
        WHERE status = 'active'
        ORDER BY override_priority DESC
        LIMIT 1
    """)

    IF override:
        SWITCH override.entity_type:
            CASE 'suburb':
                suburb = getSuburbById(override.entity_id)
                IF suburb.discovery_status == 'pending':
                    RETURN {type: 'suburb_discovery', data: suburb}
            CASE 'agency':
                agency = getAgencyByDomainId(override.entity_id)
                IF agency.status == 'pending':
                    RETURN {type: 'agency', data: agency}

    // Priority 2: Resume in-progress agencies
    inProgressAgency = db.query("""
        SELECT * FROM agency_queue
        WHERE status = 'in_progress'
        ORDER BY started_at ASC
        LIMIT 1
    """)

    IF inProgressAgency:
        RETURN {type: 'agency', data: inProgressAgency}

    // Priority 3: Process pending agencies (before discovering more)
    pendingAgency = db.query("""
        SELECT aq.* FROM agency_queue aq
        WHERE aq.status = 'pending'
            OR (aq.status = 'retry' AND aq.next_retry_at <= CURRENT_TIMESTAMP)
        ORDER BY aq.priority_score DESC
        LIMIT 1
    """)

    IF pendingAgency:
        RETURN {type: 'agency', data: pendingAgency}

    // Priority 4: Discover more suburbs (if agency queue is empty)
    pendingSuburb = db.query("""
        SELECT s.* FROM suburbs s
        WHERE s.discovery_status = 'pending'
        ORDER BY s.priority_score DESC
        LIMIT 1
    """)

    IF pendingSuburb:
        RETURN {type: 'suburb_discovery', data: pendingSuburb}

    // No work available
    RETURN NULL

└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Checklist

### 10.1 Phase 1: Foundation (Day 1-2)

- [ ] Create SQLite database with complete schema
- [ ] Seed `suburbs` table with priority list (top 20 suburbs)
- [ ] Seed `agency_brands` table with major brands
- [ ] Create database access layer with upsert functions
- [ ] Implement slug generation utility

### 10.2 Phase 2: Orchestrator Core (Day 3-4)

- [ ] Implement run tracking (start, progress, complete)
- [ ] Implement graceful shutdown handling
- [ ] Implement priority work item selection
- [ ] Implement suburb discovery flow
- [ ] Implement agency processing flow
- [ ] Implement agent processing flow

### 10.3 Phase 3: Resilience (Day 5-6)

- [ ] Implement error classification
- [ ] Implement retry logic with exponential backoff
- [ ] Implement error logging
- [ ] Implement resume from interruption
- [ ] Add API quota tracking from headers

### 10.4 Phase 4: Deduplication (Day 7)

- [ ] Implement agency deduplication on discovery
- [ ] Implement agent deduplication
- [ ] Implement agency-suburb linking
- [ ] Implement agent-suburb activity tracking
- [ ] Implement agent agency change detection

### 10.5 Phase 5: Priority & Overrides (Day 8)

- [ ] Implement priority scoring calculation
- [ ] Implement dynamic re-prioritization
- [ ] Implement priority override system
- [ ] Create CLI for adding overrides

### 10.6 Phase 6: Monitoring (Day 9-10)

- [ ] Create progress dashboard queries
- [ ] Implement daily digest report
- [ ] Set up alerting for critical errors
- [ ] Create data quality checks

---

## Appendix A: API Budget Calculator

```
┌─────────────────────────────────────────────────────────────────┐
│                  API BUDGET CALCULATOR                           │
├─────────────────────────────────────────────────────────────────┤

Given:
  - Daily limit: 500 calls
  - Suburb discovery: ~3 calls average
  - Agency fetch: 1 call
  - Agent fetch: 1 call
  - Avg agents per agency: 10

Calculation for processing 1 suburb fully:
  - Discovery: 3 calls
  - Agencies (10 avg): 10 calls
  - Agents (10 agencies × 10 agents): 100 calls
  - Total: 113 calls

Daily capacity:
  - Full suburbs: 500 / 113 = 4.4 suburbs/day
  - Or: 50 agencies + all their agents

Hybrid approach (discovery first):
  - Day 1: Discover 100 suburbs (300 calls) + process 20 agencies (200 calls)
  - Day 2-10: Process remaining agencies/agents (500 calls each)

Time to index Sydney (~650 suburbs, ~6500 agencies):
  - Discovery phase: 7 days (100 suburbs/day)
  - Processing phase: 130 days (50 agencies/day)
  - Total: ~5 months for Sydney alone

Optimization opportunities:
  1. Skip individual agent calls initially (use agency response data)
  2. Prioritize high-value suburbs/agencies
  3. Consider paid tier if viable ($300/month for 10,000 calls)

└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Cron Job Setup

```bash
# /etc/cron.d/ari-orchestrator

# Run orchestrator at 2am AEST (15:00 UTC previous day)
# Domain API quota resets at 10am AEST (23:00 UTC previous day)
0 15 * * * www-data cd /var/www/ari && node orchestrator.js >> /var/log/ari/orchestrator.log 2>&1

# Run enrichment sub-agents at 4am AEST (17:00 UTC)
0 17 * * * www-data cd /var/www/ari && node enrichment-runner.js >> /var/log/ari/enrichment.log 2>&1

# Generate daily report at 6am AEST (19:00 UTC)
0 19 * * * www-data cd /var/www/ari && node daily-report.js | mail -s "ARI Daily Report" team@example.com
```

---

## Summary

This report provides a comprehensive framework for managing the ARI data pipeline under severe API constraints. The key innovations are:

1. **Hybrid discovery/processing approach** — Separates suburb discovery from agency processing to minimize duplicate work

2. **Agency-centric processing** — Processes each agency once regardless of how many suburbs it appears in

3. **Six-state machine** — Handles all edge cases including retries, partial completion, and abandonment

4. **Checkpoint-based resume** — Can resume from any point, including mid-agency processing

5. **Priority override system** — Supports user requests without breaking the automated queue

6. **Deduplication at every level** — Using Domain API IDs as the single source of truth

The estimated timeline for initial coverage of Sydney's top suburbs is 5-6 months at the free tier rate. Consider upgrading to a paid API tier if faster coverage is required for SEO validation.
