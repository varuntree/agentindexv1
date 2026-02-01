# 03 - Discovery Skill (Claude Agent SDK)

**Domain:** AI Integration - Agency & Agent Discovery
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Main Agent Definition](#main-agent-definition)
4. [Sub-Agent Definition](#sub-agent-definition)
5. [Data Sources & Search Strategy](#data-sources--search-strategy)
6. [Duplicate Detection](#duplicate-detection)
7. [Output Schema](#output-schema)
8. [Implementation](#implementation)
9. [Cost Management](#cost-management)
10. [Error Handling](#error-handling)

---

## Overview

The Discovery Skill is the **first of two Claude Agent SDK skills** in the ARI pipeline. It discovers real estate agencies and their agents through web research, replacing the Domain.com.au API approach.

### What Discovery Does

| Task | Description |
|------|-------------|
| **Find agencies** | Search for real estate agencies in a given suburb |
| **Find agents** | Discover all agents at each agency |
| **Extract basic data** | Name, contact info, photo URL, agency website |
| **Avoid duplicates** | Pre-check database before adding |

### Why Web Research Instead of API?

| Aspect | Domain API | Discovery Skill |
|--------|------------|-----------------|
| Cost | API subscription | Claude API usage (~$0.10-0.30/agency) |
| Rate limits | 500 calls/day | No hard limits |
| Data freshness | Real-time | Same (live web) |
| Coverage | Domain listings only | Multiple sources |
| Flexibility | Fixed schema | Adaptable prompts |

### Relationship to Enrichment Skill

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐
│  DISCOVERY      │      │  ENRICHMENT     │      │  SEO SITE    │
│  SKILL (1)      │  ──► │  SKILL (2)      │  ──► │  (Build)     │
│                 │      │                 │      │              │
│  Find agencies  │      │  Enhance agents │      │  Static      │
│  Find agents    │      │  LinkedIn, etc  │      │  Pages       │
│  Basic data     │      │  Deep research  │      │              │
└─────────────────┘      └─────────────────┘      └──────────────┘
```

---

## Architecture

### Main Agent → Sub-Agent Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISCOVERY PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: Suburb name + state (e.g., "Mosman, NSW")               │
│                                                                  │
│                          ▼                                       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MAIN AGENT                              │  │
│  │                                                            │  │
│  │  Role: Orchestrator                                        │  │
│  │  Model: Claude Sonnet                                      │  │
│  │  Tools: Task (to spawn sub-agents), WebSearch              │  │
│  │                                                            │  │
│  │  Responsibilities:                                         │  │
│  │  • Receive suburb to discover                              │  │
│  │  • Search for agencies in suburb                           │  │
│  │  • Pre-check each agency against database                  │  │
│  │  • Spawn one sub-agent per NEW agency                      │  │
│  │  • Collect and consolidate results                         │  │
│  │  • Return structured output                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ SUB-AGENT 1 │  │ SUB-AGENT 2 │  │ SUB-AGENT 3 │  ...        │
│  │             │  │             │  │             │             │
│  │ Agency A    │  │ Agency B    │  │ Agency C    │             │
│  │ Find agents │  │ Find agents │  │ Find agents │             │
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
│          - List of agencies with agents                         │
│          - Ready for SQLite storage                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Hierarchy

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| Main Agent | Orchestrator, agency discovery | Claude Sonnet | Task, WebSearch |
| Sub-Agent | Agent discovery for one agency | Claude Sonnet | WebSearch, WebFetch |

---

## Main Agent Definition

### Purpose

The main agent orchestrates the discovery process for a suburb:

1. Receives a suburb name and state
2. Searches for real estate agencies in that suburb
3. Checks each agency against the database (avoid duplicates)
4. Spawns sub-agents for new agencies
5. Collects and consolidates all results

### Main Agent Prompt

```typescript
const DISCOVERY_MAIN_AGENT_PROMPT = `You are the orchestrator for a real estate agency discovery pipeline.

## Your Task

Discover all real estate agencies and their agents in a given suburb.

## Process

1. **Search for agencies** in the suburb using WebSearch
2. **For each agency found:**
   - Check if it already exists in the database (domain_id or name+suburb match)
   - If NEW, spawn a sub-agent to discover all agents at that agency
   - If EXISTS, skip it
3. **Collect results** from all sub-agents
4. **Return consolidated JSON** with all discovered agencies and agents

## Search Strategy

Search in this order (stop when you have 10+ agencies or exhausted sources):

1. \`"real estate agencies" "{suburb}" {state}\`
2. \`"{suburb}" real estate agents team\`
3. Check Domain.com.au website: \`site:domain.com.au "real estate" "{suburb}"\`
4. Check LinkedIn: \`site:linkedin.com "real estate" "{suburb}" agency\`

## Agency Data to Extract

For each agency, extract:
- name: Full agency name (e.g., "Ray White Mosman")
- brand_name: Parent brand if franchise (e.g., "Ray White")
- website: Agency website URL
- phone: Contact phone number
- email: Contact email
- street_address: Office address
- suburb: Suburb (should match search)
- state: State abbreviation
- postcode: Postcode

## Sub-Agent Instructions

For each NEW agency, spawn a sub-agent with:
- Agency name
- Agency website URL (if found)
- Suburb and state
- Instructions to find all agents

## Output Format

Return a JSON object matching the SubAgentOutput schema with:
- All discovered agencies
- All discovered agents nested under their agency
- Summary of processing

## Important

- ONLY discover agencies that are NEW (not in database)
- One sub-agent per agency
- Return null for fields you cannot find
- Do not make up data
`;
```

### Main Agent Configuration

```typescript
const discoveryMainAgentConfig = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
  tools: [
    {
      name: 'check_agency_exists',
      description: 'Check if an agency already exists in the database',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agency name to check' },
          suburb: { type: 'string', description: 'Suburb' },
        },
        required: ['name', 'suburb']
      }
    },
    {
      name: 'spawn_agent_researcher',
      description: 'Spawn a sub-agent to discover agents at an agency',
      input_schema: {
        type: 'object',
        properties: {
          agency_name: { type: 'string' },
          agency_website: { type: 'string' },
          suburb: { type: 'string' },
          state: { type: 'string' },
        },
        required: ['agency_name', 'suburb', 'state']
      }
    }
  ]
};
```

---

## Sub-Agent Definition

### Purpose

Each sub-agent discovers all agents at a single agency:

1. Receives agency details from main agent
2. Visits agency website to find team page
3. Extracts all agent information
4. Returns structured data for all agents found

### Sub-Agent Prompt

```typescript
const DISCOVERY_SUB_AGENT_PROMPT = `You are a research specialist for discovering real estate agents at a specific agency.

## Your Task

Find all real estate agents who work at the specified agency.

## Search Strategy (in order of priority)

1. **Agency Website (Primary)**
   - Visit the agency website if provided
   - Look for "Team", "Our Team", "Meet the Team", "Agents", "Staff" pages
   - Extract all agent details from team page

2. **Domain.com.au Website**
   - Search: \`site:domain.com.au "{agency_name}" agents\`
   - Check agency profile page on Domain

3. **LinkedIn**
   - Search: \`site:linkedin.com "{agency_name}" "real estate"\`
   - Find agents who list this agency as employer

4. **Google (Fallback)**
   - Search: \`"{agency_name}" team agents\`

## Agent Data to Extract

For each agent found, extract:
- first_name: Agent's first name
- last_name: Agent's last name
- email: Work email (often @agencyname.com.au)
- phone: Office phone
- mobile: Mobile phone (if listed)
- photo_url: Profile photo URL
- profile_text: Bio/description (first 500 chars)
- role: Job title if available (e.g., "Senior Sales Agent", "Property Manager")
- domain_profile_url: Link to Domain.com.au profile if found

## Output Format

Return a JSON array of all agents found, with:
- All available fields populated
- null for fields not found
- No duplicate agents (same first_name + last_name)

## Critical Rules

- DO NOT make up agent names or details
- DO NOT include agents who have clearly left the agency
- DO NOT scrape Rate My Agent or competitor sites
- ONLY include agents who are currently listed at the agency
- If you cannot find any agents, return empty array with error message
`;
```

### Sub-Agent Configuration

```typescript
const discoverySubAgentConfig = {
  name: 'agent-discoverer',
  description: 'Discover all agents at a specific real estate agency',
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  tools: ['WebSearch', 'WebFetch']
};
```

---

## Data Sources & Search Strategy

### Source Priority Matrix

| Priority | Source | Data Quality | Coverage |
|----------|--------|--------------|----------|
| 1 | Agency brand website | High | All current agents |
| 2 | Domain.com.au (website) | High | Active listing agents |
| 3 | LinkedIn | Medium | Agents with profiles |
| 4 | Google search | Low | Fallback discovery |

### Search Patterns

```typescript
const DISCOVERY_SEARCH_PATTERNS = {
  // Main agent: Find agencies in suburb
  agenciesInSuburb: (suburb: string, state: string) => [
    `"real estate agencies" "${suburb}" ${state}`,
    `${suburb} real estate agents team`,
    `site:domain.com.au "real estate" "${suburb}"`,
  ],

  // Sub-agent: Find agents at agency
  agentsAtAgency: (agencyName: string, website?: string) => [
    // Try agency website first
    website ? `${website} team agents our-team` : null,
    `site:domain.com.au "${agencyName}" agents`,
    `site:linkedin.com "${agencyName}" "real estate"`,
    `"${agencyName}" team agents`,
  ].filter(Boolean),

  // Find team page on agency website
  teamPage: (website: string) => [
    `${website}/team`,
    `${website}/our-team`,
    `${website}/meet-the-team`,
    `${website}/agents`,
    `${website}/people`,
  ],
};
```

### Trusted Sources

**Allowed Sources:**
- Agency brand websites (raywhite.com.au, mcgrath.com.au, etc.)
- Domain.com.au website (not API)
- LinkedIn company pages and profiles
- Google search results
- Industry directories

**Prohibited Sources:**
- Rate My Agent (Terms of Service)
- OpenAgent (Competitor)
- Local Agent Finder (Competitor)
- Private social media profiles

---

## Duplicate Detection

### Pre-Check Database

Before spawning a sub-agent for an agency, the main agent checks if it already exists:

```typescript
// Tool implementation for main agent
async function checkAgencyExists(name: string, suburb: string): Promise<{
  exists: boolean;
  agency_id?: number;
  domain_id?: number;
}> {
  // Normalize name for comparison
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const existing = db.prepare(`
    SELECT id, domain_id FROM agencies
    WHERE
      LOWER(REPLACE(name, ' ', '')) LIKE ?
      AND LOWER(suburb) = LOWER(?)
  `).get(`%${normalizedName}%`, suburb);

  if (existing) {
    return {
      exists: true,
      agency_id: existing.id,
      domain_id: existing.domain_id,
    };
  }

  return { exists: false };
}
```

### Duplicate Detection Rules

| Check | Logic | Action |
|-------|-------|--------|
| Exact name match | `name.toLowerCase() === existing.toLowerCase()` | Skip |
| Fuzzy name match | Contains same brand + suburb | Skip |
| Same website | `website === existing.website` | Skip |
| New agency | No match found | Process |

---

## Output Schema

### Shared Schema with Enrichment

The Discovery Skill uses the **same `SubAgentOutput` schema** as the Enrichment Skill for consistency:

```typescript
// Output structure from both Discovery and Enrichment skills
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

// For Discovery, many enrichment fields will be null
// Enrichment Skill fills them in later
interface EnrichedAgentData {
  // Identifier to match with our database
  agent_domain_id: number;           // Generated if not from Domain API

  // DISCOVERY fills these fields:
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  photo_url: string | null;
  profile_text: string | null;       // Original bio from agency website

  // Agency info (for storage)
  agency_name: string;
  agency_website: string | null;
  agency_suburb: string;
  agency_state: string;
  agency_postcode: string | null;

  // ENRICHMENT fills these fields (null from Discovery):
  enriched_bio: string | null;
  years_experience: number | null;
  years_experience_source: string | null;
  career_start_year: number | null;
  languages: string[];
  specializations: string[];
  property_types: string[];
  awards: Award[];
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  personal_website_url: string | null;

  // Quality indicators
  confidence: 'high' | 'medium' | 'low' | 'minimal';
  sources_found: string[];           // ["agency_website", "domain"]

  // Status
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
}
```

### Discovery-Specific Output

```typescript
interface DiscoveryOutput extends SubAgentOutput {
  // Additional discovery metadata
  suburb: string;
  state: string;

  // Agencies discovered
  agencies: DiscoveredAgency[];

  // Agents nested under agencies
  agents_by_agency: Record<string, EnrichedAgentData[]>;
}

interface DiscoveredAgency {
  // Generated ID (not from Domain API)
  temp_id: string;

  // Agency details
  name: string;
  brand_name: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  street_address: string | null;
  suburb: string;
  state: string;
  postcode: string | null;

  // Discovery metadata
  source: 'agency_website' | 'domain_website' | 'google' | 'linkedin';
  agents_found: number;
}
```

---

## Implementation

### Discovery Pipeline Class

```typescript
// control-center/src/skills/discovery/pipeline.ts

import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '../../db/database';
import { DISCOVERY_MAIN_AGENT_PROMPT, DISCOVERY_SUB_AGENT_PROMPT } from './prompts';
import { broadcast } from '../../routes/events';

const client = new Anthropic();

export class DiscoveryPipeline {
  private isRunning = false;

  async discoverSuburb(suburb: string, state: string): Promise<DiscoveryOutput> {
    if (this.isRunning) {
      throw new Error('Discovery already in progress');
    }

    this.isRunning = true;
    const batchId = crypto.randomUUID();

    try {
      broadcast({ type: 'log', data: {
        source: 'DISCOVERY',
        message: `Starting discovery for ${suburb}, ${state}`,
      }});

      // Run main agent
      const result = await this.runMainAgent(suburb, state, batchId);

      // Save results to database
      await this.saveResults(result);

      broadcast({ type: 'log', data: {
        source: 'DISCOVERY',
        message: `Completed: ${result.agencies.length} agencies, ${result.summary.total_processed} agents`,
      }});

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  private async runMainAgent(
    suburb: string,
    state: string,
    batchId: string
  ): Promise<DiscoveryOutput> {

    const prompt = `
${DISCOVERY_MAIN_AGENT_PROMPT}

## Suburb to Discover

- Suburb: ${suburb}
- State: ${state}
- Batch ID: ${batchId}

Find all real estate agencies in ${suburb}, ${state}.
For each NEW agency, discover all their agents.
Return consolidated results as JSON.
`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
      tools: this.getMainAgentTools(),
    });

    // Process tool calls and collect results
    return this.processMainAgentResponse(response, suburb, state, batchId);
  }

  private getMainAgentTools() {
    return [
      {
        name: 'check_agency_exists',
        description: 'Check if an agency already exists in the database',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            suburb: { type: 'string' },
          },
          required: ['name', 'suburb']
        }
      },
      {
        name: 'spawn_agent_researcher',
        description: 'Spawn a sub-agent to discover agents at an agency',
        input_schema: {
          type: 'object',
          properties: {
            agency_name: { type: 'string' },
            agency_website: { type: 'string' },
            suburb: { type: 'string' },
            state: { type: 'string' },
          },
          required: ['agency_name', 'suburb', 'state']
        }
      },
      {
        name: 'web_search',
        type: 'web_search_20250305'
      }
    ];
  }

  private async processMainAgentResponse(
    response: any,
    suburb: string,
    state: string,
    batchId: string
  ): Promise<DiscoveryOutput> {
    // Handle tool use and sub-agent spawning
    // Implementation depends on Claude Agent SDK specifics

    return {
      batch_id: batchId,
      processed_at: new Date().toISOString(),
      suburb,
      state,
      agencies: [],
      agents: [],
      agents_by_agency: {},
      summary: { total_processed: 0, successful: 0, partial: 0, failed: 0 }
    };
  }

  private async saveResults(output: DiscoveryOutput): Promise<void> {
    const insertAgency = db.prepare(`
      INSERT INTO agencies (
        domain_id, slug, name, brand_name, brand_tier,
        website, phone, email, street_address,
        suburb, state, postcode, agent_count, api_fetched_at
      ) VALUES (
        @domain_id, @slug, @name, @brand_name, @brand_tier,
        @website, @phone, @email, @street_address,
        @suburb, @state, @postcode, @agent_count, CURRENT_TIMESTAMP
      )
    `);

    const insertAgent = db.prepare(`
      INSERT INTO agents (
        domain_id, slug, agency_id,
        first_name, last_name, email, phone, mobile,
        photo_url, profile_text,
        primary_suburb, primary_state, primary_postcode,
        enrichment_status, api_fetched_at
      ) VALUES (
        @domain_id, @slug, @agency_id,
        @first_name, @last_name, @email, @phone, @mobile,
        @photo_url, @profile_text,
        @suburb, @state, @postcode,
        'pending', CURRENT_TIMESTAMP
      )
    `);

    const transaction = db.transaction(() => {
      for (const agency of output.agencies) {
        // Insert agency
        const agencyResult = insertAgency.run({
          domain_id: generateDomainId(),  // Generate since not from API
          slug: generateAgencySlug(agency),
          name: agency.name,
          brand_name: agency.brand_name,
          brand_tier: getBrandTier(agency.name),
          website: agency.website,
          phone: agency.phone,
          email: agency.email,
          street_address: agency.street_address,
          suburb: agency.suburb,
          state: agency.state,
          postcode: agency.postcode,
          agent_count: agency.agents_found,
        });

        const agencyId = agencyResult.lastInsertRowid;

        // Insert agents for this agency
        const agents = output.agents_by_agency[agency.temp_id] || [];
        for (const agent of agents) {
          insertAgent.run({
            domain_id: generateDomainId(),
            slug: generateAgentSlug(agent, agency),
            agency_id: agencyId,
            first_name: agent.first_name,
            last_name: agent.last_name,
            email: agent.email,
            phone: agent.phone,
            mobile: agent.mobile,
            photo_url: agent.photo_url,
            profile_text: agent.profile_text,
            suburb: agency.suburb,
            state: agency.state,
            postcode: agency.postcode,
          });
        }
      }
    });

    transaction();
  }
}

// Helper to generate domain_id for non-API data
function generateDomainId(): number {
  // Use negative IDs to distinguish from real Domain API IDs
  return -Math.floor(Date.now() + Math.random() * 10000);
}

export const discoveryPipeline = new DiscoveryPipeline();
```

### Route Handler

```typescript
// control-center/src/routes/discovery.ts

import { Router } from 'express';
import { discoveryPipeline } from '../skills/discovery/pipeline';
import { db } from '../db/database';

export const discoveryRoutes = Router();

// POST /api/discovery/run - Run discovery for a suburb
discoveryRoutes.post('/run', async (req, res) => {
  const { suburb, state } = req.body;

  if (!suburb || !state) {
    return res.status(400).json({ error: 'suburb and state are required' });
  }

  try {
    const result = await discoveryPipeline.discoverSuburb(suburb, state);
    res.json({
      success: true,
      agencies_found: result.agencies.length,
      agents_found: result.summary.total_processed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discovery/status - Get discovery status
discoveryRoutes.get('/status', (req, res) => {
  const stats = db.prepare(`
    SELECT
      status,
      COUNT(*) as count,
      SUM(agencies_found) as agencies,
      SUM(agents_found) as agents
    FROM scrape_progress
    GROUP BY status
  `).all();

  res.json({
    stats,
    isRunning: discoveryPipeline.isRunning,
  });
});
```

---

## Cost Management

### Token Estimates

| Operation | Input Tokens | Output Tokens | Est. Cost |
|-----------|-------------|---------------|-----------|
| Main agent (per suburb) | ~2,000 | ~1,000 | ~$0.03 |
| Sub-agent (per agency) | ~1,500 | ~2,000 | ~$0.05 |
| **Total per suburb (10 agencies)** | ~17,000 | ~21,000 | ~$0.50-0.80 |

### Cost Controls

```typescript
// Environment variables for cost management
const COST_CONFIG = {
  // Daily budget for all Claude operations
  dailyBudgetUSD: parseFloat(process.env.CLAUDE_DAILY_BUDGET_USD || '10.00'),

  // Max agencies to discover per run
  maxAgenciesPerRun: parseInt(process.env.CLAUDE_DISCOVERY_MAX_AGENCIES_PER_RUN || '10'),

  // Track usage
  currentDayUsage: 0,
  lastResetDate: new Date().toDateString(),
};

function checkBudget(): boolean {
  const today = new Date().toDateString();

  // Reset daily usage if new day
  if (today !== COST_CONFIG.lastResetDate) {
    COST_CONFIG.currentDayUsage = 0;
    COST_CONFIG.lastResetDate = today;
  }

  return COST_CONFIG.currentDayUsage < COST_CONFIG.dailyBudgetUSD;
}

function recordUsage(estimatedCost: number): void {
  COST_CONFIG.currentDayUsage += estimatedCost;
}
```

### Daily Processing Capacity

| Budget | Suburbs/Day | Agencies/Day | Agents/Day |
|--------|-------------|--------------|------------|
| $5/day | ~6-8 | ~60-80 | ~400-600 |
| $10/day | ~12-16 | ~120-160 | ~800-1200 |
| $20/day | ~25-30 | ~250-300 | ~1500-2000 |

---

## Error Handling

### Error Types

```typescript
enum DiscoveryErrorType {
  NO_AGENCIES_FOUND = 'no_agencies_found',
  WEBSITE_UNREACHABLE = 'website_unreachable',
  RATE_LIMIT = 'rate_limit',
  BUDGET_EXCEEDED = 'budget_exceeded',
  AGENT_ERROR = 'agent_error',
  PARSE_ERROR = 'parse_error',
}

interface DiscoveryError {
  type: DiscoveryErrorType;
  message: string;
  suburb?: string;
  agency?: string;
  recoverable: boolean;
}
```

### Error Recovery

```typescript
async function handleDiscoveryError(
  error: DiscoveryError,
  suburb: string,
  state: string
): Promise<void> {
  if (error.recoverable) {
    // Mark suburb for retry
    db.prepare(`
      UPDATE scrape_progress
      SET
        status = 'pending',
        error_message = ?,
        retry_count = retry_count + 1,
        last_error_at = CURRENT_TIMESTAMP
      WHERE suburb_name = ? AND state = ?
    `).run(error.message, suburb, state);

    broadcast({ type: 'log', data: {
      level: 'warning',
      source: 'DISCOVERY',
      message: `Retry scheduled for ${suburb}: ${error.message}`,
    }});
  } else {
    // Mark suburb as failed
    db.prepare(`
      UPDATE scrape_progress
      SET
        status = 'failed',
        error_message = ?,
        last_error_at = CURRENT_TIMESTAMP
      WHERE suburb_name = ? AND state = ?
    `).run(error.message, suburb, state);

    broadcast({ type: 'log', data: {
      level: 'error',
      source: 'DISCOVERY',
      message: `Failed ${suburb}: ${error.message}`,
    }});
  }
}
```

### Retry Strategy

| Error Type | Retries | Delay | Action |
|------------|---------|-------|--------|
| `website_unreachable` | 3 | 5 min | Retry with backoff |
| `rate_limit` | 3 | 10 min | Wait and retry |
| `no_agencies_found` | 1 | 1 hour | Different search |
| `budget_exceeded` | 0 | - | Wait for next day |
| `parse_error` | 1 | - | Manual review |

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - Where Discovery fits in architecture
- **[02-data-schemas.md](./02-data-schemas.md)** - Shared SubAgentOutput schema
- **[04-enrichment-pipeline.md](./04-enrichment-pipeline.md)** - Enrichment (Skill 2)
- **[05-control-center.md](./05-control-center.md)** - UI for triggering discovery
- **[08-operations.md](./08-operations.md)** - Cost management and scheduling
