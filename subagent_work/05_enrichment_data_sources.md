# Enrichment Data Sources & Sub-Agent Instructions

**Document:** Agent Profile Enrichment Strategy
**Version:** 1.0
**Created:** 2026-02-01
**Purpose:** Define data sources, research priorities, and sub-agent instructions for enriching real estate agent profiles beyond Domain.com.au API data.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Data Source Inventory](#2-data-source-inventory)
3. [Priority Order for Sources](#3-priority-order-for-sources)
4. [What Data Is Worth Enriching](#4-what-data-is-worth-enriching)
5. [Conflicting Data Resolution](#5-conflicting-data-resolution)
6. [Sub-Agent Instructions](#6-sub-agent-instructions)
7. [Fallback Strategies](#7-fallback-strategies)
8. [Rate My Agent Considerations](#8-rate-my-agent-considerations)
9. [Enrichment Quality Assurance](#9-enrichment-quality-assurance)
10. [Appendix: Source-by-Source Deep Dive](#10-appendix-source-by-source-deep-dive)

---

## 1. Executive Summary

### The Enrichment Opportunity

The Domain.com.au API provides solid foundational data (name, contact, agency, bio, social links, listings), but lacks key differentiating information that consumers and SEO value:

- **Years of experience** (not in API)
- **Languages spoken** (critical for multicultural suburbs)
- **Specializations** (luxury, investors, first-home buyers)
- **Awards and recognition** (REIA, RMA, agency awards)
- **Career history** (previous agencies, background)

### Key Recommendations

| Priority | Recommendation |
|----------|----------------|
| **1** | Focus enrichment on HIGH-VALUE fields: years of experience, languages, specializations |
| **2** | Use a tiered source approach: LinkedIn first, then agency website, then web search |
| **3** | Set strict time limits (60 seconds max per agent) to prevent diminishing returns |
| **4** | DO NOT scrape Rate My Agent - use alternative approaches for awards data |
| **5** | Implement confidence scoring for all enriched fields |

---

## 2. Data Source Inventory

### 2.1 Primary Sources (High Reliability, Direct Agent Information)

#### LinkedIn

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `linkedin.com/in/{username}` |
| **Data Available** | Years of experience, career history, education, skills, languages, certifications |
| **Reliability** | High (agent-controlled, professional context) |
| **Accessibility** | Moderate (public profiles accessible, some require login) |
| **Value for ARI** | ★★★★★ Essential - best source for experience timeline |

**What to Extract:**
- Employment history (calculate years in real estate)
- Previous agencies
- Education (relevant qualifications)
- Languages listed in skills
- Professional certifications

**Limitations:**
- Not all agents have LinkedIn profiles
- Some profiles are private or incomplete
- Data may be outdated

#### Agency Websites

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `{agency-domain}/team/{agent-name}` or `{agency-domain}/our-team` |
| **Data Available** | Bio, specializations, awards, team info, languages, marketing approach |
| **Reliability** | High (official source, regularly updated) |
| **Accessibility** | High (public, designed to be found) |
| **Value for ARI** | ★★★★★ Essential - authoritative for current role |

**What to Extract:**
- Extended bio (longer than Domain API version)
- Specialization areas
- Awards and achievements
- Languages spoken
- Team membership
- Marketing services offered

**Limitations:**
- Inconsistent page structures across agencies
- Some agencies have minimal agent pages
- May not include experience timeline

#### Domain.com.au Profile Pages (Web, Not API)

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `domain.com.au/real-estate-agent/{agent-slug}` |
| **Data Available** | Extended bio, reviews, performance stats, recent sales |
| **Reliability** | High (official portal) |
| **Accessibility** | High (public) |
| **Value for ARI** | ★★★★☆ Good - supplements API data |

**What to Extract:**
- Review excerpts (for sentiment, not full text)
- Performance statistics not in API
- Recent sales with suburbs (for service area)

**Limitations:**
- Similar data to API
- Reviews may be limited

#### realestate.com.au Agent Profiles

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `realestate.com.au/agent/{agent-name}` |
| **Data Available** | Bio, sales history, reviews, performance metrics |
| **Reliability** | High (major portal) |
| **Accessibility** | High (public) |
| **Value for ARI** | ★★★★☆ Good - alternative perspective |

**What to Extract:**
- Performance metrics
- Service areas
- Review sentiment
- Sales statistics

**Limitations:**
- Overlaps significantly with Domain data
- Different agent ID system

---

### 2.2 Secondary Sources (Moderate Reliability, Indirect Information)

#### Rate My Agent

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `ratemyagent.com.au/real-estate-agent/{agent-slug}` |
| **Data Available** | Reviews, star ratings, awards, sales stats, response metrics |
| **Reliability** | High (verified reviews) |
| **Accessibility** | **RESTRICTED - See Section 8** |
| **Value for ARI** | ★★★★★ High value BUT ethical/legal concerns |

**Note:** We recommend NOT scraping RMA directly. See Section 8 for alternatives.

#### Facebook Business Pages

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `facebook.com/{agent-page}` |
| **Data Available** | About info, team photos, community involvement, language indicators |
| **Reliability** | Moderate (may be personal mixed with professional) |
| **Accessibility** | Moderate (some pages require login) |
| **Value for ARI** | ★★★☆☆ Supplementary |

**What to Extract:**
- Languages mentioned in about section
- Community involvement
- Team information
- Marketing style indicators

**Limitations:**
- Personal/professional boundary unclear
- Inconsistent business page usage

#### Instagram

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `instagram.com/{username}` |
| **Data Available** | Marketing style, property types, personal branding |
| **Reliability** | Moderate (curated content) |
| **Accessibility** | Low (increasingly requires login) |
| **Value for ARI** | ★★☆☆☆ Low priority |

**What to Extract:**
- Property type focus (luxury, apartments, houses)
- Marketing approach (professional photography, video, drone)
- Service area indicators

**Limitations:**
- Limited text information
- Requires visual analysis
- Often personal accounts

#### YouTube

| Attribute | Details |
|-----------|---------|
| **URL Pattern** | `youtube.com/@{channel}` or search results |
| **Data Available** | Video introductions, property walkthroughs, marketing approach |
| **Reliability** | Moderate |
| **Accessibility** | High |
| **Value for ARI** | ★★☆☆☆ Low priority |

**What to Extract:**
- Presence of video content
- Video quality/professionalism
- Language indicators from videos

**Limitations:**
- Few agents have dedicated channels
- Time-intensive to analyze

---

### 2.3 Tertiary Sources (Lower Reliability, Requires Verification)

#### Google Search Results

| Attribute | Details |
|-----------|---------|
| **Search Patterns** | `"{agent name}" real estate {suburb}`, `"{agent name}" {agency}` |
| **Data Available** | News articles, awards, community mentions, interviews |
| **Reliability** | Variable (depends on source) |
| **Accessibility** | High |
| **Value for ARI** | ★★★☆☆ Good for awards/recognition |

**What to Extract:**
- News mentions
- Award announcements
- Interview quotes
- Industry recognition

**Limitations:**
- Name collision (common names)
- Outdated information
- Requires cross-referencing

#### REIA State Institute Websites

| Attribute | Details |
|-----------|---------|
| **URLs** | `reinsw.com.au`, `reiv.com.au`, `reiq.com.au`, etc. |
| **Data Available** | Award winners, industry recognition, accreditations |
| **Reliability** | High (official industry bodies) |
| **Accessibility** | High |
| **Value for ARI** | ★★★★☆ Authoritative for awards |

**What to Extract:**
- REIA Awards for Excellence winners
- State award recipients
- Accreditation status

**Limitations:**
- Only covers award winners
- May not be searchable by agent name

#### Local News & Publications

| Attribute | Details |
|-----------|---------|
| **Sources** | Local newspapers, community newsletters, real estate publications |
| **Data Available** | Agent profiles, community involvement, market commentary |
| **Reliability** | Moderate to High |
| **Accessibility** | Variable |
| **Value for ARI** | ★★☆☆☆ Nice-to-have |

**What to Extract:**
- Community involvement
- Expert commentary
- Local recognition

---

### 2.4 Industry-Specific Sources

#### Elite Agent Magazine

| Attribute | Details |
|-----------|---------|
| **URL** | `eliteagent.com` |
| **Data Available** | Top agent lists, industry awards, agent profiles |
| **Reliability** | High |
| **Accessibility** | High |
| **Value for ARI** | ★★★★☆ Good for recognition data |

#### Real Estate Business (REB)

| Attribute | Details |
|-----------|---------|
| **URL** | `realestatebusiness.com.au` |
| **Data Available** | Rankings, awards (REB Awards), industry news |
| **Reliability** | High |
| **Accessibility** | High |
| **Value for ARI** | ★★★★☆ Good for recognition data |

#### The Real Estate Conversation

| Attribute | Details |
|-----------|---------|
| **URL** | `therealestateconversation.com.au` |
| **Data Available** | Agent interviews, industry profiles, award coverage |
| **Reliability** | High |
| **Accessibility** | High |
| **Value for ARI** | ★★★☆☆ Supplementary |

---

## 3. Priority Order for Sources

### 3.1 Tiered Research Approach

The sub-agent should follow this tiered approach, stopping when sufficient data is found:

```
TIER 1: High-Value, High-Reliability (Always Check)
├── LinkedIn (if URL provided or easily found)
├── Agency Website (agent team page)
└── Time budget: 30 seconds

TIER 2: Secondary Validation (Check if Tier 1 gaps)
├── realestate.com.au agent profile
├── Domain.com.au web profile (beyond API)
├── Google search: "{name}" "{agency}" awards
└── Time budget: 20 seconds

TIER 3: Supplementary (Only if time permits)
├── Facebook business page
├── Industry publications (Elite Agent, REB)
├── REIA state website
└── Time budget: 10 seconds

TOTAL MAX TIME: 60 seconds per agent
```

### 3.2 Decision Tree for Source Selection

```
START
  │
  ├─ Does agent have LinkedIn URL in API data?
  │    ├─ YES → Fetch LinkedIn first
  │    └─ NO → Search "agent name agency linkedin"
  │
  ├─ Did we find years of experience?
  │    ├─ YES → Continue to agency website
  │    └─ NO → Mark as "experience_unknown", continue
  │
  ├─ Check agency website team page
  │    ├─ Found extended bio? → Extract specializations, languages
  │    └─ Not found? → Search agency name + agent name
  │
  ├─ Do we have 3+ enrichment fields?
  │    ├─ YES → Stop enrichment (sufficient data)
  │    └─ NO → Continue to Tier 2
  │
  ├─ Quick Google search for awards
  │    ├─ Found awards? → Extract and verify
  │    └─ Not found? → Mark as "no_awards_found"
  │
  └─ Time limit reached?
       ├─ YES → Return current data
       └─ NO → Continue to Tier 3 if gaps remain
```

### 3.3 Source Reliability Rankings

| Rank | Source | Trust Level | Use Case |
|------|--------|-------------|----------|
| 1 | LinkedIn | 95% | Years of experience, career history |
| 2 | Agency Website | 90% | Specializations, languages, team info |
| 3 | REIA/State Institutes | 90% | Awards verification |
| 4 | Domain.com.au (web) | 85% | Performance data validation |
| 5 | realestate.com.au | 85% | Alternative performance data |
| 6 | Elite Agent/REB | 80% | Award recognition |
| 7 | Google Search | 70% | Discovery, requires verification |
| 8 | Facebook | 60% | Supplementary only |
| 9 | Instagram | 50% | Marketing style only |

---

## 4. What Data Is Worth Enriching

### 4.1 Value Analysis of Enrichment Fields

| Field | SEO Value | User Value | Difficulty | Overall Priority |
|-------|-----------|------------|------------|------------------|
| Years of experience | ★★★★★ | ★★★★★ | Medium | **CRITICAL** |
| Languages spoken | ★★★★☆ | ★★★★★ | Medium | **HIGH** |
| Specializations | ★★★★☆ | ★★★★☆ | Easy | **HIGH** |
| Awards/Recognition | ★★★★☆ | ★★★★☆ | Medium | **HIGH** |
| Extended bio | ★★★☆☆ | ★★★☆☆ | Easy | **MEDIUM** |
| Team information | ★★☆☆☆ | ★★★☆☆ | Easy | **MEDIUM** |
| Career history | ★★☆☆☆ | ★★★☆☆ | Medium | **MEDIUM** |
| Marketing approach | ★★☆☆☆ | ★★☆☆☆ | Hard | **LOW** |
| Education | ★☆☆☆☆ | ★★☆☆☆ | Medium | **LOW** |

### 4.2 Minimum Viable Enrichment (Top 3 Priority Fields)

If we could only enrich 3 fields per agent, prioritize these:

1. **Years of Experience**
   - Why: Directly answers buyer's #1 question about agent credibility
   - SEO: Powers "experienced real estate agent in {suburb}" queries
   - Source: LinkedIn employment history (most reliable)

2. **Languages Spoken**
   - Why: Critical for multicultural suburbs (22% of Australian households speak non-English at home)
   - SEO: Powers "{language} speaking agent in {suburb}" queries
   - Source: LinkedIn skills, agency website bio

3. **Specializations**
   - Why: Helps match agents to buyer needs (luxury, first-home, investors)
   - SEO: Powers "luxury real estate agent in {suburb}" queries
   - Source: Agency website, bio text analysis

### 4.3 Nice-to-Have Enrichment (If Time Permits)

4. **Awards and Recognition**
   - REIA Awards for Excellence
   - Rate My Agent Top Agent awards
   - Agency-specific recognition

5. **Extended Bio Details**
   - Personal background
   - Community involvement
   - Unique selling points

6. **Team Information**
   - Works solo vs team
   - Team size
   - Support staff

### 4.4 Not Worth Enriching (Diminishing Returns)

| Field | Why Skip |
|-------|----------|
| Full career history | Too time-intensive, limited SEO value |
| Detailed marketing approach | Subjective, hard to verify |
| Personal hobbies/interests | Low relevance to property decisions |
| Detailed education | Unless relevant qualification (valuations, law) |
| Social media follower counts | Vanity metric, changes frequently |

---

## 5. Conflicting Data Resolution

### 5.1 Trust Hierarchy for Conflicting Information

When data conflicts between sources, use this hierarchy:

```
HIGHEST TRUST
     │
     ├── 1. LinkedIn (for employment dates/experience)
     │      Reason: Professional network, agent-controlled, verifiable
     │
     ├── 2. Agency Website (for current role details)
     │      Reason: Official employer source, regularly updated
     │
     ├── 3. REIA/Industry Bodies (for awards)
     │      Reason: Official records, verifiable
     │
     ├── 4. Domain.com.au API (for contact/basic info)
     │      Reason: Primary data source, structured
     │
     ├── 5. realestate.com.au (for supplementary data)
     │      Reason: Major portal, generally accurate
     │
     ├── 6. News Articles (for recognition/awards)
     │      Reason: Third-party verification, dated
     │
     └── 7. Social Media (lowest trust for factual data)
            Reason: May be outdated, unverified claims

LOWEST TRUST
```

### 5.2 Specific Conflict Resolution Rules

#### Years of Experience Conflicts

| Scenario | Resolution |
|----------|------------|
| LinkedIn says 10 years, agency site says 8 | **Use LinkedIn** - employment history is explicit |
| LinkedIn incomplete, agency says "over 15 years" | **Use agency estimate** with confidence "medium" |
| Multiple LinkedIn roles, unclear if all RE | **Count only real estate roles** explicitly |
| No clear data anywhere | **Mark as null**, don't estimate |

**Calculation Method:**
```
years_experience = (current_year - earliest_RE_employment_year)

Where "RE employment" includes:
- Real estate agent roles
- Real estate sales roles
- Property management roles
- Real estate business owner roles

Does NOT include:
- Non-RE jobs (even if in property)
- Education/training periods
```

#### Languages Spoken Conflicts

| Scenario | Resolution |
|----------|------------|
| LinkedIn lists 3 languages, agency lists 2 | **Use LinkedIn** - more detailed |
| Agent name suggests ethnicity but no language listed | **Don't assume** - only use explicit claims |
| Different proficiency levels listed | **Include all** with proficiency if available |

#### Photo Conflicts

| Scenario | Resolution |
|----------|------------|
| Different photos on LinkedIn vs Domain | **Use Domain API photo** - our primary source |
| Agent has updated photo on agency site | **Note URL** but don't replace Domain photo |
| No photo in API, found elsewhere | **Don't include** - stick to API data |

### 5.3 When to Flag for Human Review

Flag for manual review when:

- [ ] Agent has conflicting agency affiliations (may have moved)
- [ ] Experience calculation results in >40 years (verify accuracy)
- [ ] Agent appears to be inactive (no recent listings in API)
- [ ] Name matches multiple people in same suburb
- [ ] Award claims cannot be verified
- [ ] Languages include >5 languages (verify authenticity)

**Flag Format:**
```json
{
  "requires_review": true,
  "review_reason": "experience_exceeds_threshold",
  "review_details": "LinkedIn shows employment from 1978 (48 years). Verify if accurate.",
  "conflicting_sources": ["linkedin", "agency_website"]
}
```

---

## 6. Sub-Agent Instructions

### 6.1 Master Prompt Template

```markdown
# Real Estate Agent Enrichment Sub-Agent

You are a research specialist tasked with enriching real estate agent profiles for the Australian Real Estate Agents Index. Your job is to find additional information about agents beyond what's available in the Domain.com.au API.

## Agent to Research

**Name:** {{agent_name}}
**Agency:** {{agency_name}}
**Location:** {{suburb}}, {{state}} {{postcode}}
**Known Links:**
- LinkedIn: {{linkedin_url or "not provided"}}
- Website: {{website_url or "not provided"}}
- Facebook: {{facebook_url or "not provided"}}
- Agency Website: {{agency_website}}

## Research Instructions

### Priority Fields to Find (in order)

1. **Years of Experience** - How long have they been in real estate?
   - Check LinkedIn employment history first
   - Calculate from earliest RE job to current year
   - Only count real estate-specific roles

2. **Languages Spoken** - What languages do they speak?
   - Check LinkedIn skills/languages section
   - Check agency website bio
   - Only include explicitly stated languages

3. **Specializations** - What property types or buyer types do they focus on?
   - Examples: luxury homes, apartments, first-home buyers, investors, downsizers
   - Check agency bio, LinkedIn headline, website descriptions

4. **Awards** - Have they won any industry recognition?
   - REIA Awards for Excellence
   - Rate My Agent awards (if publicly visible)
   - Agency-specific awards
   - Only include verifiable awards

### Research Protocol

1. **Time Limit:** Maximum 60 seconds total research time
2. **Source Order:**
   - LinkedIn (if available)
   - Agency website team page
   - Google search "{name}" "{agency}" real estate
   - Only proceed to additional sources if gaps remain

3. **Stop Conditions:**
   - Found 3+ enrichment fields → Return results
   - Time limit reached → Return what you have
   - No data found after Tier 2 sources → Mark as minimal_data

### What NOT to Do

- Do NOT make up or estimate information
- Do NOT include unverifiable claims
- Do NOT scrape Rate My Agent directly
- Do NOT include personal information beyond professional context
- Do NOT spend more than 60 seconds total

## Output Format

Return a JSON object with this exact structure:

```json
{
  "agent_name": "{{agent_name}}",
  "enrichment_timestamp": "ISO8601 timestamp",
  "research_duration_seconds": number,
  "sources_checked": ["linkedin", "agency_website", ...],

  "enriched_data": {
    "years_experience": number or null,
    "years_experience_source": "linkedin" or "agency_website" or null,
    "years_experience_confidence": "high" | "medium" | "low",

    "languages": ["English", "Mandarin", ...] or [],
    "languages_source": "linkedin" or "agency_website" or null,

    "specializations": ["luxury homes", "apartments", ...] or [],
    "specializations_source": "agency_website" or "bio_analysis" or null,

    "awards": [
      {
        "name": "REIA Residential Salesperson of the Year",
        "year": 2024,
        "level": "state" or "national"
      }
    ] or [],
    "awards_source": "google_search" or "reia_website" or null,

    "extended_bio": "Additional bio information not in API..." or null,
    "team_info": {
      "works_in_team": true or false or null,
      "team_name": "string" or null
    }
  },

  "data_quality": {
    "overall_confidence": "high" | "medium" | "low" | "minimal",
    "fields_found": number,
    "requires_review": boolean,
    "review_reason": "string" or null
  }
}
```

### Confidence Level Definitions

| Level | Definition |
|-------|------------|
| **high** | Data from primary source (LinkedIn, agency website), clearly stated |
| **medium** | Data from secondary source, or required interpretation |
| **low** | Data from tertiary source, may be outdated or ambiguous |
| **minimal** | Very little enrichment data found |

## Example Research Flow

1. Check if LinkedIn URL provided → Visit profile
2. Find employment history → Calculate years in real estate
3. Check languages/skills section → Note any languages
4. Visit agency website → Find agent team page
5. Read bio → Extract specializations, awards mentions
6. Quick Google search → Verify any awards claimed
7. Compile results → Return JSON

Remember: Quality over quantity. Return `null` for fields you cannot verify rather than guessing.
```

### 6.2 Quick Enrichment Prompt (Lite Version)

For high-volume processing with minimal research:

```markdown
# Quick Agent Enrichment

**Agent:** {{agent_name}} at {{agency_name}} in {{suburb}}, {{state}}

Research this agent for 30 seconds maximum. Find:
1. Years of experience (from LinkedIn or agency site)
2. Languages spoken (explicitly stated only)
3. Specializations (from bio keywords)

Return JSON:
{
  "years_experience": number or null,
  "languages": ["English", ...],
  "specializations": ["luxury", "apartments", ...],
  "confidence": "high" | "medium" | "low"
}

If no data found quickly, return:
{
  "years_experience": null,
  "languages": [],
  "specializations": [],
  "confidence": "minimal"
}
```

### 6.3 Deep Enrichment Prompt (Premium Agents)

For high-priority agents (top performers, high-value suburbs):

```markdown
# Deep Agent Enrichment

**Agent:** {{agent_name}} at {{agency_name}}
**Location:** {{suburb}}, {{state}} {{postcode}}
**Priority Level:** HIGH

This is a high-priority agent profile. Perform thorough research (up to 120 seconds).

## Extended Research Scope

In addition to standard fields, also research:

1. **Career History**
   - Previous agencies worked for
   - Notable career progression
   - Any business ownership

2. **Industry Recognition**
   - All awards and accolades
   - Media mentions
   - Industry publications

3. **Community Presence**
   - Local sponsorships
   - Community involvement
   - Charity work

4. **Marketing Approach**
   - Video usage
   - Photography quality indicators
   - Digital marketing presence

## Extended Output Format

Include additional fields:
{
  "career_history": [
    {
      "agency": "Previous Agency Name",
      "role": "Sales Agent",
      "years": "2018-2022"
    }
  ],
  "media_mentions": [
    {
      "source": "Elite Agent",
      "title": "Top 50 Agents 2024",
      "url": "https://..."
    }
  ],
  "community_involvement": ["Sponsors local football club", ...],
  "marketing_indicators": {
    "has_video_content": true,
    "has_professional_photography": true,
    "active_on_social_media": true
  }
}
```

---

## 7. Fallback Strategies

### 7.1 Zero Web Presence Scenario

When an agent has minimal web presence beyond Domain API:

```
IF (no LinkedIn found) AND (agency website has no detailed profile) AND (no Google results):

    THEN apply "Minimal Enrichment" strategy:

    1. Extract specializations from API bio text using keyword matching
       - Keywords: "luxury", "first home", "investor", "downsizer",
         "apartment", "house", "commercial", "rural"

    2. Infer experience level from job position
       - "Principal" / "Director" → likely 10+ years
       - "Senior Agent" → likely 5-10 years
       - "Sales Agent" → likely 1-5 years
       - Mark confidence as "low" for inferred data

    3. Check if agency has any language-specific marketing
       - Agency website in multiple languages?
       - Agency name suggesting cultural focus?

    4. Mark profile as:
       {
         "enrichment_status": "minimal_data",
         "enrichment_note": "Limited web presence. Data primarily from API."
       }
```

### 7.2 Minimum Data for Useful Page

A page can still be useful with only API data if it includes:

| Required | Field | Source |
|----------|-------|--------|
| ✅ | Full name | API |
| ✅ | Agency name | API |
| ✅ | Location | API |
| ✅ | Contact (phone/email) | API |
| ✅ | Profile photo | API |
| Ideal | Profile bio | API |
| Ideal | Current listings count | API |
| Ideal | Recent sales | API/Listings endpoint |

**Decision Rule:**
```
IF agent has (name + agency + location + contact):
    CREATE page (meets minimum threshold)
ELSE:
    SKIP agent (insufficient data)
```

### 7.3 When to Skip Enrichment Entirely

Skip enrichment for agents who:

- [ ] Have no profile bio in API (likely placeholder profile)
- [ ] Have no active or recent listings
- [ ] Have invalid/placeholder email (noemail@agency.com)
- [ ] Share exact same bio as other agents (template bio)

**Skip Indicator:**
```json
{
  "skip_enrichment": true,
  "skip_reason": "no_profile_bio",
  "create_page": false
}
```

### 7.4 Marking Limited Data Pages

For pages with minimal enrichment, include UI indicators:

```json
{
  "page_data_status": "basic",
  "page_data_note": "This profile contains basic information from public sources. Additional details may be available by contacting the agent directly.",
  "show_claim_prompt": true,
  "claim_prompt_text": "Are you {agent_name}? Claim this profile to add more information."
}
```

---

## 8. Rate My Agent Considerations

### 8.1 Ethical and Legal Assessment

**Question:** Is it ethical/legal to scrape Rate My Agent for enrichment?

**Assessment:**

| Factor | Analysis |
|--------|----------|
| **Terms of Service** | RMA likely prohibits automated data collection in their ToS |
| **Copyright** | Reviews and ratings may be copyrighted content |
| **Data Ownership** | Reviews belong to reviewers and RMA, not agents |
| **Competition** | We would be using competitor's proprietary data |
| **Australian Law** | Web scraping legality depends on ToS compliance and data use |

**Recommendation: DO NOT scrape Rate My Agent directly**

Reasons:
1. Legal risk outweighs benefit
2. Ethical concerns about using competitor's user-generated content
3. Potential for cease & desist or legal action
4. Reputational risk for ARI as a "neutral" index

### 8.2 What Data Would Be Valuable (If Available)

If we HAD access to RMA data legitimately, the most valuable fields would be:

| Field | Value | Use Case |
|-------|-------|----------|
| Star Rating | ★★★★★ | Trust signal for users |
| Review Count | ★★★★☆ | Volume indicator |
| Agent of the Year awards | ★★★★☆ | Recognition data |
| Response time | ★★★☆☆ | Service quality indicator |

### 8.3 Legitimate Alternatives to Scraping

#### Alternative 1: Manual Award Verification

RMA publishes annual award winners publicly:
- Visit: `resources.ratemyagent.com/au-awards-{year}-winners`
- These pages are designed to be found and shared
- Extract award winners only (not reviews or ratings)

**Implementation:**
```python
# Acceptable: Check if agent appears on public awards page
awards_url = f"https://resources.ratemyagent.com/au-awards-{year}-winners"
# Search page for agent name
# If found, record award with source attribution
```

#### Alternative 2: Google Search for RMA Awards

Search Google for: `site:ratemyagent.com.au "{agent name}" award`

If results show agent won an award, this is:
- Publicly indexed information
- The agent likely promotes this award
- Acceptable to reference

#### Alternative 3: Agent Self-Reporting

Allow agents to claim profiles and add their own:
- Star ratings (linked to RMA profile)
- Awards won
- Review highlights

This creates legitimate data with agent consent.

#### Alternative 4: REIA Awards (Legitimate Alternative)

REIA and state institutes publish award winners officially:
- REIA National Awards for Excellence
- REINSW Awards (NSW)
- REIV Awards (Victoria)
- REIQ Awards (Queensland)

These are:
- Industry body official records
- Designed to be publicized
- More prestigious than RMA awards

**Implementation:**
```
Search: site:reia.com.au OR site:reinsw.com.au "{agent name}"
Search: "{agent name}" "REIA" award
```

### 8.4 RMA Data Decision Matrix

| Data Type | Can We Use? | Source |
|-----------|-------------|--------|
| Award winner lists (public pages) | ✅ Yes | Public awards pages |
| Individual review text | ❌ No | User-generated, copyrighted |
| Star ratings | ❌ No | Proprietary aggregation |
| Agent statistics | ❌ No | Requires scraping |
| Profile photos | ❌ No | Source from Domain API instead |
| Response time metrics | ❌ No | Proprietary data |

---

## 9. Enrichment Quality Assurance

### 9.1 Verification Methods

#### Schema Validation

All enriched data must pass schema validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "years_experience": {
      "type": ["integer", "null"],
      "minimum": 0,
      "maximum": 60
    },
    "languages": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2
      }
    },
    "specializations": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "luxury homes",
          "apartments",
          "houses",
          "townhouses",
          "rural",
          "commercial",
          "first home buyers",
          "investors",
          "downsizers",
          "developers",
          "prestige",
          "waterfront",
          "off the plan"
        ]
      }
    },
    "awards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "year"],
        "properties": {
          "name": {"type": "string"},
          "year": {"type": "integer", "minimum": 2000, "maximum": 2030},
          "level": {"type": "string", "enum": ["agency", "state", "national"]}
        }
      }
    }
  }
}
```

#### Range Checks

| Field | Valid Range | Flag If |
|-------|-------------|---------|
| years_experience | 0-60 | >40 years (verify) |
| languages | 1-10 items | >5 (verify) |
| specializations | 1-5 items | >5 (review) |
| awards | 0-20 items | >10 (verify) |

### 9.2 Red Flags Indicating Bad Data

#### Wrong Person Indicators

- [ ] Name matches but location is different state
- [ ] Agency doesn't match any known agencies
- [ ] Photo (if available) doesn't match API photo
- [ ] LinkedIn profile shows different profession
- [ ] Multiple distinct people with same name in results

**Action:** Flag for manual review, don't use conflicting data

#### Outdated Information Indicators

- [ ] LinkedIn last activity >2 years ago
- [ ] Agency website shows different agency than API
- [ ] Awards older than 5 years with no recent ones
- [ ] Bio mentions "20 years experience" but profile created recently

**Action:** Use with caution, mark confidence as "low"

#### Fabricated/Exaggerated Claims

- [ ] Claims to speak >5 languages fluently
- [ ] Claims >50 years experience
- [ ] Claims awards that don't exist in official records
- [ ] Bio makes unverifiable superlative claims

**Action:** Only include verifiable claims, skip others

### 9.3 Confidence Scoring Algorithm

```python
def calculate_confidence(enriched_data, sources_checked):
    score = 0
    factors = 0

    # Source quality scoring
    source_weights = {
        "linkedin": 1.0,
        "agency_website": 0.9,
        "reia_website": 0.9,
        "domain_web": 0.8,
        "realestate_web": 0.8,
        "google_search": 0.6,
        "facebook": 0.5,
        "instagram": 0.4
    }

    # Field presence scoring
    if enriched_data.get("years_experience"):
        score += source_weights.get(enriched_data.get("years_experience_source"), 0.5)
        factors += 1

    if enriched_data.get("languages"):
        score += source_weights.get(enriched_data.get("languages_source"), 0.5)
        factors += 1

    if enriched_data.get("specializations"):
        score += 0.7  # Often inferred, lower weight
        factors += 1

    if enriched_data.get("awards"):
        score += source_weights.get(enriched_data.get("awards_source"), 0.5)
        factors += 1

    # Calculate average
    if factors == 0:
        return "minimal"

    avg_score = score / factors

    if avg_score >= 0.8:
        return "high"
    elif avg_score >= 0.6:
        return "medium"
    elif avg_score >= 0.4:
        return "low"
    else:
        return "minimal"
```

### 9.4 Periodic Re-Enrichment Strategy

#### Re-Enrichment Triggers

| Trigger | Action |
|---------|--------|
| Agent claims profile | Re-enrich with agent input |
| 6 months since enrichment | Schedule re-enrichment |
| Agency change detected | Priority re-enrichment |
| New awards season (annual) | Check award winners |
| User reports outdated info | Queue for re-enrichment |

#### Re-Enrichment Priorities

```
HIGH PRIORITY (re-enrich monthly):
- Top 100 agents by page views
- Agents who claimed profiles
- Recently reported as outdated

MEDIUM PRIORITY (re-enrich quarterly):
- Agents with high listing activity
- Agents in priority suburbs
- Agents with incomplete data

LOW PRIORITY (re-enrich annually):
- Low traffic profiles
- Agents with minimal listings
- Profiles with full enrichment
```

#### Data Freshness Indicators

Show on agent pages:

```json
{
  "enrichment_date": "2026-01-15",
  "freshness_indicator": "recent",  // recent (<3mo), aging (3-6mo), stale (>6mo)
  "next_review_date": "2026-04-15"
}
```

---

## 10. Appendix: Source-by-Source Deep Dive

### LinkedIn Research Protocol

**URL Discovery:**
1. Check if `linkedInUrl` in API data
2. If not, search: `site:linkedin.com/in "{agent name}" "{agency name}"`
3. Verify profile matches (check photo, location, agency)

**Data Extraction:**
```
Experience Section:
- Find all positions with "real estate" keywords
- Note start dates for each position
- Calculate total years: current_year - earliest_start_year

Languages Section:
- Extract all listed languages
- Note proficiency levels if shown

Skills Section:
- Look for language skills
- Look for property type expertise

About Section:
- May mention years experience
- May list specializations
- May mention awards
```

### Agency Website Research Protocol

**URL Discovery:**
1. Use `agencyWebsite` from API if available
2. Search: `"{agency name}" {suburb} real estate` for official site
3. Navigate to "Team" or "Our People" section

**Data Extraction:**
```
Agent Profile Page:
- Extended biography (longer than API)
- Specialization keywords
- Languages spoken
- Awards and recognition
- Team membership

Agency About Page:
- Agency awards (may apply to agents)
- Service area details
- Marketing approach indicators
```

### Google Search Research Protocol

**Search Queries:**
```
# Award discovery
"{agent name}" "{agency name}" award winner
"{agent name}" REIA award
"{agent name}" "agent of the year"

# Media mentions
"{agent name}" real estate {suburb} interview
"{agent name}" "{agency name}" news

# Verification
"{agent name}" real estate {state} -site:ratemyagent.com
```

**Result Evaluation:**
- Prioritize results from known industry publications
- Verify agent identity (same person, same location)
- Cross-reference with other sources before using

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial comprehensive guide |

---

## References

- [REIA Awards for Excellence](https://reia.com.au/excellence/)
- [Sprintlaw - Web Scraping Laws in Australia](https://sprintlaw.com.au/articles/web-scraping-laws-in-australia-legal-risks-and-compliance/)
- [Elite Agent - Top 50 Industry Influencers](https://eliteagent.com/top-50-australian-residential-real-estate-industry-influencers-2024/)
- [Data Quality Assurance for Web Scraping - Zyte](https://www.zyte.com/blog/data-quality-assurance-for-enterprise-web-scraping/)
- [Real Estate Data Scraping Best Practices - DataHen](https://www.datahen.com/blog/scraping-real-estate-data-best-practices-and-legal-tips/)
