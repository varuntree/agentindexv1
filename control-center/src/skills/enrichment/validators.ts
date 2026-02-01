import type { EnrichmentBatchOutput, EnrichedAgentData } from '@/skills/shared/schemas';

export interface EnrichmentValidationResult {
  agents: EnrichedAgentData[];
  summary: EnrichmentBatchOutput['summary'];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter(isNonEmptyString)
    .map((item) => item.trim())
    .filter((item, index, arr) => arr.indexOf(item) === index);
  return normalized;
}

function normalizeBio(value: unknown): string | null {
  if (!isNonEmptyString(value)) return null;
  const trimmed = value.trim();
  if (trimmed.length < 50) return null;
  if (trimmed.length > 1000) return trimmed.slice(0, 1000);
  return trimmed;
}

function normalizeAgent(input: EnrichedAgentData): EnrichedAgentData {
  return {
    ...input,
    enriched_bio: normalizeBio(input.enriched_bio),
    languages: normalizeStringArray(input.languages),
    specializations: normalizeStringArray(input.specializations),
    property_types: normalizeStringArray(input.property_types),
    sources_found: normalizeStringArray(input.sources_found)
  };
}

export function validateEnrichmentOutput(output: EnrichmentBatchOutput): EnrichmentValidationResult {
  const agents = output.agents.map(normalizeAgent).map((agent) => {
    const hasSources = agent.sources_found.length > 0;
    const hasLanguages = agent.languages.length > 0;
    const yearsValid = agent.years_experience === null || (agent.years_experience >= 0 && agent.years_experience <= 50);

    if (!yearsValid) {
      return {
        ...agent,
        status: 'failed',
        error_message: 'years_experience out of bounds'
      };
    }

    if (hasLanguages && !hasSources) {
      return {
        ...agent,
        status: 'failed',
        error_message: 'languages set without sources_found'
      };
    }

    return agent;
  });

  const summary = {
    total_processed: agents.length,
    successful: agents.filter((agent) => agent.status === 'success').length,
    partial: agents.filter((agent) => agent.status === 'partial').length,
    failed: agents.filter((agent) => agent.status === 'failed').length
  };

  return { agents, summary };
}

