import type { ScrapeProgress } from '@/types';

import { JsonLd } from './JsonLd';

export interface StateSchemaProps {
  canonicalUrl: string;
  stateCode: string;
  stateName: string;
  suburbs: ScrapeProgress[];
}

export function StateSchema({ canonicalUrl, stateCode, stateName, suburbs }: StateSchemaProps): JSX.Element {
  const origin = new URL(canonicalUrl).origin;
  const name = `Suburb list for real estate agents in ${stateName} (${stateCode})`.trim();

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${canonicalUrl}#suburbs`,
    name,
    url: canonicalUrl,
    numberOfItems: suburbs.length,
    itemListElement: suburbs.map((suburb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${origin}/agents-in/${suburb.slug}`,
      name: `${suburb.suburb_name}, ${suburb.state}${suburb.postcode ? ` ${suburb.postcode}` : ''}`.trim()
    }))
  };

  return <JsonLd data={data} />;
}

