import type { Metadata } from 'next';

import { StateSchema } from '@/components/seo/StateSchema';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getSuburbsByState } from '@/lib/queries';
import { getStateBySlug } from '@/lib/utils';
import type { ScrapeProgress } from '@/types';

import { StateHeader } from './StateHeader';
import { SuburbGrid } from './SuburbGrid';

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

function buildCanonicalUrl(stateSlug: string): string {
  return `${getSiteOrigin()}/agents-in/${stateSlug}`;
}

function truncateDescription(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildDescription(stateName: string, suburbCount: number): string {
  const base = `Browse ${suburbCount} suburb${suburbCount === 1 ? '' : 's'} in ${stateName} with real estate agent counts.`;
  return truncateDescription(`${base} Explore suburb pages to view agent profiles, agencies, and filters.`, 155);
}

function countDistinctSuburbs(suburbs: ScrapeProgress[]): number {
  const names = new Set(suburbs.map((suburb) => suburb.suburb_name));
  return names.size;
}

export async function buildStateMetadata(stateSlug: string): Promise<Metadata> {
  const canonicalUrl = buildCanonicalUrl(stateSlug);
  const state = getStateBySlug(stateSlug);

  if (!state) {
    return {
      title: 'State not found',
      description: 'This state page could not be found.',
      alternates: { canonical: canonicalUrl },
      robots: { index: false, follow: false }
    };
  }

  const suburbs = getSuburbsByState(state.code);
  const suburbCount = countDistinctSuburbs(suburbs);

  return {
    title: `Real Estate Agents in ${state.name}`,
    description: buildDescription(state.name, suburbCount),
    alternates: { canonical: canonicalUrl }
  };
}

export function StatePage({ stateSlug }: { stateSlug: string }): JSX.Element {
  const state = getStateBySlug(stateSlug);
  const canonicalUrl = buildCanonicalUrl(stateSlug);

  if (!state) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'State not found' }]} />
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">State not found</h1>
          <p className="mt-2 text-sm text-slate-600">This state listing page could not be found.</p>
        </div>
      </div>
    );
  }

  const suburbs = getSuburbsByState(state.code);
  const suburbCount = countDistinctSuburbs(suburbs);

  const breadcrumbs = [{ href: '/', label: 'Home' }, { label: state.code }];

  const suburbsForSchema = [...suburbs].sort((a, b) => a.suburb_name.localeCompare(b.suburb_name));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <StateSchema canonicalUrl={canonicalUrl} stateCode={state.code} stateName={state.name} suburbs={suburbsForSchema} />

      <div className="space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <StateHeader stateCode={state.code} stateName={state.name} suburbCount={suburbCount} />

        {suburbs.length > 0 ? (
          <SuburbGrid suburbs={suburbs} />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Suburbs</h2>
            <p className="mt-2 text-sm text-slate-600">Suburb listings will appear here when available.</p>
          </section>
        )}
      </div>
    </div>
  );
}
