import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AgencyList } from '@/components/suburb/AgencyList';
import { SuburbFilters } from '@/components/suburb/SuburbFilters';
import { SuburbHeader } from '@/components/suburb/SuburbHeader';
import { SuburbSchema } from '@/components/seo/SuburbSchema';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import {
  getAgenciesInSuburbAndState,
  getAgentsInSuburbAndState,
  getAllSuburbs,
  getSuburbProgress
} from '@/lib/queries';
import { stateCodeToSlug } from '@/lib/utils';
import type { Agent, ScrapeProgress } from '@/types';

interface SuburbPageProps {
  params: {
    slug: string;
  };
}

interface FaqItem {
  answer: string;
  question: string;
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
  return `${getSiteOrigin()}/agents-in/${slug}`;
}

function truncateDescription(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildHeadline(suburb: ScrapeProgress, agentCount: number): string {
  const parts = [
    `${agentCount} Real Estate Agent${agentCount === 1 ? '' : 's'} in ${suburb.suburb_name}, ${suburb.state}`,
    suburb.postcode ? suburb.postcode : null
  ].filter(Boolean);
  return parts.join(' ').trim();
}

function buildDescription(suburb: ScrapeProgress, agentCount: number, agencyCount: number): string {
  const base = `Browse ${agentCount} real estate agent${agentCount === 1 ? '' : 's'} and ${agencyCount} agenc${
    agencyCount === 1 ? 'y' : 'ies'
  } in ${suburb.suburb_name}, ${suburb.state}${suburb.postcode ? ` ${suburb.postcode}` : ''}.`;
  return truncateDescription(`${base} Filter by language and specialization.`, 155);
}

function buildFaqs(suburb: ScrapeProgress, agents: Agent[], agencyNames: string[]): FaqItem[] {
  const agentCount = agents.length;

  const location = `${suburb.suburb_name}, ${suburb.state}${suburb.postcode ? ` ${suburb.postcode}` : ''}`;
  const faqs: FaqItem[] = [
    {
      question: `How many real estate agents are listed in ${location}?`,
      answer: `${agentCount} agent${agentCount === 1 ? ' is' : 's are'} currently listed for ${location} on ARI.`
    },
    {
      question: `Can I filter agents in ${suburb.suburb_name}?`,
      answer: `Yes. Use the filters on this page to narrow agents by language and specialization.`
    },
    {
      question: `Where can I find contact details for an agent?`,
      answer: `Open an agent profile to view the available phone, email, and social links.`
    }
  ];

  if (agencyNames.length > 0) {
    const listed = agencyNames.slice(0, 5).join(', ');
    faqs.unshift({
      question: `Which agencies operate in ${suburb.suburb_name}?`,
      answer: `Agencies listed for ${suburb.suburb_name} include ${listed}${agencyNames.length > 5 ? ', and more.' : '.'}`
    });
  }

  return faqs.slice(0, 6);
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllSuburbs().map((suburb) => ({ slug: suburb.slug }));
}

export async function generateMetadata({ params }: SuburbPageProps): Promise<Metadata> {
  const suburb = getSuburbProgress(params.slug);
  if (!suburb) {
    return {
      title: 'Suburb not found',
      description: 'This suburb page could not be found.',
      alternates: { canonical: buildCanonicalUrl(params.slug) },
      robots: { index: false, follow: false }
    };
  }

  const agentCount = getAgentsInSuburbAndState(suburb.suburb_name, suburb.state).length;
  const agencyCount = getAgenciesInSuburbAndState(suburb.suburb_name, suburb.state).length;
  const headline = buildHeadline(suburb, agentCount);

  return {
    title: headline,
    description: buildDescription(suburb, agentCount, agencyCount),
    alternates: { canonical: buildCanonicalUrl(suburb.slug) }
  };
}

export default function SuburbPage({ params }: SuburbPageProps): JSX.Element {
  const suburb = getSuburbProgress(params.slug);
  if (!suburb) notFound();

  const agents = getAgentsInSuburbAndState(suburb.suburb_name, suburb.state);
  const agencies = getAgenciesInSuburbAndState(suburb.suburb_name, suburb.state);
  const canonicalUrl = buildCanonicalUrl(suburb.slug);
  const stateSlug = stateCodeToSlug(suburb.state);

  const breadcrumbs = [
    { href: '/', label: 'Home' },
    ...(stateSlug ? [{ href: `/agents-in/${stateSlug}`, label: suburb.state }] : []),
    { label: suburb.suburb_name }
  ].filter((item) => item.href !== '/agents-in/' && item.label.trim().length > 0);

  const faqs = buildFaqs(
    suburb,
    agents,
    agencies.map((agency) => agency.name)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SuburbSchema suburb={suburb} agents={agents} canonicalUrl={canonicalUrl} />

      <div className="space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <SuburbHeader suburb={suburb} agentCount={agents.length} agencyCount={agencies.length} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">About this suburb page</h2>
          <p className="mt-2 text-sm text-slate-600">
            This page lists agents and agencies associated with {suburb.suburb_name}, {suburb.state}.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Agents</h2>
            <p className="text-sm text-slate-600">
              {agents.length} agent{agents.length === 1 ? '' : 's'}
            </p>
          </div>
          {agents.length > 0 ? (
            <SuburbFilters agents={agents} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">Agent profiles will appear here when available.</p>
            </div>
          )}
        </section>

        <AgencyList agencies={agencies} />

        {faqs.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">FAQs</h2>
            <dl className="mt-4 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-sm font-medium text-slate-900">{faq.question}</dt>
                  <dd className="mt-1 text-sm text-slate-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </div>
  );
}
