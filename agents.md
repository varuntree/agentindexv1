# ARI Development Standards

> **Read this before any implementation task.**

---

## 1. Architecture

```
ari/
├── control-center/      # Node.js - data pipeline, Claude SDK
├── seo-site/            # Next.js 14 - static pages
├── data/ari.db          # SQLite (shared, single file)
├── scripts/             # Setup, dev, test scripts
└── package.json         # Root scripts
```

```
Control Center (localhost:3001)     SEO Site (localhost:3000)
├── Claude Discovery Skill          ├── Static page generation
├── Claude Enrichment Skill         ├── Read-only DB access
├── Read/Write SQLite               └── Schema markup, SEO
└── Pipeline UI
            │
            └──────> data/ari.db <──────┘
```

**LOCAL DEVELOPMENT ONLY**: No deployment, no hosting. All development and testing runs locally until the entire application is complete.

---

## 2. Commands

### Setup (first time)
```bash
npm run setup    # Install all deps, create DB, seed data, create .env
```

### Development
```bash
npm run dev           # Both apps (Control Center :3001, SEO Site :3000)
npm run dev:control   # Control Center only
npm run dev:seo       # SEO Site only
```

### Testing
```bash
npm test              # All tests
npm run test:db       # Database schema/queries
npm run test:build    # Next.js build verification
```

### Server for Testing
```bash
# Start, test, kill pattern
npm run dev:seo &
PID=$!
sleep 3
curl http://localhost:3000/health
kill $PID

# Or use helper
npm run test:with-server -- "curl http://localhost:3000/agent/test-slug"
```

---

## 3. Code Standards

### TypeScript
- Strict mode, no `any` (use `unknown`)
- Explicit return types on exports
- Interfaces over types for objects

### Files
- `kebab-case.ts` for files
- `PascalCase.tsx` for React components
- Absolute imports: `import { db } from '@/lib/database'`

### Errors
```typescript
// Always log with context, return typed results
async function getAgent(slug: string): Promise<Agent | null> {
  try {
    return db.prepare('SELECT * FROM agents WHERE slug = ?').get(slug);
  } catch (error) {
    console.error('[getAgent]', { slug, error });
    return null;
  }
}
```

### Never Do
- `any` type
- Commit secrets/API keys
- `var` (use `const`/`let`)
- Default exports (except Next.js pages)
- Mutate function parameters
- `console.log` in production (use logger)
- Write to DB from SEO site
- Scrape Rate My Agent or competitors
- Assume languages from agent names

---

## 4. Control Center (Node.js)

```
control-center/src/
├── index.ts              # Entry
├── server.ts             # Express setup
├── routes/               # API endpoints
│   ├── discovery.ts
│   └── enrichment.ts
├── skills/               # Claude Agent SDK
│   ├── discovery/
│   └── enrichment/
├── db/
│   ├── database.ts       # Connection
│   ├── queries.ts        # Query functions
│   └── migrations/
└── lib/
    └── logger.ts
```

### API Route Pattern
```typescript
router.post('/run', async (req, res) => {
  const { suburb, state } = req.body;
  if (!suburb || !state) {
    return res.status(400).json({ error: 'suburb and state required' });
  }
  try {
    const result = await runDiscovery({ suburb, state });
    res.json({ success: true, result });
  } catch (error) {
    console.error('[POST /discovery/run]', error);
    res.status(500).json({ error: 'Discovery failed' });
  }
});
```

### Database Access
```typescript
// Parameterized queries only
const stmt = db.prepare('SELECT * FROM agents WHERE slug = ?');
const agent = stmt.get(slug);
```

---

## 5. SEO Site (Next.js)

```
seo-site/app/
├── layout.tsx
├── page.tsx                    # Homepage
├── agent/[slug]/page.tsx       # Agent profiles
├── agency/[slug]/page.tsx      # Agency pages
├── agents-in/
│   ├── [state]/page.tsx        # State listing
│   └── [slug]/page.tsx         # Suburb listing
├── sitemap.ts
└── robots.ts
```

### Page Pattern
```typescript
// Static generation - runs at build time
export async function generateStaticParams() {
  const agents = db.prepare(
    "SELECT slug FROM agents WHERE enrichment_status = 'complete'"
  ).all();
  return agents.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const agent = await getAgentBySlug(params.slug);
  return {
    title: `${agent.first_name} ${agent.last_name} - Real Estate Agent | ARI`,
    description: generateAgentDescription(agent),
  };
}

export default async function AgentPage({ params }) {
  const agent = await getAgentBySlug(params.slug);
  return (
    <>
      <AgentSchema agent={agent} />
      <AgentHeader agent={agent} />
    </>
  );
}
```

### SEO Requirements (Every Page)
1. Unique `<title>`
2. Meta description (<160 chars)
3. JSON-LD schema markup
4. Breadcrumbs
5. Canonical URL

### Never Do (SEO Site)
- Write to database
- Client-side fetch for main content
- `use client` on pages
- Skip schema markup

---

## 6. Database

**Location**: `./data/ari.db` (SQLite, shared by both apps)

### Conventions
- Tables: lowercase plural (`agents`, `agencies`)
- Columns: snake_case (`first_name`, `created_at`)
- Primary key: `id INTEGER PRIMARY KEY`
- Foreign keys: `{table}_id`

### JSON Columns
```sql
languages TEXT  -- '["English", "Mandarin"]'
```
```typescript
const languages: string[] = JSON.parse(agent.languages || '[]');
```

### Adding Fields
1. Migration: `control-center/src/db/migrations/00X_add_field.ts`
2. Update interface in `types/index.ts`
3. Update relevant queries
4. Run: `npm run db:migrate`

### Query Pattern
```typescript
export function getAgentBySlug(slug: string): Agent | null {
  return db.prepare(`
    SELECT a.*, ag.name as agency_name
    FROM agents a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.slug = ?
  `).get(slug) as Agent | null;
}
```

---

## 7. Testing

### By Layer

| Layer | Method | Pass Criteria |
|-------|--------|---------------|
| Database | `npm run test:db` | Queries return correct types |
| Discovery | Run + query DB | >=3 agencies, >=10 agents found |
| Enrichment | Run + validate constraints | All constraints pass |
| Build | `npm run build --prefix seo-site` | Exit code 0 |
| Pages | Grep generated HTML | Schema markup present |

### Database Test
```bash
sqlite3 data/ari.db "
  SELECT 'Agencies:', COUNT(*) FROM agencies;
  SELECT 'Agents:', COUNT(*) FROM agents;
"
```

### Build Verification
```bash
npm run build --prefix seo-site

# Verify pages generated
ls .next/server/app/agent/ | wc -l

# Verify schema markup
grep -r "RealEstateAgent" .next/server/app/agent/ | wc -l
```

### AI Content Validation
Automated constraints:
```typescript
function validateEnrichment(agent: Agent): boolean {
  if (agent.years_experience !== null) {
    if (agent.years_experience < 0 || agent.years_experience > 50) return false;
  }
  if (agent.languages.length > 0 && !agent.sources_found?.length) return false;
  if (agent.enriched_bio) {
    if (agent.enriched_bio.length < 50 || agent.enriched_bio.length > 1000) return false;
  }
  return true;
}
```

Manual spot-check (5 random samples per batch):
```bash
sqlite3 data/ari.db "
  SELECT first_name, last_name, enriched_bio, years_experience, languages
  FROM agents WHERE enrichment_status = 'complete'
  ORDER BY RANDOM() LIMIT 5;
"
```
Verify: Bio sounds natural, experience plausible, languages not assumed from name.

---

## 8. Common Tasks

### Add Field to Agents
```bash
# 1. Create migration
# 2. Update types/index.ts interface
# 3. Update queries
# 4. npm run db:migrate
```

### Add New Page Type
```bash
# 1. Create seo-site/app/new-page/[slug]/page.tsx
# 2. Implement generateStaticParams()
# 3. Add schema component
# 4. Update sitemap.ts
# 5. npm run build --prefix seo-site
```

### Quick DB Query
```bash
sqlite3 data/ari.db "SELECT suburb, COUNT(*) FROM agencies GROUP BY suburb"
```

### Health Check
```bash
npm run health   # Shows DB counts, last runs, status
```

---

## 9. Ports & Environment

| Service | Port |
|---------|------|
| SEO Site | 3000 |
| Control Center | 3001 |

Environment variables in `.env` at root (both apps read from there).

Required:
- `ANTHROPIC_API_KEY`

Optional:
- `DATABASE_PATH` (defaults to `./data/ari.db`)
