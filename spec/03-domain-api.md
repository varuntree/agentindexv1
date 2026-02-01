# 03 - Domain.com.au API

**Domain:** External API Integration
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base Configuration](#base-configuration)
4. [Endpoints Used in V1](#endpoints-used-in-v1)
5. [Endpoint: Search Agencies by Suburb](#endpoint-search-agencies-by-suburb)
6. [Endpoint: Get Agency Details](#endpoint-get-agency-details)
7. [Rate Limits & Budget](#rate-limits--budget)
8. [Error Handling](#error-handling)
9. [API Client Implementation](#api-client-implementation)
10. [Data Mapping](#data-mapping)
11. [Endpoints NOT Used in V1](#endpoints-not-used-in-v1)

---

## Overview

Domain.com.au provides a REST API for accessing real estate data in Australia. ARI uses this API to:

1. Discover agencies in a suburb
2. Fetch agency details including their agent roster
3. Store basic agent and agency information

### API Documentation

- **Portal:** https://developer.domain.com.au/
- **API Base:** https://api.domain.com.au/v1/
- **Auth Base:** https://auth.domain.com.au/

### V1 Data Strategy

📌 **Key Decision:** In V1, we minimize API calls by:

1. Using suburb search to find agencies (1 call per suburb)
2. Fetching agency details which includes embedded agents (1 call per agency)
3. **NOT** calling individual agent endpoints (saves ~10x API calls)

```
Suburb Search (1 call) → Returns 10-15 agency IDs
     │
     └──► Agency Details (10-15 calls) → Each includes 5-10 agents
              │
              └──► Total: ~12 calls per suburb for ~100 agents
```

---

## Authentication

### OAuth 2.0 Client Credentials Flow

Domain.com.au uses OAuth 2.0 with the Client Credentials grant type.

```
┌─────────────────┐                     ┌─────────────────┐
│  Control Center │                     │  Domain Auth    │
│                 │                     │                 │
│  1. Request     │ POST /v1/connect/token               │
│     Token       │ ─────────────────────────────────────►│
│                 │ client_id, client_secret, grant_type │
│                 │                     │                 │
│  2. Receive     │ { access_token, expires_in }         │
│     Token       │ ◄─────────────────────────────────────│
│                 │                     │                 │
│  3. API Calls   │ Authorization: Bearer {token}        │
│                 │ ─────────────────────────────────────►│ Domain API
│                 │                     │                 │
└─────────────────┘                     └─────────────────┘
```

### Token Request

```http
POST https://auth.domain.com.au/v1/connect/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}&
grant_type=client_credentials&
scope=api_agencies_read
```

### Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 43200,
  "token_type": "Bearer",
  "scope": "api_agencies_read"
}
```

### Token Management

| Property | Value |
|----------|-------|
| Token Lifetime | 12 hours (43200 seconds) |
| Storage | In-memory (no persistence needed) |
| Refresh Strategy | Fetch new token when expired or 401 received |

---

## Base Configuration

### Environment Variables

```bash
# .env (Control Center)
DOMAIN_API_CLIENT_ID=your_client_id
DOMAIN_API_CLIENT_SECRET=your_client_secret
```

### Constants

```typescript
// control-center/src/api/domain-client.ts

const CONFIG = {
  authUrl: 'https://auth.domain.com.au/v1/connect/token',
  baseUrl: 'https://api.domain.com.au/v1',
  scopes: ['api_agencies_read'],

  // Rate limiting
  dailyLimit: 500,
  requestDelayMs: 200,  // 200ms between requests

  // Retry settings
  maxRetries: 3,
  retryDelayMs: 1000,
};
```

---

## Endpoints Used in V1

| Endpoint | Purpose | Calls per Suburb |
|----------|---------|------------------|
| `GET /agencies?q=suburbId:{id}` | Find agencies in suburb | 1 |
| `GET /agencies/{id}` | Get agency + agents | ~12 |

**Total per suburb:** ~13 API calls for ~100 agents

---

## Endpoint: Search Agencies by Suburb

### Request

```http
GET https://api.domain.com.au/v1/agencies?q=suburbId:{suburbId}
Authorization: Bearer {access_token}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Query string with `suburbId:{id}` |

### Example Request

```typescript
const response = await fetch(
  `${CONFIG.baseUrl}/agencies?q=suburbId:30263`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);
```

### Response Shape

```json
[
  {
    "id": 12345,
    "name": "Ray White Bondi Beach",
    "suburb": "Bondi Beach",
    "state": "NSW",
    "postcode": "2026",
    "logoUrl": "https://images.domain.com.au/img/agency/12345/logo.png",
    "telephone": "(02) 9130 5888",
    "email": "bondi@raywhite.com",
    "numberForSale": 45,
    "numberForRent": 23
  },
  {
    "id": 12346,
    "name": "McGrath Bondi Beach",
    "suburb": "Bondi Beach",
    "state": "NSW",
    "postcode": "2026",
    "logoUrl": "https://images.domain.com.au/img/agency/12346/logo.png",
    "telephone": "(02) 9130 6000",
    "email": "bondibeach@mcgrath.com.au",
    "numberForSale": 32,
    "numberForRent": 18
  }
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Agency ID (use for detail fetch) |
| `name` | string | Full agency name |
| `suburb` | string | Suburb name |
| `state` | string | State abbreviation |
| `postcode` | string | Postcode |
| `logoUrl` | string | URL to agency logo |
| `telephone` | string | Contact phone |
| `email` | string | Contact email |
| `numberForSale` | number | Properties for sale count |
| `numberForRent` | number | Properties for rent count |

---

## Endpoint: Get Agency Details

### Request

```http
GET https://api.domain.com.au/v1/agencies/{id}
Authorization: Bearer {access_token}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Agency ID from search results |

### Example Request

```typescript
const response = await fetch(
  `${CONFIG.baseUrl}/agencies/12345`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);
```

### Response Shape

```json
{
  "id": 12345,
  "name": "Ray White Bondi Beach",
  "profile": {
    "agencyLogoStandard": "https://images.domain.com.au/img/agency/12345/logo.png",
    "agencyLogoLarge": "https://images.domain.com.au/img/agency/12345/logo_large.png",
    "agencyBanner": "https://images.domain.com.au/img/agency/12345/banner.jpg",
    "agencyWebsite": "https://raywhitebondibeach.com.au",
    "agencyDescription": "Ray White Bondi Beach is a leading real estate agency serving the Eastern Suburbs. Our team of experienced professionals is committed to delivering exceptional results for buyers and sellers alike.",
    "primaryColour": "#FFD100",
    "secondaryColour": "#000000",
    "textColour": "#FFFFFF"
  },
  "details": {
    "streetAddress1": "123 Campbell Parade",
    "streetAddress2": null,
    "suburb": "Bondi Beach",
    "state": "NSW",
    "postcode": "2026",
    "latitude": -33.8915,
    "longitude": 151.2767,
    "principalName": "Jane Doe",
    "principalEmail": "jane.doe@raywhite.com",
    "telephone": "(02) 9130 5888",
    "fax": "(02) 9130 5889"
  },
  "contacts": [
    {
      "type": "sales",
      "email": "sales@raywhitebondibeach.com.au"
    },
    {
      "type": "rentals",
      "email": "rentals@raywhitebondibeach.com.au"
    }
  ],
  "agents": [
    {
      "id": 67890,
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@raywhite.com",
      "phone": "(02) 9130 5880",
      "mobile": "0412 345 678",
      "fax": null,
      "photo": "https://images.domain.com.au/img/agent/67890/photo.jpg",
      "mugShotNew": "https://images.domain.com.au/img/agent/67890/mugshot.jpg",
      "profileText": "John has been selling property in Bondi Beach for over 8 years. He specializes in beachfront apartments and family homes. John speaks English and Mandarin fluently and has won multiple awards for his sales performance.",
      "profileUrl": "https://www.domain.com.au/real-estate-agent/john-smith-67890"
    },
    {
      "id": 67891,
      "firstName": "Mary",
      "lastName": "Chen",
      "email": "mary.chen@raywhite.com",
      "phone": "(02) 9130 5881",
      "mobile": "0413 456 789",
      "fax": null,
      "photo": "https://images.domain.com.au/img/agent/67891/photo.jpg",
      "mugShotNew": "https://images.domain.com.au/img/agent/67891/mugshot.jpg",
      "profileText": "Mary is a dedicated real estate professional with extensive experience in the Eastern Suburbs market. She is fluent in English, Mandarin, and Cantonese.",
      "profileUrl": "https://www.domain.com.au/real-estate-agent/mary-chen-67891"
    }
  ],
  "statistics": {
    "numberForSale": 45,
    "numberForRent": 23,
    "numberSoldThisYear": 87,
    "numberSoldLastYear": 92,
    "numberLeasedThisYear": 156,
    "numberLeasedLastYear": 148
  }
}
```

### Response Fields - Top Level

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Agency ID |
| `name` | string | Full agency name |
| `profile` | object | Branding and description |
| `details` | object | Location and contact info |
| `contacts` | array | Department contacts |
| `agents` | array | List of agents |
| `statistics` | object | Listing counts |

### Response Fields - profile

| Field | Type | Description |
|-------|------|-------------|
| `agencyLogoStandard` | string | Standard logo URL |
| `agencyLogoLarge` | string | Large logo URL |
| `agencyBanner` | string | Banner image URL |
| `agencyWebsite` | string | Agency website URL |
| `agencyDescription` | string | Agency description text |

### Response Fields - details

| Field | Type | Description |
|-------|------|-------------|
| `streetAddress1` | string | Street address line 1 |
| `streetAddress2` | string | Street address line 2 |
| `suburb` | string | Suburb |
| `state` | string | State |
| `postcode` | string | Postcode |
| `principalName` | string | Principal/Director name |
| `telephone` | string | Phone number |

### Response Fields - agents[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Agent ID (domain_id) |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `email` | string | Email address |
| `phone` | string | Office phone |
| `mobile` | string | Mobile phone |
| `photo` | string | Profile photo URL |
| `mugShotNew` | string | Alternative photo URL |
| `profileText` | string | Agent bio |
| `profileUrl` | string | Domain.com.au profile URL |

---

## Rate Limits & Budget

### Free Tier Limits

| Limit | Value |
|-------|-------|
| Daily calls | 500 |
| Reset time | 10:00 AM AEST |
| Rate | No explicit per-minute limit |

### Budget Strategy

**Per Suburb:**
- 1 agency search call
- ~12 agency detail calls (varies by suburb)
- **Total: ~13 calls per suburb**

**Daily Capacity:**
- 500 calls / 13 calls per suburb = **~38 suburbs per day**

**Recommended Daily Processing:**
- 3-5 suburbs per cycle (conservative)
- Leave buffer for retries and testing

### Rate Limiting Implementation

```typescript
class RateLimiter {
  private callsToday = 0;
  private lastCallTime = 0;
  private resetDate: Date;

  constructor(private dailyLimit: number, private delayMs: number) {
    this.resetDate = this.getNextResetTime();
  }

  async waitForSlot(): Promise<void> {
    // Check if we need to reset counter
    if (new Date() >= this.resetDate) {
      this.callsToday = 0;
      this.resetDate = this.getNextResetTime();
    }

    // Check daily limit
    if (this.callsToday >= this.dailyLimit) {
      throw new Error(`Daily API limit reached (${this.dailyLimit} calls)`);
    }

    // Enforce delay between calls
    const timeSinceLastCall = Date.now() - this.lastCallTime;
    if (timeSinceLastCall < this.delayMs) {
      await sleep(this.delayMs - timeSinceLastCall);
    }

    this.callsToday++;
    this.lastCallTime = Date.now();
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(10, 0, 0, 0);  // 10:00 AM AEST

    if (now >= reset) {
      reset.setDate(reset.getDate() + 1);
    }

    return reset;
  }

  getRemaining(): number {
    return this.dailyLimit - this.callsToday;
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Log error, skip |
| 401 | Unauthorized | Refresh token, retry |
| 403 | Forbidden | Check scopes |
| 404 | Not Found | Agency doesn't exist, skip |
| 429 | Too Many Requests | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Retry with backoff |

### Retry Strategy

```typescript
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 401) {
        // Token expired - refresh and retry
        await refreshToken();
        continue;
      }

      if (response.status === 429) {
        // Rate limited - wait longer
        const retryAfter = response.headers.get('Retry-After') || '60';
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }

      if (response.status >= 500) {
        // Server error - retry with exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError;
}
```

### Error Response Format

```json
{
  "type": "https://api.domain.com.au/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request was invalid",
  "errors": [
    {
      "field": "q",
      "message": "Invalid query format"
    }
  ]
}
```

---

## API Client Implementation

### Complete Client

```typescript
// control-center/src/api/domain-client.ts

import { Agency, Agent } from '../types';

interface DomainConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  baseUrl: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AgencySearchResult {
  id: number;
  name: string;
  suburb: string;
  state: string;
  postcode: string;
  logoUrl: string | null;
  telephone: string | null;
  email: string | null;
  numberForSale: number;
  numberForRent: number;
}

interface AgencyDetailResponse {
  id: number;
  name: string;
  profile: {
    agencyLogoStandard: string | null;
    agencyWebsite: string | null;
    agencyDescription: string | null;
  };
  details: {
    streetAddress1: string | null;
    suburb: string;
    state: string;
    postcode: string;
    principalName: string | null;
    telephone: string | null;
  };
  agents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    photo: string | null;
    profileText: string | null;
    profileUrl: string | null;
  }>;
  statistics: {
    numberForSale: number;
    numberForRent: number;
  };
}

export class DomainApiClient {
  private config: DomainConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private rateLimiter: RateLimiter;

  constructor() {
    this.config = {
      clientId: process.env.DOMAIN_API_CLIENT_ID!,
      clientSecret: process.env.DOMAIN_API_CLIENT_SECRET!,
      authUrl: 'https://auth.domain.com.au/v1/connect/token',
      baseUrl: 'https://api.domain.com.au/v1',
    };

    this.rateLimiter = new RateLimiter(500, 200);
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(this.config.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials',
        scope: 'api_agencies_read',
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data: TokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  // ═══════════════════════════════════════════════════════════════════
  // API METHODS
  // ═══════════════════════════════════════════════════════════════════

  async searchAgenciesBySuburb(suburbId: string): Promise<AgencySearchResult[]> {
    await this.rateLimiter.waitForSlot();

    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}/agencies?q=suburbId:${suburbId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Agency search failed: ${response.status}`);
    }

    return response.json();
  }

  async getAgencyDetails(agencyId: number): Promise<AgencyDetailResponse> {
    await this.rateLimiter.waitForSlot();

    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}/agencies/${agencyId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Agency ${agencyId} not found`);
      }
      throw new Error(`Agency details failed: ${response.status}`);
    }

    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════

  async fetchSuburbData(suburbId: string): Promise<{
    agencies: AgencySearchResult[];
    details: Map<number, AgencyDetailResponse>;
  }> {
    // Step 1: Search for agencies
    console.log(`[API] Searching agencies in suburb ${suburbId}`);
    const agencies = await this.searchAgenciesBySuburb(suburbId);
    console.log(`[API] Found ${agencies.length} agencies`);

    // Step 2: Fetch details for each agency
    const details = new Map<number, AgencyDetailResponse>();

    for (const agency of agencies) {
      try {
        console.log(`[API] Fetching details for ${agency.name}`);
        const detail = await this.getAgencyDetails(agency.id);
        details.set(agency.id, detail);
        console.log(`[API] Found ${detail.agents.length} agents`);
      } catch (error) {
        console.error(`[API] Failed to fetch ${agency.name}:`, error.message);
      }
    }

    return { agencies, details };
  }

  getRemainingCalls(): number {
    return this.rateLimiter.getRemaining();
  }
}

// Export singleton instance
export const domainApi = new DomainApiClient();
```

---

## Data Mapping

### Agency Search → Agency Table

```typescript
function mapSearchResultToAgency(
  result: AgencySearchResult,
  detail: AgencyDetailResponse
): Partial<Agency> {
  return {
    domain_id: result.id,
    slug: generateAgencySlug({ name: result.name, suburb: result.suburb }),
    name: result.name,
    brand_name: extractBrandName(result.name),
    brand_tier: getBrandTier(result.name),
    logo_url: detail.profile.agencyLogoStandard,
    website: detail.profile.agencyWebsite,
    description: detail.profile.agencyDescription,
    phone: detail.details.telephone,
    email: result.email,
    street_address: detail.details.streetAddress1,
    suburb: result.suburb,
    state: result.state,
    postcode: result.postcode,
    principal_name: detail.details.principalName,
    agent_count: detail.agents.length,
    properties_for_sale: result.numberForSale,
    properties_for_rent: result.numberForRent,
    api_fetched_at: new Date().toISOString(),
  };
}

function extractBrandName(agencyName: string): string | null {
  const brands = [
    'Ray White', 'LJ Hooker', 'McGrath', 'Belle Property',
    'Harcourts', 'Century 21', 'Raine & Horne', 'PRD',
    'First National', 'Laing+Simmons', 'Richardson & Wrench', 'Elders'
  ];

  for (const brand of brands) {
    if (agencyName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return null;
}
```

### Agency Agent → Agent Table

```typescript
function mapAgentFromAgency(
  agentData: AgencyDetailResponse['agents'][0],
  agency: Agency
): Partial<Agent> {
  return {
    domain_id: agentData.id,
    slug: generateAgentSlug({
      first_name: agentData.firstName,
      last_name: agentData.lastName,
      primary_suburb: agency.suburb,
      agency_name: agency.name,
      domain_id: agentData.id,
    }),
    agency_id: agency.id,
    first_name: agentData.firstName,
    last_name: agentData.lastName,
    email: agentData.email,
    phone: agentData.phone,
    mobile: agentData.mobile,
    photo_url: agentData.photo,
    profile_text: agentData.profileText,
    primary_suburb: agency.suburb,
    primary_state: agency.state,
    primary_postcode: agency.postcode,
    domain_profile_url: agentData.profileUrl,
    enrichment_status: 'pending',
    api_fetched_at: new Date().toISOString(),
  };
}
```

---

## Endpoints NOT Used in V1

⚠️ **These endpoints are explicitly excluded from V1 to conserve API budget:**

| Endpoint | Why Skipped |
|----------|-------------|
| `GET /v1/agents/{id}` | Agent data available in agency response |
| `GET /v1/agents/{id}/listings` | Listing stats deferred to V2 |
| `GET /v1/agents/{id}/statistics` | Sales stats deferred to V2 |
| `GET /v1/properties/*` | Property data not needed for V1 |
| `GET /v1/salesResults/*` | Sales results not needed for V1 |

### V2 Considerations

In V2, we may add:

```typescript
// NOT IMPLEMENTED IN V1
async getAgentListings(agentId: number): Promise<Listing[]> {
  // GET /v1/agents/{id}/listings
  // Returns current and recent listings
}

async getAgentStatistics(agentId: number): Promise<AgentStats> {
  // GET /v1/agents/{id}/statistics
  // Returns sales performance data
}
```

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - Where API client fits in architecture
- **[02-data-schemas.md](./02-data-schemas.md)** - How API data maps to database
- **[05-control-center.md](./05-control-center.md)** - UI for triggering API calls
- **[08-operations.md](./08-operations.md)** - API budget management
