# 04 - Enrichment Pipeline

**Domain:** AI Integration (Claude Agent SDK)
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Main Agent](#main-agent)
4. [Sub-Agent Definition](#sub-agent-definition)
5. [Enrichment Data Sources](#enrichment-data-sources)
6. [Research Rules](#research-rules)
7. [Batch Processing](#batch-processing)
8. [Output Processing](#output-processing)
9. [Quality Assessment](#quality-assessment)
10. [Error Handling](#error-handling)
11. [Implementation](#implementation)

---

## Overview

The enrichment pipeline uses **Claude Agent SDK** to research and enhance agent profiles with data not available from the Domain.com.au API.

### What We Enrich

| Field | Source | Description |
|-------|--------|-------------|
| `years_experience` | LinkedIn, Agency bio | Years in real estate |
| `career_start_year` | LinkedIn, Calculated | Year started career |
| `languages` | LinkedIn, Agency bio | Languages spoken |
| `specializations` | Agency bio, Google | Areas of expertise |
| `property_types` | Agency bio | Types of properties handled |
| `awards` | Agency site, REIA, Google | Awards and recognition |
| `enriched_bio` | Generated | AI-written professional description |
| `linkedin_url` | Google search | LinkedIn profile URL |
| `social_links` | Google search | Facebook, Instagram, website |

### Why Claude Agent SDK?

- **Autonomous research** - Sub-agents can search and browse independently
- **Parallel processing** - Multiple sub-agents work simultaneously
- **Structured output** - Returns validated JSON matching our schema
- **Tool access** - WebSearch and WebFetch for research

---

## Architecture

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

### Agent Hierarchy

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| Main Agent | Orchestrator | Claude Sonnet | Task |
| Sub-Agent | Researcher | Claude Sonnet | WebSearch, WebFetch |

---

## Main Agent

### Purpose

The main agent orchestrates the enrichment process:

1. Receives a batch of agents to enrich
2. Divides work among sub-agents
3. Spawns sub-agents in parallel
4. Collects and consolidates results
5. Returns structured JSON output

### Main Agent Prompt

```typescript
const MAIN_AGENT_PROMPT = `You are the orchestrator for a real estate agent enrichment pipeline.

## Your Task

You will receive a batch of real estate agents to enrich with additional information.
Your job is to coordinate sub-agents to research each agent.

## Process

1. **Divide the batch** into groups of 5-10 agents
2. **Spawn sub-agents** for each group using the Task tool
3. **Collect results** from all sub-agents
4. **Consolidate** into a single JSON output

## Sub-Agent Instructions

When spawning sub-agents, provide them with:
- The list of agents to research (with domain_id, name, agency, suburb)
- Clear instructions to follow the research protocol
- The expected output format

## Output Format

Return a single JSON object with:
- batch_id: The batch ID provided
- processed_at: Current ISO timestamp
- agents: Array of enriched agent data
- summary: Counts of successful/partial/failed

## Important

- Process all agents in the batch
- Do not skip any agents
- Return null for fields where data cannot be found
- Ensure every agent has a result (even if failed)
`;
```

### Main Agent Configuration

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const mainAgentConfig = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
  tools: [
    {
      name: 'Task',
      description: 'Spawn a sub-agent to research a group of agents',
      input_schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Instructions and agent data for the sub-agent'
          },
          subagent_type: {
            type: 'string',
            enum: ['agent-researcher'],
            description: 'Type of sub-agent to spawn'
          }
        },
        required: ['prompt', 'subagent_type']
      }
    }
  ]
};
```

---

## Sub-Agent Definition

### Purpose

Sub-agents perform the actual research for groups of agents. Each sub-agent:

1. Receives 5-10 agents to research
2. Searches for information using WebSearch
3. Fetches and reads pages using WebFetch
4. Extracts structured data
5. Returns results for its group

### Sub-Agent Prompt

```typescript
const SUB_AGENT_PROMPT = `You are a research specialist for real estate agent profiles.

## Your Task

Research each agent in your assigned list and find:

### 1. Years of Experience
- Check LinkedIn employment history first
- Look for "X years in real estate" on agency website
- Calculate from earliest real estate role if found
- Record the source of this information

### 2. Languages Spoken
- ONLY include languages explicitly stated somewhere
- Check LinkedIn skills/languages section
- Check agency website bio
- DO NOT assume based on name or ethnicity
- DO NOT guess - if not found, return empty array

### 3. Specializations
- Property types: luxury homes, apartments, townhouses, commercial
- Buyer types: first home buyers, investors, downsizers, expats
- Area types: waterfront, prestige, inner city, suburban
- Look in agency bio and LinkedIn summary

### 4. Property Types
- What types of properties they typically sell
- Houses, Apartments, Townhouses, Land, Commercial, etc.
- Extract from bio or listing patterns mentioned

### 5. Awards & Recognition
- Check REIA state award lists
- Check agency website for awards mentioned
- Check for "Top X%" or "Elite" status mentioned
- Record year and level (agency/regional/state/national)

### 6. Social & Professional Links
- LinkedIn URL (search: "{name}" "{agency}" linkedin)
- Facebook business page
- Instagram professional account
- Personal website

### 7. Enriched Bio
- Write a 2-3 sentence professional description
- Incorporate your findings (experience, specializations, achievements)
- Professional tone, factual
- Do not include information you couldn't verify

## Search Strategy

For each agent, perform these searches in order:

1. \`"{first_name} {last_name}" "{agency_name}" linkedin\`
2. \`"{first_name} {last_name}" real estate {suburb}\`
3. Visit agency website if available

## Critical Rules

⚠️ **DO NOT make up information** - Use null if not found
⚠️ **DO NOT scrape Rate My Agent** - Terms of Service violation
⚠️ **DO NOT assume languages based on names** - Only explicit mentions
⚠️ **DO NOT scrape competitor sites** - OpenAgent, Local Agent Finder, etc.
⚠️ **Prefer LinkedIn over other sources** - Most reliable for career data

## Output Format

For each agent, return:

\`\`\`json
{
  "agent_domain_id": 12345,
  "enriched_bio": "Professional description based on findings...",
  "years_experience": 8,
  "years_experience_source": "linkedin",
  "career_start_year": 2016,
  "languages": ["English", "Mandarin"],
  "specializations": ["Luxury Homes", "First Home Buyers"],
  "property_types": ["House", "Apartment"],
  "awards": [
    {
      "name": "Top Sales Agent",
      "year": 2024,
      "level": "agency",
      "organization": "Ray White"
    }
  ],
  "linkedin_url": "https://linkedin.com/in/...",
  "facebook_url": null,
  "instagram_url": null,
  "personal_website_url": null,
  "confidence": "high",
  "sources_found": ["linkedin", "agency_website"],
  "status": "success",
  "error_message": null
}
\`\`\`

## Confidence Levels

- **high**: LinkedIn found + 3 or more fields populated
- **medium**: Agency website found + 2 or more fields populated
- **low**: Only 1-2 fields populated from limited sources
- **minimal**: Only basic info, almost no enrichment found

## Status Values

- **success**: Most fields populated successfully
- **partial**: Some fields found, others missing
- **failed**: Could not find any useful information
`;
```

### Sub-Agent Configuration

```typescript
const subAgentConfig = {
  name: 'agent-researcher',
  description: 'Research real estate agent profiles to find experience, languages, specializations, and awards',
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  tools: ['WebSearch', 'WebFetch']
};
```

---

## Enrichment Data Sources

### Source Priority

| Data Field | Primary | Secondary | Fallback |
|------------|---------|-----------|----------|
| Years experience | LinkedIn employment | Agency website bio | Infer from profile |
| Career start year | LinkedIn | Calculated | None |
| Languages | LinkedIn skills | Agency website | None (don't guess) |
| Specializations | Agency website bio | LinkedIn summary | Google search |
| Property types | Agency website | LinkedIn | None |
| Awards | Agency website | REIA state pages | Google search |
| LinkedIn URL | Google search | Agency website | None |
| Enriched bio | Generate from findings | - | Use original bio |

### Search Patterns

```typescript
const SEARCH_PATTERNS = {
  // LinkedIn search
  linkedin: (agent: Agent) =>
    `"${agent.first_name} ${agent.last_name}" "${agent.agency_name}" linkedin`,

  // General search
  general: (agent: Agent) =>
    `"${agent.first_name} ${agent.last_name}" real estate ${agent.primary_suburb}`,

  // Awards search
  awards: (agent: Agent) =>
    `"${agent.first_name} ${agent.last_name}" award real estate`,

  // REIA awards
  reiaAwards: (state: string, year: number) =>
    `REIA ${state} awards ${year} real estate`,
};
```

### Trusted Sources

✅ **Allowed Sources:**
- LinkedIn profiles
- Agency websites
- REIA state websites
- Personal agent websites
- Google search results (for finding links)
- Industry news articles

❌ **Prohibited Sources:**
- Rate My Agent (Terms of Service)
- OpenAgent (Competitor)
- Local Agent Finder (Competitor)
- Private social media profiles
- Any site requiring login

---

## Research Rules

### Critical Rules

```typescript
const RESEARCH_RULES = {
  // Data integrity
  noFabrication: 'Never make up information - use null if not found',
  noAssumptions: 'Never assume languages based on names or ethnicity',
  verifyData: 'Cross-reference information when possible',

  // Source restrictions
  noRateMyAgent: 'Do not scrape Rate My Agent - Terms of Service violation',
  noCompetitors: 'Do not scrape OpenAgent, Local Agent Finder, or similar',
  noPrivateData: 'Do not access private social media profiles',

  // Source preferences
  preferLinkedIn: 'LinkedIn is most reliable for career data',
  preferAgencyWebsite: 'Agency websites are authoritative for current info',

  // Quality standards
  minimumQuality: 'Return at least enriched_bio for every agent',
  explicitLanguages: 'Only include languages that are explicitly stated',
  verifiedAwards: 'Only include awards with verifiable sources',
};
```

### Language Detection Rules

```typescript
// CORRECT: Only include explicitly stated languages
const validLanguageIndicators = [
  'speaks English and Mandarin',
  'fluent in Greek',
  'Languages: English, Vietnamese',
  'bilingual in English and Arabic',
];

// INCORRECT: Do not infer languages from
const invalidLanguageIndicators = [
  'Agent name sounds Chinese',      // ❌ Never infer from names
  'Works in Chinatown area',        // ❌ Never infer from location
  'Many Chinese clients',           // ❌ Never infer from clientele
];
```

### Award Verification

```typescript
interface AwardVerification {
  // Required fields
  name: string;           // Award name as stated

  // Optional but preferred
  year: number | null;    // Year received
  organization: string;   // Who gave the award
  level: AwardLevel;      // Scope of award

  // Verification
  source: string;         // Where we found this
}

type AwardLevel = 'agency' | 'regional' | 'state' | 'national';

// Only include awards that can be verified
const verifiedAward = {
  name: 'Premier Performer',
  year: 2024,
  organization: 'REIA NSW',
  level: 'state',
  source: 'https://reia.com.au/awards/2024'  // Verifiable source
};
```

---

## Batch Processing

### Batch Configuration

```typescript
const BATCH_CONFIG = {
  // Batch sizing
  maxBatchSize: 50,           // Max agents per enrichment run
  subAgentGroupSize: 8,       // Agents per sub-agent (5-10)

  // Timing
  maxBatchDuration: 300000,   // 5 minute timeout
  subAgentTimeout: 120000,    // 2 minutes per sub-agent

  // Concurrency
  maxConcurrentSubAgents: 5,  // Parallel sub-agents
};
```

### Batch Selection Query

```sql
-- Select agents for enrichment batch
SELECT
  a.id,
  a.domain_id,
  a.first_name,
  a.last_name,
  a.profile_text,
  a.primary_suburb,
  a.primary_state,
  ag.name as agency_name,
  ag.website as agency_website
FROM agents a
JOIN agencies ag ON a.agency_id = ag.id
WHERE a.enrichment_status = 'pending'
ORDER BY
  ag.brand_tier ASC,                    -- Major brands first (better data)
  a.photo_url IS NOT NULL DESC,         -- Agents with photos first
  a.profile_text IS NOT NULL DESC       -- Agents with bios first
LIMIT 50;
```

### Batch Processing Flow

```typescript
async function processBatch(agents: AgentForEnrichment[]): Promise<SubAgentOutput> {
  const batchId = crypto.randomUUID();

  // Mark agents as in_progress
  await markAgentsInProgress(agents.map(a => a.domain_id));

  // Prepare agent data for prompt
  const agentPrompts = agents.map(a => ({
    domain_id: a.domain_id,
    name: `${a.first_name} ${a.last_name}`,
    agency: a.agency_name,
    suburb: a.primary_suburb,
    state: a.primary_state,
    existing_bio: a.profile_text,
    agency_website: a.agency_website
  }));

  // Build main agent prompt
  const prompt = `
Process the following ${agents.length} real estate agents for enrichment.
Batch ID: ${batchId}

## Agents to Process:
${JSON.stringify(agentPrompts, null, 2)}

## Instructions:
1. Divide these agents into groups of 5-10
2. Spawn a sub-agent for each group
3. Collect all results
4. Return consolidated JSON output
`;

  // Run main agent
  const result = await runMainAgent(prompt, batchId);

  // Update database with results
  await saveEnrichmentResults(result);

  return result;
}
```

---

## Output Processing

### Validating Sub-Agent Output

```typescript
function validateEnrichedAgent(data: EnrichedAgentData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field
  if (!data.agent_domain_id) {
    errors.push('Missing agent_domain_id');
  }

  // Validate URLs
  if (data.linkedin_url && !isValidLinkedInUrl(data.linkedin_url)) {
    warnings.push('Invalid LinkedIn URL format');
    data.linkedin_url = null;
  }

  // Validate years experience
  if (data.years_experience !== null) {
    if (data.years_experience < 0 || data.years_experience > 60) {
      warnings.push('Unrealistic years_experience value');
      data.years_experience = null;
    }
  }

  // Validate career start year
  if (data.career_start_year !== null) {
    const currentYear = new Date().getFullYear();
    if (data.career_start_year < 1960 || data.career_start_year > currentYear) {
      warnings.push('Unrealistic career_start_year');
      data.career_start_year = null;
    }
  }

  // Validate languages (must be strings, no empty)
  if (data.languages) {
    data.languages = data.languages.filter(l => typeof l === 'string' && l.trim());
  }

  // Validate status
  if (!['success', 'partial', 'failed'].includes(data.status)) {
    data.status = 'partial';
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data
  };
}

function isValidLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('linkedin.com');
  } catch {
    return false;
  }
}
```

### Saving Results to Database

```typescript
async function saveEnrichmentResults(output: SubAgentOutput): Promise<void> {
  const updateStmt = db.prepare(`
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
      enrichment_status = @enrichment_status,
      enrichment_quality = @enrichment_quality,
      enrichment_sources = @enrichment_sources,
      enrichment_error = @enrichment_error,
      enriched_at = CURRENT_TIMESTAMP
    WHERE domain_id = @domain_id
  `);

  const transaction = db.transaction((agents: EnrichedAgentData[]) => {
    for (const agent of agents) {
      const status = agent.status === 'success' ? 'complete' :
                     agent.status === 'partial' ? 'complete' : 'failed';

      updateStmt.run({
        domain_id: agent.agent_domain_id,
        enriched_bio: agent.enriched_bio,
        years_experience: agent.years_experience,
        years_experience_source: agent.years_experience_source,
        career_start_year: agent.career_start_year,
        languages: JSON.stringify(agent.languages || []),
        specializations: JSON.stringify(agent.specializations || []),
        property_types: JSON.stringify(agent.property_types || []),
        awards: JSON.stringify(agent.awards || []),
        linkedin_url: agent.linkedin_url,
        facebook_url: agent.facebook_url,
        instagram_url: agent.instagram_url,
        personal_website_url: agent.personal_website_url,
        enrichment_status: status,
        enrichment_quality: agent.confidence,
        enrichment_sources: JSON.stringify(agent.sources_found || []),
        enrichment_error: agent.error_message,
      });
    }
  });

  transaction(output.agents);
}
```

---

## Quality Assessment

### Confidence Level Calculation

```typescript
function calculateConfidence(agent: EnrichedAgentData): 'high' | 'medium' | 'low' | 'minimal' {
  let score = 0;

  // LinkedIn is high value
  if (agent.sources_found?.includes('linkedin')) score += 3;
  if (agent.sources_found?.includes('agency_website')) score += 2;

  // Count populated fields
  if (agent.years_experience) score += 1;
  if (agent.languages?.length > 0) score += 1;
  if (agent.specializations?.length > 0) score += 1;
  if (agent.awards?.length > 0) score += 1;
  if (agent.linkedin_url) score += 1;
  if (agent.enriched_bio && agent.enriched_bio.length > 100) score += 1;

  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'low';
  return 'minimal';
}
```

### Quality Metrics

```typescript
interface BatchQualityMetrics {
  total: number;
  successful: number;
  partial: number;
  failed: number;

  avgFieldsPopulated: number;
  linkedInFoundRate: number;
  languagesFoundRate: number;
  awardsFoundRate: number;

  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
    minimal: number;
  };
}

function calculateBatchMetrics(output: SubAgentOutput): BatchQualityMetrics {
  const agents = output.agents;
  const total = agents.length;

  const fieldsPopulated = agents.map(a => {
    let count = 0;
    if (a.years_experience) count++;
    if (a.languages?.length) count++;
    if (a.specializations?.length) count++;
    if (a.awards?.length) count++;
    if (a.linkedin_url) count++;
    if (a.enriched_bio) count++;
    return count;
  });

  return {
    total,
    successful: agents.filter(a => a.status === 'success').length,
    partial: agents.filter(a => a.status === 'partial').length,
    failed: agents.filter(a => a.status === 'failed').length,

    avgFieldsPopulated: fieldsPopulated.reduce((a, b) => a + b, 0) / total,
    linkedInFoundRate: agents.filter(a => a.linkedin_url).length / total,
    languagesFoundRate: agents.filter(a => a.languages?.length).length / total,
    awardsFoundRate: agents.filter(a => a.awards?.length).length / total,

    confidenceDistribution: {
      high: agents.filter(a => a.confidence === 'high').length,
      medium: agents.filter(a => a.confidence === 'medium').length,
      low: agents.filter(a => a.confidence === 'low').length,
      minimal: agents.filter(a => a.confidence === 'minimal').length,
    }
  };
}
```

---

## Error Handling

### Error Types

```typescript
enum EnrichmentErrorType {
  TIMEOUT = 'timeout',
  AGENT_ERROR = 'agent_error',
  PARSE_ERROR = 'parse_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT = 'rate_limit',
  NETWORK_ERROR = 'network_error',
}

interface EnrichmentError {
  type: EnrichmentErrorType;
  message: string;
  agentDomainId?: number;
  recoverable: boolean;
}
```

### Error Recovery

```typescript
async function handleEnrichmentError(
  error: EnrichmentError,
  agents: AgentForEnrichment[]
): Promise<void> {
  if (error.recoverable) {
    // Mark for retry
    await db.prepare(`
      UPDATE agents
      SET
        enrichment_status = 'pending',
        enrichment_error = @error
      WHERE domain_id IN (${agents.map(a => a.domain_id).join(',')})
    `).run({ error: error.message });

    console.log(`[ENRICH] Marked ${agents.length} agents for retry: ${error.message}`);
  } else {
    // Mark as failed
    await db.prepare(`
      UPDATE agents
      SET
        enrichment_status = 'failed',
        enrichment_error = @error
      WHERE domain_id IN (${agents.map(a => a.domain_id).join(',')})
    `).run({ error: error.message });

    console.error(`[ENRICH] Failed ${agents.length} agents: ${error.message}`);
  }
}
```

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000,          // 5 seconds
  backoffMultiplier: 2,      // Exponential backoff

  recoverableErrors: [
    EnrichmentErrorType.TIMEOUT,
    EnrichmentErrorType.RATE_LIMIT,
    EnrichmentErrorType.NETWORK_ERROR,
  ],
};

async function runWithRetry<T>(
  fn: () => Promise<T>,
  config: typeof RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRecoverable = config.recoverableErrors.some(
        type => error.type === type
      );

      if (!isRecoverable || attempt === config.maxRetries) {
        throw error;
      }

      const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt - 1);
      console.log(`[ENRICH] Retry attempt ${attempt}, waiting ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

---

## Implementation

### Complete Enrichment Pipeline

```typescript
// control-center/src/enrichment/pipeline.ts

import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '../db/database';
import { MAIN_AGENT_PROMPT, SUB_AGENT_PROMPT } from './prompts';

const client = new Anthropic();

export class EnrichmentPipeline {
  private isRunning = false;

  async runBatch(batchSize: number = 50): Promise<SubAgentOutput> {
    if (this.isRunning) {
      throw new Error('Enrichment already in progress');
    }

    this.isRunning = true;

    try {
      // 1. Select agents for enrichment
      const agents = this.selectAgentsForEnrichment(batchSize);

      if (agents.length === 0) {
        return {
          batch_id: crypto.randomUUID(),
          processed_at: new Date().toISOString(),
          agents: [],
          summary: { total_processed: 0, successful: 0, partial: 0, failed: 0 }
        };
      }

      console.log(`[ENRICH] Starting batch with ${agents.length} agents`);

      // 2. Mark as in progress
      await this.markAgentsInProgress(agents);

      // 3. Run main agent
      const result = await this.runMainAgent(agents);

      // 4. Validate and save results
      await this.saveResults(result);

      // 5. Log metrics
      const metrics = calculateBatchMetrics(result);
      console.log('[ENRICH] Batch complete:', metrics);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  private selectAgentsForEnrichment(limit: number): AgentForEnrichment[] {
    return db.prepare(`
      SELECT
        a.domain_id,
        a.first_name,
        a.last_name,
        a.profile_text,
        a.primary_suburb,
        a.primary_state,
        ag.name as agency_name,
        ag.website as agency_website
      FROM agents a
      JOIN agencies ag ON a.agency_id = ag.id
      WHERE a.enrichment_status = 'pending'
      ORDER BY ag.brand_tier ASC, a.photo_url IS NOT NULL DESC
      LIMIT ?
    `).all(limit) as AgentForEnrichment[];
  }

  private async markAgentsInProgress(agents: AgentForEnrichment[]): Promise<void> {
    const ids = agents.map(a => a.domain_id);
    db.prepare(`
      UPDATE agents
      SET enrichment_status = 'in_progress'
      WHERE domain_id IN (${ids.join(',')})
    `).run();
  }

  private async runMainAgent(agents: AgentForEnrichment[]): Promise<SubAgentOutput> {
    const batchId = crypto.randomUUID();

    const prompt = `
${MAIN_AGENT_PROMPT}

## Batch ID: ${batchId}

## Agents to Process (${agents.length} total):
${JSON.stringify(agents.map(a => ({
  domain_id: a.domain_id,
  name: `${a.first_name} ${a.last_name}`,
  agency: a.agency_name,
  suburb: a.primary_suburb,
  state: a.primary_state,
  existing_bio: a.profile_text?.slice(0, 200),
  agency_website: a.agency_website
})), null, 2)}

Process all agents and return the consolidated enrichment results.
`;

    // Use Claude to orchestrate sub-agents
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
      tools: this.getTools(),
    });

    // Process tool calls and collect results
    // (Implementation depends on Claude Agent SDK specifics)

    return this.parseMainAgentResponse(response, batchId);
  }

  private getTools() {
    // Define tools available to main agent
    return [
      {
        name: 'spawn_researcher',
        description: 'Spawn a sub-agent to research a group of agents',
        input_schema: {
          type: 'object',
          properties: {
            agents: {
              type: 'array',
              description: 'Agents for this sub-agent to research'
            }
          },
          required: ['agents']
        }
      }
    ];
  }

  private parseMainAgentResponse(response: any, batchId: string): SubAgentOutput {
    // Parse the final response into SubAgentOutput format
    // Implementation depends on response structure
    return {
      batch_id: batchId,
      processed_at: new Date().toISOString(),
      agents: [],
      summary: { total_processed: 0, successful: 0, partial: 0, failed: 0 }
    };
  }

  private async saveResults(output: SubAgentOutput): Promise<void> {
    await saveEnrichmentResults(output);
  }
}

export const enrichmentPipeline = new EnrichmentPipeline();
```

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - Where enrichment fits in pipeline
- **[02-data-schemas.md](./02-data-schemas.md)** - SubAgentOutput schema
- **[05-control-center.md](./05-control-center.md)** - UI for triggering enrichment
- **[08-operations.md](./08-operations.md)** - Enrichment scheduling
