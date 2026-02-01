import Link from 'next/link';

import type { Agent } from '@/types';

export interface AgentCardProps {
  agent: Agent;
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().slice(0, 1).toUpperCase();
  const last = lastName.trim().slice(0, 1).toUpperCase();
  return `${first}${last}`.trim() || 'A';
}

export function AgentCard({ agent }: AgentCardProps): JSX.Element {
  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const location = [agent.primary_suburb, agent.primary_state].filter(Boolean).join(', ');

  return (
    <Link
      href={`/agent/${agent.slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="shrink-0">
        {agent.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.photo_url}
            alt={name}
            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
            {getInitials(agent.first_name, agent.last_name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-950">{name}</div>
        {agent.agency_name ? <div className="truncate text-xs text-slate-600">{agent.agency_name}</div> : null}
        {location ? <div className="truncate text-xs text-slate-500">{location}</div> : null}
      </div>
    </Link>
  );
}

