/**
 * PhET Chemistry HTML5 Simulations - Group 4 (States of Matter II & Solutions I)
 * Target File: /Users/crazyrock/gemini/phet_chemistry/js/sims_states2_solutions1.js
 * Canvas logical resolution: width = 900, height = 540
 *
 * Implements 7 complete interactive simulations via window.registerSim(id, config):
 * 1. 'density'                  - 密度 (Archimedes' Principle, Custom/Equal-M/Equal-V/Equal-ρ/Mystery Modes)
 * 2. 'energy-forms-and-changes' - 能量形式与转化 (Intro Specific Heat with E-cubes & Systems Energy Chains)
 * 3. 'concentration'            - 浓度 (9 Solutes, Shaker/Dropper, Faucets, Evaporation, Precipitate, Probe)
 * 4. 'molarity'                 - 摩尔浓度 (Continuous n & V, 9 Solutes, Colorimetry, Saturation Crystals)
 * 5. 'beers-law-lab'            - 比尔定律实验 (Spectrophotometer, 8 Solutes, λ_max/380-780nm, ε(λ) & A-c Plots)
 * 6. 'ph-scale-basics'          - pH标度：基础 (12 Everyday Liquids, Exact Auto-Ionization Dilution, pH Meter)
 * 7. 'ph-scale'                 - pH标度 (Macro / Micro / My Solution, [H3O+]/[OH-]/[H2O] Log/Linear & Ions)
 */

(function () {
  'use strict';

  const W = 900;
  const H = 540;
  const G_ACCEL = 9.8; // m/s^2
  const KW_25C = 1.0e-14; // [H3O+][OH-] at 25°C
  const NA_AVOGADRO = 6.022e23;

  // Ensure window.registerSim exists even if loaded standalone before engine.js
  if (typeof window !== 'undefined' && typeof window.registerSim !== 'function') {
    window.__registeredSims = window.__registeredSims || {};
    window.registerSim = function (id, config) {
      window.__registeredSims[id] = config;
    };
  }

  // ============================================================================
  // SHARED UTILITIES & UNIVERSAL ENGINE ADAPTER
  // ============================================================================

  function clamp(val, min, max) {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function clampDt(dt) {
    const n = Number(dt);
    if (!Number.isFinite(n) || n <= 0) return 0.016;
    const sec = n > 1.0 ? n / 1000 : n;
    return clamp(sec, 0.001, 0.05);
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#3b82f6').replace('#', '');
    const num = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbaStr(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  function mixHex(hex1, hex2, t) {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    const u = clamp(t, 0, 1);
    const r = Math.round(c1.r + (c2.r - c1.r) * u);
    const g = Math.round(c1.g + (c2.g - c1.g) * u);
    const b = Math.round(c1.b + (c2.b - c1.b) * u);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Convert visible wavelength (380 - 780 nm) to physically accurate RGB
  function wavelengthToRgb(nm) {
    const w = clamp(nm, 380, 780);
    let r = 0, g = 0, b = 0;
    if (w >= 380 && w < 440) {
      r = -(w - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (w >= 440 && w < 490) {
      r = 0;
      g = (w - 440) / (490 - 440);
      b = 1;
    } else if (w >= 490 && w < 510) {
      r = 0;
      g = 1;
      b = -(w - 510) / (510 - 490);
    } else if (w >= 510 && w < 580) {
      r = (w - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (w >= 580 && w < 645) {
      r = 1;
      g = -(w - 645) / (645 - 580);
      b = 0;
    } else if (w >= 645 && w <= 780) {
      r = 1;
      g = 0;
      b = 0;
    }

    let factor = 1.0;
    if (w >= 380 && w < 420) {
      factor = 0.3 + 0.7 * (w - 380) / (420 - 380);
    } else if (w > 700 && w <= 780) {
      factor = 0.3 + 0.7 * (780 - w) / (780 - 700);
    }

    const R = Math.round(255 * Math.pow(r * factor, 0.8));
    const G = Math.round(255 * Math.pow(g * factor, 0.8));
    const B = Math.round(255 * Math.pow(b * factor, 0.8));
    return { r: R, g: G, b: B, css: `rgb(${R}, ${G}, ${B})` };
  }

  function formatSci(val, digits = 2) {
    const n = Number(val);
    if (!Number.isFinite(n) || n === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(n)));
    if (exp >= -2 && exp <= 3) {
      return n.toFixed(Math.max(0, digits - exp));
    }
    const mant = (n / Math.pow(10, exp)).toFixed(digits);
    const supMap = {
      '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
      '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    const expStr = String(exp).split('').map(ch => supMap[ch] || ch).join('');
    return `${mant}×10${expStr}`;
  }

  function roundRect(ctx, x, y, w, h, r = 8) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillStrokeRoundRect(ctx, x, y, w, h, r, fillStyle, strokeStyle, lineWidth = 1.5) {
    roundRect(ctx, x, y, w, h, r);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function drawVectorArrow(ctx, x1, y1, x2, y2, color, label, labelSide = 'right') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(11, Math.max(6, len * 0.28));

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * (headLen * 0.6), y2 - Math.sin(angle) * (headLen * 0.6));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = 'bold 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = labelSide === 'left' ? x2 - tw - 14 : x2 + 8;
      const ly = y2 + 4;
      fillStrokeRoundRect(ctx, lx - 4, ly - 11, tw + 8, 15, 4, 'rgba(15,23,42,0.82)', color, 1);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }

  function drawCanvasSlider(ctx, uiRegions, cfg) {
    const {
      id, x, y, w, label, value, min, max, step = 0.01, unit = '',
      color = '#3b82f6', formatVal, onChange
    } = cfg;
    const ratio = clamp((value - min) / ((max - min) || 1), 0, 1);

    ctx.save();
    ctx.font = '600 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x, y - 7);

    const valText = formatVal ? formatVal(value) : `${Number(value).toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2)}${unit ? ' ' + unit : ''}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(valText, x + w, y - 7);

    const trackY = y + 3;
    fillStrokeRoundRect(ctx, x, trackY - 3, w, 6, 3, '#e2e8f0', '#cbd5e1', 1);
    if (ratio > 0) {
      fillStrokeRoundRect(ctx, x, trackY - 3, Math.max(6, w * ratio), 6, 3, color, null, 0);
    }

    const tx = x + w * ratio;
    ctx.beginPath();
    ctx.arc(tx, trackY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();

    if (uiRegions) {
      uiRegions.push({
        id,
        type: 'slider',
        x: x - 8,
        y: y - 16,
        w: w + 16,
        h: 30,
        trackX: x,
        trackW: w,
        min,
        max,
        step,
        onChange
      });
    }
  }

  function drawCanvasButton(ctx, uiRegions, cfg) {
    const {
      id, x, y, w, h = 26, label, active = false,
      activeBg = '#2563eb', activeFg = '#ffffff',
      bg = '#f1f5f9', fg = '#334155', border = '#cbd5e1',
      fontSize = 11.5, r = 6, onClick
    } = cfg;
    ctx.save();
    fillStrokeRoundRect(
      ctx, x, y, w, h, r,
      active ? activeBg : bg,
      active ? activeBg : border,
      active ? 1.5 : 1
    );
    ctx.font = `${active ? 'bold' : '600'} ${fontSize}px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = active ? activeFg : fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    ctx.restore();

    if (uiRegions && onClick) {
      uiRegions.push({
        id,
        type: 'button',
        x, y, w, h,
        onClick
      });
    }
  }

  function drawCanvasCheckbox(ctx, uiRegions, cfg) {
    const { id, x, y, label, checked, color = '#2563eb', onChange } = cfg;
    ctx.save();
    fillStrokeRoundRect(ctx, x, y, 16, 16, 4, checked ? color : '#ffffff', checked ? color : '#94a3b8', 1.5);
    if (checked) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3.5, y + 8.5);
      ctx.lineTo(x + 7, y + 12);
      ctx.lineTo(x + 12.5, y + 4.5);
      ctx.stroke();
    }
    ctx.font = '600 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 22, y + 8.5);
    const tw = ctx.measureText(label).width;
    ctx.restore();

    if (uiRegions && onChange) {
      uiRegions.push({
        id,
        type: 'button',
        x: x - 2,
        y: y - 2,
        w: 26 + tw,
        h: 20,
        onClick: () => onChange(!checked)
      });
    }
  }

  function createUniversalSim(simDef) {
    let internalState = simDef.createState();
    let lastCanvas = null;
    let lastPointerStamp = 0;

    function resolveCtx(args) {
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a && typeof a.fillRect === 'function' && typeof a.beginPath === 'function') {
          return a;
        }
      }
      return null;
    }

    function resolveState(args) {
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (
          a &&
          typeof a === 'object' &&
          typeof a.fillRect !== 'function' &&
          !(typeof HTMLElement !== 'undefined' && a instanceof HTMLElement) &&
          typeof a.preventDefault !== 'function'
        ) {
          if (!a.__simInitialized || a.__simId !== simDef.id) {
            const fresh = simDef.createState();
            Object.assign(a, fresh);
            a.__simInitialized = true;
            a.__simId = simDef.id;
          }
          internalState = a;
          return a;
        }
      }
      return internalState;
    }

    function resolveDt(args) {
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'number' && args[i] < 200) {
          return clampDt(args[i]);
        }
      }
      return 0.016;
    }

    function resolvePointer(args) {
      let x = null, y = null;
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (typeof a === 'number') {
          if (x === null) x = a;
          else if (y === null) y = a;
        } else if (a && typeof a === 'object') {
          if (typeof a.x === 'number' && typeof a.y === 'number') {
            x = a.x;
            y = a.y;
            break;
          }
          if (typeof a.clientX === 'number' && typeof a.clientY === 'number' && lastCanvas) {
            const rect = lastCanvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              x = (a.clientX - rect.left) * (W / rect.width);
              y = (a.clientY - rect.top) * (H / rect.height);
              break;
            }
          }
          if (typeof a.offsetX === 'number' && typeof a.offsetY === 'number') {
            const cw = lastCanvas ? (lastCanvas.clientWidth || W) : W;
            const ch = lastCanvas ? (lastCanvas.clientHeight || H) : H;
            x = a.offsetX * (W / cw);
            y = a.offsetY * (H / ch);
            break;
          }
        }
      }
      return {
        x: clamp(x ?? 0, 0, W),
        y: clamp(y ?? 0, 0, H)
      };
    }

    function bindCanvasOnce(canvas) {
      if (!canvas || typeof canvas.addEventListener !== 'function') return;
      canvas.__activeSimWrapper = wrapper;
      if (canvas.__phetUniversalBound) return;
      canvas.__phetUniversalBound = true;

      const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        const cx = touch ? touch.clientX : e.clientX;
        const cy = touch ? touch.clientY : e.clientY;
        if (!rect || rect.width <= 0 || rect.height <= 0) {
          return { x: e.offsetX || 0, y: e.offsetY || 0 };
        }
        return {
          x: clamp((cx - rect.left) * (W / rect.width), 0, W),
          y: clamp((cy - rect.top) * (H / rect.height), 0, H)
        };
      };

      canvas.addEventListener('pointerdown', (e) => {
        const active = canvas.__activeSimWrapper;
        if (!active) return;
        const { x, y } = getCoords(e);
        active._handlePointerDown(x, y, internalState, true);
      });

      canvas.addEventListener('pointermove', (e) => {
        const active = canvas.__activeSimWrapper;
        if (!active) return;
        const { x, y } = getCoords(e);
        active._handlePointerMove(x, y, internalState, true);
      });

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pointerup', (e) => {
          const active = canvas.__activeSimWrapper;
          if (!active) return;
          const { x, y } = getCoords(e);
          active._handlePointerUp(x, y, internalState, true);
        });
      }
    }

    const wrapper = {
      id: simDef.id,
      title: simDef.title,
      name: simDef.title,
      subtitle: simDef.subtitle || '',
      description: simDef.description || '',
      category: simDef.category || 'chemistry',
      width: W,
      height: H,
      modes: simDef.modes || [],
      tabs: simDef.modes || [],
      controls: simDef.controls || [],
      formulas: simDef.formulas || [],

      getInitialState() {
        internalState = simDef.createState();
        internalState.__simInitialized = true;
        internalState.__simId = simDef.id;
        return internalState;
      },

      init(...args) {
        const ctx = resolveCtx(args);
        if (ctx && ctx.canvas) {
          lastCanvas = ctx.canvas;
          bindCanvasOnce(ctx.canvas);
        }
        const fresh = simDef.createState();
        fresh.__simInitialized = true;
        fresh.__simId = simDef.id;
        for (let i = 0; i < args.length; i++) {
          const a = args[i];
          if (a && typeof a === 'object' && typeof a.fillRect !== 'function' && !(typeof HTMLElement !== 'undefined' && a instanceof HTMLElement)) {
            Object.keys(a).forEach(k => delete a[k]);
            Object.assign(a, fresh);
            internalState = a;
            return a;
          }
        }
        internalState = fresh;
        return internalState;
      },

      setup(...args) {
        return this.init(...args);
      },

      reset(...args) {
        return this.init(...args);
      },

      update(...args) {
        const state = resolveState(args);
        const dt = resolveDt(args);
        simDef.update(state, dt);
      },

      step(...args) {
        return this.update(...args);
      },

      draw(...args) {
        const ctx = resolveCtx(args);
        const state = resolveState(args);
        if (!ctx) return;
        if (ctx.canvas) {
          lastCanvas = ctx.canvas;
          bindCanvasOnce(ctx.canvas);
        }
        state.uiRegions = [];
        simDef.draw(ctx, state);
      },

      render(...args) {
        return this.draw(...args);
      },

      _handlePointerDown(x, y, state, fromDom = false) {
        const now = Date.now();
        if (now - lastPointerStamp < 6 && !fromDom) return;
        lastPointerStamp = now;

        const st = state || internalState;
        const regions = st.uiRegions || [];
        for (let i = regions.length - 1; i >= 0; i--) {
          const reg = regions[i];
          if (x >= reg.x && x <= reg.x + reg.w && y >= reg.y && y <= reg.y + reg.h) {
            if (reg.type === 'button' && reg.onClick) {
              reg.onClick();
              return;
            }
            if (reg.type === 'slider' && reg.onChange) {
              st.__activeSlider = reg;
              const t = clamp((x - reg.trackX) / (reg.trackW || 1), 0, 1);
              const raw = reg.min + t * (reg.max - reg.min);
              const stepped = reg.step ? Math.round(raw / reg.step) * reg.step : raw;
              reg.onChange(clamp(Number(stepped.toFixed(6)), reg.min, reg.max));
              return;
            }
          }
        }
        if (simDef.onPointerDown) {
          simDef.onPointerDown(st, x, y);
        }
      },

      _handlePointerMove(x, y, state) {
        const st = state || internalState;
        if (st.__activeSlider) {
          const reg = st.__activeSlider;
          const t = clamp((x - reg.trackX) / (reg.trackW || 1), 0, 1);
          const raw = reg.min + t * (reg.max - reg.min);
          const stepped = reg.step ? Math.round(raw / reg.step) * reg.step : raw;
          reg.onChange(clamp(Number(stepped.toFixed(6)), reg.min, reg.max));
          return;
        }
        if (simDef.onPointerMove) {
          simDef.onPointerMove(st, x, y);
        }
      },

      _handlePointerUp(x, y, state) {
        const st = state || internalState;
        st.__activeSlider = null;
        if (simDef.onPointerUp) {
          simDef.onPointerUp(st, x, y);
        }
      },

      onPointerDown(...args) {
        const st = resolveState(args);
        const { x, y } = resolvePointer(args);
        this._handlePointerDown(x, y, st, false);
      },

      onMouseDown(...args) {
        this.onPointerDown(...args);
      },

      onClick(...args) {
        this.onPointerDown(...args);
      },

      onPointerMove(...args) {
        const st = resolveState(args);
        const { x, y } = resolvePointer(args);
        this._handlePointerMove(x, y, st);
      },

      onMouseMove(...args) {
        this.onPointerMove(...args);
      },

      onPointerUp(...args) {
        const st = resolveState(args);
        const { x, y } = resolvePointer(args);
        this._handlePointerUp(x, y, st);
      },

      onMouseUp(...args) {
        this.onPointerUp(...args);
      },

      onControlChange(key, value, maybeState) {
        const st = (maybeState && typeof maybeState === 'object') ? maybeState : internalState;
        if (simDef.onControlChange) {
          simDef.onControlChange(st, key, value);
        } else {
          st[key] = value;
        }
      },

      setParam(key, value, maybeState) {
        this.onControlChange(key, value, maybeState);
      },

      onModeChange(modeId, maybeState) {
        this.onControlChange('mode', modeId, maybeState);
      }
    };

    return wrapper;
  }

  // ============================================================================
  // 1. 'density' (密度)
  // ============================================================================

  const DENSITY_MATERIALS = {
    wood:     { id: 'wood',     name: '木头 (Wood)',     density: 0.40, color: '#d97706', stroke: '#92400e', textColor: '#ffffff' },
    ice:      { id: 'ice',      name: '冰块 (Ice)',      density: 0.92, color: '#7dd3fc', stroke: '#0284c7', textColor: '#0f172a' },
    brick:    { id: 'brick',    name: '砖块 (Brick)',    density: 2.00, color: '#dc2626', stroke: '#7f1d1d', textColor: '#ffffff' },
    aluminum: { id: 'aluminum', name: '铝块 (Al)',       density: 2.70, color: '#94a3b8', stroke: '#475569', textColor: '#0f172a' },
    gold:     { id: 'gold',     name: '金块 (Gold)',     density: 19.30, color: '#facc15', stroke: '#a16207', textColor: '#0f172a' },
    custom:   { id: 'custom',   name: '自定义 (Custom)', density: 1.00, color: '#8b5cf6', stroke: '#4c1d95', textColor: '#ffffff' }
  };

  const MYSTERY_REFERENCE_TABLE = [
    { name: '木头 (Wood)', density: 0.40 },
    { name: '汽油 (Gasoline)', density: 0.70 },
    { name: '冰 (Ice)', density: 0.92 },
    { name: '水 (Water)', density: 1.00 },
    { name: '铝 (Aluminum)', density: 2.70 },
    { name: '铁/钢 (Steel)', density: 7.80 },
    { name: '铅 (Lead)', density: 11.34 },
    { name: '金 (Gold)', density: 19.30 }
  ];

  const DENSITY_TANK = {
    x: 245,
    y: 125,
    w: 365,
    h: 345,
    baseVolumeL: 100.0,
    maxVolumeL: 135.0
  };
  const DENSITY_SCALE = {
    x: 95,
    y: 412,
    w: 118
  };

  function volumeToTankHeightPx(volL) {
    return (volL / 100.0) * 220.0;
  }

  function blockSizeFromVolume(volL) {
    const side = clamp(34 + Math.cbrt(clamp(volL, 0.5, 15)) * 22, 38, 92);
    return { w: side, h: side };
  }

  function buildDensityBlocksForMode(mode, customMat = 'wood', customM = 2.0, customV = 5.0) {
    if (mode === 'custom') {
      const mat = DENSITY_MATERIALS[customMat] || DENSITY_MATERIALS.wood;
      const v = clamp(customV, 1.0, 10.0);
      const m = customMat === 'custom' ? clamp(customM, 0.5, 25.0) : Number((mat.density * v).toFixed(2));
      const sz = blockSizeFromVolume(v);
      return [{
        id: 'B1',
        label: mat.name.split(' ')[0],
        material: customMat,
        mass: m,
        volume: v,
        color: mat.color,
        stroke: mat.stroke,
        textColor: mat.textColor,
        x: DENSITY_TANK.x + DENSITY_TANK.w * 0.5,
        y: 235,
        vy: 0,
        w: sz.w,
        h: sz.h,
        inTank: true,
        onScale: false,
        mystery: false
      }];
    }

    if (mode === 'same-mass') {
      const configs = [
        { id: 'A', label: 'A (0.50 kg/L)', mass: 5.0, volume: 10.0, color: '#3b82f6', stroke: '#1d4ed8', textColor: '#fff', inTank: true, x: 325 },
        { id: 'B', label: 'B (1.00 kg/L)', mass: 5.0, volume: 5.0,  color: '#10b981', stroke: '#047857', textColor: '#fff', inTank: true, x: 420 },
        { id: 'C', label: 'C (2.00 kg/L)', mass: 5.0, volume: 2.5,  color: '#f59e0b', stroke: '#b45309', textColor: '#fff', inTank: true, x: 505 },
        { id: 'D', label: 'D (4.00 kg/L)', mass: 5.0, volume: 1.25, color: '#ef4444', stroke: '#b91c1c', textColor: '#fff', inTank: false, onScale: true, x: DENSITY_SCALE.x }
      ];
      return configs.map(c => {
        const sz = blockSizeFromVolume(c.volume);
        return {
          ...c,
          y: c.onScale ? DENSITY_SCALE.y - sz.h / 2 : 250,
          vy: 0,
          w: sz.w,
          h: sz.h,
          mystery: false
        };
      });
    }

    if (mode === 'same-volume') {
      const configs = [
        { id: 'A', label: 'A (2.0 kg)', mass: 2.0, volume: 5.0, color: '#eab308', stroke: '#a16207', textColor: '#0f172a', inTank: true, x: 320 },
        { id: 'B', label: 'B (4.0 kg)', mass: 4.0, volume: 5.0, color: '#06b6d4', stroke: '#0e7490', textColor: '#ffffff', inTank: true, x: 415 },
        { id: 'C', label: 'C (6.0 kg)', mass: 6.0, volume: 5.0, color: '#8b5cf6', stroke: '#5b21b6', textColor: '#ffffff', inTank: true, x: 510 },
        { id: 'D', label: 'D (8.0 kg)', mass: 8.0, volume: 5.0, color: '#ec4899', stroke: '#9d174d', textColor: '#ffffff', inTank: false, onScale: true, x: DENSITY_SCALE.x }
      ];
      return configs.map(c => {
        const sz = blockSizeFromVolume(c.volume);
        return {
          ...c,
          y: c.onScale ? DENSITY_SCALE.y - sz.h / 2 : 260,
          vy: 0,
          w: sz.w,
          h: sz.h,
          mystery: false
        };
      });
    }

    if (mode === 'same-density') {
      const configs = [
        { id: 'A', label: 'A (1.6kg/2L)',  mass: 1.6, volume: 2.0, color: '#14b8a6', stroke: '#0f766e', textColor: '#ffffff', inTank: true, x: 310 },
        { id: 'B', label: 'B (2.4kg/3L)',  mass: 2.4, volume: 3.0, color: '#3b82f6', stroke: '#1d4ed8', textColor: '#ffffff', inTank: true, x: 395 },
        { id: 'C', label: 'C (4.0kg/5L)',  mass: 4.0, volume: 5.0, color: '#f97316', stroke: '#c2410c', textColor: '#ffffff', inTank: true, x: 495 },
        { id: 'D', label: 'D (6.0kg/7.5L)', mass: 6.0, volume: 7.5, color: '#a855f7', stroke: '#6b21a8', textColor: '#ffffff', inTank: false, onScale: true, x: DENSITY_SCALE.x }
      ];
      return configs.map(c => {
        const sz = blockSizeFromVolume(c.volume);
        return {
          ...c,
          y: c.onScale ? DENSITY_SCALE.y - sz.h / 2 : 240,
          vy: 0,
          w: sz.w,
          h: sz.h,
          mystery: false
        };
      });
    }

    const mysteries = [
      { id: '1A', label: '1A (?)', trueName: '金 (19.3 kg/L)',  mass: 19.30, volume: 1.00, color: '#facc15', stroke: '#a16207', textColor: '#0f172a', inTank: false, onScale: true,  x: DENSITY_SCALE.x },
      { id: '1B', label: '1B (?)', trueName: '木头 (0.40 kg/L)', mass: 2.00,  volume: 5.00, color: '#ef4444', stroke: '#991b1b', textColor: '#ffffff', inTank: true,  onScale: false, x: 320 },
      { id: '1C', label: '1C (?)', trueName: '冰 (0.92 kg/L)',   mass: 3.68,  volume: 4.00, color: '#38bdf8', stroke: '#0369a1', textColor: '#0f172a', inTank: true,  onScale: false, x: 410 },
      { id: '1D', label: '1D (?)', trueName: '铝 (2.70 kg/L)',   mass: 8.10,  volume: 3.00, color: '#22c55e', stroke: '#15803d', textColor: '#ffffff', inTank: true,  onScale: false, x: 495 },
      { id: '1E', label: '1E (?)', trueName: '铁/钢 (7.80 kg/L)', mass: 15.60, volume: 2.00, color: '#a855f7', stroke: '#6b21a8', textColor: '#ffffff', inTank: true,  onScale: false, x: 565 }
    ];
    return mysteries.map(c => {
      const sz = blockSizeFromVolume(c.volume);
      return {
        ...c,
        y: c.onScale ? DENSITY_SCALE.y - sz.h / 2 : 255,
        vy: 0,
        w: sz.w,
        h: sz.h,
        mystery: true
      };
    });
  }

  const densitySim = createUniversalSim({
    id: 'density',
    title: '密度 (Density)',
    subtitle: '阿基米德原理 F_浮 = ρ_液 g V_排 · 浮沉条件与神秘物块密度鉴定',
    modes: [
      { id: 'custom',       label: '自定义物块' },
      { id: 'same-mass',    label: '等质量' },
      { id: 'same-volume',  label: '等体积' },
      { id: 'same-density', label: '等密度' },
      { id: 'mystery',      label: '神秘物块鉴定' }
    ],
    controls: [
      { id: 'material', type: 'select', label: '材质预设', value: 'wood', options: [
        { value: 'wood', label: '木头 (0.40 kg/L)' },
        { value: 'ice', label: '冰块 (0.92 kg/L)' },
        { value: 'brick', label: '砖块 (2.00 kg/L)' },
        { value: 'aluminum', label: '铝块 (2.70 kg/L)' },
        { value: 'gold', label: '金块 (19.30 kg/L)' },
        { value: 'custom', label: '自由调节 (Custom)' }
      ]},
      { id: 'customMass', type: 'slider', label: '质量 m (kg)', min: 0.5, max: 20.0, step: 0.1, value: 2.0 },
      { id: 'customVolume', type: 'slider', label: '体积 V (L)', min: 1.0, max: 10.0, step: 0.1, value: 5.0 },
      { id: 'fluidDensity', type: 'slider', label: '液体密度 ρ_液 (kg/L)', min: 0.70, max: 2.00, step: 0.05, value: 1.00 },
      { id: 'showVectors', type: 'checkbox', label: '显示浮力/重力矢量', value: true },
      { id: 'revealMystery', type: 'checkbox', label: '揭晓神秘物块材质', value: false }
    ],

    createState() {
      return {
        mode: 'custom',
        material: 'wood',
        customMass: 2.00,
        customVolume: 5.00,
        fluidDensity: 1.00,
        showVectors: true,
        showValues: true,
        revealMystery: false,
        selectedBlockId: 'B1',
        draggingBlockId: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        displacedVolume: 0,
        totalTankVolume: 100.0,
        scaleReadingKg: 0.0,
        blocks: buildDensityBlocksForMode('custom', 'wood', 2.00, 5.00),
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'mode') {
        state.mode = value;
        state.blocks = buildDensityBlocksForMode(state.mode, state.material, state.customMass, state.customVolume);
        state.selectedBlockId = state.blocks[0] ? state.blocks[0].id : null;
        return;
      }
      if (key === 'material') {
        state.material = value;
        if (state.mode !== 'custom') state.mode = 'custom';
        const mat = DENSITY_MATERIALS[value] || DENSITY_MATERIALS.wood;
        if (value !== 'custom') {
          state.customMass = Number((mat.density * state.customVolume).toFixed(2));
        }
        state.blocks = buildDensityBlocksForMode('custom', state.material, state.customMass, state.customVolume);
        state.selectedBlockId = 'B1';
        return;
      }
      if (key === 'customMass') {
        state.customMass = clamp(value, 0.5, 100.0);
        if (state.mode === 'custom' && state.blocks[0]) {
          state.material = 'custom';
          state.blocks[0].mass = state.customMass;
          state.blocks[0].material = 'custom';
          state.blocks[0].label = '自定义';
          state.blocks[0].color = '#8b5cf6';
          state.blocks[0].stroke = '#4c1d95';
        }
        return;
      }
      if (key === 'customVolume') {
        state.customVolume = clamp(value, 1.0, 10.0);
        if (state.mode === 'custom' && state.blocks[0]) {
          const b = state.blocks[0];
          b.volume = state.customVolume;
          const sz = blockSizeFromVolume(b.volume);
          b.w = sz.w;
          b.h = sz.h;
          if (state.material !== 'custom') {
            const mat = DENSITY_MATERIALS[state.material] || DENSITY_MATERIALS.wood;
            state.customMass = Number((mat.density * state.customVolume).toFixed(2));
            b.mass = state.customMass;
          }
        }
        return;
      }
      state[key] = value;
    },

    update(state, dt) {
      const tankBottomY = DENSITY_TANK.y + DENSITY_TANK.h;
      const rhoFluid = clamp(state.fluidDensity, 0.5, 3.0);

      let displacedL = 0;
      for (let iter = 0; iter < 3; iter++) {
        const currentTotalL = DENSITY_TANK.baseVolumeL + displacedL;
        const waterDepthPx = volumeToTankHeightPx(currentTotalL);
        const waterSurfaceY = tankBottomY - waterDepthPx;

        let newDisplaced = 0;
        for (let i = 0; i < state.blocks.length; i++) {
          const b = state.blocks[i];
          const topY = b.y - b.h / 2;
          const botY = b.y + b.h / 2;
          const inHoriz = b.x > DENSITY_TANK.x + 15 && b.x < DENSITY_TANK.x + DENSITY_TANK.w - 15;
          if (inHoriz && botY > waterSurfaceY && topY < tankBottomY + 5) {
            const subPx = clamp(botY - Math.max(topY, waterSurfaceY), 0, b.h);
            const subFrac = clamp(subPx / (b.h || 1), 0, 1);
            b.submergedFraction = subFrac;
            b.submergedVolume = b.volume * subFrac;
            newDisplaced += b.submergedVolume;
          } else {
            b.submergedFraction = 0;
            b.submergedVolume = 0;
          }
        }
        displacedL = newDisplaced;
      }

      state.displacedVolume = displacedL;
      state.totalTankVolume = DENSITY_TANK.baseVolumeL + displacedL;
      const waterSurfaceY = tankBottomY - volumeToTankHeightPx(state.totalTankVolume);
      state.waterSurfaceY = waterSurfaceY;

      let scaleMass = 0;
      for (let i = 0; i < state.blocks.length; i++) {
        const b = state.blocks[i];
        const gravN = b.mass * G_ACCEL;
        const buoyN = rhoFluid * G_ACCEL * (b.submergedVolume || 0);
        b.gravityN = gravN;
        b.buoyancyN = buoyN;
        b.normalN = 0;

        if (state.draggingBlockId === b.id) {
          b.vy = 0;
          if (Math.abs(b.x - DENSITY_SCALE.x) < 58 && Math.abs((b.y + b.h / 2) - DENSITY_SCALE.y) < 18) {
            scaleMass += b.mass;
          }
          continue;
        }

        const inTankX = b.x >= DENSITY_TANK.x + b.w / 2 && b.x <= DENSITY_TANK.x + DENSITY_TANK.w - b.w / 2;
        if (inTankX && b.y + b.h / 2 >= DENSITY_TANK.y - 40) {
          b.inTank = true;
          b.onScale = false;

          const rhoBlock = b.mass / (b.volume || 1);
          const netForceN = gravN - buoyN;
          const accelPx = (netForceN / Math.max(0.4, b.mass)) * 38;
          b.vy += accelPx * dt;
          const damp = b.submergedFraction > 0 ? Math.exp(-8.5 * dt) : Math.exp(-1.5 * dt);
          b.vy *= damp;
          b.y += b.vy * dt;

          if (rhoBlock < rhoFluid) {
            const eqFrac = clamp(rhoBlock / rhoFluid, 0, 1);
            const eqCenterY = waterSurfaceY + (eqFrac - 0.5) * b.h;
            if (Math.abs(b.y - eqCenterY) < 6 && Math.abs(b.vy) < 18) {
              b.y = lerp(b.y, eqCenterY, 0.28);
              b.vy *= 0.5;
              b.submergedFraction = eqFrac;
              b.submergedVolume = b.volume * eqFrac;
              b.buoyancyN = gravN;
            }
          }

          if (b.y + b.h / 2 >= tankBottomY - 2) {
            b.y = tankBottomY - 2 - b.h / 2;
            b.vy = 0;
            if (gravN > b.buoyancyN) {
              b.normalN = gravN - b.buoyancyN;
            }
          }
        } else if (Math.abs(b.x - DENSITY_SCALE.x) <= 68 && b.y <= DENSITY_SCALE.y + 20) {
          b.inTank = false;
          b.onScale = true;
          const targetY = DENSITY_SCALE.y - b.h / 2;
          if (b.y < targetY) {
            b.vy += 450 * dt;
            b.y = Math.min(targetY, b.y + b.vy * dt);
          } else {
            b.y = targetY;
            b.vy = 0;
          }
          b.normalN = gravN;
          scaleMass += b.mass;
        } else {
          b.inTank = false;
          b.onScale = false;
          const benchY = 470 - b.h / 2;
          if (b.y < benchY) {
            b.vy += 450 * dt;
            b.y = Math.min(benchY, b.y + b.vy * dt);
          } else {
            b.y = benchY;
            b.vy = 0;
          }
          b.normalN = gravN;
        }
      }
      state.scaleReadingKg = scaleMass;
    },

    draw(ctx, state) {
      const ui = state.uiRegions;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 44, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('密度与阿基米德浮力实验 (Density)', 28, 32);

      const modeTabs = [
        { id: 'custom', label: '自定义物块' },
        { id: 'same-mass', label: '等质量 (5kg)' },
        { id: 'same-volume', label: '等体积 (5L)' },
        { id: 'same-density', label: '等密度 (0.8)' },
        { id: 'mystery', label: '神秘物块鉴定' }
      ];
      let tx = 315;
      modeTabs.forEach(tab => {
        const tw = tab.id === 'mystery' ? 112 : 104;
        drawCanvasButton(ctx, ui, {
          id: `mode_${tab.id}`,
          x: tx,
          y: 18,
          w: tw,
          h: 28,
          label: tab.label,
          active: state.mode === tab.id,
          onClick: () => this.onControlChange(state, 'mode', tab.id)
        });
        tx += tw + 8;
      });

      fillStrokeRoundRect(ctx, 14, 470, 615, 56, 8, '#cbd5e1', '#94a3b8', 1.5);
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('提示：可直接拖拽物块放入水箱、压入水底或放到左侧电子秤上，也可点击右侧快捷按钮移动物块', 28, 502);

      const sx = DENSITY_SCALE.x;
      const sy = DENSITY_SCALE.y;
      fillStrokeRoundRect(ctx, sx - 55, sy, 110, 8, 4, '#64748b', '#334155', 1.5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(sx - 10, sy + 8, 20, 14);
      fillStrokeRoundRect(ctx, sx - 64, sy + 20, 128, 40, 8, '#1e293b', '#0f172a', 1.8);
      fillStrokeRoundRect(ctx, sx - 52, sy + 26, 104, 24, 5, '#064e3b', '#10b981', 1.2);
      ctx.font = 'bold 14px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${state.scaleReadingKg.toFixed(2)} kg`, sx, sy + 38);
      ctx.font = '600 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('精密电子秤', sx, sy - 115);

      const tk = DENSITY_TANK;
      const tankBottomY = tk.y + tk.h;
      const waterSurfaceY = state.waterSurfaceY || (tankBottomY - volumeToTankHeightPx(state.totalTankVolume));

      fillStrokeRoundRect(ctx, tk.x, tk.y, tk.w, tk.h, 6, 'rgba(255,255,255,0.65)', '#64748b', 2.2);

      const waterH = clamp(tankBottomY - waterSurfaceY, 0, tk.h - 4);
      const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, tankBottomY);
      waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.48)');
      waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.68)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(tk.x + 2, waterSurfaceY, tk.w - 4, waterH);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tk.x + 2, waterSurfaceY);
      ctx.lineTo(tk.x + tk.w - 2, waterSurfaceY);
      ctx.stroke();

      ctx.save();
      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      for (let vTick = 90; vTick <= 130; vTick += 5) {
        const yTick = tankBottomY - volumeToTankHeightPx(vTick);
        if (yTick < tk.y + 8 || yTick > tankBottomY - 6) continue;
        const isMajor = vTick % 10 === 0;
        ctx.strokeStyle = vTick === 100 ? '#dc2626' : '#334155';
        ctx.lineWidth = isMajor ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(tk.x + tk.w - (isMajor ? 18 : 10), yTick);
        ctx.lineTo(tk.x + tk.w - 2, yTick);
        ctx.stroke();
        if (isMajor) {
          ctx.fillStyle = vTick === 100 ? '#dc2626' : '#1e293b';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${vTick.toFixed(1)} L`, tk.x + tk.w - 22, yTick);
        }
      }
      ctx.restore();

      const badgeY = clamp(waterSurfaceY, tk.y + 18, tankBottomY - 20);
      fillStrokeRoundRect(ctx, tk.x - 102, badgeY - 19, 98, 38, 6, '#0f172a', '#0284c7', 1.5);
      ctx.font = 'bold 12px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(`${state.totalTankVolume.toFixed(2)} L`, tk.x - 53, badgeY - 5);
      ctx.font = '600 10.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`ΔV = +${state.displacedVolume.toFixed(2)} L`, tk.x - 53, badgeY + 11);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tk.x - 4, badgeY);
      ctx.lineTo(tk.x + 6, waterSurfaceY);
      ctx.stroke();

      state.blocks.forEach(b => {
        const bx = b.x - b.w / 2;
        const by = b.y - b.h / 2;
        const isSelected = state.selectedBlockId === b.id;

        ctx.save();
        fillStrokeRoundRect(ctx, bx, by, b.w, b.h, 6, b.color, isSelected ? '#0f172a' : b.stroke, isSelected ? 2.8 : 1.8);

        ctx.fillStyle = b.textColor || '#ffffff';
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.id === 'B1' ? b.label : b.id, b.x, b.y - 8);

        ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        if (b.mystery && !state.revealMystery) {
          ctx.fillText('? kg', b.x, b.y + 8);
        } else {
          ctx.fillText(`${b.mass.toFixed(2)} kg`, b.x, b.y + 8);
        }
        ctx.restore();

        if (state.showVectors) {
          const scalePxPerN = 1.65;
          const gLen = clamp((b.gravityN || 0) * scalePxPerN, 14, 105);
          drawVectorArrow(ctx, b.x - 6, b.y, b.x - 6, b.y + gLen, '#dc2626', `G=${(b.gravityN || 0).toFixed(1)}N`, 'left');

          if ((b.buoyancyN || 0) > 0.2) {
            const fLen = clamp(b.buoyancyN * scalePxPerN, 14, 105);
            drawVectorArrow(ctx, b.x + 6, b.y, b.x + 6, b.y - fLen, '#16a34a', `F浮=${b.buoyancyN.toFixed(1)}N`, 'right');
          }
          if ((b.normalN || 0) > 0.2 && b.inTank) {
            const nLen = clamp(b.normalN * scalePxPerN, 12, 85);
            drawVectorArrow(ctx, b.x + 16, b.y, b.x + 16, b.y - nLen, '#9333ea', `FN=${b.normalN.toFixed(1)}N`, 'right');
          }
        }
      });

      ctx.save();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
      ctx.fillRect(tk.x + 2, waterSurfaceY, tk.w - 4, waterH);
      ctx.restore();

      const px = 626;
      const py = 64;
      const pw = 260;
      const ph = 462;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);

      let cy = py + 22;
      ctx.font = 'bold 13px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(state.mode === 'custom' ? '自定义物块参数' : '当前选中物块与控制', px + 14, cy);
      cy += 16;

      if (state.mode === 'custom') {
        const presets = [
          { id: 'wood', label: '木头 0.40' },
          { id: 'ice', label: '冰 0.92' },
          { id: 'brick', label: '砖块 2.00' },
          { id: 'aluminum', label: '铝 2.70' },
          { id: 'gold', label: '金 19.3' },
          { id: 'custom', label: '自由调节' }
        ];
        presets.forEach((p, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          drawCanvasButton(ctx, ui, {
            id: `mat_${p.id}`,
            x: px + 14 + col * 79,
            y: cy + row * 28,
            w: 74,
            h: 24,
            fontSize: 10.5,
            label: p.label,
            active: state.material === p.id,
            onClick: () => this.onControlChange(state, 'material', p.id)
          });
        });
        cy += 74;

        const b = state.blocks[0];
        drawCanvasSlider(ctx, ui, {
          id: 'slider_mass',
          x: px + 14,
          y: cy,
          w: pw - 28,
          label: '质量 m',
          value: b ? b.mass : state.customMass,
          min: 0.5,
          max: state.material === 'gold' ? 100.0 : 20.0,
          step: 0.1,
          unit: 'kg',
          color: '#2563eb',
          onChange: (val) => this.onControlChange(state, 'customMass', val)
        });
        cy += 42;

        drawCanvasSlider(ctx, ui, {
          id: 'slider_vol',
          x: px + 14,
          y: cy,
          w: pw - 28,
          label: '体积 V',
          value: b ? b.volume : state.customVolume,
          min: 1.0,
          max: 10.0,
          step: 0.1,
          unit: 'L',
          color: '#0891b2',
          onChange: (val) => this.onControlChange(state, 'customVolume', val)
        });
        cy += 38;
      } else {
        state.blocks.forEach((b, idx) => {
          drawCanvasButton(ctx, ui, {
            id: `sel_${b.id}`,
            x: px + 14 + idx * 47,
            y: cy,
            w: 43,
            h: 26,
            label: b.id,
            active: state.selectedBlockId === b.id,
            activeBg: b.stroke || '#2563eb',
            onClick: () => { state.selectedBlockId = b.id; }
          });
        });
        cy += 36;
      }

      const selBlock = state.blocks.find(b => b.id === state.selectedBlockId) || state.blocks[0];
      if (selBlock) {
        drawCanvasButton(ctx, ui, {
          id: 'btn_to_water',
          x: px + 14,
          y: cy,
          w: 112,
          h: 26,
          label: '放入水箱测 ΔV',
          active: selBlock.inTank,
          activeBg: '#0284c7',
          onClick: () => {
            selBlock.inTank = true;
            selBlock.onScale = false;
            selBlock.x = DENSITY_TANK.x + DENSITY_TANK.w * 0.5;
            selBlock.y = 225;
            selBlock.vy = 0;
          }
        });
        drawCanvasButton(ctx, ui, {
          id: 'btn_to_scale',
          x: px + 134,
          y: cy,
          w: 112,
          h: 26,
          label: '放上电子秤测 m',
          active: selBlock.onScale,
          activeBg: '#059669',
          onClick: () => {
            state.blocks.forEach(other => {
              if (other.id !== selBlock.id && other.onScale) {
                other.onScale = false;
                other.inTank = true;
                other.x = DENSITY_TANK.x + 90 + Math.random() * 180;
                other.y = 240;
              }
            });
            selBlock.inTank = false;
            selBlock.onScale = true;
            selBlock.x = DENSITY_SCALE.x;
            selBlock.y = DENSITY_SCALE.y - selBlock.h / 2;
            selBlock.vy = 0;
          }
        });
        cy += 42;
      }

      drawCanvasSlider(ctx, ui, {
        id: 'slider_fluid_rho',
        x: px + 14,
        y: cy,
        w: pw - 28,
        label: '液体密度 ρ_液',
        value: state.fluidDensity,
        min: 0.70,
        max: 2.00,
        step: 0.05,
        unit: 'kg/L',
        color: '#0284c7',
        onChange: (val) => { state.fluidDensity = val; }
      });
      cy += 32;

      drawCanvasCheckbox(ctx, ui, {
        id: 'chk_vectors',
        x: px + 14,
        y: cy,
        label: '显示浮力 F_浮 / 重力 G 矢量',
        checked: state.showVectors,
        onChange: (v) => { state.showVectors = v; }
      });
      cy += 24;

      if (state.mode === 'mystery') {
        drawCanvasCheckbox(ctx, ui, {
          id: 'chk_reveal',
          x: px + 14,
          y: cy,
          label: '揭晓神秘物块真实材质与密度',
          checked: state.revealMystery,
          color: '#d97706',
          onChange: (v) => { state.revealMystery = v; }
        });
        cy += 24;
      }

      if (state.mode === 'mystery') {
        fillStrokeRoundRect(ctx, px + 12, cy, pw - 24, ph - (cy - py) - 12, 8, '#f8fafc', '#cbd5e1', 1);
        ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.fillText('密度参考鉴定表 (ρ = m / ΔV)', px + 20, cy + 16);

        ctx.font = '10.5px "Inter", "PingFang SC", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        MYSTERY_REFERENCE_TABLE.forEach((row, idx) => {
          const ry = cy + 33 + idx * 16.5;
          if (ry < py + ph - 18) {
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'left';
            ctx.fillText(row.name, px + 20, ry);
            ctx.fillStyle = '#0284c7';
            ctx.textAlign = 'right';
            ctx.fillText(`${row.density.toFixed(2)} kg/L`, px + pw - 20, ry);
          }
        });
        if (state.revealMystery && selBlock) {
          ctx.font = 'bold 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#b45309';
          ctx.textAlign = 'left';
          ctx.fillText(`当前 ${selBlock.id}: ${selBlock.trueName}`, px + 20, py + ph - 18);
        }
      } else if (selBlock) {
        const rhoB = selBlock.mass / (selBlock.volume || 1);
        const isFloating = rhoB < state.fluidDensity;
        fillStrokeRoundRect(ctx, px + 12, cy, pw - 24, ph - (cy - py) - 12, 8, '#f0f9ff', '#bae6fd', 1.2);
        let ty = cy + 18;
        ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#0369a1';
        ctx.textAlign = 'left';
        ctx.fillText(`物块 [${selBlock.id}] 实时阿基米德分析`, px + 20, ty);
        ty += 19;

        ctx.font = '11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        const lines = [
          `物块密度: ρ_物 = m/V = ${rhoB.toFixed(2)} kg/L`,
          `排开水体积: V_排 = ${(selBlock.submergedVolume || 0).toFixed(2)} L (${((selBlock.submergedFraction || 0) * 100).toFixed(0)}%)`,
          `重力: G = mg = ${(selBlock.gravityN || 0).toFixed(1)} N`,
          `浮力: F_浮 = ρ_液gV_排 = ${(selBlock.buoyancyN || 0).toFixed(1)} N`,
          `状态: ${selBlock.inTank ? (isFloating ? '漂浮 (ρ_物 < ρ_液, F_浮 = G)' : '下沉触底 (ρ_物 > ρ_液, F_浮 < G)') : '位于水箱外'}`
        ];
        lines.forEach(line => {
          if (ty < py + ph - 14) {
            ctx.fillText(line, px + 20, ty);
            ty += 17.5;
          }
        });
      }
    },

    onPointerDown(state, x, y) {
      for (let i = state.blocks.length - 1; i >= 0; i--) {
        const b = state.blocks[i];
        if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2) {
          state.selectedBlockId = b.id;
          state.draggingBlockId = b.id;
          state.dragOffsetX = x - b.x;
          state.dragOffsetY = y - b.y;
          return;
        }
      }
    },

    onPointerMove(state, x, y) {
      if (!state.draggingBlockId) return;
      const b = state.blocks.find(item => item.id === state.draggingBlockId);
      if (!b) return;
      b.x = clamp(x - state.dragOffsetX, 45, 600);
      b.y = clamp(y - state.dragOffsetY, 90, DENSITY_TANK.y + DENSITY_TANK.h - b.h / 2 - 2);
      b.vy = 0;
    },

    onPointerUp(state) {
      state.draggingBlockId = null;
    }
  });

  window.registerSim('density', densitySim);

  // ============================================================================
  // 2. 'energy-forms-and-changes' (能量形式与转化)
  // ============================================================================

  const SPECIFIC_HEAT_ITEMS = {
    iron:  { id: 'iron',  name: '铁块 (Iron)',   cp: 450,  mass: 1.0, baseE: 6,  color: '#64748b', stroke: '#334155', isLiquid: false },
    brick: { id: 'brick', name: '砖块 (Brick)',  cp: 840,  mass: 1.0, baseE: 8,  color: '#dc2626', stroke: '#991b1b', isLiquid: false },
    water: { id: 'water', name: '水 (Water)',    cp: 4184, mass: 1.0, baseE: 18, color: '#38bdf8', stroke: '#0284c7', isLiquid: true },
    oil:   { id: 'oil',   name: '橄榄油 (Oil)',  cp: 1970, mass: 1.0, baseE: 12, color: '#eab308', stroke: '#a16207', isLiquid: true }
  };

  const ENERGY_TYPES = {
    mechanical: { id: 'mechanical', name: '机械能', color: '#e2e8f0', border: '#475569', text: '#0f172a' },
    electrical: { id: 'electrical', name: '电能',   color: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
    thermal:    { id: 'thermal',    name: '热能',   color: '#ef4444', border: '#991b1b', text: '#ffffff' },
    light:      { id: 'light',      name: '光能',   color: '#facc15', border: '#a16207', text: '#0f172a' },
    chemical:   { id: 'chemical',   name: '化学能', color: '#22c55e', border: '#15803d', text: '#ffffff' }
  };

  const energyFormsSim = createUniversalSim({
    id: 'energy-forms-and-changes',
    title: '能量形式与转化 (Energy Forms and Changes)',
    subtitle: '比热容实验室 (E能量方块) 与 能源→转换器→用电器 能量粒子流',
    modes: [
      { id: 'intro',   label: '比热容实验室 (Intro)' },
      { id: 'systems', label: '能量系统链 (Systems)' }
    ],
    controls: [
      { id: 'mode', type: 'select', label: '实验模式', value: 'intro', options: [
        { value: 'intro', label: '比热容实验室 (Intro)' },
        { value: 'systems', label: '能量系统链 (Systems)' }
      ]},
      { id: 'showEnergySymbols', type: 'checkbox', label: '显示能量符号 (E 方块)', value: true },
      { id: 'linkHeaters', type: 'checkbox', label: '同步左右加热器', value: false },
      { id: 'heater1', type: 'slider', label: '左台功率 (冷却/加热)', min: -1, max: 1, step: 0.05, value: 0 },
      { id: 'heater2', type: 'slider', label: '右台功率 (冷却/加热)', min: -1, max: 1, step: 0.05, value: 0 }
    ],

    createState() {
      return {
        mode: 'intro',
        showEnergySymbols: true,
        linkHeaters: true,
        heater1: 0.0,
        heater2: 0.0,
        leftSlot: 'iron',
        rightSlot: 'water',
        items: {
          iron:  { tempC: 20.0, energyJ: 0 },
          brick: { tempC: 20.0, energyJ: 0 },
          water: { tempC: 20.0, energyJ: 0 },
          oil:   { tempC: 20.0, energyJ: 0 }
        },
        transferParticles: [],
        sourceType: 'biker',
        converterType: 'generator',
        outputType: 'incandescent',
        sourceIntensity: 0.75,
        cloudCover: 0.0,
        bikerEnergy: 100.0,
        wheelAngle: 0,
        fanAngle: 0,
        systemWaterTempC: 22.0,
        streamParticles: [],
        spawnTimer: 0,
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'heater1') {
        state.heater1 = clamp(value, -1, 1);
        if (state.linkHeaters) state.heater2 = state.heater1;
        return;
      }
      if (key === 'heater2') {
        state.heater2 = clamp(value, -1, 1);
        if (state.linkHeaters) state.heater1 = state.heater2;
        return;
      }
      state[key] = value;
    },

    update(state, dt) {
      if (state.mode === 'intro') {
        const slots = [
          { itemId: state.leftSlot, power: state.heater1, standX: 215 },
          { itemId: state.rightSlot, power: state.heater2, standX: 465 }
        ];

        slots.forEach(s => {
          const spec = SPECIFIC_HEAT_ITEMS[s.itemId];
          const stItem = state.items[s.itemId];
          if (!spec || !stItem) return;

          const qDot = s.power * 26000;
          const ambientQ = (20.0 - stItem.tempC) * 85;
          const dT = ((qDot + ambientQ) * dt) / (spec.mass * spec.cp);
          stItem.tempC = clamp(stItem.tempC + dT, -20, spec.id === 'water' ? 100 : (spec.id === 'oil' ? 240 : 320));
          stItem.energyJ = (stItem.tempC - 20.0) * spec.mass * spec.cp;

          if (Math.abs(s.power) > 0.12 && Math.random() < Math.abs(s.power) * 5.5 * dt) {
            state.transferParticles.push({
              x: s.standX + (Math.random() - 0.5) * 54,
              y: s.power > 0 ? 375 : 275,
              vy: s.power > 0 ? -75 : 75,
              alpha: 1.0,
              type: 'thermal'
            });
          }
        });

        for (let i = state.transferParticles.length - 1; i >= 0; i--) {
          const p = state.transferParticles[i];
          p.y += p.vy * dt;
          p.alpha -= 0.95 * dt;
          if (p.alpha <= 0 || p.y < 170 || p.y > 410) {
            state.transferParticles.splice(i, 1);
          }
        }
      } else {
        let effectiveInput = state.sourceIntensity;
        if (state.sourceType === 'biker') {
          if (state.bikerEnergy <= 2) {
            effectiveInput = 0;
          } else {
            state.bikerEnergy = clamp(state.bikerEnergy - effectiveInput * 4.2 * dt, 0, 100);
          }
        }

        const isLightSource = state.sourceType === 'sun';
        const isSolarPanel = state.converterType === 'solar';
        let converterEff = 0;
        if (isLightSource && isSolarPanel) {
          converterEff = effectiveInput * (1 - state.cloudCover * 0.85);
        } else if (!isLightSource && !isSolarPanel) {
          converterEff = effectiveInput;
        }

        state.wheelAngle = (state.wheelAngle + (isSolarPanel ? 0 : converterEff * 5.2 * dt)) % (Math.PI * 2);
        if (state.outputType === 'fan') {
          state.fanAngle = (state.fanAngle + converterEff * 9.0 * dt) % (Math.PI * 2);
        }
        if (state.outputType === 'heater') {
          state.systemWaterTempC = clamp(state.systemWaterTempC + (converterEff * 8.5 - 0.6) * dt, 20, 100);
        } else {
          state.systemWaterTempC = lerp(state.systemWaterTempC, 22.0, dt * 0.5);
        }

        state.spawnTimer += dt * Math.max(0.15, effectiveInput);
        if (effectiveInput > 0.05 && state.spawnTimer >= 0.26) {
          state.spawnTimer = 0;
          let stage1Type = 'mechanical';
          if (state.sourceType === 'sun') stage1Type = 'light';
          if (state.sourceType === 'biker') stage1Type = Math.random() < 0.22 ? 'thermal' : 'mechanical';
          if (state.sourceType === 'kettle') stage1Type = Math.random() < 0.35 ? 'thermal' : 'mechanical';

          state.streamParticles.push({
            t: 0.0,
            stage1Type,
            compatible: converterEff > 0.05,
            outType: state.outputType,
            yJitter: (Math.random() - 0.5) * 18
          });
        }

        for (let i = state.streamParticles.length - 1; i >= 0; i--) {
          const p = state.streamParticles[i];
          p.t += dt * 0.48;
          if (!p.compatible && p.t > 0.46) {
            if (p.t > 0.72) state.streamParticles.splice(i, 1);
          } else if (p.t >= 1.0) {
            state.streamParticles.splice(i, 1);
          }
        }
      }
    },

    draw(ctx, state) {
      const ui = state.uiRegions;

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 44, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('能量形式与转化 (Energy Forms & Changes)', 28, 32);

      drawCanvasButton(ctx, ui, {
        id: 'mode_intro',
        x: 380,
        y: 18,
        w: 175,
        h: 28,
        label: '比热容实验室 (Intro)',
        active: state.mode === 'intro',
        onClick: () => { state.mode = 'intro'; }
      });
      drawCanvasButton(ctx, ui, {
        id: 'mode_systems',
        x: 565,
        y: 18,
        w: 175,
        h: 28,
        label: '能量系统链 (Systems)',
        active: state.mode === 'systems',
        onClick: () => { state.mode = 'systems'; }
      });
      drawCanvasCheckbox(ctx, ui, {
        id: 'chk_esymbols',
        x: 752,
        y: 24,
        label: 'E 能量方块',
        checked: state.showEnergySymbols,
        onChange: (v) => { state.showEnergySymbols = v; }
      });

      if (state.mode === 'intro') {
        this._drawIntroMode(ctx, state, ui);
      } else {
        this._drawSystemsMode(ctx, state, ui);
      }
    },

    _drawIntroMode(ctx, state, ui) {
      const stands = [
        { id: 1, x: 215, power: state.heater1, itemKey: state.leftSlot, title: '左实验台 (Stand 1)' },
        { id: 2, x: 465, power: state.heater2, itemKey: state.rightSlot, title: '右实验台 (Stand 2)' }
      ];

      stands.forEach(st => {
        const sx = st.x;
        const sy = 340;
        const spec = SPECIFIC_HEAT_ITEMS[st.itemKey];
        const itemState = state.items[st.itemKey];

        fillStrokeRoundRect(ctx, sx - 62, sy, 124, 10, 4, '#334155', '#0f172a', 1.5);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx - 52, sy + 10, 8, 95);
        ctx.fillRect(sx + 44, sy + 10, 8, 95);
        fillStrokeRoundRect(ctx, sx - 42, sy + 42, 84, 58, 8, '#cbd5e1', '#64748b', 1.5);

        if (st.power > 0.05) {
          const fh = 12 + st.power * 34;
          const flameGrad = ctx.createLinearGradient(0, sy + 42, 0, sy + 42 - fh);
          flameGrad.addColorStop(0, '#ef4444');
          flameGrad.addColorStop(0.6, '#f97316');
          flameGrad.addColorStop(1, '#fde047');
          ctx.fillStyle = flameGrad;
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(sx + k * 16 - 10, sy + 42);
            ctx.quadraticCurveTo(sx + k * 16, sy + 42 - fh * 1.2, sx + k * 16 + 10, sy + 42);
            ctx.fill();
          }
        } else if (st.power < -0.05) {
          const ih = 10 + Math.abs(st.power) * 28;
          for (let k = -1; k <= 1; k++) {
            fillStrokeRoundRect(ctx, sx + k * 18 - 9, sy + 42 - ih, 18, ih, 4, 'rgba(125,211,252,0.88)', '#0284c7', 1.2);
          }
        }

        const objW = spec.isLiquid ? 102 : 88;
        const objH = spec.isLiquid ? 112 : 84;
        const objX = sx - objW / 2;
        const objY = sy - objH;

        if (spec.isLiquid) {
          fillStrokeRoundRect(ctx, objX, objY, objW, objH, 6, 'rgba(255,255,255,0.75)', '#64748b', 2);
          fillStrokeRoundRect(ctx, objX + 4, objY + 22, objW - 8, objH - 26, 4, rgbaStr(spec.color, 0.65), spec.stroke, 1);
          if (itemState.tempC >= 98) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
            ctx.font = 'bold 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('♨ 沸腾蒸汽 (100°C)', sx, objY - 10);
          }
        } else {
          fillStrokeRoundRect(ctx, objX, objY, objW, objH, 6, spec.color, spec.stroke, 2.2);
        }

        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = spec.isLiquid ? '#0f172a' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(spec.name, sx, objY + objH - 12);

        if (state.showEnergySymbols) {
          const eCount = clamp(Math.round(spec.baseE + (itemState.tempC - 20) * (spec.cp / 450) * 0.14), 1, 28);
          const cols = 4;
          for (let idx = 0; idx < eCount; idx++) {
            const c = idx % cols;
            const r = Math.floor(idx / cols);
            const ex = objX + 12 + c * 18;
            const ey = objY + objH - 36 - r * 14;
            if (ey > objY + 6) {
              fillStrokeRoundRect(ctx, ex, ey, 14, 12, 2.5, '#ef4444', '#ffffff', 1);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8.5px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('E', ex + 7, ey + 6.5);
            }
          }
        }

        const thX = objX - 18;
        const thY = objY + 6;
        const thH = 86;
        fillStrokeRoundRect(ctx, thX - 4, thY, 8, thH, 4, '#ffffff', '#64748b', 1.2);
        const frac = clamp((itemState.tempC + 20) / 260, 0.06, 1);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(thX - 2, thY + thH * (1 - frac), 4, thH * frac);
        ctx.beginPath();
        ctx.arc(thX, thY + thH + 4, 6.5, 0, Math.PI * 2);
        ctx.fill();

        fillStrokeRoundRect(ctx, sx - 58, objY - 38, 116, 26, 6, '#0f172a', '#334155', 1.2);
        ctx.font = 'bold 12px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${itemState.tempC.toFixed(1)} °C (${(itemState.tempC + 273.15).toFixed(0)} K)`, sx, objY - 25);

        drawCanvasSlider(ctx, ui, {
          id: `slider_heater_${st.id}`,
          x: sx - 72,
          y: 472,
          w: 144,
          label: `${st.title} 功率`,
          value: st.power,
          min: -1.0,
          max: 1.0,
          step: 0.05,
          color: st.power > 0 ? '#ef4444' : (st.power < 0 ? '#0284c7' : '#64748b'),
          formatVal: (v) => v > 0.05 ? `🔥 加热 +${(v * 100).toFixed(0)}%` : (v < -0.05 ? `❄️ 冷却 ${(v * 100).toFixed(0)}%` : '关闭 (0)'),
          onChange: (val) => this.onControlChange(state, st.id === 1 ? 'heater1' : 'heater2', val)
        });
      });

      if (state.showEnergySymbols) {
        state.transferParticles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = clamp(p.alpha, 0, 1);
          fillStrokeRoundRect(ctx, p.x - 8, p.y - 7, 16, 14, 3, '#f97316', '#ffffff', 1);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('E', p.x, p.y);
          ctx.restore();
        });
      }

      const px = 612, py = 64, pw = 274, ph = 460;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);
      let cy = py + 22;
      ctx.font = 'bold 13px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('比热容对比实验控制', px + 14, cy);
      cy += 18;

      ctx.font = '600 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('选择左实验台物质 (Stand 1):', px + 14, cy);
      cy += 10;
      const itemKeys = ['iron', 'brick', 'water', 'oil'];
      itemKeys.forEach((k, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const sp = SPECIFIC_HEAT_ITEMS[k];
        drawCanvasButton(ctx, ui, {
          id: `left_${k}`,
          x: px + 14 + col * 124,
          y: cy + row * 28,
          w: 118,
          h: 24,
          fontSize: 10.5,
          label: sp.name,
          active: state.leftSlot === k,
          onClick: () => { state.leftSlot = k; }
        });
      });
      cy += 68;

      ctx.fillStyle = '#475569';
      ctx.fillText('选择右实验台物质 (Stand 2):', px + 14, cy);
      cy += 10;
      itemKeys.forEach((k, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const sp = SPECIFIC_HEAT_ITEMS[k];
        drawCanvasButton(ctx, ui, {
          id: `right_${k}`,
          x: px + 14 + col * 124,
          y: cy + row * 28,
          w: 118,
          h: 24,
          fontSize: 10.5,
          label: sp.name,
          active: state.rightSlot === k,
          onClick: () => { state.rightSlot = k; }
        });
      });
      cy += 66;

      drawCanvasCheckbox(ctx, ui, {
        id: 'chk_link_heaters',
        x: px + 14,
        y: cy,
        label: '同步左右加热器功率 (Link Heaters)',
        checked: state.linkHeaters,
        onChange: (v) => {
          state.linkHeaters = v;
          if (v) state.heater2 = state.heater1;
        }
      });
      cy += 26;

      drawCanvasButton(ctx, ui, {
        id: 'btn_reset_temps',
        x: px + 14,
        y: cy,
        w: pw - 28,
        h: 26,
        label: '重置所有物质温度至 20.0 °C',
        bg: '#eff6ff',
        fg: '#1d4ed8',
        border: '#93c5fd',
        onClick: () => {
          Object.keys(state.items).forEach(k => {
            state.items[k].tempC = 20.0;
            state.items[k].energyJ = 0;
          });
          state.heater1 = 0;
          state.heater2 = 0;
        }
      });
      cy += 36;

      fillStrokeRoundRect(ctx, px + 12, cy, pw - 24, ph - (cy - py) - 12, 8, '#f8fafc', '#cbd5e1', 1);
      ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('比热容参数表 (Q = c · m · ΔT)', px + 20, cy + 18);

      itemKeys.forEach((k, idx) => {
        const sp = SPECIFIC_HEAT_ITEMS[k];
        const stI = state.items[k];
        const ry = cy + 38 + idx * 24;
        ctx.font = '600 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText(`${sp.name}: c=${sp.cp} J/(kg·K)`, px + 20, ry);
        ctx.fillStyle = '#0284c7';
        ctx.textAlign = 'right';
        ctx.fillText(`${stI.tempC.toFixed(1)}°C`, px + pw - 20, ry);
      });
    },

    _drawSystemsMode(ctx, state, ui) {
      const stageBoxes = [
        { title: '① 能源 (Source)', x: 30, y: 120, w: 175, h: 225 },
        { title: '② 转换器 (Converter)', x: 240, y: 120, w: 175, h: 225 },
        { title: '③ 用电器 (Output)', x: 450, y: 120, w: 175, h: 225 }
      ];

      stageBoxes.forEach(b => {
        fillStrokeRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#ffffff', '#cbd5e1', 1.5);
        ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(b.title, b.x + b.w / 2, b.y + 22);
      });

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(205, 240);
      ctx.lineTo(240, 240);
      ctx.moveTo(415, 240);
      ctx.lineTo(450, 240);
      ctx.stroke();

      const sx = 117, sy = 235;
      if (state.sourceType === 'biker') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy + 18, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('🚴 骑车人 (化学能→机械能)', sx, sy - 42);
        fillStrokeRoundRect(ctx, sx - 55, sy + 58, 110, 12, 4, '#e2e8f0', '#94a3b8', 1);
        fillStrokeRoundRect(ctx, sx - 55, sy + 58, 1.1 * state.bikerEnergy, 12, 4, '#22c55e', null, 0);
        drawCanvasButton(ctx, ui, {
          id: 'btn_feed_biker',
          x: sx - 45,
          y: sy + 76,
          w: 90,
          h: 22,
          fontSize: 10.5,
          label: '🍎 补充食物能量',
          active: state.bikerEnergy < 35,
          activeBg: '#16a34a',
          onClick: () => { state.bikerEnergy = 100; }
        });
      } else if (state.sourceType === 'faucet') {
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚰 水龙头水流 (机械能)', sx, sy - 42);
        fillStrokeRoundRect(ctx, sx - 35, sy - 20, 45, 16, 4, '#64748b', '#334155', 1.5);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.fillRect(sx - 6, sy - 4, 14 + state.sourceIntensity * 10, 82);
      } else if (state.sourceType === 'sun') {
        ctx.fillStyle = '#ca8a04';
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☀️ 太阳辐射 (光能)', sx, sy - 42);
        ctx.beginPath();
        ctx.arc(sx, sy + 10, 32, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (state.sourceType === 'kettle') {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🫖 蒸汽茶壶 (热能→机械能)', sx, sy - 42);
        fillStrokeRoundRect(ctx, sx - 34, sy - 5, 68, 52, 12, '#ef4444', '#991b1b', 2);
        ctx.fillStyle = '#fde047';
        ctx.fillText('🔥 加热产生高压蒸汽', sx, sy + 68);
      }

      const cx = 327, cy = 235;
      if (state.converterType === 'generator') {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('⚙️ 电磁发电机 (机械→电)', cx, cy - 42);
        ctx.save();
        ctx.translate(cx, cy + 12);
        ctx.rotate(state.wheelAngle);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-34, 0);
          ctx.lineTo(34, 0);
          ctx.stroke();
        }
        ctx.restore();
        if (state.sourceType === 'sun') {
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 10.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('⚠ 太阳光无法直接驱动水轮!', cx, cy + 75);
        }
      } else {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('🟦 光伏太阳能板 (光→电)', cx, cy - 42);
        fillStrokeRoundRect(ctx, cx - 48, cy - 10, 96, 52, 6, '#1e3a8a', '#3b82f6', 2);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 10); ctx.lineTo(cx - 16, cy + 42);
        ctx.moveTo(cx + 16, cy - 10); ctx.lineTo(cx + 16, cy + 42);
        ctx.moveTo(cx - 48, cy + 16); ctx.lineTo(cx + 48, cy + 16);
        ctx.stroke();
        if (state.sourceType !== 'sun') {
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 10.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('⚠ 光伏板需要太阳光能输入!', cx, cy + 75);
        }
      }

      const ox = 537, oy = 235;
      if (state.outputType === 'heater') {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('🌡️ 电热烧水器 (电→热能)', ox, oy - 42);
        fillStrokeRoundRect(ctx, ox - 38, oy - 16, 76, 72, 6, 'rgba(56,189,248,0.55)', '#0284c7', 2);
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 12px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.fillText(`${state.systemWaterTempC.toFixed(1)} °C`, ox, oy + 76);
      } else if (state.outputType === 'incandescent') {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('💡 白炽灯 (电→光+大量热)', ox, oy - 42);
        ctx.beginPath();
        ctx.arc(ox, oy + 8, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (state.outputType === 'fluorescent') {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('💡 节能荧光灯 (电→高光+少热)', ox, oy - 42);
        fillStrokeRoundRect(ctx, ox - 24, oy - 18, 48, 56, 12, '#fef08a', '#eab308', 2);
      } else {
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText('🌀 涡轮风扇 (电→机械风能)', ox, oy - 42);
        ctx.save();
        ctx.translate(ox, oy + 12);
        ctx.rotate(state.fanAngle);
        ctx.fillStyle = '#0284c7';
        for (let k = 0; k < 3; k++) {
          ctx.rotate((Math.PI * 2) / 3);
          fillStrokeRoundRect(ctx, -6, -34, 12, 30, 5, '#38bdf8', '#0284c7', 1.5);
        }
        ctx.restore();
      }

      if (state.showEnergySymbols) {
        state.streamParticles.forEach(p => {
          let pxPos = 0, pyPos = 240 + p.yJitter;
          let eType = p.stage1Type;

          if (p.t < 0.42) {
            const u = p.t / 0.42;
            pxPos = lerp(117, 327, u);
            if (state.sourceType === 'biker' && u < 0.28) eType = 'chemical';
          } else if (p.t < 0.76) {
            const u = (p.t - 0.42) / 0.34;
            pxPos = lerp(327, 537, u);
            eType = 'electrical';
          } else {
            const u = (p.t - 0.76) / 0.24;
            pxPos = lerp(537, 610, u);
            pyPos = lerp(240 + p.yJitter, 160 + p.yJitter * 2, u);
            if (p.outType === 'heater') eType = 'thermal';
            else if (p.outType === 'fan') eType = 'mechanical';
            else if (p.outType === 'incandescent') eType = (Math.abs(p.yJitter) > 4) ? 'thermal' : 'light';
            else eType = (Math.abs(p.yJitter) > 7.5) ? 'thermal' : 'light';
          }

          const spec = ENERGY_TYPES[eType] || ENERGY_TYPES.mechanical;
          fillStrokeRoundRect(ctx, pxPos - 9, pyPos - 9, 18, 18, 4, spec.color, spec.border, 1.5);
          ctx.fillStyle = spec.text;
          ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('E', pxPos, pyPos);
        });
      }

      fillStrokeRoundRect(ctx, 30, 365, 595, 155, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('五种能量粒子图例 (Energy Forms Legend):', 44, 386);
      Object.values(ENERGY_TYPES).forEach((et, idx) => {
        const lx = 44 + idx * 112;
        const ly = 400;
        fillStrokeRoundRect(ctx, lx, ly, 18, 18, 4, et.color, et.border, 1.5);
        ctx.fillStyle = et.text;
        ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', lx + 9, ly + 9);
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(et.name, lx + 24, ly + 9.5);
      });

      drawCanvasSlider(ctx, ui, {
        id: 'slider_source_intensity',
        x: 44,
        y: 452,
        w: 255,
        label: '能源输出强度 (Source Rate)',
        value: state.sourceIntensity,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        unit: '',
        color: '#2563eb',
        formatVal: (v) => `${(v * 100).toFixed(0)}%`,
        onChange: (val) => { state.sourceIntensity = val; }
      });

      if (state.sourceType === 'sun') {
        drawCanvasSlider(ctx, ui, {
          id: 'slider_cloud',
          x: 335,
          y: 452,
          w: 255,
          label: '云层遮挡度 (Cloud Cover)',
          value: state.cloudCover,
          min: 0.0,
          max: 1.0,
          step: 0.05,
          color: '#64748b',
          formatVal: (v) => `${(v * 100).toFixed(0)}%`,
          onChange: (val) => { state.cloudCover = val; }
        });
      }

      const px = 640, py = 64, pw = 246, ph = 456;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);
      let ry = py + 22;
      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('① 选择能源 (Energy Source)', px + 14, ry);
      ry += 12;
      const sources = [
        { id: 'biker', label: '🚴 骑车人' },
        { id: 'faucet', label: '🚰 水龙头' },
        { id: 'sun', label: '☀️ 太阳' },
        { id: 'kettle', label: '🫖 蒸汽壶' }
      ];
      sources.forEach((s, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        drawCanvasButton(ctx, ui, {
          id: `src_${s.id}`,
          x: px + 14 + col * 112,
          y: ry + row * 30,
          w: 106,
          h: 26,
          label: s.label,
          active: state.sourceType === s.id,
          onClick: () => { state.sourceType = s.id; }
        });
      });
      ry += 76;

      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('② 选择转换器 (Converter)', px + 14, ry);
      ry += 12;
      const converters = [
        { id: 'generator', label: '⚙️ 发电机' },
        { id: 'solar', label: '🟦 太阳能板' }
      ];
      converters.forEach((c, i) => {
        drawCanvasButton(ctx, ui, {
          id: `conv_${c.id}`,
          x: px + 14 + i * 112,
          y: ry,
          w: 106,
          h: 26,
          label: c.label,
          active: state.converterType === c.id,
          onClick: () => { state.converterType = c.id; }
        });
      });
      ry += 48;

      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('③ 选择用电器 (Output)', px + 14, ry);
      ry += 12;
      const outputs = [
        { id: 'heater', label: '🌡️ 烧水器' },
        { id: 'incandescent', label: '💡 白炽灯' },
        { id: 'fluorescent', label: '💡 节能灯' },
        { id: 'fan', label: '🌀 涡轮风扇' }
      ];
      outputs.forEach((o, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        drawCanvasButton(ctx, ui, {
          id: `out_${o.id}`,
          x: px + 14 + col * 112,
          y: ry + row * 30,
          w: 106,
          h: 26,
          label: o.label,
          active: state.outputType === o.id,
          onClick: () => { state.outputType = o.id; }
        });
      });
    }
  });

  window.registerSim('energy-forms-and-changes', energyFormsSim);

  // ============================================================================
  // SHARED SOLUTE DATABASE FOR 'concentration', 'molarity', and 'beers-law-lab'
  // ============================================================================

  const SOLUTES_DB = [
    {
      id: 'drink-mix',
      formula: 'Drink Mix',
      name: '饮料粉 (Drink Mix)',
      color: '#e11d48',
      cSat: 5.50,
      lambdaMax: 508,
      epsMax: 5.20,
      concUnit: 'μM',
      concMax: 400,
      concDefault: 100,
      epsScale: 0.0052
    },
    {
      id: 'co-no3-2',
      formula: 'Co(NO₃)₂',
      name: '硝酸钴 Co(NO₃)₂',
      color: '#f43f5e',
      cSat: 5.60,
      lambdaMax: 510,
      epsMax: 0.0048,
      concUnit: 'mM',
      concMax: 400,
      concDefault: 150,
      epsScale: 0.0048
    },
    {
      id: 'cocl2',
      formula: 'CoCl₂',
      name: '氯化钴 CoCl₂',
      color: '#fb7185',
      cSat: 4.30,
      lambdaMax: 512,
      epsMax: 0.0050,
      concUnit: 'mM',
      concMax: 300,
      concDefault: 120,
      epsScale: 0.0050
    },
    {
      id: 'k2cr2o7',
      formula: 'K₂Cr₂O₇',
      name: '重铬酸钾 K₂Cr₂O₇',
      color: '#ea580c',
      cSat: 0.50,
      lambdaMax: 450,
      epsMax: 0.0038,
      concUnit: 'mM',
      concMax: 400,
      concDefault: 150,
      epsScale: 0.0038
    },
    {
      id: 'k2cro4',
      formula: 'K₂CrO₄',
      name: '铬酸钾 K₂CrO₄',
      color: '#eab308',
      cSat: 3.30,
      lambdaMax: 385,
      epsMax: 0.0042,
      concUnit: 'mM',
      concMax: 400,
      concDefault: 150,
      epsScale: 0.0042
    },
    {
      id: 'nicl2',
      formula: 'NiCl₂',
      name: '氯化镍 NiCl₂',
      color: '#16a34a',
      cSat: 5.20,
      lambdaMax: 400,
      epsMax: 0.0051,
      concUnit: 'mM',
      concMax: 350,
      concDefault: 150,
      epsScale: 0.0051
    },
    {
      id: 'cuso4',
      formula: 'CuSO₄',
      name: '硫酸铜 CuSO₄',
      color: '#0284c7',
      cSat: 1.40,
      lambdaMax: 780,
      epsMax: 0.0095,
      concUnit: 'mM',
      concMax: 200,
      concDefault: 100,
      epsScale: 0.0095
    },
    {
      id: 'kmno4',
      formula: 'KMnO₄',
      name: '高锰酸钾 KMnO₄',
      color: '#7e22ce',
      cSat: 0.48,
      lambdaMax: 525,
      epsMax: 2.20,
      concUnit: 'μM',
      concMax: 800,
      concDefault: 300,
      epsScale: 0.0022
    },
    {
      id: 'nacl',
      formula: 'NaCl',
      name: '氯化钠 NaCl',
      color: '#94a3b8',
      cSat: 6.15,
      lambdaMax: 400,
      epsMax: 0.0001,
      concUnit: 'mM',
      concMax: 500,
      concDefault: 100,
      epsScale: 0.0001
    }
  ];

  // ============================================================================
  // 3. 'concentration' (浓度)
  // ============================================================================

  const CONC_BEAKER = {
    x: 205,
    y: 165,
    w: 280,
    h: 270,
    minVolL: 0.10,
    maxVolL: 1.00
  };

  const concentrationSim = createUniversalSim({
    id: 'concentration',
    title: '浓度 (Concentration)',
    subtitle: '9种溶质饱和溶解度极限 c_sat · 盐瓶摇晃/滴管加液/水龙头稀释/蒸发结晶与浓度探针',
    controls: [
      { id: 'soluteId', type: 'select', label: '溶质选择', value: 'drink-mix', options: SOLUTES_DB.map(s => ({ value: s.id, label: `${s.name} (c_sat=${s.cSat}M)` })) },
      { id: 'dispenserMode', type: 'select', label: '加料方式', value: 'shaker', options: [
        { value: 'shaker', label: '固体盐瓶 (Solid Shaker)' },
        { value: 'dropper', label: '浓溶液滴管 (Dropper)' }
      ]},
      { id: 'evaporationRate', type: 'slider', label: '蒸发速率', min: 0, max: 1, step: 0.05, value: 0 }
    ],

    createState() {
      return {
        soluteId: 'drink-mix',
        dispenserMode: 'shaker',
        volumeL: 0.50,
        soluteMoles: 0.45,
        inletFlow: 0.0,
        drainFlow: 0.0,
        evaporationRate: 0.0,
        shakerX: 335,
        shakerY: 112,
        probeX: 390,
        probeY: 345,
        draggingTarget: null,
        fallingParticles: [],
        steamWisps: [],
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'soluteId') {
        state.soluteId = value;
        return;
      }
      state[key] = value;
    },

    _getSolute(state) {
      return SOLUTES_DB.find(s => s.id === state.soluteId) || SOLUTES_DB[0];
    },

    _sprinkleSolute(state, deltaMoles = 0.18) {
      const sol = this._getSolute(state);
      if (state.dispenserMode === 'shaker') {
        state.soluteMoles = clamp(state.soluteMoles + deltaMoles, 0, 8.0);
        for (let i = 0; i < 9; i++) {
          state.fallingParticles.push({
            x: state.shakerX + (Math.random() - 0.5) * 32,
            y: state.shakerY + 26,
            vy: 120 + Math.random() * 60,
            color: sol.color,
            isDrop: false
          });
        }
      } else {
        const addV = 0.025;
        if (state.volumeL < CONC_BEAKER.maxVolL) {
          const actualDV = Math.min(addV, CONC_BEAKER.maxVolL - state.volumeL);
          state.volumeL += actualDV;
          state.soluteMoles = clamp(state.soluteMoles + actualDV * (sol.cSat * 0.9), 0, 8.0);
          for (let i = 0; i < 4; i++) {
            state.fallingParticles.push({
              x: state.shakerX + (Math.random() - 0.5) * 8,
              y: state.shakerY + 32,
              vy: 150 + Math.random() * 40,
              color: sol.color,
              isDrop: true
            });
          }
        }
      }
    },

    update(state, dt) {
      const sol = this._getSolute(state);

      if (state.inletFlow > 0.01 && state.volumeL < CONC_BEAKER.maxVolL) {
        state.volumeL = clamp(state.volumeL + state.inletFlow * 0.25 * dt, CONC_BEAKER.minVolL, CONC_BEAKER.maxVolL);
      }

      if (state.drainFlow > 0.01 && state.volumeL > CONC_BEAKER.minVolL) {
        const currentDissolvedM = Math.min(state.soluteMoles / state.volumeL, sol.cSat);
        const dV = Math.min(state.volumeL - CONC_BEAKER.minVolL, state.drainFlow * 0.25 * dt);
        state.volumeL -= dV;
        state.soluteMoles = Math.max(0, state.soluteMoles - currentDissolvedM * dV);
      }

      if (state.evaporationRate > 0.01 && state.volumeL > CONC_BEAKER.minVolL) {
        const dV = Math.min(state.volumeL - CONC_BEAKER.minVolL, state.evaporationRate * 0.16 * dt);
        state.volumeL -= dV;
        if (Math.random() < state.evaporationRate * 4.5 * dt) {
          state.steamWisps.push({
            x: CONC_BEAKER.x + 30 + Math.random() * (CONC_BEAKER.w - 60),
            y: CONC_BEAKER.y + CONC_BEAKER.h * (1 - state.volumeL * 0.85),
            alpha: 0.85
          });
        }
      }

      const liquidSurfaceY = CONC_BEAKER.y + CONC_BEAKER.h - (state.volumeL / CONC_BEAKER.maxVolL) * (CONC_BEAKER.h - 28);
      for (let i = state.fallingParticles.length - 1; i >= 0; i--) {
        const p = state.fallingParticles[i];
        p.y += p.vy * dt;
        if (p.y >= liquidSurfaceY) {
          state.fallingParticles.splice(i, 1);
        }
      }

      for (let i = state.steamWisps.length - 1; i >= 0; i--) {
        const w = state.steamWisps[i];
        w.y -= 45 * dt;
        w.alpha -= 0.7 * dt;
        if (w.alpha <= 0) state.steamWisps.splice(i, 1);
      }
    },

    draw(ctx, state) {
      const ui = state.uiRegions;
      const sol = this._getSolute(state);
      const bk = CONC_BEAKER;
      const rawConc = state.soluteMoles / Math.max(0.05, state.volumeL);
      const dissolvedConc = Math.min(rawConc, sol.cSat);
      const isSaturated = rawConc > sol.cSat + 1e-4;
      const precipMoles = Math.max(0, state.soluteMoles - sol.cSat * state.volumeL);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 42, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`溶液浓度与饱和结晶实验 (Concentration) — 当前溶质: ${sol.name}`, 28, 31);

      fillStrokeRoundRect(ctx, bk.x - 42, 82, 75, 16, 4, '#64748b', '#334155', 1.5);
      fillStrokeRoundRect(ctx, bk.x + 17, 82, 16, 30, 4, '#64748b', '#334155', 1.5);
      if (state.inletFlow > 0.02) {
        const liquidTopY = bk.y + bk.h - (state.volumeL / bk.maxVolL) * (bk.h - 28);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.fillRect(bk.x + 20, 112, 10, liquidTopY - 112);
      }
      drawCanvasButton(ctx, ui, {
        id: 'btn_add_water',
        x: 68,
        y: 78,
        w: 92,
        h: 26,
        label: '🚰 加水 (+0.1L)',
        active: state.inletFlow > 0,
        activeBg: '#0284c7',
        onClick: () => {
          state.volumeL = clamp(state.volumeL + 0.10, bk.minVolL, bk.maxVolL);
        }
      });

      fillStrokeRoundRect(ctx, bk.x - 42, bk.y + bk.h - 22, 42, 14, 3, '#64748b', '#334155', 1.5);
      drawCanvasButton(ctx, ui, {
        id: 'btn_drain_water',
        x: 68,
        y: bk.y + bk.h - 28,
        w: 92,
        h: 26,
        label: '🚰 放液 (-0.1L)',
        active: false,
        onClick: () => {
          const dV = Math.min(0.10, state.volumeL - bk.minVolL);
          if (dV > 0) {
            state.volumeL -= dV;
            state.soluteMoles = Math.max(0, state.soluteMoles - dissolvedConc * dV);
          }
        }
      });

      const liquidH = (state.volumeL / bk.maxVolL) * (bk.h - 28);
      const liquidY = bk.y + bk.h - liquidH;

      fillStrokeRoundRect(ctx, bk.x, bk.y, bk.w, bk.h, 8, '#ffffff', '#475569', 2.4);

      const colorIntensity = clamp(0.12 + 0.78 * (dissolvedConc / Math.max(0.2, sol.cSat)), 0.10, 0.92);
      ctx.fillStyle = rgbaStr(sol.color, state.soluteMoles > 1e-4 ? colorIntensity : 0.18);
      ctx.fillRect(bk.x + 3, liquidY, bk.w - 6, liquidH - 2);

      ctx.strokeStyle = sol.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bk.x + 3, liquidY);
      ctx.lineTo(bk.x + bk.w - 3, liquidY);
      ctx.stroke();

      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      for (let v = 0.2; v <= 1.001; v += 0.2) {
        const ty = bk.y + bk.h - (v / bk.maxVolL) * (bk.h - 28);
        ctx.beginPath();
        ctx.moveTo(bk.x + bk.w - 16, ty);
        ctx.lineTo(bk.x + bk.w - 3, ty);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillText(`${v.toFixed(1)} L`, bk.x + bk.w - 20, ty + 3);
      }

      if (isSaturated) {
        const grainCount = clamp(Math.ceil(precipMoles * 28), 6, 85);
        ctx.save();
        ctx.fillStyle = sol.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < grainCount; i++) {
          const gx = bk.x + 28 + ((i * 37) % (bk.w - 56));
          const gy = bk.y + bk.h - 7 - Math.floor(i / 14) * 5;
          ctx.beginPath();
          ctx.rect(gx - 3, gy - 3, 6, 5);
          ctx.fill();
          ctx.stroke();
        }
        fillStrokeRoundRect(ctx, bk.x + bk.w / 2 - 72, bk.y + bk.h - 46, 144, 24, 6, 'rgba(15,23,42,0.86)', '#facc15', 1.5);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`已饱和! 沉淀 ${precipMoles.toFixed(2)} mol`, bk.x + bk.w / 2, bk.y + bk.h - 34);
        ctx.restore();
      }

      state.fallingParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.isDrop ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      state.steamWisps.forEach(w => {
        ctx.save();
        ctx.globalAlpha = clamp(w.alpha, 0, 1);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.quadraticCurveTo(w.x - 6, w.y - 10, w.x + 4, w.y - 20);
        ctx.stroke();
        ctx.restore();
      });

      const sx = state.shakerX;
      const sy = state.shakerY;
      ctx.save();
      ctx.translate(sx, sy);
      if (state.dispenserMode === 'shaker') {
        ctx.rotate(-0.35);
        fillStrokeRoundRect(ctx, -20, -28, 40, 52, 6, '#f1f5f9', '#475569', 1.8);
        ctx.fillStyle = sol.color;
        ctx.fillRect(-17, -6, 34, 26);
        fillStrokeRoundRect(ctx, -16, -35, 32, 8, 3, '#64748b', '#1e293b', 1.2);
      } else {
        fillStrokeRoundRect(ctx, -8, -18, 16, 36, 3, '#e2e8f0', '#475569', 1.5);
        ctx.fillStyle = sol.color;
        ctx.fillRect(-6, -4, 12, 22);
        ctx.beginPath();
        ctx.arc(0, -24, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
      }
      ctx.restore();

      drawCanvasButton(ctx, ui, {
        id: 'btn_sprinkle',
        x: sx - 52,
        y: sy - 58,
        w: 104,
        h: 24,
        fontSize: 11,
        label: state.dispenserMode === 'shaker' ? '✨ 点击撒入溶质' : '💧 点击滴加浓液',
        active: true,
        activeBg: sol.color,
        onClick: () => this._sprinkleSolute(state, 0.22)
      });

      const probeInLiquid = (
        state.probeX >= bk.x + 8 &&
        state.probeX <= bk.x + bk.w - 8 &&
        state.probeY >= liquidY &&
        state.probeY <= bk.y + bk.h - 4
      );
      const meterX = 505, meterY = 185, meterW = 112, meterH = 92;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(meterX, meterY + 45);
      ctx.quadraticCurveTo((meterX + state.probeX) / 2, Math.max(meterY + 80, state.probeY + 35), state.probeX, state.probeY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(state.probeX, state.probeY, 13, 0, Math.PI * 2);
      ctx.fillStyle = probeInLiquid ? rgbaStr(sol.color, 0.45) : 'rgba(255,255,255,0.8)';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#7c3aed';
      ctx.stroke();

      fillStrokeRoundRect(ctx, meterX, meterY, meterW, meterH, 8, '#1e1b4b', '#7c3aed', 2);
      ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#c4b5fd';
      ctx.textAlign = 'center';
      ctx.fillText('浓度计 (mol/L)', meterX + meterW / 2, meterY + 20);
      fillStrokeRoundRect(ctx, meterX + 10, meterY + 32, meterW - 20, 32, 5, '#0f172a', '#6d28d9', 1.2);
      ctx.font = 'bold 14px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(probeInLiquid ? `${dissolvedConc.toFixed(2)}` : '---', meterX + meterW / 2, meterY + 49);
      ctx.font = '10px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText('可拖动探针至液面内', meterX + meterW / 2, meterY + 78);

      fillStrokeRoundRect(ctx, 180, 448, 435, 76, 10, '#ffffff', '#cbd5e1', 1.2);
      drawCanvasSlider(ctx, ui, {
        id: 'slider_evap',
        x: 196,
        y: 474,
        w: 230,
        label: '蒸发水分 (Evaporation)',
        value: state.evaporationRate,
        min: 0,
        max: 1,
        step: 0.05,
        color: '#ea580c',
        formatVal: (v) => v > 0 ? `蒸发中 ${(v * 100).toFixed(0)}%` : '关闭',
        onChange: (val) => {
          state.evaporationRate = val;
          if (val > 0 && state.volumeL > bk.minVolL) {
            state.volumeL = Math.max(bk.minVolL, state.volumeL - 0.012 * val);
          }
        }
      });

      drawCanvasButton(ctx, ui, {
        id: 'btn_remove_solute',
        x: 442,
        y: 460,
        w: 158,
        h: 25,
        label: '🧹 移除溶质 (清零溶质)',
        onClick: () => { state.soluteMoles = 0; }
      });
      drawCanvasButton(ctx, ui, {
        id: 'btn_reset_conc',
        x: 442,
        y: 491,
        w: 158,
        h: 25,
        label: '🔄 重置实验 (0.50 L)',
        onClick: () => {
          state.volumeL = 0.50;
          state.soluteMoles = 0.0;
          state.evaporationRate = 0.0;
        }
      });

      const px = 630, py = 62, pw = 256, ph = 462;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);
      let cy = py + 20;
      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('加料方式 (Dispenser)', px + 14, cy);
      cy += 10;
      drawCanvasButton(ctx, ui, {
        id: 'disp_shaker',
        x: px + 14,
        y: cy,
        w: 110,
        h: 26,
        label: '🧂 固体盐瓶',
        active: state.dispenserMode === 'shaker',
        onClick: () => { state.dispenserMode = 'shaker'; }
      });
      drawCanvasButton(ctx, ui, {
        id: 'disp_dropper',
        x: px + 132,
        y: cy,
        w: 110,
        h: 26,
        label: '💧 浓溶液滴管',
        active: state.dispenserMode === 'dropper',
        onClick: () => { state.dispenserMode = 'dropper'; }
      });
      cy += 42;

      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('选择溶质 (9种化学物质与 c_sat)', px + 14, cy);
      cy += 10;
      SOLUTES_DB.forEach((s, idx) => {
        const by = cy + idx * 31;
        drawCanvasButton(ctx, ui, {
          id: `sol_${s.id}`,
          x: px + 14,
          y: by,
          w: pw - 28,
          h: 27,
          fontSize: 11,
          label: `${s.name}  [c_sat = ${s.cSat.toFixed(2)} M]`,
          active: state.soluteId === s.id,
          activeBg: s.color,
          onClick: () => { state.soluteId = s.id; }
        });
      });
      cy += SOLUTES_DB.length * 31 + 8;

      ctx.font = '600 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(`当前体积 V = ${state.volumeL.toFixed(2)} L | 总溶质 n = ${state.soluteMoles.toFixed(2)} mol`, px + 14, cy + 8);
      ctx.fillText(`溶解浓度 c = ${dissolvedConc.toFixed(2)} M (饱和度 ${sol.cSat.toFixed(2)} M)`, px + 14, cy + 25);
    },

    onPointerDown(state, x, y) {
      if (Math.hypot(x - state.probeX, y - state.probeY) <= 22) {
        state.draggingTarget = 'probe';
        return;
      }
      if (Math.hypot(x - state.shakerX, y - state.shakerY) <= 36) {
        state.draggingTarget = 'shaker';
        this._sprinkleSolute(state, 0.16);
      }
    },

    onPointerMove(state, x, y) {
      if (state.draggingTarget === 'probe') {
        state.probeX = clamp(x, 120, 580);
        state.probeY = clamp(y, 120, 440);
      } else if (state.draggingTarget === 'shaker') {
        const dx = Math.abs(x - state.shakerX) + Math.abs(y - state.shakerY);
        state.shakerX = clamp(x, 225, 455);
        state.shakerY = clamp(y, 82, 150);
        if (dx > 10 && state.dispenserMode === 'shaker') {
          this._sprinkleSolute(state, 0.04);
        }
      }
    },

    onPointerUp(state) {
      state.draggingTarget = null;
    }
  });

  window.registerSim('concentration', concentrationSim);

  // ============================================================================
  // 4. 'molarity' (摩尔浓度)
  // ============================================================================

  const molaritySim = createUniversalSim({
    id: 'molarity',
    title: '摩尔浓度 (Molarity)',
    subtitle: 'M = n / V 连续定量关系 · 9种标准溶质比色深浅与饱和析晶阈值',
    controls: [
      { id: 'soluteId', type: 'select', label: '溶质选择', value: 'cuso4', options: SOLUTES_DB.map(s => ({ value: s.id, label: s.name })) },
      { id: 'moles', type: 'slider', label: '溶质摩尔数 n (mol)', min: 0.00, max: 1.00, step: 0.01, value: 0.50 },
      { id: 'volume', type: 'slider', label: '溶液体积 V (L)', min: 0.20, max: 1.00, step: 0.01, value: 0.50 },
      { id: 'showValues', type: 'checkbox', label: '显示精确数值', value: true }
    ],

    createState() {
      return {
        soluteId: 'cuso4',
        moles: 0.50,
        volume: 0.50,
        showValues: true,
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'moles') state.moles = clamp(value, 0.0, 1.0);
      else if (key === 'volume') state.volume = clamp(value, 0.20, 1.0);
      else state[key] = value;
    },

    update() {},

    draw(ctx, state) {
      const ui = state.uiRegions;
      const sol = SOLUTES_DB.find(s => s.id === state.soluteId) || SOLUTES_DB[6];
      const n = clamp(state.moles, 0, 1.0);
      const V = clamp(state.volume, 0.20, 1.0);
      const rawM = n / V;
      const dissolvedM = Math.min(rawM, sol.cSat);
      const isSaturated = rawM > sol.cSat + 1e-4;
      const precipMoles = Math.max(0, n - sol.cSat * V);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 42, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`摩尔浓度定量实验 (Molarity) — M = n / V = ${dissolvedM.toFixed(2)} mol/L`, 28, 31);

      drawCanvasCheckbox(ctx, ui, {
        id: 'chk_molarity_values',
        x: 735,
        y: 23,
        label: '显示数值 (Show Values)',
        checked: state.showValues,
        onChange: (v) => { state.showValues = v; }
      });

      fillStrokeRoundRect(ctx, 16, 64, 232, 460, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 13px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('连续调节参数 (n 与 V)', 30, 90);

      drawCanvasSlider(ctx, ui, {
        id: 'slider_molarity_n',
        x: 30,
        y: 132,
        w: 204,
        label: '溶质摩尔数 n (Solute Amount)',
        value: n,
        min: 0.00,
        max: 1.00,
        step: 0.01,
        unit: 'mol',
        color: sol.color,
        formatVal: (v) => state.showValues ? `${v.toFixed(2)} mol` : (v < 0.2 ? '少' : v > 0.8 ? '多' : '中'),
        onChange: (val) => { state.moles = val; }
      });

      drawCanvasSlider(ctx, ui, {
        id: 'slider_molarity_v',
        x: 30,
        y: 202,
        w: 204,
        label: '溶液体积 V (Solution Volume)',
        value: V,
        min: 0.20,
        max: 1.00,
        step: 0.01,
        unit: 'L',
        color: '#0284c7',
        formatVal: (v) => state.showValues ? `${v.toFixed(2)} L` : (v < 0.4 ? '低' : v > 0.8 ? '满' : '中'),
        onChange: (val) => { state.volume = val; }
      });

      fillStrokeRoundRect(ctx, 28, 250, 208, 175, 8, '#f0f9ff', '#bae6fd', 1.2);
      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.textAlign = 'left';
      ctx.fillText('摩尔浓度公式实时演算', 40, 272);

      ctx.font = '600 11.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`n = ${n.toFixed(2)} mol`, 40, 298);
      ctx.fillText(`V = ${V.toFixed(2)} L`, 40, 320);
      ctx.fillText(`n / V = ${rawM.toFixed(2)} M`, 40, 342);
      ctx.fillStyle = '#475569';
      ctx.fillText(`饱和上限 c_sat = ${sol.cSat.toFixed(2)} M`, 40, 364);
      ctx.fillStyle = isSaturated ? '#dc2626' : '#16a34a';
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(
        isSaturated
          ? `⚠ 超出饱和! 析出 ${precipMoles.toFixed(2)} mol`
          : `✓ 完全溶解: M = ${dissolvedM.toFixed(2)} mol/L`,
        40,
        392
      );

      drawCanvasButton(ctx, ui, {
        id: 'btn_reset_molarity',
        x: 28,
        y: 442,
        w: 208,
        h: 28,
        label: '🔄 重置 (n=0.50 mol, V=0.50 L)',
        onClick: () => {
          state.moles = 0.50;
          state.volume = 0.50;
        }
      });

      const bx = 266, by = 115, bw = 235, bh = 365;
      const liqH = (V / 1.00) * (bh - 32);
      const liqY = by + bh - liqH;

      fillStrokeRoundRect(ctx, bx, by, bw, bh, 8, '#ffffff', '#475569', 2.4);

      const alpha = n <= 0.001 ? 0.14 : clamp(0.14 + 0.78 * (dissolvedM / Math.min(5.0, sol.cSat)), 0.14, 0.92);
      ctx.fillStyle = rgbaStr(sol.color, alpha);
      ctx.fillRect(bx + 3, liqY, bw - 6, liqH - 3);

      ctx.strokeStyle = sol.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 3, liqY);
      ctx.lineTo(bx + bw - 3, liqY);
      ctx.stroke();

      ctx.font = '600 11px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      for (let vTick = 0.2; vTick <= 1.001; vTick += 0.2) {
        const ty = by + bh - (vTick / 1.0) * (bh - 32);
        ctx.beginPath();
        ctx.moveTo(bx + bw - 18, ty);
        ctx.lineTo(bx + bw - 3, ty);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (state.showValues) {
          ctx.fillText(`${vTick.toFixed(2)} L`, bx + bw - 22, ty + 4);
        }
      }

      if (isSaturated) {
        const count = clamp(Math.ceil(precipMoles * 35), 8, 90);
        ctx.fillStyle = sol.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < count; i++) {
          const cx = bx + 24 + ((i * 29) % (bw - 48));
          const cy = by + bh - 8 - Math.floor(i / 12) * 5;
          ctx.fillRect(cx - 3, cy - 3, 6, 5);
          ctx.strokeRect(cx - 3, cy - 3, 6, 5);
        }
        fillStrokeRoundRect(ctx, bx + bw / 2 - 68, by + bh - 48, 136, 26, 6, 'rgba(15,23,42,0.88)', '#facc15', 1.5);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('已达饱和 (Saturated!)', bx + bw / 2, by + bh - 35);
      }

      const mx = 528, my = 115, mw = 46, mh = 365;
      const barGrad = ctx.createLinearGradient(0, my + mh, 0, my);
      barGrad.addColorStop(0, '#ffffff');
      barGrad.addColorStop(1, sol.color);
      fillStrokeRoundRect(ctx, mx, my, mw, mh, 6, barGrad, '#334155', 2);

      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      for (let mTick = 0; mTick <= 5; mTick += 1) {
        const ty = my + mh - (mTick / 5.0) * mh;
        ctx.beginPath();
        ctx.moveTo(mx + mw - 10, ty);
        ctx.lineTo(mx + mw, ty);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (state.showValues) {
          ctx.fillText(`${mTick.toFixed(1)} M`, mx + mw + 6, ty + 3);
        }
      }

      if (sol.cSat <= 5.0) {
        const satY = my + mh - (sol.cSat / 5.0) * mh;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(mx - 6, satY);
        ctx.lineTo(mx + mw + 6, satY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const curY = my + mh - clamp(dissolvedM / 5.0, 0, 1) * mh;
      fillStrokeRoundRect(ctx, mx - 56, curY - 12, 52, 24, 5, '#0f172a', sol.color, 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${dissolvedM.toFixed(2)}M`, mx - 30, curY);

      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('溶液浓度 M (mol/L)', mx + mw / 2, my - 16);

      const px = 630, py = 64, pw = 256, ph = 460;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 13px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('切换 9 种化学溶质 (Solutes)', px + 14, py + 24);

      SOLUTES_DB.forEach((s, idx) => {
        const sy = py + 42 + idx * 44;
        drawCanvasButton(ctx, ui, {
          id: `mol_sol_${s.id}`,
          x: px + 14,
          y: sy,
          w: pw - 28,
          h: 36,
          fontSize: 11.5,
          label: `${s.name} (c_sat=${s.cSat.toFixed(2)} M)`,
          active: state.soluteId === s.id,
          activeBg: s.color,
          onClick: () => { state.soluteId = s.id; }
        });
      });
    }
  });

  window.registerSim('molarity', molaritySim);

  // ============================================================================
  // 5. 'beers-law-lab' (比尔定律实验)
  // ============================================================================

  const BEERS_SOLUTES = SOLUTES_DB.slice(0, 8);

  function getMolarAbsorptivityAtLambda(sol, nm) {
    const d1 = (nm - sol.lambdaMax) / 46.0;
    let factor = Math.exp(-0.5 * d1 * d1);
    if (sol.id === 'nicl2') {
      const d2 = (nm - 720) / 55.0;
      factor = Math.max(factor, 0.62 * Math.exp(-0.5 * d2 * d2));
    } else if (sol.id === 'k2cr2o7') {
      const d2 = (nm - 380) / 45.0;
      factor = Math.max(factor, 0.85 * Math.exp(-0.5 * d2 * d2));
    }
    return sol.epsScale * Math.max(0.02, factor);
  }

  const beersLawSim = createUniversalSim({
    id: 'beers-law-lab',
    title: '比尔定律实验 (Beer\'s Law Lab)',
    subtitle: '分光光度计完整仿真 · A = εbc 与 T = 10^(-A) · 吸收光谱 ε(λ) 与 A-c 标准工作曲线',
    controls: [
      { id: 'soluteId', type: 'select', label: '标准溶液 (8种)', value: 'drink-mix', options: BEERS_SOLUTES.map(s => ({ value: s.id, label: `${s.name} (λ_max=${s.lambdaMax}nm)` })) },
      { id: 'wavelengthMode', type: 'select', label: '波长模式', value: 'preset', options: [
        { value: 'preset', label: '预设最大吸收波长 (Preset λ_max)' },
        { value: 'variable', label: '自由调节单色光波长 (380~780 nm)' }
      ]},
      { id: 'wavelengthNm', type: 'slider', label: '单色光波长 λ (nm)', min: 380, max: 780, step: 1, value: 508 },
      { id: 'pathLengthCm', type: 'slider', label: '比色皿宽度 b (cm)', min: 0.50, max: 2.00, step: 0.05, value: 1.00 },
      { id: 'concentration', type: 'slider', label: '溶液浓度 c', min: 0, max: 400, step: 5, value: 100 },
      { id: 'detectorMode', type: 'select', label: '光电检测器读数', value: 'transmittance', options: [
        { value: 'transmittance', label: '透光率 T (%)' },
        { value: 'absorbance', label: '吸光度 A = εbc' }
      ]}
    ],

    createState() {
      const first = BEERS_SOLUTES[0];
      return {
        soluteId: first.id,
        beamOn: true,
        wavelengthMode: 'preset',
        wavelengthNm: first.lambdaMax,
        pathLengthCm: 1.00,
        concentration: first.concDefault,
        detectorMode: 'transmittance',
        draggingCuvetteWall: false,
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'soluteId') {
        state.soluteId = value;
        const sol = BEERS_SOLUTES.find(s => s.id === value) || BEERS_SOLUTES[0];
        state.concentration = sol.concDefault;
        if (state.wavelengthMode === 'preset') {
          state.wavelengthNm = sol.lambdaMax;
        }
        return;
      }
      if (key === 'wavelengthMode') {
        state.wavelengthMode = value;
        if (value === 'preset') {
          const sol = BEERS_SOLUTES.find(s => s.id === state.soluteId) || BEERS_SOLUTES[0];
          state.wavelengthNm = sol.lambdaMax;
        }
        return;
      }
      if (key === 'wavelengthNm') {
        state.wavelengthMode = 'variable';
        state.wavelengthNm = clamp(value, 380, 780);
        return;
      }
      if (key === 'pathLengthCm') {
        state.pathLengthCm = clamp(value, 0.50, 2.00);
        return;
      }
      if (key === 'concentration') {
        const sol = BEERS_SOLUTES.find(s => s.id === state.soluteId) || BEERS_SOLUTES[0];
        state.concentration = clamp(value, 0, sol.concMax);
        return;
      }
      state[key] = value;
    },

    update() {},

    draw(ctx, state) {
      const ui = state.uiRegions;
      const sol = BEERS_SOLUTES.find(s => s.id === state.soluteId) || BEERS_SOLUTES[0];
      if (state.wavelengthMode === 'preset') {
        state.wavelengthNm = sol.lambdaMax;
      }
      const lambda = clamp(state.wavelengthNm, 380, 780);
      const b = clamp(state.pathLengthCm, 0.50, 2.00);
      const c = clamp(state.concentration, 0, sol.concMax);

      const epsEff = getMolarAbsorptivityAtLambda(sol, lambda);
      const absorbance = epsEff * b * c;
      const transmittance = Math.pow(10, -absorbance);
      const transmittancePct = transmittance * 100;
      const beamRgb = wavelengthToRgb(lambda);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 42, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`比尔定律分光光度计 (Beer's Law Lab) — A = ε·b·c = ${absorbance.toFixed(2)} | T = ${transmittancePct.toFixed(2)}%`, 28, 31);

      fillStrokeRoundRect(ctx, 16, 62, 504, 248, 10, '#0f172a', '#334155', 1.5);

      const cuvX = 185;
      const cuvY = 105;
      const cuvW = b * 75;
      const cuvH = 148;
      const beamY = 182;

      if (state.beamOn) {
        ctx.fillStyle = `rgba(${beamRgb.r}, ${beamRgb.g}, ${beamRgb.b}, 0.85)`;
        ctx.fillRect(112, beamY - 18, cuvX - 112, 36);

        const inGrad = ctx.createLinearGradient(cuvX, 0, cuvX + cuvW, 0);
        inGrad.addColorStop(0, `rgba(${beamRgb.r}, ${beamRgb.g}, ${beamRgb.b}, 0.82)`);
        const outAlpha = clamp(transmittance * 0.82, 0.04, 0.82);
        inGrad.addColorStop(1, `rgba(${beamRgb.r}, ${beamRgb.g}, ${beamRgb.b}, ${outAlpha.toFixed(3)})`);
        ctx.fillStyle = inGrad;
        ctx.fillRect(cuvX, beamY - 18, cuvW, 36);

        ctx.fillStyle = `rgba(${beamRgb.r}, ${beamRgb.g}, ${beamRgb.b}, ${outAlpha.toFixed(3)})`;
        ctx.fillRect(cuvX + cuvW, beamY - 18, 375 - (cuvX + cuvW), 36);
      }

      fillStrokeRoundRect(ctx, 28, 142, 86, 80, 8, '#334155', '#94a3b8', 1.8);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('单色光源', 71, 158);
      ctx.fillStyle = beamRgb.css;
      ctx.fillText(`${lambda} nm`, 71, 174);
      drawCanvasButton(ctx, ui, {
        id: 'btn_beam_toggle',
        x: 41,
        y: 186,
        w: 60,
        h: 26,
        label: state.beamOn ? '🔴 关灯' : '🟢 开灯',
        active: state.beamOn,
        activeBg: '#dc2626',
        onClick: () => { state.beamOn = !state.beamOn; }
      });

      const solAlpha = clamp(0.08 + 0.78 * (c / sol.concMax), 0.08, 0.88);
      ctx.fillStyle = rgbaStr(sol.color, solAlpha);
      ctx.fillRect(cuvX + 2, cuvY + 22, cuvW - 4, cuvH - 24);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cuvX, cuvY, cuvW, cuvH);

      fillStrokeRoundRect(ctx, cuvX + cuvW - 12, cuvY + cuvH + 6, 24, 18, 4, '#f59e0b', '#ffffff', 1.2);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↔', cuvX + cuvW, cuvY + cuvH + 16);

      fillStrokeRoundRect(ctx, cuvX, cuvY + cuvH + 26, 160, 18, 3, '#fef9c3', '#ca8a04', 1);
      ctx.font = '600 9.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#1e293b';
      for (let cm = 0; cm <= 2.01; cm += 0.5) {
        const rx = cuvX + cm * 75;
        ctx.beginPath();
        ctx.moveTo(rx, cuvY + cuvH + 26);
        ctx.lineTo(rx, cuvY + cuvH + 33);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillText(`${cm.toFixed(1)}`, rx, cuvY + cuvH + 41);
      }
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillText(`b = ${b.toFixed(2)} cm`, cuvX + cuvW / 2, cuvY - 10);

      fillStrokeRoundRect(ctx, 375, 102, 134, 165, 10, '#1e293b', '#38bdf8', 1.8);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText('光电检测器', 442, 120);

      drawCanvasButton(ctx, ui, {
        id: 'det_trans',
        x: 385,
        y: 132,
        w: 114,
        h: 24,
        fontSize: 10.5,
        label: '透光率 T (%)',
        active: state.detectorMode === 'transmittance',
        onClick: () => { state.detectorMode = 'transmittance'; }
      });
      drawCanvasButton(ctx, ui, {
        id: 'det_abs',
        x: 385,
        y: 160,
        w: 114,
        h: 24,
        fontSize: 10.5,
        label: '吸光度 A = εbc',
        active: state.detectorMode === 'absorbance',
        onClick: () => { state.detectorMode = 'absorbance'; }
      });

      fillStrokeRoundRect(ctx, 385, 194, 114, 42, 6, '#022c22', '#10b981', 1.5);
      ctx.font = 'bold 16px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!state.beamOn) {
        ctx.fillText('---', 442, 215);
      } else if (state.detectorMode === 'transmittance') {
        ctx.fillText(`${transmittancePct.toFixed(2)} %`, 442, 215);
      } else {
        ctx.fillText(`${absorbance.toFixed(2)}`, 442, 215);
      }
      ctx.font = '10px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(state.detectorMode === 'transmittance' ? 'T = 10^(-εbc)×100%' : 'A = -lg(T) = εbc', 442, 252);

      fillStrokeRoundRect(ctx, 16, 318, 504, 206, 10, '#ffffff', '#cbd5e1', 1.2);

      drawCanvasButton(ctx, ui, {
        id: 'wl_preset',
        x: 28,
        y: 328,
        w: 148,
        h: 24,
        fontSize: 10.5,
        label: `预设特征波长 (${sol.lambdaMax}nm)`,
        active: state.wavelengthMode === 'preset',
        onClick: () => this.onControlChange(state, 'wavelengthMode', 'preset')
      });
      drawCanvasButton(ctx, ui, {
        id: 'wl_var',
        x: 182,
        y: 328,
        w: 132,
        h: 24,
        fontSize: 10.5,
        label: '可变波长 (380~780nm)',
        active: state.wavelengthMode === 'variable',
        onClick: () => this.onControlChange(state, 'wavelengthMode', 'variable')
      });

      const specBarX = 28, specBarY = 378, specBarW = 286;
      for (let i = 0; i < specBarW; i += 3) {
        const wNm = 380 + (i / specBarW) * 400;
        ctx.fillStyle = wavelengthToRgb(wNm).css;
        ctx.fillRect(specBarX + i, specBarY, 3, 7);
      }
      drawCanvasSlider(ctx, ui, {
        id: 'slider_beers_wl',
        x: specBarX,
        y: 374,
        w: specBarW,
        label: '单色光波长 λ',
        value: lambda,
        min: 380,
        max: 780,
        step: 1,
        unit: 'nm',
        color: beamRgb.css,
        onChange: (val) => this.onControlChange(state, 'wavelengthNm', val)
      });

      drawCanvasSlider(ctx, ui, {
        id: 'slider_beers_b',
        x: 28,
        y: 422,
        w: 286,
        label: '比色皿光程宽度 b',
        value: b,
        min: 0.50,
        max: 2.00,
        step: 0.05,
        unit: 'cm',
        color: '#d97706',
        onChange: (val) => this.onControlChange(state, 'pathLengthCm', val)
      });

      drawCanvasSlider(ctx, ui, {
        id: 'slider_beers_c',
        x: 28,
        y: 468,
        w: 286,
        label: `溶液浓度 c (${sol.concUnit})`,
        value: c,
        min: 0,
        max: sol.concMax,
        step: 5,
        unit: sol.concUnit,
        color: sol.color,
        onChange: (val) => this.onControlChange(state, 'concentration', val)
      });

      ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('切换 8 种标准有色溶液:', 328, 342);
      BEERS_SOLUTES.forEach((s, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        drawCanvasButton(ctx, ui, {
          id: `beers_sol_${s.id}`,
          x: 328 + col * 92,
          y: 352 + row * 39,
          w: 86,
          h: 33,
          fontSize: 10.5,
          label: s.formula,
          active: state.soluteId === s.id,
          activeBg: s.color,
          onClick: () => this.onControlChange(state, 'soluteId', s.id)
        });
      });

      const rx = 532, rw = 354;

      fillStrokeRoundRect(ctx, rx, 62, rw, 224, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(`吸收光谱曲线 ε(λ) — 特征峰 λ_max = ${sol.lambdaMax} nm`, rx + 14, 82);

      const gx1 = rx + 42, gy1 = 98, gw1 = rw - 58, gh1 = 156;
      fillStrokeRoundRect(ctx, gx1, gy1, gw1, gh1, 4, '#f8fafc', '#94a3b8', 1);

      for (let i = 0; i < gw1; i += 4) {
        const wNm = 380 + (i / gw1) * 400;
        ctx.fillStyle = wavelengthToRgb(wNm).css;
        ctx.fillRect(gx1 + i, gy1 + gh1 - 5, 4, 5);
      }

      ctx.strokeStyle = sol.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let nm = 380; nm <= 780; nm += 4) {
        const px = gx1 + ((nm - 380) / 400) * gw1;
        const epsRatio = getMolarAbsorptivityAtLambda(sol, nm) / sol.epsScale;
        const py = gy1 + gh1 - 8 - clamp(epsRatio, 0, 1.05) * (gh1 - 22);
        if (nm === 380) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const curLambdaX = gx1 + ((lambda - 380) / 400) * gw1;
      const curEpsRatio = epsEff / sol.epsScale;
      const curLambdaY = gy1 + gh1 - 8 - clamp(curEpsRatio, 0, 1.05) * (gh1 - 22);
      ctx.strokeStyle = beamRgb.css;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(curLambdaX, gy1);
      ctx.lineTo(curLambdaX, gy1 + gh1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(curLambdaX, curLambdaY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = beamRgb.css;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText('380 nm', gx1 + 16, gy1 + gh1 + 14);
      ctx.fillText('580 nm', gx1 + gw1 / 2, gy1 + gh1 + 14);
      ctx.fillText('780 nm', gx1 + gw1 - 16, gy1 + gh1 + 14);

      fillStrokeRoundRect(ctx, rx, 296, rw, 228, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(`A-c 标准工作曲线 (斜率 k = ε·b, A = ${absorbance.toFixed(2)})`, rx + 14, 316);

      const gx2 = rx + 42, gy2 = 332, gw2 = rw - 58, gh2 = 160;
      fillStrokeRoundRect(ctx, gx2, gy2, gw2, gh2, 4, '#f8fafc', '#94a3b8', 1);

      const maxPlotA = Math.max(2.0, epsEff * b * sol.concMax * 1.05);
      const endA = epsEff * b * sol.concMax;
      const endY = gy2 + gh2 - clamp(endA / maxPlotA, 0, 1) * (gh2 - 14);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(gx2, gy2 + gh2);
      ctx.lineTo(gx2 + gw2, endY);
      ctx.stroke();

      const ptX = gx2 + (c / sol.concMax) * gw2;
      const ptY = gy2 + gh2 - clamp(absorbance / maxPlotA, 0, 1) * (gh2 - 14);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(gx2, ptY);
      ctx.lineTo(ptX, ptY);
      ctx.lineTo(ptX, gy2 + gh2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(ptX, ptY, 6, 0, Math.PI * 2);
      ctx.fillStyle = sol.color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(`0 ${sol.concUnit}`, gx2 + 12, gy2 + gh2 + 14);
      ctx.fillText(`c = ${c} ${sol.concUnit}`, gx2 + gw2 / 2, gy2 + gh2 + 14);
      ctx.fillText(`${sol.concMax} ${sol.concUnit}`, gx2 + gw2 - 22, gy2 + gh2 + 14);
      ctx.textAlign = 'right';
      ctx.fillText('0.0', gx2 - 5, gy2 + gh2);
      ctx.fillText(maxPlotA.toFixed(1), gx2 - 5, gy2 + 12);
    },

    onPointerDown(state, x, y) {
      const cuvRightX = 185 + state.pathLengthCm * 75;
      if (Math.abs(x - cuvRightX) <= 20 && y >= 105 && y <= 280) {
        state.draggingCuvetteWall = true;
      }
    },

    onPointerMove(state, x) {
      if (state.draggingCuvetteWall) {
        const rawCm = (x - 185) / 75;
        state.pathLengthCm = clamp(Math.round(rawCm * 20) / 20, 0.50, 2.00);
      }
    },

    onPointerUp(state) {
      state.draggingCuvetteWall = false;
    }
  });

  window.registerSim('beers-law-lab', beersLawSim);

  // ============================================================================
  // SHARED ACID-BASE DATABASE & EXACT DILUTION SOLVER FOR 'ph-scale-basics' & 'ph-scale'
  // ============================================================================

  const PH_LIQUIDS_DB = [
    { id: 'drain-cleaner', name: '通渠剂 (Drain Cleaner)', ph0: 13.00, color: '#eab308' },
    { id: 'hand-soap',     name: '洗手液 (Hand Soap)',     ph0: 10.00, color: '#c084fc' },
    { id: 'blood',         name: '血液 (Blood)',           ph0: 7.40,  color: '#dc2626' },
    { id: 'spit',          name: '唾液 (Spit)',            ph0: 7.40,  color: '#bae6fd' },
    { id: 'water',         name: '水 (Water)',             ph0: 7.00,  color: '#38bdf8' },
    { id: 'milk',          name: '牛奶 (Milk)',            ph0: 6.50,  color: '#f1f5f9' },
    { id: 'chicken-soup',  name: '鸡汤 (Chicken Soup)',    ph0: 5.80,  color: '#fde047' },
    { id: 'coffee',        name: '咖啡 (Coffee)',          ph0: 5.00,  color: '#92400e' },
    { id: 'orange-juice',  name: '橙汁 (Orange Juice)',    ph0: 3.50,  color: '#f97316' },
    { id: 'soda-pop',      name: '汽水 (Soda Pop)',        ph0: 2.50,  color: '#84cc16' },
    { id: 'vomit',         name: '呕吐物 (Vomit)',         ph0: 2.00,  color: '#fb923c' },
    { id: 'battery-acid',  name: '蓄电池酸 (Battery Acid)', ph0: 1.00,  color: '#facc15' }
  ];

  function computeDilutedPh(ph0, vSolute, vWater) {
    const vTot = vSolute + vWater;
    if (vTot <= 1e-6 || vSolute <= 1e-9) return 7.00;
    const h0 = Math.pow(10, -ph0);
    const oh0 = Math.pow(10, ph0 - 14.0);
    const delta0 = h0 - oh0;
    const delta = (vSolute / vTot) * delta0;
    let h = 1.0e-7;
    if (delta >= 0) {
      h = (delta + Math.sqrt(delta * delta + 4 * KW_25C)) / 2;
    } else {
      const oh = (-delta + Math.sqrt(delta * delta + 4 * KW_25C)) / 2;
      h = KW_25C / oh;
    }
    return clamp(-Math.log10(h), 0.00, 14.00);
  }

  function phToIndicatorColor(ph) {
    if (ph < 6.8) {
      return mixHex('#ef4444', '#f59e0b', clamp(ph / 6.8, 0, 1));
    }
    if (ph <= 7.2) {
      return '#10b981';
    }
    return mixHex('#06b6d4', '#3b82f6', clamp((ph - 7.2) / 6.8, 0, 1));
  }

  // ============================================================================
  // 6. 'ph-scale-basics' (pH标度：基础)
  // ============================================================================

  const phScaleBasicsSim = createUniversalSim({
    id: 'ph-scale-basics',
    title: 'pH标度：基础 (pH Scale: Basics)',
    subtitle: '12种日常液体酸碱度 · 原液注入/加水稀释/底部放液与水自电离极限 (趋近 pH 7.00)',
    controls: [
      { id: 'liquidId', type: 'select', label: '日常液体选择', value: 'coffee', options: PH_LIQUIDS_DB.map(l => ({ value: l.id, label: `${l.name} (pH ${l.ph0.toFixed(1)})` })) }
    ],

    createState() {
      return {
        liquidId: 'coffee',
        soluteVolL: 0.50,
        waterVolL: 0.00,
        maxBeakerL: 1.20,
        probeInBeaker: true,
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'liquidId') {
        state.liquidId = value;
        state.soluteVolL = 0.50;
        state.waterVolL = 0.00;
        return;
      }
      state[key] = value;
    },

    update() {},

    draw(ctx, state) {
      const ui = state.uiRegions;
      const liq = PH_LIQUIDS_DB.find(l => l.id === state.liquidId) || PH_LIQUIDS_DB[7];
      const vTot = state.soluteVolL + state.waterVolL;
      const currentPh = computeDilutedPh(liq.ph0, state.soluteVolL, state.waterVolL);
      const classification = currentPh < 6.95 ? '酸性 (Acidic)' : (currentPh > 7.05 ? '碱性 (Basic)' : '中性 (Neutral)');

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 42, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`pH 标度：基础宏观稀释实验 (pH Scale: Basics) — 当前液体: ${liq.name}`, 28, 31);

      const sx = 20, sy = 64, sw = 212, sh = 460;
      fillStrokeRoundRect(ctx, sx, sy, sw, sh, 10, '#ffffff', '#cbd5e1', 1.2);

      fillStrokeRoundRect(ctx, sx + 14, sy + 14, sw - 28, 68, 8, '#0f172a', phToIndicatorColor(currentPh), 2.2);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText('数字 pH 计读数', sx + 24, sy + 32);
      ctx.font = 'bold 26px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(vTot > 0.001 ? `pH ${currentPh.toFixed(2)}` : 'pH ---', sx + 24, sy + 64);

      fillStrokeRoundRect(ctx, sx + 14, sy + 90, sw - 28, 26, 6, phToIndicatorColor(currentPh), null, 0);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(classification, sx + sw / 2, sy + 103);

      const barX = sx + 58, barY = sy + 132, barW = 28, barH = 310;
      const phGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
      phGrad.addColorStop(0.0, '#1d4ed8');
      phGrad.addColorStop(0.5, '#10b981');
      phGrad.addColorStop(1.0, '#dc2626');
      fillStrokeRoundRect(ctx, barX, barY, barW, barH, 14, phGrad, '#334155', 1.8);

      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.textAlign = 'left';
      for (let p = 0; p <= 14; p += 2) {
        const ty = barY + barH - (p / 14) * barH;
        ctx.beginPath();
        ctx.moveTo(barX + barW - 7, ty);
        ctx.lineTo(barX + barW, ty);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = p === 7 ? '#047857' : '#334155';
        const tag = p === 14 ? '14 (强碱)' : (p === 7 ? '7 (中性)' : (p === 0 ? '0 (强酸)' : `${p}`));
        ctx.fillText(tag, barX + barW + 8, ty + 3);
      }

      if (vTot > 0.001) {
        const pyInd = barY + barH - (currentPh / 14.0) * barH;
        fillStrokeRoundRect(ctx, sx + 10, pyInd - 11, 44, 22, 4, '#0f172a', '#ffffff', 1.5);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentPh.toFixed(2), sx + 32, pyInd);
      }

      const bx = 285, by = 148, bw = 275, bh = 295;
      const liqH = (vTot / state.maxBeakerL) * (bh - 28);
      const liqY = by + bh - liqH;

      fillStrokeRoundRect(ctx, bx + 32, 86, 26, 48, 4, liq.color, '#334155', 1.5);
      fillStrokeRoundRect(ctx, bx + bw - 68, 86, 56, 18, 4, '#64748b', '#334155', 1.5);
      fillStrokeRoundRect(ctx, bx + bw - 56, 104, 18, 30, 4, '#64748b', '#334155', 1.5);

      fillStrokeRoundRect(ctx, bx, by, bw, bh, 8, '#ffffff', '#475569', 2.4);

      if (vTot > 0.001) {
        const waterRatio = clamp(state.waterVolL / vTot, 0, 1);
        const mixColor = mixHex(liq.color, '#bae6fd', waterRatio * 0.72);
        ctx.fillStyle = mixColor;
        ctx.globalAlpha = 0.78;
        ctx.fillRect(bx + 3, liqY, bw - 6, liqH - 3);
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx + 3, liqY);
        ctx.lineTo(bx + bw - 3, liqY);
        ctx.stroke();
      }

      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'right';
      for (let v = 0.2; v <= 1.201; v += 0.2) {
        const ty = by + bh - (v / state.maxBeakerL) * (bh - 28);
        ctx.beginPath();
        ctx.moveTo(bx + bw - 16, ty);
        ctx.lineTo(bx + bw - 3, ty);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillText(`${v.toFixed(1)} L`, bx + bw - 20, ty + 3);
      }

      const probeX = bx + 95;
      const probeY = by + bh - 36;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + sw, sy + 50);
      ctx.quadraticCurveTo(bx - 10, sy + 50, probeX, probeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(probeX, probeY, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#064e3b';
      ctx.stroke();

      fillStrokeRoundRect(ctx, 250, 454, 345, 70, 10, '#ffffff', '#cbd5e1', 1.2);
      drawCanvasButton(ctx, ui, {
        id: 'btn_phb_add_solute',
        x: 262,
        y: 464,
        w: 102,
        h: 26,
        fontSize: 11,
        label: '🧪 +0.1L 原液',
        active: true,
        activeBg: '#d97706',
        onClick: () => {
          if (vTot < state.maxBeakerL - 0.001) {
            state.soluteVolL = Math.min(state.maxBeakerL - state.waterVolL, state.soluteVolL + 0.10);
          }
        }
      });
      drawCanvasButton(ctx, ui, {
        id: 'btn_phb_add_water',
        x: 372,
        y: 464,
        w: 102,
        h: 26,
        fontSize: 11,
        label: '🚰 +0.1L 加水',
        active: true,
        activeBg: '#0284c7',
        onClick: () => {
          if (vTot < state.maxBeakerL - 0.001) {
            state.waterVolL = Math.min(state.maxBeakerL - state.soluteVolL, state.waterVolL + 0.10);
          }
        }
      });
      drawCanvasButton(ctx, ui, {
        id: 'btn_phb_drain',
        x: 482,
        y: 464,
        w: 102,
        h: 26,
        fontSize: 11,
        label: '💧 -0.1L 放液',
        onClick: () => {
          if (vTot > 0.05) {
            const keepRatio = Math.max(0.05, vTot - 0.10) / vTot;
            state.soluteVolL *= keepRatio;
            state.waterVolL *= keepRatio;
          }
        }
      });

      ctx.font = '600 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(
        `总体积 V = ${vTot.toFixed(2)} L (原液 ${state.soluteVolL.toFixed(2)} L + 纯水 ${state.waterVolL.toFixed(2)} L) | 原液初始 pH = ${liq.ph0.toFixed(2)}`,
        422,
        508
      );

      const px = 612, py = 64, pw = 272, ph = 460;
      fillStrokeRoundRect(ctx, px, py, pw, ph, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 13px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('切换日常液体 (12种内置样品)', px + 14, py + 24);

      PH_LIQUIDS_DB.forEach((item, idx) => {
        const byRow = py + 38 + idx * 34;
        drawCanvasButton(ctx, ui, {
          id: `phb_liq_${item.id}`,
          x: px + 14,
          y: byRow,
          w: pw - 28,
          h: 29,
          fontSize: 11,
          label: `${item.name}  [pH ${item.ph0.toFixed(1)}]`,
          active: state.liquidId === item.id,
          activeBg: phToIndicatorColor(item.ph0),
          onClick: () => this.onControlChange(state, 'liquidId', item.id)
        });
      });
    }
  });

  window.registerSim('ph-scale-basics', phScaleBasicsSim);

  // ============================================================================
  // 7. 'ph-scale' (pH标度：Macro / Micro / My Solution 三合一)
  // ============================================================================

  const phScaleSim = createUniversalSim({
    id: 'ph-scale',
    title: 'pH标度 (pH Scale: Macro · Micro · My Solution)',
    subtitle: '25°C [H₃O⁺][OH⁻] = 1.0×10⁻¹⁴ · 对数/线性坐标柱状图与微观离子数量比',
    modes: [
      { id: 'macro',       label: '宏观 (Macro)' },
      { id: 'micro',       label: '微观 (Micro)' },
      { id: 'my-solution', label: '我的溶液 (My Solution)' }
    ],
    controls: [
      { id: 'mode', type: 'select', label: '实验视图', value: 'micro', options: [
        { value: 'macro', label: '宏观 (Macro)' },
        { value: 'micro', label: '微观 (Micro)' },
        { value: 'my-solution', label: '我的溶液 (My Solution)' }
      ]},
      { id: 'liquidId', type: 'select', label: '液体选择', value: 'coffee', options: PH_LIQUIDS_DB.map(l => ({ value: l.id, label: `${l.name} (pH ${l.ph0.toFixed(1)})` })) },
      { id: 'ph', type: 'slider', label: '溶液 pH', min: 0.00, max: 14.00, step: 0.05, value: 5.00 },
      { id: 'scaleMode', type: 'select', label: '坐标轴类型', value: 'log', options: [
        { value: 'log', label: '对数坐标 (Logarithmic)' },
        { value: 'linear', label: '线性坐标 (Linear)' }
      ]},
      { id: 'showRatio', type: 'checkbox', label: '显示烧杯内 H₃O⁺ / OH⁻ 微粒比', value: true }
    ],

    createState() {
      return {
        mode: 'micro',
        liquidId: 'coffee',
        soluteVolL: 0.50,
        waterVolL: 0.00,
        customPh: 5.00,
        scaleMode: 'log',
        displayMode: 'concentration',
        showRatio: true,
        showMoleculeCounts: true,
        uiRegions: []
      };
    },

    onControlChange(state, key, value) {
      if (key === 'liquidId') {
        state.liquidId = value;
        state.soluteVolL = 0.50;
        state.waterVolL = 0.00;
        const liq = PH_LIQUIDS_DB.find(l => l.id === value) || PH_LIQUIDS_DB[7];
        state.customPh = liq.ph0;
        return;
      }
      if (key === 'ph' || key === 'customPh') {
        state.mode = 'my-solution';
        state.customPh = clamp(value, 0.00, 14.00);
        return;
      }
      state[key] = value;
    },

    update() {},

    draw(ctx, state) {
      const ui = state.uiRegions;
      const liq = PH_LIQUIDS_DB.find(l => l.id === state.liquidId) || PH_LIQUIDS_DB[7];
      const vTot = clamp(state.soluteVolL + state.waterVolL, 0.10, 1.20);
      const currentPh = state.mode === 'my-solution'
        ? clamp(state.customPh, 0.00, 14.00)
        : computeDilutedPh(liq.ph0, state.soluteVolL, state.waterVolL);
      const currentPoh = 14.00 - currentPh;
      const cH3O = Math.pow(10, -currentPh);
      const cOH = Math.pow(10, -currentPoh);
      const cH2O = 55.0;

      const nH3O = cH3O * vTot * NA_AVOGADRO;
      const nOH = cOH * vTot * NA_AVOGADRO;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      fillStrokeRoundRect(ctx, 14, 10, W - 28, 44, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 15px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('pH 标度 (pH Scale: Macro · Micro · My Solution)', 26, 32);

      const tabs = [
        { id: 'macro', label: '宏观 (Macro)' },
        { id: 'micro', label: '微观 (Micro)' },
        { id: 'my-solution', label: '我的溶液 (My Solution)' }
      ];
      tabs.forEach((t, i) => {
        drawCanvasButton(ctx, ui, {
          id: `ph_tab_${t.id}`,
          x: 420 + i * 150,
          y: 18,
          w: 142,
          h: 28,
          label: t.label,
          active: state.mode === t.id,
          onClick: () => {
            if (t.id === 'my-solution' && state.mode !== 'my-solution') {
              state.customPh = currentPh;
            }
            state.mode = t.id;
          }
        });
      });

      const lx = 16, ly = 64, lw = 285, lh = 460;
      fillStrokeRoundRect(ctx, lx, ly, lw, lh, 10, '#ffffff', '#cbd5e1', 1.2);

      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('25°C 离子浓度柱状图 (mol/L)', lx + 14, ly + 22);

      drawCanvasButton(ctx, ui, {
        id: 'scale_log',
        x: lx + 14,
        y: ly + 34,
        w: 124,
        h: 24,
        fontSize: 10.5,
        label: '对数坐标 (Log)',
        active: state.scaleMode === 'log',
        onClick: () => { state.scaleMode = 'log'; }
      });
      drawCanvasButton(ctx, ui, {
        id: 'scale_lin',
        x: lx + 146,
        y: ly + 34,
        w: 124,
        h: 24,
        fontSize: 10.5,
        label: '线性坐标 (Linear)',
        active: state.scaleMode === 'linear',
        onClick: () => { state.scaleMode = 'linear'; }
      });

      const gx = lx + 56, gy = ly + 72, gw = lw - 72, gh = 295;
      fillStrokeRoundRect(ctx, gx, gy, gw, gh, 6, '#f8fafc', '#94a3b8', 1.2);

      if (state.scaleMode === 'log') {
        ctx.font = '9.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'right';
        for (let exp = -16; exp <= 2; exp += 2) {
          const yTick = gy + gh - ((exp + 16) / 18) * gh;
          ctx.strokeStyle = exp === -7 ? '#10b981' : '#e2e8f0';
          ctx.lineWidth = exp === -7 ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(gx, yTick);
          ctx.lineTo(gx + gw, yTick);
          ctx.stroke();
          ctx.fillStyle = exp === -7 ? '#047857' : '#475569';
          ctx.fillText(`10^${exp}`, gx - 5, yTick + 3);
        }

        const logHeight = (cVal) => {
          const lg = clamp(Math.log10(Math.max(1e-16, cVal)), -16, 2);
          return ((lg + 16) / 18) * gh;
        };

        const bars = [
          { label: 'H₂O', val: cH2O, h: logHeight(cH2O), color: '#0284c7', x: gx + 20 },
          { label: 'H₃O⁺', val: cH3O, h: logHeight(cH3O), color: '#ef4444', x: gx + 86 },
          { label: 'OH⁻', val: cOH, h: logHeight(cOH), color: '#2563eb', x: gx + 152 }
        ];

        bars.forEach(b => {
          fillStrokeRoundRect(ctx, b.x, gy + gh - b.h, 38, b.h, 4, rgbaStr(b.color, 0.85), b.color, 1.5);
          ctx.font = 'bold 11px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = b.color;
          ctx.textAlign = 'center';
          ctx.fillText(b.label, b.x + 19, gy + gh + 16);
          ctx.font = '600 9.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(b.label === 'H₂O' ? '55 M' : formatSci(b.val, 1), b.x + 19, Math.max(gy + 12, gy + gh - b.h - 6));
        });
      } else {
        ctx.font = '9.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'right';
        for (let v = 0; v <= 1.01; v += 0.2) {
          const yTick = gy + gh - v * gh;
          ctx.strokeStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(gx, yTick);
          ctx.lineTo(gx + gw, yTick);
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.fillText(v.toFixed(1), gx - 5, yTick + 3);
        }

        const bars = [
          { label: 'H₂O (55M)', val: cH2O, h: gh, color: '#0284c7', x: gx + 20 },
          { label: 'H₃O⁺', val: cH3O, h: clamp(cH3O, 0, 1) * gh, color: '#ef4444', x: gx + 86 },
          { label: 'OH⁻', val: cOH, h: clamp(cOH, 0, 1) * gh, color: '#2563eb', x: gx + 152 }
        ];
        bars.forEach(b => {
          fillStrokeRoundRect(ctx, b.x, gy + gh - Math.max(3, b.h), 38, Math.max(3, b.h), 4, rgbaStr(b.color, 0.85), b.color, 1.5);
          ctx.font = 'bold 10.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = b.color;
          ctx.textAlign = 'center';
          ctx.fillText(b.label, b.x + 19, gy + gh + 16);
          ctx.font = '600 9.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(b.val >= 10 ? '55 M↑' : formatSci(b.val, 1), b.x + 19, Math.max(gy + 12, gy + gh - b.h - 6));
        });
      }

      fillStrokeRoundRect(ctx, lx + 12, gy + gh + 28, lw - 24, 118, 8, '#f0fdf4', '#86efac', 1.2);
      ctx.font = 'bold 11.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#166534';
      ctx.textAlign = 'left';
      ctx.fillText('25°C 水的离子积恒等式验证:', lx + 20, gy + gh + 46);
      ctx.font = '600 10.5px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`pH = ${currentPh.toFixed(2)} | pOH = ${currentPoh.toFixed(2)}`, lx + 20, gy + gh + 66);
      ctx.fillText(`pH + pOH = ${(currentPh + currentPoh).toFixed(2)}`, lx + 20, gy + gh + 84);
      ctx.fillText(`[H₃O⁺][OH⁻] = ${formatSci(cH3O * cOH, 2)} M²`, lx + 20, gy + gh + 102);
      ctx.fillStyle = '#475569';
      ctx.fillText(`微粒数 N(H₃O⁺)=${formatSci(nH3O, 1)} | N(OH⁻)=${formatSci(nOH, 1)}`, lx + 20, gy + gh + 120);

      const bx = 316, by = 118, bw = 278, bh = 275;
      const liqH = (vTot / 1.20) * (bh - 26);
      const liqY = by + bh - liqH;

      fillStrokeRoundRect(ctx, bx, by, bw, bh, 8, '#ffffff', '#475569', 2.4);

      const baseColor = state.mode === 'my-solution' ? phToIndicatorColor(currentPh) : liq.color;
      ctx.fillStyle = rgbaStr(baseColor, 0.32);
      ctx.fillRect(bx + 3, liqY, bw - 6, liqH - 3);

      if (state.showRatio) {
        const hDots = clamp(Math.round(28 + (7.0 - currentPh) * 5.2), 2, 68);
        const ohDots = clamp(Math.round(28 + (currentPh - 7.0) * 5.2), 2, 68);

        for (let i = 0; i < hDots; i++) {
          const px = bx + 18 + ((i * 43 + 17) % (bw - 36));
          const py = liqY + 12 + ((i * 29 + 11) % Math.max(18, liqH - 22));
          ctx.beginPath();
          ctx.arc(px, py, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
        }
        for (let i = 0; i < ohDots; i++) {
          const px = bx + 22 + ((i * 53 + 31) % (bw - 44));
          const py = liqY + 14 + ((i * 37 + 7) % Math.max(18, liqH - 24));
          ctx.beginPath();
          ctx.arc(px, py, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = '#2563eb';
          ctx.fill();
        }
      }

      fillStrokeRoundRect(ctx, bx, 64, bw, 44, 8, '#0f172a', phToIndicatorColor(currentPh), 2);
      ctx.font = 'bold 16px "JetBrains Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`pH = ${currentPh.toFixed(2)}`, bx + 16, 86);
      ctx.font = 'bold 12px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.fillText(
        currentPh < 6.95 ? '酸性 ([H₃O⁺] > [OH⁻])' : (currentPh > 7.05 ? '碱性 ([OH⁻] > [H₃O⁺])' : '中性 ([H₃O⁺] = [OH⁻])'),
        bx + bw - 14,
        86
      );

      fillStrokeRoundRect(ctx, bx, 402, bw, 122, 10, '#ffffff', '#cbd5e1', 1.2);
      drawCanvasSlider(ctx, ui, {
        id: 'slider_ph_direct',
        x: bx + 14,
        y: 430,
        w: bw - 28,
        label: '直接拖动 pH / [H₃O⁺] (My Solution)',
        value: currentPh,
        min: 0.00,
        max: 14.00,
        step: 0.05,
        color: phToIndicatorColor(currentPh),
        formatVal: (v) => `pH ${v.toFixed(2)}`,
        onChange: (val) => {
          state.mode = 'my-solution';
          state.customPh = val;
        }
      });

      drawCanvasButton(ctx, ui, {
        id: 'btn_phs_solute',
        x: bx + 14,
        y: 458,
        w: 80,
        h: 25,
        fontSize: 10.5,
        label: '+0.1L 原液',
        onClick: () => {
          if (state.mode === 'my-solution') state.mode = 'micro';
          if (vTot < 1.20) state.soluteVolL = Math.min(1.20 - state.waterVolL, state.soluteVolL + 0.10);
        }
      });
      drawCanvasButton(ctx, ui, {
        id: 'btn_phs_water',
        x: bx + 100,
        y: 458,
        w: 80,
        h: 25,
        fontSize: 10.5,
        label: '+0.1L 加水',
        active: true,
        activeBg: '#0284c7',
        onClick: () => {
          if (state.mode === 'my-solution') state.mode = 'micro';
          if (vTot < 1.20) state.waterVolL = Math.min(1.20 - state.soluteVolL, state.waterVolL + 0.10);
        }
      });
      drawCanvasButton(ctx, ui, {
        id: 'btn_phs_drain',
        x: bx + 186,
        y: 458,
        w: 78,
        h: 25,
        fontSize: 10.5,
        label: '-0.1L 放液',
        onClick: () => {
          if (vTot > 0.12) {
            const r = (vTot - 0.10) / vTot;
            state.soluteVolL *= r;
            state.waterVolL *= r;
          }
        }
      });

      drawCanvasCheckbox(ctx, ui, {
        id: 'chk_phs_ratio',
        x: bx + 14,
        y: 494,
        label: '显示烧杯内 H₃O⁺(红) / OH⁻(蓝) 离子微粒比',
        checked: state.showRatio,
        onChange: (v) => { state.showRatio = v; }
      });

      const rx = 608, ry = 64, rw = 276, rh = 460;
      fillStrokeRoundRect(ctx, rx, ry, rw, rh, 10, '#ffffff', '#cbd5e1', 1.2);
      ctx.font = 'bold 12.5px "Inter", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText('选择样品溶液 (点击切换并可加水稀释)', rx + 14, ry + 22);

      PH_LIQUIDS_DB.forEach((item, idx) => {
        const byRow = ry + 36 + idx * 34;
        drawCanvasButton(ctx, ui, {
          id: `phs_liq_${item.id}`,
          x: rx + 14,
          y: byRow,
          w: rw - 28,
          h: 29,
          fontSize: 11,
          label: `${item.name}  [pH ${item.ph0.toFixed(1)}]`,
          active: state.mode !== 'my-solution' && state.liquidId === item.id,
          activeBg: phToIndicatorColor(item.ph0),
          onClick: () => {
            if (state.mode === 'my-solution') state.mode = 'micro';
            this.onControlChange(state, 'liquidId', item.id);
          }
        });
      });
    }
  });

  window.registerSim('ph-scale', phScaleSim);

})();
