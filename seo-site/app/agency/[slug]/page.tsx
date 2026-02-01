import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgencyHeader } from '@/components/agency/AgencyHeader';
import { AgencyInfo } from '@/components/agency/AgencyInfo';
import { AgencyTeam } from '@/components/agency/AgencyTeam';
import { AgencySchema } from '@/components/seo/AgencySchema';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getAgenciesInSuburb, getAgencyBySlug, getAgencySlugsForBuild, getAgentsByAgency } from '@/lib/queries';
import { slugify, stateCodeToSlug } from '@/lib/utils';
import type { Agency } from '@/types';

interface AgencyPageProps {
  params: {
    slug: string;
  };
}

function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      return 'http://localhost:3000';
    }
  }
  return 'http://localhost:3000';
}

function buildCanonicalUrl(slug: string): string {
  return `${getSiteOrigin()}/agency/${slug}`;
}

function truncateDescription(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildDescription(agency: Agency): string {
  const base = `${agency.name} is a real estate agency in ${agency.suburb}, ${agency.state}.`;
  const description = agency.description?.trim();
  if (!description) return truncateDescription(`${base} View the team and contact details on ARI.`, 155);
  return truncateDescription(`${base} ${description}`, 155);
}

function buildSuburbSlug(agency: Agency): string | null {
  const stateSlug = stateCodeToSlug(agency.state);
  const postcode = agency.postcode.trim();
  if (!stateSlug || !postcode) return null;
  return `${slugify(agency.suburb)}-${stateSlug}-${postcode}`;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAgencySlugsForBuild().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const agency = getAgencyBySlug(params.slug);
  if (!agency) {
    return {
      title: 'Agency not found',
      description: 'This agency profile could not be found.',
      alternates: { canonical: buildCanonicalUrl(params.slug) },
      robots: { index: false, follow: false }
    };
  }

  return {
    title: `${agency.name} - ${agency.suburb}, ${agency.state}`,
    description: buildDescription(agency),
    alternates: { canonical: buildCanonicalUrl(agency.slug) }
  };
}

export default function AgencyPage({ params }: AgencyPageProps): JSX.Element {
  const agency = getAgencyBySlug(params.slug);
  if (!agency) notFound();

  const canonicalUrl = buildCanonicalUrl(agency.slug);
  const stateSlug = stateCodeToSlug(agency.state);
  const suburbSlug = buildSuburbSlug(agency);
  const agents = getAgentsByAgency(agency.id);

  const otherAgencies = getAgenciesInSuburb(agency.suburb)
    .filter((candidate) => candidate.slug !== agency.slug)
    .slice(0, 8);

  const breadcrumbs = [
    { href: '/', label: 'Home' },
    ...(stateSlug ? [{ href: `/agents-in/${stateSlug}`, label: agency.state }] : []),
    ...(suburbSlug ? [{ href: `/agents-in/${suburbSlug}`, label: agency.suburb }] : []),
    { label: agency.name }
  ].filter((item) => item.href !== '/agents-in/' && item.label.trim().length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AgencySchema agency={agency} canonicalUrl={canonicalUrl} />

      <div className="space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <AgencyHeader agency={agency} />

        <AgencyInfo agency={agency} />

        <AgencyTeam agency={agency} agents={agents} />

        {otherAgencies.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Other agencies</h2>
            <p className="mt-1 text-sm text-slate-600">More agencies in {agency.suburb}.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {otherAgencies.map((other) => (
                <li key={other.slug}>
                  <Link href={`/agency/${other.slug}`} className="text-sm font-medium text-slate-900 hover:underline">
                    {other.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
