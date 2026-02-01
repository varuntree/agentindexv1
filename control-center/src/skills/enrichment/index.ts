import crypto from 'node:crypto';

import { query } from '@anthropic-ai/claude-agent-sdk';

import { getAgentsPendingEnrichment, updateAgent, updateAgentEnrichment } from '@/db/queries';
import { logger } from '@/lib/logger';
import { CostTracker } from '@/skills/shared/cost-tracker';
import {
  EnrichmentBatchOutputSchema,
  type EnrichedAgentData,
  type EnrichmentBatchOutput
} from '@/skills/shared/schemas';
import { mainEnrichmentAgent } from '@/skills/enrichment/main-agent';
import { researchAgent } from '@/skills/enrichment/research-agent';
import { buildEnrichmentPrompt } from '@/skills/enrichment/prompts';
import { validateEnrichmentOutput } from '@/skills/enrichment/validators';
import type { Agent, EnrichmentData } from '@/types';

export interface RunEnrichmentInput {
  dryRun?: boolean;
  limit: number;
}

export interface RunEnrichmentResult {
  completed: number;
  cost: ReturnType<CostTracker['totals']>;
  failed: number;
  processed: number;
  status: 'complete' | 'dry_run' | 'failed';
}

function toIsoNow(): string {
  return new Date().toISOString();
}

function toStatus(value: EnrichedAgentData['status']): 'complete' | 'failed' {
  return value === 'failed' ? 'failed' : 'complete';
}

function buildSyntheticBio(agent: Agent): string {
  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const suburb = agent.primary_suburb ? `${agent.primary_suburb}` : 'their local area';
  const state = agent.primary_state ? `, ${agent.primary_state}` : '';
  const agency = agent.agency_name ? ` with ${agent.agency_name}` : '';

  return `${name} is a real estate agent${agency} serving ${suburb}${state}. This profile is being expanded as more verified public information becomes available.`;
}

function buildFixtureOutput(agents: Agent[]): EnrichmentBatchOutput {
  const results: EnrichedAgentData[] = agents.map((agent) => ({
    agent_domain_id: agent.domain_id,
    enriched_bio: buildSyntheticBio(agent),
    years_experience: null,
    years_experience_source: null,
    career_start_year: null,
    languages: [],
    specializations: [],
    property_types: [],
    awards: [],
    linkedin_url: null,
    facebook_url: null,
    instagram_url: null,
    personal_website_url: null,
    confidence: 'minimal',
    sources_found: [],
    status: 'partial',
    error_message: null
  }));

  return {
    batch_id: crypto.randomUUID(),
    processed_at: toIsoNow(),
    agents: results,
    summary: {
      total_processed: results.length,
      successful: 0,
      partial: results.length,
      failed: 0
    }
  };
}

async function runClaudeEnrichment(agents: Agent[], tracker: CostTracker): Promise<EnrichmentBatchOutput> {
  const prompt = buildEnrichmentPrompt({ agents });

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ['WebSearch', 'WebFetch', 'Task'],
      agents: {
        'main-agent': mainEnrichmentAgent,
        'research-agent': researchAgent
      },
      outputFormat: {
        type: 'json_schema',
        schema: EnrichmentBatchOutputSchema
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
      return maybeResult.structured_output as EnrichmentBatchOutput;
    }
  }

  return buildFixtureOutput(agents);
}

function applyEnrichmentResults(pendingAgents: Agent[], output: EnrichmentBatchOutput): { completed: number; failed: number } {
  const agentByDomainId = new Map<number, Agent>();
  for (const agent of pendingAgents) agentByDomainId.set(agent.domain_id, agent);

  const validated = validateEnrichmentOutput(output);

  let completed = 0;
  let failed = 0;

  for (const result of validated.agents) {
    const agent = agentByDomainId.get(result.agent_domain_id);
    if (!agent) continue;

    const enrichment: EnrichmentData = {
      enriched_bio: result.enriched_bio ?? buildSyntheticBio(agent),
      years_experience: result.years_experience,
      years_experience_source: result.years_experience_source,
      career_start_year: result.career_start_year,
      languages: result.languages,
      specializations: result.specializations,
      property_types: result.property_types,
      awards: result.awards.map((award) => ({
        name: award.name,
        year: award.year,
        level: award.level,
        organization: award.organization
      })),
      linkedin_url: result.linkedin_url,
      facebook_url: result.facebook_url,
      instagram_url: result.instagram_url,
      personal_website_url: result.personal_website_url,
      enrichment_sources: result.sources_found,
      enrichment_error: result.error_message,
      enrichment_status: toStatus(result.status),
      enrichment_quality: result.confidence
    };

    updateAgentEnrichment(agent.id, enrichment);

    if (enrichment.enrichment_status === 'failed') failed += 1;
    else completed += 1;
  }

  return { completed, failed };
}

export async function runEnrichment(input: RunEnrichmentInput): Promise<RunEnrichmentResult> {
  const tracker = new CostTracker();

  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.floor(input.limit) : 10;
  const dryRun = Boolean(input.dryRun);

  if (dryRun) {
    logger.info('enrichment', 'dry run', { limit });
    return { status: 'dry_run', processed: 0, completed: 0, failed: 0, cost: tracker.totals() };
  }

  const pendingAgents = getAgentsPendingEnrichment(limit);
  if (pendingAgents.length === 0) {
    logger.info('enrichment', 'no pending agents', { limit });
    return { status: 'complete', processed: 0, completed: 0, failed: 0, cost: tracker.totals() };
  }

  try {
    for (const agent of pendingAgents) {
      updateAgent(agent.id, { enrichment_status: 'in_progress', enrichment_error: null, enrichment_sources: [] });
    }

    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
    const rawOutput = hasKey ? await runClaudeEnrichment(pendingAgents, tracker) : buildFixtureOutput(pendingAgents);

    const { completed, failed } = applyEnrichmentResults(pendingAgents, rawOutput);

    logger.info('enrichment', 'complete', {
      processed: pendingAgents.length,
      completed,
      failed,
      cost: tracker.totals()
    });

    return {
      status: 'complete',
      processed: pendingAgents.length,
      completed,
      failed,
      cost: tracker.totals()
    };
  } catch (error) {
    logger.error('enrichment', 'failed', { error });
    for (const agent of pendingAgents) {
      updateAgent(agent.id, {
        enrichment_status: 'failed',
        enrichment_error: error instanceof Error ? error.message : String(error)
      });
    }

    return { status: 'failed', processed: pendingAgents.length, completed: 0, failed: pendingAgents.length, cost: tracker.totals() };
  }
}

