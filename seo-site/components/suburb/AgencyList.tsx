import Link from 'next/link';

import type { Agency } from '@/types';

export interface AgencyListProps {
  agencies: Agency[];
}

export function AgencyList({ agencies }: AgencyListProps): JSX.Element {
  if (agencies.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Agencies</h2>
        <p className="mt-3 text-sm text-slate-600">Agency profiles will appear here when available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Agencies</h2>
        <p className="text-sm text-slate-600">
          {agencies.length} agenc{agencies.length === 1 ? 'y' : 'ies'}
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {agencies.map((agency) => (
          <li key={agency.slug} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Link href={`/agency/${agency.slug}`} className="text-sm font-semibold text-slate-900 hover:underline">
              {agency.name}
            </Link>
            <div className="mt-1 text-xs text-slate-600">
              {agency.agent_count} agent{agency.agent_count === 1 ? '' : 's'}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

