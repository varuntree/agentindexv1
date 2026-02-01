# 05 - Control Center

**Domain:** Admin Application (Node.js)
**Last Updated:** 2026-02-01

---

## Index

1. [Overview](#overview)
2. [Application Structure](#application-structure)
3. [Express Server](#express-server)
4. [API Endpoints](#api-endpoints)
5. [UI Design](#ui-design)
6. [Suburb Panel](#suburb-panel)
7. [Agency Panel](#agency-panel)
8. [Action Buttons](#action-buttons)
9. [Activity Log](#activity-log)
10. [Real-time Updates](#real-time-updates)
11. [Frontend Implementation](#frontend-implementation)
12. [State Management](#state-management)

---

## Overview

The Control Center is a **local Node.js application** that manages the entire ARI data pipeline:

- Running Claude Discovery Skill to find agencies and agents
- Running Claude Enrichment Skill to enhance agent profiles
- Triggering Vercel deployments
- Monitoring progress and logs

### Characteristics

| Property | Value |
|----------|-------|
| Framework | Node.js + Express |
| Frontend | Single HTML page + vanilla JS |
| Database | SQLite (read/write) |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Local machine |

### Why Local?

- **Security** - API keys stay on your machine
- **Cost** - No hosting costs for admin tool
- **Simplicity** - No deployment pipeline needed
- **Control** - Manual triggers, not automated

---

## Application Structure

```
control-center/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # Express server setup
│   │
│   ├── skills/                     # Claude Agent SDK skills
│   │   ├── discovery/
│   │   │   ├── pipeline.ts         # Discovery orchestrator
│   │   │   └── prompts.ts          # Discovery prompts
│   │   ├── enrichment/
│   │   │   ├── pipeline.ts         # Enrichment orchestrator
│   │   │   └── prompts.ts          # Enrichment prompts
│   │   └── shared/
│   │       ├── output-schema.ts    # SubAgentOutput (shared)
│   │       └── cost-tracker.ts     # Cost management
│   │
│   ├── db/
│   │   ├── database.ts             # SQLite connection
│   │   ├── schema.sql              # Table definitions
│   │   └── queries.ts              # Prepared statements
│   │
│   ├── deploy/
│   │   └── vercel.ts               # Deploy hook trigger
│   │
│   ├── routes/
│   │   ├── suburbs.ts              # Suburb endpoints
│   │   ├── agencies.ts             # Agency endpoints
│   │   ├── agents.ts               # Agent endpoints
│   │   ├── discovery.ts            # Discovery endpoints
│   │   ├── enrichment.ts           # Enrichment endpoints
│   │   ├── deploy.ts               # Deploy endpoints
│   │   └── events.ts               # SSE endpoint
│   │
│   └── utils/
│       ├── logger.ts               # Logging with SSE broadcast
│       └── slug.ts                 # Slug generation
│
├── public/
│   ├── index.html                  # Main UI
│   ├── styles.css                  # Styles
│   └── app.js                      # Frontend JavaScript
│
├── data/
│   └── ari.db                      # SQLite database
│
├── package.json
├── tsconfig.json
└── .env                            # Environment variables
```

---

## Express Server

### Server Setup

```typescript
// src/server.ts
import express from 'express';
import path from 'path';
import { suburbRoutes } from './routes/suburbs';
import { agencyRoutes } from './routes/agencies';
import { agentRoutes } from './routes/agents';
import { enrichmentRoutes } from './routes/enrichment';
import { deployRoutes } from './routes/deploy';
import { eventsRouter } from './routes/events';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/suburbs', suburbRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/events', eventsRouter);

// Serve UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

export function startServer() {
  app.listen(PORT, () => {
    console.log(`[SERVER] Control Center running at http://localhost:${PORT}`);
  });
}
```

### Entry Point

```typescript
// src/index.ts
import 'dotenv/config';
import { startServer } from './server';
import { initializeDatabase } from './db/database';

async function main() {
  console.log('[INIT] Starting ARI Control Center...');

  // Initialize database
  await initializeDatabase();

  // Start server
  startServer();
}

main().catch(console.error);
```

---

## API Endpoints

### Suburb Endpoints

```typescript
// src/routes/suburbs.ts
import { Router } from 'express';
import { db } from '../db/database';

export const suburbRoutes = Router();

// GET /api/suburbs - List all suburbs with progress
suburbRoutes.get('/', (req, res) => {
  const suburbs = db.prepare(`
    SELECT
      sp.*,
      (SELECT COUNT(*) FROM agencies WHERE suburb = sp.suburb_name) as agency_count,
      (SELECT COUNT(*) FROM agents a
       JOIN agencies ag ON a.agency_id = ag.id
       WHERE ag.suburb = sp.suburb_name) as agent_count
    FROM scrape_progress sp
    ORDER BY sp.priority_tier ASC, sp.priority_rank ASC
  `).all();

  res.json(suburbs);
});

// GET /api/suburbs/:id - Get suburb details
suburbRoutes.get('/:id', (req, res) => {
  const suburb = db.prepare(`
    SELECT * FROM scrape_progress WHERE id = ?
  `).get(req.params.id);

  if (!suburb) {
    return res.status(404).json({ error: 'Suburb not found' });
  }

  res.json(suburb);
});

// POST /api/suburbs/:id/discover - Run discovery for suburb
suburbRoutes.post('/:id/discover', async (req, res) => {
  const suburb = db.prepare(`
    SELECT * FROM scrape_progress WHERE id = ?
  `).get(req.params.id);

  if (!suburb) {
    return res.status(404).json({ error: 'Suburb not found' });
  }

  // Start discovery in background
  discoveryPipeline.discoverSuburb(suburb.suburb_name, suburb.state)
    .catch(console.error);

  res.json({ message: 'Discovery started', suburb_id: suburb.suburb_id });
});
```

### Agency Endpoints

```typescript
// src/routes/agencies.ts
import { Router } from 'express';
import { db } from '../db/database';

export const agencyRoutes = Router();

// GET /api/agencies - List agencies (with optional suburb filter)
agencyRoutes.get('/', (req, res) => {
  const { suburb } = req.query;

  let query = `
    SELECT
      ag.*,
      (SELECT COUNT(*) FROM agents WHERE agency_id = ag.id) as agent_count,
      (SELECT COUNT(*) FROM agents WHERE agency_id = ag.id AND enrichment_status = 'complete') as agents_enriched
    FROM agencies ag
  `;

  if (suburb) {
    query += ` WHERE ag.suburb = ?`;
  }

  query += ` ORDER BY ag.brand_tier ASC, ag.name ASC`;

  const agencies = suburb
    ? db.prepare(query).all(suburb)
    : db.prepare(query).all();

  res.json(agencies);
});

// GET /api/agencies/:id/agents - Get agents for agency
agencyRoutes.get('/:id/agents', (req, res) => {
  const agents = db.prepare(`
    SELECT * FROM agents
    WHERE agency_id = ?
    ORDER BY last_name ASC
  `).all(req.params.id);

  res.json(agents);
});
```

### Enrichment Endpoints

```typescript
// src/routes/enrichment.ts
import { Router } from 'express';
import { enrichmentPipeline } from '../enrichment/pipeline';
import { db } from '../db/database';

export const enrichmentRoutes = Router();

// GET /api/enrichment/status - Get enrichment status
enrichmentRoutes.get('/status', (req, res) => {
  const stats = db.prepare(`
    SELECT
      enrichment_status,
      COUNT(*) as count
    FROM agents
    GROUP BY enrichment_status
  `).all();

  const pending = db.prepare(`
    SELECT COUNT(*) as count FROM agents WHERE enrichment_status = 'pending'
  `).get();

  res.json({
    stats,
    pendingCount: pending.count,
    isRunning: enrichmentPipeline.isRunning
  });
});

// POST /api/enrichment/run - Run enrichment batch
enrichmentRoutes.post('/run', async (req, res) => {
  const { batchSize = 50 } = req.body;

  if (enrichmentPipeline.isRunning) {
    return res.status(409).json({ error: 'Enrichment already running' });
  }

  // Start enrichment in background
  enrichmentPipeline.runBatch(batchSize)
    .then(result => {
      broadcast({ type: 'enrichment_complete', data: result.summary });
    })
    .catch(error => {
      broadcast({ type: 'enrichment_error', data: error.message });
    });

  res.json({ message: 'Enrichment started', batchSize });
});

// POST /api/enrichment/stop - Stop enrichment
enrichmentRoutes.post('/stop', (req, res) => {
  enrichmentPipeline.stop();
  res.json({ message: 'Stop requested' });
});
```

### Deploy Endpoints

```typescript
// src/routes/deploy.ts
import { Router } from 'express';
import { triggerVercelDeploy, waitForDeployment } from '../deploy/vercel';

export const deployRoutes = Router();

// POST /api/deploy/trigger - Trigger Vercel build
deployRoutes.post('/trigger', async (req, res) => {
  try {
    const result = await triggerVercelDeploy();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Monitor deployment in background
    if (result.jobId) {
      monitorDeployment(result.jobId);
    }

    res.json({
      message: 'Deploy triggered',
      jobId: result.jobId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deploy/status - Get deployment status
deployRoutes.get('/status', async (req, res) => {
  // Return latest deployment status
  res.json({ status: 'unknown' });
});
```

### Events Endpoint (SSE)

```typescript
// src/routes/events.ts
import { Router } from 'express';

export const eventsRouter = Router();

// Connected clients
const clients: Set<any> = new Set();

// GET /api/events - SSE stream
eventsRouter.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Add client to set
  clients.add(res);

  // Remove client on disconnect
  req.on('close', () => {
    clients.delete(res);
  });
});

// Broadcast to all clients
export function broadcast(message: { type: string; data?: any }) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// Log and broadcast
export function logAndBroadcast(level: string, source: string, message: string, data?: any) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`${timestamp} [${source}] ${message}`);

  broadcast({
    type: 'log',
    data: {
      timestamp,
      level,
      source,
      message,
      data
    }
  });
}
```

---

## UI Design

### Main Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARI Control Center                                              [Settings] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  SUBURBS                         │  │  AGENCIES IN SELECTED SUBURB   │  │
│  │                                  │  │                                 │  │
│  │  Filter: [All Tiers ▼] [_____]  │  │  Mosman (12 agencies)           │  │
│  │                                  │  │                                 │  │
│  │  ┌────────────────────────────┐ │  │  ☑ Ray White Mosman      ●●●●●● │  │
│  │  │ ● Mosman           Tier 1  │ │  │    8 agents, complete           │  │
│  │  │ ○ Bondi Beach      Tier 1  │ │  │                                 │  │
│  │  │ ○ Double Bay       Tier 1  │ │  │  ☑ McGrath Mosman        ●●●●○○ │  │
│  │  │ ● Paddington       Tier 1  │ │  │    5 agents, enriching...       │  │
│  │  │ ○ Manly            Tier 1  │ │  │                                 │  │
│  │  │ ○ Surry Hills      Tier 1  │ │  │  ☐ Belle Property Mosman ○○○○○○ │  │
│  │  │ ...                        │ │  │    6 agents, pending            │  │
│  │  └────────────────────────────┘ │  │                                 │  │
│  │                                  │  │  ☐ Raine & Horne Mosman  ○○○○○○ │  │
│  │  Legend:                         │  │    4 agents, pending            │  │
│  │  ● Complete  ◐ In Progress      │  │                                 │  │
│  │  ○ Pending   ✕ Failed           │  │  ...                            │  │
│  │                                  │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ACTIONS                                                                 ││
│  │                                                                          ││
│  │  Selected: 2 suburbs, 4 agencies, ~45 agents                            ││
│  │                                                                          ││
│  │  [▶ Run Discovery]  [▶ Run Enrichment]  [▶ Trigger Build]               ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ACTIVITY LOG                                                    [Clear] ││
│  │                                                                          ││
│  │  14:32:01 [API] Fetching agencies in Mosman...                          ││
│  │  14:32:02 [API] Found 12 agencies                                       ││
│  │  14:32:03 [API] GET /agencies/12345 - Ray White Mosman                  ││
│  │  14:32:04 [DB]  ✓ Stored agency: Ray White Mosman                       ││
│  │  14:32:04 [DB]  ✓ Stored 8 agents                                       ││
│  │  14:32:05 [ENRICH] Starting enrichment batch (45 agents)                ││
│  │  14:32:06 [AGENT] Main agent spawning 5 sub-agents                      ││
│  │  ...                                                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Suburb Panel

### HTML Structure

```html
<div class="panel suburb-panel">
  <div class="panel-header">
    <h2>Suburbs</h2>
    <div class="filters">
      <select id="tier-filter">
        <option value="">All Tiers</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
      </select>
      <input type="text" id="suburb-search" placeholder="Search...">
    </div>
  </div>

  <div class="suburb-list" id="suburb-list">
    <!-- Populated by JavaScript -->
  </div>

  <div class="legend">
    <span class="status-complete">● Complete</span>
    <span class="status-progress">◐ In Progress</span>
    <span class="status-pending">○ Pending</span>
    <span class="status-failed">✕ Failed</span>
  </div>
</div>
```

### Suburb List Item

```html
<div class="suburb-item" data-id="1" data-status="complete">
  <div class="suburb-status">
    <span class="status-indicator complete">●</span>
  </div>
  <div class="suburb-info">
    <span class="suburb-name">Mosman</span>
    <span class="suburb-meta">12 agencies, 85 agents</span>
  </div>
  <div class="suburb-tier">Tier 1</div>
</div>
```

### Status Indicators

| Status | Indicator | Color | Meaning |
|--------|-----------|-------|---------|
| `pending` | ○ | Gray | Not yet started |
| `in_progress` | ◐ | Yellow | Currently processing |
| `discovered` | ◑ | Blue | API data fetched |
| `complete` | ● | Green | All enriched |
| `failed` | ✕ | Red | Error occurred |

---

## Agency Panel

### HTML Structure

```html
<div class="panel agency-panel">
  <div class="panel-header">
    <h2>Agencies in <span id="selected-suburb">Select a suburb</span></h2>
    <div class="select-controls">
      <button id="select-all-agencies">Select All</button>
      <button id="deselect-all-agencies">Deselect All</button>
    </div>
  </div>

  <div class="agency-list" id="agency-list">
    <!-- Populated when suburb selected -->
  </div>
</div>
```

### Agency List Item

```html
<div class="agency-item" data-id="123">
  <label class="agency-checkbox">
    <input type="checkbox" name="agency" value="123">
    <span class="checkmark"></span>
  </label>

  <div class="agency-info">
    <span class="agency-name">Ray White Mosman</span>
    <span class="agency-meta">8 agents</span>
  </div>

  <div class="agency-progress">
    <div class="progress-bar">
      <div class="progress-fill" style="width: 100%"></div>
    </div>
    <span class="progress-text">8/8 enriched</span>
  </div>

  <div class="agency-status">
    <span class="status-badge complete">Complete</span>
  </div>
</div>
```

### Progress Bar States

```css
/* Progress bar styles */
.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.pending {
  background: #e0e0e0;
}

.progress-fill.in-progress {
  background: linear-gradient(90deg, #ffc107 0%, #ffecb3 50%, #ffc107 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.progress-fill.complete {
  background: #4caf50;
}

.progress-fill.failed {
  background: #f44336;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Action Buttons

### HTML Structure

```html
<div class="panel actions-panel">
  <div class="selection-summary">
    <span id="selection-summary">Select suburbs and agencies to begin</span>
  </div>

  <div class="action-buttons">
    <button id="btn-discover" class="action-btn" disabled>
      <span class="btn-icon">▶</span>
      <span class="btn-text">Run Discovery</span>
    </button>

    <button id="btn-enrich" class="action-btn" disabled>
      <span class="btn-icon">▶</span>
      <span class="btn-text">Run Enrichment</span>
    </button>

    <button id="btn-deploy" class="action-btn">
      <span class="btn-icon">▶</span>
      <span class="btn-text">Trigger Build</span>
    </button>
  </div>

  <div class="cost-tracker">
    <span>Daily Budget: <strong id="cost-remaining">$10.00</strong> remaining</span>
  </div>
</div>
```

### Button States

```typescript
interface ActionButtonState {
  enabled: boolean;
  loading: boolean;
  text: string;
}

const buttonStates = {
  discover: {
    idle: { enabled: true, loading: false, text: 'Run Discovery' },
    loading: { enabled: false, loading: true, text: 'Discovering...' },
    disabled: { enabled: false, loading: false, text: 'Select suburbs first' },
  },
  enrich: {
    idle: { enabled: true, loading: false, text: 'Run Enrichment' },
    loading: { enabled: false, loading: true, text: 'Enriching...' },
    disabled: { enabled: false, loading: false, text: 'No pending agents' },
  },
  deploy: {
    idle: { enabled: true, loading: false, text: 'Trigger Build' },
    loading: { enabled: false, loading: true, text: 'Building...' },
  },
};
```

### Action Handlers

```typescript
// Discovery action
document.getElementById('btn-discover').addEventListener('click', async () => {
  const selectedSuburbs = getSelectedSuburbs();
  if (selectedSuburbs.length === 0) return;

  setButtonState('discover', 'loading');

  try {
    for (const suburb of selectedSuburbs) {
      await fetch(`/api/suburbs/${suburb.id}/discover`, { method: 'POST' });
    }
    // Progress tracked via SSE
  } catch (error) {
    showError('Discovery failed: ' + error.message);
    setButtonState('discover', 'idle');
  }
});

// Enrich action
document.getElementById('btn-enrich').addEventListener('click', async () => {
  setButtonState('enrich', 'loading');

  try {
    await fetch('/api/enrichment/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 50 })
    });
    // Progress tracked via SSE
  } catch (error) {
    showError('Enrichment failed: ' + error.message);
    setButtonState('enrich', 'idle');
  }
});

// Deploy action
document.getElementById('btn-deploy').addEventListener('click', async () => {
  setButtonState('deploy', 'loading');

  try {
    const response = await fetch('/api/deploy/trigger', { method: 'POST' });
    const result = await response.json();
    addLog('BUILD', `Deploy triggered. Job ID: ${result.jobId}`);
  } catch (error) {
    showError('Deploy failed: ' + error.message);
  } finally {
    setButtonState('deploy', 'idle');
  }
});
```

---

## Activity Log

### HTML Structure

```html
<div class="panel log-panel">
  <div class="panel-header">
    <h2>Activity Log</h2>
    <button id="clear-log" class="btn-icon">Clear</button>
  </div>

  <div class="log-container" id="log-container">
    <!-- Log entries populated by JavaScript -->
  </div>
</div>
```

### Log Entry Format

```html
<div class="log-entry level-info">
  <span class="log-time">14:32:01</span>
  <span class="log-source">[API]</span>
  <span class="log-message">Fetching agencies in Mosman...</span>
</div>

<div class="log-entry level-success">
  <span class="log-time">14:32:04</span>
  <span class="log-source">[DB]</span>
  <span class="log-message">✓ Stored agency: Ray White Mosman</span>
</div>

<div class="log-entry level-error">
  <span class="log-time">14:32:10</span>
  <span class="log-source">[API]</span>
  <span class="log-message">✕ Failed to fetch agency 12346: 404</span>
</div>
```

### Log Levels and Styling

```css
.log-entry {
  padding: 4px 8px;
  font-family: monospace;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-source {
  font-weight: bold;
  margin-right: 8px;
}

/* Log levels */
.level-info .log-source { color: #2196f3; }
.level-success .log-source { color: #4caf50; }
.level-warning .log-source { color: #ff9800; }
.level-error .log-source { color: #f44336; }

/* Source-specific colors */
.log-source[data-source="API"] { color: #9c27b0; }
.log-source[data-source="DB"] { color: #009688; }
.log-source[data-source="ENRICH"] { color: #ff5722; }
.log-source[data-source="BUILD"] { color: #3f51b5; }
.log-source[data-source="AGENT"] { color: #e91e63; }
```

### Log Sources

| Source | Color | Purpose |
|--------|-------|---------|
| `DISCOVERY` | Purple | Discovery skill activity |
| `ENRICH` | Orange | Enrichment skill activity |
| `DB` | Teal | Database operations |
| `AGENT` | Pink | Sub-agent activity |
| `BUILD` | Indigo | Vercel deployment |
| `SYSTEM` | Gray | System messages |

---

## Real-time Updates

### SSE Connection

```typescript
// public/app.js

class EventStream {
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000;

  connect() {
    this.eventSource = new EventSource('/api/events');

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectDelay = 1000;
    };

    this.eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.eventSource.onerror = () => {
      console.log('SSE disconnected, reconnecting...');
      this.eventSource?.close();
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
  }

  private handleMessage(message: { type: string; data?: any }) {
    switch (message.type) {
      case 'log':
        addLogEntry(message.data);
        break;

      case 'suburb_updated':
        updateSuburbStatus(message.data);
        break;

      case 'agency_updated':
        updateAgencyStatus(message.data);
        break;

      case 'enrichment_progress':
        updateEnrichmentProgress(message.data);
        break;

      case 'enrichment_complete':
        handleEnrichmentComplete(message.data);
        break;

      case 'deploy_status':
        updateDeployStatus(message.data);
        break;
    }
  }
}

const eventStream = new EventStream();
eventStream.connect();
```

### Message Types

| Type | Data | Purpose |
|------|------|---------|
| `log` | `{ timestamp, level, source, message }` | Activity log entry |
| `suburb_updated` | `{ id, status, agencies_found, agents_found }` | Suburb progress |
| `agency_updated` | `{ id, agents_enriched, agents_total }` | Agency progress |
| `discovery_progress` | `{ agencies_found, agents_found, current_agency }` | Discovery progress |
| `discovery_complete` | `{ agencies, agents, cost }` | Discovery finished |
| `enrichment_progress` | `{ processed, total, current_agent }` | Enrichment progress |
| `enrichment_complete` | `{ successful, partial, failed }` | Enrichment finished |
| `deploy_status` | `{ status, url }` | Build progress |

---

## Frontend Implementation

### Main Application

```typescript
// public/app.js

class ControlCenter {
  private selectedSuburbs: Set<number> = new Set();
  private selectedAgencies: Set<number> = new Set();

  async init() {
    await this.loadSuburbs();
    this.setupEventListeners();
    this.connectEventStream();
  }

  // ═══════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════

  async loadSuburbs() {
    const response = await fetch('/api/suburbs');
    const suburbs = await response.json();
    this.renderSuburbList(suburbs);
  }

  async loadAgencies(suburbName: string) {
    const response = await fetch(`/api/agencies?suburb=${encodeURIComponent(suburbName)}`);
    const agencies = await response.json();
    this.renderAgencyList(agencies, suburbName);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════

  renderSuburbList(suburbs: ScrapeProgress[]) {
    const container = document.getElementById('suburb-list');
    container.innerHTML = suburbs.map(suburb => `
      <div class="suburb-item ${this.selectedSuburbs.has(suburb.id) ? 'selected' : ''}"
           data-id="${suburb.id}"
           data-status="${suburb.status}">
        <div class="suburb-status">
          <span class="status-indicator ${suburb.status}">${this.getStatusIcon(suburb.status)}</span>
        </div>
        <div class="suburb-info">
          <span class="suburb-name">${suburb.suburb_name}</span>
          <span class="suburb-meta">${suburb.agencies_found} agencies, ${suburb.agents_found} agents</span>
        </div>
        <div class="suburb-tier">Tier ${suburb.priority_tier}</div>
      </div>
    `).join('');
  }

  renderAgencyList(agencies: Agency[], suburbName: string) {
    document.getElementById('selected-suburb').textContent = suburbName;

    const container = document.getElementById('agency-list');
    container.innerHTML = agencies.map(agency => {
      const progress = agency.agent_count > 0
        ? Math.round((agency.agents_enriched / agency.agent_count) * 100)
        : 0;

      return `
        <div class="agency-item" data-id="${agency.id}">
          <label class="agency-checkbox">
            <input type="checkbox" name="agency" value="${agency.id}"
                   ${this.selectedAgencies.has(agency.id) ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>

          <div class="agency-info">
            <span class="agency-name">${agency.name}</span>
            <span class="agency-meta">${agency.agent_count} agents</span>
          </div>

          <div class="agency-progress">
            <div class="progress-bar">
              <div class="progress-fill ${this.getProgressClass(progress)}"
                   style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${agency.agents_enriched}/${agency.agent_count}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  getStatusIcon(status: string): string {
    const icons = {
      pending: '○',
      in_progress: '◐',
      discovered: '◑',
      complete: '●',
      failed: '✕',
    };
    return icons[status] || '?';
  }

  getProgressClass(percent: number): string {
    if (percent === 0) return 'pending';
    if (percent === 100) return 'complete';
    return 'in-progress';
  }

  updateSelectionSummary() {
    const summary = document.getElementById('selection-summary');
    const suburbCount = this.selectedSuburbs.size;
    const agencyCount = this.selectedAgencies.size;

    if (suburbCount === 0 && agencyCount === 0) {
      summary.textContent = 'Select suburbs and agencies to begin';
    } else {
      summary.textContent = `Selected: ${suburbCount} suburbs, ${agencyCount} agencies`;
    }

    // Update button states
    document.getElementById('btn-discover').disabled = suburbCount === 0;
    document.getElementById('btn-enrich').disabled = agencyCount === 0;
  }
}

// Initialize
const app = new ControlCenter();
app.init();
```

---

## State Management

### Application State

```typescript
interface AppState {
  // Data
  suburbs: ScrapeProgress[];
  agencies: Map<string, Agency[]>;  // keyed by suburb name
  agents: Map<number, Agent[]>;     // keyed by agency id

  // Selection
  selectedSuburbs: Set<number>;
  selectedAgencies: Set<number>;

  // Status
  isEnriching: boolean;
  isDeploying: boolean;
  apiCallsRemaining: number;

  // UI
  currentSuburb: string | null;
  logEntries: LogEntry[];
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: string;
  message: string;
}
```

### State Updates

```typescript
// State update functions
function updateSuburbStatus(data: { id: number; status: string; agencies_found: number; agents_found: number }) {
  const suburbItem = document.querySelector(`.suburb-item[data-id="${data.id}"]`);
  if (!suburbItem) return;

  suburbItem.dataset.status = data.status;
  suburbItem.querySelector('.status-indicator').textContent = getStatusIcon(data.status);
  suburbItem.querySelector('.status-indicator').className = `status-indicator ${data.status}`;
  suburbItem.querySelector('.suburb-meta').textContent =
    `${data.agencies_found} agencies, ${data.agents_found} agents`;
}

function updateAgencyStatus(data: { id: number; agents_enriched: number; agents_total: number }) {
  const agencyItem = document.querySelector(`.agency-item[data-id="${data.id}"]`);
  if (!agencyItem) return;

  const progress = data.agents_total > 0
    ? Math.round((data.agents_enriched / data.agents_total) * 100)
    : 0;

  agencyItem.querySelector('.progress-fill').style.width = `${progress}%`;
  agencyItem.querySelector('.progress-fill').className =
    `progress-fill ${getProgressClass(progress)}`;
  agencyItem.querySelector('.progress-text').textContent =
    `${data.agents_enriched}/${data.agents_total}`;
}

function addLogEntry(entry: LogEntry) {
  const container = document.getElementById('log-container');

  const entryEl = document.createElement('div');
  entryEl.className = `log-entry level-${entry.level}`;
  entryEl.innerHTML = `
    <span class="log-time">${entry.timestamp}</span>
    <span class="log-source" data-source="${entry.source}">[${entry.source}]</span>
    <span class="log-message">${entry.message}</span>
  `;

  container.appendChild(entryEl);
  container.scrollTop = container.scrollHeight;

  // Limit log entries to prevent memory issues
  while (container.children.length > 500) {
    container.removeChild(container.firstChild);
  }
}
```

---

## Related Specifications

- **[01-architecture.md](./01-architecture.md)** - Control Center in system architecture
- **[03-discovery-skill.md](./03-discovery-skill.md)** - Discovery Skill implementation
- **[04-enrichment-pipeline.md](./04-enrichment-pipeline.md)** - Enrichment Skill implementation
- **[08-operations.md](./08-operations.md)** - Operational workflows
