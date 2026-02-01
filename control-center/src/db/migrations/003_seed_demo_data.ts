import type { Database as SqliteDatabase } from 'better-sqlite3';

export const DEMO_DATA_SCHEMA_VERSION = 3;

interface DemoAgencySeed {
  domain_id: number;
  name: string;
  postcode: string;
  slug: string;
  state: string;
  suburb: string;
  website: string;
}

interface DemoAgentSeed {
  domain_id: number;
  enriched_bio: string | null;
  enrichment_quality: 'high' | 'low';
  enrichment_sources: string[];
  enrichment_status: 'complete';
  facebook_url: string | null;
  first_name: string;
  instagram_url: string | null;
  languages: string[];
  last_name: string;
  linkedin_url: string | null;
  profile_text: string | null;
  property_types: string[];
  slug: string;
  specializations: string[];
  years_experience: number | null;
  years_experience_source: 'linkedin' | 'agency_website' | 'google' | 'inferred' | null;
}

const DEMO_AGENCY: DemoAgencySeed = {
  domain_id: 9900000,
  slug: 'ari-demo-realty',
  name: 'ARI Demo Realty',
  suburb: 'Mosman',
  state: 'NSW',
  postcode: '2088',
  website: 'https://example.com'
};

const DEMO_AGENTS: readonly DemoAgentSeed[] = [
  {
    domain_id: 9900100,
    slug: 'demo-enriched-agent',
    first_name: 'Casey',
    last_name: 'Walker',
    profile_text:
      'Casey Walker works with ARI Demo Realty and focuses on helping local buyers and sellers navigate Mosman.',
    enriched_bio:
      'Casey Walker is a Mosman-based real estate agent known for clear communication, strong local knowledge, and a calm, process-driven approach to residential sales.',
    years_experience: 12,
    years_experience_source: 'linkedin',
    languages: ['English', 'Mandarin'],
    specializations: ['Residential sales', 'Auction campaigns', 'Off-market homes'],
    property_types: ['Houses', 'Apartments'],
    linkedin_url: 'https://www.linkedin.com/',
    facebook_url: null,
    instagram_url: null,
    enrichment_status: 'complete',
    enrichment_quality: 'high',
    enrichment_sources: ['https://www.linkedin.com/']
  },
  {
    domain_id: 9900101,
    slug: 'demo-minimal-agent',
    first_name: 'Taylor',
    last_name: 'Nguyen',
    profile_text: 'Taylor Nguyen is a real estate agent with ARI Demo Realty.',
    enriched_bio: null,
    years_experience: null,
    years_experience_source: null,
    languages: [],
    specializations: [],
    property_types: [],
    linkedin_url: null,
    facebook_url: null,
    instagram_url: null,
    enrichment_status: 'complete',
    enrichment_quality: 'low',
    enrichment_sources: []
  }
];

const DEMO_AWARDS = [
  {
    name: 'Top Sales Agent',
    organization: 'ARI Demo Realty',
    year: 2024,
    level: 'agency'
  }
];

function getCurrentUserVersion(database: SqliteDatabase): number {
  const version = database.pragma('user_version', { simple: true });
  if (typeof version === 'number') return version;
  return Number(version);
}

export function applyDemoDataMigration(database: SqliteDatabase): void {
  const currentVersion = getCurrentUserVersion(database);
  if (currentVersion >= DEMO_DATA_SCHEMA_VERSION) return;

  const insertAgency = database.prepare(`
    INSERT OR IGNORE INTO agencies (
      domain_id,
      slug,
      name,
      suburb,
      state,
      postcode,
      website,
      agent_count
    ) VALUES (
      @domain_id,
      @slug,
      @name,
      @suburb,
      @state,
      @postcode,
      @website,
      0
    )
  `);

  const selectAgencyId = database.prepare(`SELECT id FROM agencies WHERE domain_id = ? OR slug = ?`);

  const insertAgent = database.prepare(`
    INSERT OR IGNORE INTO agents (
      domain_id,
      slug,
      agency_id,
      first_name,
      last_name,
      profile_text,
      enriched_bio,
      years_experience,
      years_experience_source,
      languages,
      specializations,
      property_types,
      awards,
      linkedin_url,
      facebook_url,
      instagram_url,
      enrichment_status,
      enrichment_quality,
      enrichment_sources,
      primary_suburb,
      primary_state,
      primary_postcode
    ) VALUES (
      @domain_id,
      @slug,
      @agency_id,
      @first_name,
      @last_name,
      @profile_text,
      @enriched_bio,
      @years_experience,
      @years_experience_source,
      @languages,
      @specializations,
      @property_types,
      @awards,
      @linkedin_url,
      @facebook_url,
      @instagram_url,
      @enrichment_status,
      @enrichment_quality,
      @enrichment_sources,
      @primary_suburb,
      @primary_state,
      @primary_postcode
    )
  `);

  const updateAgencyCount = database.prepare(`
    UPDATE agencies
    SET agent_count = (
      SELECT COUNT(*) FROM agents WHERE agency_id = agencies.id
    )
    WHERE id = ?
  `);

  const seedTransaction = database.transaction(() => {
    insertAgency.run(DEMO_AGENCY);
    const agencyRow = selectAgencyId.get(DEMO_AGENCY.domain_id, DEMO_AGENCY.slug) as { id?: unknown } | undefined;
    const agencyId = agencyRow?.id;
    if (typeof agencyId !== 'number') {
      throw new Error('Failed to resolve demo agency id');
    }

    for (const agent of DEMO_AGENTS) {
      insertAgent.run({
        domain_id: agent.domain_id,
        slug: agent.slug,
        agency_id: agencyId,
        first_name: agent.first_name,
        last_name: agent.last_name,
        profile_text: agent.profile_text,
        enriched_bio: agent.enriched_bio,
        years_experience: agent.years_experience,
        years_experience_source: agent.years_experience_source,
        languages: JSON.stringify(agent.languages),
        specializations: JSON.stringify(agent.specializations),
        property_types: JSON.stringify(agent.property_types),
        awards: agent.slug === 'demo-enriched-agent' ? JSON.stringify(DEMO_AWARDS) : JSON.stringify([]),
        linkedin_url: agent.linkedin_url,
        facebook_url: agent.facebook_url,
        instagram_url: agent.instagram_url,
        enrichment_status: agent.enrichment_status,
        enrichment_quality: agent.enrichment_quality,
        enrichment_sources: JSON.stringify(agent.enrichment_sources),
        primary_suburb: DEMO_AGENCY.suburb,
        primary_state: DEMO_AGENCY.state,
        primary_postcode: DEMO_AGENCY.postcode
      });
    }

    updateAgencyCount.run(agencyId);
  });

  seedTransaction();

  database.pragma(`user_version = ${DEMO_DATA_SCHEMA_VERSION}`);
}

