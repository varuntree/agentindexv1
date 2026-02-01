import type { Agent } from '@/types';

export interface AgentDetailsProps {
  agent: Agent;
}

function formatExperience(agent: Agent): string | null {
  if (agent.years_experience === null) return null;

  if (agent.years_experience === 1) return '1 year';
  return `${agent.years_experience} years`;
}

export function AgentDetails({ agent }: AgentDetailsProps): JSX.Element | null {
  const experience = formatExperience(agent);
  const hasDetails =
    Boolean(experience) ||
    agent.languages.length > 0 ||
    agent.specializations.length > 0 ||
    agent.property_types.length > 0;

  if (!hasDetails) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Experience &amp; expertise</h2>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {experience ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Experience</p>
            <p className="mt-1 text-sm text-slate-600">{experience}</p>
          </div>
        ) : null}

        {agent.languages.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Languages</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {agent.languages.map((language) => (
                <li
                  key={language}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {language}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {agent.specializations.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Specializations</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {agent.specializations.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {agent.property_types.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Property types</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {agent.property_types.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

