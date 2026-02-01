import type { Metadata } from 'next';
import Link from 'next/link';

import { HomeSchema } from '@/components/seo/HomeSchema';
import { Card } from '@/components/ui/Card';
import { getAllSuburbs } from '@/lib/queries';
import { AU_STATES, formatStateLabel, stateCodeToSlug } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Find Real Estate Agents in Australia',
  description: 'Find real estate agents by suburb and state across Australia.'
};

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

function buildCanonicalUrl(): string {
  return `${getSiteOrigin()}/`;
}

function getFeaturedSuburbs(): ReturnType<typeof getAllSuburbs> {
  const suburbs = getAllSuburbs();

  const tier1 = suburbs.filter((s) => s.priority_tier === 1);
  if (tier1.length >= 8) return tier1.slice(0, 8);

  const seen = new Set<string>(tier1.map((s) => s.slug));
  const fallback = suburbs.filter((s) => !seen.has(s.slug)).slice(0, Math.max(0, 8 - tier1.length));
  return [...tier1, ...fallback];
}

export default function HomePage(): JSX.Element {
  const featuredSuburbs = getFeaturedSuburbs();
  const canonicalUrl = buildCanonicalUrl();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <HomeSchema canonicalUrl={canonicalUrl} />

      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Find Real Estate Agents in Australia
          </h1>
          <p className="text-slate-600">
            Browse agents and agencies by suburb and state. ARI is a locally generated index designed for fast,
            crawlable pages.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#featured-suburbs"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Explore suburbs
            </Link>
            <Link
              href="#states"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Browse by state
            </Link>
          </div>
        </div>
        <Card>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-900">How ARI works</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>1. Discover agencies and agents per suburb</li>
              <li>2. Enrich agent profiles with validated data</li>
              <li>3. Generate static pages for fast browsing</li>
            </ul>
          </div>
        </Card>
      </section>

      <section id="states" className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Browse by state</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AU_STATES.map((state) => (
            <Link
              key={state.code}
              href={`/agents-in/${state.slug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm hover:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{state.code}</div>
              <div className="text-slate-600">{state.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <section id="featured-suburbs" className="mt-12 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Featured suburbs</h2>
          <p className="text-sm text-slate-600">Tier 1 suburbs (or nearest available)</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredSuburbs.map((suburb) => {
            const stateSlug = stateCodeToSlug(suburb.state);
            const href = `/agents-in/${suburb.slug}`;
            return (
              <Link
                key={suburb.slug}
                href={href}
                className="rounded-xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-900">{suburb.suburb_name}</div>
                <div className="text-sm text-slate-600">
                  {formatStateLabel(suburb.state)}
                  {stateSlug ? <span className="text-slate-400"> • /agents-in/{suburb.slug}</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
