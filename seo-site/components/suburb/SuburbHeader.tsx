import type { ScrapeProgress } from '@/types';

export interface SuburbHeaderProps {
  suburb: ScrapeProgress;
  agentCount: number;
  agencyCount: number;
}

function buildTitle(suburb: ScrapeProgress, agentCount: number): string {
  const parts = [
    `${agentCount} Real Estate Agent${agentCount === 1 ? '' : 's'} in ${suburb.suburb_name}, ${suburb.state}`,
    suburb.postcode ? suburb.postcode : null
  ].filter(Boolean);

  return parts.join(' ').trim();
}

export function SuburbHeader({ suburb, agentCount, agencyCount }: SuburbHeaderProps): JSX.Element {
  const title = buildTitle(suburb, agentCount);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="text-sm text-slate-600">
          Browse {agentCount} agent{agentCount === 1 ? '' : 's'} and {agencyCount} agenc{agencyCount === 1 ? 'y' : 'ies'} in{' '}
          {suburb.suburb_name}.
        </p>
      </div>
    </section>
  );
}

