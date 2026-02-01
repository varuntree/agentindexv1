const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, 'data', 'ari.db');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sqlite(query) {
  return execFileSync('sqlite3', [DB_PATH, query], { encoding: 'utf8' }).trim();
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  return { response, text };
}

async function waitForHttpOk(url, { timeoutMs, intervalMs }) {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // ignore until timeout
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await sleep(intervalMs);
  }
}

function startProcess(label, command, args, { env, cwd }) {
  const inheritStdio = label === 'seo';
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: inheritStdio ? 'inherit' : ['ignore', 'pipe', 'pipe']
  });

  if (!inheritStdio) {
    child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
    child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  }

  return child;
}

function killProcess(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
}

function parseSingleRow(row, columns) {
  if (!row) return null;
  const parts = row.split('|');
  if (parts.length < columns.length) return null;
  const mapped = {};
  for (let index = 0; index < columns.length; index += 1) {
    mapped[columns[index]] = parts[index];
  }
  return mapped;
}

function extractInternalLinks(html) {
  const links = new Set();
  const regex = /href="(\/[^"#?]*?)"/g;
  let match = regex.exec(html);
  while (match) {
    const href = match[1];
    if (href && href.startsWith('/')) links.add(href);
    match = regex.exec(html);
  }
  return [...links];
}

function extractAgentSlugsFromHtml(html) {
  const slugs = new Set();
  const regex = /href="\/agent\/([^"#?]+)"/g;
  let match = regex.exec(html);
  while (match) {
    slugs.add(match[1]);
    match = regex.exec(html);
  }
  return [...slugs];
}

async function postJson(url, body) {
  const { response, text } = await fetchText(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status} ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  process.stdout.write('Starting ARI end-to-end checks...\n');

  const baseEnv = {
    ...process.env,
    ARI_FIXTURE_MODE: process.env.ARI_FIXTURE_MODE || '1'
  };

  const control = startProcess('control', 'npm', ['run', 'dev:control'], { env: baseEnv, cwd: ROOT });
  const seo = startProcess('seo', 'npm', ['run', 'dev:seo'], { env: baseEnv, cwd: ROOT });

  const cleanup = () => {
    killProcess(seo);
    killProcess(control);
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });

  try {
    await waitForHttpOk('http://localhost:3001/health', { timeoutMs: 45_000, intervalMs: 750 });
    await waitForHttpOk('http://localhost:3000', { timeoutMs: 60_000, intervalMs: 750 });

    // Ensure Next.js dev assets are being served (client hydration depends on these).
    const { text: bootstrapHtml } = await fetchText('http://localhost:3000/');
    const webpackChunkMatch = bootstrapHtml.match(/\/_next\/static\/chunks\/webpack\.js\?v=([0-9]+)/);
    assert(webpackChunkMatch, 'Expected webpack chunk reference on homepage');
    const webpackChunkUrl = `http://localhost:3000/_next/static/chunks/webpack.js?v=${webpackChunkMatch[1]}`;
    const { response: webpackResponse } = await fetchText(webpackChunkUrl);
    assert(webpackResponse.ok, `Next.js webpack chunk failed: ${webpackResponse.status}`);

    // Scenario 1: Fresh suburb pipeline
    const pending = parseSingleRow(
      sqlite("SELECT slug || '|' || suburb_name || '|' || state FROM scrape_progress WHERE status = 'pending' ORDER BY priority_tier ASC, suburb_name ASC LIMIT 1;"),
      ['slug', 'suburb', 'state']
    );

    const suburbSlug = pending?.slug || 'mosman-nsw-2088';
    const suburbName = pending?.suburb || 'Mosman';
    const suburbState = pending?.state || 'NSW';

    process.stdout.write(`Using suburb: ${suburbName}, ${suburbState} (${suburbSlug})\n`);

    const beforePendingAgents = Number(sqlite("SELECT COUNT(*) FROM agents WHERE enrichment_status = 'pending';")) || 0;

    await postJson('http://localhost:3001/api/discovery/run', { suburb: suburbName, state: suburbState });

    const discoveryDeadline = Date.now() + 90_000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const progress = parseSingleRow(
        sqlite(`SELECT status || '|' || agencies_found || '|' || agents_found FROM scrape_progress WHERE slug = '${suburbSlug}' LIMIT 1;`),
        ['status', 'agencies_found', 'agents_found']
      );

      if (progress && progress.status === 'discovered') {
        const agenciesFound = Number(progress.agencies_found) || 0;
        const agentsFound = Number(progress.agents_found) || 0;
        assert(agenciesFound >= 3, `Expected >=3 agencies found, got ${agenciesFound}`);
        assert(agentsFound >= 10, `Expected >=10 agents found, got ${agentsFound}`);
        break;
      }

      if (Date.now() >= discoveryDeadline) throw new Error(`Timed out waiting for discovery to finish for ${suburbSlug}`);
      await sleep(1_000);
    }

    const { response: suburbResponse, text: suburbHtml } = await fetchText(`http://localhost:3000/agents-in/${suburbSlug}`);
    assert(suburbResponse.ok, `SEO suburb page failed: ${suburbResponse.status}`);
    assert(suburbHtml.includes('Real Estate Agent'), 'SEO suburb page missing headline content');

    const agentSlugsFromDbRaw = sqlite(
      `SELECT slug FROM agents WHERE primary_suburb = '${suburbName.replace(/'/g, "''")}' AND primary_state = '${suburbState.replace(/'/g, "''")}' ORDER BY slug ASC LIMIT 3;`
    );
    const agentSlugsFromDb = agentSlugsFromDbRaw
      ? agentSlugsFromDbRaw
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    assert(agentSlugsFromDb.length > 0, 'Expected at least 1 agent slug in DB after discovery');
    for (const slug of agentSlugsFromDb) {
      assert(suburbHtml.includes(`/agent/${slug}`), `SEO suburb page missing agent link: /agent/${slug}`);
    }

    // Enrichment
    const pendingAfterDiscovery = Number(sqlite("SELECT COUNT(*) FROM agents WHERE enrichment_status = 'pending';")) || 0;
    assert(pendingAfterDiscovery > 0, 'Expected pending agents to enrich after discovery');

    await postJson('http://localhost:3001/api/enrichment/run', { limit: Math.min(10, pendingAfterDiscovery) });

    const enrichmentDeadline = Date.now() + 90_000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const pendingNow = Number(sqlite("SELECT COUNT(*) FROM agents WHERE enrichment_status = 'pending';")) || 0;
      if (pendingNow < pendingAfterDiscovery) break;
      if (Date.now() >= enrichmentDeadline) throw new Error('Timed out waiting for enrichment to reduce pending count');
      await sleep(1_000);
    }

    const enrichedSlug = sqlite(
      "SELECT slug FROM agents WHERE enriched_bio LIKE '%This profile is being expanded%' ORDER BY enriched_at DESC LIMIT 1;"
    ).trim();
    assert(enrichedSlug, 'Expected at least 1 enriched agent with synthetic bio');

    const { response: agentResponse, text: agentHtml } = await fetchText(`http://localhost:3000/agent/${enrichedSlug}`);
    assert(agentResponse.ok, `SEO agent page failed: ${agentResponse.status}`);
    assert(agentHtml.includes('This profile is being expanded'), 'SEO agent page missing enriched bio content');

    // Scenario 2 + 3: Navigation + data consistency (Mosman as stable fixture suburb)
    const mosmanDbCount = Number(
      sqlite("SELECT COUNT(*) FROM agents WHERE primary_suburb = 'Mosman' AND primary_state = 'NSW';")
    );
    const { response: mosmanResponse, text: mosmanHtml } = await fetchText('http://localhost:3000/agents-in/mosman-nsw-2088');
    assert(mosmanResponse.ok, `Mosman suburb page failed: ${mosmanResponse.status}`);
    const mosmanPageAgentSlugs = extractAgentSlugsFromHtml(mosmanHtml);
    assert(mosmanPageAgentSlugs.length === mosmanDbCount, `Mosman page count mismatch: DB=${mosmanDbCount} page=${mosmanPageAgentSlugs.length}`);

    const firstAgentSlug = mosmanPageAgentSlugs[0];
    assert(firstAgentSlug, 'Expected at least 1 agent link on Mosman suburb page');
    const { response: firstAgentResponse, text: firstAgentHtml } = await fetchText(`http://localhost:3000/agent/${firstAgentSlug}`);
    assert(firstAgentResponse.ok, `Agent page failed: ${firstAgentResponse.status}`);
    assert(firstAgentHtml.includes('aria-label="Breadcrumbs"'), 'Agent page missing breadcrumbs');

    const agencyLinkMatch = firstAgentHtml.match(/href="\/agency\/([^"#?]+)"/);
    assert(agencyLinkMatch, 'Agent page missing agency link');
    const agencySlug = agencyLinkMatch[1];
    const { response: agencyResponse, text: agencyHtml } = await fetchText(`http://localhost:3000/agency/${agencySlug}`);
    assert(agencyResponse.ok, `Agency page failed: ${agencyResponse.status}`);
    assert(agencyHtml.includes('aria-label="Breadcrumbs"'), 'Agency page missing breadcrumbs');

    // Scenario 4: Schema + meta checks
    const { text: homeHtml } = await fetchText('http://localhost:3000/');
    assert(homeHtml.includes('application/ld+json'), 'Homepage missing JSON-LD');

    const { text: stateHtml } = await fetchText('http://localhost:3000/agents-in/nsw');
    assert(stateHtml.includes('application/ld+json'), 'State page missing JSON-LD');

    assert(mosmanHtml.includes('ItemList'), 'Suburb page missing ItemList schema marker');
    assert(firstAgentHtml.includes('RealEstateAgent'), 'Agent page missing RealEstateAgent schema marker');
    assert(agencyHtml.includes('RealEstateAgency'), 'Agency page missing RealEstateAgency schema marker');

    for (const [page, html] of [
      ['/', homeHtml],
      ['/agents-in/nsw', stateHtml],
      ['/agents-in/mosman-nsw-2088', mosmanHtml],
      [`/agent/${firstAgentSlug}`, firstAgentHtml]
    ]) {
      assert(html.includes('meta name="description"'), `Missing meta description: ${page}`);
    }

    // Scenario 4 (subset): basic internal link crawl on Mosman suburb page
    const internalLinks = extractInternalLinks(mosmanHtml)
      .filter((href) => href.startsWith('/'))
      .filter((href) => !href.startsWith('/_next/'))
      .slice(0, 30);

    for (const href of internalLinks) {
      const { response } = await fetchText(`http://localhost:3000${href}`);
      assert(response.status !== 404, `Broken internal link: ${href}`);
    }

    const afterPendingAgents = Number(sqlite("SELECT COUNT(*) FROM agents WHERE enrichment_status = 'pending';")) || 0;
    process.stdout.write(
      `E2E checks passed. Pending agents before discovery: ${beforePendingAgents}, after enrichment: ${afterPendingAgents}.\n`
    );
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  process.stderr.write(`E2E checks failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
