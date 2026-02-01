'use client';

import type { Agent } from '@/types';

import { AgentCard } from '@/components/agent/AgentCard';

export interface AgentGridProps {
  agents: Agent[];
}

export function AgentGrid({ agents }: AgentGridProps): JSX.Element {
  if (agents.length === 0) {
    return <p className="text-sm text-slate-600">No matching agents found for the selected filters.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard key={agent.slug} agent={agent} />
      ))}
    </div>
  );
}

