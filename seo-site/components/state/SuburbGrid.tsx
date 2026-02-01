import type { ScrapeProgress } from '@/types';

import { SuburbCard } from './SuburbCard';

export interface RegionGroup {
  label: string;
  suburbs: ScrapeProgress[];
}

export interface SuburbGridProps {
  suburbs: ScrapeProgress[];
}

function normalizeRegionLabel(raw: string | null): string {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return 'Other';

  if (cleaned === 'Lower North Shore' || cleaned === 'Upper North Shore') return 'North Shore';
  if (cleaned.includes('North Shore')) return 'North Shore';

  return cleaned;
}

function buildRegionGroups(suburbs: ScrapeProgress[]): RegionGroup[] {
  const grouped = new Map<string, ScrapeProgress[]>();
  for (const suburb of suburbs) {
    const label = normalizeRegionLabel(suburb.region);
    const existing = grouped.get(label);
    if (existing) existing.push(suburb);
    else grouped.set(label, [suburb]);
  }

  const orderPriority: Record<string, number> = {
    'Eastern Suburbs': 0,
    'North Shore': 1
  };

  return Array.from(grouped.entries())
    .map(([label, regionSuburbs]) => ({
      label,
      suburbs: regionSuburbs.sort((a, b) => a.suburb_name.localeCompare(b.suburb_name))
    }))
    .sort((a, b) => {
      const priorityA = orderPriority[a.label] ?? 999;
      const priorityB = orderPriority[b.label] ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.label.localeCompare(b.label);
    });
}

export function SuburbGrid({ suburbs }: SuburbGridProps): JSX.Element {
  const groups = buildRegionGroups(suburbs);

  return (
    <section className="space-y-10">
      {groups.map((group) => (
        <div key={group.label} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{group.label}</h2>
            <p className="text-sm text-slate-600">
              {group.suburbs.length} suburb{group.suburbs.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.suburbs.map((suburb) => (
              <SuburbCard key={suburb.slug} suburb={suburb} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

