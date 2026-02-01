export interface DiscoveryAgentResult {
  email: string | null;
  first_name: string;
  last_name: string;
  mobile: string | null;
  phone: string | null;
  photo_url: string | null;
  profile_text: string | null;
}

export interface DiscoveryAgencyResult {
  agents: DiscoveryAgentResult[];
  brand_name: string | null;
  description: string | null;
  email: string | null;
  logo_url: string | null;
  name: string;
  phone: string | null;
  postcode: string;
  state: string;
  street_address: string | null;
  suburb: string;
  website: string | null;
}

export interface DiscoveryOutput {
  agencies: DiscoveryAgencyResult[];
  status: 'success' | 'partial' | 'failed';
}

export interface EnrichmentAward {
  level: 'agency' | 'regional' | 'state' | 'national' | null;
  name: string;
  organization: string | null;
  year: number | null;
}

export interface EnrichedAgentData {
  agent_domain_id: number;

  enriched_bio: string | null;
  years_experience: number | null;
  years_experience_source: 'linkedin' | 'agency_website' | 'google' | 'inferred' | null;
  career_start_year: number | null;

  languages: string[];
  specializations: string[];
  property_types: string[];
  awards: EnrichmentAward[];

  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  personal_website_url: string | null;

  confidence: 'high' | 'medium' | 'low' | 'minimal';
  sources_found: string[];

  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
}

export interface EnrichmentBatchOutput {
  agents: EnrichedAgentData[];
  batch_id: string;
  processed_at: string;
  summary: {
    failed: number;
    partial: number;
    successful: number;
    total_processed: number;
  };
}

export const DiscoveryOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'agencies'],
  properties: {
    status: { type: 'string', enum: ['success', 'partial', 'failed'] },
    agencies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'suburb', 'state', 'postcode', 'agents'],
        properties: {
          name: { type: 'string', minLength: 1 },
          brand_name: { type: ['string', 'null'] },
          website: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] },
          email: { type: ['string', 'null'] },
          street_address: { type: ['string', 'null'] },
          suburb: { type: 'string', minLength: 1 },
          state: { type: 'string', minLength: 1 },
          postcode: { type: 'string', minLength: 1 },
          logo_url: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          agents: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['first_name', 'last_name'],
              properties: {
                first_name: { type: 'string', minLength: 1 },
                last_name: { type: 'string', minLength: 1 },
                email: { type: ['string', 'null'] },
                phone: { type: ['string', 'null'] },
                mobile: { type: ['string', 'null'] },
                photo_url: { type: ['string', 'null'] },
                profile_text: { type: ['string', 'null'] }
              }
            }
          }
        }
      }
    }
  }
} as const;

export const EnrichmentBatchOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['batch_id', 'processed_at', 'agents', 'summary'],
  properties: {
    batch_id: { type: 'string', minLength: 1 },
    processed_at: { type: 'string', minLength: 1 },
    agents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['agent_domain_id', 'status', 'confidence', 'sources_found'],
        properties: {
          agent_domain_id: { type: 'integer' },
          enriched_bio: { type: ['string', 'null'] },
          years_experience: { type: ['integer', 'null'], minimum: 0, maximum: 50 },
          years_experience_source: {
            type: ['string', 'null'],
            enum: ['linkedin', 'agency_website', 'google', 'inferred', null]
          },
          career_start_year: { type: ['integer', 'null'], minimum: 1950 },
          languages: { type: 'array', items: { type: 'string' } },
          specializations: { type: 'array', items: { type: 'string' } },
          property_types: { type: 'array', items: { type: 'string' } },
          awards: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'year', 'level', 'organization'],
              properties: {
                name: { type: 'string', minLength: 1 },
                year: { type: ['integer', 'null'] },
                level: { type: ['string', 'null'], enum: ['agency', 'regional', 'state', 'national', null] },
                organization: { type: ['string', 'null'] }
              }
            }
          },
          linkedin_url: { type: ['string', 'null'] },
          facebook_url: { type: ['string', 'null'] },
          instagram_url: { type: ['string', 'null'] },
          personal_website_url: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low', 'minimal'] },
          sources_found: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['success', 'partial', 'failed'] },
          error_message: { type: ['string', 'null'] }
        }
      }
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['total_processed', 'successful', 'partial', 'failed'],
      properties: {
        total_processed: { type: 'integer', minimum: 0 },
        successful: { type: 'integer', minimum: 0 },
        partial: { type: 'integer', minimum: 0 },
        failed: { type: 'integer', minimum: 0 }
      }
    }
  }
} as const;
