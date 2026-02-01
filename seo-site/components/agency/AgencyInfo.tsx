import Link from 'next/link';

import type { Agency } from '@/types';

export interface AgencyInfoProps {
  agency: Agency;
}

function formatWebsiteLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function AgencyInfo({ agency }: AgencyInfoProps): JSX.Element {
  const description = agency.description?.trim();

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Contact</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {agency.phone ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1 text-slate-900">{agency.phone}</dd>
            </div>
          ) : null}
          {agency.email ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 text-slate-900">{agency.email}</dd>
            </div>
          ) : null}
          {agency.website ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Website</dt>
              <dd className="mt-1">
                <Link
                  href={agency.website}
                  className="text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatWebsiteLabel(agency.website)}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {!agency.phone && !agency.email && !agency.website ? (
          <p className="mt-3 text-sm text-slate-600">Contact details will appear here when available.</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">About</h2>
        {description ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{description}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            {agency.name} is a real estate agency based in {agency.suburb}, {agency.state}.
          </p>
        )}
      </div>
    </section>
  );
}

