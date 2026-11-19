/**
 * PhET Chemistry HTML5 Simulations - Group 3: Reactions, Stoichiometry & States of Matter / Gases
 * File: /Users/crazyrock/gemini/phet_chemistry/js/sims_reactions_states1.js
 * Canvas logical resolution: width = 900, height = 540
 * Implements 7 complete interactive simulations via window.registerSim(id, config):
 *   1. 'balancing-chemical-equations'
 *   2. 'reactants-products-and-leftovers'
 *   3. 'states-of-matter-basics'
 *   4. 'states-of-matter'
 *   5. 'gases-intro'
 *   6. 'gas-properties'
 *   7. 'diffusion'
 */
(function () {
  'use strict';

  function register(id, rawCfg) {
    const cfg = {
      title: rawCfg.title,
      controls: (rawCfg.controls || []).map(c => ({
        ...c,
        id: c.id || c.key,
        type: c.type === "slider" ? "range" : c.type
      })),
      init(state, api) {
        if (typeof rawCfg.init === "function") {
          const initObj = rawCfg.init();
          if (initObj && typeof initObj === "object") {
            Object.assign(state, initObj);
          }
        }
      },
      update(dt, state, api) {
        if (typeof rawCfg.update === "function") {
          if (typeof dt === "number") {
            rawCfg.update(state, dt, api);
          } else {
            rawCfg.update(dt, state, api);
          }
        }
      },
      render(ctx, width, height, state, api) {
        if (typeof rawCfg.render === "function") {
          const actualState = (typeof width === "number" && state && typeof state === "object") ? state : height;
          rawCfg.render(ctx, { width: 900, height: 540 }, actualState);
        }
      },
      onParamChange(key, value, state, api) {
        if (typeof rawCfg.onParamChange === "function") {
          if (typeof key === "string") {
            rawCfg.onParamChange(state, key, value);
          } else {
            rawCfg.onParamChange(key, value, state);
          }
        }
      },
      onPointerDown(x, y, state, api) {
        if (typeof rawCfg.onPointerDown === "function") {
          if (typeof x === "number") rawCfg.onPointerDown(state, x, y);
          else rawCfg.onPointerDown(x, y, state);
        }
      },
      onPointerMove(x, y, state, api) {
        if (typeof rawCfg.onPointerMove === "function") {
          if (typeof x === "number") rawCfg.onPointerMove(state, x, y);
          else rawCfg.onPointerMove(x, y, state);
        }
      },
      onPointerUp(x, y, state, api) {
        if (typeof rawCfg.onPointerUp === "function") {
          if (typeof x === "number") rawCfg.onPointerUp(state, x, y);
          else rawCfg.onPointerUp(x, y, state);
        }
      },
      getReadouts(state) {
        if (id === "balancing-chemical-equations") {
          return [
            { label: "配平状态", value: state.isBalanced ? "已配平 ✓" : "未配平" },
            { label: "闯关得分", value: (state.score || 0) + " 分" }
          ];
        }
        if (id === "reactants-products-and-leftovers") {
          return [
            { label: "反应批次 ξ", value: String(state.extent || 0) },
            { label: "模式", value: state.gameMode ? "挑战模式" : "探索模式" }
          ];
        }
        if (id === "states-of-matter-basics" || id === "states-of-matter") {
          return [
            { label: "温度 T", value: Math.round(state.tempK || 0) + " K" },
            { label: "压强 P", value: (state.pressureAtm || 0).toFixed(2) + " atm" },
            { label: "当前相态", value: state.currentPhase || "solid" }
          ];
        }
        if (id === "gases-intro" || id === "gas-properties") {
          return [
            { label: "粒子总数 N", value: String((state.particles || []).length) },
            { label: "温度 T", value: Math.round(state.tempK || 300) + " K" },
            { label: "压强 P", value: (state.pressureAtm || 0).toFixed(1) + " atm" },
            { label: "器壁碰撞/10ps", value: String(state.wallCollisions || 0) }
          ];
        }
        if (id === "diffusion") {
          return [
            { label: "扩散时间 t", value: (state.elapsedSec || 0).toFixed(1) + " ps" },
            { label: "理论速率比 r₁/r₂", value: Math.sqrt(((state.t1||300)/(state.m1||4))/((state.t2||300)/(state.m2||32))).toFixed(2) }
          ];
        }
        return [];
      }
    };
    if (typeof window !== "undefined" && typeof window.registerSim === "function") {
      window.registerSim(id, cfg);
    }
  }

  // ============================================================================
  // SHARED CPK ELEMENT COLORS, RADII & DRAWING UTILITIES
  // ============================================================================
  const ATOM_STYLE = {
    H: { color: '#f8fafc', stroke: '#475569', r: 8, name: '氢 (H)' },
    C: { color: '#334155', stroke: '#0f172a', r: 12, name: '碳 (C)' },
    N: { color: '#3b82f6', stroke: '#1d4ed8', r: 12, name: '氮 (N)' },
    O: { color: '#ef4444', stroke: '#991b1b', r: 12, name: '氧 (O)' },
    P: { color: '#f97316', stroke: '#c2410c', r: 13, name: '磷 (P)' },
    S: { color: '#eab308', stroke: '#a16207', r: 13, name: '硫 (S)' },
    Cl: { color: '#22c55e', stroke: '#15803d', r: 13, name: '氯 (Cl)' },
    Fe: { color: '#d97706', stroke: '#78350f', r: 14, name: '铁 (Fe)' },
    Ne: { color: '#06b6d4', stroke: '#0e7490', r: 10, name: '氖 (Ne)' },
    Ar: { color: '#ec4899', stroke: '#9d174d', r: 13, name: '氩 (Ar)' },
    Bread: { color: '#f59e0b', stroke: '#b45309', r: 13, name: '面包片' },
    Cheese: { color: '#fde047', stroke: '#ca8a04', r: 12, name: '奶酪片' },
    Meat: { color: '#b91c1c', stroke: '#7f1d1d', r: 12, name: '火腿片' }
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function drawPanel(ctx, x, y, w, h, title, bg = '#1e293b', border = '#334155') {
    ctx.save();
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = border;
    ctx.stroke();
    if (title) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px system-ui, -apple-system, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x + 12, y + 9);
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 29);
      ctx.lineTo(x + w - 8, y + 29);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSphere(ctx, x, y, r, color, strokeColor, label) {
    ctx.save();
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, color);
    grad.addColorStop(1, strokeColor || '#0f172a');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeColor || '#0f172a';
    ctx.stroke();
    if (label) {
      ctx.fillStyle = color === '#f8fafc' || color === '#fde047' ? '#0f172a' : '#ffffff';
      ctx.font = `bold ${Math.max(8, Math.round(r * 0.85))}px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    }
    ctx.restore();
  }

  function drawMoleculeIcon(ctx, formula, cx, cy, scale = 1.0, angle = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    const bond = (x1, y1, x2, y2, order = 1) => {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineCap = 'round';
      if (order === 1) {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 2.8;
        const ny = (dx / len) * 2.8;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x1 + nx, y1 + ny);
        ctx.lineTo(x2 + nx, y2 + ny);
        ctx.moveTo(x1 - nx, y1 - ny);
        ctx.lineTo(x2 - nx, y2 - ny);
        ctx.stroke();
      }
    };

    const atom = (el, x, y, showLabel = false) => {
      const st = ATOM_STYLE[el] || ATOM_STYLE.C;
      drawSphere(ctx, x, y, st.r, st.color, st.stroke, showLabel ? el : '');
    };

    switch (formula) {
      case 'H2':
        bond(-6, 0, 6, 0, 1);
        atom('H', -6, 0);
        atom('H', 6, 0);
        break;
      case 'N2':
        bond(-9, 0, 9, 0, 2);
        atom('N', -9, 0);
        atom('N', 9, 0);
        break;
      case 'O2':
        bond(-9, 0, 9, 0, 2);
        atom('O', -9, 0);
        atom('O', 9, 0);
        break;
      case 'H2O':
        bond(0, -3, -11, 7, 1);
        bond(0, -3, 11, 7, 1);
        atom('O', 0, -3);
        atom('H', -11, 7);
        atom('H', 11, 7);
        break;
      case 'NH3':
        bond(0, -4, -12, 7, 1);
        bond(0, -4, 12, 7, 1);
        bond(0, -4, 0, 10, 1);
        atom('N', 0, -4);
        atom('H', -12, 7);
        atom('H', 12, 7);
        atom('H', 0, 10);
        break;
      case 'CH4':
        bond(0, 0, -12, -10, 1);
        bond(0, 0, 12, -10, 1);
        bond(0, 0, -12, 10, 1);
        bond(0, 0, 12, 10, 1);
        atom('C', 0, 0);
        atom('H', -12, -10);
        atom('H', 12, -10);
        atom('H', -12, 10);
        atom('H', 12, 10);
        break;
      case 'CO2':
        bond(-15, 0, 0, 0, 2);
        bond(0, 0, 15, 0, 2);
        atom('O', -15, 0);
        atom('C', 0, 0);
        atom('O', 15, 0);
        break;
      case 'CO':
        bond(-8, 0, 8, 0, 2);
        atom('C', -8, 0);
        atom('O', 8, 0);
        break;
      case 'C2H4':
        bond(-8, 0, 8, 0, 2);
        bond(-8, 0, -16, -9, 1);
        bond(-8, 0, -16, 9, 1);
        bond(8, 0, 16, -9, 1);
        bond(8, 0, 16, 9, 1);
        atom('C', -8, 0);
        atom('C', 8, 0);
        atom('H', -16, -9);
        atom('H', -16, 9);
        atom('H', 16, -9);
        atom('H', 16, 9);
        break;
      case 'Fe2O3':
        bond(-10, -5, 0, 7, 1);
        bond(10, -5, 0, 7, 1);
        bond(-10, -5, -18, 5, 1);
        bond(10, -5, 18, 5, 1);
        atom('O', 0, 7);
        atom('O', -18, 5);
        atom('O', 18, 5);
        atom('Fe', -10, -5);
        atom('Fe', 10, -5);
        break;
      case 'Fe':
        atom('Fe', 0, 0, true);
        break;
      case 'PCl5':
        bond(0, 0, 0, -15, 1);
        bond(0, 0, 0, 15, 1);
        bond(0, 0, -15, -5, 1);
        bond(0, 0, 15, -5, 1);
        bond(0, 0, 11, 10, 1);
        atom('Cl', 0, -15);
        atom('Cl', -15, -5);
        atom('Cl', 15, -5);
        atom('P', 0, 0);
        atom('Cl', 11, 10);
        atom('Cl', 0, 15);
        break;
      case 'H3PO4':
        bond(0, 0, 0, -13, 2);
        bond(0, 0, -12, 7, 1);
        bond(0, 0, 12, 7, 1);
        bond(0, 0, 0, 13, 1);
        atom('P', 0, 0);
        atom('O', 0, -13);
        atom('O', -12, 7);
        atom('O', 12, 7);
        atom('O', 0, 13);
        atom('H', -18, 12);
        atom('H', 18, 12);
        atom('H', 6, 18);
        break;
      case 'HCl':
        bond(-8, 0, 5, 0, 1);
        atom('Cl', -4, 0);
        atom('H', 8, 0);
        break;
      case 'Bread':
        roundRect(ctx, -14, -9, 28, 18, 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#92400e';
        ctx.stroke();
        roundRect(ctx, -11, -6, 22, 12, 3);
        ctx.fillStyle = '#fde68a';
        ctx.fill();
        break;
      case 'Cheese':
        ctx.beginPath();
        ctx.moveTo(-14, 7);
        ctx.lineTo(14, 7);
        ctx.lineTo(8, -8);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ca8a04';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-3, 0, 2.2, 0, Math.PI * 2);
        ctx.arc(4, 2, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#eab308';
        ctx.fill();
        break;
      case 'Meat':
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#7f1d1d';
        ctx.stroke();
        break;
      case 'Sandwich':
        roundRect(ctx, -15, 2, 30, 8, 3);
        ctx.fillStyle = '#d97706';
        ctx.fill();
        roundRect(ctx, -17, -2, 34, 5, 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        roundRect(ctx, -15, -9, 30, 8, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      case 'DeluxeSandwich':
        roundRect(ctx, -15, 4, 30, 7, 3);
        ctx.fillStyle = '#d97706';
        ctx.fill();
        roundRect(ctx, -16, 0, 32, 5, 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        roundRect(ctx, -17, -4, 34, 5, 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        roundRect(ctx, -15, -10, 30, 7, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        break;
      default:
        atom(formula, 0, 0, true);
        break;
    }
    ctx.restore();
  }

  function drawButton(ctx, btn, active = false) {
    ctx.save();
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.r || 6);
    if (active) {
      ctx.fillStyle = btn.activeBg || '#2563eb';
      ctx.strokeStyle = btn.activeBorder || '#60a5fa';
    } else {
      ctx.fillStyle = btn.bg || '#334155';
      ctx.strokeStyle = btn.border || '#475569';
    }
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = active ? '#ffffff' : btn.color || '#f1f5f9';
    ctx.font = btn.font || 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 0.5);
    ctx.restore();
  }

  function hitBox(px, py, box) {
    return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
  }

  function drawHeatCoolBucket(ctx, cx, bottomY, heatLevel) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 52, bottomY + 12);
    ctx.lineTo(cx + 52, bottomY + 12);
    ctx.lineTo(cx + 42, bottomY + 54);
    ctx.lineTo(cx - 42, bottomY + 54);
    ctx.closePath();
    const bGrad = ctx.createLinearGradient(cx - 50, bottomY, cx + 50, bottomY);
    bGrad.addColorStop(0, '#475569');
    bGrad.addColorStop(0.5, '#94a3b8');
    bGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    if (heatLevel > 0.05) {
      const h = 14 + heatLevel * 28;
      for (let i = -2; i <= 2; i++) {
        const fx = cx + i * 14;
        const fy = bottomY + 12;
        ctx.beginPath();
        ctx.moveTo(fx - 9, fy);
        ctx.quadraticCurveTo(fx - 4, fy - h * 0.7, fx, fy - h);
        ctx.quadraticCurveTo(fx + 4, fy - h * 0.7, fx + 9, fy);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(249,115,22,0.88)' : 'rgba(250,204,21,0.92)';
        ctx.fill();
      }
    } else if (heatLevel < -0.05) {
      const c = Math.abs(heatLevel);
      for (let i = -2; i <= 2; i++) {
        const ix = cx + i * 13;
        const iy = bottomY + 4 - c * 10;
        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(i * 0.2);
        roundRect(ctx, -7, -7, 14, 14, 3);
        ctx.fillStyle = 'rgba(56,189,248,0.82)';
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      heatLevel > 0.05 ? '🔥 加热中' : heatLevel < -0.05 ? '❄️ 冷却中' : '加热 / 冷却器',
      cx,
      bottomY + 34
    );
    ctx.restore();
  }

  function drawThermometer(ctx, x, y, h, tempK, maxK = 600, showCelsius = false) {
    ctx.save();
    const bulbR = 11;
    const tubeW = 10;
    roundRect(ctx, x - 34, y - 24, 88, h + 46, 8);
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRect(ctx, x - tubeW / 2, y, tubeW, h, 5);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const frac = clamp(tempK / maxK, 0.02, 1);
    const fillH = frac * (h - 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - tubeW / 2 + 2, y + h - fillH, tubeW - 4, fillH + 4);

    ctx.beginPath();
    ctx.arc(x, y + h + 5, bulbR, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const valStr = showCelsius
      ? `${Math.round(tempK - 273.15)} °C`
      : `${Math.round(tempK)} K`;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(valStr, x + 10, y - 9);
    ctx.restore();
  }

  function drawPressureGauge(ctx, cx, cy, r, pressureAtm, maxAtm = 50, unit = 'atm') {
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 5, cy + r - 2, 10, 14);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    const startAng = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    for (let i = 0; i <= 10; i++) {
      const a = startAng + (i / 10) * sweep;
      const x1 = cx + Math.cos(a) * (r - 8);
      const y1 = cy + Math.sin(a) * (r - 8);
      const x2 = cx + Math.cos(a) * (r - 3);
      const y2 = cy + Math.sin(a) * (r - 3);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i >= 8 ? '#ef4444' : '#334155';
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.stroke();
    }

    const pFrac = clamp(pressureAtm / maxAtm, 0, 1.05);
    const needleAng = startAng + pFrac * sweep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAng) * (r - 10), cy + Math.sin(needleAng) * (r - 10));
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    const dispVal =
      unit === 'kPa'
        ? `${(pressureAtm * 101.325).toFixed(0)} kPa`
        : `${pressureAtm.toFixed(1)} atm`;
    roundRect(ctx, cx - 32, cy + r * 0.28, 64, 16, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dispVal, cx, cy + r * 0.28 + 8);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 9px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('PRESSURE', cx, cy - r * 0.35);
    ctx.restore();
  }

  // ============================================================================
  // 1. BALANCING CHEMICAL EQUATIONS ('balancing-chemical-equations')
  // ============================================================================
  const EQUATION_BANK = {
    intro: [
      {
        id: 'ammonia',
        title: '合成氨 (Make Ammonia)',
        reactants: [
          { formula: 'N2', label: 'N₂', target: 1, atoms: { N: 2 } },
          { formula: 'H2', label: 'H₂', target: 3, atoms: { H: 2 } }
        ],
        products: [{ formula: 'NH3', label: 'NH₃', target: 2, atoms: { N: 1, H: 3 } }],
        elements: ['N', 'H']
      },
      {
        id: 'water_split',
        title: '水分解 (Separate Water)',
        reactants: [{ formula: 'H2O', label: 'H₂O', target: 2, atoms: { H: 2, O: 1 } }],
        products: [
          { formula: 'H2', label: 'H₂', target: 2, atoms: { H: 2 } },
          { formula: 'O2', label: 'O₂', target: 1, atoms: { O: 2 } }
        ],
        elements: ['H', 'O']
      },
      {
        id: 'methane_combust',
        title: '甲烷燃烧 (Combust Methane)',
        reactants: [
          { formula: 'CH4', label: 'CH₄', target: 1, atoms: { C: 1, H: 4 } },
          { formula: 'O2', label: 'O₂', target: 2, atoms: { O: 2 } }
        ],
        products: [
          { formula: 'CO2', label: 'CO₂', target: 1, atoms: { C: 1, O: 2 } },
          { formula: 'H2O', label: 'H₂O', target: 2, atoms: { H: 2, O: 1 } }
        ],
        elements: ['C', 'H', 'O']
      }
    ],
    game: [
      {
        id: 'ethene_combust',
        title: '关卡 1：乙烯燃烧',
        reactants: [
          { formula: 'C2H4', label: 'C₂H₄', target: 1, atoms: { C: 2, H: 4 } },
          { formula: 'O2', label: 'O₂', target: 3, atoms: { O: 2 } }
        ],
        products: [
          { formula: 'CO2', label: 'CO₂', target: 2, atoms: { C: 1, O: 2 } },
          { formula: 'H2O', label: 'H₂O', target: 2, atoms: { H: 2, O: 1 } }
        ],
        elements: ['C', 'H', 'O']
      },
      {
        id: 'iron_smelt',
        title: '关卡 2：赤铁矿高炉炼铁',
        reactants: [
          { formula: 'Fe2O3', label: 'Fe₂O₃', target: 1, atoms: { Fe: 2, O: 3 } },
          { formula: 'CO', label: 'CO', target: 3, atoms: { C: 1, O: 1 } }
        ],
        products: [
          { formula: 'Fe', label: 'Fe', target: 2, atoms: { Fe: 1 } },
          { formula: 'CO2', label: 'CO₂', target: 3, atoms: { C: 1, O: 2 } }
        ],
        elements: ['Fe', 'C', 'O']
      },
      {
        id: 'pcl5_hydrolysis',
        title: '关卡 3：五氯化磷水解',
        reactants: [
          { formula: 'PCl5', label: 'PCl₅', target: 1, atoms: { P: 1, Cl: 5 } },
          { formula: 'H2O', label: 'H₂O', target: 4, atoms: { H: 2, O: 1 } }
        ],
        products: [
          { formula: 'H3PO4', label: 'H₃PO₄', target: 1, atoms: { H: 3, P: 1, O: 4 } },
          { formula: 'HCl', label: 'HCl', target: 5, atoms: { H: 1, Cl: 1 } }
        ],
        elements: ['P', 'Cl', 'H', 'O']
      }
    ]
  };

  register('balancing-chemical-equations', {
    title: '配平化学方程式 (Balancing Chemical Equations)',
    init() {
      const state = {
        mode: 'intro',
        eqIndex: 0,
        toolView: 'both',
        coeffs: [1, 1, 1],
        score: 0,
        solvedSet: {},
        buttons: [],
        steppers: []
      };
      return state;
    },

    controls: [
      {
        type: 'select',
        key: 'modeSelect',
        label: '实验模式',
        options: [
          { value: 'intro:0', label: '入门 1：合成氨 (N₂ + 3H₂ → 2NH₃)' },
          { value: 'intro:1', label: '入门 2：水分解 (2H₂O → 2H₂ + O₂)' },
          { value: 'intro:2', label: '入门 3：甲烷燃烧 (CH₄ + 2O₂ → CO₂ + 2H₂O)' },
          { value: 'game:0', label: '闯关 1：乙烯燃烧 (C₂H₄ + 3O₂ → 2CO₂ + 2H₂O)' },
          { value: 'game:1', label: '闯关 2：高炉炼铁 (Fe₂O₃ + 3CO → 2Fe + 3CO₂)' },
          { value: 'game:2', label: '闯关 3：五氯化磷水解 (PCl₅ + 4H₂O → H₃PO₄ + 5HCl)' }
        ],
        default: 'intro:0'
      },
      {
        type: 'select',
        key: 'toolView',
        label: '辅助平衡视图',
        options: [
          { value: 'both', label: '同时显示天平梁 + 原子对比柱状图' },
          { value: 'scales', label: '仅显示各元素天平平衡梁' },
          { value: 'bar', label: '仅显示各元素对比柱状图' }
        ],
        default: 'both'
      },
      {
        type: 'slider',
        key: 'c0',
        label: '第 1 项化学计量系数',
        min: 0,
        max: 6,
        step: 1,
        default: 1
      },
      {
        type: 'slider',
        key: 'c1',
        label: '第 2 项化学计量系数',
        min: 0,
        max: 6,
        step: 1,
        default: 1
      },
      {
        type: 'slider',
        key: 'c2',
        label: '第 3 项化学计量系数',
        min: 0,
        max: 6,
        step: 1,
        default: 1
      },
      {
        type: 'slider',
        key: 'c3',
        label: '第 4 项化学计量系数',
        min: 0,
        max: 6,
        step: 1,
        default: 1
      }
    ],

    onParamChange(state, key, value) {
      if (key === 'modeSelect' && typeof value === 'string') {
        const [m, idxStr] = value.split(':');
        state.mode = m === 'game' ? 'game' : 'intro';
        state.eqIndex = parseInt(idxStr, 10) || 0;
        const eq = EQUATION_BANK[state.mode][state.eqIndex];
        state.coeffs = new Array(eq.reactants.length + eq.products.length).fill(1);
      } else if (key === 'toolView') {
        state.toolView = value;
      } else if (key === 'c0' || key === 'c1' || key === 'c2' || key === 'c3') {
        const idx = parseInt(key.slice(1), 10);
        if (idx < state.coeffs.length) {
          state.coeffs[idx] = clamp(Math.round(Number(value)), 0, 6);
        }
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
      for (const st of state.steppers) {
        if (hitBox(x, y, st)) {
          st.onClick();
          return;
        }
      }
    },

    reset(state) {
      const eq = EQUATION_BANK[state.mode][state.eqIndex];
      state.coeffs = new Array(eq.reactants.length + eq.products.length).fill(0);
    },

    update(state) {
      const eq = EQUATION_BANK[state.mode][state.eqIndex];
      let allPositive = true;
      for (let i = 0; i < state.coeffs.length; i++) {
        if (state.coeffs[i] <= 0) allPositive = false;
      }
      let balanced = allPositive;
      for (const el of eq.elements) {
        let leftCount = 0;
        let rightCount = 0;
        eq.reactants.forEach((r, idx) => {
          leftCount += (r.atoms[el] || 0) * (state.coeffs[idx] || 0);
        });
        eq.products.forEach((p, idx) => {
          rightCount += (p.atoms[el] || 0) * (state.coeffs[eq.reactants.length + idx] || 0);
        });
        if (leftCount === 0 || leftCount !== rightCount) {
          balanced = false;
        }
      }
      state.isBalanced = balanced;
      if (balanced && !state.solvedSet[eq.id]) {
        state.solvedSet[eq.id] = true;
        state.score += 20;
      }
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      state.steppers = [];

      const list = EQUATION_BANK[state.mode];
      const eq = list[state.eqIndex];

      drawPanel(ctx, 14, 10, 872, 50, null, '#1e293b', '#334155');
      const modeTabs = [
        { label: '🧪 入门实验 (Intro)', mode: 'intro' },
        { label: '🏆 闯关游戏 (Game)', mode: 'game' }
      ];
      modeTabs.forEach((t, i) => {
        const btn = {
          x: 24 + i * 162,
          y: 19,
          w: 152,
          h: 32,
          label: t.label,
          onClick: () => {
            state.mode = t.mode;
            state.eqIndex = 0;
            const newEq = EQUATION_BANK[state.mode][0];
            state.coeffs = new Array(newEq.reactants.length + newEq.products.length).fill(1);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.mode === t.mode);
      });

      list.forEach((item, idx) => {
        const btn = {
          x: 360 + idx * 136,
          y: 19,
          w: 130,
          h: 32,
          label: item.title.replace(/.*：/, ''),
          bg: '#0f172a',
          activeBg: '#0284c7',
          onClick: () => {
            state.eqIndex = idx;
            const e = EQUATION_BANK[state.mode][idx];
            state.coeffs = new Array(e.reactants.length + e.products.length).fill(1);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.eqIndex === idx);
      });

      const autoBtn = {
        x: 774,
        y: 19,
        w: 100,
        h: 32,
        label: '✨ 一键配平',
        bg: '#065f46',
        border: '#10b981',
        onClick: () => {
          eq.reactants.forEach((r, i) => (state.coeffs[i] = r.target));
          eq.products.forEach((p, i) => (state.coeffs[eq.reactants.length + i] = p.target));
        }
      };
      state.buttons.push(autoBtn);
      drawButton(ctx, autoBtn, false);

      drawPanel(
        ctx,
        14,
        68,
        872,
        166,
        `原子守恒实时监测 — ${eq.title}   (得分: ${state.score} 分)`,
        '#111827',
        '#334155'
      );

      const atomCounts = eq.elements.map((el) => {
        let left = 0;
        let right = 0;
        eq.reactants.forEach((r, i) => {
          left += (r.atoms[el] || 0) * (state.coeffs[i] || 0);
        });
        eq.products.forEach((p, i) => {
          right += (p.atoms[el] || 0) * (state.coeffs[eq.reactants.length + i] || 0);
        });
        return { el, left, right };
      });

      const scaleZoneW = state.toolView === 'both' ? 450 : 840;
      if (state.toolView === 'scales' || state.toolView === 'both') {
        const nEl = atomCounts.length;
        const slotW = scaleZoneW / nEl;
        atomCounts.forEach((item, idx) => {
          const cx = 26 + slotW * (idx + 0.5);
          const baseY = 216;
          const pivotY = 166;
          const beamHalf = Math.min(48, slotW * 0.36);
          const diff = clamp(item.right - item.left, -6, 6);
          const tilt = (diff / 6) * 0.32;
          const equal = item.left > 0 && item.left === item.right;

          ctx.beginPath();
          ctx.moveTo(cx, pivotY);
          ctx.lineTo(cx - 14, baseY);
          ctx.lineTo(cx + 14, baseY);
          ctx.closePath();
          ctx.fillStyle = equal ? '#10b981' : '#475569';
          ctx.fill();

          const st = ATOM_STYLE[item.el] || ATOM_STYLE.C;
          drawSphere(ctx, cx, baseY - 12, 10, st.color, st.stroke, item.el);

          ctx.save();
          ctx.translate(cx, pivotY);
          ctx.rotate(tilt);

          ctx.strokeStyle = equal ? '#34d399' : '#94a3b8';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-beamHalf, 0);
          ctx.lineTo(beamHalf, 0);
          ctx.stroke();

          [-beamHalf, beamHalf].forEach((px, sideIdx) => {
            const count = sideIdx === 0 ? item.left : item.right;
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, -10);
            ctx.moveTo(px - 18, -10);
            ctx.lineTo(px + 18, -10);
            ctx.stroke();

            const showAtoms = Math.min(count, 12);
            for (let a = 0; a < showAtoms; a++) {
              const col = a % 3;
              const row = Math.floor(a / 3);
              drawSphere(ctx, px - 8 + col * 8, -16 - row * 8, 4.2, st.color, st.stroke);
            }
          });
          ctx.restore();

          ctx.fillStyle = equal ? '#4ade80' : '#cbd5e1';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${item.el}: 左 ${item.left} ${equal ? '=' : '≠'} 右 ${item.right}`,
            cx,
            baseY + 11
          );
        });
      }

      if (state.toolView === 'bar' || state.toolView === 'both') {
        const startX = state.toolView === 'both' ? 490 : 60;
        const chartW = state.toolView === 'both' ? 375 : 780;
        const baseY = 208;
        const maxBarH = 92;
        const maxAtoms = Math.max(8, ...atomCounts.map((a) => Math.max(a.left, a.right)));

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, baseY);
        ctx.lineTo(startX + chartW, baseY);
        ctx.stroke();

        const groupW = chartW / atomCounts.length;
        atomCounts.forEach((item, idx) => {
          const gx = startX + groupW * (idx + 0.5);
          const st = ATOM_STYLE[item.el] || ATOM_STYLE.C;
          const hL = (item.left / maxAtoms) * maxBarH;
          const hR = (item.right / maxAtoms) * maxBarH;
          const equal = item.left > 0 && item.left === item.right;

          ctx.fillStyle = st.color;
          ctx.fillRect(gx - 20, baseY - hL, 17, hL);
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1;
          ctx.strokeRect(gx - 20, baseY - hL, 17, hL);

          ctx.fillStyle = st.color;
          ctx.fillRect(gx + 3, baseY - hR, 17, hR);
          ctx.strokeStyle = equal ? '#4ade80' : '#94a3b8';
          ctx.strokeRect(gx + 3, baseY - hR, 17, hR);

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(item.left), gx - 11.5, baseY - hL - 6);
          ctx.fillText(String(item.right), gx + 11.5, baseY - hR - 6);

          ctx.fillStyle = equal ? '#4ade80' : '#f87171';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(equal ? '=' : '≠', gx, baseY + 14);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(item.el, gx, baseY - maxBarH - 12);
        });
      }

      if (state.isBalanced) {
        roundRect(ctx, 330, 72, 240, 32, 16);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('😊 方程式已完美配平！原子守恒！', 450, 88);
      }

      drawPanel(ctx, 14, 242, 416, 200, '反应物分子 (Reactants)', '#0f172a', '#3b82f6');
      drawPanel(ctx, 470, 242, 416, 200, '生成物分子 (Products)', '#0f172a', '#10b981');

      ctx.save();
      ctx.fillStyle = state.isBalanced ? '#34d399' : '#64748b';
      ctx.font = 'bold 26px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('➔', 450, 342);
      ctx.restore();

      const drawSpeciesGroup = (speciesList, coeffOffset, boxX, boxW) => {
        const colW = boxW / speciesList.length;
        speciesList.forEach((sp, sIdx) => {
          const count = state.coeffs[coeffOffset + sIdx] || 0;
          const startX = boxX + sIdx * colW;

          if (sIdx > 0) {
            ctx.strokeStyle = 'rgba(148,163,184,0.2)';
            ctx.beginPath();
            ctx.moveTo(startX, 275);
            ctx.lineTo(startX, 434);
            ctx.stroke();
          }

          const cols = count <= 2 ? 1 : 2;
          for (let m = 0; m < count; m++) {
            const c = m % cols;
            const r = Math.floor(m / cols);
            const mx = startX + colW * (cols === 1 ? 0.5 : 0.3 + c * 0.4);
            const my = 302 + r * 44;
            drawMoleculeIcon(ctx, sp.formula, mx, my, 1.05, 0);
          }

          if (count === 0) {
            ctx.fillStyle = '#475569';
            ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`0 × ${sp.label}`, startX + colW / 2, 350);
          }
        });
      };

      drawSpeciesGroup(eq.reactants, 0, 18, 408);
      drawSpeciesGroup(eq.products, eq.reactants.length, 474, 408);

      drawPanel(ctx, 14, 450, 872, 78, null, '#1e293b', state.isBalanced ? '#10b981' : '#475569');

      const allTerms = [
        ...eq.reactants.map((r, i) => ({ ...r, idx: i, side: 'L' })),
        ...eq.products.map((p, i) => ({
          ...p,
          idx: eq.reactants.length + i,
          side: 'R'
        }))
      ];

      const termSpacing = 820 / allTerms.length;
      allTerms.forEach((term, tIdx) => {
        const cx = 55 + termSpacing * (tIdx + 0.5);
        const cy = 489;
        const val = state.coeffs[term.idx] || 0;

        const minusBtn = {
          x: cx - 64,
          y: cy - 16,
          w: 26,
          h: 32,
          label: '−',
          bg: '#334155',
          onClick: () => {
            state.coeffs[term.idx] = clamp(val - 1, 0, 6);
          }
        };
        const plusBtn = {
          x: cx - 6,
          y: cy - 16,
          w: 26,
          h: 32,
          label: '+',
          bg: '#334155',
          onClick: () => {
            state.coeffs[term.idx] = clamp(val + 1, 0, 6);
          }
        };
        state.steppers.push(minusBtn, plusBtn);
        drawButton(ctx, minusBtn, false);
        drawButton(ctx, plusBtn, false);

        roundRect(ctx, cx - 36, cy - 16, 28, 32, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = state.isBalanced ? '#10b981' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), cx - 22, cy);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 20px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(term.label, cx + 26, cy + 1);

        if (tIdx < allTerms.length - 1) {
          const nextTerm = allTerms[tIdx + 1];
          const opX = cx + termSpacing / 2 + 12;
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 22px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(term.side !== nextTerm.side ? '⟶' : '+', opX, cy);
        }
      });
    }
  });

  // ============================================================================
  // 2. REACTANTS, PRODUCTS AND LEFTOVERS ('reactants-products-and-leftovers')
  // ============================================================================
  const RPL_SCENARIOS = [
    {
      id: 'cheese_sandwich',
      category: 'sandwiches',
      title: '奶酪三明治 (2 面包 + 1 奶酪 → 1 三明治)',
      reactants: [
        { formula: 'Bread', label: '面包片', coeff: 2 },
        { formula: 'Cheese', label: '奶酪片', coeff: 1 }
      ],
      products: [{ formula: 'Sandwich', label: '三明治', coeff: 1 }]
    },
    {
      id: 'meat_cheese_sandwich',
      category: 'sandwiches',
      title: '豪华三明治 (2 面包 + 1 火腿 + 1 奶酪 → 1 三明治)',
      reactants: [
        { formula: 'Bread', label: '面包片', coeff: 2 },
        { formula: 'Meat', label: '火腿片', coeff: 1 },
        { formula: 'Cheese', label: '奶酪片', coeff: 1 }
      ],
      products: [{ formula: 'DeluxeSandwich', label: '豪华三明治', coeff: 1 }]
    },
    {
      id: 'make_water',
      category: 'molecules',
      title: '水合成反应 (2 H₂ + 1 O₂ → 2 H₂O)',
      reactants: [
        { formula: 'H2', label: 'H₂', coeff: 2 },
        { formula: 'O2', label: 'O₂', coeff: 1 }
      ],
      products: [{ formula: 'H2O', label: 'H₂O', coeff: 2 }]
    },
    {
      id: 'make_ammonia',
      category: 'molecules',
      title: '合成氨反应 (1 N₂ + 3 H₂ → 2 NH₃)',
      reactants: [
        { formula: 'N2', label: 'N₂', coeff: 1 },
        { formula: 'H2', label: 'H₂', coeff: 3 }
      ],
      products: [{ formula: 'NH3', label: 'NH₃', coeff: 2 }]
    },
    {
      id: 'combust_methane',
      category: 'molecules',
      title: '甲烷燃烧 (1 CH₄ + 2 O₂ → 1 CO₂ + 2 H₂O)',
      reactants: [
        { formula: 'CH4', label: 'CH₄', coeff: 1 },
        { formula: 'O2', label: 'O₂', coeff: 2 }
      ],
      products: [
        { formula: 'CO2', label: 'CO₂', coeff: 1 },
        { formula: 'H2O', label: 'H₂O', coeff: 2 }
      ]
    }
  ];

  register('reactants-products-and-leftovers', {
    title: '反应物、生成物与剩余物 (Reactants, Products and Leftovers)',
    init() {
      return {
        scenarioIdx: 0,
        gameMode: false,
        hideProducts: false,
        revealed: false,
        rCounts: [5, 3, 2],
        buttons: [],
        steppers: []
      };
    },

    controls: [
      {
        type: 'select',
        key: 'scenarioIdx',
        label: '反应体系选择',
        options: [
          { value: '0', label: '🥪 奶酪三明治 (2 面包 + 1 奶酪 → 1 三明治)' },
          { value: '1', label: '🥪 豪华三明治 (2 面包 + 1 火腿 + 1 奶酪 → 1 三明治)' },
          { value: '2', label: '💧 水合成 (2 H₂ + O₂ → 2 H₂O)' },
          { value: '3', label: '🧪 氨合成 (N₂ + 3 H₂ → 2 NH₃)' },
          { value: '4', label: '🔥 甲烷燃烧 (CH₄ + 2 O₂ → CO₂ + 2 H₂O)' }
        ],
        default: '0'
      },
      {
        type: 'slider',
        key: 'r0',
        label: '反应物 1 初始数量',
        min: 0,
        max: 10,
        step: 1,
        default: 5
      },
      {
        type: 'slider',
        key: 'r1',
        label: '反应物 2 初始数量',
        min: 0,
        max: 10,
        step: 1,
        default: 3
      },
      {
        type: 'slider',
        key: 'r2',
        label: '反应物 3 初始数量 (若适用)',
        min: 0,
        max: 10,
        step: 1,
        default: 2
      },
      {
        type: 'checkbox',
        key: 'gameMode',
        label: '猜生成物与剩余物挑战模式（遮挡右侧结果箱）',
        default: false
      }
    ],

    onParamChange(state, key, value) {
      if (key === 'scenarioIdx') {
        state.scenarioIdx = clamp(parseInt(value, 10) || 0, 0, RPL_SCENARIOS.length - 1);
        state.revealed = false;
      } else if (key === 'r0' || key === 'r1' || key === 'r2') {
        const i = parseInt(key.slice(1), 10);
        state.rCounts[i] = clamp(Math.round(Number(value)), 0, 10);
      } else if (key === 'gameMode') {
        state.gameMode = Boolean(value);
        state.revealed = false;
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
      for (const st of state.steppers) {
        if (hitBox(x, y, st)) {
          st.onClick();
          return;
        }
      }
    },

    reset(state) {
      state.rCounts = [4, 3, 2];
      state.revealed = false;
    },

    update(state) {
      const sc = RPL_SCENARIOS[state.scenarioIdx];
      let extent = Infinity;
      let limitingIdx = -1;
      sc.reactants.forEach((r, idx) => {
        const possible = Math.floor((state.rCounts[idx] || 0) / r.coeff);
        if (possible < extent) {
          extent = possible;
          limitingIdx = idx;
        }
      });
      if (!isFinite(extent)) extent = 0;
      state.extent = extent;
      state.limitingIdx = extent > 0 ? limitingIdx : -1;
      state.productCounts = sc.products.map((p) => extent * p.coeff);
      state.leftoverCounts = sc.reactants.map(
        (r, idx) => (state.rCounts[idx] || 0) - extent * r.coeff
      );
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      state.steppers = [];

      const sc = RPL_SCENARIOS[state.scenarioIdx];

      drawPanel(ctx, 14, 10, 872, 50, null, '#1e293b', '#334155');
      RPL_SCENARIOS.forEach((item, idx) => {
        const shortLabels = ['🥪 奶酪三明治', '🥪 豪华三明治', '💧 水合成', '🧪 氨合成', '🔥 甲烷燃烧'];
        const btn = {
          x: 22 + idx * 140,
          y: 19,
          w: 132,
          h: 32,
          label: shortLabels[idx],
          onClick: () => {
            state.scenarioIdx = idx;
            state.revealed = false;
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.scenarioIdx === idx);
      });

      const challengeBtn = {
        x: 726,
        y: 19,
        w: 150,
        h: 32,
        label: state.gameMode ? '🎯 退出猜题挑战' : '🎲 猜剩余物挑战',
        bg: '#4f46e5',
        activeBg: '#d97706',
        onClick: () => {
          state.gameMode = !state.gameMode;
          state.revealed = false;
          if (state.gameMode) {
            state.rCounts = sc.reactants.map(() => 2 + Math.floor(Math.random() * 7));
          }
        }
      };
      state.buttons.push(challengeBtn);
      drawButton(ctx, challengeBtn, state.gameMode);

      drawPanel(ctx, 14, 68, 872, 54, null, '#111827', '#334155');
      const eqStrLeft = sc.reactants.map((r) => `${r.coeff} ${r.label}`).join('  +  ');
      const eqStrRight = sc.products.map((p) => `${p.coeff} ${p.label}`).join('  +  ');
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 17px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`化学计量式：  ${eqStrLeft}   ⟶   ${eqStrRight}`, 450, 88);

      let limText = '请投入反应物以触发反应';
      if (state.extent > 0) {
        const limName = sc.reactants[state.limitingIdx]?.label || '';
        limText = `反应进度 ξ = ${state.extent} 批次  |  限量反应物 (Limiting Reagent): ${limName}`;
      } else {
        limText = '当前反应物不足以完成 1 个计量批次 (ξ = 0)，全部作为剩余物保留';
      }
      ctx.fillStyle = state.extent > 0 ? '#4ade80' : '#fbbf24';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(limText, 450, 110);

      drawPanel(ctx, 14, 130, 412, 296, '反应前：初始反应物 (Reactants)', '#0f172a', '#3b82f6');
      drawPanel(ctx, 474, 130, 412, 296, '反应后：生成物 (Products) 与 剩余物 (Leftovers)', '#0f172a', '#10b981');

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⟶', 450, 275);

      const rColW = 396 / sc.reactants.length;
      sc.reactants.forEach((r, idx) => {
        const count = state.rCounts[idx] || 0;
        const x0 = 22 + idx * rColW;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(148,163,184,0.2)';
          ctx.beginPath();
          ctx.moveTo(x0, 162);
          ctx.lineTo(x0, 418);
          ctx.stroke();
        }
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${r.label} (×${count})`, x0 + rColW / 2, 174);

        for (let m = 0; m < count; m++) {
          const col = m % 2;
          const row = Math.floor(m / 2);
          const mx = x0 + rColW * (0.32 + col * 0.36);
          const my = 205 + row * 40;
          drawMoleculeIcon(ctx, r.formula, mx, my, 0.95, 0);
        }
      });

      if (state.gameMode && !state.revealed) {
        roundRect(ctx, 488, 166, 384, 246, 10);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 38px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❓', 680, 245);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('根据左侧反应物数量，心算生成多少产物、剩余多少反应物！', 680, 290);

        const revealBtn = {
          x: 600,
          y: 320,
          w: 160,
          h: 38,
          label: '👁️ 揭晓反应结果',
          bg: '#d97706',
          onClick: () => {
            state.revealed = true;
          }
        };
        state.buttons.push(revealBtn);
        drawButton(ctx, revealBtn, false);
      } else {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('生成物 (Products)', 580, 174);

        const pColW = 196 / sc.products.length;
        sc.products.forEach((p, idx) => {
          const count = state.productCounts[idx] || 0;
          const x0 = 482 + idx * pColW;
          for (let m = 0; m < count; m++) {
            const col = m % 2;
            const row = Math.floor(m / 2);
            const mx = x0 + pColW * (0.32 + col * 0.36);
            const my = 205 + row * 40;
            drawMoleculeIcon(ctx, p.formula, mx, my, 0.92, 0);
          }
          ctx.fillStyle = '#86efac';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`${p.label}: ${count}`, x0 + pColW / 2, 410);
        });

        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(682, 164);
        ctx.lineTo(682, 418);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('过量剩余物 (Leftovers)', 782, 174);

        const lColW = 194 / sc.reactants.length;
        sc.reactants.forEach((r, idx) => {
          const count = state.leftoverCounts[idx] || 0;
          const x0 = 686 + idx * lColW;
          for (let m = 0; m < count; m++) {
            const col = m % 2;
            const row = Math.floor(m / 2);
            const mx = x0 + lColW * (0.34 + col * 0.34);
            const my = 205 + row * 40;
            drawMoleculeIcon(ctx, r.formula, mx, my, 0.9, 0);
          }
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(`${r.label}: ${count}`, x0 + lColW / 2, 410);
        });
      }

      drawPanel(ctx, 14, 434, 412, 94, null, '#1e293b', '#3b82f6');
      drawPanel(ctx, 474, 434, 412, 94, null, '#1e293b', '#10b981');

      sc.reactants.forEach((r, idx) => {
        const cx = 22 + rColW * (idx + 0.5);
        const cy = 482;
        const val = state.rCounts[idx] || 0;

        const minusBtn = {
          x: cx - 50,
          y: cy - 14,
          w: 26,
          h: 28,
          label: '−',
          onClick: () => {
            state.rCounts[idx] = clamp(val - 1, 0, 10);
          }
        };
        const plusBtn = {
          x: cx + 24,
          y: cy - 14,
          w: 26,
          h: 28,
          label: '+',
          onClick: () => {
            state.rCounts[idx] = clamp(val + 1, 0, 10);
          }
        };
        state.steppers.push(minusBtn, plusBtn);
        drawButton(ctx, minusBtn, false);
        drawButton(ctx, plusBtn, false);

        roundRect(ctx, cx - 20, cy - 14, 40, 28, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), cx, cy);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(r.label, cx, cy + 26);
      });

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      const prodSummary = sc.products
        .map((p, i) => `${p.label} × ${state.gameMode && !state.revealed ? '?' : state.productCounts[i]}`)
        .join('  ，  ');
      const leftSummary = sc.reactants
        .map((r, i) => `${r.label} × ${state.gameMode && !state.revealed ? '?' : state.leftoverCounts[i]}`)
        .join('  ，  ');
      ctx.fillText(`生成产物：  ${prodSummary}`, 492, 464);
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(`过量剩余：  ${leftSummary}`, 492, 496);
    }
  });

  // ============================================================================
  // SHARED LENNARD-JONES & H2O HEXAGONAL ICE ENGINE FOR SIMS 3 & 4
  // ============================================================================
  const MATTER_SUBSTANCES = {
    neon: {
      id: 'neon',
      name: '氖 (Ne)',
      formula: 'Ne',
      sigma: 19,
      epsilon: 1.0,
      mass: 20.18,
      tripleT: 24.6,
      tripleP: 0.43,
      critT: 44.4,
      critP: 26.8,
      solidT: 14,
      liquidT: 27,
      gasT: 110,
      slopeSL: 1.0
    },
    argon: {
      id: 'argon',
      name: '氩 (Ar)',
      formula: 'Ar',
      sigma: 22,
      epsilon: 2.2,
      mass: 39.95,
      tripleT: 83.8,
      tripleP: 0.68,
      critT: 150.8,
      critP: 48.1,
      solidT: 45,
      liquidT: 92,
      gasT: 220,
      slopeSL: 1.0
    },
    oxygen: {
      id: 'oxygen',
      name: '氧气 (O₂)',
      formula: 'O2',
      sigma: 23,
      epsilon: 2.0,
      mass: 32.0,
      tripleT: 54.4,
      tripleP: 0.0015,
      critT: 154.6,
      critP: 49.8,
      solidT: 32,
      liquidT: 72,
      gasT: 240,
      slopeSL: 1.0
    },
    water: {
      id: 'water',
      name: '水 (H₂O)',
      formula: 'H2O',
      sigma: 23,
      epsilon: 4.5,
      mass: 18.02,
      tripleT: 273.16,
      tripleP: 0.006,
      critT: 647.1,
      critP: 217.7,
      solidT: 165,
      liquidT: 305,
      gasT: 480,
      slopeSL: -0.75
    }
  };

  function createMatterParticles(substanceKey, phase, count, box) {
    const sub = MATTER_SUBSTANCES[substanceKey] || MATTER_SUBSTANCES.neon;
    const particles = [];
    const cx = (box.left + box.right) / 2;
    const bottom = box.bottom;

    if (substanceKey === 'water' && phase === 'solid') {
      const ringR = 26;
      const centers = [
        { rx: -62, ry: bottom - 55 },
        { rx: 0, ry: bottom - 55 },
        { rx: 62, ry: bottom - 55 },
        { rx: -31, ry: bottom - 108 },
        { rx: 31, ry: bottom - 108 },
        { rx: -62, ry: bottom - 160 },
        { rx: 0, ry: bottom - 160 },
        { rx: 62, ry: bottom - 160 }
      ];
      const coords = [];
      const seen = [];
      for (const c of centers) {
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI) / 3 + Math.PI / 6;
          const px = cx + c.rx + Math.cos(ang) * ringR;
          const py = c.ry + Math.sin(ang) * ringR;
          let dup = false;
          for (const s of seen) {
            if (Math.hypot(s.x - px, s.y - py) < 12) {
              dup = true;
              break;
            }
          }
          if (!dup) {
            seen.push({ x: px, y: py });
            coords.push({ x: px, y: py, angle: ang + Math.PI / 2 });
          }
        }
      }
      const n = Math.min(count, coords.length);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: coords[i].x,
          y: coords[i].y,
          anchorX: coords[i].x,
          anchorY: coords[i].y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          angle: coords[i].angle,
          omega: 0
        });
      }
      return particles;
    }

    if (phase === 'solid') {
      const cols = 7;
      const dx = sub.sigma * 1.05;
      const dy = sub.sigma * 0.91;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const px = cx - ((cols - 1) * dx) / 2 + c * dx + (r % 2) * (dx * 0.5);
        const py = bottom - 20 - r * dy;
        particles.push({
          x: px,
          y: py,
          anchorX: px,
          anchorY: py,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          angle: (i * 0.7) % (Math.PI * 2),
          omega: (Math.random() - 0.5) * 0.5
        });
      }
    } else if (phase === 'liquid') {
      const cols = 9;
      const dx = sub.sigma * (substanceKey === 'water' ? 0.96 : 1.12);
      const dy = sub.sigma * (substanceKey === 'water' ? 0.92 : 1.04);
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const px = cx - ((cols - 1) * dx) / 2 + c * dx + (Math.random() - 0.5) * 4;
        const py = bottom - 18 - r * dy;
        particles.push({
          x: px,
          y: py,
          anchorX: null,
          anchorY: null,
          vx: (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 35,
          angle: Math.random() * Math.PI * 2,
          omega: (Math.random() - 0.5) * 2
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: box.left + 24 + Math.random() * (box.right - box.left - 48),
          y: box.top + 24 + Math.random() * (box.bottom - box.top - 48),
          anchorX: null,
          anchorY: null,
          vx: (Math.random() - 0.5) * 140,
          vy: (Math.random() - 0.5) * 140,
          angle: Math.random() * Math.PI * 2,
          omega: (Math.random() - 0.5) * 4
        });
      }
    }
    return particles;
  }

  function stepMatterSimulation(state, dt) {
    const dtClamped = Math.min(dt || 0.016, 0.025);
    const sub = MATTER_SUBSTANCES[state.substance] || MATTER_SUBSTANCES.neon;
    const box = state.box;

    if (Math.abs(state.heatLevel) > 0.02) {
      state.tempK = clamp(state.tempK + state.heatLevel * 55 * dtClamped, 5, 700);
    }

    const meltT = sub.tripleT;
    const boilT = sub.tripleT * 1.85;
    if (state.tempK < meltT * 0.92) {
      state.currentPhase = 'solid';
    } else if (state.tempK < boilT) {
      state.currentPhase = 'liquid';
    } else {
      state.currentPhase = 'gas';
    }

    if (state.substance === 'water' && state.currentPhase === 'solid' && !state.hasIceAnchors) {
      const templ = createMatterParticles('water', 'solid', state.particles.length, box);
      state.particles.forEach((p, idx) => {
        const t = templ[idx % templ.length];
        p.anchorX = t.anchorX;
        p.anchorY = t.anchorY;
      });
      state.hasIceAnchors = true;
    } else if (state.currentPhase !== 'solid') {
      state.hasIceAnchors = false;
    }

    const n = state.particles.length;
    const sigma = sub.sigma;
    const eps = sub.epsilon * 2400;
    const targetSpeed = Math.sqrt(state.tempK) * 6.8;
    let wallImpulse = 0;

    const fx = new Float64Array(n);
    const fy = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      fy[i] += state.currentPhase === 'gas' ? 18 : 95;
      const p = state.particles[i];
      if (state.substance === 'water' && state.currentPhase === 'solid' && p.anchorX != null) {
        fx[i] += (p.anchorX - p.x) * 45;
        fy[i] += (p.anchorY - p.y) * 45;
      }
    }

    for (let i = 0; i < n; i++) {
      const pi = state.particles[i];
      for (let j = i + 1; j < n; j++) {
        const pj = state.particles[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const distSq = dx * dx + dy * dy;
        const minDist = sigma * 0.86;
        const cutDist = sigma * 2.6;
        if (distSq < cutDist * cutDist && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const effD = Math.max(dist, minDist);
          const sr = sigma / effD;
          const sr6 = sr * sr * sr * sr * sr * sr;
          let fMag = clamp((24 * eps * (2 * sr6 * sr6 - sr6)) / effD, -1800, 1200);
          if (state.substance === 'water' && state.currentPhase === 'solid') {
            fMag *= 0.25;
          }
          const ux = dx / dist;
          const uy = dy / dist;
          fx[i] -= fMag * ux;
          fy[i] -= fMag * uy;
          fx[j] += fMag * ux;
          fy[j] += fMag * uy;
        }
      }
    }

    const r = sigma * 0.48;
    for (let i = 0; i < n; i++) {
      const p = state.particles[i];
      p.vx += fx[i] * dtClamped;
      p.vy += fy[i] * dtClamped;

      const spd = Math.hypot(p.vx, p.vy) || 1;
      const blend = 0.12;
      const desired = state.currentPhase === 'solid' ? targetSpeed * 0.32 : targetSpeed;
      const scale = 1 + ((desired - spd) / spd) * blend;
      p.vx *= scale;
      p.vy *= scale;

      p.x += p.vx * dtClamped;
      p.y += p.vy * dtClamped;
      p.angle += p.omega * dtClamped;

      if (p.x < box.left + r) {
        p.x = box.left + r;
        p.vx = Math.abs(p.vx);
        wallImpulse += Math.abs(p.vx);
      } else if (p.x > box.right - r) {
        p.x = box.right - r;
        p.vx = -Math.abs(p.vx);
        wallImpulse += Math.abs(p.vx);
      }

      if (p.y < box.top + r) {
        p.y = box.top + r;
        p.vy = Math.abs(p.vy);
        wallImpulse += Math.abs(p.vy);
      } else if (p.y > box.bottom - r) {
        p.y = box.bottom - r;
        p.vy = -Math.abs(p.vy) * 0.9;
        wallImpulse += Math.abs(p.vy);
      }
    }

    const volFrac = Math.max(0.18, (box.bottom - box.top) / 280);
    const rawP = ((n / 36) * (state.tempK / 273.15)) / volFrac + wallImpulse * 0.0005;
    state.pressureAtm = state.pressureAtm * 0.9 + rawP * 0.1;
  }

  function drawMatterParticle(ctx, substanceKey, p) {
    if (substanceKey === 'neon') {
      drawSphere(ctx, p.x, p.y, 9.5, ATOM_STYLE.Ne.color, ATOM_STYLE.Ne.stroke);
    } else if (substanceKey === 'argon') {
      drawSphere(ctx, p.x, p.y, 11.5, ATOM_STYLE.Ar.color, ATOM_STYLE.Ar.stroke);
    } else if (substanceKey === 'oxygen') {
      drawMoleculeIcon(ctx, 'O2', p.x, p.y, 0.72, p.angle);
    } else if (substanceKey === 'water') {
      drawMoleculeIcon(ctx, 'H2O', p.x, p.y, 0.78, p.angle);
    }
  }

  // ============================================================================
  // 3. STATES OF MATTER: BASICS ('states-of-matter-basics')
  // ============================================================================
  register('states-of-matter-basics', {
    title: '物质状态：基础 (States of Matter: Basics)',
    init() {
      const box = { left: 95, top: 82, right: 495, bottom: 382 };
      const state = {
        substance: 'water',
        currentPhase: 'solid',
        tempK: MATTER_SUBSTANCES.water.solidT,
        heatLevel: 0,
        showCelsius: false,
        pressureAtm: 1.0,
        box,
        hasIceAnchors: true,
        particles: createMatterParticles('water', 'solid', 36, box),
        buttons: []
      };
      return state;
    },

    controls: [
      {
        type: 'select',
        key: 'substance',
        label: '物质种类 (Atoms & Molecules)',
        options: [
          { value: 'neon', label: '氖原子 (Neon, Ne)' },
          { value: 'argon', label: '氩原子 (Argon, Ar)' },
          { value: 'oxygen', label: '氧气分子 (Oxygen, O₂)' },
          { value: 'water', label: '水分子 (Water, H₂O - 含氢键冰晶格)' }
        ],
        default: 'water'
      },
      {
        type: 'select',
        key: 'phasePreset',
        label: '物质三态一键切换',
        options: [
          { value: 'solid', label: '🧊 固态 (Solid)' },
          { value: 'liquid', label: '💧 液态 (Liquid)' },
          { value: 'gas', label: '☁️ 气态 (Gas)' }
        ],
        default: 'solid'
      },
      {
        type: 'slider',
        key: 'heatLevel',
        label: '底部冷热源调节 (-1 冰块冷却 .. +1 火焰加热)',
        min: -1,
        max: 1,
        step: 0.1,
        default: 0
      },
      {
        type: 'checkbox',
        key: 'showCelsius',
        label: '温度计切换为摄氏度 (°C)',
        default: false
      }
    ],

    onParamChange(state, key, value) {
      const sub = MATTER_SUBSTANCES[state.substance] || MATTER_SUBSTANCES.neon;
      if (key === 'substance' && MATTER_SUBSTANCES[value]) {
        state.substance = value;
        const newSub = MATTER_SUBSTANCES[value];
        state.tempK = newSub.solidT;
        state.currentPhase = 'solid';
        state.hasIceAnchors = value === 'water';
        state.particles = createMatterParticles(value, 'solid', 36, state.box);
      } else if (key === 'phasePreset') {
        state.currentPhase = value;
        state.tempK =
          value === 'solid' ? sub.solidT : value === 'liquid' ? sub.liquidT : sub.gasT;
        state.hasIceAnchors = state.substance === 'water' && value === 'solid';
        state.particles = createMatterParticles(state.substance, value, 36, state.box);
      } else if (key === 'heatLevel') {
        state.heatLevel = clamp(Number(value), -1, 1);
      } else if (key === 'showCelsius') {
        state.showCelsius = Boolean(value);
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
    },

    reset(state) {
      const sub = MATTER_SUBSTANCES[state.substance];
      state.tempK = sub.solidT;
      state.currentPhase = 'solid';
      state.heatLevel = 0;
      state.hasIceAnchors = state.substance === 'water';
      state.particles = createMatterParticles(state.substance, 'solid', 36, state.box);
    },

    update(state, dt) {
      stepMatterSimulation(state, dt);
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      const sub = MATTER_SUBSTANCES[state.substance];
      const box = state.box;

      drawPanel(
        ctx,
        24,
        18,
        526,
        504,
        `微观粒子观察容器 — 当前物质：${sub.name}`,
        '#111827',
        '#334155'
      );

      roundRect(ctx, box.left, box.top, box.right - box.left, box.bottom - box.top, 8);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      if (state.substance === 'water' && state.currentPhase === 'solid') {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.4;
        for (let i = 0; i < state.particles.length; i++) {
          for (let j = i + 1; j < state.particles.length; j++) {
            const d = Math.hypot(
              state.particles[i].x - state.particles[j].x,
              state.particles[i].y - state.particles[j].y
            );
            if (d < 34) {
              ctx.beginPath();
              ctx.moveTo(state.particles[i].x, state.particles[i].y);
              ctx.lineTo(state.particles[j].x, state.particles[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      for (const p of state.particles) {
        drawMatterParticle(ctx, state.substance, p);
      }

      const unitBtn = {
        x: box.left - 58,
        y: box.top - 22,
        w: 84,
        h: 22,
        label: state.showCelsius ? '切换 K' : '切换 °C',
        onClick: () => {
          state.showCelsius = !state.showCelsius;
        }
      };
      state.buttons.push(unitBtn);
      drawThermometer(ctx, box.left - 24, box.top + 8, 130, state.tempK, 550, state.showCelsius);

      drawHeatCoolBucket(ctx, (box.left + box.right) / 2, box.bottom, state.heatLevel);

      const heatBtn = {
        x: (box.left + box.right) / 2 - 145,
        y: box.bottom + 18,
        w: 82,
        h: 34,
        label: '🔥 升温 +',
        bg: '#b45309',
        onClick: () => {
          state.tempK = clamp(state.tempK + 22, 5, 650);
        }
      };
      const coolBtn = {
        x: (box.left + box.right) / 2 + 63,
        y: box.bottom + 18,
        w: 82,
        h: 34,
        label: '❄️ 降温 −',
        bg: '#0369a1',
        onClick: () => {
          state.tempK = clamp(state.tempK - 22, 5, 650);
        }
      };
      state.buttons.push(heatBtn, coolBtn);
      drawButton(ctx, heatBtn, false);
      drawButton(ctx, coolBtn, false);

      drawPanel(ctx, 564, 18, 316, 178, '物质选择 (Atoms & Molecules)', '#1e293b', '#334155');
      const subKeys = ['neon', 'argon', 'oxygen', 'water'];
      subKeys.forEach((k, idx) => {
        const s = MATTER_SUBSTANCES[k];
        const btn = {
          x: 580 + (idx % 2) * 146,
          y: 58 + Math.floor(idx / 2) * 58,
          w: 136,
          h: 46,
          label: s.name,
          onClick: () => {
            state.substance = k;
            state.tempK = s.solidT;
            state.currentPhase = 'solid';
            state.hasIceAnchors = k === 'water';
            state.particles = createMatterParticles(k, 'solid', 36, state.box);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.substance === k);
      });

      drawPanel(ctx, 564, 208, 316, 130, '物质三态切换 (States)', '#1e293b', '#334155');
      const phases = [
        { id: 'solid', label: '🧊 固态 (Solid)', t: sub.solidT },
        { id: 'liquid', label: '💧 液态 (Liquid)', t: sub.liquidT },
        { id: 'gas', label: '☁️ 气态 (Gas)', t: sub.gasT }
      ];
      phases.forEach((ph, idx) => {
        const btn = {
          x: 580 + idx * 96,
          y: 252,
          w: 88,
          h: 44,
          label: ph.label.split(' ')[0] + ' ' + ph.label.split(' ')[1],
          onClick: () => {
            state.currentPhase = ph.id;
            state.tempK = ph.t;
            state.hasIceAnchors = state.substance === 'water' && ph.id === 'solid';
            state.particles = createMatterParticles(state.substance, ph.id, 36, state.box);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.currentPhase === ph.id);
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `预设温度：固态 ${sub.solidT} K  |  液态 ${sub.liquidT} K  |  气态 ${sub.gasT} K`,
        722,
        318
      );

      drawPanel(ctx, 564, 350, 316, 172, '微观结构与反常膨胀特性解析', '#1e293b', '#334155');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      const lines =
        state.substance === 'water'
          ? [
              `• 当前温度：${Math.round(state.tempK)} K (${Math.round(state.tempK - 273.15)} °C)`,
              `• 宏观相态：${state.currentPhase === 'solid' ? '固态冰 (六方氢键晶格)' : state.currentPhase === 'liquid' ? '液态水 (氢键动态断裂重组)' : '水蒸气 (自由高速热运动)'}`,
              '• 水的反常膨胀：固态冰中每个 H₂O 形成四面体',
              '  开放六元环氢键网络，内部存在较大空隙，',
              '  因此固态冰体积大于液态水（ρ_冰 < ρ_水）。'
            ]
          : [
              `• 当前温度：${Math.round(state.tempK)} K (${Math.round(state.tempK - 273.15)} °C)`,
              `• 范德华作用能 ε/k_B 比例：${sub.epsilon.toFixed(1)}`,
              `• 正常物质规律：固态为紧密堆积晶格，密度最大；`,
              `  熔化为液态后间距略增，气化后分子充满整个容器。`,
              `• 三相点温度：${sub.tripleT} K，临界温度：${sub.critT} K`
            ];
      lines.forEach((ln, idx) => {
        ctx.fillStyle = idx === 1 ? '#38bdf8' : '#cbd5e1';
        ctx.fillText(ln, 578, 388 + idx * 24);
      });
    }
  });

  // ============================================================================
  // 4. STATES OF MATTER ('states-of-matter') - Full Phase Diagram + Piston + LJ Curve
  // ============================================================================
  register('states-of-matter', {
    title: '物质状态：相变与分子间势能 (States of Matter)',
    init() {
      const box = { left: 88, top: 110, right: 458, bottom: 390 };
      return {
        substance: 'water',
        currentPhase: 'solid',
        tempK: MATTER_SUBSTANCES.water.solidT,
        heatLevel: 0,
        pistonY: 110,
        draggingPiston: false,
        showCelsius: false,
        pressureAtm: 1.0,
        box,
        hasIceAnchors: true,
        particles: createMatterParticles('water', 'solid', 36, box),
        buttons: []
      };
    },

    controls: [
      {
        type: 'select',
        key: 'substance',
        label: '物质种类',
        options: [
          { value: 'neon', label: '氖 (Neon, Ne)' },
          { value: 'argon', label: '氩 (Argon, Ar)' },
          { value: 'oxygen', label: '氧气 (Oxygen, O₂)' },
          { value: 'water', label: '水 (Water, H₂O - 固液线负斜率)' }
        ],
        default: 'water'
      },
      {
        type: 'slider',
        key: 'pistonPos',
        label: '活塞高度压缩比 (改变体积 V)',
        min: 80,
        max: 280,
        step: 5,
        default: 110
      },
      {
        type: 'slider',
        key: 'heatLevel',
        label: '底部冷热源调节 (-1 冷却 .. +1 加热)',
        min: -1,
        max: 1,
        step: 0.1,
        default: 0
      },
      {
        type: 'checkbox',
        key: 'showCelsius',
        label: '温度计切换为 °C',
        default: false
      }
    ],

    onParamChange(state, key, value) {
      if (key === 'substance' && MATTER_SUBSTANCES[value]) {
        state.substance = value;
        const sub = MATTER_SUBSTANCES[value];
        state.tempK = sub.solidT;
        state.pistonY = 110;
        state.box.top = 110;
        state.hasIceAnchors = value === 'water';
        state.particles = createMatterParticles(value, 'solid', 36, state.box);
      } else if (key === 'pistonPos') {
        state.pistonY = clamp(Number(value), 80, 280);
        state.box.top = state.pistonY;
      } else if (key === 'heatLevel') {
        state.heatLevel = clamp(Number(value), -1, 1);
      } else if (key === 'showCelsius') {
        state.showCelsius = Boolean(value);
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
      if (
        x >= state.box.left &&
        x <= state.box.right &&
        Math.abs(y - state.pistonY) <= 22
      ) {
        state.draggingPiston = true;
      }
    },

    onPointerMove(state, x, y) {
      if (state.draggingPiston) {
        state.pistonY = clamp(y, 80, 285);
        state.box.top = state.pistonY;
      }
    },

    onPointerUp(state) {
      state.draggingPiston = false;
    },

    reset(state) {
      const sub = MATTER_SUBSTANCES[state.substance];
      state.tempK = sub.solidT;
      state.pistonY = 110;
      state.box.top = 110;
      state.heatLevel = 0;
      state.hasIceAnchors = state.substance === 'water';
      state.particles = createMatterParticles(state.substance, 'solid', 36, state.box);
    },

    update(state, dt) {
      state.box.top = state.pistonY;
      stepMatterSimulation(state, dt);
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      const sub = MATTER_SUBSTANCES[state.substance];
      const box = state.box;

      drawPanel(
        ctx,
        14,
        14,
        500,
        512,
        `相变与压力实验舱 — ${sub.name} (粒子数 N = ${state.particles.length})`,
        '#111827',
        '#334155'
      );

      roundRect(ctx, box.left, 76, box.right - box.left, 390 - 76, 6);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      const pY = state.pistonY;
      ctx.fillStyle = '#64748b';
      ctx.fillRect((box.left + box.right) / 2 - 10, 48, 20, pY - 48);
      roundRect(ctx, (box.left + box.right) / 2 - 34, 42, 68, 12, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();

      const pGrad = ctx.createLinearGradient(box.left, pY - 12, box.left, pY + 6);
      pGrad.addColorStop(0, '#94a3b8');
      pGrad.addColorStop(1, '#475569');
      ctx.fillStyle = pGrad;
      ctx.fillRect(box.left + 2, pY - 12, box.right - box.left - 4, 16);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.left + 2, pY - 12, box.right - box.left - 4, 16);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⇅ 拖拽活塞改变体积 V', (box.left + box.right) / 2, pY - 3);

      for (const p of state.particles) {
        drawMatterParticle(ctx, state.substance, p);
      }

      drawPressureGauge(ctx, 52, 88, 30, state.pressureAtm, 50, 'atm');
      drawThermometer(ctx, 52, 165, 120, state.tempK, 650, state.showCelsius);

      const pumpBtn = {
        x: 24,
        y: 332,
        w: 56,
        h: 56,
        label: '⛽ 打气+',
        bg: '#0284c7',
        onClick: () => {
          if (state.particles.length < 70) {
            for (let k = 0; k < 5; k++) {
              state.particles.push({
                x: box.left + 25 + Math.random() * 60,
                y: box.bottom - 30 - Math.random() * 40,
                anchorX: null,
                anchorY: null,
                vx: 60 + Math.random() * 60,
                vy: (Math.random() - 0.5) * 60,
                angle: Math.random() * Math.PI * 2,
                omega: 0
              });
            }
          }
        }
      };
      state.buttons.push(pumpBtn);
      drawButton(ctx, pumpBtn, false);

      drawHeatCoolBucket(ctx, (box.left + box.right) / 2, box.bottom, state.heatLevel);
      const heatBtn = {
        x: (box.left + box.right) / 2 - 140,
        y: box.bottom + 18,
        w: 80,
        h: 34,
        label: '🔥 升温 +',
        bg: '#b45309',
        onClick: () => {
          state.tempK = clamp(state.tempK + 25, 5, 680);
        }
      };
      const coolBtn = {
        x: (box.left + box.right) / 2 + 60,
        y: box.bottom + 18,
        w: 80,
        h: 34,
        label: '❄️ 降温 −',
        bg: '#0369a1',
        onClick: () => {
          state.tempK = clamp(state.tempK - 25, 5, 680);
        }
      };
      state.buttons.push(heatBtn, coolBtn);
      drawButton(ctx, heatBtn, false);
      drawButton(ctx, coolBtn, false);

      drawPanel(ctx, 524, 14, 362, 86, '切换物质与相态', '#1e293b', '#334155');
      ['neon', 'argon', 'oxygen', 'water'].forEach((k, idx) => {
        const s = MATTER_SUBSTANCES[k];
        const btn = {
          x: 534 + idx * 86,
          y: 48,
          w: 80,
          h: 40,
          label: s.name.split(' ')[0],
          onClick: () => {
            state.substance = k;
            state.tempK = s.solidT;
            state.pistonY = 110;
            state.box.top = 110;
            state.hasIceAnchors = k === 'water';
            state.particles = createMatterParticles(k, 'solid', 36, state.box);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.substance === k);
      });

      drawPanel(
        ctx,
        524,
        108,
        362,
        222,
        `压力-温度 (P-T) 相图 — ${sub.name}`,
        '#1e293b',
        '#334155'
      );

      const pdX = 568;
      const pdY = 146;
      const pdW = 298;
      const pdH = 152;

      ctx.save();
      roundRect(ctx, pdX, pdY, pdW, pdH, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.clip();

      const tpX = pdX + pdW * 0.36;
      const tpY = pdY + pdH * 0.68;
      const cpX = pdX + pdW * 0.84;
      const cpY = pdY + pdH * 0.22;
      const slTopX = state.substance === 'water' ? tpX - 24 : tpX + 22;
      const slTopY = pdY + 8;

      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(56,189,248,0.75)';
      ctx.fillText('固态 (Solid)', pdX + 18, pdY + 60);
      ctx.fillStyle = 'rgba(52,211,153,0.75)';
      ctx.fillText('液态 (Liquid)', tpX + 20, pdY + 42);
      ctx.fillStyle = 'rgba(251,191,36,0.75)';
      ctx.fillText('气态 (Gas)', tpX + 45, pdY + 125);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pdX + 6, pdY + pdH - 6);
      ctx.quadraticCurveTo(pdX + pdW * 0.22, pdY + pdH * 0.86, tpX, tpY);
      ctx.stroke();

      ctx.strokeStyle = state.substance === 'water' ? '#38bdf8' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(tpX, tpY);
      ctx.lineTo(slTopX, slTopY);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(tpX, tpY);
      ctx.quadraticCurveTo(pdX + pdW * 0.64, pdY + pdH * 0.54, cpX, cpY);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(tpX, tpY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('三相点 (Triple)', tpX - 30, tpY + 15);

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cpX, cpY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('临界点 (Critical)', cpX - 58, cpY - 6);

      const tNorm = clamp(state.tempK / (sub.critT * 1.15), 0.05, 0.96);
      const pNorm = clamp(Math.log10(state.pressureAtm + 1) / 1.8, 0.06, 0.94);
      const dotX = pdX + tNorm * pdW;
      const dotY = pdY + (1 - pNorm) * pdH;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pdX, pdY, pdW, pdH);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('温度 T (K) ➔', pdX + pdW / 2, pdY + pdH + 16);
      ctx.save();
      ctx.translate(pdX - 18, pdY + pdH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('压强 P (atm) ➔', 0, 0);
      ctx.restore();

      drawPanel(
        ctx,
        524,
        338,
        362,
        188,
        `分子间势能曲线 V(r) = 4ε[(σ/r)¹² − (σ/r)⁶]`,
        '#1e293b',
        '#334155'
      );

      const ljX = 568;
      const ljY = 374;
      const ljW = 298;
      const ljH = 126;
      const zeroY = ljY + ljH * 0.42;

      roundRect(ctx, ljX, ljY, ljW, ljH, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ljX, zeroY);
      ctx.lineTo(ljX + ljW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      const sigmaNorm = sub.sigma / 28;
      const epsDepth = (sub.epsilon / 4.5) * (ljH * 0.48);

      ctx.save();
      ctx.beginPath();
      ctx.rect(ljX, ljY, ljW, ljH);
      ctx.clip();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let px = 14; px < ljW - 6; px += 2) {
        const rVal = (px / ljW) * 2.6;
        const sr = sigmaNorm / rVal;
        const sr6 = Math.pow(sr, 6);
        const v = 4 * epsDepth * (sr6 * sr6 - sr6);
        const py = zeroY - v;
        if (py >= ljY - 20 && py <= ljY + ljH + 20) {
          if (!started) {
            ctx.moveTo(ljX + px, py);
            started = true;
          } else {
            ctx.lineTo(ljX + px, py);
          }
        }
      }
      ctx.stroke();

      const rmPx = sigmaNorm * 1.122 * (ljW / 2.6);
      const minY = zeroY + epsDepth;
      ctx.strokeStyle = '#f43f5e';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ljX + rmPx, zeroY);
      ctx.lineTo(ljX + rmPx, minY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`势阱深度 −ε (${sub.name})`, ljX + rmPx + 6, minY - 4);
      ctx.restore();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('分子核间距 r ➔', ljX + ljW / 2, ljY + ljH + 16);
    }
  });

  // ============================================================================
  // SHARED KINETIC THEORY OF GASES ENGINE FOR SIMS 5 & 6
  // ============================================================================
  function spawnGasParticle(type, leftX, rightX, topY, bottomY, tempK) {
    const isHeavy = type === 'heavy';
    const mass = isHeavy ? 28 : 4;
    const radius = isHeavy ? 7.5 : 4.5;
    const baseSpeed = Math.sqrt(tempK / mass) * 42;
    const u1 = Math.max(1e-5, Math.random());
    const u2 = Math.random();
    const speed = baseSpeed * Math.sqrt(-Math.log(u1)) * 0.95;
    const theta = u2 * Math.PI * 2;
    return {
      type,
      mass,
      r: radius,
      x: leftX + radius + 6 + Math.random() * Math.max(20, rightX - leftX - 2 * radius - 12),
      y: topY + radius + 6 + Math.random() * Math.max(20, bottomY - topY - 2 * radius - 12),
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed
    };
  }

  function syncGasCount(particles, type, targetCount, leftX, rightX, topY, bottomY, tempK) {
    const current = particles.filter((p) => p.type === type);
    if (current.length < targetCount) {
      const toAdd = targetCount - current.length;
      for (let i = 0; i < toAdd; i++) {
        particles.push(spawnGasParticle(type, leftX, rightX, topY, bottomY, tempK));
      }
    } else if (current.length > targetCount) {
      let removeCount = current.length - targetCount;
      for (let i = particles.length - 1; i >= 0 && removeCount > 0; i--) {
        if (particles[i].type === type) {
          particles.splice(i, 1);
          removeCount--;
        }
      }
    }
  }

  function stepIdealGasBox(state, dt) {
    const dtC = Math.min(dt || 0.016, 0.025);
    const topY = 92;
    const bottomY = 392;
    const rightX = 510;
    let leftX = rightX - state.boxWidth;

    if (Math.abs(state.heatLevel) > 0.02 && state.holdConstant !== 'T') {
      state.tempK = clamp(state.tempK + state.heatLevel * 65 * dtC, 50, 1000);
    }

    const N = state.particles.length;

    if (state.holdConstant === 'P' && N > 0) {
      const targetP = state.targetPressureAtm || 12.0;
      const desiredWidth = clamp((N * state.tempK * 0.25) / Math.max(1, targetP), 160, 420);
      state.boxWidth = state.boxWidth * 0.9 + desiredWidth * 0.1;
      leftX = rightX - state.boxWidth;
    }

    let wallHitsThisStep = 0;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      const targetRms = Math.sqrt(state.tempK / p.mass) * 42;
      const curSpd = Math.hypot(p.vx, p.vy) || 1;
      p.x += p.vx * dtC;
      p.y += p.vy * dtC;

      if (p.x - p.r < leftX) {
        if (state.lidOpen && p.y > topY + 8 && p.y < topY + 66) {
          if (p.x < leftX - 35) {
            if (p.type === 'heavy') state.heavyCount = Math.max(0, state.heavyCount - 1);
            else state.lightCount = Math.max(0, state.lightCount - 1);
            state.particles.splice(i, 1);
            continue;
          }
        } else {
          p.x = leftX + p.r;
          p.vx = Math.abs(p.vx);
          wallHitsThisStep++;
        }
      } else if (p.x + p.r > rightX) {
        p.x = rightX - p.r;
        p.vx = -Math.abs(p.vx);
        wallHitsThisStep++;
      }

      if (p.y - p.r < topY) {
        p.y = topY + p.r;
        p.vy = Math.abs(p.vy);
        wallHitsThisStep++;
      } else if (p.y + p.r > bottomY) {
        p.y = bottomY - p.r;
        p.vy = -Math.abs(p.vy);
        wallHitsThisStep++;
      }

      const sFactor = 1 + ((targetRms - curSpd) / Math.max(20, curSpd)) * 0.015;
      p.vx *= sFactor;
      p.vy *= sFactor;
    }

    const len = state.particles.length;
    for (let i = 0; i < len; i++) {
      const p1 = state.particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = state.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const minDist = p1.r + p2.r;
        if (dx * dx + dy * dy < minDist * minDist) {
          const dist = Math.hypot(dx, dy) || 0.1;
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          p1.x -= nx * overlap * 0.5;
          p1.y -= ny * overlap * 0.5;
          p2.x += nx * overlap * 0.5;
          p2.y += ny * overlap * 0.5;

          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          const vn = dvx * nx + dvy * ny;
          if (vn > 0) {
            const impulse = (2 * vn) / (1 / p1.mass + 1 / p2.mass);
            p1.vx -= (impulse / p1.mass) * nx;
            p1.vy -= (impulse / p1.mass) * ny;
            p2.vx += (impulse / p2.mass) * nx;
            p2.vy += (impulse / p2.mass) * ny;
          }
        }
      }
    }

    state.collisionHistory.push(wallHitsThisStep);
    if (state.collisionHistory.length > 60) state.collisionHistory.shift();
    state.wallCollisions = state.collisionHistory.reduce((a, b) => a + b, 0);

    const volNm = state.boxWidth / 30;
    const pIdeal = (state.particles.length * state.tempK * 0.0082) / Math.max(1, volNm);
    state.pressureAtm = state.pressureAtm * 0.85 + pIdeal * 0.15;
  }

  // ============================================================================
  // 5. GASES INTRO ('gases-intro')
  // ============================================================================
  register('gases-intro', {
    title: '气体入门：理想气体定律 (Gases Intro)',
    init() {
      const state = {
        heavyCount: 25,
        lightCount: 20,
        boxWidth: 320,
        tempK: 300,
        heatLevel: 0,
        pressureUnit: 'atm',
        pressureAtm: 11.2,
        wallCollisions: 0,
        collisionHistory: [],
        draggingWall: false,
        lidOpen: false,
        holdConstant: 'none',
        particles: [],
        buttons: [],
        steppers: []
      };
      syncGasCount(state.particles, 'heavy', state.heavyCount, 510 - state.boxWidth, 510, 92, 392, state.tempK);
      syncGasCount(state.particles, 'light', state.lightCount, 510 - state.boxWidth, 510, 92, 392, state.tempK);
      return state;
    },

    controls: [
      {
        type: 'slider',
        key: 'heavyCount',
        label: '重粒子数量 (蓝色 N₂, M=28)',
        min: 0,
        max: 60,
        step: 5,
        default: 25
      },
      {
        type: 'slider',
        key: 'lightCount',
        label: '轻粒子数量 (红色 He, M=4)',
        min: 0,
        max: 60,
        step: 5,
        default: 20
      },
      {
        type: 'slider',
        key: 'boxWidth',
        label: '容器宽度 / 体积 V (nm)',
        min: 180,
        max: 420,
        step: 10,
        default: 320
      },
      {
        type: 'slider',
        key: 'tempK',
        label: '气体绝对温度 T (K)',
        min: 100,
        max: 800,
        step: 20,
        default: 300
      },
      {
        type: 'select',
        key: 'pressureUnit',
        label: '压强表单位',
        options: [
          { value: 'atm', label: '标准大气压 (atm)' },
          { value: 'kPa', label: '千帕 (kPa)' }
        ],
        default: 'atm'
      }
    ],

    onParamChange(state, key, value) {
      const leftX = 510 - state.boxWidth;
      if (key === 'heavyCount') {
        state.heavyCount = clamp(Math.round(Number(value)), 0, 80);
        syncGasCount(state.particles, 'heavy', state.heavyCount, leftX, 510, 92, 392, state.tempK);
      } else if (key === 'lightCount') {
        state.lightCount = clamp(Math.round(Number(value)), 0, 80);
        syncGasCount(state.particles, 'light', state.lightCount, leftX, 510, 92, 392, state.tempK);
      } else if (key === 'boxWidth') {
        state.boxWidth = clamp(Number(value), 160, 420);
      } else if (key === 'tempK') {
        state.tempK = clamp(Number(value), 50, 1000);
      } else if (key === 'pressureUnit') {
        state.pressureUnit = value === 'kPa' ? 'kPa' : 'atm';
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
      for (const st of state.steppers) {
        if (hitBox(x, y, st)) {
          st.onClick();
          return;
        }
      }
      const leftX = 510 - state.boxWidth;
      if (Math.abs(x - leftX) <= 22 && y >= 92 && y <= 392) {
        state.draggingWall = true;
      }
    },

    onPointerMove(state, x) {
      if (state.draggingWall) {
        state.boxWidth = clamp(510 - x, 160, 420);
      }
    },

    onPointerUp(state) {
      state.draggingWall = false;
    },

    reset(state) {
      state.heavyCount = 25;
      state.lightCount = 20;
      state.boxWidth = 320;
      state.tempK = 300;
      state.heatLevel = 0;
      state.particles = [];
      syncGasCount(state.particles, 'heavy', 25, 190, 510, 92, 392, 300);
      syncGasCount(state.particles, 'light', 20, 190, 510, 92, 392, 300);
    },

    update(state, dt) {
      stepIdealGasBox(state, dt);
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      state.steppers = [];

      const topY = 92;
      const bottomY = 392;
      const rightX = 510;
      const leftX = rightX - state.boxWidth;
      const widthNm = (state.boxWidth / 32).toFixed(1);

      drawPanel(
        ctx,
        14,
        14,
        526,
        512,
        `理想气体实验舱 (PV = nRT) — 宽度 L = ${widthNm} nm`,
        '#111827',
        '#334155'
      );

      roundRect(ctx, leftX, topY, state.boxWidth, bottomY - topY, 4);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      roundRect(ctx, leftX - 24, (topY + bottomY) / 2 - 26, 22, 52, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⇄', leftX - 13, (topY + bottomY) / 2);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX, bottomY + 14);
      ctx.lineTo(rightX, bottomY + 14);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(`容器宽度 V ∝ ${widthNm} nm (可拖拽左侧黄柄改变体积)`, (leftX + rightX) / 2, bottomY + 26);

      for (const p of state.particles) {
        if (p.type === 'heavy') {
          drawSphere(ctx, p.x, p.y, p.r, '#3b82f6', '#1d4ed8');
        } else {
          drawSphere(ctx, p.x, p.y, p.r, '#ef4444', '#991b1b');
        }
      }

      drawThermometer(ctx, rightX - 95, topY - 38, 42, state.tempK, 900, false);
      drawPressureGauge(ctx, rightX + 5, topY - 32, 32, state.pressureAtm, 45, state.pressureUnit);

      drawHeatCoolBucket(ctx, (leftX + rightX) / 2, bottomY + 28, state.heatLevel);
      const heatBtn = {
        x: (leftX + rightX) / 2 - 135,
        y: bottomY + 46,
        w: 76,
        h: 32,
        label: '🔥 升温 +',
        bg: '#b45309',
        onClick: () => {
          state.tempK = clamp(state.tempK + 35, 60, 900);
        }
      };
      const coolBtn = {
        x: (leftX + rightX) / 2 + 59,
        y: bottomY + 46,
        w: 76,
        h: 32,
        label: '❄️ 降温 −',
        bg: '#0369a1',
        onClick: () => {
          state.tempK = clamp(state.tempK - 35, 60, 900);
        }
      };
      state.buttons.push(heatBtn, coolBtn);
      drawButton(ctx, heatBtn, false);
      drawButton(ctx, coolBtn, false);

      drawPanel(ctx, 552, 14, 334, 118, '器壁碰撞计数器 (Wall Collision Counter)', '#1e293b', '#334155');
      roundRect(ctx, 570, 52, 160, 62, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 26px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(state.wallCollisions), 650, 78);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('采样周期 10 ps 内器壁碰撞次数', 650, 102);

      const unitBtn = {
        x: 745,
        y: 62,
        w: 124,
        h: 40,
        label: state.pressureUnit === 'atm' ? '单位: atm ⇄ kPa' : '单位: kPa ⇄ atm',
        onClick: () => {
          state.pressureUnit = state.pressureUnit === 'atm' ? 'kPa' : 'atm';
        }
      };
      state.buttons.push(unitBtn);
      drawButton(ctx, unitBtn, false);

      drawPanel(ctx, 552, 142, 334, 168, '打气筒粒子注入控制 (Particles)', '#1e293b', '#334155');

      const speciesRows = [
        {
          type: 'heavy',
          label: '🔵 重粒子 (N₂, 28 amu)',
          count: state.heavyCount,
          y: 196
        },
        {
          type: 'light',
          label: '🔴 轻粒子 (He, 4 amu)',
          count: state.lightCount,
          y: 256
        }
      ];

      speciesRows.forEach((row) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, 568, row.y);

        const minusBtn = {
          x: 742,
          y: row.y - 16,
          w: 36,
          h: 32,
          label: '−5',
          onClick: () => {
            if (row.type === 'heavy') {
              state.heavyCount = clamp(state.heavyCount - 5, 0, 80);
              syncGasCount(state.particles, 'heavy', state.heavyCount, leftX, rightX, topY, bottomY, state.tempK);
            } else {
              state.lightCount = clamp(state.lightCount - 5, 0, 80);
              syncGasCount(state.particles, 'light', state.lightCount, leftX, rightX, topY, bottomY, state.tempK);
            }
          }
        };
        const plusBtn = {
          x: 832,
          y: row.y - 16,
          w: 36,
          h: 32,
          label: '+5',
          onClick: () => {
            if (row.type === 'heavy') {
              state.heavyCount = clamp(state.heavyCount + 5, 0, 80);
              syncGasCount(state.particles, 'heavy', state.heavyCount, leftX, rightX, topY, bottomY, state.tempK);
            } else {
              state.lightCount = clamp(state.lightCount + 5, 0, 80);
              syncGasCount(state.particles, 'light', state.lightCount, leftX, rightX, topY, bottomY, state.tempK);
            }
          }
        };
        state.steppers.push(minusBtn, plusBtn);
        drawButton(ctx, minusBtn, false);
        drawButton(ctx, plusBtn, false);

        roundRect(ctx, 782, row.y - 16, 46, 32, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(row.count), 805, row.y);
      });

      drawPanel(ctx, 552, 320, 334, 206, '三大气体实验定律实时验证面板', '#1e293b', '#334155');

      const nTotal = state.particles.length;
      const pvProduct = (state.pressureAtm * parseFloat(widthNm)).toFixed(1);
      const pOverT = (state.pressureAtm / state.tempK).toFixed(4);
      const pOverN = nTotal > 0 ? (state.pressureAtm / nTotal).toFixed(3) : '0.000';

      const lawLines = [
        `• 粒子总数 N = ${nTotal} (${state.heavyCount} 重 + ${state.lightCount} 轻)`,
        `• 玻意耳定律 (恒 T, N)：P·V = ${pvProduct} atm·nm`,
        `• 查理-盖吕萨克定律 (恒 V, N)：P/T = ${pOverT} atm/K`,
        `• 阿伏伽德罗定律 (恒 T, V)：P/N = ${pOverN} atm/粒子`,
        `• 轻粒子热运动速率约为重粒子的 √(28/4) ≈ 2.65 倍，`,
        `  但相同温度下两者平均平动动能 <E_k> = k_B T 完全相等！`
      ];
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      lawLines.forEach((ln, idx) => {
        ctx.fillStyle = idx >= 1 && idx <= 3 ? '#38bdf8' : '#cbd5e1';
        ctx.fillText(ln, 566, 358 + idx * 26);
      });
    }
  });

  // ============================================================================
  // 6. GAS PROPERTIES ('gas-properties') - Hold Constant + Lid Escape + Maxwell-Boltzmann
  // ============================================================================
  register('gas-properties', {
    title: '气体性质与麦克斯韦速率分布 (Gas Properties)',
    init() {
      const state = {
        heavyCount: 35,
        lightCount: 25,
        boxWidth: 310,
        tempK: 320,
        heatLevel: 0,
        holdConstant: 'none',
        targetPressureAtm: 14.0,
        lidOpen: false,
        pressureUnit: 'atm',
        pressureAtm: 14.0,
        wallCollisions: 0,
        collisionHistory: [],
        draggingWall: false,
        smoothBinsAll: new Array(14).fill(0),
        smoothBinsHeavy: new Array(14).fill(0),
        smoothBinsLight: new Array(14).fill(0),
        particles: [],
        buttons: []
      };
      syncGasCount(state.particles, 'heavy', state.heavyCount, 510 - state.boxWidth, 510, 92, 392, state.tempK);
      syncGasCount(state.particles, 'light', state.lightCount, 510 - state.boxWidth, 510, 92, 392, state.tempK);
      return state;
    },

    controls: [
      {
        type: 'select',
        key: 'holdConstant',
        label: '保持恒定参数 (Hold Constant)',
        options: [
          { value: 'none', label: '无约束 (Nothing)' },
          { value: 'V', label: '恒定体积 (Volume V)' },
          { value: 'T', label: '恒定温度 (Temperature T)' },
          { value: 'P', label: '恒定压强 (Pressure P - 自动伸缩体积)' }
        ],
        default: 'none'
      },
      {
        type: 'slider',
        key: 'heavyCount',
        label: '重粒子数 (蓝色 N₂)',
        min: 0,
        max: 70,
        step: 5,
        default: 35
      },
      {
        type: 'slider',
        key: 'lightCount',
        label: '轻粒子数 (红色 He)',
        min: 0,
        max: 70,
        step: 5,
        default: 25
      },
      {
        type: 'slider',
        key: 'tempK',
        label: '温度 T (K)',
        min: 100,
        max: 800,
        step: 20,
        default: 320
      },
      {
        type: 'checkbox',
        key: 'lidOpen',
        label: '打开左侧器壁逃逸孔 (观察气体逃逸)',
        default: false
      }
    ],

    onParamChange(state, key, value) {
      const leftX = 510 - state.boxWidth;
      if (key === 'holdConstant') {
        state.holdConstant = value;
        if (value === 'P') state.targetPressureAtm = Math.max(4, state.pressureAtm);
      } else if (key === 'heavyCount') {
        state.heavyCount = clamp(Math.round(Number(value)), 0, 80);
        syncGasCount(state.particles, 'heavy', state.heavyCount, leftX, 510, 92, 392, state.tempK);
      } else if (key === 'lightCount') {
        state.lightCount = clamp(Math.round(Number(value)), 0, 80);
        syncGasCount(state.particles, 'light', state.lightCount, leftX, 510, 92, 392, state.tempK);
      } else if (key === 'tempK') {
        state.tempK = clamp(Number(value), 60, 900);
      } else if (key === 'lidOpen') {
        state.lidOpen = Boolean(value);
      }
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
      const leftX = 510 - state.boxWidth;
      if (
        state.holdConstant !== 'V' &&
        state.holdConstant !== 'P' &&
        Math.abs(x - leftX) <= 22 &&
        y >= 92 &&
        y <= 392
      ) {
        state.draggingWall = true;
      }
    },

    onPointerMove(state, x) {
      if (state.draggingWall && state.holdConstant !== 'V' && state.holdConstant !== 'P') {
        state.boxWidth = clamp(510 - x, 160, 420);
      }
    },

    onPointerUp(state) {
      state.draggingWall = false;
    },

    reset(state) {
      state.heavyCount = 35;
      state.lightCount = 25;
      state.boxWidth = 310;
      state.tempK = 320;
      state.lidOpen = false;
      state.holdConstant = 'none';
      state.particles = [];
      syncGasCount(state.particles, 'heavy', 35, 200, 510, 92, 392, 320);
      syncGasCount(state.particles, 'light', 25, 200, 510, 92, 392, 320);
    },

    update(state, dt) {
      stepIdealGasBox(state, dt);

      const nBins = state.smoothBinsAll.length;
      const maxSpeed = 650;
      const rawAll = new Array(nBins).fill(0);
      const rawH = new Array(nBins).fill(0);
      const rawL = new Array(nBins).fill(0);

      for (const p of state.particles) {
        const v = Math.hypot(p.vx, p.vy);
        const bin = clamp(Math.floor((v / maxSpeed) * nBins), 0, nBins - 1);
        rawAll[bin]++;
        if (p.type === 'heavy') rawH[bin]++;
        else rawL[bin]++;
      }

      for (let b = 0; b < nBins; b++) {
        state.smoothBinsAll[b] = state.smoothBinsAll[b] * 0.88 + rawAll[b] * 0.12;
        state.smoothBinsHeavy[b] = state.smoothBinsHeavy[b] * 0.88 + rawH[b] * 0.12;
        state.smoothBinsLight[b] = state.smoothBinsLight[b] * 0.88 + rawL[b] * 0.12;
      }
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      const topY = 92;
      const bottomY = 392;
      const rightX = 510;
      const leftX = rightX - state.boxWidth;

      drawPanel(
        ctx,
        14,
        14,
        526,
        512,
        `气体热力学与分子运动论实验台 (N = ${state.particles.length})`,
        '#111827',
        '#334155'
      );

      roundRect(ctx, leftX, topY, state.boxWidth, bottomY - topY, 4);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      if (state.lidOpen) {
        ctx.fillStyle = '#030712';
        ctx.fillRect(leftX - 4, topY + 8, 8, 58);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('⬅ 逃逸孔已打开', leftX - 8, topY + 38);
      }

      if (state.holdConstant !== 'V') {
        roundRect(ctx, leftX - 24, (topY + bottomY) / 2 - 26, 22, 52, 6);
        ctx.fillStyle = state.holdConstant === 'P' ? '#38bdf8' : '#f59e0b';
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⇄', leftX - 13, (topY + bottomY) / 2);
      }

      for (const p of state.particles) {
        drawSphere(
          ctx,
          p.x,
          p.y,
          p.r,
          p.type === 'heavy' ? '#3b82f6' : '#ef4444',
          p.type === 'heavy' ? '#1d4ed8' : '#991b1b'
        );
      }

      drawThermometer(ctx, rightX - 95, topY - 38, 42, state.tempK, 900, false);
      drawPressureGauge(ctx, rightX + 5, topY - 32, 32, state.pressureAtm, 45, 'atm');

      const lidBtn = {
        x: 28,
        y: 50,
        w: 132,
        h: 32,
        label: state.lidOpen ? '🚪 关闭器壁逃逸孔' : '🚪 打开器壁逃逸孔',
        bg: '#334155',
        activeBg: '#e11d48',
        onClick: () => {
          state.lidOpen = !state.lidOpen;
        }
      };
      state.buttons.push(lidBtn);
      drawButton(ctx, lidBtn, state.lidOpen);

      drawHeatCoolBucket(ctx, (leftX + rightX) / 2, bottomY + 18, state.heatLevel);
      if (state.holdConstant !== 'T') {
        const heatBtn = {
          x: (leftX + rightX) / 2 - 135,
          y: bottomY + 34,
          w: 76,
          h: 32,
          label: '🔥 升温 +',
          bg: '#b45309',
          onClick: () => {
            state.tempK = clamp(state.tempK + 35, 60, 900);
          }
        };
        const coolBtn = {
          x: (leftX + rightX) / 2 + 59,
          y: bottomY + 34,
          w: 76,
          h: 32,
          label: '❄️ 降温 −',
          bg: '#0369a1',
          onClick: () => {
            state.tempK = clamp(state.tempK - 35, 60, 900);
          }
        };
        state.buttons.push(heatBtn, coolBtn);
        drawButton(ctx, heatBtn, false);
        drawButton(ctx, coolBtn, false);
      }

      drawPanel(ctx, 550, 14, 336, 118, '保持恒定参数 (Hold Constant)', '#1e293b', '#334155');
      const modes = [
        { id: 'none', label: '🔓 无约束' },
        { id: 'V', label: '📦 恒容 V' },
        { id: 'T', label: '🌡️ 恒温 T' },
        { id: 'P', label: '⏲️ 恒压 P' }
      ];
      modes.forEach((m, idx) => {
        const btn = {
          x: 562 + idx * 80,
          y: 52,
          w: 74,
          h: 36,
          label: m.label,
          onClick: () => {
            state.holdConstant = m.id;
            if (m.id === 'P') state.targetPressureAtm = Math.max(4, state.pressureAtm);
          }
        };
        state.buttons.push(btn);
        drawButton(ctx, btn, state.holdConstant === m.id);
      });

      const addHBtn = {
        x: 562,
        y: 94,
        w: 152,
        h: 30,
        label: '🔵 +5 重粒子 (N₂)',
        bg: '#1e3a8a',
        onClick: () => {
          state.heavyCount = clamp(state.heavyCount + 5, 0, 80);
          syncGasCount(state.particles, 'heavy', state.heavyCount, leftX, rightX, topY, bottomY, state.tempK);
        }
      };
      const addLBtn = {
        x: 722,
        y: 94,
        w: 152,
        h: 30,
        label: '🔴 +5 轻粒子 (He)',
        bg: '#7f1d1d',
        onClick: () => {
          state.lightCount = clamp(state.lightCount + 5, 0, 80);
          syncGasCount(state.particles, 'light', state.lightCount, leftX, rightX, topY, bottomY, state.tempK);
        }
      };
      state.buttons.push(addHBtn, addLBtn);
      drawButton(ctx, addHBtn, false);
      drawButton(ctx, addLBtn, false);

      drawPanel(
        ctx,
        550,
        140,
        336,
        226,
        '麦克斯韦-玻尔兹曼速率分布 f(v)',
        '#1e293b',
        '#334155'
      );

      const gx = 584;
      const gy = 180;
      const gw = 286;
      const gh = 148;

      roundRect(ctx, gx, gy, gw, gh, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      const nBins = state.smoothBinsAll.length;
      const barW = gw / nBins;
      const maxBinCount = Math.max(10, ...state.smoothBinsAll) * 1.15;

      for (let b = 0; b < nBins; b++) {
        const bh = clamp((state.smoothBinsAll[b] / maxBinCount) * (gh - 12), 0, gh - 4);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
        ctx.fillRect(gx + b * barW + 1, gy + gh - bh, barW - 2, bh);
      }

      const plotMBCurve = (mass, count, color) => {
        if (count <= 0) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const sigmaV = Math.sqrt(state.tempK / mass) * 30;
        for (let px = 0; px <= gw; px += 3) {
          const v = (px / gw) * 650;
          const fv = (v / (sigmaV * sigmaV)) * Math.exp(-(v * v) / (2 * sigmaV * sigmaV));
          const py = gy + gh - clamp(fv * count * 310, 0, gh - 6);
          if (px === 0) ctx.moveTo(gx + px, py);
          else ctx.lineTo(gx + px, py);
        }
        ctx.stroke();
      };

      plotMBCurve(28, state.heavyCount, '#38bdf8');
      plotMBCurve(4, state.lightCount, '#f87171');

      ctx.font = 'bold 10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('▬ 总分布直方图', gx + 10, gy + 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('━ 重粒子 f_H(v)', gx + 105, gy + 16);
      ctx.fillStyle = '#f87171';
      ctx.fillText('━ 轻粒子 f_L(v)', gx + 198, gy + 16);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('分子速率 v (m/s) ➔', gx + gw / 2, gy + gh + 18);

      drawPanel(
        ctx,
        550,
        374,
        336,
        152,
        '能量均分定理与平均动能对比 (Kinetic Energy)',
        '#1e293b',
        '#334155'
      );

      const vRmsHeavy = Math.round(Math.sqrt((3 * 8.314 * state.tempK) / 0.028));
      const vRmsLight = Math.round(Math.sqrt((3 * 8.314 * state.tempK) / 0.004));
      const ekAvg = ((1.5 * 8.314 * state.tempK) / 1000).toFixed(2);

      const keLines = [
        `• 重粒子 (N₂) 方均根速率 v_rms ≈ ${vRmsHeavy} m/s`,
        `• 轻粒子 (He) 方均根速率 v_rms ≈ ${vRmsLight} m/s`,
        `• 摩尔平均平动动能 E_k = (3/2)RT = ${ekAvg} kJ/mol`,
        `• 结论：同温下轻粒子速率峰值右移且分布更宽，`,
        `  但重粒子与轻粒子的平均平动动能严格相等！`
      ];
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      keLines.forEach((ln, idx) => {
        ctx.fillStyle = idx === 2 ? '#4ade80' : '#cbd5e1';
        ctx.fillText(ln, 564, 412 + idx * 22);
      });
    }
  });

  // ============================================================================
  // 7. DIFFUSION ('diffusion') - Two-Chamber Graham's Law Gas Diffusion
  // ============================================================================
  function buildDiffusionParticles(state) {
    const particles = [];
    const box = state.box;
    const midX = (box.left + box.right) / 2;

    const addSide = (side, count, mass, radius, tempK) => {
      const xMin = side === 'left' ? box.left + radius + 4 : midX + radius + 6;
      const xMax = side === 'left' ? midX - radius - 6 : box.right - radius - 4;
      const baseSpeed = Math.sqrt(tempK / mass) * 44;

      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        particles.push({
          side,
          mass,
          r: radius,
          x: xMin + Math.random() * Math.max(10, xMax - xMin),
          y: box.top + radius + 4 + Math.random() * (box.bottom - box.top - 2 * radius - 8),
          vx: Math.cos(ang) * baseSpeed,
          vy: Math.sin(ang) * baseSpeed
        });
      }
    };

    addSide('left', state.n1, state.m1, state.r1, state.t1);
    addSide('right', state.n2, state.m2, state.r2, state.t2);
    return particles;
  }

  register('diffusion', {
    title: '气体扩散与格雷厄姆定律 (Diffusion)',
    init() {
      const box = { left: 28, top: 96, right: 532, bottom: 396 };
      const state = {
        n1: 24,
        n2: 24,
        m1: 4,
        m2: 32,
        r1: 6,
        r2: 10,
        t1: 300,
        t2: 300,
        dividerRemoved: false,
        showCOM: true,
        showScale: true,
        elapsedSec: 0,
        box,
        particles: [],
        buttons: []
      };
      state.particles = buildDiffusionParticles(state);
      return state;
    },

    controls: [
      {
        type: 'slider',
        key: 'n1',
        label: '左室蓝粒子数量 N₁',
        min: 0,
        max: 40,
        step: 2,
        default: 24
      },
      {
        type: 'slider',
        key: 'n2',
        label: '右室红粒子数量 N₂',
        min: 0,
        max: 40,
        step: 2,
        default: 24
      },
      {
        type: 'slider',
        key: 'm1',
        label: '左室蓝粒子质量 M₁ (amu)',
        min: 4,
        max: 32,
        step: 4,
        default: 4
      },
      {
        type: 'slider',
        key: 'm2',
        label: '右室红粒子质量 M₂ (amu)',
        min: 4,
        max: 32,
        step: 4,
        default: 32
      },
      {
        type: 'slider',
        key: 't1',
        label: '初始温度 T (K)',
        min: 100,
        max: 500,
        step: 50,
        default: 300
      },
      {
        type: 'checkbox',
        key: 'dividerRemoved',
        label: '移除中央隔板 (开始扩散)',
        default: false
      }
    ],

    onParamChange(state, key, value) {
      if (key === 'dividerRemoved') {
        state.dividerRemoved = Boolean(value);
        return;
      }
      if (key === 'n1') state.n1 = clamp(Math.round(Number(value)), 0, 40);
      else if (key === 'n2') state.n2 = clamp(Math.round(Number(value)), 0, 40);
      else if (key === 'm1') state.m1 = clamp(Number(value), 4, 32);
      else if (key === 'm2') state.m2 = clamp(Number(value), 4, 32);
      else if (key === 't1') {
        state.t1 = clamp(Number(value), 100, 500);
        state.t2 = state.t1;
      }
      state.dividerRemoved = false;
      state.elapsedSec = 0;
      state.particles = buildDiffusionParticles(state);
    },

    onPointerDown(state, x, y) {
      for (const b of state.buttons) {
        if (hitBox(x, y, b)) {
          b.onClick();
          return;
        }
      }
    },

    reset(state) {
      state.dividerRemoved = false;
      state.elapsedSec = 0;
      state.particles = buildDiffusionParticles(state);
    },

    update(state, dt) {
      const dtC = Math.min(dt || 0.016, 0.025);
      if (state.dividerRemoved) {
        state.elapsedSec += dtC;
      }

      const box = state.box;
      const midX = (box.left + box.right) / 2;
      const len = state.particles.length;

      for (let i = 0; i < len; i++) {
        const p = state.particles[i];
        const prevX = p.x;
        p.x += p.vx * dtC;
        p.y += p.vy * dtC;

        if (p.x - p.r < box.left) {
          p.x = box.left + p.r;
          p.vx = Math.abs(p.vx);
        } else if (p.x + p.r > box.right) {
          p.x = box.right - p.r;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y - p.r < box.top) {
          p.y = box.top + p.r;
          p.vy = Math.abs(p.vy);
        } else if (p.y + p.r > box.bottom) {
          p.y = box.bottom - p.r;
          p.vy = -Math.abs(p.vy);
        }

        if (!state.dividerRemoved) {
          if (prevX <= midX && p.x + p.r > midX - 3) {
            p.x = midX - 3 - p.r;
            p.vx = -Math.abs(p.vx);
          } else if (prevX >= midX && p.x - p.r < midX + 3) {
            p.x = midX + 3 + p.r;
            p.vx = Math.abs(p.vx);
          }
        }
      }

      for (let i = 0; i < len; i++) {
        const p1 = state.particles[i];
        for (let j = i + 1; j < len; j++) {
          const p2 = state.particles[j];
          if (!state.dividerRemoved && (p1.x - midX) * (p2.x - midX) < 0) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const minDist = p1.r + p2.r;
          if (dx * dx + dy * dy < minDist * minDist) {
            const dist = Math.hypot(dx, dy) || 0.1;
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;

            const dvx = p1.vx - p2.vx;
            const dvy = p1.vy - p2.vy;
            const vn = dvx * nx + dvy * ny;
            if (vn > 0) {
              const imp = (2 * vn) / (1 / p1.mass + 1 / p2.mass);
              p1.vx -= (imp / p1.mass) * nx;
              p1.vy -= (imp / p1.mass) * ny;
              p2.vx += (imp / p2.mass) * nx;
              p2.vy += (imp / p2.mass) * ny;
            }
          }
        }
      }
    },

    render(ctx, canvas, state) {
      const W = 900;
      const H = 540;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      state.buttons = [];
      const box = state.box;
      const midX = (box.left + box.right) / 2;

      let blueLeft = 0,
        blueRight = 0,
        redLeft = 0,
        redRight = 0;
      let sumBlueX = 0,
        cntBlue = 0,
        sumRedX = 0,
        cntRed = 0;

      for (const p of state.particles) {
        if (p.side === 'left') {
          sumBlueX += p.x;
          cntBlue++;
          if (p.x < midX) blueLeft++;
          else blueRight++;
        } else {
          sumRedX += p.x;
          cntRed++;
          if (p.x < midX) redLeft++;
          else redRight++;
        }
      }

      const comBlueX = cntBlue > 0 ? sumBlueX / cntBlue : (box.left + midX) / 2;
      const comRedX = cntRed > 0 ? sumRedX / cntRed : (midX + box.right) / 2;

      drawPanel(ctx, 14, 14, 532, 72, null, '#1e293b', '#334155');
      ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(`左室统计： 🔵 蓝粒子 = ${blueLeft}    🔴 红粒子 = ${redLeft}`, 28, 38);
      ctx.fillStyle = '#f87171';
      ctx.fillText(`右室统计： 🔵 蓝粒子 = ${blueRight}    🔴 红粒子 = ${redRight}`, 28, 64);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 15px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
      ctx.fillText(`扩散计时 t = ${state.elapsedSec.toFixed(1)} ps`, 530, 52);

      drawPanel(ctx, 14, 90, 532, 436, null, '#111827', '#334155');
      roundRect(ctx, box.left, box.top, box.right - box.left, box.bottom - box.top, 6);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      if (state.showCOM) {
        if (cntBlue > 0) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(comBlueX, box.top);
          ctx.lineTo(comBlueX, box.bottom);
          ctx.stroke();
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(comBlueX - 6, box.top - 8, 12, 8);
        }
        if (cntRed > 0) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(comRedX, box.top);
          ctx.lineTo(comRedX, box.bottom);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(comRedX - 6, box.bottom, 12, 8);
        }
        ctx.setLineDash([]);
      }

      if (!state.dividerRemoved) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(midX - 4, box.top, 8, box.bottom - box.top);
      } else {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, box.top);
        ctx.lineTo(midX, box.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (state.showScale) {
        for (let i = 0; i <= 10; i++) {
          const sx = box.left + (i / 10) * (box.right - box.left);
          ctx.strokeStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(sx, box.bottom);
          ctx.lineTo(sx, box.bottom + 8);
          ctx.stroke();
        }
      }

      for (const p of state.particles) {
        if (p.side === 'left') {
          drawSphere(ctx, p.x, p.y, p.r, '#3b82f6', '#1d4ed8');
        } else {
          drawSphere(ctx, p.x, p.y, p.r, '#ef4444', '#991b1b');
        }
      }

      const divBtn = {
        x: 110,
        y: 442,
        w: 200,
        h: 44,
        label: state.dividerRemoved ? '🟩 恢复中央隔板 (Reset Divider)' : '🟩 移除中央隔板 (Remove Divider)',
        bg: '#15803d',
        activeBg: '#b45309',
        onClick: () => {
          if (!state.dividerRemoved) {
            state.dividerRemoved = true;
          } else {
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          }
        }
      };
      const comBtn = {
        x: 325,
        y: 442,
        w: 150,
        h: 44,
        label: state.showCOM ? '📍 隐藏质心线' : '📍 显示质心线',
        onClick: () => {
          state.showCOM = !state.showCOM;
        }
      };
      state.buttons.push(divBtn, comBtn);
      drawButton(ctx, divBtn, state.dividerRemoved);
      drawButton(ctx, comBtn, state.showCOM);

      drawPanel(ctx, 556, 14, 330, 290, '左右室粒子参数对比设置', '#1e293b', '#334155');

      ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('🔵 左室粒子 (1)', 685, 56);
      ctx.fillStyle = '#f87171';
      ctx.fillText('🔴 右室粒子 (2)', 815, 56);

      const paramRows = [
        {
          label: '粒子数 N',
          v1: state.n1,
          v2: state.n2,
          y: 96,
          step1: (d) => {
            state.n1 = clamp(state.n1 + d * 4, 0, 40);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          },
          step2: (d) => {
            state.n2 = clamp(state.n2 + d * 4, 0, 40);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          }
        },
        {
          label: '质量 M (amu)',
          v1: state.m1,
          v2: state.m2,
          y: 154,
          step1: (d) => {
            state.m1 = clamp(state.m1 + d * 4, 4, 32);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          },
          step2: (d) => {
            state.m2 = clamp(state.m2 + d * 4, 4, 32);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          }
        },
        {
          label: '半径 R (pm)',
          v1: state.r1 * 20,
          v2: state.r2 * 20,
          y: 212,
          step1: (d) => {
            state.r1 = clamp(state.r1 + d * 2, 5, 13);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          },
          step2: (d) => {
            state.r2 = clamp(state.r2 + d * 2, 5, 13);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          }
        },
        {
          label: '温度 T (K)',
          v1: state.t1,
          v2: state.t2,
          y: 270,
          step1: (d) => {
            state.t1 = clamp(state.t1 + d * 50, 100, 500);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          },
          step2: (d) => {
            state.t2 = clamp(state.t2 + d * 50, 100, 500);
            state.dividerRemoved = false;
            state.elapsedSec = 0;
            state.particles = buildDiffusionParticles(state);
          }
        }
      ];

      paramRows.forEach((pr) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pr.label, 568, pr.y);

        const m1Btn = { x: 642, y: pr.y - 14, w: 22, h: 26, label: '−', onClick: () => pr.step1(-1) };
        const p1Btn = { x: 706, y: pr.y - 14, w: 22, h: 26, label: '+', onClick: () => pr.step1(1) };
        const m2Btn = { x: 772, y: pr.y - 14, w: 22, h: 26, label: '−', onClick: () => pr.step2(-1) };
        const p2Btn = { x: 836, y: pr.y - 14, w: 22, h: 26, label: '+', onClick: () => pr.step2(1) };
        state.buttons.push(m1Btn, p1Btn, m2Btn, p2Btn);
        drawButton(ctx, m1Btn, false);
        drawButton(ctx, p1Btn, false);
        drawButton(ctx, m2Btn, false);
        drawButton(ctx, p2Btn, false);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(pr.v1), 685, pr.y);
        ctx.fillText(String(pr.v2), 815, pr.y);
      });

      drawPanel(
        ctx,
        556,
        314,
        330,
        212,
        '格雷厄姆扩散定律 (Graham’s Law) 实时验证',
        '#1e293b',
        '#334155'
      );

      const ratioTheory = Math.sqrt((state.t1 / state.m1) / (state.t2 / state.m2));
      const comShiftBlue = Math.max(0, ((comBlueX - (box.left + midX) / 2) / 126) * 100);
      const comShiftRed = Math.max(0, (((midX + box.right) / 2 - comRedX) / 126) * 100);

      const gLines = [
        `• 理论扩散速率比：r₁ / r₂ = √(T₁M₂ / T₂M₁) = ${ratioTheory.toFixed(2)}`,
        `• 蓝粒子质心混合进度：${comShiftBlue.toFixed(0)}% (越过隔板 ${blueRight} 个)`,
        `• 红粒子质心混合进度：${comShiftRed.toFixed(0)}% (越过隔板 ${redLeft} 个)`,
        `• 物理规律：同温下分子量越小 (M₁=${state.m1} vs M₂=${state.m2})，`,
        `  热运动速率越快，质心向对侧室迁移的速率也越快；`,
        `  达到热动平衡后，两室粒子均匀分布，质心重合于中央。`
      ];
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      gLines.forEach((ln, idx) => {
        ctx.fillStyle = idx === 0 ? '#38bdf8' : idx <= 2 ? '#4ade80' : '#cbd5e1';
        ctx.fillText(ln, 568, 352 + idx * 26);
      });
    }
  });
})();
