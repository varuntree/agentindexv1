import type { Agent } from '@/types';

export interface EnrichmentPromptInput {
  agents: Agent[];
}

function formatAgentList(agents: Agent[]): string {
  const rows = agents.map((agent) => {
    const name = `${agent.first_name} ${agent.last_name}`.trim();
    const agency = agent.agency_id ? agent.agency_name ?? null : null;
    const suburb = agent.primary_suburb ?? null;
    const state = agent.primary_state ?? null;
    const postcode = agent.primary_postcode ?? null;
    return {
      agent_domain_id: agent.domain_id,
      name,
      agency,
      suburb,
      state,
      postcode
    };
  });

  return JSON.stringify(rows, null, 2);
}

export function buildEnrichmentPrompt(input: EnrichmentPromptInput): string {
  return `You are the ARI Enrichment Agent.

Goal: Enrich each agent profile with only facts that you can verify from public sources.

Agents to enrich (do not modify identifiers):
${formatAgentList(input.agents)}

Data to extract (per agent):
- years_experience (number or null, 0-50)
- years_experience_source ("linkedin" | "agency_website" | "google" | "inferred" | null)
- career_start_year (number or null)
- languages (array, ONLY if explicitly stated)
- specializations (array)
- property_types (array)
- awards (array of { name, year, level, organization })
- linkedin_url, facebook_url, instagram_url, personal_website_url (urls or null)
- enriched_bio (50-1000 chars, professional, factual)
- sources_found (array of strings like "linkedin", "agency_website", "google")
- confidence ("high" | "medium" | "low" | "minimal")
- status ("success" | "partial" | "failed")
- error_message (string or null)

Critical rules:
- NEVER assume languages from names.
- NEVER invent years of experience; use null when unknown.
- Prefer official agency pages and LinkedIn profiles over directories.
- Do NOT scrape Rate My Agent or competitors.

Return structured JSON matching the schema provided by the caller.`;
}

