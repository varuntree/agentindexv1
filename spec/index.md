# ARI Specification Index

**Version:** 1.0
**Last Updated:** 2026-02-01
**Status:** Ready for Implementation

---

## Overview

ARI (Australian Real Estate Agents Index) is a two-application system that creates SEO-optimized public profiles for Australian real estate agents. The system consists of:

1. **Control Center** - A Node.js application for data pipeline management (fetch, enrich, deploy)
2. **SEO Site** - A Next.js application that generates static pages for public consumption

This specification is divided into 8 domain-specific documents. Each document is self-contained but references others where dependencies exist.

---

## Specification Files

| # | File | Domain | Description |
|---|------|--------|-------------|
| 01 | [architecture.md](./01-architecture.md) | System Design | Two-app architecture, data flow, project structure, application boundaries |
| 02 | [data-schemas.md](./02-data-schemas.md) | Data Layer | SQLite schemas, TypeScript interfaces, field definitions, relationships |
| 03 | [discovery-skill.md](./03-discovery-skill.md) | AI Integration | Claude Discovery Skill, agency/agent discovery via web research |
| 04 | [enrichment-pipeline.md](./04-enrichment-pipeline.md) | AI Integration | Claude Enrichment Skill, main/sub-agent architecture, research rules |
| 05 | [control-center.md](./05-control-center.md) | Admin Application | UI design, actions, streaming logs, Express server |
| 06 | [seo-site.md](./06-seo-site.md) | Public Application | Page templates, build process, components, database queries |
| 07 | [seo-strategy.md](./07-seo-strategy.md) | SEO | URLs, Schema.org markup, meta tags, sitemaps, FAQ generation |
| 08 | [operations.md](./08-operations.md) | Deployment & Ops | Suburb priorities, Vercel deploy, environment variables, rollout |

---

## Quick Reference

### What ARI Is

- A neutral, public index of licensed real estate professionals
- SEO-first static pages for agent discovery
- Enriched profiles with years of experience, languages, specializations
- Free, non-biased, transparent

### What ARI Is NOT

- Not a marketplace
- Not a listings portal
- Not pay-to-rank
- Not endorsement or lead resale

### V1 Scope Summary

| Included | Excluded (V2) |
|----------|---------------|
| Claude Discovery Skill → agencies → agents | Live listings data |
| Claude Enrichment Skill (experience, languages, awards) | Properties sold stats |
| Static pages (agent, agency, suburb, state) | Review collection |
| Control Center with UI | Agent claiming / auth |
| Vercel Deploy Hook | ISR / Vercel KV |
| Schema markup & sitemaps | Brisbane / Melbourne |
| Sydney suburbs only | |

### Page Types

| Page | URL Pattern | Content |
|------|-------------|---------|
| Agent Profile | `/agent/{slug}` | Full agent details + enriched data |
| Agency Page | `/agency/{slug}` | Agency info + agent roster |
| Suburb Listing | `/agents-in/{suburb}-{state}-{postcode}` | All agents in suburb |
| State Listing | `/agents-in/{state}` | All suburbs in state |

### Data Flow Summary

```
1. User selects suburbs in Control Center UI
2. Claude Discovery Skill finds agencies/agents via web research
3. Data stored in SQLite database (enrichment_status = 'pending')
4. Claude Enrichment Skill enhances agent profiles
5. Enriched data updated in SQLite
6. Vercel Deploy Hook triggered
7. Next.js builds static pages from SQLite
8. Pages deployed to Vercel CDN
```

---

## Reading Order

**For new developers:**
1. Start with `01-architecture.md` for system overview
2. Read `02-data-schemas.md` to understand data structures
3. Continue sequentially through remaining files

**For specific tasks:**

| Task | Start With |
|------|------------|
| Setting up Discovery Skill | `03-discovery-skill.md` |
| Implementing enrichment | `04-enrichment-pipeline.md` |
| Building Control Center UI | `05-control-center.md` |
| Creating page templates | `06-seo-site.md` |
| Adding schema markup | `07-seo-strategy.md` |
| Deploying to production | `08-operations.md` |

---

## Cross-Reference Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SPECIFICATION MAP                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ 01-architecture  │◄─── Start here for system overview                │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │ 02-data-schemas  │◄─── Referenced by all other specs                 │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│     ┌─────┴─────┐                                                       │
│     ▼           ▼                                                       │
│  ┌──────────┐  ┌─────────────────────┐                                  │
│  │ 03-disco-│  │ 04-enrichment       │                                  │
│  │ very-skill│ │ -pipeline           │                                  │
│  └────┬─────┘  └──────────┬──────────┘                                  │
│       │                   │                                              │
│       └─────────┬─────────┘                                              │
│                 ▼                                                        │
│        ┌──────────────────┐                                             │
│        │ 05-control-center│◄─── Uses 03 & 04                            │
│        └────────┬─────────┘                                             │
│                 │                                                        │
│                 ▼                                                        │
│        ┌──────────────────┐                                             │
│        │ 06-seo-site      │◄─── Uses 02 for queries                     │
│        └────────┬─────────┘                                             │
│                 │                                                        │
│                 ▼                                                        │
│        ┌──────────────────┐                                             │
│        │ 07-seo-strategy  │◄─── Extends 06 with SEO                     │
│        └────────┬─────────┘                                             │
│                 │                                                        │
│                 ▼                                                        │
│        ┌──────────────────┐                                             │
│        │ 08-operations    │◄─── Deployment & runtime                    │
│        └──────────────────┘                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Conventions Used

### Status Indicators

| Symbol | Meaning |
|--------|---------|
| ✅ | Included in V1 |
| ❌ | Excluded from V1 (deferred to V2) |
| ⚠️ | Important warning or constraint |
| 📌 | Key decision or requirement |

### Code Blocks

- **SQL** - Database schema definitions
- **TypeScript** - Interface definitions and implementation code
- **JSON** - API responses and Schema.org markup
- **Bash** - Environment variables and CLI commands

### Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Agent slug | `{first}-{last}-{suburb}-{agency-abbr}-{hash}` | `john-smith-bondi-rw-a1b2c` |
| Agency slug | `{brand}-{suburb}` | `ray-white-bondi-beach` |
| Suburb slug | `{suburb}-{state}-{postcode}` | `bondi-beach-nsw-2026` |
| State slug | `{state-abbr}` | `nsw` |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial specification split into 8 domain files |
