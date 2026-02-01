import type { Agent, ScrapeProgress } from '@/types';

import { JsonLd } from './JsonLd';

export interface SuburbSchemaProps {
  suburb: ScrapeProgress;
  agents: Agent[];
  canonicalUrl: string;
}

export function SuburbSchema({ suburb, agents, canonicalUrl }: SuburbSchemaProps): JSX.Element {
  const origin = new URL(canonicalUrl).origin;
  const nameParts = [
    `Real estate agent list for ${suburb.suburb_name}, ${suburb.state}`,
    suburb.postcode ? suburb.postcode : null
  ].filter(Boolean);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${canonicalUrl}#agents`,
    name: nameParts.join(' ').trim(),
    url: canonicalUrl,
    numberOfItems: agents.length,
    itemListElement: agents.map((agent, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${origin}/agent/${agent.slug}`,
      name: `${agent.first_name} ${agent.last_name}`.trim()
    }))
  };

  return <JsonLd data={data} />;
}
