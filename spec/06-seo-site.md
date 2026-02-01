# 06 - SEO Site

**Domain:** Public Application (Next.js)
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Build Process](#build-process)
4. [Database Access](#database-access)
5. [Page Types](#page-types)
6. [Agent Page](#agent-page)
7. [Agency Page](#agency-page)
8. [Suburb Page](#suburb-page)
9. [State Page](#state-page)
10. [Shared Components](#shared-components)
11. [Helper Functions](#helper-functions)
12. [Static Generation](#static-generation)

---

## Overview

The SEO Site is a **public-facing Next.js application** that generates static HTML pages from the SQLite database at build time.

### Characteristics

| Property | Value |
|----------|-------|
| Framework | Next.js 14+ (App Router) |
| Rendering | Static Site Generation (SSG) |
| Database | SQLite (read-only at build) |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Runtime | Static files from CDN |

### Key Principles

1. **Pure SSG** - All pages generated at build time
2. **No Runtime Database** - SQLite only read during `npm run build`
3. **No API Routes** - Static pages only
4. **SEO First** - Schema markup, meta tags, sitemaps

---

## Project Structure

```
seo-site/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Homepage
│   ├── globals.css                # Global styles
│   │
│   ├── agent/
│   │   └── [slug]/
│   │       └── page.tsx           # Agent profile page
│   │
│   ├── agency/
│   │   └── [slug]/
│   │       └── page.tsx           # Agency page
│   │
│   ├── agents-in/
│   │   ├── [state]/
│   │   │   └── page.tsx           # State listing page
│   │   └── [slug]/
│   │       └── page.tsx           # Suburb listing page
│   │
│   ├── sitemap.ts                 # Dynamic sitemap
│   └── robots.ts                  # robots.txt
│
├── components/
│   ├── agent/
│   │   ├── AgentHeader.tsx
│   │   ├── AgentBio.tsx
│   │   ├── AgentDetails.tsx
│   │   ├── AgentCard.tsx
│   │   └── AgentFAQ.tsx
│   │
│   ├── agency/
│   │   ├── AgencyHeader.tsx
│   │   ├── AgencyTeam.tsx
│   │   └── AgencyCard.tsx
│   │
│   ├── suburb/
│   │   ├── SuburbHeader.tsx
│   │   ├── SuburbAgentList.tsx
│   │   ├── SuburbAgencyList.tsx
│   │   └── SuburbFAQ.tsx
│   │
│   ├── shared/
│   │   ├── Breadcrumbs.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   └── ContactCard.tsx
│   │
│   └── seo/
│       ├── AgentSchema.tsx
│       ├── AgencySchema.tsx
│       ├── SuburbSchema.tsx
│       ├── FAQSchema.tsx
│       └── BreadcrumbSchema.tsx
│
├── lib/
│   ├── database.ts                # SQLite connection
│   ├── queries.ts                 # Query functions
│   ├── types.ts                   # TypeScript interfaces
│   └── utils.ts                   # Helper functions
│
├── data/
│   └── ari.db                     # SQLite database (copied from control-center)
│
├── public/
│   ├── images/
│   │   └── placeholder-agent.png
│   └── favicon.ico
│
├── tailwind.config.js
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Build Process

### How Static Generation Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS BUILD PROCESS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. npm run build                                                        │
│         │                                                                │
│         ▼                                                                │
│  2. Next.js calls generateStaticParams() for each dynamic route         │
│         │                                                                │
│         │  ┌────────────────────────────────────────┐                   │
│         ├──│ /agent/[slug]/page.tsx                 │                   │
│         │  │ Returns: [{slug: 'john-smith-...'},...]│                   │
│         │  └────────────────────────────────────────┘                   │
│         │                                                                │
│         │  ┌────────────────────────────────────────┐                   │
│         ├──│ /agency/[slug]/page.tsx                │                   │
│         │  │ Returns: [{slug: 'ray-white-...'},...]│                   │
│         │  └────────────────────────────────────────┘                   │
│         │                                                                │
│         │  ┌────────────────────────────────────────┐                   │
│         ├──│ /agents-in/[slug]/page.tsx             │                   │
│         │  │ Returns: [{slug: 'bondi-beach-...'},...│                   │
│         │  └────────────────────────────────────────┘                   │
│         │                                                                │
│         ▼                                                                │
│  3. For each param, Next.js renders the page component                   │
│         │                                                                │
│         ▼                                                                │
│  4. Outputs static HTML files:                                           │
│         • /agent/john-smith-bondi-rw-a1b2c/index.html                   │
│         • /agency/ray-white-bondi-beach/index.html                      │
│         • /agents-in/bondi-beach-nsw-2026/index.html                    │
│         • ...                                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Build Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Static export mode

  images: {
    unoptimized: true,  // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.domain.com.au',
      },
    ],
  },

  // Ensure build fails if any page errors
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
```

---

## Database Access

### Connection Setup

```typescript
// lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';

// Database path from environment or default
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');

// Read-only connection for SEO site
export const db = new Database(dbPath, { readonly: true });

// Ensure connection is closed after build
if (process.env.NODE_ENV === 'production') {
  process.on('exit', () => db.close());
}
```

### Query Functions

```typescript
// lib/queries.ts
import { db } from './database';
import { Agent, Agency, SuburbStats } from './types';

// ═══════════════════════════════════════════════════════════════════
// AGENT QUERIES
// ═══════════════════════════════════════════════════════════════════

export function getAgentBySlug(slug: string): Agent | null {
  const row = db.prepare(`
    SELECT
      a.*,
      ag.name as agency_name,
      ag.slug as agency_slug,
      ag.suburb as agency_suburb,
      ag.website as agency_website,
      ag.logo_url as agency_logo_url
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.slug = ?
  `).get(slug);

  if (!row) return null;

  return parseAgentRow(row);
}

export function getAllAgentSlugs(): { slug: string }[] {
  return db.prepare(`
    SELECT slug FROM agents
    WHERE enrichment_status = 'complete'
  `).all() as { slug: string }[];
}

export function getAgentsInSuburb(suburb: string, state: string, limit?: number): Agent[] {
  const query = `
    SELECT
      a.*,
      ag.name as agency_name,
      ag.slug as agency_slug
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.primary_suburb = ? AND a.primary_state = ?
    AND a.enrichment_status = 'complete'
    ORDER BY ag.brand_tier ASC, a.last_name ASC
    ${limit ? `LIMIT ${limit}` : ''}
  `;

  const rows = db.prepare(query).all(suburb, state);
  return rows.map(parseAgentRow);
}

export function getAgentsByAgency(agencyId: number): Agent[] {
  const rows = db.prepare(`
    SELECT a.*, ag.name as agency_name, ag.slug as agency_slug
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.agency_id = ?
    AND a.enrichment_status = 'complete'
    ORDER BY a.last_name ASC
  `).all(agencyId);

  return rows.map(parseAgentRow);
}

export function getRelatedAgents(agent: Agent, limit: number = 4): Agent[] {
  // Get other agents in same suburb, excluding current agent
  const rows = db.prepare(`
    SELECT
      a.*,
      ag.name as agency_name,
      ag.slug as agency_slug
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.primary_suburb = ?
    AND a.primary_state = ?
    AND a.id != ?
    AND a.enrichment_status = 'complete'
    ORDER BY ag.brand_tier ASC
    LIMIT ?
  `).all(agent.primary_suburb, agent.primary_state, agent.id, limit);

  return rows.map(parseAgentRow);
}

// ═══════════════════════════════════════════════════════════════════
// AGENCY QUERIES
// ═══════════════════════════════════════════════════════════════════

export function getAgencyBySlug(slug: string): Agency | null {
  return db.prepare(`
    SELECT * FROM agencies WHERE slug = ?
  `).get(slug) as Agency | null;
}

export function getAllAgencySlugs(): { slug: string }[] {
  return db.prepare(`
    SELECT slug FROM agencies
  `).all() as { slug: string }[];
}

export function getAgenciesInSuburb(suburb: string, state: string): Agency[] {
  return db.prepare(`
    SELECT * FROM agencies
    WHERE suburb = ? AND state = ?
    ORDER BY brand_tier ASC, name ASC
  `).all(suburb, state) as Agency[];
}

export function getRelatedAgencies(agency: Agency, limit: number = 3): Agency[] {
  return db.prepare(`
    SELECT * FROM agencies
    WHERE suburb = ? AND state = ? AND id != ?
    ORDER BY brand_tier ASC
    LIMIT ?
  `).all(agency.suburb, agency.state, agency.id, limit) as Agency[];
}

// ═══════════════════════════════════════════════════════════════════
// SUBURB/STATE QUERIES
// ═══════════════════════════════════════════════════════════════════

export function getAllSuburbSlugs(): { slug: string }[] {
  return db.prepare(`
    SELECT slug FROM scrape_progress
    WHERE status IN ('discovered', 'complete')
  `).all() as { slug: string }[];
}

export function getSuburbBySlug(slug: string): SuburbStats | null {
  const progress = db.prepare(`
    SELECT * FROM scrape_progress WHERE slug = ?
  `).get(slug);

  if (!progress) return null;

  const agentCount = db.prepare(`
    SELECT COUNT(*) as count FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE ag.suburb = ? AND ag.state = ?
    AND a.enrichment_status = 'complete'
  `).get(progress.suburb_name, progress.state) as { count: number };

  const agencyCount = db.prepare(`
    SELECT COUNT(*) as count FROM agencies
    WHERE suburb = ? AND state = ?
  `).get(progress.suburb_name, progress.state) as { count: number };

  // Get language statistics
  const languages = db.prepare(`
    SELECT DISTINCT json_each.value as language
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    CROSS JOIN json_each(a.languages)
    WHERE ag.suburb = ? AND ag.state = ?
    AND a.languages IS NOT NULL
  `).all(progress.suburb_name, progress.state) as { language: string }[];

  return {
    suburb_name: progress.suburb_name,
    state: progress.state,
    postcode: progress.postcode,
    slug: progress.slug,
    agent_count: agentCount.count,
    agency_count: agencyCount.count,
    languages: languages.map(l => l.language),
  };
}

export function getAllStates(): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT state FROM scrape_progress
    WHERE status IN ('discovered', 'complete')
    ORDER BY state
  `).all() as { state: string }[];

  return rows.map(r => r.state);
}

export function getSuburbsInState(state: string): SuburbStats[] {
  const suburbs = db.prepare(`
    SELECT
      sp.suburb_name,
      sp.state,
      sp.postcode,
      sp.slug,
      sp.agents_found as agent_count,
      sp.agencies_found as agency_count
    FROM scrape_progress sp
    WHERE sp.state = ?
    AND sp.status IN ('discovered', 'complete')
    ORDER BY sp.suburb_name ASC
  `).all(state) as SuburbStats[];

  return suburbs;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function parseAgentRow(row: any): Agent {
  return {
    ...row,
    languages: row.languages ? JSON.parse(row.languages) : [],
    specializations: row.specializations ? JSON.parse(row.specializations) : [],
    property_types: row.property_types ? JSON.parse(row.property_types) : [],
    awards: row.awards ? JSON.parse(row.awards) : [],
    enrichment_sources: row.enrichment_sources ? JSON.parse(row.enrichment_sources) : [],
  };
}
```

---

## Page Types

### Overview

| Page | URL | Template |
|------|-----|----------|
| Agent Profile | `/agent/{slug}` | Individual agent details |
| Agency Page | `/agency/{slug}` | Agency info + team roster |
| Suburb Listing | `/agents-in/{suburb}-{state}-{postcode}` | All agents/agencies in suburb |
| State Listing | `/agents-in/{state}` | All suburbs in state |

---

## Agent Page

### Page Component

```typescript
// app/agent/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAgentBySlug, getAllAgentSlugs, getAgencyBySlug, getRelatedAgents } from '@/lib/queries';
import { generateAgentMetadata } from '@/lib/metadata';

import AgentSchema from '@/components/seo/AgentSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';

import Breadcrumbs from '@/components/shared/Breadcrumbs';
import AgentHeader from '@/components/agent/AgentHeader';
import AgentBio from '@/components/agent/AgentBio';
import AgentDetails from '@/components/agent/AgentDetails';
import AgentFAQ from '@/components/agent/AgentFAQ';
import AgencySection from '@/components/agent/AgencySection';
import RelatedAgents from '@/components/agent/RelatedAgents';

interface Props {
  params: { slug: string };
}

// Generate all agent pages at build time
export async function generateStaticParams() {
  const agents = getAllAgentSlugs();
  return agents.map(({ slug }) => ({ slug }));
}

// Generate metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = getAgentBySlug(params.slug);
  if (!agent) return {};
  return generateAgentMetadata(agent);
}

// Page component
export default function AgentPage({ params }: Props) {
  const agent = getAgentBySlug(params.slug);

  if (!agent) {
    notFound();
  }

  const agency = getAgencyBySlug(agent.agency_slug!);
  const relatedAgents = getRelatedAgents(agent, 4);
  const faqs = generateAgentFAQs(agent);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: agent.primary_state, url: `/agents-in/${agent.primary_state.toLowerCase()}` },
    { name: agent.primary_suburb, url: `/agents-in/${agent.primary_suburb.toLowerCase()}-${agent.primary_state.toLowerCase()}-${agent.primary_postcode}` },
    { name: `${agent.first_name} ${agent.last_name}`, url: `/agent/${agent.slug}` },
  ];

  return (
    <>
      {/* Schema.org markup */}
      <AgentSchema agent={agent} agency={agency} />
      <BreadcrumbSchema items={breadcrumbs} />
      {faqs.length > 0 && <FAQSchema faqs={faqs} />}

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <AgentHeader agent={agent} agency={agency} />

        <AgentBio agent={agent} />

        {(agent.years_experience || agent.languages.length > 0 || agent.specializations.length > 0) && (
          <AgentDetails agent={agent} />
        )}

        {agent.awards.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Awards & Recognition</h2>
            <ul className="space-y-2">
              {agent.awards.map((award, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-yellow-500">🏆</span>
                  <span>{award.name}</span>
                  {award.year && <span className="text-gray-500">({award.year})</span>}
                  {award.level && <span className="text-sm text-gray-400">- {award.level}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {agency && <AgencySection agency={agency} />}

        {relatedAgents.length > 0 && (
          <RelatedAgents
            agents={relatedAgents}
            suburb={agent.primary_suburb}
            state={agent.primary_state}
          />
        )}

        {faqs.length > 0 && <AgentFAQ faqs={faqs} />}
      </main>
    </>
  );
}

function generateAgentFAQs(agent: Agent): FAQ[] {
  const faqs: FAQ[] = [];

  if (agent.years_experience) {
    faqs.push({
      question: `How long has ${agent.first_name} ${agent.last_name} been a real estate agent?`,
      answer: `${agent.first_name} ${agent.last_name} has been working in real estate for ${agent.years_experience} years${agent.career_start_year ? `, starting their career in ${agent.career_start_year}` : ''}.`
    });
  }

  if (agent.languages.length > 1) {
    faqs.push({
      question: `What languages does ${agent.first_name} ${agent.last_name} speak?`,
      answer: `${agent.first_name} ${agent.last_name} speaks ${agent.languages.join(', ')}.`
    });
  }

  if (agent.specializations.length > 0) {
    faqs.push({
      question: `What does ${agent.first_name} ${agent.last_name} specialize in?`,
      answer: `${agent.first_name} ${agent.last_name} specializes in ${agent.specializations.join(', ')} in the ${agent.primary_suburb} area.`
    });
  }

  return faqs;
}
```

### Agent Header Component

```typescript
// components/agent/AgentHeader.tsx
import Image from 'next/image';
import { Agent, Agency } from '@/lib/types';

interface Props {
  agent: Agent;
  agency: Agency | null;
}

export default function AgentHeader({ agent, agency }: Props) {
  const fullName = `${agent.first_name} ${agent.last_name}`;

  return (
    <header className="flex gap-6 items-start mb-8">
      {/* Photo */}
      <div className="flex-shrink-0">
        {agent.photo_url ? (
          <Image
            src={agent.photo_url}
            alt={fullName}
            width={150}
            height={150}
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="w-[150px] h-[150px] bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-4xl text-gray-400">
              {agent.first_name[0]}{agent.last_name[0]}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow">
        <h1 className="text-3xl font-bold mb-2">{fullName}</h1>

        {agency && (
          <p className="text-lg text-gray-600 mb-2">
            Sales Agent at{' '}
            <a href={`/agency/${agency.slug}`} className="text-blue-600 hover:underline">
              {agency.name}
            </a>
          </p>
        )}

        <p className="text-gray-500 mb-4">
          {agent.primary_suburb}, {agent.primary_state} {agent.primary_postcode}
        </p>

        {/* Contact buttons */}
        <div className="flex gap-3">
          {agent.mobile && (
            <a
              href={`tel:${agent.mobile}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Call {agent.mobile}
            </a>
          )}

          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Email
            </a>
          )}

          {agent.linkedin_url && (
            <a
              href={agent.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
```

### Agent Bio Component

```typescript
// components/agent/AgentBio.tsx
import { Agent } from '@/lib/types';

interface Props {
  agent: Agent;
}

export default function AgentBio({ agent }: Props) {
  // Prefer enriched bio, fall back to original profile text
  const bio = agent.enriched_bio || agent.profile_text;

  if (!bio) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">
        About {agent.first_name} {agent.last_name}
      </h2>
      <div className="prose max-w-none">
        <p className="text-gray-700 leading-relaxed">{bio}</p>
      </div>
    </section>
  );
}
```

### Agent Details Component

```typescript
// components/agent/AgentDetails.tsx
import { Agent } from '@/lib/types';

interface Props {
  agent: Agent;
}

export default function AgentDetails({ agent }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Experience & Expertise</h2>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agent.years_experience && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm text-gray-500 mb-1">Experience</dt>
            <dd className="font-medium">
              {agent.years_experience} years in real estate
              {agent.career_start_year && (
                <span className="text-gray-500 text-sm"> (since {agent.career_start_year})</span>
              )}
            </dd>
          </div>
        )}

        {agent.languages.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm text-gray-500 mb-1">Languages</dt>
            <dd className="font-medium">{agent.languages.join(', ')}</dd>
          </div>
        )}

        {agent.specializations.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm text-gray-500 mb-1">Specializations</dt>
            <dd className="font-medium">{agent.specializations.join(', ')}</dd>
          </div>
        )}

        {agent.property_types.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm text-gray-500 mb-1">Property Types</dt>
            <dd className="font-medium">{agent.property_types.join(', ')}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
```

---

## Agency Page

### Page Component

```typescript
// app/agency/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAgencyBySlug, getAllAgencySlugs, getAgentsByAgency, getRelatedAgencies } from '@/lib/queries';

import AgencySchema from '@/components/seo/AgencySchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

import Breadcrumbs from '@/components/shared/Breadcrumbs';
import AgencyHeader from '@/components/agency/AgencyHeader';
import AgencyTeam from '@/components/agency/AgencyTeam';
import AgencyCard from '@/components/agency/AgencyCard';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const agencies = getAllAgencySlugs();
  return agencies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agency = getAgencyBySlug(params.slug);
  if (!agency) return {};

  return {
    title: `${agency.name} - ${agency.suburb}, ${agency.state} | ARI`,
    description: agency.description
      ? agency.description.slice(0, 155)
      : `${agency.name} is a real estate agency in ${agency.suburb}, ${agency.state}. View their team of ${agency.agent_count} agents.`,
  };
}

export default function AgencyPage({ params }: Props) {
  const agency = getAgencyBySlug(params.slug);

  if (!agency) {
    notFound();
  }

  const agents = getAgentsByAgency(agency.id);
  const relatedAgencies = getRelatedAgencies(agency, 3);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: agency.state, url: `/agents-in/${agency.state.toLowerCase()}` },
    { name: agency.suburb, url: `/agents-in/${agency.suburb.toLowerCase().replace(/ /g, '-')}-${agency.state.toLowerCase()}-${agency.postcode}` },
    { name: agency.name, url: `/agency/${agency.slug}` },
  ];

  return (
    <>
      <AgencySchema agency={agency} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <AgencyHeader agency={agency} />

        {agency.description && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">About {agency.name}</h2>
            <p className="text-gray-700 leading-relaxed">{agency.description}</p>

            <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {agency.principal_name && (
                <div>
                  <dt className="text-sm text-gray-500">Principal</dt>
                  <dd className="font-medium">{agency.principal_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Team Size</dt>
                <dd className="font-medium">{agents.length} agents</dd>
              </div>
              {agency.properties_for_sale !== null && (
                <div>
                  <dt className="text-sm text-gray-500">For Sale</dt>
                  <dd className="font-medium">{agency.properties_for_sale} properties</dd>
                </div>
              )}
              {agency.properties_for_rent !== null && (
                <div>
                  <dt className="text-sm text-gray-500">For Rent</dt>
                  <dd className="font-medium">{agency.properties_for_rent} properties</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <AgencyTeam agents={agents} agencyName={agency.name} />

        {relatedAgencies.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Other Agencies in {agency.suburb}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedAgencies.map(a => (
                <AgencyCard key={a.id} agency={a} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
```

---

## Suburb Page

### Page Component

```typescript
// app/agents-in/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSuburbBySlug, getAllSuburbSlugs, getAgentsInSuburb, getAgenciesInSuburb } from '@/lib/queries';

import SuburbSchema from '@/components/seo/SuburbSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';

import Breadcrumbs from '@/components/shared/Breadcrumbs';
import SuburbHeader from '@/components/suburb/SuburbHeader';
import SuburbAgentList from '@/components/suburb/SuburbAgentList';
import SuburbAgencyList from '@/components/suburb/SuburbAgencyList';
import SuburbFAQ from '@/components/suburb/SuburbFAQ';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const suburbs = getAllSuburbSlugs();
  return suburbs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const suburb = getSuburbBySlug(params.slug);
  if (!suburb) return {};

  return {
    title: `${suburb.agent_count} Real Estate Agents in ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode} | ARI`,
    description: `Find and compare ${suburb.agent_count} real estate agents in ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode}. Browse ${suburb.agency_count} agencies and find the right agent for you.`,
  };
}

export default function SuburbPage({ params }: Props) {
  const suburb = getSuburbBySlug(params.slug);

  if (!suburb) {
    notFound();
  }

  const agents = getAgentsInSuburb(suburb.suburb_name, suburb.state);
  const agencies = getAgenciesInSuburb(suburb.suburb_name, suburb.state);
  const faqs = generateSuburbFAQs(suburb, agencies);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: suburb.state, url: `/agents-in/${suburb.state.toLowerCase()}` },
    { name: suburb.suburb_name, url: `/agents-in/${suburb.slug}` },
  ];

  return (
    <>
      <SuburbSchema suburb={suburb} agents={agents} />
      <BreadcrumbSchema items={breadcrumbs} />
      {faqs.length > 0 && <FAQSchema faqs={faqs} />}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <SuburbHeader suburb={suburb} />

        <SuburbAgentList agents={agents} suburb={suburb} />

        <SuburbAgencyList agencies={agencies} suburb={suburb} />

        {faqs.length > 0 && <SuburbFAQ faqs={faqs} />}
      </main>
    </>
  );
}

function generateSuburbFAQs(suburb: SuburbStats, agencies: Agency[]): FAQ[] {
  const faqs: FAQ[] = [];

  faqs.push({
    question: `How many real estate agents are in ${suburb.suburb_name}?`,
    answer: `There are ${suburb.agent_count} active real estate agents in ${suburb.suburb_name}, ${suburb.state} ${suburb.postcode}, representing ${suburb.agency_count} agencies.`
  });

  if (agencies.length > 0) {
    const topAgencies = agencies.slice(0, 5).map(a => a.name);
    faqs.push({
      question: `Which agencies operate in ${suburb.suburb_name}?`,
      answer: `Major agencies in ${suburb.suburb_name} include ${topAgencies.join(', ')}${agencies.length > 5 ? `, and ${agencies.length - 5} more` : ''}.`
    });
  }

  if (suburb.languages.length > 1) {
    faqs.push({
      question: `What languages do ${suburb.suburb_name} agents speak?`,
      answer: `Agents in ${suburb.suburb_name} speak ${suburb.languages.join(', ')}.`
    });
  }

  return faqs;
}
```

---

## State Page

### Page Component

```typescript
// app/agents-in/[state]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllStates, getSuburbsInState } from '@/lib/queries';
import Link from 'next/link';

import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import Breadcrumbs from '@/components/shared/Breadcrumbs';

const STATE_NAMES: Record<string, string> = {
  nsw: 'New South Wales',
  vic: 'Victoria',
  qld: 'Queensland',
  wa: 'Western Australia',
  sa: 'South Australia',
  tas: 'Tasmania',
  act: 'Australian Capital Territory',
  nt: 'Northern Territory',
};

interface Props {
  params: { state: string };
}

export async function generateStaticParams() {
  const states = getAllStates();
  return states.map(state => ({ state: state.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateName = STATE_NAMES[params.state] || params.state.toUpperCase();

  return {
    title: `Real Estate Agents in ${stateName} | ARI`,
    description: `Browse real estate agents across ${stateName}. Find agents by suburb and compare their experience, specializations, and reviews.`,
  };
}

export default function StatePage({ params }: Props) {
  const stateUpper = params.state.toUpperCase();
  const stateName = STATE_NAMES[params.state] || stateUpper;
  const suburbs = getSuburbsInState(stateUpper);

  if (suburbs.length === 0) {
    notFound();
  }

  const totalAgents = suburbs.reduce((sum, s) => sum + s.agent_count, 0);
  const totalAgencies = suburbs.reduce((sum, s) => sum + s.agency_count, 0);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: stateName, url: `/agents-in/${params.state}` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Real Estate Agents in {stateName}
          </h1>
          <p className="text-gray-600">
            Browse {totalAgents.toLocaleString()} agents from {totalAgencies.toLocaleString()} agencies
            across {suburbs.length} suburbs in {stateName}.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4">Suburbs in {stateName}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suburbs.map(suburb => (
              <Link
                key={suburb.slug}
                href={`/agents-in/${suburb.slug}`}
                className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-sm transition"
              >
                <h3 className="font-medium">{suburb.suburb_name}</h3>
                <p className="text-sm text-gray-500">
                  {suburb.agent_count} agents · {suburb.agency_count} agencies
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
```

---

## Shared Components

### Breadcrumbs

```typescript
// components/shared/Breadcrumbs.tsx
import Link from 'next/link';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={item.url} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}

            {index === items.length - 1 ? (
              <span className="text-gray-500">{item.name}</span>
            ) : (
              <Link href={item.url} className="text-blue-600 hover:underline">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Agent Card

```typescript
// components/agent/AgentCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Agent } from '@/lib/types';

interface Props {
  agent: Agent;
}

export default function AgentCard({ agent }: Props) {
  const fullName = `${agent.first_name} ${agent.last_name}`;

  return (
    <Link
      href={`/agent/${agent.slug}`}
      className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-sm transition"
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="flex-shrink-0">
          {agent.photo_url ? (
            <Image
              src={agent.photo_url}
              alt={fullName}
              width={64}
              height={64}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-lg text-gray-400">
                {agent.first_name[0]}{agent.last_name[0]}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-grow min-w-0">
          <h3 className="font-medium truncate">{fullName}</h3>
          <p className="text-sm text-gray-500 truncate">{agent.agency_name}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {agent.years_experience && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {agent.years_experience} years
              </span>
            )}
            {agent.languages.length > 1 && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {agent.languages.length} languages
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

---

## Helper Functions

### Metadata Generation

```typescript
// lib/metadata.ts
import { Metadata } from 'next';
import { Agent, Agency } from './types';

export function generateAgentMetadata(agent: Agent): Metadata {
  const fullName = `${agent.first_name} ${agent.last_name}`;

  // Build description with available data
  const parts = [
    `${fullName} is a real estate agent`,
    `at ${agent.agency_name} in ${agent.primary_suburb}, ${agent.primary_state}.`
  ];

  if (agent.years_experience) {
    parts.push(`${agent.years_experience} years experience.`);
  }

  if (agent.specializations.length > 0) {
    parts.push(`Specializes in ${agent.specializations[0]}.`);
  }

  if (agent.languages.length > 1) {
    parts.push(`Speaks ${agent.languages.join(', ')}.`);
  }

  parts.push('View profile and contact details.');

  const description = parts.join(' ').slice(0, 155);

  return {
    title: `${fullName} - Real Estate Agent in ${agent.primary_suburb} | ${agent.agency_name} | ARI`,
    description,
    openGraph: {
      title: fullName,
      description,
      type: 'profile',
      images: agent.photo_url ? [agent.photo_url] : [],
    },
  };
}
```

---

## Static Generation

### Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getAllAgentSlugs, getAllAgencySlugs, getAllSuburbSlugs, getAllStates } from '@/lib/queries';

const BASE_URL = 'https://ari.com.au';

export default function sitemap(): MetadataRoute.Sitemap {
  const agents = getAllAgentSlugs();
  const agencies = getAllAgencySlugs();
  const suburbs = getAllSuburbSlugs();
  const states = getAllStates();

  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  // State pages
  for (const state of states) {
    entries.push({
      url: `${BASE_URL}/agents-in/${state.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Suburb pages
  for (const { slug } of suburbs) {
    entries.push({
      url: `${BASE_URL}/agents-in/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Agency pages
  for (const { slug } of agencies) {
    entries.push({
      url: `${BASE_URL}/agency/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // Agent pages
  for (const { slug } of agents) {
    entries.push({
      url: `${BASE_URL}/agent/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  return entries;
}
```

### Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: 'https://ari.com.au/sitemap.xml',
  };
}
```

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - SEO site in system architecture
- **[02-data-schemas.md](./02-data-schemas.md)** - Database schema and queries
- **[07-seo-strategy.md](./07-seo-strategy.md)** - Schema markup and meta tags
- **[08-operations.md](./08-operations.md)** - Vercel deployment
