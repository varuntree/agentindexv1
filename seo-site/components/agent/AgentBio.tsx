import type { Agent } from '@/types';

export interface AgentBioProps {
  agent: Agent;
}

function getBioText(agent: Agent): string | null {
  const enriched = agent.enriched_bio?.trim();
  if (enriched) return enriched;

  const profile = agent.profile_text?.trim();
  if (profile) return profile;

  const name = `${agent.first_name} ${agent.last_name}`.trim();
  const suburb = agent.primary_suburb?.trim();
  const state = agent.primary_state?.trim();
  const agency = agent.agency_name?.trim();

  if (suburb && state && agency) return `${name} is a real estate agent in ${suburb}, ${state} with ${agency}.`;
  if (suburb && state) return `${name} is a real estate agent in ${suburb}, ${state}.`;
  if (agency) return `${name} is a real estate agent with ${agency}.`;
  return `${name} is a real estate agent.`;
}

export function AgentBio({ agent }: AgentBioProps): JSX.Element | null {
  const bio = getBioText(agent);
  if (!bio) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">About</h2>
      <div className="prose prose-slate mt-3 max-w-none">
        <p>{bio}</p>
      </div>
    </section>
  );
}
