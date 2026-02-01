export interface StateHeaderProps {
  stateCode: string;
  stateName: string;
  suburbCount: number;
}

function buildTitle(stateName: string): string {
  return `Real Estate Agents in ${stateName}`.trim();
}

export function StateHeader({ stateCode, stateName, suburbCount }: StateHeaderProps): JSX.Element {
  const title = buildTitle(stateName);
  const subtitle = `Browse ${suburbCount} suburb${suburbCount === 1 ? '' : 's'} across ${stateName} (${stateCode}).`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
    </section>
  );
}

