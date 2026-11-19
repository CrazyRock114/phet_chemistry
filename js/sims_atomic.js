/**
 * PhET Chemistry HTML5 Simulations - Group 1: Atomic & Nuclear Chemistry (7 Simulations)
 * File: /Users/crazyrock/gemini/phet_chemistry/js/sims_atomic.js
 *
 * Implements:
 * 1. 'build-an-atom'               (构建原子)
 * 2. 'isotopes-and-atomic-mass'    (同位素与原子质量)
 * 3. 'build-a-nucleus'             (构建原子核)
 * 4. 'rutherford-scattering'       (卢瑟福散射)
 * 5. 'models-of-the-hydrogen-atom' (氢原子模型)
 * 6. 'alpha-decay'                 (α衰变)
 * 7. 'beta-decay'                  (β衰变)
 */

(function () {
  'use strict';

  window.SIM_REGISTRY = window.SIM_REGISTRY || {};
  window.registerSim = window.registerSim || function (id, config) {
    window.SIM_REGISTRY[id] = config;
  };

  // ============================================================================
  // SHARED SCIENTIFIC CONSTANTS, DATABASES & UI RENDERING HELPERS
  // ============================================================================

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function normPointer(a, b, c, d) {
    if (typeof a === 'object' && a !== null) {
      return { x: Number(a.x) || 0, y: Number(a.y) || 0, state: b || {}, api: c };
    }
    return { x: Number(a) || 0, y: Number(b) || 0, state: c || {}, api: d };
  }

  function pointInRect(x, y, r) {
    return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function pointInCircle(x, y, cx, cy, rad) {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= rad * rad;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r || 8, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawPanel(ctx, x, y, w, h, title, opts = {}) {
    ctx.save();
    roundRect(ctx, x, y, w, h, opts.radius || 10);
    ctx.fillStyle = opts.bg || 'rgba(15, 23, 42, 0.86)';
    ctx.fill();
    ctx.lineWidth = opts.borderWidth || 1.2;
    ctx.strokeStyle = opts.border || 'rgba(148, 163, 184, 0.28)';
    ctx.stroke();

    if (title) {
      ctx.fillStyle = opts.headerBg || 'rgba(30, 41, 59, 0.9)';
      roundRect(ctx, x + 1, y + 1, w - 2, 28, 9);
      ctx.fill();
      ctx.fillStyle = opts.titleColor || '#e2e8f0';
      ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + 12, y + 15);
    }
    ctx.restore();
  }

  function drawButton(ctx, rect, label, active = false, color = '#3b82f6') {
    ctx.save();
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r || 6);
    ctx.fillStyle = active ? color : 'rgba(30, 41, 59, 0.92)';
    ctx.fill();
    ctx.lineWidth = active ? 1.6 : 1;
    ctx.strokeStyle = active ? '#93c5fd' : 'rgba(148, 163, 184, 0.4)';
    ctx.stroke();
    ctx.fillStyle = active ? '#ffffff' : '#cbd5e1';
    ctx.font = (rect.font || 'bold 12px') + ' -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
  }

  function drawSphere3D(ctx, x, y, r, baseColor, highlightColor, symbol, textColor = '#fff') {
    ctx.save();
    const grad = ctx.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.12, x, y, r);
    grad.addColorStop(0, highlightColor || '#ffffff');
    grad.addColorStop(0.35, baseColor);
    grad.addColorStop(1, '#090d16');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();

    if (symbol) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.max(8, Math.round(r * 1.05))}px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x, y + 0.5);
    }
    ctx.restore();
  }

  function wavelengthToRGB(nm) {
    if (nm < 380) return '#a855f7';
    if (nm > 750) return '#dc2626';
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) {
      r = -(nm - 440) / (440 - 380);
      b = 1;
    } else if (nm >= 440 && nm < 490) {
      g = (nm - 440) / (490 - 440);
      b = 1;
    } else if (nm >= 490 && nm < 510) {
      g = 1;
      b = -(nm - 510) / (510 - 490);
    } else if (nm >= 510 && nm < 580) {
      r = (nm - 510) / (580 - 510);
      g = 1;
    } else if (nm >= 580 && nm < 645) {
      r = 1;
      g = -(nm - 645) / (645 - 580);
    } else if (nm >= 645 && nm <= 750) {
      r = 1;
    }
    let factor = 1.0;
    if (nm >= 380 && nm < 420) factor = 0.35 + 0.65 * (nm - 380) / (420 - 380);
    else if (nm > 700 && nm <= 750) factor = 0.35 + 0.65 * (750 - nm) / (750 - 700);
    const R = Math.round(255 * Math.pow(r * factor, 0.85));
    const G = Math.round(255 * Math.pow(g * factor, 0.85));
    const B = Math.round(255 * Math.pow(b * factor, 0.85));
    return `rgb(${R},${G},${B})`;
  }

  const ELEMENTS_DB = {
    1:  { z: 1,  sym: 'H',  zh: '氢', en: 'Hydrogen',   period: 1, col: 1,  stdMass: 1.0080,  stableN: [0, 1] },
    2:  { z: 2,  sym: 'He', zh: '氦', en: 'Helium',     period: 1, col: 18, stdMass: 4.0026,  stableN: [1, 2] },
    3:  { z: 3,  sym: 'Li', zh: '锂', en: 'Lithium',    period: 2, col: 1,  stdMass: 6.9400,  stableN: [3, 4] },
    4:  { z: 4,  sym: 'Be', zh: '铍', en: 'Beryllium',  period: 2, col: 2,  stdMass: 9.0122,  stableN: [5] },
    5:  { z: 5,  sym: 'B',  zh: '硼', en: 'Boron',      period: 2, col: 13, stdMass: 10.810,  stableN: [5, 6] },
    6:  { z: 6,  sym: 'C',  zh: '碳', en: 'Carbon',     period: 2, col: 14, stdMass: 12.011,  stableN: [6, 7] },
    7:  { z: 7,  sym: 'N',  zh: '氮', en: 'Nitrogen',   period: 2, col: 15, stdMass: 14.007,  stableN: [7, 8] },
    8:  { z: 8,  sym: 'O',  zh: '氧', en: 'Oxygen',     period: 2, col: 16, stdMass: 15.999,  stableN: [8, 9, 10] },
    9:  { z: 9,  sym: 'F',  zh: '氟', en: 'Fluorine',   period: 2, col: 17, stdMass: 18.998,  stableN: [10] },
    10: { z: 10, sym: 'Ne', zh: '氖', en: 'Neon',       period: 2, col: 18, stdMass: 20.180,  stableN: [10, 11, 12] },
    11: { z: 11, sym: 'Na', zh: '钠', en: 'Sodium',     period: 3, col: 1,  stdMass: 22.990,  stableN: [12] },
    12: { z: 12, sym: 'Mg', zh: '镁', en: 'Magnesium',  period: 3, col: 2,  stdMass: 24.305,  stableN: [12, 13, 14] },
    13: { z: 13, sym: 'Al', zh: '铝', en: 'Aluminium',  period: 3, col: 13, stdMass: 26.982,  stableN: [14] },
    14: { z: 14, sym: 'Si', zh: '硅', en: 'Silicon',    period: 3, col: 14, stdMass: 28.085,  stableN: [14, 15, 16] },
    15: { z: 15, sym: 'P',  zh: '磷', en: 'Phosphorus', period: 3, col: 15, stdMass: 30.974,  stableN: [16] },
    16: { z: 16, sym: 'S',  zh: '硫', en: 'Sulfur',     period: 3, col: 16, stdMass: 32.060,  stableN: [16, 17, 18, 20] },
    17: { z: 17, sym: 'Cl', zh: '氯', en: 'Chlorine',   period: 3, col: 17, stdMass: 35.450,  stableN: [18, 20] },
    18: { z: 18, sym: 'Ar', zh: '氩', en: 'Argon',      period: 3, col: 18, stdMass: 39.948,  stableN: [18, 20, 22] },
    19: { z: 19, sym: 'K',  zh: '钾', en: 'Potassium',  period: 4, col: 1,  stdMass: 39.098,  stableN: [20, 22] },
    20: { z: 20, sym: 'Ca', zh: '钙', en: 'Calcium',    period: 4, col: 2,  stdMass: 40.078,  stableN: [20, 22, 23, 24] },
    29: { z: 29, sym: 'Cu', zh: '铜', en: 'Copper',     period: 4, col: 11, stdMass: 63.546,  stableN: [34, 36] }
  };

  function getNucleonPositions(Z, N, time, unstable) {
    const total = Z + N;
    const list = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    let pLeft = Z, nLeft = N;
    for (let i = 0; i < total; i++) {
      let isProton = false;
      if (pLeft > 0 && nLeft > 0) {
        isProton = (pLeft / (pLeft + nLeft)) >= ((i * 0.6180339887) % 1);
      } else {
        isProton = pLeft > 0;
      }
      if (isProton) pLeft--; else nLeft--;

      const r = total === 1 ? 0 : Math.sqrt(i + 0.4) * 5.6;
      const theta = i * goldenAngle;
      const jitterAmp = unstable ? 2.4 : 0.35;
      const jx = Math.sin(time * (unstable ? 26 : 3.5) + i * 1.9) * jitterAmp;
      const jy = Math.cos(time * (unstable ? 29 : 3.1) + i * 2.3) * jitterAmp;
      list.push({
        type: isProton ? 'p' : 'n',
        x: Math.cos(theta) * r + jx,
        y: Math.sin(theta) * r + jy,
        depth: Math.sin(theta + i * 0.5)
      });
    }
    return list.sort((a, b) => a.depth - b.depth);
  }

  // ============================================================================
  // 1. BUILD AN ATOM ('build-an-atom')
  // ============================================================================
  (function registerBuildAnAtom() {
    const defaultState = {
      mode: 'bohr',
      protons: 6,
      neutrons: 6,
      electrons: 6,
      showStable: true,
      showNeutralIon: true,
      time: 0,
      dragParticle: null,
      cloudDots: []
    };

    function syncState(state) {
      state.protons = clamp(Math.round(Number(state.protons) || 1), 1, 10);
      state.neutrons = clamp(Math.round(Number(state.neutrons ?? 6)), 0, 12);
      state.electrons = clamp(Math.round(Number(state.electrons ?? 6)), 0, 10);
      if (state.mode !== 'bohr' && state.mode !== 'cloud') state.mode = 'bohr';
      if (!Array.isArray(state.cloudDots) || state.cloudDots.length < 160) {
        state.cloudDots = [];
        for (let i = 0; i < 180; i++) {
          state.cloudDots.push({
            seed1: Math.random() * Math.PI * 2,
            seed2: Math.random(),
            shell: i < 45 ? 1 : 2
          });
        }
      }
    }

    function getAtomMetrics(state) {
      const Z = state.protons;
      const N = state.neutrons;
      const e = state.electrons;
      const A = Z + N;
      const q = Z - e;
      const el = ELEMENTS_DB[Z] || ELEMENTS_DB[1];
      const isStable = el.stableN.includes(N);
      const exactMass = A + (isStable ? -0.0008 * A : 0.0025 * Math.abs(N - Z));
      const kCount = Math.min(2, e);
      const lCount = Math.max(0, Math.min(8, e - 2));
      const chargeStr = q === 0 ? '0 (中性原子)' : (q > 0 ? `+${q} (阳离子)` : `${q} (阴离子)`);
      const symCharge = q === 0 ? '' : (q === 1 ? '+' : (q === -1 ? '-' : (q > 0 ? `${q}+` : `${Math.abs(q)}-`)));
      return { Z, N, e, A, q, el, isStable, exactMass, kCount, lCount, chargeStr, symCharge };
    }

    const UI_RECTS = {
      modeBohr:  { x: 24,  y: 52, w: 128, h: 28 },
      modeCloud: { x: 158, y: 52, w: 138, h: 28 },
      pMinus:    { x: 52,  y: 486, w: 28, h: 26 },
      pPlus:     { x: 140, y: 486, w: 28, h: 26 },
      nMinus:    { x: 212, y: 486, w: 28, h: 26 },
      nPlus:     { x: 300, y: 486, w: 28, h: 26 },
      eMinus:    { x: 372, y: 486, w: 28, h: 26 },
      ePlus:     { x: 460, y: 486, w: 28, h: 26 },
      bucketP:   { x: 46,  y: 416, w: 128, h: 64, type: 'p' },
      bucketN:   { x: 206, y: 416, w: 128, h: 64, type: 'n' },
      bucketE:   { x: 366, y: 416, w: 128, h: 64, type: 'e' }
    };

    window.registerSim('build-an-atom', {
      modes: [
        { id: 'bohr',  label: '玻尔壳层轨道 (K/L)', name: '玻尔壳层轨道 (K/L)' },
        { id: 'cloud', label: '量子概率电子云',     name: '量子概率电子云' }
      ],
      controls: [
        { id: 'protons',   key: 'protons',   label: '质子数 (Z)', name: '质子数 (Z)', type: 'range', min: 1, max: 10, step: 1, default: 6, value: 6, unit: '个' },
        { id: 'neutrons',  key: 'neutrons',  label: '中子数 (N)', name: '中子数 (N)', type: 'range', min: 0, max: 12, step: 1, default: 6, value: 6, unit: '个' },
        { id: 'electrons', key: 'electrons', label: '电子数 (e⁻)', name: '电子数 (e⁻)', type: 'range', min: 0, max: 10, step: 1, default: 6, value: 6, unit: '个' },
        { id: 'showStable', key: 'showStable', label: '显示核稳定性标识', name: '显示核稳定性标识', type: 'checkbox', default: true, value: true }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncState(state);
      },
      update(dt, state) {
        syncState(state);
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.time = (state.time || 0) + safeDt;
      },
      render(ctx, width, height, state) {
        syncState(state);
        const W = width || 900;
        const H = height || 540;
        const m = getAtomMetrics(state);

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0b1120');
        bg.addColorStop(1, '#111827');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('构建原子 (Build an Atom) — 核子组装、壳层排布与核素符号', 24, 30);

        drawButton(ctx, UI_RECTS.modeBohr, '玻尔轨道模型 (K/L)', state.mode === 'bohr', '#2563eb');
        drawButton(ctx, UI_RECTS.modeCloud, '量子电子云模型 (1s/2p)', state.mode === 'cloud', '#7c3aed');

        const cx = 270;
        const cy = 242;
        const rK = 76;
        const rL = 136;

        const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 165);
        glow.addColorStop(0, m.isStable ? 'rgba(59, 130, 246, 0.18)' : 'rgba(239, 68, 68, 0.24)');
        glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 165, 0, Math.PI * 2);
        ctx.fill();

        if (state.mode === 'bohr') {
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(cx, cy, rK, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, rL, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`K层 (${m.kCount}/2)`, cx, cy - rK - 7);
          ctx.fillText(`L层 (${m.lCount}/8)`, cx, cy - rL - 7);

          for (let i = 0; i < m.kCount; i++) {
            const ang = state.time * 1.9 + i * Math.PI;
            const ex = cx + Math.cos(ang) * rK;
            const ey = cy + Math.sin(ang) * rK;
            drawSphere3D(ctx, ex, ey, 7.5, '#38bdf8', '#e0f2fe', '-');
          }
          for (let i = 0; i < m.lCount; i++) {
            const ang = -state.time * 1.15 + (i * Math.PI * 2) / Math.max(1, m.lCount);
            const ex = cx + Math.cos(ang) * rL;
            const ey = cy + Math.sin(ang) * rL;
            drawSphere3D(ctx, ex, ey, 7.5, '#38bdf8', '#e0f2fe', '-');
          }
        } else {
          ctx.save();
          if (m.kCount > 0) {
            const g1 = ctx.createRadialGradient(cx, cy, 4, cx, cy, rK * 1.15);
            g1.addColorStop(0, `rgba(56, 189, 248, ${0.18 * m.kCount})`);
            g1.addColorStop(0.6, `rgba(56, 189, 248, ${0.08 * m.kCount})`);
            g1.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(cx, cy, rK * 1.15, 0, Math.PI * 2);
            ctx.fill();
          }
          if (m.lCount > 0) {
            const g2 = ctx.createRadialGradient(cx, cy, rK * 0.6, cx, cy, rL * 1.18);
            g2.addColorStop(0, 'rgba(129, 140, 248, 0)');
            g2.addColorStop(0.55, `rgba(56, 189, 248, ${0.045 * m.lCount})`);
            g2.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(cx, cy, rL * 1.18, 0, Math.PI * 2);
            ctx.fill();
          }
          state.cloudDots.forEach((d, idx) => {
            if (d.shell === 1 && m.kCount === 0) return;
            if (d.shell === 2 && m.lCount === 0) return;
            const maxPts = d.shell === 1 ? m.kCount * 22 : m.lCount * 16;
            if ((idx % 140) > maxPts) return;
            const baseR = d.shell === 1 ? 18 + d.seed2 * 52 : 68 + d.seed2 * 68;
            const a = d.seed1 + state.time * (d.shell === 1 ? 2.4 : -1.3) + Math.sin(state.time * 4 + idx) * 0.4;
            const r = baseR + Math.cos(state.time * 5 + idx * 1.7) * 6;
            ctx.fillStyle = d.shell === 1 ? 'rgba(125, 211, 252, 0.78)' : 'rgba(56, 189, 248, 0.62)';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.3, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`电子云概率密度 |ψ|² (1s: ${m.kCount}e⁻, 2s/2p: ${m.lCount}e⁻)`, cx, cy - rL - 10);
          ctx.restore();
        }

        const nucleons = getNucleonPositions(m.Z, m.N, state.time, !m.isStable);
        nucleons.forEach((nuc) => {
          if (nuc.type === 'p') {
            drawSphere3D(ctx, cx + nuc.x, cy + nuc.y, 8.8, '#ef4444', '#fca5a5', '+');
          } else {
            drawSphere3D(ctx, cx + nuc.x, cy + nuc.y, 8.8, '#64748b', '#cbd5e1', '');
          }
        });

        if (!m.isStable && state.showStable) {
          const pulse = (state.time * 2.5) % 1;
          ctx.save();
          ctx.strokeStyle = `rgba(248, 113, 113, ${1 - pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 22 + pulse * 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`${m.el.zh} (${m.el.en}, ${m.el.sym}-${m.A})`, cx, 102);

        const ionColor = m.q === 0 ? '#10b981' : (m.q > 0 ? '#f59e0b' : '#38bdf8');
        ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = ionColor;
        ctx.fillText(m.chargeStr, cx, 122);

        if (state.showStable) {
          ctx.fillStyle = m.isStable ? '#34d399' : '#f87171';
          ctx.fillText(m.isStable ? '● 原子核稳定 (Stable Nucleus)' : '⚠ 原子核不稳定 (Unstable / Radioactive)', cx, 396);
        }
        ctx.restore();

        const buckets = [
          { rect: UI_RECTS.bucketP, minus: UI_RECTS.pMinus, plus: UI_RECTS.pPlus, title: `质子桶 p⁺ (Z=${m.Z})`, color: '#ef4444', hi: '#fca5a5', sym: '+' },
          { rect: UI_RECTS.bucketN, minus: UI_RECTS.nMinus, plus: UI_RECTS.nPlus, title: `中子桶 n⁰ (N=${m.N})`, color: '#64748b', hi: '#cbd5e1', sym: '' },
          { rect: UI_RECTS.bucketE, minus: UI_RECTS.eMinus, plus: UI_RECTS.ePlus, title: `电子桶 e⁻ (e=${m.e})`, color: '#38bdf8', hi: '#e0f2fe', sym: '-' }
        ];
        buckets.forEach((b) => {
          drawPanel(ctx, b.rect.x, b.rect.y, b.rect.w, b.rect.h, null, { bg: 'rgba(30, 41, 59, 0.85)', radius: 10 });
          for (let k = 0; k < 5; k++) {
            drawSphere3D(ctx, b.rect.x + 28 + k * 18, b.rect.y + 24 + (k % 2) * 8, 7.5, b.color, b.hi, b.sym);
          }
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.title, b.rect.x + b.rect.w / 2, b.rect.y + 52);

          drawButton(ctx, b.minus, '−', false, '#475569');
          drawButton(ctx, b.plus, '+', true, b.color === '#64748b' ? '#475569' : b.color);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('点击或拖拽', b.rect.x + b.rect.w / 2, b.minus.y + 13);
        });

        drawPanel(ctx, 525, 45, 355, 168, '元素周期表定位 (点击元素快速切换 Z=1..10)');
        const ptX = 537;
        const ptY = 82;
        const cellW = 34;
        const cellH = 34;
        const colsMap = { 1: 0, 2: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6, 18: 7 };
        for (let z = 1; z <= 18; z++) {
          const el = ELEMENTS_DB[z];
          const cIdx = colsMap[el.col];
          const rIdx = el.period - 1;
          const cx0 = ptX + cIdx * (cellW + 4);
          const cy0 = ptY + rIdx * (cellH + 4);
          const isCurrent = z === m.Z;
          const isSelectable = z <= 10;

          roundRect(ctx, cx0, cy0, cellW, cellH, 5);
          ctx.fillStyle = isCurrent
            ? '#2563eb'
            : (isSelectable ? 'rgba(51, 65, 85, 0.9)' : 'rgba(30, 41, 59, 0.45)');
          ctx.fill();
          ctx.lineWidth = isCurrent ? 2 : 1;
          ctx.strokeStyle = isCurrent ? '#93c5fd' : 'rgba(148, 163, 184, 0.25)';
          ctx.stroke();

          ctx.fillStyle = isCurrent ? '#ffffff' : (isSelectable ? '#e2e8f0' : '#64748b');
          ctx.font = '9px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(String(z), cx0 + 3, cy0 + 9);
          ctx.font = 'bold 12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(el.sym, cx0 + cellW / 2, cy0 + 21);
          ctx.font = '8.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(el.zh, cx0 + cellW / 2, cy0 + 30);
        }

        drawPanel(ctx, 525, 225, 355, 145, '核素符号卡片 (Nuclear Symbol Card: ^A_Z X^q)');
        roundRect(ctx, 542, 262, 130, 94, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(String(m.A), 580, 290);
        ctx.fillStyle = '#f87171';
        ctx.fillText(String(m.Z), 580, 336);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(m.el.sym, 610, 316);

        ctx.textAlign = 'left';
        ctx.fillStyle = m.q === 0 ? '#34d399' : (m.q > 0 ? '#fbbf24' : '#38bdf8');
        ctx.font = 'bold 17px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(m.q === 0 ? '0' : m.symCharge, 640, 288);

        ctx.textAlign = 'left';
        ctx.font = '12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`• 质量数 A = Z + N = ${m.Z} + ${m.N} = ${m.A}`, 688, 278);
        ctx.fillStyle = '#f87171';
        ctx.fillText(`• 质子数 Z = ${m.Z} (${m.el.zh} ${m.el.sym})`, 688, 302);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`• 净电荷 q = Z − e⁻ = ${m.Z} − ${m.e} = ${m.q > 0 ? '+' + m.q : m.q}`, 688, 326);
        ctx.fillStyle = m.isStable ? '#34d399' : '#f87171';
        ctx.fillText(`• 稳定同位素 N ∈ {${m.el.stableN.join(', ')}}`, 688, 350);

        drawPanel(ctx, 525, 382, 355, 135, '质量数天平与净电荷仪表盘');
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`质量数 A = ${m.A} u (精确约 ${m.exactMass.toFixed(4)} amu)`, 542, 426);
        roundRect(ctx, 542, 434, 320, 14, 7);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        roundRect(ctx, 542, 434, clamp((m.A / 22) * 320, 8, 320), 14, 7);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`净电荷 q = ${m.q > 0 ? '+' + m.q : m.q} e  (${m.chargeStr})`, 542, 474);
        roundRect(ctx, 542, 482, 320, 14, 7);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        const midX = 542 + 160;
        const barW = clamp((m.q / 10) * 155, -155, 155);
        ctx.fillStyle = m.q >= 0 ? '#ef4444' : '#38bdf8';
        ctx.fillRect(barW >= 0 ? midX : midX + barW, 482, Math.abs(barW) || 3, 14);
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(midX, 479);
        ctx.lineTo(midX, 499);
        ctx.stroke();

        if (state.dragParticle) {
          const dp = state.dragParticle;
          if (dp.type === 'p') drawSphere3D(ctx, dp.x, dp.y, 11, '#ef4444', '#fca5a5', '+');
          else if (dp.type === 'n') drawSphere3D(ctx, dp.x, dp.y, 11, '#64748b', '#cbd5e1', '');
          else drawSphere3D(ctx, dp.x, dp.y, 10, '#38bdf8', '#e0f2fe', '-');
        }
      },
      getReadouts(state) {
        syncState(state);
        const m = getAtomMetrics(state);
        return [
          { id: 'element', label: '元素核素', name: '元素核素', value: `${m.el.sym}-${m.A} (${m.el.zh})`, unit: '' },
          { id: 'massA',   label: '质量数 (A=Z+N)', name: '质量数 (A=Z+N)', value: `${m.A} (Z=${m.Z}, N=${m.N})`, unit: 'u' },
          { id: 'chargeQ', label: '净电荷 (q=Z-e)', name: '净电荷 (q=Z-e)', value: m.q > 0 ? `+${m.q}` : `${m.q}`, unit: 'e' },
          { id: 'shells',  label: '壳层排布 (K/L)', name: '壳层排布 (K/L)', value: `K:${m.kCount}, L:${m.lCount}`, unit: '' },
          { id: 'stable',  label: '核稳定性', name: '核稳定性', value: m.isStable ? '稳定 (Stable)' : '不稳定 (Unstable)', unit: '' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncState(state);

        if (pointInRect(x, y, UI_RECTS.modeBohr)) { state.mode = 'bohr'; return; }
        if (pointInRect(x, y, UI_RECTS.modeCloud)) { state.mode = 'cloud'; return; }

        if (pointInRect(x, y, UI_RECTS.pMinus)) { state.protons = clamp(state.protons - 1, 1, 10); return; }
        if (pointInRect(x, y, UI_RECTS.pPlus))  { state.protons = clamp(state.protons + 1, 1, 10); return; }
        if (pointInRect(x, y, UI_RECTS.nMinus)) { state.neutrons = clamp(state.neutrons - 1, 0, 12); return; }
        if (pointInRect(x, y, UI_RECTS.nPlus))  { state.neutrons = clamp(state.neutrons + 1, 0, 12); return; }
        if (pointInRect(x, y, UI_RECTS.eMinus)) { state.electrons = clamp(state.electrons - 1, 0, 10); return; }
        if (pointInRect(x, y, UI_RECTS.ePlus))  { state.electrons = clamp(state.electrons + 1, 0, 10); return; }

        if (pointInRect(x, y, UI_RECTS.bucketP)) { state.dragParticle = { type: 'p', x, y }; return; }
        if (pointInRect(x, y, UI_RECTS.bucketN)) { state.dragParticle = { type: 'n', x, y }; return; }
        if (pointInRect(x, y, UI_RECTS.bucketE)) { state.dragParticle = { type: 'e', x, y }; return; }

        const ptX = 537, ptY = 82, cellW = 34, cellH = 34;
        const colsMap = { 1: 0, 2: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6, 18: 7 };
        for (let z = 1; z <= 10; z++) {
          const el = ELEMENTS_DB[z];
          const cx0 = ptX + colsMap[el.col] * (cellW + 4);
          const cy0 = ptY + (el.period - 1) * (cellH + 4);
          if (pointInRect(x, y, { x: cx0, y: cy0, w: cellW, h: cellH })) {
            state.protons = z;
            state.neutrons = el.stableN[0];
            state.electrons = z;
            return;
          }
        }
      },
      onPointerMove(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        if (state.dragParticle) {
          state.dragParticle.x = x;
          state.dragParticle.y = y;
        }
      },
      onPointerUp(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        if (state.dragParticle) {
          const dp = state.dragParticle;
          if (pointInCircle(x, y, 270, 242, 165) || y < 415) {
            if (dp.type === 'p') state.protons = clamp(state.protons + 1, 1, 10);
            if (dp.type === 'n') state.neutrons = clamp(state.neutrons + 1, 0, 12);
            if (dp.type === 'e') state.electrons = clamp(state.electrons + 1, 0, 10);
          } else {
            if (dp.type === 'p') state.protons = clamp(state.protons + 1, 1, 10);
            if (dp.type === 'n') state.neutrons = clamp(state.neutrons + 1, 0, 12);
            if (dp.type === 'e') state.electrons = clamp(state.electrons + 1, 0, 10);
          }
          state.dragParticle = null;
        }
      }
    });
  })();

  // ============================================================================
  // 2. ISOTOPES AND ATOMIC MASS ('isotopes-and-atomic-mass')
  // ============================================================================
  (function registerIsotopesAndAtomicMass() {
    const ISOTOPE_ELEMENTS = {
      H: {
        z: 1, sym: 'H', zh: '氢', stdWeight: 1.00794,
        defaultN: 0,
        mixPair: [1, 2],
        isotopes: {
          1: { A: 1, N: 0, mass: 1.00783, abundance: 99.9885, stable: true,  name: '氕 (Protium)' },
          2: { A: 2, N: 1, mass: 2.01410, abundance: 0.0115,  stable: true,  name: '氘 (Deuterium)' },
          3: { A: 3, N: 2, mass: 3.01605, abundance: 0.0000,  stable: false, name: '氚 (Tritium, β⁻)' }
        }
      },
      He: {
        z: 2, sym: 'He', zh: '氦', stdWeight: 4.00260,
        defaultN: 2,
        mixPair: [3, 4],
        isotopes: {
          3: { A: 3, N: 1, mass: 3.01603, abundance: 0.0001,  stable: true,  name: '氦-3' },
          4: { A: 4, N: 2, mass: 4.00260, abundance: 99.9999, stable: true,  name: '氦-4' },
          5: { A: 5, N: 3, mass: 5.01222, abundance: 0,       stable: false, name: '氦-5 (n发射)' }
        }
      },
      Li: {
        z: 3, sym: 'Li', zh: '锂', stdWeight: 6.9400,
        defaultN: 4,
        mixPair: [6, 7],
        isotopes: {
          6: { A: 6, N: 3, mass: 6.01512, abundance: 7.59,  stable: true,  name: '锂-6' },
          7: { A: 7, N: 4, mass: 7.01600, abundance: 92.41, stable: true,  name: '锂-7' },
          8: { A: 8, N: 5, mass: 8.02249, abundance: 0,     stable: false, name: '锂-8 (β⁻)' }
        }
      },
      B: {
        z: 5, sym: 'B', zh: '硼', stdWeight: 10.811,
        defaultN: 6,
        mixPair: [10, 11],
        isotopes: {
          9:  { A: 9,  N: 4, mass: 9.01333,  abundance: 0,    stable: false, name: '硼-9 (p发射)' },
          10: { A: 10, N: 5, mass: 10.01294, abundance: 19.9, stable: true,  name: '硼-10' },
          11: { A: 11, N: 6, mass: 11.00931, abundance: 80.1, stable: true,  name: '硼-11' }
        }
      },
      C: {
        z: 6, sym: 'C', zh: '碳', stdWeight: 12.0107,
        defaultN: 6,
        mixPair: [12, 13],
        isotopes: {
          12: { A: 12, N: 6, mass: 12.00000, abundance: 98.93, stable: true,  name: '碳-12 (基准)' },
          13: { A: 13, N: 7, mass: 13.00335, abundance: 1.07,  stable: true,  name: '碳-13' },
          14: { A: 14, N: 8, mass: 14.00324, abundance: 0,     stable: false, name: '碳-14 (β⁻, 5730y)' }
        }
      },
      N: {
        z: 7, sym: 'N', zh: '氮', stdWeight: 14.0067,
        defaultN: 7,
        mixPair: [14, 15],
        isotopes: {
          13: { A: 13, N: 6, mass: 13.00574, abundance: 0,      stable: false, name: '氮-13 (β⁺)' },
          14: { A: 14, N: 7, mass: 14.00307, abundance: 99.636, stable: true,  name: '氮-14' },
          15: { A: 15, N: 8, mass: 15.00011, abundance: 0.364,  stable: true,  name: '氮-15' }
        }
      },
      O: {
        z: 8, sym: 'O', zh: '氧', stdWeight: 15.9994,
        defaultN: 8,
        mixPair: [16, 18],
        isotopes: {
          16: { A: 16, N: 8,  mass: 15.99491, abundance: 99.757, stable: true, name: '氧-16' },
          17: { A: 17, N: 9,  mass: 16.99913, abundance: 0.038,  stable: true, name: '氧-17' },
          18: { A: 18, N: 10, mass: 17.99916, abundance: 0.205,  stable: true, name: '氧-18' }
        }
      },
      Ne: {
        z: 10, sym: 'Ne', zh: '氖', stdWeight: 20.1797,
        defaultN: 10,
        mixPair: [20, 22],
        isotopes: {
          20: { A: 20, N: 10, mass: 19.99244, abundance: 90.48, stable: true, name: '氖-20' },
          21: { A: 21, N: 11, mass: 20.99385, abundance: 0.27,  stable: true, name: '氖-21' },
          22: { A: 22, N: 12, mass: 21.99139, abundance: 9.25,  stable: true, name: '氖-22' }
        }
      },
      Cl: {
        z: 17, sym: 'Cl', zh: '氯', stdWeight: 35.453,
        defaultN: 18,
        mixPair: [35, 37],
        isotopes: {
          35: { A: 35, N: 18, mass: 34.96885, abundance: 75.76, stable: true,  name: '氯-35' },
          36: { A: 36, N: 19, mass: 35.96831, abundance: 0,     stable: false, name: '氯-36 (β⁻)' },
          37: { A: 37, N: 20, mass: 36.96590, abundance: 24.24, stable: true,  name: '氯-37' }
        }
      },
      Cu: {
        z: 29, sym: 'Cu', zh: '铜', stdWeight: 63.546,
        defaultN: 34,
        mixPair: [63, 65],
        isotopes: {
          63: { A: 63, N: 34, mass: 62.92960, abundance: 69.15, stable: true,  name: '铜-63' },
          64: { A: 64, N: 35, mass: 63.92976, abundance: 0,     stable: false, name: '铜-64 (β⁺/β⁻)' },
          65: { A: 65, N: 36, mass: 64.92779, abundance: 30.85, stable: true,  name: '铜-65' }
        }
      }
    };

    const ELEMENT_KEYS = ['H', 'He', 'Li', 'B', 'C', 'N', 'O', 'Ne', 'Cl', 'Cu'];

    const defaultState = {
      mode: 'make',
      element: 'Cl',
      neutronDelta: 0,
      fraction1: 75.8,
      useNaturalMix: false,
      time: 0
    };

    function syncIsoState(state) {
      if (!ISOTOPE_ELEMENTS[state.element]) state.element = 'Cl';
      if (state.mode !== 'make' && state.mode !== 'mix') state.mode = 'make';
      state.neutronDelta = clamp(Math.round(Number(state.neutronDelta) || 0), -2, 3);
      state.fraction1 = clamp(Number(state.fraction1 ?? 75.8), 0, 100);
      const el = ISOTOPE_ELEMENTS[state.element];
      if (state.useNaturalMix) {
        const iso1 = el.isotopes[el.mixPair[0]];
        const iso2 = el.isotopes[el.mixPair[1]];
        const sum = (iso1.abundance + iso2.abundance) || 100;
        state.fraction1 = Number(((iso1.abundance / sum) * 100).toFixed(2));
      }
    }

    function getIsoMetrics(state) {
      const el = ISOTOPE_ELEMENTS[state.element];
      const N = Math.max(0, el.defaultN + state.neutronDelta);
      const A = el.z + N;
      const known = el.isotopes[A];
      const exactMass = known ? known.mass : (A + 0.0085 * Math.abs(N - el.defaultN));
      const abundance = known ? known.abundance : 0;
      const stable = known ? known.stable : false;
      const name = known ? known.name : `${el.zh}-${A} (人工不稳定核素)`;

      const [A1, A2] = el.mixPair;
      const iso1 = el.isotopes[A1];
      const iso2 = el.isotopes[A2];
      const f1 = state.fraction1 / 100;
      const f2 = 1 - f1;
      const avgMass = f1 * iso1.mass + f2 * iso2.mass;
      return { el, N, A, exactMass, abundance, stable, name, iso1, iso2, f1, f2, avgMass };
    }

    window.registerSim('isotopes-and-atomic-mass', {
      modes: [
        { id: 'make', label: '制备同位素 (Make Isotopes)', name: '制备同位素 (Make Isotopes)' },
        { id: 'mix',  label: '混合同位素 (Mix Isotopes)',  name: '混合同位素 (Mix Isotopes)' }
      ],
      controls: [
        {
          id: 'element', key: 'element', label: '选择元素', name: '选择元素', type: 'select', default: 'Cl', value: 'Cl',
          options: ELEMENT_KEYS.map((k) => ({
            value: k,
            label: `${ISOTOPE_ELEMENTS[k].sym} (${ISOTOPE_ELEMENTS[k].zh}, Z=${ISOTOPE_ELEMENTS[k].z})`,
            name: `${ISOTOPE_ELEMENTS[k].sym} (${ISOTOPE_ELEMENTS[k].zh})`
          }))
        },
        { id: 'neutronDelta', key: 'neutronDelta', label: '中子增减 (ΔN)', name: '中子增减 (ΔN)', type: 'range', min: -2, max: 3, step: 1, default: 0, value: 0, unit: '个' },
        { id: 'fraction1',    key: 'fraction1',    label: '同位素①丰度比例 f₁', name: '同位素①丰度比例 f₁', type: 'range', min: 0, max: 100, step: 0.5, default: 75.8, value: 75.8, unit: '%' },
        { id: 'useNaturalMix', key: 'useNaturalMix', label: '锁定自然界真实丰度', name: '锁定自然界真实丰度', type: 'checkbox', default: false, value: false }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncIsoState(state);
      },
      update(dt, state) {
        syncIsoState(state);
        state.time = (state.time || 0) + clamp(Number(dt) || 0.016, 0, 0.05);
      },
      render(ctx, width, height, state) {
        syncIsoState(state);
        const W = width || 900;
        const H = height || 540;
        const m = getIsoMetrics(state);

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('同位素与原子质量 (Isotopes and Atomic Mass) — 精确原子质量与加权丰度', 24, 28);

        drawButton(ctx, { x: 24, y: 44, w: 155, h: 28 }, '制备同位素 (Make)', state.mode === 'make', '#2563eb');
        drawButton(ctx, { x: 186, y: 44, w: 155, h: 28 }, '混合同位素 (Mix)', state.mode === 'mix', '#059669');

        ELEMENT_KEYS.forEach((k, idx) => {
          const el = ISOTOPE_ELEMENTS[k];
          const rx = 365 + idx * 51;
          const ry = 42;
          const active = state.element === k;
          drawButton(ctx, { x: rx, y: ry, w: 47, h: 32 }, `${el.sym}`, active, '#3b82f6');
          ctx.fillStyle = active ? '#e0f2fe' : '#94a3b8';
          ctx.font = '9px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(el.zh, rx + 23.5, ry + 26);
        });

        if (state.mode === 'make') {
          drawPanel(ctx, 24, 86, 460, 430, `同位素制备台与精密质谱天平 — ${m.el.zh} (${m.el.sym}, Z=${m.el.z})`);
          const cx = 254;
          const cy = 238;

          const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 105);
          halo.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
          halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(cx, cy, 105, 0, Math.PI * 2);
          ctx.fill();

          const displayZ = Math.min(m.el.z, 18);
          const displayN = Math.min(m.N, 22);
          const nucleons = getNucleonPositions(displayZ, displayN, state.time, !m.stable);
          nucleons.forEach((nuc) => {
            drawSphere3D(
              ctx,
              cx + nuc.x * 0.95,
              cy + nuc.y * 0.95,
              7.8,
              nuc.type === 'p' ? '#ef4444' : '#64748b',
              nuc.type === 'p' ? '#fca5a5' : '#cbd5e1',
              nuc.type === 'p' ? '+' : ''
            );
          });

          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 16px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`${m.el.sym}-${m.A}  (${m.name})`, cx, 134);
          ctx.fillStyle = m.stable ? '#34d399' : '#f87171';
          ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(m.stable ? `● 稳定同位素 | 质子 Z=${m.el.z}, 中子 N=${m.N}` : `⚠ 不稳定同位素 | 质子 Z=${m.el.z}, 中子 N=${m.N}`, cx, 155);

          ctx.fillStyle = '#475569';
          roundRect(ctx, cx - 105, 336, 210, 12, 5);
          ctx.fill();
          ctx.fillRect(cx - 18, 348, 36, 28);
          roundRect(ctx, cx - 135, 374, 270, 62, 10);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          roundRect(ctx, cx - 115, 384, 230, 42, 6);
          ctx.fillStyle = '#064e3b';
          ctx.fill();
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 21px "SFMono-Regular", Consolas, "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${m.exactMass.toFixed(5)} amu`, cx, 405);
          ctx.fillStyle = '#a7f3d0';
          ctx.font = '10.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`质量数 A = ${m.A} u | 质量亏损 Δm = ${(m.el.z * 1.007825 + m.N * 1.008665 - m.exactMass).toFixed(4)} u`, cx, 421);

          drawButton(ctx, { x: 84, y: 458, w: 145, h: 36 }, '− 移除 1 个中子 (n⁰)', false, '#475569');
          drawButton(ctx, { x: 256, y: 458, w: 145, h: 36 }, '+ 添加 1 个中子 (n⁰)', true, '#2563eb');

          drawPanel(ctx, 502, 86, 374, 430, '自然丰度饼图与同位素对比 (Natural Abundance)');

          const pieCx = 689;
          const pieCy = 228;
          const pieR = 82;
          const isoList = Object.values(m.el.isotopes);
          const palette = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
          let startAng = -Math.PI / 2;

          isoList.forEach((iso, idx) => {
            const frac = clamp(iso.abundance / 100, 0, 1);
            if (frac <= 0) return;
            const sweep = frac * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(pieCx, pieCy);
            ctx.arc(pieCx, pieCy, iso.A === m.A ? pieR + 6 : pieR, startAng, startAng + sweep);
            ctx.closePath();
            ctx.fillStyle = palette[idx % palette.length];
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.stroke();
            startAng += sweep;
          });

          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 14px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`当前核素 ${m.el.sym}-${m.A} 自然界丰度: ${m.abundance.toFixed(4)}%`, pieCx, 338);

          let rowY = 370;
          ctx.font = 'bold 12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'left';
          ctx.fillText('同位素', 524, rowY);
          ctx.fillText('精确质量 (amu)', 615, rowY);
          ctx.fillText('自然丰度 (%)', 745, rowY);

          isoList.forEach((iso, idx) => {
            rowY += 28;
            const isCurr = iso.A === m.A;
            if (isCurr) {
              roundRect(ctx, 518, rowY - 16, 342, 24, 5);
              ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
              ctx.fill();
            }
            ctx.fillStyle = palette[idx % palette.length];
            ctx.beginPath();
            ctx.arc(530, rowY - 4, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = isCurr ? '#ffffff' : '#cbd5e1';
            ctx.font = isCurr ? 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif' : '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
            ctx.fillText(`${m.el.sym}-${iso.A} (N=${iso.N})`, 542, rowY);
            ctx.fillText(`${iso.mass.toFixed(5)}`, 615, rowY);
            ctx.fillText(iso.abundance > 0 ? `${iso.abundance}%` : '痕量/不稳定', 745, rowY);
          });
        } else {
          drawPanel(ctx, 24, 86, 460, 430, `双同位素混合腔 (${m.el.sym}-${m.iso1.A} 与 ${m.el.sym}-${m.iso2.A})`);

          roundRect(ctx, 44, 128, 420, 250, 10);
          ctx.fillStyle = '#090d16';
          ctx.fill();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.stroke();

          const totalBalls = 40;
          const count1 = Math.round(m.f1 * totalBalls);
          for (let i = 0; i < totalBalls; i++) {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const bx = 82 + col * 48 + Math.sin(state.time * 2.1 + i) * 3.5;
            const by = 158 + row * 44 + Math.cos(state.time * 2.4 + i * 1.3) * 3.5;
            const isIso1 = i < count1;
            drawSphere3D(
              ctx,
              bx,
              by,
              14,
              isIso1 ? '#3b82f6' : '#10b981',
              isIso1 ? '#93c5fd' : '#6ee7b7',
              `${m.el.sym}-${isIso1 ? m.iso1.A : m.iso2.A}`
            );
          }

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`拖拽调节比例: ${m.el.sym}-${m.iso1.A}: ${state.fraction1.toFixed(1)}%  |  ${m.el.sym}-${m.iso2.A}: ${(100 - state.fraction1).toFixed(1)}%`, 46, 404);

          const barX = 46, barY = 418, barW = 416, barH = 18;
          roundRect(ctx, barX, barY, barW, barH, 9);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          if (m.f1 > 0) {
            roundRect(ctx, barX, barY, Math.max(12, barW * m.f1), barH, 9);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
          }
          const knobX = barX + barW * m.f1;
          ctx.beginPath();
          ctx.arc(knobX, barY + barH / 2, 12, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          drawButton(ctx, { x: 46, y: 458, w: 198, h: 36 }, '切换为自然界真实丰度', state.useNaturalMix, '#059669');
          drawButton(ctx, { x: 264, y: 458, w: 198, h: 36 }, '50% : 50% 等比例混合', !state.useNaturalMix && Math.abs(state.fraction1 - 50) < 0.2, '#2563eb');

          drawPanel(ctx, 502, 86, 374, 430, '平均相对原子质量计算 (M̄ = f₁m₁ + f₂m₂)');

          roundRect(ctx, 522, 128, 334, 122, 8);
          ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
          ctx.fill();
          ctx.fillStyle = '#93c5fd';
          ctx.font = 'bold 13px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`• 同位素① ${m.el.sym}-${m.iso1.A}: m₁ = ${m.iso1.mass.toFixed(5)} amu, f₁ = ${(m.f1 * 100).toFixed(2)}%`, 536, 154);
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText(`• 同位素② ${m.el.sym}-${m.iso2.A}: m₂ = ${m.iso2.mass.toFixed(5)} amu, f₂ = ${(m.f2 * 100).toFixed(2)}%`, 536, 180);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 14px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`M̄ = ${(m.f1).toFixed(4)}×${m.iso1.mass.toFixed(3)} + ${(m.f2).toFixed(4)}×${m.iso2.mass.toFixed(3)}`, 536, 210);
          ctx.font = 'bold 18px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(`当前混合平均质量 M̄ = ${m.avgMass.toFixed(4)} amu`, 536, 238);

          const scaleX = 540, scaleW = 300, scaleY = 330;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(scaleX, scaleY);
          ctx.lineTo(scaleX + scaleW, scaleY);
          ctx.stroke();

          drawSphere3D(ctx, scaleX, scaleY - 16, Math.max(8, 20 * m.f1), '#3b82f6', '#93c5fd', '');
          drawSphere3D(ctx, scaleX + scaleW, scaleY - 16, Math.max(8, 20 * m.f2), '#10b981', '#6ee7b7', '');

          ctx.textAlign = 'center';
          ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#93c5fd';
          ctx.fillText(`${m.iso1.mass.toFixed(2)} u`, scaleX, scaleY - 42);
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText(`${m.iso2.mass.toFixed(2)} u`, scaleX + scaleW, scaleY - 42);

          const tFulcrum = clamp((m.avgMass - m.iso1.mass) / ((m.iso2.mass - m.iso1.mass) || 1), 0, 1);
          const fx = scaleX + tFulcrum * scaleW;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(fx, scaleY + 2);
          ctx.lineTo(fx - 14, scaleY + 28);
          ctx.lineTo(fx + 14, scaleY + 28);
          ctx.closePath();
          ctx.fill();
          ctx.font = 'bold 13px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`▲ M̄ = ${m.avgMass.toFixed(4)} amu`, fx, scaleY + 46);

          const tNat = clamp((m.el.stdWeight - m.iso1.mass) / ((m.iso2.mass - m.iso1.mass) || 1), 0, 1);
          const nx = scaleX + tNat * scaleW;
          ctx.strokeStyle = '#34d399';
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(nx, scaleY - 26);
          ctx.lineTo(nx, scaleY + 62);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#34d399';
          ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`IUPAC 标准原子量: ${m.el.stdWeight} amu`, 689, 445);
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`与自然界标准偏差: ${(m.avgMass - m.el.stdWeight >= 0 ? '+' : '') + (m.avgMass - m.el.stdWeight).toFixed(4)} amu`, 689, 468);
        }
      },
      getReadouts(state) {
        syncIsoState(state);
        const m = getIsoMetrics(state);
        return [
          { id: 'iso',      label: '当前核素', name: '当前核素', value: `${m.el.sym}-${m.A} (${m.el.zh})`, unit: '' },
          { id: 'exactM',   label: '精确原子质量', name: '精确原子质量', value: m.exactMass.toFixed(5), unit: 'amu' },
          { id: 'natAbund', label: '自然界丰度', name: '自然界丰度', value: `${m.abundance.toFixed(4)}%`, unit: '' },
          { id: 'avgM',     label: '混合平均原子量 M̄', name: '混合平均原子量 M̄', value: m.avgMass.toFixed(4), unit: 'amu' },
          { id: 'stdM',     label: 'IUPAC 标准原子量', name: 'IUPAC 标准原子量', value: String(m.el.stdWeight), unit: 'amu' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncIsoState(state);

        if (pointInRect(x, y, { x: 24, y: 44, w: 155, h: 28 })) { state.mode = 'make'; return; }
        if (pointInRect(x, y, { x: 186, y: 44, w: 155, h: 28 })) { state.mode = 'mix'; return; }

        for (let i = 0; i < ELEMENT_KEYS.length; i++) {
          const rx = 365 + i * 51;
          if (pointInRect(x, y, { x: rx, y: 42, w: 47, h: 32 })) {
            state.element = ELEMENT_KEYS[i];
            state.neutronDelta = 0;
            const el = ISOTOPE_ELEMENTS[state.element];
            state.fraction1 = el.isotopes[el.mixPair[0]].abundance;
            return;
          }
        }

        if (state.mode === 'make') {
          if (pointInRect(x, y, { x: 84, y: 458, w: 145, h: 36 })) {
            state.neutronDelta = clamp(state.neutronDelta - 1, -2, 3);
            return;
          }
          if (pointInRect(x, y, { x: 256, y: 458, w: 145, h: 36 })) {
            state.neutronDelta = clamp(state.neutronDelta + 1, -2, 3);
            return;
          }
        } else {
          if (pointInRect(x, y, { x: 46, y: 406, w: 416, h: 36 })) {
            state.useNaturalMix = false;
            state.fraction1 = clamp(((x - 46) / 416) * 100, 0, 100);
            state._draggingMix = true;
            return;
          }
          if (pointInRect(x, y, { x: 46, y: 458, w: 198, h: 36 })) {
            state.useNaturalMix = !state.useNaturalMix;
            syncIsoState(state);
            return;
          }
          if (pointInRect(x, y, { x: 264, y: 458, w: 198, h: 36 })) {
            state.useNaturalMix = false;
            state.fraction1 = 50;
            return;
          }
        }
      },
      onPointerMove(a, b, c, d) {
        const { x, state } = normPointer(a, b, c, d);
        if (state._draggingMix && state.mode === 'mix') {
          state.useNaturalMix = false;
          state.fraction1 = clamp(((x - 46) / 416) * 100, 0, 100);
        }
      },
      onPointerUp(a, b, c, d) {
        const { state } = normPointer(a, b, c, d);
        state._draggingMix = false;
      }
    });
  })();

  // ============================================================================
  // 3. BUILD A NUCLEUS ('build-a-nucleus')
  // ============================================================================
  (function registerBuildANucleus() {
    function evaluateNuclide(Z, N) {
      const A = Z + N;
      const el = ELEMENTS_DB[Z] || ELEMENTS_DB[1];
      const stableNList = el.stableN || [Z];
      const isStable = stableNList.includes(N);

      if (Z === 4 && N === 4) {
        return {
          Z, N, A, el, isStable: false, mode: 'α 衰变 (2α)',
          halfLife: '8.19 × 10⁻¹⁷ s', color: '#eab308',
          daughterZ: 2, daughterN: 2, particleLabel: 'α (⁴₂He)',
          eq: '⁸₄Be → 2 ⁴₂He (α)'
        };
      }
      if (Z === 1 && N === 0) {
        return {
          Z, N, A, el, isStable: true, mode: '稳定 (Stable)',
          halfLife: '稳定 (∞)', color: '#10b981',
          daughterZ: 1, daughterN: 0, particleLabel: '无',
          eq: '¹₁H 稳定基态'
        };
      }

      if (isStable) {
        return {
          Z, N, A, el, isStable: true, mode: '稳定 (Stable)',
          halfLife: '稳定 (∞)', color: '#10b981',
          daughterZ: Z, daughterN: N, particleLabel: '无',
          eq: `${A}_${Z}${el.sym} 处于稳定核素带`
        };
      }

      const minStableN = Math.min(...stableNList);
      const maxStableN = Math.max(...stableNList);

      if (N < minStableN) {
        const deficit = minStableN - N;
        if (deficit >= 3 && Z > 1) {
          const dEl = ELEMENTS_DB[Z - 1] || ELEMENTS_DB[1];
          return {
            Z, N, A, el, isStable: false, mode: '质子发射 (p)',
            halfLife: '1.2 × 10⁻²¹ s', color: '#ef4444',
            daughterZ: Z - 1, daughterN: N, particleLabel: 'p⁺ (质子)',
            eq: `${A}_${Z}${el.sym} → ${A - 1}_${Z - 1}${dEl.sym} + p⁺`
          };
        }
        const dZ = Math.max(1, Z - 1);
        const dN = Math.min(25, N + 1);
        const dEl = ELEMENTS_DB[dZ] || ELEMENTS_DB[1];
        const hl = deficit === 1 ? (Z === 6 && N === 5 ? '20.34 min' : (Z === 7 && N === 6 ? '9.96 min' : '2.05 s')) : '0.18 s';
        return {
          Z, N, A, el, isStable: false, mode: 'β⁺ 衰变 / EC',
          halfLife: hl, color: '#f97316',
          daughterZ: dZ, daughterN: dN, particleLabel: 'e⁺ + νₑ',
          eq: `${A}_${Z}${el.sym} → ${A}_${dZ}${dEl.sym} + e⁺ + νₑ`
        };
      } else {
        const excess = N - maxStableN;
        if (excess >= 4 && N > 1) {
          return {
            Z, N, A, el, isStable: false, mode: '中子发射 (n)',
            halfLife: '8.5 × 10⁻²² s', color: '#06b6d4',
            daughterZ: Z, daughterN: N - 1, particleLabel: 'n⁰ (中子)',
            eq: `${A}_${Z}${el.sym} → ${A - 1}_${Z}${el.sym} + n⁰`
          };
        }
        const dZ = Math.min(20, Z + 1);
        const dN = Math.max(0, N - 1);
        const dEl = ELEMENTS_DB[dZ] || ELEMENTS_DB[20];
        let hl = excess === 1 ? '14.2 s' : '0.42 s';
        if (Z === 1 && N === 2) hl = '12.32 y (氚)';
        if (Z === 6 && N === 8) hl = '5730 y (¹⁴C)';
        return {
          Z, N, A, el, isStable: false, mode: 'β⁻ 衰变',
          halfLife: hl, color: '#3b82f6',
          daughterZ: dZ, daughterN: dN, particleLabel: 'e⁻ + ν̄ₑ',
          eq: `${A}_${Z}${el.sym} → ${A}_${dZ}${dEl.sym} + e⁻ + ν̄ₑ`
        };
      }
    }

    function calcBindingEnergyPerNucleon(Z, N) {
      const A = Z + N;
      if (A <= 1) return 0;
      if (Z === 1 && N === 1) return 1.112;
      if (Z === 1 && N === 2) return 2.827;
      if (Z === 2 && N === 1) return 2.573;
      if (Z === 2 && N === 2) return 7.074;
      const aV = 15.75, aS = 17.8, aC = 0.711, aA = 23.7;
      let delta = 0;
      if (Z % 2 === 0 && N % 2 === 0) delta = 11.2 / Math.sqrt(A);
      else if (Z % 2 === 1 && N % 2 === 1) delta = -11.2 / Math.sqrt(A);
      const B = aV * A - aS * Math.pow(A, 2 / 3) - aC * (Z * (Z - 1)) / Math.pow(A, 1 / 3) - aA * Math.pow(A - 2 * Z, 2) / A + delta;
      return clamp(B / A, 0, 8.8);
    }

    const defaultState = {
      mode: 'chart',
      protons: 6,
      neutrons: 8,
      time: 0,
      decayAnim: null
    };

    function syncNucState(state) {
      state.protons = clamp(Math.round(Number(state.protons) || 6), 1, 20);
      state.neutrons = clamp(Math.round(Number(state.neutrons ?? 8)), 0, 25);
      if (state.mode !== 'chart' && state.mode !== 'shells') state.mode = 'chart';
    }

    function triggerDecayStep(state) {
      const info = evaluateNuclide(state.protons, state.neutrons);
      if (info.isStable) return;
      state.decayAnim = {
        t: 0,
        label: info.particleLabel,
        color: info.color,
        eq: info.eq,
        vx: 165,
        vy: -75
      };
      state.protons = info.daughterZ;
      state.neutrons = info.daughterN;
    }

    const BTN_DECAY = { x: 42, y: 462, w: 196, h: 38 };
    const BTN_P_PLUS = { x: 254, y: 462, w: 46, h: 38 };
    const BTN_P_MINUS = { x: 304, y: 462, w: 46, h: 38 };
    const BTN_N_PLUS = { x: 360, y: 462, w: 46, h: 38 };
    const BTN_N_MINUS = { x: 410, y: 462, w: 46, h: 38 };

    window.registerSim('build-a-nucleus', {
      modes: [
        { id: 'chart',  label: 'N-Z 核素稳定带与能级视图', name: 'N-Z 核素稳定带与能级视图' },
        { id: 'shells', label: '核子幻数能级壳层详解',     name: '核子幻数能级壳层详解' }
      ],
      controls: [
        { id: 'protons',  key: 'protons',  label: '质子数 (Z)', name: '质子数 (Z)', type: 'range', min: 1, max: 20, step: 1, default: 6, value: 6, unit: '个' },
        { id: 'neutrons', key: 'neutrons', label: '中子数 (N)', name: '中子数 (N)', type: 'range', min: 0, max: 25, step: 1, default: 8, value: 8, unit: '个' },
        {
          id: 'triggerDecay', key: 'triggerDecay', label: '触发一次衰变 (Trigger Decay)', name: '触发一次衰变', type: 'button',
          action(state) { triggerDecayStep(state); },
          onClick(state) { triggerDecayStep(state); }
        }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncNucState(state);
      },
      update(dt, state) {
        syncNucState(state);
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.time = (state.time || 0) + safeDt;
        if (state.triggerDecay) {
          state.triggerDecay = false;
          triggerDecayStep(state);
        }
        if (state.decayAnim) {
          state.decayAnim.t += safeDt;
          if (state.decayAnim.t > 1.8) state.decayAnim = null;
        }
      },
      render(ctx, width, height, state) {
        syncNucState(state);
        const W = width || 900;
        const H = height || 540;
        const info = evaluateNuclide(state.protons, state.neutrons);
        const bPerA = calcBindingEnergyPerNucleon(state.protons, state.neutrons);

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('构建原子核 (Build a Nucleus) — 核力壳层、N-Z 稳定谷与放射性衰变通道', 24, 28);

        drawPanel(ctx, 24, 44, 448, 474, `原子核团簇与核能级壳层 — ${info.el.sym}-${info.A} (${info.el.zh})`);

        let recoilX = 0, recoilY = 0;
        if (state.decayAnim && state.decayAnim.t < 0.8) {
          const decayFactor = Math.exp(-state.decayAnim.t * 4);
          recoilX = -14 * decayFactor;
          recoilY = 7 * decayFactor;
        }
        const cx = 142 + recoilX;
        const cy = 175 + recoilY;

        const nucleons = getNucleonPositions(info.Z, info.N, state.time, !info.isStable);
        nucleons.forEach((nuc) => {
          drawSphere3D(
            ctx,
            cx + nuc.x * 0.9,
            cy + nuc.y * 0.9,
            7.8,
            nuc.type === 'p' ? '#ef4444' : '#64748b',
            nuc.type === 'p' ? '#fca5a5' : '#cbd5e1',
            nuc.type === 'p' ? '+' : ''
          );
        });

        if (state.decayAnim) {
          const da = state.decayAnim;
          const px = 142 + da.vx * da.t;
          const py = 175 + da.vy * da.t;
          ctx.save();
          ctx.strokeStyle = da.color;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(142, 175);
          ctx.lineTo(px, py);
          ctx.stroke();
          ctx.setLineDash([]);
          drawSphere3D(ctx, px, py, 10, da.color, '#ffffff', '★');
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`发射: ${da.label}`, px + 14, py + 4);
          ctx.restore();
        }

        const shellLevels = [
          { name: '1s₁/₂ (cap 2)',  cap: 2,  y: 256 },
          { name: '1p₃/₂+1p₁/₂ (6)', cap: 6,  y: 204 },
          { name: '1d+2s (cap 12)', cap: 12, y: 152 },
          { name: '1f₇/₂ (cap 8)',  cap: 8,  y: 102 }
        ];
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('核壳层能级 (质子 p⁺ / 中子 n⁰)', 355, 84);

        let pRem = info.Z;
        let nRem = info.N;
        shellLevels.forEach((lv) => {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(262, lv.y);
          ctx.lineTo(340, lv.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(368, lv.y);
          ctx.lineTo(446, lv.y);
          ctx.stroke();

          const pIn = Math.min(lv.cap, pRem);
          pRem = Math.max(0, pRem - pIn);
          for (let i = 0; i < pIn; i++) {
            drawSphere3D(ctx, 270 + (i % 6) * 12, lv.y - 6 - Math.floor(i / 6) * 11, 4.5, '#ef4444', '#fca5a5', '');
          }

          const nIn = Math.min(lv.cap, nRem);
          nRem = Math.max(0, nIn ? nRem - nIn : 0);
          for (let i = 0; i < nIn; i++) {
            drawSphere3D(ctx, 376 + (i % 6) * 12, lv.y - 6 - Math.floor(i / 6) * 11, 4.5, '#64748b', '#cbd5e1', '');
          }

          ctx.fillStyle = '#94a3b8';
          ctx.font = '9.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(lv.name, 354, lv.y + 13);
        });

        roundRect(ctx, 40, 290, 416, 155, 8);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fill();
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = 'bold 14px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`核素: ${info.el.sym}-${info.A} (Z=${info.Z}, N=${info.N})  |  比结合能 B/A ≈ ${bPerA.toFixed(2)} MeV/核子`, 54, 316);
        ctx.fillStyle = info.color;
        ctx.fillText(`主导通道: ${info.mode}   |   半衰期 t₁/₂: ${info.halfLife}`, 54, 342);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(`核反应方程: ${info.eq}`, 54, 368);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(`中质比 N/Z = ${(info.N / info.Z).toFixed(2)}  (轻核稳定带 N/Z ≈ 1.00 ~ 1.20)`, 54, 394);
        if (state.decayAnim) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`⚡ 已触发衰变: ${state.decayAnim.eq}`, 54, 422);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillText('提示: 点击下方“触发一次衰变”按钮或右侧 N-Z 网格格点可直接切换核素', 54, 422);
        }

        drawButton(ctx, BTN_DECAY, info.isStable ? '当前核素已稳定' : '⚡ 触发一次衰变 (Decay)', !info.isStable, info.color);
        drawButton(ctx, BTN_P_PLUS, 'Z+', true, '#ef4444');
        drawButton(ctx, BTN_P_MINUS, 'Z−', false, '#475569');
        drawButton(ctx, BTN_N_PLUS, 'N+', true, '#64748b');
        drawButton(ctx, BTN_N_MINUS, 'N−', false, '#475569');

        drawPanel(ctx, 486, 44, 390, 474, 'N-Z 核素稳定带图 (点击任意 (N, Z) 格点选定核素)');

        const gridX = 528;
        const gridY = 92;
        const cw = 12.6;
        const ch = 16.5;

        for (let z = 1; z <= 20; z++) {
          for (let n = 0; n <= 25; n++) {
            const cell = evaluateNuclide(z, n);
            const gx = gridX + n * cw;
            const gy = gridY + (20 - z) * ch;
            ctx.fillStyle = cell.isStable ? '#10b981' : cell.color;
            ctx.globalAlpha = cell.isStable ? 0.95 : 0.36;
            ctx.fillRect(gx, gy, cw - 1.2, ch - 1.2);
            ctx.globalAlpha = 1;

            if (z === info.Z && n === info.N) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2.2;
              ctx.strokeRect(gx - 1, gy - 1, cw + 0.8, ch + 0.8);
            }
          }
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(gridX + 1.5 * cw, gridY + 19.5 * ch);
        ctx.lineTo(gridX + 20.5 * cw, gridY + 0.5 * ch);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        for (let n = 0; n <= 25; n += 5) {
          ctx.fillText(String(n), gridX + n * cw + cw / 2, gridY + 20 * ch + 13);
        }
        ctx.fillText('中子数 N (0 → 25)', gridX + 13 * cw, gridY + 20 * ch + 28);

        ctx.textAlign = 'right';
        for (let z = 2; z <= 20; z += 2) {
          ctx.fillText(`${z}${ELEMENTS_DB[z].sym}`, gridX - 4, gridY + (20 - z) * ch + 11);
        }

        const legItems = [
          { label: '稳定核素', color: '#10b981' },
          { label: 'β⁻ 衰变 (富中子)', color: '#3b82f6' },
          { label: 'β⁺ / EC (富质子)', color: '#f97316' },
          { label: 'α 衰变', color: '#eab308' },
          { label: '质子发射 p', color: '#ef4444' },
          { label: '中子发射 n', color: '#06b6d4' }
        ];
        legItems.forEach((it, idx) => {
          const lx = 504 + (idx % 3) * 124;
          const ly = 468 + Math.floor(idx / 3) * 22;
          ctx.fillStyle = it.color;
          ctx.fillRect(lx, ly - 8, 10, 10);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(it.label, lx + 14, ly);
        });
      },
      getReadouts(state) {
        syncNucState(state);
        const info = evaluateNuclide(state.protons, state.neutrons);
        const bPerA = calcBindingEnergyPerNucleon(state.protons, state.neutrons);
        return [
          { id: 'nuclide',  label: '当前核素', name: '当前核素', value: `${info.el.sym}-${info.A} (Z=${info.Z}, N=${info.N})`, unit: '' },
          { id: 'decay',    label: '衰变通道', name: '衰变通道', value: info.mode, unit: '' },
          { id: 'halfLife', label: '半衰期 t₁/₂', name: '半衰期 t₁/₂', value: info.halfLife, unit: '' },
          { id: 'binding',  label: '比结合能 B/A', name: '比结合能 B/A', value: bPerA.toFixed(2), unit: 'MeV' },
          { id: 'eq',       label: '衰变方程', name: '衰变方程', value: info.eq, unit: '' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncNucState(state);

        if (pointInRect(x, y, BTN_DECAY)) { triggerDecayStep(state); return; }
        if (pointInRect(x, y, BTN_P_PLUS))  { state.protons = clamp(state.protons + 1, 1, 20); return; }
        if (pointInRect(x, y, BTN_P_MINUS)) { state.protons = clamp(state.protons - 1, 1, 20); return; }
        if (pointInRect(x, y, BTN_N_PLUS))  { state.neutrons = clamp(state.neutrons + 1, 0, 25); return; }
        if (pointInRect(x, y, BTN_N_MINUS)) { state.neutrons = clamp(state.neutrons - 1, 0, 25); return; }

        const gridX = 528, gridY = 92, cw = 12.6, ch = 16.5;
        if (x >= gridX && x <= gridX + 26 * cw && y >= gridY && y <= gridY + 20 * ch) {
          const n = clamp(Math.floor((x - gridX) / cw), 0, 25);
          const z = clamp(20 - Math.floor((y - gridY) / ch), 1, 20);
          state.protons = z;
          state.neutrons = n;
        }
      },
      onPointerMove() {},
      onPointerUp() {}
    });
  })();

  // ============================================================================
  // 4. RUTHERFORD SCATTERING ('rutherford-scattering')
  // ============================================================================
  (function registerRutherfordScattering() {
    const KE_E2 = 1.4399645;

    const defaultState = {
      mode: 'rutherford-single',
      alphaEnergy: 5.0,
      targetZ: 79,
      beamOn: true,
      showTraces: true,
      time: 0,
      spawnTimer: 0,
      particles: [],
      stats: { total: 0, bins: [0, 0, 0, 0] }
    };

    function syncRutherford(state) {
      if (!['rutherford-single', 'rutherford-foil', 'plum-pudding'].includes(state.mode)) {
        state.mode = 'rutherford-single';
      }
      state.alphaEnergy = clamp(Number(state.alphaEnergy) || 5.0, 2.0, 10.0);
      state.targetZ = clamp(Math.round(Number(state.targetZ) || 79), 20, 100);
      if (!Array.isArray(state.particles)) state.particles = [];
      if (!state.stats || !Array.isArray(state.stats.bins)) {
        state.stats = { total: 0, bins: [0, 0, 0, 0] };
      }
    }

    function spawnAlphaWave(state) {
      const impactList = state.mode === 'rutherford-foil'
        ? [-155, -120, -86, -52, -18, 16, 50, 84, 118, 152]
        : [-140, -95, -55, -26, -9, 8, 25, 55, 95, 140];
      const baseSpeed = 230 * Math.sqrt(state.alphaEnergy / 5.0);
      const jitter = (Math.random() - 0.5) * 8;
      impactList.forEach((bOffset) => {
        if (state.particles.length > 110) state.particles.shift();
        const y0 = 278 + bOffset + jitter;
        state.particles.push({
          x: 42,
          y: y0,
          y0,
          vx: baseSpeed,
          vy: 0,
          counted: false,
          history: [{ x: 42, y: y0 }]
        });
      });
    }

    window.registerSim('rutherford-scattering', {
      modes: [
        { id: 'rutherford-single', label: '卢瑟福单核放大视图', name: '卢瑟福单核放大视图' },
        { id: 'rutherford-foil',   label: '卢瑟福多核金箔视图', name: '卢瑟福多核金箔视图' },
        { id: 'plum-pudding',      label: '汤姆孙葡萄干布丁模型', name: '汤姆孙葡萄干布丁模型' }
      ],
      controls: [
        { id: 'alphaEnergy', key: 'alphaEnergy', label: 'α粒子动能 (Eα)', name: 'α粒子动能 (Eα)', type: 'range', min: 2.0, max: 10.0, step: 0.5, default: 5.0, value: 5.0, unit: 'MeV' },
        { id: 'targetZ',     key: 'targetZ',     label: '靶核质子数 (Z)', name: '靶核质子数 (Z)', type: 'range', min: 20, max: 100, step: 1, default: 79, value: 79, unit: '' },
        { id: 'beamOn',      key: 'beamOn',      label: '开启 α 粒子束源', name: '开启 α 粒子束源', type: 'checkbox', default: true, value: true },
        { id: 'showTraces',  key: 'showTraces',  label: '显示双曲线散射轨迹', name: '显示双曲线散射轨迹', type: 'checkbox', default: true, value: true }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncRutherford(state);
        spawnAlphaWave(state);
      },
      update(dt, state) {
        syncRutherford(state);
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.time += safeDt;

        if (state.beamOn) {
          state.spawnTimer += safeDt;
          if (state.spawnTimer >= 0.55) {
            state.spawnTimer = 0;
            spawnAlphaWave(state);
          }
        }

        const centers = state.mode === 'rutherford-foil'
          ? [
              { x: 245, y: 155 }, { x: 245, y: 278 }, { x: 245, y: 401 },
              { x: 375, y: 216 }, { x: 375, y: 340 }
            ]
          : [{ x: 310, y: 278 }];

        const coulombStrength = 175000 * (state.targetZ / 79);
        const subSteps = 4;
        const subDt = safeDt / subSteps;

        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          for (let s = 0; s < subSteps; s++) {
            let ax = 0, ay = 0;
            if (state.mode === 'plum-pudding') {
              const dx = p.x - 310;
              const dy = p.y - 278;
              const r = Math.hypot(dx, dy);
              const R = 145;
              if (r < R && r > 1) {
                const weakField = 28 * (state.targetZ / 79) * (r / (R * R));
                ax += (dx / r) * weakField;
                ay += (dy / r) * weakField;
              }
            } else {
              for (let c = 0; c < centers.length; c++) {
                const dx = p.x - centers[c].x;
                const dy = p.y - centers[c].y;
                const r2 = Math.max(36, dx * dx + dy * dy);
                const r = Math.sqrt(r2);
                const f = coulombStrength / r2;
                ax += (dx / r) * f;
                ay += (dy / r) * f;
              }
            }
            p.vx += ax * subDt;
            p.vy += ay * subDt;
            p.x += p.vx * subDt;
            p.y += p.vy * subDt;
          }

          if (state.showTraces) {
            const last = p.history[p.history.length - 1];
            if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 5) {
              p.history.push({ x: p.x, y: p.y });
              if (p.history.length > 75) p.history.shift();
            }
          }

          if (!p.counted && (p.x > 520 || p.x < 35 || p.y < 95 || p.y > 475)) {
            p.counted = true;
            const deg = Math.abs(Math.atan2(p.vy, p.vx) * (180 / Math.PI));
            state.stats.total++;
            if (deg < 15) state.stats.bins[0]++;
            else if (deg < 45) state.stats.bins[1]++;
            else if (deg < 90) state.stats.bins[2]++;
            else state.stats.bins[3]++;
          }

          if (p.x > 555 || p.x < 20 || p.y < 75 || p.y > 505) {
            state.particles.splice(i, 1);
          }
        }
      },
      render(ctx, width, height, state) {
        syncRutherford(state);
        const W = width || 900;
        const H = height || 540;
        const d0_fm = (2 * 2 * state.targetZ * KE_E2) / state.alphaEnergy;

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('卢瑟福 α 粒子散射实验 (Rutherford Scattering) — 库仑双曲线轨道与模型对比', 24, 28);

        drawButton(ctx, { x: 24,  y: 44, w: 165, h: 28 }, '卢瑟福单原子核视图', state.mode === 'rutherford-single', '#2563eb');
        drawButton(ctx, { x: 196, y: 44, w: 165, h: 28 }, '卢瑟福多核金箔视图', state.mode === 'rutherford-foil', '#059669');
        drawButton(ctx, { x: 368, y: 44, w: 175, h: 28 }, '汤姆孙葡萄干布丁模型', state.mode === 'plum-pudding', '#d97706');
        drawButton(ctx, { x: 552, y: 44, w: 120, h: 28 }, state.beamOn ? '⏸ 暂停粒子束' : '▶ 开启粒子束', state.beamOn, '#dc2626');
        drawButton(ctx, { x: 680, y: 44, w: 110, h: 28 }, '清空统计数据', false, '#475569');

        drawPanel(ctx, 24, 82, 536, 436, '散射实验腔 (点击腔内任意高度可发射指定瞄准距 b 的测试 α 粒子)');

        ctx.save();
        ctx.beginPath();
        ctx.rect(26, 112, 532, 404);
        ctx.clip();

        if (state.mode === 'plum-pudding') {
          const puddingGrad = ctx.createRadialGradient(310, 278, 15, 310, 278, 145);
          puddingGrad.addColorStop(0, 'rgba(244, 63, 94, 0.32)');
          puddingGrad.addColorStop(0.8, 'rgba(244, 63, 94, 0.14)');
          puddingGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
          ctx.fillStyle = puddingGrad;
          ctx.beginPath();
          ctx.arc(310, 278, 145, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          const raisins = [
            [-75, -60], [0, -85], [75, -55], [-90, 10], [0, 0], [88, 12], [-65, 75], [12, 85], [72, 70]
          ];
          raisins.forEach(([rx, ry], idx) => {
            const jx = Math.sin(state.time * 4 + idx) * 2.5;
            const jy = Math.cos(state.time * 4.3 + idx) * 2.5;
            drawSphere3D(ctx, 310 + rx + jx, 278 + ry + jy, 6.5, '#38bdf8', '#e0f2fe', '-');
          });
          ctx.fillStyle = '#fda4af';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('均匀正电荷球体 + 镶嵌电子 (库仑场抵消，α粒子几乎无偏转 θ ≈ 0°)', 310, 456);
        } else if (state.mode === 'rutherford-foil') {
          const centers = [
            { x: 245, y: 155 }, { x: 245, y: 278 }, { x: 245, y: 401 },
            { x: 375, y: 216 }, { x: 375, y: 340 }
          ];
          centers.forEach((c) => {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.18)';
            ctx.beginPath();
            ctx.arc(c.x, c.y, 54, 0, Math.PI * 2);
            ctx.stroke();
            drawSphere3D(ctx, c.x, c.y, 9.5, '#f59e0b', '#fef08a', `+${state.targetZ}`);
          });
        } else {
          const nx = 310, ny = 278;
          const d0Px = clamp(d0_fm * 0.85, 16, 95);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(nx, ny, d0Px, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`最短距离 d₀ = ${d0_fm.toFixed(1)} fm`, nx, ny + d0Px + 14);

          drawSphere3D(ctx, nx, ny, 14, '#f59e0b', '#fef08a', `+${state.targetZ}`);
        }

        state.particles.forEach((p) => {
          if (state.showTraces && p.history.length > 1) {
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let k = 1; k < p.history.length; k++) {
              ctx.lineTo(p.history[k].x, p.history[k].y);
            }
            ctx.stroke();
          }
          drawSphere3D(ctx, p.x, p.y, 5.5, '#a855f7', '#f3e8ff', 'α');
        });
        ctx.restore();

        drawPanel(ctx, 574, 82, 302, 436, '库仑散射公式与散射角分布统计');

        roundRect(ctx, 590, 120, 270, 128, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('• 库仑排斥力: F = k Z₁Z₂e² / r²', 602, 144);
        ctx.fillStyle = '#93c5fd';
        ctx.fillText('• 散射角公式: tan(θ/2) = d₀ / (2b)', 602, 168);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`• 对心最短距离 d₀ = ${d0_fm.toFixed(2)} fm`, 602, 192);
        ctx.fillStyle = '#c084fc';
        ctx.fillText('• 微分截面 dσ/dΩ ∝ (Z₁Z₂/Eα)² csc⁴(θ/2)', 602, 216);
        ctx.fillStyle = '#34d399';
        ctx.fillText(`• 累计探测 α 粒子总数: N = ${state.stats.total}`, 602, 238);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('散射角区间统计 N(θ):', 590, 274);

        const binLabels = [
          '0° ~ 15° (小角透射)',
          '15° ~ 45° (中角偏转)',
          '45° ~ 90° (大角散射)',
          '90° ~ 180° (背散射反弹)'
        ];
        const binColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
        const total = Math.max(1, state.stats.total);

        binLabels.forEach((lbl, idx) => {
          const count = state.stats.bins[idx];
          const pct = (count / total) * 100;
          const by = 294 + idx * 52;
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${lbl}: ${count} (${pct.toFixed(1)}%)`, 590, by);

          roundRect(ctx, 590, by + 7, 266, 14, 6);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          if (count > 0) {
            roundRect(ctx, 590, by + 7, clamp((pct / 100) * 266, 6, 266), 14, 6);
            ctx.fillStyle = binColors[idx];
            ctx.fill();
          }
        });
      },
      getReadouts(state) {
        syncRutherford(state);
        const d0_fm = (2 * 2 * state.targetZ * KE_E2) / state.alphaEnergy;
        const total = Math.max(1, state.stats.total);
        const backPct = ((state.stats.bins[3] / total) * 100).toFixed(1);
        return [
          { id: 'model',   label: '当前原子模型', name: '当前原子模型', value: state.mode === 'plum-pudding' ? '汤姆孙布丁模型' : '卢瑟福核式模型', unit: '' },
          { id: 'energy',  label: 'α粒子能量 Eα', name: 'α粒子能量 Eα', value: state.alphaEnergy.toFixed(1), unit: 'MeV' },
          { id: 'targetZ', label: '靶核质子数 Z₂', name: '靶核质子数 Z₂', value: `${state.targetZ}`, unit: '' },
          { id: 'd0',      label: '最短接近距离 d₀', name: '最短接近距离 d₀', value: d0_fm.toFixed(2), unit: 'fm' },
          { id: 'back',    label: '>90° 大角背散射率', name: '>90° 大角背散射率', value: `${backPct}% (${state.stats.bins[3]}/${state.stats.total})`, unit: '' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncRutherford(state);

        if (pointInRect(x, y, { x: 24,  y: 44, w: 165, h: 28 })) { state.mode = 'rutherford-single'; state.particles = []; return; }
        if (pointInRect(x, y, { x: 196, y: 44, w: 165, h: 28 })) { state.mode = 'rutherford-foil'; state.particles = []; return; }
        if (pointInRect(x, y, { x: 368, y: 44, w: 175, h: 28 })) { state.mode = 'plum-pudding'; state.particles = []; return; }
        if (pointInRect(x, y, { x: 552, y: 44, w: 120, h: 28 })) { state.beamOn = !state.beamOn; return; }
        if (pointInRect(x, y, { x: 680, y: 44, w: 110, h: 28 })) {
          state.stats = { total: 0, bins: [0, 0, 0, 0] };
          state.particles = [];
          return;
        }

        if (pointInRect(x, y, { x: 26, y: 112, w: 532, h: 404 })) {
          const baseSpeed = 230 * Math.sqrt(state.alphaEnergy / 5.0);
          state.particles.push({
            x: 42,
            y: clamp(y, 120, 480),
            y0: y,
            vx: baseSpeed,
            vy: 0,
            counted: false,
            history: [{ x: 42, y: clamp(y, 120, 480) }]
          });
        }
      },
      onPointerMove() {},
      onPointerUp() {}
    });
  })();

  // ============================================================================
  // 5. MODELS OF THE HYDROGEN ATOM ('models-of-the-hydrogen-atom')
  // ============================================================================
  (function registerModelsOfHydrogenAtom() {
    const H_MODELS = [
      { id: 'dalton',      short: '1. 道尔顿实心球',   label: '1. 道尔顿实心球模型 (Dalton)' },
      { id: 'thomson',     short: '2. 汤姆孙布丁',     label: '2. 汤姆孙葡萄干布丁模型 (Thomson)' },
      { id: 'rutherford',  short: '3. 卢瑟福坍缩轨道', label: '3. 卢瑟福经典坍缩轨道 (Rutherford)' },
      { id: 'bohr',        short: '4. 玻尔量子轨道',   label: '4. 玻尔量子化轨道 (Bohr)' },
      { id: 'debroglie',   short: '5. 德布罗意驻波',   label: '5. 德布罗意物质波驻波 (de Broglie)' },
      { id: 'schrodinger', short: '6. 薛定谔电子云',   label: '6. 薛定谔概率密度云 (Schrödinger)' }
    ];

    function calcTransitionWavelength(nHigh, nLow) {
      const dE = 13.6 * (1 / (nLow * nLow) - 1 / (nHigh * nHigh));
      return { dE, nm: 1239.84 / dE };
    }

    const RESONANT_WAVELENGTHS = [
      { nm: 121.6, nTo: 2, label: 'Ly-α (1→2, 10.20 eV)' },
      { nm: 102.6, nTo: 3, label: 'Ly-β (1→3, 12.09 eV)' },
      { nm: 97.2,  nTo: 4, label: 'Ly-γ (1→4, 12.75 eV)' },
      { nm: 656.3, nTo: 3, nFrom: 2, label: 'Hα (2→3, 1.89 eV)' },
      { nm: 486.1, nTo: 4, nFrom: 2, label: 'Hβ (2→4, 2.55 eV)' },
      { nm: 434.0, nTo: 5, nFrom: 2, label: 'Hγ (2→5, 2.86 eV)' }
    ];

    const defaultState = {
      mode: 'bohr',
      lightType: 'white',
      wavelength: 122,
      nLevel: 1,
      orbitalSub: '1s',
      levelTimer: 0,
      rutherfordRadius: 95,
      thomsonAmp: 0,
      time: 0,
      photonTimer: 0,
      photons: [],
      spectrumLines: [],
      lastTransition: '基态 n = 1 (E₁ = -13.60 eV)'
    };

    function syncHydrogen(state) {
      if (!H_MODELS.some((m) => m.id === state.mode)) state.mode = 'bohr';
      if (state.lightType !== 'white' && state.lightType !== 'mono') state.lightType = 'white';
      state.wavelength = clamp(Number(state.wavelength) || 122, 92, 780);
      state.nLevel = clamp(Math.round(Number(state.nLevel) || 1), 1, 5);
      if (!Array.isArray(state.photons)) state.photons = [];
      if (!Array.isArray(state.spectrumLines)) state.spectrumLines = [];
    }

    function recordEmission(state, nHigh, nLow) {
      const { dE, nm } = calcTransitionWavelength(nHigh, nLow);
      const series = nLow === 1 ? '紫外 Lyman' : (nLow === 2 ? '可见 Balmer' : '红外 Paschen');
      const existing = state.spectrumLines.find((item) => Math.abs(item.nm - nm) < 1.5);
      if (existing) {
        existing.count++;
        existing.lastTime = state.time;
      } else {
        state.spectrumLines.push({ nm, dE, nHigh, nLow, series, count: 1, lastTime: state.time });
      }
      state.lastTransition = `辐射跃迁 n=${nHigh} → n=${nLow}: 发射 λ=${nm.toFixed(1)} nm (${dE.toFixed(2)} eV, ${series})`;
      const ang = -Math.PI / 4 + (Math.random() - 0.5) * 0.9;
      state.photons.push({
        x: 245,
        y: 232,
        vx: Math.cos(ang) * 210,
        vy: Math.sin(ang) * 210,
        nm,
        emitted: true,
        absorbed: false
      });
    }

    window.registerSim('models-of-the-hydrogen-atom', {
      modes: H_MODELS.map((m) => ({ id: m.id, label: m.label, name: m.label })),
      controls: [
        {
          id: 'lightType', key: 'lightType', label: '光源模式', name: '光源模式', type: 'select', default: 'white', value: 'white',
          options: [
            { value: 'white', label: '复合白光 (含紫外/可见共振光子)', name: '复合白光' },
            { value: 'mono',  label: '单色可调波长激光 (Monochromatic)', name: '单色可调波长激光' }
          ]
        },
        { id: 'wavelength', key: 'wavelength', label: '单色光波长 (λ)', name: '单色光波长 (λ)', type: 'range', min: 92, max: 750, step: 1, default: 122, value: 122, unit: 'nm' },
        { id: 'nLevel',     key: 'nLevel',     label: '量子主能级 (n)', name: '量子主能级 (n)', type: 'range', min: 1, max: 5, step: 1, default: 1, value: 1, unit: '' }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncHydrogen(state);
      },
      update(dt, state) {
        syncHydrogen(state);
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.time += safeDt;

        if (state.mode === 'rutherford') {
          state.rutherfordRadius = Math.max(8, (state.rutherfordRadius || 95) - safeDt * 34);
          if (state.rutherfordRadius <= 9) {
            state.lastTransition = '经典电动力学辐射坍缩: 电子落入原子核 (点击重置激发)';
          }
        } else {
          state.rutherfordRadius = 95;
        }

        state.thomsonAmp = Math.max(0, (state.thomsonAmp || 0) * Math.exp(-safeDt * 1.4));

        if (['bohr', 'debroglie', 'schrodinger'].includes(state.mode) && state.nLevel > 1) {
          state.levelTimer = (state.levelTimer || 0) + safeDt;
          if (state.levelTimer > 1.35) {
            state.levelTimer = 0;
            const nHigh = state.nLevel;
            const nLow = (nHigh >= 3 && Math.random() < 0.65) ? 2 : 1;
            state.nLevel = nLow;
            state.orbitalSub = nLow === 1 ? '1s' : (nLow === 2 ? '2p' : '3d');
            recordEmission(state, nHigh, nLow);
          }
        }

        state.photonTimer += safeDt;
        if (state.photonTimer >= 0.42) {
          state.photonTimer = 0;
          let nm = state.wavelength;
          if (state.lightType === 'white') {
            const pick = RESONANT_WAVELENGTHS[Math.floor(Math.random() * RESONANT_WAVELENGTHS.length)];
            nm = Math.random() < 0.72 ? pick.nm : (110 + Math.random() * 580);
          }
          state.photons.push({
            x: 245 + (Math.random() - 0.5) * 26,
            y: 382,
            vx: 0,
            vy: -205,
            nm,
            emitted: false,
            absorbed: false
          });
        }

        for (let i = state.photons.length - 1; i >= 0; i--) {
          const ph = state.photons[i];
          ph.x += ph.vx * safeDt;
          ph.y += ph.vy * safeDt;

          const dist = Math.hypot(ph.x - 245, ph.y - 232);
          if (!ph.emitted && !ph.absorbed && dist < 24) {
            if (state.mode === 'dalton') {
              ph.vy = Math.abs(ph.vy) * 0.7;
              ph.vx = (ph.x >= 245 ? 1 : -1) * 165;
              ph.emitted = true;
              state.lastTransition = '道尔顿实心球: 光子发生经典弹性散射，无内部能级跃迁';
            } else if (state.mode === 'thomson') {
              if (Math.abs(ph.nm - 121.6) < 12) {
                ph.absorbed = true;
                state.thomsonAmp = 28;
                recordEmission(state, 2, 1);
              }
            } else if (['bohr', 'debroglie', 'schrodinger'].includes(state.mode)) {
              let matchedTarget = null;
              for (let nT = state.nLevel + 1; nT <= 5; nT++) {
                const { nm: reqNm } = calcTransitionWavelength(nT, state.nLevel);
                if (Math.abs(ph.nm - reqNm) < 8.5) {
                  matchedTarget = { nT, reqNm };
                  break;
                }
              }
              if (matchedTarget) {
                ph.absorbed = true;
                const oldN = state.nLevel;
                state.nLevel = matchedTarget.nT;
                state.levelTimer = 0;
                state.orbitalSub = state.nLevel === 2 ? '2p' : (state.nLevel >= 3 ? '3d' : '1s');
                state.lastTransition = `吸收共振光子 λ=${matchedTarget.reqNm.toFixed(1)} nm: 跃迁 n=${oldN} → n=${state.nLevel}`;
              }
            }
          }

          if (ph.absorbed || ph.x < 20 || ph.x > 520 || ph.y < 80 || ph.y > 400) {
            state.photons.splice(i, 1);
          }
        }
      },
      render(ctx, width, height, state) {
        syncHydrogen(state);
        const W = width || 900;
        const H = height || 540;

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('氢原子模型演进与光谱仪 (Models of the Hydrogen Atom) — 6种历史与量子模型', 24, 28);

        H_MODELS.forEach((m, idx) => {
          drawButton(ctx, { x: 24 + idx * 143, y: 42, w: 138, h: 28 }, m.short, state.mode === m.id, '#2563eb');
        });

        const currentModelObj = H_MODELS.find((m) => m.id === state.mode) || H_MODELS[3];
        drawPanel(ctx, 24, 78, 445, 325, currentModelObj.label);

        const cx = 245;
        const cy = 232;
        const orbitRadii = [0, 26, 48, 72, 95, 116];

        if (state.mode === 'dalton') {
          drawSphere3D(ctx, cx, cy, 42, '#f59e0b', '#fef08a', 'H');
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('不可分割的实心弹性球体 (无内部亚原子结构与能级)', cx, 355);
        } else if (state.mode === 'thomson') {
          const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 58);
          g.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
          g.addColorStop(1, 'rgba(244, 63, 94, 0.08)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 58, 0, Math.PI * 2);
          ctx.fill();
          const ex = cx + Math.sin(state.time * 16) * (state.thomsonAmp || 3);
          drawSphere3D(ctx, ex, cy, 8, '#38bdf8', '#e0f2fe', '-');
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('均匀正电荷球内单电子简谐振动 (仅单一谐振频率)', cx, 355);
        } else if (state.mode === 'rutherford') {
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 10; a += 0.15) {
            const sr = 8 + (a / (Math.PI * 10)) * 90;
            const sx = cx + Math.cos(a) * sr;
            const sy = cy + Math.sin(a) * sr;
            if (a === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          drawSphere3D(ctx, cx, cy, 9, '#ef4444', '#fca5a5', '+');
          const rCurr = state.rutherfordRadius || 12;
          const ang = state.time * (450 / Math.max(12, rCurr));
          drawSphere3D(ctx, cx + Math.cos(ang) * rCurr, cy + Math.sin(ang) * rCurr, 7, '#38bdf8', '#e0f2fe', '-');
          drawButton(ctx, { x: 165, y: 342, w: 160, h: 26 }, '重置电子初始轨道', false, '#dc2626');
        } else if (state.mode === 'bohr') {
          for (let n = 1; n <= 5; n++) {
            ctx.save();
            ctx.setLineDash(n === state.nLevel ? [] : [4, 4]);
            ctx.strokeStyle = n === state.nLevel ? '#60a5fa' : 'rgba(148, 163, 184, 0.3)';
            ctx.lineWidth = n === state.nLevel ? 2 : 1;
            ctx.beginPath();
            ctx.arc(cx, cy, orbitRadii[n], 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          drawSphere3D(ctx, cx, cy, 8.5, '#ef4444', '#fca5a5', '+');
          const rN = orbitRadii[state.nLevel];
          const ang = state.time * (3.2 / state.nLevel);
          drawSphere3D(ctx, cx + Math.cos(ang) * rN, cy + Math.sin(ang) * rN, 7.5, '#38bdf8', '#e0f2fe', '-');
          ctx.fillStyle = '#93c5fd';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`玻尔量子化圆轨道: n = ${state.nLevel}, E_${state.nLevel} = ${(-13.6 / (state.nLevel * state.nLevel)).toFixed(2)} eV`, cx, 366);
        } else if (state.mode === 'debroglie') {
          for (let n = 1; n <= 5; n++) {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.beginPath();
            ctx.arc(cx, cy, orbitRadii[n], 0, Math.PI * 2);
            ctx.stroke();
          }
          drawSphere3D(ctx, cx, cy, 8.5, '#ef4444', '#fca5a5', '+');
          const rN = orbitRadii[state.nLevel];
          const amp = 9 * Math.sin(state.time * 9);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          for (let i = 0; i <= 180; i++) {
            const theta = (i / 180) * Math.PI * 2;
            const wr = rN + amp * Math.sin(state.nLevel * theta);
            const wx = cx + Math.cos(theta) * wr;
            const wy = cy + Math.sin(theta) * wr;
            if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`德布罗意驻波条件: 2πr = nλ (当前波节数 n = ${state.nLevel})`, cx, 366);
        } else if (state.mode === 'schrodinger') {
          drawSphere3D(ctx, cx, cy, 6.5, '#ef4444', '#fca5a5', '+');
          const sub = state.nLevel === 1 ? '1s' : (state.nLevel === 2 ? (state.orbitalSub === '2s' ? '2s' : '2p') : '3d');
          for (let i = 0; i < 220; i++) {
            const u = (i * 0.6180339887) % 1;
            const theta = i * 2.39996 + state.time * 0.4;
            let rad = 12 + u * 85;
            let prob = 1;
            if (sub === '1s') {
              rad = 8 + Math.pow(u, 0.7) * 42;
            } else if (sub === '2s') {
              rad = u < 0.35 ? 8 + u * 45 : 42 + u * 48;
            } else if (sub === '2p') {
              prob = Math.pow(Math.cos(theta), 2);
              rad = 18 + u * 72 * prob;
            } else {
              prob = Math.pow(Math.sin(2 * theta), 2);
              rad = 22 + u * 92 * prob;
            }
            if (prob > 0.12) {
              ctx.fillStyle = sub === '1s' ? 'rgba(56, 189, 248, 0.55)' : (sub === '2p' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(52, 211, 153, 0.6)');
              ctx.beginPath();
              ctx.arc(cx + Math.cos(theta) * rad, cy + Math.sin(theta) * rad, 2.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.fillStyle = '#c084fc';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`薛定谔波函数概率密度云 |ψ_${sub}|² (主量子数 n=${state.nLevel})`, cx, 366);
        }

        state.photons.forEach((ph) => {
          const col = wavelengthToRGB(ph.nm);
          ctx.save();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(ph.x, ph.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        });

        ctx.fillStyle = '#334155';
        roundRect(ctx, cx - 26, 376, 52, 22, 5);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.lightType === 'white' ? '白光光源' : `${state.wavelength}nm`, cx, 390);

        drawPanel(ctx, 482, 78, 394, 325, '氢原子能级图 (Eₙ = -13.6/n² eV) 与共振光源');

        const levelYMap = {
          1: 318,
          2: 222,
          3: 176,
          4: 148,
          5: 128
        };
        for (let n = 1; n <= 5; n++) {
          const ly = levelYMap[n];
          const eVal = (-13.6 / (n * n)).toFixed(2);
          const isCurr = n === state.nLevel;
          ctx.strokeStyle = isCurr ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)';
          ctx.lineWidth = isCurr ? 2.5 : 1.3;
          ctx.beginPath();
          ctx.moveTo(548, ly);
          ctx.lineTo(725, ly);
          ctx.stroke();

          ctx.fillStyle = isCurr ? '#38bdf8' : '#cbd5e1';
          ctx.font = isCurr ? 'bold 11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif' : '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`n=${n}`, 540, ly + 4);
          ctx.textAlign = 'left';
          ctx.fillText(`${eVal} eV`, 732, ly + 4);

          if (isCurr) {
            drawSphere3D(ctx, 636, ly, 7.5, '#38bdf8', '#e0f2fe', '-');
          }
        }

        const presets = [
          { label: '白光模式', type: 'white', y: 118 },
          { label: 'Ly-α 122nm (1→2)', nm: 122, y: 152 },
          { label: 'Ly-β 103nm (1→3)', nm: 103, y: 186 },
          { label: 'Hα 656nm (2→3)',  nm: 656, y: 220 },
          { label: 'Hβ 486nm (2→4)',  nm: 486, y: 254 },
          { label: '直接激发至 n=4',   excite: 4, y: 288 }
        ];
        presets.forEach((p) => {
          const active = (p.type === 'white' && state.lightType === 'white') ||
                         (p.nm && state.lightType === 'mono' && Math.abs(state.wavelength - p.nm) < 2);
          drawButton(ctx, { x: 785, y: p.y, w: 82, h: 26, font: 'bold 10px' }, p.label, active, '#3b82f6');
        });

        ctx.fillStyle = '#fbbf24';
        ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(state.lastTransition, 496, 384);

        drawPanel(ctx, 24, 412, 852, 112, '发射光谱仪 (紫外 Lyman 系 / 可见光 Balmer 系 / 红外 Paschen 系谱线累积)');

        const specX = 44, specY = 446, specW = 720, specH = 48;
        roundRect(ctx, specX, specY, specW, specH, 6);
        ctx.fillStyle = '#050811';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.stroke();

        const nmToSpecX = (nm) => {
          if (nm < 380) return specX + ((nm - 90) / (380 - 90)) * 240;
          if (nm <= 750) return specX + 240 + ((nm - 380) / (750 - 380)) * 300;
          return specX + 540 + clamp((nm - 750) / 1200, 0, 1) * 180;
        };

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.beginPath();
        ctx.moveTo(specX + 240, specY);
        ctx.lineTo(specX + 240, specY + specH);
        ctx.moveTo(specX + 540, specY);
        ctx.lineTo(specX + 540, specY + specH);
        ctx.stroke();

        const refLines = [
          { nm: 97.2 }, { nm: 102.6 }, { nm: 121.6 },
          { nm: 410.2 }, { nm: 434.0 }, { nm: 486.1 }, { nm: 656.3 },
          { nm: 1282 }, { nm: 1875 }
        ];
        refLines.forEach((rl) => {
          const lx = nmToSpecX(rl.nm);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.beginPath();
          ctx.moveTo(lx, specY + specH - 8);
          ctx.lineTo(lx, specY + specH);
          ctx.stroke();
        });

        state.spectrumLines.forEach((sl) => {
          const lx = nmToSpecX(sl.nm);
          const col = wavelengthToRGB(sl.nm);
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.min(5, 2 + sl.count * 0.5);
          ctx.beginPath();
          ctx.moveTo(lx, specY + 3);
          ctx.lineTo(lx, specY + specH - 3);
          ctx.stroke();
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '9.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(sl.nm)}nm`, lx, specY - 3);
          ctx.restore();
        });

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('紫外区 UV (Lyman 90~380 nm)', specX + 120, specY + specH + 15);
        ctx.fillText('可见光区 Visible (Balmer 380~750 nm)', specX + 390, specY + specH + 15);
        ctx.fillText('红外区 IR (Paschen >750 nm)', specX + 630, specY + specH + 15);

        drawButton(ctx, { x: 776, y: 454, w: 86, h: 34 }, '清空谱线', false, '#475569');
      },
      getReadouts(state) {
        syncHydrogen(state);
        const en = (-13.6 / (state.nLevel * state.nLevel)).toFixed(2);
        const rBohr = (state.nLevel * state.nLevel * 0.0529).toFixed(3);
        const currentModelObj = H_MODELS.find((m) => m.id === state.mode) || H_MODELS[3];
        return [
          { id: 'model', label: '当前原子模型', name: '当前原子模型', value: currentModelObj.short, unit: '' },
          { id: 'level', label: '主量子数 n 与能量 Eₙ', name: '主量子数 n 与能量 Eₙ', value: `n=${state.nLevel} (${en} eV)`, unit: '' },
          { id: 'rad',   label: '玻尔轨道半径 rₙ=n²a₀', name: '玻尔轨道半径 rₙ=n²a₀', value: rBohr, unit: 'nm' },
          { id: 'light', label: '入射光源', name: '入射光源', value: state.lightType === 'white' ? '复合白光' : `${state.wavelength} nm`, unit: '' },
          { id: 'lines', label: '已探测发射谱线数', name: '已探测发射谱线数', value: `${state.spectrumLines.length} 条`, unit: '' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncHydrogen(state);

        for (let i = 0; i < H_MODELS.length; i++) {
          if (pointInRect(x, y, { x: 24 + i * 143, y: 42, w: 138, h: 28 })) {
            state.mode = H_MODELS[i].id;
            state.rutherfordRadius = 95;
            return;
          }
        }

        if (state.mode === 'rutherford' && pointInRect(x, y, { x: 165, y: 342, w: 160, h: 26 })) {
          state.rutherfordRadius = 95;
          return;
        }

        if (pointInRect(x, y, { x: 785, y: 118, w: 82, h: 26 })) { state.lightType = 'white'; return; }
        if (pointInRect(x, y, { x: 785, y: 152, w: 82, h: 26 })) { state.lightType = 'mono'; state.wavelength = 122; return; }
        if (pointInRect(x, y, { x: 785, y: 186, w: 82, h: 26 })) { state.lightType = 'mono'; state.wavelength = 103; return; }
        if (pointInRect(x, y, { x: 785, y: 220, w: 82, h: 26 })) { state.lightType = 'mono'; state.wavelength = 656; state.nLevel = 2; return; }
        if (pointInRect(x, y, { x: 785, y: 254, w: 82, h: 26 })) { state.lightType = 'mono'; state.wavelength = 486; state.nLevel = 2; return; }
        if (pointInRect(x, y, { x: 785, y: 288, w: 82, h: 26 })) { state.nLevel = 4; state.levelTimer = 0; return; }

        const levelYMap = { 1: 318, 2: 222, 3: 176, 4: 148, 5: 128 };
        for (let n = 1; n <= 5; n++) {
          if (pointInRect(x, y, { x: 530, y: levelYMap[n] - 12, w: 220, h: 24 })) {
            state.nLevel = n;
            state.levelTimer = 0;
            return;
          }
        }

        if (pointInRect(x, y, { x: 776, y: 454, w: 86, h: 34 })) {
          state.spectrumLines = [];
        }
      },
      onPointerMove() {},
      onPointerUp() {}
    });
  })();

  // ============================================================================
  // 6. ALPHA DECAY ('alpha-decay')
  // ============================================================================
  (function registerAlphaDecay() {
    const ALPHA_NUCLIDES = {
      'Po-211': {
        id: 'Po-211', parent: '²¹¹₈₄Po (钋-211)', daughter: '²⁰⁷₈₂Pb (铅-207)',
        halfLifeLabel: '0.516 s', simHalfLife: 2.0, Q: 7.59, barrierV: 26.5
      },
      'Rn-222': {
        id: 'Rn-222', parent: '²²²₈₆Rn (氡-222)', daughter: '²¹⁸₈₄Po (钋-218)',
        halfLifeLabel: '3.82 d', simHalfLife: 3.6, Q: 5.59, barrierV: 27.2
      },
      'U-238': {
        id: 'U-238', parent: '²³⁸₉₂U (铀-238)', daughter: '²³⁴₉₀Th (钍-234)',
        halfLifeLabel: '4.47 × 10⁹ y', simHalfLife: 5.6, Q: 4.27, barrierV: 29.0
      },
      custom: {
        id: 'custom', parent: '自定义重核 X', daughter: '子核 Y',
        halfLifeLabel: '由势垒决定', simHalfLife: 3.0, Q: 6.0, barrierV: 24.0
      }
    };

    const defaultState = {
      mode: 'single',
      nuclide: 'Po-211',
      barrierHeight: 26.5,
      qValue: 7.59,
      simTime: 0,
      singleDecayed: false,
      singleDecayTime: null,
      alphaEscapeX: 0,
      nuclei: [],
      history: []
    };

    function getAlphaParams(state) {
      const base = ALPHA_NUCLIDES[state.nuclide] || ALPHA_NUCLIDES['Po-211'];
      const Vb = state.nuclide === 'custom' ? state.barrierHeight : base.barrierV;
      const Q = state.nuclide === 'custom' ? state.qValue : base.Q;
      const simT12 = state.nuclide === 'custom'
        ? clamp(0.8 * Math.exp(0.14 * Math.max(2, Vb - Q)), 0.8, 9.0)
        : base.simHalfLife;
      const hlText = state.nuclide === 'custom' ? `${simT12.toFixed(2)} s (等效)` : base.halfLifeLabel;
      return { base, Vb, Q, simT12, hlText };
    }

    function resetAlphaEnsemble(state) {
      const p = getAlphaParams(state);
      state.simTime = 0;
      state.singleDecayed = false;
      state.singleDecayTime = null;
      state.alphaEscapeX = 0;
      state.history = [{ t: 0, parentCount: 60, daughterCount: 0 }];
      state.nuclei = [];
      for (let i = 0; i < 60; i++) {
        const col = i % 12;
        const row = Math.floor(i / 12);
        const u = Math.max(0.0001, Math.random());
        const decayAt = (-p.simT12 * Math.log(u)) / Math.LN2;
        state.nuclei.push({
          x: 64 + col * 36,
          y: 232 + row * 28,
          decayed: false,
          decayAt,
          alphaX: 0,
          alphaY: 0,
          vx: (Math.random() - 0.3) * 140,
          vy: (Math.random() - 0.5) * 110
        });
      }
      state._singleTargetTime = (-p.simT12 * Math.log(Math.max(0.05, Math.random()))) / Math.LN2;
    }

    function syncAlphaState(state) {
      if (state.mode !== 'single' && state.mode !== 'multi') state.mode = 'single';
      if (!ALPHA_NUCLIDES[state.nuclide]) state.nuclide = 'Po-211';
      state.barrierHeight = clamp(Number(state.barrierHeight) || 26.5, 16, 34);
      state.qValue = clamp(Number(state.qValue) || 7.59, 3.5, 10.5);
      if (!Array.isArray(state.nuclei) || state.nuclei.length === 0) {
        resetAlphaEnsemble(state);
      }
    }

    window.registerSim('alpha-decay', {
      modes: [
        { id: 'single', label: '单核量子隧穿视图 (Single Atom)', name: '单核量子隧穿视图' },
        { id: 'multi',  label: '多核半衰期统计视图 (Multiple Atoms)', name: '多核半衰期统计视图' }
      ],
      controls: [
        {
          id: 'nuclide', key: 'nuclide', label: '选择放射性核素', name: '选择放射性核素', type: 'select', default: 'Po-211', value: 'Po-211',
          options: [
            { value: 'Po-211', label: 'Po-211 (t₁/₂ = 0.516 s, Q = 7.59 MeV)', name: 'Po-211' },
            { value: 'Rn-222', label: 'Rn-222 (t₁/₂ = 3.82 d, Q = 5.59 MeV)',  name: 'Rn-222' },
            { value: 'U-238',  label: 'U-238 (t₁/₂ = 4.47×10⁹ y, Q = 4.27 MeV)', name: 'U-238' },
            { value: 'custom', label: '自定义势垒与 Qα 能量 (Custom)',           name: '自定义核素' }
          ]
        },
        { id: 'barrierHeight', key: 'barrierHeight', label: '库仑势垒峰值 Vb', name: '库仑势垒峰值 Vb', type: 'range', min: 16, max: 34, step: 0.5, default: 26.5, value: 26.5, unit: 'MeV' },
        { id: 'qValue',        key: 'qValue',        label: 'α衰变能 Qα', name: 'α衰变能 Qα', type: 'range', min: 3.5, max: 10.5, step: 0.2, default: 7.59, value: 7.59, unit: 'MeV' },
        {
          id: 'resetEnsemble', key: 'resetEnsemble', label: '重置母核样本 (Reset)', name: '重置母核样本', type: 'button',
          action(state) { resetAlphaEnsemble(state); },
          onClick(state) { resetAlphaEnsemble(state); }
        }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncAlphaState(state);
        resetAlphaEnsemble(state);
      },
      update(dt, state) {
        syncAlphaState(state);
        if (state.resetEnsemble) {
          state.resetEnsemble = false;
          resetAlphaEnsemble(state);
        }
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.simTime += safeDt;

        if (!state.singleDecayed && state.simTime >= (state._singleTargetTime || 2.1)) {
          state.singleDecayed = true;
          state.singleDecayTime = state.simTime;
          state.alphaEscapeX = 48;
        }
        if (state.singleDecayed) {
          state.alphaEscapeX = Math.min(260, state.alphaEscapeX + safeDt * 145);
        }

        let parentCount = 0;
        state.nuclei.forEach((n) => {
          if (!n.decayed && state.simTime >= n.decayAt) {
            n.decayed = true;
            n.alphaX = n.x;
            n.alphaY = n.y;
          }
          if (n.decayed) {
            n.alphaX += n.vx * safeDt;
            n.alphaY += n.vy * safeDt;
          } else {
            parentCount++;
          }
        });

        const total = state.nuclei.length;
        const lastH = state.history[state.history.length - 1];
        if (!lastH || state.simTime - lastH.t >= 0.15) {
          if (state.simTime <= 18) {
            state.history.push({ t: state.simTime, parentCount, daughterCount: total - parentCount });
          }
        }
      },
      render(ctx, width, height, state) {
        syncAlphaState(state);
        const W = width || 900;
        const H = height || 540;
        const p = getAlphaParams(state);

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('α 衰变与量子隧穿效应 (Alpha Decay) — 核势阱库仑势垒与指数半衰期曲线', 24, 28);

        drawButton(ctx, { x: 24,  y: 42, w: 155, h: 28 }, '单核量子隧穿视图', state.mode === 'single', '#2563eb');
        drawButton(ctx, { x: 186, y: 42, w: 155, h: 28 }, '多核半衰期统计视图', state.mode === 'multi', '#059669');
        ['Po-211', 'Rn-222', 'U-238', 'custom'].forEach((k, idx) => {
          drawButton(ctx, { x: 365 + idx * 96, y: 42, w: 90, h: 28 }, k === 'custom' ? '自定义势垒' : k, state.nuclide === k, '#7c3aed');
        });
        drawButton(ctx, { x: 760, y: 42, w: 116, h: 28 }, '↻ 重置母核', false, '#dc2626');

        drawPanel(ctx, 24, 78, 852, 122, `母核与子核随时间演化曲线 N(t) = N₀(1/2)^(t/t₁/₂)  |  理论半衰期 t₁/₂ = ${p.hlText}`);

        const gx = 74, gy = 112, gw = 560, gh = 72;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.strokeRect(gx, gy, gw, gh);

        const maxT = p.simT12 * 3.2;
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * maxT;
          const frac = Math.pow(0.5, t / p.simT12);
          const px = gx + (i / 100) * gw;
          const py = gy + gh * (1 - frac);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * maxT;
          const frac = 1 - Math.pow(0.5, t / p.simT12);
          const px = gx + (i / 100) * gw;
          const py = gy + gh * (1 - frac);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        const hlX = gx + (p.simT12 / maxT) * gw;
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(hlX, gy);
        ctx.lineTo(hlX, gy + gh);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1个半衰期 t₁/₂', hlX, gy + gh + 11);

        const totalN = state.nuclei.length || 60;
        state.history.forEach((pt) => {
          if (pt.t > maxT) return;
          const sx = gx + (pt.t / maxT) * gw;
          const syP = gy + gh * (1 - pt.parentCount / totalN);
          const syD = gy + gh * (1 - pt.daughterCount / totalN);
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(sx - 1.5, syP - 1.5, 3, 3);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(sx - 1.5, syD - 1.5, 3, 3);
        });
        ctx.restore();

        const undecayedCount = state.nuclei.filter((n) => !n.decayed).length;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#c084fc';
        ctx.fillText(`● 未衰变母核: ${undecayedCount} / ${totalN}`, 652, 130);
        ctx.fillStyle = '#34d399';
        ctx.fillText(`● 已生成子核: ${totalN - undecayedCount} / ${totalN}`, 652, 154);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`● 衰变能 Qα = ${p.Q.toFixed(2)} MeV`, 652, 178);

        if (state.mode === 'single') {
          drawPanel(ctx, 24, 208, 852, 136, `单原子核量子隧穿动画: ${p.base.parent} → ${p.base.daughter} + ⁴₂He (α)`);
          const ncx = 220, ncy = 282;
          const recoil = state.singleDecayed ? -8 : 0;
          const nucleons = getNucleonPositions(14, 20, state.simTime, !state.singleDecayed);
          nucleons.forEach((nuc) => {
            drawSphere3D(
              ctx,
              ncx + recoil + nuc.x * 0.85,
              ncy + nuc.y * 0.85,
              7,
              nuc.type === 'p' ? '#ef4444' : '#64748b',
              nuc.type === 'p' ? '#fca5a5' : '#cbd5e1',
              ''
            );
          });

          const ax = state.singleDecayed
            ? ncx + state.alphaEscapeX
            : ncx + Math.sin(state.simTime * 22) * 14;
          drawSphere3D(ctx, ax, ncy, 10, '#a855f7', '#f3e8ff', 'α');

          ctx.textAlign = 'left';
          ctx.font = 'bold 13.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = state.singleDecayed ? '#34d399' : '#fbbf24';
          ctx.fillText(
            state.singleDecayed
              ? `✓ α 粒子已在 t = ${state.singleDecayTime.toFixed(2)} s 穿过库仑势垒逃逸！子核发生反冲`
              : 'α 团簇在核势阱内高频碰撞势垒 (E = Qα < Vb)，以指数衰减波函数发生量子隧穿...',
            345,
            274
          );
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('经典力学中 E < Vb 无法翻越势垒；量子力学中透射系数 T ≈ exp(-2∫√(2m(V(r)-E))/ℏ dr) > 0', 345, 302);
        } else {
          drawPanel(ctx, 24, 208, 852, 136, `多核统计衰变阵列 (共 60 个 ${p.base.parent} 母核随机独立隧穿)`);
          state.nuclei.forEach((n) => {
            drawSphere3D(
              ctx,
              n.x,
              n.y,
              9,
              n.decayed ? '#10b981' : '#a855f7',
              n.decayed ? '#6ee7b7' : '#e9d5ff',
              n.decayed ? 'Pb' : 'Po'
            );
            if (n.decayed && n.alphaX > 28 && n.alphaX < 870 && n.alphaY > 214 && n.alphaY < 340) {
              drawSphere3D(ctx, n.alphaX, n.alphaY, 4.5, '#f59e0b', '#fef08a', '');
            }
          });
        }

        drawPanel(ctx, 24, 352, 852, 170, '核力势阱与库仑势垒 V(r) = 2Z_d k_e e²/r 及 α 粒子隧穿波函数 ψ(r)');

        const px0 = 220, pyZero = 468;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(80, pyZero);
        ctx.lineTo(830, pyZero);
        ctx.stroke();

        const R0 = 38;
        const peakH = (p.Vb / 34) * 78;
        const qLineY = pyZero - (p.Q / 34) * 78;
        const Rb = R0 * (p.Vb / p.Q);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let r = 160; r >= R0; r -= 3) {
          const v = peakH * (R0 / r);
          if (r === 160) ctx.moveTo(px0 - r, pyZero - v);
          else ctx.lineTo(px0 - r, pyZero - v);
        }
        ctx.lineTo(px0 - R0, pyZero + 38);
        ctx.lineTo(px0 + R0, pyZero + 38);
        for (let r = R0; r <= 560; r += 4) {
          const v = peakH * (R0 / r);
          ctx.lineTo(px0 + r, pyZero - v);
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        ctx.fillRect(px0 + R0, qLineY - 22, clamp(Rb - R0, 12, 340), 22);

        ctx.strokeStyle = '#38bdf8';
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(px0 - R0, qLineY);
        ctx.lineTo(820, qLineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = px0 - R0; x <= 815; x += 2) {
          const r = x - px0;
          let psi = 0;
          if (r < R0) {
            psi = 16 * Math.sin(r * 0.25) * Math.cos(state.simTime * 14);
          } else if (r <= Rb) {
            const decay = Math.exp(-((r - R0) / Math.max(12, Rb - R0)) * 2.1);
            psi = 14 * decay * Math.cos(state.simTime * 14);
          } else {
            const transAmp = 14 * Math.exp(-2.1);
            psi = transAmp * Math.cos((r - Rb) * 0.18 - state.simTime * 14);
          }
          if (x === px0 - R0) ctx.moveTo(x, qLineY - psi);
          else ctx.lineTo(x, qLineY - psi);
        }
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`势垒高度 Vb = ${p.Vb.toFixed(1)} MeV  |  衰变能 Qα = ${p.Q.toFixed(2)} MeV  |  经典禁戒区 R₀ → R_b 指数衰减隧穿`, 430, 498);
      },
      getReadouts(state) {
        syncAlphaState(state);
        const p = getAlphaParams(state);
        const undecayed = state.nuclei.filter((n) => !n.decayed).length;
        return [
          { id: 'nuclide', label: '母核核素', name: '母核核素', value: p.base.parent, unit: '' },
          { id: 'hl',      label: '半衰期 t₁/₂', name: '半衰期 t₁/₂', value: p.hlText, unit: '' },
          { id: 'qVal',    label: 'α衰变能 Qα', name: 'α衰变能 Qα', value: p.Q.toFixed(2), unit: 'MeV' },
          { id: 'barrier', label: '库仑势垒峰值 Vb', name: '库仑势垒峰值 Vb', value: p.Vb.toFixed(1), unit: 'MeV' },
          { id: 'counts',  label: '未衰变母核 / 总数', name: '未衰变母核 / 总数', value: `${undecayed} / ${state.nuclei.length}`, unit: '' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncAlphaState(state);

        if (pointInRect(x, y, { x: 24,  y: 42, w: 155, h: 28 })) { state.mode = 'single'; return; }
        if (pointInRect(x, y, { x: 186, y: 42, w: 155, h: 28 })) { state.mode = 'multi'; return; }

        const keys = ['Po-211', 'Rn-222', 'U-238', 'custom'];
        for (let i = 0; i < keys.length; i++) {
          if (pointInRect(x, y, { x: 365 + i * 96, y: 42, w: 90, h: 28 })) {
            state.nuclide = keys[i];
            resetAlphaEnsemble(state);
            return;
          }
        }
        if (pointInRect(x, y, { x: 760, y: 42, w: 116, h: 28 })) {
          resetAlphaEnsemble(state);
        }
      },
      onPointerMove() {},
      onPointerUp() {}
    });
  })();

  // ============================================================================
  // 7. BETA DECAY ('beta-decay')
  // ============================================================================
  (function registerBetaDecay() {
    const BETA_NUCLIDES = {
      'H-3': {
        id: 'H-3', type: 'β⁻', parent: '³₁H (氚)', daughter: '³₂He (氦-3)',
        Z: 1, N: 2, dZ: 2, dN: 1, halfLifeLabel: '12.32 y', simHalfLife: 3.2,
        Q: 0.0186, qLabel: '18.6 keV (0.0186 MeV)',
        eq: '³₁H → ³₂He + e⁻ + ν̄ₑ  (n → p + e⁻ + ν̄ₑ)'
      },
      'C-14': {
        id: 'C-14', type: 'β⁻', parent: '¹⁴₆C (碳-14)', daughter: '¹⁴₇N (氮-14)',
        Z: 6, N: 8, dZ: 7, dN: 7, halfLifeLabel: '5730 y', simHalfLife: 4.2,
        Q: 0.1565, qLabel: '0.1565 MeV (156.5 keV)',
        eq: '¹⁴₆C → ¹⁴₇N + e⁻ + ν̄ₑ  (n → p + e⁻ + ν̄ₑ)'
      },
      'N-13': {
        id: 'N-13', type: 'β⁺', parent: '¹³₇N (氮-13)', daughter: '¹³₆C (碳-13)',
        Z: 7, N: 6, dZ: 6, dN: 7, halfLifeLabel: '9.965 min', simHalfLife: 2.6,
        Q: 1.198, qLabel: '1.198 MeV',
        eq: '¹³₇N → ¹³₆C + e⁺ + νₑ  (p → n + e⁺ + νₑ)'
      }
    };

    function sampleFermiEnergyFraction() {
      for (let iter = 0; iter < 20; iter++) {
        const x = Math.random();
        const prob = Math.sqrt(x) * Math.pow(1 - x, 2) / 0.19245;
        if (Math.random() <= prob) return x;
      }
      return 0.34;
    }

    const defaultState = {
      mode: 'single',
      nuclide: 'C-14',
      simTime: 0,
      singleDecayed: false,
      lastEnergyFrac: 0.36,
      emittedParticles: [],
      spectrumBins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalDecays: 0,
      nuclei: []
    };

    function emitThreeBodyEvent(state, originX, originY) {
      const info = BETA_NUCLIDES[state.nuclide] || BETA_NUCLIDES['C-14'];
      const eFrac = sampleFermiEnergyFraction();
      state.lastEnergyFrac = eFrac;
      const binIdx = clamp(Math.floor(eFrac * 10), 0, 9);
      state.spectrumBins[binIdx]++;
      state.totalDecays++;

      const angE = -0.45 + (Math.random() - 0.5) * 0.7;
      const angNu = 0.55 + (Math.random() - 0.5) * 0.7;
      const speedE = 110 + 140 * eFrac;
      const speedNu = 110 + 140 * (1 - eFrac);
      state.emittedParticles.push({
        eX: originX, eY: originY,
        evX: Math.cos(angE) * speedE, evY: Math.sin(angE) * speedE,
        nuX: originX, nuY: originY,
        nuvX: Math.cos(angNu) * speedNu, nuvY: Math.sin(angNu) * speedNu,
        eFrac,
        isPlus: info.type === 'β⁺',
        age: 0
      });
      if (state.emittedParticles.length > 35) state.emittedParticles.shift();
    }

    function resetBetaEnsemble(state) {
      const info = BETA_NUCLIDES[state.nuclide] || BETA_NUCLIDES['C-14'];
      state.simTime = 0;
      state.singleDecayed = false;
      state.emittedParticles = [];
      state.nuclei = [];
      for (let i = 0; i < 48; i++) {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const u = Math.max(0.0001, Math.random());
        state.nuclei.push({
          x: 56 + col * 48,
          y: 158 + row * 40,
          decayed: false,
          decayAt: (-info.simHalfLife * Math.log(u)) / Math.LN2
        });
      }
      state._singleDecayAt = 1.4;
    }

    function syncBetaState(state) {
      if (state.mode !== 'single' && state.mode !== 'multi') state.mode = 'single';
      if (!BETA_NUCLIDES[state.nuclide]) state.nuclide = 'C-14';
      if (!Array.isArray(state.spectrumBins) || state.spectrumBins.length !== 10) {
        state.spectrumBins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      if (!Array.isArray(state.nuclei) || state.nuclei.length === 0) {
        resetBetaEnsemble(state);
      }
    }

    window.registerSim('beta-decay', {
      modes: [
        { id: 'single', label: '单核三体衰变与连续能谱视图', name: '单核三体衰变与连续能谱视图' },
        { id: 'multi',  label: '多核束半衰期统计视图',       name: '多核束半衰期统计视图' }
      ],
      controls: [
        {
          id: 'nuclide', key: 'nuclide', label: '选择 β 衰变核素', name: '选择 β 衰变核素', type: 'select', default: 'C-14', value: 'C-14',
          options: [
            { value: 'H-3',  label: 'H-3 (β⁻衰变, t₁/₂ = 12.32 y, Q = 18.6 keV)', name: 'H-3 (氚)' },
            { value: 'C-14', label: 'C-14 (β⁻衰变, t₁/₂ = 5730 y, Q = 0.1565 MeV)', name: 'C-14 (碳-14)' },
            { value: 'N-13', label: 'N-13 (β⁺衰变, t₁/₂ = 9.965 min, Q = 1.198 MeV)', name: 'N-13 (氮-13)' }
          ]
        },
        {
          id: 'triggerBeta', key: 'triggerBeta', label: '触发一次 β 衰变采样', name: '触发一次 β 衰变采样', type: 'button',
          action(state) {
            state.singleDecayed = true;
            emitThreeBodyEvent(state, 225, 250);
          },
          onClick(state) {
            state.singleDecayed = true;
            emitThreeBodyEvent(state, 225, 250);
          }
        }
      ],
      defaultState,
      init(state) {
        Object.assign(state, JSON.parse(JSON.stringify(defaultState)), state);
        syncBetaState(state);
        resetBetaEnsemble(state);
      },
      update(dt, state) {
        syncBetaState(state);
        if (state.triggerBeta) {
          state.triggerBeta = false;
          state.singleDecayed = true;
          emitThreeBodyEvent(state, 225, 250);
        }
        const safeDt = clamp(Number(dt) || 0.016, 0, 0.05);
        state.simTime += safeDt;

        if (state.mode === 'single' && !state.singleDecayed && state.simTime >= (state._singleDecayAt || 1.4)) {
          state.singleDecayed = true;
          emitThreeBodyEvent(state, 225, 250);
        }

        if (state.mode === 'multi') {
          state.nuclei.forEach((n) => {
            if (!n.decayed && state.simTime >= n.decayAt) {
              n.decayed = true;
              emitThreeBodyEvent(state, n.x, n.y);
            }
          });
        }

        for (let i = state.emittedParticles.length - 1; i >= 0; i--) {
          const ep = state.emittedParticles[i];
          ep.age += safeDt;
          ep.eX += ep.evX * safeDt;
          ep.eY += ep.evY * safeDt;
          ep.nuX += ep.nuvX * safeDt;
          ep.nuY += ep.nuvY * safeDt;
          if (ep.age > 2.2) state.emittedParticles.splice(i, 1);
        }
      },
      render(ctx, width, height, state) {
        syncBetaState(state);
        const W = width || 900;
        const H = height || 540;
        const info = BETA_NUCLIDES[state.nuclide] || BETA_NUCLIDES['C-14'];

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('β 衰变与中微子三体连续能谱 (Beta Decay) — 弱相互作用核子转化与费米能谱', 24, 28);

        drawButton(ctx, { x: 24,  y: 42, w: 175, h: 28 }, '单核三体衰变视图', state.mode === 'single', '#2563eb');
        drawButton(ctx, { x: 206, y: 42, w: 165, h: 28 }, '多核束半衰期统计', state.mode === 'multi', '#059669');
        ['H-3', 'C-14', 'N-13'].forEach((k, idx) => {
          const b = BETA_NUCLIDES[k];
          drawButton(ctx, { x: 392 + idx * 112, y: 42, w: 106, h: 28 }, `${k} (${b.type})`, state.nuclide === k, '#7c3aed');
        });
        drawButton(ctx, { x: 740, y: 42, w: 136, h: 28 }, '⚡ 触发/重采样衰变', true, '#dc2626');

        drawPanel(ctx, 24, 82, 432, 436, `弱相互作用核子转化: ${info.eq}`);

        if (state.mode === 'single') {
          const cx = 225, cy = 248;
          const Zcurr = state.singleDecayed ? info.dZ : info.Z;
          const Ncurr = state.singleDecayed ? info.dN : info.N;
          const nucleons = getNucleonPositions(Zcurr, Ncurr, state.simTime, !state.singleDecayed);
          nucleons.forEach((nuc) => {
            drawSphere3D(
              ctx,
              cx + nuc.x * 1.15,
              cy + nuc.y * 1.15,
              9.5,
              nuc.type === 'p' ? '#ef4444' : '#64748b',
              nuc.type === 'p' ? '#fca5a5' : '#cbd5e1',
              nuc.type === 'p' ? '+' : 'n'
            );
          });

          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 15px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(state.singleDecayed ? `子核: ${info.daughter}` : `母核: ${info.parent}`, cx, 142);

          const eMeV = state.lastEnergyFrac * info.Q;
          const nuMeV = (1 - state.lastEnergyFrac) * info.Q;
          roundRect(ctx, 44, 372, 392, 126, 8);
          ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
          ctx.fill();
          ctx.textAlign = 'left';
          ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(`本次三体衰变总能量分配 Q_β = ${info.qLabel}:`, 58, 396);
          ctx.fillStyle = info.type === 'β⁻' ? '#38bdf8' : '#f97316';
          ctx.fillText(`• ${info.type === 'β⁻' ? '电子 e⁻' : '正电子 e⁺'} 动能 E_β = ${(state.lastEnergyFrac * 100).toFixed(1)}% Q = ${eMeV.toFixed(4)} MeV`, 58, 422);
          ctx.fillStyle = '#a7f3d0';
          ctx.fillText(`• ${info.type === 'β⁻' ? '反电子中微子 ν̄ₑ' : '电子中微子 νₑ'} 能量 E_ν = ${((1 - state.lastEnergyFrac) * 100).toFixed(1)}% Q = ${nuMeV.toFixed(4)} MeV`, 58, 446);

          roundRect(ctx, 58, 462, 360, 16, 8);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          roundRect(ctx, 58, 462, Math.max(10, 360 * state.lastEnergyFrac), 16, 8);
          ctx.fillStyle = info.type === 'β⁻' ? '#38bdf8' : '#f97316';
          ctx.fill();
        } else {
          state.nuclei.forEach((n) => {
            drawSphere3D(
              ctx,
              n.x,
              n.y,
              11,
              n.decayed ? '#10b981' : '#3b82f6',
              n.decayed ? '#6ee7b7' : '#93c5fd',
              n.decayed ? info.daughter.slice(0, 3) : info.parent.slice(0, 3)
            );
          });
          const rem = state.nuclei.filter((n) => !n.decayed).length;
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 13px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`未衰变母核: ${rem} / 48  |  已衰变子核: ${48 - rem} / 48  |  半衰期 t₁/₂ = ${info.halfLifeLabel}`, 44, 430);
          drawButton(ctx, { x: 44, y: 454, w: 185, h: 36 }, '↻ 重置 48 个母核阵列', false, '#475569');
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(26, 112, 428, 400);
        ctx.clip();
        state.emittedParticles.forEach((ep) => {
          drawSphere3D(
            ctx,
            ep.eX,
            ep.eY,
            7,
            ep.isPlus ? '#f97316' : '#38bdf8',
            '#ffffff',
            ep.isPlus ? 'e⁺' : 'e⁻'
          );
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ep.nuX, ep.nuY, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#6ee7b7';
          ctx.font = '10px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(ep.isPlus ? 'νₑ' : 'ν̄ₑ', ep.nuX + 8, ep.nuY + 3);
        });
        ctx.restore();

        drawPanel(ctx, 472, 82, 404, 436, 'β 粒子连续动能谱 N(E_β) 与费米理论曲线');

        const sx = 516, sy = 136, sw = 334, sh = 175;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.strokeRect(sx, sy, sw, sh);

        const maxBin = Math.max(4, ...state.spectrumBins);
        const bw = sw / 10;
        state.spectrumBins.forEach((cnt, idx) => {
          const bh = (cnt / maxBin) * (sh - 24);
          ctx.fillStyle = info.type === 'β⁻' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(249, 115, 22, 0.45)';
          ctx.fillRect(sx + idx * bw + 3, sy + sh - bh, bw - 6, bh);
        });

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const xFrac = i / 100;
          const pNorm = (Math.sqrt(xFrac) * Math.pow(1 - xFrac, 2)) / 0.2857;
          const px = sx + xFrac * sw;
          const py = sy + sh - pNorm * (sh - 20);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('0', sx, sy + sh + 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`⟨E_β⟩ ≈ ⅓ Q (${(info.Q / 3).toFixed(3)} MeV)`, sx + sw * 0.34, sy + sh + 14);
        ctx.fillStyle = '#f87171';
        ctx.fillText(`E_max = Q (${info.Q} MeV)`, sx + sw - 16, sy + sh + 14);

        roundRect(ctx, 492, 342, 364, 156, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.font = 'bold 12.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`• 核素: ${info.parent}  |  衰变类型: ${info.type}  |  t₁/₂ = ${info.halfLifeLabel}`, 506, 366);
        ctx.fillStyle = '#93c5fd';
        ctx.fillText('• 为什么 β 能谱是连续谱？(泡利 1930 中微子假说)', 506, 392);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11.5px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('  若为二体衰变，电子动能应固定等于 Q；正是因为中微子 ν 与', 506, 414);
        ctx.fillText('  电子及反冲子核三体共同分配动量与能量，电子动能呈 0 ~ Q_max', 506, 434);
        ctx.fillText(`  连续分布 (累计采样数: ${state.totalDecays} 次)。`, 506, 454);

        drawButton(ctx, { x: 506, y: 464, w: 160, h: 26 }, '清空能谱直方图', false, '#475569');
      },
      getReadouts(state) {
        syncBetaState(state);
        const info = BETA_NUCLIDES[state.nuclide] || BETA_NUCLIDES['C-14'];
        const eMeV = (state.lastEnergyFrac * info.Q).toFixed(4);
        const nuMeV = ((1 - state.lastEnergyFrac) * info.Q).toFixed(4);
        return [
          { id: 'nuclide', label: '当前核素与通道', name: '当前核素与通道', value: `${info.parent} (${info.type})`, unit: '' },
          { id: 'hl',      label: '半衰期 t₁/₂', name: '半衰期 t₁/₂', value: info.halfLifeLabel, unit: '' },
          { id: 'qMax',    label: '端点最大能量 Q_β', name: '端点最大能量 Q_β', value: info.qLabel, unit: '' },
          { id: 'eBeta',   label: '当前 β 粒子动能 E_β', name: '当前 β 粒子动能 E_β', value: eMeV, unit: 'MeV' },
          { id: 'eNu',     label: '当前中微子能量 E_ν', name: '当前中微子能量 E_ν', value: nuMeV, unit: 'MeV' }
        ];
      },
      onPointerDown(a, b, c, d) {
        const { x, y, state } = normPointer(a, b, c, d);
        syncBetaState(state);

        if (pointInRect(x, y, { x: 24,  y: 42, w: 175, h: 28 })) { state.mode = 'single'; return; }
        if (pointInRect(x, y, { x: 206, y: 42, w: 165, h: 28 })) { state.mode = 'multi'; resetBetaEnsemble(state); return; }

        const keys = ['H-3', 'C-14', 'N-13'];
        for (let i = 0; i < keys.length; i++) {
          if (pointInRect(x, y, { x: 392 + i * 112, y: 42, w: 106, h: 28 })) {
            state.nuclide = keys[i];
            state.spectrumBins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            state.totalDecays = 0;
            resetBetaEnsemble(state);
            return;
          }
        }

        if (pointInRect(x, y, { x: 740, y: 42, w: 136, h: 28 })) {
          state.singleDecayed = true;
          emitThreeBodyEvent(state, 225, 250);
          return;
        }

        if (state.mode === 'multi' && pointInRect(x, y, { x: 44, y: 454, w: 185, h: 36 })) {
          resetBetaEnsemble(state);
          return;
        }

        if (pointInRect(x, y, { x: 506, y: 464, w: 160, h: 26 })) {
          state.spectrumBins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          state.totalDecays = 0;
        }
      },
      onPointerMove() {},
      onPointerUp() {}
    });
  })();

})();
