export interface StateLink {
  code: string;
  name: string;
  slug: string;
}

export const AU_STATES: StateLink[] = [
  { code: 'NSW', name: 'New South Wales', slug: 'nsw' },
  { code: 'VIC', name: 'Victoria', slug: 'vic' },
  { code: 'QLD', name: 'Queensland', slug: 'qld' },
  { code: 'SA', name: 'South Australia', slug: 'sa' },
  { code: 'WA', name: 'Western Australia', slug: 'wa' },
  { code: 'TAS', name: 'Tasmania', slug: 'tas' },
  { code: 'ACT', name: 'Australian Capital Territory', slug: 'act' },
  { code: 'NT', name: 'Northern Territory', slug: 'nt' }
];

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeStateCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  const match = AU_STATES.find((s) => s.code === code);
  return match ? match.code : null;
}

export function stateCodeToSlug(code: string | null | undefined): string | null {
  const normalized = normalizeStateCode(code);
  if (!normalized) return null;
  return AU_STATES.find((s) => s.code === normalized)?.slug ?? null;
}

export function getStateBySlug(slug: string | null | undefined): StateLink | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  return AU_STATES.find((state) => state.slug === normalized) ?? null;
}

export function formatStateLabel(code: string | null | undefined): string {
  const normalized = normalizeStateCode(code);
  if (!normalized) return 'Australia';
  const state = AU_STATES.find((s) => s.code === normalized);
  return state ? `${state.name} (${state.code})` : normalized;
}
