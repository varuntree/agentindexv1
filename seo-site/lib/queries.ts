import { db } from '@/lib/database';
import type { Agency, Agent, Award, EnrichmentQuality, EnrichmentStatus, ScrapeProgress, ScrapeStatus, YearsExperienceSource } from '@/types';

interface AgencyRow {
  agent_count: number | null;
  api_fetched_at: string | null;
  brand_name: string | null;
  created_at: string;
  description: string | null;
  domain_id: number;
  email: string | null;
  id: number;
  logo_url: string | null;
  name: string;
  phone: string | null;
  postcode: string;
  principal_name: string | null;
  properties_for_rent: number | null;
  properties_for_sale: number | null;
  slug: string;
  state: string;
  street_address: string | null;
  suburb: string;
  updated_at: string;
  website: string | null;
}

interface AgentRow {
  agency_id: number | null;
  agency_name?: string | null;
  agency_slug?: string | null;
  api_fetched_at: string | null;
  awards: string | null;
  career_start_year: number | null;
  created_at: string;
  domain_id: number;
  domain_profile_url: string | null;
  email: string | null;
  enriched_at: string | null;
  enriched_bio: string | null;
  enrichment_quality: string | null;
  enrichment_status: string | null;
  facebook_url: string | null;
  first_name: string;
  id: number;
  instagram_url: string | null;
  languages: string | null;
  last_name: string;
  linkedin_url: string | null;
  mobile: string | null;
  personal_website_url: string | null;
  phone: string | null;
  photo_url: string | null;
  primary_postcode: string | null;
  primary_state: string | null;
  primary_suburb: string | null;
  profile_text: string | null;
  property_types: string | null;
  slug: string;
  specializations: string | null;
  updated_at: string;
  years_experience: number | null;
  years_experience_source: string | null;
}

interface ScrapeProgressRow {
  agencies_found: number;
  agents_found: number;
  completed_at: string | null;
  error_message: string | null;
  id: number;
  postcode: string | null;
  priority_tier: number;
  region: string | null;
  retry_count: number;
  slug: string;
  started_at: string | null;
  state: string;
  status: string;
  suburb_id: string;
  suburb_name: string;
}

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

function toEnrichmentStatus(value: string | null): EnrichmentStatus {
  if (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'complete' ||
    value === 'failed' ||
    value === 'skipped'
  ) {
    return value;
  }
  return 'pending';
}

function toEnrichmentQuality(value: string | null): EnrichmentQuality | null {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'minimal') {
    return value;
  }
  return null;
}

function toYearsExperienceSource(value: string | null): YearsExperienceSource | null {
  if (value === 'linkedin' || value === 'agency_website' || value === 'inferred') return value;
  return null;
}

function toScrapeStatus(value: string): ScrapeStatus {
  if (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'discovered' ||
    value === 'complete' ||
    value === 'failed' ||
    value === 'abandoned'
  ) {
    return value;
  }
  return 'pending';
}

function mapAgencyRow(row: AgencyRow): Agency {
  return {
    ...row,
    agent_count: row.agent_count ?? 0
  };
}

function mapAgentRow(row: AgentRow): Agent {
  const agencyName = row.agency_name ?? undefined;
  const agencySlug = row.agency_slug ?? undefined;

  const agent: Agent = {
    id: row.id,
    domain_id: row.domain_id,
    slug: row.slug,
    agency_id: row.agency_id,

    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    photo_url: row.photo_url,
    profile_text: row.profile_text,

    primary_suburb: row.primary_suburb,
    primary_state: row.primary_state,
    primary_postcode: row.primary_postcode,

    enriched_bio: row.enriched_bio,
    years_experience: row.years_experience,
    years_experience_source: toYearsExperienceSource(row.years_experience_source),
    career_start_year: row.career_start_year,
    languages: parseJsonArray<string>(row.languages),
    specializations: parseJsonArray<string>(row.specializations),
    property_types: parseJsonArray<string>(row.property_types),
    awards: parseJsonArray<Award>(row.awards),

    linkedin_url: row.linkedin_url,
    facebook_url: row.facebook_url,
    instagram_url: row.instagram_url,
    personal_website_url: row.personal_website_url,
    domain_profile_url: row.domain_profile_url,

    enrichment_status: toEnrichmentStatus(row.enrichment_status),
    enrichment_quality: toEnrichmentQuality(row.enrichment_quality),

    created_at: row.created_at,
    updated_at: row.updated_at,
    api_fetched_at: row.api_fetched_at,
    enriched_at: row.enriched_at
  };

  if (agencyName) agent.agency_name = agencyName;
  if (agencySlug) agent.agency_slug = agencySlug;

  return agent;
}

function mapScrapeProgressRow(row: ScrapeProgressRow): ScrapeProgress {
  return {
    ...row,
    status: toScrapeStatus(row.status)
  };
}

export function getAllSuburbs(): ScrapeProgress[] {
  try {
    const rows = db
      .prepare('SELECT * FROM scrape_progress ORDER BY priority_tier ASC, suburb_name ASC')
      .all() as ScrapeProgressRow[];
    return rows.map(mapScrapeProgressRow);
  } catch (error) {
    console.error('[getAllSuburbs]', { error });
    return [];
  }
}

export function getSuburbProgress(suburbSlug: string): ScrapeProgress | null {
  try {
    const row = db
      .prepare('SELECT * FROM scrape_progress WHERE slug = ? OR suburb_id = ?')
      .get(suburbSlug, suburbSlug) as ScrapeProgressRow | undefined;
    if (!row) return null;
    return mapScrapeProgressRow(row);
  } catch (error) {
    console.error('[getSuburbProgress]', { suburbSlug, error });
    return null;
  }
}

export function getAgencyBySlug(slug: string): Agency | null {
  try {
    const row = db.prepare('SELECT * FROM agencies WHERE slug = ?').get(slug) as AgencyRow | undefined;
    if (!row) return null;
    return mapAgencyRow(row);
  } catch (error) {
    console.error('[getAgencyBySlug]', { slug, error });
    return null;
  }
}

export function getAgenciesInSuburb(suburb: string): Agency[] {
  try {
    const rows = db
      .prepare('SELECT * FROM agencies WHERE suburb = ? ORDER BY name ASC')
      .all(suburb) as AgencyRow[];
    return rows.map(mapAgencyRow);
  } catch (error) {
    console.error('[getAgenciesInSuburb]', { suburb, error });
    return [];
  }
}

export function getAgentBySlug(slug: string): Agent | null {
  try {
    const row = db
      .prepare(`
        SELECT a.*, ag.name AS agency_name, ag.slug AS agency_slug
        FROM agents a
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        WHERE a.slug = ?
      `)
      .get(slug) as AgentRow | undefined;
    if (!row) return null;
    return mapAgentRow(row);
  } catch (error) {
    console.error('[getAgentBySlug]', { slug, error });
    return null;
  }
}

export function getAgentsInSuburb(suburb: string): Agent[] {
  try {
    const rows = db
      .prepare(`
        SELECT a.*, ag.name AS agency_name, ag.slug AS agency_slug
        FROM agents a
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        WHERE a.primary_suburb = ? OR ag.suburb = ?
        ORDER BY a.last_name ASC, a.first_name ASC
      `)
      .all(suburb, suburb) as AgentRow[];
    return rows.map(mapAgentRow);
  } catch (error) {
    console.error('[getAgentsInSuburb]', { suburb, error });
    return [];
  }
}

export function getAgentsByAgency(agencyId: number): Agent[] {
  try {
    const rows = db
      .prepare(`
        SELECT a.*, ag.name AS agency_name, ag.slug AS agency_slug
        FROM agents a
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        WHERE a.agency_id = ?
        ORDER BY a.last_name ASC, a.first_name ASC
      `)
      .all(agencyId) as AgentRow[];
    return rows.map(mapAgentRow);
  } catch (error) {
    console.error('[getAgentsByAgency]', { agencyId, error });
    return [];
  }
}

export function getAgencySlugsForBuild(): string[] {
  try {
    const rows = db
      .prepare(
        `
          SELECT slug
          FROM agencies
          ORDER BY slug ASC
        `
      )
      .all() as Array<{ slug: string }>;
    return rows.map((row) => row.slug);
  } catch (error) {
    console.error('[getAgencySlugsForBuild]', { error });
    return [];
  }
}

export function getAgentSlugsForBuild(): string[] {
  try {
    const rows = db
      .prepare(
        `
          SELECT slug
          FROM agents
          WHERE enrichment_status IS NULL OR enrichment_status IN ('pending', 'complete')
          ORDER BY slug ASC
        `
      )
      .all() as Array<{ slug: string }>;
    return rows.map((row) => row.slug);
  } catch (error) {
    console.error('[getAgentSlugsForBuild]', { error });
    return [];
  }
}

export function getRelatedAgentsInSuburb(suburb: string, excludeSlug: string, limit: number): Agent[] {
  try {
    const rows = db
      .prepare(
        `
          SELECT a.*, ag.name AS agency_name, ag.slug AS agency_slug
          FROM agents a
          LEFT JOIN agencies ag ON a.agency_id = ag.id
          WHERE (a.primary_suburb = ? OR ag.suburb = ?)
            AND a.slug <> ?
          ORDER BY a.last_name ASC, a.first_name ASC
          LIMIT ?
        `
      )
      .all(suburb, suburb, excludeSlug, limit) as AgentRow[];
    return rows.map(mapAgentRow);
  } catch (error) {
    console.error('[getRelatedAgentsInSuburb]', { suburb, excludeSlug, limit, error });
    return [];
  }
}
