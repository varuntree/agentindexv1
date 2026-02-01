# ARI (Australian Real Estate Agents Index) — Technical Specification v1

**Status:** Work in Progress
**Last Updated:** 2026-01-31
**Session:** Initial exploration and architecture design

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Domain.com.au API Analysis](#domaincomau-api-analysis)
4. [Rate My Agent Competitive Analysis](#rate-my-agent-competitive-analysis)
5. [Data Model](#data-model)
6. [Agent Orchestration System](#agent-orchestration-system)
7. [SEO Strategy](#seo-strategy)
8. [Open Decisions](#open-decisions)
9. [Next Steps](#next-steps)

---

## Project Overview

### Goal
Build a neutral, public index of Australian real estate agents that:
1. Generates SEO traffic for agent name, location, and agency searches
2. Provides richer data than competitors (Rate My Agent, OpenAgent, etc.)
3. Uses Domain.com.au API for live data + Claude Agent SDK for enrichment

### Primary Focus (Validated)
- **SEO traffic first** — validate that we can rank for agent-related searches
- **Templated content** — scalable page generation, not unique AI-written content per agent
- **Static generation** — Next.js with pre-built pages for SEO

### Key Decisions Made
| Decision | Choice |
|----------|--------|
| Primary goal | SEO traffic validation |
| Data source | Need to scrape/build pipeline |
| Target queries | Agent names, locations, agencies (all) |
| Tech stack | Next.js with static generation |
| Database | SQLite for tracking/state |
| Domain API | Have access |
| Initial focus | Major suburbs first |
| API budget | Stay on free tier (500 calls/day) |

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│                                                                 │
│  • Checks SQLite index for last completed work                  │
│  • Accepts user input (suburb/agency override) OR               │
│  • Auto-selects next suburb/agency in sequence                  │
│  • Delegates to sub-agents for enrichment                       │
│  • Runs as cron job (nightly)                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              DOMAIN API (One-time bulk fetch per suburb)        │
│                                                                 │
│  • GET /v1/agencies?q=suburbId:{id} → List agencies in suburb   │
│  • GET /v1/agencies/{id} → Agency details + agents array        │
│  • GET /v1/agents/{id} → Full agent profile                     │
│  • Store agent IDs in SQLite as "queue" to process              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUB-AGENTS (parallel)                        │
│                                                                 │
│  Each sub-agent (Claude Agent SDK):                             │
│  • Takes N agents from queue                                    │
│  • Enriches data (web search, agency site, LinkedIn, etc.)      │
│  • Generates page content following schema                      │
│  • Writes enriched data to SQLite                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STATIC SITE (Next.js)                       │
│                                                                 │
│  Page Types:                                                    │
│  • /agent/[slug]           → Individual agent profiles          │
│  • /agency/[slug]          → Agency pages with agent roster     │
│  • /agents-in/[suburb]     → Location-based agent listings      │
│                                                                 │
│  Built from SQLite data → deployed to Vercel                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     LIVE DATA LAYER                             │
│                                                                 │
│  When user visits page (client-side):                           │
│  • Domain API → current listings, recent transactions           │
│  • Fresh data overlaid on static SEO content                    │
│  • Only for dynamic data (listings change, stats don't)         │
└─────────────────────────────────────────────────────────────────┘
```

### Sequencing Logic

The orchestrator follows this sequence:
1. **Select Suburb** — From priority list or user input
2. **Select Agency** — High-value agencies first (Ray White, LJ Hooker, etc.)
3. **Fetch Agents** — All agents for that agency in that suburb
4. **Enrich Profiles** — Sub-agents research each agent
5. **Generate Pages** — Write to SQLite, trigger static build
6. **Track Progress** — Mark suburb/agency/agents as complete

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
Returns:
```json
{
  "id": 0,
  "name": "string",
  "profile": {
    "agencyLogoStandard": "string",
    "agencyWebsite": "string",
    "agencyDescription": "string",
    "mapLatitude": "string",
    "mapLongitude": "string"
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

#### 3. Get Full Agent Profile
```
GET /v1/agents/{id}
```
Returns:
```json
{
  "agentId": 0,
  "agencyId": 0,
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "mobile": "string",
  "phone": "string",
  "fax": "string",
  "photo": "string",
  "mugShotURL": "string",
  "profileText": "string",
  "jobPosition": "string",
  "facebookUrl": "string",
  "twitterUrl": "string",
  "linkedInUrl": "string",
  "googlePlusUrl": "string",
  "personalWebsiteUrl": "string",
  "agentVideo": "string",
  "profileUrl": "string",
  "saleActive": true,
  "rentalActive": true,
  "isActiveProfilePage": "string",
  "receivesRequests": true
}
```

#### 4. Get Agent's Listings
```
GET /v1/agents/{id}/listings?includedArchivedListings=true
```
Returns current and past listings with:
- Property address, type, bedrooms, bathrooms
- Price details (if disclosed)
- Sale/lease status and dates
- Media (photos)

#### 5. Search Agents by Name
```
GET /v1/agents/search?query={name}
```
- Max 20 results per page
- Returns: agentId, name, agencyName, suburb, state, profileUrl, thumbnail

#### 6. Weekly Sales Results (Discovery)
```
GET /v1/salesResults/{city}/listings
```
- City: Sydney, Melbourne, Brisbane, etc.
- Returns recent sold properties with agent/agency info
- Useful for discovering active agents

### API Budget Strategy (500 calls/day)

**Per Suburb Breakdown:**
| Operation | Calls | Notes |
|-----------|-------|-------|
| Search agencies in suburb | 1-5 | Paginated if many |
| Get agency details | ~10 | Per agency |
| Get agent profiles | ~50 | Per agent |
| Get agent listings | ~50 | Per agent |
| **Total per suburb** | **~115** | Rough estimate |

**Daily Capacity:** ~4 suburbs/day at this rate

**Optimization Options:**
1. Skip listing fetch initially (just get agent profiles)
2. Use agency endpoint (includes basic agent data) instead of individual agent calls
3. Batch suburbs by shared agencies

---

## Rate My Agent Competitive Analysis

### What They Show (our baseline to match)

#### Agent Profile Data
| Field | Source | Our Approach |
|-------|--------|--------------|
| Name | Domain API | ✅ Available |
| Photo | Domain API | ✅ Available |
| Agency name/logo | Domain API | ✅ Available |
| Phone/Email | Domain API | ✅ Available |
| Bio/Profile text | Domain API | ✅ Available |
| Social links | Domain API | ✅ Partial (FB, Twitter, LinkedIn) |
| Job position | Domain API | ✅ Available |
| Star rating | Reviews | ❌ Not available (they collect reviews) |
| Review count | Reviews | ❌ Not available |
| Properties sold (12mo) | Domain API listings | ✅ Can calculate from listings |
| Average sale price | Domain API listings | ✅ Can calculate |
| Median days on market | Domain API listings | ✅ Can calculate |
| Awards/badges | Their system | ❌ Their proprietary data |

#### Their URL Structure
```
/real-estate-profile/sales/{suburb}-{state}-{postcode}/agents  → Suburb listing
/real-estate-agent/{name-id}/sales/reviews                     → Agent profile
/real-estate-agency/{name-id}/sales/overview                   → Agency page
```

#### Their SEO Elements
- Schema: RealEstateAgent, LocalBusiness, AggregateRating
- Breadcrumbs: State → City → Suburb → Agent
- Clean URLs with location + postcode
- Verified review content (unique, constantly updated)

### Where We Can EXCEED Rate My Agent

#### Data They DON'T Show (Our Opportunity)
| Gap | Our Advantage |
|-----|---------------|
| Response time metrics | Could track via contact forms |
| Success rate (list → sale) | Calculate from Domain API |
| Price accuracy (asked vs sold) | Calculate from Domain API |
| Commission rates | Research/transparency opportunity |
| Marketing strategy | Research what agents advertise |
| Team structure | Research agency sites |
| Years of experience | Research/LinkedIn |
| Languages spoken | Research/enrichment |
| Video introductions | Encourage agents to add |
| Detailed property type breakdown | From Domain API |

#### UX Improvements Over RMA
- Better filtering (by property type, price range, experience)
- Comparison tools with visual charts
- Calendar booking integration
- Response time indicators
- No review paywall

---

## Data Model

### SQLite Schema

```sql
-- Tracking tables for orchestrator state
CREATE TABLE scrape_progress (
    id INTEGER PRIMARY KEY,
    suburb_id TEXT NOT NULL,
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, complete, failed
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT
);

CREATE TABLE agency_progress (
    id INTEGER PRIMARY KEY,
    domain_agency_id INTEGER NOT NULL,
    suburb_id TEXT NOT NULL,
    agency_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    agents_total INTEGER DEFAULT 0,
    agents_processed INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME
);

-- Core data tables
CREATE TABLE agencies (
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
    languages TEXT, -- JSON array
    specializations TEXT, -- JSON array
    awards TEXT, -- JSON array

    -- Calculated stats (from listings)
    properties_sold_12mo INTEGER,
    avg_sale_price_12mo REAL,
    median_days_on_market INTEGER,
    total_sales_value_12mo REAL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enriched_at DATETIME
);

CREATE TABLE agent_suburbs (
    agent_id INTEGER REFERENCES agents(id),
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    properties_sold INTEGER DEFAULT 0,
    PRIMARY KEY (agent_id, suburb, state)
);

CREATE TABLE listings (
    id INTEGER PRIMARY KEY,
    domain_listing_id INTEGER UNIQUE NOT NULL,
    agent_id INTEGER REFERENCES agents(id),
    agency_id INTEGER REFERENCES agencies(id),
    property_type TEXT,
    address TEXT,
    suburb TEXT,
    state TEXT,
    postcode TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    carspaces INTEGER,
    land_area_sqm REAL,
    building_area_sqm REAL,
    listing_type TEXT, -- sale, rent
    status TEXT, -- live, sold, leased, archived
    list_price REAL,
    sold_price REAL,
    listed_date DATE,
    sold_date DATE,
    days_on_market INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_agents_suburb ON agent_suburbs(suburb, state);
CREATE INDEX idx_agents_agency ON agents(agency_id);
CREATE INDEX idx_listings_agent ON listings(agent_id);
CREATE INDEX idx_listings_suburb ON listings(suburb, state);
CREATE INDEX idx_scrape_progress_status ON scrape_progress(status);
```

### Agent Slug Generation
```
{first_name}-{last_name}-{suburb}-{agency_initials}-{short_id}
Example: john-smith-bondi-rw-a1b2c
```

---

## Agent Orchestration System

### Claude Agent SDK v2 Pattern

```typescript
import { unstable_v2_createSession } from '@anthropic-ai/claude-agent-sdk';

// Main orchestrator
async function orchestrator() {
  // 1. Check SQLite for next work item
  const nextSuburb = await db.getNextPendingSuburb();
  if (!nextSuburb) {
    console.log('All suburbs processed');
    return;
  }

  // 2. Mark as in progress
  await db.updateSuburbStatus(nextSuburb.id, 'in_progress');

  // 3. Fetch agencies from Domain API
  const agencies = await domainApi.searchAgencies(nextSuburb.suburbId);

  // 4. For each agency, fetch and enrich agents
  for (const agency of agencies) {
    await processAgency(agency, nextSuburb);
  }

  // 5. Mark complete
  await db.updateSuburbStatus(nextSuburb.id, 'complete');
}

async function processAgency(agency, suburb) {
  // Get full agency details (includes agent list)
  const agencyDetails = await domainApi.getAgency(agency.id);

  // Store agency
  await db.upsertAgency(agencyDetails);

  // Process agents in parallel batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < agencyDetails.agents.length; i += BATCH_SIZE) {
    const batch = agencyDetails.agents.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(agent => enrichAgent(agent, agency)));
  }
}

async function enrichAgent(agentBasic, agency) {
  // Get full agent profile from Domain API
  const agentFull = await domainApi.getAgent(agentBasic.id);

  // Store basic data
  await db.upsertAgent(agentFull, agency.id);

  // Spawn enrichment sub-agent
  await using session = unstable_v2_createSession({
    model: 'claude-sonnet-4-5-20250929',
    allowedTools: ['WebSearch', 'WebFetch']
  });

  await session.send(`
    Research this real estate agent and find additional information:

    Name: ${agentFull.firstName} ${agentFull.lastName}
    Agency: ${agency.name}
    Location: ${agency.suburb}, ${agency.state}
    LinkedIn: ${agentFull.linkedInUrl || 'not provided'}
    Website: ${agentFull.personalWebsiteUrl || 'not provided'}

    Find:
    1. Years of experience in real estate
    2. Languages spoken
    3. Specializations (luxury, first-time buyers, investors, etc.)
    4. Any awards or recognition
    5. Additional bio information not in their profile

    Return as JSON:
    {
      "years_experience": number or null,
      "languages": ["English", ...],
      "specializations": ["luxury homes", ...],
      "awards": ["2024 Top Agent", ...],
      "additional_bio": "string or null"
    }
  `);

  for await (const msg of session.stream()) {
    if (msg.type === 'result') {
      const enrichedData = JSON.parse(msg.result);
      await db.updateAgentEnrichment(agentFull.id, enrichedData);
    }
  }
}
```

### Subagent Configuration

```typescript
const enrichmentAgentConfig = {
  description: 'Enriches real estate agent profiles with web research',
  prompt: `You are a research specialist for real estate agent profiles.
Your job is to find additional information about agents beyond what's in their official profile.

Focus on:
- Professional background and experience
- Languages and cultural expertise
- Property type specializations
- Awards and industry recognition
- Community involvement

Always return structured JSON. If you can't find information, use null.
Never make up information - only report what you find.`,
  tools: ['WebSearch', 'WebFetch'],
  model: 'sonnet'
};
```

### Cron Job Setup

```bash
# Run nightly at 2am AEST
0 2 * * * cd /path/to/project && npx ts-node orchestrator.ts >> logs/orchestrator.log 2>&1
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

# Location pages
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026

# State pages
/agents-in/{state}
Example: /agents-in/nsw

# Property type + location
/agents-in/{suburb}-{state}-{postcode}/{property-type}
Example: /agents-in/bondi-nsw-2026/apartments
```

### Schema Markup

```json
// Agent page schema
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "John Smith",
  "image": "https://...",
  "jobTitle": "Senior Sales Agent",
  "worksFor": {
    "@type": "RealEstateAgent",
    "name": "Ray White Bondi Beach"
  },
  "areaServed": {
    "@type": "Place",
    "name": "Bondi, NSW"
  },
  "telephone": "+61...",
  "email": "...",
  "url": "https://ari.com.au/agent/john-smith-bondi-rw-a1b2c"
}
```

### Page Title Patterns

```
Agent: {Name} - Real Estate Agent in {Suburb} | {Agency} | ARI
Agency: {Agency Name} - Real Estate Agency in {Suburb} | ARI
Location: Real Estate Agents in {Suburb}, {State} {Postcode} | ARI
```

### Meta Description Patterns

```
Agent: {Name} is a licensed real estate agent at {Agency} in {Suburb}.
       {X} properties sold in the last 12 months. View profile and contact details.

Location: Find {X} real estate agents in {Suburb}, {State}. Compare agents by
          sales history, specializations, and experience. Free, neutral index.
```

---

## Open Decisions

### Needs Resolution

| Question | Options | Notes |
|----------|---------|-------|
| API budget strategy | Stay free (500/day) vs paid | Currently: stay free |
| Agency discovery | Pre-build suburb list vs sales results | Currently: major suburbs first |
| Enrichment source | Scrape RMA vs web search only vs both | **Undecided** |
| Listing data | Fetch per agent vs skip initially | **Undecided** |
| Suburb priority list | Which suburbs first? | **Need to define** |
| Agency priority | Which agencies in each suburb first? | **Need to define** |

### Technical Decisions Pending

| Question | Options | Notes |
|----------|---------|-------|
| Hosting | Vercel vs other | Likely Vercel for Next.js |
| Domain name | TBD | Need to register |
| Live data caching | Redis vs in-memory vs none | For Domain API calls on page view |
| Build frequency | On commit vs scheduled vs manual | Need CI/CD setup |

---

## Next Steps

### Immediate (Next Session)

1. **Resolve open decisions:**
   - Enrichment source (RMA scraping vs web search)
   - Listing data strategy
   - Define suburb priority list

2. **Build suburb/agency priority list:**
   - Identify top 20 suburbs by search volume (use Semrush)
   - Identify top agencies per suburb

3. **Prototype Domain API integration:**
   - Test authentication flow
   - Validate data structure assumptions
   - Measure actual API calls needed per suburb

### Short-term

4. **Build SQLite schema and migrations**
5. **Build orchestrator MVP:**
   - Single suburb processing
   - Basic agent profile storage
   - Simple enrichment (no sub-agents yet)

6. **Build Next.js static site:**
   - Agent page template
   - Agency page template
   - Suburb page template

### Medium-term

7. **Add sub-agent enrichment**
8. **Add live data layer (Domain API on page view)**
9. **SEO optimization and schema markup**
10. **Deploy and submit to Google Search Console**

---

## Appendix

### Session Context

This spec was created during an exploration session on 2026-01-31. The following sub-agents were deployed to gather information:

1. **Domain API Schema Mapping (x3)** — Mapped all endpoints, auth, rate limits
2. **Rate My Agent Analysis (x3)** — Analyzed data fields, SEO structure, gaps
3. **Claude Agent SDK v2 Docs (x3)** — Explored patterns for orchestrator system

### Key Resources

- Domain API Docs: https://developer.domain.com.au/docs/latest/apis/
- Rate My Agent: https://www.ratemyagent.com.au
- Claude Agent SDK v2: https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview
- Original PRD: `/Users/varunprasad/Desktop/voqo/agentindexv1/prd.md`

### Team References

- @Siddhant Saini — Agent list source (from PRD)
- @Claire McMahon — Design direction (from PRD)
