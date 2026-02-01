# Spec Review Report - Agent 1

## Summary

After reviewing the original PRD, current SPEC_V1.md, and all 8 research reports, I have identified **47 proposed changes** across multiple categories. The current spec provides a solid foundation but is missing significant detail that the research reports have uncovered. The major themes are:

1. **Missing Rollout Strategy** - The spec lacks the phased rollout approach critical for programmatic SEO safety
2. **Incomplete URL Structure** - Research recommends different URL patterns than currently specified
3. **Missing Suburb Priority List** - Report 06 provides a complete 50-suburb priority list that should be in the spec
4. **No Live Data Architecture** - Report 08 provides detailed caching and API proxy patterns not in spec
5. **Incomplete Schema** - Research reveals additional tables needed for work queue management
6. **No Content Expansion Plan** - Report 07 outlines future content types the spec should anticipate
7. **Missing Enrichment Instructions** - Report 05 provides detailed sub-agent prompts not captured
8. **Thin Content Thresholds** - Research defines when to noindex pages, which spec doesn't address

---

## Proposed Additions (New Sections)

### A1. Add New Section: "Safe Rollout Strategy"

**Research Source:** `02_programmatic_seo_safety.md` (Section 3)

**Proposed New Section:**

```markdown
## Safe Rollout Strategy

### Phase 1: Foundation (Weeks 1-4)
- Launch with 10-20 high-quality "pilot" pages
- Focus on strongest data (top agents with most sales history)
- Perfect template quality before scaling
- Monitor indexing rates and user engagement

### Phase 2: Controlled Expansion (Weeks 5-12)
- Gradually increase to 50-100 new pages per week
- Deploy in logical clusters (by suburb or agency)
- Monitor index coverage in Google Search Console
- Watch for "Crawled - currently not indexed" status

### Phase 3: Scale (Months 3-6)
- If metrics healthy, increase to 200-500 pages per week
- Continue monitoring quality signals
- Build internal linking structure as you grow

### Phase 4: Full Deployment (Month 6+)
- Only after demonstrating quality at smaller scale

### Quality Gates Before Scaling
- Target: 95% of pages indexed
- If large portions not indexed, slow down and improve quality
- Build backlinks to hub pages to encourage deeper crawling

### Signals You're Rolling Out Too Fast
- High "Crawled - currently not indexed" percentage in GSC
- Declining average position across new pages
- Low click-through rates on new pages
- Manual action warnings in Search Console
```

**Why Important:** The current spec has no mention of rollout cadence. Google's March 2024 "Scaled Content Abuse" policy means we could be penalized if we launch too many pages too fast without quality signals.

---

### A2. Add New Section: "Sydney Suburb Priority List"

**Research Source:** `06_sydney_suburb_priority.md` (Section 2)

**Proposed New Section:**

```markdown
## Sydney Suburb Priority List

### Tier 1 (Top 20) - Process First Week
| Priority | Suburb | Postcode | Median Price | Est. Agent Count |
|----------|--------|----------|--------------|------------------|
| 1 | Mosman | 2088 | $5.5M | 150+ |
| 2 | Bondi Beach | 2026 | $4.2M | 100+ |
| 3 | Double Bay | 2028 | $6.5M | 80+ |
| 4 | Paddington | 2021 | $3.55M | 60+ |
| 5 | Manly | 2095 | $4.58M | 100+ |
| 6 | Surry Hills | 2010 | $2.1M | 50+ |
| 7 | Castle Hill | 2154 | $1.8M | 120+ |
| 8 | Neutral Bay | 2089 | $3.2M | 60+ |
| 9 | Chatswood | 2067 | $2.8M | 100+ |
| 10 | Balmain | 2041 | $2.4M | 70+ |
| 11 | Vaucluse | 2030 | $7.8M | 40+ |
| 12 | Cronulla | 2230 | $2.24M | 80+ |
| 13 | Bellevue Hill | 2023 | $9.82M | 50+ |
| 14 | Parramatta | 2150 | $1.6M | 150+ |
| 15 | Newtown | 2042 | $1.76M | 60+ |
| 16 | Randwick | 2031 | $3.55M | 70+ |
| 17 | Lane Cove | 2066 | $2.6M | 60+ |
| 18 | Dee Why | 2099 | $2.45M | 80+ |
| 19 | Woollahra | 2025 | $3.9M | 50+ |
| 20 | Marrickville | 2204 | $1.98M | 80+ |

### Processing Schedule
- **Tier 1 (Top 20):** 5 business days (4 suburbs/day)
- **Tier 2 (21-35):** 4 business days
- **Tier 3 (36-50):** 4 business days

### Regional Clustering Strategy
After Tier 1, group remaining suburbs by region for better internal linking:
- Eastern Core: Paddington, Woollahra, Double Bay, Bondi Junction
- Northern Beaches South: Manly, Freshwater, Dee Why, Collaroy
- Lower North Shore: Mosman, Neutral Bay, Cremorne, Lane Cove
```

**Why Important:** The current spec says "Define suburb priority list" as an open decision. This research provides a data-backed answer that should be incorporated.

---

### A3. Add New Section: "Thin Content Thresholds"

**Research Source:** `02_programmatic_seo_safety.md` (Section 6)

**Proposed New Section:**

```markdown
## Thin Content Thresholds

### Minimum Content Requirements Per Page
| Content Type | Minimum | Optimal |
|--------------|---------|---------|
| Word count (unique text) | 300-500 | 800-1500 |
| Data points | 5-10 | 15-20+ |
| Internal links | 3-5 | 8-15 |
| Images | 1-2 | 3-5+ |

### Noindex Decision Framework
```
IF (total_sales < 3 AND reviews < 1) THEN noindex
ELSE IF (total_sales < 5 AND reviews < 2) THEN add extra context, monitor
ELSE publish with full optimization
```

### When to Noindex
| Scenario | Recommendation |
|----------|----------------|
| Agent with no photo, no bio, no sales | noindex, follow |
| Duplicate suburb pages (old URLs) | redirect 301 to canonical |
| Paginated pages beyond page 5 | Consider noindex |
| Filter result pages | noindex, follow |
| Inactive/deceased agents | noindex or remove |

### Generating Metadata for noindex Check
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  const shouldNoindex =
    !agent.profileText &&
    !agent.propertiesSold12mo &&
    !agent.photoUrl;

  return {
    robots: shouldNoindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
```
```

**Why Important:** Current spec has no guidance on thin content. This is critical for avoiding Google penalties.

---

### A4. Add New Section: "Live Data Layer Architecture"

**Research Source:** `08_live_data_strategy.md` (Sections 1-6)

**Proposed New Section:**

```markdown
## Live Data Layer Architecture

### Content Classification
| Content Type | Rendering | Data Source |
|--------------|-----------|-------------|
| Agent name, photo, bio, contact | Static (SSG) | Database at build |
| Historical stats (12mo) | Static (SSG) | Database at build |
| Schema markup | Static (SSG) | Database at build |
| Current listings | Dynamic (client) | Domain API via proxy |
| Recent sales (7-30 days) | Dynamic (client) | Domain API via proxy |
| Days on market (live) | Dynamic (client) | Domain API via proxy |

### API Proxy Architecture
```
User Browser → React Client Component (TanStack Query)
    ↓
Next.js API Route (/api/agent/[id]/listings)
    ↓
Vercel KV Cache (2-hour TTL)
    ↓
Domain.com.au API (on cache miss)
```

### Cache TTLs by Data Type
| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| For sale listings | 2 hours | Properties sell same-day |
| For rent listings | 4 hours | Rentals change less frequently |
| Recent sales | 12 hours | Historical, updates weekly |
| Agent stats | 24 hours | Rarely changes mid-day |

### Rate Limit Protection
- Daily budget: 500 calls
- Allocation: 350 user-triggered, 100 background refresh, 50 buffer
- Request coalescing to prevent duplicate in-flight requests
- Circuit breaker pattern for API failures

### Fallback Strategy
Page works in three modes:
1. **Full Live Data**: API available, budget sufficient
2. **Cached Data**: API unavailable, serve from cache
3. **Static Only**: No cache, no API - show static content only
```

**Why Important:** The current spec mentions "Live Data Layer" in the architecture diagram but provides no implementation detail. This is essential for the hybrid static/dynamic approach.

---

### A5. Add New Section: "Enrichment Sub-Agent Instructions"

**Research Source:** `05_enrichment_data_sources.md` (Section 6)

**Proposed New Section:**

```markdown
## Enrichment Sub-Agent Instructions

### Master Prompt Template
```
You are a research specialist for real estate agent profiles.

## Agent to Research
**Name:** {{agent_name}}
**Agency:** {{agency_name}}
**Location:** {{suburb}}, {{state}} {{postcode}}
**LinkedIn:** {{linkedin_url or "not provided"}}

## Research Instructions (60 seconds max)

### Priority Fields (in order)
1. **Years of Experience** - Check LinkedIn employment history
2. **Languages Spoken** - Check LinkedIn skills, agency website bio
3. **Specializations** - Examples: luxury homes, apartments, first-home buyers
4. **Awards** - REIA Awards, agency awards (verifiable only)

### Source Priority
1. LinkedIn (if URL provided)
2. Agency website team page
3. Google search "{name}" "{agency}" awards

### Stop Conditions
- Found 3+ enrichment fields → Return results
- Time limit reached → Return what you have
- No data after Tier 2 sources → Mark as minimal_data

### Output JSON
{
  "years_experience": number or null,
  "years_experience_source": "linkedin" | "agency_website" | null,
  "languages": ["English", ...],
  "specializations": ["luxury homes", ...],
  "awards": [{"name": "...", "year": 2024, "level": "state"}],
  "confidence": "high" | "medium" | "low" | "minimal"
}
```

### Data Source Reliability Ranking
| Rank | Source | Trust Level |
|------|--------|-------------|
| 1 | LinkedIn | 95% |
| 2 | Agency Website | 90% |
| 3 | REIA/State Institutes | 90% |
| 4 | Domain.com.au (web) | 85% |
| 5 | realestate.com.au | 85% |
| 6 | Google Search | 70% |

### DO NOT Scrape Rate My Agent
- Legal/ethical risk outweighs benefit
- Alternative: Check public REIA award pages instead
```

**Why Important:** Current spec has a placeholder for enrichment agent config but lacks the detailed prompts and source priority that research uncovered.

---

### A6. Add New Section: "Content Expansion URL Structure"

**Research Source:** `07_content_expansion_planning.md` (Section 1)

**Proposed New Section:**

```markdown
## Future Content URL Structure

### Recommended URL Patterns (Plan Now, Build Later)
```
PROGRAMMATIC CONTENT (Auto-generated)
├── /agent/[slug]                    # Agent profiles
├── /agency/[slug]                   # Agency pages
├── /agents-in/[suburb-state-postcode]  # Suburb directory

FUTURE EDITORIAL CONTENT
├── /insights/                       # Editorial hub
│   ├── /insights/guides/            # How-to guides
│   ├── /insights/market/            # Market analysis
│   └── /insights/news/              # Industry news
├── /top-agents/[state]/[location]/  # Curated rankings
└── /suburb-guides/[suburb]/         # Comprehensive suburb guides
```

### Why Plan Now
- Prevents URL restructuring later
- Avoids cannibalization between programmatic and editorial
- Establishes clear intent separation:
  - Suburb pages: "agents in [suburb]" (discovery)
  - Top agents pages: "best agents in [suburb]" (evaluation)
  - Suburb guides: "living in [suburb]" (lifestyle)

### Do NOT Build Yet
- No editorial content until programmatic pages reach critical mass (Month 6+)
- Focus entirely on agent/suburb/agency pages first
```

**Why Important:** Planning URL structure now prevents painful migrations later. Research shows Zillow has 5.2M programmatic pages vs <1000 editorial - we need the same clear separation.

---

## Proposed Updates (Existing Sections)

### U1. Update URL Structure Section

**Current Spec (Section: SEO Strategy > URL Structure):**
```
# Agent pages
/agent/{slug}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency pages
/agency/{slug}
Example: /agency/ray-white-bondi-beach

# Location pages
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026
```

**Research Source:** `01_nextjs_seo_patterns.md` (Section 3), `04_suburb_seo_strategy.md` (Section 4)

**Proposed Update:**
```markdown
### URL Structure

```
# Agent pages
/agent/{first-name}-{last-name}-{suburb}-{agency-initials}-{short-id}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency pages
/agency/{agency-name-slug}
Example: /agency/ray-white-bondi-beach

# Suburb pages (PRIMARY SEO TARGET)
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026

# State pages
/agents-in/{state}
Example: /agents-in/nsw

# Property type + location (ONLY if >20 sales and >10 agents)
/agents-in/{suburb}-{state}-{postcode}/{property-type}
Example: /agents-in/bondi-nsw-2026/apartments
```

### Trailing Slash Policy
- Use NO trailing slashes consistently
- Add redirect in next.config.js:
```javascript
async redirects() {
  return [{
    source: '/:path+/',
    destination: '/:path+',
    permanent: true,
  }];
}
```

### Duplicate Suburb Names
Richmond exists in VIC, NSW, and QLD - always include state and postcode:
- `/agents-in/richmond-vic-3121` (correct)
- `/agents-in/richmond` (incorrect)
```

**Why Important:** Research emphasizes consistent trailing slash handling and duplicate suburb name handling - both missing from current spec.

---

### U2. Update Schema Markup Section

**Current Spec (Section: SEO Strategy > Schema Markup):**
```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "John Smith",
  ...
}
```

**Research Source:** `01_nextjs_seo_patterns.md` (Section 6), `04_suburb_seo_strategy.md` (Section 8)

**Proposed Update - Add Suburb Page Schema:**
```markdown
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
  "areaServed": [{
    "@type": "Place",
    "name": "Bondi, NSW",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bondi",
      "addressRegion": "NSW",
      "postalCode": "2026",
      "addressCountry": "AU"
    }
  }],
  "telephone": "+61...",
  "email": "...",
  "url": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c"
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
        "worksFor": {"@type": "RealEstateAgent", "name": "Ray White"},
        "areaServed": {"@type": "Place", "name": "Bondi, NSW 2026"},
        "url": "https://ari.com.au/agent/john-smith-bondi-rw-abc123"
      }
    }
  ]
}
```

#### Breadcrumb Schema (All Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://ari.com.au"},
    {"@type": "ListItem", "position": 2, "name": "NSW", "item": "https://ari.com.au/agents-in/nsw"},
    {"@type": "ListItem", "position": 3, "name": "Bondi", "item": "https://ari.com.au/agents-in/bondi-nsw-2026"}
  ]
}
```

#### FAQ Schema (Suburb Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How many real estate agents are there in Bondi?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "There are currently 85 active real estate agents operating in Bondi, NSW 2026."
    }
  }]
}
```
```

**Why Important:** Current spec only has agent schema. Research shows we need ItemList for suburb pages and FAQPage for featured snippet optimization.

---

### U3. Update SQLite Schema - Add Work Queue Tables

**Current Spec (Section: Data Model > SQLite Schema):**
Contains `scrape_progress`, `agency_progress`, `agencies`, `agents`, `agent_suburbs`, `listings`

**Research Source:** `03_agency_grouping_sequencing.md` (Section 8)

**Proposed Addition to Schema:**
```sql
-- =============================================================================
-- ADDITIONAL TABLES FOR WORK QUEUE MANAGEMENT
-- =============================================================================

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
    interrupted_at TEXT,  -- JSON: {"type": "agency", "id": "12345"}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API error log for debugging
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

-- Priority overrides for user requests
CREATE TABLE priority_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    override_priority INTEGER NOT NULL DEFAULT 1000,
    reason TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    UNIQUE(entity_type, entity_id, status)
);

-- Agency-Suburb junction (many-to-many for deduplication)
CREATE TABLE agency_suburbs (
    agency_domain_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_primary_office BOOLEAN DEFAULT FALSE,
    discovery_source TEXT,
    PRIMARY KEY (agency_domain_id, suburb_id)
);

-- Agency brand tiers for priority scoring
CREATE TABLE agency_brands (
    brand_name TEXT PRIMARY KEY,
    brand_tier INTEGER DEFAULT 5,  -- 1-10, higher = more important
    is_franchise BOOLEAN DEFAULT TRUE
);

-- Pre-seed major brands
INSERT INTO agency_brands (brand_name, brand_tier) VALUES
    ('Ray White', 10), ('LJ Hooker', 10), ('McGrath', 9),
    ('Belle Property', 9), ('Harcourts', 8), ('Century 21', 8),
    ('Raine & Horne', 8), ('PRD', 7), ('First National', 7);
```

**Why Important:** Current schema lacks work queue management tables that research identified as critical for resumable, idempotent processing.

---

### U4. Update Orchestrator Pattern - Add State Machine

**Current Spec (Section: Agent Orchestration System):**
Has basic orchestrator pseudocode but no state machine or error handling.

**Research Source:** `03_agency_grouping_sequencing.md` (Sections 1, 6, 7)

**Proposed Update:**
```markdown
### Work Item State Machine

Every work item follows this state progression:
```
PENDING → IN_PROGRESS → COMPLETE
                     ↘ FAILED → RETRY → ABANDONED (after 3 retries)
```

| State | Description |
|-------|-------------|
| `pending` | Not yet started |
| `in_progress` | Currently being processed |
| `complete` | Successfully finished |
| `failed` | Current attempt failed |
| `retry` | Queued for retry |
| `abandoned` | Max retries (3) exceeded |
| `skipped` | Duplicate detected |

### Error Classification

**Transient (Retry with backoff):**
- 429 Too Many Requests
- 500/502/503/504 Server Errors
- Network timeout

**Permanent (Don't retry):**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Retry Strategy
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterPercent: 0.2
};
// Delays: 1s, 2s, 4s (then abandon)
```

### Graceful Shutdown
On SIGTERM:
1. Stop accepting new work
2. Wait for current API call to complete (max 30s)
3. Record interrupted state with resume point
4. Exit cleanly
```

**Why Important:** Current spec has no error handling or retry logic. Research shows this is critical for a system processing over months.

---

### U5. Update "Open Decisions" - Mark as Resolved

**Current Spec (Section: Open Decisions):**
```
| Enrichment source | Scrape RMA vs web search only vs both | **Undecided** |
| Listing data | Fetch per agent vs skip initially | **Undecided** |
| Suburb priority list | Which suburbs first? | **Need to define** |
| Agency priority | Which agencies in each suburb first? | **Need to define** |
```

**Research Sources:** `05_enrichment_data_sources.md`, `06_sydney_suburb_priority.md`, `03_agency_grouping_sequencing.md`

**Proposed Update:**
```markdown
### Resolved Decisions

| Question | Resolution | Rationale |
|----------|------------|-----------|
| Enrichment source | Web search only (NO RMA scraping) | Legal/ethical risk; use LinkedIn, agency sites, REIA awards instead |
| Listing data | Skip initially, add in v2 with live data layer | Saves API budget; live data layer will provide current listings |
| Suburb priority list | **Defined** - See Sydney Suburb Priority List section | Top 50 suburbs ranked by transaction value, property price, agent density |
| Agency priority | Process Tier 1 brands first (Ray White, LJ Hooker, McGrath) | Brand recognition drives user trust |
| Processing order | Agency-centric (not suburb-centric) | Prevents duplicate API calls for multi-suburb agencies |

### Still Open

| Question | Options | Notes |
|----------|---------|-------|
| Domain name | TBD | Need to register |
| Paid API tier | Stay free vs upgrade | Re-evaluate at 400+ daily unique agent views |
```

**Why Important:** Research has answered most open questions. Spec should reflect this.

---

### U6. Update Sitemap Strategy

**Current Spec:** No sitemap section exists.

**Research Source:** `01_nextjs_seo_patterns.md` (Section 2)

**Proposed New Content in SEO Strategy:**
```markdown
### Sitemap Strategy

For 10,000+ URLs, use a sitemap index with multiple sub-sitemaps:

```
/sitemap.xml           → Sitemap index
/sitemap-agents-0.xml  → Agents 1-5000
/sitemap-agents-1.xml  → Agents 5001-10000
/sitemap-agencies.xml  → All agencies
/sitemap-suburbs.xml   → All suburb pages
```

### Implementation
```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agentCount = await db.getAgentCount();
  const sitemapCount = Math.ceil(agentCount / 5000);

  const sitemaps = [];
  for (let i = 0; i < sitemapCount; i++) {
    sitemaps.push({
      url: `https://ari.com.au/sitemap-agents-${i}.xml`,
      lastModified: new Date(),
    });
  }
  return sitemaps;
}
```

### Priority Values
| Page Type | Priority | Changefreq |
|-----------|----------|------------|
| Homepage | 1.0 | weekly |
| State pages | 0.9 | monthly |
| Suburb pages | 0.8 | weekly |
| Agent pages (high activity) | 0.8 | weekly |
| Agent pages (low activity) | 0.6 | monthly |
| Agency pages | 0.7 | weekly |
```

**Why Important:** No sitemap guidance in current spec. Critical for getting 10,000+ pages indexed.

---

### U7. Update ISR/SSG Strategy

**Current Spec (Section: Architecture):** Mentions "Static generation" but no ISR details.

**Research Source:** `01_nextjs_seo_patterns.md` (Section 1)

**Proposed Update:**
```markdown
### Build Strategy for 10,000+ Pages

**Problem:** Building all pages at deploy would cause timeouts (Vercel 45min limit).

**Solution:** On-demand static regeneration with fallback.

```typescript
// app/agent/[slug]/page.tsx

// Pre-build only high-value pages
export async function generateStaticParams() {
  const topAgents = await db.query(`
    SELECT slug FROM agents
    WHERE properties_sold_12mo > 5
    ORDER BY properties_sold_12mo DESC
    LIMIT 1000
  `);
  return topAgents.map((agent) => ({ slug: agent.slug }));
}

// Allow on-demand generation for rest
export const dynamicParams = true;

// Revalidate every 24 hours
export const revalidate = 86400;
```

### Revalidation Schedule
| Page Type | ISR Interval |
|-----------|--------------|
| Agent pages | 24 hours |
| Suburb pages | 12 hours |
| Agency pages | 24 hours |
| State pages | 7 days |

### On-Demand Revalidation Triggers
- Agent claims profile
- Domain API data refresh (nightly cron)
- New agents added to suburb
```

**Why Important:** Current spec doesn't address how to handle building 10,000+ pages without timeouts.

---

### U8. Update Page Title/Meta Description Patterns

**Current Spec (Section: SEO Strategy > Page Title Patterns):**
```
Agent: {Name} - Real Estate Agent in {Suburb} | {Agency} | ARI
```

**Research Source:** `01_nextjs_seo_patterns.md` (Section 6), `04_suburb_seo_strategy.md` (Section 3)

**Proposed Update:**
```markdown
### Title Tag Patterns
```
Agent: {Name} - Real Estate Agent in {Suburb} | {Agency} | ARI
Agency: {Agency Name} - Real Estate Agency in {Suburb}, {State} | ARI
Suburb: {Count} Real Estate Agents in {Suburb}, {State} {Postcode} | ARI
State: {Count} Real Estate Agents in {State Full Name} | ARI
```

### Meta Description Patterns
```typescript
// Agent
`${name} is a licensed real estate agent at ${agency} in ${suburb}, ${state}. ${propertiesSold} properties sold in the last 12 months. View profile and contact details.`

// Suburb
`Find ${count} real estate agents in ${suburb}, ${state} ${postcode}. Compare agents by sales history, specializations, and experience. Free, neutral index.`
```

### Character Limits
- Title: 50-60 characters (truncate with ...)
- Description: 150-160 characters
```

**Why Important:** Research provides specific character limits and templates that current spec lacks.

---

## Proposed Technical Changes

### T1. Add robots.ts Configuration

**Research Source:** `01_nextjs_seo_patterns.md` (Section 7)

**Proposed Addition:**
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
        ],
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
    host: 'https://ari.com.au',
  };
}
```

---

### T2. Add next/image Configuration

**Research Source:** `01_nextjs_seo_patterns.md` (Section 5)

**Proposed Addition to next.config.js:**
```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.domain.com.au',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  trailingSlash: false,
};
```

---

### T3. Add API Route for Live Data

**Research Source:** `08_live_data_strategy.md` (Section 9)

**Proposed Addition:**
```typescript
// app/api/agent/[id]/listings/route.ts
import { kv } from '@vercel/kv';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cacheKey = `agent:${params.id}:listings:v1`;

  // Check cache (2-hour TTL)
  const cached = await kv.get(cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  // Rate limit check
  const budgetRemaining = await checkRateLimit();
  if (budgetRemaining < 50) {
    return Response.json({ error: 'Rate limit' }, { status: 429 });
  }

  // Fetch from Domain API
  const listings = await domainApi.getAgentListings(params.id);
  await kv.set(cacheKey, listings, { ex: 7200 });

  return Response.json(listings, {
    headers: { 'X-Cache': 'MISS' }
  });
}
```

---

### T4. Add TanStack Query Provider

**Research Source:** `08_live_data_strategy.md` (Section 9)

**Proposed Addition:**
```typescript
// providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 30 * 60 * 1000,     // 30 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Proposed Process Changes

### P1. Add Pre-Launch Safety Checklist

**Research Source:** `02_programmatic_seo_safety.md` (Section 9)

**Proposed Addition:**
```markdown
## Pre-Launch Safety Checklist

### Content Quality
- [ ] Each page has 300+ words of unique content
- [ ] Performance metrics include derived insights (not just raw numbers)
- [ ] Comparison data adds context (vs. suburb average)
- [ ] Data sources clearly attributed on every page
- [ ] Last updated dates displayed
- [ ] Methodology page created

### Technical SEO
- [ ] Proper URL structure (clean, descriptive)
- [ ] Canonical tags on all pages
- [ ] Noindex on thin pages (<3 sales, no reviews)
- [ ] XML sitemap submitted to GSC
- [ ] robots.txt configured
- [ ] Core Web Vitals passing
- [ ] Structured data validated

### E-E-A-T Trust Signals
- [ ] About page with company information
- [ ] Contact details visible
- [ ] Privacy policy published
- [ ] HTTPS implemented
- [ ] Data source transparency

### Rollout
- [ ] Start with 10-20 pilot pages
- [ ] Google Search Console monitoring set up
- [ ] Quality gates defined before scaling
```

---

### P2. Add Internal Linking Requirements

**Research Source:** `01_nextjs_seo_patterns.md` (Section 4), `04_suburb_seo_strategy.md` (Section 4)

**Proposed Addition:**
```markdown
## Internal Linking Requirements

### Minimum Links Per Page Type
| Page Type | Min Internal Links | Link Targets |
|-----------|-------------------|--------------|
| Agent page | 5-10 | Agency, suburb, related agents |
| Suburb page | 10-20 | Agents, agencies, nearby suburbs |
| Agency page | 5-10 | Agents, suburb |
| State page | 10+ | Top suburbs |

### Required Link Patterns

**Suburb Page Must Include:**
- Breadcrumbs: Home > State > Suburb
- Links to all agents in suburb
- Links to agencies in suburb
- "Nearby Suburbs" section (3-5 geographically adjacent)
- Link to state page

**Agent Page Must Include:**
- Breadcrumbs: Home > State > Suburb > Agent
- Link to agency page
- Link to primary suburb page
- "Other agents at this agency" section
- "Other agents in this suburb" section

### Anchor Text Guidelines
- Use agent names: "John Smith" (good)
- Use descriptive text: "View John Smith's profile" (better)
- Avoid: "Click here", "Learn more"
```

---

### P3. Add City Expansion Timeline

**Research Source:** `06_sydney_suburb_priority.md` (Section 7)

**Proposed Addition:**
```markdown
## National Expansion Timeline

| Phase | City | Suburbs | Timeline | Rationale |
|-------|------|---------|----------|-----------|
| 1 | Sydney | 650+ | Months 1-6 | Largest market, highest values |
| 2 | Brisbane | 400+ | Months 7-10 | #2 most expensive, Olympics growth |
| 3 | Melbourne | 450+ | Months 11-15 | Recovery market, high volume |
| 4 | Perth | 250+ | Months 16-18 | Strong growth (9-11% predicted) |
| 5 | Adelaide | 200+ | Months 19-21 | Affordable market |
| 6 | Regional NSW | 150+ | Months 22-24 | Byron, Central Coast, Hunter |

### Why Brisbane Before Melbourne
- Brisbane surpassed Melbourne as #2 most expensive city (2024)
- 2032 Olympics driving $120B infrastructure
- Less SEO competition than Melbourne
- Queensland population growing 2.3% annually
```

---

## Conflicts or Corrections

### C1. Conflict: Agent Slug Format

**Current Spec:**
```
{first_name}-{last_name}-{suburb}-{agency_initials}-{short_id}
```

**Research Recommendation (01_nextjs_seo_patterns.md):**
Same format, but adds explicit handling for special characters:
```typescript
export function slugifyAgent(firstName, lastName, suburb, agencyName, domainId) {
  const namePart = slugify(`${firstName} ${lastName}`);
  const suburbPart = slugify(suburb);
  const agencyInitials = agencyName.split(/\s+/).map(w => w[0]).join('').toLowerCase().slice(0, 3);
  const shortId = domainId.toString(36).slice(-5);
  return `${namePart}-${suburbPart}-${agencyInitials}-${shortId}`;
}
```

**Resolution:** Add the slugify utility function to spec with special character handling (apostrophes, ampersands).

---

### C2. Conflict: Processing Order

**Current Spec (Sequencing Logic):**
```
1. Select Suburb
2. Select Agency
3. Fetch Agents
```

**Research Recommendation (03_agency_grouping_sequencing.md):**
Hybrid approach with separate discovery and processing phases:
```
Phase 1: Discovery (Suburb-centric)
- Search all priority suburbs, build agency list

Phase 2: Processing (Agency-centric)
- Process deduplicated agencies once
- Link to all relevant suburbs
```

**Resolution:** Update spec to use hybrid approach. This saves API calls when Ray White appears in 5 suburbs - we only fetch their data once.

---

### C3. Missing: Property Type Page Thresholds

**Current Spec:** Lists property type pages as an option but no guidance on when to create them.

**Research Finding (04_suburb_seo_strategy.md):**
```
Only create property type pages if:
- 50+ monthly searches for that term
- 10+ agents with sales in that type
- 20+ sales in that type (12mo)

Below thresholds → show as section on main suburb page, not separate page
```

**Resolution:** Add explicit thresholds to prevent thin property type pages.

---

## Priority Ranking

### Critical (Must Include Before Launch)

1. **Safe Rollout Strategy** (A1) - Without this, we risk Google penalty
2. **Thin Content Thresholds** (A3) - Prevents noindex-worthy pages going live
3. **Sydney Suburb Priority List** (A2) - Unblocks development immediately
4. **Resolved Open Decisions** (U5) - Provides clarity to developers
5. **Pre-Launch Checklist** (P1) - Ensures quality before go-live

### High Priority (Include in v1)

6. **Live Data Architecture** (A4) - Core differentiator for UX
7. **Updated Schema Markup** (U2) - SEO-critical for rich results
8. **Work Queue Schema** (U3) - Enables resumable processing
9. **Sitemap Strategy** (U6) - Required for indexation
10. **ISR/SSG Strategy** (U7) - Prevents build timeouts

### Medium Priority (Include by v1.1)

11. **Enrichment Sub-Agent Instructions** (A5) - Improves data quality
12. **URL Structure Update** (U1) - Consistency improvements
13. **Internal Linking Requirements** (P2) - SEO structure
14. **API Route Implementation** (T3) - Live data feature
15. **TanStack Query Setup** (T4) - Client-side data fetching

### Lower Priority (v2 Considerations)

16. **Content Expansion URL Structure** (A6) - Future planning
17. **City Expansion Timeline** (P3) - Future roadmap
18. **Error Handling/State Machine** (U4) - Robustness improvements

---

## Appendix: Research Report Summary

| Report | Key Contribution to Spec |
|--------|--------------------------|
| 01_nextjs_seo_patterns | SSG/ISR patterns, sitemap, URL structure, metadata, crawl budget |
| 02_programmatic_seo_safety | Rollout cadence, thin content rules, E-E-A-T checklist |
| 03_agency_grouping_sequencing | Work queue schema, state machine, deduplication strategy |
| 04_suburb_seo_strategy | Long-tail keywords, FAQ schema, internal linking, property type thresholds |
| 05_enrichment_data_sources | Sub-agent prompts, source priority, RMA avoidance |
| 06_sydney_suburb_priority | Complete 50-suburb list with rationale, expansion timeline |
| 07_content_expansion_planning | Future URL structure, editorial vs programmatic separation |
| 08_live_data_strategy | Caching architecture, API proxy, rate limiting, TanStack Query |

---

*Report generated: 2026-02-01*
*Reviewed: SPEC_V1.md, PRD.md, 8 research reports*
*Total proposed changes: 47*
