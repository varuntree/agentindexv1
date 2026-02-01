import type { Database as SqliteDatabase } from 'better-sqlite3';

import { db } from '@/db/database';
import type {
  Agency,
  AgencyInsert,
  Agent,
  AgentInsert,
  Award,
  EnrichmentData,
  EnrichmentQuality,
  EnrichmentStatus,
  ScrapeProgress,
  ScrapeStatus,
  YearsExperienceSource
} from '@/types';

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

function toJson(value: unknown): string {
  return JSON.stringify(value ?? []);
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

function runUpdateById(
  database: SqliteDatabase,
  table: 'agencies' | 'agents',
  id: number,
  allowedColumns: readonly string[],
  data: Record<string, unknown>
): void {
  const updates = Object.entries(data).filter(
    ([key, value]) => allowedColumns.includes(key) && value !== undefined
  );
  if (updates.length === 0) return;

  const setClauses = updates.map(([key]) => `${key} = @${key}`);
  setClauses.push('updated_at = CURRENT_TIMESTAMP');

  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = @id`;
  const values: Record<string, unknown> = { id };
  for (const [key, value] of updates) values[key] = value;

  database.prepare(sql).run(values);
}

// Agencies
export function getAgencyById(id: number): Agency | null {
  try {
    const row = db.prepare('SELECT * FROM agencies WHERE id = ?').get(id) as AgencyRow | undefined;
    if (!row) return null;
    return mapAgencyRow(row);
  } catch (error) {
    console.error('[getAgencyById]', { id, error });
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

export function insertAgency(agency: AgencyInsert): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO agencies (
        domain_id,
        slug,
        name,
        brand_name,
        logo_url,
        website,
        description,
        phone,
        email,
        street_address,
        suburb,
        state,
        postcode,
        principal_name,
        agent_count,
        properties_for_sale,
        properties_for_rent,
        api_fetched_at
      ) VALUES (
        @domain_id,
        @slug,
        @name,
        @brand_name,
        @logo_url,
        @website,
        @description,
        @phone,
        @email,
        @street_address,
        @suburb,
        @state,
        @postcode,
        @principal_name,
        @agent_count,
        @properties_for_sale,
        @properties_for_rent,
        @api_fetched_at
      )
      ON CONFLICT DO UPDATE SET
        domain_id = excluded.domain_id,
        slug = excluded.slug,
        name = excluded.name,
        brand_name = excluded.brand_name,
        logo_url = excluded.logo_url,
        website = excluded.website,
        description = excluded.description,
        phone = excluded.phone,
        email = excluded.email,
        street_address = excluded.street_address,
        suburb = excluded.suburb,
        state = excluded.state,
        postcode = excluded.postcode,
        principal_name = excluded.principal_name,
        agent_count = excluded.agent_count,
        properties_for_sale = excluded.properties_for_sale,
        properties_for_rent = excluded.properties_for_rent,
        api_fetched_at = excluded.api_fetched_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);

    const row = stmt.get({
      domain_id: agency.domain_id,
      slug: agency.slug,
      name: agency.name,
      brand_name: agency.brand_name ?? null,
      logo_url: agency.logo_url ?? null,
      website: agency.website ?? null,
      description: agency.description ?? null,
      phone: agency.phone ?? null,
      email: agency.email ?? null,
      street_address: agency.street_address ?? null,
      suburb: agency.suburb,
      state: agency.state,
      postcode: agency.postcode,
      principal_name: agency.principal_name ?? null,
      agent_count: agency.agent_count ?? 0,
      properties_for_sale: agency.properties_for_sale ?? null,
      properties_for_rent: agency.properties_for_rent ?? null,
      api_fetched_at: null
    }) as { id: number } | undefined;

    if (!row) throw new Error('insertAgency did not return an id');
    return row.id;
  } catch (error) {
    console.error('[insertAgency]', { agencySlug: agency.slug, error });
    throw error;
  }
}

export function updateAgency(id: number, data: Partial<Agency>): void {
  try {
    runUpdateById(
      db,
      'agencies',
      id,
      [
        'domain_id',
        'slug',
        'name',
        'brand_name',
        'logo_url',
        'website',
        'description',
        'phone',
        'email',
        'street_address',
        'suburb',
        'state',
        'postcode',
        'principal_name',
        'agent_count',
        'properties_for_sale',
        'properties_for_rent',
        'api_fetched_at'
      ],
      data as unknown as Record<string, unknown>
    );
  } catch (error) {
    console.error('[updateAgency]', { id, error });
  }
}

// Agents
export function getAgentById(id: number): Agent | null {
  try {
    const row = db
      .prepare(`
        SELECT a.*, ag.name AS agency_name, ag.slug AS agency_slug
        FROM agents a
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        WHERE a.id = ?
      `)
      .get(id) as AgentRow | undefined;

    if (!row) return null;
    return mapAgentRow(row);
  } catch (error) {
    console.error('[getAgentById]', { id, error });
    return null;
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

export function getAgentsPendingEnrichment(limit: number): Agent[] {
  try {
    const rows = db
      .prepare(`
        SELECT *
        FROM agents
        WHERE enrichment_status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?
      `)
      .all(limit) as AgentRow[];

    return rows.map(mapAgentRow);
  } catch (error) {
    console.error('[getAgentsPendingEnrichment]', { limit, error });
    return [];
  }
}

export function insertAgent(agent: AgentInsert): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO agents (
        domain_id,
        slug,
        agency_id,
        first_name,
        last_name,
        email,
        phone,
        mobile,
        photo_url,
        profile_text,
        primary_suburb,
        primary_state,
        primary_postcode,
        enriched_bio,
        years_experience,
        years_experience_source,
        career_start_year,
        languages,
        specializations,
        property_types,
        awards,
        linkedin_url,
        facebook_url,
        instagram_url,
        personal_website_url,
        domain_profile_url,
        enrichment_status,
        enrichment_quality,
        api_fetched_at,
        enriched_at
      ) VALUES (
        @domain_id,
        @slug,
        @agency_id,
        @first_name,
        @last_name,
        @email,
        @phone,
        @mobile,
        @photo_url,
        @profile_text,
        @primary_suburb,
        @primary_state,
        @primary_postcode,
        @enriched_bio,
        @years_experience,
        @years_experience_source,
        @career_start_year,
        @languages,
        @specializations,
        @property_types,
        @awards,
        @linkedin_url,
        @facebook_url,
        @instagram_url,
        @personal_website_url,
        @domain_profile_url,
        @enrichment_status,
        @enrichment_quality,
        @api_fetched_at,
        @enriched_at
      )
      ON CONFLICT DO UPDATE SET
        domain_id = excluded.domain_id,
        slug = excluded.slug,
        agency_id = excluded.agency_id,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        phone = excluded.phone,
        mobile = excluded.mobile,
        photo_url = excluded.photo_url,
        profile_text = excluded.profile_text,
        primary_suburb = excluded.primary_suburb,
        primary_state = excluded.primary_state,
        primary_postcode = excluded.primary_postcode,
        enriched_bio = excluded.enriched_bio,
        years_experience = excluded.years_experience,
        years_experience_source = excluded.years_experience_source,
        career_start_year = excluded.career_start_year,
        languages = excluded.languages,
        specializations = excluded.specializations,
        property_types = excluded.property_types,
        awards = excluded.awards,
        linkedin_url = excluded.linkedin_url,
        facebook_url = excluded.facebook_url,
        instagram_url = excluded.instagram_url,
        personal_website_url = excluded.personal_website_url,
        domain_profile_url = excluded.domain_profile_url,
        enrichment_status = excluded.enrichment_status,
        enrichment_quality = excluded.enrichment_quality,
        api_fetched_at = excluded.api_fetched_at,
        enriched_at = excluded.enriched_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);

    const row = stmt.get({
      domain_id: agent.domain_id,
      slug: agent.slug,
      agency_id: agent.agency_id ?? null,
      first_name: agent.first_name,
      last_name: agent.last_name,
      email: agent.email ?? null,
      phone: agent.phone ?? null,
      mobile: agent.mobile ?? null,
      photo_url: agent.photo_url ?? null,
      profile_text: agent.profile_text ?? null,
      primary_suburb: agent.primary_suburb ?? null,
      primary_state: agent.primary_state ?? null,
      primary_postcode: agent.primary_postcode ?? null,
      enriched_bio: agent.enriched_bio ?? null,
      years_experience: agent.years_experience ?? null,
      years_experience_source: agent.years_experience_source ?? null,
      career_start_year: agent.career_start_year ?? null,
      languages: toJson(agent.languages ?? []),
      specializations: toJson(agent.specializations ?? []),
      property_types: toJson(agent.property_types ?? []),
      awards: toJson(agent.awards ?? []),
      linkedin_url: agent.linkedin_url ?? null,
      facebook_url: agent.facebook_url ?? null,
      instagram_url: agent.instagram_url ?? null,
      personal_website_url: agent.personal_website_url ?? null,
      domain_profile_url: agent.domain_profile_url ?? null,
      enrichment_status: agent.enrichment_status ?? 'pending',
      enrichment_quality: agent.enrichment_quality ?? null,
      api_fetched_at: null,
      enriched_at: null
    }) as { id: number } | undefined;

    if (!row) throw new Error('insertAgent did not return an id');
    return row.id;
  } catch (error) {
    console.error('[insertAgent]', { agentSlug: agent.slug, error });
    throw error;
  }
}

export function updateAgent(id: number, data: Partial<Agent>): void {
  try {
    const normalized: Record<string, unknown> = { ...data };

    if ('languages' in data && data.languages) normalized.languages = toJson(data.languages);
    if ('specializations' in data && data.specializations) normalized.specializations = toJson(data.specializations);
    if ('property_types' in data && data.property_types) normalized.property_types = toJson(data.property_types);
    if ('awards' in data && data.awards) normalized.awards = toJson(data.awards);

    runUpdateById(
      db,
      'agents',
      id,
      [
        'domain_id',
        'slug',
        'agency_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'mobile',
        'photo_url',
        'profile_text',
        'primary_suburb',
        'primary_state',
        'primary_postcode',
        'enriched_bio',
        'years_experience',
        'years_experience_source',
        'career_start_year',
        'languages',
        'specializations',
        'property_types',
        'awards',
        'linkedin_url',
        'facebook_url',
        'instagram_url',
        'personal_website_url',
        'domain_profile_url',
        'enrichment_status',
        'enrichment_quality',
        'api_fetched_at',
        'enriched_at'
      ],
      normalized
    );
  } catch (error) {
    console.error('[updateAgent]', { id, error });
  }
}

export function updateAgentEnrichment(id: number, enrichment: EnrichmentData): void {
  try {
    const stmt = db.prepare(`
      UPDATE agents
      SET
        enriched_bio = @enriched_bio,
        years_experience = @years_experience,
        years_experience_source = @years_experience_source,
        career_start_year = @career_start_year,
        languages = @languages,
        specializations = @specializations,
        property_types = @property_types,
        awards = @awards,
        linkedin_url = @linkedin_url,
        facebook_url = @facebook_url,
        instagram_url = @instagram_url,
        personal_website_url = @personal_website_url,
        domain_profile_url = @domain_profile_url,
        enrichment_status = @enrichment_status,
        enrichment_quality = @enrichment_quality,
        enriched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    stmt.run({
      id,
      enriched_bio: enrichment.enriched_bio ?? null,
      years_experience: enrichment.years_experience ?? null,
      years_experience_source: enrichment.years_experience_source ?? null,
      career_start_year: enrichment.career_start_year ?? null,
      languages: toJson(enrichment.languages ?? []),
      specializations: toJson(enrichment.specializations ?? []),
      property_types: toJson(enrichment.property_types ?? []),
      awards: toJson(enrichment.awards ?? []),
      linkedin_url: enrichment.linkedin_url ?? null,
      facebook_url: enrichment.facebook_url ?? null,
      instagram_url: enrichment.instagram_url ?? null,
      personal_website_url: enrichment.personal_website_url ?? null,
      domain_profile_url: enrichment.domain_profile_url ?? null,
      enrichment_status: enrichment.enrichment_status ?? 'complete',
      enrichment_quality: enrichment.enrichment_quality ?? null
    });
  } catch (error) {
    console.error('[updateAgentEnrichment]', { id, error });
  }
}

// Suburbs/Progress
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

export function updateSuburbProgress(suburbSlug: string, data: Partial<ScrapeProgress>): void {
  try {
    const allowed = [
      'suburb_name',
      'state',
      'postcode',
      'slug',
      'priority_tier',
      'region',
      'status',
      'agencies_found',
      'agents_found',
      'started_at',
      'completed_at',
      'error_message',
      'retry_count'
    ] as const;

    const updates = Object.entries(data).filter(
      ([key, value]) => (allowed as readonly string[]).includes(key) && value !== undefined
    );
    if (updates.length === 0) return;

    const setClauses = updates.map(([key]) => `${key} = @${key}`);
    const sql = `UPDATE scrape_progress SET ${setClauses.join(', ')} WHERE slug = @slug OR suburb_id = @slug`;

    const values: Record<string, unknown> = { slug: suburbSlug };
    for (const [key, value] of updates) values[key] = value;

    db.prepare(sql).run(values);
  } catch (error) {
    console.error('[updateSuburbProgress]', { suburbSlug, error });
  }
}
