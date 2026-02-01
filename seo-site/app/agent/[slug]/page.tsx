import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgentAwards } from '@/components/agent/AgentAwards';
import { AgentBio } from '@/components/agent/AgentBio';
import { AgentCard } from '@/components/agent/AgentCard';
import { AgentContact } from '@/components/agent/AgentContact';
import { AgentDetails } from '@/components/agent/AgentDetails';
import { AgentHeader } from '@/components/agent/AgentHeader';
import { AgentSchema } from '@/components/seo/AgentSchema';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getAgentBySlug, getAgentSlugsForBuild, getRelatedAgentsInSuburb } from '@/lib/queries';
import { slugify, stateCodeToSlug } from '@/lib/utils';
import type { Agent } from '@/types';

interface AgentPageProps {
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
  return `${getSiteOrigin()}/agent/${slug}`;
}

function truncateDescription(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildDescription(agent: Agent): string {
  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const suburb = agent.primary_suburb?.trim() || 'Australia';
  const state = agent.primary_state?.trim() || '';
  const agency = agent.agency_name?.trim() || 'ARI';

  const base = `${name} is a real estate agent in ${suburb}${state ? `, ${state}` : ''} with ${agency}.`;

  const bio = agent.enriched_bio?.trim() || agent.profile_text?.trim() || '';
  if (!bio) return truncateDescription(base, 155);

  return truncateDescription(`${base} ${bio}`, 155);
}

function buildSuburbSlug(agent: Agent): string | null {
  const suburb = agent.primary_suburb?.trim();
  const state = agent.primary_state?.trim();
  const postcode = agent.primary_postcode?.trim();
  const stateSlug = stateCodeToSlug(state);

  if (!suburb || !stateSlug || !postcode) return null;
  return `${slugify(suburb)}-${stateSlug}-${postcode}`;
}

function buildFaqs(agent: Agent): FaqItem[] {
  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const suburb = agent.primary_suburb?.trim();
  const state = agent.primary_state?.trim();
  const agency = agent.agency_name?.trim();

  const faqs: FaqItem[] = [];

  if (suburb && state) {
    faqs.push({
      question: `Which areas does ${name} service?`,
      answer: `${name} is listed in ${suburb}, ${state}.`
    });
  }

  if (agency) {
    faqs.push({
      question: `Which agency does ${name} work with?`,
      answer: `${name} works with ${agency}.`
    });
  }

  if (agent.years_experience !== null) {
    faqs.push({
      question: `How many years of experience does ${name} have?`,
      answer: `${name} has ${agent.years_experience} year${agent.years_experience === 1 ? '' : 's'} of experience.`
    });
  }

  if (agent.languages.length > 0) {
    faqs.push({
      question: `What languages does ${name} speak?`,
      answer: `${name} speaks ${agent.languages.join(', ')}.`
    });
  }

  if (agent.specializations.length > 0) {
    faqs.push({
      question: `What does ${name} specialize in?`,
      answer: `${name} specializes in ${agent.specializations.slice(0, 4).join(', ')}.`
    });
  }

  if (agent.email || agent.phone || agent.mobile) {
    faqs.push({
      question: `How can I contact ${name}?`,
      answer: `You can contact ${name} via the details on this page.`
    });
  }

  return faqs.slice(0, 6);
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAgentSlugsForBuild().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: AgentPageProps): Promise<Metadata> {
  const agent = getAgentBySlug(params.slug);
  if (!agent) {
    return {
      title: 'Agent not found',
      description: 'This agent profile could not be found.',
      alternates: { canonical: buildCanonicalUrl(params.slug) },
      robots: { index: false, follow: false }
    };
  }

  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const suburb = agent.primary_suburb?.trim() || 'Australia';
  const agency = agent.agency_name?.trim() || 'ARI';

  return {
    title: `${name} - Real Estate Agent in ${suburb} | ${agency}`,
    description: buildDescription(agent),
    alternates: { canonical: buildCanonicalUrl(agent.slug) }
  };
}

export default function AgentPage({ params }: AgentPageProps): JSX.Element {
  const agent = getAgentBySlug(params.slug);
  if (!agent) notFound();

  const canonicalUrl = buildCanonicalUrl(agent.slug);
  const suburbSlug = buildSuburbSlug(agent);
  const relatedAgents = agent.primary_suburb ? getRelatedAgentsInSuburb(agent.primary_suburb, agent.slug, 4) : [];
  const name = `${agent.first_name} ${agent.last_name}`.trim();

  const breadcrumbs = [
    { href: '/', label: 'Home' },
    ...(agent.primary_state ? [{ href: `/agents-in/${stateCodeToSlug(agent.primary_state) ?? ''}`, label: agent.primary_state }] : []),
    ...(suburbSlug && agent.primary_suburb ? [{ href: `/agents-in/${suburbSlug}`, label: agent.primary_suburb }] : []),
    { label: name }
  ].filter((item) => item.href !== '/agents-in/' && item.label.trim().length > 0);

  const faqs = buildFaqs(agent);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AgentSchema agent={agent} canonicalUrl={canonicalUrl} />

      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbs} />

        <AgentHeader agent={agent} />

        <AgentContact agent={agent} />

        <AgentBio agent={agent} />

        <AgentDetails agent={agent} />

        <AgentAwards awards={agent.awards} />

        {agent.agency_name ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Agency</h2>
            <p className="mt-2 text-sm text-slate-600">
              {agent.agency_slug ? (
                <Link href={`/agency/${agent.agency_slug}`} className="font-medium text-slate-900 hover:underline">
                  {agent.agency_name}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{agent.agency_name}</span>
              )}
            </p>
          </section>
        ) : null}

        {relatedAgents.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Related agents</h2>
              {suburbSlug ? (
                <Link href={`/agents-in/${suburbSlug}`} className="text-sm text-slate-600 hover:text-slate-900">
                  View all in {agent.primary_suburb}
                </Link>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {relatedAgents.map((related) => (
                <AgentCard key={related.slug} agent={related} />
              ))}
            </div>
          </section>
        ) : null}

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

