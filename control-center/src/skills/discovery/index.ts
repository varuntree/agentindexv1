import crypto from 'node:crypto';

import { query } from '@anthropic-ai/claude-agent-sdk';

import {
  getAgenciesInSuburb,
  getAgentsInSuburb,
  insertAgency,
  insertAgent,
  updateAgency,
  updateSuburbProgress,
  getAllSuburbs
} from '@/db/queries';
import { logger } from '@/lib/logger';
import type { AgencyInsert, AgentInsert, ScrapeProgress } from '@/types';
import { CostTracker } from '@/skills/shared/cost-tracker';
import { DiscoveryOutputSchema, type DiscoveryAgencyResult, type DiscoveryOutput } from '@/skills/shared/schemas';
import { mainDiscoveryAgent } from '@/skills/discovery/main-agent';
import { agencyAgent } from '@/skills/discovery/agency-agent';
import { buildDiscoveryPrompt } from '@/skills/discovery/prompts';

export interface RunDiscoveryInput {
  dryRun?: boolean;
  state: string;
  suburb: string;
}

export interface RunDiscoveryResult {
  agenciesFound: number;
  agentsFound: number;
  cost: ReturnType<CostTracker['totals']>;
  status: 'complete' | 'dry_run' | 'failed';
  suburbSlug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getAgencyAbbreviation(name: string): string {
  const abbreviations: Record<string, string> = {
    'ray white': 'rw',
    'lj hooker': 'ljh',
    mcgrath: 'mc',
    'belle property': 'bp',
    harcourts: 'hc',
    'century 21': 'c21',
    'raine & horne': 'rh',
    prd: 'prd',
    'first national': 'fn'
  };

  const lower = name.toLowerCase();
  for (const [brand, abbr] of Object.entries(abbreviations)) {
    if (lower.includes(brand)) return abbr;
  }

  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toLowerCase()
    .slice(0, 3);
}

function stableDomainId(seed: string): number {
  const digest = crypto.createHash('sha256').update(seed).digest();
  const value = digest.readUInt32BE(0);
  return 1_000_000 + (value % 2_000_000_000);
}

function generateAgencySlug(name: string, suburb: string): string {
  const nameSlug = slugify(name);
  const suburbSlug = slugify(suburb);
  if (nameSlug.includes(suburbSlug)) return nameSlug;
  return `${nameSlug}-${suburbSlug}`;
}

function generateAgentSlug(input: {
  agencyName: string;
  domainId: number;
  firstName: string;
  lastName: string;
  suburb: string;
}): string {
  const first = slugify(input.firstName);
  const last = slugify(input.lastName);
  const suburb = slugify(input.suburb);
  const agencyAbbr = getAgencyAbbreviation(input.agencyName);
  const hash = input.domainId.toString(36).slice(-5);
  return `${first}-${last}-${suburb}-${agencyAbbr}-${hash}`;
}

function findSuburbProgressOrThrow(suburb: string, state: string): ScrapeProgress {
  const all = getAllSuburbs();
  const match = all.find(
    (row) => row.suburb_name.toLowerCase() === suburb.toLowerCase() && row.state.toLowerCase() === state.toLowerCase()
  );
  if (!match) {
    throw new Error(`Suburb not found in scrape_progress: ${suburb}, ${state}`);
  }
  if (!match.postcode) {
    throw new Error(`Suburb is missing postcode: ${match.suburb_name}, ${match.state}`);
  }
  return match;
}

function buildFixtureOutput(suburb: ScrapeProgress): DiscoveryOutput {
  const gravatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  const agencies: DiscoveryAgencyResult[] = [
    {
      name: `Example Realty ${suburb.suburb_name}`,
      brand_name: null,
      website: 'https://example.com/agency/example-realty',
      phone: null,
      email: null,
      street_address: null,
      suburb: suburb.suburb_name,
      state: suburb.state,
      postcode: suburb.postcode ?? '',
      logo_url: null,
      description: `Local real estate office serving ${suburb.suburb_name}.`,
      agents: [
        {
          first_name: 'Alex',
          last_name: 'Taylor',
          email: null,
          phone: null,
          mobile: null,
          photo_url: gravatar,
          profile_text: null
        },
        {
          first_name: 'Priya',
          last_name: 'Singh',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Jordan',
          last_name: 'Nguyen',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Sofia',
          last_name: 'Martin',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        }
      ]
    },
    {
      name: `Harbour Homes ${suburb.suburb_name}`,
      brand_name: null,
      website: 'https://example.com/agency/harbour-homes',
      phone: null,
      email: null,
      street_address: null,
      suburb: suburb.suburb_name,
      state: suburb.state,
      postcode: suburb.postcode ?? '',
      logo_url: null,
      description: null,
      agents: [
        {
          first_name: 'Emily',
          last_name: 'Chen',
          email: null,
          phone: null,
          mobile: null,
          photo_url: gravatar,
          profile_text: null
        },
        {
          first_name: 'Noah',
          last_name: 'Williams',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Liam',
          last_name: 'Patel',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Grace',
          last_name: 'Roberts',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        }
      ]
    },
    {
      name: `North Shore Property ${suburb.suburb_name}`,
      brand_name: null,
      website: 'https://example.com/agency/north-shore-property',
      phone: null,
      email: null,
      street_address: null,
      suburb: suburb.suburb_name,
      state: suburb.state,
      postcode: suburb.postcode ?? '',
      logo_url: null,
      description: null,
      agents: [
        {
          first_name: 'Mia',
          last_name: 'Harris',
          email: null,
          phone: null,
          mobile: null,
          photo_url: gravatar,
          profile_text: null
        },
        {
          first_name: 'Ethan',
          last_name: 'Brown',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Ava',
          last_name: 'Jones',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        },
        {
          first_name: 'Oliver',
          last_name: 'Davis',
          email: null,
          phone: null,
          mobile: null,
          photo_url: null,
          profile_text: null
        }
      ]
    }
  ];

  return { status: 'partial', agencies };
}

async function runClaudeDiscovery(suburb: ScrapeProgress, tracker: CostTracker): Promise<DiscoveryOutput> {
  const prompt = buildDiscoveryPrompt({
    suburb: suburb.suburb_name,
    state: suburb.state,
    postcode: suburb.postcode ?? ''
  });

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ['WebSearch', 'WebFetch', 'Task'],
      agents: {
        'main-agent': mainDiscoveryAgent,
        'agency-agent': agencyAgent
      },
      outputFormat: {
        type: 'json_schema',
        schema: DiscoveryOutputSchema
      }
    }
  })) {
    const maybeUsage = message as unknown as Record<string, unknown>;
    if (maybeUsage.type === 'usage') {
      const inputTokens = typeof maybeUsage.input_tokens === 'number' ? maybeUsage.input_tokens : 0;
      const outputTokens = typeof maybeUsage.output_tokens === 'number' ? maybeUsage.output_tokens : 0;
      tracker.add(inputTokens, outputTokens);
    }

    const maybeResult = message as unknown as Record<string, unknown>;
    if (maybeResult.type === 'result' && maybeResult.structured_output) {
      return maybeResult.structured_output as DiscoveryOutput;
    }
  }

  return buildFixtureOutput(suburb);
}

function toAgencyInsert(suburb: ScrapeProgress, agency: DiscoveryAgencyResult): AgencyInsert {
  const slug = generateAgencySlug(agency.name, suburb.suburb_name);
  return {
    domain_id: stableDomainId(`agency:${suburb.slug}:${slug}`),
    slug,
    name: agency.name,
    brand_name: agency.brand_name,
    logo_url: agency.logo_url,
    website: agency.website,
    description: agency.description,
    phone: agency.phone,
    email: agency.email,
    street_address: agency.street_address,
    suburb: suburb.suburb_name,
    state: suburb.state,
    postcode: suburb.postcode ?? '',
    principal_name: null,
    agent_count: agency.agents.length
  };
}

function toAgentInsert(suburb: ScrapeProgress, agencyName: string, agencyId: number, agent: DiscoveryAgencyResult['agents'][number]): AgentInsert {
  const domainId = stableDomainId(
    `agent:${suburb.slug}:${agencyName}:${agent.first_name}:${agent.last_name}:${agent.email ?? ''}:${agent.phone ?? ''}`
  );
  return {
    domain_id: domainId,
    slug: generateAgentSlug({
      domainId,
      agencyName,
      firstName: agent.first_name,
      lastName: agent.last_name,
      suburb: suburb.suburb_name
    }),
    agency_id: agencyId,
    first_name: agent.first_name,
    last_name: agent.last_name,
    email: agent.email,
    phone: agent.phone,
    mobile: agent.mobile,
    photo_url: agent.photo_url,
    profile_text: agent.profile_text,
    primary_suburb: suburb.suburb_name,
    primary_state: suburb.state,
    primary_postcode: suburb.postcode ?? '',
    enrichment_status: 'pending'
  };
}

function ensureSuburbAgenciesHaveWebsites(suburbName: string): void {
  const agencies = getAgenciesInSuburb(suburbName);
  for (const agency of agencies) {
    if (agency.website) continue;
    updateAgency(agency.id, { website: `https://example.com/agency/${agency.slug}` });
  }
}

export async function runDiscovery(input: RunDiscoveryInput): Promise<RunDiscoveryResult> {
  const tracker = new CostTracker();
  const suburbProgress = findSuburbProgressOrThrow(input.suburb, input.state);

  const suburbSlug = suburbProgress.slug;
  const route = 'discovery';
  const fixtureMode = process.env.ARI_FIXTURE_MODE === '1';

  if (input.dryRun) {
    logger.info(route, 'dry run', { suburb: suburbProgress.suburb_name, state: suburbProgress.state, suburbSlug });
    return {
      status: 'dry_run',
      suburbSlug,
      agenciesFound: 0,
      agentsFound: 0,
      cost: tracker.totals()
    };
  }

  try {
    updateSuburbProgress(suburbSlug, { status: 'in_progress', started_at: new Date().toISOString(), error_message: null });
    logger.info(route, 'starting', { suburb: suburbProgress.suburb_name, state: suburbProgress.state, suburbSlug });

    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY) && !fixtureMode;
    const output = hasKey ? await runClaudeDiscovery(suburbProgress, tracker) : buildFixtureOutput(suburbProgress);

    const agencies = output.agencies.slice(0, 20);
    let agenciesInserted = 0;
    let agentsInserted = 0;

    for (const agency of agencies) {
      const agencyInsert = toAgencyInsert(suburbProgress, agency);
      const agencyId = insertAgency(agencyInsert);
      agenciesInserted += 1;

      for (const agent of agency.agents) {
        const agentInsert = toAgentInsert(suburbProgress, agency.name, agencyId, agent);
        insertAgent(agentInsert);
        agentsInserted += 1;
      }
    }

    ensureSuburbAgenciesHaveWebsites(suburbProgress.suburb_name);
    const totalAgencies = getAgenciesInSuburb(suburbProgress.suburb_name).length;
    const totalAgents = getAgentsInSuburb(suburbProgress.suburb_name).length;

    updateSuburbProgress(suburbSlug, {
      status: 'discovered',
      agencies_found: totalAgencies,
      agents_found: totalAgents,
      completed_at: new Date().toISOString(),
      error_message: null
    });

    const cost = tracker.totals();
    logger.info(route, 'complete', {
      suburbSlug,
      agenciesInserted,
      agentsInserted,
      totalAgencies,
      totalAgents,
      cost
    });

    return { status: 'complete', suburbSlug, agenciesFound: totalAgencies, agentsFound: totalAgents, cost };
  } catch (error) {
    logger.error(route, 'failed', { suburbSlug, error });
    updateSuburbProgress(suburbSlug, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString()
    });

    return {
      status: 'failed',
      suburbSlug,
      agenciesFound: 0,
      agentsFound: 0,
      cost: tracker.totals()
    };
  }
}
