import type { Agency, Agent } from '@/types';

import { AgentCard } from '@/components/agent/AgentCard';

export interface AgencyTeamProps {
  agency: Agency;
  agents: Agent[];
}

export function AgencyTeam({ agency, agents }: AgencyTeamProps): JSX.Element {
  if (agents.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Our team</h2>
        <p className="mt-3 text-sm text-slate-600">Agent profiles will appear here when available.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Our team</h2>
        <p className="text-sm text-slate-600">
          {agents.length} agent{agents.length === 1 ? '' : 's'} at {agency.name}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard key={agent.slug} agent={agent} />
        ))}
      </div>
    </section>
  );
}

