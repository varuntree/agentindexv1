# ARI (Australian Real Estate Agents Index) — Technical Specification v3

**Status:** Ready for Implementation
**Last Updated:** 2026-02-01
**Version:** 3.0 (Complete architecture with Claude Agent SDK integration)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [V1 Scope (What We're Building)](#v1-scope-what-were-building)
3. [V2 Scope (Deferred Features)](#v2-scope-deferred-features)
4. [Two-Application Architecture](#two-application-architecture)
5. [Data Schemas](#data-schemas)
6. [Claude Agent SDK - Discovery Skill](#claude-agent-sdk---discovery-skill)
7. [Claude Agent SDK - Enrichment Skill](#claude-agent-sdk---enrichment-skill)
8. [Data Pipeline Flow](#data-pipeline-flow)
9. [Sequencing & Selection Logic](#sequencing--selection-logic)
10. [Control Center UI](#control-center-ui)
11. [Next.js SEO Site](#nextjs-seo-site)
12. [Page Content Structure](#page-content-structure)
13. [Vercel Deploy Hook Integration](#vercel-deploy-hook-integration)
14. [SEO Strategy](#seo-strategy)
15. [Sydney Suburb Priority List](#sydney-suburb-priority-list)
16. [Safe Rollout Strategy](#safe-rollout-strategy)
17. [Implementation Roadmap](#implementation-roadmap)
18. [Appendix](#appendix)

---

## Project Overview

### Goal

Build a neutral, public index of Australian real estate agents that:
1. Generates SEO traffic for agent name, location, and agency searches
2. Provides richer data than competitors (Rate My Agent, OpenAgent, etc.)
3. Uses Claude Agent SDK for discovery and enrichment via web research

### Core Hypothesis

Individual agents will discover or respond to neutral, third-party profile pages about themselves, generating professional-intent organic traffic.

### What ARI Is

- ✅ A neutral, public index of licensed real estate professionals
- ✅ SEO-first static pages for agent discovery
- ✅ Enriched profiles with years of experience, languages, specializations
- ✅ Free, non-biased, transparent

### What ARI Is NOT

- ❌ Not a marketplace
- ❌ Not a listings portal
- ❌ Not pay-to-rank
- ❌ Not endorsement or lead resale

---

## V1 Scope (What We're Building)

### Included in V1

| Feature | Description |
|---------|-------------|
| **Data Collection** | Claude Discovery Skill → agencies → agents (basic data via web research) |
| **Enrichment** | Claude Enrichment Skill → years experience, languages, specializations, awards, enriched bio |
| **Static Pages** | Agent profiles, Agency pages, Suburb listings, State listings |
| **Control Center** | Node.js app with UI to manage data pipeline |
| **Deployment** | Vercel Deploy Hook to trigger static builds |
| **SEO** | Schema markup, sitemaps, meta tags, internal linking |

### V1 Data Sources

| Source | What We Get |
|--------|-------------|
| Claude Discovery Skill (web research) | List of agencies in a suburb via agency websites, Domain.com.au website, LinkedIn |
| Claude Discovery Skill (sub-agents) | Agency details + agent roster via agency team pages |
| Claude Enrichment Skill (web research) | Enriched data: experience, languages, specializations, awards, bio |

### V1 Page Types

| Page | URL Pattern | Content |
|------|-------------|---------|
| Agent Profile | `/agent/{slug}` | Full agent details + enriched data |
| Agency Page | `/agency/{slug}` | Agency info + agent roster |
| Suburb Listing | `/agents-in/{suburb}-{state}-{postcode}` | All agents in suburb |
| State Listing | `/agents-in/{state}` | All suburbs in state |

---

## V2 Scope (Deferred Features)

**These features are explicitly NOT in V1. Do not implement.**

| Feature | Why Deferred |
|---------|--------------|
| Live listings data | Requires `/agents/{id}/listings` API calls (expensive) |
| Individual agent API calls | `/agents/{id}` skipped; use agency-embedded data |
| Properties sold stats | Requires listing data |
| Average sale price | Requires listing data |
| Days on market | Requires listing data |
| Review collection | Requires user system |
| Agent claiming | Requires auth system |
| ISR (Incremental Static Regeneration) | Pure SSG is simpler for V1 |
| Vercel KV caching | Not needed without live data |
| Property type sub-pages | `/agents-in/{suburb}/apartments` - wait for threshold data |
| Editorial content | `/insights/`, `/top-agents/` - Phase 2 |
| Brisbane/Melbourne expansion | Sydney first |

---

## Two-Application Architecture

ARI consists of **two separate applications** that work together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   APPLICATION 1: CONTROL CENTER (Node.js)                                    │
│   ─────────────────────────────────────────                                  │
│   Location: Local machine or private server                                  │
│   Purpose: Data pipeline management                                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         FRONTEND UI                                  │   │
│   │                                                                      │   │
│   │  • Suburb list with status indicators                               │   │
│   │  • Agency selection within suburbs                                  │   │
│   │  • Manual trigger buttons                                           │   │
│   │  • Real-time streaming logs                                         │   │
│   │  • Progress visualization                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      BACKEND SERVICES                                │   │
│   │                                                                      │   │
│   │  ┌─────────────────────────────────┐  ┌─────────────────────────┐  │   │
│   │  │  Claude Agent SDK               │  │  SQLite Database        │  │   │
│   │  │                                 │  │                         │  │   │
│   │  │  ┌─────────────────────────┐   │  │  • agencies             │  │   │
│   │  │  │ DISCOVERY SKILL (1)    │   │  │  • agents               │  │   │
│   │  │  │ • Find agencies        │   │  │  • scrape_progress      │  │   │
│   │  │  │ • Find agents          │   │  │  • agency_progress      │  │   │
│   │  │  │ • Web research         │   │  │                         │  │   │
│   │  │  └─────────────────────────┘   │  │                         │  │   │
│   │  │  ┌─────────────────────────┐   │  │                         │  │   │
│   │  │  │ ENRICHMENT SKILL (2)   │   │  │                         │  │   │
│   │  │  │ • Enhance profiles     │   │  │                         │  │   │
│   │  │  │ • LinkedIn, awards     │   │  │                         │  │   │
│   │  │  │ • Deep research        │   │  │                         │  │   │
│   │  │  └─────────────────────────┘   │  │                         │  │   │
│   │  └─────────────────────────────────┘  └─────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ Trigger via Vercel Deploy Hook         │
│                                     ▼                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   APPLICATION 2: SEO SITE (Next.js)                                          │
│   ─────────────────────────────────                                          │
│   Location: Vercel                                                           │
│   Purpose: Static SEO pages                                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         BUILD PROCESS                                │   │
│   │                                                                      │   │
│   │  1. Read SQLite database                                            │   │
│   │  2. generateStaticParams() returns all slugs                        │   │
│   │  3. Build static HTML for each page                                 │   │
│   │  4. Deploy to Vercel CDN                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         STATIC PAGES                                 │   │
│   │                                                                      │   │
│   │  • /agent/{slug}           → Agent profiles                         │   │
│   │  • /agency/{slug}          → Agency pages                           │   │
│   │  • /agents-in/{suburb}     → Suburb listings                        │   │
│   │  • /agents-in/{state}      → State listings                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Two Applications?

| Concern | Control Center (Node.js) | SEO Site (Next.js) |
|---------|--------------------------|-------------------|
| **Purpose** | Data pipeline, discovery, enrichment | Public SEO pages |
| **Runs** | On-demand, locally/server | Continuous on Vercel |
| **Database** | Read/Write | Read-only at build |
| **Claude SDK** | Yes (Discovery + Enrichment skills) | No |
| **User-facing** | Admin only | Public |

### Data Flow Between Applications

```
Control Center                              SEO Site
─────────────────                          ─────────
     │                                          │
     │  1. Run Claude Discovery Skill           │
     │     (find agencies & agents via web)     │
     │  2. Store in SQLite                      │
     │  3. Run Claude Enrichment Skill          │
     │     (enhance profiles via web research)  │
     │  4. Update SQLite                        │
     │                                          │
     │──── SQLite database file ────────────────│
     │     (shared or copied)                   │
     │                                          │
     │  5. Trigger Vercel Deploy Hook ──────────│
     │                                          │
     │                                     6. Build reads SQLite
     │                                     7. Generate static pages
     │                                     8. Deploy to CDN
```

---

## Data Schemas

### Agent Schema (SQLite + TypeScript)

```sql
CREATE TABLE agents (
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
    profile_text TEXT,                    -- Original bio from source website

    -- Location (from agency)
    primary_suburb TEXT,
    primary_state TEXT,
    primary_postcode TEXT,

    -- Enriched data (from Claude sub-agents)
    enriched_bio TEXT,                    -- AI-generated richer description
    years_experience INTEGER,
    years_experience_source TEXT,         -- 'linkedin', 'agency_website', 'inferred'
    career_start_year INTEGER,
    languages TEXT,                       -- JSON array: ["English", "Mandarin"]
    specializations TEXT,                 -- JSON array: ["Luxury Homes", "Apartments"]
    property_types TEXT,                  -- JSON array: ["House", "Apartment"]
    awards TEXT,                          -- JSON array: [{"name": "...", "year": 2024, "level": "state"}]

    -- Social links (from enrichment)
    linkedin_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    personal_website_url TEXT,
    domain_profile_url TEXT,

    -- Enrichment tracking
    enrichment_status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'complete', 'failed', 'skipped'
    enrichment_quality TEXT,              -- 'high', 'medium', 'low', 'minimal'

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_fetched_at DATETIME,
    enriched_at DATETIME
);
```

```typescript
// TypeScript interface for application code
interface Agent {
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
  languages: string[];
  specializations: string[];
  property_types: string[];
  awards: Award[];

  // Social links
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  personal_website_url: string | null;
  domain_profile_url: string | null;

  // Enrichment tracking
  enrichment_status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';
  enrichment_quality: 'high' | 'medium' | 'low' | 'minimal' | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  api_fetched_at: string;
  enriched_at: string | null;

  // Denormalized for display (joined from agencies)
  agency_name?: string;
  agency_slug?: string;
}

interface Award {
  name: string;
  year: number | null;
  level: 'agency' | 'regional' | 'state' | 'national' | null;
  organization: string | null;
}
```

### Agency Schema

```sql
CREATE TABLE agencies (
    -- Identifiers
    id INTEGER PRIMARY KEY,
    domain_id INTEGER UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Basic info (from Discovery Skill)
    name TEXT NOT NULL,
    brand_name TEXT,                      -- "Ray White" for tier lookup
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
```

```typescript
interface Agency {
  id: number;
  domain_id: number;
  slug: string;

  name: string;
  brand_name: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;

  phone: string | null;
  email: string | null;

  street_address: string | null;
  suburb: string;
  state: string;
  postcode: string;

  principal_name: string | null;
  agent_count: number;

  properties_for_sale: number | null;
  properties_for_rent: number | null;

  created_at: string;
  updated_at: string;
  api_fetched_at: string;
}
```

### Suburb Schema (For Tracking Progress)

```sql
CREATE TABLE scrape_progress (
    id INTEGER PRIMARY KEY,
    suburb_id TEXT NOT NULL UNIQUE,       -- Suburb identifier
    suburb_name TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT,
    slug TEXT NOT NULL,                   -- "bondi-beach-nsw-2026"

    -- Priority
    priority_tier INTEGER DEFAULT 3,      -- 1=highest, 3=lowest
    region TEXT,                          -- "Eastern Suburbs", "North Shore"

    -- Progress tracking
    status TEXT DEFAULT 'pending',
        -- 'pending', 'in_progress', 'discovered', 'complete', 'failed', 'abandoned'
    agencies_found INTEGER DEFAULT 0,
    agents_found INTEGER DEFAULT 0,

    -- Timestamps
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);
```

### Sub-Agent Output Schema (What Claude Returns)

```typescript
// This is the structured JSON that each sub-agent returns
interface SubAgentOutput {
  batch_id: string;
  processed_at: string;
  agents: EnrichedAgentData[];
  summary: {
    total_processed: number;
    successful: number;
    partial: number;
    failed: number;
  };
}

interface EnrichedAgentData {
  // Identifier to match with our DB
  agent_domain_id: number;

  // Enriched fields
  enriched_bio: string | null;            // AI-written description based on findings
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
  sources_found: string[];                // ["linkedin", "agency_website"]

  // Status
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
}
```

---

## Claude Agent SDK - Discovery Skill

### Overview

The Discovery Skill is the **first of two Claude Agent SDK skills** in the ARI pipeline. It discovers real estate agencies and their agents through web research.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISCOVERY PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: Suburb name + state (e.g., "Mosman, NSW")               │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MAIN AGENT                              │  │
│  │  • Search for agencies in suburb                          │  │
│  │  • Pre-check each against database (avoid duplicates)     │  │
│  │  • Spawn sub-agent for each NEW agency                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ SUB-AGENT 1 │  │ SUB-AGENT 2 │  │ SUB-AGENT 3 │  ...        │
│  │ Agency A    │  │ Agency B    │  │ Agency C    │             │
│  │ Find agents │  │ Find agents │  │ Find agents │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Output: Agencies + Agents stored in SQLite                     │
│          (enrichment_status = 'pending')                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources (Priority Order)

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | Agency brand website | Team pages (raywhite.com.au, etc.) |
| 2 | Domain.com.au website | Agency profiles (not API) |
| 3 | LinkedIn | Company pages and agent profiles |
| 4 | Google search | Fallback discovery |

### What Discovery Finds

| Data | Source |
|------|--------|
| Agency name | Website, Google |
| Agency website | Direct search |
| Agency contact | Website |
| Agent names | Team pages |
| Agent photos | Team pages |
| Agent contact | Team pages, LinkedIn |
| Basic bio | Team pages |

### Cost Estimates

| Operation | Est. Cost |
|-----------|-----------|
| Main agent (per suburb) | ~$0.03 |
| Sub-agent (per agency) | ~$0.05 |
| **Per suburb (10 agencies)** | ~$0.50-0.80 |
| **Daily budget ($10)** | ~12-16 suburbs |

---

## Claude Agent SDK - Enrichment Skill

### Overview

The Control Center uses Claude Agent SDK to enrich agent profiles with additional data beyond what Discovery provides.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENRICHMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: Batch of 20-50 agents from SQLite                       │
│         (enrichment_status = 'pending')                          │
│                                                                  │
│                          ▼                                       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MAIN AGENT                              │  │
│  │                                                            │  │
│  │  Role: Orchestrator                                        │  │
│  │  Model: Claude Sonnet                                      │  │
│  │  Tools: Task (to spawn sub-agents)                         │  │
│  │                                                            │  │
│  │  Responsibilities:                                         │  │
│  │  • Receive batch of agents                                 │  │
│  │  • Divide into groups of 5-10                              │  │
│  │  • Spawn sub-agents in parallel                            │  │
│  │  • Collect and validate results                            │  │
│  │  • Return consolidated output                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ SUB-AGENT 1 │  │ SUB-AGENT 2 │  │ SUB-AGENT 3 │  ...        │
│  │             │  │             │  │             │             │
│  │ 5-10 agents │  │ 5-10 agents │  │ 5-10 agents │             │
│  │             │  │             │  │             │             │
│  │ Tools:      │  │ Tools:      │  │ Tools:      │             │
│  │ • WebSearch │  │ • WebSearch │  │ • WebSearch │             │
│  │ • WebFetch  │  │ • WebFetch  │  │ • WebFetch  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                       │
│                                                                  │
│  Output: Structured JSON (SubAgentOutput)                       │
│          Written to SQLite                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sub-Agent Definition

```typescript
import { query, ClaudeAgentOptions, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

const enrichmentAgent: AgentDefinition = {
  description: 'Research real estate agent profiles to find experience, languages, specializations, and awards',
  prompt: `You are a research specialist for real estate agent profiles.

For each agent provided, research and find:

1. **Years of Experience**
   - Check LinkedIn employment history
   - Look for "X years in real estate" on agency website
   - Calculate from earliest real estate role

2. **Languages Spoken**
   - ONLY include languages explicitly stated
   - Check LinkedIn skills section
   - Check agency website bio
   - DO NOT assume based on name

3. **Specializations**
   - Property types: luxury, apartments, houses, commercial
   - Buyer types: first home buyers, investors, downsizers
   - Area specializations: waterfront, prestige, rural

4. **Awards & Recognition**
   - Check REIA state awards
   - Check agency awards in bio
   - Verify year and level

5. **Enriched Bio**
   - Write a 2-3 sentence description incorporating your findings
   - Professional tone, factual
   - Mention key differentiators found

6. **Social Links**
   - LinkedIn URL if found
   - Facebook/Instagram business pages
   - Personal website

## Critical Rules
- DO NOT make up information - use null if not found
- DO NOT scrape Rate My Agent
- DO NOT assume languages based on names
- If conflicting data, prefer LinkedIn over other sources

## Output Format
Return valid JSON matching the SubAgentOutput schema.`,
  tools: ['WebSearch', 'WebFetch'],
  model: 'sonnet'
};
```

### Main Agent Orchestration

```typescript
async function runEnrichmentBatch(agents: Agent[]): Promise<SubAgentOutput> {
  const batchId = crypto.randomUUID();

  // Prepare agent data for the prompt
  const agentPrompts = agents.map(a => ({
    domain_id: a.domain_id,
    name: `${a.first_name} ${a.last_name}`,
    agency: a.agency_name,
    suburb: a.primary_suburb,
    state: a.primary_state,
    existing_bio: a.profile_text,
    agency_website: a.agency_website
  }));

  const prompt = `
Enrich the following ${agents.length} real estate agents.

Divide them among sub-agents (5-10 agents each) and process in parallel.

## Agents to Process:
${JSON.stringify(agentPrompts, null, 2)}

## Output Requirements:
Return a single JSON object with:
- batch_id: "${batchId}"
- processed_at: ISO timestamp
- agents: array of EnrichedAgentData for each agent
- summary: counts of successful/partial/failed

Each agent result must include agent_domain_id to match back.
`;

  const results: SubAgentOutput = {
    batch_id: batchId,
    processed_at: new Date().toISOString(),
    agents: [],
    summary: { total_processed: 0, successful: 0, partial: 0, failed: 0 }
  };

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ['WebSearch', 'WebFetch', 'Task'],
      agents: {
        'agent-researcher': enrichmentAgent
      },
      outputFormat: {
        type: 'json_schema',
        schema: SubAgentOutputSchema
      }
    }
  })) {
    if (message.type === 'result' && message.structured_output) {
      return message.structured_output as SubAgentOutput;
    }
  }

  return results;
}
```

### Enrichment Data Sources

**What sub-agents search for:**

| Data | Primary Source | Secondary Source | Fallback |
|------|----------------|------------------|----------|
| Years experience | LinkedIn employment history | Agency website bio | Infer from profile |
| Languages | LinkedIn skills | Agency website | None (don't guess) |
| Specializations | Agency website bio | LinkedIn summary | Google search |
| Awards | Agency website | REIA state pages | Google: "{name}" award |
| LinkedIn URL | Google: "{name}" "{agency}" linkedin | Agency website | None |
| Enriched bio | Generate from findings | - | Use original bio |

### DO NOT Scrape

- ❌ Rate My Agent - Terms of Service violation, ethical concerns
- ❌ Competitor sites (OpenAgent, Local Agent Finder)
- ❌ Private social media profiles

---

## Data Pipeline Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: USER SELECTS WORK IN CONTROL CENTER UI
────────────────────────────────────────────────
User opens Control Center → Sees suburb list → Selects suburbs/agencies to process

                                    │
                                    ▼

STEP 2: DISCOVERY VIA CLAUDE AGENT SDK
──────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  For each selected suburb:                                       │
│                                                                  │
│  Main Agent searches for agencies via:                          │
│      • Agency brand websites                                    │
│      • Domain.com.au website                                    │
│      • LinkedIn                                                 │
│      • Google                                                   │
│      │                                                           │
│      ▼                                                           │
│  For each NEW agency found (not in database):                   │
│      │                                                           │
│      │  Sub-agent visits agency website/team page               │
│      │      │                                                    │
│      │      ▼                                                    │
│      │  Extract all agents from team page                       │
│      │  Store agency in SQLite                                  │
│      │  Store all agents in SQLite (enrichment_status='pending')│
│      │                                                           │
│  Update suburb status = 'discovered'                            │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 3: ENRICHMENT VIA CLAUDE AGENT SDK
───────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Select batch: 20-50 agents with enrichment_status='pending'    │
│                                                                  │
│  Main Agent receives batch                                       │
│      │                                                           │
│      ├── Spawns Sub-agent 1 (5-10 agents)                       │
│      ├── Spawns Sub-agent 2 (5-10 agents)                       │
│      ├── Spawns Sub-agent 3 (5-10 agents)                       │
│      └── ...                                                     │
│                                                                  │
│  Each sub-agent:                                                 │
│      • Searches LinkedIn, agency website, Google                 │
│      • Finds: experience, languages, specializations, awards    │
│      • Writes enriched_bio based on findings                    │
│      • Returns structured JSON                                   │
│                                                                  │
│  Main Agent collects results                                     │
│      │                                                           │
│      ▼                                                           │
│  Update agents in SQLite with enriched data                     │
│  Set enrichment_status = 'complete'                             │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 4: TRIGGER VERCEL BUILD
────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  POST to Vercel Deploy Hook URL                                  │
│                                                                  │
│  Response: { job: { id: "...", state: "PENDING" } }             │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 5: NEXT.JS STATIC BUILD
────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Vercel runs: npm run build                                      │
│                                                                  │
│  generateStaticParams() reads SQLite:                           │
│      • Get all agents → build /agent/{slug} pages               │
│      • Get all agencies → build /agency/{slug} pages            │
│      • Get all suburbs → build /agents-in/{slug} pages          │
│      • Get all states → build /agents-in/{state} pages          │
│                                                                  │
│  Output: Static HTML files for each page                        │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 6: DEPLOY TO CDN
─────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Vercel deploys static files to global CDN                       │
│                                                                  │
│  Pages now live at:                                              │
│      • https://ari.com.au/agent/john-smith-bondi-rw-a1b2c       │
│      • https://ari.com.au/agency/ray-white-bondi-beach          │
│      • https://ari.com.au/agents-in/bondi-beach-nsw-2026        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sequencing & Selection Logic

### Suburb Selection Strategy

**Goal:** Spread across multiple suburbs per cycle for broader coverage and internal linking.

**Per Cycle (Daily Run):**

1. Select 3-5 suburbs from **different regions**:
   - 1 from Eastern Suburbs (Bondi, Double Bay, Paddington)
   - 1 from North Shore (Mosman, Neutral Bay, Lane Cove)
   - 1 from Inner West (Balmain, Newtown, Marrickville)
   - 1-2 from other regions

2. From each suburb, process **all agencies** (prioritized by brand tier)

3. From each agency, store **all agents**

4. Result: ~50-100 agents per cycle, geographically distributed

### Agency Prioritization (Within a Suburb)

Process agencies in order by **brand tier** (highest first):

| Tier | Score | Brands |
|------|-------|--------|
| 1 | 10 | Ray White, LJ Hooker |
| 2 | 9 | McGrath, Belle Property |
| 3 | 8 | Harcourts, Century 21, Raine & Horne |
| 4 | 7 | PRD, First National, Laing+Simmons |
| 5 | 6 | Richardson & Wrench, Elders |
| 6 | 1-5 | Boutique/Independent agencies |

**Why brand tier first?**
- Major brands have better online presence (easier enrichment)
- Users recognize and trust major brands
- More agents per agency = more pages per API call

### Enrichment Batch Selection

When selecting agents for enrichment:

```sql
SELECT a.*, ag.name as agency_name, ag.website as agency_website
FROM agents a
JOIN agencies ag ON a.agency_id = ag.id
WHERE a.enrichment_status = 'pending'
ORDER BY
    ag.brand_tier DESC,      -- Major brands first
    a.photo_url IS NOT NULL DESC,  -- Agents with photos first
    a.profile_text IS NOT NULL DESC  -- Agents with bios first
LIMIT 50;
```

---

## Control Center UI

### Main Interface Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARI Control Center                                              [Settings] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  SUBURBS                         │  │  AGENCIES IN SELECTED SUBURB   │  │
│  │                                  │  │                                 │  │
│  │  Filter: [All Tiers ▼] [_____]  │  │  Mosman (12 agencies)           │  │
│  │                                  │  │                                 │  │
│  │  ┌────────────────────────────┐ │  │  ☑ Ray White Mosman      ●●●●●● │  │
│  │  │ ● Mosman           Tier 1  │ │  │    8 agents, complete           │  │
│  │  │ ○ Bondi Beach      Tier 1  │ │  │                                 │  │
│  │  │ ○ Double Bay       Tier 1  │ │  │  ☑ McGrath Mosman        ●●●●○○ │  │
│  │  │ ● Paddington       Tier 1  │ │  │    5 agents, enriching...       │  │
│  │  │ ○ Manly            Tier 1  │ │  │                                 │  │
│  │  │ ○ Surry Hills      Tier 1  │ │  │  ☐ Belle Property Mosman ○○○○○○ │  │
│  │  │ ...                        │ │  │    6 agents, pending            │  │
│  │  └────────────────────────────┘ │  │                                 │  │
│  │                                  │  │  ☐ Raine & Horne Mosman  ○○○○○○ │  │
│  │  Legend:                         │  │    4 agents, pending            │  │
│  │  ● Complete  ◐ In Progress      │  │                                 │  │
│  │  ○ Pending   ✕ Failed           │  │  ...                            │  │
│  │                                  │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ACTIONS                                                                 ││
│  │                                                                          ││
│  │  Selected: 2 suburbs, 4 agencies, ~45 agents                            ││
│  │                                                                          ││
│  │  [▶ Run Discovery]  [▶ Run Enrichment]  [▶ Trigger Build]              ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ACTIVITY LOG                                                    [Clear] ││
│  │                                                                          ││
│  │  14:32:01 [DISCOVERY] Starting discovery for Mosman, NSW...             ││
│  │  14:32:05 [DISCOVERY] Main agent searching for agencies...              ││
│  │  14:32:15 [DISCOVERY] Found 12 agencies, checking for duplicates...     ││
│  │  14:32:20 [DISCOVERY] 10 new agencies to process                        ││
│  │  14:32:25 [DISCOVERY] Sub-agent processing Ray White Mosman...          ││
│  │  14:32:35 [DISCOVERY] ✓ Ray White Mosman - 8 agents found               ││
│  │  14:32:40 [DB] ✓ Stored agency + 8 agents                               ││
│  │  14:33:00 [DISCOVERY] Complete: 10 agencies, 85 agents discovered       ││
│  │  14:33:05 [ENRICH] Starting enrichment batch (50 agents)                ││
│  │  14:33:10 [ENRICH] Main agent spawning 5 sub-agents                     ││
│  │  14:33:30 [SUB-1] ✓ John Smith - LinkedIn found, 8 years exp            ││
│  │  14:33:45 [SUB-1] ✓ Mary Chen - Agency bio found, Mandarin speaker      ││
│  │  14:34:00 [SUB-2] ✓ Sarah Jones - Minimal data found                    ││
│  │  14:34:30 [ENRICH] Complete: 50 agents (38 high, 12 low confidence)     ││
│  │  ...                                                                     ││
│  │  14:35:00 [BUILD] Triggering Vercel deploy hook...                      ││
│  │  14:35:01 [BUILD] Job ID: okzCd50AIap1O31g0gne                          ││
│  │  14:35:30 [BUILD] Status: BUILDING                                      ││
│  │  14:36:00 [BUILD] Status: READY                                         ││
│  │  14:36:01 [BUILD] ✓ Deployed: https://ari.com.au                        ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Symbol | Meaning |
|--------|---------|
| ● (green) | Complete - data fetched and enriched |
| ◐ (yellow) | In Progress - currently processing |
| ○ (gray) | Pending - not yet started |
| ✕ (red) | Failed - error occurred |
| ●●●●●● | Progress bar (agents enriched / total) |

### Action Buttons

| Button | Action |
|--------|--------|
| **Run Discovery** | Run Claude Discovery Skill to find agencies/agents in selected suburbs |
| **Run Enrichment** | Run Claude Enrichment Skill for pending agents |
| **Trigger Build** | POST to Vercel Deploy Hook |

### Activity Log

Real-time streaming output showing:
- API calls and responses
- Database writes
- Sub-agent status
- Enrichment progress per agent
- Build deployment status

---

## Next.js SEO Site

### Build Process

```typescript
// app/agent/[slug]/page.tsx
import { db } from '@/lib/database';

export async function generateStaticParams() {
  const agents = db.prepare(`
    SELECT slug FROM agents
    WHERE enrichment_status = 'complete'
  `).all();

  return agents.map(agent => ({
    slug: agent.slug
  }));
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const agent = await getAgentBySlug(params.slug);
  const agency = await getAgencyById(agent.agency_id);
  const relatedAgents = await getAgentsInSuburb(agent.primary_suburb, 4);

  return (
    <>
      <AgentSchema agent={agent} agency={agency} />
      <BreadcrumbSchema agent={agent} agency={agency} />

      <Breadcrumbs agent={agent} agency={agency} />
      <AgentHeader agent={agent} agency={agency} />
      <AgentBio agent={agent} />
      <AgentDetails agent={agent} />
      <AgencySection agency={agency} />
      <RelatedAgents agents={relatedAgents} suburb={agent.primary_suburb} />
      <FAQSection agent={agent} />
    </>
  );
}
```

### Database Access at Build Time

The Next.js app reads from SQLite during `npm run build`:

```typescript
// lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');

export const db = new Database(dbPath, { readonly: true });

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

export function getAgentsInSuburb(suburb: string, limit?: number): Agent[] {
  const query = `
    SELECT a.*, ag.name as agency_name, ag.slug as agency_slug
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.primary_suburb = ?
    ORDER BY ag.brand_tier DESC
    ${limit ? `LIMIT ${limit}` : ''}
  `;
  return db.prepare(query).all(suburb) as Agent[];
}
```

---

## Page Content Structure

### Agent Page

```
┌─────────────────────────────────────────────────────────────────┐
│ AGENT PAGE: /agent/john-smith-bondi-rw-a1b2c                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Breadcrumb: Home > NSW > Bondi Beach > John Smith]             │
│                                                                  │
│ ┌──────────┐                                                    │
│ │  PHOTO   │  John Smith                                        │
│ │          │  Senior Sales Agent at Ray White Bondi Beach       │
│ └──────────┘  Bondi Beach, NSW 2026                             │
│                                                                  │
│ [Contact: Phone | Email | LinkedIn]                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ABOUT JOHN SMITH                                                │
│                                                                  │
│ [enriched_bio - AI-generated description from findings]         │
│                                                                  │
│ If enriched_bio is null, show profile_text from Discovery       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ EXPERIENCE & EXPERTISE                                          │
│                                                                  │
│ • Experience: 8 years in real estate (since 2016)              │
│ • Languages: English, Mandarin                                  │
│ • Specializations: Luxury Homes, Apartments, First Home Buyers │
│ • Property Types: Houses, Apartments, Townhouses               │
│                                                                  │
│ (Only show sections where data exists)                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ AWARDS & RECOGNITION                                            │
│                                                                  │
│ • Top Sales Agent 2024 - Ray White (Agency)                     │
│ • Premier Performer 2023 - REIA NSW (State)                     │
│                                                                  │
│ (Only show if awards array is not empty)                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ABOUT RAY WHITE BONDI BEACH                                     │
│                                                                  │
│ [agency.description]                                            │
│ [Link to agency page]                                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ OTHER AGENTS IN BONDI BEACH                                     │
│                                                                  │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ FREQUENTLY ASKED QUESTIONS                                      │
│                                                                  │
│ Q: How long has John Smith been a real estate agent?            │
│ A: John Smith has been working in real estate for 8 years,      │
│    starting his career in 2016.                                 │
│                                                                  │
│ Q: What languages does John Smith speak?                        │
│ A: John Smith speaks English and Mandarin.                      │
│                                                                  │
│ Q: What areas does John Smith specialize in?                    │
│ A: John Smith specializes in Bondi Beach and surrounding        │
│    Eastern Suburbs, focusing on Luxury Homes and Apartments.    │
│                                                                  │
│ (Generate FAQs dynamically based on available data)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agency Page

```
┌─────────────────────────────────────────────────────────────────┐
│ AGENCY PAGE: /agency/ray-white-bondi-beach                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Breadcrumb: Home > NSW > Bondi Beach > Ray White Bondi Beach]  │
│                                                                  │
│ [LOGO]  Ray White Bondi Beach                                   │
│         123 Campbell Parade, Bondi Beach NSW 2026               │
│         Phone: (02) 9130 5888                                   │
│         Website: raywhitebondibeach.com.au                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ABOUT RAY WHITE BONDI BEACH                                     │
│                                                                  │
│ [description from Discovery Skill]                              │
│                                                                  │
│ Principal: Jane Doe                                             │
│ Team Size: 12 agents                                            │
│ Properties for Sale: 45                                         │
│ Properties for Rent: 23                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ OUR TEAM (12 Agents)                                            │
│                                                                  │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ OTHER AGENCIES IN BONDI BEACH                                   │
│                                                                  │
│ [AgencyCard] [AgencyCard] [AgencyCard]                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Suburb Page

```
┌─────────────────────────────────────────────────────────────────┐
│ SUBURB PAGE: /agents-in/bondi-beach-nsw-2026                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Breadcrumb: Home > NSW > Bondi Beach]                          │
│                                                                  │
│ 85 Real Estate Agents in Bondi Beach, NSW 2026                  │
│                                                                  │
│ Find and compare real estate agents in Bondi Beach.             │
│ Browse 85 agents from 12 agencies.                              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ FILTER BY (if data available)                                   │
│                                                                  │
│ Language: [All] [English] [Mandarin] [Greek]                    │
│ Specialization: [All] [Luxury] [Apartments] [First Home]        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ AGENTS IN BONDI BEACH                                           │
│                                                                  │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│ [AgentCard] [AgentCard] [AgentCard] [AgentCard]                 │
│ ... (show all agents, sorted by brand tier)                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ AGENCIES IN BONDI BEACH (12)                                    │
│                                                                  │
│ [AgencyCard] [AgencyCard] [AgencyCard] [AgencyCard]             │
│ ...                                                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ FREQUENTLY ASKED QUESTIONS                                      │
│                                                                  │
│ Q: How many real estate agents are in Bondi Beach?              │
│ A: There are 85 active real estate agents in Bondi Beach,       │
│    NSW 2026, representing 12 agencies.                          │
│                                                                  │
│ Q: Which agencies operate in Bondi Beach?                       │
│ A: Major agencies in Bondi Beach include Ray White, McGrath,    │
│    Belle Property, and more.                                    │
│                                                                  │
│ Q: What languages do Bondi Beach agents speak?                  │
│ A: Agents in Bondi Beach speak English, Mandarin, Greek,        │
│    and other languages.                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vercel Deploy Hook Integration

### Setup

1. **Create Deploy Hook in Vercel:**
   - Go to Project Settings → Git → Deploy Hooks
   - Name: "ARI Data Update"
   - Branch: `main`
   - Copy the generated URL

2. **Store URL securely:**
   ```bash
   # .env (Control Center)
   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
   VERCEL_TOKEN=xxx  # Optional: for monitoring deployment status
   ```

### Trigger Implementation

```typescript
// lib/deploy.ts (Control Center)

interface DeployResult {
  success: boolean;
  jobId?: string;
  deploymentUrl?: string;
  error?: string;
}

export async function triggerVercelDeploy(): Promise<DeployResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    return { success: false, error: 'Deploy hook URL not configured' };
  }

  try {
    console.log('[DEPLOY] Triggering Vercel build...');

    const response = await fetch(hookUrl, { method: 'POST' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const { job } = await response.json();

    console.log(`[DEPLOY] Build triggered. Job ID: ${job.id}`);

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    console.error('[DEPLOY] Failed:', error);
    return { success: false, error: error.message };
  }
}

// Optional: Monitor deployment status
export async function waitForDeployment(createdAt: number): Promise<DeployResult> {
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!vercelToken) {
    console.log('[DEPLOY] No token configured, skipping status monitoring');
    return { success: true };
  }

  const maxAttempts = 60; // 5 minutes

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const response = await fetch(
      `https://api.vercel.com/v6/deployments?since=${createdAt}`,
      {
        headers: { 'Authorization': `Bearer ${vercelToken}` },
      }
    );

    const { deployments } = await response.json();

    if (deployments.length > 0) {
      const deployment = deployments[0];

      console.log(`[DEPLOY] Status: ${deployment.readyState}`);

      if (deployment.readyState === 'READY') {
        return {
          success: true,
          deploymentUrl: `https://${deployment.url}`,
        };
      } else if (deployment.readyState === 'ERROR') {
        return {
          success: false,
          error: deployment.errorMessage || 'Build failed',
        };
      }
    }
  }

  return { success: false, error: 'Deployment timeout' };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Deploy Hook Details

| Property | Value |
|----------|-------|
| Method | POST (or GET) |
| Authentication | None (URL contains secret) |
| Rate Limit | 60 triggers/hour |
| Build Cache | Enabled by default |
| Response | `{ job: { id, state, createdAt } }` |

---

## SEO Strategy

### URL Structure

```
/agent/{slug}                        → Agent profile
/agency/{slug}                       → Agency page
/agents-in/{state}                   → State listing
/agents-in/{suburb}-{state}-{postcode}  → Suburb listing
```

### Schema Markup

**Agent Page:**
```json
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
    "name": "Bondi Beach, NSW"
  },
  "knowsLanguage": ["English", "Mandarin"],
  "telephone": "+61...",
  "email": "...",
  "url": "https://ari.com.au/agent/..."
}
```

**Suburb Page:**
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Real Estate Agents in Bondi Beach",
  "numberOfItems": 85,
  "itemListElement": [...]
}
```

**FAQ Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How many agents in Bondi Beach?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "There are 85 agents..."
      }
    }
  ]
}
```

### Page Titles

```
Agent:  {Name} - Real Estate Agent in {Suburb} | {Agency} | ARI
Agency: {Agency Name} - {Suburb}, {State} | ARI
Suburb: {Count} Real Estate Agents in {Suburb}, {State} {Postcode} | ARI
State:  Real Estate Agents in {State Full Name} | ARI
```

### Meta Descriptions

Generate dynamically based on available data:

```typescript
function generateAgentDescription(agent: Agent): string {
  const parts = [
    `${agent.first_name} ${agent.last_name} is a real estate agent`,
    `at ${agent.agency_name} in ${agent.primary_suburb}, ${agent.primary_state}.`
  ];

  if (agent.years_experience) {
    parts.push(`${agent.years_experience} years experience.`);
  }

  if (agent.specializations?.length > 0) {
    parts.push(`Specializes in ${agent.specializations[0]}.`);
  }

  if (agent.languages?.length > 1) {
    parts.push(`Speaks ${agent.languages.join(', ')}.`);
  }

  parts.push('View profile and contact details.');

  return parts.join(' ').slice(0, 155);
}
```

---

## Sydney Suburb Priority List

### Tier 1: Top 20 (Process First)

| Priority | Suburb | Postcode | Region |
|----------|--------|----------|--------|
| 1 | Mosman | 2088 | Lower North Shore |
| 2 | Bondi Beach | 2026 | Eastern Suburbs |
| 3 | Double Bay | 2028 | Eastern Suburbs |
| 4 | Paddington | 2021 | Eastern Suburbs |
| 5 | Manly | 2095 | Northern Beaches |
| 6 | Surry Hills | 2010 | Inner City |
| 7 | Castle Hill | 2154 | Hills District |
| 8 | Neutral Bay | 2089 | Lower North Shore |
| 9 | Chatswood | 2067 | Lower North Shore |
| 10 | Balmain | 2041 | Inner West |
| 11 | Vaucluse | 2030 | Eastern Suburbs |
| 12 | Cronulla | 2230 | Sutherland Shire |
| 13 | Bellevue Hill | 2023 | Eastern Suburbs |
| 14 | Parramatta | 2150 | Western Sydney |
| 15 | Newtown | 2042 | Inner West |
| 16 | Randwick | 2031 | Eastern Suburbs |
| 17 | Lane Cove | 2066 | Lower North Shore |
| 18 | Dee Why | 2099 | Northern Beaches |
| 19 | Woollahra | 2025 | Eastern Suburbs |
| 20 | Marrickville | 2204 | Inner West |

### Tier 2: Suburbs 21-35

| Priority | Suburb | Postcode | Region |
|----------|--------|----------|--------|
| 21 | Pymble | 2073 | Upper North Shore |
| 22 | Strathfield | 2135 | Inner West |
| 23 | Kellyville | 2155 | Hills District |
| 24 | Coogee | 2034 | Eastern Suburbs |
| 25 | Kirribilli | 2061 | Lower North Shore |
| 26 | Cremorne | 2090 | Lower North Shore |
| 27 | Drummoyne | 2047 | Inner West |
| 28 | Maroubra | 2035 | Eastern Suburbs |
| 29 | Epping | 2121 | Upper North Shore |
| 30 | Cammeray | 2062 | Lower North Shore |
| 31 | Five Dock | 2046 | Inner West |
| 32 | Crows Nest | 2065 | Lower North Shore |
| 33 | Hunters Hill | 2110 | Inner West |
| 34 | Willoughby | 2068 | Lower North Shore |
| 35 | Gladesville | 2111 | Inner West |

### Tier 3: Suburbs 36-50

| Priority | Suburb | Postcode | Region |
|----------|--------|----------|--------|
| 36 | Wahroonga | 2076 | Upper North Shore |
| 37 | Collaroy | 2097 | Northern Beaches |
| 38 | Rozelle | 2039 | Inner West |
| 39 | Brookvale | 2100 | Northern Beaches |
| 40 | Leichhardt | 2040 | Inner West |
| 41 | Artarmon | 2064 | Lower North Shore |
| 42 | Ryde | 2112 | North |
| 43 | Miranda | 2228 | Sutherland Shire |
| 44 | Bondi Junction | 2022 | Eastern Suburbs |
| 45 | Hornsby | 2077 | Upper North Shore |
| 46 | Caringbah | 2229 | Sutherland Shire |
| 47 | Bankstown | 2200 | South West |
| 48 | Penrith | 2750 | Western Sydney |
| 49 | Liverpool | 2170 | South West |
| 50 | Blacktown | 2148 | Western Sydney |

### Regional Grouping (For Selection Strategy)

| Region | Suburbs |
|--------|---------|
| Eastern Suburbs | Bondi Beach, Double Bay, Paddington, Vaucluse, Bellevue Hill, Randwick, Woollahra, Coogee, Maroubra, Bondi Junction |
| Lower North Shore | Mosman, Neutral Bay, Chatswood, Lane Cove, Kirribilli, Cremorne, Cammeray, Crows Nest, Willoughby, Artarmon |
| Upper North Shore | Pymble, Epping, Wahroonga, Hornsby |
| Northern Beaches | Manly, Dee Why, Collaroy, Brookvale |
| Inner West | Balmain, Newtown, Marrickville, Strathfield, Drummoyne, Five Dock, Hunters Hill, Gladesville, Rozelle, Leichhardt |
| Hills District | Castle Hill, Kellyville |
| Sutherland Shire | Cronulla, Miranda, Caringbah |
| Western Sydney | Parramatta, Penrith, Liverpool, Blacktown |
| South West | Bankstown |

---

## Safe Rollout Strategy

### Phased Approach

| Phase | Timeline | Pages | Action |
|-------|----------|-------|--------|
| 1 | Weeks 1-4 | 10-20 pilot | Perfect template quality |
| 2 | Weeks 5-12 | 50-100/week | Monitor indexation |
| 3 | Months 3-6 | 200-500/week | Scale if healthy |
| 4 | Month 6+ | 10,000+ | Full deployment |

### Warning Signs (Slow Down If...)

- High "Crawled - not indexed" in GSC (> 15%)
- Declining average position
- Low CTR (< 1%)
- Manual action warnings
- High bounce rate (> 80%)

---

## Implementation Roadmap

### Week 1-2: Foundation

- [ ] Set up Control Center Node.js project
- [ ] Set up Next.js SEO site project
- [ ] Create SQLite database with schemas
- [ ] Implement Discovery Skill
- [ ] Seed scrape_progress with Tier 1 suburbs
- [ ] Basic Control Center UI (suburb list)

### Week 3-4: Data Pipeline

- [ ] Complete API fetching flow
- [ ] Store agencies and agents in SQLite
- [ ] Control Center: agency selection UI
- [ ] Control Center: streaming activity log
- [ ] Process Tier 1 suburbs

### Week 5-6: Claude Agent SDK

- [ ] Implement enrichment pipeline
- [ ] Main agent + sub-agent architecture
- [ ] Structured output handling
- [ ] Store enriched data
- [ ] Enrichment progress UI

### Week 7-8: Static Site

- [ ] Agent page template
- [ ] Agency page template
- [ ] Suburb page template
- [ ] State page template
- [ ] Schema markup components
- [ ] generateStaticParams implementation

### Week 9-10: Integration & Launch

- [ ] Vercel Deploy Hook integration
- [ ] End-to-end test: fetch → enrich → build → deploy
- [ ] Sitemap generation
- [ ] robots.txt
- [ ] Google Search Console setup
- [ ] Soft launch with pilot pages

---

## Appendix

### Project Structure

```
ari/
├── control-center/                    # Node.js app
│   ├── src/
│   │   ├── skills/                    # Claude Agent SDK skills
│   │   │   ├── discovery/
│   │   │   │   ├── main-agent.ts      # Discovery orchestrator
│   │   │   │   ├── sub-agent-definition.ts
│   │   │   │   └── prompts.ts
│   │   │   ├── enrichment/
│   │   │   │   ├── main-agent.ts      # Enrichment orchestrator
│   │   │   │   ├── sub-agent-definition.ts
│   │   │   │   └── prompts.ts
│   │   │   └── shared/
│   │   │       ├── output-schema.ts   # SubAgentOutput (shared)
│   │   │       └── cost-tracker.ts
│   │   ├── routes/
│   │   │   ├── discovery.ts           # Discovery endpoints
│   │   │   ├── enrichment.ts          # Enrichment endpoints
│   │   │   └── deploy.ts
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   └── queries.ts
│   │   ├── deploy/
│   │   │   └── vercel.ts
│   │   ├── ui/
│   │   │   └── server.ts              # Express server for UI
│   │   └── index.ts
│   ├── public/
│   │   └── index.html                 # Control Center UI
│   ├── data/
│   │   └── ari.db                     # SQLite database
│   └── package.json
│
├── seo-site/                          # Next.js app
│   ├── app/
│   │   ├── agent/[slug]/page.tsx
│   │   ├── agency/[slug]/page.tsx
│   │   ├── agents-in/
│   │   │   ├── [state]/page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── agent/
│   │   ├── agency/
│   │   ├── suburb/
│   │   └── seo/
│   ├── lib/
│   │   ├── database.ts
│   │   └── queries.ts
│   ├── data/
│   │   └── ari.db                     # Copy of SQLite (or symlink)
│   └── package.json
│
└── README.md
```

### Environment Variables

**Control Center (.env):**
```bash
# Claude Agent SDK
ANTHROPIC_API_KEY=xxx

# Cost Management
CLAUDE_DAILY_BUDGET_USD=10.00
CLAUDE_DISCOVERY_MAX_AGENCIES_PER_RUN=10
CLAUDE_ENRICHMENT_MAX_AGENTS_PER_BATCH=50

# Vercel
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
VERCEL_TOKEN=xxx  # Optional, for deployment monitoring

# Database
DATABASE_PATH=./data/ari.db
```

**SEO Site (.env):**
```bash
# Database (read-only)
DATABASE_PATH=./data/ari.db
```

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial spec |
| 2.0 | 2026-02-01 | Added research reports, work queue, suburb list |
| 3.0 | 2026-02-01 | Complete rewrite: Two-app architecture, Claude Agent SDK integration, data schemas, Control Center UI, Vercel Deploy Hook, clear V1/V2 separation |
