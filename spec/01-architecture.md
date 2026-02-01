# 01 - System Architecture

**Domain:** System Design
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Two-Application Architecture](#two-application-architecture)
3. [Application 1: Control Center](#application-1-control-center)
4. [Application 2: SEO Site](#application-2-seo-site)
5. [Data Flow Between Applications](#data-flow-between-applications)
6. [Complete Data Pipeline](#complete-data-pipeline)
7. [Project Folder Structure](#project-folder-structure)
8. [Technology Stack](#technology-stack)
9. [Application Boundaries](#application-boundaries)
10. [Communication Patterns](#communication-patterns)

---

## Overview

ARI consists of **two separate applications** that work together to create a public index of Australian real estate agents:

| Application | Purpose | Location | Database Access |
|-------------|---------|----------|-----------------|
| Control Center | Data pipeline management | Local/private server | Read/Write |
| SEO Site | Public static pages | Vercel | Read-only (build time) |

### Why Two Applications?

📌 **Key Decision:** Separating concerns between data management and public display provides:

1. **Security** - API keys and enrichment logic never exposed publicly
2. **Cost Control** - Expensive operations (API calls, Claude) run on-demand
3. **Performance** - Static pages served from CDN with zero runtime cost
4. **Simplicity** - Each app has a single responsibility

---

## Two-Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   APPLICATION 1: CONTROL CENTER (Node.js)                                    │
│   ─────────────────────────────────────────                                  │
│   Location: Local machine or private server                                  │
│   Purpose: Data pipeline management                                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         FRONTEND UI                                  │   │
│   │                                                                      │   │
│   │  • Suburb list with status indicators                               │   │
│   │  • Agency selection within suburbs                                  │   │
│   │  • Manual trigger buttons                                           │   │
│   │  • Real-time streaming logs                                         │   │
│   │  • Progress visualization                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      BACKEND SERVICES                                │   │
│   │                                                                      │   │
│   │  ┌─────────────────────────────────┐  ┌─────────────────────────┐  │   │
│   │  │  Claude Agent SDK               │  │  SQLite Database        │  │   │
│   │  │                                 │  │                         │  │   │
│   │  │  ┌─────────────────────────┐   │  │  • agencies             │  │   │
│   │  │  │ DISCOVERY SKILL (1)    │   │  │  • agents               │  │   │
│   │  │  │ • Find agencies        │   │  │  • scrape_progress      │  │   │
│   │  │  │ • Find agents          │   │  │  • agency_progress      │  │   │
│   │  │  │ • Web research         │   │  │                         │  │   │
│   │  │  └─────────────────────────┘   │  │                         │  │   │
│   │  │  ┌─────────────────────────┐   │  │                         │  │   │
│   │  │  │ ENRICHMENT SKILL (2)   │   │  │                         │  │   │
│   │  │  │ • Enhance profiles     │   │  │                         │  │   │
│   │  │  │ • LinkedIn, awards     │   │  │                         │  │   │
│   │  │  │ • Deep research        │   │  │                         │  │   │
│   │  │  └─────────────────────────┘   │  │                         │  │   │
│   │  └─────────────────────────────────┘  └─────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ Trigger via Vercel Deploy Hook         │
│                                     ▼                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   APPLICATION 2: SEO SITE (Next.js)                                          │
│   ─────────────────────────────────                                          │
│   Location: Vercel                                                           │
│   Purpose: Static SEO pages                                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         BUILD PROCESS                                │   │
│   │                                                                      │   │
│   │  1. Read SQLite database                                            │   │
│   │  2. generateStaticParams() returns all slugs                        │   │
│   │  3. Build static HTML for each page                                 │   │
│   │  4. Deploy to Vercel CDN                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         STATIC PAGES                                 │   │
│   │                                                                      │   │
│   │  • /agent/{slug}           → Agent profiles                         │   │
│   │  • /agency/{slug}          → Agency pages                           │   │
│   │  • /agents-in/{suburb}     → Suburb listings                        │   │
│   │  • /agents-in/{state}      → State listings                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Application 1: Control Center

### Purpose

The Control Center is an **admin-only application** that manages the entire data pipeline:

1. Running Claude Discovery Skill to find agencies and agents
2. Storing discovered data in SQLite
3. Running Claude Enrichment Skill to enhance profiles
4. Triggering Vercel deployments

### Characteristics

| Property | Value |
|----------|-------|
| Framework | Node.js + Express |
| UI | Single HTML page with vanilla JS |
| Database | SQLite (read/write) |
| AI | Claude Agent SDK (Discovery + Enrichment skills) |
| Deployment | Local machine or private server |
| Access | Admin only (not public) |
| Runtime | On-demand (manual triggers) |

### Components

```
Control Center
├── Frontend (UI)
│   ├── Suburb list with status
│   ├── Agency selection panel
│   ├── Action buttons
│   └── Streaming activity log
│
├── Backend Services
│   ├── Express server (API + static files)
│   ├── Claude Discovery Skill (find agencies/agents)
│   ├── Claude Enrichment Skill (enhance profiles)
│   └── SQLite database wrapper
│
└── Outputs
    ├── SQLite database (ari.db)
    └── Vercel deploy trigger
```

### Why Node.js?

- Native support for Claude Agent SDK
- SQLite works seamlessly with better-sqlite3
- Simple Express server for UI
- Can run locally without infrastructure

---

## Application 2: SEO Site

### Purpose

The SEO Site is a **public-facing Next.js application** that generates static HTML pages from the SQLite database at build time.

### Characteristics

| Property | Value |
|----------|-------|
| Framework | Next.js 14+ (App Router) |
| Rendering | Static Site Generation (SSG) |
| Database | SQLite (read-only at build time) |
| APIs Used | None at runtime |
| Deployment | Vercel |
| Access | Public |
| Runtime | Static files from CDN |

### Components

```
SEO Site
├── Build Process
│   ├── Read SQLite database
│   ├── generateStaticParams() for all routes
│   ├── Render pages to static HTML
│   └── Generate sitemaps
│
├── Page Templates
│   ├── /agent/[slug]/page.tsx
│   ├── /agency/[slug]/page.tsx
│   ├── /agents-in/[slug]/page.tsx
│   └── /agents-in/[state]/page.tsx
│
├── Components
│   ├── Agent components
│   ├── Agency components
│   ├── Suburb components
│   └── SEO components (Schema, Meta)
│
└── Outputs
    └── Static HTML files on Vercel CDN
```

### Why Next.js with SSG?

- Perfect for SEO (fully rendered HTML)
- Zero runtime costs (static files)
- Built-in optimization (images, fonts)
- Vercel deployment is seamless
- generateStaticParams() handles dynamic routes

---

## Data Flow Between Applications

### Overview

```
Control Center                              SEO Site
─────────────────                          ─────────
     │                                          │
     │  1. Run Claude Discovery Skill           │
     │     (find agencies & agents via web)     │
     │  2. Store in SQLite                      │
     │  3. Run Claude Enrichment Skill          │
     │     (enhance profiles via web research)  │
     │  4. Update SQLite                        │
     │                                          │
     │──── SQLite database file ────────────────│
     │     (shared or copied)                   │
     │                                          │
     │  5. Trigger Vercel Deploy Hook ──────────│
     │                                          │
     │                                     6. Build reads SQLite
     │                                     7. Generate static pages
     │                                     8. Deploy to CDN
```

### Database Sharing Strategy

📌 **Key Decision:** The SQLite database must be accessible to both applications.

**Option A: Git-committed database (Recommended for V1)**
```
1. Control Center writes to /control-center/data/ari.db
2. Copy database to /seo-site/data/ari.db
3. Commit to git repository
4. Vercel pulls from git on deploy
```

**Option B: External storage (Future)**
```
1. Control Center uploads ari.db to cloud storage (S3, R2)
2. Vercel build downloads database
3. Keeps git repository smaller
```

### Trigger Mechanism

The Control Center triggers SEO Site builds via **Vercel Deploy Hook**:

```typescript
// Control Center triggers build
POST https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy

// Vercel starts build
// Next.js reads SQLite
// Static pages generated
// Deployed to CDN
```

---

## Complete Data Pipeline

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: USER SELECTS WORK IN CONTROL CENTER UI
────────────────────────────────────────────────
User opens Control Center → Sees suburb list → Selects suburbs/agencies to process

                                    │
                                    ▼

STEP 2: DISCOVERY VIA CLAUDE AGENT SDK
──────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  For each selected suburb:                                       │
│                                                                  │
│  Main Agent searches for agencies via:                          │
│      • Agency brand websites                                    │
│      • Domain.com.au website                                    │
│      • LinkedIn                                                 │
│      • Google                                                   │
│      │                                                           │
│      ▼                                                           │
│  For each NEW agency found (not in database):                   │
│      │                                                           │
│      │  Sub-agent visits agency website/team page               │
│      │      │                                                    │
│      │      ▼                                                    │
│      │  Extract all agents from team page                       │
│      │  Store agency in SQLite                                  │
│      │  Store all agents in SQLite (enrichment_status='pending')│
│      │                                                           │
│  Update suburb status = 'discovered'                            │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 3: ENRICHMENT VIA CLAUDE AGENT SDK
───────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Select batch: 20-50 agents with enrichment_status='pending'    │
│                                                                  │
│  Main Agent receives batch                                       │
│      │                                                           │
│      ├── Spawns Sub-agent 1 (5-10 agents)                       │
│      ├── Spawns Sub-agent 2 (5-10 agents)                       │
│      ├── Spawns Sub-agent 3 (5-10 agents)                       │
│      └── ...                                                     │
│                                                                  │
│  Each sub-agent:                                                 │
│      • Searches LinkedIn, agency website, Google                 │
│      • Finds: experience, languages, specializations, awards    │
│      • Writes enriched_bio based on findings                    │
│      • Returns structured JSON                                   │
│                                                                  │
│  Main Agent collects results                                     │
│      │                                                           │
│      ▼                                                           │
│  Update agents in SQLite with enriched data                     │
│  Set enrichment_status = 'complete'                             │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 4: TRIGGER VERCEL BUILD
────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  POST to Vercel Deploy Hook URL                                  │
│                                                                  │
│  Response: { job: { id: "...", state: "PENDING" } }             │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 5: NEXT.JS STATIC BUILD
────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Vercel runs: npm run build                                      │
│                                                                  │
│  generateStaticParams() reads SQLite:                           │
│      • Get all agents → build /agent/{slug} pages               │
│      • Get all agencies → build /agency/{slug} pages            │
│      • Get all suburbs → build /agents-in/{slug} pages          │
│      • Get all states → build /agents-in/{state} pages          │
│                                                                  │
│  Output: Static HTML files for each page                        │
└─────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

STEP 6: DEPLOY TO CDN
─────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  Vercel deploys static files to global CDN                       │
│                                                                  │
│  Pages now live at:                                              │
│      • https://ari.com.au/agent/john-smith-bondi-rw-a1b2c       │
│      • https://ari.com.au/agency/ray-white-bondi-beach          │
│      • https://ari.com.au/agents-in/bondi-beach-nsw-2026        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Folder Structure

```
ari/
├── control-center/                    # Node.js app
│   ├── src/
│   │   ├── skills/                    # Claude Agent SDK skills
│   │   │   ├── discovery/
│   │   │   │   ├── main-agent.ts      # Discovery orchestrator
│   │   │   │   ├── sub-agent-definition.ts
│   │   │   │   └── prompts.ts
│   │   │   ├── enrichment/
│   │   │   │   ├── main-agent.ts      # Enrichment orchestrator
│   │   │   │   ├── sub-agent-definition.ts
│   │   │   │   └── prompts.ts
│   │   │   └── shared/
│   │   │       ├── output-schema.ts   # SubAgentOutput (shared)
│   │   │       └── cost-tracker.ts
│   │   ├── routes/
│   │   │   ├── discovery.ts           # Discovery endpoints
│   │   │   ├── enrichment.ts          # Enrichment endpoints
│   │   │   └── deploy.ts
│   │   ├── db/
│   │   │   ├── database.ts            # SQLite connection
│   │   │   ├── schema.sql             # Table definitions
│   │   │   └── queries.ts             # Prepared statements
│   │   ├── deploy/
│   │   │   └── vercel.ts              # Deploy hook trigger
│   │   ├── ui/
│   │   │   └── server.ts              # Express server for UI
│   │   └── index.ts                   # Entry point
│   ├── public/
│   │   ├── index.html                 # Control Center UI
│   │   ├── styles.css                 # UI styles
│   │   └── app.js                     # UI JavaScript
│   ├── data/
│   │   └── ari.db                     # SQLite database
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                           # API keys (not committed)
│
├── seo-site/                          # Next.js app
│   ├── app/
│   │   ├── agent/
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Agent profile page
│   │   ├── agency/
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Agency page
│   │   ├── agents-in/
│   │   │   ├── [state]/
│   │   │   │   └── page.tsx           # State listing page
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Suburb listing page
│   │   ├── sitemap.ts                 # Dynamic sitemap
│   │   ├── robots.ts                  # robots.txt
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Homepage
│   ├── components/
│   │   ├── agent/
│   │   │   ├── AgentHeader.tsx
│   │   │   ├── AgentBio.tsx
│   │   │   ├── AgentDetails.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   └── AgentFAQ.tsx
│   │   ├── agency/
│   │   │   ├── AgencyHeader.tsx
│   │   │   ├── AgencyTeam.tsx
│   │   │   └── AgencyCard.tsx
│   │   ├── suburb/
│   │   │   ├── SuburbHeader.tsx
│   │   │   ├── SuburbAgentList.tsx
│   │   │   └── SuburbFAQ.tsx
│   │   ├── shared/
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   └── seo/
│   │       ├── AgentSchema.tsx        # Schema.org for agents
│   │       ├── AgencySchema.tsx       # Schema.org for agencies
│   │       ├── SuburbSchema.tsx       # Schema.org for suburb lists
│   │       └── FAQSchema.tsx          # Schema.org for FAQs
│   ├── lib/
│   │   ├── database.ts                # SQLite read-only connection
│   │   ├── queries.ts                 # Query functions
│   │   └── types.ts                   # TypeScript interfaces
│   ├── data/
│   │   └── ari.db                     # Copy of SQLite (or symlink)
│   ├── public/
│   │   └── images/                    # Static assets
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── .env                           # Database path
│
├── spec/                              # This specification folder
│   ├── index.md
│   ├── 01-architecture.md
│   ├── 02-data-schemas.md
│   ├── 03-discovery-skill.md
│   ├── 04-enrichment-pipeline.md
│   ├── 05-control-center.md
│   ├── 06-seo-site.md
│   ├── 07-seo-strategy.md
│   └── 08-operations.md
│
└── README.md                          # Project overview
```

---

## Technology Stack

### Control Center

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js 20+ | JavaScript execution |
| Language | TypeScript | Type safety |
| Server | Express | HTTP server for UI |
| Database | SQLite + better-sqlite3 | Local data storage |
| AI | Claude Agent SDK | Discovery + Enrichment skills |
| HTTP | fetch (native) | Web research |

### SEO Site

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 14+ | React SSG framework |
| Language | TypeScript | Type safety |
| Rendering | SSG (Static) | Build-time page generation |
| Database | SQLite + better-sqlite3 | Read-only at build |
| Styling | Tailwind CSS | Utility-first CSS |
| Deployment | Vercel | Hosting & CDN |

### Shared

| Tool | Purpose |
|------|---------|
| SQLite | Portable database format |
| TypeScript | Shared type definitions |
| Git | Version control |

---

## Application Boundaries

### What Each Application Does

| Responsibility | Control Center | SEO Site |
|----------------|----------------|----------|
| Claude Discovery Skill | ✅ | ❌ |
| Claude Enrichment Skill | ✅ | ❌ |
| SQLite writes | ✅ | ❌ |
| SQLite reads | ✅ | ✅ (build only) |
| Admin UI | ✅ | ❌ |
| Public pages | ❌ | ✅ |
| Schema markup | ❌ | ✅ |
| Sitemap generation | ❌ | ✅ |
| Vercel deployment | Triggers | Hosts |

### Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVATE (Control Center)                      │
│                                                                  │
│  • Anthropic API key                                            │
│  • Vercel deploy hook URL                                       │
│  • Discovery & Enrichment prompts                               │
│  • Admin access                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQLite database (data only)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLIC (SEO Site)                            │
│                                                                  │
│  • Static HTML pages                                            │
│  • Public agent/agency data                                     │
│  • Schema.org markup                                            │
│  • Sitemaps                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Communication Patterns

### Control Center → SEO Site

**Method:** Vercel Deploy Hook (HTTP POST)

```
Control Center                         Vercel
     │                                    │
     │  POST /deploy/prj_xxx/yyy         │
     │  ─────────────────────────────────►│
     │                                    │
     │  { job: { id, state } }           │
     │  ◄─────────────────────────────────│
     │                                    │
     │         (Build starts)            │
     │                                    │
     │  Poll deployment status           │
     │  ─────────────────────────────────►│
     │                                    │
     │  { readyState: "READY" }          │
     │  ◄─────────────────────────────────│
```

### No Direct Communication

⚠️ **Important:** The SEO Site never calls the Control Center. Communication is one-way:

1. Control Center updates database
2. Control Center triggers deploy
3. SEO Site reads database at build time
4. SEO Site serves static files

### Database as Integration Point

The SQLite database is the **only shared resource** between applications:

```
Control Center                    SEO Site
     │                                │
     │  INSERT/UPDATE ──► ari.db     │
     │                       │        │
     │                       │        │
     │           (git push or copy)   │
     │                       │        │
     │                       ▼        │
     │                    ari.db ◄── SELECT
     │                                │
```

---

## Related Specifications

- **[02-data-schemas.md](./02-data-schemas.md)** - Database schema details
- **[03-discovery-skill.md](./03-discovery-skill.md)** - Discovery Skill implementation
- **[04-enrichment-pipeline.md](./04-enrichment-pipeline.md)** - Enrichment Skill implementation
- **[05-control-center.md](./05-control-center.md)** - Control Center implementation
- **[06-seo-site.md](./06-seo-site.md)** - SEO Site implementation
- **[08-operations.md](./08-operations.md)** - Deployment and operations
