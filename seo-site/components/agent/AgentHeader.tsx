import Link from 'next/link';

import type { Agent } from '@/types';

export interface AgentHeaderProps {
  agent: Agent;
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().slice(0, 1).toUpperCase();
  const last = lastName.trim().slice(0, 1).toUpperCase();
  return `${first}${last}`.trim() || 'A';
}

function formatLocation(agent: Agent): string {
  const parts = [agent.primary_suburb, agent.primary_state, agent.primary_postcode].filter(Boolean);
  return parts.join(', ');
}

export function AgentHeader({ agent }: AgentHeaderProps): JSX.Element {
  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const location = formatLocation(agent);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0">
          {agent.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.photo_url}
              alt={name}
              className="h-24 w-24 rounded-full border border-slate-200 object-cover"
              loading="eager"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-600">
              {getInitials(agent.first_name, agent.last_name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{name}</h1>
            <p className="text-sm text-slate-600">Real Estate Agent</p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            {agent.agency_name && agent.agency_slug ? (
              <Link href={`/agency/${agent.agency_slug}`} className="font-medium text-slate-900 hover:underline">
                {agent.agency_name}
              </Link>
            ) : agent.agency_name ? (
              <span className="font-medium text-slate-900">{agent.agency_name}</span>
            ) : null}

            {location ? <span>{location}</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

