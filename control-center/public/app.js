(() => {
  const suburbListEl = document.getElementById('suburb-list');
  const suburbCountEl = document.getElementById('suburb-count');
  const selectedCountEl = document.getElementById('selected-count');
  const selectAllEl = document.getElementById('select-all');
  const clearSelectionEl = document.getElementById('clear-selection');
  const detailEl = document.getElementById('detail');
  const statusFilterEl = document.getElementById('status-filter');
  const regionFilterEl = document.getElementById('region-filter');
  const searchInputEl = document.getElementById('search-input');
  const logListEl = document.getElementById('log-list');
  const clearLogsEl = document.getElementById('clear-logs');
  const connectionPillEl = document.getElementById('connection-pill');
  const enrichmentPendingCountEl = document.getElementById('enrichment-pending-count');
  const enrichmentInProgressCountEl = document.getElementById('enrichment-in-progress-count');
  const enrichmentBatchSizeEl = document.getElementById('enrichment-batch-size');
  const runEnrichmentEl = document.getElementById('run-enrichment');
  const enrichmentProgressEl = document.getElementById('enrichment-progress');
  const enrichmentProgressTextEl = document.getElementById('enrichment-progress-text');

  const dashUpdatedEl = document.getElementById('dashboard-updated');
  const dashRefreshEl = document.getElementById('refresh-dashboard');
  const dashSuburbsTotalEl = document.getElementById('dash-suburbs-total');
  const dashSuburbsProcessedEl = document.getElementById('dash-suburbs-processed');
  const dashAgenciesTotalEl = document.getElementById('dash-agencies-total');
  const dashAgentsTotalEl = document.getElementById('dash-agents-total');
  const dashEnrichmentPercentEl = document.getElementById('dash-enrichment-percent');
  const dashEnrichmentMetaEl = document.getElementById('dash-enrichment-meta');
  const dashEnrichmentBarEl = document.getElementById('dash-enrichment-bar');
  const dashSuburbStatusEl = document.getElementById('dash-suburb-status');
  const dashEnrichmentStatusEl = document.getElementById('dash-enrichment-status');
  const dashEnrichmentQualityEl = document.getElementById('dash-enrichment-quality');
  const dashRecentActivityEl = document.getElementById('dash-recent-activity');

  const state = {
    suburbs: [],
    selectedSlug: null,
    selectedSlugs: new Set(),
    tier: 'all',
    status: 'all',
    region: 'all',
    search: '',
    logs: [],
    logFilter: 'all',
    pollingTimer: null,
    pollingTimers: new Map(),
    dashboardTimer: null,
    enrichment: {
      counts: null,
      pollCount: 0,
      pollTimer: null,
      running: false,
      startedAt: 0,
      trackedSlugs: [],
      batchSize: 5,
      pendingBefore: null
    }
  };

  function asSafeNumber(value, fallback) {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function statusIndicator(status) {
    if (status === 'failed' || status === 'abandoned') return { symbol: '✕', className: 'indicator--bad' };
    if (status === 'in_progress') return { symbol: '◐', className: 'indicator--progress' };
    if (status === 'discovered' || status === 'complete') return { symbol: '●', className: 'indicator--good' };
    return { symbol: '○', className: 'indicator--pending' };
  }

  function byName(a, b) {
    const an = (a.suburb_name || '').toLowerCase();
    const bn = (b.suburb_name || '').toLowerCase();
    return an.localeCompare(bn);
  }

  function filteredSuburbs() {
    const search = state.search.trim().toLowerCase();
    return state.suburbs
      .filter((s) => {
        if (state.tier !== 'all' && String(s.priority_tier) !== String(state.tier)) return false;
        if (state.status !== 'all' && String(s.status) !== String(state.status)) return false;
        if (state.region !== 'all') {
          const region = s.region ? String(s.region) : 'none';
          if (region !== String(state.region)) return false;
        }
        if (!search) return true;
        const haystack = `${s.suburb_name} ${s.state} ${s.postcode || ''}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort(byName);
  }

  function updateSelectedCount() {
    if (!selectedCountEl) return;
    selectedCountEl.textContent = `${state.selectedSlugs.size}`;
  }

  function renderSuburbList() {
    const suburbs = filteredSuburbs();
    suburbCountEl.textContent = `${suburbs.length}`;
    suburbListEl.innerHTML = '';

    for (const suburb of suburbs) {
      const indicator = statusIndicator(suburb.status);
      const item = document.createElement('div');
      const isSelected = state.selectedSlugs.has(suburb.slug);
      item.className = `listItem${isSelected ? ' is-selected' : ''}`;
      item.setAttribute('role', 'listitem');
      item.dataset.slug = suburb.slug;

      const left = document.createElement('div');
      left.className = 'listItem__left';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'listItem__check';
      check.checked = isSelected;
      check.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      check.addEventListener('change', () => {
        toggleSelection(suburb.slug, { makePrimary: true });
      });

      const ind = document.createElement('div');
      ind.className = `indicator ${indicator.className}`;
      ind.textContent = indicator.symbol;

      const title = document.createElement('div');
      title.className = 'listItem__title';

      const name = document.createElement('div');
      name.className = 'listItem__name';
      name.textContent = suburb.suburb_name;

      const meta = document.createElement('div');
      meta.className = 'listItem__meta';
      meta.textContent = `${suburb.state} ${suburb.postcode || ''} · tier ${suburb.priority_tier} · ${suburb.status}`;

      title.append(name, meta);
      left.append(check, ind, title);

      const right = document.createElement('div');
      right.className = 'listItem__actions';

      const counts = document.createElement('div');
      counts.className = 'listItem__right';
      counts.textContent = `${suburb.agencies_found || 0} agencies · ${suburb.agents_found || 0} agents`;
      right.append(counts);

      if (suburb.status === 'failed' || suburb.status === 'abandoned') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'miniBtn';
        retry.textContent = 'Retry';
        retry.addEventListener('click', (e) => {
          e.stopPropagation();
          void triggerDiscovery(suburb);
        });
        right.append(retry);
      }

      item.append(left, right);
      item.addEventListener('click', () => toggleSelection(suburb.slug, { makePrimary: true }));
      suburbListEl.append(item);
    }

    updateSelectedCount();
  }

  function setSelectedSlug(slug) {
    state.selectedSlug = slug;
    renderSuburbList();
  }

  function toggleSelection(slug, options) {
    const makePrimary = options && options.makePrimary !== undefined ? Boolean(options.makePrimary) : true;
    const wasSelected = state.selectedSlugs.has(slug);
    if (wasSelected) state.selectedSlugs.delete(slug);
    else state.selectedSlugs.add(slug);

    if (makePrimary) {
      if (state.selectedSlugs.size === 0) {
        state.selectedSlug = null;
      } else if (!wasSelected) {
        state.selectedSlug = slug;
      } else if (state.selectedSlug === slug) {
        state.selectedSlug = Array.from(state.selectedSlugs)[0] || null;
      }
    }
    renderSuburbList();
    void renderDetail();
  }

  function findSelectedSuburb() {
    if (!state.selectedSlug) return null;
    return state.suburbs.find((s) => s.slug === state.selectedSlug) || null;
  }

  async function fetchJson(path, options) {
    const res = await fetch(path, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function loadSuburbs() {
    const suburbs = await fetchJson('/api/suburbs');
    state.suburbs = Array.isArray(suburbs) ? suburbs : [];
    ensureSelectionsStillValid();
    populateRegionFilter();
    renderSuburbList();
    renderDetail();
  }

  function ensureSelectionsStillValid() {
    const slugSet = new Set(state.suburbs.map((s) => s.slug));
    for (const slug of Array.from(state.selectedSlugs)) {
      if (!slugSet.has(slug)) state.selectedSlugs.delete(slug);
    }
    if (state.selectedSlug && !slugSet.has(state.selectedSlug)) state.selectedSlug = null;
  }

  function populateRegionFilter() {
    if (!regionFilterEl) return;
    const regions = new Set();
    for (const suburb of state.suburbs) {
      if (suburb.region && String(suburb.region).trim().length > 0) regions.add(String(suburb.region));
    }

    const current = regionFilterEl.value || 'all';
    regionFilterEl.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All';
    regionFilterEl.append(allOpt);

    const noneOpt = document.createElement('option');
    noneOpt.value = 'none';
    noneOpt.textContent = 'Unspecified';
    regionFilterEl.append(noneOpt);

    for (const region of Array.from(regions).sort((a, b) => a.localeCompare(b))) {
      const opt = document.createElement('option');
      opt.value = region;
      opt.textContent = region;
      regionFilterEl.append(opt);
    }

    regionFilterEl.value = Array.from(regionFilterEl.options).some((o) => o.value === current) ? current : 'all';
  }

  async function loadAgencies(suburb) {
    const params = new URLSearchParams();
    params.set('suburb', suburb.suburb_name);
    params.set('state', suburb.state);
    params.set('limit', '200');
    const agencies = await fetchJson(`/api/agencies?${params.toString()}`);
    return Array.isArray(agencies) ? agencies : [];
  }

  async function loadAgents(suburb) {
    const params = new URLSearchParams();
    params.set('suburb', suburb.suburb_name);
    params.set('limit', '200');
    const agents = await fetchJson(`/api/agents?${params.toString()}`);
    return Array.isArray(agents) ? agents : [];
  }

  function statusPill(status) {
    if (status === 'complete') return { className: 'statusPill statusPill--good', label: 'complete' };
    if (status === 'failed') return { className: 'statusPill statusPill--bad', label: 'failed' };
    if (status === 'in_progress') return { className: 'statusPill statusPill--warn', label: 'in_progress' };
    if (status === 'skipped') return { className: 'statusPill', label: 'skipped' };
    return { className: 'statusPill', label: 'pending' };
  }

  function qualityPill(quality) {
    if (!quality) return { className: 'qualityPill', label: 'n/a' };
    return { className: `qualityPill qualityPill--${quality}`, label: String(quality) };
  }

  function renderDetailLoading(suburb, message) {
    const indicator = statusIndicator(suburb.status);
    detailEl.innerHTML = `
      <div class="detailHeader">
        <div class="detailTitle">
          <h3>${escapeHtml(suburb.suburb_name)}, ${escapeHtml(suburb.state)} ${escapeHtml(suburb.postcode || '')}</h3>
          <p>${escapeHtml(suburb.slug)} · tier ${escapeHtml(suburb.priority_tier)} · <span class="${escapeHtml(
            indicator.className
          )}">${escapeHtml(indicator.symbol)}</span> ${escapeHtml(suburb.status)}</p>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat__label">Agencies found</div><div class="stat__value">${escapeHtml(
          suburb.agencies_found || 0
        )}</div></div>
        <div class="stat"><div class="stat__label">Agents found</div><div class="stat__value">${escapeHtml(
          suburb.agents_found || 0
        )}</div></div>
      </div>
      <div class="section">
        <div class="empty"><p class="muted">${escapeHtml(message)}</p></div>
      </div>
    `;
  }

  function renderEnrichmentPanel() {
    const counts = state.enrichment.counts;
    const pending = counts ? asSafeNumber(counts.pending, 0) : 0;
    const inProgress = counts ? asSafeNumber(counts.in_progress, 0) : 0;

    if (enrichmentPendingCountEl) enrichmentPendingCountEl.textContent = `${pending}`;
    if (enrichmentInProgressCountEl) enrichmentInProgressCountEl.textContent = `${inProgress}`;

    const running = Boolean(state.enrichment.running);
    if (runEnrichmentEl) runEnrichmentEl.disabled = running;
    if (enrichmentBatchSizeEl) enrichmentBatchSizeEl.disabled = running;

    if (enrichmentProgressEl) {
      enrichmentProgressEl.hidden = !running;
    }
    if (enrichmentProgressTextEl) {
      enrichmentProgressTextEl.textContent = running
        ? `Enrichment running… pending ${pending} · in_progress ${inProgress}`
        : 'Enrichment idle';
    }
  }

  async function loadEnrichmentCounts() {
    const data = await fetchJson('/api/agents/enrichment-status');
    if (!data || typeof data !== 'object') {
      state.enrichment.counts = null;
      renderEnrichmentPanel();
      return;
    }
    state.enrichment.counts = data;
    renderEnrichmentPanel();
  }

  function stopEnrichmentPolling() {
    if (state.enrichment.pollTimer) {
      window.clearInterval(state.enrichment.pollTimer);
      state.enrichment.pollTimer = null;
    }
  }

  async function maybeTrackInProgressAgents(limit) {
    if (state.enrichment.trackedSlugs.length > 0) return;
    try {
      const params = new URLSearchParams();
      params.set('enrichment_status', 'in_progress');
      params.set('limit', `${Math.min(Math.max(limit, 1), 50)}`);
      const agents = await fetchJson(`/api/agents?${params.toString()}`);
      if (!Array.isArray(agents)) return;
      state.enrichment.trackedSlugs = agents
        .map((a) => (a && typeof a.slug === 'string' ? a.slug : null))
        .filter((s) => Boolean(s));
    } catch {
      // Ignore tracking errors.
    }
  }

  async function logTrackedAgentResults() {
    const slugs = state.enrichment.trackedSlugs;
    if (!Array.isArray(slugs) || slugs.length === 0) return;

    for (const slug of slugs) {
      try {
        const agent = await fetchJson(`/api/agents/${encodeURIComponent(slug)}`);
        const name = `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || slug;
        const status = agent.enrichment_status || 'pending';
        const quality = agent.enrichment_quality || null;
        const type = status === 'complete' ? 'success' : status === 'failed' ? 'error' : 'info';
        appendUiLog(type, 'enrichment', `${name}: ${status}`, { slug, quality });
      } catch {
        appendUiLog('error', 'enrichment', `Failed to load enriched agent`, { slug });
      }
    }
  }

  function startEnrichmentPollingUntilDone(limit) {
    stopEnrichmentPolling();
    state.enrichment.pollCount = 0;

    state.enrichment.pollTimer = window.setInterval(async () => {
      state.enrichment.pollCount += 1;
      try {
        await loadEnrichmentCounts();
        if (state.selectedSlug) await renderDetail();

        const counts = state.enrichment.counts;
        const inProgress = counts ? asSafeNumber(counts.in_progress, 0) : 0;
        if (inProgress > 0) {
          void maybeTrackInProgressAgents(limit);
        }

        if (state.enrichment.pollCount % 3 === 0) {
          appendUiLog('info', 'enrichment', 'progress', { in_progress: inProgress });
        }

        const runningForMs = Date.now() - asSafeNumber(state.enrichment.startedAt, Date.now());
        const minVisibleMs = 1800;
        if (state.enrichment.pollCount >= 2 && inProgress === 0 && runningForMs >= minVisibleMs) {
          stopEnrichmentPolling();
          state.enrichment.running = false;
          renderEnrichmentPanel();
          appendUiLog('success', 'enrichment', 'finished', {});
          await logTrackedAgentResults();
          state.enrichment.trackedSlugs = [];
        }
      } catch {
        // Keep polling.
      }
    }, 1200);
  }

  async function triggerEnrichment() {
    if (state.enrichment.running) return;

    const batchSizeRaw = enrichmentBatchSizeEl ? enrichmentBatchSizeEl.value : `${state.enrichment.batchSize}`;
    const batchSize = Math.min(Math.max(asSafeNumber(batchSizeRaw, 5), 1), 50);
    state.enrichment.batchSize = batchSize;

    appendUiLog('info', 'enrichment', 'starting', { limit: batchSize });

    state.enrichment.running = true;
    state.enrichment.startedAt = Date.now();
    state.enrichment.trackedSlugs = [];
    renderEnrichmentPanel();

    try {
      await fetchJson('/api/enrichment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: batchSize })
      });
      startEnrichmentPollingUntilDone(batchSize);
    } catch (error) {
      state.enrichment.running = false;
      renderEnrichmentPanel();
      appendUiLog('error', 'enrichment', 'failed to start', { error: String(error) });
    }
  }

  async function renderDetail() {
    const selected = Array.from(state.selectedSlugs);
    if (selected.length === 0) {
      detailEl.innerHTML = `
        <div class="empty">
          <p class="muted">Select a suburb from the list to view details.</p>
        </div>
      `;
      return;
    }

    if (selected.length > 1) {
      renderMultiSelectDetail(selected);
      return;
    }

    const suburb = findSelectedSuburb();
    if (!suburb) {
      detailEl.innerHTML = `
        <div class="empty">
          <p class="muted">Select a suburb from the list to view details.</p>
        </div>
      `;
      return;
    }

    renderDetailLoading(suburb, 'Loading agencies and agents…');

    let agencies = [];
    try {
      agencies = await loadAgencies(suburb);
    } catch (error) {
      agencies = [];
      appendUiLog('error', 'ui', 'Failed to load agencies', { error: String(error) });
    }

    let agents = [];
    try {
      agents = await loadAgents(suburb);
    } catch (error) {
      agents = [];
      appendUiLog('error', 'ui', 'Failed to load agents', { error: String(error) });
    }

    const indicator = statusIndicator(suburb.status);
    const canRun = suburb.status !== 'in_progress';

    const agenciesHtml =
      agencies.length === 0
        ? `<div class="empty"><p class="muted">No agencies loaded yet for this suburb.</p></div>`
        : `<div class="agencyList">${agencies
            .map(
              (a) => `
          <div class="agencyItem">
            <div>
              <div class="agencyItem__name">${escapeHtml(a.name)}</div>
              <div class="agencyItem__meta">${escapeHtml(a.slug)} · ${escapeHtml(a.agent_count || 0)} agents</div>
            </div>
            <div class="agencyItem__meta">${escapeHtml(a.brand_name || '')}</div>
          </div>
        `
            )
            .join('')}</div>`;

    const agentsHtml =
      agents.length === 0
        ? `<div class="empty"><p class="muted">No agents loaded yet for this suburb.</p></div>`
        : `<div class="agentList">${agents
            .map((a) => {
              const status = statusPill(a.enrichment_status);
              const quality = qualityPill(a.enrichment_quality);
              const name = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.slug;
              const agency = a.agency_name ? ` · ${a.agency_name}` : '';
              return `
                <div class="agentItem">
                  <div>
                    <div class="agentItem__nameRow">
                      <div class="agentItem__name">${escapeHtml(name)}</div>
                      <div class="${escapeHtml(status.className)}" data-enrichment-status="${escapeHtml(
                        status.label
                      )}">${escapeHtml(status.label)}</div>
                      <div class="${escapeHtml(quality.className)}" data-enrichment-quality="${escapeHtml(
                        quality.label
                      )}">${escapeHtml(quality.label)}</div>
                    </div>
                    <div class="agentItem__meta">${escapeHtml(a.slug)}${escapeHtml(agency)}</div>
                  </div>
                  <div class="agentItem__meta">${escapeHtml(a.primary_suburb || '')}</div>
                </div>
              `;
            })
            .join('')}</div>`;

    detailEl.innerHTML = `
      <div class="detailHeader">
        <div class="detailTitle">
          <h3>${escapeHtml(suburb.suburb_name)}, ${escapeHtml(suburb.state)} ${escapeHtml(suburb.postcode || '')}</h3>
          <p>${escapeHtml(suburb.slug)} · tier ${escapeHtml(suburb.priority_tier)} · <span class="${escapeHtml(
            indicator.className
          )}">${escapeHtml(indicator.symbol)}</span> ${escapeHtml(suburb.status)}</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat__label">Agencies found</div><div class="stat__value">${escapeHtml(
          suburb.agencies_found || 0
        )}</div></div>
        <div class="stat"><div class="stat__label">Agents found</div><div class="stat__value">${escapeHtml(
          suburb.agents_found || 0
        )}</div></div>
      </div>

      <div class="btnRow">
        <button class="btn" id="run-discovery" type="button" ${canRun ? '' : 'disabled'}>
          ${canRun ? 'Run Discovery' : 'Discovery Running…'}
        </button>
        <button class="btn btn--ghost" id="retry-discovery" type="button" ${
          suburb.status === 'failed' || suburb.status === 'abandoned' ? '' : 'disabled'
        }>Retry</button>
        <button class="btn btn--ghost" id="refresh-detail" type="button">Refresh</button>
      </div>

      ${
        suburb.error_message
          ? `
            <div class="section">
              <h4>Last error</h4>
              <div class="empty">
                <p class="muted">${escapeHtml(suburb.error_message)}</p>
                <p class="muted">retry_count: ${escapeHtml(suburb.retry_count || 0)}</p>
              </div>
            </div>
          `
          : ''
      }

      <div class="section">
        <h4>Agencies</h4>
        ${agenciesHtml}
      </div>

      <div class="section">
        <h4>Agents</h4>
        ${agentsHtml}
      </div>
    `;

    const runBtn = document.getElementById('run-discovery');
    const retryBtn = document.getElementById('retry-discovery');
    const refreshBtn = document.getElementById('refresh-detail');
    if (runBtn) runBtn.addEventListener('click', () => triggerDiscovery(suburb));
    if (retryBtn) retryBtn.addEventListener('click', () => triggerDiscovery(suburb));
    if (refreshBtn) refreshBtn.addEventListener('click', () => refreshSelectedSuburb());
  }

  function renderMultiSelectDetail(selectedSlugs) {
    const suburbs = selectedSlugs
      .map((slug) => state.suburbs.find((s) => s.slug === slug) || null)
      .filter((s) => Boolean(s));

    const selectedCount = suburbs.length;
    const statusCounts = { pending: 0, in_progress: 0, discovered: 0, complete: 0, failed: 0, abandoned: 0 };
    for (const suburb of suburbs) {
      const key = suburb.status || 'pending';
      if (key in statusCounts) statusCounts[key] += 1;
      else statusCounts.pending += 1;
    }

    const listHtml = suburbs
      .slice()
      .sort(byName)
      .map((s) => {
        const indicator = statusIndicator(s.status);
        const err = s.error_message ? ` · error: ${escapeHtml(s.error_message)}` : '';
        return `
          <div class="agentItem">
            <div>
              <div class="agentItem__nameRow">
                <div class="agentItem__name">
                  <span class="${escapeHtml(indicator.className)}">${escapeHtml(indicator.symbol)}</span>
                  ${escapeHtml(s.suburb_name)}, ${escapeHtml(s.state)} ${escapeHtml(s.postcode || '')}
                </div>
                <div class="statusPill">${escapeHtml(s.status || 'pending')}</div>
              </div>
              <div class="agentItem__meta">${escapeHtml(s.slug)} · tier ${escapeHtml(s.priority_tier)} · ${
                escapeHtml(s.agencies_found || 0)
              } agencies · ${escapeHtml(s.agents_found || 0)} agents${err}</div>
            </div>
            <div class="agentItem__meta">${escapeHtml(s.region || '')}</div>
          </div>
        `;
      })
      .join('');

    const anyRunnable = suburbs.some((s) => s.status !== 'in_progress');
    detailEl.innerHTML = `
      <div class="detailHeader">
        <div class="detailTitle">
          <h3>Selected suburbs (${escapeHtml(selectedCount)})</h3>
          <p class="muted">Run discovery in batch, monitor status, and retry failures.</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat__label">pending</div><div class="stat__value">${escapeHtml(
          statusCounts.pending
        )}</div></div>
        <div class="stat"><div class="stat__label">in_progress</div><div class="stat__value">${escapeHtml(
          statusCounts.in_progress
        )}</div></div>
        <div class="stat"><div class="stat__label">discovered</div><div class="stat__value">${escapeHtml(
          statusCounts.discovered
        )}</div></div>
        <div class="stat"><div class="stat__label">failed</div><div class="stat__value">${escapeHtml(
          statusCounts.failed + statusCounts.abandoned
        )}</div></div>
      </div>

      <div class="btnRow">
        <button class="btn" id="run-discovery-batch" type="button" ${anyRunnable ? '' : 'disabled'}>
          Run Discovery (${escapeHtml(selectedCount)})
        </button>
        <button class="btn btn--ghost" id="refresh-batch" type="button">Refresh</button>
        <button class="btn btn--ghost" id="retry-failed-batch" type="button" ${
          statusCounts.failed + statusCounts.abandoned > 0 ? '' : 'disabled'
        }>Retry failed</button>
      </div>

      <div class="section">
        <h4>Suburbs</h4>
        <div class="agentList">${listHtml}</div>
      </div>
    `;

    const runBatch = document.getElementById('run-discovery-batch');
    const refreshBatch = document.getElementById('refresh-batch');
    const retryBatch = document.getElementById('retry-failed-batch');
    if (runBatch) runBatch.addEventListener('click', () => triggerBatchDiscovery(selectedSlugs));
    if (refreshBatch) refreshBatch.addEventListener('click', () => refreshBatchSuburbs(selectedSlugs));
    if (retryBatch) retryBatch.addEventListener('click', () => triggerBatchDiscovery(selectedSlugs, { failedOnly: true }));
  }

  async function refreshBatchSuburbs(slugs) {
    const unique = Array.from(new Set(slugs));
    for (const slug of unique) {
      try {
        await refreshSuburbBySlug(slug);
      } catch {
        // ignore
      }
    }
    await renderDetail();
  }

  async function refreshSelectedSuburb() {
    const suburb = findSelectedSuburb();
    if (!suburb) return;
    await refreshSuburbBySlug(suburb.slug);
    await renderDetail();
  }

  async function refreshSuburbBySlug(slug) {
    const updated = await fetchJson(`/api/suburbs/${encodeURIComponent(slug)}`);
    if (!updated || updated.slug !== slug) return;
    state.suburbs = state.suburbs.map((s) => (s.slug === slug ? updated : s));
    renderSuburbList();
  }

  function stopPollingForSlug(slug) {
    const timer = state.pollingTimers.get(slug);
    if (!timer) return;
    window.clearInterval(timer);
    state.pollingTimers.delete(slug);
  }

  function startPollingUntilDone(slug) {
    stopPollingForSlug(slug);
    const timer = window.setInterval(async () => {
      try {
        const before = state.suburbs.find((s) => s.slug === slug) || null;
        await refreshSuburbBySlug(slug);
        const after = state.suburbs.find((s) => s.slug === slug) || null;
        if (before && after && before.status === 'in_progress' && after.status !== 'in_progress') {
          stopPollingForSlug(slug);
          await renderDetail();
        }
      } catch {
        // Keep polling.
      }
    }, 2000);
    state.pollingTimers.set(slug, timer);
  }

  async function triggerDiscovery(suburb) {
    if (!suburb) return;
    if (suburb.status === 'in_progress') return;

    appendUiLog('info', 'discovery', `Starting discovery: ${suburb.suburb_name}, ${suburb.state}`, { slug: suburb.slug });

    const updated = { ...suburb, status: 'in_progress' };
    state.suburbs = state.suburbs.map((s) => (s.slug === suburb.slug ? updated : s));
    renderSuburbList();
    await renderDetail();

    try {
      await fetchJson('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb: suburb.suburb_name, state: suburb.state })
      });
      startPollingUntilDone(suburb.slug);
    } catch (error) {
      appendUiLog('error', 'discovery', 'Failed to start discovery', { error: String(error) });
      await refreshSuburbBySlug(suburb.slug);
      await renderDetail();
    }
  }

  async function triggerBatchDiscovery(slugs, options) {
    const failedOnly = Boolean(options && options.failedOnly);
    const unique = Array.from(new Set(slugs));
    for (const slug of unique) {
      const suburb = state.suburbs.find((s) => s.slug === slug) || null;
      if (!suburb) continue;
      if (suburb.status === 'in_progress') continue;
      if (failedOnly && suburb.status !== 'failed' && suburb.status !== 'abandoned') continue;
      try {
        // Small delay to keep UI responsive and avoid spamming.
        // eslint-disable-next-line no-await-in-loop
        await triggerDiscovery(suburb);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        // Continue batch.
      }
    }
  }

  function appendUiLog(type, route, message, context) {
    const event = {
      id: `ui-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      route,
      message,
      context
    };
    appendLog(event);
  }

  function appendLog(event) {
    if (!event || !event.timestamp || !event.message) return;
    const type = event.type === 'success' ? 'success' : event.type === 'error' ? 'error' : 'info';

    state.logs.push({ ...event, type });
    if (state.logs.length > 200) state.logs.splice(0, state.logs.length - 200);
    renderLogs();
  }

  function matchesLogFilter(entry) {
    if (state.logFilter === 'all') return true;
    if (state.logFilter === 'errors') return entry.type === 'error';
    const route = String(entry.route || '');
    if (state.logFilter === 'discovery') return route === 'discovery' || route.includes('/api/discovery');
    if (state.logFilter === 'enrichment') return route === 'enrichment' || route.includes('/api/enrichment');
    return true;
  }

  function renderLogs() {
    const filtered = state.logs.filter(matchesLogFilter);
    const last = filtered.slice(-200);
    logListEl.innerHTML = last
      .map((l) => {
        const ts = new Date(l.timestamp).toLocaleTimeString();
        const ctx = l.context ? ` ${escapeHtml(JSON.stringify(l.context))}` : '';
        return `
          <div class="logLine">
            <div class="logLine__row">
              <div class="logTs">${escapeHtml(ts)}</div>
              <div class="logType logType--${escapeHtml(l.type)}">${escapeHtml(l.type)}</div>
              <div class="logMsg" title="${escapeHtml(l.message)}">${escapeHtml(l.message)}${ctx}</div>
              <div class="logRoute">${escapeHtml(l.route || '')}</div>
            </div>
          </div>
        `;
      })
      .join('');
    logListEl.scrollTop = logListEl.scrollHeight;
  }

  function connectEvents() {
    try {
      const es = new EventSource('/api/events');
      connectionPillEl.textContent = 'Connected';
      connectionPillEl.classList.add('pill--ok');

      es.addEventListener('ready', () => {
        // no-op
      });

      es.addEventListener('log', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data.route === 'string' && data.route.startsWith('GET /api/suburbs')) return;
          appendLog(data);
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        connectionPillEl.textContent = 'Disconnected';
        connectionPillEl.classList.remove('pill--ok');
        connectionPillEl.classList.add('pill--bad');
      };
    } catch (error) {
      connectionPillEl.textContent = 'Disconnected';
      connectionPillEl.classList.add('pill--bad');
      appendUiLog('error', 'ui', 'Failed to connect to event stream', { error: String(error) });
    }
  }

  function selectSuburb(slug) {
    toggleSelection(slug, { makePrimary: true });
  }

  function setTierFilter(tier) {
    state.tier = tier;
    const buttons = document.querySelectorAll('[data-tier]');
    for (const btn of buttons) {
      btn.classList.toggle('is-active', btn.dataset.tier === String(tier));
    }
    renderSuburbList();
  }

  function bindUi() {
    const buttons = document.querySelectorAll('.segmented__btn');
    for (const btn of buttons) {
      if (btn.dataset.tier) {
        btn.addEventListener('click', () => setTierFilter(btn.dataset.tier || 'all'));
      }
    }

    statusFilterEl.addEventListener('change', () => {
      state.status = statusFilterEl.value;
      renderSuburbList();
    });

    if (regionFilterEl) {
      regionFilterEl.addEventListener('change', () => {
        state.region = regionFilterEl.value;
        renderSuburbList();
      });
    }

    let searchTimer = null;
    searchInputEl.addEventListener('input', () => {
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.search = searchInputEl.value;
        renderSuburbList();
      }, 120);
    });

    clearLogsEl.addEventListener('click', () => {
      state.logs = [];
      renderLogs();
    });

    const logFilterButtons = document.querySelectorAll('[data-log-filter]');
    for (const btn of logFilterButtons) {
      btn.addEventListener('click', () => {
        state.logFilter = btn.dataset.logFilter || 'all';
        for (const other of logFilterButtons) {
          other.classList.toggle('is-active', other.dataset.logFilter === state.logFilter);
        }
        renderLogs();
      });
    }

    if (selectAllEl) {
      selectAllEl.addEventListener('click', () => {
        for (const suburb of filteredSuburbs()) state.selectedSlugs.add(suburb.slug);
        if (!state.selectedSlug && state.selectedSlugs.size > 0) {
          state.selectedSlug = Array.from(state.selectedSlugs)[0];
        }
        renderSuburbList();
        void renderDetail();
      });
    }

    if (clearSelectionEl) {
      clearSelectionEl.addEventListener('click', () => {
        state.selectedSlugs.clear();
        state.selectedSlug = null;
        renderSuburbList();
        void renderDetail();
      });
    }

    if (enrichmentBatchSizeEl) {
      enrichmentBatchSizeEl.addEventListener('change', () => {
        state.enrichment.batchSize = Math.min(Math.max(asSafeNumber(enrichmentBatchSizeEl.value, 5), 1), 50);
      });
    }

    if (runEnrichmentEl) {
      runEnrichmentEl.addEventListener('click', () => {
        void triggerEnrichment();
      });
    }

    if (dashRefreshEl) {
      dashRefreshEl.addEventListener('click', () => {
        void loadDashboard();
      });
    }
  }

  function tagClassForKey(key) {
    if (key === 'complete' || key === 'discovered' || key === 'high') return 'tag tag--good';
    if (key === 'in_progress' || key === 'medium') return 'tag tag--warn';
    if (key === 'failed' || key === 'abandoned') return 'tag tag--bad';
    return 'tag';
  }

  function renderTags(container, counts, preferredOrder) {
    if (!container) return;
    container.innerHTML = '';
    const keys = Object.keys(counts || {});
    const order = Array.isArray(preferredOrder) && preferredOrder.length > 0 ? preferredOrder : keys;
    for (const key of order) {
      if (!Object.prototype.hasOwnProperty.call(counts, key)) continue;
      const value = counts[key];
      const el = document.createElement('span');
      el.className = tagClassForKey(key);
      el.textContent = `${key}: ${value}`;
      container.append(el);
    }
  }

  function renderRecentActivity(events) {
    if (!dashRecentActivityEl) return;
    if (!Array.isArray(events) || events.length === 0) {
      dashRecentActivityEl.innerHTML = '<div class="muted">No recent activity yet.</div>';
      return;
    }
    dashRecentActivityEl.innerHTML = events
      .slice(0, 10)
      .map((e) => {
        const ts = new Date(e.timestamp).toLocaleTimeString();
        const type = e.type === 'success' ? 'success' : e.type === 'error' ? 'error' : 'info';
        return `
          <div class="recentActivity__item">
            <div class="recentActivity__ts">${escapeHtml(ts)}</div>
            <div class="recentActivity__type recentActivity__type--${escapeHtml(type)}">${escapeHtml(type)}</div>
            <div class="recentActivity__msg" title="${escapeHtml(e.message)}">${escapeHtml(e.message)}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderDashboard(data) {
    if (!data || typeof data !== 'object') return;

    const totals = data.totals || {};
    const suburbsByStatus = data.suburbs_by_status || {};
    const enrichmentByStatus = data.enrichment_by_status || {};
    const enrichmentByQuality = data.enrichment_by_quality || {};

    const suburbsTotal = asSafeNumber(totals.suburbs, 0);
    const agenciesTotal = asSafeNumber(totals.agencies, 0);
    const agentsTotal = asSafeNumber(totals.agents, 0);
    const pendingSuburbs = asSafeNumber(suburbsByStatus.pending, 0);
    const processedSuburbs = Math.max(suburbsTotal - pendingSuburbs, 0);

    const enrichmentTotal = asSafeNumber(enrichmentByStatus.total, 0);
    const enrichmentComplete = asSafeNumber(enrichmentByStatus.complete, 0);
    const percent = enrichmentTotal > 0 ? Math.round((enrichmentComplete / enrichmentTotal) * 100) : 0;

    if (dashUpdatedEl) dashUpdatedEl.textContent = data.generated_at ? new Date(data.generated_at).toLocaleString() : '—';
    if (dashSuburbsTotalEl) dashSuburbsTotalEl.textContent = `${suburbsTotal}`;
    if (dashSuburbsProcessedEl) dashSuburbsProcessedEl.textContent = `${processedSuburbs} processed`;
    if (dashAgenciesTotalEl) dashAgenciesTotalEl.textContent = `${agenciesTotal}`;
    if (dashAgentsTotalEl) dashAgentsTotalEl.textContent = `${agentsTotal}`;
    if (dashEnrichmentPercentEl) dashEnrichmentPercentEl.textContent = `${percent}%`;
    if (dashEnrichmentMetaEl) dashEnrichmentMetaEl.textContent = `${enrichmentComplete}/${enrichmentTotal} complete`;
    if (dashEnrichmentBarEl) dashEnrichmentBarEl.style.width = `${percent}%`;

    renderTags(
      dashSuburbStatusEl,
      suburbsByStatus,
      ['pending', 'in_progress', 'discovered', 'complete', 'failed', 'abandoned']
    );
    renderTags(
      dashEnrichmentStatusEl,
      enrichmentByStatus,
      ['pending', 'in_progress', 'complete', 'failed', 'skipped', 'total']
    );
    renderTags(dashEnrichmentQualityEl, enrichmentByQuality, ['high', 'medium', 'low', 'minimal', 'none']);
    renderRecentActivity(data.recent_activity);
  }

  async function loadDashboard() {
    try {
      const data = await fetchJson('/api/stats');
      renderDashboard(data);
    } catch (error) {
      appendUiLog('error', 'ui', 'Failed to load dashboard', { error: String(error) });
    }
  }

  async function init() {
    bindUi();
    connectEvents();
    await loadDashboard();
    await loadSuburbs();
    await loadEnrichmentCounts();
    appendUiLog('info', 'ui', 'Loaded suburbs', { count: state.suburbs.length });

    state.dashboardTimer = window.setInterval(() => {
      void loadDashboard();
    }, 10_000);
  }

  void init();
})();
