import type { Database as SqliteDatabase } from 'better-sqlite3';

interface SeedSuburb {
  postcode: string;
  priority: number;
  region: string;
  state: 'NSW';
  suburb_name: string;
}

const SYDNEY_SUBURBS: readonly SeedSuburb[] = [
  { priority: 1, suburb_name: 'Mosman', state: 'NSW', postcode: '2088', region: 'Lower North Shore' },
  { priority: 2, suburb_name: 'Bondi Beach', state: 'NSW', postcode: '2026', region: 'Eastern Suburbs' },
  { priority: 3, suburb_name: 'Double Bay', state: 'NSW', postcode: '2028', region: 'Eastern Suburbs' },
  { priority: 4, suburb_name: 'Paddington', state: 'NSW', postcode: '2021', region: 'Eastern Suburbs' },
  { priority: 5, suburb_name: 'Manly', state: 'NSW', postcode: '2095', region: 'Northern Beaches' },
  { priority: 6, suburb_name: 'Surry Hills', state: 'NSW', postcode: '2010', region: 'Inner City' },
  { priority: 7, suburb_name: 'Castle Hill', state: 'NSW', postcode: '2154', region: 'Hills District' },
  { priority: 8, suburb_name: 'Neutral Bay', state: 'NSW', postcode: '2089', region: 'Lower North Shore' },
  { priority: 9, suburb_name: 'Chatswood', state: 'NSW', postcode: '2067', region: 'Lower North Shore' },
  { priority: 10, suburb_name: 'Balmain', state: 'NSW', postcode: '2041', region: 'Inner West' },
  { priority: 11, suburb_name: 'Vaucluse', state: 'NSW', postcode: '2030', region: 'Eastern Suburbs' },
  { priority: 12, suburb_name: 'Cronulla', state: 'NSW', postcode: '2230', region: 'Sutherland Shire' },
  { priority: 13, suburb_name: 'Bellevue Hill', state: 'NSW', postcode: '2023', region: 'Eastern Suburbs' },
  { priority: 14, suburb_name: 'Parramatta', state: 'NSW', postcode: '2150', region: 'Western Sydney' },
  { priority: 15, suburb_name: 'Newtown', state: 'NSW', postcode: '2042', region: 'Inner West' },
  { priority: 16, suburb_name: 'Randwick', state: 'NSW', postcode: '2031', region: 'Eastern Suburbs' },
  { priority: 17, suburb_name: 'Lane Cove', state: 'NSW', postcode: '2066', region: 'Lower North Shore' },
  { priority: 18, suburb_name: 'Dee Why', state: 'NSW', postcode: '2099', region: 'Northern Beaches' },
  { priority: 19, suburb_name: 'Woollahra', state: 'NSW', postcode: '2025', region: 'Eastern Suburbs' },
  { priority: 20, suburb_name: 'Marrickville', state: 'NSW', postcode: '2204', region: 'Inner West' },

  { priority: 21, suburb_name: 'Pymble', state: 'NSW', postcode: '2073', region: 'Upper North Shore' },
  { priority: 22, suburb_name: 'Strathfield', state: 'NSW', postcode: '2135', region: 'Inner West' },
  { priority: 23, suburb_name: 'Kellyville', state: 'NSW', postcode: '2155', region: 'Hills District' },
  { priority: 24, suburb_name: 'Coogee', state: 'NSW', postcode: '2034', region: 'Eastern Suburbs' },
  { priority: 25, suburb_name: 'Kirribilli', state: 'NSW', postcode: '2061', region: 'Lower North Shore' },
  { priority: 26, suburb_name: 'Cremorne', state: 'NSW', postcode: '2090', region: 'Lower North Shore' },
  { priority: 27, suburb_name: 'Drummoyne', state: 'NSW', postcode: '2047', region: 'Inner West' },
  { priority: 28, suburb_name: 'Maroubra', state: 'NSW', postcode: '2035', region: 'Eastern Suburbs' },
  { priority: 29, suburb_name: 'Epping', state: 'NSW', postcode: '2121', region: 'Upper North Shore' },
  { priority: 30, suburb_name: 'Cammeray', state: 'NSW', postcode: '2062', region: 'Lower North Shore' },
  { priority: 31, suburb_name: 'Five Dock', state: 'NSW', postcode: '2046', region: 'Inner West' },
  { priority: 32, suburb_name: 'Crows Nest', state: 'NSW', postcode: '2065', region: 'Lower North Shore' },
  { priority: 33, suburb_name: 'Hunters Hill', state: 'NSW', postcode: '2110', region: 'Inner West' },
  { priority: 34, suburb_name: 'Willoughby', state: 'NSW', postcode: '2068', region: 'Lower North Shore' },
  { priority: 35, suburb_name: 'Gladesville', state: 'NSW', postcode: '2111', region: 'Inner West' },

  { priority: 36, suburb_name: 'Wahroonga', state: 'NSW', postcode: '2076', region: 'Upper North Shore' },
  { priority: 37, suburb_name: 'Collaroy', state: 'NSW', postcode: '2097', region: 'Northern Beaches' },
  { priority: 38, suburb_name: 'Rozelle', state: 'NSW', postcode: '2039', region: 'Inner West' },
  { priority: 39, suburb_name: 'Brookvale', state: 'NSW', postcode: '2100', region: 'Northern Beaches' },
  { priority: 40, suburb_name: 'Leichhardt', state: 'NSW', postcode: '2040', region: 'Inner West' },
  { priority: 41, suburb_name: 'Artarmon', state: 'NSW', postcode: '2064', region: 'Lower North Shore' },
  { priority: 42, suburb_name: 'Ryde', state: 'NSW', postcode: '2112', region: 'North' },
  { priority: 43, suburb_name: 'Miranda', state: 'NSW', postcode: '2228', region: 'Sutherland Shire' },
  { priority: 44, suburb_name: 'Bondi Junction', state: 'NSW', postcode: '2022', region: 'Eastern Suburbs' },
  { priority: 45, suburb_name: 'Hornsby', state: 'NSW', postcode: '2077', region: 'Upper North Shore' },
  { priority: 46, suburb_name: 'Caringbah', state: 'NSW', postcode: '2229', region: 'Sutherland Shire' },
  { priority: 47, suburb_name: 'Bankstown', state: 'NSW', postcode: '2200', region: 'South West' },
  { priority: 48, suburb_name: 'Penrith', state: 'NSW', postcode: '2750', region: 'Western Sydney' },
  { priority: 49, suburb_name: 'Liverpool', state: 'NSW', postcode: '2170', region: 'South West' },
  { priority: 50, suburb_name: 'Blacktown', state: 'NSW', postcode: '2148', region: 'Western Sydney' }
];

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function computePriorityTier(priority: number): 1 | 2 | 3 {
  if (priority <= 20) return 1;
  if (priority <= 35) return 2;
  return 3;
}

function computeSuburbSlug(suburbName: string, state: string, postcode: string): string {
  return `${slugifySegment(suburbName)}-${slugifySegment(state)}-${slugifySegment(postcode)}`;
}

export function seedScrapeProgress(database: SqliteDatabase): void {
  const insert = database.prepare(`
    INSERT INTO scrape_progress (
      suburb_id,
      suburb_name,
      state,
      postcode,
      slug,
      priority_tier,
      region
    ) VALUES (
      @suburb_id,
      @suburb_name,
      @state,
      @postcode,
      @slug,
      @priority_tier,
      @region
    )
    ON CONFLICT(suburb_id) DO UPDATE SET
      suburb_name = excluded.suburb_name,
      state = excluded.state,
      postcode = excluded.postcode,
      slug = excluded.slug,
      priority_tier = excluded.priority_tier,
      region = excluded.region
  `);

  const seedTransaction = database.transaction(() => {
    for (const suburb of SYDNEY_SUBURBS) {
      const slug = computeSuburbSlug(suburb.suburb_name, suburb.state, suburb.postcode);
      const priorityTier = computePriorityTier(suburb.priority);
      const suburbId = slug;

      insert.run({
        suburb_id: suburbId,
        suburb_name: suburb.suburb_name,
        state: suburb.state,
        postcode: suburb.postcode,
        slug,
        priority_tier: priorityTier,
        region: suburb.region
      });
    }
  });

  seedTransaction();
}

