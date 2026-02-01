import type { Agent } from '@/types';

import { JsonLd } from './JsonLd';

export interface AgentSchemaProps {
  agent: Agent;
  canonicalUrl: string;
}

function isString(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

function buildSameAs(agent: Agent): string[] {
  const urls = [
    agent.linkedin_url,
    agent.facebook_url,
    agent.instagram_url,
    agent.personal_website_url,
    agent.domain_profile_url
  ].filter(isString);

  return urls;
}

function buildAwardStrings(agent: Agent): string[] {
  return agent.awards
    .map((award) => {
      const parts = [award.name, award.organization, award.year ? String(award.year) : null].filter(Boolean);
      return parts.join(' - ').trim();
    })
    .filter((value): value is string => value.length > 0);
}

export function AgentSchema({ agent, canonicalUrl }: AgentSchemaProps): JSX.Element {
  const name = `${agent.first_name} ${agent.last_name}`.trim();

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${canonicalUrl}#agent`,
    name,
    url: canonicalUrl
  };

  if (agent.photo_url) data.image = agent.photo_url;

  const description = agent.enriched_bio?.trim() || agent.profile_text?.trim() || null;
  if (description) data.description = description;

  const phone = agent.mobile || agent.phone || null;
  if (phone) data.telephone = phone;
  if (agent.email) data.email = agent.email;

  if (agent.primary_suburb || agent.primary_state || agent.primary_postcode) {
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: agent.primary_suburb ?? undefined,
      addressRegion: agent.primary_state ?? undefined,
      postalCode: agent.primary_postcode ?? undefined,
      addressCountry: 'AU'
    };
  }

  if (agent.languages.length > 0) data.knowsLanguage = agent.languages;

  const sameAs = buildSameAs(agent);
  if (sameAs.length > 0) data.sameAs = sameAs;

  const awards = buildAwardStrings(agent);
  if (awards.length > 0) data.award = awards;

  if (agent.agency_name) {
    const origin = new URL(canonicalUrl).origin;
    const worksFor: Record<string, unknown> = {
      '@type': 'RealEstateAgency',
      name: agent.agency_name
    };
    if (agent.agency_slug) worksFor.url = `${origin}/agency/${agent.agency_slug}`;
    data.worksFor = worksFor;
  }

  return <JsonLd data={data} />;
}
