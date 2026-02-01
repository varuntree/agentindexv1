(() => {
  const suburbListEl = document.getElementById('suburb-list');
  const suburbCountEl = document.getElementById('suburb-count');
  const detailEl = document.getElementById('detail');
  const statusFilterEl = document.getElementById('status-filter');
  const searchInputEl = document.getElementById('search-input');
  const logListEl = document.getElementById('log-list');
  const clearLogsEl = document.getElementById('clear-logs');
  const connectionPillEl = document.getElementById('connection-pill');

  const state = {
    suburbs: [],
    selectedSlug: null,
    tier: 'all',
    status: 'all',
    search: '',
    logs: [],
    pollingTimer: null
  };

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
        if (!search) return true;
        const haystack = `${s.suburb_name} ${s.state} ${s.postcode || ''}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort(byName);
  }

  function renderSuburbList() {
    const suburbs = filteredSuburbs();
    suburbCountEl.textContent = `${suburbs.length}`;
    suburbListEl.innerHTML = '';

    for (const suburb of suburbs) {
      const indicator = statusIndicator(suburb.status);
      const item = document.createElement('div');
      item.className = `listItem${suburb.slug === state.selectedSlug ? ' is-selected' : ''}`;
      item.setAttribute('role', 'listitem');
      item.dataset.slug = suburb.slug;

      const left = document.createElement('div');
      left.className = 'listItem__left';

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
      left.append(ind, title);

      const right = document.createElement('div');
      right.className = 'listItem__right';
      right.textContent = `${suburb.agencies_found || 0} agencies · ${suburb.agents_found || 0} agents`;

      item.append(left, right);
      item.addEventListener('click', () => selectSuburb(suburb.slug));
      suburbListEl.append(item);
    }
  }

  function setSelectedSlug(slug) {
    state.selectedSlug = slug;
    renderSuburbList();
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
    renderSuburbList();
    renderDetail();
  }

  async function loadAgencies(suburb) {
    const params = new URLSearchParams();
    params.set('suburb', suburb.suburb_name);
    params.set('state', suburb.state);
    params.set('limit', '200');
    const agencies = await fetchJson(`/api/agencies?${params.toString()}`);
    return Array.isArray(agencies) ? agencies : [];
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

  async function renderDetail() {
    const suburb = findSelectedSuburb();
    if (!suburb) {
      detailEl.innerHTML = `
        <div class="empty">
          <p class="muted">Select a suburb from the list to view details.</p>
        </div>
      `;
      return;
    }

    renderDetailLoading(suburb, 'Loading agencies…');

    let agencies = [];
    try {
      agencies = await loadAgencies(suburb);
    } catch (error) {
      agencies = [];
      appendUiLog('error', 'ui', 'Failed to load agencies', { error: String(error) });
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
        <button class="btn btn--ghost" id="refresh-detail" type="button">Refresh</button>
      </div>

      <div class="section">
        <h4>Agencies</h4>
        ${agenciesHtml}
      </div>
    `;

    const runBtn = document.getElementById('run-discovery');
    const refreshBtn = document.getElementById('refresh-detail');
    if (runBtn) runBtn.addEventListener('click', () => triggerDiscovery(suburb));
    if (refreshBtn) refreshBtn.addEventListener('click', () => refreshSelectedSuburb());
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

  function stopPolling() {
    if (state.pollingTimer) {
      window.clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function startPollingUntilDone(slug) {
    stopPolling();
    state.pollingTimer = window.setInterval(async () => {
      try {
        const before = state.suburbs.find((s) => s.slug === slug) || null;
        await refreshSuburbBySlug(slug);
        const after = state.suburbs.find((s) => s.slug === slug) || null;
        if (before && after && before.status === 'in_progress' && after.status !== 'in_progress') {
          stopPolling();
          if (state.selectedSlug === slug) await renderDetail();
        }
      } catch {
        // Keep polling.
      }
    }, 2000);
  }

  async function triggerDiscovery(suburb) {
    if (!suburb) return;
    if (suburb.status === 'in_progress') return;

    appendUiLog('info', 'ui', `Starting discovery: ${suburb.suburb_name}, ${suburb.state}`, { slug: suburb.slug });

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
      appendUiLog('error', 'ui', 'Failed to start discovery', { error: String(error) });
      await refreshSuburbBySlug(suburb.slug);
      await renderDetail();
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

  function renderLogs() {
    const last = state.logs.slice(-200);
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
    setSelectedSlug(slug);
    void renderDetail();
  }

  function setTierFilter(tier) {
    state.tier = tier;
    const buttons = document.querySelectorAll('.segmented__btn');
    for (const btn of buttons) {
      btn.classList.toggle('is-active', btn.dataset.tier === String(tier));
    }
    renderSuburbList();
  }

  function bindUi() {
    const buttons = document.querySelectorAll('.segmented__btn');
    for (const btn of buttons) {
      btn.addEventListener('click', () => setTierFilter(btn.dataset.tier || 'all'));
    }

    statusFilterEl.addEventListener('change', () => {
      state.status = statusFilterEl.value;
      renderSuburbList();
    });

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
  }

  async function init() {
    bindUi();
    connectEvents();
    await loadSuburbs();
    appendUiLog('info', 'ui', 'Loaded suburbs', { count: state.suburbs.length });
  }

  void init();
})();

