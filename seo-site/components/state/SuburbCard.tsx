import Link from 'next/link';

import type { ScrapeProgress } from '@/types';

export interface SuburbCardProps {
  suburb: ScrapeProgress;
}

function formatCount(value: number): string {
  if (value <= 0) return '0 agents';
  return `${value} agent${value === 1 ? '' : 's'}`;
}

export function SuburbCard({ suburb }: SuburbCardProps): JSX.Element {
  const metaParts = [suburb.state, suburb.postcode ? suburb.postcode : null].filter(Boolean);
  const meta = metaParts.join(' ').trim();

  return (
    <Link
      href={`/agents-in/${suburb.slug}`}
      className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400"
    >
      <div>
        <p className="text-base font-semibold tracking-tight text-slate-950 group-hover:text-slate-900">{suburb.suburb_name}</p>
        <p className="mt-1 text-sm text-slate-600">{meta}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 text-sm text-slate-700">
        <span className="font-medium">{formatCount(suburb.agents_found)}</span>
        <span className="text-slate-500">View agents</span>
      </div>
    </Link>
  );
}

