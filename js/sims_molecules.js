/**
 * PhET Chemistry HTML5 Simulations - Group 2: Molecular Structure & Chemical Bonding
 * File: js/sims_molecules.js
 * Implements 7 full interactive simulations (Canvas 900x540):
 *   1. 'build-a-molecule'
 *   2. 'molecule-shapes-basics'
 *   3. 'molecule-shapes'
 *   4. 'molecule-polarity'
 *   5. 'atomic-interactions'
 *   6. 'molecules-and-light'
 *   7. 'double-wells-and-covalent-bonds'
 */
(function () {
  'use strict';

  const register =
    typeof window !== 'undefined' && typeof window.registerSim === 'function'
      ? window.registerSim.bind(window)
      : function (id, cfg) {
          if (typeof window !== 'undefined') {
            window.__PHET_SIMS__ = window.__PHET_SIMS__ || {};
            window.__PHET_SIMS__[id] = cfg;
          }
        };

  // ============================================================================
  // Shared Utilities & 3D / Drawing Helpers
  // ============================================================================
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const degToRad = (d) => (d * Math.PI) / 180;
  const radToDeg = (r) => (r * 180) / Math.PI;

  const ATOM_INFO = {
    H: { symbol: 'H', name: '氢', valence: 1, radius: 18, cpkRadius: 28, color: '#f8fafc', border: '#64748b', en: 2.20, mass: 1.008 },
    O: { symbol: 'O', name: '氧', valence: 2, radius: 26, cpkRadius: 40, color: '#ef4444', border: '#991b1b', en: 3.44, mass: 16.00 },
    C: { symbol: 'C', name: '碳', valence: 4, radius: 28, cpkRadius: 44, color: '#334155', border: '#0f172a', en: 2.55, mass: 12.01 },
    N: { symbol: 'N', name: '氮', valence: 3, radius: 27, cpkRadius: 41, color: '#3b82f6', border: '#1d4ed8', en: 3.04, mass: 14.01 },
    Cl: { symbol: 'Cl', name: '氯', valence: 1, radius: 28, cpkRadius: 43, color: '#22c55e', border: '#15803d', en: 3.16, mass: 35.45 },
    S: { symbol: 'S', name: '硫', valence: 2, radius: 30, cpkRadius: 46, color: '#eab308', border: '#a16207', en: 2.58, mass: 32.06 },
    F: { symbol: 'F', name: '氟', valence: 1, radius: 24, cpkRadius: 36, color: '#84cc16', border: '#3f6212', en: 3.98, mass: 19.00 },
    B: { symbol: 'B', name: '硼', valence: 3, radius: 27, cpkRadius: 42, color: '#f97316', border: '#c2410c', en: 2.04, mass: 10.81 },
    P: { symbol: 'P', name: '磷', valence: 5, radius: 30, cpkRadius: 46, color: '#a855f7', border: '#6b21a8', en: 2.19, mass: 30.97 },
    Xe: { symbol: 'Xe', name: '氙', valence: 8, radius: 33, cpkRadius: 50, color: '#06b6d4', border: '#0e7490', en: 2.60, mass: 131.29 }
  };

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawSphere(ctx, x, y, r, baseColor, label, textColor, alpha) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, baseColor);
    grad.addColorStop(1, shadeColor(baseColor, -42));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(15,23,42,0.55)';
    ctx.stroke();

    if (label) {
      ctx.fillStyle = textColor || (baseColor === '#f8fafc' || baseColor === '#eab308' ? '#0f172a' : '#ffffff');
      ctx.font = `bold ${Math.max(10, Math.round(r * 0.65))}px system-ui, -apple-system, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    }
    ctx.restore();
  }

  function shadeColor(hex, percent) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return '#1e293b';
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = clamp(Math.round(R + (255 * percent) / 100), 0, 255);
    G = clamp(Math.round(G + (255 * percent) / 100), 0, 255);
    B = clamp(Math.round(B + (255 * percent) / 100), 0, 255);
    return '#' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, lineWidth, headLen, hasCrossTail) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const angle = Math.atan2(dy, dx);
    const hl = headLen || 10;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth || 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl * Math.cos(angle - Math.PI / 6), y2 - hl * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - hl * Math.cos(angle + Math.PI / 6), y2 - hl * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (hasCrossTail) {
      const tx = x1 + (dx / len) * 8;
      const ty = y1 + (dy / len) * 8;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.beginPath();
      ctx.moveTo(tx - nx * 5, ty - ny * 5);
      ctx.lineTo(tx + nx * 5, ty + ny * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function rotate3D(v, rotX, rotY) {
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    // Rotate around Y first, then X
    const x1 = v[0] * cy + v[2] * sy;
    const y1 = v[1];
    const z1 = -v[0] * sy + v[2] * cy;

    const x2 = x1;
    const y2 = y1 * cx - z1 * sx;
    const z2 = y1 * sx + z1 * cx;
    return [x2, y2, z2];
  }

  function normalize3D(v) {
    const m = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / m, v[1] / m, v[2] / m];
  }

  // Canonical VSEPR 3D unit vectors for steric numbers 1..6
  const VSEPR_DIRS = {
    1: [[1, 0, 0]],
    2: [
      [1, 0, 0],
      [-1, 0, 0]
    ],
    3: [
      [0, -1, 0],
      [Math.cos(degToRad(30)), Math.sin(degToRad(30)), 0],
      [-Math.cos(degToRad(30)), Math.sin(degToRad(30)), 0]
    ],
    4: [
      [0, -1, 0],
      [Math.sin(degToRad(109.471)), -Math.cos(degToRad(109.471)), 0],
      [
        Math.sin(degToRad(109.471)) * Math.cos(degToRad(120)),
        -Math.cos(degToRad(109.471)),
        Math.sin(degToRad(109.471)) * Math.sin(degToRad(120))
      ],
      [
        Math.sin(degToRad(109.471)) * Math.cos(degToRad(240)),
        -Math.cos(degToRad(109.471)),
        Math.sin(degToRad(109.471)) * Math.sin(degToRad(240))
      ]
    ],
    5: [
      // Equatorial first (indices 0,1,2) so lone pairs occupy equatorial positions in TBP!
      [1, 0, 0],
      [Math.cos(degToRad(120)), 0, Math.sin(degToRad(120))],
      [Math.cos(degToRad(240)), 0, Math.sin(degToRad(240))],
      // Axial (indices 3,4)
      [0, -1, 0],
      [0, 1, 0]
    ],
    6: [
      // Axial/opposite pairs first so 2 LPs become trans (square planar XeF4)
      [0, -1, 0],
      [0, 1, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1]
    ]
  };

  // ============================================================================
  // 1. 'build-a-molecule' (构建分子)
  // ============================================================================
  const BAM_TARGETS = [
    { formula: 'H₂O', name: '水 (Water)', counts: { H: 2, O: 1 }, bondsTotal: 2, set: 1 },
    { formula: 'O₂', name: '氧气 (Oxygen)', counts: { O: 2 }, bondsTotal: 2, set: 1 },
    { formula: 'H₂', name: '氢气 (Hydrogen)', counts: { H: 2 }, bondsTotal: 1, set: 1 },
    { formula: 'CO₂', name: '二氧化碳 (Carbon Dioxide)', counts: { C: 1, O: 2 }, bondsTotal: 4, set: 1 },
    { formula: 'N₂', name: '氮气 (Nitrogen)', counts: { N: 2 }, bondsTotal: 3, set: 1 },
    { formula: 'NH₃', name: '氨气 (Ammonia)', counts: { N: 1, H: 3 }, bondsTotal: 3, set: 2 },
    { formula: 'CH₄', name: '甲烷 (Methane)', counts: { C: 1, H: 4 }, bondsTotal: 4, set: 2 },
    { formula: 'HCl', name: '氯化氢 (Hydrogen Chloride)', counts: { H: 1, Cl: 1 }, bondsTotal: 1, set: 2 },
    { formula: 'H₂S', name: '硫化氢 (Hydrogen Sulfide)', counts: { H: 2, S: 1 }, bondsTotal: 2, set: 2 },
    { formula: 'CH₃OH', name: '甲醇 (Methanol)', counts: { C: 1, H: 4, O: 1 }, bondsTotal: 5, set: 2 },
    { formula: 'C₂H₆', name: '乙烷 (Ethane)', counts: { C: 2, H: 6 }, bondsTotal: 7, set: 3 },
    { formula: 'C₂H₄', name: '乙烯 (Ethene)', counts: { C: 2, H: 4 }, bondsTotal: 6, set: 3 },
    { formula: 'C₂H₂', name: '乙炔 (Ethyne)', counts: { C: 2, H: 2 }, bondsTotal: 5, set: 3 },
    { formula: 'SO₂', name: '二氧化硫 (Sulfur Dioxide)', counts: { S: 1, O: 2 }, bondsTotal: 4, set: 3 },
    { formula: 'CO', name: '一氧化碳 (Carbon Monoxide)', counts: { C: 1, O: 1 }, bondsTotal: 3, set: 3 }
  ];

  const BAM_TRAY = [
    { symbol: 'H', x: 75, y: 472 },
    { symbol: 'O', x: 165, y: 472 },
    { symbol: 'C', x: 255, y: 472 },
    { symbol: 'N', x: 345, y: 472 },
    { symbol: 'Cl', x: 435, y: 472 },
    { symbol: 'S', x: 525, y: 472 }
  ];

  function getEffectiveValence(atom, allBonds) {
    // Allow CO (C≡O) and SO2 (O=S=O) special octet configurations alongside standard valences
    if (atom.symbol === 'O') return 2;
    if (atom.symbol === 'H' || atom.symbol === 'Cl') return 1;
    if (atom.symbol === 'N') return 3;
    if (atom.symbol === 'C') return 4;
    if (atom.symbol === 'S') return 4; // S can be 2 (H2S) or 4 (SO2)
    return ATOM_INFO[atom.symbol].valence;
  }

  function getAtomBondOrderSum(atomId, bonds) {
    let sum = 0;
    for (let i = 0; i < bonds.length; i++) {
      const b = bonds[i];
      if (b.a === atomId || b.b === atomId) sum += b.order;
    }
    return sum;
  }

  function analyzeClusters(state) {
    const adj = new Map();
    state.atoms.forEach((a) => adj.set(a.id, []));
    state.bonds.forEach((b) => {
      if (adj.has(b.a) && adj.has(b.b)) {
        adj.get(b.a).push({ to: b.b, order: b.order });
        adj.get(b.b).push({ to: b.a, order: b.order });
      }
    });

    const visited = new Set();
    const clusters = [];
    for (const atom of state.atoms) {
      if (visited.has(atom.id)) continue;
      const compIds = [];
      const queue = [atom.id];
      visited.add(atom.id);
      while (queue.length) {
        const cur = queue.shift();
        compIds.push(cur);
        for (const edge of adj.get(cur) || []) {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push(edge.to);
          }
        }
      }
      const compAtoms = compIds.map((id) => state.atoms.find((a) => a.id === id));
      const counts = {};
      compAtoms.forEach((a) => {
        counts[a.symbol] = (counts[a.symbol] || 0) + 1;
      });
      let bondsTotal = 0;
      state.bonds.forEach((b) => {
        if (compIds.includes(b.a) && compIds.includes(b.b)) bondsTotal += b.order;
      });

      // Check octet/valence satisfaction
      let isOctetValid = compAtoms.length > 1;
      for (const a of compAtoms) {
        const bo = getAtomBondOrderSum(a.id, state.bonds);
        if (a.symbol === 'S') {
          if (bo !== 2 && bo !== 4) isOctetValid = false;
        } else if (a.symbol === 'C' && compAtoms.length === 2 && counts.C === 1 && counts.O === 1 && bondsTotal === 3) {
          // Carbon monoxide C≡O triple bond satisfies octet via dative bond
          isOctetValid = true;
        } else {
          if (bo !== ATOM_INFO[a.symbol].valence) isOctetValid = false;
        }
      }

      // Match against known targets
      let matchedTarget = null;
      if (isOctetValid) {
        for (const t of BAM_TARGETS) {
          const keysA = Object.keys(t.counts);
          const keysB = Object.keys(counts);
          if (
            keysA.length === keysB.length &&
            keysA.every((k) => t.counts[k] === counts[k]) &&
            t.bondsTotal === bondsTotal
          ) {
            matchedTarget = t;
            break;
          }
        }
      }

      // Format empirical Hill formula
      const formulaParts = [];
      const sub = (n) => (n > 1 ? String(n).replace(/[0-9]/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]) : '');
      if (counts.C) formulaParts.push('C' + sub(counts.C));
      if (counts.H) formulaParts.push('H' + sub(counts.H));
      Object.keys(counts)
        .filter((k) => k !== 'C' && k !== 'H')
        .sort()
        .forEach((k) => formulaParts.push(k + sub(counts[k])));

      clusters.push({
        ids: compIds,
        atoms: compAtoms,
        counts,
        bondsTotal,
        isOctetValid,
        matchedTarget,
        formula: matchedTarget ? matchedTarget.formula : formulaParts.join('')
      });
    }
    return clusters;
  }

  function loadBamPreset(state, formula) {
    state.atoms = [];
    state.bonds = [];
    let idCounter = state.nextId || 1;
    const addA = (sym, x, y) => {
      const id = idCounter++;
      state.atoms.push({ id, symbol: sym, x, y, vx: 0, vy: 0 });
      return id;
    };
    const addB = (a, b, order = 1) => state.bonds.push({ a, b, order });
    const cx = 310;
    const cy = 230;
    if (formula === 'H₂O') {
      const o = addA('O', cx, cy);
      const h1 = addA('H', cx - 64, cy + 42);
      const h2 = addA('H', cx + 64, cy + 42);
      addB(o, h1, 1);
      addB(o, h2, 1);
    } else if (formula === 'CO₂') {
      const c = addA('C', cx, cy);
      const o1 = addA('O', cx - 80, cy);
      const o2 = addA('O', cx + 80, cy);
      addB(c, o1, 2);
      addB(c, o2, 2);
    } else if (formula === 'NH₃') {
      const n = addA('N', cx, cy - 10);
      const h1 = addA('H', cx - 68, cy + 40);
      const h2 = addA('H', cx, cy + 68);
      const h3 = addA('H', cx + 68, cy + 40);
      addB(n, h1, 1);
      addB(n, h2, 1);
      addB(n, h3, 1);
    } else if (formula === 'CH₄') {
      const c = addA('C', cx, cy);
      const h1 = addA('H', cx, cy - 72);
      const h2 = addA('H', cx, cy + 72);
      const h3 = addA('H', cx - 72, cy);
      const h4 = addA('H', cx + 72, cy);
      addB(c, h1, 1);
      addB(c, h2, 1);
      addB(c, h3, 1);
      addB(c, h4, 1);
    } else if (formula === 'N₂') {
      const n1 = addA('N', cx - 42, cy);
      const n2 = addA('N', cx + 42, cy);
      addB(n1, n2, 3);
    } else if (formula === 'CH₃OH') {
      const c = addA('C', cx - 35, cy);
      const o = addA('O', cx + 45, cy);
      const h1 = addA('H', cx - 35, cy - 68);
      const h2 = addA('H', cx - 35, cy + 68);
      const h3 = addA('H', cx - 102, cy);
      const h4 = addA('H', cx + 98, cy + 42);
      addB(c, o, 1);
      addB(c, h1, 1);
      addB(c, h2, 1);
      addB(c, h3, 1);
      addB(o, h4, 1);
    }
    state.nextId = idCounter;
  }

  register('build-a-molecule', {
    modes: [
      { id: 'set1', value: 'set1', label: '第 1 组：基础小分子', name: '第 1 组：基础小分子' },
      { id: 'set2', value: 'set2', label: '第 2 组：氢化物与甲醇', name: '第 2 组：氢化物与甲醇' },
      { id: 'set3', value: 'set3', label: '第 3 组：多重键与烃类', name: '第 3 组：多重键与烃类' }
    ],
    controls: [
      {
        id: 'renderStyle',
        key: 'renderStyle',
        name: 'renderStyle',
        type: 'select',
        label: '分子显示模型',
        default: 'ball-stick',
        value: 'ball-stick',
        options: [
          { id: 'ball-stick', value: 'ball-stick', label: '球棍模型 (Ball & Stick)', name: '球棍模型 (Ball & Stick)' },
          { id: 'cpk', value: 'cpk', label: '空间填充模型 (CPK)', name: '空间填充模型 (CPK)' }
        ]
      },
      {
        id: 'presetMolecule',
        key: 'presetMolecule',
        name: 'presetMolecule',
        type: 'select',
        label: '快速载入示例分子',
        default: 'H₂O',
        value: 'H₂O',
        options: [
          { id: 'H₂O', value: 'H₂O', label: 'H₂O (水)', name: 'H₂O (水)' },
          { id: 'CO₂', value: 'CO₂', label: 'CO₂ (二氧化碳)', name: 'CO₂ (二氧化碳)' },
          { id: 'NH₃', value: 'NH₃', label: 'NH₃ (氨气)', name: 'NH₃ (氨气)' },
          { id: 'CH₄', value: 'CH₄', label: 'CH₄ (甲烷)', name: 'CH₄ (甲烷)' },
          { id: 'N₂', value: 'N₂', label: 'N₂ (氮气三键)', name: 'N₂ (氮气三键)' },
          { id: 'CH₃OH', value: 'CH₃OH', label: 'CH₃OH (甲醇)', name: 'CH₃OH (甲醇)' }
        ]
      },
      {
        id: 'showValence',
        key: 'showValence',
        name: 'showValence',
        type: 'checkbox',
        label: '显示成键余量与八隅体提示',
        default: true,
        value: true
      }
    ],
    defaultState: {
      mode: 'set1',
      renderStyle: 'ball-stick',
      presetMolecule: 'H₂O',
      showValence: true,
      atoms: [],
      bonds: [],
      collected: {},
      nextId: 1,
      draggingAtomId: null,
      flashMessage: '拖拽下方托盘原子相互靠近即可成键，点击化学键中间剪刀可断键或升级双/三键',
      flashTimer: 4.0
    },
    init(state) {
      state._initialized = true;
      state.collected = state.collected || {};
      state._prevPreset = state.presetMolecule || 'H₂O';
      loadBamPreset(state, state._prevPreset);
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      if (state.presetMolecule && state.presetMolecule !== state._prevPreset) {
        state._prevPreset = state.presetMolecule;
        loadBamPreset(state, state.presetMolecule);
      }
      if (state.flashTimer > 0) state.flashTimer = Math.max(0, state.flashTimer - dt);

      // Gentle spring relaxation for bonded atoms when not dragging
      const idealLen = state.renderStyle === 'cpk' ? 46 : 74;
      for (const b of state.bonds) {
        const a1 = state.atoms.find((a) => a.id === b.a);
        const a2 = state.atoms.find((a) => a.id === b.b);
        if (!a1 || !a2) continue;
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.hypot(dx, dy) || 1;
        const diff = dist - idealLen;
        const force = diff * 6.0 * dt;
        const ux = dx / dist;
        const uy = dy / dist;
        if (state.draggingAtomId !== a1.id) {
          a1.x += ux * force;
          a1.y += uy * force;
        }
        if (state.draggingAtomId !== a2.id) {
          a2.x -= ux * force;
          a2.y -= uy * force;
        }
      }

      // Soft repulsion between unbonded atoms that are too close (when not dragging)
      for (let i = 0; i < state.atoms.length; i++) {
        for (let j = i + 1; j < state.atoms.length; j++) {
          const a1 = state.atoms[i];
          const a2 = state.atoms[j];
          const isBonded = state.bonds.some(
            (b) => (b.a === a1.id && b.b === a2.id) || (b.a === a2.id && b.b === a1.id)
          );
          if (isBonded) continue;
          const dx = a2.x - a1.x;
          const dy = a2.y - a1.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 56 && state.draggingAtomId !== a1.id && state.draggingAtomId !== a2.id) {
            const push = (56 - dist) * 3.0 * dt;
            a1.x -= (dx / dist) * push;
            a1.y -= (dy / dist) * push;
            a2.x += (dx / dist) * push;
            a2.y += (dy / dist) * push;
          }
        }
      }

      // Clamp atoms inside workspace area
      for (const a of state.atoms) {
        if (state.draggingAtomId !== a.id) {
          a.x = clamp(a.x, 45, 575);
          a.y = clamp(a.y, 65, 395);
        }
      }
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Left Workspace Card
      drawRoundedRect(ctx, 16, 16, 594, 398, 12);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Workspace Header & Action Buttons
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('分子拼装工作台 (拖拽成键 · 点击键切换单/双/三键或断开)', 30, 40);

      // Clear Button
      drawRoundedRect(ctx, 518, 24, 78, 26, 6);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('清空画布', 557, 41);

      const clusters = analyzeClusters(state);

      // Highlight valid clusters and show "Collect" button
      clusters.forEach((cl) => {
        if (cl.atoms.length < 2) return;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        cl.atoms.forEach((a) => {
          minX = Math.min(minX, a.x - 36);
          minY = Math.min(minY, a.y - 36);
          maxX = Math.max(maxX, a.x + 36);
          maxY = Math.max(maxY, a.y + 36);
        });
        drawRoundedRect(ctx, minX - 10, minY - 26, maxX - minX + 20, maxY - minY + 36, 10);
        ctx.strokeStyle = cl.isOctetValid ? 'rgba(34, 197, 94, 0.7)' : 'rgba(251, 191, 36, 0.45)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = cl.isOctetValid ? '#4ade80' : '#fbbf24';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        const cx = (minX + maxX) / 2;
        const statusText = cl.matchedTarget
          ? `✓ ${cl.matchedTarget.formula} ${cl.matchedTarget.name} (满足八隅体·可拖入右侧收集箱)`
          : cl.isOctetValid
          ? `✓ 稳定分子 ${cl.formula}`
          : `${cl.formula} (未满足八隅体成键数)`;
        ctx.fillText(statusText, cx, minY - 10);
      });

      // Draw Bonds
      for (const b of state.bonds) {
        const a1 = state.atoms.find((a) => a.id === b.a);
        const a2 = state.atoms.find((a) => a.id === b.b);
        if (!a1 || !a2) continue;
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        if (state.renderStyle === 'ball-stick') {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          if (b.order === 1) {
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();
          } else if (b.order === 2) {
            for (const s of [-5, 5]) {
              ctx.beginPath();
              ctx.moveTo(a1.x + nx * s, a1.y + ny * s);
              ctx.lineTo(a2.x + nx * s, a2.y + ny * s);
              ctx.stroke();
            }
          } else if (b.order >= 3) {
            for (const s of [-7, 0, 7]) {
              ctx.beginPath();
              ctx.moveTo(a1.x + nx * s, a1.y + ny * s);
              ctx.lineTo(a2.x + nx * s, a2.y + ny * s);
              ctx.stroke();
            }
          }

          // Midpoint interactive badge (click to cycle bond order / break)
          const mx = (a1.x + a2.x) / 2;
          const my = (a1.y + a2.y) / 2;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.arc(mx, my, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.order === 1 ? '1' : b.order === 2 ? '2' : '3', mx, my + 0.5);
        }
      }

      // Draw Atoms
      for (const a of state.atoms) {
        const info = ATOM_INFO[a.symbol];
        const r = state.renderStyle === 'cpk' ? info.cpkRadius : info.radius;
        drawSphere(ctx, a.x, a.y, r, info.color, a.symbol);

        if (state.showValence) {
          const used = getAtomBondOrderSum(a.id, state.bonds);
          const maxV = getEffectiveValence(a, state.bonds);
          const rem = Math.max(0, maxV - used);
          // Draw open bonding ports around atom
          for (let k = 0; k < rem; k++) {
            const ang = (k / Math.max(1, rem)) * Math.PI * 2 - Math.PI / 2;
            const px = a.x + Math.cos(ang) * (r + 7);
            const py = a.y + Math.sin(ang) * (r + 7);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Bottom Atom Supply Tray
      drawRoundedRect(ctx, 16, 424, 594, 100, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('原子补给托盘 (点击或向上拖拽添加原子)', 28, 442);

      for (const item of BAM_TRAY) {
        const info = ATOM_INFO[item.symbol];
        drawRoundedRect(ctx, item.x - 36, item.y - 22, 72, 58, 10);
        ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
        ctx.fill();
        drawSphere(ctx, item.x, item.y + 1, 18, info.color, item.symbol);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${info.name}(价${info.valence})`, item.x, item.y + 28);
      }

      // Right Target Collection Panel
      drawRoundedRect(ctx, 622, 16, 262, 508, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      const setNum = state.mode === 'set2' ? 2 : state.mode === 'set3' ? 3 : 1;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`目标分子收集箱 (第 ${setNum} 组)`, 638, 42);

      const activeTargets = BAM_TARGETS.filter((t) => t.set === setNum);
      activeTargets.forEach((t, idx) => {
        const bx = 636;
        const by = 58 + idx * 86;
        const bw = 234;
        const bh = 74;
        const isDone = !!state.collected[t.formula];
        const isReady = clusters.some((c) => c.matchedTarget && c.matchedTarget.formula === t.formula);

        drawRoundedRect(ctx, bx, by, bw, bh, 10);
        ctx.fillStyle = isDone
          ? 'rgba(22, 101, 52, 0.45)'
          : isReady
          ? 'rgba(56, 189, 248, 0.22)'
          : 'rgba(30, 41, 59, 0.75)';
        ctx.fill();
        ctx.strokeStyle = isDone ? '#22c55e' : isReady ? '#38bdf8' : 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = isDone || isReady ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(t.formula, bx + 14, by + 30);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(t.name, bx + 14, by + 52);

        // Status / Action badge
        drawRoundedRect(ctx, bx + 146, by + 20, 76, 32, 8);
        ctx.fillStyle = isDone ? '#16a34a' : isReady ? '#0284c7' : '#334155';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isDone ? '✓ 已收集' : isReady ? '点击放入' : '待拼装', bx + 184, by + 40);
      });

      if (state.flashMessage && state.flashTimer > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(state.flashMessage, 30, 404);
      }

      ctx.restore();
    },
    getReadouts(state) {
      const clusters = analyzeClusters(state || { atoms: [], bonds: [] });
      const validMol = clusters.find((c) => c.isOctetValid);
      const collectedCount = Object.keys((state && state.collected) || {}).length;
      return [
        { label: '画布原子总数', name: '画布原子总数', value: String((state.atoms || []).length), unit: '个' },
        { label: '共价键总数', name: '共价键总数', value: String((state.bonds || []).length), unit: '根' },
        {
          label: '当前有效分子',
          name: '当前有效分子',
          value: validMol ? `${validMol.formula}` : '未成完整分子',
          unit: ''
        },
        { label: '已收集目标分子', name: '已收集目标分子', value: `${collectedCount} / ${BAM_TARGETS.length}`, unit: '' }
      ];
    },
    onPointerDown(x, y, state) {
      // 1. Check Clear Button
      if (x >= 518 && x <= 596 && y >= 24 && y <= 50) {
        state.atoms = [];
        state.bonds = [];
        state.flashMessage = '已清空工作台';
        state.flashTimer = 2.5;
        return;
      }

      // 2. Check Right Collection Boxes (click to collect ready molecule or load target)
      const setNum = state.mode === 'set2' ? 2 : state.mode === 'set3' ? 3 : 1;
      const activeTargets = BAM_TARGETS.filter((t) => t.set === setNum);
      const clusters = analyzeClusters(state);
      for (let i = 0; i < activeTargets.length; i++) {
        const t = activeTargets[i];
        const bx = 636,
          by = 58 + i * 86,
          bw = 234,
          bh = 74;
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
          const matchedCluster = clusters.find((c) => c.matchedTarget && c.matchedTarget.formula === t.formula);
          if (matchedCluster) {
            state.collected[t.formula] = true;
            state.atoms = state.atoms.filter((a) => !matchedCluster.ids.includes(a.id));
            state.bonds = state.bonds.filter(
              (b) => !matchedCluster.ids.includes(b.a) && !matchedCluster.ids.includes(b.b)
            );
            state.flashMessage = `🎉 成功收集 ${t.formula} (${t.name})！`;
            state.flashTimer = 3.5;
          } else {
            state.flashMessage = `提示：需要 ${Object.entries(t.counts)
              .map(([k, v]) => k + '×' + v)
              .join(' + ')} 拼装成 ${t.formula}`;
            state.flashTimer = 3.5;
          }
          return;
        }
      }

      // 3. Check Bond Midpoints (click to increment bond order 1->2->3->break)
      if (state.renderStyle === 'ball-stick') {
        for (let i = state.bonds.length - 1; i >= 0; i--) {
          const b = state.bonds[i];
          const a1 = state.atoms.find((a) => a.id === b.a);
          const a2 = state.atoms.find((a) => a.id === b.b);
          if (!a1 || !a2) continue;
          const mx = (a1.x + a2.x) / 2;
          const my = (a1.y + a2.y) / 2;
          if (Math.hypot(x - mx, y - my) <= 13) {
            const rem1 = getEffectiveValence(a1, state.bonds) - getAtomBondOrderSum(a1.id, state.bonds);
            const rem2 = getEffectiveValence(a2, state.bonds) - getAtomBondOrderSum(a2.id, state.bonds);
            if (b.order < 3 && rem1 >= 1 && rem2 >= 1) {
              b.order += 1;
              state.flashMessage = `化学键升级为 ${b.order === 2 ? '双键 (=)' : '三键 (≡)'}`;
            } else {
              state.bonds.splice(i, 1);
              state.flashMessage = '已断开化学键';
            }
            state.flashTimer = 2.5;
            return;
          }
        }
      }

      // 4. Check Existing Atoms in Workspace
      for (let i = state.atoms.length - 1; i >= 0; i--) {
        const a = state.atoms[i];
        const r = state.renderStyle === 'cpk' ? ATOM_INFO[a.symbol].cpkRadius : ATOM_INFO[a.symbol].radius;
        if (Math.hypot(x - a.x, y - a.y) <= r + 4) {
          state.draggingAtomId = a.id;
          return;
        }
      }

      // 5. Check Bottom Atom Supply Tray
      for (const item of BAM_TRAY) {
        if (Math.abs(x - item.x) <= 36 && Math.abs(y - item.y) <= 28) {
          const id = state.nextId++;
          const newAtom = {
            id,
            symbol: item.symbol,
            x: clamp(x, 60, 550),
            y: Math.min(y - 70, 350),
            vx: 0,
            vy: 0
          };
          state.atoms.push(newAtom);
          state.draggingAtomId = id;
          return;
        }
      }
    },
    onPointerMove(x, y, state) {
      if (!state.draggingAtomId) return;
      const dragged = state.atoms.find((a) => a.id === state.draggingAtomId);
      if (!dragged) return;
      dragged.x = clamp(x, 40, 860);
      dragged.y = clamp(y, 45, 490);
    },
    onPointerUp(x, y, state) {
      if (!state.draggingAtomId) return;
      const dragged = state.atoms.find((a) => a.id === state.draggingAtomId);
      state.draggingAtomId = null;
      if (!dragged) return;

      // Check if dropped onto right collection box
      const setNum = state.mode === 'set2' ? 2 : state.mode === 'set3' ? 3 : 1;
      const activeTargets = BAM_TARGETS.filter((t) => t.set === setNum);
      const clusters = analyzeClusters(state);
      const myCluster = clusters.find((c) => c.ids.includes(dragged.id));

      if (x >= 622 && myCluster && myCluster.matchedTarget) {
        const t = activeTargets.find((target) => target.formula === myCluster.matchedTarget.formula);
        if (t) {
          state.collected[t.formula] = true;
          state.atoms = state.atoms.filter((a) => !myCluster.ids.includes(a.id));
          state.bonds = state.bonds.filter((b) => !myCluster.ids.includes(b.a) && !myCluster.ids.includes(b.b));
          state.flashMessage = `🎉 成功收集 ${t.formula} (${t.name})！`;
          state.flashTimer = 3.5;
          return;
        }
      }

      // If dropped back into bottom tray, remove single unbonded atom
      if (dragged.y > 418) {
        state.atoms = state.atoms.filter((a) => a.id !== dragged.id);
        state.bonds = state.bonds.filter((b) => b.a !== dragged.id && b.b !== dragged.id);
        return;
      }

      // Keep inside workspace
      dragged.x = clamp(dragged.x, 48, 572);
      dragged.y = clamp(dragged.y, 65, 392);

      // Auto-bond with nearest compatible atom within 88 px
      let bestOther = null;
      let bestDist = 88;
      for (const other of state.atoms) {
        if (other.id === dragged.id) continue;
        const d = Math.hypot(other.x - dragged.x, other.y - dragged.y);
        if (d < bestDist) {
          bestDist = d;
          bestOther = other;
        }
      }

      if (bestOther) {
        const existing = state.bonds.find(
          (b) => (b.a === dragged.id && b.b === bestOther.id) || (b.a === bestOther.id && b.b === dragged.id)
        );
        const rem1 = getEffectiveValence(dragged, state.bonds) - getAtomBondOrderSum(dragged.id, state.bonds);
        const rem2 = getEffectiveValence(bestOther, state.bonds) - getAtomBondOrderSum(bestOther.id, state.bonds);
        if (!existing && rem1 >= 1 && rem2 >= 1) {
          state.bonds.push({ a: dragged.id, b: bestOther.id, order: 1 });
          state.flashMessage = `${dragged.symbol} 与 ${bestOther.symbol} 形成共价单键 (点击键中心可升级为双键/三键)`;
          state.flashTimer = 3.0;
        } else if (existing && existing.order < 3 && rem1 >= 1 && rem2 >= 1) {
          existing.order += 1;
          state.flashMessage = `${dragged.symbol} 与 ${bestOther.symbol} 升级为 ${existing.order} 重共价键`;
          state.flashTimer = 3.0;
        }
      }
    }
  });

  // ============================================================================
  // 2. 'molecule-shapes-basics' (分子形状：基础)
  // ============================================================================
  const MSB_DATA = {
    2: { name: '直线形 (Linear)', angleText: '180.0°', hybridization: 'sp', example: 'BeCl₂, CO₂' },
    3: { name: '平面三角形 (Trigonal Planar)', angleText: '120.0°', hybridization: 'sp²', example: 'BF₃, SO₃' },
    4: { name: '正四面体形 (Tetrahedral)', angleText: '109.5°', hybridization: 'sp³', example: 'CH₄, CCl₄' },
    5: { name: '三角双锥形 (Trigonal Bipyramidal)', angleText: '90.0° / 120.0°', hybridization: 'sp³d', example: 'PCl₅, PF₅' },
    6: { name: '正八面体形 (Octahedral)', angleText: '90.0°', hybridization: 'sp³d²', example: 'SF₆' }
  };

  function render3DVSEPRScene(ctx, cx, cy, bondLen, rotX, rotY, ligands, lonePairs, options) {
    // Prepare 3D items: bonds, atoms, lone pairs
    const items = [];
    const rotatedLigands = ligands.map((lig, idx) => {
      const r = rotate3D(lig.dir, rotX, rotY);
      return { ...lig, idx, rx: r[0], ry: r[1], rz: r[2], px: cx + r[0] * bondLen, py: cy + r[1] * bondLen };
    });
    const rotatedLPs = lonePairs.map((lp, idx) => {
      const r = rotate3D(lp.dir, rotX, rotY);
      return { ...lp, idx, rx: r[0], ry: r[1], rz: r[2], px: cx + r[0] * (bondLen * 0.78), py: cy + r[1] * (bondLen * 0.78) };
    });

    // Draw angle arc between first two ligands if enabled
    if (options.showBondAngles && rotatedLigands.length >= 2) {
      const l1 = rotatedLigands[0];
      const l2 = rotatedLigands[1];
      const a1 = Math.atan2(l1.py - cy, l1.px - cx);
      const a2 = Math.atan2(l2.py - cy, l2.px - cx);
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let diff = a2 - a1;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ctx.arc(cx, cy, bondLen * 0.42, a1, a1 + diff, diff < 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const midA = a1 + diff * 0.5;
      const tx = cx + Math.cos(midA) * (bondLen * 0.55);
      const ty = cy + Math.sin(midA) * (bondLen * 0.55);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.angleLabel || '109.5°', tx, ty);
      ctx.restore();
    }

    // Center atom at z = 0
    items.push({ type: 'center', z: 0 });
    rotatedLigands.forEach((l) => {
      items.push({ type: 'bond', z: l.rz * 0.5, data: l });
      items.push({ type: 'ligand', z: l.rz, data: l });
    });
    if (options.showLonePairs) {
      rotatedLPs.forEach((lp) => {
        items.push({ type: 'lonePair', z: lp.rz * 0.85, data: lp });
      });
    }

    // Painter's algorithm sort back-to-front
    items.sort((a, b) => a.z - b.z);

    for (const item of items) {
      if (item.type === 'center') {
        drawSphere(ctx, cx, cy, 28, options.centerColor || '#a855f7', options.centerSymbol || 'A');
      } else if (item.type === 'bond') {
        const l = item.data;
        ctx.save();
        const grad = ctx.createLinearGradient(cx, cy, l.px, l.py);
        grad.addColorStop(0, '#94a3b8');
        grad.addColorStop(1, l.rz >= 0 ? '#f1f5f9' : '#64748b');
        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        const order = l.order || 1;
        const dx = l.px - cx;
        const dy = l.py - cy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        if (order === 1) {
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(l.px, l.py);
          ctx.stroke();
        } else {
          ctx.lineWidth = 5.5;
          for (const s of [-5, 5]) {
            ctx.beginPath();
            ctx.moveTo(cx + nx * s, cy + ny * s);
            ctx.lineTo(l.px + nx * s, l.py + ny * s);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (item.type === 'ligand') {
        const l = item.data;
        const depthScale = 1 + l.rz * 0.14;
        drawSphere(ctx, l.px, l.py, (l.radius || 22) * depthScale, l.color || '#f8fafc', l.symbol || 'X');
      } else if (item.type === 'lonePair') {
        const lp = item.data;
        const ang = Math.atan2(lp.py - cy, lp.px - cx);
        const dist2D = Math.hypot(lp.px - cx, lp.py - cy);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        // Translucent pear-shaped electron lobe
        const lobeGrad = ctx.createRadialGradient(dist2D * 0.65, 0, 4, dist2D * 0.62, 0, 44);
        lobeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
        lobeGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.28)');
        lobeGrad.addColorStop(1, 'rgba(56, 189, 248, 0.03)');
        ctx.fillStyle = lobeGrad;
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(dist2D * 0.58, 0, Math.max(22, dist2D * 0.52), 23, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Two paired electron dots inside lobe
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(dist2D * 0.66, -7, 4.2, 0, Math.PI * 2);
        ctx.arc(dist2D * 0.66, 7, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  register('molecule-shapes-basics', {
    modes: [
      { id: 'model', value: 'model', label: '几何构型探索 (BP = 2~6)', name: '几何构型探索 (BP = 2~6)' }
    ],
    controls: [
      {
        id: 'bondCount',
        key: 'bondCount',
        name: 'bondCount',
        type: 'range',
        label: '成键配位原子数 (BP)',
        min: 2,
        max: 6,
        step: 1,
        default: 4,
        value: 4,
        unit: '个'
      },
      {
        id: 'showBondAngles',
        key: 'showBondAngles',
        name: 'showBondAngles',
        type: 'checkbox',
        label: '显示三维键角标注',
        default: true,
        value: true
      },
      {
        id: 'showGeometryName',
        key: 'showGeometryName',
        name: 'showGeometryName',
        type: 'checkbox',
        label: '显示分子几何名称与杂化类型',
        default: true,
        value: true
      },
      {
        id: 'autoRotate',
        key: 'autoRotate',
        name: 'autoRotate',
        type: 'checkbox',
        label: '自动缓慢三维旋转',
        default: false,
        value: false
      }
    ],
    defaultState: {
      mode: 'model',
      bondCount: 4,
      showBondAngles: true,
      showGeometryName: true,
      autoRotate: false,
      rotX: 0.35,
      rotY: 0.55,
      isDragging: false,
      lastX: 0,
      lastY: 0
    },
    init(state) {
      state._initialized = true;
      state.bondCount = clamp(Math.round(Number(state.bondCount) || 4), 2, 6);
      state.rotX = state.rotX ?? 0.35;
      state.rotY = state.rotY ?? 0.55;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      state.bondCount = clamp(Math.round(Number(state.bondCount) || 4), 2, 6);
      if (state.autoRotate && !state.isDragging) {
        state.rotY += dt * 0.55;
      }
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      const bg = ctx.createRadialGradient(340, 260, 30, 340, 260, 520);
      bg.addColorStop(0, '#1e293b');
      bg.addColorStop(1, '#090d16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const bp = clamp(Math.round(Number(state.bondCount) || 4), 2, 6);
      const dirs = VSEPR_DIRS[bp] || VSEPR_DIRS[4];
      const ligands = dirs.map((d) => ({ dir: normalize3D(d), symbol: 'X', color: '#f8fafc', radius: 22, order: 1 }));
      const meta = MSB_DATA[bp];

      render3DVSEPRScene(ctx, 330, 265, 138, state.rotX, state.rotY, ligands, [], {
        showBondAngles: state.showBondAngles,
        angleLabel: meta.angleText,
        centerColor: '#a855f7',
        centerSymbol: 'A',
        showLonePairs: false
      });

      // Bottom quick selector buttons for BP = 2..6
      for (let n = 2; n <= 6; n++) {
        const bx = 55 + (n - 2) * 112;
        const by = 472;
        drawRoundedRect(ctx, bx, by, 100, 42, 8);
        ctx.fillStyle = bp === n ? '#2563eb' : 'rgba(30, 41, 59, 0.85)';
        ctx.fill();
        ctx.strokeStyle = bp === n ? '#60a5fa' : '#475569';
        ctx.lineWidth = bp === n ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`配位数 ${n} (AX${n})`, bx + 50, by + 26);
      }

      // Right Info Card
      drawRoundedRect(ctx, 640, 24, 240, 490, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('三维分子构型参数', 658, 56);

      const rows = [
        ['通式符号', `AX${bp}`],
        ['成键电子对 (BP)', `${bp} 对 (无孤对电子)`],
        ['几何构型名称', state.showGeometryName ? meta.name : '(已隐藏)'],
        ['理想键角', state.showBondAngles ? meta.angleText : '(已隐藏)'],
        ['中心原子杂化', state.showGeometryName ? meta.hybridization : '(已隐藏)'],
        ['典型代表分子', meta.example]
      ];
      rows.forEach(([k, v], i) => {
        const ry = 95 + i * 62;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(k, 658, ry);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(v, 658, ry + 22);
      });

      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('提示：在画布任意位置按住鼠标拖拽', 658, 478);
      ctx.fillText('即可自由进行三维旋转观察。', 658, 496);

      ctx.restore();
    },
    getReadouts(state) {
      const bp = clamp(Math.round(Number(state.bondCount) || 4), 2, 6);
      const meta = MSB_DATA[bp];
      return [
        { label: '成键配位数 (BP)', name: '成键配位数 (BP)', value: String(bp), unit: '' },
        { label: '分子几何构型', name: '分子几何构型', value: meta.name, unit: '' },
        { label: '标准键角', name: '标准键角', value: meta.angleText, unit: '' },
        { label: '中心杂化轨道', name: '中心杂化轨道', value: meta.hybridization, unit: '' }
      ];
    },
    onPointerDown(x, y, state) {
      // Check bottom quick buttons
      for (let n = 2; n <= 6; n++) {
        const bx = 55 + (n - 2) * 112;
        const by = 472;
        if (x >= bx && x <= bx + 100 && y >= by && y <= by + 42) {
          state.bondCount = n;
          return;
        }
      }
      state.isDragging = true;
      state.lastX = x;
      state.lastY = y;
    },
    onPointerMove(x, y, state) {
      if (!state.isDragging) return;
      const dx = x - state.lastX;
      const dy = y - state.lastY;
      state.rotY += dx * 0.011;
      state.rotX = clamp(state.rotX + dy * 0.011, -Math.PI / 2, Math.PI / 2);
      state.lastX = x;
      state.lastY = y;
    },
    onPointerUp(x, y, state) {
      state.isDragging = false;
    }
  });

  // ============================================================================
  // 3. 'molecule-shapes' (分子形状 - 完整 VSEPR 模型与真实分子实测键角)
  // ============================================================================
  const VSEPR_TABLE = {
    '1_0': { eGeom: '直线形', mGeom: '双原子直线形 (Linear)', idealAngle: '180.0°' },
    '2_0': { eGeom: '直线形 (Linear)', mGeom: '直线形 (Linear)', idealAngle: '180.0°' },
    '3_0': { eGeom: '平面三角形 (Trigonal Planar)', mGeom: '平面三角形 (Trigonal Planar)', idealAngle: '120.0°' },
    '2_1': { eGeom: '平面三角形 (Trigonal Planar)', mGeom: '角形 / V形 (Bent)', idealAngle: '120.0°' },
    '4_0': { eGeom: '正四面体 (Tetrahedral)', mGeom: '正四面体 (Tetrahedral)', idealAngle: '109.5°' },
    '3_1': { eGeom: '正四面体 (Tetrahedral)', mGeom: '三角锥形 (Trigonal Pyramidal)', idealAngle: '109.5°' },
    '2_2': { eGeom: '正四面体 (Tetrahedral)', mGeom: '角形 / V形 (Bent)', idealAngle: '109.5°' },
    '5_0': { eGeom: '三角双锥 (Trigonal Bipyramidal)', mGeom: '三角双锥 (Trigonal Bipyramidal)', idealAngle: '90.0° / 120.0°' },
    '4_1': { eGeom: '三角双锥 (Trigonal Bipyramidal)', mGeom: '跷跷板形 (Seesaw)', idealAngle: '90.0° / 120.0°' },
    '3_2': { eGeom: '三角双锥 (Trigonal Bipyramidal)', mGeom: 'T字形 (T-shaped)', idealAngle: '90.0°' },
    '2_3': { eGeom: '三角双锥 (Trigonal Bipyramidal)', mGeom: '直线形 (Linear)', idealAngle: '180.0°' },
    '6_0': { eGeom: '正八面体 (Octahedral)', mGeom: '正八面体 (Octahedral)', idealAngle: '90.0°' },
    '5_1': { eGeom: '正八面体 (Octahedral)', mGeom: '四方锥形 (Square Pyramidal)', idealAngle: '90.0°' },
    '4_2': { eGeom: '正八面体 (Octahedral)', mGeom: '平面正方形 (Square Planar)', idealAngle: '90.0°' }
  };

  const REAL_VSEPR_MOLECULES = {
    H2O: {
      formula: 'H₂O',
      bp: 2,
      lp: 2,
      center: 'O',
      ligand: 'H',
      bondOrder: 1,
      realAngle: '104.5°',
      idealAngle: '109.5°',
      realAngleDeg: 104.5
    },
    NH3: {
      formula: 'NH₃',
      bp: 3,
      lp: 1,
      center: 'N',
      ligand: 'H',
      bondOrder: 1,
      realAngle: '107.8°',
      idealAngle: '109.5°',
      realAngleDeg: 107.8
    },
    CH4: {
      formula: 'CH₄',
      bp: 4,
      lp: 0,
      center: 'C',
      ligand: 'H',
      bondOrder: 1,
      realAngle: '109.5°',
      idealAngle: '109.5°',
      realAngleDeg: 109.47
    },
    SO2: {
      formula: 'SO₂',
      bp: 2,
      lp: 1,
      center: 'S',
      ligand: 'O',
      bondOrder: 2,
      realAngle: '119.0°',
      idealAngle: '120.0°',
      realAngleDeg: 119.0
    },
    BF3: {
      formula: 'BF₃',
      bp: 3,
      lp: 0,
      center: 'B',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '120.0°',
      idealAngle: '120.0°',
      realAngleDeg: 120.0
    },
    ClF3: {
      formula: 'ClF₃',
      bp: 3,
      lp: 2,
      center: 'Cl',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '87.5°',
      idealAngle: '90.0°',
      realAngleDeg: 87.5
    },
    SF4: {
      formula: 'SF₄',
      bp: 4,
      lp: 1,
      center: 'S',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '86.5° / 101.6°',
      idealAngle: '90.0° / 120.0°',
      realAngleDeg: 101.6
    },
    XeF2: {
      formula: 'XeF₂',
      bp: 2,
      lp: 3,
      center: 'Xe',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '180.0°',
      idealAngle: '180.0°',
      realAngleDeg: 180.0
    },
    PF5: {
      formula: 'PF₅',
      bp: 5,
      lp: 0,
      center: 'P',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '90.0° / 120.0°',
      idealAngle: '90.0° / 120.0°',
      realAngleDeg: 90.0
    },
    SF6: {
      formula: 'SF₆',
      bp: 6,
      lp: 0,
      center: 'S',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '90.0°',
      idealAngle: '90.0°',
      realAngleDeg: 90.0
    },
    XeF4: {
      formula: 'XeF₄',
      bp: 4,
      lp: 2,
      center: 'Xe',
      ligand: 'F',
      bondOrder: 1,
      realAngle: '90.0°',
      idealAngle: '90.0°',
      realAngleDeg: 90.0
    }
  };

  function getVSEPRVectors(bp, lp, useRealDistortion, realMolKey) {
    const sn = clamp(bp + lp, 1, 6);
    const base = VSEPR_DIRS[sn] || VSEPR_DIRS[4];
    const lpDirs = [];
    const bpDirs = [];
    // Lone pairs occupy the first `lp` slots (which in VSEPR_DIRS are equatorial for SN=5 and trans for SN=6)
    for (let i = 0; i < sn; i++) {
      if (i < lp) lpDirs.push(normalize3D(base[i]));
      else bpDirs.push(normalize3D(base[i]));
    }

    // Apply physical lone-pair compression if real angles enabled (e.g., H2O 104.5 deg, NH3 107.8 deg)
    if (useRealDistortion && realMolKey === 'H2O' && bpDirs.length === 2) {
      const half = degToRad(104.5 / 2);
      bpDirs[0] = [Math.sin(half), Math.cos(half), 0];
      bpDirs[1] = [-Math.sin(half), Math.cos(half), 0];
      lpDirs[0] = [0, -Math.cos(degToRad(56)), Math.sin(degToRad(56))];
      lpDirs[1] = [0, -Math.cos(degToRad(56)), -Math.sin(degToRad(56))];
    } else if (useRealDistortion && realMolKey === 'NH3' && bpDirs.length === 3) {
      // Cone half-angle for 107.8 deg H-N-H bond angle
      const cone = Math.asin(Math.sin(degToRad(107.8 / 2)) / Math.sin(degToRad(60)));
      lpDirs[0] = [0, -1, 0];
      for (let k = 0; k < 3; k++) {
        const phi = degToRad(k * 120);
        bpDirs[k] = [Math.sin(cone) * Math.cos(phi), Math.cos(cone), Math.sin(cone) * Math.sin(phi)];
      }
    }

    return { bpDirs, lpDirs };
  }

  register('molecule-shapes', {
    modes: [
      { id: 'model', value: 'model', label: 'VSEPR 模型模式', name: 'VSEPR 模型模式' },
      { id: 'real', value: 'real', label: '真实分子模式', name: '真实分子模式' }
    ],
    controls: [
      {
        id: 'bondingPairs',
        key: 'bondingPairs',
        name: 'bondingPairs',
        type: 'range',
        label: '成键电子域 (BP)',
        min: 1,
        max: 6,
        step: 1,
        default: 2,
        value: 2,
        unit: '个'
      },
      {
        id: 'lonePairs',
        key: 'lonePairs',
        name: 'lonePairs',
        type: 'range',
        label: '孤对电子数 (LP)',
        min: 0,
        max: 4,
        step: 1,
        default: 2,
        value: 2,
        unit: '对'
      },
      {
        id: 'realMolecule',
        key: 'realMolecule',
        name: 'realMolecule',
        type: 'select',
        label: '选择真实分子',
        default: 'H2O',
        value: 'H2O',
        options: Object.keys(REAL_VSEPR_MOLECULES).map((k) => ({
          id: k,
          value: k,
          label: `${REAL_VSEPR_MOLECULES[k].formula}`,
          name: `${REAL_VSEPR_MOLECULES[k].formula}`
        }))
      },
      {
        id: 'angleType',
        key: 'angleType',
        name: 'angleType',
        type: 'select',
        label: '键角显示模式 (真实分子)',
        default: 'real',
        value: 'real',
        options: [
          { id: 'real', value: 'real', label: '实测真实键角 (含孤对电子排斥压缩)', name: '实测真实键角' },
          { id: 'ideal', value: 'ideal', label: '理想模型键角 (VSEPR 标准值)', name: '理想模型键角' }
        ]
      },
      {
        id: 'showLonePairs',
        key: 'showLonePairs',
        name: 'showLonePairs',
        type: 'checkbox',
        label: '显示孤对电子瓣 (Lone Pair)',
        default: true,
        value: true
      },
      {
        id: 'showBondAngles',
        key: 'showBondAngles',
        name: 'showBondAngles',
        type: 'checkbox',
        label: '显示键角弧线',
        default: true,
        value: true
      }
    ],
    defaultState: {
      mode: 'real',
      bondingPairs: 2,
      lonePairs: 2,
      realMolecule: 'H2O',
      angleType: 'real',
      showLonePairs: true,
      showBondAngles: true,
      rotX: 0.25,
      rotY: 0.45,
      isDragging: false,
      lastX: 0,
      lastY: 0
    },
    init(state) {
      state._initialized = true;
      state.rotX = state.rotX ?? 0.25;
      state.rotY = state.rotY ?? 0.45;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      let bp = clamp(Math.round(Number(state.bondingPairs) || 2), 1, 6);
      let lp = clamp(Math.round(Number(state.lonePairs) || 0), 0, 4);
      if (bp + lp > 6) {
        lp = Math.max(0, 6 - bp);
        state.lonePairs = lp;
      }
      if (bp < 2 && lp > 0) {
        bp = 2;
        state.bondingPairs = 2;
      }
      state.bondingPairs = bp;
      state.lonePairs = lp;
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      const bg = ctx.createRadialGradient(320, 250, 30, 320, 250, 520);
      bg.addColorStop(0, '#1e293b');
      bg.addColorStop(1, '#090d16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const isReal = state.mode === 'real';
      const realMol = REAL_VSEPR_MOLECULES[state.realMolecule] || REAL_VSEPR_MOLECULES.H2O;
      const bp = isReal ? realMol.bp : state.bondingPairs;
      const lp = isReal ? realMol.lp : state.lonePairs;
      const key = `${bp}_${lp}`;
      const geomInfo = VSEPR_TABLE[key] || {
        eGeom: '八面体衍生构型',
        mGeom: '自定义构型',
        idealAngle: '90.0°'
      };

      const useRealDistortion = isReal && state.angleType === 'real';
      const { bpDirs, lpDirs } = getVSEPRVectors(bp, lp, useRealDistortion, state.realMolecule);

      const centerAtom = isReal ? ATOM_INFO[realMol.center] : { symbol: 'A', color: '#a855f7' };
      const ligAtom = isReal ? ATOM_INFO[realMol.ligand] : { symbol: 'X', color: '#f8fafc', radius: 22 };

      const ligands = bpDirs.map((d) => ({
        dir: d,
        symbol: ligAtom.symbol,
        color: ligAtom.color,
        radius: ligAtom.radius || 22,
        order: isReal ? realMol.bondOrder : 1
      }));
      const lonePairs = lpDirs.map((d) => ({ dir: d }));

      const displayedAngle = isReal
        ? state.angleType === 'real'
          ? realMol.realAngle
          : realMol.idealAngle
        : geomInfo.idealAngle;

      render3DVSEPRScene(ctx, 315, 250, 134, state.rotX, state.rotY, ligands, lonePairs, {
        showBondAngles: state.showBondAngles,
        angleLabel: displayedAngle,
        centerColor: centerAtom.color,
        centerSymbol: centerAtom.symbol,
        showLonePairs: state.showLonePairs
      });

      // Bottom bar: quick real-molecule pills in real mode, or BP/LP info in model mode
      if (isReal) {
        const keys = Object.keys(REAL_VSEPR_MOLECULES);
        keys.forEach((k, i) => {
          const m = REAL_VSEPR_MOLECULES[k];
          const bx = 18 + i * 54;
          const by = 482;
          drawRoundedRect(ctx, bx, by, 50, 36, 7);
          ctx.fillStyle = state.realMolecule === k ? '#0284c7' : 'rgba(30, 41, 59, 0.85)';
          ctx.fill();
          ctx.strokeStyle = state.realMolecule === k ? '#38bdf8' : '#475569';
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(m.formula, bx + 25, by + 23);
        });
      }

      // Right VSEPR Dashboard
      drawRoundedRect(ctx, 626, 20, 256, 500, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isReal ? `真实分子 VSEPR：${realMol.formula}` : `VSEPR 模型：AX${bp}E${lp}`, 642, 50);

      const cards = [
        ['价层电子域总数 (SN)', `${bp + lp} (BP=${bp}, LP=${lp})`],
        ['电子域几何构型 (Electron)', geomInfo.eGeom],
        ['分子空间构型 (Molecular)', geomInfo.mGeom],
        ['理想 VSEPR 键角', isReal ? realMol.idealAngle : geomInfo.idealAngle],
        ['实测真实键角', isReal ? realMol.realAngle : geomInfo.idealAngle]
      ];
      cards.forEach(([label, val], idx) => {
        const y0 = 72 + idx * 72;
        drawRoundedRect(ctx, 640, y0, 228, 60, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.78)';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(label, 652, y0 + 20);
        ctx.fillStyle = idx === 2 ? '#4ade80' : idx === 1 ? '#38bdf8' : '#f8fafc';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(val, 652, y0 + 42);
      });

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('孤对电子排斥规律：LP-LP > LP-BP > BP-BP', 642, 462);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('因此孤对电子会压缩成键键角 (如 H₂O 104.5°)', 642, 482);

      ctx.restore();
    },
    getReadouts(state) {
      const isReal = state.mode === 'real';
      const realMol = REAL_VSEPR_MOLECULES[state.realMolecule] || REAL_VSEPR_MOLECULES.H2O;
      const bp = isReal ? realMol.bp : state.bondingPairs;
      const lp = isReal ? realMol.lp : state.lonePairs;
      const geomInfo = VSEPR_TABLE[`${bp}_${lp}`] || { eGeom: '-', mGeom: '-', idealAngle: '-' };
      return [
        { label: 'VSEPR 通式', name: 'VSEPR 通式', value: `AX${bp}${lp > 0 ? 'E' + lp : ''}`, unit: '' },
        { label: '电子几何构型', name: '电子几何构型', value: geomInfo.eGeom, unit: '' },
        { label: '分子几何构型', name: '分子几何构型', value: geomInfo.mGeom, unit: '' },
        {
          label: '当前显示键角',
          name: '当前显示键角',
          value: isReal ? (state.angleType === 'real' ? realMol.realAngle : realMol.idealAngle) : geomInfo.idealAngle,
          unit: ''
        }
      ];
    },
    onPointerDown(x, y, state) {
      if (state.mode === 'real') {
        const keys = Object.keys(REAL_VSEPR_MOLECULES);
        for (let i = 0; i < keys.length; i++) {
          const bx = 18 + i * 54;
          const by = 482;
          if (x >= bx && x <= bx + 50 && y >= by && y <= by + 36) {
            state.realMolecule = keys[i];
            return;
          }
        }
      }
      state.isDragging = true;
      state.lastX = x;
      state.lastY = y;
    },
    onPointerMove(x, y, state) {
      if (!state.isDragging) return;
      state.rotY += (x - state.lastX) * 0.011;
      state.rotX = clamp(state.rotX + (y - state.lastY) * 0.011, -Math.PI / 2, Math.PI / 2);
      state.lastX = x;
      state.lastY = y;
    },
    onPointerUp(x, y, state) {
      state.isDragging = false;
    }
  });

  // ============================================================================
  // 4. 'molecule-polarity' (分子极性)
  // ============================================================================
  const POLARITY_REAL_MOLS = {
    HF: { formula: 'HF (氟化氢)', type: 'diatomic', enA: 2.20, enB: 3.98, symA: 'H', symB: 'F', debye: 1.82 },
    N2: { formula: 'N₂ (氮气)', type: 'diatomic', enA: 3.04, enB: 3.04, symA: 'N', symB: 'N', debye: 0.0 },
    CO2: {
      formula: 'CO₂ (二氧化碳)',
      type: 'triatomic',
      enA: 3.44,
      enB: 2.55,
      enC: 3.44,
      symA: 'O',
      symB: 'C',
      symC: 'O',
      bondAngle: 180,
      debye: 0.0
    },
    H2O: {
      formula: 'H₂O (水)',
      type: 'triatomic',
      enA: 2.20,
      enB: 3.44,
      enC: 2.20,
      symA: 'H',
      symB: 'O',
      symC: 'H',
      bondAngle: 104.5,
      debye: 1.85
    },
    SO2: {
      formula: 'SO₂ (二氧化硫)',
      type: 'triatomic',
      enA: 3.44,
      enB: 2.58,
      enC: 3.44,
      symA: 'O',
      symB: 'S',
      symC: 'O',
      bondAngle: 119.0,
      debye: 1.63
    }
  };

  function getPolarityGeometry(state) {
    let isTri = state.mode === 'triatomic';
    let enA = Number(state.enA) || 2.2;
    let enB = Number(state.enB) || 3.4;
    let enC = Number(state.enC) || 2.2;
    let bondAngle = Number(state.bondAngle) || 105;
    let symA = 'A',
      symB = 'B',
      symC = 'C';

    if (state.mode === 'real') {
      const m = POLARITY_REAL_MOLS[state.realPolarMol] || POLARITY_REAL_MOLS.H2O;
      isTri = m.type === 'triatomic';
      enA = m.enA;
      enB = m.enB;
      enC = m.enC ?? m.enA;
      bondAngle = m.bondAngle ?? 180;
      symA = m.symA;
      symB = m.symB;
      symC = m.symC || '';
    }

    const theta = state.molAngle || 0;
    const bondLen = 104;

    if (!isTri) {
      // Diatomic A - B
      const ax = -Math.cos(theta) * (bondLen * 0.55);
      const ay = -Math.sin(theta) * (bondLen * 0.55);
      const bx = Math.cos(theta) * (bondLen * 0.55);
      const by = Math.sin(theta) * (bondLen * 0.55);
      // Dipole points from lower EN to higher EN (positive -> negative in chemistry IUPAC arrow with crossed tail)
      const dAB = enB - enA;
      const ux = (bx - ax) / bondLen;
      const uy = (by - ay) / bondLen;
      const dipX = ux * dAB;
      const dipY = uy * dAB;
      return {
        isTri: false,
        atoms: [
          { label: symA, en: enA, x: ax, y: ay, q: -dAB * 0.5 },
          { label: symB, en: enB, x: bx, y: by, q: -dAB * 0.5 ? dAB * 0.5 : 0 }
        ],
        // Wait: atom with higher EN gets negative partial charge delta-
        charges: [-dAB * 0.45, dAB * 0.45], // Wait: if enB > enA, dAB > 0 -> A is delta+ (+dAB), B is delta- (-dAB)
        bonds: [{ from: 0, to: 1, dEN: dAB, vx: dipX, vy: dipY }],
        netDipole: [dipX, dipY]
      };
    } else {
      // Triatomic A - B - C with B at origin
      const half = degToRad(bondAngle / 2);
      const a1 = theta + Math.PI - half;
      const a2 = theta + Math.PI + half;
      const ax = Math.cos(a1) * bondLen;
      const ay = Math.sin(a1) * bondLen;
      const cx = Math.cos(a2) * bondLen;
      const cy = Math.sin(a2) * bondLen;

      // Bond vectors from A->B and C->B
      const uBAx = ax / bondLen;
      const uBAy = ay / bondLen;
      const uBCx = cx / bondLen;
      const uBCy = cy / bondLen;

      // Dipole vector of B-A bond points towards whichever has higher EN: (enA - enB) * u_BA
      const d1x = (enA - enB) * uBAx;
      const d1y = (enA - enB) * uBAy;
      const d2x = (enC - enB) * uBCx;
      const d2y = (enC - enB) * uBCy;

      const netX = d1x + d2x;
      const netY = d1y + d2y;

      // Partial charges: q_A = enB - enA, q_C = enB - enC, q_B = -(q_A + q_C)
      const qA = (enB - enA) * 0.38;
      const qC = (enB - enC) * 0.38;
      const qB = -(qA + qC);

      return {
        isTri: true,
        bondAngle,
        atoms: [
          { label: symA, en: enA, x: ax, y: ay, q: qA },
          { label: symB, en: enB, x: 0, y: 0, q: qB },
          { label: symC, en: enC, x: cx, y: cy, q: qC }
        ],
        bonds: [
          { from: 1, to: 0, dEN: enA - enB, vx: d1x, vy: d1y },
          { from: 1, to: 2, dEN: enC - enB, vx: d2x, vy: d2y }
        ],
        netDipole: [netX, netY]
      };
    }
  }

  register('molecule-polarity', {
    modes: [
      { id: 'diatomic', value: 'diatomic', label: '双原子分子 (AB)', name: '双原子分子 (AB)' },
      { id: 'triatomic', value: 'triatomic', label: '三原子分子 (ABC)', name: '三原子分子 (ABC)' },
      { id: 'real', value: 'real', label: '真实分子 (MEP)', name: '真实分子 (MEP)' }
    ],
    controls: [
      {
        id: 'enA',
        key: 'enA',
        name: 'enA',
        type: 'range',
        label: '原子 A 电负性 (χ_A)',
        min: 2.0,
        max: 4.0,
        step: 0.1,
        default: 2.2,
        value: 2.2,
        unit: ''
      },
      {
        id: 'enB',
        key: 'enB',
        name: 'enB',
        type: 'range',
        label: '中心原子 B 电负性 (χ_B)',
        min: 2.0,
        max: 4.0,
        step: 0.1,
        default: 3.5,
        value: 3.5,
        unit: ''
      },
      {
        id: 'enC',
        key: 'enC',
        name: 'enC',
        type: 'range',
        label: '原子 C 电负性 (χ_C)',
        min: 2.0,
        max: 4.0,
        step: 0.1,
        default: 2.2,
        value: 2.2,
        unit: ''
      },
      {
        id: 'bondAngle',
        key: 'bondAngle',
        name: 'bondAngle',
        type: 'range',
        label: '三原子键角 (∠ABC)',
        min: 90,
        max: 180,
        step: 1,
        default: 105,
        value: 105,
        unit: '°'
      },
      {
        id: 'realPolarMol',
        key: 'realPolarMol',
        name: 'realPolarMol',
        type: 'select',
        label: '真实分子预设',
        default: 'H2O',
        value: 'H2O',
        options: Object.keys(POLARITY_REAL_MOLS).map((k) => ({
          id: k,
          value: k,
          label: POLARITY_REAL_MOLS[k].formula,
          name: POLARITY_REAL_MOLS[k].formula
        }))
      },
      {
        id: 'electricField',
        key: 'electricField',
        name: 'electricField',
        type: 'checkbox',
        label: '开启外加平行板静电场',
        default: true,
        value: true
      },
      {
        id: 'showMEP',
        key: 'showMEP',
        name: 'showMEP',
        type: 'checkbox',
        label: '显示静电势云图 (MEP 红负蓝正)',
        default: true,
        value: true
      },
      {
        id: 'showVectors',
        key: 'showVectors',
        name: 'showVectors',
        type: 'checkbox',
        label: '显示键偶极矩与分子总偶极矩矢量',
        default: true,
        value: true
      }
    ],
    defaultState: {
      mode: 'triatomic',
      enA: 2.2,
      enB: 3.5,
      enC: 2.2,
      bondAngle: 105,
      realPolarMol: 'H2O',
      electricField: true,
      showMEP: true,
      showVectors: true,
      molAngle: 0.9,
      molOmega: 0,
      draggingRotate: false
    },
    init(state) {
      state._initialized = true;
      state.molAngle = state.molAngle ?? 0.9;
      state.molOmega = 0;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      const geom = getPolarityGeometry(state);
      const [px, py] = geom.netDipole;
      const pMag = Math.hypot(px, py);

      // Electric field points from Left Plate (+) to Right Plate (-), i.e., E = (+1, 0)
      // Wait: in chemistry notation, our netDipole vector points from δ+ to δ-.
      // In an electric field where Left Plate is (+) and Right Plate is (-), the δ- end is attracted to the Left (+) plate!
      // That means the δ+ -> δ- dipole arrow aligns towards the LEFT (+) plate (angle = PI).
      if (state.electricField && pMag > 0.02 && !state.draggingRotate) {
        const dipAngle = Math.atan2(py, px);
        // Target angle for δ- end is Left (+ plate), so dipAngle -> Math.PI
        let diff = Math.PI - dipAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const torque = diff * pMag * 8.5;
        state.molOmega = (state.molOmega + torque * dt) * Math.exp(-3.8 * dt);
        state.molAngle += state.molOmega * dt;
      } else {
        state.molOmega *= 0.85;
      }
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      const cx = 310;
      const cy = 255;
      const geom = getPolarityGeometry(state);
      // Correct diatomic partial charge assignment
      if (!geom.isTri) {
        const d = geom.atoms[1].en - geom.atoms[0].en;
        geom.atoms[0].q = d * 0.45; // if B is more electronegative, A is δ+
        geom.atoms[1].q = -d * 0.45; // B is δ-
      }

      // Draw Parallel Electric Field Plates
      if (state.electricField) {
        // Left Plate (+)
        drawRoundedRect(ctx, 26, 55, 28, 395, 6);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right Plate (-)
        drawRoundedRect(ctx, 566, 55, 28, 395, 6);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();

        ctx.font = 'bold 18px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < 6; i++) {
          const py = 95 + i * 62;
          ctx.fillStyle = '#f87171';
          ctx.fillText('+', 40, py);
          ctx.fillStyle = '#60a5fa';
          ctx.fillText('−', 580, py);
          // Faint E-field lines
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(56, py - 5);
          ctx.lineTo(564, py - 5);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Electrostatic Potential (MEP) Cloud around atoms
      if (state.showMEP) {
        for (const a of geom.atoms) {
          const ax = cx + a.x;
          const ay = cy + a.y;
          const q = clamp(a.q, -1, 1);
          // In PhET MEP: Red = negative potential (δ-, electron-rich), Blue = positive potential (δ+, electron-poor), Green/White = neutral
          let rCol = 180,
            gCol = 210,
            bCol = 190;
          if (q < -0.03) {
            const t = clamp(-q * 1.4, 0, 1);
            rCol = Math.round(lerp(200, 239, t));
            gCol = Math.round(lerp(215, 55, t));
            bCol = Math.round(lerp(200, 55, t));
          } else if (q > 0.03) {
            const t = clamp(q * 1.4, 0, 1);
            rCol = Math.round(lerp(200, 45, t));
            gCol = Math.round(lerp(215, 115, t));
            bCol = Math.round(lerp(200, 245, t));
          }
          const mepGrad = ctx.createRadialGradient(ax, ay, 12, ax, ay, 92);
          mepGrad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, 0.58)`);
          mepGrad.addColorStop(0.65, `rgba(${rCol}, ${gCol}, ${bCol}, 0.24)`);
          mepGrad.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0)`);
          ctx.fillStyle = mepGrad;
          ctx.beginPath();
          ctx.arc(ax, ay, 92, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Bonds
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (const b of geom.bonds) {
        const a1 = geom.atoms[b.from];
        const a2 = geom.atoms[b.to];
        ctx.beginPath();
        ctx.moveTo(cx + a1.x, cy + a1.y);
        ctx.lineTo(cx + a2.x, cy + a2.y);
        ctx.stroke();
      }

      // Draw Atoms & Partial Charges δ+ / δ-
      geom.atoms.forEach((a, idx) => {
        const ax = cx + a.x;
        const ay = cy + a.y;
        const col = idx === 1 ? '#a855f7' : '#38bdf8';
        drawSphere(ctx, ax, ay, 24, col, a.label);

        const qStr =
          Math.abs(a.q) < 0.03 ? 'δ ≈ 0' : a.q > 0 ? `δ+ (+${a.q.toFixed(2)})` : `δ− (${a.q.toFixed(2)})`;
        ctx.fillStyle = Math.abs(a.q) < 0.03 ? '#cbd5e1' : a.q > 0 ? '#60a5fa' : '#f87171';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(qStr, ax, ay - 33);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(`χ=${a.en.toFixed(2)}`, ax, ay + 36);
      });

      // Draw Bond Dipole Arrows (cyan) and Net Molecular Dipole Vector (yellow)
      if (state.showVectors) {
        for (const b of geom.bonds) {
          const a1 = geom.atoms[b.from];
          const a2 = geom.atoms[b.to];
          const mx = cx + (a1.x + a2.x) * 0.5;
          const my = cy + (a1.y + a2.y) * 0.5;
          const mag = Math.hypot(b.vx, b.vy);
          if (mag > 0.04) {
            const scale = 38;
            drawArrow(
              ctx,
              mx - b.vx * scale * 0.5,
              my - b.vy * scale * 0.5,
              mx + b.vx * scale * 0.5,
              my + b.vy * scale * 0.5,
              '#22d3ee',
              2.5,
              9,
              true
            );
          }
        }

        const [nx, ny] = geom.netDipole;
        const nMag = Math.hypot(nx, ny);
        if (nMag > 0.04) {
          const scale = 48;
          drawArrow(
            ctx,
            cx - nx * scale * 0.35,
            cy - ny * scale * 0.35 - 58,
            cx + nx * scale * 0.65,
            cy + ny * scale * 0.65 - 58,
            '#facc15',
            4,
            12,
            true
          );
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`总偶极矩 μ = ${(nMag * 1.15).toFixed(2)} D`, cx, cy - 82);
        } else {
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('总偶极矩 μ = 0.00 D (非极性分子，键偶极相互抵消)', cx, cy - 82);
        }
      }

      // MEP Colorbar Legend at bottom left
      drawRoundedRect(ctx, 75, 472, 470, 44, 8);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fill();
      const barGrad = ctx.createLinearGradient(185, 0, 425, 0);
      barGrad.addColorStop(0, '#ef4444');
      barGrad.addColorStop(0.5, '#cbd5e1');
      barGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = barGrad;
      ctx.fillRect(185, 484, 240, 12);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('δ− 富电子区(红)', 178, 494);
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'left';
      ctx.fillText('δ+ 缺电子区(蓝)', 432, 494);

      // Right Analysis Panel
      drawRoundedRect(ctx, 616, 20, 266, 500, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      const [nx, ny] = geom.netDipole;
      const mu = Math.hypot(nx, ny) * 1.15;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('分子极性与偶极矩分析', 634, 50);

      const infoRows = [
        ['当前模式', state.mode === 'diatomic' ? '双原子分子 AB' : state.mode === 'triatomic' ? '三原子分子 ABC' : '真实分子'],
        ['电负性差 |Δχ|', Math.abs(geom.atoms[0].en - geom.atoms[1].en).toFixed(2)],
        [
          '化学键类型',
          Math.abs(geom.atoms[0].en - geom.atoms[1].en) < 0.05
            ? '非极性共价键'
            : Math.abs(geom.atoms[0].en - geom.atoms[1].en) > 1.7
            ? '强极性/离子性键'
            : '极性共价键'
        ],
        ['分子总偶极矩 |μ|', `${mu.toFixed(2)} D (德拜)`],
        ['分子极性判定', mu > 0.05 ? '极性分子 (受静电场扭矩定向)' : '非极性分子 (静电场中不偏转)']
      ];
      infoRows.forEach(([k, v], i) => {
        const y0 = 76 + i * 74;
        drawRoundedRect(ctx, 632, y0, 234, 60, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.78)';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(k, 644, y0 + 20);
        ctx.fillStyle = i === 4 ? (mu > 0.05 ? '#facc15' : '#4ade80') : '#f8fafc';
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(v, 644, y0 + 42);
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('提示：用鼠标拖拽分子可偏转其角度，松手后', 634, 470);
      ctx.fillText('观察极性分子在外加电场中的受扭转恢复。', 634, 488);

      ctx.restore();
    },
    getReadouts(state) {
      const geom = getPolarityGeometry(state);
      const mu = Math.hypot(geom.netDipole[0], geom.netDipole[1]) * 1.15;
      const dEN = Math.abs(geom.atoms[0].en - geom.atoms[1].en);
      return [
        { label: '电负性差 |Δχ|', name: '电负性差 |Δχ|', value: dEN.toFixed(2), unit: '' },
        { label: '分子总偶极矩 μ', name: '分子总偶极矩 μ', value: mu.toFixed(2), unit: 'D' },
        { label: '分子极性', name: '分子极性', value: mu > 0.05 ? '极性分子' : '非极性分子', unit: '' },
        { label: '外加静电场', name: '外加静电场', value: state.electricField ? '已开启' : '已关闭', unit: '' }
      ];
    },
    onPointerDown(x, y, state) {
      if (x < 600) {
        state.draggingRotate = true;
        state.molAngle = Math.atan2(y - 255, x - 310);
        state.molOmega = 0;
      }
    },
    onPointerMove(x, y, state) {
      if (!state.draggingRotate) return;
      state.molAngle = Math.atan2(y - 255, x - 310);
      state.molOmega = 0;
    },
    onPointerUp(x, y, state) {
      state.draggingRotate = false;
    }
  });

  // ============================================================================
  // 5. 'atomic-interactions' (原子间相互作用 - Lennard-Jones 势与 Velocity Verlet)
  // ============================================================================
  const LJ_PAIR_PRESETS = {
    'Ne-Ne': { name: 'Ne - Ne (氖·弱范德华力)', eps: 0.35, sigma: 2.75, color: '#38bdf8', symbol: 'Ne' },
    'Ar-Ar': { name: 'Ar - Ar (氩·中等范德华力)', eps: 1.20, sigma: 3.40, color: '#a855f7', symbol: 'Ar' },
    'O-O': { name: 'O - O (氧原子·深共价键势阱)', eps: 4.20, sigma: 1.45, color: '#ef4444', symbol: 'O' },
    custom: { name: '自定义参数 (Custom ε & σ)', eps: 2.00, sigma: 2.60, color: '#22c55e', symbol: 'X' }
  };

  function calcLJ(r, eps, sigma) {
    const rSafe = Math.max(0.55 * sigma, r);
    const sr = sigma / rSafe;
    const sr6 = Math.pow(sr, 6);
    const sr12 = sr6 * sr6;
    const V = 4 * eps * (sr12 - sr6);
    // Force F = -dV/dr = 4 * eps * (12 * sigma^12 / r^13 - 6 * sigma^6 / r^7)
    const fRep = (48 * eps * sr12) / rSafe; // +r direction (repulsive)
    const fAtt = (-24 * eps * sr6) / rSafe; // -r direction (attractive)
    const fNet = fRep + fAtt;
    return { V, fRep, fAtt, fNet };
  }

  register('atomic-interactions', {
    modes: [
      { id: 'Ne-Ne', value: 'Ne-Ne', label: 'Ne-Ne (弱范德华力)', name: 'Ne-Ne (弱范德华力)' },
      { id: 'Ar-Ar', value: 'Ar-Ar', label: 'Ar-Ar (强范德华力)', name: 'Ar-Ar (强范德华力)' },
      { id: 'O-O', value: 'O-O', label: 'O-O (共价成键深势阱)', name: 'O-O (共价成键深势阱)' },
      { id: 'custom', value: 'custom', label: '自定义 ε 与 σ', name: '自定义 ε 与 σ' }
    ],
    controls: [
      {
        id: 'epsilon',
        key: 'epsilon',
        name: 'epsilon',
        type: 'range',
        label: '势阱深度 ε (相互作用强度)',
        min: 0.2,
        max: 5.0,
        step: 0.1,
        default: 1.2,
        value: 1.2,
        unit: 'kJ/mol(相对)'
      },
      {
        id: 'sigma',
        key: 'sigma',
        name: 'sigma',
        type: 'range',
        label: '原子特征直径 σ',
        min: 1.2,
        max: 4.0,
        step: 0.1,
        default: 3.0,
        value: 3.0,
        unit: 'Å'
      },
      {
        id: 'damping',
        key: 'damping',
        name: 'damping',
        type: 'range',
        label: '阻尼系数 (0=能量守恒振荡)',
        min: 0.0,
        max: 1.0,
        step: 0.05,
        default: 0.0,
        value: 0.0,
        unit: ''
      },
      {
        id: 'forceDisplay',
        key: 'forceDisplay',
        name: 'forceDisplay',
        type: 'select',
        label: '力学矢量箭头显示',
        default: 'components',
        value: 'components',
        options: [
          { id: 'components', value: 'components', label: '显示泡利排斥力与范德华吸引力分力', name: '吸引/排斥分力' },
          { id: 'total', value: 'total', label: '仅显示总合力矢量', name: '总合力' },
          { id: 'none', value: 'none', label: '隐藏力矢量', name: '隐藏力矢量' }
        ]
      }
    ],
    defaultState: {
      mode: 'Ar-Ar',
      epsilon: 1.2,
      sigma: 3.0,
      damping: 0.0,
      forceDisplay: 'components',
      r: 3.8,
      v: 0.0,
      draggingAtom: false
    },
    init(state) {
      state._initialized = true;
      state._prevMode = state.mode;
      const preset = LJ_PAIR_PRESETS[state.mode] || LJ_PAIR_PRESETS['Ar-Ar'];
      if (state.mode !== 'custom') {
        state.epsilon = preset.eps;
        state.sigma = preset.sigma;
      }
      state.r = Math.pow(2, 1 / 6) * state.sigma * 1.18;
      state.v = 0;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      if (state.mode !== state._prevMode) {
        state._prevMode = state.mode;
        const preset = LJ_PAIR_PRESETS[state.mode];
        if (preset && state.mode !== 'custom') {
          state.epsilon = preset.eps;
          state.sigma = preset.sigma;
          state.r = Math.pow(2, 1 / 6) * state.sigma * 1.18;
          state.v = 0;
        }
      }

      if (state.draggingAtom) return;

      // Velocity Verlet integration with 8 substeps per frame for symplectic energy conservation
      const substeps = 8;
      const h = (dt * 1.6) / substeps;
      const eps = Number(state.epsilon) || 1.2;
      const sigma = Number(state.sigma) || 3.0;
      const damp = Number(state.damping) || 0;
      const mass = 1.0;

      for (let s = 0; s < substeps; s++) {
        const { fNet } = calcLJ(state.r, eps, sigma);
        const a1 = (fNet - damp * state.v) / mass;
        const rNext = state.r + state.v * h + 0.5 * a1 * h * h;
        const { fNet: fNext } = calcLJ(rNext, eps, sigma);
        const a2 = (fNext - damp * state.v) / mass;
        state.v += 0.5 * (a1 + a2) * h;
        state.r = rNext;

        // Soft reflecting wall at right boundary r = 9.2 Å so escaped atom remains visible
        if (state.r > 9.2) {
          state.r = 9.2;
          state.v = -Math.abs(state.v) * 0.6;
        }
        if (state.r < 0.68 * sigma) {
          state.r = 0.68 * sigma;
          state.v = Math.abs(state.v) * 0.8;
        }
      }
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      const eps = Number(state.epsilon) || 1.2;
      const sigma = Number(state.sigma) || 3.0;
      const r0 = Math.pow(2, 1 / 6) * sigma;
      const preset = LJ_PAIR_PRESETS[state.mode] || LJ_PAIR_PRESETS.custom;

      // Coordinate mapping: r in [0, 10] Å -> x in [120, 820] (70 px per Å)
      const originX = 120;
      const pxPerAngstrom = 70;
      const rToX = (r) => originX + r * pxPerAngstrom;

      // 1. Top Panel: Lennard-Jones Potential V(r) Graph
      const gx = 70,
        gy = 20,
        gw = 780,
        gh = 265;
      drawRoundedRect(ctx, gx, gy, gw, gh, 12);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      const zeroY = gy + 115; // V = 0 horizontal axis
      const yScale = 28; // px per unit energy

      // V = 0 dashed horizontal axis
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(originX, zeroY);
      ctx.lineTo(gx + gw - 20, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('V(r) = 0', originX - 8, zeroY + 4);
      ctx.fillText('+V (排斥)', originX - 8, gy + 32);
      ctx.fillText('−ε (势阱)', originX - 8, gy + gh - 20);

      // Draw V(r) curve
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx + 2, gy + 2, gw - 4, gh - 4);
      ctx.clip();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let started = false;
      for (let rVal = 0.75 * sigma; rVal <= 9.5; rVal += 0.03) {
        const { V } = calcLJ(rVal, eps, sigma);
        const px = rToX(rVal);
        const py = clamp(zeroY - V * yScale, gy - 20, gy + gh + 20);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Mark equilibrium r0 = 2^(1/6) sigma
      const eqX = rToX(r0);
      const eqY = zeroY + eps * yScale;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(eqX, zeroY);
      ctx.lineTo(eqX, eqY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#4ade80';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`r₀=${r0.toFixed(2)}Å, Vmin=−${eps.toFixed(2)}`, eqX, Math.min(gy + gh - 10, eqY + 18));

      // Current state point on V(r) curve & Total Energy line E = K + V
      const curLJ = calcLJ(state.r, eps, sigma);
      const curK = 0.5 * state.v * state.v;
      const curE = curLJ.V + curK;
      const curX = rToX(state.r);
      const curY = clamp(zeroY - curLJ.V * yScale, gy + 12, gy + gh - 12);
      const totEY = clamp(zeroY - curE * yScale, gy + 12, gy + gh - 12);

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(originX, totEY);
      ctx.lineTo(gx + gw - 30, totEY);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.fillText(`总机械能 E = ${curE.toFixed(2)} (${curE < 0 ? '束缚振动' : '非束缚逃逸'})`, gx + gw - 36, totEY - 6);

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(curX, curY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Formula header
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Lennard-Jones 势能曲线：V(r) = 4ε [ (σ/r)¹² − (σ/r)⁶ ]', gx + 65, gy + 26);

      // 2. Bottom Panel: Interactive Two-Atom Stage
      const sy = 302,
        sh = 218;
      drawRoundedRect(ctx, gx, sy, gw, sh, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.stroke();

      const atomY = sy + 108;
      const atomRadiusPx = (sigma * pxPerAngstrom) / 2;

      // Vertical alignment guide from movable atom to V(r) dot
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(curX, atomY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Overlapping electron cloud glow when near covalent/vdW minimum
      const distPx = curX - originX;
      if (state.r < r0 * 1.45) {
        const cloudGrad = ctx.createRadialGradient(
          (originX + curX) / 2,
          atomY,
          8,
          (originX + curX) / 2,
          atomY,
          distPx * 0.75
        );
        cloudGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        cloudGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc((originX + curX) / 2, atomY, distPx * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pinned Left Atom (at originX)
      drawSphere(ctx, originX, atomY, atomRadiusPx * 0.48, preset.color, preset.symbol);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('固定原子 (Pin)', originX, atomY + atomRadiusPx * 0.48 + 18);

      // Movable Right Atom (at curX)
      drawSphere(ctx, curX, atomY, atomRadiusPx * 0.48, preset.color, preset.symbol);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('⇄ 拖拽此原子改变间距 r', curX, atomY + atomRadiusPx * 0.48 + 18);

      // Draw Force Arrows on Both Atoms
      const fScale = 16;
      if (state.forceDisplay === 'components') {
        const repLen = clamp(curLJ.fRep * fScale, 0, 140);
        const attLen = clamp(Math.abs(curLJ.fAtt) * fScale, 0, 140);
        if (repLen > 3) {
          drawArrow(ctx, curX, atomY - 14, curX + repLen, atomY - 14, '#f97316', 3, 9, false);
          drawArrow(ctx, originX, atomY - 14, originX - repLen, atomY - 14, '#f97316', 3, 9, false);
        }
        if (attLen > 3) {
          drawArrow(ctx, curX, atomY + 14, curX - attLen, atomY + 14, '#a855f7', 3, 9, false);
          drawArrow(ctx, originX, atomY + 14, originX + attLen, atomY + 14, '#a855f7', 3, 9, false);
        }
      } else if (state.forceDisplay === 'total') {
        const netLen = clamp(curLJ.fNet * fScale, -150, 150);
        if (Math.abs(netLen) > 3) {
          drawArrow(ctx, curX, atomY, curX + netLen, atomY, '#22c55e', 4, 11, false);
          drawArrow(ctx, originX, atomY, originX - netLen, atomY, '#22c55e', 4, 11, false);
        }
      }

      // Legend & Reset to Equilibrium Button
      ctx.fillStyle = '#f97316';
      ctx.font = '12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('● 泡利排斥力 (+F_rep ∝ r⁻¹³)', gx + 20, sy + 28);
      ctx.fillStyle = '#a855f7';
      ctx.fillText('● 范德华吸引力 (−F_att ∝ r⁻⁷)', gx + 215, sy + 28);

      drawRoundedRect(ctx, gx + gw - 165, sy + 14, 145, 28, 7);
      ctx.fillStyle = '#1e40af';
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('置于平衡核间距 r₀', gx + gw - 92, sy + 32);

      ctx.restore();
    },
    getReadouts(state) {
      const eps = Number(state.epsilon) || 1.2;
      const sigma = Number(state.sigma) || 3.0;
      const r0 = Math.pow(2, 1 / 6) * sigma;
      const { V, fNet } = calcLJ(state.r || r0, eps, sigma);
      return [
        { label: '当前核间距 r', name: '当前核间距 r', value: (state.r || r0).toFixed(2), unit: 'Å' },
        { label: '平衡键长 r₀', name: '平衡键长 r₀', value: r0.toFixed(2), unit: 'Å' },
        { label: '势能 V(r)', name: '势能 V(r)', value: V.toFixed(2), unit: 'kJ/mol' },
        {
          label: '原子间净作用力',
          name: '原子间净作用力',
          value: Math.abs(fNet) < 0.05 ? '0 (受力平衡)' : fNet > 0 ? `+${fNet.toFixed(2)} (排斥)` : `${fNet.toFixed(2)} (吸引)`,
          unit: ''
        }
      ];
    },
    onPointerDown(x, y, state) {
      // Check "置于平衡核间距 r0" button
      if (x >= 685 && x <= 830 && y >= 316 && y <= 344) {
        const sigma = Number(state.sigma) || 3.0;
        state.r = Math.pow(2, 1 / 6) * sigma;
        state.v = 0;
        return;
      }
      if (y >= 290) {
        state.draggingAtom = true;
        const sigma = Number(state.sigma) || 3.0;
        state.r = clamp((x - 120) / 70, 0.72 * sigma, 9.1);
        state.v = 0;
      }
    },
    onPointerMove(x, y, state) {
      if (!state.draggingAtom) return;
      const sigma = Number(state.sigma) || 3.0;
      state.r = clamp((x - 120) / 70, 0.72 * sigma, 9.1);
      state.v = 0;
    },
    onPointerUp(x, y, state) {
      state.draggingAtom = false;
    }
  });

  // ============================================================================
  // 6. 'molecules-and-light' (分子与光 - 光谱选择性吸收：转动/振动/电子激发/光解离)
  // ============================================================================
  const LIGHT_BANDS = {
    microwave: {
      id: 'microwave',
      name: '微波 (Microwave)',
      wavelength: 'λ ≈ 1 cm',
      color: '#f43f5e',
      mechanism: '纯转动跃迁 (要求分子具有永久偶极矩 μ ≠ 0)'
    },
    infrared: {
      id: 'infrared',
      name: '红外光 (Infrared)',
      wavelength: 'λ ≈ 5 μm',
      color: '#f97316',
      mechanism: '振动跃迁 (要求振动引起偶极矩变化 dμ/dQ ≠ 0)'
    },
    visible: {
      id: 'visible',
      name: '可见光 (Visible)',
      wavelength: 'λ ≈ 500 nm',
      color: '#eab308',
      mechanism: '价电子跃迁 (仅吸收可见光的特定有色分子如 NO₂)'
    },
    uv: {
      id: 'uv',
      name: '紫外光 (Ultraviolet)',
      wavelength: 'λ ≈ 250 nm',
      color: '#a855f7',
      mechanism: '高能电子跃迁与光解离 (打断 O₃、NO₂ 较弱共价键)'
    }
  };

  const LIGHT_MOLECULES = {
    CO: {
      formula: 'CO (一氧化碳)',
      isPolar: true,
      irActive: true,
      visActive: false,
      uvDissoc: false,
      desc: '极性双原子分子：吸收微波发生刚体转动，吸收红外光发生键伸缩振动'
    },
    N2: {
      formula: 'N₂ (氮气)',
      isPolar: false,
      irActive: false,
      visActive: false,
      uvDissoc: false,
      desc: '对称非极性双原子分子(N≡N)：偶极矩恒为0，对微波、红外、可见及近紫外均透明'
    },
    O2: {
      formula: 'O₂ (氧气)',
      isPolar: false,
      irActive: false,
      visActive: false,
      uvDissoc: false,
      desc: '对称非极性双原子分子(O=O)：不吸收微波与红外光（大气主要成分对红外透明）'
    },
    CO2: {
      formula: 'CO₂ (二氧化碳)',
      isPolar: false,
      irActive: true,
      visActive: false,
      uvDissoc: false,
      desc: '对称直线形(O=C=O)：无永久偶极矩(不吸收微波)，但弯曲/反对称伸缩改变偶极矩，强烈吸收红外光(温室气体)'
    },
    H2O: {
      formula: 'H₂O (水蒸气)',
      isPolar: true,
      irActive: true,
      visActive: false,
      uvDissoc: false,
      desc: '极性角形分子：既吸收微波发生快速旋转(微波炉加热原理)，又强烈吸收红外光发生振动'
    },
    NO2: {
      formula: 'NO₂ (二氧化氮)',
      isPolar: true,
      irActive: true,
      visActive: true,
      uvDissoc: true,
      desc: '红棕色极性气体：吸收微波转动、红外振动、可见光电子激发发光，并在紫外光下光解为 NO + O'
    },
    O3: {
      formula: 'O₃ (臭氧)',
      isPolar: true,
      irActive: true,
      visActive: false,
      uvDissoc: true,
      desc: '极性角形分子：吸收微波与红外光，强烈吸收紫外线发生光解 O₃ + hν → O₂ + O (保护地球生物)'
    }
  };

  function doesMoleculeAbsorb(molKey, bandKey) {
    const m = LIGHT_MOLECULES[molKey] || LIGHT_MOLECULES.H2O;
    if (bandKey === 'microwave') return m.isPolar;
    if (bandKey === 'infrared') return m.irActive;
    if (bandKey === 'visible') return m.visActive;
    if (bandKey === 'uv') return m.uvDissoc;
    return false;
  }

  register('molecules-and-light', {
    modes: [
      { id: 'microwave', value: 'microwave', label: '微波 (转动光谱)', name: '微波 (转动光谱)' },
      { id: 'infrared', value: 'infrared', label: '红外光 (振动光谱)', name: '红外光 (振动光谱)' },
      { id: 'visible', value: 'visible', label: '可见光 (电子跃迁)', name: '可见光 (电子跃迁)' },
      { id: 'uv', value: 'uv', label: '紫外光 (光解离)', name: '紫外光 (光解离)' }
    ],
    controls: [
      {
        id: 'targetMol',
        key: 'targetMol',
        name: 'targetMol',
        type: 'select',
        label: '受照气体分子',
        default: 'H2O',
        value: 'H2O',
        options: Object.keys(LIGHT_MOLECULES).map((k) => ({
          id: k,
          value: k,
          label: LIGHT_MOLECULES[k].formula,
          name: LIGHT_MOLECULES[k].formula
        }))
      },
      {
        id: 'lampPower',
        key: 'lampPower',
        name: 'lampPower',
        type: 'range',
        label: '光子发射速率 (光源功率)',
        min: 0,
        max: 100,
        step: 10,
        default: 70,
        value: 70,
        unit: '%'
      },
      {
        id: 'showSpectrum',
        key: 'showSpectrum',
        name: 'showSpectrum',
        type: 'checkbox',
        label: '显示电磁波谱与跃迁能级图',
        default: true,
        value: true
      }
    ],
    defaultState: {
      mode: 'infrared',
      targetMol: 'H2O',
      lampPower: 70,
      showSpectrum: true,
      photons: [],
      spawnTimer: 0,
      molAngle: 0,
      rotSpeed: 0,
      vibTimer: 0,
      vibPhase: 0,
      excitedTimer: 0,
      dissociated: false,
      dissocDist: 0,
      lastActionText: '已就绪：光子照射分子检验选择性吸收'
    },
    init(state) {
      state._initialized = true;
      state.photons = [];
      state.molAngle = 0;
      state.rotSpeed = 0;
      state.vibTimer = 0;
      state.excitedTimer = 0;
      state.dissociated = false;
      state.dissocDist = 0;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      const power = Number(state.lampPower) || 0;
      const band = state.mode || 'infrared';
      const molKey = state.targetMol || 'H2O';

      if (state._prevMol !== molKey) {
        state._prevMol = molKey;
        state.dissociated = false;
        state.dissocDist = 0;
        state.rotSpeed = 0;
        state.vibTimer = 0;
        state.excitedTimer = 0;
      }

      // Spawn incoming photons from lamp (left x=130, y=240)
      if (power > 0) {
        const interval = lerp(0.95, 0.25, power / 100);
        state.spawnTimer = (state.spawnTimer || 0) + dt;
        if (state.spawnTimer >= interval) {
          state.spawnTimer = 0;
          state.photons.push({
            x: 135,
            y: 240,
            vx: 270,
            vy: 0,
            band,
            scattered: false
          });
        }
      }

      const molCx = 410;
      const molCy = 240;

      // Update photons & check interaction with molecule at (410, 240)
      for (let i = state.photons.length - 1; i >= 0; i--) {
        const p = state.photons[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (!p.scattered && Math.abs(p.x - molCx) < 26 && Math.abs(p.y - molCy) < 26 && !state.dissociated) {
          if (doesMoleculeAbsorb(molKey, p.band)) {
            if (p.band === 'microwave') {
              state.rotSpeed = 5.2;
              state.lastActionText = `${molKey} 吸收微波光子 → 激发纯转动能级 (刚体旋转)`;
              state.photons.splice(i, 1);
              continue;
            } else if (p.band === 'infrared') {
              state.vibTimer = 2.6;
              state.lastActionText = `${molKey} 吸收红外光子 → 化学键伸缩/弯曲振动并向四周重辐射`;
              // Re-emit scattered IR photon in random direction
              const randAng = (Math.random() * 1.4 + 0.3) * (Math.random() < 0.5 ? 1 : -1);
              p.vx = Math.cos(randAng) * 240;
              p.vy = Math.sin(randAng) * 240;
              p.scattered = true;
            } else if (p.band === 'visible') {
              state.excitedTimer = 1.8;
              state.lastActionText = `${molKey} 吸收可见光光子 → 电子跃迁至激发态随后退激发荧光`;
              const randAng = (Math.random() * 1.6 + 0.4) * (Math.random() < 0.5 ? 1 : -1);
              p.vx = Math.cos(randAng) * 250;
              p.vy = Math.sin(randAng) * 250;
              p.scattered = true;
            } else if (p.band === 'uv') {
              state.dissociated = true;
              state.dissocDist = 2;
              state.lastActionText = `⚡ ${molKey} 吸收高能紫外光子 → 共价键断裂发生光解离！`;
              state.photons.splice(i, 1);
              continue;
            }
          } else {
            state.lastActionText = `${molKey} 对 ${LIGHT_BANDS[p.band].name} 透明 (不满足偶极跃迁选律，光子直接穿过)`;
          }
        }

        if (p.x > 610 || p.x < 40 || p.y < 30 || p.y > 450) {
          state.photons.splice(i, 1);
        }
      }

      // Update molecular motion states
      if (state.rotSpeed > 0) {
        state.molAngle += state.rotSpeed * dt;
        state.rotSpeed = Math.max(0, state.rotSpeed - 0.85 * dt);
      }
      if (state.vibTimer > 0) {
        state.vibTimer = Math.max(0, state.vibTimer - dt);
        state.vibPhase += dt * 26;
      }
      if (state.excitedTimer > 0) {
        state.excitedTimer = Math.max(0, state.excitedTimer - dt);
      }
      if (state.dissociated) {
        state.dissocDist += 110 * dt;
        if (state.dissocDist > 180) {
          // Auto-reset molecule after full dissociation
          state.dissociated = false;
          state.dissocDist = 0;
        }
      }
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const bandInfo = LIGHT_BANDS[state.mode] || LIGHT_BANDS.infrared;
      const molKey = state.targetMol || 'H2O';
      const molInfo = LIGHT_MOLECULES[molKey] || LIGHT_MOLECULES.H2O;

      // Optical Chamber Frame
      drawRoundedRect(ctx, 20, 20, 595, 390, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      // Left Photon Emitter Lamp
      drawRoundedRect(ctx, 36, 198, 86, 84, 10);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.strokeStyle = bandInfo.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = bandInfo.color;
      ctx.beginPath();
      ctx.arc(122, 240, 18, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bandInfo.name.split(' ')[0], 78, 236);
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(bandInfo.wavelength, 78, 254);

      // Draw Photons as wave-packets
      for (const p of state.photons) {
        const pCol = (LIGHT_BANDS[p.band] || bandInfo).color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4, pCol);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let wx = -10; wx <= 10; wx += 2) {
          const wy = Math.sin(wx * 0.65) * 5;
          if (wx === -10) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw Target Molecule at (410, 240)
      const cx = 410;
      const cy = 240;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.molAngle || 0);

      // Electronic excitation glow (Visible light on NO2)
      if (state.excitedTimer > 0) {
        const exGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 82);
        exGlow.addColorStop(0, 'rgba(250, 204, 21, 0.65)');
        exGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = exGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 82, 0, Math.PI * 2);
        ctx.fill();
      }

      const vibStretch = state.vibTimer > 0 ? Math.sin(state.vibPhase) * 14 : 0;
      const vibBend = state.vibTimer > 0 ? Math.cos(state.vibPhase * 1.15) * 0.22 : 0;
      const dissoc = state.dissociated ? state.dissocDist : 0;

      const drawMolBond = (x1, y1, x2, y2, order) => {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = order === 1 ? 7 : 4.5;
        ctx.lineCap = 'round';
        if (order === 1) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else {
          const dx = x2 - x1,
            dy = y2 - y1,
            l = Math.hypot(dx, dy) || 1;
          const nx = (-dy / l) * 4.5,
            ny = (dx / l) * 4.5;
          for (const s of order === 3 ? [-1.3, 0, 1.3] : [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x1 + nx * s, y1 + ny * s);
            ctx.lineTo(x2 + nx * s, y2 + ny * s);
            ctx.stroke();
          }
        }
      };

      if (molKey === 'CO' || molKey === 'N2' || molKey === 'O2') {
        const d = 38 + vibStretch * 0.6;
        const s1 = molKey === 'CO' ? 'C' : molKey === 'N2' ? 'N' : 'O';
        const s2 = molKey === 'CO' ? 'O' : s1;
        const ord = molKey === 'O2' ? 2 : 3;
        drawMolBond(-d, 0, d, 0, ord);
        drawSphere(ctx, -d, 0, ATOM_INFO[s1].radius, ATOM_INFO[s1].color, s1);
        drawSphere(ctx, d, 0, ATOM_INFO[s2].radius, ATOM_INFO[s2].color, s2);
      } else if (molKey === 'CO2') {
        const d = 62 + vibStretch * 0.6;
        const bendY = state.vibTimer > 0 ? Math.sin(state.vibPhase) * 16 : 0;
        drawMolBond(0, -bendY * 0.5, -d, bendY, 2);
        drawMolBond(0, -bendY * 0.5, d, bendY, 2);
        drawSphere(ctx, -d, bendY, ATOM_INFO.O.radius, ATOM_INFO.O.color, 'O');
        drawSphere(ctx, d, bendY, ATOM_INFO.O.radius, ATOM_INFO.O.color, 'O');
        drawSphere(ctx, 0, -bendY * 0.5, ATOM_INFO.C.radius, ATOM_INFO.C.color, 'C');
      } else if (molKey === 'H2O') {
        const ang = degToRad(52.25) + vibBend;
        const r = 56 + vibStretch * 0.5;
        const x1 = -Math.sin(ang) * r,
          y1 = Math.cos(ang) * r;
        const x2 = Math.sin(ang) * r,
          y2 = Math.cos(ang) * r;
        drawMolBond(0, -10, x1, y1, 1);
        drawMolBond(0, -10, x2, y2, 1);
        drawSphere(ctx, 0, -10, ATOM_INFO.O.radius, ATOM_INFO.O.color, 'O');
        drawSphere(ctx, x1, y1, ATOM_INFO.H.radius, ATOM_INFO.H.color, 'H');
        drawSphere(ctx, x2, y2, ATOM_INFO.H.radius, ATOM_INFO.H.color, 'H');
      } else if (molKey === 'NO2' || molKey === 'O3') {
        const centerSym = molKey === 'NO2' ? 'N' : 'O';
        const ang = degToRad(molKey === 'NO2' ? 67 : 58.4) + vibBend;
        const r = 60 + vibStretch * 0.5;
        const x1 = -Math.sin(ang) * r,
          y1 = Math.cos(ang) * r;
        const x2 = Math.sin(ang) * r + dissoc,
          y2 = Math.cos(ang) * r - dissoc * 0.35;
        drawMolBond(0, -10, x1, y1, 2);
        if (!state.dissociated) drawMolBond(0, -10, x2, y2, 1);
        drawSphere(ctx, 0, -10, ATOM_INFO[centerSym].radius, ATOM_INFO[centerSym].color, centerSym);
        drawSphere(ctx, x1, y1, ATOM_INFO.O.radius, ATOM_INFO.O.color, 'O');
        drawSphere(ctx, x2, y2, ATOM_INFO.O.radius, ATOM_INFO.O.color, 'O');
      }
      ctx.restore();

      // Action log inside chamber
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(state.lastActionText, 36, 392);

      // Bottom Electromagnetic Spectrum Bar & Molecule Selector Buttons
      drawRoundedRect(ctx, 20, 422, 595, 98, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      const bandKeys = ['microwave', 'infrared', 'visible', 'uv'];
      bandKeys.forEach((bk, idx) => {
        const b = LIGHT_BANDS[bk];
        const bx = 34 + idx * 144;
        const by = 434;
        drawRoundedRect(ctx, bx, by, 134, 34, 8);
        ctx.fillStyle = state.mode === bk ? b.color : 'rgba(51, 65, 85, 0.65)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.name.split(' ')[0] + ' (' + b.wavelength + ')', bx + 67, by + 21);
      });

      const molKeys = Object.keys(LIGHT_MOLECULES);
      molKeys.forEach((mk, idx) => {
        const bx = 34 + idx * 81;
        const by = 478;
        drawRoundedRect(ctx, bx, by, 74, 32, 7);
        ctx.fillStyle = state.targetMol === mk ? '#0284c7' : '#1e293b';
        ctx.fill();
        ctx.strokeStyle = state.targetMol === mk ? '#38bdf8' : '#475569';
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mk, bx + 37, by + 20);
      });

      // Right Absorption Selection Rule Matrix Panel
      drawRoundedRect(ctx, 628, 20, 254, 500, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('光谱吸收选律矩阵', 644, 48);

      bandKeys.forEach((bk, idx) => {
        const b = LIGHT_BANDS[bk];
        const active = doesMoleculeAbsorb(molKey, bk);
        const y0 = 68 + idx * 82;
        drawRoundedRect(ctx, 642, y0, 226, 70, 8);
        ctx.fillStyle = active ? 'rgba(22, 101, 52, 0.35)' : 'rgba(30, 41, 59, 0.75)';
        ctx.fill();
        ctx.strokeStyle = active ? '#22c55e' : 'rgba(148, 163, 184, 0.2)';
        ctx.stroke();

        ctx.fillStyle = b.color;
        ctx.font = 'bold 13px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(b.name, 654, y0 + 22);
        ctx.fillStyle = active ? '#4ade80' : '#94a3b8';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(active ? '✓ 吸收并激发响应' : '✗ 透明穿过 (不吸收)', 654, y0 + 42);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(b.mechanism.slice(0, 20), 654, y0 + 58);
      });

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(molInfo.formula, 644, 418);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      const desc = molInfo.desc;
      ctx.fillText(desc.slice(0, 19), 644, 440);
      ctx.fillText(desc.slice(19, 38), 644, 458);
      ctx.fillText(desc.slice(38), 644, 476);

      ctx.restore();
    },
    getReadouts(state) {
      const molKey = state.targetMol || 'H2O';
      const bandKey = state.mode || 'infrared';
      const absorbs = doesMoleculeAbsorb(molKey, bandKey);
      return [
        { label: '当前光源波段', name: '当前光源波段', value: (LIGHT_BANDS[bandKey] || LIGHT_BANDS.infrared).name, unit: '' },
        { label: '受照分子', name: '受照分子', value: (LIGHT_MOLECULES[molKey] || LIGHT_MOLECULES.H2O).formula, unit: '' },
        { label: '吸收选律响应', name: '吸收选律响应', value: absorbs ? '选择性吸收' : '透明不吸收', unit: '' },
        {
          label: '微观动力学效应',
          name: '微观动力学效应',
          value: !absorbs
            ? '无激发'
            : bandKey === 'microwave'
            ? '纯转动激发'
            : bandKey === 'infrared'
            ? '化学键振动'
            : bandKey === 'visible'
            ? '电子激发发光'
            : '紫外光解离断键',
          unit: ''
        }
      ];
    },
    onPointerDown(x, y, state) {
      const bandKeys = ['microwave', 'infrared', 'visible', 'uv'];
      for (let i = 0; i < bandKeys.length; i++) {
        const bx = 34 + i * 144;
        if (x >= bx && x <= bx + 134 && y >= 434 && y <= 468) {
          state.mode = bandKeys[i];
          return;
        }
      }
      const molKeys = Object.keys(LIGHT_MOLECULES);
      for (let i = 0; i < molKeys.length; i++) {
        const bx = 34 + i * 81;
        if (x >= bx && x <= bx + 74 && y >= 478 && y <= 510) {
          state.targetMol = molKeys[i];
          state.dissociated = false;
          state.dissocDist = 0;
          return;
        }
      }
    },
    onPointerMove() {},
    onPointerUp() {}
  });

  // ============================================================================
  // 7. 'double-wells-and-covalent-bonds' (双势阱与共价键 - 量子力学成键/反键轨道)
  // ============================================================================
  function computeDoubleWellQuantum(R, V0, wellWidth) {
    // R: internuclear distance (1.0 .. 5.0 Å), V0: well depth (10 .. 50 eV), a: well width
    // Overlap integral S(R) and resonance/tunneling splitting DeltaE(R)
    const alpha = Math.sqrt(V0 / 15.0);
    const gap = Math.max(0, R - wellWidth);
    const S = Math.exp(-alpha * gap * 0.85);
    const E0 = -V0 * 0.62; // Isolated single-well bound state energy
    const J = V0 * 0.32 * Math.exp(-alpha * gap * 0.92); // Tunneling / exchange integral
    const coreRepulsion = 18.0 * Math.exp(-R * 1.45); // Nuclear-nuclear + Pauli core repulsion at short R

    const E_plus = E0 - J / (1 + S) + coreRepulsion; // Symmetric bonding state sigma (ψ_+)
    const E_minus = Math.min(-0.4, E0 + J / Math.max(0.22, 1 - S * 0.75) + coreRepulsion); // Antisymmetric antibonding state sigma* (ψ_-)
    const deltaE = E_minus - E_plus;
    return { E0, E_plus, E_minus, deltaE, S };
  }

  function evalAtomicOrbital(x, center, width, V0, wellType) {
    const dx = x - center;
    const sigma = width * (wellType === 'coulomb' ? 0.58 : 0.64) * Math.pow(30 / V0, 0.18);
    if (wellType === 'coulomb') {
      // Slater 1s-like cusp smoothed slightly
      return Math.exp(-Math.sqrt(dx * dx + 0.04) / sigma);
    }
    // Finite square well ground state (cosine inside, exponential tail outside)
    return Math.exp(-(dx * dx) / (2 * sigma * sigma));
  }

  register('double-wells-and-covalent-bonds', {
    modes: [
      { id: 'square', value: 'square', label: '双有限方势阱模型', name: '双有限方势阱模型' },
      { id: 'coulomb', value: 'coulomb', label: '双原子核库仑势阱 (H₂⁺ 共价键)', name: '双原子核库仑势阱 (H₂⁺ 共价键)' }
    ],
    controls: [
      {
        id: 'separation',
        key: 'separation',
        name: 'separation',
        type: 'range',
        label: '核间距 / 势阱中心距 R',
        min: 1.0,
        max: 4.8,
        step: 0.05,
        default: 2.1,
        value: 2.1,
        unit: 'Å'
      },
      {
        id: 'wellDepth',
        key: 'wellDepth',
        name: 'wellDepth',
        type: 'range',
        label: '势阱深度 V₀',
        min: 15,
        max: 45,
        step: 1,
        default: 30,
        value: 30,
        unit: 'eV'
      },
      {
        id: 'wellWidth',
        key: 'wellWidth',
        name: 'wellWidth',
        type: 'range',
        label: '单势阱宽度 a',
        min: 0.6,
        max: 1.6,
        step: 0.05,
        default: 1.0,
        value: 1.0,
        unit: 'Å'
      },
      {
        id: 'quantumState',
        key: 'quantumState',
        name: 'quantumState',
        type: 'select',
        label: '量子本征态显示',
        default: 'both',
        value: 'both',
        options: [
          { id: 'both', value: 'both', label: '同时显示成键态 ψ₊(σ) 与反键态 ψ₋(σ*)', name: '同时显示成键与反键态' },
          { id: 'bonding', value: 'bonding', label: '仅基态：对称成键轨道 ψ₊ (核间电子云增强)', name: '对称成键轨道 ψ₊' },
          { id: 'antibonding', value: 'antibonding', label: '仅激发态：反对称反键轨道 ψ₋ (核间节面)', name: '反对称反键轨道 ψ₋' },
          { id: 'superposition', value: 'superposition', label: '相干叠加态 (电子在双势阱间量子隧穿振荡)', name: '量子隧穿叠加态' }
        ]
      },
      {
        id: 'showDensity',
        key: 'showDensity',
        name: 'showDensity',
        type: 'checkbox',
        label: '显示概率密度 |ψ(x)|² 填充阴影',
        default: true,
        value: true
      }
    ],
    defaultState: {
      mode: 'square',
      separation: 2.1,
      wellDepth: 30,
      wellWidth: 1.0,
      quantumState: 'both',
      showDensity: true,
      phase: 0,
      draggingWell: false
    },
    init(state) {
      state._initialized = true;
      state.phase = 0;
    },
    update(dt, state) {
      if (!state._initialized) this.init(state);
      const R = Number(state.separation) || 2.1;
      const V0 = Number(state.wellDepth) || 30;
      const a = Number(state.wellWidth) || 1.0;
      const { deltaE } = computeDoubleWellQuantum(R, V0, a);
      state.phase = (state.phase || 0) + dt * deltaE * 0.45;
    },
    render(ctx, width, height, state) {
      if (!state._initialized) this.init(state);
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const R = Number(state.separation) || 2.1;
      const V0 = Number(state.wellDepth) || 30;
      const a = Number(state.wellWidth) || 1.0;
      const wellType = state.mode || 'square';
      const qm = computeDoubleWellQuantum(R, V0, a);

      // Left Panel: Double Well Potential V(x) & Wavefunctions ψ_+(x), ψ_-(x)
      const lx = 20,
        ly = 20,
        lw = 540,
        lh = 500;
      drawRoundedRect(ctx, lx, ly, lw, lh, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      const midX = lx + lw / 2;
      const topZeroY = ly + 90; // E = 0 level
      const eToY = (E) => topZeroY - E * 7.8; // E is negative (-50..0 eV)
      const xToPx = (xVal) => midX + xVal * 62; // x in [-4, 4] Å

      // Draw V = 0 reference line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lx + 24, topZeroY);
      ctx.lineTo(lx + lw - 24, topZeroY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('E = 0 eV (连续谱阈值)', lx + 30, topZeroY - 6);

      // Draw Potential Profile V(x)
      const xL = -R / 2;
      const xR = R / 2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let xv = -4.0; xv <= 4.0; xv += 0.03) {
        let Vval = 0;
        if (wellType === 'square') {
          const inLeft = Math.abs(xv - xL) <= a / 2;
          const inRight = Math.abs(xv - xR) <= a / 2;
          Vval = inLeft || inRight ? -V0 : 0;
        } else {
          const r1 = Math.sqrt((xv - xL) * (xv - xL) + 0.14);
          const r2 = Math.sqrt((xv - xR) * (xv - xR) + 0.14);
          Vval = clamp(-(V0 * 0.22) * (1 / r1 + 1 / r2), -V0 * 1.15, 0);
        }
        const px = xToPx(xv);
        const py = eToY(Vval);
        if (xv === -4.0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Helper to draw an eigenstate (baseline at E_level, wavefunction + |ψ|^2)
      const drawEigenstate = (E_val, sign, color, label, yWaveScale) => {
        const baseY = clamp(eToY(E_val), topZeroY + 18, ly + lh - 40);
        ctx.strokeStyle = color;
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx + 30, baseY);
        ctx.lineTo(lx + lw - 30, baseY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = color;
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${E_val.toFixed(2)} eV`, lx + 34, baseY - 6);

        // Compute normalized ψ(x)
        const pts = [];
        let maxAbs = 0.001;
        for (let xv = -3.9; xv <= 3.9; xv += 0.04) {
          const phiL = evalAtomicOrbital(xv, xL, a, V0, wellType);
          const phiR = evalAtomicOrbital(xv, xR, a, V0, wellType);
          let psi = 0;
          if (sign === 'superposition') {
            const cPlus = (phiL + phiR) / Math.sqrt(2 * (1 + qm.S));
            const cMinus = (phiL - phiR) / Math.sqrt(2 * Math.max(0.2, 1 - qm.S));
            // Real part of time-evolving superposition: ψ(x,t) ∝ ψ_+ + ψ_- cos(ΔE t / ħ)
            psi = 0.707 * (cPlus + cMinus * Math.cos(state.phase));
          } else {
            psi = phiL + sign * phiR;
          }
          maxAbs = Math.max(maxAbs, Math.abs(psi));
          pts.push({ xv, psi });
        }

        if (state.showDensity) {
          ctx.fillStyle = color + '33';
          ctx.beginPath();
          ctx.moveTo(xToPx(pts[0].xv), baseY);
          for (const p of pts) {
            const normPsi = p.psi / maxAbs;
            ctx.lineTo(xToPx(p.xv), baseY - normPsi * normPsi * yWaveScale * 0.85);
          }
          ctx.lineTo(xToPx(pts[pts.length - 1].xv), baseY);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        pts.forEach((p, idx) => {
          const normPsi = p.psi / maxAbs;
          const px = xToPx(p.xv);
          const py = baseY - normPsi * yWaveScale;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Mark nodal plane at x=0 for antibonding state
        if (sign === -1) {
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(midX, baseY, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('节面 (ψ₋=0)', midX, baseY + 16);
        }
      };

      if (state.quantumState === 'both' || state.quantumState === 'bonding') {
        drawEigenstate(qm.E_plus, +1, '#4ade80', '成键态 ψ₊ (σ 基态)', 36);
      }
      if (state.quantumState === 'both' || state.quantumState === 'antibonding') {
        drawEigenstate(qm.E_minus, -1, '#f43f5e', '反键态 ψ₋ (σ* 激发态)', 36);
      }
      if (state.quantumState === 'superposition') {
        drawEigenstate(0.5 * (qm.E_plus + qm.E_minus), 'superposition', '#38bdf8', '量子隧穿相干叠加态 |Ψ(x,t)|²', 44);
      }

      // Draw draggable nuclei handles at bottom of Left Panel
      const nucY = ly + lh - 22;
      drawSphere(ctx, xToPx(xL), nucY, 12, '#38bdf8', 'A');
      drawSphere(ctx, xToPx(xR), nucY, 12, '#38bdf8', 'B');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⇄ 拖拽原子核调节间距 R = ${R.toFixed(2)} Å`, midX, nucY - 16);

      // Right Panel: Energy Splitting Diagram E_±(R) vs Internuclear Distance R
      const rx = 576,
        ry = 20,
        rw = 304,
        rh = 500;
      drawRoundedRect(ctx, rx, ry, rw, rh, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('成键/反键能级分裂曲线 E±(R)', rx + 18, ry + 34);

      // Plot E_plus(R) and E_minus(R)
      const plotX = rx + 26,
        plotY = ry + 56,
        plotW = rw - 44,
        plotH = 225;
      drawRoundedRect(ctx, plotX, plotY, plotW, plotH, 8);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.fill();

      const rToPlotX = (rVal) => plotX + ((rVal - 0.8) / 4.2) * plotW;
      const eToPlotY = (eVal) => clamp(plotY + 35 - (eVal - qm.E0) * 6.5, plotY + 8, plotY + plotH - 8);

      // Isolated E0 reference line
      const e0PlotY = eToPlotY(qm.E0);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX, e0PlotY);
      ctx.lineTo(plotX + plotW, e0PlotY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('孤立能级 E₀', plotX + plotW - 6, e0PlotY - 5);

      // Draw E_+(R) curve (green) and E_-(R) curve (red)
      for (const [isMinus, col] of [
        [false, '#4ade80'],
        [true, '#f43f5e']
      ]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let rv = 0.9; rv <= 4.8; rv += 0.05) {
          const res = computeDoubleWellQuantum(rv, V0, a);
          const px = rToPlotX(rv);
          const py = eToPlotY(isMinus ? res.E_minus : res.E_plus);
          if (rv === 0.9) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Mark current R on splitting plot
      const curPlotX = rToPlotX(R);
      const curPlusY = eToPlotY(qm.E_plus);
      const curMinusY = eToPlotY(qm.E_minus);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      ctx.beginPath();
      ctx.moveTo(curPlotX, curMinusY);
      ctx.lineTo(curPlotX, curPlusY);
      ctx.stroke();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(curPlotX, curPlusY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(curPlotX, curMinusY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Readout Summary Cards on Right Panel
      const stats = [
        ['成键态能量 E₊ (σ)', `${qm.E_plus.toFixed(2)} eV (核间相长干涉)`],
        ['反键态能量 E₋ (σ*)', `${qm.E_minus.toFixed(2)} eV (核间节面相消)`],
        ['能级分裂 ΔE = E₋ − E₊', `${qm.deltaE.toFixed(2)} eV (重叠积分 S=${qm.S.toFixed(2)})`]
      ];
      stats.forEach(([k, v], i) => {
        const cy0 = ry + 298 + i * 62;
        drawRoundedRect(ctx, plotX, cy0, plotW, 52, 8);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(k, plotX + 12, cy0 + 19);
        ctx.fillStyle = i === 0 ? '#4ade80' : i === 1 ? '#f43f5e' : '#facc15';
        ctx.font = 'bold 12px system-ui, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(v, plotX + 12, cy0 + 39);
      });

      ctx.restore();
    },
    getReadouts(state) {
      const R = Number(state.separation) || 2.1;
      const V0 = Number(state.wellDepth) || 30;
      const a = Number(state.wellWidth) || 1.0;
      const qm = computeDoubleWellQuantum(R, V0, a);
      return [
        { label: '势阱间距 R', name: '势阱间距 R', value: R.toFixed(2), unit: 'Å' },
        { label: '成键基态 E₊(σ)', name: '成键基态 E₊(σ)', value: qm.E_plus.toFixed(2), unit: 'eV' },
        { label: '反键激发态 E₋(σ*)', name: '反键激发态 E₋(σ*)', value: qm.E_minus.toFixed(2), unit: 'eV' },
        { label: '能级分裂 ΔE', name: '能级分裂 ΔE', value: qm.deltaE.toFixed(2), unit: 'eV' }
      ];
    },
    onPointerDown(x, y, state) {
      if (x < 560) {
        state.draggingWell = true;
        const distFromMid = Math.abs(x - 290) / 62;
        state.separation = clamp(distFromMid * 2, 1.0, 4.8);
      } else if (x >= 602 && x <= 862 && y >= 76 && y <= 301) {
        state.draggingWell = true;
        state.separation = clamp(0.8 + ((x - 602) / 260) * 4.2, 1.0, 4.8);
      }
    },
    onPointerMove(x, y, state) {
      if (!state.draggingWell) return;
      if (x < 560) {
        const distFromMid = Math.abs(x - 290) / 62;
        state.separation = clamp(distFromMid * 2, 1.0, 4.8);
      } else {
        state.separation = clamp(0.8 + ((x - 602) / 260) * 4.2, 1.0, 4.8);
      }
    },
    onPointerUp(x, y, state) {
      state.draggingWell = false;
    }
  });
})();
