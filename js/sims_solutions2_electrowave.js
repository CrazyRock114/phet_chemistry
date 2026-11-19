/**
 * PhET Chemistry HTML5 Simulations - Group 5 (7 Simulations)
 * File: /Users/crazyrock/gemini/phet_chemistry/js/sims_solutions2_electrowave.js
 *
 * Implements:
 * 1. 'acid-base-solutions'            (酸碱溶液)
 * 2. 'membrane-transport'             (膜运输)
 * 3. 'coulombs-law'                   (库仑定律)
 * 4. 'balloons-and-static-electricity'(气球与静电)
 * 5. 'wave-on-a-string'               (绳波)
 * 6. 'fourier-making-waves'           (傅里叶：造波)
 * 7. 'blackbody-spectrum'             (黑体光谱)
 *
 * Logical Canvas Dimensions: width = 900, height = 540
 */

(function () {
  'use strict';

  const W = 900;
  const H = 540;

  window.SIM_REGISTRY = window.SIM_REGISTRY || {};
  if (typeof window.registerSim !== 'function') {
    window.registerSim = function (id, config) {
      window.SIM_REGISTRY[id] = config;
    };
  }

  // ============================================================================
  // Shared Utilities & Universal Engine Adapter
  // ============================================================================

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth) {
    const radius = Math.min(r || 6, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth || 1.5;
      ctx.stroke();
    }
  }

  function drawShadowCard(ctx, x, y, w, h, r, bg, border) {
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, r || 10, bg || '#1e293b', border || '#334155', 1.2);
    ctx.restore();
  }

  function drawButton(ctx, rect, label, active, accentColor) {
    const accent = accentColor || '#38bdf8';
    const bg = active ? accent : 'rgba(30, 41, 59, 0.92)';
    const border = active ? '#ffffff' : 'rgba(148, 163, 184, 0.45)';
    const textCol = active ? '#0f172a' : '#e2e8f0';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r || 6, bg, border, active ? 1.8 : 1.2);
    ctx.fillStyle = textCol;
    ctx.font = (active ? 'bold ' : '600 ') + (rect.fontSize || 12) + 'px system-ui, -apple-system, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  function drawSlider(ctx, rect, label, valText, ratio, accentColor) {
    const accent = accentColor || '#38bdf8';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11.5px system-ui, -apple-system, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, rect.x, rect.y - 4);
    ctx.fillStyle = accent;
    ctx.font = 'bold 11.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(valText, rect.x + rect.w, rect.y - 4);

    const cy = rect.y + rect.h / 2;
    roundRect(ctx, rect.x, cy - 3, rect.w, 6, 3, '#0f172a', '#475569', 1);
    const fillW = clamp(ratio, 0, 1) * rect.w;
    if (fillW > 1) {
      roundRect(ctx, rect.x, cy - 3, fillW, 6, 3, accent, null);
    }
    const knobX = rect.x + fillW;
    ctx.beginPath();
    ctx.arc(knobX, cy, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, width, label) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(12, Math.max(7, len * 0.32));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * (headLen * 0.65), y2 - Math.sin(angle) * (headLen * 0.65));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 5);
    }
    ctx.restore();
  }

  function inRect(x, y, r) {
    return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function formatSci(val, digits) {
    const d = digits !== undefined ? digits : 2;
    if (val === 0 || !isFinite(val)) return '0';
    const abs = Math.abs(val);
    if (abs >= 0.01 && abs < 10000) return val.toFixed(d);
    const exp = Math.floor(Math.log10(abs));
    const mant = (val / Math.pow(10, exp)).toFixed(d);
    const supMap = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    const expStr = String(exp).split('').map(c => supMap[c] || c).join('');
    return `${mant}×10${expStr}`;
  }

  function wavelengthToRGB(lambdaNm) {
    let r = 0, g = 0, b = 0;
    if (lambdaNm >= 380 && lambdaNm < 440) {
      r = -(lambdaNm - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (lambdaNm >= 440 && lambdaNm < 490) {
      r = 0;
      g = (lambdaNm - 440) / (490 - 440);
      b = 1;
    } else if (lambdaNm >= 490 && lambdaNm < 510) {
      r = 0;
      g = 1;
      b = -(lambdaNm - 510) / (510 - 490);
    } else if (lambdaNm >= 510 && lambdaNm < 580) {
      r = (lambdaNm - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (lambdaNm >= 580 && lambdaNm < 645) {
      r = 1;
      g = -(lambdaNm - 645) / (645 - 580);
      b = 0;
    } else if (lambdaNm >= 645 && lambdaNm <= 780) {
      r = 1;
      g = 0;
      b = 0;
    }
    let factor = 1;
    if (lambdaNm >= 380 && lambdaNm < 420) {
      factor = 0.3 + 0.7 * (lambdaNm - 380) / (420 - 380);
    } else if (lambdaNm > 700 && lambdaNm <= 780) {
      factor = 0.3 + 0.7 * (780 - lambdaNm) / (780 - 700);
    } else if (lambdaNm < 380 || lambdaNm > 780) {
      factor = 0;
    }
    const R = Math.round(255 * Math.pow(r * factor, 0.8));
    const G = Math.round(255 * Math.pow(g * factor, 0.8));
    const B = Math.round(255 * Math.pow(b * factor, 0.8));
    return `rgb(${R},${G},${B})`;
  }

  let activeCanvasSimId = null;
  const boundCanvases = new WeakSet();
  const canvasHandlers = {};

  function bindCanvasOnce(canvas) {
    if (!canvas || typeof canvas.addEventListener !== 'function' || boundCanvases.has(canvas)) return;
    boundCanvases.add(canvas);

    function getLogicalCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / (rect.width || W)) * W;
      const y = ((clientY - rect.top) / (rect.height || H)) * H;
      return { x: clamp(x, 0, W), y: clamp(y, 0, H) };
    }

    canvas.addEventListener('pointerdown', function (e) {
      const h = canvasHandlers[activeCanvasSimId];
      if (!h) return;
      const pt = getLogicalCoords(e);
      h.down(pt.x, pt.y, e);
    });

    canvas.addEventListener('pointermove', function (e) {
      const h = canvasHandlers[activeCanvasSimId];
      if (!h) return;
      const pt = getLogicalCoords(e);
      h.move(pt.x, pt.y, e);
    });

    window.addEventListener('pointerup', function (e) {
      const h = canvasHandlers[activeCanvasSimId];
      if (!h) return;
      h.up(e);
    });
  }

  function createSimAdapter(id, meta, def) {
    const internalState = Object.assign({}, def.defaultState ? def.defaultState() : {});
    let initialized = false;
    let lastUpdateMs = 0;
    let lastPointerDownMs = 0;
    let lastPointerMoveMs = 0;
    let lastPointerUpMs = 0;

    function syncExternalState(extState) {
      if (extState && typeof extState === 'object' && extState !== internalState && !extState.canvas && typeof extState.fillRect !== 'function') {
        for (const k of Object.keys(internalState)) {
          if (extState[k] !== undefined && extState[k] !== internalState[k] && def.controlKeys && def.controlKeys.includes(k)) {
            internalState[k] = extState[k];
          }
        }
        Object.assign(extState, internalState);
      }
      return internalState;
    }

    function ensureInit(extState) {
      const s = syncExternalState(extState);
      if (!initialized) {
        initialized = true;
        if (def.onInit) def.onInit(s);
      }
      return s;
    }

    function resolveCtx(args) {
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a && typeof a.fillRect === 'function' && typeof a.beginPath === 'function') return a;
        if (a && a.ctx && typeof a.ctx.fillRect === 'function') return a.ctx;
        if (a && typeof a.getContext === 'function') return a.getContext('2d');
      }
      return null;
    }

    function resolveState(args) {
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a && typeof a === 'object' && typeof a.fillRect !== 'function' && typeof a.getContext !== 'function' && !a.preventDefault) {
          if (a.state && typeof a.state === 'object') return a.state;
          return a;
        }
      }
      return internalState;
    }

    function resolveDt(args) {
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'number' && args[i] > 0 && args[i] < 5) {
          return args[i];
        }
      }
      return 0.016;
    }

    function extractXY(args) {
      if (typeof args[0] === 'number' && typeof args[1] === 'number') {
        return { x: args[0], y: args[1] };
      }
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a && typeof a === 'object') {
          if (typeof a.x === 'number' && typeof a.y === 'number') return { x: a.x, y: a.y };
          if (typeof a.offsetX === 'number' && typeof a.offsetY === 'number') return { x: a.offsetX, y: a.offsetY };
        }
      }
      return { x: 0, y: 0 };
    }

    function handleDown(x, y) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastPointerDownMs < 8) return;
      lastPointerDownMs = now;
      ensureInit(internalState);
      if (def.onDown) def.onDown(internalState, x, y);
    }

    function handleMove(x, y) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastPointerMoveMs < 4) return;
      lastPointerMoveMs = now;
      ensureInit(internalState);
      if (def.onMove) def.onMove(internalState, x, y);
    }

    function handleUp() {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastPointerUpMs < 8) return;
      lastPointerUpMs = now;
      ensureInit(internalState);
      if (def.onUp) def.onUp(internalState);
    }

    canvasHandlers[id] = {
      down: handleDown,
      move: handleMove,
      up: handleUp
    };

    const config = {
      id: id,
      title: meta.title,
      name: meta.title,
      subtitle: meta.subtitle || '',
      description: meta.description || '',
      category: meta.category || 'chemistry',
      width: W,
      height: H,
      state: internalState,
      defaults: def.defaultState ? def.defaultState() : {},
      controls: def.controls || [],

      init: function (...args) {
        activeCanvasSimId = id;
        const fresh = def.defaultState ? def.defaultState() : {};
        Object.assign(internalState, fresh);
        initialized = true;
        if (def.onInit) def.onInit(internalState);
        const ext = resolveState(args);
        if (ext && ext !== internalState) Object.assign(ext, internalState);
        const ctx = resolveCtx(args);
        if (ctx && ctx.canvas) bindCanvasOnce(ctx.canvas);
        return internalState;
      },

      setup: function (...args) {
        return config.init(...args);
      },

      reset: function (...args) {
        return config.init(...args);
      },

      onParamChange: function (key, value, extState) {
        internalState[key] = value;
        if (extState && typeof extState === 'object') extState[key] = value;
        if (def.onControlChange) def.onControlChange(internalState, key, value);
      },

      onControlChange: function (key, value, extState) {
        return config.onParamChange(key, value, extState);
      },

      update: function (...args) {
        activeCanvasSimId = id;
        const ext = resolveState(args);
        const s = ensureInit(ext);
        const dt = clamp(resolveDt(args), 0.001, 0.05);
        lastUpdateMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (def.onUpdate) def.onUpdate(s, dt);
        if (ext && ext !== internalState) Object.assign(ext, internalState);
      },

      step: function (...args) {
        return config.update(...args);
      },

      draw: function (...args) {
        activeCanvasSimId = id;
        const ctx = resolveCtx(args) || (this && this.ctx);
        if (!ctx) return;
        if (ctx.canvas) bindCanvasOnce(ctx.canvas);
        const ext = resolveState(args);
        const s = ensureInit(ext);
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (now - lastUpdateMs > 12) {
          lastUpdateMs = now;
          if (def.onUpdate) def.onUpdate(s, 0.016);
        }
        ctx.save();
        def.onDraw(ctx, s, W, H);
        ctx.restore();
        if (ext && ext !== internalState) Object.assign(ext, internalState);
      },

      render: function (...args) {
        return config.draw(...args);
      },

      onMouseDown: function (...args) {
        const pt = extractXY(args);
        handleDown(pt.x, pt.y);
      },
      onMouseMove: function (...args) {
        const pt = extractXY(args);
        handleMove(pt.x, pt.y);
      },
      onMouseUp: function () {
        handleUp();
      },
      onPointerDown: function (...args) {
        const pt = extractXY(args);
        handleDown(pt.x, pt.y);
      },
      onPointerMove: function (...args) {
        const pt = extractXY(args);
        handleMove(pt.x, pt.y);
      },
      onPointerUp: function () {
        handleUp();
      },
      mouseDown: function (...args) {
        const pt = extractXY(args);
        handleDown(pt.x, pt.y);
      },
      mouseMove: function (...args) {
        const pt = extractXY(args);
        handleMove(pt.x, pt.y);
      },
      mouseUp: function () {
        handleUp();
      },
      onClick: function (...args) {
        const pt = extractXY(args);
        handleDown(pt.x, pt.y);
        handleUp();
      }
    };

    window.registerSim(id, config);
    return config;
  }

  // ============================================================================
  // 1. 'acid-base-solutions' (酸碱溶液)
  // ============================================================================

  const PH_PALETTE = [
    '#ef4444', // 0
    '#f97316', // 1
    '#fb923c', // 2
    '#facc15', // 3
    '#eab308', // 4
    '#a3e635', // 5
    '#4ade80', // 6
    '#22c55e', // 7
    '#14b8a6', // 8
    '#06b6d4', // 9
    '#3b82f6', // 10
    '#6366f1', // 11
    '#8b5cf6', // 12
    '#7c3aed', // 13
    '#581c87'  // 14
  ];

  function getPhColor(ph) {
    const idx = clamp(Math.round(ph), 0, 14);
    return PH_PALETTE[idx];
  }

  function computeAcidBaseEquilibrium(s) {
    const Kw = 1.0e-14;
    let c = clamp(Number(s.concentration) || 0.01, 0.001, 1.0);
    let pK = clamp(Number(s.pK) || 4.74, 1.0, 10.0);
    let type = s.customType || 'weak-acid';

    if (s.mode === 'known') {
      type = s.knownSolution || 'weak-acid';
      if (type === 'water') {
        c = 0;
      } else {
        c = 0.01;
        pK = 4.74;
      }
    }

    let cH3O = 1e-7;
    let cOH = 1e-7;
    let cMol = 0;
    let cIon = 0;
    let equation = '2 H₂O ⇌ H₃O⁺ + OH⁻';
    let molLabel = 'HA';
    let ionLabel = 'A⁻';

    if (type === 'water') {
      cH3O = 1e-7;
      cOH = 1e-7;
      cMol = 0;
      cIon = 0;
      equation = '2 H₂O(l) ⇌ H₃O⁺(aq) + OH⁻(aq)';
      molLabel = 'H₂O';
      ionLabel = '-';
    } else if (type === 'strong-acid') {
      cH3O = (c + Math.sqrt(c * c + 4 * Kw)) / 2;
      cOH = Kw / cH3O;
      cIon = c;
      cMol = 0;
      equation = 'HA(aq) + H₂O(l) → A⁻(aq) + H₃O⁺(aq)';
      molLabel = 'HA';
      ionLabel = 'A⁻';
    } else if (type === 'weak-acid') {
      const Ka = Math.pow(10, -pK);
      const x = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * c)) / 2;
      cH3O = Math.max(1e-7, x);
      cOH = Kw / cH3O;
      cIon = x;
      cMol = Math.max(0, c - x);
      equation = 'HA(aq) + H₂O(l) ⇌ A⁻(aq) + H₃O⁺(aq)';
      molLabel = 'HA';
      ionLabel = 'A⁻';
    } else if (type === 'strong-base') {
      cOH = (c + Math.sqrt(c * c + 4 * Kw)) / 2;
      cH3O = Kw / cOH;
      cIon = c;
      cMol = 0;
      equation = 'MOH(aq) → M⁺(aq) + OH⁻(aq)';
      molLabel = 'MOH';
      ionLabel = 'M⁺';
    } else if (type === 'weak-base') {
      const Kb = Math.pow(10, -pK);
      const x = (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * c)) / 2;
      cOH = Math.max(1e-7, x);
      cH3O = Kw / cOH;
      cIon = x;
      cMol = Math.max(0, c - x);
      equation = 'B(aq) + H₂O(l) ⇌ BH⁺(aq) + OH⁻(aq)';
      molLabel = 'B';
      ionLabel = 'BH⁺';
    }

    const pH = -Math.log10(cH3O);
    const totalIons = cH3O + cOH + cIon;
    const logIons = Math.log10(Math.max(1e-7, totalIons));
    const brightness = clamp((logIons + 7) / 6.8, 0.02, 1.0);

    return {
      type,
      c,
      pK,
      cH2O: 55.6,
      cMol,
      cIon,
      cH3O,
      cOH,
      pH,
      totalIons,
      brightness,
      equation,
      molLabel,
      ionLabel
    };
  }

  createSimAdapter(
    'acid-base-solutions',
    {
      title: '酸碱溶液 (Acid-Base Solutions)',
      subtitle: '强弱酸碱电离平衡、微观粒子放大镜、pH计/试纸与导电性测试',
      category: 'solutions'
    },
    {
      controlKeys: ['mode', 'knownSolution', 'customType', 'concentration', 'pK', 'tool', 'showSolvent'],
      controls: [
        {
          id: 'mode',
          key: 'mode',
          label: '实验模式',
          type: 'select',
          value: 'known',
          options: [
            { value: 'known', label: '已知溶液 (Introduction)' },
            { value: 'custom', label: '自定义溶液 (My Solution)' }
          ]
        },
        {
          id: 'knownSolution',
          key: 'knownSolution',
          label: '溶液种类',
          type: 'select',
          value: 'weak-acid',
          options: [
            { value: 'water', label: '纯水 (H₂O)' },
            { value: 'strong-acid', label: '强酸 (HA)' },
            { value: 'weak-acid', label: '弱酸 (HA)' },
            { value: 'strong-base', label: '强碱 (MOH)' },
            { value: 'weak-base', label: '弱碱 (B)' }
          ]
        },
        {
          id: 'concentration',
          key: 'concentration',
          label: '初始浓度 c (mol/L)',
          type: 'slider',
          min: 0.001,
          max: 1.0,
          step: 0.005,
          value: 0.01
        },
        {
          id: 'pK',
          key: 'pK',
          label: '电离常数 pKa / pKb',
          type: 'slider',
          min: 1.0,
          max: 10.0,
          step: 0.1,
          value: 4.74
        },
        {
          id: 'tool',
          key: 'tool',
          label: '测试工具',
          type: 'select',
          value: 'ph-meter',
          options: [
            { value: 'ph-meter', label: '数字 pH 计探针' },
            { value: 'ph-paper', label: '广泛 pH 试纸 (0~14)' },
            { value: 'conductivity', label: '导电性灯泡测试仪' }
          ]
        }
      ],

      defaultState: function () {
        const particles = [];
        for (let i = 0; i < 44; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.sqrt(Math.random()) * 94;
          particles.push({
            x: Math.cos(ang) * rad,
            y: Math.sin(ang) * rad,
            vx: (Math.random() - 0.5) * 32,
            vy: (Math.random() - 0.5) * 32,
            phase: Math.random() * Math.PI * 2
          });
        }
        return {
          mode: 'known',
          knownSolution: 'weak-acid',
          customType: 'weak-acid',
          concentration: 0.05,
          pK: 4.74,
          tool: 'ph-meter',
          showSolvent: false,
          probeDepth: 1.0,
          paperDipped: true,
          dragging: null,
          time: 0,
          particles: particles,
          uiRects: {}
        };
      },

      onUpdate: function (s, dt) {
        s.time += dt;
        const R = 96;
        for (let i = 0; i < s.particles.length; i++) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const d = Math.hypot(p.x, p.y);
          if (d > R) {
            const nx = p.x / d;
            const ny = p.y / d;
            p.x = nx * R;
            p.y = ny * R;
            const dot = p.vx * nx + p.vy * ny;
            p.vx -= 2 * dot * nx;
            p.vy -= 2 * dot * ny;
          }
        }
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (inRect(x, y, u.modeKnown)) { s.mode = 'known'; return; }
        if (inRect(x, y, u.modeCustom)) { s.mode = 'custom'; return; }

        if (s.mode === 'known' && u.knownBtns) {
          for (const b of u.knownBtns) {
            if (inRect(x, y, b.rect)) {
              s.knownSolution = b.val;
              s.paperDipped = true;
              return;
            }
          }
        }
        if (s.mode === 'custom') {
          if (u.customTypeBtns) {
            for (const b of u.customTypeBtns) {
              if (inRect(x, y, b.rect)) {
                s.customType = b.val;
                return;
              }
            }
          }
          if (inRect(x, y, u.concSlider)) {
            s.dragging = 'conc';
            this.onMove(s, x, y);
            return;
          }
          if (inRect(x, y, u.pkSlider)) {
            s.dragging = 'pK';
            this.onMove(s, x, y);
            return;
          }
        }

        if (u.toolBtns) {
          for (const b of u.toolBtns) {
            if (inRect(x, y, b.rect)) {
              s.tool = b.val;
              s.probeDepth = 1.0;
              s.paperDipped = true;
              return;
            }
          }
        }

        if (inRect(x, y, u.solventBtn)) {
          s.showSolvent = !s.showSolvent;
          return;
        }

        if (inRect(x, y, u.dipToggleBtn)) {
          s.probeDepth = s.probeDepth > 0.5 ? 0.0 : 1.0;
          if (s.probeDepth > 0.5) s.paperDipped = true;
          return;
        }

        if (x >= 40 && x <= 340 && y >= 70 && y <= 460) {
          s.dragging = 'probe';
          this.onMove(s, x, y);
        }
      },

      onMove: function (s, x, y) {
        const u = s.uiRects || {};
        if (s.dragging === 'conc' && u.concSlider) {
          const ratio = clamp((x - u.concSlider.x) / u.concSlider.w, 0, 1);
          s.concentration = Number(Math.pow(10, -3 + ratio * 3).toFixed(3));
        } else if (s.dragging === 'pK' && u.pkSlider) {
          const ratio = clamp((x - u.pkSlider.x) / u.pkSlider.w, 0, 1);
          s.pK = Number((1.0 + ratio * 9.0).toFixed(2));
        } else if (s.dragging === 'probe') {
          s.probeDepth = clamp((y - 130) / 145, 0, 1);
          if (s.probeDepth > 0.35) s.paperDipped = true;
        }
      },

      onUp: function (s) {
        s.dragging = null;
      },

      onDraw: function (ctx, s) {
        const eq = computeAcidBaseEquilibrium(s);
        s.uiRects = {};

        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('酸碱溶液电离平衡仿真 (Acid-Base Solutions)', 28, 33);

        roundRect(ctx, 370, 17, 290, 32, 8, '#0f172a', '#38bdf8', 1.2);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(eq.equation, 515, 33);

        const mKnown = { x: 678, y: 17, w: 98, h: 32, r: 7 };
        const mCustom = { x: 782, y: 17, w: 92, h: 32, r: 7 };
        s.uiRects.modeKnown = mKnown;
        s.uiRects.modeCustom = mCustom;
        drawButton(ctx, mKnown, '已知溶液', s.mode === 'known', '#38bdf8');
        drawButton(ctx, mCustom, '自定义溶液', s.mode === 'custom', '#f59e0b');

        const beakerX = 52;
        const beakerY = 200;
        const beakerW = 240;
        const beakerH = 265;
        const liquidTop = beakerY + 42;

        const phCol = getPhColor(eq.pH);
        ctx.save();
        roundRect(ctx, beakerX + 4, liquidTop, beakerW - 8, beakerH - 46, 8, 'rgba(56, 189, 248, 0.16)', null);
        ctx.globalAlpha = 0.14;
        roundRect(ctx, beakerX + 4, liquidTop, beakerW - 8, beakerH - 46, 8, phCol, null);
        ctx.restore();

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(beakerX + 5, liquidTop);
        ctx.lineTo(beakerX + beakerW - 5, liquidTop);
        ctx.stroke();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(beakerX, beakerY);
        ctx.lineTo(beakerX, beakerY + beakerH);
        ctx.lineTo(beakerX + beakerW, beakerY + beakerH);
        ctx.lineTo(beakerX + beakerW, beakerY);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'right';
        for (let ml = 200; ml <= 800; ml += 200) {
          const gy = beakerY + beakerH - (ml / 1000) * beakerH;
          ctx.beginPath();
          ctx.moveTo(beakerX + beakerW - 14, gy);
          ctx.lineTo(beakerX + beakerW, gy);
          ctx.strokeStyle = 'rgba(148,163,184,0.45)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillText(ml + ' mL', beakerX + beakerW - 18, gy + 3);
        }

        const magCX = beakerX + beakerW / 2;
        const magCY = liquidTop + 114;
        const magR = 98;

        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(magCX + magR * 0.72, magCY + magR * 0.72);
        ctx.lineTo(magCX + magR * 1.12, magCY + magR * 1.12);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(magCX, magCY, magR, 0, Math.PI * 2);
        ctx.fillStyle = '#091526';
        ctx.fill();
        ctx.clip();

        if (s.showSolvent) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
          for (let gx = -80; gx <= 80; gx += 26) {
            for (let gy = -80; gy <= 80; gy += 26) {
              const ox = magCX + gx + Math.sin(s.time * 2 + gy) * 3;
              const oy = magCY + gy + Math.cos(s.time * 2 + gx) * 3;
              ctx.beginPath();
              ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        const totalP = s.particles.length;
        let nMol = 0, nIon = 0, nH3O = 0, nOH = 0;
        if (eq.type === 'water') {
          nH3O = 3;
          nOH = 3;
          nMol = s.showSolvent ? totalP - 6 : 4;
        } else {
          const concScale = clamp((Math.log10(eq.c) + 3.3) / 3.3, 0.22, 1.0);
          const activeCount = Math.max(8, Math.round(totalP * concScale));
          const dissocRatio = eq.c > 0 ? clamp(eq.cIon / eq.c, 0, 1) : 0;
          if (eq.type === 'strong-acid') {
            nMol = 0;
            nIon = Math.round(activeCount * 0.5);
            nH3O = Math.round(activeCount * 0.5);
            nOH = 1;
          } else if (eq.type === 'weak-acid') {
            const ionPairs = Math.max(2, Math.round(activeCount * 0.45 * Math.pow(dissocRatio, 0.38)));
            nIon = ionPairs;
            nH3O = ionPairs;
            nMol = Math.max(2, activeCount - ionPairs * 2);
            nOH = 1;
          } else if (eq.type === 'strong-base') {
            nMol = 0;
            nIon = Math.round(activeCount * 0.5);
            nOH = Math.round(activeCount * 0.5);
            nH3O = 1;
          } else if (eq.type === 'weak-base') {
            const ionPairs = Math.max(2, Math.round(activeCount * 0.45 * Math.pow(dissocRatio, 0.38)));
            nIon = ionPairs;
            nOH = ionPairs;
            nMol = Math.max(2, activeCount - ionPairs * 2);
            nH3O = 1;
          }
        }

        const speciesList = [];
        for (let i = 0; i < nMol; i++) speciesList.push('mol');
        for (let i = 0; i < nIon; i++) speciesList.push('ion');
        for (let i = 0; i < nH3O; i++) speciesList.push('H3O');
        for (let i = 0; i < nOH; i++) speciesList.push('OH');

        for (let i = 0; i < speciesList.length && i < s.particles.length; i++) {
          const p = s.particles[i];
          const sp = speciesList[i];
          const px = magCX + p.x;
          const py = magCY + p.y;

          let col = '#94a3b8';
          let lbl = eq.molLabel;
          let rad = 9.5;
          if (sp === 'mol') {
            col = eq.type === 'water' ? '#64748b' : '#a855f7';
            lbl = eq.molLabel;
            rad = 10;
          } else if (sp === 'ion') {
            col = eq.type.includes('acid') ? '#22c55e' : '#eab308';
            lbl = eq.ionLabel;
            rad = 9.5;
          } else if (sp === 'H3O') {
            col = '#ef4444';
            lbl = 'H₃O⁺';
            rad = 11;
          } else if (sp === 'OH') {
            col = '#3b82f6';
            lbl = 'OH⁻';
            rad = 10;
          }

          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lbl, px, py);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(magCX, magCY, magR, 0, Math.PI * 2);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.stroke();

        const solvBtn = { x: beakerX, y: beakerY + beakerH + 12, w: 138, h: 28, r: 6 };
        const dipBtn = { x: beakerX + 146, y: beakerY + beakerH + 12, w: 94, h: 28, r: 6 };
        s.uiRects.solventBtn = solvBtn;
        s.uiRects.dipToggleBtn = dipBtn;
        drawButton(ctx, solvBtn, s.showSolvent ? '隐藏 H₂O 分子' : '显示 H₂O 分子', s.showSolvent, '#38bdf8');
        drawButton(ctx, dipBtn, s.probeDepth > 0.5 ? '提起探针/试纸' : '浸入溶液', s.probeDepth > 0.5, '#10b981');

        const immersed = s.probeDepth > 0.45;
        const probeOffsetY = (1 - s.probeDepth) * 92;

        if (s.tool === 'ph-meter') {
          const meterX = 56;
          const meterY = 74;
          drawShadowCard(ctx, meterX, meterY, 152, 62, 8, '#0f172a', '#38bdf8');
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('数字 pH 计 (可拖拽探针)', meterX + 10, meterY + 18);

          roundRect(ctx, meterX + 10, meterY + 26, 132, 28, 5, '#022c22', '#10b981', 1.2);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 17px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(immersed ? `pH = ${eq.pH.toFixed(2)}` : 'pH = ---', meterX + 76, meterY + 41);

          const tipX = beakerX + 34;
          const tipY = liquidTop + 38 - probeOffsetY;
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(meterX + 30, meterY + 62);
          ctx.lineTo(tipX, tipY - 50);
          ctx.stroke();

          roundRect(ctx, tipX - 7, tipY - 50, 14, 48, 4, '#475569', '#cbd5e1', 1.2);
          ctx.beginPath();
          ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
          ctx.fillStyle = immersed ? phCol : '#94a3b8';
          ctx.fill();
        } else if (s.tool === 'ph-paper') {
          const stripX = beakerX + 32;
          const stripTop = 104 - probeOffsetY * 0.7;
          const stripH = 150;
          roundRect(ctx, stripX, stripTop, 22, stripH, 3, '#fde68a', '#d97706', 1.2);

          if (s.paperDipped) {
            const wetH = clamp(stripTop + stripH - liquidTop, 28, 80);
            roundRect(ctx, stripX + 1, stripTop + stripH - wetH, 20, wetH - 1, 2, phCol, null);
          }

          const chartX = 112;
          const chartY = 68;
          drawShadowCard(ctx, chartX, chartY, 212, 122, 8, '#0f172a', '#475569');
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 11.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('广泛 pH 试纸标准比色卡 (0 ~ 14)', chartX + 10, chartY + 18);

          for (let i = 0; i <= 14; i++) {
            const col = i < 8 ? 0 : 1;
            const row = i < 8 ? i : i - 8;
            const bx = chartX + 12 + col * 98;
            const by = chartY + 28 + row * 11.2;
            ctx.fillStyle = PH_PALETTE[i];
            ctx.fillRect(bx, by, 26, 9.5);
            if (Math.round(eq.pH) === i && s.paperDipped) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.strokeRect(bx - 2, by - 1, 30, 11.5);
            }
            ctx.fillStyle = Math.round(eq.pH) === i ? '#38bdf8' : '#cbd5e1';
            ctx.font = (Math.round(eq.pH) === i ? 'bold ' : '') + '10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`pH ${i}`, bx + 32, by + 5);
          }
        } else if (s.tool === 'conductivity') {
          const bulbCX = 172;
          const bulbCY = 116;
          const elecLeftX = beakerX + 34;
          const elecRightX = beakerX + beakerW - 34;
          const elecTipY = liquidTop + 42 - probeOffsetY;
          const circuitClosed = immersed;
          const bLevel = circuitClosed ? eq.brightness : 0;

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(elecLeftX, elecTipY - 40);
          ctx.lineTo(elecLeftX, 116);
          ctx.lineTo(bulbCX - 22, 116);
          ctx.moveTo(bulbCX + 22, 116);
          ctx.lineTo(elecRightX, 116);
          ctx.lineTo(elecRightX, elecTipY - 40);
          ctx.stroke();

          roundRect(ctx, elecRightX - 24, 134, 48, 20, 4, '#dc2626', '#f8fafc', 1);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('9V DC', elecRightX, 144);

          roundRect(ctx, elecLeftX - 6, elecTipY - 42, 12, 46, 3, '#dc2626', '#fca5a5', 1.2);
          roundRect(ctx, elecRightX - 6, elecTipY - 42, 12, 46, 3, '#2563eb', '#93c5fd', 1.2);

          if (bLevel > 0.01) {
            const glowR = 24 + bLevel * 54;
            const grad = ctx.createRadialGradient(bulbCX, bulbCY, 6, bulbCX, bulbCY, glowR);
            grad.addColorStop(0, `rgba(253, 224, 71, ${0.35 + bLevel * 0.65})`);
            grad.addColorStop(0.5, `rgba(250, 204, 21, ${bLevel * 0.45})`);
            grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bulbCX, bulbCY, glowR, 0, Math.PI * 2);
            ctx.fill();

            const rayCount = Math.round(8 + bLevel * 16);
            const rayLen = 10 + bLevel * 44;
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.45 + bLevel * 0.55})`;
            ctx.lineWidth = 1.5 + bLevel * 1.8;
            for (let r = 0; r < rayCount; r++) {
              const ang = (r / rayCount) * Math.PI * 2 + s.time * 0.4;
              const r0 = 24;
              const r1 = r0 + rayLen * (r % 2 === 0 ? 1.0 : 0.68);
              ctx.beginPath();
              ctx.moveTo(bulbCX + Math.cos(ang) * r0, bulbCY + Math.sin(ang) * r0);
              ctx.lineTo(bulbCX + Math.cos(ang) * r1, bulbCY + Math.sin(ang) * r1);
              ctx.stroke();
            }
          }

          ctx.beginPath();
          ctx.arc(bulbCX, bulbCY, 20, 0, Math.PI * 2);
          ctx.fillStyle = bLevel > 0.01 ? `rgba(254, 240, 138, ${0.3 + bLevel * 0.7})` : 'rgba(148, 163, 184, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.strokeStyle = bLevel > 0.2 ? '#ffffff' : '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bulbCX - 7, bulbCY + 14);
          ctx.lineTo(bulbCX - 4, bulbCY - 5);
          ctx.lineTo(bulbCX + 4, bulbCY - 5);
          ctx.lineTo(bulbCX + 7, bulbCY + 14);
          ctx.stroke();

          roundRect(ctx, bulbCX - 10, bulbCY + 18, 20, 11, 3, '#64748b', '#cbd5e1', 1);

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 11px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            circuitClosed ? `导电亮度: ${(bLevel * 100).toFixed(0)}% (总离子 ${formatSci(eq.totalIons, 2)} M)` : '电极未浸入溶液 (断路)',
            bulbCX,
            68
          );
        }

        const chartCard = { x: 312, y: 68, w: 280, h: 438 };
        drawShadowCard(ctx, chartCard.x, chartCard.y, chartCard.w, chartCard.h, 10, '#1e293b', '#334155');

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('平衡浓度对数柱状图 (mol/L)', chartCard.x + 14, chartCard.y + 22);

        const plotX = chartCard.x + 48;
        const plotY = chartCard.y + 48;
        const plotW = chartCard.w - 64;
        const plotH = 310;

        roundRect(ctx, plotX, plotY, plotW, plotH, 6, '#0f172a', '#334155', 1);

        const minExp = -14;
        const maxExp = 2;
        ctx.font = '10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let exp = -14; exp <= 2; exp += 2) {
          const ratio = (exp - minExp) / (maxExp - minExp);
          const gy = plotY + plotH - ratio * plotH;
          ctx.strokeStyle = exp === -7 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(148, 163, 184, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plotX, gy);
          ctx.lineTo(plotX + plotW, gy);
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`10^${exp}`, plotX - 6, gy);
        }

        const bars = [
          { label: 'H₂O', val: eq.cH2O, col: '#64748b' },
          { label: eq.molLabel, val: eq.cMol, col: '#a855f7' },
          { label: eq.ionLabel, val: eq.cIon, col: eq.type.includes('acid') ? '#22c55e' : '#eab308' },
          { label: 'H₃O⁺', val: eq.cH3O, col: '#ef4444' },
          { label: 'OH⁻', val: eq.cOH, col: '#3b82f6' }
        ];

        const colW = plotW / bars.length;
        for (let i = 0; i < bars.length; i++) {
          const b = bars[i];
          const bx = plotX + i * colW + 8;
          const bw = colW - 16;
          let hBar = 0;
          if (b.val > 1e-15) {
            const logV = clamp(Math.log10(b.val), minExp, maxExp);
            hBar = ((logV - minExp) / (maxExp - minExp)) * plotH;
          }
          if (hBar > 2) {
            roundRect(ctx, bx, plotY + plotH - hBar, bw, hBar, 4, b.col, '#ffffff', 1);
          }
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.label, bx + bw / 2, plotY + plotH + 16);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '9.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          const valStr = b.val <= 1e-15 ? '0' : (b.val >= 10 ? b.val.toFixed(1) : formatSci(b.val, 1));
          ctx.fillText(valStr, bx + bw / 2, plotY + plotH + 32);
        }

        roundRect(ctx, chartCard.x + 12, chartCard.y + 394, chartCard.w - 24, 34, 6, '#0f172a', '#334155', 1);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `pH = ${eq.pH.toFixed(2)}   |   pOH = ${(14 - eq.pH).toFixed(2)}   |   Kw = 1.0×10⁻¹⁴`,
          chartCard.x + chartCard.w / 2,
          chartCard.y + 411
        );

        const ctrlCard = { x: 604, y: 68, w: 282, h: 438 };
        drawShadowCard(ctx, ctrlCard.x, ctrlCard.y, ctrlCard.w, ctrlCard.h, 10, '#1e293b', '#334155');

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(s.mode === 'known' ? '1. 选择已知标准溶液' : '1. 自定义溶液参数调节', ctrlCard.x + 14, ctrlCard.y + 22);

        if (s.mode === 'known') {
          const opts = [
            { val: 'water', label: '纯水 (H₂O, pH = 7.00)' },
            { val: 'strong-acid', label: '强酸 HA (0.01 M, 100% 电离)' },
            { val: 'weak-acid', label: '弱酸 HA (0.01 M, pKa = 4.74)' },
            { val: 'strong-base', label: '强碱 MOH (0.01 M, 100% 电离)' },
            { val: 'weak-base', label: '弱碱 B (0.01 M, pKb = 4.74)' }
          ];
          s.uiRects.knownBtns = [];
          for (let i = 0; i < opts.length; i++) {
            const r = { x: ctrlCard.x + 14, y: ctrlCard.y + 40 + i * 38, w: ctrlCard.w - 28, h: 32, r: 6 };
            s.uiRects.knownBtns.push({ rect: r, val: opts[i].val });
            drawButton(ctx, r, opts[i].label, s.knownSolution === opts[i].val, '#38bdf8');
          }
        } else {
          const cTypes = [
            { val: 'weak-acid', label: '弱酸 HA' },
            { val: 'strong-acid', label: '强酸 HA' },
            { val: 'weak-base', label: '弱碱 B' },
            { val: 'strong-base', label: '强碱 MOH' }
          ];
          s.uiRects.customTypeBtns = [];
          for (let i = 0; i < cTypes.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const r = {
              x: ctrlCard.x + 14 + col * 130,
              y: ctrlCard.y + 38 + row * 36,
              w: 124,
              h: 30,
              r: 6
            };
            s.uiRects.customTypeBtns.push({ rect: r, val: cTypes[i].val });
            drawButton(ctx, r, cTypes[i].label, s.customType === cTypes[i].val, '#f59e0b');
          }

          const concRect = { x: ctrlCard.x + 16, y: ctrlCard.y + 136, w: ctrlCard.w - 32, h: 20 };
          s.uiRects.concSlider = concRect;
          const concRatio = (Math.log10(clamp(s.concentration, 0.001, 1.0)) + 3) / 3;
          drawSlider(ctx, concRect, '初始浓度 c (0.001 ~ 1.0 M)', `${s.concentration.toFixed(3)} mol/L`, concRatio, '#38bdf8');

          const pkRect = { x: ctrlCard.x + 16, y: ctrlCard.y + 188, w: ctrlCard.w - 32, h: 20 };
          s.uiRects.pkSlider = pkRect;
          const isWeak = s.customType.startsWith('weak');
          const pkRatio = (s.pK - 1.0) / 9.0;
          const pkLabel = s.customType.includes('acid') ? '酸电离常数 pKa (弱←→强)' : '碱电离常数 pKb (弱←→强)';
          drawSlider(
            ctx,
            pkRect,
            pkLabel,
            isWeak ? `pK = ${s.pK.toFixed(2)} (K=${formatSci(Math.pow(10, -s.pK), 1)})` : '完全电离 (100%)',
            isWeak ? pkRatio : 1.0,
            isWeak ? '#a855f7' : '#64748b'
          );

          const alphaPct = eq.c > 0 ? clamp((eq.cIon / eq.c) * 100, 0, 100) : 0;
          roundRect(ctx, ctrlCard.x + 14, ctrlCard.y + 216, ctrlCard.w - 28, 28, 6, '#0f172a', '#475569', 1);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 11.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`电离度 α = ${alphaPct.toFixed(2)}%`, ctrlCard.x + ctrlCard.w / 2, ctrlCard.y + 230);
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('2. 切换酸碱与导电测试工具', ctrlCard.x + 14, ctrlCard.y + 266);

        const tools = [
          { val: 'ph-meter', label: '数字 pH 计探针 (高精度读数)' },
          { val: 'ph-paper', label: '广泛 pH 试纸 (0~14 标准比色卡)' },
          { val: 'conductivity', label: '导电性测试仪 (灯泡光芒强度)' }
        ];
        s.uiRects.toolBtns = [];
        for (let i = 0; i < tools.length; i++) {
          const r = { x: ctrlCard.x + 14, y: ctrlCard.y + 284 + i * 38, w: ctrlCard.w - 28, h: 32, r: 6 };
          s.uiRects.toolBtns.push({ rect: r, val: tools[i].val });
          drawButton(ctx, r, tools[i].label, s.tool === tools[i].val, '#10b981');
        }

        roundRect(ctx, ctrlCard.x + 14, ctrlCard.y + 402, ctrlCard.w - 28, 26, 6, '#0f172a', '#334155', 1);
        ctx.font = '10.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('提示：可直接在烧杯区上下拖拽探针/试纸浸入深度', ctrlCard.x + ctrlCard.w / 2, ctrlCard.y + 415);
      }
    }
  );

  // ============================================================================
  // 2. 'membrane-transport' (膜运输)
  // ============================================================================

  const SOLUTE_META = {
    O2:   { label: 'O₂',   color: '#ef4444', r: 6.5 },
    CO2:  { label: 'CO₂',  color: '#94a3b8', r: 7.0 },
    Na:   { label: 'Na⁺',  color: '#f97316', r: 6.5 },
    K:    { label: 'K⁺',   color: '#3b82f6', r: 7.0 },
    Glu:  { label: '葡萄糖', color: '#a855f7', r: 9.5 }
  };

  function spawnMembraneParticles(mode) {
    const list = [];
    function addBatch(type, count, region) {
      for (let i = 0; i < count; i++) {
        const yMin = region === 'extra' ? 78 : 308;
        const yMax = region === 'extra' ? 226 : 472;
        list.push({
          type: type,
          x: 34 + Math.random() * 520,
          y: yMin + Math.random() * (yMax - yMin),
          vx: (Math.random() - 0.5) * 75,
          vy: (Math.random() - 0.5) * 75
        });
      }
    }

    if (mode === 'simple') {
      addBatch('O2', 16, 'extra');
      addBatch('O2', 3, 'intra');
      addBatch('CO2', 3, 'extra');
      addBatch('CO2', 14, 'intra');
      addBatch('Na', 10, 'extra');
      addBatch('K', 8, 'intra');
      addBatch('Glu', 5, 'extra');
    } else if (mode === 'facilitated') {
      addBatch('Na', 18, 'extra');
      addBatch('Na', 4, 'intra');
      addBatch('K', 4, 'extra');
      addBatch('K', 18, 'intra');
      addBatch('Glu', 10, 'extra');
      addBatch('Glu', 2, 'intra');
      addBatch('O2', 6, 'extra');
    } else {
      addBatch('Na', 12, 'extra');
      addBatch('Na', 14, 'intra');
      addBatch('K', 13, 'extra');
      addBatch('K', 11, 'intra');
      addBatch('Glu', 4, 'extra');
    }
    return list;
  }

  createSimAdapter(
    'membrane-transport',
    {
      title: '细胞膜跨膜运输 (Membrane Transport)',
      subtitle: '磷脂双分子层简单扩散、门控通道易化扩散与钠钾泵 ATP 主动转运',
      category: 'solutions'
    },
    {
      controlKeys: ['mechanism', 'channelType', 'voltageMv', 'ligandBound', 'atpCount'],
      controls: [
        {
          id: 'mechanism',
          key: 'mechanism',
          label: '跨膜运输机制',
          type: 'select',
          value: 'simple',
          options: [
            { value: 'simple', label: '1. 简单扩散 (O₂/CO₂ 穿膜)' },
            { value: 'facilitated', label: '2. 易化扩散 (漏通道/门控通道)' },
            { value: 'active', label: '3. 主动转运 (Na⁺/K⁺-ATPase 泵)' }
          ]
        },
        {
          id: 'channelType',
          key: 'channelType',
          label: '通道蛋白类型',
          type: 'select',
          value: 'voltage',
          options: [
            { value: 'leak', label: 'Na⁺/K⁺ 漏通道 (持续开放)' },
            { value: 'voltage', label: '电压门控通道 (电位触发)' },
            { value: 'ligand', label: '配体门控通道 (乙酰胆碱触发)' }
          ]
        },
        {
          id: 'voltageMv',
          key: 'voltageMv',
          label: '膜电位 Vm (mV)',
          type: 'slider',
          min: -90,
          max: 40,
          step: 5,
          value: -70
        }
      ],

      defaultState: function () {
        return {
          mechanism: 'simple',
          channelType: 'voltage',
          voltageMv: -70,
          ligandBound: false,
          atpCount: 8,
          pumpTimer: 0,
          pumpStage: 0,
          time: 0,
          particles: spawnMembraneParticles('simple'),
          uiRects: {}
        };
      },

      onControlChange: function (s, key) {
        if (key === 'mechanism') {
          s.particles = spawnMembraneParticles(s.mechanism);
        }
      },

      onUpdate: function (s, dt) {
        s.time += dt;
        const memTop = 240;
        const memBot = 296;
        const simLeft = 20;
        const simRight = 576;

        const channelOpen =
          s.mechanism === 'facilitated' &&
          (s.channelType === 'leak' ||
            (s.channelType === 'voltage' && s.voltageMv >= -40) ||
            (s.channelType === 'ligand' && s.ligandBound));

        const naChanX = 190;
        const kChanX = 345;
        const gluChanX = 485;
        const pumpX = 295;

        if (s.mechanism === 'active') {
          if (s.pumpStage === 0 && s.atpCount > 0) {
            const intraNa = s.particles.filter(p => p.type === 'Na' && p.y > memBot);
            const extraK = s.particles.filter(p => p.type === 'K' && p.y < memTop);
            if (intraNa.length >= 3 && extraK.length >= 2) {
              s.pumpTimer += dt;
              if (s.pumpTimer > 1.1) {
                s.pumpTimer = 0;
                s.pumpStage = 1;
                s.atpCount = Math.max(0, s.atpCount - 1);
              }
            }
          } else if (s.pumpStage === 1) {
            s.pumpTimer += dt;
            if (s.pumpTimer > 0.85) {
              let movedNa = 0;
              for (let i = 0; i < s.particles.length && movedNa < 3; i++) {
                const p = s.particles[i];
                if (p.type === 'Na' && p.y > memBot) {
                  p.x = pumpX + (movedNa - 1) * 14;
                  p.y = memTop - 18 - movedNa * 6;
                  p.vy = -Math.abs(p.vy) - 25;
                  movedNa++;
                }
              }
              s.pumpTimer = 0;
              s.pumpStage = 2;
            }
          } else if (s.pumpStage === 2) {
            s.pumpTimer += dt;
            if (s.pumpTimer > 0.85) {
              let movedK = 0;
              for (let i = 0; i < s.particles.length && movedK < 2; i++) {
                const p = s.particles[i];
                if (p.type === 'K' && p.y < memTop) {
                  p.x = pumpX + (movedK - 0.5) * 16;
                  p.y = memBot + 18 + movedK * 6;
                  p.vy = Math.abs(p.vy) + 25;
                  movedK++;
                }
              }
              s.pumpTimer = 0;
              s.pumpStage = 0;
            }
          }
        }

        for (let i = 0; i < s.particles.length; i++) {
          const p = s.particles[i];
          const prevY = p.y;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.x < simLeft + 10) { p.x = simLeft + 10; p.vx = Math.abs(p.vx); }
          if (p.x > simRight - 10) { p.x = simRight - 10; p.vx = -Math.abs(p.vx); }
          if (p.y < 76) { p.y = 76; p.vy = Math.abs(p.vy); }
          if (p.y > 478) { p.y = 478; p.vy = -Math.abs(p.vy); }

          const inMembraneBand = p.y >= memTop - 6 && p.y <= memBot + 6;
          if (inMembraneBand) {
            let canPass = false;
            if (p.type === 'O2' || p.type === 'CO2') {
              canPass = true;
            } else if (s.mechanism === 'facilitated') {
              if (p.type === 'Na' && channelOpen && Math.abs(p.x - naChanX) < 26) {
                canPass = true;
              } else if (p.type === 'K' && channelOpen && Math.abs(p.x - kChanX) < 26) {
                canPass = true;
              } else if (p.type === 'Glu' && Math.abs(p.x - gluChanX) < 26) {
                canPass = true;
              }
            }

            if (!canPass) {
              if (prevY < memTop) {
                p.y = memTop - 7;
                p.vy = -Math.abs(p.vy);
              } else if (prevY > memBot) {
                p.y = memBot + 7;
                p.vy = Math.abs(p.vy);
              } else {
                p.y = p.vy > 0 ? memBot + 8 : memTop - 8;
              }
            }
          }
        }
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (u.mechBtns) {
          for (const b of u.mechBtns) {
            if (inRect(x, y, b.rect)) {
              s.mechanism = b.val;
              s.particles = spawnMembraneParticles(s.mechanism);
              return;
            }
          }
        }
        if (u.chanBtns) {
          for (const b of u.chanBtns) {
            if (inRect(x, y, b.rect)) {
              s.channelType = b.val;
              return;
            }
          }
        }
        if (inRect(x, y, u.voltBtn)) {
          s.voltageMv = s.voltageMv < -40 ? +20 : -70;
          return;
        }
        if (inRect(x, y, u.ligandBtn)) {
          s.ligandBound = !s.ligandBound;
          return;
        }
        if (inRect(x, y, u.addAtpBtn)) {
          s.atpCount += 5;
          return;
        }
        if (inRect(x, y, u.addSoluteBtn)) {
          s.particles.push(
            { type: 'O2', x: 100 + Math.random() * 400, y: 110, vx: 45, vy: 55 },
            { type: 'Na', x: 120 + Math.random() * 400, y: 120, vx: -40, vy: 50 },
            { type: 'K', x: 120 + Math.random() * 400, y: 410, vx: 40, vy: -50 }
          );
          return;
        }
        if (inRect(x, y, u.resetBtn)) {
          s.particles = spawnMembraneParticles(s.mechanism);
          s.atpCount = 8;
          return;
        }
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('细胞磷脂双分子层跨膜运输 (Membrane Transport)', 28, 33);

        const mechOpts = [
          { val: 'simple', label: '1. 简单扩散' },
          { val: 'facilitated', label: '2. 易化扩散' },
          { val: 'active', label: '3. 主动转运 (钠钾泵)' }
        ];
        s.uiRects.mechBtns = [];
        for (let i = 0; i < mechOpts.length; i++) {
          const r = { x: 465 + i * 136, y: 17, w: 128, h: 32, r: 7 };
          s.uiRects.mechBtns.push({ rect: r, val: mechOpts[i].val });
          drawButton(ctx, r, mechOpts[i].label, s.mechanism === mechOpts[i].val, '#38bdf8');
        }

        const viewX = 14;
        const viewY = 66;
        const viewW = 568;
        const viewH = 460;
        const memTop = 240;
        const memBot = 296;

        drawShadowCard(ctx, viewX, viewY, viewW, viewH, 10, '#091526', '#334155');
        roundRect(ctx, viewX + 4, viewY + 4, viewW - 8, memTop - viewY - 4, 8, 'rgba(14, 116, 144, 0.22)', null);
        roundRect(ctx, viewX + 4, memBot, viewW - 8, viewY + viewH - memBot - 4, 8, 'rgba(180, 83, 9, 0.16)', null);

        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 12.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('细胞外液 (Extracellular Fluid) — 高 [Na⁺]、高 [O₂]', viewX + 14, viewY + 20);

        ctx.fillStyle = '#fcd34d';
        ctx.fillText('细胞内液 / 细胞质 (Intracellular Fluid) — 高 [K⁺]、高 [CO₂]、ATP 供能', viewX + 14, viewY + viewH - 14);

        const channelZones = [];
        if (s.mechanism === 'facilitated') {
          channelZones.push(190, 345, 485);
        } else if (s.mechanism === 'active') {
          channelZones.push(295);
        }

        for (let px = viewX + 18; px < viewX + viewW - 14; px += 15) {
          let skip = false;
          for (const cz of channelZones) {
            if (Math.abs(px - cz) < 28) { skip = true; break; }
          }
          if (skip) continue;

          const wave = Math.sin(s.time * 2.5 + px * 0.05) * 1.8;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px - 2.5, memTop + 6 + wave);
          ctx.lineTo(px - 3.5, memTop + 23 + wave);
          ctx.moveTo(px + 2.5, memTop + 6 + wave);
          ctx.lineTo(px + 3.5, memTop + 23 + wave);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, memTop + 4 + wave, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(px - 2.5, memBot - 6 + wave);
          ctx.lineTo(px - 3.5, memBot - 23 + wave);
          ctx.moveTo(px + 2.5, memBot - 6 + wave);
          ctx.lineTo(px + 3.5, memBot - 23 + wave);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, memBot - 4 + wave, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        }

        const channelOpen =
          s.mechanism === 'facilitated' &&
          (s.channelType === 'leak' ||
            (s.channelType === 'voltage' && s.voltageMv >= -40) ||
            (s.channelType === 'ligand' && s.ligandBound));

        if (s.mechanism === 'facilitated') {
          const channels = [
            { x: 190, label: 'Na⁺ 通道', col: '#f97316', open: channelOpen },
            { x: 345, label: 'K⁺ 通道', col: '#3b82f6', open: channelOpen },
            { x: 485, label: 'GLUT 载体', col: '#a855f7', open: true }
          ];
          for (const ch of channels) {
            const gap = ch.open ? 14 : 2;
            roundRect(ctx, ch.x - 24, memTop - 8, 22 - gap / 2, memBot - memTop + 16, 8, ch.col, '#ffffff', 1.4);
            roundRect(ctx, ch.x + gap / 2 + 2, memTop - 8, 22 - gap / 2, memBot - memTop + 16, 8, ch.col, '#ffffff', 1.4);

            if (!ch.open) {
              roundRect(ctx, ch.x - 10, (memTop + memBot) / 2 - 4, 20, 8, 3, '#ef4444', '#ffffff', 1);
            }
            if (s.channelType === 'ligand' && s.ligandBound && ch.x !== 485) {
              ctx.beginPath();
              ctx.arc(ch.x - 14, memTop - 12, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#10b981';
              ctx.fill();
              ctx.fillStyle = '#a7f3d0';
              ctx.font = 'bold 9px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('ACh', ch.x - 14, memTop - 22);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ch.label + (ch.open ? '(开)' : '(关)'), ch.x, memBot + 18);
          }
        } else if (s.mechanism === 'active') {
          const px = 295;
          const openTop = s.pumpStage === 1;
          const topSpread = openTop ? 14 : 4;
          const botSpread = openTop ? 4 : 14;

          ctx.save();
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px - 26, memTop - 10);
          ctx.lineTo(px - topSpread, memTop - 10);
          ctx.lineTo(px - botSpread, memBot + 10);
          ctx.lineTo(px - 26, memBot + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px + 26, memTop - 10);
          ctx.lineTo(px + topSpread, memTop - 10);
          ctx.lineTo(px + botSpread, memBot + 10);
          ctx.lineTo(px + 26, memBot + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          if (s.pumpStage === 1) {
            ctx.beginPath();
            ctx.arc(px + 28, memBot + 6, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#eab308';
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('P', px + 28, memBot + 6);
          }

          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          const stageTxt =
            s.pumpStage === 0 ? 'E₁ 结合 3Na⁺ + ATP' :
            s.pumpStage === 1 ? 'E₂-P 构象翻转排出 3Na⁺' : 'E₂ 结合并泵入 2K⁺';
          ctx.fillText(`Na⁺/K⁺-ATPase 钠钾泵 (${stageTxt})`, px, memBot + 24);
          ctx.restore();
        }

        const counts = {
          extra: { O2: 0, CO2: 0, Na: 0, K: 0, Glu: 0 },
          intra: { O2: 0, CO2: 0, Na: 0, K: 0, Glu: 0 }
        };

        for (let i = 0; i < s.particles.length; i++) {
          const p = s.particles[i];
          const m = SOLUTE_META[p.type] || SOLUTE_META.O2;
          if (p.y < (memTop + memBot) / 2) counts.extra[p.type]++;
          else counts.intra[p.type]++;

          ctx.beginPath();
          ctx.arc(p.x, p.y, m.r, 0, Math.PI * 2);
          ctx.fillStyle = m.color;
          ctx.fill();
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.label, p.x, p.y);
        }

        const rightCard = { x: 594, y: 66, w: 292, h: 460 };
        drawShadowCard(ctx, rightCard.x, rightCard.y, rightCard.w, rightCard.h, 10, '#1e293b', '#334155');

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('细胞内外溶质浓度实时对比', rightCard.x + 14, rightCard.y + 22);

        const chartX = rightCard.x + 34;
        const chartY = rightCard.y + 42;
        const chartW = rightCard.w - 48;
        const chartH = 190;
        roundRect(ctx, chartX, chartY, chartW, chartH, 6, '#0f172a', '#334155', 1);

        const keys = ['Na', 'K', 'O2', 'CO2', 'Glu'];
        const groupW = chartW / keys.length;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const meta = SOLUTE_META[k];
          const cEx = counts.extra[k];
          const cIn = counts.intra[k];
          const gx = chartX + i * groupW + 7;
          const bw = (groupW - 16) / 2;

          const hEx = clamp((cEx / 24) * (chartH - 28), 2, chartH - 28);
          const hIn = clamp((cIn / 24) * (chartH - 28), 2, chartH - 28);

          roundRect(ctx, gx, chartY + chartH - hEx, bw, hEx, 3, '#0ea5e9', '#ffffff', 0.8);
          roundRect(ctx, gx + bw + 2, chartY + chartH - hIn, bw, hIn, 3, '#f59e0b', '#ffffff', 0.8);

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 10.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(meta.label, gx + bw, chartY + chartH + 14);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '9.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillText(`${cEx}/${cIn}`, gx + bw, chartY + chartH + 27);
        }

        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(rightCard.x + 20, rightCard.y + 270, 12, 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('细胞外液 (外)', rightCard.x + 36, rightCard.y + 276);

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(rightCard.x + 132, rightCard.y + 270, 12, 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('细胞内液 (内)', rightCard.x + 148, rightCard.y + 276);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('通道门控与能量调控', rightCard.x + 14, rightCard.y + 304);

        const chanOpts = [
          { val: 'leak', label: '漏通道' },
          { val: 'voltage', label: '电压门控' },
          { val: 'ligand', label: '配体门控' }
        ];
        s.uiRects.chanBtns = [];
        for (let i = 0; i < chanOpts.length; i++) {
          const r = { x: rightCard.x + 14 + i * 89, y: rightCard.y + 318, w: 84, h: 28, r: 6 };
          s.uiRects.chanBtns.push({ rect: r, val: chanOpts[i].val });
          drawButton(ctx, r, chanOpts[i].label, s.channelType === chanOpts[i].val, '#38bdf8');
        }

        const voltBtn = { x: rightCard.x + 14, y: rightCard.y + 354, w: 128, h: 30, r: 6 };
        const ligBtn = { x: rightCard.x + 150, y: rightCard.y + 354, w: 128, h: 30, r: 6 };
        s.uiRects.voltBtn = voltBtn;
        s.uiRects.ligandBtn = ligBtn;
        drawButton(ctx, voltBtn, `膜电位: ${s.voltageMv} mV`, s.voltageMv >= -40, '#f97316');
        drawButton(ctx, ligBtn, s.ligandBound ? '乙酰胆碱: 已结合' : '加入乙酰胆碱配体', s.ligandBound, '#10b981');

        const atpBtn = { x: rightCard.x + 14, y: rightCard.y + 392, w: 128, h: 30, r: 6 };
        const addBtn = { x: rightCard.x + 150, y: rightCard.y + 392, w: 128, h: 30, r: 6 };
        const rstBtn = { x: rightCard.x + 14, y: rightCard.y + 428, w: 264, h: 26, r: 6 };
        s.uiRects.addAtpBtn = atpBtn;
        s.uiRects.addSoluteBtn = addBtn;
        s.uiRects.resetBtn = rstBtn;
        drawButton(ctx, atpBtn, `补充 ATP (余 ${s.atpCount})`, s.atpCount > 0, '#eab308');
        drawButton(ctx, addBtn, '+ 添加溶质粒子', false, '#38bdf8');
        drawButton(ctx, rstBtn, '重置生理浓度梯度', false, '#64748b');
      }
    }
  );

  // ============================================================================
  // 3. 'coulombs-law' (库仑定律)
  // ============================================================================

  createSimAdapter(
    'coulombs-law',
    {
      title: '库仑定律 (Coulomb\'s Law)',
      subtitle: '宏观尺度 (μC/cm) 与原子尺度 (e/pm) 静电力计算与等大反向矢量交互',
      category: 'electrowave'
    },
    {
      controlKeys: ['scaleMode', 'q1', 'q2', 'x1', 'x2', 'sciNotation', 'showValues'],
      controls: [
        {
          id: 'scaleMode',
          key: 'scaleMode',
          label: '尺度模式',
          type: 'select',
          value: 'macro',
          options: [
            { value: 'macro', label: '宏观尺度 (Macro: -10~+10 μC, cm)' },
            { value: 'atomic', label: '原子尺度 (Atomic: -10~+10 e, pm)' }
          ]
        },
        {
          id: 'q1',
          key: 'q1',
          label: '电荷 q₁',
          type: 'slider',
          min: -10,
          max: 10,
          step: 1,
          value: -4
        },
        {
          id: 'q2',
          key: 'q2',
          label: '电荷 q₂',
          type: 'slider',
          min: -10,
          max: 10,
          step: 1,
          value: 8
        },
        {
          id: 'sciNotation',
          key: 'sciNotation',
          label: '读数格式',
          type: 'select',
          value: 'decimal',
          options: [
            { value: 'decimal', label: '常规小数读数' },
            { value: 'sci', label: '科学计数法 (×10ⁿ N)' }
          ]
        }
      ],

      defaultState: function () {
        return {
          scaleMode: 'macro',
          q1: -4,
          q2: 8,
          x1: 3.0,
          x2: 7.0,
          sciNotation: 'decimal',
          showValues: true,
          dragging: null,
          uiRects: {}
        };
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (inRect(x, y, u.macroBtn)) { s.scaleMode = 'macro'; return; }
        if (inRect(x, y, u.atomicBtn)) { s.scaleMode = 'atomic'; return; }
        if (inRect(x, y, u.sciBtn)) {
          s.sciNotation = s.sciNotation === 'sci' ? 'decimal' : 'sci';
          return;
        }
        if (inRect(x, y, u.valBtn)) {
          s.showValues = !s.showValues;
          return;
        }
        if (inRect(x, y, u.q1Slider)) { s.dragging = 'q1'; this.onMove(s, x, y); return; }
        if (inRect(x, y, u.q2Slider)) { s.dragging = 'q2'; this.onMove(s, x, y); return; }

        if (u.c1Pos && Math.hypot(x - u.c1Pos.x, y - u.c1Pos.y) < 38) {
          s.dragging = 'x1';
          return;
        }
        if (u.c2Pos && Math.hypot(x - u.c2Pos.x, y - u.c2Pos.y) < 38) {
          s.dragging = 'x2';
          return;
        }
      },

      onMove: function (s, x) {
        const u = s.uiRects || {};
        if (s.dragging === 'q1' && u.q1Slider) {
          const r = clamp((x - u.q1Slider.x) / u.q1Slider.w, 0, 1);
          s.q1 = Math.round(-10 + r * 20);
        } else if (s.dragging === 'q2' && u.q2Slider) {
          const r = clamp((x - u.q2Slider.x) / u.q2Slider.w, 0, 1);
          s.q2 = Math.round(-10 + r * 20);
        } else if (s.dragging === 'x1' && u.ruler) {
          const pos = ((x - u.ruler.x) / u.ruler.w) * 10;
          s.x1 = Number(clamp(pos, 0.2, s.x2 - 1.0).toFixed(2));
        } else if (s.dragging === 'x2' && u.ruler) {
          const pos = ((x - u.ruler.x) / u.ruler.w) * 10;
          s.x2 = Number(clamp(pos, s.x1 + 1.0, 9.8).toFixed(2));
        }
      },

      onUp: function (s) {
        s.dragging = null;
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const ke = 8.98755e9;
        const eCharge = 1.60217663e-19;
        const isMacro = s.scaleMode === 'macro';

        const rUnits = Math.max(0.8, Math.abs(s.x2 - s.x1));
        const rMeters = isMacro ? rUnits * 0.01 : rUnits * 10 * 1e-12;
        const q1C = isMacro ? s.q1 * 1e-6 : s.q1 * eCharge;
        const q2C = isMacro ? s.q2 * 1e-6 : s.q2 * eCharge;
        const forceN = (ke * Math.abs(q1C * q2C)) / (rMeters * rMeters);
        const repulsive = s.q1 * s.q2 > 0;
        const zeroForce = s.q1 === 0 || s.q2 === 0;

        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('库仑定律静电相互作用仿真 (Coulomb\'s Law)', 28, 33);

        const macroBtn = { x: 430, y: 17, w: 132, h: 32, r: 7 };
        const atomicBtn = { x: 568, y: 17, w: 132, h: 32, r: 7 };
        const sciBtn = { x: 706, y: 17, w: 96, h: 32, r: 7 };
        const valBtn = { x: 808, y: 17, w: 68, h: 32, r: 7 };
        s.uiRects.macroBtn = macroBtn;
        s.uiRects.atomicBtn = atomicBtn;
        s.uiRects.sciBtn = sciBtn;
        s.uiRects.valBtn = valBtn;

        drawButton(ctx, macroBtn, '宏观尺度 (μC/cm)', isMacro, '#38bdf8');
        drawButton(ctx, atomicBtn, '原子尺度 (e/pm)', !isMacro, '#f59e0b');
        drawButton(ctx, sciBtn, s.sciNotation === 'sci' ? '科学计数法' : '小数读数', s.sciNotation === 'sci', '#a855f7');
        drawButton(ctx, valBtn, s.showValues ? '隐藏数值' : '显示数值', s.showValues, '#10b981');

        const stageX = 24;
        const stageY = 68;
        const stageW = W - 48;
        const stageH = 304;
        drawShadowCard(ctx, stageX, stageY, stageW, stageH, 12, '#0f172a', '#334155');

        const rulerX = 96;
        const rulerW = stageW - 144;
        const rulerY = stageY + 220;
        s.uiRects.ruler = { x: rulerX, y: rulerY, w: rulerW, h: 36 };

        const c1X = rulerX + (s.x1 / 10) * rulerW;
        const c2X = rulerX + (s.x2 / 10) * rulerW;
        const chargeY = stageY + 135;
        s.uiRects.c1Pos = { x: c1X, y: chargeY };
        s.uiRects.c2Pos = { x: c2X, y: chargeY };

        ctx.strokeStyle = '#64748b';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c1X, chargeY);
        ctx.lineTo(c1X, rulerY);
        ctx.moveTo(c2X, chargeY);
        ctx.lineTo(c2X, rulerY);
        ctx.stroke();
        ctx.setLineDash([]);

        const distText = isMacro ? `r = ${rUnits.toFixed(2)} cm` : `r = ${(rUnits * 10).toFixed(1)} pm`;
        roundRect(ctx, (c1X + c2X) / 2 - 58, chargeY + 42, 116, 24, 6, '#1e293b', '#475569', 1);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(distText, (c1X + c2X) / 2, chargeY + 54);

        if (!zeroForce) {
          const maxRef = isMacro ? 900 : 2.3e-7;
          const arrowLen = clamp(28 + Math.sqrt(forceN / maxRef) * 165, 28, 195);
          const dir1 = repulsive ? -1 : 1;
          const dir2 = repulsive ? 1 : -1;

          drawArrow(ctx, c1X, chargeY - 38, c1X + dir1 * arrowLen, chargeY - 38, '#f8fafc', 4);
          drawArrow(ctx, c2X, chargeY - 38, c2X + dir2 * arrowLen, chargeY - 38, '#f8fafc', 4);

          if (s.showValues) {
            const fStr =
              s.sciNotation === 'sci' || !isMacro
                ? `${formatSci(forceN, 2)} N`
                : `${forceN.toFixed(2)} N`;
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 12.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`|F₁₂| = ${fStr}`, c1X + (dir1 * arrowLen) / 2, chargeY - 52);
            ctx.fillText(`|F₂₁| = ${fStr}`, c2X + (dir2 * arrowLen) / 2, chargeY - 52);
          }
        }

        function drawChargeSphere(cx, cy, q, label) {
          const r = 18 + Math.abs(q) * 1.1;
          const col = q > 0 ? '#ef4444' : q < 0 ? '#3b82f6' : '#64748b';
          const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 3, cx, cy, r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.28, col);
          grad.addColorStop(1, '#0f172a');

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#f8fafc';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(q > 0 ? `+${q}` : `${q}`, cx, cy);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(label, cx, cy + r + 15);
        }

        drawChargeSphere(c1X, chargeY, s.q1, 'q₁ (可左右拖动)');
        drawChargeSphere(c2X, chargeY, s.q2, 'q₂ (可左右拖动)');

        roundRect(ctx, rulerX - 12, rulerY, rulerW + 24, 38, 6, '#fde68a', '#d97706', 1.5);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#1e293b';
        for (let i = 0; i <= 50; i++) {
          const tx = rulerX + (i / 50) * rulerW;
          const isMajor = i % 5 === 0;
          ctx.lineWidth = isMajor ? 1.8 : 1;
          ctx.beginPath();
          ctx.moveTo(tx, rulerY);
          ctx.lineTo(tx, rulerY + (isMajor ? 14 : 7));
          ctx.stroke();
          if (isMajor) {
            const val = isMacro ? i / 5 : (i / 5) * 10;
            ctx.font = 'bold 11px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(val), tx, rulerY + 26);
          }
        }
        ctx.font = 'bold 11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(isMacro ? 'cm' : 'pm', rulerX + rulerW + 2, rulerY + 26);

        const botY = 384;
        drawShadowCard(ctx, 24, botY, 520, 142, 10, '#1e293b', '#334155');
        const unitStr = isMacro ? 'μC' : 'e';

        const q1Rect = { x: 44, y: botY + 38, w: 480, h: 22 };
        const q2Rect = { x: 44, y: botY + 94, w: 480, h: 22 };
        s.uiRects.q1Slider = q1Rect;
        s.uiRects.q2Slider = q2Rect;

        drawSlider(
          ctx,
          q1Rect,
          `电荷 1 电量 (q₁: -10 ${unitStr} ~ +10 ${unitStr})`,
          `${s.q1 > 0 ? '+' : ''}${s.q1} ${unitStr}`,
          (s.q1 + 10) / 20,
          s.q1 >= 0 ? '#ef4444' : '#3b82f6'
        );
        drawSlider(
          ctx,
          q2Rect,
          `电荷 2 电量 (q₂: -10 ${unitStr} ~ +10 ${unitStr})`,
          `${s.q2 > 0 ? '+' : ''}${s.q2} ${unitStr}`,
          (s.q2 + 10) / 20,
          s.q2 >= 0 ? '#ef4444' : '#3b82f6'
        );

        drawShadowCard(ctx, 558, botY, 318, 142, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('库仑定律定量计算与牛顿第三定律', 574, botY + 24);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText('F = kₑ · |q₁ · q₂| / r²', 574, botY + 52);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText('kₑ = 8.988 × 10⁹ N·m²/C²', 574, botY + 76);
        ctx.fillText(
          `性质: ${zeroForce ? '无静电力 (F = 0)' : repulsive ? '同种电荷相互排斥 (← →)' : '异种电荷相互吸引 (→ ←)'}`,
          574,
          botY + 100
        );
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 12.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText(`|F₁₂| = |F₂₁| = ${formatSci(forceN, 3)} N`, 574, botY + 124);
      }
    }
  );

  // ============================================================================
  // 4. 'balloons-and-static-electricity' (气球与静电)
  // ============================================================================

  function createSweaterCharges() {
    const list = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 92 + col * 34 + (row % 2) * 8;
        const y = 165 + row * 40;
        list.push({ x, y, hasElectron: true });
      }
    }
    return list;
  }

  function createWallCharges() {
    const list = [];
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 3; col++) {
        list.push({
          baseX: 742 + col * 32,
          baseY: 96 + row * 38,
          dx: 0,
          dy: 0
        });
      }
    }
    return list;
  }

  createSimAdapter(
    'balloons-and-static-electricity',
    {
      title: '气球与静电 (Balloons and Static Electricity)',
      subtitle: '摩擦起电、电荷守恒、同种电荷排斥与绝缘墙壁静电感应极化吸引',
      category: 'electrowave'
    },
    {
      controlKeys: ['twoBalloons', 'wallPresent', 'chargeView'],
      controls: [
        {
          id: 'chargeView',
          key: 'chargeView',
          label: '电荷显示方式',
          type: 'select',
          value: 'all',
          options: [
            { value: 'all', label: '显示所有电荷 (Show All Charges)' },
            { value: 'diff', label: '仅显示净电荷差 (Charge Differences)' },
            { value: 'none', label: '隐藏电荷符号 (No Charges)' }
          ]
        },
        {
          id: 'twoBalloons',
          key: 'twoBalloons',
          label: '气球数量',
          type: 'select',
          value: 'one',
          options: [
            { value: 'one', label: '单气球 (黄色)' },
            { value: 'two', label: '双气球 (黄色 + 绿色)' }
          ]
        },
        {
          id: 'wallPresent',
          key: 'wallPresent',
          label: '右侧墙壁',
          type: 'select',
          value: 'yes',
          options: [
            { value: 'yes', label: '保留墙壁 (观察感应极化)' },
            { value: 'no', label: '移开墙壁' }
          ]
        }
      ],

      defaultState: function () {
        return {
          twoBalloons: 'one',
          wallPresent: 'yes',
          chargeView: 'all',
          sweater: createSweaterCharges(),
          wall: createWallCharges(),
          balloons: [
            { x: 430, y: 255, vx: 0, vy: 0, extraElectrons: 0, color: '#eab308', name: '黄气球' },
            { x: 560, y: 265, vx: 0, vy: 0, extraElectrons: 0, color: '#22c55e', name: '绿气球' }
          ],
          draggingIdx: -1,
          uiRects: {}
        };
      },

      onUpdate: function (s, dt) {
        const count = s.twoBalloons === 'two' ? 2 : 1;
        const hasWall = s.wallPresent === 'yes';
        const wallLeft = 716;

        let sweaterMissing = 0;
        let swCX = 0, swCY = 0;
        for (const sc of s.sweater) {
          if (!sc.hasElectron) sweaterMissing++;
          swCX += sc.x;
          swCY += sc.y;
        }
        swCX /= s.sweater.length;
        swCY /= s.sweater.length;

        for (let i = 0; i < count; i++) {
          const b = s.balloons[i];
          for (const sc of s.sweater) {
            if (sc.hasElectron && Math.hypot(b.x - sc.x, b.y - sc.y) < 58) {
              sc.hasElectron = false;
              b.extraElectrons++;
            }
          }
        }

        for (const wc of s.wall) {
          let fx = 0, fy = 0;
          for (let i = 0; i < count; i++) {
            const b = s.balloons[i];
            if (b.extraElectrons > 0) {
              const dx = wc.baseX - b.x;
              const dy = wc.baseY - b.y;
              const d2 = Math.max(1200, dx * dx + dy * dy);
              const d = Math.sqrt(d2);
              const mag = (b.extraElectrons * 26000) / d2;
              fx += (dx / d) * mag;
              fy += (dy / d) * mag;
            }
          }
          wc.dx = clamp(fx, -22, 26);
          wc.dy = clamp(fy, -14, 14);
        }

        for (let i = 0; i < count; i++) {
          if (s.draggingIdx === i) continue;
          const b = s.balloons[i];
          let fx = 0, fy = 0;

          if (b.extraElectrons > 0 && sweaterMissing > 0) {
            const dx = swCX - b.x;
            const dy = swCY - b.y;
            const d2 = Math.max(3600, dx * dx + dy * dy);
            const d = Math.sqrt(d2);
            const fSw = (b.extraElectrons * sweaterMissing * 3400) / d2;
            fx += (dx / d) * fSw;
            fy += (dy / d) * fSw;
          }

          if (hasWall && b.extraElectrons > 0) {
            const distToWall = Math.max(48, wallLeft - b.x);
            if (distToWall < 210) {
              const fWall = (b.extraElectrons * b.extraElectrons * 9500) / Math.pow(distToWall, 2.2);
              fx += fWall;
            }
          }

          if (count === 2) {
            const other = s.balloons[1 - i];
            if (b.extraElectrons > 0 && other.extraElectrons > 0) {
              const dx = b.x - other.x;
              const dy = b.y - other.y;
              const d2 = Math.max(4000, dx * dx + dy * dy);
              const d = Math.sqrt(d2);
              const fRep = (b.extraElectrons * other.extraElectrons * 5200) / d2;
              fx += (dx / d) * fRep;
              fy += (dy / d) * fRep;
            }
          }

          const anchorX = i === 0 ? 430 : 545;
          fx += (anchorX - b.x) * 0.45;
          fy += (255 - b.y) * 0.65;

          b.vx = (b.vx + fx * dt) * 0.88;
          b.vy = (b.vy + fy * dt) * 0.88;
          b.x += b.vx * dt * 12;
          b.y += b.vy * dt * 12;

          const maxRight = hasWall ? wallLeft - 46 : 830;
          b.x = clamp(b.x, 210, maxRight);
          b.y = clamp(b.y, 130, 390);
        }
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (inRect(x, y, u.resetBtn)) {
          s.sweater = createSweaterCharges();
          s.balloons[0].extraElectrons = 0;
          s.balloons[1].extraElectrons = 0;
          s.balloons[0].x = 430; s.balloons[0].y = 255;
          s.balloons[1].x = 560; s.balloons[1].y = 265;
          return;
        }
        if (inRect(x, y, u.twoBalloonBtn)) {
          s.twoBalloons = s.twoBalloons === 'two' ? 'one' : 'two';
          return;
        }
        if (inRect(x, y, u.wallBtn)) {
          s.wallPresent = s.wallPresent === 'yes' ? 'no' : 'yes';
          return;
        }
        if (u.viewBtns) {
          for (const b of u.viewBtns) {
            if (inRect(x, y, b.rect)) {
              s.chargeView = b.val;
              return;
            }
          }
        }

        const count = s.twoBalloons === 'two' ? 2 : 1;
        for (let i = count - 1; i >= 0; i--) {
          const b = s.balloons[i];
          if (Math.hypot(x - b.x, y - b.y) < 62) {
            s.draggingIdx = i;
            return;
          }
        }
      },

      onMove: function (s, x, y) {
        if (s.draggingIdx >= 0) {
          const hasWall = s.wallPresent === 'yes';
          const maxRight = hasWall ? 716 - 46 : 835;
          const b = s.balloons[s.draggingIdx];
          b.x = clamp(x, 120, maxRight);
          b.y = clamp(y, 115, 405);
          b.vx = 0;
          b.vy = 0;
        }
      },

      onUp: function (s) {
        s.draggingIdx = -1;
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('气球与静电感应仿真 (Balloons and Static Electricity)', 28, 33);

        drawShadowCard(ctx, 14, 66, W - 28, 384, 12, '#091526', '#334155');

        function drawSign(cx, cy, isPos) {
          ctx.beginPath();
          ctx.arc(cx, cy, 6.2, 0, Math.PI * 2);
          ctx.fillStyle = isPos ? '#ef4444' : '#3b82f6';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isPos ? '+' : '−', cx, cy);
        }

        ctx.save();
        roundRect(ctx, 68, 132, 165, 255, 20, '#991b1b', '#f87171', 2);
        roundRect(ctx, 28, 142, 46, 175, 14, '#7f1d1d', '#f87171', 1.5);
        roundRect(ctx, 226, 142, 44, 175, 14, '#7f1d1d', '#f87171', 1.5);
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('羊毛衫 (Sweater)', 150, 405);

        for (const sc of s.sweater) {
          if (s.chargeView === 'all') {
            drawSign(sc.x - 5, sc.y, true);
            if (sc.hasElectron) drawSign(sc.x + 6, sc.y, false);
          } else if (s.chargeView === 'diff' && !sc.hasElectron) {
            drawSign(sc.x, sc.y, true);
          }
        }
        ctx.restore();

        if (s.wallPresent === 'yes') {
          roundRect(ctx, 716, 74, 158, 368, 6, '#334155', '#94a3b8', 2);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('电中性墙壁 (感应极化)', 795, 86);

          if (s.chargeView === 'all') {
            for (const wc of s.wall) {
              drawSign(wc.baseX, wc.baseY, true);
              drawSign(wc.baseX + 8 + wc.dx, wc.baseY + wc.dy, false);
            }
          }
        }

        const count = s.twoBalloons === 'two' ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const b = s.balloons[i];
          const anchorX = i === 0 ? 430 : 545;

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(anchorX, 68);
          ctx.lineTo(b.x, b.y + 56);
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, 46, 56, 0, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(b.x - 6, b.y + 58);
          ctx.lineTo(b.x + 6, b.y + 58);
          ctx.lineTo(b.x, b.y + 52);
          ctx.closePath();
          ctx.fillStyle = b.color;
          ctx.fill();

          if (s.chargeView === 'all') {
            const basePairs = [
              [-18, -22], [16, -22], [-22, 6], [18, 6], [0, 26]
            ];
            for (const bp of basePairs) {
              drawSign(b.x + bp[0] - 5, b.y + bp[1], true);
              drawSign(b.x + bp[0] + 5, b.y + bp[1], false);
            }
          }

          if (s.chargeView !== 'none') {
            for (let eIdx = 0; eIdx < b.extraElectrons; eIdx++) {
              const ang = (eIdx / Math.max(1, b.extraElectrons)) * Math.PI * 2 + 0.4;
              const rx = Math.cos(ang) * 32;
              const ry = Math.sin(ang) * 40;
              drawSign(b.x + rx, b.y + ry, false);
            }
          }
          ctx.restore();
        }

        drawShadowCard(ctx, 14, 460, W - 28, 68, 10, '#1e293b', '#334155');

        const rstBtn = { x: 28, y: 476, w: 140, h: 36, r: 7 };
        const twoBtn = { x: 178, y: 476, w: 136, h: 36, r: 7 };
        const wallBtn = { x: 324, y: 476, w: 136, h: 36, r: 7 };
        s.uiRects.resetBtn = rstBtn;
        s.uiRects.twoBalloonBtn = twoBtn;
        s.uiRects.wallBtn = wallBtn;

        drawButton(ctx, rstBtn, '重置全部电荷', false, '#ef4444');
        drawButton(ctx, twoBtn, s.twoBalloons === 'two' ? '切换单气球' : '添加第2个气球', s.twoBalloons === 'two', '#22c55e');
        drawButton(ctx, wallBtn, s.wallPresent === 'yes' ? '移除墙壁' : '恢复墙壁', s.wallPresent === 'yes', '#f59e0b');

        const views = [
          { val: 'all', label: '显示全部电荷' },
          { val: 'diff', label: '仅显示净电荷差' },
          { val: 'none', label: '隐藏电荷' }
        ];
        s.uiRects.viewBtns = [];
        for (let i = 0; i < views.length; i++) {
          const r = { x: 484 + i * 132, y: 476, w: 124, h: 36, r: 7 };
          s.uiRects.viewBtns.push({ rect: r, val: views[i].val });
          drawButton(ctx, r, views[i].label, s.chargeView === views[i].val, '#38bdf8');
        }
      }
    }
  );

  // ============================================================================
  // 5. 'wave-on-a-string' (绳波 - 60 个离散耦合振子)
  // ============================================================================

  const NUM_BEADS = 60;

  createSimAdapter(
    'wave-on-a-string',
    {
      title: '绳波模拟器 (Wave on a String)',
      subtitle: '60 个离散耦合振子：简谐振荡/脉冲/手动驱动与固定端/自由端/无端反射',
      category: 'electrowave'
    },
    {
      controlKeys: ['driveMode', 'endMode', 'amplitude', 'frequency', 'damping', 'tension', 'playing'],
      controls: [
        {
          id: 'driveMode',
          key: 'driveMode',
          label: '左端驱动方式',
          type: 'select',
          value: 'oscillate',
          options: [
            { value: 'oscillate', label: '简谐振荡器 (Oscillate)' },
            { value: 'pulse', label: '脉冲发生器 (Pulse)' },
            { value: 'manual', label: '手动拖拽扳手 (Manual)' }
          ]
        },
        {
          id: 'endMode',
          key: 'endMode',
          label: '右端边界条件',
          type: 'select',
          value: 'fixed',
          options: [
            { value: 'fixed', label: '固定端 (Fixed End, 反相180°反射)' },
            { value: 'loose', label: '自由端 (Loose End, 同相0°反射)' },
            { value: 'no-end', label: '无端/无限长 (No End, 吸收无反射)' }
          ]
        },
        {
          id: 'amplitude',
          key: 'amplitude',
          label: '振幅 A (cm)',
          type: 'slider',
          min: 0.1,
          max: 1.5,
          step: 0.05,
          value: 0.85
        },
        {
          id: 'frequency',
          key: 'frequency',
          label: '频率 f (Hz)',
          type: 'slider',
          min: 0.2,
          max: 3.0,
          step: 0.05,
          value: 1.4
        },
        {
          id: 'damping',
          key: 'damping',
          label: '阻尼系数',
          type: 'slider',
          min: 0.0,
          max: 1.0,
          step: 0.05,
          value: 0.08
        },
        {
          id: 'tension',
          key: 'tension',
          label: '绳张力 T',
          type: 'slider',
          min: 0.2,
          max: 1.0,
          step: 0.05,
          value: 0.75
        }
      ],

      defaultState: function () {
        return {
          driveMode: 'oscillate',
          endMode: 'fixed',
          amplitude: 0.85,
          frequency: 1.4,
          damping: 0.08,
          tension: 0.75,
          playing: true,
          slowMotion: false,
          showRulers: true,
          timerRunning: false,
          timerSec: 0.0,
          phase: 0,
          pulseTimer: -1,
          y: new Array(NUM_BEADS).fill(0),
          vy: new Array(NUM_BEADS).fill(0),
          dragging: null,
          rulerPos: { x: 180, y: 92 },
          uiRects: {}
        };
      },

      onUpdate: function (s, dt) {
        if (!s.playing) return;
        const effDt = s.slowMotion ? dt * 0.25 : dt;
        if (s.timerRunning) s.timerSec += effDt;

        const substeps = 10;
        const h = effDt / substeps;
        const c2 = (140 + s.tension * 580);
        const gamma = s.damping * 2.6;
        const ampPx = s.amplitude * 68;

        for (let step = 0; step < substeps; step++) {
          if (s.driveMode === 'oscillate') {
            s.phase += 2 * Math.PI * s.frequency * h;
            s.y[0] = -ampPx * Math.sin(s.phase);
            s.vy[0] = 0;
          } else if (s.driveMode === 'pulse') {
            if (s.pulseTimer >= 0) {
              s.pulseTimer += h;
              const pulseDur = 0.55 / Math.max(0.4, s.frequency);
              if (s.pulseTimer <= pulseDur) {
                const sVal = Math.sin((Math.PI * s.pulseTimer) / pulseDur);
                s.y[0] = -ampPx * sVal * sVal;
              } else {
                s.y[0] = 0;
                s.pulseTimer = -1;
              }
            } else {
              s.y[0] = 0;
            }
          }

          const prevSecondLast = s.y[NUM_BEADS - 2];

          const ay = new Array(NUM_BEADS).fill(0);
          for (let i = 1; i < NUM_BEADS - 1; i++) {
            const lap = s.y[i - 1] - 2 * s.y[i] + s.y[i + 1];
            ay[i] = c2 * lap - gamma * s.vy[i];
          }

          for (let i = 1; i < NUM_BEADS - 1; i++) {
            s.vy[i] += ay[i] * h;
            s.y[i] += s.vy[i] * h;
          }

          const last = NUM_BEADS - 1;
          if (s.endMode === 'fixed') {
            s.y[last] = 0;
            s.vy[last] = 0;
          } else if (s.endMode === 'loose') {
            s.y[last] = s.y[last - 1];
            s.vy[last] = s.vy[last - 1];
          } else {
            const cWave = Math.sqrt(c2);
            const rCourant = cWave * h;
            s.y[last] = prevSecondLast + ((rCourant - 1) / (rCourant + 1)) * (s.y[last - 1] - s.y[last]);
            s.vy[last] = 0;
          }
        }
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (u.driveBtns) {
          for (const b of u.driveBtns) {
            if (inRect(x, y, b.rect)) {
              s.driveMode = b.val;
              return;
            }
          }
        }
        if (u.endBtns) {
          for (const b of u.endBtns) {
            if (inRect(x, y, b.rect)) {
              s.endMode = b.val;
              return;
            }
          }
        }
        if (inRect(x, y, u.pulseBtn)) {
          s.driveMode = 'pulse';
          s.pulseTimer = 0;
          return;
        }
        if (inRect(x, y, u.restartBtn)) {
          s.y.fill(0);
          s.vy.fill(0);
          s.phase = 0;
          s.pulseTimer = -1;
          return;
        }
        if (inRect(x, y, u.playBtn)) { s.playing = !s.playing; return; }
        if (inRect(x, y, u.slowBtn)) { s.slowMotion = !s.slowMotion; return; }
        if (inRect(x, y, u.rulerBtn)) { s.showRulers = !s.showRulers; return; }
        if (inRect(x, y, u.timerBtn)) {
          if (!s.timerRunning && s.timerSec > 0) { s.timerSec = 0; }
          else { s.timerRunning = !s.timerRunning; }
          return;
        }

        if (inRect(x, y, u.ampSlider)) { s.dragging = 'amp'; this.onMove(s, x, y); return; }
        if (inRect(x, y, u.freqSlider)) { s.dragging = 'freq'; this.onMove(s, x, y); return; }
        if (inRect(x, y, u.dampSlider)) { s.dragging = 'damp'; this.onMove(s, x, y); return; }
        if (inRect(x, y, u.tensSlider)) { s.dragging = 'tens'; this.onMove(s, x, y); return; }

        if (x >= 40 && x <= 145 && y >= 90 && y <= 370) {
          s.driveMode = 'manual';
          s.dragging = 'wrench';
          this.onMove(s, x, y);
          return;
        }

        if (s.showRulers && inRect(x, y, { x: s.rulerPos.x, y: s.rulerPos.y, w: 380, h: 28 })) {
          s.dragging = 'ruler';
        }
      },

      onMove: function (s, x, y) {
        const u = s.uiRects || {};
        if (s.dragging === 'amp' && u.ampSlider) {
          const r = clamp((x - u.ampSlider.x) / u.ampSlider.w, 0, 1);
          s.amplitude = Number((0.1 + r * 1.4).toFixed(2));
        } else if (s.dragging === 'freq' && u.freqSlider) {
          const r = clamp((x - u.freqSlider.x) / u.freqSlider.w, 0, 1);
          s.frequency = Number((0.2 + r * 2.8).toFixed(2));
        } else if (s.dragging === 'damp' && u.dampSlider) {
          const r = clamp((x - u.dampSlider.x) / u.dampSlider.w, 0, 1);
          s.damping = Number(r.toFixed(2));
        } else if (s.dragging === 'tens' && u.tensSlider) {
          const r = clamp((x - u.tensSlider.x) / u.tensSlider.w, 0, 1);
          s.tension = Number((0.2 + r * 0.8).toFixed(2));
        } else if (s.dragging === 'wrench') {
          s.y[0] = clamp(y - 230, -105, 105);
        } else if (s.dragging === 'ruler') {
          s.rulerPos.x = clamp(x - 190, 40, W - 420);
          s.rulerPos.y = clamp(y - 14, 70, 340);
        }
      },

      onUp: function (s) {
        s.dragging = null;
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('一维离散珠串波动模拟器 (Wave on a String — 60 耦合振子)', 28, 33);

        const rstBtn = { x: 540, y: 17, w: 86, h: 32, r: 7 };
        const pulseBtn = { x: 632, y: 17, w: 86, h: 32, r: 7 };
        const playBtn = { x: 724, y: 17, w: 74, h: 32, r: 7 };
        const slowBtn = { x: 804, y: 17, w: 72, h: 32, r: 7 };
        s.uiRects.restartBtn = rstBtn;
        s.uiRects.pulseBtn = pulseBtn;
        s.uiRects.playBtn = playBtn;
        s.uiRects.slowBtn = slowBtn;

        drawButton(ctx, rstBtn, '重新开始', false, '#ef4444');
        drawButton(ctx, pulseBtn, '发射脉冲', s.pulseTimer >= 0, '#10b981');
        drawButton(ctx, playBtn, s.playing ? '暂停' : '播放', !s.playing, '#38bdf8');
        drawButton(ctx, slowBtn, s.slowMotion ? '0.25x 慢放' : '1.0x 常速', s.slowMotion, '#f59e0b');

        const stageY = 66;
        const stageH = 310;
        const baseY = 225;
        const startX = 110;
        const endX = 815;
        const dx = (endX - startX) / (NUM_BEADS - 1);

        drawShadowCard(ctx, 14, stageY, W - 28, stageH, 12, '#091526', '#334155');

        ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX - 25, baseY);
        ctx.lineTo(endX + 35, baseY);
        ctx.stroke();
        ctx.setLineDash([]);

        const y0 = baseY + s.y[0];
        if (s.driveMode === 'oscillate') {
          const wheelY = baseY + 58;
          ctx.beginPath();
          ctx.arc(startX, wheelY, 26, 0, Math.PI * 2);
          ctx.fillStyle = '#334155';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();

          const pinX = startX + Math.cos(s.phase) * 18;
          const pinY = wheelY - Math.sin(s.phase) * 18;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(pinX, pinY);
          ctx.lineTo(startX, y0);
          ctx.stroke();
        } else {
          roundRect(ctx, startX - 52, y0 - 10, 48, 20, 5, '#64748b', '#e2e8f0', 1.5);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 10px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(s.driveMode === 'manual' ? '上下拖动' : '脉冲源', startX - 28, y0);
        }

        const yLast = baseY + s.y[NUM_BEADS - 1];
        if (s.endMode === 'fixed') {
          roundRect(ctx, endX - 4, baseY - 22, 24, 44, 4, '#475569', '#cbd5e1', 2);
        } else if (s.endMode === 'loose') {
          roundRect(ctx, endX - 3, baseY - 118, 6, 236, 3, '#94a3b8', null);
          ctx.beginPath();
          ctx.arc(endX, yLast, 11, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          roundRect(ctx, endX - 6, baseY - 95, 58, 190, 6, 'rgba(56, 189, 248, 0.12)', '#38bdf8', 1.8);
          ctx.fillStyle = '#7dd3fc';
          ctx.font = '10px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('∞ 无反射窗', endX + 23, baseY - 104);
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < NUM_BEADS; i++) {
          const bx = startX + i * dx;
          const by = baseY + s.y[i];
          if (i === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.stroke();

        for (let i = 0; i < NUM_BEADS; i++) {
          const bx = startX + i * dx;
          const by = baseY + s.y[i];
          const isRef = i % 10 === 0;
          ctx.beginPath();
          ctx.arc(bx, by, isRef ? 6.5 : 4.8, 0, Math.PI * 2);
          ctx.fillStyle = isRef ? '#22c55e' : '#ef4444';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }

        if (s.showRulers) {
          const rx = s.rulerPos.x;
          const ry = s.rulerPos.y;
          roundRect(ctx, rx, ry, 380, 26, 4, 'rgba(253, 230, 138, 0.92)', '#d97706', 1.2);
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#1e293b';
          for (let cm = 0; cm <= 5; cm++) {
            const tx = rx + 12 + cm * 70;
            ctx.beginPath();
            ctx.moveTo(tx, ry);
            ctx.lineTo(tx, ry + 10);
            ctx.stroke();
            ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${cm} cm`, tx, ry + 19);
          }
        }

        const timerBtn = { x: 705, y: 76, w: 162, h: 30, r: 6 };
        const rulerBtn = { x: 590, y: 76, w: 108, h: 30, r: 6 };
        s.uiRects.timerBtn = timerBtn;
        s.uiRects.rulerBtn = rulerBtn;
        drawButton(ctx, rulerBtn, s.showRulers ? '隐藏可拖标尺' : '显示标尺', s.showRulers, '#38bdf8');
        drawButton(ctx, timerBtn, `秒表: ${s.timerSec.toFixed(2)} s (${s.timerRunning ? '停' : '启/清'})`, s.timerRunning, '#10b981');

        const botY = 386;
        drawShadowCard(ctx, 14, botY, W - 28, 142, 10, '#1e293b', '#334155');

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('左端驱动方式', 28, botY + 20);

        const dModes = [
          { val: 'oscillate', label: '简谐振荡' },
          { val: 'pulse', label: '脉冲发生' },
          { val: 'manual', label: '手动拖拽' }
        ];
        s.uiRects.driveBtns = [];
        for (let i = 0; i < dModes.length; i++) {
          const r = { x: 28, y: botY + 32 + i * 32, w: 112, h: 27, r: 6 };
          s.uiRects.driveBtns.push({ rect: r, val: dModes[i].val });
          drawButton(ctx, r, dModes[i].label, s.driveMode === dModes[i].val, '#38bdf8');
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('右端边界条件', 156, botY + 20);

        const eModes = [
          { val: 'fixed', label: '固定端 (反相)' },
          { val: 'loose', label: '自由端 (同相)' },
          { val: 'no-end', label: '无端 (无反射)' }
        ];
        s.uiRects.endBtns = [];
        for (let i = 0; i < eModes.length; i++) {
          const r = { x: 156, y: botY + 32 + i * 32, w: 120, h: 27, r: 6 };
          s.uiRects.endBtns.push({ rect: r, val: eModes[i].val });
          drawButton(ctx, r, eModes[i].label, s.endMode === eModes[i].val, '#f59e0b');
        }

        const s1 = { x: 300, y: botY + 38, w: 270, h: 20 };
        const s2 = { x: 300, y: botY + 94, w: 270, h: 20 };
        const s3 = { x: 596, y: botY + 38, w: 270, h: 20 };
        const s4 = { x: 596, y: botY + 94, w: 270, h: 20 };
        s.uiRects.ampSlider = s1;
        s.uiRects.freqSlider = s2;
        s.uiRects.dampSlider = s3;
        s.uiRects.tensSlider = s4;

        drawSlider(ctx, s1, '振幅 Amplitude', `${s.amplitude.toFixed(2)} cm`, (s.amplitude - 0.1) / 1.4, '#38bdf8');
        drawSlider(ctx, s2, '频率 Frequency', `${s.frequency.toFixed(2)} Hz`, (s.frequency - 0.2) / 2.8, '#10b981');
        drawSlider(ctx, s3, '阻尼 Damping', `${(s.damping * 100).toFixed(0)}%`, s.damping, '#a855f7');
        drawSlider(ctx, s4, '绳张力 Tension', `${(s.tension * 100).toFixed(0)}%`, (s.tension - 0.2) / 0.8, '#f59e0b');
      }
    }
  );

  // ============================================================================
  // 6. 'fourier-making-waves' (傅里叶：造波)
  // ============================================================================

  const HARMONIC_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
  ];

  function getPresetAmplitudes(preset) {
    const A = new Array(11).fill(0);
    if (preset === 'sine') {
      A[0] = 1.0;
    } else if (preset === 'square') {
      for (let n = 1; n <= 11; n += 2) {
        A[n - 1] = Number((4 / (Math.PI * n)).toFixed(3));
      }
    } else if (preset === 'triangle') {
      for (let n = 1; n <= 11; n += 2) {
        const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
        A[n - 1] = Number(((8 / (Math.PI * Math.PI * n * n)) * sign).toFixed(3));
      }
    } else if (preset === 'sawtooth') {
      for (let n = 1; n <= 11; n++) {
        const sign = n % 2 === 1 ? 1 : -1;
        A[n - 1] = Number(((2 / (Math.PI * n)) * sign).toFixed(3));
      }
    } else if (preset === 'packet') {
      for (let n = 1; n <= 11; n++) {
        A[n - 1] = Number(Math.exp(-Math.pow(n - 6, 2) / 5.5).toFixed(3));
      }
    }
    return A;
  }

  createSimAdapter(
    'fourier-making-waves',
    {
      title: '傅里叶：造波 (Fourier: Making Waves)',
      subtitle: '11 阶分立谐波叠加 (A₁~A₁₁) 与连续高斯波包不确定性关系 Δx·Δk ≥ 1/2',
      category: 'electrowave'
    },
    {
      controlKeys: ['mode', 'preset', 'numHarmonics', 'traveling', 'deltaK', 'k0'],
      controls: [
        {
          id: 'mode',
          key: 'mode',
          label: '傅里叶模式',
          type: 'select',
          value: 'discrete',
          options: [
            { value: 'discrete', label: '分立谐波叠加 (Discrete A₁~A₁₁)' },
            { value: 'packet', label: '连续波包与不确定性 (Wave Packet)' }
          ]
        },
        {
          id: 'preset',
          key: 'preset',
          label: '预设波形',
          type: 'select',
          value: 'square',
          options: [
            { value: 'sine', label: '正弦波 (Sine)' },
            { value: 'square', label: '方波 (Square)' },
            { value: 'triangle', label: '三角波 (Triangle)' },
            { value: 'sawtooth', label: '锯齿波 (Sawtooth)' },
            { value: 'packet', label: '分立波包 (Wave Packet)' }
          ]
        },
        {
          id: 'deltaK',
          key: 'deltaK',
          label: '波数宽度 Δk (rad/m)',
          type: 'slider',
          min: 0.4,
          max: 4.0,
          step: 0.1,
          value: 1.5
        }
      ],

      defaultState: function () {
        return {
          mode: 'discrete',
          preset: 'square',
          amplitudes: getPresetAmplitudes('square'),
          numHarmonics: 11,
          traveling: true,
          deltaK: 1.5,
          k0: 12.0,
          time: 0,
          draggingHarmonic: -1,
          draggingSlider: null,
          uiRects: {}
        };
      },

      onControlChange: function (s, key, val) {
        if (key === 'preset' && val !== 'custom') {
          s.amplitudes = getPresetAmplitudes(val);
        }
      },

      onUpdate: function (s, dt) {
        if (s.traveling) {
          s.time += dt * 1.4;
        }
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (inRect(x, y, u.modeDisc)) { s.mode = 'discrete'; return; }
        if (inRect(x, y, u.modePack)) { s.mode = 'packet'; return; }
        if (inRect(x, y, u.travelBtn)) { s.traveling = !s.traveling; return; }

        if (s.mode === 'discrete') {
          if (u.presetBtns) {
            for (const b of u.presetBtns) {
              if (inRect(x, y, b.rect)) {
                s.preset = b.val;
                s.amplitudes = getPresetAmplitudes(b.val);
                return;
              }
            }
          }
          if (u.ampColumns) {
            for (let i = 0; i < u.ampColumns.length; i++) {
              if (inRect(x, y, u.ampColumns[i])) {
                s.draggingHarmonic = i;
                s.preset = 'custom';
                this.onMove(s, x, y);
                return;
              }
            }
          }
        } else {
          if (inRect(x, y, u.dkSlider)) { s.draggingSlider = 'dk'; this.onMove(s, x, y); return; }
          if (inRect(x, y, u.dxSlider)) { s.draggingSlider = 'dx'; this.onMove(s, x, y); return; }
          if (inRect(x, y, u.k0Slider)) { s.draggingSlider = 'k0'; this.onMove(s, x, y); return; }
        }
      },

      onMove: function (s, x, y) {
        const u = s.uiRects || {};
        if (s.draggingHarmonic >= 0 && u.ampPlot) {
          const midY = u.ampPlot.y + u.ampPlot.h / 2;
          const val = clamp((midY - y) / (u.ampPlot.h * 0.44), -1.0, 1.0);
          s.amplitudes[s.draggingHarmonic] = Math.abs(val) < 0.04 ? 0 : Number(val.toFixed(2));
        } else if (s.draggingSlider === 'dk' && u.dkSlider) {
          const r = clamp((x - u.dkSlider.x) / u.dkSlider.w, 0, 1);
          s.deltaK = Number((0.4 + r * 3.6).toFixed(2));
        } else if (s.draggingSlider === 'dx' && u.dxSlider) {
          const r = clamp((x - u.dxSlider.x) / u.dxSlider.w, 0, 1);
          const targetDx = 0.125 + r * 1.125;
          s.deltaK = Number(clamp(1 / (2 * targetDx), 0.4, 4.0).toFixed(2));
        } else if (s.draggingSlider === 'k0' && u.k0Slider) {
          const r = clamp((x - u.k0Slider.x) / u.k0Slider.w, 0, 1);
          s.k0 = Number((4.0 + r * 20.0).toFixed(1));
        }
      },

      onUp: function (s) {
        s.draggingHarmonic = -1;
        s.draggingSlider = null;
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('傅里叶：造波 (Fourier: Making Waves)', 28, 33);

        const mDisc = { x: 485, y: 17, w: 142, h: 32, r: 7 };
        const mPack = { x: 634, y: 17, w: 142, h: 32, r: 7 };
        const tBtn = { x: 782, y: 17, w: 94, h: 32, r: 7 };
        s.uiRects.modeDisc = mDisc;
        s.uiRects.modePack = mPack;
        s.uiRects.travelBtn = tBtn;
        drawButton(ctx, mDisc, '分立谐波叠加', s.mode === 'discrete', '#38bdf8');
        drawButton(ctx, mPack, '连续波包 (Δx·Δk)', s.mode === 'packet', '#f59e0b');
        drawButton(ctx, tBtn, s.traveling ? '行波动态: 开' : '静态快照', s.traveling, '#10b981');

        const plotW = 618;
        const p1 = { x: 14, y: 66, w: plotW, h: 142 };
        const p2 = { x: 14, y: 218, w: plotW, h: 146 };
        const p3 = { x: 14, y: 374, w: plotW, h: 154 };
        drawShadowCard(ctx, p1.x, p1.y, p1.w, p1.h, 10, '#091526', '#334155');
        drawShadowCard(ctx, p2.x, p2.y, p2.w, p2.h, 10, '#091526', '#334155');
        drawShadowCard(ctx, p3.x, p3.y, p3.w, p3.h, 10, '#091526', '#334155');

        const rightCard = { x: 644, y: 66, w: 242, h: 462 };
        drawShadowCard(ctx, rightCard.x, rightCard.y, rightCard.w, rightCard.h, 10, '#1e293b', '#334155');

        if (s.mode === 'discrete') {
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('(上) 谐波振幅谱 A₁ ~ A₁₁ (可直接上下拖动各阶滑块柱)', p1.x + 12, p1.y + 18);

          const ampPlot = { x: p1.x + 42, y: p1.y + 30, w: p1.w - 56, h: p1.h - 42 };
          s.uiRects.ampPlot = ampPlot;
          s.uiRects.ampColumns = [];
          const midY1 = ampPlot.y + ampPlot.h / 2;

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ampPlot.x, midY1);
          ctx.lineTo(ampPlot.x + ampPlot.w, midY1);
          ctx.stroke();

          const colW = ampPlot.w / 11;
          for (let i = 0; i < 11; i++) {
            const cx = ampPlot.x + i * colW;
            const colRect = { x: cx, y: ampPlot.y, w: colW, h: ampPlot.h };
            s.uiRects.ampColumns.push(colRect);

            const aVal = s.amplitudes[i] || 0;
            const barH = aVal * (ampPlot.h * 0.44);
            const col = HARMONIC_COLORS[i];

            if (Math.abs(barH) > 1) {
              const by = barH >= 0 ? midY1 - barH : midY1;
              roundRect(ctx, cx + 8, by, colW - 16, Math.abs(barH), 4, col, '#ffffff', 1);
            }

            ctx.beginPath();
            ctx.arc(cx + colW / 2, midY1 - barH, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`A${i + 1}`, cx + colW / 2, ampPlot.y + ampPlot.h + 6);
            ctx.fillStyle = col;
            ctx.font = '9.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
            ctx.fillText(aVal.toFixed(2), cx + colW / 2, ampPlot.y - 4);
          }

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('(中) 各阶独立谐波分量 yₙ(x,t) = Aₙ sin(n·k₀x − n·ω₀t)', p2.x + 12, p2.y + 18);

          const midY2 = p2.y + p2.h / 2 + 8;
          const xLeft = p2.x + 24;
          const xSpan = p2.w - 40;
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(xLeft, midY2);
          ctx.lineTo(xLeft + xSpan, midY2);
          ctx.stroke();

          for (let i = 0; i < 11; i++) {
            const A = s.amplitudes[i];
            if (Math.abs(A) < 0.01) continue;
            const n = i + 1;
            ctx.strokeStyle = HARMONIC_COLORS[i];
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let px = 0; px <= xSpan; px += 3) {
              const theta = (px / xSpan) * 4 * Math.PI;
              const yVal = A * Math.sin(n * theta - n * s.time);
              const sy = midY2 - yVal * 48;
              if (px === 0) ctx.moveTo(xLeft + px, sy);
              else ctx.lineTo(xLeft + px, sy);
            }
            ctx.stroke();
          }

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('(下) 傅里叶级数合成总波形 Y(x,t) = Σ Aₙ sin(n·k₀x − n·ω₀t)', p3.x + 12, p3.y + 18);

          const midY3 = p3.y + p3.h / 2 + 8;
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(xLeft, midY3);
          ctx.lineTo(xLeft + xSpan, midY3);
          ctx.stroke();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let px = 0; px <= xSpan; px += 2) {
            const theta = (px / xSpan) * 4 * Math.PI;
            let sum = 0;
            for (let i = 0; i < 11; i++) {
              const n = i + 1;
              sum += s.amplitudes[i] * Math.sin(n * theta - n * s.time);
            }
            const sy = midY3 - clamp(sum, -1.45, 1.45) * 44;
            if (px === 0) ctx.moveTo(xLeft + px, sy);
            else ctx.lineTo(xLeft + px, sy);
          }
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('经典波形傅里叶级数预设', rightCard.x + 14, rightCard.y + 24);

          const presets = [
            { val: 'sine', label: '正弦波 (基频 A₁ = 1)' },
            { val: 'square', label: '方波 (奇次谐波 4/πn)' },
            { val: 'triangle', label: '三角波 (奇次交替 8/π²n²)' },
            { val: 'sawtooth', label: '锯齿波 (全谐波 ±2/πn)' },
            { val: 'packet', label: '分立波包 (高斯包络)' }
          ];
          s.uiRects.presetBtns = [];
          for (let i = 0; i < presets.length; i++) {
            const r = { x: rightCard.x + 14, y: rightCard.y + 40 + i * 38, w: rightCard.w - 28, h: 32, r: 6 };
            s.uiRects.presetBtns.push({ rect: r, val: presets[i].val });
            drawButton(ctx, r, presets[i].label, s.preset === presets[i].val, '#38bdf8');
          }

          roundRect(ctx, rightCard.x + 14, rightCard.y + 242, rightCard.w - 28, 206, 8, '#0f172a', '#334155', 1);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 11.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('当前非零谐波系数:', rightCard.x + 24, rightCard.y + 262);

          ctx.font = '11px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          let lineIdx = 0;
          for (let i = 0; i < 11; i++) {
            if (Math.abs(s.amplitudes[i]) > 0.005 && lineIdx < 9) {
              ctx.fillStyle = HARMONIC_COLORS[i];
              ctx.fillText(
                `n=${String(i + 1).padEnd(2, ' ')} : A_${i + 1} = ${s.amplitudes[i] >= 0 ? '+' : ''}${s.amplitudes[i].toFixed(3)}`,
                rightCard.x + 24,
                rightCard.y + 282 + lineIdx * 18
              );
              lineIdx++;
            }
          }
        } else {
          const dk = s.deltaK;
          const dx = 1 / (2 * dk);
          const xLeft = p1.x + 36;
          const xSpan = p1.w - 56;

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`(上) 连续波数谱分布 A(k) = exp(−(k − k₀)² / 4Δk²)   [Δk = ${dk.toFixed(2)} rad/m]`, p1.x + 12, p1.y + 18);

          const base1 = p1.y + p1.h - 20;
          ctx.strokeStyle = '#f59e0b';
          ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(xLeft, base1);
          for (let px = 0; px <= xSpan; px += 3) {
            const kVal = (px / xSpan) * 28;
            const g = Math.exp(-Math.pow(kVal - s.k0, 2) / (2 * dk * dk));
            ctx.lineTo(xLeft + px, base1 - g * 92);
          }
          ctx.lineTo(xLeft + xSpan, base1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('(中) 连续波包内各波数分量余弦波簇 A(k)·cos(k·x)', p2.x + 12, p2.y + 18);

          const midY2 = p2.y + p2.h / 2 + 8;
          for (let m = -4; m <= 4; m++) {
            const kComp = s.k0 + m * (dk * 0.45);
            if (kComp <= 0.5) continue;
            const amp = Math.exp(-(m * m * 0.45 * 0.45) / 2);
            ctx.strokeStyle = HARMONIC_COLORS[(m + 4) % HARMONIC_COLORS.length];
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            for (let px = 0; px <= xSpan; px += 3) {
              const xMeters = ((px / xSpan) - 0.5) * 6.0;
              const yVal = amp * Math.cos(kComp * xMeters - s.time * 1.5);
              const sy = midY2 - yVal * 46;
              if (px === 0) ctx.moveTo(xLeft + px, sy);
              else ctx.lineTo(xLeft + px, sy);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`(下) 空间局部化波包 ψ(x) 及高斯包络线   [空间宽度 Δx = ${dx.toFixed(3)} m]`, p3.x + 12, p3.y + 18);

          const midY3 = p3.y + p3.h / 2 + 8;
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.6;
          for (const sign of [1, -1]) {
            ctx.beginPath();
            for (let px = 0; px <= xSpan; px += 3) {
              const xMeters = ((px / xSpan) - 0.5) * 6.0;
              const env = sign * Math.exp(-(xMeters * xMeters) / (4 * dx * dx));
              const sy = midY3 - env * 52;
              if (px === 0) ctx.moveTo(xLeft + px, sy);
              else ctx.lineTo(xLeft + px, sy);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let px = 0; px <= xSpan; px += 2) {
            const xMeters = ((px / xSpan) - 0.5) * 6.0;
            const env = Math.exp(-(xMeters * xMeters) / (4 * dx * dx));
            const yVal = env * Math.cos(s.k0 * xMeters - s.time * 2.0);
            const sy = midY3 - yVal * 52;
            if (px === 0) ctx.moveTo(xLeft + px, sy);
            else ctx.lineTo(xLeft + px, sy);
          }
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 13.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('波包与不确定性关系调节', rightCard.x + 14, rightCard.y + 24);

          const dkRect = { x: rightCard.x + 16, y: rightCard.y + 68, w: rightCard.w - 32, h: 22 };
          const dxRect = { x: rightCard.x + 16, y: rightCard.y + 128, w: rightCard.w - 32, h: 22 };
          const k0Rect = { x: rightCard.x + 16, y: rightCard.y + 188, w: rightCard.w - 32, h: 22 };
          s.uiRects.dkSlider = dkRect;
          s.uiRects.dxSlider = dxRect;
          s.uiRects.k0Slider = k0Rect;

          drawSlider(ctx, dkRect, '波数谱宽度 Δk', `${dk.toFixed(2)} rad/m`, (dk - 0.4) / 3.6, '#f59e0b');
          drawSlider(ctx, dxRect, '空间波包宽度 Δx', `${dx.toFixed(3)} m`, (dx - 0.125) / 1.125, '#38bdf8');
          drawSlider(ctx, k0Rect, '中心波数 k₀', `${s.k0.toFixed(1)} rad/m`, (s.k0 - 4.0) / 20.0, '#10b981');

          roundRect(ctx, rightCard.x + 14, rightCard.y + 236, rightCard.w - 28, 210, 8, '#0f172a', '#38bdf8', 1.4);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('傅里叶共轭不确定性定理', rightCard.x + rightCard.w / 2, rightCard.y + 260);

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 15px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillText('Δx · Δk ≥ 1/2', rightCard.x + rightCard.w / 2, rightCard.y + 292);

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillText(`Δk = ${dk.toFixed(2)} rad/m`, rightCard.x + rightCard.w / 2, rightCard.y + 326);
          ctx.fillText(`Δx = ${dx.toFixed(3)} m`, rightCard.x + rightCard.w / 2, rightCard.y + 350);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 13px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillText(`Δx · Δk = ${(dx * dk).toFixed(3)} = 0.500`, rightCard.x + rightCard.w / 2, rightCard.y + 380);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('波数谱 Δk 越宽，空间波包 Δx 越窄', rightCard.x + rightCard.w / 2, rightCard.y + 414);
        }
      }
    }
  );

  // ============================================================================
  // 7. 'blackbody-spectrum' (黑体光谱)
  // ============================================================================

  function planckSpectralExitance(lambdaUm, T) {
    if (lambdaUm <= 0.02 || T <= 0) return 0;
    const c1 = 3.74177e8;
    const c2 = 14387.77;
    const x = c2 / (lambdaUm * T);
    if (x > 100) return 0;
    const valW = c1 / (Math.pow(lambdaUm, 5) * (Math.exp(x) - 1));
    return valW / 1e6;
  }

  function blackbodyStarColor(T) {
    if (T < 750) {
      const glow = clamp((T - 200) / 550, 0.15, 1.0);
      return `rgb(${Math.round(110 * glow)}, ${Math.round(18 * glow)}, ${Math.round(12 * glow)})`;
    }
    const temp = T / 100;
    let r, g, b;
    if (temp <= 66) {
      r = 255;
      g = clamp(99.4708 * Math.log(temp) - 161.1195, 0, 255);
      b = temp <= 19 ? 0 : clamp(138.5177 * Math.log(temp - 10) - 305.0448, 0, 255);
    } else {
      r = clamp(329.6987 * Math.pow(temp - 60, -0.1332), 0, 255);
      g = clamp(288.1221 * Math.pow(temp - 60, -0.0755), 0, 255);
      b = 255;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  createSimAdapter(
    'blackbody-spectrum',
    {
      title: '黑体辐射光谱 (Blackbody Spectrum)',
      subtitle: '普朗克辐射定律 B(λ,T)、维恩位移定律 λ_max = 2898/T 与斯特藩-玻尔兹曼定律 M = σT⁴',
      category: 'electrowave'
    },
    {
      controlKeys: ['temperature', 'showWien', 'showTotalArea', 'probeLambda'],
      controls: [
        {
          id: 'temperature',
          key: 'temperature',
          label: '黑体温度 T (K)',
          type: 'slider',
          min: 200,
          max: 10000,
          step: 25,
          value: 5800
        },
        {
          id: 'showWien',
          key: 'showWien',
          label: '维恩位移峰值线',
          type: 'select',
          value: 'yes',
          options: [
            { value: 'yes', label: '显示维恩位移虚线 (λ_max)' },
            { value: 'no', label: '隐藏峰值线' }
          ]
        }
      ],

      defaultState: function () {
        return {
          temperature: 5800,
          savedTemp: null,
          showWien: true,
          showTotalArea: true,
          probeLambda: 0.55,
          dragging: null,
          uiRects: {}
        };
      },

      onDown: function (s, x, y) {
        const u = s.uiRects || {};
        if (u.presetBtns) {
          for (const b of u.presetBtns) {
            if (inRect(x, y, b.rect)) {
              s.temperature = b.val;
              return;
            }
          }
        }
        if (inRect(x, y, u.wienBtn)) { s.showWien = !s.showWien; return; }
        if (inRect(x, y, u.areaBtn)) { s.showTotalArea = !s.showTotalArea; return; }
        if (inRect(x, y, u.saveBtn)) {
          s.savedTemp = s.savedTemp === s.temperature ? null : s.temperature;
          return;
        }
        if (inRect(x, y, u.tempSlider)) {
          s.dragging = 'temp';
          this.onMove(s, x, y);
          return;
        }
        if (inRect(x, y, u.thermometer)) {
          s.dragging = 'thermo';
          this.onMove(s, x, y);
          return;
        }
        if (inRect(x, y, u.plotRect)) {
          s.dragging = 'probe';
          this.onMove(s, x, y);
        }
      },

      onMove: function (s, x, y) {
        const u = s.uiRects || {};
        if (s.dragging === 'temp' && u.tempSlider) {
          const r = clamp((x - u.tempSlider.x) / u.tempSlider.w, 0, 1);
          s.temperature = Math.round(200 + r * 9800);
        } else if (s.dragging === 'thermo' && u.thermometer) {
          const r = clamp(1 - (y - u.thermometer.y) / u.thermometer.h, 0, 1);
          s.temperature = Math.round(200 + r * 9800);
        } else if (s.dragging === 'probe' && u.plotRect) {
          const r = clamp((x - u.plotRect.x) / u.plotRect.w, 0.03, 1.0);
          s.probeLambda = Number((r * 3.0).toFixed(2));
        }
      },

      onUp: function (s) {
        s.dragging = null;
      },

      onDraw: function (ctx, s) {
        s.uiRects = {};
        const T = clamp(Number(s.temperature) || 5800, 200, 10000);
        const lambdaMaxUm = 2897.77 / T;
        const peakB = planckSpectralExitance(Math.min(3.0, lambdaMaxUm), T);
        const sigma = 5.670374e-8;
        const stefanM = sigma * Math.pow(T, 4);

        let yMax = Math.max(peakB * 1.18, 1e-4);
        if (s.savedTemp) {
          const savedPeak = planckSpectralExitance(Math.min(3.0, 2897.77 / s.savedTemp), s.savedTemp);
          yMax = Math.max(yMax, savedPeak * 1.15);
        }

        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#070b14');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawShadowCard(ctx, 14, 10, W - 28, 46, 10, '#1e293b', '#334155');
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('黑体辐射光谱与色温定律 (Blackbody Spectrum)', 28, 33);

        const wienBtn = { x: 495, y: 17, w: 124, h: 32, r: 7 };
        const areaBtn = { x: 625, y: 17, w: 124, h: 32, r: 7 };
        const saveBtn = { x: 755, y: 17, w: 120, h: 32, r: 7 };
        s.uiRects.wienBtn = wienBtn;
        s.uiRects.areaBtn = areaBtn;
        s.uiRects.saveBtn = saveBtn;

        drawButton(ctx, wienBtn, '维恩峰值虚线', Boolean(s.showWien), '#38bdf8');
        drawButton(ctx, areaBtn, '辐射积分面积', Boolean(s.showTotalArea), '#f59e0b');
        drawButton(ctx, saveBtn, s.savedTemp ? '清除对比曲线' : '保存当前曲线', Boolean(s.savedTemp), '#a855f7');

        const cardX = 14;
        const cardY = 66;
        const cardW = 588;
        const cardH = 462;
        drawShadowCard(ctx, cardX, cardY, cardW, cardH, 12, '#091526', '#334155');

        const plotX = cardX + 58;
        const plotY = cardY + 52;
        const plotW = cardW - 80;
        const plotH = 342;
        s.uiRects.plotRect = { x: plotX, y: plotY, w: plotW, h: plotH };

        roundRect(ctx, plotX, plotY, plotW, plotH, 6, '#050b14', '#334155', 1.2);

        const visStart = plotX + (0.38 / 3.0) * plotW;
        const visEnd = plotX + (0.78 / 3.0) * plotW;
        for (let px = Math.floor(visStart); px <= Math.ceil(visEnd); px++) {
          const nm = ((px - plotX) / plotW) * 3000;
          ctx.fillStyle = wavelengthToRGB(nm);
          ctx.globalAlpha = 0.25;
          ctx.fillRect(px, plotY, 1.5, plotH);
          ctx.globalAlpha = 0.9;
          ctx.fillRect(px, plotY - 14, 1.5, 10);
        }
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('紫外 UV', (plotX + visStart) / 2, plotY - 22);
        ctx.fillStyle = '#fde047';
        ctx.fillText('可见光', (visStart + visEnd) / 2, plotY - 22);
        ctx.fillStyle = '#f87171';
        ctx.fillText('红外区 Infrared (IR) →', (visEnd + plotX + plotW) / 2, plotY - 22);

        ctx.font = '10.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        for (let l = 0; l <= 3.0; l += 0.5) {
          const gx = plotX + (l / 3.0) * plotW;
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(gx, plotY);
          ctx.lineTo(gx, plotY + plotH);
          ctx.stroke();

          ctx.fillStyle = '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.fillText(`${l.toFixed(1)}`, gx, plotY + plotH + 16);
        }
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('波长 λ (μm)   [点击或拖动光谱区移动读数探针]', plotX + plotW / 2, plotY + plotH + 36);

        ctx.save();
        ctx.translate(cardX + 18, plotY + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`光谱辐射出射度 B(λ,T) [峰值缩放: ${formatSci(yMax, 1)} MW/(m²·μm)]`, 0, 0);
        ctx.restore();

        if (s.savedTemp) {
          ctx.strokeStyle = '#94a3b8';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let px = 1; px <= plotW; px += 2) {
            const lUm = (px / plotW) * 3.0;
            const bVal = planckSpectralExitance(lUm, s.savedTemp);
            const sy = plotY + plotH - clamp(bVal / yMax, 0, 1) * plotH;
            if (px === 1) ctx.moveTo(plotX + px, sy);
            else ctx.lineTo(plotX + px, sy);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const starCol = blackbodyStarColor(T);
        if (s.showTotalArea) {
          ctx.fillStyle = 'rgba(251, 146, 60, 0.18)';
          ctx.beginPath();
          ctx.moveTo(plotX, plotY + plotH);
          for (let px = 1; px <= plotW; px += 2) {
            const lUm = (px / plotW) * 3.0;
            const bVal = planckSpectralExitance(lUm, T);
            const sy = plotY + plotH - clamp(bVal / yMax, 0, 1) * plotH;
            ctx.lineTo(plotX + px, sy);
          }
          ctx.lineTo(plotX + plotW, plotY + plotH);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let px = 1; px <= plotW; px += 2) {
          const lUm = (px / plotW) * 3.0;
          const bVal = planckSpectralExitance(lUm, T);
          const sy = plotY + plotH - clamp(bVal / yMax, 0, 1) * plotH;
          if (px === 1) ctx.moveTo(plotX + px, sy);
          else ctx.lineTo(plotX + px, sy);
        }
        ctx.stroke();

        if (s.showWien) {
          const peakX = plotX + clamp(lambdaMaxUm / 3.0, 0, 1) * plotW;
          const peakY = plotY + plotH - clamp(peakB / yMax, 0, 1) * plotH;
          ctx.strokeStyle = '#38bdf8';
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(peakX, plotY + plotH);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.arc(peakX, peakY, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = peakX > plotX + plotW - 120 ? 'right' : 'left';
          ctx.fillText(
            `λ_max = ${lambdaMaxUm.toFixed(3)} μm (${Math.round(lambdaMaxUm * 1000)} nm)`,
            peakX + (peakX > plotX + plotW - 120 ? -8 : 8),
            Math.max(plotY + 18, peakY - 8)
          );
        }

        const probeX = plotX + (s.probeLambda / 3.0) * plotW;
        const probeB = planckSpectralExitance(s.probeLambda, T);
        const probeY = plotY + plotH - clamp(probeB / yMax, 0, 1) * plotH;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(probeX, plotY);
        ctx.lineTo(probeX, plotY + plotH);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(probeX, probeY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fill();

        roundRect(ctx, plotX + plotW - 210, plotY + 10, 200, 38, 6, 'rgba(15, 23, 42, 0.88)', '#fde047', 1);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 10.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`探针波长 λ = ${s.probeLambda.toFixed(2)} μm`, plotX + plotW - 200, plotY + 23);
        ctx.fillText(`B(λ,T) = ${formatSci(probeB, 2)} MW/m²·μm`, plotX + plotW - 200, plotY + 38);

        const rCard = { x: 614, y: 66, w: 272, h: 462 };
        drawShadowCard(ctx, rCard.x, rCard.y, rCard.w, rCard.h, 12, '#1e293b', '#334155');

        roundRect(ctx, rCard.x + 14, rCard.y + 14, 114, 108, 8, '#050811', '#334155', 1.2);
        const starCX = rCard.x + 71;
        const starCY = rCard.y + 62;
        const starGrad = ctx.createRadialGradient(starCX, starCY, 4, starCX, starCY, 42);
        starGrad.addColorStop(0, '#ffffff');
        starGrad.addColorStop(0.35, starCol);
        starGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.arc(starCX, starCY, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = starCol;
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 4; k++) {
          const ang = (k * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(starCX - Math.cos(ang) * 28, starCY - Math.sin(ang) * 28);
          ctx.lineTo(starCX + Math.cos(ang) * 28, starCY + Math.sin(ang) * 28);
          ctx.stroke();
        }
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 10.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`合成色温 (${T} K)`, starCX, rCard.y + 110);

        roundRect(ctx, rCard.x + 136, rCard.y + 14, 122, 108, 8, '#0f172a', '#334155', 1.2);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('维恩峰值波长 λ_max:', rCard.x + 144, rCard.y + 32);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText(`${lambdaMaxUm.toFixed(3)} μm`, rCard.x + 144, rCard.y + 50);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10.5px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('总辐射出射度 M=σT⁴:', rCard.x + 144, rCard.y + 78);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText(`${formatSci(stefanM, 2)} W/m²`, rCard.x + 144, rCard.y + 98);

        const tSlider = { x: rCard.x + 16, y: rCard.y + 154, w: rCard.w - 32, h: 22 };
        s.uiRects.tempSlider = tSlider;
        drawSlider(ctx, tSlider, '热力学温度 T (200 K ~ 10000 K)', `${T} K`, (T - 200) / 9800, '#ef4444');

        const thermoRect = { x: rCard.x + 26, y: rCard.y + 194, w: 22, h: 248 };
        s.uiRects.thermometer = thermoRect;
        roundRect(ctx, thermoRect.x, thermoRect.y, thermoRect.w, thermoRect.h, 11, '#0f172a', '#94a3b8', 1.5);
        const fillRatio = clamp((T - 200) / 9800, 0, 1);
        const fillH = fillRatio * thermoRect.h;
        roundRect(ctx, thermoRect.x + 3, thermoRect.y + thermoRect.h - fillH, thermoRect.w - 6, fillH, 8, '#ef4444', null);

        ctx.beginPath();
        ctx.arc(thermoRect.x + 11, thermoRect.y + thermoRect.h + 6, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('典型天体与光源色温标记:', rCard.x + 64, rCard.y + 202);

        const benchmarks = [
          { val: 9940, label: '天狼星 A (Sirius A: 9940 K)' },
          { val: 5800, label: '太阳表面 (Sun: 5800 K)' },
          { val: 3000, label: '白炽灯泡 (Light Bulb: 3000 K)' },
          { val: 255,  label: '地球平均 (Earth: 255 K)' }
        ];
        s.uiRects.presetBtns = [];
        for (let i = 0; i < benchmarks.length; i++) {
          const r = { x: rCard.x + 64, y: rCard.y + 218 + i * 42, w: rCard.w - 78, h: 34, r: 6 };
          s.uiRects.presetBtns.push({ rect: r, val: benchmarks[i].val });
          drawButton(ctx, r, benchmarks[i].label, Math.abs(T - benchmarks[i].val) < 40, '#38bdf8');
        }

        roundRect(ctx, rCard.x + 64, rCard.y + 392, rCard.w - 78, 56, 6, '#0f172a', '#334155', 1);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('维恩定律: λ_max = 2898 / T (μm)', rCard.x + 72, rCard.y + 410);
        ctx.fillText('玻尔兹曼: M = σ·T⁴ (W/m²)', rCard.x + 72, rCard.y + 432);
      }
    }
  );
})();
