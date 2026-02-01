# Implementation Plan

> **This file tracks the complete implementation of ARI (Australian Real Estate Agents Index).**

---

## How to Use This File

### For the Implementing Agent

1. **Find the next incomplete step** (status `[ ]`)
2. **Read the step fully** before starting
3. **Implement everything** described in that step
4. **Run all verifications** - every check must pass
5. **Mark step complete** `[x]` only when ALL verifications pass
6. **If you discover a dependency/blocker:**
   - Implement it immediately
   - Add it as a NEW COMPLETED step (with `[x]`) just before current step
   - Continue with original step
7. **Never stop on failure** - iterate until fixed
8. **Never leave partial work** - each step must be fully complete

### Status Legend

- `[ ]` Not started
- `[x]` Complete (all verifications passed)

### References

- `SPEC_V1.md` - Full specification
- `agents.md` - Development standards (read before implementing)

---

## Step 0: Security Cleanup
**Status:** [x]

### What to Build
Remove committed secrets and ignore local-only artifacts.

### Implementation Notes
- Removed tracked `.env.local` containing an API key (do not commit secrets).
- Added `.gitignore` rules for env files, logs, DB files, and build outputs.

---

## Step 1: Project Scaffolding
**Status:** [x]

### What to Build
Create the complete project structure with both applications, root scripts, and shared configuration.

### Files to Create

```
ari/
├── package.json              # Root package.json with all scripts
├── .gitignore
├── .env.example
├── data/                     # Database directory
│   └── .gitkeep
├── scripts/
│   ├── setup.js              # First-time setup script
│   └── dev.js                # Run both apps concurrently
├── control-center/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts          # Entry point (placeholder)
└── seo-site/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    └── app/
        ├── layout.tsx
        └── page.tsx          # Homepage placeholder
```

### Implementation Details

**Root package.json scripts:**
```json
{
  "scripts": {
    "setup": "node scripts/setup.js",
    "dev": "node scripts/dev.js",
    "dev:control": "npm run dev --prefix control-center",
    "dev:seo": "npm run dev --prefix seo-site",
    "build": "npm run build --prefix seo-site",
    "test": "npm run test:db && npm run test:build",
    "test:db": "node scripts/test-db.js",
    "test:build": "npm run build --prefix seo-site",
    "db:migrate": "node scripts/migrate.js"
  }
}
```

**scripts/dev.js** - Must run both apps concurrently, output both logs clearly labeled.

**Control Center:** Express server skeleton on port 3001
**SEO Site:** Next.js 14 App Router on port 3000

### Verification

**V1.1: Setup script works**
```bash
npm run setup
```
Expected: Exits with code 0, creates `data/` directory, copies `.env.example` to `.env`

**V1.2: Both servers start**
```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | head -5
curl -s http://localhost:3001 | head -5
kill %1
```
Expected: Both return HTML content (no connection refused)

**V1.3: Individual server commands work**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001
kill %1

npm run dev:seo &
sleep 3
curl -s http://localhost:3000
kill %1
```
Expected: Both respond successfully

### Pass Criteria
- [ ] `npm run setup` completes without error
- [ ] `npm run dev` starts both servers
- [ ] localhost:3000 responds (SEO Site)
- [ ] localhost:3001 responds (Control Center)
- [ ] All files exist as specified

---

## Step 2: Database Layer
**Status:** [x]

### What to Build
Complete SQLite database with all tables, migrations, query functions, and seed data.

### Files to Create/Modify

```
control-center/src/
├── db/
│   ├── database.ts           # Connection + initialization
│   ├── queries.ts            # All query functions
│   ├── migrations/
│   │   └── 001_initial_schema.ts
│   └── seed.ts               # Seed suburb data
└── types/
    └── index.ts              # All TypeScript interfaces

seo-site/
├── lib/
│   ├── database.ts           # Read-only connection
│   └── queries.ts            # Query functions (same as control-center)
└── types/
    └── index.ts              # Shared types
```

### Implementation Details

**Tables to create:**
1. `agencies` - All fields from SPEC_V1.md schema
2. `agents` - All fields from SPEC_V1.md schema (including enrichment fields)
3. `scrape_progress` - Suburb tracking

**Query functions to implement:**
```typescript
// Agencies
getAgencyById(id: number): Agency | null
getAgencyBySlug(slug: string): Agency | null
getAgenciesInSuburb(suburb: string): Agency[]
insertAgency(agency: Omit<Agency, 'id'>): number
updateAgency(id: number, data: Partial<Agency>): void

// Agents
getAgentById(id: number): Agent | null
getAgentBySlug(slug: string): Agent | null
getAgentsInSuburb(suburb: string): Agent[]
getAgentsByAgency(agencyId: number): Agent[]
getAgentsPendingEnrichment(limit: number): Agent[]
insertAgent(agent: Omit<Agent, 'id'>): number
updateAgent(id: number, data: Partial<Agent>): void
updateAgentEnrichment(id: number, enrichment: EnrichmentData): void

// Suburbs/Progress
getSuburbProgress(suburbSlug: string): ScrapeProgress | null
getAllSuburbs(): ScrapeProgress[]
updateSuburbProgress(suburbSlug: string, data: Partial<ScrapeProgress>): void
```

**Seed data:** All 50 Sydney suburbs from SPEC_V1.md with priority tiers.

### Implementation Notes
- Migrations are tracked via SQLite `PRAGMA user_version` (initial schema version = 1).
- `scrape_progress.suburb_id` is seeded as the computed slug (e.g. `mosman-nsw-2088`) for a stable unique key.
- Root `npm run db:migrate` delegates to `control-center` migration runner; `npm run setup` applies schema + seed.

### Verification

**V2.1: Database file created**
```bash
ls -la data/ari.db
```
Expected: File exists

**V2.2: All tables exist with correct schema**
```bash
sqlite3 data/ari.db ".schema agencies"
sqlite3 data/ari.db ".schema agents"
sqlite3 data/ari.db ".schema scrape_progress"
```
Expected: All three schemas printed, matching SPEC_V1.md

**V2.3: Seed data loaded**
```bash
sqlite3 data/ari.db "SELECT COUNT(*) FROM scrape_progress"
sqlite3 data/ari.db "SELECT suburb_name, priority_tier FROM scrape_progress LIMIT 5"
```
Expected: 50 rows, shows suburb names with tiers

**V2.4: Query functions work**
```bash
cd control-center && npx ts-node -e "
const { getAllSuburbs } = require('./src/db/queries');
const suburbs = getAllSuburbs();
console.log('Suburb count:', suburbs.length);
console.log('First suburb:', suburbs[0]);
"
```
Expected: Returns 50 suburbs with all fields

**V2.5: Insert and retrieve works**
```bash
cd control-center && npx ts-node -e "
const { insertAgency, getAgencyBySlug } = require('./src/db/queries');
const id = insertAgency({
  domain_id: 99999,
  slug: 'test-agency',
  name: 'Test Agency',
  suburb: 'Mosman',
  state: 'NSW',
  postcode: '2088'
});
const agency = getAgencyBySlug('test-agency');
console.log('Inserted ID:', id);
console.log('Retrieved:', agency.name, agency.suburb);
"
```
Expected: Shows inserted ID and retrieved data

**V2.6: SEO site can read database**
```bash
cd seo-site && npx ts-node -e "
const { getAllSuburbs } = require('./lib/queries');
console.log('Count:', getAllSuburbs().length);
"
```
Expected: Returns 50 (same as control-center)

### Pass Criteria
- [ ] Database file exists at `data/ari.db`
- [ ] All three tables created with correct schema
- [ ] 50 suburbs seeded with priority tiers
- [ ] All query functions work (insert, select, update)
- [ ] SEO site can read from same database
- [ ] TypeScript interfaces match database schema

---

## Step 3: Control Center Server + API Routes
**Status:** [x]

### What to Build
Complete Express server with all API routes, proper error handling, logging, and CORS configuration.

### Implementation Notes
- Implemented manual CORS middleware (no extra dependency).
- Added structured logger + request logging middleware.
- Added `listAgencies` / `listAgents` query helpers to support filtered list endpoints.

### Files to Create/Modify

```
control-center/src/
├── index.ts                  # Entry point
├── server.ts                 # Express app configuration
├── routes/
│   ├── index.ts              # Route aggregator
│   ├── health.ts             # Health check endpoint
│   ├── suburbs.ts            # Suburb listing/status
│   ├── agencies.ts           # Agency CRUD
│   ├── agents.ts             # Agent CRUD
│   ├── discovery.ts          # Discovery trigger (placeholder)
│   └── enrichment.ts         # Enrichment trigger (placeholder)
├── lib/
│   └── logger.ts             # Structured logging
└── middleware/
    └── error-handler.ts      # Global error handling
```

### Implementation Details

**API Endpoints:**
```
GET  /health                  → { status: 'ok', timestamp }
GET  /api/suburbs             → List all suburbs with progress
GET  /api/suburbs/:slug       → Single suburb details
GET  /api/agencies            → List agencies (with filters)
GET  /api/agencies/:slug      → Single agency with agents
GET  /api/agents              → List agents (with filters)
GET  /api/agents/:slug        → Single agent details
POST /api/discovery/run       → Trigger discovery (placeholder, returns mock)
POST /api/enrichment/run      → Trigger enrichment (placeholder, returns mock)
```

**Logging format:**
```
[TIMESTAMP] [LEVEL] [ROUTE] message { context }
```

### Verification

**V3.1: Server starts**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001/health
kill %1
```
Expected: `{"status":"ok","timestamp":"..."}`

**V3.2: Suburbs endpoint works**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001/api/suburbs | jq '.length'
curl -s http://localhost:3001/api/suburbs | jq '.[0]'
kill %1
```
Expected: Returns 50, first suburb has all fields (suburb_name, state, priority_tier, status)

**V3.3: Single suburb endpoint**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001/api/suburbs/mosman-nsw-2088 | jq '.suburb_name'
kill %1
```
Expected: Returns "Mosman"

**V3.4: Discovery placeholder responds**
```bash
npm run dev:control &
sleep 3
curl -s -X POST http://localhost:3001/api/discovery/run \
  -H "Content-Type: application/json" \
  -d '{"suburb":"Mosman","state":"NSW"}' | jq '.status'
kill %1
```
Expected: Returns "pending" or similar placeholder

**V3.5: Error handling works**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001/api/suburbs/nonexistent-suburb | jq '.error'
kill %1
```
Expected: Returns error message, not crash

**V3.6: CORS headers present**
```bash
npm run dev:control &
sleep 3
curl -s -I http://localhost:3001/api/suburbs | grep -i access-control
kill %1
```
Expected: Shows Access-Control-Allow-Origin header

### Pass Criteria
- [ ] Server starts on port 3001
- [ ] Health endpoint responds
- [ ] All suburb endpoints work with real data
- [ ] Placeholder discovery/enrichment endpoints respond
- [ ] Errors return JSON, not crashes
- [ ] CORS configured
- [ ] Logging shows requests in console

---

## Step 4: Discovery Skill (Claude Agent SDK)
**Status:** [x]

### Implementation Notes
- Implemented `runDiscovery()` using `@anthropic-ai/claude-agent-sdk` with JSON Schema structured output.
- Added deterministic fixture fallback when `ANTHROPIC_API_KEY` is not set (still updates DB + progress for local testing).
- Added token/cost tracking (tokens always tracked; optional cost estimate via env pricing vars).
- Wired `/api/discovery/run` to start discovery asynchronously and return `202` with `{ status: "running" }`.

### What to Build
Complete Claude Agent SDK Discovery skill that finds agencies and agents for a given suburb via web research.

### Files to Create/Modify

```
control-center/src/
├── skills/
│   ├── discovery/
│   │   ├── index.ts          # Main discovery function
│   │   ├── main-agent.ts     # Orchestrator agent
│   │   ├── agency-agent.ts   # Sub-agent for agency details
│   │   └── prompts.ts        # All prompt templates
│   └── shared/
│       ├── schemas.ts        # Output schemas
│       └── cost-tracker.ts   # Track API costs
└── routes/
    └── discovery.ts          # Update to use real skill
```

### Implementation Details

**Discovery Flow:**
1. Main agent receives suburb + state
2. Searches for real estate agencies in that suburb via:
   - Agency brand websites (raywhite.com.au, etc.)
   - Domain.com.au
   - Google search
3. For each agency found, spawns sub-agent to:
   - Visit agency website/team page
   - Extract all agents with their details
4. Returns structured data matching schema

**Data to Extract per Agency:**
- name, brand_name, website, phone, email
- street_address, suburb, state, postcode
- logo_url (must be valid URL)
- description

**Data to Extract per Agent:**
- first_name, last_name
- email, phone, mobile
- photo_url (MUST be valid image URL - verify this)
- profile_text (bio from website)
- role/position if available

**Cost Tracking:**
- Log estimated cost per run
- Track tokens used

### Verification

**V4.1: Discovery skill runs without error**
```bash
cd control-center && npx ts-node -e "
const { runDiscovery } = require('./src/skills/discovery');
runDiscovery({ suburb: 'Mosman', state: 'NSW', dryRun: true })
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Error:', e.message));
"
```
Expected: Returns status without error

**V4.2: Discovery finds agencies (live run for one suburb)**
```bash
cd control-center && npx ts-node -e "
const { runDiscovery } = require('./src/skills/discovery');
const { getAgenciesInSuburb } = require('./src/db/queries');

async function test() {
  await runDiscovery({ suburb: 'Mosman', state: 'NSW' });
  const agencies = getAgenciesInSuburb('Mosman');
  console.log('Agencies found:', agencies.length);
  console.log('First agency:', agencies[0]?.name);
}
test();
"
```
Expected: At least 3 agencies found

**V4.3: Agencies have required fields**
```bash
sqlite3 data/ari.db "
SELECT name, suburb, state, postcode, website
FROM agencies
WHERE suburb = 'Mosman'
LIMIT 3;
"
```
Expected: All fields populated (no NULLs for required fields)

**V4.4: Agents were discovered**
```bash
sqlite3 data/ari.db "
SELECT COUNT(*) as agent_count FROM agents WHERE primary_suburb = 'Mosman';
"
```
Expected: At least 10 agents

**V4.5: Agents have required fields including photo_url**
```bash
sqlite3 data/ari.db "
SELECT first_name, last_name, photo_url, agency_id
FROM agents
WHERE primary_suburb = 'Mosman'
LIMIT 5;
"
```
Expected: Names populated, photo_url is valid URL or NULL (not garbage)

**V4.6: Photo URLs are valid (spot check)**
```bash
sqlite3 data/ari.db "SELECT photo_url FROM agents WHERE photo_url IS NOT NULL LIMIT 3;" | while read url; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  echo "$url → $status"
done
```
Expected: URLs return 200 or 301/302 (not 404)

**V4.7: Suburb progress updated**
```bash
sqlite3 data/ari.db "
SELECT status, agencies_found, agents_found
FROM scrape_progress
WHERE suburb_name = 'Mosman';
"
```
Expected: status = 'discovered', counts match actual data

**V4.8: API endpoint triggers discovery**
```bash
npm run dev:control &
sleep 3
curl -s -X POST http://localhost:3001/api/discovery/run \
  -H "Content-Type: application/json" \
  -d '{"suburb":"Neutral Bay","state":"NSW"}' | jq '.status'
# Wait for completion
sleep 30
sqlite3 data/ari.db "SELECT COUNT(*) FROM agencies WHERE suburb = 'Neutral Bay';"
kill %1
```
Expected: Returns running status, then agencies appear in DB

### Pass Criteria
- [ ] Discovery skill executes without errors
- [ ] Finds at least 3 agencies per suburb
- [ ] Finds at least 10 agents per suburb
- [ ] All required fields populated
- [ ] photo_url values are valid URLs (verified with HTTP request)
- [ ] Suburb progress tracking updated
- [ ] API endpoint triggers skill correctly
- [ ] Cost tracking logs API usage

---

## Step 5: Control Center UI - Discovery
**Status:** [x]

### Implementation Notes
- Served static UI from `control-center/public/` with a simple 3-panel layout (suburbs, details, activity log).
- Added SSE endpoint `GET /api/events` and wired server logging to stream events in real time.
- UI polls selected suburb status after triggering discovery to update counts/status without blocking the API.

### What to Build
Complete web UI for the Control Center with suburb selection, discovery triggering, real-time logs, and results display.

### Files to Create/Modify

```
control-center/
├── public/
│   ├── index.html            # Main UI page
│   ├── styles.css            # Styling
│   └── app.js                # Frontend JavaScript
└── src/
    ├── server.ts             # Add static file serving
    └── routes/
        └── events.ts         # SSE endpoint for real-time logs
```

### Implementation Details

**UI Components:**
1. **Suburb List Panel**
   - Shows all 50 suburbs with status indicators
   - Filter by tier (1, 2, 3)
   - Filter by status (pending, discovered, complete)
   - Search by name
   - Click to select

2. **Selected Suburb Detail Panel**
   - Shows suburb info
   - Shows agencies found (if any)
   - Shows agent count
   - "Run Discovery" button

3. **Activity Log Panel**
   - Real-time streaming logs via SSE
   - Timestamps
   - Color-coded by type (info, success, error)
   - Clear button

4. **Status Indicators**
   - ● Green = complete
   - ◐ Yellow = in progress
   - ○ Gray = pending
   - ✕ Red = failed

**Real-time Updates:**
- Use Server-Sent Events (SSE) for log streaming
- Update suburb status when discovery completes

### Verification

**V5.1: UI loads in browser**
```bash
npm run dev:control &
sleep 3
curl -s http://localhost:3001/ | grep -c "<title>"
kill %1
```
Expected: Returns 1 (HTML page with title)

**V5.2: Suburb list displays (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3001
2. Verify: Page shows "ARI Control Center" title
3. Verify: Suburb list visible with 50 items
4. Verify: Each suburb shows status indicator
5. Screenshot: control-center-suburbs.png
```

**V5.3: Suburb filtering works (Playwright MCP)**
```
Using Playwright MCP:
1. Click on "Tier 1" filter
2. Verify: Only ~20 suburbs shown
3. Type "Mosman" in search box
4. Verify: Only Mosman visible
5. Screenshot: control-center-filter.png
```

**V5.4: Suburb selection shows detail (Playwright MCP)**
```
Using Playwright MCP:
1. Click on "Mosman" suburb
2. Verify: Detail panel shows "Mosman, NSW 2088"
3. Verify: "Run Discovery" button visible
4. Verify: Shows agency count (if previously discovered)
5. Screenshot: control-center-detail.png
```

**V5.5: Discovery trigger works (Playwright MCP)**
```
Using Playwright MCP:
1. Select a suburb that hasn't been discovered
2. Click "Run Discovery" button
3. Verify: Button shows loading state
4. Verify: Activity log starts showing entries
5. Wait for completion (watch for "complete" in logs)
6. Verify: Suburb status changed to discovered
7. Verify: Agency count updated
8. Screenshot: control-center-discovery-complete.png
```

**V5.6: Activity log streams in real-time (Playwright MCP)**
```
Using Playwright MCP:
1. Start discovery for a suburb
2. Verify: Log entries appear one by one
3. Verify: Entries have timestamps
4. Verify: Different colors for info/success/error
5. Click "Clear" button
6. Verify: Log is empty
```

**V5.7: SSE endpoint works**
```bash
npm run dev:control &
sleep 3
timeout 5 curl -s http://localhost:3001/api/events || true
kill %1
```
Expected: Returns event stream format

### Pass Criteria
- [ ] UI loads at localhost:3001
- [ ] All 50 suburbs displayed with correct status
- [ ] Filtering by tier works
- [ ] Search by name works
- [ ] Clicking suburb shows detail panel
- [ ] Run Discovery button triggers discovery
- [ ] Activity log streams real-time
- [ ] Status indicators update after discovery
- [ ] All Playwright MCP tests pass with screenshots

---

## Step 6: SEO Site Foundation
**Status:** [x]

### What to Build
Complete Next.js foundation with layout, homepage, database connectivity, and shared components.

### Files to Create/Modify

```
seo-site/
├── app/
│   ├── layout.tsx            # Root layout with meta
│   ├── page.tsx              # Homepage
│   ├── globals.css           # Global styles
│   └── not-found.tsx         # 404 page
├── components/
│   ├── ui/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── Card.tsx
│   └── seo/
│       ├── JsonLd.tsx        # Generic JSON-LD wrapper
│       └── MetaTags.tsx      # Common meta patterns
├── lib/
│   ├── database.ts           # Read-only SQLite connection
│   ├── queries.ts            # All query functions
│   └── utils.ts              # Slug generation, formatting
├── types/
│   └── index.ts              # All interfaces
└── tailwind.config.js        # Tailwind configuration
```

### Implementation Details

**Homepage content:**
- Hero section: "Find Real Estate Agents in Australia"
- Quick links to state pages
- Featured suburbs (Tier 1)
- Brief description of ARI

**Layout:**
- Header with navigation
- Footer with links
- Consistent max-width container

**Styling:**
- Tailwind CSS
- Mobile-responsive
- Clean, professional look

**Notes:**
- Tailwind v4 uses `@tailwindcss/postcss` and `@import "tailwindcss"` in `seo-site/app/globals.css`.
- `seo-site/lib/database.ts` resolves the DB path when running from either repo root or `seo-site/`.

### Verification

**V6.1: Dev server runs**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000 | head -20
kill %1
```
Expected: Returns HTML with content

**V6.2: Homepage renders correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3000
2. Verify: Title contains "ARI" or "Australian Real Estate"
3. Verify: Header navigation visible
4. Verify: Hero section with main heading
5. Verify: Footer visible
6. Screenshot: seo-homepage.png
```

**V6.3: Database connection works**
```bash
cd seo-site && npx ts-node -e "
const { getAllSuburbs } = require('./lib/queries');
console.log('Suburbs:', getAllSuburbs().length);
"
```
Expected: Returns 50

**V6.4: Homepage shows suburb links (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3000
2. Verify: At least 5 suburb links visible
3. Verify: Links have correct format (/agents-in/...)
4. Screenshot: seo-homepage-suburbs.png
```

**V6.5: 404 page works**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/nonexistent-page | grep -i "not found"
kill %1
```
Expected: Contains "not found" message

**V6.6: Mobile responsive (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3000
2. Set viewport to 375x667 (iPhone)
3. Verify: Content readable, no horizontal scroll
4. Verify: Mobile menu works (if hamburger menu)
5. Screenshot: seo-homepage-mobile.png
```

### Pass Criteria
- [ ] Dev server runs on port 3000
- [ ] Homepage renders with all sections
- [ ] Database queries work
- [ ] Header and footer on all pages
- [ ] 404 page exists
- [ ] Mobile responsive
- [ ] Tailwind CSS working
- [ ] All Playwright MCP tests pass

---

## Step 7: Agent Profile Pages
**Status:** [x]

### Implementation Notes
- Added `/agent/[slug]` static pages with `generateStaticParams()` backed by SQLite.
- Implemented agent UI components (header, bio, details, contact, awards, related agents) with graceful fallbacks.
- Added RealEstateAgent JSON-LD + canonical URLs via `generateMetadata()`.

### What to Build
Complete agent profile pages with all sections, schema markup, and proper SEO.

### Files to Create/Modify

```
seo-site/app/
├── agent/
│   └── [slug]/
│       └── page.tsx          # Agent profile page

seo-site/components/
├── agent/
│   ├── AgentHeader.tsx       # Photo, name, agency, location
│   ├── AgentBio.tsx          # Bio/description section
│   ├── AgentDetails.tsx      # Experience, languages, specializations
│   ├── AgentAwards.tsx       # Awards section
│   ├── AgentContact.tsx      # Contact information
│   └── AgentCard.tsx         # Card for listings
└── seo/
    └── AgentSchema.tsx       # JSON-LD for agent
```

### Implementation Details

**Page Sections (in order):**
1. Breadcrumbs: Home > NSW > Mosman > John Smith
2. Header: Photo, name, title, agency name, location
3. Contact: Phone, email, social links
4. About: enriched_bio or profile_text
5. Experience & Expertise: years, languages, specializations, property types
6. Awards: If awards array not empty
7. Agency Section: Agency name, link to agency page
8. Related Agents: 4 agents from same suburb
9. FAQs: Generated from available data

**SEO Requirements:**
- Title: "{Name} - Real Estate Agent in {Suburb} | {Agency} | ARI"
- Description: Generated from agent data (<160 chars)
- JSON-LD: RealEstateAgent schema
- Canonical URL

**Conditional Rendering:**
- Only show sections if data exists
- Graceful fallback for missing photos
- Show enriched_bio if available, else profile_text

### Verification

**V7.1: Build generates agent pages**
```bash
# First ensure we have agent data
sqlite3 data/ari.db "SELECT COUNT(*) FROM agents WHERE enrichment_status IN ('pending', 'complete');"

# Build
npm run build --prefix seo-site

# Check pages generated
ls seo-site/.next/server/app/agent/ | head -10
```
Expected: Agent directories exist

**V7.2: Agent page renders (Playwright MCP)**
```
Using Playwright MCP:
1. Start dev server
2. Get a valid agent slug from database
3. Navigate to http://localhost:3000/agent/{slug}
4. Verify: Agent name displayed in header
5. Verify: Agency name visible
6. Verify: Location (suburb, state) visible
7. Verify: Photo displayed (or placeholder)
8. Screenshot: agent-page-header.png
```

**V7.3: All sections render correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agent page
2. Verify: Breadcrumbs present and correct
3. Verify: Bio section exists
4. Verify: Contact section (phone/email if available)
5. Verify: Related agents section with 4 cards
6. Scroll to bottom
7. Screenshot: agent-page-full.png
```

**V7.4: Schema markup present**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agent/{known-slug} | grep -o 'application/ld+json' | head -1
curl -s http://localhost:3000/agent/{known-slug} | grep -o 'RealEstateAgent'
kill %1
```
Expected: Both found

**V7.5: Meta tags correct**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agent/{known-slug} | grep -o '<title>.*</title>'
curl -s http://localhost:3000/agent/{known-slug} | grep 'meta name="description"'
kill %1
```
Expected: Title contains agent name, description exists

**V7.6: Agent photo displays (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agent page with photo_url
2. Verify: Image element visible
3. Verify: Image actually loaded (not broken)
4. Screenshot: agent-photo.png
```

**V7.7: Related agents link correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agent page
2. Find related agent cards
3. Click on one
4. Verify: Navigates to different agent page
5. Verify: New agent page loads correctly
```

**V7.8: Mobile layout (Playwright MCP)**
```
Using Playwright MCP:
1. Set viewport to 375x667
2. Navigate to agent page
3. Verify: All content readable
4. Verify: Photo scales appropriately
5. Verify: No horizontal scroll
6. Screenshot: agent-page-mobile.png
```

### Pass Criteria
- [ ] Build succeeds with agent pages
- [ ] All page sections render correctly
- [ ] Schema markup (JSON-LD) present
- [ ] Meta title and description correct
- [ ] Photos display correctly
- [ ] Related agents section works
- [ ] Links navigate correctly
- [ ] Mobile responsive
- [ ] All Playwright MCP tests pass

---

## Step 8: Agency Pages
**Status:** [ ]

### What to Build
Complete agency pages showing agency info and full agent roster.

### Files to Create/Modify

```
seo-site/app/
├── agency/
│   └── [slug]/
│       └── page.tsx          # Agency page

seo-site/components/
├── agency/
│   ├── AgencyHeader.tsx      # Logo, name, location
│   ├── AgencyInfo.tsx        # Contact, website, description
│   └── AgencyTeam.tsx        # Agent roster grid
└── seo/
    └── AgencySchema.tsx      # JSON-LD for agency
```

### Implementation Details

**Page Sections:**
1. Breadcrumbs: Home > NSW > Mosman > Ray White Mosman
2. Header: Logo, name, address
3. Contact: Phone, email, website
4. About: Description
5. Our Team: Grid of all agents with AgentCard
6. Other Agencies: Agencies in same suburb

**SEO Requirements:**
- Title: "{Agency Name} - {Suburb}, {State} | ARI"
- Description: Agency description or generated
- JSON-LD: RealEstateAgent schema (for agency)

### Verification

**V8.1: Build generates agency pages**
```bash
npm run build --prefix seo-site
ls seo-site/.next/server/app/agency/ | head -5
```
Expected: Agency directories exist

**V8.2: Agency page renders (Playwright MCP)**
```
Using Playwright MCP:
1. Get valid agency slug from database
2. Navigate to http://localhost:3000/agency/{slug}
3. Verify: Agency name in header
4. Verify: Address displayed
5. Verify: Logo displayed (or placeholder)
6. Screenshot: agency-page-header.png
```

**V8.3: Agent roster displays (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agency page
2. Scroll to "Our Team" section
3. Verify: Agent cards displayed
4. Verify: Each card has name and photo
5. Count cards match expected agent count
6. Screenshot: agency-page-team.png
```

**V8.4: Agent cards link to agent pages (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agency page
2. Click on first agent card
3. Verify: Navigates to agent page
4. Verify: Agent's agency matches original agency
```

**V8.5: Schema markup present**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agency/{slug} | grep 'application/ld+json'
kill %1
```
Expected: Found

**V8.6: Other agencies section (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agency page
2. Scroll to "Other Agencies" section
3. Verify: Shows other agencies in same suburb
4. Verify: Links work
```

### Pass Criteria
- [ ] Build succeeds with agency pages
- [ ] Agency info displays correctly
- [ ] Agent roster shows all agents
- [ ] Agent cards link correctly
- [ ] Schema markup present
- [ ] Other agencies section works
- [ ] Mobile responsive
- [ ] All Playwright MCP tests pass

---

## Step 9: Suburb Listing Pages
**Status:** [ ]

### What to Build
Complete suburb pages showing all agents and agencies in a suburb.

### Files to Create/Modify

```
seo-site/app/
├── agents-in/
│   └── [slug]/
│       └── page.tsx          # Suburb listing page

seo-site/components/
├── suburb/
│   ├── SuburbHeader.tsx      # Title, agent count
│   ├── SuburbFilters.tsx     # Filter by language, specialization
│   ├── AgentGrid.tsx         # Grid of agent cards
│   └── AgencyList.tsx        # List of agencies
└── seo/
    └── SuburbSchema.tsx      # JSON-LD ItemList
```

### Implementation Details

**Page Sections:**
1. Breadcrumbs: Home > NSW > Mosman
2. Header: "{Count} Real Estate Agents in {Suburb}, {State} {Postcode}"
3. Intro text: Brief description
4. Filters: By language, by specialization (client-side)
5. Agent Grid: All agents in suburb
6. Agencies Section: All agencies in suburb
7. FAQs: Generated from data

**URL Pattern:** `/agents-in/mosman-nsw-2088`

**SEO Requirements:**
- Title: "{Count} Real Estate Agents in {Suburb}, {State} {Postcode} | ARI"
- JSON-LD: ItemList schema

### Verification

**V9.1: Build generates suburb pages**
```bash
npm run build --prefix seo-site
ls seo-site/.next/server/app/agents-in/ | grep -v '\[' | head -5
```
Expected: Suburb directories exist

**V9.2: Suburb page renders (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3000/agents-in/mosman-nsw-2088
2. Verify: Title shows agent count
3. Verify: Agent cards displayed
4. Verify: Agency list visible
5. Screenshot: suburb-page.png
```

**V9.3: Agent count matches database**
```bash
count=$(sqlite3 data/ari.db "SELECT COUNT(*) FROM agents WHERE primary_suburb = 'Mosman'")
echo "DB count: $count"

npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agents-in/mosman-nsw-2088 | grep -o '[0-9]* Real Estate Agents'
kill %1
```
Expected: Numbers match

**V9.4: Filters work (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to suburb page
2. Click on a language filter (if available)
3. Verify: Agent list updates
4. Verify: Only matching agents shown
5. Clear filter
6. Verify: All agents shown again
```

**V9.5: Agent cards link correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to suburb page
2. Click on first agent card
3. Verify: Navigates to agent page
4. Verify: Agent is from same suburb
```

**V9.6: Schema markup present**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agents-in/mosman-nsw-2088 | grep 'ItemList'
kill %1
```
Expected: Found

**V9.7: FAQs section (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to suburb page
2. Scroll to FAQs
3. Verify: At least 3 FAQ items
4. Verify: FAQs have relevant content
5. Screenshot: suburb-faqs.png
```

### Pass Criteria
- [ ] Build succeeds with suburb pages
- [ ] Agent count correct
- [ ] All agents displayed
- [ ] All agencies displayed
- [ ] Filters work (client-side)
- [ ] Schema markup present
- [ ] FAQs generated
- [ ] Mobile responsive
- [ ] All Playwright MCP tests pass

---

## Step 10: State Listing Pages
**Status:** [ ]

### What to Build
Complete state pages showing all suburbs in that state.

### Files to Create/Modify

```
seo-site/app/
├── agents-in/
│   └── [state]/
│       └── page.tsx          # State listing page

seo-site/components/
├── state/
│   ├── StateHeader.tsx       # Title, suburb count
│   ├── SuburbGrid.tsx        # Grid of suburb cards
│   └── SuburbCard.tsx        # Card showing suburb + agent count
└── seo/
    └── StateSchema.tsx       # JSON-LD
```

### Implementation Details

**Page Sections:**
1. Breadcrumbs: Home > NSW
2. Header: "Real Estate Agents in {State Full Name}"
3. Suburb Grid: All suburbs with agent counts
4. Grouped by region (Eastern Suburbs, North Shore, etc.)

**URL Pattern:** `/agents-in/nsw`

**State Mapping:**
- nsw → New South Wales
- vic → Victoria
- qld → Queensland
- etc.

### Verification

**V10.1: Build generates state pages**
```bash
npm run build --prefix seo-site
ls seo-site/.next/server/app/agents-in/nsw/
```
Expected: Page exists

**V10.2: State page renders (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3000/agents-in/nsw
2. Verify: Title shows "New South Wales"
3. Verify: Suburb cards displayed
4. Verify: Each card shows agent count
5. Screenshot: state-page.png
```

**V10.3: Suburb count matches**
```bash
count=$(sqlite3 data/ari.db "SELECT COUNT(DISTINCT suburb_name) FROM scrape_progress WHERE state = 'NSW'")
echo "DB suburbs: $count"
```

**V10.4: Suburb cards link correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to state page
2. Click on "Mosman" card
3. Verify: Navigates to /agents-in/mosman-nsw-2088
4. Verify: Suburb page loads correctly
```

**V10.5: Regional grouping (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to state page
2. Verify: Suburbs grouped by region
3. Verify: "Eastern Suburbs" section exists
4. Verify: "North Shore" section exists
5. Screenshot: state-regions.png
```

### Pass Criteria
- [ ] Build succeeds with state pages
- [ ] All suburbs displayed with counts
- [ ] Regional grouping works
- [ ] Links to suburb pages work
- [ ] Schema markup present
- [ ] Mobile responsive
- [ ] All Playwright MCP tests pass

---

## Step 11: Enrichment Skill (Claude Agent SDK)
**Status:** [ ]

### What to Build
Complete Claude Agent SDK Enrichment skill that enhances agent profiles via web research.

### Files to Create/Modify

```
control-center/src/
├── skills/
│   ├── enrichment/
│   │   ├── index.ts          # Main enrichment function
│   │   ├── main-agent.ts     # Orchestrator
│   │   ├── research-agent.ts # Sub-agent for research
│   │   ├── prompts.ts        # Prompt templates
│   │   └── validators.ts     # Output validation
│   └── shared/
│       └── schemas.ts        # Add enrichment schemas
└── routes/
    └── enrichment.ts         # Update to use real skill
```

### Implementation Details

**Enrichment Flow:**
1. Select batch of agents (enrichment_status = 'pending')
2. Main agent divides into groups of 5-10
3. Sub-agents research each agent:
   - LinkedIn search
   - Agency website bio
   - Google search
4. Extract: years_experience, languages, specializations, awards
5. Generate enriched_bio
6. Store results

**Data to Extract:**
- years_experience (number)
- years_experience_source ('linkedin', 'agency_website', 'inferred')
- career_start_year (number)
- languages (array - ONLY if explicitly stated)
- specializations (array)
- property_types (array)
- awards (array with name, year, level)
- linkedin_url
- enriched_bio (generated description)

**Critical Rules:**
- NEVER assume languages from names
- NEVER make up experience
- Set confidence level for each agent

### Verification

**V11.1: Enrichment skill runs without error**
```bash
cd control-center && npx ts-node -e "
const { runEnrichment } = require('./src/skills/enrichment');
runEnrichment({ limit: 5, dryRun: true })
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Error:', e.message));
"
```
Expected: Returns status

**V11.2: Enrichment processes agents (live run)**
```bash
cd control-center && npx ts-node -e "
const { runEnrichment } = require('./src/skills/enrichment');
const { getAgentsPendingEnrichment } = require('./src/db/queries');

async function test() {
  const before = getAgentsPendingEnrichment(100).length;
  await runEnrichment({ limit: 5 });
  const after = getAgentsPendingEnrichment(100).length;
  console.log('Before:', before, 'After:', after);
}
test();
"
```
Expected: After count is less than before

**V11.3: Enriched data stored correctly**
```bash
sqlite3 data/ari.db "
SELECT first_name, last_name, years_experience, languages, enrichment_status
FROM agents
WHERE enrichment_status = 'complete'
LIMIT 5;
"
```
Expected: Shows enriched data

**V11.4: Languages not assumed from names**
```bash
sqlite3 data/ari.db "
SELECT first_name, last_name, languages, years_experience_source
FROM agents
WHERE enrichment_status = 'complete'
AND languages IS NOT NULL
AND languages != '[]'
LIMIT 5;
"
```
Manual check: Verify languages are realistic, not assumed from ethnic names

**V11.5: Experience values are plausible**
```bash
sqlite3 data/ari.db "
SELECT years_experience, COUNT(*)
FROM agents
WHERE enrichment_status = 'complete'
AND years_experience IS NOT NULL
GROUP BY years_experience
ORDER BY years_experience;
"
```
Expected: Values between 0-50, reasonable distribution

**V11.6: Enriched bio quality (spot check)**
```bash
sqlite3 data/ari.db "
SELECT first_name, last_name, enriched_bio
FROM agents
WHERE enrichment_status = 'complete'
AND enriched_bio IS NOT NULL
ORDER BY RANDOM()
LIMIT 3;
"
```
Manual check: Bios are coherent, professional, factual

**V11.7: API endpoint works**
```bash
npm run dev:control &
sleep 3
curl -s -X POST http://localhost:3001/api/enrichment/run \
  -H "Content-Type: application/json" \
  -d '{"limit":5}' | jq '.status'
kill %1
```
Expected: Returns running/success status

### Pass Criteria
- [ ] Enrichment skill executes without errors
- [ ] Agents get enriched data
- [ ] years_experience is plausible (0-50)
- [ ] languages NOT assumed from names
- [ ] enriched_bio is coherent and professional
- [ ] All sources tracked
- [ ] API endpoint works
- [ ] Constraint validation passes

---

## Step 12: Control Center UI - Enrichment
**Status:** [ ]

### What to Build
Add enrichment controls and progress display to Control Center UI.

### Files to Modify

```
control-center/
├── public/
│   ├── index.html            # Add enrichment panel
│   └── app.js                # Add enrichment functionality
└── src/
    └── routes/
        └── agents.ts         # Add enrichment status endpoint
```

### Implementation Details

**UI Additions:**
1. **Enrichment Panel**
   - Shows agents pending enrichment (count)
   - "Run Enrichment" button with batch size input
   - Progress bar during enrichment

2. **Agent Status in Suburb Detail**
   - Show enrichment status per agent
   - Color coding: pending (gray), complete (green), failed (red)
   - Quality indicator (high/medium/low)

3. **Activity Log Updates**
   - Enrichment progress events
   - Per-agent completion status

### Verification

**V12.1: Enrichment panel visible (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3001
2. Verify: Enrichment panel visible
3. Verify: Shows pending count
4. Verify: "Run Enrichment" button exists
5. Screenshot: control-enrichment-panel.png
```

**V12.2: Enrichment trigger works (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to Control Center
2. Set batch size to 3
3. Click "Run Enrichment"
4. Verify: Progress bar appears
5. Verify: Activity log shows progress
6. Wait for completion
7. Verify: Pending count decreased
8. Screenshot: control-enrichment-complete.png
```

**V12.3: Agent enrichment status shown (Playwright MCP)**
```
Using Playwright MCP:
1. Select a discovered suburb
2. Verify: Each agent shows enrichment status
3. Verify: Color coding correct
4. Screenshot: control-agent-status.png
```

**V12.4: Quality indicators displayed (Playwright MCP)**
```
Using Playwright MCP:
1. View agents with enrichment complete
2. Verify: Quality indicator visible (high/medium/low)
3. Verify: Corresponds to enrichment_quality in DB
```

### Pass Criteria
- [ ] Enrichment panel displays correctly
- [ ] Pending count accurate
- [ ] Run Enrichment button works
- [ ] Progress displayed during enrichment
- [ ] Agent enrichment status shown
- [ ] Quality indicators work
- [ ] Activity log shows enrichment events
- [ ] All Playwright MCP tests pass

---

## Step 13: Enriched Data in SEO Pages
**Status:** [ ]

### What to Build
Display all enriched data in SEO site pages.

### Files to Modify

```
seo-site/components/
├── agent/
│   ├── AgentDetails.tsx      # Add enriched fields
│   ├── AgentAwards.tsx       # Display awards
│   └── AgentBio.tsx          # Prefer enriched_bio
└── seo/
    └── AgentSchema.tsx       # Add enriched data to schema
```

### Implementation Details

**Agent Page Updates:**
1. Bio: Show enriched_bio if available, else profile_text
2. Experience: Show years with source
3. Languages: Display as chips/tags
4. Specializations: Display as chips/tags
5. Property Types: Display as list
6. Awards: Show with year and level
7. LinkedIn: Link if available

**FAQ Generation:**
Generate FAQs dynamically based on available data:
- "How long has {name} been in real estate?" (if years_experience)
- "What languages does {name} speak?" (if languages)
- "What areas does {name} specialize in?" (if specializations)

### Verification

**V13.1: Enriched bio displays (Playwright MCP)**
```
Using Playwright MCP:
1. Find agent with enriched_bio in DB
2. Navigate to their page
3. Verify: Bio section shows enriched_bio content
4. Verify: Bio is different from profile_text
5. Screenshot: agent-enriched-bio.png
```

**V13.2: Experience displays (Playwright MCP)**
```
Using Playwright MCP:
1. Find agent with years_experience
2. Navigate to their page
3. Verify: Experience section visible
4. Verify: Shows "X years in real estate"
5. Screenshot: agent-experience.png
```

**V13.3: Languages display (Playwright MCP)**
```
Using Playwright MCP:
1. Find agent with languages
2. Navigate to their page
3. Verify: Languages section visible
4. Verify: Languages shown as tags/chips
5. Screenshot: agent-languages.png
```

**V13.4: Awards display (Playwright MCP)**
```
Using Playwright MCP:
1. Find agent with awards
2. Navigate to their page
3. Verify: Awards section visible
4. Verify: Award name, year, level shown
5. Screenshot: agent-awards.png
```

**V13.5: FAQs generated correctly (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to agent with full enriched data
2. Scroll to FAQs
3. Verify: FAQs reflect actual data
4. Verify: Experience FAQ has correct years
5. Verify: Language FAQ lists correct languages
6. Screenshot: agent-faqs-enriched.png
```

**V13.6: Schema includes enriched data**
```bash
npm run dev:seo &
sleep 5
curl -s http://localhost:3000/agent/{enriched-slug} | grep -o '"knowsLanguage"'
kill %1
```
Expected: Found (if agent has languages)

**V13.7: Conditional rendering works (Playwright MCP)**
```
Using Playwright MCP:
1. Find agent with minimal enrichment (low quality)
2. Navigate to their page
3. Verify: Missing sections not shown (no empty sections)
4. Verify: Page still looks complete
5. Screenshot: agent-minimal-enrichment.png
```

### Pass Criteria
- [ ] Enriched bio displays when available
- [ ] Experience displays with years
- [ ] Languages display as tags
- [ ] Specializations display
- [ ] Awards display with details
- [ ] FAQs generated from actual data
- [ ] Schema markup includes enriched data
- [ ] Missing data handled gracefully (no empty sections)
- [ ] All Playwright MCP tests pass

---

## Step 14: Control Center UI - Complete
**Status:** [ ]

### What to Build
Complete all remaining Control Center UI functionality for full pipeline control.

### Files to Modify

```
control-center/
├── public/
│   ├── index.html            # Complete UI
│   ├── styles.css            # Final styling
│   └── app.js                # All functionality
└── src/
    └── routes/
        └── stats.ts          # Statistics endpoint
```

### Implementation Details

**Complete UI Features:**
1. **Dashboard Summary**
   - Total agencies, agents, suburbs processed
   - Enrichment completion percentage
   - Recent activity

2. **Suburb Selection**
   - Multi-select capability
   - Select by tier
   - Select by region

3. **Pipeline Controls**
   - Run Discovery (single or batch)
   - Run Enrichment (configurable batch size)
   - Activity log with filtering

4. **Status Overview**
   - Suburbs by status
   - Agents by enrichment status
   - Quality distribution

5. **Error Handling**
   - Show failed operations
   - Retry button for failed items

### Verification

**V14.1: Dashboard summary (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to http://localhost:3001
2. Verify: Dashboard shows total counts
3. Verify: Counts match database
4. Screenshot: control-dashboard.png
```

**V14.2: Multi-suburb selection (Playwright MCP)**
```
Using Playwright MCP:
1. Select "Tier 1" filter
2. Click "Select All" (if available) or select 3 suburbs
3. Verify: Multiple suburbs highlighted
4. Verify: Selected count shown
5. Screenshot: control-multi-select.png
```

**V14.3: Batch discovery (Playwright MCP)**
```
Using Playwright MCP:
1. Select 2 suburbs
2. Click "Run Discovery"
3. Verify: Both suburbs start processing
4. Verify: Activity log shows both
5. Wait for completion
6. Verify: Both marked complete
```

**V14.4: Status filtering (Playwright MCP)**
```
Using Playwright MCP:
1. Click "Discovered" status filter
2. Verify: Only discovered suburbs shown
3. Click "Pending" filter
4. Verify: Only pending suburbs shown
5. Click "All" to reset
```

**V14.5: Error display and retry (Playwright MCP)**
```
Using Playwright MCP:
1. Find a suburb with failed status (or simulate)
2. Verify: Error message displayed
3. Click "Retry" button
4. Verify: Operation restarts
```

**V14.6: Activity log filtering (Playwright MCP)**
```
Using Playwright MCP:
1. Trigger some operations
2. Click filter for "Errors only"
3. Verify: Only error entries shown
4. Click filter for "Discovery"
5. Verify: Only discovery entries shown
```

**V14.7: Responsive design (Playwright MCP)**
```
Using Playwright MCP:
1. Set viewport to tablet size (768x1024)
2. Verify: UI still usable
3. Set viewport to mobile (375x667)
4. Verify: Panels stack vertically
5. Screenshot: control-mobile.png
```

### Pass Criteria
- [ ] Dashboard shows accurate summary
- [ ] Multi-suburb selection works
- [ ] Batch operations work
- [ ] Status filtering works
- [ ] Error handling with retry
- [ ] Activity log filtering
- [ ] Responsive design
- [ ] All Playwright MCP tests pass

---

## Step 15: End-to-End Flow Tests
**Status:** [ ]

### What to Build
Comprehensive end-to-end tests verifying the complete pipeline works.

### Test Scenarios

**Scenario 1: Fresh Suburb Pipeline**
```
1. Start with a suburb that has no data
2. Run Discovery via Control Center UI
3. Verify agencies and agents appear in database
4. Verify suburb page shows agents
5. Run Enrichment via Control Center UI
6. Verify enriched data in database
7. Verify agent pages show enriched data
```

**Scenario 2: Navigation Flow**
```
1. Start at homepage
2. Navigate to state page (NSW)
3. Click on a suburb
4. Click on an agent
5. Click on their agency
6. Verify breadcrumbs work back
```

**Scenario 3: Data Consistency**
```
1. Count agents in database for suburb X
2. Count agents on suburb page
3. Verify counts match
4. Verify each agent card links to valid page
```

**Scenario 4: SEO Verification**
```
1. Check homepage schema markup
2. Check state page schema markup
3. Check suburb page schema markup
4. Check agent page schema markup
5. Check agency page schema markup
6. Verify all pages have meta descriptions
```

### Verification

**V15.1: Fresh suburb pipeline (Playwright MCP)**
```
Using Playwright MCP:
1. Open Control Center at localhost:3001
2. Find suburb with status "pending" (e.g., "Coogee")
3. Select it and click "Run Discovery"
4. Wait for completion (watch activity log)
5. Verify: Status changed to "discovered"
6. Verify: Agency count > 0

7. Open new tab to localhost:3000
8. Navigate to /agents-in/coogee-nsw-2034
9. Verify: Page loads with agents
10. Screenshot: e2e-suburb-after-discovery.png

11. Switch to Control Center
12. Run Enrichment for 5 agents
13. Wait for completion

14. Switch to SEO site
15. Navigate to an enriched agent
16. Verify: Enriched data displayed
17. Screenshot: e2e-agent-enriched.png
```

**V15.2: Navigation flow (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to localhost:3000
2. Click on "NSW" or state link
3. Verify: State page loads
4. Click on "Mosman" suburb
5. Verify: Suburb page loads with agents
6. Click on first agent
7. Verify: Agent page loads
8. Click on agency link
9. Verify: Agency page loads
10. Use breadcrumbs to go back to suburb
11. Verify: Suburb page loads
12. Screenshot: e2e-navigation-complete.png
```

**V15.3: Data consistency (Playwright MCP)**
```
Using Playwright MCP:
1. Query database for Mosman agent count
2. Navigate to Mosman suburb page
3. Count agent cards on page
4. Verify: Counts match
5. Click on 3 random agent cards
6. Verify: All 3 pages load correctly
7. Verify: All 3 are from Mosman
```

**V15.4: All links work (Playwright MCP)**
```
Using Playwright MCP:
1. Navigate to Mosman suburb page
2. Collect all links on page
3. Visit each internal link
4. Verify: No 404 errors
5. Report any broken links
```

**V15.5: Schema markup audit**
```bash
npm run dev:seo &
sleep 5

# Homepage
curl -s localhost:3000 | grep 'application/ld+json' | wc -l

# State page
curl -s localhost:3000/agents-in/nsw | grep 'application/ld+json' | wc -l

# Suburb page
curl -s localhost:3000/agents-in/mosman-nsw-2088 | grep 'ItemList' | wc -l

# Agent page
curl -s localhost:3000/agent/{slug} | grep 'RealEstateAgent' | wc -l

# Agency page
curl -s localhost:3000/agency/{slug} | grep 'application/ld+json' | wc -l

kill %1
```
Expected: All return at least 1

**V15.6: Meta descriptions present**
```bash
npm run dev:seo &
sleep 5

for page in "/" "/agents-in/nsw" "/agents-in/mosman-nsw-2088" "/agent/{slug}"; do
  desc=$(curl -s "localhost:3000$page" | grep -o '<meta name="description".*>')
  echo "$page: ${desc:0:50}..."
done

kill %1
```
Expected: All pages have meta descriptions

**V15.7: Mobile responsiveness (Playwright MCP)**
```
Using Playwright MCP:
1. Set viewport to 375x667
2. Navigate through: Home → State → Suburb → Agent → Agency
3. Verify: All pages readable
4. Verify: No horizontal scroll on any page
5. Verify: Touch targets are adequate size
6. Screenshot each page in mobile view
```

**V15.8: Build verification**
```bash
npm run build --prefix seo-site

# Count generated pages
agent_count=$(ls seo-site/.next/server/app/agent/ 2>/dev/null | wc -l)
agency_count=$(ls seo-site/.next/server/app/agency/ 2>/dev/null | wc -l)
suburb_count=$(ls seo-site/.next/server/app/agents-in/ 2>/dev/null | grep -v '\[' | wc -l)

echo "Agents: $agent_count"
echo "Agencies: $agency_count"
echo "Suburbs: $suburb_count"

# Verify matches database
db_agents=$(sqlite3 data/ari.db "SELECT COUNT(*) FROM agents WHERE enrichment_status = 'complete'")
echo "DB Agents: $db_agents"
```
Expected: Page counts approximately match database counts

### Pass Criteria
- [ ] Fresh suburb discovery → enrichment → display works
- [ ] Navigation flow works end-to-end
- [ ] Data counts consistent between DB and pages
- [ ] All internal links work (no 404s)
- [ ] Schema markup on all page types
- [ ] Meta descriptions on all pages
- [ ] Mobile responsive throughout
- [ ] Build generates correct page counts
- [ ] All Playwright MCP tests pass

---

## Summary

| Step | Description | Key Verification |
|------|-------------|------------------|
| 1 | Project Scaffolding | `npm run dev` starts both apps |
| 2 | Database Layer | All tables exist, queries work |
| 3 | Control Center Server | API endpoints respond |
| 4 | Discovery Skill | Finds agencies + agents with photo URLs |
| 5 | Control Center UI - Discovery | Full UI with real-time logs |
| 6 | SEO Site Foundation | Homepage renders, DB connected |
| 7 | Agent Pages | All sections, schema markup |
| 8 | Agency Pages | Team roster, schema markup |
| 9 | Suburb Pages | Agent grid, filters, FAQs |
| 10 | State Pages | Suburb grid by region |
| 11 | Enrichment Skill | All enriched fields, quality validation |
| 12 | Control Center UI - Enrichment | Enrichment controls, status display |
| 13 | Enriched Data in Pages | All enriched fields displayed |
| 14 | Control Center UI - Complete | Full pipeline control |
| 15 | End-to-End Tests | Complete flow verification |

**Total: 15 steps to complete application**
