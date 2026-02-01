import type { Agency } from '@/types';

import { JsonLd } from './JsonLd';

export interface AgencySchemaProps {
  agency: Agency;
  canonicalUrl: string;
}

function isString(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function AgencySchema({ agency, canonicalUrl }: AgencySchemaProps): JSX.Element {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgency',
    '@id': `${canonicalUrl}#agency`,
    name: agency.name,
    url: canonicalUrl
  };

  if (agency.logo_url) data.image = agency.logo_url;

  const description = agency.description?.trim();
  if (description) data.description = description;

  if (agency.phone) data.telephone = agency.phone;
  if (agency.email) data.email = agency.email;

  data.address = {
    '@type': 'PostalAddress',
    streetAddress: agency.street_address ?? undefined,
    addressLocality: agency.suburb,
    addressRegion: agency.state,
    postalCode: agency.postcode,
    addressCountry: 'AU'
  };

  const sameAs = [agency.website].filter(isString);
  if (sameAs.length > 0) data.sameAs = sameAs;

  return <JsonLd data={data} />;
}

