# 08 - Operations

**Domain:** Deployment & Operations
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Suburb Priority List](#suburb-priority-list)
4. [Sequencing & Selection Logic](#sequencing--selection-logic)
5. [Vercel Deploy Hook](#vercel-deploy-hook)
6. [Database Management](#database-management)
7. [Daily Operations](#daily-operations)
8. [Safe Rollout Strategy](#safe-rollout-strategy)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)
11. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

This specification covers the operational aspects of running ARI:

- Environment configuration
- Suburb prioritization and scheduling
- Deployment workflows
- Database synchronization
- Monitoring and maintenance

### Operational Principles

| Principle | Implementation |
|-----------|----------------|
| **Manual control** | All operations triggered manually |
| **Conservative growth** | Slow rollout, monitor health |
| **Data integrity** | Backup before major operations |
| **API budget awareness** | Track and preserve API calls |

---

## Environment Variables

### Control Center (.env)

```bash
# ═══════════════════════════════════════════════════════════════════
# CLAUDE AGENT SDK
# ═══════════════════════════════════════════════════════════════════
ANTHROPIC_API_KEY=sk-ant-xxx

# ═══════════════════════════════════════════════════════════════════
# COST MANAGEMENT
# ═══════════════════════════════════════════════════════════════════
CLAUDE_DAILY_BUDGET_USD=10.00
CLAUDE_DISCOVERY_MAX_AGENCIES_PER_RUN=10
CLAUDE_ENRICHMENT_MAX_AGENTS_PER_BATCH=50

# ═══════════════════════════════════════════════════════════════════
# VERCEL DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
VERCEL_TOKEN=xxx                        # Optional: for deployment monitoring

# ═══════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════
DATABASE_PATH=./data/ari.db

# ═══════════════════════════════════════════════════════════════════
# SERVER
# ═══════════════════════════════════════════════════════════════════
PORT=3000
NODE_ENV=development
```

### SEO Site (.env)

```bash
# ═══════════════════════════════════════════════════════════════════
# DATABASE (read-only)
# ═══════════════════════════════════════════════════════════════════
DATABASE_PATH=./data/ari.db

# ═══════════════════════════════════════════════════════════════════
# SITE
# ═══════════════════════════════════════════════════════════════════
NEXT_PUBLIC_SITE_URL=https://ari.com.au
```

### Environment Variable Security

| Variable | Sensitivity | Storage |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | High | Never commit, local only |
| `VERCEL_DEPLOY_HOOK_URL` | Medium | Contains secret in URL |
| `VERCEL_TOKEN` | Medium | Optional, for monitoring |
| `DATABASE_PATH` | Low | Can be committed |
| `CLAUDE_DAILY_BUDGET_USD` | Low | Can be committed |

### Getting API Credentials

**Anthropic API:**
1. Go to https://console.anthropic.com/
2. Create API key
3. Copy key (shown only once)

**Vercel Deploy Hook:**
1. Go to Vercel project → Settings → Git
2. Scroll to "Deploy Hooks"
3. Create hook named "ARI Data Update"
4. Copy the generated URL

---

## Suburb Priority List

### Tier 1: Top 20 (Process First)

| Rank | Suburb | Postcode | Region |
|------|--------|----------|--------|
| 1 | Mosman | 2088 | Lower North Shore |
| 2 | Bondi Beach | 2026 | Eastern Suburbs |
| 3 | Double Bay | 2028 | Eastern Suburbs |
| 4 | Paddington | 2021 | Eastern Suburbs |
| 5 | Manly | 2095 | Northern Beaches |
| 6 | Surry Hills | 2010 | Inner City |
| 7 | Castle Hill | 2154 | Hills District |
| 8 | Neutral Bay | 2089 | Lower North Shore |
| 9 | Chatswood | 2067 | Lower North Shore |
| 10 | Balmain | 2041 | Inner West |
| 11 | Vaucluse | 2030 | Eastern Suburbs |
| 12 | Cronulla | 2230 | Sutherland Shire |
| 13 | Bellevue Hill | 2023 | Eastern Suburbs |
| 14 | Parramatta | 2150 | Western Sydney |
| 15 | Newtown | 2042 | Inner West |
| 16 | Randwick | 2031 | Eastern Suburbs |
| 17 | Lane Cove | 2066 | Lower North Shore |
| 18 | Dee Why | 2099 | Northern Beaches |
| 19 | Woollahra | 2025 | Eastern Suburbs |
| 20 | Marrickville | 2204 | Inner West |

### Tier 2: Suburbs 21-35

| Rank | Suburb | Postcode | Region |
|------|--------|----------|--------|
| 21 | Pymble | 2073 | Upper North Shore |
| 22 | Strathfield | 2135 | Inner West |
| 23 | Kellyville | 2155 | Hills District |
| 24 | Coogee | 2034 | Eastern Suburbs |
| 25 | Kirribilli | 2061 | Lower North Shore |
| 26 | Cremorne | 2090 | Lower North Shore |
| 27 | Drummoyne | 2047 | Inner West |
| 28 | Maroubra | 2035 | Eastern Suburbs |
| 29 | Epping | 2121 | Upper North Shore |
| 30 | Cammeray | 2062 | Lower North Shore |
| 31 | Five Dock | 2046 | Inner West |
| 32 | Crows Nest | 2065 | Lower North Shore |
| 33 | Hunters Hill | 2110 | Inner West |
| 34 | Willoughby | 2068 | Lower North Shore |
| 35 | Gladesville | 2111 | Inner West |

### Tier 3: Suburbs 36-50

| Rank | Suburb | Postcode | Region |
|------|--------|----------|--------|
| 36 | Wahroonga | 2076 | Upper North Shore |
| 37 | Collaroy | 2097 | Northern Beaches |
| 38 | Rozelle | 2039 | Inner West |
| 39 | Brookvale | 2100 | Northern Beaches |
| 40 | Leichhardt | 2040 | Inner West |
| 41 | Artarmon | 2064 | Lower North Shore |
| 42 | Ryde | 2112 | North |
| 43 | Miranda | 2228 | Sutherland Shire |
| 44 | Bondi Junction | 2022 | Eastern Suburbs |
| 45 | Hornsby | 2077 | Upper North Shore |
| 46 | Caringbah | 2229 | Sutherland Shire |
| 47 | Bankstown | 2200 | South West |
| 48 | Penrith | 2750 | Western Sydney |
| 49 | Liverpool | 2170 | South West |
| 50 | Blacktown | 2148 | Western Sydney |

### Regional Grouping

| Region | Suburbs |
|--------|---------|
| **Eastern Suburbs** | Bondi Beach, Double Bay, Paddington, Vaucluse, Bellevue Hill, Randwick, Woollahra, Coogee, Maroubra, Bondi Junction |
| **Lower North Shore** | Mosman, Neutral Bay, Chatswood, Lane Cove, Kirribilli, Cremorne, Cammeray, Crows Nest, Willoughby, Artarmon |
| **Upper North Shore** | Pymble, Epping, Wahroonga, Hornsby |
| **Northern Beaches** | Manly, Dee Why, Collaroy, Brookvale |
| **Inner West** | Balmain, Newtown, Marrickville, Strathfield, Drummoyne, Five Dock, Hunters Hill, Gladesville, Rozelle, Leichhardt |
| **Hills District** | Castle Hill, Kellyville |
| **Sutherland Shire** | Cronulla, Miranda, Caringbah |
| **Western Sydney** | Parramatta, Penrith, Liverpool, Blacktown |
| **South West** | Bankstown |

### Seeding the Database

```sql
-- Seed Tier 1 suburbs
INSERT INTO scrape_progress (suburb_id, suburb_name, state, postcode, slug, priority_tier, priority_rank, region) VALUES
('30088', 'Mosman', 'NSW', '2088', 'mosman-nsw-2088', 1, 1, 'Lower North Shore'),
('30263', 'Bondi Beach', 'NSW', '2026', 'bondi-beach-nsw-2026', 1, 2, 'Eastern Suburbs'),
('30282', 'Double Bay', 'NSW', '2028', 'double-bay-nsw-2028', 1, 3, 'Eastern Suburbs'),
('30211', 'Paddington', 'NSW', '2021', 'paddington-nsw-2021', 1, 4, 'Eastern Suburbs'),
('30095', 'Manly', 'NSW', '2095', 'manly-nsw-2095', 1, 5, 'Northern Beaches'),
('30010', 'Surry Hills', 'NSW', '2010', 'surry-hills-nsw-2010', 1, 6, 'Inner City'),
('30154', 'Castle Hill', 'NSW', '2154', 'castle-hill-nsw-2154', 1, 7, 'Hills District'),
('30089', 'Neutral Bay', 'NSW', '2089', 'neutral-bay-nsw-2089', 1, 8, 'Lower North Shore'),
('30067', 'Chatswood', 'NSW', '2067', 'chatswood-nsw-2067', 1, 9, 'Lower North Shore'),
('30041', 'Balmain', 'NSW', '2041', 'balmain-nsw-2041', 1, 10, 'Inner West'),
('30030', 'Vaucluse', 'NSW', '2030', 'vaucluse-nsw-2030', 1, 11, 'Eastern Suburbs'),
('30230', 'Cronulla', 'NSW', '2230', 'cronulla-nsw-2230', 1, 12, 'Sutherland Shire'),
('30023', 'Bellevue Hill', 'NSW', '2023', 'bellevue-hill-nsw-2023', 1, 13, 'Eastern Suburbs'),
('30150', 'Parramatta', 'NSW', '2150', 'parramatta-nsw-2150', 1, 14, 'Western Sydney'),
('30042', 'Newtown', 'NSW', '2042', 'newtown-nsw-2042', 1, 15, 'Inner West'),
('30031', 'Randwick', 'NSW', '2031', 'randwick-nsw-2031', 1, 16, 'Eastern Suburbs'),
('30066', 'Lane Cove', 'NSW', '2066', 'lane-cove-nsw-2066', 1, 17, 'Lower North Shore'),
('30099', 'Dee Why', 'NSW', '2099', 'dee-why-nsw-2099', 1, 18, 'Northern Beaches'),
('30025', 'Woollahra', 'NSW', '2025', 'woollahra-nsw-2025', 1, 19, 'Eastern Suburbs'),
('30204', 'Marrickville', 'NSW', '2204', 'marrickville-nsw-2204', 1, 20, 'Inner West');

-- Continue with Tier 2 and Tier 3...
```

---

## Sequencing & Selection Logic

### Daily Processing Strategy

**Goal:** Process 3-5 suburbs per day from different regions for geographic diversity.

```typescript
// Selection algorithm
function selectSuburbsForToday(count: number = 4): ScrapeProgress[] {
  // Get pending suburbs by tier
  const tier1 = db.prepare(`
    SELECT * FROM scrape_progress
    WHERE status = 'pending' AND priority_tier = 1
    ORDER BY priority_rank ASC
    LIMIT 10
  `).all();

  const tier2 = db.prepare(`
    SELECT * FROM scrape_progress
    WHERE status = 'pending' AND priority_tier = 2
    ORDER BY priority_rank ASC
    LIMIT 10
  `).all();

  // Select from different regions
  const selected: ScrapeProgress[] = [];
  const usedRegions = new Set<string>();

  // Priority: Tier 1 first
  for (const suburb of [...tier1, ...tier2]) {
    if (selected.length >= count) break;

    // Skip if we already have one from this region
    if (usedRegions.has(suburb.region)) continue;

    selected.push(suburb);
    usedRegions.add(suburb.region);
  }

  // If not enough diversity, fill with any pending
  if (selected.length < count) {
    const remaining = [...tier1, ...tier2]
      .filter(s => !selected.includes(s))
      .slice(0, count - selected.length);
    selected.push(...remaining);
  }

  return selected;
}
```

### Agency Processing Order

Within each suburb, process agencies by brand tier:

```typescript
const BRAND_TIERS = {
  // Tier 1: Major national brands (process first)
  1: ['Ray White', 'LJ Hooker'],

  // Tier 2: Premium brands
  2: ['McGrath', 'Belle Property'],

  // Tier 3: Large franchises
  3: ['Harcourts', 'Century 21', 'Raine & Horne'],

  // Tier 4: Regional franchises
  4: ['PRD', 'First National', 'Laing+Simmons'],

  // Tier 5: Smaller franchises
  5: ['Richardson & Wrench', 'Elders'],

  // Tier 6: Boutique/Independent
  6: [], // Default for unrecognized
};
```

### Enrichment Batch Selection

```sql
-- Select agents for enrichment (prioritize major brands)
SELECT
  a.*,
  ag.name as agency_name,
  ag.website as agency_website,
  ag.brand_tier
FROM agents a
JOIN agencies ag ON a.agency_id = ag.id
WHERE a.enrichment_status = 'pending'
ORDER BY
  ag.brand_tier ASC,                    -- Major brands first
  a.photo_url IS NOT NULL DESC,         -- With photos
  a.profile_text IS NOT NULL DESC       -- With bios
LIMIT 50;
```

---

## Vercel Deploy Hook

### Setup

1. Go to Vercel Project → Settings → Git
2. Scroll to "Deploy Hooks"
3. Click "Create Hook"
4. Name: "ARI Data Update"
5. Branch: `main`
6. Copy URL (contains secret)

### Hook URL Format

```
https://api.vercel.com/v1/integrations/deploy/prj_XXXXXXXXXXXXX/YYYYYYYYYYYY
```

### Trigger Implementation

```typescript
// deploy/vercel.ts

interface DeployResult {
  success: boolean;
  jobId?: string;
  deploymentUrl?: string;
  error?: string;
}

export async function triggerVercelDeploy(): Promise<DeployResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    return { success: false, error: 'Deploy hook URL not configured' };
  }

  try {
    console.log('[DEPLOY] Triggering Vercel build...');

    const response = await fetch(hookUrl, { method: 'POST' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`[DEPLOY] Build triggered. Job ID: ${data.job?.id}`);

    return {
      success: true,
      jobId: data.job?.id,
    };
  } catch (error) {
    console.error('[DEPLOY] Failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Monitoring Deployment

```typescript
export async function checkDeploymentStatus(since: number): Promise<{
  status: string;
  url?: string;
}> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { status: 'unknown' };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?since=${since}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const { deployments } = await response.json();

    if (deployments.length === 0) {
      return { status: 'pending' };
    }

    const latest = deployments[0];

    return {
      status: latest.readyState, // QUEUED, BUILDING, READY, ERROR
      url: latest.readyState === 'READY' ? `https://${latest.url}` : undefined,
    };
  } catch (error) {
    return { status: 'error' };
  }
}
```

### Deploy Hook Limits

| Property | Value |
|----------|-------|
| Rate limit | 60 triggers per hour |
| Build cache | Enabled by default |
| Timeout | 45 minutes |

---

## Database Management

### Database Location

```
Control Center: control-center/data/ari.db (read/write)
SEO Site:       seo-site/data/ari.db (read-only at build)
```

### Synchronization Options

**Option A: Git-committed (Recommended for V1)**

```bash
# After enrichment complete
cp control-center/data/ari.db seo-site/data/ari.db
git add seo-site/data/ari.db
git commit -m "Update database with enriched data"
git push origin main
# Vercel auto-deploys from push
```

**Option B: Deploy Hook with Copy Script**

```bash
# copy-and-deploy.sh
#!/bin/bash
cp control-center/data/ari.db seo-site/data/ari.db
cd seo-site
git add data/ari.db
git commit -m "Database update $(date +%Y-%m-%d)"
git push origin main
# OR trigger deploy hook
curl -X POST $VERCEL_DEPLOY_HOOK_URL
```

### Backup Strategy

```bash
# backup.sh - Run before major operations
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp control-center/data/ari.db "$BACKUP_DIR/ari_$TIMESTAMP.db"

# Keep only last 10 backups
ls -t $BACKUP_DIR/*.db | tail -n +11 | xargs rm -f
```

### Database Health Check

```typescript
function checkDatabaseHealth(): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check agent counts
  const agents = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (agents.count === 0) {
    issues.push('No agents in database');
  }

  // Check for orphaned agents
  const orphaned = db.prepare(`
    SELECT COUNT(*) as count FROM agents
    WHERE agency_id NOT IN (SELECT id FROM agencies)
  `).get();
  if (orphaned.count > 0) {
    issues.push(`${orphaned.count} orphaned agents found`);
  }

  // Check enrichment status distribution
  const enrichment = db.prepare(`
    SELECT enrichment_status, COUNT(*) as count
    FROM agents GROUP BY enrichment_status
  `).all();

  const failed = enrichment.find(e => e.enrichment_status === 'failed');
  if (failed && failed.count > agents.count * 0.1) {
    issues.push(`High failure rate: ${failed.count} agents failed enrichment`);
  }

  return {
    healthy: issues.length === 0,
    issues,
  };
}
```

---

## Daily Operations

### Recommended Daily Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAILY OPERATIONS WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. MORNING CHECK (5 min)                                               │
│     □ Open Control Center                                                │
│     □ Check daily budget remaining (should be ~$10)                     │
│     □ Review yesterday's progress                                        │
│                                                                          │
│  2. SELECT WORK (5 min)                                                  │
│     □ Choose 3-5 suburbs from different regions                         │
│     □ Check estimated cost (should be < $5)                             │
│                                                                          │
│  3. DISCOVERY (10-20 min)                                               │
│     □ Click "Run Discovery"                                              │
│     □ Monitor activity log for agencies/agents found                    │
│     □ Verify agencies and agents stored                                 │
│                                                                          │
│  4. ENRICHMENT (30-60 min)                                              │
│     □ Click "Run Enrichment"                                             │
│     □ Monitor sub-agent progress                                         │
│     □ Review quality metrics when complete                              │
│                                                                          │
│  5. DEPLOY (5 min)                                                       │
│     □ Copy database to seo-site                                          │
│     □ Commit and push OR trigger deploy hook                            │
│     □ Verify deployment success                                          │
│                                                                          │
│  6. VERIFICATION (5 min)                                                 │
│     □ Spot-check a few new agent pages                                  │
│     □ Verify schema markup renders                                       │
│     □ Check for any build errors                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Claude SDK Cost Management

| Operation | Est. Cost | Notes |
|-----------|-----------|-------|
| Discovery - Main agent | ~$0.03 | Per suburb |
| Discovery - Sub-agent | ~$0.05 | Per agency |
| **Discovery per suburb** | ~$0.50-0.80 | ~10 agencies |
| Enrichment - Main agent | ~$0.05 | Per batch |
| Enrichment - Sub-agent | ~$0.10 | Per 5-10 agents |
| **Enrichment per batch (50)** | ~$0.50-1.00 | |

### Daily Budget Guidelines

| Budget | Suburbs/Day | Agencies/Day | Agents/Day |
|--------|-------------|--------------|------------|
| $5/day | ~6-8 | ~60-80 | ~400-600 |
| $10/day | ~12-16 | ~120-160 | ~800-1200 |
| $20/day | ~25-30 | ~250-300 | ~1500-2000 |

---

## Safe Rollout Strategy

### Phased Approach

| Phase | Timeline | Pages | Action |
|-------|----------|-------|--------|
| **Pilot** | Weeks 1-4 | 10-20 | Perfect template quality |
| **Early** | Weeks 5-8 | 50-100/week | Monitor indexation |
| **Growth** | Weeks 9-16 | 200-500/week | Scale if healthy |
| **Scale** | Month 4+ | 1000+/week | Full deployment |

### Phase 1: Pilot (Weeks 1-4)

**Goal:** Validate templates and SEO markup with small batch

```
□ Process 2-3 Tier 1 suburbs
□ Total: ~50 agents, ~10 agencies
□ Manual review of every page
□ Verify Schema markup in Google Rich Results Test
□ Submit sitemap to Google Search Console
□ Wait for indexation (7-14 days)
```

### Phase 2: Early Growth (Weeks 5-8)

**Goal:** Confirm Google indexing and no quality issues

```
□ Process remaining Tier 1 suburbs
□ Add 2-3 Tier 2 suburbs per week
□ Monitor Google Search Console:
  - Index Coverage report
  - Crawl stats
  - Any manual actions
□ Track "Crawled - not indexed" percentage
```

### Phase 3: Growth (Weeks 9-16)

**Goal:** Scale up while maintaining quality

```
□ Process Tier 2 and Tier 3 suburbs
□ 200-500 new pages per week
□ Monitor Core Web Vitals
□ Track organic traffic growth
□ Adjust templates based on performance
```

### Phase 4: Scale (Month 4+)

**Goal:** Full production scale

```
□ Process all Sydney suburbs
□ Consider Melbourne/Brisbane expansion
□ Implement ISR if beneficial
□ Add V2 features as needed
```

### Warning Signs (Slow Down If...)

| Signal | Threshold | Action |
|--------|-----------|--------|
| "Crawled - not indexed" | > 15% | Review content quality |
| Declining average position | Week over week | Analyze competition |
| Low CTR | < 1% | Improve titles/descriptions |
| Manual action | Any | Stop immediately |
| High bounce rate | > 80% | Improve page content |
| Build failures | > 2/week | Review database integrity |

---

## Monitoring

### Google Search Console Checks

**Weekly:**
- Index Coverage: Valid pages
- Crawl Stats: Pages crawled
- Core Web Vitals: Pass rate

**Monthly:**
- Performance: Clicks, impressions, CTR
- Sitemaps: Status
- Links: Internal linking health

### Application Monitoring

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const dbHealth = checkDatabaseHealth();
  const apiRemaining = domainApi.getRemainingCalls();

  res.json({
    status: dbHealth.healthy ? 'healthy' : 'degraded',
    database: {
      healthy: dbHealth.healthy,
      issues: dbHealth.issues,
    },
    api: {
      remaining: apiRemaining,
      healthy: apiRemaining > 100,
    },
    timestamp: new Date().toISOString(),
  });
});
```

### Key Metrics Dashboard

| Metric | Source | Target |
|--------|--------|--------|
| Total agents | Database | Growing |
| Enriched agents | Database | > 90% of total |
| Failed enrichments | Database | < 5% |
| API calls used | Control Center | < 400/day |
| Build success rate | Vercel | 100% |
| Indexed pages | GSC | > 90% |
| Avg position | GSC | Monitor trend |

---

## Troubleshooting

### Common Issues

**1. Claude API Error**

```
Error: Claude API authentication failed
```

**Solution:**
- Verify `ANTHROPIC_API_KEY` is correct
- Check if key has expired or been revoked
- Ensure key has sufficient permissions

**2. Daily Budget Exceeded**

```
Error: Daily Claude budget exceeded ($10.00)
```

**Solution:**
- Wait until next day for budget reset
- Increase `CLAUDE_DAILY_BUDGET_USD` if needed
- Reduce suburbs processed per day

**3. Discovery Timeout**

```
Error: Discovery timeout after 5 minutes
```

**Solution:**
- Reduce `CLAUDE_DISCOVERY_MAX_AGENCIES_PER_RUN`
- Check if agency websites are accessible
- Review sub-agent logs for stuck searches

**5. Enrichment Timeout**

```
Error: Enrichment batch timeout after 5 minutes
```

**Solution:**
- Reduce `CLAUDE_ENRICHMENT_MAX_AGENTS_PER_BATCH` (try 30 instead of 50)
- Check Claude API status
- Review sub-agent logs for stuck searches

**6. Vercel Build Failed**

```
Error: Build failed with exit code 1
```

**Solution:**
- Check database file is present
- Verify SQLite can be read
- Review build logs for specific error
- Check for TypeScript errors

**7. Page 404 After Deploy**

```
Error: Page /agent/xyz not found
```

**Solution:**
- Verify agent exists in database
- Check `enrichment_status = 'complete'`
- Confirm `generateStaticParams` includes agent
- Rebuild and redeploy

### Database Recovery

```bash
# Restore from backup
cp backups/ari_YYYYMMDD_HHMMSS.db control-center/data/ari.db

# Reset stuck enrichment
sqlite3 control-center/data/ari.db \
  "UPDATE agents SET enrichment_status = 'pending' WHERE enrichment_status = 'in_progress'"

# Clear failed enrichments for retry
sqlite3 control-center/data/ari.db \
  "UPDATE agents SET enrichment_status = 'pending', enrichment_error = NULL WHERE enrichment_status = 'failed'"
```

---

## Implementation Roadmap

### Week 1-2: Foundation

- [ ] Set up Control Center Node.js project
- [ ] Set up Next.js SEO site project
- [ ] Create SQLite database with schemas
- [ ] Seed scrape_progress with Tier 1 suburbs
- [ ] Basic Control Center UI (suburb list)

### Week 3-4: Discovery Skill

- [ ] Implement Discovery pipeline
- [ ] Main agent + sub-agent architecture for discovery
- [ ] Agency/agent extraction from web
- [ ] Duplicate detection
- [ ] Control Center: discovery UI and progress

### Week 5-6: Enrichment Skill

- [ ] Implement Enrichment pipeline
- [ ] Main agent + sub-agent architecture for enrichment
- [ ] Structured output handling
- [ ] Store enriched data
- [ ] Enrichment progress UI

### Week 7-8: Static Site

- [ ] Agent page template
- [ ] Agency page template
- [ ] Suburb page template
- [ ] State page template
- [ ] Schema markup components
- [ ] generateStaticParams implementation

### Week 9-10: Integration & Launch

- [ ] Vercel Deploy Hook integration
- [ ] End-to-end test: fetch → enrich → build → deploy
- [ ] Sitemap generation
- [ ] robots.txt
- [ ] Google Search Console setup
- [ ] Soft launch with pilot pages

### Ongoing Operations

- [ ] Daily suburb processing (3-5 per day)
- [ ] Weekly GSC monitoring
- [ ] Monthly performance review
- [ ] Gradual rollout to Tier 2, Tier 3 suburbs

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - System architecture
- **[03-discovery-skill.md](./03-discovery-skill.md)** - Discovery Skill
- **[04-enrichment-pipeline.md](./04-enrichment-pipeline.md)** - Enrichment Skill
- **[05-control-center.md](./05-control-center.md)** - Control Center UI
- **[07-seo-strategy.md](./07-seo-strategy.md)** - SEO monitoring
