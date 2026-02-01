export interface Award {
  level: 'agency' | 'regional' | 'state' | 'national' | null;
  name: string;
  organization: string | null;
  year: number | null;
}

export type EnrichmentQuality = 'high' | 'medium' | 'low' | 'minimal';
export type EnrichmentStatus = 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';

export type ScrapeStatus =
  | 'pending'
  | 'in_progress'
  | 'discovered'
  | 'complete'
  | 'failed'
  | 'abandoned';

export type YearsExperienceSource = 'linkedin' | 'agency_website' | 'google' | 'inferred';

export interface Agency {
  agent_count: number;
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

export interface Agent {
  agency_id: number | null;
  agency_name?: string;
  agency_slug?: string;
  api_fetched_at: string | null;
  awards: Award[];
  career_start_year: number | null;
  created_at: string;
  domain_id: number;
  domain_profile_url: string | null;
  email: string | null;
  enriched_at: string | null;
  enriched_bio: string | null;
  enrichment_quality: EnrichmentQuality | null;
  enrichment_error: string | null;
  enrichment_sources: string[];
  enrichment_status: EnrichmentStatus;
  facebook_url: string | null;
  first_name: string;
  id: number;
  instagram_url: string | null;
  languages: string[];
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
  property_types: string[];
  slug: string;
  specializations: string[];
  updated_at: string;
  years_experience: number | null;
  years_experience_source: YearsExperienceSource | null;
}

export interface ScrapeProgress {
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
  status: ScrapeStatus;
  suburb_id: string;
  suburb_name: string;
}

export interface AgencyInsert {
  agent_count?: number | null;
  brand_name?: string | null;
  description?: string | null;
  domain_id: number;
  email?: string | null;
  logo_url?: string | null;
  name: string;
  phone?: string | null;
  postcode: string;
  principal_name?: string | null;
  properties_for_rent?: number | null;
  properties_for_sale?: number | null;
  slug: string;
  state: string;
  street_address?: string | null;
  suburb: string;
  website?: string | null;
}

export interface AgentInsert {
  agency_id?: number | null;
  awards?: Award[] | null;
  career_start_year?: number | null;
  domain_id: number;
  domain_profile_url?: string | null;
  email?: string | null;
  enriched_bio?: string | null;
  enrichment_quality?: EnrichmentQuality | null;
  enrichment_error?: string | null;
  enrichment_sources?: string[] | null;
  enrichment_status?: EnrichmentStatus | null;
  facebook_url?: string | null;
  first_name: string;
  instagram_url?: string | null;
  languages?: string[] | null;
  last_name: string;
  linkedin_url?: string | null;
  mobile?: string | null;
  personal_website_url?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  primary_postcode?: string | null;
  primary_state?: string | null;
  primary_suburb?: string | null;
  profile_text?: string | null;
  property_types?: string[] | null;
  slug: string;
  specializations?: string[] | null;
  years_experience?: number | null;
  years_experience_source?: YearsExperienceSource | null;
}

export interface EnrichmentData {
  awards?: Award[] | null;
  career_start_year?: number | null;
  domain_profile_url?: string | null;
  enriched_bio?: string | null;
  enrichment_quality?: EnrichmentQuality | null;
  enrichment_error?: string | null;
  enrichment_sources?: string[] | null;
  enrichment_status?: EnrichmentStatus | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  languages?: string[] | null;
  linkedin_url?: string | null;
  personal_website_url?: string | null;
  property_types?: string[] | null;
  specializations?: string[] | null;
  years_experience?: number | null;
  years_experience_source?: YearsExperienceSource | null;
}
