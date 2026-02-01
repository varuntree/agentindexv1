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

