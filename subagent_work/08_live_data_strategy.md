# Live Data Strategy for ARI v2

**Document Version:** 1.0
**Created:** 2026-02-01
**Purpose:** Technical architecture for integrating live Domain.com.au API data into the static ARI platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Static vs Dynamic Content Split](#1-static-vs-dynamic-content-split)
3. [Client-Side vs Server-Side API Calls](#2-client-side-vs-server-side-api-calls)
4. [Caching Strategies](#3-caching-strategies)
5. [Rate Limit Management](#4-rate-limit-management)
6. [Data Freshness Requirements](#5-data-freshness-requirements)
7. [Page Structure for Hybrid Content](#6-page-structure-for-hybrid-content)
8. [What Live Data to Show](#7-what-live-data-to-show)
9. [API Cost Optimization](#8-api-cost-optimization)
10. [Technical Implementation Patterns](#9-technical-implementation-patterns)
11. [Monitoring and Observability](#10-monitoring-and-observability)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

ARI's two-layer architecture separates **SEO content** (static, pre-built at deploy time) from **live data** (fetched on user visit). This strategy ensures:

- **SEO Foundation**: Google indexes rich, pre-built agent profiles
- **Fresh UX**: Users see current listings and recent sales
- **API Budget Protection**: Aggressive caching prevents rate limit exhaustion
- **Graceful Degradation**: Pages work perfectly without live data

### Key Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| API call location | Server-side (API routes) | Protects API keys, enables caching |
| Caching layer | Vercel KV + API route caching | Low latency, built-in with Vercel |
| Client library | TanStack Query | DevTools, mutations, better Next.js integration |
| Cache TTL | 2 hours (listings), 24 hours (stats) | Balances freshness with API budget |
| Fallback strategy | Show static data + "Live data unavailable" | Page never breaks |

---

## 1. Static vs Dynamic Content Split

### Content Classification Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT CLASSIFICATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STATIC (Pre-built at SSG)              DYNAMIC (Fetched on visit) │
│  ────────────────────────               ─────────────────────────── │
│                                                                     │
│  ✓ Agent name, photo                   ✓ Current listings (sale)   │
│  ✓ Agency affiliation                  ✓ Current listings (rent)   │
│  ✓ Contact info (phone, email)         ✓ Recent sales (7-30 days)  │
│  ✓ Bio/profile text                    ✓ Days on market (live)     │
│  ✓ Job position/title                  ✓ Sold prices (when avail)  │
│  ✓ Social media links                  ✓ Listing count changes     │
│  ✓ Historical stats (12mo)             ✓ Price changes             │
│  ✓ Enriched data (languages, etc)                                  │
│  ✓ Suburb/area coverage                                            │
│  ✓ Schema markup                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Split Works

**Static content is SEO-critical:**
- Agent name searches need indexed content
- Google can't execute JavaScript to see client-rendered data
- Historical stats provide evergreen value

**Dynamic content is user-experience critical:**
- Users expect current listings (stale = distrust)
- Recent sales prove agent activity
- "Live" feel increases engagement

### Page Structure Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT PROFILE PAGE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  STATIC SHELL (SSG - Indexed by Google)                      │   │
│  │  ─────────────────────────────────────────────────          │   │
│  │  • Header with agent name, photo, agency                    │   │
│  │  • Contact information                                      │   │
│  │  • Bio and credentials                                      │   │
│  │  • Historical performance stats                             │   │
│  │  • Schema markup (RealEstateAgent)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DYNAMIC OVERLAY (Client-rendered - Not indexed)            │   │
│  │  ─────────────────────────────────────────────────          │   │
│  │  • Current listings grid                                    │   │
│  │  • Recent sales carousel                                    │   │
│  │  • "Updated 2 hours ago" timestamp                          │   │
│  │  • Loading skeletons while fetching                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Client-Side vs Server-Side API Calls

### Comparison Matrix

| Factor | Client-Side | Server-Side (API Route) | Recommendation |
|--------|-------------|------------------------|----------------|
| **API Key Security** | Exposed in browser | Hidden on server | Server |
| **Caching Control** | Browser only | Multi-layer (CDN, edge, server) | Server |
| **Rate Limit Protection** | Per-user | Centralized | Server |
| **Bundle Size** | Increases client bundle | No client impact | Server |
| **CORS Issues** | Possible | None | Server |
| **Latency** | Direct to API | Extra hop through server | Client (slight edge) |
| **Request Deduplication** | Hard | Easy | Server |

### Recommendation: Server-Side via API Routes

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Browser                                                       │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────┐                                               │
│  │ Client Component │  ← TanStack Query                            │
│  │ (React)         │                                               │
│  └────────┬────────┘                                               │
│           │ fetch('/api/agent/[id]/listings')                      │
│           ▼                                                         │
│  ┌─────────────────┐                                               │
│  │ Next.js API     │  ← Rate limiting, caching logic               │
│  │ Route Handler   │  ← API key stored in env                      │
│  └────────┬────────┘                                               │
│           │ Check cache (Vercel KV)                                │
│           ▼                                                         │
│  ┌─────────────────┐                                               │
│  │ Vercel KV       │  ← Cached responses (TTL-based)               │
│  │ (Redis)         │                                               │
│  └────────┬────────┘                                               │
│           │ Cache miss? Fetch from Domain API                       │
│           ▼                                                         │
│  ┌─────────────────┐                                               │
│  │ Domain.com.au   │  ← 500 calls/day limit                        │
│  │ API             │                                               │
│  └─────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Considerations

**API Key Protection:**
```typescript
// .env.local (never committed)
DOMAIN_API_CLIENT_ID=xxx
DOMAIN_API_CLIENT_SECRET=yyy

// API Route - key never exposed to client
export async function GET(request: Request) {
  const token = await getDomainApiToken(); // OAuth2 flow
  const response = await fetch('https://api.domain.com.au/v1/...', {
    headers: { Authorization: `Bearer ${token}` }
  });
  // ...
}
```

**Why Not Client-Side:**
- Domain API uses OAuth2 Client Credentials flow
- Client secret would be exposed in browser
- No way to enforce rate limits per-user
- CORS may block cross-origin requests

---

## 3. Caching Strategies

### Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHING LAYERS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Browser Cache (TanStack Query)                           │
│  ─────────────────────────────────────────                         │
│  • staleTime: 5 minutes (show cached, don't refetch)               │
│  • cacheTime: 30 minutes (keep in memory for reuse)                │
│  • Deduplication: Same query = one request                         │
│                                                                     │
│  Layer 2: CDN/Edge Cache (Vercel)                                  │
│  ─────────────────────────────────────────                         │
│  • Cache-Control headers on API responses                          │
│  • s-maxage: 3600 (cache at edge for 1 hour)                       │
│  • stale-while-revalidate: 86400 (serve stale, refresh bg)         │
│                                                                     │
│  Layer 3: Application Cache (Vercel KV)                            │
│  ─────────────────────────────────────────                         │
│  • Redis-based key-value store                                     │
│  • TTL per data type (listings: 2hr, stats: 24hr)                  │
│  • Shared across all edge regions                                  │
│                                                                     │
│  Layer 4: Domain API (Source of Truth)                             │
│  ─────────────────────────────────────────                         │
│  • Only hit on cache miss                                          │
│  • 500 calls/day budget                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache TTLs by Data Type

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Current listings (for sale) | 2 hours | Properties can sell same-day |
| Current listings (for rent) | 4 hours | Rentals change less frequently |
| Recent sales | 12 hours | Historical, updates weekly |
| Agent stats (sold count) | 24 hours | Rarely changes mid-day |
| Listing details | 6 hours | Price/status can change |

### Cache Key Strategy

```typescript
// Cache key format: {entity}:{id}:{dataType}:{version}
const cacheKey = `agent:${agentId}:listings:v1`;
const cacheKey = `agent:${agentId}:sales:v1`;

// Example with Vercel KV
import { kv } from '@vercel/kv';

async function getAgentListings(agentId: string) {
  const cacheKey = `agent:${agentId}:listings:v1`;

  // Try cache first
  const cached = await kv.get(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  // Fetch from Domain API
  const listings = await domainApi.getAgentListings(agentId);

  // Cache with TTL (7200 seconds = 2 hours)
  await kv.set(cacheKey, listings, { ex: 7200 });

  return { data: listings, fromCache: false };
}
```

### Cache Invalidation Strategies

**Time-Based (Primary):**
- Set appropriate TTLs based on data volatility
- Let cache naturally expire

**Event-Based (Future Enhancement):**
- Webhook from Domain API (if available)
- Manual invalidation endpoint for critical updates

**Stale-While-Revalidate (Recommended):**
```typescript
// Next.js API Route with SWR headers
export async function GET(request: Request) {
  const data = await getAgentListings(agentId);

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
```

---

## 4. Rate Limit Management

### Budget Breakdown (500 calls/day)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DAILY API BUDGET ALLOCATION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Total Budget: 500 calls/day                                        │
│  Reset Time: 10am AEST                                              │
│                                                                     │
│  Allocation Strategy:                                               │
│  ─────────────────────                                              │
│  • Background refresh (off-peak): 100 calls (20%)                  │
│  • User-triggered fetches: 350 calls (70%)                         │
│  • Buffer/emergency: 50 calls (10%)                                │
│                                                                     │
│  With 2-hour cache TTL:                                            │
│  ─────────────────────                                              │
│  • Max unique agents cached: ~350/day                              │
│  • Cache hits serve unlimited users                                │
│  • Peak traffic doesn't exhaust budget                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Rate Limit Protection Mechanisms

**1. Request Coalescing**
```typescript
// Prevent duplicate in-flight requests for same agent
const inFlightRequests = new Map<string, Promise<any>>();

async function getAgentListings(agentId: string) {
  const key = `listings:${agentId}`;

  // Return existing promise if request in flight
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = fetchListingsFromApi(agentId);
  inFlightRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlightRequests.delete(key);
  }
}
```

**2. Budget Tracking**
```typescript
import { kv } from '@vercel/kv';

async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `rate_limit:${today}`;

  const current = await kv.incr(key);

  // Set expiry on first call of the day
  if (current === 1) {
    await kv.expire(key, 86400); // 24 hours
  }

  const DAILY_LIMIT = 500;
  const BUFFER = 50;

  return current <= (DAILY_LIMIT - BUFFER);
}
```

**3. Circuit Breaker Pattern**
```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

class DomainApiCircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed'
  };

  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.state.lastFailure > this.RESET_TIMEOUT) {
        this.state.state = 'half-open';
      } else {
        return null; // Return null, trigger fallback
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.failures = 0;
    this.state.state = 'closed';
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.FAILURE_THRESHOLD) {
      this.state.state = 'open';
    }
  }
}
```

**4. Priority Queue for High-Value Pages**
```typescript
// Prioritize agents with high traffic
async function shouldFetchLive(agentId: string): Promise<boolean> {
  const pageViews = await getPageViews(agentId, '24h');
  const budgetRemaining = await getRateLimitRemaining();

  // High-traffic agents always get live data
  if (pageViews > 100) return budgetRemaining > 100;

  // Medium traffic
  if (pageViews > 20) return budgetRemaining > 200;

  // Low traffic - only if budget is healthy
  return budgetRemaining > 400;
}
```

---

## 5. Data Freshness Requirements

### User Expectations Analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRESHNESS EXPECTATIONS BY DATA TYPE              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Data Type              Acceptable Staleness    User Impact         │
│  ─────────────────────  ────────────────────    ────────────────    │
│                                                                     │
│  For Sale Listings      2-4 hours               HIGH - Properties   │
│                                                 sell quickly,       │
│                                                 stale = distrust    │
│                                                                     │
│  For Rent Listings      4-6 hours               MEDIUM - Slower     │
│                                                 market than sales   │
│                                                                     │
│  Recent Sales           12-24 hours             LOW - Historical    │
│                                                 data, not urgent    │
│                                                                     │
│  Sold Prices            24+ hours               LOW - Reference     │
│                                                 data only           │
│                                                                     │
│  Agent Stats            24+ hours               LOW - Rarely        │
│                                                 changes mid-day     │
│                                                                     │
│  Days on Market         6-12 hours              MEDIUM - Indicator  │
│                                                 of property health  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### When Stale Data is Acceptable

**Acceptable:**
- User is browsing multiple agents (comparison mode)
- Page is first visit (skeleton + progressive load)
- API budget is low (graceful degradation)
- Off-peak hours (background refresh will update)

**Not Acceptable:**
- User clicked "View Current Listings" CTA
- User is on high-traffic agent page
- Data is older than 24 hours for any type

### Visual Indicators for Data Age

```tsx
// Component showing data freshness
function DataFreshnessIndicator({ lastUpdated }: { lastUpdated: Date }) {
  const ageMs = Date.now() - lastUpdated.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) {
    return <span className="text-green-600">Updated just now</span>;
  }

  if (ageHours < 4) {
    return <span className="text-green-600">Updated {Math.floor(ageHours)} hours ago</span>;
  }

  if (ageHours < 12) {
    return <span className="text-yellow-600">Updated {Math.floor(ageHours)} hours ago</span>;
  }

  return (
    <span className="text-orange-600">
      Data may be outdated • Updated {Math.floor(ageHours)} hours ago
    </span>
  );
}
```

---

## 6. Page Structure for Hybrid Content

### Next.js App Router Page Structure

```
app/
├── agent/
│   └── [slug]/
│       ├── page.tsx          ← Server Component (static shell)
│       ├── loading.tsx       ← Skeleton for route transitions
│       └── _components/
│           ├── AgentHeader.tsx        ← Server Component (static)
│           ├── AgentStats.tsx         ← Server Component (static)
│           ├── CurrentListings.tsx    ← Client Component (live)
│           └── RecentSales.tsx        ← Client Component (live)
```

### Page Component Pattern

```tsx
// app/agent/[slug]/page.tsx
import { Suspense } from 'react';
import { AgentHeader } from './_components/AgentHeader';
import { AgentStats } from './_components/AgentStats';
import { CurrentListings } from './_components/CurrentListings';
import { RecentSales } from './_components/RecentSales';
import { ListingsSkeleton, SalesSkeleton } from '@/components/skeletons';

// Static generation for SEO
export async function generateStaticParams() {
  const agents = await db.getAllAgentSlugs();
  return agents.map((slug) => ({ slug }));
}

// Page is static by default (Server Component)
export default async function AgentPage({
  params
}: {
  params: { slug: string }
}) {
  const agent = await db.getAgentBySlug(params.slug);

  if (!agent) {
    notFound();
  }

  return (
    <main>
      {/* STATIC: SEO-indexed content */}
      <AgentHeader agent={agent} />
      <AgentStats agent={agent} />

      {/* DYNAMIC: Client-rendered live data */}
      <section aria-label="Current Listings">
        <h2>Current Listings</h2>
        <Suspense fallback={<ListingsSkeleton count={6} />}>
          <CurrentListings agentId={agent.domainId} />
        </Suspense>
      </section>

      <section aria-label="Recent Sales">
        <h2>Recent Sales</h2>
        <Suspense fallback={<SalesSkeleton count={4} />}>
          <RecentSales agentId={agent.domainId} />
        </Suspense>
      </section>
    </main>
  );
}
```

### Client Component Pattern

```tsx
// app/agent/[slug]/_components/CurrentListings.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { ListingCard } from '@/components/ListingCard';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { ListingsSkeleton } from '@/components/skeletons';

interface CurrentListingsProps {
  agentId: number;
}

export function CurrentListings({ agentId }: CurrentListingsProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['agent', agentId, 'listings'],
    queryFn: () => fetch(`/api/agent/${agentId}/listings`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,        // 30 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: 1000,
  });

  // Loading state
  if (isLoading) {
    return <ListingsSkeleton count={6} />;
  }

  // Error state with graceful degradation
  if (isError) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">
          Live listing data is temporarily unavailable.
        </p>
        <p className="text-sm text-yellow-600">
          Contact the agent directly for current listings.
        </p>
      </div>
    );
  }

  // Empty state
  if (!data?.listings?.length) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p>No current listings at this time.</p>
      </div>
    );
  }

  // Success state
  return (
    <div>
      <DataFreshnessIndicator lastUpdated={new Date(dataUpdatedAt)} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
```

### Skeleton Component Pattern

```tsx
// components/skeletons/ListingsSkeleton.tsx
export function ListingsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg overflow-hidden"
        >
          {/* Image placeholder */}
          <div className="bg-gray-200 h-48 w-full" />

          {/* Content placeholder */}
          <div className="p-4 space-y-3">
            <div className="bg-gray-200 h-4 w-3/4 rounded" />
            <div className="bg-gray-200 h-4 w-1/2 rounded" />
            <div className="flex gap-2">
              <div className="bg-gray-200 h-6 w-16 rounded" />
              <div className="bg-gray-200 h-6 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Progressive Enhancement Pattern

The page works in three modes:

1. **Full Live Data**: API available, budget sufficient
2. **Cached Data**: API unavailable, serve from cache
3. **Static Only**: No cache, no API - show static content only

```tsx
// API Route with fallback logic
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;

  // Try cache first
  const cached = await kv.get(`agent:${agentId}:listings:v1`);
  if (cached) {
    return Response.json({
      ...cached,
      fromCache: true,
      cachedAt: cached.cachedAt
    });
  }

  // Check rate limit
  const canFetch = await checkRateLimit();
  if (!canFetch) {
    return Response.json(
      { error: 'Rate limit reached', fallback: true },
      { status: 429 }
    );
  }

  // Fetch from Domain API
  try {
    const listings = await circuitBreaker.execute(() =>
      domainApi.getAgentListings(agentId)
    );

    if (listings) {
      // Cache the response
      await kv.set(`agent:${agentId}:listings:v1`, {
        listings,
        cachedAt: Date.now()
      }, { ex: 7200 });

      return Response.json({ listings, fromCache: false });
    }

    // Circuit breaker open
    return Response.json(
      { error: 'Service temporarily unavailable', fallback: true },
      { status: 503 }
    );

  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch listings', fallback: true },
      { status: 500 }
    );
  }
}
```

---

## 7. What Live Data to Show

### High-Value Live Data (Prioritize)

| Data | API Endpoint | Value to Users | API Cost |
|------|--------------|----------------|----------|
| Current for-sale listings | `GET /v1/agents/{id}/listings` | Very High - Primary interest | 1 call |
| Current rental listings | Same endpoint with filter | High - Secondary interest | 0 (same call) |
| Recent sales (30 days) | Same endpoint, filter by sold | High - Proves activity | 0 (same call) |
| Days on market | Calculated from listing date | Medium - Property health | 0 (calculated) |

### Medium-Value Live Data

| Data | Source | Value | API Cost |
|------|--------|-------|----------|
| Sale prices (when disclosed) | Listing endpoint | Medium - Transparency | 0 (included) |
| Property photos (thumbnails) | Listing endpoint | Medium - Visual appeal | 0 (included) |
| Listing description snippets | Listing endpoint | Low - Context | 0 (included) |

### Not Worth Fetching Live

| Data | Why Not Live | Alternative |
|------|--------------|-------------|
| Agent bio | Rarely changes | Static (SSG) |
| Contact info | Rarely changes | Static (SSG) |
| Agency affiliation | Rarely changes | Static (SSG) |
| 12-month stats | Updates weekly at most | Static + monthly rebuild |
| Social links | Rarely changes | Static (SSG) |

### Optimal API Call Strategy

```typescript
// One API call gets all live data needed
async function fetchAgentLiveData(agentId: number) {
  // Single call with archived listings included
  const response = await domainApi.get(
    `/v1/agents/${agentId}/listings?includedArchivedListings=true`
  );

  const listings = response.data;

  // Process into categories (no additional API calls)
  return {
    forSale: listings.filter(l => l.status === 'live' && l.saleMode === 'sale'),
    forRent: listings.filter(l => l.status === 'live' && l.saleMode === 'rent'),
    recentSales: listings.filter(l =>
      l.status === 'sold' &&
      isWithinDays(l.soldDate, 30)
    ),
    stats: {
      totalActive: listings.filter(l => l.status === 'live').length,
      soldLast30Days: listings.filter(l =>
        l.status === 'sold' && isWithinDays(l.soldDate, 30)
      ).length,
      avgDaysOnMarket: calculateAvgDOM(listings),
    }
  };
}
```

---

## 8. API Cost Optimization

### Domain.com.au API Tiers

Based on available information, Domain offers:

| Tier | Calls/Day | Cost | Best For |
|------|-----------|------|----------|
| Free | 500 | $0 | MVP, validation |
| Paid (estimated) | 5,000+ | Unknown | Scale |

**Note:** Domain API pricing for paid tiers is not publicly documented. Contact Domain Group directly for enterprise pricing.

### Cost-Benefit Analysis

**Staying on Free Tier (500 calls/day):**

```
Scenario: 1,000 daily visitors, 5 pages/visitor average

With 2-hour cache TTL:
- Unique agents viewable: ~350/day (fresh)
- Total page views served: Unlimited (from cache)
- Cache hit rate target: 95%+

Calculation:
- 5,000 page views × 5% cache miss = 250 API calls
- Remaining budget: 250 calls for background refresh
- Result: Sustainable on free tier ✓
```

**When to Upgrade:**

Upgrade when:
- Daily unique agent views exceed 400
- Cache hit rate drops below 90%
- Background refresh needs increase
- Real-time features are required

### Optimization Strategies

**1. Aggressive Caching (Primary)**
- 2-hour TTL for listings
- 24-hour TTL for stats
- Stale-while-revalidate for seamless UX

**2. Request Batching**
```typescript
// Batch multiple agent requests (if visiting agency page)
async function fetchAgencyAgentListings(agencyId: number) {
  const agency = await db.getAgencyWithAgents(agencyId);

  // Fetch all agents in parallel, respecting rate limits
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < agency.agents.length; i += batchSize) {
    const batch = agency.agents.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(agent => getAgentListings(agent.domainId))
    );
    results.push(...batchResults);

    // Small delay between batches to avoid rate limit spikes
    if (i + batchSize < agency.agents.length) {
      await sleep(100);
    }
  }

  return results;
}
```

**3. Background Pre-warming**
```typescript
// Cron job: Pre-warm cache for high-traffic agents
// Run at 4am when traffic is low

async function prewarmCache() {
  const topAgents = await db.getTopAgentsByPageViews(100);

  for (const agent of topAgents) {
    const budgetRemaining = await getRateLimitRemaining();
    if (budgetRemaining < 100) break; // Preserve buffer

    await getAgentListings(agent.domainId); // Populates cache
    await sleep(1000); // Rate limit friendly
  }
}
```

**4. Lazy Loading for Below-Fold Content**
```tsx
// Only fetch live data when section scrolls into view
import { useInView } from 'react-intersection-observer';

function RecentSales({ agentId }: { agentId: number }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { data } = useQuery({
    queryKey: ['agent', agentId, 'sales'],
    queryFn: () => fetchRecentSales(agentId),
    enabled: inView, // Only fetch when visible
  });

  return (
    <div ref={ref}>
      {inView ? <SalesGrid sales={data} /> : <SalesSkeleton />}
    </div>
  );
}
```

### Alternatives if Domain API is Too Expensive

| Alternative | Pros | Cons |
|-------------|------|------|
| Scraping Domain.com.au | No cost | Legal risk, brittle, rate limited |
| Scraping agency websites | Direct source | Inconsistent formats, maintenance |
| Manual data entry | Accurate | Doesn't scale |
| User-submitted data | Free | Quality control needed |
| Partner with agencies | Official data | Business development required |

**Recommendation:** Start with free tier, optimize aggressively, only upgrade when necessary.

---

## 9. Technical Implementation Patterns

### TanStack Query Setup

```typescript
// providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000,   // 30 minutes
        retry: 2,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### API Route Handler Pattern

```typescript
// app/api/agent/[id]/listings/route.ts
import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { getDomainApiToken } from '@/lib/domain-api';

export const runtime = 'edge'; // Optional: Run at edge for lower latency

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const cacheKey = `agent:${agentId}:listings:v1`;

  // Check cache
  const cached = await kv.get(cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  // Rate limit check
  const rateLimitKey = `ratelimit:${new Date().toISOString().split('T')[0]}`;
  const currentCount = await kv.incr(rateLimitKey);
  if (currentCount === 1) await kv.expire(rateLimitKey, 86400);

  if (currentCount > 450) { // Buffer of 50
    return Response.json(
      { error: 'Rate limit reached', cached: null },
      { status: 429 }
    );
  }

  // Fetch from Domain API
  try {
    const token = await getDomainApiToken();
    const response = await fetch(
      `https://api.domain.com.au/v1/agents/${agentId}/listings?includedArchivedListings=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Domain API error: ${response.status}`);
    }

    const listings = await response.json();
    const data = {
      listings,
      fetchedAt: Date.now(),
    };

    // Cache for 2 hours
    await kv.set(cacheKey, data, { ex: 7200 });

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Domain API error:', error);
    return Response.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
```

### Custom Hook for Live Data

```typescript
// hooks/useAgentLiveData.ts
import { useQuery, useQueries } from '@tanstack/react-query';

interface UseAgentLiveDataOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useAgentListings(
  agentId: number,
  options: UseAgentLiveDataOptions = {}
) {
  return useQuery({
    queryKey: ['agent', agentId, 'listings'],
    queryFn: async () => {
      const response = await fetch(`/api/agent/${agentId}/listings`);
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      return response.json();
    },
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    enabled: options.enabled ?? true,
    select: (data) => ({
      forSale: data.listings.filter(l => l.status === 'live' && l.saleMode === 'sale'),
      forRent: data.listings.filter(l => l.status === 'live' && l.saleMode === 'rent'),
      recentSales: data.listings.filter(l =>
        l.status === 'sold' &&
        new Date(l.soldDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ),
      fetchedAt: data.fetchedAt,
    }),
  });
}

// Prefetch on hover (for agency page agent cards)
export function usePrefetchAgentListings() {
  const queryClient = useQueryClient();

  return useCallback((agentId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['agent', agentId, 'listings'],
      queryFn: () => fetch(`/api/agent/${agentId}/listings`).then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
}
```

### Error Boundary for Live Data

```tsx
// components/LiveDataErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class LiveDataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Live data error:', error);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage
<LiveDataErrorBoundary
  fallback={
    <div className="p-4 bg-yellow-50 rounded">
      Live data temporarily unavailable
    </div>
  }
>
  <CurrentListings agentId={agent.domainId} />
</LiveDataErrorBoundary>
```

---

## 10. Monitoring and Observability

### Key Metrics to Track

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  API BUDGET                          CACHE PERFORMANCE              │
│  ─────────────                       ─────────────────              │
│  • Calls today: 347/500              • Hit rate: 94.2%              │
│  • Calls remaining: 153              • Avg response: 45ms           │
│  • Time until reset: 6h 23m          • Cache size: 2.4 MB           │
│  • Trend: ↓ 12% vs yesterday         • Entries: 892                 │
│                                                                     │
│  USER EXPERIENCE                     ERROR RATES                    │
│  ─────────────                       ────────────                   │
│  • P50 latency: 120ms                • API errors: 0.3%             │
│  • P95 latency: 890ms                • Timeout rate: 0.1%           │
│  • Fallback served: 2.1%             • Circuit breaker: Closed      │
│  • Skeleton shown: 8.4%                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation with Vercel Analytics

```typescript
// lib/monitoring.ts
import { track } from '@vercel/analytics';

// Track API usage
export async function trackApiCall(endpoint: string, cached: boolean) {
  track('api_call', {
    endpoint,
    cached: cached ? 'hit' : 'miss',
    timestamp: new Date().toISOString(),
  });
}

// Track rate limit status
export async function trackRateLimitStatus(remaining: number) {
  if (remaining < 100) {
    track('rate_limit_warning', {
      remaining,
      severity: remaining < 50 ? 'critical' : 'warning',
    });
  }
}

// Track user experience
export async function trackLiveDataLoad(
  agentId: number,
  loadTimeMs: number,
  source: 'cache' | 'api' | 'fallback'
) {
  track('live_data_load', {
    agentId,
    loadTimeMs,
    source,
  });
}
```

### Alerting Rules

```typescript
// Recommended alert thresholds

const ALERT_RULES = {
  // Rate limit alerts
  rateLimitWarning: {
    threshold: 100, // remaining calls
    action: 'Slack notification',
  },
  rateLimitCritical: {
    threshold: 50,
    action: 'PagerDuty alert',
  },

  // Cache alerts
  cacheHitRateLow: {
    threshold: 0.80, // 80%
    action: 'Investigate cache TTLs',
  },

  // Error alerts
  apiErrorRate: {
    threshold: 0.05, // 5%
    action: 'Check Domain API status',
  },

  // Latency alerts
  p95Latency: {
    threshold: 2000, // 2 seconds
    action: 'Review slow queries',
  },
};
```

### Custom Logging

```typescript
// lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
  timestamp: string;
}

export function log(entry: Omit<LogEntry, 'timestamp'>) {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Console log (captured by Vercel Logs)
  console.log(JSON.stringify(logEntry));

  // Optional: Send to external service
  if (entry.level === 'error') {
    // sendToSentry(logEntry);
  }
}

// Usage
log({
  level: 'info',
  message: 'Domain API call',
  context: {
    agentId: 12345,
    cached: false,
    responseTime: 234,
    rateLimitRemaining: 423,
  },
});
```

### Vercel KV Metrics

```typescript
// Track cache operations
async function getCachedWithMetrics<T>(key: string): Promise<T | null> {
  const start = Date.now();

  try {
    const value = await kv.get<T>(key);

    track('cache_operation', {
      operation: 'get',
      hit: value !== null,
      latencyMs: Date.now() - start,
    });

    return value;
  } catch (error) {
    track('cache_error', {
      operation: 'get',
      error: error.message,
    });
    throw error;
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (v2.0)

**Week 1-2:**
- [ ] Set up Vercel KV for caching
- [ ] Create API route handlers for Domain API proxy
- [ ] Implement basic rate limiting
- [ ] Add TanStack Query provider

**Deliverables:**
- Working `/api/agent/[id]/listings` endpoint
- Cache layer with 2-hour TTL
- Rate limit tracking in KV

### Phase 2: UI Integration (v2.1)

**Week 3-4:**
- [ ] Create `CurrentListings` client component
- [ ] Create `RecentSales` client component
- [ ] Design and implement skeleton loaders
- [ ] Add data freshness indicators
- [ ] Implement error boundaries

**Deliverables:**
- Live data appearing on agent pages
- Graceful fallback when data unavailable
- Loading states that match design

### Phase 3: Optimization (v2.2)

**Week 5-6:**
- [ ] Implement circuit breaker
- [ ] Add request coalescing
- [ ] Set up background cache pre-warming
- [ ] Optimize cache TTLs based on data

**Deliverables:**
- Resilient API integration
- Optimized cache hit rates
- Documented TTL tuning

### Phase 4: Monitoring (v2.3)

**Week 7-8:**
- [ ] Integrate Vercel Analytics tracking
- [ ] Set up alerting for rate limits
- [ ] Create monitoring dashboard
- [ ] Document operational runbooks

**Deliverables:**
- Full observability stack
- Alert rules configured
- Operations documentation

---

## Appendix: Code Examples

### Complete API Route Example

```typescript
// app/api/agent/[id]/listings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Configuration
const CACHE_TTL = 7200; // 2 hours
const DAILY_LIMIT = 500;
const DAILY_BUFFER = 50;

// Domain API client
class DomainApiClient {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const response = await fetch('https://auth.domain.com.au/v1/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.DOMAIN_CLIENT_ID!,
        client_secret: process.env.DOMAIN_CLIENT_SECRET!,
        scope: 'api_agencies_read api_listings_read',
      }),
    });

    const data = await response.json();
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
    };

    return this.tokenCache.token;
  }

  async getAgentListings(agentId: string) {
    const token = await this.getToken();

    const response = await fetch(
      `https://api.domain.com.au/v1/agents/${agentId}/listings?includedArchivedListings=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Domain API: ${response.status}`);
    }

    return response.json();
  }
}

const domainApi = new DomainApiClient();

// Rate limit helper
async function checkAndIncrementRateLimit(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const key = `ratelimit:daily:${today}`;

  const current = await kv.incr(key);
  if (current === 1) {
    await kv.expire(key, 86400);
  }

  const limit = DAILY_LIMIT - DAILY_BUFFER;
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}

// Main handler
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const cacheKey = `agent:${agentId}:listings:v1`;

  // 1. Try cache
  const cached = await kv.get<{
    listings: any[];
    fetchedAt: number;
  }>(cacheKey);

  if (cached) {
    return NextResponse.json({
      ...cached,
      fromCache: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.floor((Date.now() - cached.fetchedAt) / 1000)),
      },
    });
  }

  // 2. Check rate limit
  const rateLimit = await checkAndIncrementRateLimit();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Please try again later',
        remaining: rateLimit.remaining,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '3600',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  }

  // 3. Fetch from Domain API
  try {
    const listings = await domainApi.getAgentListings(agentId);

    const data = {
      listings,
      fetchedAt: Date.now(),
    };

    // 4. Cache response
    await kv.set(cacheKey, data, { ex: CACHE_TTL });

    return NextResponse.json({
      ...data,
      fromCache: false,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });

  } catch (error) {
    console.error('Domain API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch listings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## References

- [Next.js Caching Guide](https://nextjs.org/docs/app/guides/caching)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Domain.com.au API Documentation](https://developer.domain.com.au/docs/latest/apis/)
- [Circuit Breaker Pattern](https://blog.appsignal.com/2020/07/22/nodejs-resiliency-concepts-the-circuit-breaker.html)
- [Next.js Streaming and Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
