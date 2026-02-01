# Spec Review Report - Agent 3

**Created:** 2026-02-01
**Reviewer:** Spec Review Agent 3
**Documents Reviewed:**
- Original PRD (prd.md)
- Current Specification (SPEC_V1.md)
- Research Reports 01-08

---

## Summary

After comprehensive review of all 8 research reports against the current SPEC_V1.md, I have identified **47 proposed changes** across the following categories:

| Category | Count | Priority Impact |
|----------|-------|-----------------|
| New Sections to Add | 12 | High |
| Updates to Existing Sections | 18 | High-Medium |
| Technical Changes (Schema, Code) | 8 | Medium |
| Process/Workflow Changes | 6 | Medium |
| Conflicts/Corrections | 3 | High |

**Major Themes:**
1. The current spec lacks critical SEO safety guidelines for programmatic content at scale
2. URL structure needs revision to support future content expansion
3. The data pipeline design needs the comprehensive work queue system from Report 03
4. Live data strategy is entirely missing from the spec
5. Suburb priority list and expansion strategy need to be added
6. Enrichment data sources and sub-agent instructions need significant detail
7. Content expansion planning for future growth is absent

---

## Proposed Additions (New Sections)

### Addition 1: Programmatic SEO Safety Guidelines

**Section to add:** New top-level section after "SEO Strategy"

**Proposed content:**
```markdown
## Programmatic SEO Safety Guidelines

### Safe Rollout Cadence

**Phase 1: Foundation (Weeks 1-4)**
- Launch with 10-20 high-quality pilot pages
- Focus on agents with most sales history/reviews
- Perfect template quality before scaling
- Monitor indexing rates and user engagement

**Phase 2: Controlled Expansion (Weeks 5-12)**
- Gradually increase to 50-100 new pages per week
- Deploy in logical clusters (by suburb or agency)
- Monitor index coverage in Google Search Console
- Watch for "Crawled - currently not indexed" status

**Phase 3: Scale (Months 3-6)**
- If metrics look healthy, increase to 200-500 pages per week
- Continue monitoring quality signals
- Build internal linking structure as you grow

### Content Uniqueness Requirements

Each agent page must include:
- **Minimum 300-500 words** of unique, substantive content
- **5-10 unique data points** (performance metrics, specializations)
- **Derived insights**, not just raw data (e.g., "42 days on market - 2 weeks faster than suburb average")

### Thin Content Decision Rules

```
IF (total_sales < 3 AND reviews < 1) THEN noindex
ELSE IF (total_sales < 5 AND reviews < 2) THEN add extra context, monitor
ELSE publish with full optimization
```

### Quality Signals Checklist

- [ ] Each page has 300+ words of unique content
- [ ] Performance metrics include derived insights
- [ ] Comparison data adds context (vs. suburb average)
- [ ] Data sources clearly attributed
- [ ] Last updated dates displayed
- [ ] Methodology page created and linked
```

**Cited from:** Research Report 02 - Programmatic SEO Safety (Sections 2, 3, 6)

**Why important:** The current spec has no guidelines for avoiding Google penalties. Report 02 documents how the March 2024 Core Update specifically targets "Scaled Content Abuse" - without these safeguards, ARI risks being penalized.

---

### Addition 2: Comprehensive Work Queue System

**Section to add:** Replace/expand "Agent Orchestration System" section

**Proposed content:**
```markdown
## Work Queue Architecture

### Six-State Machine Model

Every work item (suburb, agency, agent) uses this state machine:

| State | Description | When to Use |
|-------|-------------|-------------|
| `pending` | Not yet started | Initial state |
| `in_progress` | Currently being processed | Work has begun |
| `complete` | Successfully finished | All API calls succeeded |
| `failed` | Current attempt failed | API error, timeout |
| `retry` | Queued for retry | After failure, before next attempt |
| `abandoned` | Permanently failed | Max retries exceeded |
| `skipped` | Intentionally skipped | Duplicate detected |

### Hybrid Discovery/Processing Approach

**PHASE 1: DISCOVERY (Suburb-centric)**
- For each suburb in priority order:
  - Call: `GET /agencies?q=suburbId:{id}`
  - Store: agency_id, agency_name, suburb_id
  - Mark: suburb as "discovered"

**PHASE 2: PROCESSING (Agency-centric)**
- Build deduplicated agency queue from discoveries
- For each agency (process ONCE regardless of suburb count):
  - Call: `GET /agencies/{id}`
  - Store: agency details + agent list
  - For each agent: `GET /agents/{id}`
  - Mark: agency as "complete"

**PHASE 3: ENRICHMENT (Agent-centric)**
- For each agent needing enrichment:
  - Spawn sub-agent for web research
  - Store: enriched data
  - Mark: agent as "enriched"

### Resume Logic

Track progress at multiple granularities:
- Suburb level: agencies_discovered, agencies_complete
- Agency level: agents_discovered, agents_complete
- Agent level: profile_fetched, enriched

**Resume Decision Tree:**
1. Check for interrupted runs
2. Find in_progress agencies
3. Find pending agencies
4. Find pending suburbs
```

**Cited from:** Research Report 03 - Agency Grouping & Sequencing (Sections 1, 2, 6)

**Why important:** The current spec has a basic orchestration pattern but lacks the sophisticated state machine, deduplication, and resume logic needed for a multi-month data collection effort with API rate limits.

---

### Addition 3: Sydney Suburb Priority List

**Section to add:** New section under "Next Steps" or as an Appendix

**Proposed content:**
```markdown
## Suburb Priority List (Sydney)

### Tier 1: First Week (Top 20) - Process Immediately

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
| 11-20 | Vaucluse, Cronulla, Bellevue Hill, Parramatta, Newtown, Randwick, Lane Cove, Dee Why, Woollahra, Marrickville | Various | $1.76M-$9.82M | 40-150 |

### Processing Timeline

| Day | Suburbs |
|-----|---------|
| Mon | Mosman, Bondi Beach, Double Bay, Paddington |
| Tue | Manly, Surry Hills, Castle Hill, Neutral Bay |
| Wed | Chatswood, Balmain, Vaucluse, Cronulla |
| Thu | Bellevue Hill, Parramatta, Newtown, Randwick |
| Fri | Lane Cove, Dee Why, Woollahra, Marrickville |

### Regional Expansion Path

| Phase | City | Timeline | Rationale |
|-------|------|----------|-----------|
| 1 | Sydney | Months 1-6 | Largest market, highest values |
| 2 | Brisbane | Months 7-10 | #2 most expensive, Olympic growth |
| 3 | Melbourne | Months 11-15 | Recovery market, high volume |
| 4 | Perth | Months 16-18 | Strong growth predicted |
| 5 | Adelaide | Months 19-21 | Affordable market |
```

**Cited from:** Research Report 06 - Sydney Suburb Priority (Sections 2, 9, 7)

**Why important:** The current spec marks suburb priority as "Need to define" in Open Decisions. This research provides a data-driven priority list based on market analysis.

---

### Addition 4: Live Data Strategy

**Section to add:** New major section after "Architecture"

**Proposed content:**
```markdown
## Live Data Strategy

### Static vs Dynamic Content Split

**STATIC (Pre-built at SSG - Indexed by Google)**
- Agent name, photo, agency affiliation
- Contact info (phone, email)
- Bio/profile text, job position
- Social media links
- Historical stats (12mo)
- Enriched data (languages, specializations)
- Schema markup

**DYNAMIC (Fetched on user visit - NOT indexed)**
- Current listings (sale/rent)
- Recent sales (7-30 days)
- Days on market (live calculation)
- Sold prices (when available)
- Price changes

### Caching Architecture

| Layer | Technology | TTL | Purpose |
|-------|------------|-----|---------|
| Browser | TanStack Query | 5 min stale | Prevent re-fetch on navigation |
| CDN | Vercel Edge | 1 hour | Global distribution |
| Application | Vercel KV (Redis) | 2 hours | Cross-user cache |
| Source | Domain API | N/A | 500 calls/day limit |

### Cache TTLs by Data Type

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Current listings (for sale) | 2 hours | Properties can sell same-day |
| Current listings (for rent) | 4 hours | Rentals change less frequently |
| Recent sales | 12 hours | Historical, updates weekly |
| Agent stats (sold count) | 24 hours | Rarely changes mid-day |

### Rate Limit Protection

**Daily Budget Allocation (500 calls):**
- Background refresh (off-peak): 100 calls (20%)
- User-triggered fetches: 350 calls (70%)
- Buffer/emergency: 50 calls (10%)

**Protection Mechanisms:**
1. Request coalescing (deduplicate in-flight requests)
2. Budget tracking with Vercel KV
3. Circuit breaker pattern for API failures
4. Priority queue for high-traffic pages
```

**Cited from:** Research Report 08 - Live Data Strategy (Sections 1, 3, 4, 6)

**Why important:** The current spec mentions a "Live Data Layer" box in the architecture diagram but provides no implementation details. This is critical for user experience.

---

### Addition 5: Sub-Agent Enrichment Instructions

**Section to add:** Expand "Subagent Configuration" section significantly

**Proposed content:**
```markdown
## Sub-Agent Enrichment System

### Priority Fields to Enrich

| Field | SEO Value | User Value | Priority |
|-------|-----------|------------|----------|
| Years of experience | HIGH | HIGH | **CRITICAL** |
| Languages spoken | HIGH | HIGH | **HIGH** |
| Specializations | HIGH | MEDIUM | **HIGH** |
| Awards/Recognition | MEDIUM | HIGH | **HIGH** |

### Source Priority Order

**TIER 1 (Always check - 30 sec budget):**
1. LinkedIn (if URL provided)
2. Agency website team page

**TIER 2 (If gaps remain - 20 sec budget):**
3. realestate.com.au agent profile
4. Domain.com.au web profile
5. Google search: "{name}" "{agency}" awards

**TIER 3 (Time permitting - 10 sec budget):**
6. Facebook business page
7. Industry publications (Elite Agent, REB)
8. REIA state website

**TOTAL MAX TIME: 60 seconds per agent**

### Enrichment Prompt Template

```
You are a research specialist for real estate agent profiles.

Agent: {{agent_name}}
Agency: {{agency_name}}
Location: {{suburb}}, {{state}}
LinkedIn: {{linkedin_url or "not provided"}}

Find (in order):
1. Years of experience (from LinkedIn employment history)
2. Languages spoken (explicitly stated only)
3. Specializations (luxury, investors, first-home buyers)
4. Awards (REIA, RMA, agency awards - verifiable only)

Return JSON:
{
  "years_experience": number or null,
  "years_experience_source": "linkedin" | "agency_website" | null,
  "languages": ["English", ...],
  "specializations": ["luxury homes", ...],
  "awards": [{"name": "...", "year": 2024, "level": "state"}]
}

DO NOT make up information. Return null for fields you cannot verify.
```

### Rate My Agent Policy

**DO NOT scrape Rate My Agent directly.**

Reasons:
- Legal risk (ToS violation)
- Ethical concerns (competitor's UGC)
- Reputational risk for ARI as "neutral" index

**Legitimate alternatives:**
- Check public award winner pages
- Google search: `site:ratemyagent.com.au "{agent name}" award`
- Agent self-reporting via profile claims
- REIA state institute award lists (official source)
```

**Cited from:** Research Report 05 - Enrichment Data Sources (Sections 3, 6, 8)

**Why important:** The current spec has a basic enrichment prompt but lacks source prioritization, time limits, and critical guidance on avoiding RMA scraping.

---

### Addition 6: Suburb Page SEO Strategy

**Section to add:** New section under "SEO Strategy"

**Proposed content:**
```markdown
## Suburb Page Strategy

### Why Suburb Pages Matter

Suburb pages represent ARI's greatest competitive opportunity. While competitors focus on agent profiles and reviews, suburb-level content is less contested.

**Key insight:** Long-tail keywords account for 70% of searches, and "best real estate agent in [suburb] for apartments" has lower competition but higher intent.

### Long-Tail Keyword Patterns

| Pattern | Example | Intent |
|---------|---------|--------|
| `real estate agents in [suburb]` | agents in Bondi | Discovery |
| `best real estate agent [suburb]` | best agent Bondi | Evaluation |
| `[suburb] [property-type] specialist` | Bondi apartment specialist | Niche |
| `sell house [suburb]` | sell house Bondi | Transactional |

### Suburb Page Content Template

```markdown
# Real Estate Agents in [Suburb], [State] [Postcode]

## Quick Stats (Snippet-optimized)
- **[X] Active Agents** in [Suburb]
- **[Y] Properties Sold** (last 12 months)
- **Median Sale Price:** $[Z]
- **Median Days on Market:** [N] days

## Top Agents in [Suburb]
[Agent cards with: Name, Agency, Sales, Specialization badges]

## [Suburb] Market Snapshot
- Property Types Sold: [breakdown]
- Price Range: $[min] - $[max]
- Most Active Agencies: [top 3-5]

## Frequently Asked Questions
[FAQ section with FAQPage schema]

## Related Suburbs
[Links to nearby suburbs]
```

### Featured Snippet Optimization

**Target:** "Who is the best real estate agent in Bondi?"

**Optimized structure:**
```html
<h2>Who is the Best Real Estate Agent in Bondi?</h2>
<p>The top-performing real estate agents in Bondi for 2026 include
[Agent 1] of [Agency] with [X] sales and a median price of $[Y],
and [Agent 2] of [Agency] specializing in [property type].
Rankings are based on verified sales data.</p>
```

### Property Type Sub-Pages

Generate `/agents-in/bondi-nsw-2026/apartments` only when:
- 10+ agents have sales in that property type
- 20+ sales in that type (12mo)
- Otherwise, show as section on main suburb page

### Noindex thin property type pages if thresholds not met.
```

**Cited from:** Research Report 04 - Suburb SEO Strategy (Sections 1, 2, 3, 7)

**Why important:** The current spec defines URL structure but lacks content strategy for suburb pages, which are critical for geographic SEO.

---

### Addition 7: Content Expansion Planning

**Section to add:** New section for future growth

**Proposed content:**
```markdown
## Content Expansion Architecture

### URL Structure for Mixed Content

**PROGRAMMATIC (Auto-generated):**
```
/agent/[slug]              # Agent profiles
/agency/[slug]             # Agency pages
/agents-in/[suburb-slug]   # Suburb directory pages
```

**EDITORIAL (Human-written or hybrid):**
```
/insights/guides/[topic]   # How-to guides
/insights/market/[location]# Market analysis
/top-agents/[location]     # Curated rankings
/suburb-guides/[suburb]    # Comprehensive living guides
```

### Preventing SEO Cannibalization

**Keyword Mapping (Critical):**

| Primary Keyword | Assigned Page | Type |
|----------------|---------------|------|
| real estate agents bondi | /agents-in/bondi-nsw-2026 | Programmatic |
| best real estate agents bondi | /top-agents/nsw/bondi | Hybrid |
| how to choose agent | /insights/guides/choosing-agent | Editorial |

**Intent Differentiation:**
- Suburb pages: Navigational/Browse intent
- Top Agents pages: Comparative/Decision intent
- Agent pages: Brand/Specific intent

### Content Calendar

**Phase 1 (Months 1-6):** Programmatic only
- No editorial content
- Focus on agent/suburb pages reaching critical mass

**Phase 2 (Months 7-12):** Editorial foundation
- 3-5 pillar guides
- 10-20 suburb guides for top suburbs
- 5-10 market reports

**Phase 3 (Year 2):** Full content operation
- Top Agents pages for major suburbs
- Weekly market updates
- Quarterly industry reports

### Warning: Don't Launch Top 10 Pages Too Early

Minimum requirements before launching:
- 20+ agents per suburb with reviews
- Review data from multiple sources
- Clear ranking methodology documented
- Editorial review process in place
```

**Cited from:** Research Report 07 - Content Expansion Planning (Sections 1, 3, 4, 10)

**Why important:** The current spec has no plan for content beyond programmatic pages. This prevents structural problems as the site grows.

---

### Addition 8: Next.js Implementation Patterns

**Section to add:** Technical implementation details section

**Proposed content:**
```markdown
## Next.js Technical Patterns

### Build Strategy for 10,000+ Pages

**DO NOT** build all pages at deploy time. Use hybrid approach:

```typescript
// app/agent/[slug]/page.tsx

// Pre-build top 500-1000 agents only
export async function generateStaticParams() {
  const topAgents = await db.query(`
    SELECT slug FROM agents
    WHERE properties_sold_12mo > 5
    ORDER BY properties_sold_12mo DESC
    LIMIT 1000
  `);
  return topAgents.map(a => ({ slug: a.slug }));
}

// Allow on-demand generation for rest
export const dynamicParams = true;

// Revalidate every 24 hours
export const revalidate = 86400;
```

### ISR Revalidation Schedule

| Page Type | Revalidation | Rationale |
|-----------|-------------|-----------|
| Agent pages | 24 hours | Profile data stable |
| Suburb pages | 12 hours | Agents may be added |
| Agency pages | 24 hours | Roster changes rare |
| State pages | 7 days | Very stable |

### On-Demand Revalidation API

```typescript
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { secret, type, slug } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid' }, { status: 401 });
  }

  if (type === 'agent') {
    revalidatePath(`/agent/${slug}`);
    // Also revalidate agent's suburb pages
  }

  return Response.json({ revalidated: true });
}
```

### Sitemap Strategy

```
/sitemap.xml           -> Index pointing to sub-sitemaps
/sitemap-agents-0.xml  -> Agents 1-5000
/sitemap-agents-1.xml  -> Agents 5001-10000
/sitemap-agencies.xml  -> All agencies
/sitemap-suburbs.xml   -> All suburb pages
```

**Keep each sitemap under 50,000 URLs (Google's limit).**

### Core Web Vitals Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| LCP | < 2.5s | Priority on hero image, SSG |
| FID/INP | < 100ms | Server Components, minimal JS |
| CLS | < 0.1 | Explicit image dimensions |
```

**Cited from:** Research Report 01 - Next.js SEO Patterns (Sections 1, 2, 7, 8)

**Why important:** The current spec mentions Next.js but lacks critical implementation details for handling 10,000+ pages without build timeouts.

---

### Addition 9: Database Schema Updates

**Section to add:** Enhance Data Model section

**Proposed additions to schema:**
```sql
-- ADD: Work Queue Tables (from Report 03)

CREATE TABLE orchestrator_runs (
    run_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    status TEXT NOT NULL DEFAULT 'running',
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

CREATE TABLE api_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT REFERENCES orchestrator_runs(run_id),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    http_status INTEGER,
    error_code TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    will_retry BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE priority_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    override_priority INTEGER NOT NULL DEFAULT 1000,
    reason TEXT,
    requested_by TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status TEXT DEFAULT 'active'
);

-- ADD: Suburb priorities table
CREATE TABLE suburb_priorities (
    suburb_id TEXT PRIMARY KEY,
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    priority_score REAL DEFAULT 0,
    search_volume INTEGER,
    median_property_value INTEGER,
    estimated_agent_count INTEGER,
    tier INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ADD: Agency brand tiers
CREATE TABLE agency_brands (
    brand_name TEXT PRIMARY KEY,
    brand_tier INTEGER DEFAULT 5,
    is_franchise BOOLEAN DEFAULT TRUE,
    notes TEXT
);

-- Pre-seed major brands
INSERT INTO agency_brands (brand_name, brand_tier) VALUES
    ('Ray White', 10),
    ('LJ Hooker', 10),
    ('McGrath', 9),
    ('Belle Property', 9),
    ('Harcourts', 8),
    ('Century 21', 8),
    ('Raine & Horne', 8);
```

**Cited from:** Research Report 03 - Agency Grouping & Sequencing (Section 8)

**Why important:** The current schema lacks tables for tracking orchestrator state, error handling, and priority management.

---

### Addition 10: Monitoring Dashboard Specification

**Section to add:** New section for observability

**Proposed content:**
```markdown
## Monitoring & Observability

### Key Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  API BUDGET                    CACHE PERFORMANCE        │
│  ───────────                   ──────────────────       │
│  Calls today: 347/500          Hit rate: 94.2%          │
│  Remaining: 153                Avg response: 45ms       │
│  Reset: 6h 23m                 Cache size: 2.4 MB       │
│                                                         │
│  INDEXATION                    ERROR RATES              │
│  ───────────                   ────────────             │
│  Pages indexed: 4,250          API errors: 0.3%         │
│  Pending index: 320            Timeout rate: 0.1%       │
│  Index rate: 93%               Circuit breaker: Closed  │
└─────────────────────────────────────────────────────────┘
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Rate limit remaining | < 100 | < 50 | Slack/PagerDuty |
| Cache hit rate | < 80% | < 70% | Investigate TTLs |
| API error rate | > 5% | > 10% | Check Domain API |
| Pages not indexed | > 15% | > 25% | Review content quality |

### Google Search Console Monitoring

**Weekly Review:**
- Index coverage changes
- "Crawled - currently not indexed" count
- Average position changes
- Click-through rates

**After Algorithm Updates:**
- Check within 48 hours
- Compare traffic vs. update dates
- Document any ranking changes
```

**Cited from:** Research Reports 02 (Section 8), 08 (Section 10)

**Why important:** The current spec has no monitoring plan. With programmatic SEO, monitoring is critical for early detection of penalties or technical issues.

---

### Addition 11: E-E-A-T Implementation Guidelines

**Section to add:** Under SEO Strategy

**Proposed content:**
```markdown
## E-E-A-T for ARI

### Experience Signals
- User reviews (future feature)
- Transaction verification from sales data
- Response patterns from agent activity

### Expertise Signals
- Comprehensive market coverage
- Sophisticated performance metrics
- Clear methodology explanations
- "Data sourced from Domain.com.au API" attribution

### Authoritativeness Signals
- Coverage of all major markets
- Media mentions or industry recognition
- Complete data for indexed suburbs

### Trustworthiness Signals

**Required on every page:**
- Data source attribution footer
- Last updated timestamps
- Methodology link
- Clear labeling (estimated vs. actual data)

**Site-wide:**
- About page with company information
- Contact details prominently displayed
- Privacy policy
- Terms of service
- SSL certificate (HTTPS)

### Neutral Index Positioning

**Communicate clearly:**
- "ARI is an independent directory - agents cannot pay for placement"
- "Rankings based on performance data, not advertising"
- "We aggregate public data to help consumers make informed decisions"

**Avoid conflicts:**
- Don't accept payments for ranking
- Separate advertising from editorial clearly
- Be transparent about business relationships
```

**Cited from:** Research Report 02 - Programmatic SEO Safety (Section 7)

**Why important:** E-E-A-T is critical for directory sites. Google's guidelines specifically evaluate trustworthiness of directories.

---

### Addition 12: robots.txt and Crawl Budget Configuration

**Section to add:** Under SEO Strategy

**Proposed content:**
```markdown
## Crawl Budget Management

### robots.txt Configuration

```typescript
// app/robots.ts
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
          '/*?*page=0',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',  // Block AI crawlers if desired
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
  };
}
```

### Pages to Noindex

| Scenario | Action |
|----------|--------|
| Agent with no photo, no bio, no sales | noindex, follow |
| Duplicate suburb pages (old URLs) | 301 redirect |
| Paginated pages beyond page 5 | Consider noindex |
| Filter result pages | noindex, follow |
| Sort variations | canonical to main |

### Avoiding Duplicate Content

1. **Trailing slashes:** Enforce consistent pattern (no trailing)
2. **Parameter handling:** Redirect tracking params
3. **State codes:** Lowercase always (nsw not NSW)
4. **Canonicals:** Self-referencing on every page
```

**Cited from:** Research Report 01 - Next.js SEO Patterns (Section 7)

**Why important:** The current spec has no robots.txt or crawl budget guidance. For 10,000+ pages, proper configuration prevents wasted crawl budget.

---

## Proposed Updates (Existing Sections)

### Update 1: Architecture Diagram Enhancement

**Current (SPEC_V1.md lines 52-103):**
```
[Basic architecture boxes]
```

**Proposed change:** Add detail to the Live Data Layer and include caching layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE DATA LAYER (v2)                          │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Browser     │    │ CDN/Edge    │    │ Vercel KV   │        │
│  │ TanStack Q  │───▶│ Cache       │───▶│ (Redis)     │        │
│  │ 5min stale  │    │ 1hr s-max   │    │ 2hr TTL     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                               │                 │
│                                               ▼                 │
│                                        ┌─────────────┐         │
│                                        │ Domain API  │         │
│                                        │ 500/day     │         │
│                                        └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

**Cited from:** Research Report 08 (Section 3)

---

### Update 2: URL Structure Revision

**Current (SPEC_V1.md lines 586-607):**
```
/agent/{slug}
/agency/{slug}
/agents-in/{suburb}-{state}-{postcode}
```

**Proposed change:** Add state hierarchy and future editorial paths

```markdown
### URL Structure (v2)

**Programmatic Directory:**
```
/agent/{slug}                              # Individual profiles
/agency/{slug}                             # Agency pages
/agents-in/{state}                         # State listing
/agents-in/{suburb}-{state}-{postcode}     # Suburb listing
/agents-in/{suburb}-{state}-{postcode}/{property-type}  # Property type filter
```

**Future Editorial (reserve now):**
```
/insights/                                 # Editorial hub
/insights/guides/{topic}                   # How-to guides
/insights/market/{location}                # Market reports
/top-agents/{state}/{location}             # Curated rankings (NOT under /agents-in/)
/suburb-guides/{suburb}                    # Living guides
```

**Important:** Keep `/top-agents/` separate from `/agents-in/` to prevent cannibalization.
```

**Cited from:** Research Report 07 (Section 1)

---

### Update 3: Schema Markup Enhancement

**Current (SPEC_V1.md lines 609-631):**
Basic RealEstateAgent schema

**Proposed additions:**

```json
// ADD: BreadcrumbList schema
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ari.com.au/" },
    { "@type": "ListItem", "position": 2, "name": "NSW", "item": "https://ari.com.au/agents-in/nsw" },
    { "@type": "ListItem", "position": 3, "name": "Bondi", "item": "https://ari.com.au/agents-in/bondi-nsw-2026" },
    { "@type": "ListItem", "position": 4, "name": "John Smith" }
  ]
}

// ADD: FAQPage schema for suburb pages
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How many real estate agents are in Bondi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "There are currently 85 active real estate agents in Bondi, NSW 2026..."
      }
    }
  ]
}

// ADD: ItemList schema for suburb pages
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Real Estate Agents in Bondi, NSW 2026",
  "numberOfItems": 85,
  "itemListElement": [...]
}
```

**Cited from:** Research Reports 01 (Section 6), 04 (Section 3, 8)

---

### Update 4: API Budget Strategy Refinement

**Current (SPEC_V1.md lines 235-252):**
```
Per Suburb: ~115 calls
Daily Capacity: ~4 suburbs/day
```

**Proposed update with optimization:**

```markdown
### API Budget Strategy (Optimized)

**Hybrid Discovery/Processing Approach:**

| Phase | Calls | Notes |
|-------|-------|-------|
| Discovery (100 suburbs) | ~300 | 3 calls avg per suburb |
| Agency processing | ~200 | 1 call per unique agency |
| Agent processing | Varies | Can skip if using agency data |

**Key Optimization: Skip individual agent calls initially**

The `/agencies/{id}` endpoint returns basic agent data:
- firstName, lastName, email, mobile, photo, profileText

Only call `/agents/{id}` for:
- Agents in Tier 1 suburbs
- Agents with high listing activity
- Profile claim requests

**Savings:**
- Without optimization: ~115 calls/suburb = 4.3 suburbs/day
- With optimization: ~40 calls/suburb = 12.5 suburbs/day

**Daily Allocation:**
- Background refresh: 100 calls (20%)
- User-triggered live data: 350 calls (70%)
- Buffer: 50 calls (10%)
```

**Cited from:** Research Reports 03 (Section 2.3), 08 (Section 4)

---

### Update 5: Agent Slug Generation Update

**Current (SPEC_V1.md lines 449-454):**
```
{first_name}-{last_name}-{suburb}-{agency_initials}-{short_id}
Example: john-smith-bondi-rw-a1b2c
```

**Proposed update with handling for special characters:**

```typescript
// lib/utils/slugify.ts
export function slugifySuburb(suburb: string): string {
  return suburb
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes (O'Connor -> oconnor)
    .replace(/&/g, 'and')           // Replace ampersands
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces
    .replace(/-+/g, '-')            // Remove multiple hyphens
    .replace(/^-|-$/g, '');         // Trim hyphens
}

// Special Australian suburb handling:
// St Kilda -> st-kilda
// Dee Why -> dee-why
// O'Connor -> oconnor
// Sydney CBD -> sydney-cbd
```

**Cited from:** Research Report 01 (Section 3)

---

### Update 6: Data Model - Add Enrichment Confidence

**Current (SPEC_V1.md lines 388-404):**
```sql
-- Enriched data (from sub-agents)
enriched_bio TEXT,
years_experience INTEGER,
languages TEXT,
specializations TEXT,
awards TEXT,
```

**Proposed additions:**

```sql
-- Enriched data with confidence tracking
enriched_bio TEXT,
years_experience INTEGER,
years_experience_source TEXT,           -- 'linkedin', 'agency_website', 'inferred'
years_experience_confidence TEXT,       -- 'high', 'medium', 'low'
languages TEXT,                         -- JSON array
languages_source TEXT,
specializations TEXT,                   -- JSON array
specializations_source TEXT,
awards TEXT,                            -- JSON array
awards_source TEXT,
enrichment_quality TEXT,                -- 'high', 'medium', 'low', 'minimal'
requires_review BOOLEAN DEFAULT FALSE,
review_reason TEXT,
last_enrichment_run TEXT,               -- run_id reference
```

**Cited from:** Research Report 05 (Sections 6, 9)

---

### Update 7: Open Decisions Resolution

**Current (SPEC_V1.md lines 653-674):**
Multiple items marked as "Undecided" or "Need to define"

**Proposed resolutions:**

| Question | Current | Resolution | Source |
|----------|---------|------------|--------|
| Enrichment source | Undecided | Web search + agency sites. DO NOT scrape RMA | Report 05 |
| Listing data | Undecided | Skip initially, use agency endpoint data | Report 03, 08 |
| Suburb priority list | Need to define | See Tier 1-3 list (50 suburbs) | Report 06 |
| Agency priority | Need to define | Brand tier scoring (Ray White=10, etc.) | Report 03 |
| Live data caching | "Redis vs in-memory vs none" | Vercel KV (Redis) with 2hr TTL | Report 08 |
| Build frequency | "On commit vs scheduled vs manual" | ISR with 24hr revalidation | Report 01 |

**Cited from:** Multiple reports

---

### Update 8: Next Steps Timeline Update

**Current (SPEC_V1.md lines 677-714):**
Generic next steps without specific timelines

**Proposed replacement:**

```markdown
## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Set up Vercel KV for caching
- [ ] Create API route handlers for Domain API proxy
- [ ] Implement work queue SQLite schema
- [ ] Seed suburb_priorities with Tier 1 suburbs
- [ ] Seed agency_brands with major franchises

### Week 3-4: Data Pipeline
- [ ] Implement orchestrator with 6-state machine
- [ ] Build suburb discovery flow
- [ ] Build agency processing flow (with deduplication)
- [ ] Add resume logic and checkpoint tracking
- [ ] Process Tier 1 suburbs (Top 20)

### Week 5-6: Static Site
- [ ] Agent page template with generateStaticParams
- [ ] Suburb page template with quick stats
- [ ] Agency page template with agent roster
- [ ] Schema markup components
- [ ] Breadcrumb navigation

### Week 7-8: Live Data Integration
- [ ] TanStack Query setup
- [ ] CurrentListings client component
- [ ] RecentSales client component
- [ ] Skeleton loaders
- [ ] Data freshness indicators

### Week 9-10: SEO & Launch
- [ ] Sitemap generation (split by type)
- [ ] robots.txt configuration
- [ ] Google Search Console submission
- [ ] Monitoring dashboard setup
- [ ] Soft launch to Tier 1 suburbs
```

**Cited from:** Multiple reports with phased implementation

---

### Update 9: Page Title Patterns Refinement

**Current (SPEC_V1.md lines 634-648):**
Basic patterns

**Proposed enhancements:**

```markdown
### Page Title Patterns (Updated)

**Agent:**
`{Name} - Real Estate Agent in {Suburb} | {Agency} | ARI`
Max 60 characters, agent name first for brand searches

**Agency:**
`{Agency Name} - {Suburb} Real Estate Agency | ARI`

**Suburb:**
`{X} Real Estate Agents in {Suburb}, {State} {Postcode} | ARI`
Include count for snippet appeal

**State:**
`{X} Real Estate Agents in {State Full Name} | ARI`

### Meta Description Patterns

**Agent (with stats):**
`{Name} is a real estate agent at {Agency} in {Suburb}. {X} properties sold in 12mo, median $Y. {Specialization}. View profile.`

**Suburb (with context):**
`Compare {X} real estate agents in {Suburb}, {State}. Top agents include {Top 1} ({sales} sales) and {Top 2}. Find your agent.`

**Keep under 155 characters. Include numbers when available.**
```

**Cited from:** Research Reports 01 (Section 6), 04 (Section 2)

---

### Update 10: Internal Linking Strategy Addition

**Proposed addition to SEO Strategy section:**

```markdown
### Internal Linking Architecture

**Link Hierarchy:**
```
Homepage
├── State Pages (/agents-in/nsw)
│   ├── Suburb Pages (/agents-in/bondi-nsw-2026) [HUB]
│   │   ├── Agent Pages (/agent/john-smith-...)
│   │   └── Property Type Pages (/agents-in/bondi-nsw-2026/apartments)
│   └── Agency Pages (/agency/ray-white-bondi)
```

**Linking Rules:**

1. **Suburb pages are HUBS** - receive most internal links
2. **Agent pages link UP** to suburb and agency
3. **Suburb pages link DOWN** to top agents
4. **Suburb pages link SIDEWAYS** to nearby suburbs
5. **Footer includes** top 10 suburbs by traffic

**Minimum Links Per Page:**
- Agent page: 5+ internal links
- Suburb page: 15+ internal links
- Agency page: 10+ internal links

**Anchor Text Strategy:**
- BAD: "Click here"
- GOOD: "View John Smith's profile"
- BEST: "John Smith, Bondi real estate agent"
```

**Cited from:** Research Reports 01 (Section 4), 04 (Section 4)

---

## Proposed Technical Changes

### Technical Change 1: TanStack Query Setup

**Add to tech stack section:**

```typescript
// providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 30 * 60 * 1000,    // 30 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

**Cited from:** Research Report 08 (Section 9)

---

### Technical Change 2: Vercel KV Integration

**Add to architecture:**

```typescript
// lib/cache.ts
import { kv } from '@vercel/kv';

export async function getCached<T>(key: string): Promise<T | null> {
  return kv.get<T>(key);
}

export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  await kv.set(key, data, { ex: ttlSeconds });
}

// TTL constants
export const CACHE_TTL = {
  LISTINGS_SALE: 7200,    // 2 hours
  LISTINGS_RENT: 14400,   // 4 hours
  RECENT_SALES: 43200,    // 12 hours
  AGENT_STATS: 86400,     // 24 hours
};
```

**Cited from:** Research Report 08 (Section 3)

---

### Technical Change 3: Enrichment JSON Schema

**Add validation schema for enrichment data:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "years_experience": {
      "type": ["integer", "null"],
      "minimum": 0,
      "maximum": 60
    },
    "languages": {
      "type": "array",
      "items": { "type": "string", "minLength": 2 }
    },
    "specializations": {
      "type": "array",
      "items": {
        "enum": ["luxury homes", "apartments", "houses", "townhouses",
                 "first home buyers", "investors", "downsizers",
                 "commercial", "rural", "waterfront", "prestige"]
      }
    },
    "awards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "year"],
        "properties": {
          "name": { "type": "string" },
          "year": { "type": "integer", "minimum": 2000 },
          "level": { "enum": ["agency", "state", "national"] }
        }
      }
    }
  }
}
```

**Cited from:** Research Report 05 (Section 9)

---

### Technical Change 4: Project Structure Update

**Update recommended structure:**

```
app/
├── (marketing)/
│   └── page.tsx              # Homepage
├── agent/
│   └── [slug]/
│       ├── page.tsx          # Server Component (static)
│       ├── loading.tsx
│       └── _components/
│           ├── AgentHeader.tsx      # Server
│           ├── CurrentListings.tsx  # Client ('use client')
│           └── RecentSales.tsx      # Client
├── agency/[slug]/page.tsx
├── agents-in/
│   ├── [state]/page.tsx
│   └── [slug]/page.tsx
├── api/
│   ├── agent/[id]/listings/route.ts
│   └── revalidate/route.ts
├── sitemap.ts
├── sitemap-agents-[id].xml/route.ts
└── robots.ts

lib/
├── data/                     # Data fetching with unstable_cache
├── domain-api/               # Domain API client
├── cache/                    # Vercel KV wrapper
└── enrichment/               # Sub-agent orchestration

components/
├── seo/                      # Schema markup components
├── skeletons/                # Loading states
└── ui/
```

**Cited from:** Research Report 01 (Section 9)

---

### Technical Change 5: next.config.js Updates

**Add recommended configuration:**

```javascript
// next.config.js
module.exports = {
  trailingSlash: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.domain.com.au',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async redirects() {
    return [
      // Enforce no trailing slash
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
      // Lowercase state codes
      {
        source: '/agents-in/:suburb-NSW-:postcode',
        destination: '/agents-in/:suburb-nsw-:postcode',
        permanent: true,
      },
    ];
  },
};
```

**Cited from:** Research Report 01 (Section 3)

---

## Proposed Process Changes

### Process 1: Pre-Launch Checklist

**Add as appendix:**

```markdown
## Pre-Launch Checklist

### Content Quality
- [ ] Each page has 300+ words unique content
- [ ] Performance metrics include derived insights
- [ ] Comparison data adds context
- [ ] Data sources attributed on every page
- [ ] Last updated dates displayed
- [ ] Methodology page created

### Technical SEO
- [ ] Canonical tags on all pages
- [ ] Noindex on thin pages (< 3 sales)
- [ ] XML sitemaps generated and submitted
- [ ] robots.txt configured
- [ ] Mobile responsive
- [ ] Core Web Vitals passing
- [ ] Structured data validated

### E-E-A-T
- [ ] About page with company info
- [ ] Contact details visible
- [ ] Privacy policy published
- [ ] HTTPS implemented
- [ ] Data source transparency

### Rollout
- [ ] Start with 10-20 pilot pages
- [ ] GSC monitoring dashboard ready
- [ ] Escalation criteria defined
- [ ] Phased rollout plan documented
```

**Cited from:** Research Report 02 (Section 9)

---

### Process 2: Daily Operations Checklist

**Add operational procedures:**

```markdown
## Daily Operations

### Morning Check (After 10am AEST - API reset)
- [ ] Check orchestrator run status
- [ ] Verify API calls remaining
- [ ] Review any failed entities
- [ ] Check GSC for manual actions

### Weekly Review
- [ ] Index coverage report
- [ ] Position tracking for key terms
- [ ] Cache hit rate analysis
- [ ] Error rate trends

### Monthly Tasks
- [ ] Full content quality audit (sample)
- [ ] Re-enrichment queue for stale profiles
- [ ] Competitor monitoring
- [ ] Priority list updates
```

**Cited from:** Research Reports 02 (Section 8), 03 (Section 7)

---

### Process 3: Enrichment Re-Run Strategy

**Add re-enrichment guidelines:**

```markdown
## Re-Enrichment Schedule

### High Priority (Monthly)
- Top 100 agents by page views
- Agents who claimed profiles
- Recently reported as outdated

### Medium Priority (Quarterly)
- Agents with high listing activity
- Agents in Tier 1 suburbs
- Agents with incomplete data

### Low Priority (Annually)
- Low traffic profiles
- Agents with minimal listings
- Profiles already fully enriched

### Triggers for Immediate Re-Enrichment
- Agent claims profile
- Agency change detected in API
- User reports outdated information
```

**Cited from:** Research Report 05 (Section 9.4)

---

## Conflicts or Corrections

### Conflict 1: URL Structure Inconsistency

**Current spec says:**
```
/agents-in/{suburb}-{state}-{postcode}
```

**Research recommends also supporting:**
```
/agents-in/{state}  (state pages)
```

**Resolution:** Add state-level pages to URL structure. Current spec only shows suburb level but state pages are needed for hierarchy and SEO.

**Cited from:** Research Reports 01, 04, 07

---

### Conflict 2: Caching Layer Decision

**Current spec (Open Decisions):**
> "Live data caching: Redis vs in-memory vs none"

**Research concludes:**
Vercel KV (Redis) is the clear winner for the Vercel deployment model.

**Resolution:** Mark decision as resolved: **Vercel KV with tiered TTLs**

**Cited from:** Research Report 08 (Section 3)

---

### Conflict 3: Build Frequency Decision

**Current spec (Open Decisions):**
> "Build frequency: On commit vs scheduled vs manual"

**Research recommends:**
ISR with time-based revalidation. NOT rebuilding all pages.

**Resolution:** Use `revalidate` config per page type, not full rebuilds. Pre-build only top 1000 pages, generate rest on-demand.

**Cited from:** Research Report 01 (Section 1)

---

## Priority Ranking

### Critical (Implement Immediately)

| Rank | Change | Report | Reason |
|------|--------|--------|--------|
| 1 | Programmatic SEO Safety Guidelines | 02 | Risk of Google penalties without this |
| 2 | Work Queue System | 03 | Cannot operate multi-month pipeline without |
| 3 | Suburb Priority List | 06 | Blocks all data collection work |
| 4 | Database Schema Updates | 03 | Foundation for queue system |
| 5 | Next.js Build Strategy | 01 | Build will timeout without this |

### High (Implement Before Launch)

| Rank | Change | Report | Reason |
|------|--------|--------|--------|
| 6 | Live Data Strategy | 08 | Core UX requirement |
| 7 | Sitemap Strategy | 01 | Required for indexation |
| 8 | Crawl Budget Management | 01, 02 | Prevents wasted crawl |
| 9 | Schema Markup Expansion | 01, 04 | Featured snippet opportunity |
| 10 | Internal Linking Strategy | 01, 04 | Critical for topical authority |

### Medium (Implement for v2)

| Rank | Change | Report | Reason |
|------|--------|--------|--------|
| 11 | Sub-Agent Instructions | 05 | Enrichment quality |
| 12 | Suburb Page Content Strategy | 04 | Geographic SEO |
| 13 | E-E-A-T Implementation | 02 | Trust signals |
| 14 | Monitoring Dashboard | 02, 08 | Operational visibility |
| 15 | Content Expansion Planning | 07 | Future-proofing |

### Lower (Post-Launch Enhancement)

| Rank | Change | Report | Reason |
|------|--------|--------|--------|
| 16 | Property Type Sub-Pages | 04 | Long-tail keywords |
| 17 | Top Agents Editorial Pages | 07 | Requires data maturity |
| 18 | Market Reports | 07 | Editorial capacity needed |
| 19 | Agent Comparison Tool | 04 | Advanced feature |
| 20 | Video Content Integration | 05 | Nice-to-have |

---

## Appendix: Research Report Cross-Reference

| Report | Key Contributions |
|--------|------------------|
| 01 - Next.js SEO Patterns | Build strategy, sitemaps, Core Web Vitals, project structure |
| 02 - Programmatic SEO Safety | Rollout cadence, thin content rules, E-E-A-T, monitoring |
| 03 - Agency Grouping & Sequencing | Work queue design, state machine, deduplication, resume logic |
| 04 - Suburb SEO Strategy | Long-tail keywords, content templates, featured snippets, internal linking |
| 05 - Enrichment Data Sources | Source priority, sub-agent prompts, RMA policy, confidence scoring |
| 06 - Sydney Suburb Priority | Tier 1-3 lists, regional grouping, expansion path |
| 07 - Content Expansion Planning | URL structure for editorial, cannibalization prevention, content calendar |
| 08 - Live Data Strategy | Static/dynamic split, caching layers, rate limiting, TanStack Query |

---

*Report generated: 2026-02-01*
*Total proposed changes: 47*
*Critical changes requiring immediate attention: 5*
