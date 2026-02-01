import { JsonLd } from './JsonLd';

export interface HomeSchemaProps {
  canonicalUrl: string;
}

export function HomeSchema({ canonicalUrl }: HomeSchemaProps): JSX.Element {
  const websiteId = `${canonicalUrl}#website`;
  const pageId = `${canonicalUrl}#webpage`;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: canonicalUrl,
        name: 'ARI - Australian Real Estate Agents Index'
      },
      {
        '@type': 'WebPage',
        '@id': pageId,
        url: canonicalUrl,
        name: 'Find Real Estate Agents in Australia',
        isPartOf: { '@id': websiteId }
      }
    ]
  };

  return <JsonLd data={data} />;
}

