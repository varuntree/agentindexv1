# 07 - SEO Strategy

**Domain:** Search Engine Optimization
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [URL Structure](#url-structure)
3. [Page Titles](#page-titles)
4. [Meta Descriptions](#meta-descriptions)
5. [Schema.org Markup](#schemaorg-markup)
6. [Internal Linking](#internal-linking)
7. [Sitemap Strategy](#sitemap-strategy)
8. [FAQ Schema](#faq-schema)
9. [Technical SEO](#technical-seo)
10. [Content Guidelines](#content-guidelines)
11. [Monitoring & Measurement](#monitoring--measurement)

---

## Overview

ARI's SEO strategy focuses on capturing organic search traffic from:

1. **Agent name searches** - "John Smith real estate agent"
2. **Agent + location searches** - "real estate agents Bondi Beach"
3. **Agency searches** - "Ray White Bondi Beach agents"
4. **Discovery searches** - "best real estate agents near me"

### SEO Principles

| Principle | Implementation |
|-----------|----------------|
| **Unique content** | Enriched bios differentiate from competitors |
| **Structured data** | Schema.org markup for rich snippets |
| **Fast loading** | Static pages served from CDN |
| **Mobile-first** | Responsive design |
| **Internal linking** | Strong link graph between pages |

### Target Keywords

| Page Type | Primary Keywords | Secondary Keywords |
|-----------|------------------|-------------------|
| Agent | `{name} real estate agent` | `{name} {suburb}`, `{agency} agents` |
| Agency | `{agency name} {suburb}` | `{agency} real estate`, `{suburb} agencies` |
| Suburb | `real estate agents {suburb}` | `{suburb} agents`, `agents in {suburb}` |
| State | `real estate agents {state}` | `{state} property agents` |

---

## URL Structure

### URL Patterns

| Page | Pattern | Example |
|------|---------|---------|
| Agent | `/agent/{slug}` | `/agent/john-smith-bondi-beach-rw-a1b2c` |
| Agency | `/agency/{slug}` | `/agency/ray-white-bondi-beach` |
| Suburb | `/agents-in/{suburb}-{state}-{postcode}` | `/agents-in/bondi-beach-nsw-2026` |
| State | `/agents-in/{state}` | `/agents-in/nsw` |

### Slug Conventions

**Agent Slug:** `{first}-{last}-{suburb}-{agency-abbr}-{hash}`
- Includes location and agency for context
- Hash ensures uniqueness for same-name agents
- Example: `john-smith-bondi-beach-rw-a1b2c`

**Agency Slug:** `{brand}-{suburb}`
- Simple, memorable format
- Example: `ray-white-bondi-beach`

**Suburb Slug:** `{suburb}-{state}-{postcode}`
- Includes all location identifiers
- SEO-friendly with keyword-rich URL
- Example: `bondi-beach-nsw-2026`

### URL Best Practices

```typescript
// URL generation rules
const urlRules = {
  // All lowercase
  case: 'lowercase',

  // Hyphens for word separation
  separator: '-',

  // No trailing slashes
  trailingSlash: false,

  // No special characters
  allowedChars: /^[a-z0-9-]+$/,

  // Max length
  maxLength: 100,
};
```

---

## Page Titles

### Title Patterns

| Page | Pattern | Max Length |
|------|---------|------------|
| Agent | `{Name} - Real Estate Agent in {Suburb} \| {Agency} \| ARI` | 60 chars |
| Agency | `{Agency Name} - {Suburb}, {State} \| ARI` | 60 chars |
| Suburb | `{Count} Real Estate Agents in {Suburb}, {State} {Postcode} \| ARI` | 60 chars |
| State | `Real Estate Agents in {State Full Name} \| ARI` | 60 chars |

### Title Examples

```
Agent:  John Smith - Real Estate Agent in Bondi Beach | Ray White | ARI
Agency: Ray White Bondi Beach - Bondi Beach, NSW | ARI
Suburb: 85 Real Estate Agents in Bondi Beach, NSW 2026 | ARI
State:  Real Estate Agents in New South Wales | ARI
```

### Title Generation

```typescript
// lib/metadata.ts

export function generateAgentTitle(agent: Agent): string {
  const name = `${agent.first_name} ${agent.last_name}`;
  const title = `${name} - Real Estate Agent in ${agent.primary_suburb} | ${agent.agency_name} | ARI`;

  // Truncate if too long
  if (title.length > 60) {
    return `${name} - Real Estate Agent in ${agent.primary_suburb} | ARI`;
  }

  return title;
}

export function generateSuburbTitle(suburb: SuburbStats): string {
  return `${suburb.agent_count} Real Estate Agents in ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode} | ARI`;
}

export function generateAgencyTitle(agency: Agency): string {
  return `${agency.name} - ${agency.suburb}, ${agency.state} | ARI`;
}

export function generateStateTitle(state: string): string {
  const fullName = STATE_NAMES[state.toLowerCase()] || state;
  return `Real Estate Agents in ${fullName} | ARI`;
}
```

---

## Meta Descriptions

### Description Patterns

| Page | Pattern | Max Length |
|------|---------|------------|
| Agent | Dynamic based on available data | 155 chars |
| Agency | Agency description or generated | 155 chars |
| Suburb | Count-focused discovery text | 155 chars |
| State | State-level overview | 155 chars |

### Agent Description Generation

```typescript
export function generateAgentDescription(agent: Agent): string {
  const parts: string[] = [];
  const name = `${agent.first_name} ${agent.last_name}`;

  // Base
  parts.push(`${name} is a real estate agent at ${agent.agency_name} in ${agent.primary_suburb}, ${agent.primary_state}.`);

  // Experience
  if (agent.years_experience) {
    parts.push(`${agent.years_experience} years experience.`);
  }

  // Specialization
  if (agent.specializations.length > 0) {
    parts.push(`Specializes in ${agent.specializations[0]}.`);
  }

  // Languages
  if (agent.languages.length > 1) {
    parts.push(`Speaks ${agent.languages.join(', ')}.`);
  }

  // CTA
  parts.push('View profile and contact details.');

  // Join and truncate
  let description = parts.join(' ');
  if (description.length > 155) {
    description = description.slice(0, 152) + '...';
  }

  return description;
}
```

### Description Examples

```
Agent:
"John Smith is a real estate agent at Ray White Bondi Beach in Bondi Beach, NSW. 8 years experience. Specializes in Luxury Homes. Speaks English and Mandarin. View profile and contact details."

Suburb:
"Find and compare 85 real estate agents in Bondi Beach, NSW 2026. Browse 12 agencies including Ray White, McGrath, and Belle Property. View profiles and contact agents."

Agency:
"Ray White Bondi Beach is a leading real estate agency in Bondi Beach, NSW. View our team of 12 experienced agents. Properties for sale and rent."
```

---

## Schema.org Markup

### Agent Schema (RealEstateAgent)

```typescript
// components/seo/AgentSchema.tsx
import { Agent, Agency } from '@/lib/types';

interface Props {
  agent: Agent;
  agency: Agency | null;
}

export default function AgentSchema({ agent, agency }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `https://ari.com.au/agent/${agent.slug}`,
    name: `${agent.first_name} ${agent.last_name}`,
    image: agent.photo_url || undefined,
    jobTitle: 'Real Estate Agent',
    worksFor: agency ? {
      '@type': 'RealEstateAgent',
      '@id': `https://ari.com.au/agency/${agency.slug}`,
      name: agency.name,
    } : undefined,
    areaServed: {
      '@type': 'Place',
      name: `${agent.primary_suburb}, ${agent.primary_state}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: agent.primary_suburb,
        addressRegion: agent.primary_state,
        postalCode: agent.primary_postcode,
        addressCountry: 'AU',
      },
    },
    knowsLanguage: agent.languages.length > 0 ? agent.languages : undefined,
    telephone: agent.mobile || agent.phone || undefined,
    email: agent.email || undefined,
    url: `https://ari.com.au/agent/${agent.slug}`,
    sameAs: [
      agent.linkedin_url,
      agent.facebook_url,
      agent.instagram_url,
      agent.personal_website_url,
    ].filter(Boolean),
  };

  // Remove undefined values
  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  );
}
```

### Agency Schema (RealEstateAgent Organization)

```typescript
// components/seo/AgencySchema.tsx
import { Agency } from '@/lib/types';

interface Props {
  agency: Agency;
}

export default function AgencySchema({ agency }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `https://ari.com.au/agency/${agency.slug}`,
    name: agency.name,
    image: agency.logo_url || undefined,
    url: `https://ari.com.au/agency/${agency.slug}`,
    telephone: agency.phone || undefined,
    email: agency.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: agency.street_address || undefined,
      addressLocality: agency.suburb,
      addressRegion: agency.state,
      postalCode: agency.postcode,
      addressCountry: 'AU',
    },
    sameAs: agency.website ? [agency.website] : undefined,
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      value: agency.agent_count,
    },
  };

  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  );
}
```

### Suburb Schema (ItemList)

```typescript
// components/seo/SuburbSchema.tsx
import { SuburbStats, Agent } from '@/lib/types';

interface Props {
  suburb: SuburbStats;
  agents: Agent[];
}

export default function SuburbSchema({ suburb, agents }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Real Estate Agents in ${suburb.suburb_name}, ${suburb.state}`,
    description: `${suburb.agent_count} real estate agents serving ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode}`,
    numberOfItems: suburb.agent_count,
    itemListElement: agents.slice(0, 10).map((agent, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'RealEstateAgent',
        '@id': `https://ari.com.au/agent/${agent.slug}`,
        name: `${agent.first_name} ${agent.last_name}`,
        image: agent.photo_url || undefined,
        url: `https://ari.com.au/agent/${agent.slug}`,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Breadcrumb Schema

```typescript
// components/seo/BreadcrumbSchema.tsx

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function BreadcrumbSchema({ items }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://ari.com.au${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## Internal Linking

### Link Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTERNAL LINK STRUCTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                            HOME                                          │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│           STATE           STATE           STATE                         │
│           /nsw            /vic            /qld                          │
│              │                                                           │
│     ┌────────┼────────┐                                                 │
│     ▼        ▼        ▼                                                 │
│  SUBURB   SUBURB   SUBURB                                               │
│  /bondi   /mosman  /manly                                               │
│     │                                                                    │
│     │                                                                    │
│  ┌──┴───────────────────────────────────┐                               │
│  │                                       │                               │
│  ▼                                       ▼                               │
│ AGENT ◄───────────────────────────────► AGENCY                          │
│ /agent/john-smith...                    /agency/ray-white-bondi         │
│                                                                          │
│ Cross-links:                                                             │
│ • Agent → Agency page                                                   │
│ • Agent → Other agents in suburb                                        │
│ • Agency → All agent profiles                                           │
│ • Suburb → All agents and agencies                                      │
│ • State → All suburbs                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Linking Rules

| From | To | Link Text |
|------|-----|-----------|
| Agent | Agency | `{Agency Name}` |
| Agent | Suburb | `{Suburb}` (breadcrumb) |
| Agent | Related Agents | `{Name}` (card) |
| Agency | Each Agent | `{Name}` (team list) |
| Agency | Related Agencies | `{Name}` (card) |
| Suburb | Each Agent | `{Name}` (list) |
| Suburb | Each Agency | `{Name}` (list) |
| Suburb | State | `{State}` (breadcrumb) |
| State | Each Suburb | `{Suburb Name}` |

### Related Content Sections

```typescript
// Agent page related content
const agentRelatedSections = [
  {
    title: 'About {Agency}',
    description: 'Agency info with link',
    component: 'AgencySection'
  },
  {
    title: 'Other Agents in {Suburb}',
    description: '4 agent cards',
    component: 'RelatedAgents'
  }
];

// Suburb page related content
const suburbRelatedSections = [
  {
    title: 'Agents in {Suburb}',
    description: 'All agent cards',
    component: 'SuburbAgentList'
  },
  {
    title: 'Agencies in {Suburb}',
    description: 'All agency cards',
    component: 'SuburbAgencyList'
  }
];
```

---

## Sitemap Strategy

### Sitemap Configuration

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

const BASE_URL = 'https://ari.com.au';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Homepage - highest priority
  entries.push({
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  });

  // State pages - high priority
  const states = getAllStates();
  for (const state of states) {
    entries.push({
      url: `${BASE_URL}/agents-in/${state.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    });
  }

  // Suburb pages - high priority
  const suburbs = getAllSuburbSlugs();
  for (const { slug } of suburbs) {
    entries.push({
      url: `${BASE_URL}/agents-in/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Agency pages - medium priority
  const agencies = getAllAgencySlugs();
  for (const { slug } of agencies) {
    entries.push({
      url: `${BASE_URL}/agency/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Agent pages - standard priority
  const agents = getAllAgentSlugs();
  for (const { slug } of agents) {
    entries.push({
      url: `${BASE_URL}/agent/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
```

### Priority Hierarchy

| Page Type | Priority | Change Frequency | Rationale |
|-----------|----------|------------------|-----------|
| Homepage | 1.0 | weekly | Entry point |
| State | 0.9 | weekly | Hub page |
| Suburb | 0.8 | weekly | Key landing pages |
| Agency | 0.7 | weekly | Team changes |
| Agent | 0.6 | monthly | Profile updates rare |

---

## FAQ Schema

### FAQ Generation

```typescript
// lib/faq.ts

interface FAQ {
  question: string;
  answer: string;
}

export function generateAgentFAQs(agent: Agent): FAQ[] {
  const faqs: FAQ[] = [];
  const name = `${agent.first_name} ${agent.last_name}`;

  // Experience FAQ
  if (agent.years_experience) {
    faqs.push({
      question: `How long has ${name} been a real estate agent?`,
      answer: `${name} has been working in real estate for ${agent.years_experience} years${agent.career_start_year ? `, starting their career in ${agent.career_start_year}` : ''}.`
    });
  }

  // Languages FAQ
  if (agent.languages.length > 1) {
    faqs.push({
      question: `What languages does ${name} speak?`,
      answer: `${name} speaks ${formatList(agent.languages)}.`
    });
  }

  // Specializations FAQ
  if (agent.specializations.length > 0) {
    faqs.push({
      question: `What does ${name} specialize in?`,
      answer: `${name} specializes in ${formatList(agent.specializations)} in the ${agent.primary_suburb} area.`
    });
  }

  // Contact FAQ
  faqs.push({
    question: `How can I contact ${name}?`,
    answer: `You can reach ${name} by phone at ${agent.mobile || agent.phone || 'their office'}${agent.email ? ` or by email at ${agent.email}` : ''}.`
  });

  return faqs;
}

export function generateSuburbFAQs(suburb: SuburbStats, agencies: Agency[]): FAQ[] {
  const faqs: FAQ[] = [];

  // Count FAQ
  faqs.push({
    question: `How many real estate agents are in ${suburb.suburb_name}?`,
    answer: `There are ${suburb.agent_count} active real estate agents in ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode}, representing ${suburb.agency_count} agencies.`
  });

  // Agencies FAQ
  if (agencies.length > 0) {
    const topAgencies = agencies.slice(0, 5).map(a => a.name);
    faqs.push({
      question: `Which agencies operate in ${suburb.suburb_name}?`,
      answer: `Major agencies in ${suburb.suburb_name} include ${formatList(topAgencies)}${agencies.length > 5 ? `, and ${agencies.length - 5} more` : ''}.`
    });
  }

  // Languages FAQ
  if (suburb.languages.length > 1) {
    faqs.push({
      question: `What languages do ${suburb.suburb_name} agents speak?`,
      answer: `Agents in ${suburb.suburb_name} speak ${formatList(suburb.languages)}.`
    });
  }

  return faqs;
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
```

### FAQ Schema Component

```typescript
// components/seo/FAQSchema.tsx

interface FAQ {
  question: string;
  answer: string;
}

interface Props {
  faqs: FAQ[];
}

export default function FAQSchema({ faqs }: Props) {
  if (faqs.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## Technical SEO

### robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: 'https://ari.com.au/sitemap.xml',
  };
}
```

### Canonical URLs

```typescript
// lib/metadata.ts

export function generateCanonical(path: string): string {
  return `https://ari.com.au${path}`;
}

// In page metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    alternates: {
      canonical: generateCanonical(`/agent/${params.slug}`),
    },
  };
}
```

### Open Graph Tags

```typescript
// Default OG config
const defaultOG = {
  siteName: 'ARI - Australian Real Estate Agents Index',
  type: 'website',
  locale: 'en_AU',
};

// Agent OG tags
export function generateAgentOG(agent: Agent): OpenGraph {
  return {
    ...defaultOG,
    type: 'profile',
    title: `${agent.first_name} ${agent.last_name}`,
    description: generateAgentDescription(agent),
    images: agent.photo_url ? [{ url: agent.photo_url }] : [],
    profile: {
      firstName: agent.first_name,
      lastName: agent.last_name,
    },
  };
}
```

### Performance Optimizations

```typescript
// next.config.js

const nextConfig = {
  // Static export for CDN
  output: 'export',

  // Image optimization (disabled for static)
  images: {
    unoptimized: true,
  },

  // Compression
  compress: true,

  // Headers (configured in Vercel)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
        ],
      },
    ];
  },
};
```

---

## Content Guidelines

### Writing Style

| Element | Guidelines |
|---------|-----------|
| Titles | Factual, keyword-rich, no clickbait |
| Descriptions | Informative, include numbers, CTA |
| Bios | Professional tone, third person |
| FAQs | Natural questions users would ask |

### Content Quality

```typescript
// Content quality checks
const contentQuality = {
  // Minimum lengths
  minBioLength: 100,          // characters
  minDescriptionLength: 100,  // characters

  // Maximum lengths
  maxTitleLength: 60,
  maxDescriptionLength: 155,

  // Required elements
  requiredOnAgent: ['name', 'agency', 'suburb'],
  requiredOnAgency: ['name', 'suburb', 'state'],
  requiredOnSuburb: ['name', 'state', 'agent_count'],
};
```

### Duplicate Content Prevention

- Each agent has unique slug with hash
- Enriched bio provides unique content
- Dynamic FAQs personalized to each agent
- Location-specific content throughout

---

## Monitoring & Measurement

### Key Metrics

| Metric | Target | Tool |
|--------|--------|------|
| Indexed pages | 90%+ of published | Google Search Console |
| Average position | Monitor trends | GSC |
| Click-through rate | > 2% | GSC |
| Core Web Vitals | Pass | PageSpeed Insights |
| Crawl errors | < 1% | GSC |

### Google Search Console Setup

1. Verify domain ownership
2. Submit sitemap.xml
3. Monitor Index Coverage
4. Track Performance reports
5. Review Mobile Usability

### Warning Signs

| Issue | Threshold | Action |
|-------|-----------|--------|
| Crawled - not indexed | > 15% | Review content quality |
| Declining position | Week over week | Check competition |
| Low CTR | < 1% | Improve titles/descriptions |
| High bounce rate | > 80% | Improve page content |
| Soft 404s | Any | Fix broken pages |

### Rollout Monitoring

```
Week 1-2: 50 pages → Monitor indexation
Week 3-4: 200 pages → Check rankings
Month 2: 500 pages → Analyze traffic
Month 3+: Scale if healthy
```

---

## Related Specifications

- **[06-seo-site.md](./06-seo-site.md)** - Page implementations
- **[08-operations.md](./08-operations.md)** - Deployment and rollout
- **[02-data-schemas.md](./02-data-schemas.md)** - Data for SEO content
