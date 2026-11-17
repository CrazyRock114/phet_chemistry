/**
 * PhET Chemistry HTML5 Interactive Simulation Engine
 * High-DPR Canvas 2D + Clamped dt + Two-way Parameter Controls + Pointer Events
 */
(function() {
  const LOGICAL_WIDTH = 900;
  const LOGICAL_HEIGHT = 540;

  let activeSimId = null;
  let activeSimDef = null;
  let simState = {};
  let isPlaying = true;
  let rafId = null;
  let lastTimestamp = 0;
  let pointerDown = false;

  const overlayEl = document.getElementById('workspace-overlay');
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');
  const controlsContainer = document.getElementById('sim-controls-container');
  const readoutsContainer = document.getElementById('sim-readouts-strip');
  const modeTabsContainer = document.getElementById('ws-mode-tabs');

  function setupCanvasDPR() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== LOGICAL_WIDTH * dpr || canvas.height !== LOGICAL_HEIGHT * dpr) {
      canvas.width = LOGICAL_WIDTH * dpr;
      canvas.height = LOGICAL_HEIGHT * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getLogicalCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(LOGICAL_WIDTH, (clientX - rect.left) * (LOGICAL_WIDTH / (rect.width || LOGICAL_WIDTH))));
    const y = Math.max(0, Math.min(LOGICAL_HEIGHT, (clientY - rect.top) * (LOGICAL_HEIGHT / (rect.height || LOGICAL_HEIGHT))));
    return { x, y };
  }

  function notifyParamChange(key, val) {
    if (!activeSimDef) return;
    if (typeof activeSimDef.onParamChange === 'function') {
      activeSimDef.onParamChange(key, val, simState, engineApi);
    } else if (typeof activeSimDef.onControlChange === 'function') {
      activeSimDef.onControlChange(key, val, simState, engineApi);
    }
  }

  const engineApi = {
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    getState: () => simState,
    setParam: (key, val) => {
      simState[key] = val;
      const inputEl = document.getElementById(`ctrl-input-${key}`);
      const badgeEl = document.getElementById(`ctrl-badge-${key}`);
      if (inputEl && inputEl.type !== 'checkbox' && String(inputEl.value) !== String(val)) {
        inputEl.value = val;
      }
      if (inputEl && inputEl.type === 'checkbox') {
        inputEl.checked = Boolean(val);
      }
      if (badgeEl) {
        const ctrlDef = (activeSimDef.controls || []).find(c => (c.id || c.key || c.name) === key);
        const unit = ctrlDef && ctrlDef.unit ? ` ${ctrlDef.unit}` : '';
        badgeEl.textContent = `${typeof val === 'number' ? Number(val.toFixed(3)) : val}${unit}`;
      }
      notifyParamChange(key, val);
      renderReadouts();
    },
    rebuildControls: () => buildControlsUI(),
    reset: () => resetCurrentSim(),
    setReadouts: (items) => {
      simState._customReadouts = items;
      renderReadouts();
    }
  };

  function initSimState(def, keepMode) {
    const prevMode = keepMode && simState.mode ? simState.mode : null;
    simState = { time: 0 };
    if (def.modes && def.modes.length > 0) {
      const m0 = def.modes[0];
      simState.mode = prevMode || (typeof m0 === 'object' ? (m0.id || m0.value) : m0);
    }
    if (def.defaultState) {
      Object.assign(simState, JSON.parse(JSON.stringify(def.defaultState)));
      if (prevMode) simState.mode = prevMode;
    }
    if (Array.isArray(def.controls)) {
      def.controls.forEach(c => {
        const cid = c.id || c.key || c.name;
        if (cid && simState[cid] === undefined) {
          const initVal = c.default !== undefined ? c.default : c.value;
          if (initVal !== undefined) simState[cid] = initVal;
        }
      });
    }
    if (typeof def.init === 'function') {
      const savedMode = simState.mode;
      const ret = def.init(simState, engineApi);
      if (ret && typeof ret === 'object') {
        Object.assign(simState, ret);
      }
      if (keepMode && savedMode) {
        simState.mode = savedMode;
        if (typeof def.onModeChange === 'function') {
          def.onModeChange(savedMode, simState, engineApi);
        }
      }
    }
  }

  function buildModeTabs() {
    modeTabsContainer.innerHTML = '';
    if (!activeSimDef || !Array.isArray(activeSimDef.modes) || activeSimDef.modes.length === 0) {
      return;
    }
    activeSimDef.modes.forEach(m => {
      const mId = typeof m === 'object' ? (m.id || m.value) : m;
      const mLabel = typeof m === 'object' ? (m.label || m.name || mId) : m;
      const btn = document.createElement('button');
      btn.className = `ws-mode-btn ${simState.mode === mId ? 'active' : ''}`;
      btn.textContent = mLabel;
      btn.addEventListener('click', () => {
        simState.mode = mId;
        Array.from(modeTabsContainer.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof activeSimDef.onModeChange === 'function') {
          activeSimDef.onModeChange(mId, simState, engineApi);
        } else {
          notifyParamChange('mode', mId);
        }
        buildControlsUI();
        renderReadouts();
      });
      modeTabsContainer.appendChild(btn);
    });
  }

  function buildControlsUI() {
    controlsContainer.innerHTML = '';
    if (!activeSimDef) return;
    const controls = typeof activeSimDef.getControls === 'function'
      ? activeSimDef.getControls(simState, engineApi)
      : (activeSimDef.controls || []);

    controls.forEach(ctrl => {
      if (ctrl.modes && Array.isArray(ctrl.modes) && !ctrl.modes.includes(simState.mode)) {
        return;
      }
      const cid = ctrl.id || ctrl.key || ctrl.name;
      const wrap = document.createElement('div');
      wrap.className = 'control-group';

      const type = ctrl.type || 'range';
      if (type === 'range' || type === 'slider') {
        const curVal = simState[cid] !== undefined ? simState[cid] : (ctrl.default !== undefined ? ctrl.default : (ctrl.value !== undefined ? ctrl.value : ctrl.min || 0));
        simState[cid] = curVal;
        const unit = ctrl.unit ? ` ${ctrl.unit}` : '';
        const header = document.createElement('div');
        header.className = 'control-header';
        header.innerHTML = `<span class="control-label">${ctrl.label || cid}</span><span class="control-val-badge" id="ctrl-badge-${cid}">${typeof curVal === 'number' ? Number(curVal.toFixed(3)) : curVal}${unit}</span>`;
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `ctrl-input-${cid}`;
        input.min = ctrl.min !== undefined ? ctrl.min : 0;
        input.max = ctrl.max !== undefined ? ctrl.max : 100;
        input.step = ctrl.step !== undefined ? ctrl.step : 1;
        input.value = curVal;
        input.addEventListener('input', () => {
          const numVal = parseFloat(input.value);
          if (!Number.isNaN(numVal)) {
            simState[cid] = numVal;
            const badge = document.getElementById(`ctrl-badge-${cid}`);
            if (badge) badge.textContent = `${Number(numVal.toFixed(3))}${unit}`;
            if (typeof ctrl.onChange === 'function') ctrl.onChange(numVal, simState, engineApi);
            notifyParamChange(cid, numVal);
            renderReadouts();
          }
        });
        wrap.appendChild(header);
        wrap.appendChild(input);
      } else if (type === 'select') {
        const curVal = simState[cid] !== undefined ? simState[cid] : (ctrl.default !== undefined ? ctrl.default : ctrl.value);
        const header = document.createElement('div');
        header.className = 'control-header';
        header.innerHTML = `<span class="control-label">${ctrl.label || cid}</span>`;
        const sel = document.createElement('select');
        sel.className = 'sim-select';
        sel.id = `ctrl-input-${cid}`;
        (ctrl.options || []).forEach(opt => {
          const o = document.createElement('option');
          const val = typeof opt === 'object' ? (opt.value !== undefined ? opt.value : opt.id) : opt;
          const lbl = typeof opt === 'object' ? (opt.label || opt.name || val) : opt;
          o.value = val;
          o.textContent = lbl;
          if (String(val) === String(curVal)) o.selected = true;
          sel.appendChild(o);
        });
        simState[cid] = sel.value;
        sel.addEventListener('change', () => {
          const rawVal = sel.value;
          const matchedOpt = (ctrl.options || []).find(opt => typeof opt === 'object' && String(opt.value !== undefined ? opt.value : opt.id) === rawVal);
          const finalVal = matchedOpt ? (matchedOpt.value !== undefined ? matchedOpt.value : matchedOpt.id) : rawVal;
          simState[cid] = finalVal;
          if (typeof ctrl.onChange === 'function') ctrl.onChange(finalVal, simState, engineApi);
          notifyParamChange(cid, finalVal);
          renderReadouts();
        });
        wrap.appendChild(header);
        wrap.appendChild(sel);
      } else if (type === 'checkbox' || type === 'toggle') {
        const curVal = simState[cid] !== undefined ? Boolean(simState[cid]) : Boolean(ctrl.default !== undefined ? ctrl.default : ctrl.value);
        simState[cid] = curVal;
        const lbl = document.createElement('label');
        lbl.className = 'sim-checkbox-row';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.id = `ctrl-input-${cid}`;
        chk.checked = curVal;
        chk.addEventListener('change', () => {
          simState[cid] = chk.checked;
          if (typeof ctrl.onChange === 'function') ctrl.onChange(chk.checked, simState, engineApi);
          notifyParamChange(cid, chk.checked);
          renderReadouts();
        });
        const span = document.createElement('span');
        span.textContent = ctrl.label || cid;
        lbl.appendChild(chk);
        lbl.appendChild(span);
        wrap.appendChild(lbl);
      } else if (type === 'button' || type === 'buttons') {
        const row = document.createElement('div');
        row.className = 'sim-btn-row';
        const items = ctrl.buttons || [ctrl];
        items.forEach(bDef => {
          const btn = document.createElement('button');
          btn.className = 'sim-inline-btn';
          btn.textContent = bDef.label || bDef.text || bDef.id;
          btn.addEventListener('click', () => {
            const fn = bDef.action || bDef.onClick;
            if (typeof fn === 'function') fn(simState, engineApi);
            renderReadouts();
          });
          row.appendChild(btn);
        });
        wrap.appendChild(row);
      }
      controlsContainer.appendChild(wrap);
    });
  }

  function renderReadouts() {
    if (!activeSimDef) return;
    let items = [];
    if (typeof activeSimDef.getReadouts === 'function') {
      items = activeSimDef.getReadouts(simState, engineApi) || [];
    } else if (Array.isArray(simState._customReadouts)) {
      items = simState._customReadouts;
    }
    readoutsContainer.innerHTML = items.map(it =>
      `<div class="readout-pill"><span class="readout-label">${it.label || it.name}:</span><span class="readout-val">${it.value}${it.unit ? ' ' + it.unit : ''}</span></div>`
    ).join('');
  }

  function stepSimulation(dt) {
    if (!activeSimDef) return;
    simState.time = (simState.time || 0) + dt;
    if (typeof activeSimDef.update === 'function') {
      activeSimDef.update(dt, simState, engineApi);
    }
  }

  function drawSimulation() {
    if (!activeSimDef) return;
    setupCanvasDPR();
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    const renderFn = activeSimDef.render || activeSimDef.draw;
    if (typeof renderFn === 'function') {
      ctx.save();
      renderFn.call(activeSimDef, ctx, LOGICAL_WIDTH, LOGICAL_HEIGHT, simState, engineApi);
      ctx.restore();
    }
  }

  function loop(timestamp) {
    if (!activeSimId) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const rawDt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const dt = Math.max(0.001, Math.min(0.05, rawDt));

    if (isPlaying) {
      stepSimulation(dt);
    }
    drawSimulation();
    renderReadouts();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startLoop() {
    stopLoop();
    lastTimestamp = 0;
    rafId = requestAnimationFrame(loop);
  }

  function resetCurrentSim() {
    if (!activeSimDef) return;
    initSimState(activeSimDef, true);
    buildControlsUI();
    drawSimulation();
    renderReadouts();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!activeSimDef) return;
    pointerDown = true;
    const { x, y } = getLogicalCoords(e);
    if (typeof activeSimDef.onPointerDown === 'function') {
      activeSimDef.onPointerDown(x, y, simState, engineApi, e);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!activeSimDef) return;
    const { x, y } = getLogicalCoords(e);
    if (typeof activeSimDef.onPointerMove === 'function') {
      activeSimDef.onPointerMove(x, y, simState, engineApi, e, pointerDown);
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!activeSimDef || !pointerDown) return;
    pointerDown = false;
    const { x, y } = getLogicalCoords(e);
    if (typeof activeSimDef.onPointerUp === 'function') {
      activeSimDef.onPointerUp(x, y, simState, engineApi, e);
    }
  });

  const playPauseBtn = document.getElementById('btn-play-pause');
  const stepBtn = document.getElementById('btn-step');
  const resetBtn = document.getElementById('btn-reset');

  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? '⏸ 暂停' : '▶ 播放';
    playPauseBtn.classList.toggle('paused', !isPlaying);
  });

  stepBtn.addEventListener('click', () => {
    isPlaying = false;
    playPauseBtn.textContent = '▶ 播放';
    playPauseBtn.classList.add('paused');
    stepSimulation(1 / 60);
    drawSimulation();
    renderReadouts();
  });

  resetBtn.addEventListener('click', () => {
    resetCurrentSim();
  });

  window.openSimulation = function(simId) {
    const meta = window.PHET_CATALOG.find(item => item.id === simId);
    const def = (window.PHET_REGISTRY && window.PHET_REGISTRY[simId]) ||
                (window.SIM_REGISTRY && window.SIM_REGISTRY[simId]) ||
                (window.__PHET_SIMS__ && window.__PHET_SIMS__[simId]) ||
                (window.__registeredSims && window.__registeredSims[simId]);
    if (!meta || !def) return;

    activeSimId = simId;
    activeSimDef = def;
    isPlaying = true;
    playPauseBtn.textContent = '⏸ 暂停';
    playPauseBtn.classList.remove('paused');

    document.getElementById('ws-title-zh').textContent = `${meta.num}. ${meta.nameZh}`;
    document.getElementById('ws-title-en').textContent = `${meta.nameEn} · ${meta.categoryLabel}`;
    document.getElementById('ws-phet-link').href = meta.url;
    document.getElementById('ws-formula-box').textContent = meta.formula;
    document.getElementById('ws-summary-box').textContent = def.description || meta.summary;

    initSimState(def, false);
    buildModeTabs();
    buildControlsUI();
    renderReadouts();

    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    startLoop();
  };

  window.closeSimulation = function() {
    stopLoop();
    activeSimId = null;
    activeSimDef = null;
    overlayEl.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.getElementById('ws-back-btn').addEventListener('click', window.closeSimulation);

  document.getElementById('ws-prev-btn').addEventListener('click', () => {
    if (!activeSimId) return;
    const idx = window.PHET_CATALOG.findIndex(s => s.id === activeSimId);
    const prevIdx = (idx - 1 + window.PHET_CATALOG.length) % window.PHET_CATALOG.length;
    window.openSimulation(window.PHET_CATALOG[prevIdx].id);
  });

  document.getElementById('ws-next-btn').addEventListener('click', () => {
    if (!activeSimId) return;
    const idx = window.PHET_CATALOG.findIndex(s => s.id === activeSimId);
    const nextIdx = (idx + 1) % window.PHET_CATALOG.length;
    window.openSimulation(window.PHET_CATALOG[nextIdx].id);
  });

  const gridEl = document.getElementById('sim-grid');
  const searchInput = document.getElementById('sim-search-input');
  const themeButtons = Array.from(document.querySelectorAll('[data-theme-choice]'));
  const availableThemes = ['lab', 'paper', 'observatory'];
  let activeCategory = 'all';

  function setTheme(theme, persist = true) {
    const selectedTheme = availableThemes.includes(theme) ? theme : 'lab';
    document.documentElement.dataset.theme = selectedTheme;
    themeButtons.forEach(button => {
      const isActive = button.dataset.themeChoice === selectedTheme;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    if (persist) {
      try {
        localStorage.setItem('phet-chemistry-theme', selectedTheme);
      } catch (error) {
        // Keep the selected theme active for this session when storage is unavailable.
      }
    }
  }

  let savedTheme = 'lab';
  try {
    savedTheme = localStorage.getItem('phet-chemistry-theme') || 'lab';
  } catch (error) {
    // Use the default theme when storage is unavailable.
  }
  setTheme(savedTheme, false);
  themeButtons.forEach(button => {
    button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
  });

  function renderCatalog() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const filtered = window.PHET_CATALOG.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchQ = !q ||
        item.nameZh.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    document.getElementById('visible-sim-count').textContent = `显示 ${filtered.length} / ${window.PHET_CATALOG.length} 个化学仿真实验`;

    gridEl.innerHTML = filtered.map(item => `
      <article class="sim-card" data-sim-id="${item.id}" tabindex="0" role="button" aria-label="打开实验：${item.nameZh}，${item.nameEn}" onclick="window.openSimulation('${item.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openSimulation('${item.id}')}">
        <div>
          <div class="sim-card-top">
            <span class="sim-num">#${String(item.num).padStart(2, '0')}</span>
            <div class="sim-badges">
              <span class="sim-badge ${item.badge === 'New Sim' ? 'new-sim' : ''}">${item.badge}</span>
              <span class="sim-badge">${item.grade}</span>
            </div>
          </div>
          <div class="sim-title-zh">${item.nameZh}</div>
          <div class="sim-title-en">${item.nameEn}</div>
          <div class="sim-formula-box" title="${item.formula}">${item.formula}</div>
          <p class="sim-summary">${item.summary}</p>
        </div>
        <div class="sim-card-footer">
          <span class="sim-cat-tag">${item.categoryLabel}</span>
          <span class="sim-launch-btn" onclick="event.stopPropagation(); window.openSimulation('${item.id}')">进入实验 →</span>
        </div>
      </article>
    `).join('');
  }

  Array.from(document.querySelectorAll('.cat-btn')).forEach(btn => {
    btn.addEventListener('click', () => {
      Array.from(document.querySelectorAll('.cat-btn')).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat');
      renderCatalog();
    });
  });

  searchInput.addEventListener('input', renderCatalog);

  window.addEventListener('DOMContentLoaded', () => {
    renderCatalog();
  });
  renderCatalog();
})();
