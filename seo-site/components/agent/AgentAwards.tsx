import type { Award } from '@/types';

export interface AgentAwardsProps {
  awards: Award[];
}

function formatAward(award: Award): string {
  const parts = [award.name, award.organization].filter(Boolean);
  return parts.join(' — ');
}

function formatAwardMeta(award: Award): string {
  const parts = [award.level, award.year ? String(award.year) : null].filter(Boolean);
  return parts.join(' • ');
}

export function AgentAwards({ awards }: AgentAwardsProps): JSX.Element | null {
  if (awards.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Awards</h2>
      <ul className="mt-4 space-y-3">
        {awards.map((award, index) => {
          const meta = formatAwardMeta(award);
          return (
            <li key={`${award.name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-900">{formatAward(award)}</div>
              {meta ? <div className="mt-1 text-xs text-slate-600">{meta}</div> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

