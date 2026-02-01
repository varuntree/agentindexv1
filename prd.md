# ARI — Australian Real Estate Agents Index

## Product Requirements Document (PRD)

**Version:** 0.1
**Status:** Draft
**Scope:** 40-hour growth experiment

---

## Executive Summary

### Goal

Test whether a neutral, non-biased index of Australian real estate agents can generate high-intent SEO traffic and trigger agent-initiated engagement when agents are notified of their indexed profile.

### Positioning Statement

> "Australian Real Estate Agents Index — a neutral, public index of licensed real estate professionals"

---

## Core Hypotheses

1. **Discovery & Response** — Individual agents will discover or respond to neutral, third-party profile pages about themselves
2. **Organic Traffic** — Agent-level pages will attract professional-intent organic traffic
3. **Outreach Engagement** — Outreach ("you've been indexed") will generate replies, corrections, opt-ins, or engagement
4. **Trust Through Neutrality** — A non-biased framing increases trust compared to vendor-branded directories

---

## Market Context

### Inspirations & Competitors

- Rate My Agents
- Local Agent Finder
- Open Agent

### What ARI Is Not

- ❌ Not a marketplace
- ❌ Not a listings portal
- ❌ Not pay-to-rank
- ❌ Not endorsement or lead resale

---

## Agent Profile Definition

### Minimum Required Fields

| Field | Description |
|-------|-------------|
| Name | Agent's full name |
| Agency | Current agency affiliation |
| Location | Suburb/region served |
| Public Contact Surface | Website or profile link |
| Public Signals | Listings count, specialties, awards (if publicly available) |

---

## Technical Infrastructure


## Development Phases

### Phase 1 — Define the Index (4–6 hrs)

**Objective:** Make ARI legible and credible before building anything.

**Tasks:**
- Define minimum agent profile fields
- Document what ARI explicitly is not
- Write public-safe positioning statement

**Outputs:**
- ✅ Clear scope definition
- ✅ Public-safe positioning language

---

### Phase 2 — Source Agent Data (8–10 hrs)

**Objective:** Prove agents can be programmatically discovered from public sources.

**Tasks:**
- Identify 3–5 public data sources (agency sites, public profiles, portals, LinkedIn, etc.)
- Extract small but representative sample (100–300 agents across multiple states)
- Normalize data fields (name, agency, suburb, state, links)

**Constraints:**
- Use only publicly available data
- No enrichment beyond obvious public facts
- Prefer breadth over completeness

**Outputs:**
- ✅ Clean agent dataset
- ✅ Notes on data gaps and inconsistencies

---

### Phase 3 — Create Neutral Agent Pages (8–10 hrs)

**Objective:** Test whether agent pages can exist as legitimate, indexable entities.

**Tasks:**
- Create simple, neutral profile pages with:
  - Factual tone (no sales copy)
  - Clear "public index" framing
  - Agent identity & location
  - Public links (agency, profile, socials)
  - "Information sourced from public websites" disclaimer
  - "Request update / claim profile" CTA
- Add minimal SEO structure:
  - Clean URLs
  - Optimized page titles
  - Basic schema markup (Person / LocalBusiness)

**Outputs:**
- ✅ Live pages for test cohort
- ✅ Pages feel credible and non-promotional

---

### Phase 4 — Indexation & Discovery Check (6–8 hrs)

**Objective:** See whether search engines treat ARI as a legitimate index.

**Tasks:**
- Submit pages for indexing
- Monitor metrics:
  - Indexation rate
  - Impressions
  - Search queries triggering pages
- Manual inspection:
  - Which pages index vs don't
  - Early ranking patterns

**Outputs:**
- ✅ Early SEO signal snapshot
- ✅ Clear "working / not working" indicators

---

### Phase 5 — Agent Outreach Loop (6–8 hrs)

**Objective:** Test whether agents care enough to engage.

**Tasks:**
- Draft neutral outreach message:
  - "You've been indexed on the Australian Real Estate Agents Index"
  - Emphasize: non-biased, free, public index, optional updates or opt-out
- Send outreach to subset (50–100 agents)
- Track responses:
  - Replies
  - Corrections
  - Profile claims
  - Objections or distrust

**Outputs:**
- ✅ Engagement rate data
- ✅ Qualitative sentiment insights

---

### Phase 6 — Synthesis & Verdict (4–6 hrs)

**Objective:** Decide whether ARI is worth scaling.

**Key Questions:**
1. Do agents *care* that they're indexed?
2. Does this generate professional-intent traffic?
3. Does neutrality increase trust or confusion?
4. Would scaling improve signal—or just noise?

**Outputs:**
- ✅ Go / No-Go decision
- ✅ Clear evidence supporting the call
- ✅ Written summary: what worked, what failed, recommendation

---

## Success Metrics

### Leading Indicators
- Indexation rate of agent pages
- Search impressions within first 2 weeks
- Outreach open/reply rates

### Lagging Indicators
- Organic traffic to agent pages
- Profile claim/update requests
- Agent sentiment (positive/neutral/negative)

---

## Kill Criteria

Terminate the experiment if:

- ❌ Agents ignore or distrust outreach
- ❌ Traffic skews consumer rather than professional
- ❌ Pages fail to index or rank meaningfully
- ❌ Engagement is too weak to justify further effort

---

## Strategic Rationale

This experiment is a strong growth task because it:

1. **Combines multiple disciplines** — SEO, data sourcing, and distribution
2. **Forces real-world validation** — Agents respond or they don't
3. **Produces reusable learnings** — Even if it fails, insights transfer
4. **Avoids over-building** — No directory-trap behaviour or premature scaling

---

## Open Questions

- [ ] Database selection (Supabase vs alternatives)
- [ ] Auto-renewal/update strategy for agent data
- [ ] Legal review of public data usage
- [ ] Design system and visual identity

---

## Appendix

### Team References
- @Siddhant Saini — Agent list source
- @Claire McMahon — Design direction

### Document History
| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Initial | First draft from planning notes |
