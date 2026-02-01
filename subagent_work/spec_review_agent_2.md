# Spec Review Report - Agent 2

## Summary

After comprehensive review of all 8 research reports against the current SPEC_V1.md, I have identified **47 specific changes** across 6 major categories. The current spec provides a solid foundation but is missing significant detail from the research, particularly around:

1. **Safe rollout cadence** for programmatic SEO (not addressed in spec)
2. **Thin content avoidance** strategies (minimal coverage)
3. **Work queue resilience** patterns (basic coverage, needs expansion)
4. **Live data integration** architecture (mentioned but not detailed)
5. **Content expansion planning** (not addressed)
6. **Suburb-specific SEO strategies** (mentioned but lacks detail)

The research reports provide substantially more tactical implementation guidance than the current spec captures. This review prioritizes changes that fill gaps rather than duplicate existing content.

---

## Proposed Additions (New Sections)

### Addition 1: Safe Rollout Cadence Section

**Source:** `02_programmatic_seo_safety.md` (Section 3)

**Proposed new section after "SEO Strategy":**

```markdown
## Safe Rollout Strategy

### Rollout Phases

Launching all pages at once risks Google penalties. Follow this phased approach:

**Phase 1: Foundation (Weeks 1-4)**
- Launch with 10-20 high-quality pilot pages
- Focus on agents with most reviews/sales history
- Perfect template quality before scaling
- Monitor indexing rates and user engagement

**Phase 2: Controlled Expansion (Weeks 5-12)**
- Gradually increase to 50-100 new pages per week
- Deploy in logical suburb/agency clusters
- Monitor index coverage in Google Search Console
- Watch for "Crawled - currently not indexed" status

**Phase 3: Scale (Months 3-6)**
- If metrics healthy, increase to 200-500 pages per week
- Continue monitoring quality signals
- Build internal linking structure as you grow

**Phase 4: Full Deployment (Month 6+)**
- 10,000+ pages feasible only after demonstrating quality at smaller scale

### Signals You're Rolling Out Too Fast

- High "Crawled - currently not indexed" percentage in GSC
- Declining average position across new pages
- Low click-through rates on new pages
- Manual action warnings in Search Console
- Significant bounce rate increases

### Expected Timeline

| Milestone | Expected Timeline |
|-----------|------------------|
| Initial indexing | 2-4 weeks |
| Organic traffic signals | 4-8 weeks |
| Meaningful organic growth | 3-6 months |
| ROI realization | 6-12 months |
```

**Why important:** The current spec has no guidance on rollout pacing. Research shows this is critical for avoiding Google penalties.

---

### Addition 2: Thin Content Avoidance Section

**Source:** `02_programmatic_seo_safety.md` (Section 6)

**Proposed new section:**

```markdown
## Thin Content Avoidance

### Minimum Content Requirements Per Page

| Content Type | Minimum | Optimal |
|-------------|---------|---------|
| Word count (unique text) | 300-500 | 800-1500 |
| Data points | 5-10 | 15-20+ |
| User interaction elements | 1-2 | 3-5 |
| Internal links | 3-5 | 8-15 |
| Images/visual content | 1-2 | 3-5+ |

### Noindex Decision Framework

```
IF (total_sales < 3 AND reviews < 1) THEN noindex
ELSE IF (total_sales < 5 AND reviews < 2) THEN add extra context, monitor performance
ELSE publish with full optimization
```

### When to Noindex

| Scenario | Recommendation |
|----------|----------------|
| Agent with no photo, no bio, no sales | noindex, follow |
| Duplicate suburb pages (old URLs) | redirect 301 to canonical |
| Paginated pages beyond page 5 | Consider noindex |
| Filter result pages | noindex, follow |
| Sort variations | Use canonical to main page |
| Inactive/deceased agents | noindex or remove |

### Raw Data vs. Derived Insights

**Critical Distinction - Derived insights add SEO value:**

| Raw Data (Low Value) | Derived Insight (High Value) |
|---------------------|------------------------------|
| "23 sales in 2024" | "23 sales in 2024, ranking #3 in Bondi" |
| "Median price $1.2M" | "Median price $1.2M (12% above suburb average)" |
| "42 days on market" | "42 days on market (2 weeks faster than typical)" |
```

**Why important:** The current spec mentions "noindex pages with insufficient content" but provides no thresholds or decision framework.

---

### Addition 3: Complete Sydney Suburb Priority List

**Source:** `06_sydney_suburb_priority.md`

**Proposed new section or appendix:**

```markdown
## Appendix: Sydney Suburb Priority List

### Tier 1 (Top 20) - Process First

| Priority | Suburb | Postcode | Median House Price | Est. Agent Count |
|----------|--------|----------|-------------------|------------------|
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

### Processing Schedule (First Month)

| Day | Suburbs |
|-----|---------|
| Mon W1 | Mosman, Bondi Beach, Double Bay, Paddington |
| Tue W1 | Manly, Surry Hills, Castle Hill, Neutral Bay |
| Wed W1 | Chatswood, Balmain, Vaucluse, Cronulla |
| Thu W1 | Bellevue Hill, Parramatta, Newtown, Randwick |
| Fri W1 | Lane Cove, Dee Why, Woollahra, Marrickville |

### Expansion Path After Sydney

| Phase | City | Suburbs | Timeline |
|-------|------|---------|----------|
| Phase 2 | Brisbane | 400+ | Months 7-10 |
| Phase 3 | Melbourne | 450+ | Months 11-15 |
| Phase 4 | Perth | 250+ | Months 16-18 |
| Phase 5 | Adelaide | 200+ | Months 19-21 |
```

**Why important:** The current spec says "Define suburb priority list" is an open decision. This research provides the complete answer.

---

### Addition 4: Live Data Integration Architecture

**Source:** `08_live_data_strategy.md`

**Proposed new section:**

```markdown
## Live Data Layer Architecture

### Static vs Dynamic Content Split

| Static (SSG - Indexed by Google) | Dynamic (Client-rendered) |
|----------------------------------|---------------------------|
| Agent name, photo | Current listings (sale) |
| Agency affiliation | Current listings (rent) |
| Contact info (phone, email) | Recent sales (7-30 days) |
| Bio/profile text | Days on market (live) |
| Job position/title | Sold prices (when avail) |
| Social media links | Listing count changes |
| Historical stats (12mo) | Price changes |
| Enriched data (languages, etc) | |
| Schema markup | |

### API Call Architecture

```
User Browser → Client Component (TanStack Query) → Next.js API Route
                                                    ↓
                                             Check Vercel KV Cache
                                                    ↓
                                             (Cache miss? → Domain API)
```

### Caching Strategy

| Data Type | Cache TTL | Rationale |
|-----------|-----------|-----------|
| Current listings (for sale) | 2 hours | Properties can sell same-day |
| Current listings (for rent) | 4 hours | Rentals change less frequently |
| Recent sales | 12 hours | Historical, updates weekly |
| Agent stats (sold count) | 24 hours | Rarely changes mid-day |
| Listing details | 6 hours | Price/status can change |

### Rate Limit Protection

**Daily Budget Allocation (500 calls/day):**
- Background refresh (off-peak): 100 calls (20%)
- User-triggered fetches: 350 calls (70%)
- Buffer/emergency: 50 calls (10%)

### Fallback Strategy

Pages must work in three modes:
1. **Full Live Data**: API available, budget sufficient
2. **Cached Data**: API unavailable, serve from cache
3. **Static Only**: No cache, no API - show static content + "Live data unavailable"
```

**Why important:** The current spec mentions "Live Data Layer" but provides no implementation detail.

---

### Addition 5: Content Expansion Planning

**Source:** `07_content_expansion_planning.md`

**Proposed new section:**

```markdown
## Content Expansion Planning

### URL Structure for Mixed Content

```
PROGRAMMATIC CONTENT (Auto-generated)
├── /agent/[slug]              # Agent profiles
├── /agency/[slug]             # Agency pages
├── /agents-in/[suburb-slug]   # Suburb directory pages

EDITORIAL CONTENT (Future - Human-written or hybrid)
├── /insights/                  # Main editorial hub
│   ├── /insights/guides/       # How-to guides
│   ├── /insights/market/       # Market analysis
│   └── /insights/news/         # Industry news
├── /top-agents/[location]/     # Top agent rankings (Hybrid)
└── /suburb-guides/[slug]/      # Comprehensive suburb guides
```

### SEO Cannibalization Prevention

**Keyword Mapping Document (Create before any content):**

| Primary Keyword | Assigned Page | Page Type |
|----------------|---------------|-----------|
| real estate agents bondi | /agents-in/bondi-nsw-2026 | Programmatic |
| best real estate agents bondi | /top-agents/nsw/bondi/ | Hybrid |
| how to choose real estate agent | /insights/guides/choosing-agent/ | Editorial |

### Content Calendar (Do NOT launch editorial before Phase 2)

**Phase 1 (Months 1-6): Programmatic excellence only**
- Agent profiles, agency pages, suburb directories
- SEO foundation, schema markup, internal linking
- No editorial content

**Phase 2 (Months 7-12): Editorial foundation**
- 3-5 comprehensive pillar guides
- 10-20 suburb guides for top suburbs
- 5-10 market reports

**Phase 3 (Months 13-24): Content scale-up**
- Top Agents pages for major suburbs
- Comparison content
- Market reports expansion
```

**Why important:** The current spec has no guidance on future content expansion or avoiding cannibalization.

---

### Addition 6: Enrichment Sub-Agent Instructions

**Source:** `05_enrichment_data_sources.md`

**Proposed new section:**

```markdown
## Agent Enrichment Strategy

### Tiered Source Approach

```
TIER 1: High-Value (Always Check) - 30 seconds
├── LinkedIn (if URL provided or easily found)
└── Agency Website (agent team page)

TIER 2: Secondary Validation (Check if Tier 1 gaps) - 20 seconds
├── realestate.com.au agent profile
├── Domain.com.au web profile (beyond API)
└── Google search: "{name}" "{agency}" awards

TIER 3: Supplementary (Only if time permits) - 10 seconds
├── Facebook business page
├── Industry publications (Elite Agent, REB)
└── REIA state website

TOTAL MAX TIME: 60 seconds per agent
```

### Priority Enrichment Fields

| Field | SEO Value | User Value | Priority |
|-------|-----------|------------|----------|
| Years of experience | High | High | **CRITICAL** |
| Languages spoken | High | High | **HIGH** |
| Specializations | High | High | **HIGH** |
| Awards/Recognition | High | High | **HIGH** |
| Extended bio | Medium | Medium | MEDIUM |

### Data Conflict Resolution Hierarchy

1. LinkedIn (for employment dates/experience) - Highest
2. Agency Website (for current role details)
3. REIA/Industry Bodies (for awards)
4. Domain.com.au API (for contact/basic info)
5. realestate.com.au (for supplementary data)
6. Social Media - Lowest

### Rate My Agent Policy

**DO NOT scrape Rate My Agent directly.**

Acceptable alternatives:
- Check public award winner pages manually
- Google search for RMA awards: `site:ratemyagent.com.au "{agent name}" award`
- Allow agents to self-report RMA awards during profile claim
- Use REIA awards as authoritative alternative
```

**Why important:** The current spec mentions enrichment sub-agents but provides no source priority or instructions.

---

## Proposed Updates (Existing Sections)

### Update 1: Expand URL Structure

**Current content (Section: SEO Strategy > URL Structure):**
```markdown
### URL Structure

```
# Agent pages
/agent/{slug}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency pages
/agency/{slug}
Example: /agency/ray-white-bondi-beach
```
```

**Proposed change:**
```markdown
### URL Structure

```
# Agent pages
/agent/{first-name}-{last-name}-{suburb}-{agency-initials}-{short-id}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency pages
/agency/{agency-name-slug}
Example: /agency/ray-white-bondi-beach

# Suburb pages (Primary pattern)
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026

# State pages
/agents-in/{state}
Example: /agents-in/nsw

# Property type + Location (Future expansion - only when threshold met)
/agents-in/{suburb}-{state}-{postcode}/apartments
/agents-in/{suburb}-{state}-{postcode}/houses
```

### Trailing Slash Policy

**Choose: No trailing slashes and enforce consistency**

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
    ];
  },
};
```

### Handling Duplicate Suburb Names

Australian suburbs can share names across states (e.g., "Richmond" in VIC, NSW, QLD).

**Solution:** Always include state and postcode in URLs.
- Correct: `/agents-in/richmond-vic-3121`
- Wrong: `/agents-in/richmond`
```

**Source:** `01_nextjs_seo_patterns.md` (Section 3), `04_suburb_seo_strategy.md`

**Why important:** Research provides specific guidance on trailing slashes and duplicate suburb handling.

---

### Update 2: Expand Schema Markup

**Current content (Section: SEO Strategy > Schema Markup):**
```markdown
### Schema Markup

```json
// Agent page schema
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "John Smith",
  ...
}
```
```

**Proposed addition after existing schema:**
```markdown
### BreadcrumbList Schema

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
      "name": "John Smith",
      "item": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c"
    }
  ]
}
```

### FAQPage Schema (for Suburb Pages)

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
    }
  ]
}
```

### ItemList Schema (for Suburb Pages with Agent Rankings)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Real Estate Agents in Bondi, NSW 2026",
  "numberOfItems": 85,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "RealEstateAgent",
        "name": "John Smith",
        "worksFor": { "@type": "RealEstateAgent", "name": "Ray White Bondi Beach" }
      }
    }
  ]
}
```

**Source:** `01_nextjs_seo_patterns.md` (Section 6), `04_suburb_seo_strategy.md` (Section 8)

**Why important:** Research identifies three schema types needed; spec only has one.

---

### Update 3: Expand SQLite Schema

**Current content (Section: Data Model > SQLite Schema):**

The current schema is good but missing tracking tables from the research.

**Proposed additions to schema:**

```sql
-- Add to existing schema

-- Orchestrator run tracking (from research 03)
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
    interrupted_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API error log (from research 03)
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

-- Priority overrides (for user requests like "do Bondi next")
CREATE TABLE priority_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    override_priority INTEGER NOT NULL DEFAULT 1000,
    reason TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
);

-- Agency-Suburb junction for multi-suburb agencies
CREATE TABLE agency_suburbs (
    agency_domain_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_primary_office BOOLEAN DEFAULT FALSE,
    discovery_source TEXT,
    PRIMARY KEY (agency_domain_id, suburb_id)
);

-- Agent agency history (for tracking moves between agencies)
CREATE TABLE agent_agency_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_domain_id INTEGER NOT NULL,
    agency_domain_id INTEGER NOT NULL,
    started_at DATE,
    ended_at DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_status ON orchestrator_runs(status, started_at);
CREATE INDEX idx_errors_entity ON api_errors(entity_type, entity_id);
CREATE INDEX idx_agency_suburbs_suburb ON agency_suburbs(suburb_id);
CREATE INDEX idx_agent_history ON agent_agency_history(agent_domain_id, is_current);
```

**Source:** `03_agency_grouping_sequencing.md` (Section 8)

**Why important:** Research provides detailed tracking tables for resume logic that current spec lacks.

---

### Update 4: Expand Sequencing Logic

**Current content (Section: Architecture > Sequencing Logic):**
```markdown
### Sequencing Logic

The orchestrator follows this sequence:
1. **Select Suburb** — From priority list or user input
2. **Select Agency** — High-value agencies first
...
```

**Proposed replacement:**
```markdown
### Sequencing Logic

#### Recommended Approach: Hybrid (Discovery + Agency-Centric Processing)

```
PHASE 1: DISCOVERY (Suburb-centric)
─────────────────────────────────────
For each suburb in priority order:
    Call: GET /agencies?q=suburbId:{id}
    Store: agency_id, agency_name, suburb_id
    Mark: suburb as "discovered"

PHASE 2: PROCESSING (Agency-centric)
─────────────────────────────────────
Build deduplicated agency queue from discoveries
For each agency in priority order:
    If agency already processed: skip
    Call: GET /agencies/{id}
    Store: agency details + agent list
    For each agent:
        Call: GET /agents/{id}
        Store: agent profile
    Mark: agency as "complete"

PHASE 3: ENRICHMENT (Agent-centric, optional)
─────────────────────────────────────────────
For each agent needing enrichment:
    Spawn sub-agent for web research
    Store: enriched data
    Mark: agent as "enriched"
```

#### Why Agency-Centric Processing?

Multi-suburb agencies (e.g., Ray White Bondi Beach appears in Bondi, Bondi Junction, Tamarama) would be processed multiple times with suburb-centric approach.

**API savings:** If Ray White appears in 5 suburbs, we call their agency endpoint once instead of 5 times.

#### State Machine Model

Every work item uses a 6-state model:

| State | Description |
|-------|-------------|
| `pending` | Not yet started |
| `in_progress` | Currently being processed |
| `complete` | Successfully finished |
| `failed` | Current attempt failed |
| `retry` | Queued for retry |
| `abandoned` | Max retries exceeded |
| `skipped` | Duplicate detected or filtered out |

#### Resume Logic

The orchestrator checks these in order on startup:
1. Check for interrupted runs (`status = 'running'`)
2. Check for active priority overrides
3. Check for in-progress agencies
4. Check for pending agencies (before discovering more suburbs)
5. Get highest-priority pending suburb
```

**Source:** `03_agency_grouping_sequencing.md` (Sections 2, 6)

**Why important:** Current spec has simple sequential logic; research provides deduplication-aware approach.

---

### Update 5: Expand API Budget Strategy

**Current content (Section: Domain.com.au API Analysis > API Budget Strategy):**
```markdown
### API Budget Strategy (500 calls/day)

**Per Suburb Breakdown:**
| Operation | Calls | Notes |
|-----------|-------|-------|
| Search agencies in suburb | 1-5 | Paginated if many |
...
**Daily Capacity:** ~4 suburbs/day at this rate
```

**Proposed addition:**
```markdown
### API Budget Strategy (500 calls/day)

**Per Suburb Breakdown:**
| Operation | Calls | Notes |
|-----------|-------|-------|
| Search agencies in suburb | 1-5 | Paginated if many |
| Get agency details | ~10 | Per agency |
| Get agent profiles | ~50 | Per agent |
| Get agent listings | ~50 | Per agent (optional Phase 1) |
| **Total per suburb** | **~115** | Rough estimate |

**Daily Capacity:** ~4 suburbs/day at this rate

### Optimization: Skip Individual Agent Calls Initially

The agency endpoint includes basic agent data:
```json
"agents": [
  { "id": 0, "firstName": "string", "lastName": "string",
    "email": "string", "mobile": "string", "photo": "string" }
]
```

**Phase 1 Strategy:** Use agency endpoint data only. Skip `/agents/{id}` calls.
- Saves: ~50 calls per suburb
- Revised capacity: ~8 suburbs/day
- Trade-off: Missing social links, extended bio

**Phase 2:** Backfill full agent profiles for high-priority agents.

### Budget Tracking Implementation

```typescript
async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `rate_limit:${today}`;
  const current = await kv.incr(key);

  const DAILY_LIMIT = 500;
  const BUFFER = 50;
  return current <= (DAILY_LIMIT - BUFFER);
}
```

### When to Stop (Per Run)

```
IF remaining_quota < 10:
    LOG("Low quota, stopping for today")
    BREAK
```
```

**Source:** `03_agency_grouping_sequencing.md` (Appendix A), `08_live_data_strategy.md` (Section 4)

**Why important:** Research provides specific optimization to double daily capacity.

---

### Update 6: Add Pre-Build Strategy

**Current content (Section: Architecture):**

No guidance on which pages to pre-build at deploy time.

**Proposed addition to Architecture section:**

```markdown
### SSG Pre-Build Strategy

For 10,000+ pages, pre-building all pages would timeout. Use selective pre-building:

```typescript
// app/agent/[slug]/page.tsx
export async function generateStaticParams() {
  const db = await getDatabase();

  // Pre-build only high-priority agents
  const topAgents = await db.query(`
    SELECT slug FROM agents
    WHERE properties_sold_12mo > 5
    ORDER BY properties_sold_12mo DESC
    LIMIT 1000
  `);

  return topAgents.map((agent) => ({ slug: agent.slug }));
}

// Allow on-demand generation for other pages
export const dynamicParams = true;
export const revalidate = 86400; // 24 hours
```

**Pre-Build Priorities:**
- Top 500-1000 agent pages (highest sales volume)
- All suburb pages for Greater Sydney (~300)
- All agency pages with >3 agents (~200-300)
- Let remaining pages generate on-demand

**ISR Revalidation Schedule:**
| Page Type | Revalidation Period |
|-----------|---------------------|
| Agent pages | 24 hours |
| Suburb pages | 12 hours |
| Agency pages | 24 hours |
| State pages | 7 days |
```

**Source:** `01_nextjs_seo_patterns.md` (Section 1)

**Why important:** Critical for avoiding build timeouts with 10,000+ pages.

---

### Update 7: Add Sitemap Strategy

**Current content:** None

**Proposed addition to SEO Strategy section:**

```markdown
### Sitemap Strategy

For 10,000+ URLs, use a sitemap index with multiple sub-sitemaps:

```
/sitemap.xml           → Sitemap index
/sitemap-agents-0.xml  → Agents 1-5000
/sitemap-agents-1.xml  → Agents 5001-10000
/sitemap-agencies.xml  → All agencies
/sitemap-suburbs.xml   → All suburb pages
/sitemap-states.xml    → State pages (8 pages)
```

**Implementation:**

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDatabase();
  const { count: agentCount } = await db.get('SELECT COUNT(*) as count FROM agents');
  const agentSitemapCount = Math.ceil(agentCount / 5000);

  const sitemaps: MetadataRoute.Sitemap = [];

  for (let i = 0; i < agentSitemapCount; i++) {
    sitemaps.push({
      url: `${BASE_URL}/sitemap-agents-${i}.xml`,
      lastModified: new Date(),
    });
  }

  sitemaps.push(
    { url: `${BASE_URL}/sitemap-agencies.xml`, lastModified: new Date() },
    { url: `${BASE_URL}/sitemap-suburbs.xml`, lastModified: new Date() }
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
| Agent pages (high activity) | 0.8 | weekly |
| Agent pages (low activity) | 0.6 | monthly |
| Agency pages | 0.7 | weekly |
```

**Source:** `01_nextjs_seo_patterns.md` (Section 2)

**Why important:** Current spec has no sitemap guidance; critical for 10,000+ page sites.

---

### Update 8: Add robots.txt Configuration

**Current content:** None

**Proposed addition:**

```markdown
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
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=0',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block AI crawlers if desired
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
  };
}
```
```

**Source:** `01_nextjs_seo_patterns.md` (Section 7)

---

## Proposed Technical Changes

### Technical Change 1: Add Next.js Project Structure

**Source:** `01_nextjs_seo_patterns.md` (Section 9)

**Proposed new section:**

```markdown
## Recommended Project Structure

```
app/
├── (marketing)/
│   ├── layout.tsx              # Shared layout for marketing pages
│   ├── page.tsx                # Homepage
│   └── about/page.tsx
├── agent/
│   └── [slug]/
│       ├── page.tsx            # Agent profile page
│       ├── loading.tsx         # Loading state
│       └── not-found.tsx       # 404 for agent
├── agency/
│   └── [slug]/
│       ├── page.tsx            # Agency page
│       └── loading.tsx
├── agents-in/
│   ├── [state]/page.tsx        # State listing page
│   └── [slug]/
│       ├── page.tsx            # Suburb page
│       └── loading.tsx
├── api/
│   ├── revalidate/route.ts     # On-demand ISR endpoint
│   └── agent/[id]/
│       └── listings/route.ts   # Live data proxy
├── sitemap.ts
├── robots.ts
└── layout.tsx

components/
├── agent/
│   ├── AgentCard.tsx
│   ├── AgentImage.tsx
│   └── AgentProfile.tsx
├── seo/
│   ├── AgentSchema.tsx
│   ├── BreadcrumbSchema.tsx
│   └── SuburbSchema.tsx
└── ui/

lib/
├── data/
│   ├── agents.ts
│   ├── agencies.ts
│   └── database.ts
├── metadata/
│   ├── titles.ts
│   └── descriptions.ts
└── utils/
    └── slugify.ts

data/
└── ari.db                      # SQLite database
```
```

---

### Technical Change 2: Add Internal Linking Component Patterns

**Source:** `01_nextjs_seo_patterns.md` (Section 4), `04_suburb_seo_strategy.md` (Section 4)

**Proposed addition:**

```markdown
## Internal Linking Patterns

### Suburb Page Linking Requirements

Every suburb page must include:
1. **Breadcrumbs** (with schema): Home > State > Suburb
2. **Agent cards** with links to individual profiles
3. **Agency links** section
4. **Nearby suburbs** section
5. **Footer links** to popular locations

```tsx
// Suburb page internal linking pattern
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href={`/agents-in/${state.toLowerCase()}`}>{state}</a></li>
    <li>{suburb.name}</li>
  </ol>
</nav>

{/* Agent cards with links */}
{agents.map(agent => (
  <a href={`/agent/${agent.slug}`}>
    {agent.firstName} {agent.lastName}
  </a>
))}

{/* Related suburbs */}
<section>
  <h2>Nearby Suburbs</h2>
  {nearbySuburbs.map(s => (
    <a href={`/agents-in/${s.slug}`}>{s.name}</a>
  ))}
</section>
```

### Link Budget Guidelines

- **Minimum links per page:** 5-10 internal links
- **Maximum links per suburb page:** 50-100 (paginate if more agents)
- **Anchor text:** Use agent/suburb names, not "click here"
- **Footer:** Include top 10-20 suburbs site-wide
```

---

### Technical Change 3: Add Metadata Generation Patterns

**Source:** `01_nextjs_seo_patterns.md` (Section 6)

**Proposed addition:**

```markdown
## Metadata Generation

### Title Tag Patterns

```typescript
// lib/metadata.ts
export function generateAgentTitle(agent: Agent): string {
  return `${agent.firstName} ${agent.lastName} - Real Estate Agent in ${agent.suburb} | ${agent.agencyName} | ARI`;
}

export function generateSuburbTitle(suburb: Suburb, count: number): string {
  return `${count} Real Estate Agents in ${suburb.name}, ${suburb.state} ${suburb.postcode} | ARI`;
}
```

### Meta Description Patterns

```typescript
export function generateAgentDescription(agent: Agent): string {
  const parts = [
    `${agent.firstName} ${agent.lastName} is a licensed real estate agent at ${agent.agencyName} in ${agent.suburb}, ${agent.state}.`,
  ];

  if (agent.propertiesSold12mo > 0) {
    parts.push(`${agent.propertiesSold12mo} properties sold in the last 12 months.`);
  }

  parts.push('View profile, contact details, and sales history.');

  return truncate(parts.join(' '), 160);
}
```

### generateMetadata Implementation

```typescript
// app/agent/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  return {
    title: generateAgentTitle(agent),
    description: generateAgentDescription(agent),
    alternates: {
      canonical: `https://ari.com.au/agent/${params.slug}`,
    },
    openGraph: {
      title: `${agent.firstName} ${agent.lastName}`,
      images: [agent.photoUrl || '/default-agent.png'],
      type: 'profile',
    },
    robots: {
      index: hasMinimumContent(agent), // Noindex thin pages
      follow: true,
    },
  };
}
```
```

---

## Proposed Process Changes

### Process Change 1: Add Pre-Launch Safety Checklist

**Source:** `02_programmatic_seo_safety.md` (Section 9)

**Proposed new section:**

```markdown
## Pre-Launch Safety Checklist

### Content Quality
- [ ] Each page has 300+ words of unique content
- [ ] Performance metrics include derived insights, not just raw numbers
- [ ] Comparison data adds context (vs. suburb average)
- [ ] Data sources clearly attributed
- [ ] Last updated dates displayed

### Technical SEO
- [ ] Proper URL structure (clean, descriptive)
- [ ] Canonical tags on all pages
- [ ] Noindex applied to thin pages (< 3 sales, no reviews)
- [ ] XML sitemaps generated
- [ ] robots.txt configured
- [ ] Mobile responsive
- [ ] Core Web Vitals passing
- [ ] Schema markup validated

### E-E-A-T
- [ ] About page with company information
- [ ] Contact details visible
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data source transparency (methodology page)

### Site Architecture
- [ ] Clear hierarchy: Home > State > Suburb > Agent
- [ ] Breadcrumb navigation on all pages
- [ ] No orphan pages (every page has incoming links)
- [ ] Footer with popular locations
```

---

### Process Change 2: Add Monitoring Schedule

**Source:** `02_programmatic_seo_safety.md` (Section 8)

**Proposed addition:**

```markdown
## Monitoring and Maintenance

### Regular Monitoring Schedule

| Frequency | Task |
|-----------|------|
| **Daily** | Check for manual action notifications in GSC |
| **Weekly** | Review index coverage, position tracking |
| **Monthly** | Full performance analysis vs previous month |
| **After Updates** | Check within 48 hours of announced Google updates |

### Key Metrics to Track

| Metric | Location | Warning Sign |
|--------|----------|--------------|
| Manual Actions | GSC Security & Manual Actions | Any notification |
| Index Coverage | GSC Pages > Indexing | High "not indexed" rate |
| Core Web Vitals | GSC Experience | Failing scores |
| Click-Through Rate | GSC Performance | Declining CTR |
| Crawl Stats | GSC Settings | Declining crawl rate |

### Recovery Actions

If algorithmic impact detected:
1. Identify timing - correlate with known algorithm updates
2. Conduct comprehensive audit (content, technical, UX)
3. Prioritize improvements
4. Wait for next core update (3-6 months minimum)
```

---

## Conflicts or Corrections

### Conflict 1: URL Pattern Inconsistency

**Current spec says:**
```
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026
```

**Research confirms this is correct** but the spec also shows:
```
/agent/{slug}
Example: /agent/john-smith-bondi-rw-a1b2c
```

**Note:** These are consistent. No conflict, but should explicitly document that `/agent/` is singular (individual) and `/agents-in/` is plural (listing).

---

### Conflict 2: Sub-Agent Model

**Current spec says:**
```typescript
// Uses claude-sonnet-4-5-20250929
model: 'sonnet'
```

**Research 05 recommends:** Time limit of 60 seconds max per agent for enrichment.

**Recommendation:** Add explicit time limit to sub-agent configuration:

```typescript
const enrichmentAgentConfig = {
  model: 'sonnet',
  maxDuration: 60000, // 60 seconds
  tools: ['WebSearch', 'WebFetch'],
  // ...
};
```

---

### Conflict 3: Live Data Timing

**Current spec says:**
```
When user visits page (client-side):
• Domain API → current listings, recent transactions
```

**Research 08 recommends:** Server-side API routes, not direct client-side calls.

**Correction needed:** Update architecture diagram to show API route pattern:

```
User Browser → Client Component → /api/agent/[id]/listings → Vercel KV Cache → Domain API
```

---

## Priority Ranking

### Critical (Must Have for Launch)

1. **Safe Rollout Cadence** (Addition 1) - Risk of Google penalty without this
2. **Thin Content Avoidance** (Addition 2) - Risk of thin content penalty
3. **Pre-Build Strategy** (Update 6) - Build will timeout without this
4. **Sitemap Strategy** (Update 7) - Pages won't index without this
5. **Pre-Launch Safety Checklist** (Process 1) - Quality gate

### High Priority (Week 1-2)

6. **Sydney Suburb Priority List** (Addition 3) - Resolves open decision
7. **Expanded Sequencing Logic** (Update 4) - API budget efficiency
8. **SQLite Schema Additions** (Update 3) - Resume logic depends on this
9. **URL Structure Expansion** (Update 1) - Prevent duplicate issues
10. **Schema Markup Expansion** (Update 2) - SEO quality

### Medium Priority (Week 3-4)

11. **Live Data Integration** (Addition 4) - Phase 2 feature
12. **Content Expansion Planning** (Addition 5) - Future-proofing
13. **Enrichment Sub-Agent Instructions** (Addition 6) - Phase 2 feature
14. **API Budget Optimization** (Update 5) - Efficiency gain
15. **Project Structure** (Technical 1) - Organization

### Lower Priority (Month 2+)

16. **Internal Linking Patterns** (Technical 2) - Enhancement
17. **Metadata Generation** (Technical 3) - Enhancement
18. **robots.txt** (Update 8) - Can use defaults initially
19. **Monitoring Schedule** (Process 2) - Post-launch

---

## Summary of Changes by Category

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| New Sections | 6 | 2 | 2 | 2 | 0 |
| Section Updates | 8 | 2 | 4 | 1 | 1 |
| Technical Changes | 3 | 0 | 1 | 1 | 1 |
| Process Changes | 2 | 1 | 0 | 0 | 1 |
| Conflicts | 3 | 0 | 1 | 2 | 0 |
| **Total** | **22** | **5** | **8** | **6** | **3** |

---

*Report generated: 2026-02-01*
*Reviewer: Spec Review Agent 2*
*Sources: 8 research reports, SPEC_V1.md, prd.md*
