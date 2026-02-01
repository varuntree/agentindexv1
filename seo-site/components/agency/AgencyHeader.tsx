import type { Agency } from '@/types';

export interface AgencyHeaderProps {
  agency: Agency;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.slice(0, 1).toUpperCase() ?? '';
  const second = (parts[1] ?? parts[0] ?? '').slice(0, 1).toUpperCase();
  return `${first}${second}`.trim() || 'A';
}

function buildAddressLine(agency: Agency): string {
  const parts = [agency.street_address, `${agency.suburb}, ${agency.state} ${agency.postcode}`].filter(Boolean);
  return parts.join(' • ');
}

export function AgencyHeader({ agency }: AgencyHeaderProps): JSX.Element {
  const address = buildAddressLine(agency);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0">
          {agency.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-base font-semibold text-slate-700">
              {getInitials(agency.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{agency.name}</h1>
          {address ? <p className="mt-2 text-sm text-slate-600">{address}</p> : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            {agency.principal_name ? (
              <span>
                Principal: <span className="font-medium text-slate-900">{agency.principal_name}</span>
              </span>
            ) : null}
            <span>
              Agents: <span className="font-medium text-slate-900">{agency.agent_count}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

