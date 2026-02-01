# Next.js SEO Patterns for ARI (Australian Real Estate Agents Index)

**Document Type:** Technical Research Report
**Created:** 2026-02-01
**Scope:** SSG/ISR patterns, sitemaps, URL structure, internal linking, performance, metadata, and crawl budget management for a 10,000+ page programmatic SEO site

---

## Table of Contents

1. [SSG vs ISR Decision](#1-ssg-vs-isr-decision)
2. [Sitemap Strategy](#2-sitemap-strategy)
3. [URL Structure Best Practices](#3-url-structure-best-practices)
4. [Internal Linking Architecture](#4-internal-linking-architecture)
5. [Page Speed Optimization](#5-page-speed-optimization)
6. [Metadata Generation](#6-metadata-generation)
7. [Crawl Budget Management](#7-crawl-budget-management)
8. [Next.js Implementation Patterns](#8-nextjs-implementation-patterns)
9. [Recommended Project Structure](#9-recommended-project-structure)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. SSG vs ISR Decision

### Overview

For ARI's use case (10,000+ pages of relatively stable agent/agency data), a **hybrid approach** is recommended:

| Page Type | Rendering Strategy | Rationale |
|-----------|-------------------|-----------|
| Agent Pages | SSG with ISR fallback | Core SEO pages, data changes infrequently |
| Agency Pages | SSG with ISR fallback | Similar reasoning to agent pages |
| Suburb Pages | SSG with ISR fallback | Aggregate pages, data changes when agents added |
| State Pages | SSG | Very stable, rebuild on deploy |
| Homepage | SSG | Stable, can highlight featured content |

### Build Time Considerations for 10,000+ Pages

**The Problem:** A naive SSG approach would attempt to build all 10,000+ pages at deploy time, causing:
- Build timeouts (Vercel has a 45-minute limit on Hobby, 6 hours on Pro)
- Excessive compute costs
- Slow iteration during development

**The Solution: On-Demand Static Regeneration with Fallback**

```typescript
// app/agent/[slug]/page.tsx

// Only pre-build the top 500-1000 most important pages
export async function generateStaticParams() {
  const db = await getDatabase();

  // Pre-build only high-priority agents (e.g., most active, most searched)
  const topAgents = await db.query(`
    SELECT slug FROM agents
    WHERE properties_sold_12mo > 5
    ORDER BY properties_sold_12mo DESC
    LIMIT 1000
  `);

  return topAgents.map((agent) => ({
    slug: agent.slug,
  }));
}

// This is the key: dynamicParams allows pages not in generateStaticParams
// to be generated on-demand and then cached
export const dynamicParams = true;

// ISR: Revalidate every 24 hours (86400 seconds)
export const revalidate = 86400;
```

### ISR Revalidation Strategies

**Time-Based Revalidation (Recommended for ARI):**

```typescript
// Agent pages - revalidate daily
export const revalidate = 86400; // 24 hours

// Suburb pages - revalidate every 12 hours (agents may be added)
export const revalidate = 43200; // 12 hours

// State pages - revalidate weekly
export const revalidate = 604800; // 7 days
```

**On-Demand Revalidation (For Immediate Updates):**

When an agent claims their profile or data is updated, trigger immediate revalidation:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { secret, type, slug, tags } = await request.json();

  // Verify the revalidation secret
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    // Path-based revalidation
    if (type === 'agent' && slug) {
      revalidatePath(`/agent/${slug}`);
      // Also revalidate the agent's suburb pages
      const agent = await getAgentBySlug(slug);
      for (const suburb of agent.suburbs) {
        revalidatePath(`/agents-in/${suburb.slug}`);
      }
    }

    // Tag-based revalidation (more efficient for related content)
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        revalidateTag(tag);
      }
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}
```

### Pattern for Adding New Pages Without Full Rebuild

**The "Fallback: Blocking" Pattern:**

1. New agent added to database
2. User/Googlebot requests `/agent/new-agent-slug`
3. Next.js sees page doesn't exist in cache
4. `dynamicParams = true` allows generation on-demand
5. Page is generated, served, and cached for future requests
6. ISR ensures the page stays fresh

```typescript
// This combination ensures new pages work without rebuild
export const dynamicParams = true;  // Allow uncached pages
export const revalidate = 86400;    // Cache for 24 hours once generated
```

### Recommendations for ARI

1. **Pre-build Strategy:**
   - Pre-build top 500-1000 agent pages (highest sales volume)
   - Pre-build all suburb pages for Greater Sydney (~200-300)
   - Pre-build all agency pages with >3 agents (~200-300)
   - Let remaining pages generate on-demand

2. **Revalidation Schedule:**
   - Agent pages: 24-hour ISR
   - Suburb pages: 12-hour ISR
   - Agency pages: 24-hour ISR
   - State pages: 7-day ISR

3. **On-Demand Triggers:**
   - When agent claims profile
   - When Domain API data is refreshed (nightly cron)
   - When new agents are added to a suburb

---

## 2. Sitemap Strategy

### Dynamic Sitemap Generation in Next.js 14+

For 10,000+ URLs, you need a **sitemap index** approach with multiple sitemap files.

**File Structure:**
```
/sitemap.xml           -> Sitemap index pointing to sub-sitemaps
/sitemap-agents-0.xml  -> Agents 1-5000
/sitemap-agents-1.xml  -> Agents 5001-10000
/sitemap-agencies.xml  -> All agencies (~500-1000)
/sitemap-suburbs.xml   -> All suburb pages (~500-1000)
/sitemap-states.xml    -> State pages (8 pages)
```

### Implementation

```typescript
// app/sitemap.ts - Main sitemap index
import { MetadataRoute } from 'next';

const BASE_URL = 'https://ari.com.au';
const AGENTS_PER_SITEMAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDatabase();

  // Count total agents to determine number of sitemap files needed
  const { count: agentCount } = await db.get('SELECT COUNT(*) as count FROM agents');
  const agentSitemapCount = Math.ceil(agentCount / AGENTS_PER_SITEMAP);

  // Generate sitemap index entries
  const sitemaps: MetadataRoute.Sitemap = [];

  // Agent sitemaps
  for (let i = 0; i < agentSitemapCount; i++) {
    sitemaps.push({
      url: `${BASE_URL}/sitemap-agents-${i}.xml`,
      lastModified: new Date(),
    });
  }

  // Other sitemaps
  sitemaps.push(
    { url: `${BASE_URL}/sitemap-agencies.xml`, lastModified: new Date() },
    { url: `${BASE_URL}/sitemap-suburbs.xml`, lastModified: new Date() },
    { url: `${BASE_URL}/sitemap-states.xml`, lastModified: new Date() }
  );

  return sitemaps;
}
```

```typescript
// app/sitemap-agents-[id]/route.ts - Dynamic agent sitemaps
import { NextRequest, NextResponse } from 'next/server';

const AGENTS_PER_SITEMAP = 5000;
const BASE_URL = 'https://ari.com.au';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sitemapIndex = parseInt(params.id);
  const offset = sitemapIndex * AGENTS_PER_SITEMAP;

  const db = await getDatabase();
  const agents = await db.all(`
    SELECT slug, updated_at
    FROM agents
    ORDER BY id
    LIMIT ${AGENTS_PER_SITEMAP} OFFSET ${offset}
  `);

  const xml = generateSitemapXML(agents.map(agent => ({
    loc: `${BASE_URL}/agent/${agent.slug}`,
    lastmod: agent.updated_at,
    changefreq: 'weekly',
    priority: 0.8,
  })));

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function generateSitemapXML(urls: Array<{
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}>) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${new Date(url.lastmod).toISOString()}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;
}
```

### Alternative: Using the App Router's Native Sitemap Feature

```typescript
// app/sitemap-agents-[id].xml/route.ts
// Note: Next.js 14+ allows dynamic route segments in sitemap files

import { MetadataRoute } from 'next';

export async function generateSitemaps() {
  const db = await getDatabase();
  const { count } = await db.get('SELECT COUNT(*) as count FROM agents');
  const sitemapCount = Math.ceil(count / 5000);

  return Array.from({ length: sitemapCount }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const db = await getDatabase();
  const agents = await db.all(`
    SELECT slug, updated_at FROM agents
    ORDER BY id LIMIT 5000 OFFSET ${id * 5000}
  `);

  return agents.map((agent) => ({
    url: `https://ari.com.au/agent/${agent.slug}`,
    lastModified: agent.updated_at,
    changefreq: 'weekly',
    priority: 0.8,
  }));
}
```

### Google Search Console Submission

1. **Submit the sitemap index:**
   - Go to Search Console > Sitemaps
   - Submit: `https://ari.com.au/sitemap.xml`
   - Google will automatically discover and process sub-sitemaps

2. **Monitor indexing:**
   - Check "Index Coverage" report weekly
   - Watch for "Crawled - currently not indexed" issues
   - Monitor "Discovered - currently not indexed" for crawl budget issues

3. **Sitemap Best Practices:**
   - Keep each sitemap under 50,000 URLs (Google's limit)
   - Keep file size under 50MB uncompressed
   - Use `gzip` compression for large sitemaps
   - Update `lastmod` only when content actually changes
   - Set realistic `priority` values (not everything is 1.0)

### Priority Recommendations for ARI

| Page Type | Priority | Changefreq |
|-----------|----------|------------|
| Homepage | 1.0 | weekly |
| State pages | 0.9 | monthly |
| Suburb pages | 0.8 | weekly |
| Agent pages (high activity) | 0.8 | weekly |
| Agent pages (low activity) | 0.6 | monthly |
| Agency pages | 0.7 | weekly |

---

## 3. URL Structure Best Practices

### Recommended URL Patterns for ARI

```
# Agent Pages
/agent/{first-name}-{last-name}-{suburb}-{agency-initials}-{short-id}
Example: /agent/john-smith-bondi-rw-a1b2c

# Agency Pages
/agency/{agency-name-slug}
Example: /agency/ray-white-bondi-beach

# Suburb Pages (Primary pattern)
/agents-in/{suburb}-{state}-{postcode}
Example: /agents-in/bondi-nsw-2026

# State Pages
/agents-in/{state}
Example: /agents-in/nsw

# Property Type + Location (Optional future expansion)
/agents-in/{suburb}-{state}-{postcode}/apartments
/agents-in/{suburb}-{state}-{postcode}/houses
```

### Trailing Slashes: Recommendation

**Choose: No trailing slashes (and enforce consistency)**

```typescript
// next.config.js
module.exports = {
  trailingSlash: false, // Explicitly set

  // Redirect trailing slashes to non-trailing
  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },
};
```

**Rationale:**
- Consistent URLs prevent duplicate content issues
- Most modern sites use non-trailing slashes
- Google treats `/agent/john-smith/` and `/agent/john-smith` as different URLs

### Handling Special Characters in Suburb Names

Australian suburbs with special characters:

| Original | URL-Safe Slug |
|----------|---------------|
| St Kilda | st-kilda |
| O'Connor | oconnor |
| Dee Why | dee-why |
| Mount Lawley | mount-lawley |
| Sydney CBD | sydney-cbd |

```typescript
// lib/utils/slugify.ts
export function slugifySuburb(suburb: string): string {
  return suburb
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes
    .replace(/&/g, 'and')           // Replace ampersands
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Remove multiple hyphens
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

export function slugifyAgent(
  firstName: string,
  lastName: string,
  suburb: string,
  agencyName: string,
  domainId: number
): string {
  const namePart = slugifySuburb(`${firstName} ${lastName}`);
  const suburbPart = slugifySuburb(suburb);
  const agencyInitials = agencyName
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toLowerCase()
    .slice(0, 3);
  const shortId = domainId.toString(36).slice(-5); // Base36 encoding

  return `${namePart}-${suburbPart}-${agencyInitials}-${shortId}`;
}
```

### Canonical URL Strategy

**Every page must have a self-referencing canonical tag:**

```typescript
// app/agent/[slug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  return {
    alternates: {
      canonical: `https://ari.com.au/agent/${params.slug}`,
    },
  };
}
```

**Handling Duplicate Content Scenarios:**

1. **Agent serves multiple suburbs:**
   - Primary suburb page includes the agent
   - Secondary suburb pages also list the agent
   - Each agent page has ONE canonical URL (their primary profile)
   - Suburb pages list agents but link to the canonical agent URL

2. **Agency has multiple locations:**
   - Each location gets its own agency page with unique content
   - OR use one agency page with location sections

3. **Pagination on suburb pages:**
   - Use `rel="prev"` and `rel="next"` (though Google de-prioritized these)
   - Better: Use "View All" pages or infinite scroll with proper URL handling
   - Each paginated page should have a unique canonical

```typescript
// For paginated suburb pages
// /agents-in/bondi-nsw-2026?page=2

export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const page = searchParams.page || 1;
  const baseUrl = `https://ari.com.au/agents-in/${params.slug}`;

  return {
    alternates: {
      canonical: page > 1 ? `${baseUrl}?page=${page}` : baseUrl,
    },
  };
}
```

---

## 4. Internal Linking Architecture

### Link Hierarchy for Topical Authority

```
Homepage
├── State Pages (/agents-in/nsw)
│   ├── Suburb Pages (/agents-in/bondi-nsw-2026)
│   │   ├── Agent Pages (/agent/john-smith-bondi-rw-a1b2c)
│   │   └── Agency Pages (/agency/ray-white-bondi-beach)
│   └── Suburb Pages (/agents-in/manly-nsw-2095)
│       └── ...
├── State Pages (/agents-in/vic)
│   └── ...
└── Top Agencies Page (/agencies)
    └── Agency Pages
```

### Linking Patterns

**1. Suburb Page -> Agents:**

```tsx
// app/agents-in/[slug]/page.tsx
export default async function SuburbPage({ params }) {
  const agents = await getAgentsBySuburb(params.slug);

  return (
    <div>
      <h1>Real Estate Agents in {suburb.name}, {suburb.state}</h1>

      {/* Breadcrumb links */}
      <nav aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href={`/agents-in/${suburb.state.toLowerCase()}`}>{suburb.state}</a></li>
          <li>{suburb.name}</li>
        </ol>
      </nav>

      {/* Agent cards with links */}
      <div className="agent-grid">
        {agents.map(agent => (
          <a
            key={agent.slug}
            href={`/agent/${agent.slug}`}
            className="agent-card"
          >
            <img src={agent.photo_url} alt={`${agent.first_name} ${agent.last_name}`} />
            <h2>{agent.first_name} {agent.last_name}</h2>
            <p>{agent.agency_name}</p>
            <p>{agent.properties_sold_12mo} properties sold</p>
          </a>
        ))}
      </div>

      {/* Related suburbs (nearby) */}
      <section>
        <h2>Nearby Suburbs</h2>
        {nearbySuburbs.map(s => (
          <a href={`/agents-in/${s.slug}`}>{s.name}</a>
        ))}
      </section>
    </div>
  );
}
```

**2. Agent Page -> Related Links:**

```tsx
// app/agent/[slug]/page.tsx
export default async function AgentPage({ params }) {
  const agent = await getAgentBySlug(params.slug);
  const relatedAgents = await getRelatedAgents(agent); // Same agency or suburb

  return (
    <article>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a itemProp="item" href="/"><span itemProp="name">Home</span></a>
            <meta itemProp="position" content="1" />
          </li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a itemProp="item" href={`/agents-in/${agent.state.toLowerCase()}`}>
              <span itemProp="name">{agent.state}</span>
            </a>
            <meta itemProp="position" content="2" />
          </li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a itemProp="item" href={`/agents-in/${agent.suburbSlug}`}>
              <span itemProp="name">{agent.suburb}</span>
            </a>
            <meta itemProp="position" content="3" />
          </li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name">{agent.firstName} {agent.lastName}</span>
            <meta itemProp="position" content="4" />
          </li>
        </ol>
      </nav>

      {/* Agent content */}
      <h1>{agent.firstName} {agent.lastName}</h1>

      {/* Link to agency */}
      <p>
        Agent at <a href={`/agency/${agent.agencySlug}`}>{agent.agencyName}</a>
      </p>

      {/* Link to primary suburb */}
      <p>
        Serving <a href={`/agents-in/${agent.suburbSlug}`}>
          {agent.suburb}, {agent.state} {agent.postcode}
        </a>
      </p>

      {/* Related agents */}
      <section>
        <h2>Other Agents at {agent.agencyName}</h2>
        {relatedAgents.sameAgency.map(a => (
          <a href={`/agent/${a.slug}`}>{a.firstName} {a.lastName}</a>
        ))}
      </section>

      <section>
        <h2>Other Agents in {agent.suburb}</h2>
        {relatedAgents.sameSuburb.map(a => (
          <a href={`/agent/${a.slug}`}>{a.firstName} {a.lastName}</a>
        ))}
      </section>
    </article>
  );
}
```

**3. Agency Page -> Agents:**

```tsx
// app/agency/[slug]/page.tsx
export default async function AgencyPage({ params }) {
  const agency = await getAgencyBySlug(params.slug);
  const agents = await getAgentsByAgency(agency.id);

  return (
    <div>
      <h1>{agency.name}</h1>

      {/* Link to location */}
      <p>
        Located in <a href={`/agents-in/${agency.suburbSlug}`}>
          {agency.suburb}, {agency.state}
        </a>
      </p>

      {/* Team roster with links to individual agents */}
      <section>
        <h2>Our Team ({agents.length} agents)</h2>
        {agents.map(agent => (
          <a href={`/agent/${agent.slug}`}>
            {agent.firstName} {agent.lastName} - {agent.jobPosition}
          </a>
        ))}
      </section>
    </div>
  );
}
```

### Internal Linking Best Practices

1. **Use descriptive anchor text:**
   - Bad: "Click here"
   - Good: "View John Smith's profile"
   - Best: "John Smith, Bondi real estate agent"

2. **Limit links per page:**
   - Aim for 50-100 internal links maximum per page
   - For suburb pages with 100+ agents, paginate or use "Top 20" with "View All"

3. **Ensure crawlable links:**
   - Use standard `<a href>` tags, not JavaScript navigation
   - Avoid `onClick` handlers that prevent default navigation

4. **Footer links for key pages:**

```tsx
// components/Footer.tsx
export function Footer() {
  return (
    <footer>
      <nav>
        <h3>Popular Locations</h3>
        <a href="/agents-in/sydney-nsw-2000">Sydney CBD</a>
        <a href="/agents-in/melbourne-vic-3000">Melbourne CBD</a>
        <a href="/agents-in/bondi-nsw-2026">Bondi</a>
        {/* ... */}
      </nav>
      <nav>
        <h3>Browse by State</h3>
        <a href="/agents-in/nsw">New South Wales</a>
        <a href="/agents-in/vic">Victoria</a>
        <a href="/agents-in/qld">Queensland</a>
        {/* ... */}
      </nav>
    </footer>
  );
}
```

---

## 5. Page Speed Optimization

### Image Optimization for Agent Photos

**Use next/image with proper configuration:**

```tsx
// components/AgentPhoto.tsx
import Image from 'next/image';

interface AgentPhotoProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { width: 80, height: 80 },
  md: { width: 160, height: 160 },
  lg: { width: 320, height: 320 },
};

export function AgentPhoto({ src, name, size = 'md' }: AgentPhotoProps) {
  const { width, height } = sizes[size];

  // Handle missing photos with placeholder
  const imgSrc = src || '/images/agent-placeholder.webp';

  return (
    <Image
      src={imgSrc}
      alt={`Photo of ${name}`}
      width={width}
      height={height}
      className="agent-photo"
      // Lazy load images below the fold
      loading="lazy"
      // Use responsive sizes
      sizes={`(max-width: 768px) ${width / 2}px, ${width}px`}
      // Placeholder blur for better perceived performance
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEB..."
    />
  );
}

// For the primary agent photo on their profile (above the fold)
export function AgentPhotoHero({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src || '/images/agent-placeholder.webp'}
      alt={`Photo of ${name}`}
      width={320}
      height={320}
      className="agent-photo-hero"
      priority // Load immediately for LCP
      quality={85}
    />
  );
}
```

**next.config.js image configuration:**

```javascript
// next.config.js
module.exports = {
  images: {
    // Domain API image domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.domain.com.au',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
    ],
    // Generate optimized formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200],
    // Image sizes for srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};
```

### Font Loading Strategy

**Use next/font for optimal loading:**

```tsx
// app/layout.tsx
import { Inter, Roboto } from 'next/font/google';

// Primary font - load immediately
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  variable: '--font-inter',
  preload: true,
});

// Secondary font - for headings
const roboto = Roboto({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**CSS usage:**

```css
/* globals.css */
body {
  font-family: var(--font-inter), system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-roboto), var(--font-inter), sans-serif;
}
```

### CSS/JS Optimization

**1. Use CSS Modules or Tailwind for minimal CSS:**

```tsx
// components/AgentCard.module.css
.card {
  display: flex;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

// components/AgentCard.tsx
import styles from './AgentCard.module.css';

export function AgentCard({ agent }) {
  return <div className={styles.card}>...</div>;
}
```

**2. Minimize client-side JavaScript:**

```tsx
// For static content, use Server Components (default in App Router)
// Only add 'use client' when absolutely necessary

// BAD: Unnecessary client component
'use client';
export function AgentStats({ agent }) {
  return <div>{agent.propertiesSold} sold</div>;
}

// GOOD: Server component (no 'use client')
export function AgentStats({ agent }) {
  return <div>{agent.propertiesSold} sold</div>;
}
```

**3. Dynamic imports for non-critical components:**

```tsx
// Lazy load components not needed for initial render
import dynamic from 'next/dynamic';

const ContactForm = dynamic(() => import('./ContactForm'), {
  loading: () => <p>Loading form...</p>,
  ssr: false, // Don't render on server if it's client-only
});

const MapView = dynamic(() => import('./MapView'), {
  loading: () => <div className="map-placeholder" />,
});
```

### Core Web Vitals Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Prioritize hero image, optimize fonts, use SSG |
| **FID** (First Input Delay) | < 100ms | Minimize JS, use Server Components |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Set explicit dimensions on images, avoid dynamic content insertion |
| **INP** (Interaction to Next Paint) | < 200ms | Efficient event handlers, avoid long tasks |
| **TTFB** (Time to First Byte) | < 800ms | Use CDN (Vercel), SSG, edge caching |

**Specific optimizations for ARI:**

```tsx
// 1. Set explicit image dimensions to prevent CLS
<Image width={160} height={160} ... />

// 2. Reserve space for dynamic content
<div className="agent-stats" style={{ minHeight: '120px' }}>
  {stats || <StatsSkeleton />}
</div>

// 3. Preload critical resources
// app/agent/[slug]/page.tsx
export const metadata = {
  other: {
    'link': [
      { rel: 'preload', href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }
    ]
  }
};
```

---

## 6. Metadata Generation

### Dynamic Title Tag Patterns

```typescript
// lib/metadata.ts
export function generateAgentTitle(agent: Agent): string {
  return `${agent.firstName} ${agent.lastName} - Real Estate Agent in ${agent.suburb} | ${agent.agencyName} | ARI`;
}

export function generateAgencyTitle(agency: Agency): string {
  return `${agency.name} - Real Estate Agency in ${agency.suburb}, ${agency.state} | ARI`;
}

export function generateSuburbTitle(suburb: Suburb, count: number): string {
  return `${count} Real Estate Agents in ${suburb.name}, ${suburb.state} ${suburb.postcode} | ARI`;
}

export function generateStateTitle(state: string, count: number): string {
  const stateName = STATE_NAMES[state]; // 'NSW' -> 'New South Wales'
  return `${count} Real Estate Agents in ${stateName} | ARI`;
}
```

### Meta Description Generation

```typescript
// lib/metadata.ts
export function generateAgentDescription(agent: Agent): string {
  const parts = [
    `${agent.firstName} ${agent.lastName} is a licensed real estate agent at ${agent.agencyName} in ${agent.suburb}, ${agent.state}.`,
  ];

  if (agent.propertiesSold12mo > 0) {
    parts.push(`${agent.propertiesSold12mo} properties sold in the last 12 months.`);
  }

  if (agent.specializations?.length > 0) {
    parts.push(`Specializes in ${agent.specializations.slice(0, 2).join(' and ')}.`);
  }

  parts.push('View profile, contact details, and sales history.');

  // Keep under 160 characters
  return truncate(parts.join(' '), 160);
}

export function generateSuburbDescription(suburb: Suburb, count: number): string {
  return truncate(
    `Find ${count} real estate agents in ${suburb.name}, ${suburb.state} ${suburb.postcode}. Compare agents by sales history, specializations, and experience. Free, neutral index of Australian real estate professionals.`,
    160
  );
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3).trim() + '...';
}
```

### Implementing generateMetadata

```typescript
// app/agent/[slug]/page.tsx
import { Metadata } from 'next';
import { generateAgentTitle, generateAgentDescription } from '@/lib/metadata';

export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  if (!agent) {
    return {
      title: 'Agent Not Found | ARI',
    };
  }

  const title = generateAgentTitle(agent);
  const description = generateAgentDescription(agent);
  const url = `https://ari.com.au/agent/${params.slug}`;
  const imageUrl = agent.photoUrl || 'https://ari.com.au/images/default-agent-og.png';

  return {
    title,
    description,

    // Canonical URL
    alternates: {
      canonical: url,
    },

    // Open Graph
    openGraph: {
      title,
      description,
      url,
      siteName: 'Australian Real Estate Agents Index',
      type: 'profile',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${agent.firstName} ${agent.lastName} - Real Estate Agent`,
        },
      ],
      locale: 'en_AU',
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}
```

### JSON-LD Schema Markup

```typescript
// components/AgentSchema.tsx
export function AgentSchema({ agent }: { agent: Agent }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `https://ari.com.au/agent/${agent.slug}#agent`,
    name: `${agent.firstName} ${agent.lastName}`,
    image: agent.photoUrl,
    jobTitle: agent.jobPosition || 'Real Estate Agent',
    telephone: agent.phone || agent.mobile,
    email: agent.email,
    url: `https://ari.com.au/agent/${agent.slug}`,

    worksFor: {
      '@type': 'RealEstateAgent',
      '@id': `https://ari.com.au/agency/${agent.agencySlug}#agency`,
      name: agent.agencyName,
      image: agent.agencyLogo,
    },

    areaServed: agent.suburbs.map(suburb => ({
      '@type': 'Place',
      name: `${suburb.name}, ${suburb.state}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: suburb.name,
        addressRegion: suburb.state,
        postalCode: suburb.postcode,
        addressCountry: 'AU',
      },
    })),

    // Additional properties if available
    ...(agent.linkedinUrl && { sameAs: [agent.linkedinUrl] }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// components/BreadcrumbSchema.tsx
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// components/LocalBusinessSchema.tsx (for agency pages)
export function AgencySchema({ agency }: { agency: Agency }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `https://ari.com.au/agency/${agency.slug}#agency`,
    name: agency.name,
    image: agency.logoUrl,
    url: `https://ari.com.au/agency/${agency.slug}`,
    telephone: agency.phone,
    email: agency.email,

    address: {
      '@type': 'PostalAddress',
      streetAddress: agency.streetAddress,
      addressLocality: agency.suburb,
      addressRegion: agency.state,
      postalCode: agency.postcode,
      addressCountry: 'AU',
    },

    geo: agency.latitude && agency.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: agency.latitude,
      longitude: agency.longitude,
    } : undefined,

    // Link to website
    sameAs: agency.website ? [agency.website] : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Using Schema in Pages

```tsx
// app/agent/[slug]/page.tsx
import { AgentSchema } from '@/components/AgentSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export default async function AgentPage({ params }) {
  const agent = await getAgentBySlug(params.slug);

  const breadcrumbs = [
    { name: 'Home', url: 'https://ari.com.au' },
    { name: agent.state, url: `https://ari.com.au/agents-in/${agent.state.toLowerCase()}` },
    { name: agent.suburb, url: `https://ari.com.au/agents-in/${agent.suburbSlug}` },
    { name: `${agent.firstName} ${agent.lastName}`, url: `https://ari.com.au/agent/${agent.slug}` },
  ];

  return (
    <>
      <AgentSchema agent={agent} />
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Page content */}
      <main>...</main>
    </>
  );
}
```

---

## 7. Crawl Budget Management

### robots.txt Configuration

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API routes
          '/_next/',         // Next.js internals
          '/admin/',         // Admin pages (if any)
          '/preview/',       // Preview mode pages
          '/*?*sort=',       // Sorting parameters
          '/*?*filter=',     // Filter parameters (creates duplicates)
          '/*?*page=0',      // Invalid pagination
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block AI crawlers if desired
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
    host: 'https://ari.com.au',
  };
}
```

### Pages to Noindex

Some pages should be crawlable but not indexed:

```typescript
// app/agent/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  // Noindex agents with very thin content
  const shouldNoindex =
    !agent.profileText &&
    !agent.propertiesSold12mo &&
    !agent.photoUrl;

  return {
    title: generateAgentTitle(agent),
    robots: shouldNoindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
```

**When to noindex:**

| Scenario | Recommendation |
|----------|----------------|
| Agent with no photo, no bio, no sales | noindex, follow |
| Duplicate suburb pages (old URLs) | redirect 301 to canonical |
| Paginated pages beyond page 5 | Consider noindex |
| Filter result pages | noindex, follow |
| Sort variations | Use canonical to main page |
| Inactive/deceased agents | noindex or remove |

### Pagination Handling

**Option 1: Rel Prev/Next (deprecated but still somewhat useful):**

```tsx
// app/agents-in/[slug]/page.tsx
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const page = parseInt(searchParams.page) || 1;
  const totalPages = await getTotalPages(params.slug);
  const baseUrl = `https://ari.com.au/agents-in/${params.slug}`;

  const links: Record<string, string> = {};

  if (page > 1) {
    links.prev = page === 2 ? baseUrl : `${baseUrl}?page=${page - 1}`;
  }
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}`;
  }

  return {
    alternates: {
      canonical: page === 1 ? baseUrl : `${baseUrl}?page=${page}`,
    },
    other: {
      ...(links.prev && { 'link rel="prev"': links.prev }),
      ...(links.next && { 'link rel="next"': links.next }),
    },
  };
}
```

**Option 2: View All with Lazy Loading (Preferred):**

```tsx
// For suburb pages with many agents, show top 20 with a "View All" link
export default async function SuburbPage({ params, searchParams }) {
  const viewAll = searchParams.view === 'all';
  const agents = viewAll
    ? await getAllAgentsInSuburb(params.slug)
    : await getTopAgentsInSuburb(params.slug, 20);

  return (
    <div>
      <AgentList agents={agents} />

      {!viewAll && agents.length === 20 && (
        <a href={`/agents-in/${params.slug}?view=all`}>
          View all agents in {suburb.name}
        </a>
      )}
    </div>
  );
}
```

### Avoiding Duplicate Content

**1. Parameter Handling:**

```typescript
// next.config.js - Handle URL parameters
module.exports = {
  async redirects() {
    return [
      // Redirect uppercase state codes to lowercase
      {
        source: '/agents-in/:suburb-NSW-:postcode',
        destination: '/agents-in/:suburb-nsw-:postcode',
        permanent: true,
      },
      // Remove tracking parameters and redirect
      {
        source: '/agent/:slug',
        has: [{ type: 'query', key: 'utm_source' }],
        destination: '/agent/:slug',
        permanent: false, // Not permanent for tracking
      },
    ];
  },
};
```

**2. Content Differentiation:**

For suburb pages that might seem similar, differentiate with:
- Unique intro paragraphs (template with suburb-specific data)
- Different agent counts and statistics
- Suburb-specific information (median prices, property types)

```tsx
// Generate unique content per suburb
function getSuburbIntro(suburb: Suburb, agents: Agent[]): string {
  const avgPrice = calculateAveragePrice(agents);
  const topAgency = getTopAgencyInSuburb(agents);
  const propertyMix = getPropertyTypeMix(agents);

  return `
    ${suburb.name} has ${agents.length} active real estate agents
    across ${new Set(agents.map(a => a.agencyName)).size} agencies.
    The median sale price in ${suburb.name} is $${formatPrice(avgPrice)},
    with ${propertyMix.apartments}% apartments and ${propertyMix.houses}% houses.
    ${topAgency.name} is the leading agency with ${topAgency.agentCount} agents.
  `;
}
```

---

## 8. Next.js Implementation Patterns

### generateStaticParams for Dynamic Routes

```typescript
// app/agent/[slug]/page.tsx
export async function generateStaticParams() {
  const db = await getDatabase();

  // Strategy: Pre-build high-value pages only
  const agents = await db.all(`
    SELECT slug FROM agents
    WHERE properties_sold_12mo > 3
       OR enriched_at IS NOT NULL
    ORDER BY properties_sold_12mo DESC
    LIMIT 1000
  `);

  return agents.map((agent) => ({
    slug: agent.slug,
  }));
}

// Allow on-demand generation for pages not pre-built
export const dynamicParams = true;

// ISR revalidation
export const revalidate = 86400;

// app/agents-in/[slug]/page.tsx
export async function generateStaticParams() {
  const db = await getDatabase();

  // Pre-build all suburb pages (they're high-value for SEO)
  const suburbs = await db.all(`
    SELECT DISTINCT
      LOWER(suburb) || '-' || LOWER(state) || '-' || postcode as slug
    FROM agent_suburbs
    WHERE postcode IS NOT NULL
  `);

  return suburbs.map((suburb) => ({
    slug: suburb.slug,
  }));
}
```

### generateMetadata Pattern

```typescript
// app/agent/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const agent = await getAgentBySlug(params.slug);

  if (!agent) {
    return {
      title: 'Agent Not Found',
    };
  }

  return {
    title: `${agent.firstName} ${agent.lastName} - Real Estate Agent | ARI`,
    description: generateAgentDescription(agent),
    alternates: {
      canonical: `https://ari.com.au/agent/${params.slug}`,
    },
    openGraph: {
      title: `${agent.firstName} ${agent.lastName}`,
      description: generateAgentDescription(agent),
      images: [agent.photoUrl || '/default-agent.png'],
      type: 'profile',
    },
    robots: {
      index: hasMinimumContent(agent),
      follow: true,
    },
  };
}

export default async function AgentPage({ params }: PageProps) {
  const agent = await getAgentBySlug(params.slug);

  if (!agent) {
    notFound();
  }

  return (
    <main>
      <AgentSchema agent={agent} />
      <AgentProfile agent={agent} />
    </main>
  );
}
```

### next/image for Agent Photos

```tsx
// components/AgentImage.tsx
import Image from 'next/image';

interface AgentImageProps {
  src: string | null;
  name: string;
  priority?: boolean;
  size?: 'thumbnail' | 'profile' | 'hero';
}

const sizes = {
  thumbnail: { width: 80, height: 80 },
  profile: { width: 200, height: 200 },
  hero: { width: 400, height: 400 },
};

export function AgentImage({ src, name, priority = false, size = 'profile' }: AgentImageProps) {
  const { width, height } = sizes[size];
  const placeholder = '/images/agent-placeholder.svg';

  return (
    <div className={`agent-image agent-image--${size}`}>
      <Image
        src={src || placeholder}
        alt={`${name}, Real Estate Agent`}
        width={width}
        height={height}
        priority={priority}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,..."
        style={{
          objectFit: 'cover',
          borderRadius: '50%',
        }}
        // Responsive sizing
        sizes={
          size === 'hero'
            ? '(max-width: 768px) 200px, 400px'
            : size === 'profile'
            ? '(max-width: 768px) 100px, 200px'
            : '80px'
        }
        // Handle broken images
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = placeholder;
        }}
      />
    </div>
  );
}
```

### Data Fetching with Caching

```typescript
// lib/data/agents.ts
import { unstable_cache } from 'next/cache';

// Cached database query with tags for revalidation
export const getAgentBySlug = unstable_cache(
  async (slug: string) => {
    const db = await getDatabase();
    const agent = await db.get(`
      SELECT
        a.*,
        ag.name as agency_name,
        ag.slug as agency_slug,
        ag.logo_url as agency_logo
      FROM agents a
      LEFT JOIN agencies ag ON a.agency_id = ag.id
      WHERE a.slug = ?
    `, [slug]);

    if (!agent) return null;

    // Get agent's suburbs
    const suburbs = await db.all(`
      SELECT * FROM agent_suburbs WHERE agent_id = ?
    `, [agent.id]);

    return { ...agent, suburbs };
  },
  ['agent-by-slug'], // Cache key prefix
  {
    tags: ['agents'], // For tag-based revalidation
    revalidate: 3600, // 1 hour cache
  }
);

export const getAgentsBySuburb = unstable_cache(
  async (suburbSlug: string) => {
    const [suburb, state, postcode] = parseSuburbSlug(suburbSlug);
    const db = await getDatabase();

    return db.all(`
      SELECT DISTINCT
        a.*,
        ag.name as agency_name,
        ag.slug as agency_slug
      FROM agents a
      JOIN agent_suburbs as ON a.id = as.agent_id
      LEFT JOIN agencies ag ON a.agency_id = ag.id
      WHERE LOWER(as.suburb) = LOWER(?)
        AND LOWER(as.state) = LOWER(?)
        AND as.postcode = ?
      ORDER BY a.properties_sold_12mo DESC
    `, [suburb, state, postcode]);
  },
  ['agents-by-suburb'],
  {
    tags: ['agents', 'suburbs'],
    revalidate: 1800, // 30 minutes
  }
);
```

---

## 9. Recommended Project Structure

```
app/
├── (marketing)/
│   ├── layout.tsx              # Shared layout for marketing pages
│   ├── page.tsx                # Homepage
│   └── about/
│       └── page.tsx            # About page
│
├── agent/
│   └── [slug]/
│       ├── page.tsx            # Agent profile page
│       ├── loading.tsx         # Loading state
│       └── not-found.tsx       # 404 for agent
│
├── agency/
│   └── [slug]/
│       ├── page.tsx            # Agency page
│       └── loading.tsx
│
├── agents-in/
│   ├── [state]/
│   │   └── page.tsx            # State listing page (/agents-in/nsw)
│   │
│   └── [slug]/
│       ├── page.tsx            # Suburb page (/agents-in/bondi-nsw-2026)
│       └── loading.tsx
│
├── api/
│   ├── revalidate/
│   │   └── route.ts            # On-demand ISR endpoint
│   └── health/
│       └── route.ts            # Health check
│
├── sitemap.ts                  # Main sitemap index
├── sitemap-agents-[id].xml/
│   └── route.ts                # Dynamic agent sitemaps
├── sitemap-agencies.xml/
│   └── route.ts                # Agency sitemap
├── sitemap-suburbs.xml/
│   └── route.ts                # Suburb sitemap
├── robots.ts                   # robots.txt
├── layout.tsx                  # Root layout
└── not-found.tsx               # Global 404

components/
├── agent/
│   ├── AgentCard.tsx
│   ├── AgentImage.tsx
│   ├── AgentProfile.tsx
│   └── AgentStats.tsx
├── agency/
│   ├── AgencyCard.tsx
│   └── AgencyProfile.tsx
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Breadcrumbs.tsx
│   └── Navigation.tsx
├── seo/
│   ├── AgentSchema.tsx
│   ├── AgencySchema.tsx
│   ├── BreadcrumbSchema.tsx
│   └── SuburbSchema.tsx
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    └── ...

lib/
├── data/
│   ├── agents.ts               # Agent data fetching
│   ├── agencies.ts             # Agency data fetching
│   ├── suburbs.ts              # Suburb data fetching
│   └── database.ts             # SQLite connection
├── metadata/
│   ├── titles.ts               # Title generation
│   ├── descriptions.ts         # Description generation
│   └── schema.ts               # JSON-LD helpers
└── utils/
    ├── slugify.ts              # URL slug generation
    ├── format.ts               # Number/date formatting
    └── constants.ts            # State names, etc.

public/
├── images/
│   ├── agent-placeholder.svg
│   ├── agency-placeholder.svg
│   └── og-default.png
└── fonts/
    └── (if self-hosting fonts)

data/
└── ari.db                      # SQLite database (or in separate location)

types/
├── agent.ts                    # Agent type definitions
├── agency.ts                   # Agency type definitions
└── suburb.ts                   # Suburb type definitions
```

---

## 10. Implementation Checklist

### Phase 1: Foundation

- [ ] Set up Next.js 14+ with App Router
- [ ] Configure TypeScript and ESLint
- [ ] Set up SQLite database connection
- [ ] Create base types for Agent, Agency, Suburb
- [ ] Implement slug generation utilities
- [ ] Configure next.config.js (images, redirects)

### Phase 2: Core Pages

- [ ] Implement Agent page with generateStaticParams
- [ ] Implement Agency page
- [ ] Implement Suburb listing page
- [ ] Implement State listing page
- [ ] Create loading states for each page type
- [ ] Create 404 pages

### Phase 3: SEO Implementation

- [ ] Implement generateMetadata for all page types
- [ ] Create JSON-LD schema components
- [ ] Implement breadcrumb navigation with schema
- [ ] Configure canonical URLs
- [ ] Set up robots.ts
- [ ] Implement dynamic sitemap generation
- [ ] Test sitemap output

### Phase 4: Performance Optimization

- [ ] Configure next/image for agent photos
- [ ] Set up next/font for typography
- [ ] Implement CSS modules or Tailwind
- [ ] Add loading skeletons
- [ ] Test Core Web Vitals with Lighthouse
- [ ] Optimize for LCP < 2.5s

### Phase 5: Internal Linking

- [ ] Implement footer with key location links
- [ ] Add related agents section to agent pages
- [ ] Add "Other agents at this agency" section
- [ ] Implement nearby suburbs on suburb pages
- [ ] Test crawlability with Screaming Frog

### Phase 6: ISR & Caching

- [ ] Configure revalidate times for each page type
- [ ] Implement on-demand revalidation API
- [ ] Set up cache tags for efficient invalidation
- [ ] Test ISR behavior in production

### Phase 7: Deployment & Monitoring

- [ ] Deploy to Vercel
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Search Console monitoring
- [ ] Configure Core Web Vitals monitoring
- [ ] Set up error tracking (Sentry)

---

## Warnings and Pitfalls to Avoid

### 1. Build Time Issues

**Problem:** Attempting to build all 10,000+ pages at once.

**Solution:** Use `dynamicParams = true` and pre-build only high-priority pages.

### 2. Thin Content Penalties

**Problem:** Pages with minimal unique content look like doorway pages.

**Solution:**
- Add unique data per page (agent stats, suburb info)
- Noindex pages with insufficient content
- Consider combining low-value pages

### 3. Crawl Budget Waste

**Problem:** Googlebot wastes time on parameter variations.

**Solution:**
- Block unnecessary parameters in robots.txt
- Use canonical tags consistently
- Don't create URLs for every filter combination

### 4. Image Performance

**Problem:** Unoptimized agent photos slow down pages.

**Solution:**
- Always use next/image
- Set explicit dimensions
- Use priority for above-fold images only

### 5. JavaScript Reliance

**Problem:** Client-side rendering hurts SEO.

**Solution:**
- Use Server Components by default
- Avoid 'use client' unless necessary
- Test with JavaScript disabled

### 6. Duplicate Suburb Names

**Problem:** "Richmond" exists in VIC, NSW, and QLD.

**Solution:**
- Always include state and postcode in URLs
- `/agents-in/richmond-vic-3121` not `/agents-in/richmond`

### 7. Stale Sitemaps

**Problem:** Sitemap doesn't reflect current pages.

**Solution:**
- Generate sitemaps dynamically from database
- Update lastmod only when content changes
- Don't hardcode URLs

### 8. Missing Canonical Tags

**Problem:** Search engines see duplicate pages.

**Solution:**
- Every page must have a self-referencing canonical
- Paginated pages need unique canonicals
- Filter pages should canonical to main page

---

## Summary

For ARI's programmatic SEO approach with 10,000+ pages:

1. **Use SSG with ISR:** Pre-build top pages, generate rest on-demand
2. **Split sitemaps:** Use sitemap index with multiple sub-sitemaps
3. **Clean URLs:** Include location identifiers (suburb-state-postcode)
4. **Link strategically:** Build topical authority through internal links
5. **Optimize for speed:** Use next/image, next/font, Server Components
6. **Generate metadata:** Dynamic titles, descriptions, and JSON-LD
7. **Manage crawl budget:** Block parameters, noindex thin pages
8. **Follow Next.js patterns:** generateStaticParams, generateMetadata

This approach balances SEO requirements with scalability, ensuring pages are crawlable, indexable, and performant while avoiding common programmatic SEO pitfalls.
