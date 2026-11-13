/**
 * PhET Chemistry HTML5 Simulations - Group 6: Quantum Chemistry & Solid-State Band Structure
 * Complete Interactive Implementation of 7 Simulations:
 * 1. 'quantum-wave-interference' (量子波干涉)
 * 2. 'quantum-coin-toss' (量子抛硬币)
 * 3. 'quantum-measurement' (量子测量：布洛赫球与多级施特恩-格拉赫实验)
 * 4. 'particle-in-a-box' (箱中粒子 / 一维无限深势阱)
 * 5. 'quantum-bound-states' (量子束缚态：有限深方势阱、量子谐振子、非对称库仑势)
 * 6. 'bound-state-superposition' (束缚态含时叠加与波包振荡)
 * 7. 'band-structure' (固体能带结构：Kronig-Penney 周期势与能级分裂演化)
 *
 * Logical Canvas Resolution: width = 900, height = 540
 */

(function () {
  'use strict';

  window.SIM_REGISTRY = window.SIM_REGISTRY || {};
  if (typeof window.registerSim !== 'function') {
    window.registerSim = function (id, config) {
      window.SIM_REGISTRY[id] = config;
    };
  }

  // ============================================================================
  // Shared Utilities & UI Helpers (Canvas 900 x 540)
  // ============================================================================
  const W = 900;
  const H = 540;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function sinc(x) {
    if (Math.abs(x) < 1e-6) return 1.0 - (x * x) / 6.0;
    return Math.sin(x) / x;
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

  function drawPanel(ctx, x, y, w, h, title, subtitle) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.stroke();

    if (title) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x + 14, y + 10);
    }
    if (subtitle) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11.5px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(subtitle, x + w - 14, y + 12);
    }
    ctx.restore();
  }

  function drawBadge(ctx, x, y, text, bgColor, textColor) {
    ctx.save();
    ctx.font = 'bold 11px "Inter", "PingFang SC", sans-serif';
    const padX = 8;
    const tw = ctx.measureText(text).width + padX * 2;
    roundRect(ctx, x, y, tw, 20, 5);
    ctx.fillStyle = bgColor || 'rgba(56, 189, 248, 0.18)';
    ctx.fill();
    ctx.strokeStyle = textColor || '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = textColor || '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tw / 2, y + 10);
    ctx.restore();
    return tw;
  }

  // Interactive Canvas UI Manager for standalone & engine-integrated controls
  function createUIManager() {
    return {
      buttons: [],
      sliders: [],
      activeSlider: null,
      clear() {
        this.buttons.length = 0;
        this.sliders.length = 0;
      },
      addButton(id, x, y, w, h, label, onClick, opts) {
        this.buttons.push({ id, x, y, w, h, label, onClick, opts: opts || {} });
      },
      addSlider(id, x, y, w, label, value, min, max, step, onChange, formatFn) {
        this.sliders.push({ id, x, y, w, label, value, min, max, step, onChange, formatFn });
      },
      render(ctx) {
        ctx.save();
        for (const b of this.buttons) {
          const active = b.opts.active;
          const accent = b.opts.color || '#38bdf8';
          roundRect(ctx, b.x, b.y, b.w, b.h, 6);
          ctx.fillStyle = active ? accent : (b.opts.bg || 'rgba(30, 41, 59, 0.92)');
          ctx.fill();
          ctx.lineWidth = active ? 1.8 : 1;
          ctx.strokeStyle = active ? '#ffffff' : accent;
          ctx.stroke();
          ctx.fillStyle = active ? '#0f172a' : '#f1f5f9';
          ctx.font = (b.opts.fontSize || 12) + 'px "Inter", "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
        }

        for (const s of this.sliders) {
          const ratio = clamp((s.value - s.min) / (s.max - s.min || 1), 0, 1);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(s.label, s.x, s.y - 4);

          const valStr = s.formatFn ? s.formatFn(s.value) : String(s.value);
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'right';
          ctx.fillText(valStr, s.x + s.w, s.y - 4);

          // Track
          roundRect(ctx, s.x, s.y, s.w, 6, 3);
          ctx.fillStyle = 'rgba(51, 65, 85, 0.9)';
          ctx.fill();

          // Filled track
          if (ratio > 0) {
            roundRect(ctx, s.x, s.y, Math.max(6, s.w * ratio), 6, 3);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
          }

          // Knob
          const kx = s.x + s.w * ratio;
          const ky = s.y + 3;
          ctx.beginPath();
          ctx.arc(kx, ky, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#0284c7';
          ctx.stroke();
        }
        ctx.restore();
      },
      handlePointerDown(x, y) {
        for (const b of this.buttons) {
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            if (b.onClick) b.onClick();
            return true;
          }
        }
        for (const s of this.sliders) {
          if (x >= s.x - 8 && x <= s.x + s.w + 8 && y >= s.y - 12 && y <= s.y + 18) {
            this.activeSlider = s;
            this.updateSlider(s, x);
            return true;
          }
        }
        return false;
      },
      handlePointerMove(x, y) {
        if (this.activeSlider) {
          this.updateSlider(this.activeSlider, x);
          return true;
        }
        return false;
      },
      handlePointerUp() {
        this.activeSlider = null;
      },
      updateSlider(s, x) {
        const ratio = clamp((x - s.x) / (s.w || 1), 0, 1);
        let raw = s.min + ratio * (s.max - s.min);
        if (s.step) {
          raw = Math.round(raw / s.step) * s.step;
          const decimals = (String(s.step).split('.')[1] || '').length;
          raw = Number(raw.toFixed(decimals));
        }
        raw = clamp(raw, s.min, s.max);
        s.value = raw;
        if (s.onChange) s.onChange(raw);
      }
    };
  }

  function wavelengthToRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) {
      r = -(nm - 440) / (440 - 380); g = 0; b = 1;
    } else if (nm >= 440 && nm < 490) {
      r = 0; g = (nm - 440) / (490 - 440); b = 1;
    } else if (nm >= 490 && nm < 510) {
      r = 0; g = 1; b = -(nm - 510) / (510 - 490);
    } else if (nm >= 510 && nm < 580) {
      r = (nm - 510) / (580 - 510); g = 1; b = 0;
    } else if (nm >= 580 && nm < 645) {
      r = 1; g = -(nm - 645) / (645 - 580); b = 0;
    } else if (nm >= 645 && nm <= 750) {
      r = 1; g = 0; b = 0;
    } else {
      r = 0.35; g = 0.78; b = 1.0;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // ============================================================================
  // 1. 'quantum-wave-interference' (量子波干涉)
  // ============================================================================
  const PARTICLE_SPECS = {
    photon: {
      id: 'photon',
      name: '光子 (Photon)',
      unit: 'nm',
      lambdaMin: 380,
      lambdaMax: 700,
      lambdaDefault: 520,
      dScale: 1600, // nm
      aScale: 400,  // nm
      L: 2500,      // effective screen distance scale
      colorFn: (val) => wavelengthToRGB(val),
      speedText: (val) => `c = 3.00 × 10⁸ m/s (λ = ${val.toFixed(0)} nm)`
    },
    electron: {
      id: 'electron',
      name: '电子 (Electron)',
      unit: 'km/s',
      lambdaMin: 200,
      lambdaMax: 800,
      lambdaDefault: 450,
      dScale: 1600,
      aScale: 400,
      L: 2500,
      colorFn: () => [56, 189, 248],
      speedText: (val) => {
        const v = (1200 * (500 / val)).toFixed(0);
        const deBroglie = (val / 1000).toFixed(2);
        return `v ≈ ${v} km/s (λ_dB ≈ ${deBroglie} nm)`;
      }
    },
    neutron: {
      id: 'neutron',
      name: '中子 (Neutron)',
      unit: 'm/s',
      lambdaMin: 220,
      lambdaMax: 750,
      lambdaDefault: 460,
      dScale: 1600,
      aScale: 400,
      L: 2500,
      colorFn: () => [168, 85, 247],
      speedText: (val) => {
        const v = (2200 * (450 / val)).toFixed(0);
        const deBroglie = (val / 2500).toFixed(2);
        return `v ≈ ${v} m/s (λ_dB ≈ ${deBroglie} Å)`;
      }
    },
    helium: {
      id: 'helium',
      name: '氦原子 (Helium Atom)',
      unit: 'm/s',
      lambdaMin: 250,
      lambdaMax: 700,
      lambdaDefault: 440,
      dScale: 1600,
      aScale: 400,
      L: 2500,
      colorFn: () => [52, 211, 153],
      speedText: (val) => {
        const v = (1050 * (440 / val)).toFixed(0);
        const deBroglie = (val / 4500).toFixed(2);
        return `v ≈ ${v} m/s (λ_dB ≈ ${deBroglie} Å)`;
      }
    }
  };

  function createQuantumWaveInterference() {
    const ui = createUIManager();
    const state = {
      particle: 'photon',
      wavelength: 520,   // effective wavelength parameter (250 ~ 700)
      slitSep: 1.5,      // d (0.6 ~ 3.0)
      slitWidth: 0.35,   // a (0.1 ~ 1.0)
      whichWay: 'none',  // 'none', 'left', 'right', 'both'
      gunMode: 'continuous', // 'continuous' or 'single'
      emitRate: 8,       // hits per frame in continuous mode
      time: 0,
      hits: [],          // { x, y, alpha } on screen
      bins: new Array(180).fill(0),
      totalHits: 0,
      wavePackets: []    // active single-particle wave packets
    };

    function computeIntensityAtY(yNorm, modeOverride) {
      // yNorm in [-1, 1]
      const lam = state.wavelength / 500; // normalized ~ 0.5 - 1.4
      const d = state.slitSep * 2.2;
      const a = state.slitWidth * 2.2;
      const mode = modeOverride !== undefined ? modeOverride : state.whichWay;

      if (mode === 'none') {
        // Coherent double-slit interference: cos^2(pi d y / lam) * sinc^2(pi a y / lam)
        const beta = (Math.PI * a * yNorm) / lam;
        const delta = (Math.PI * d * yNorm) / lam;
        const env = Math.pow(sinc(beta), 2);
        const interf = Math.pow(Math.cos(delta), 2);
        return env * interf;
      } else {
        // Which-way detector collapses interference -> incoherent sum of two single-slit envelopes
        const shift = state.slitSep * 0.14;
        const beta1 = (Math.PI * a * (yNorm - shift)) / lam;
        const beta2 = (Math.PI * a * (yNorm + shift)) / lam;
        return 0.5 * (Math.pow(sinc(beta1), 2) + Math.pow(sinc(beta2), 2));
      }
    }

    function sampleScreenHit() {
      // Rejection sampling on yNorm in [-1, 1]
      for (let iter = 0; iter < 50; iter++) {
        const yNorm = (Math.random() * 2 - 1);
        const prob = computeIntensityAtY(yNorm);
        if (Math.random() <= prob) {
          const screenH = 340;
          const sy = 95 + (yNorm * 0.5 + 0.5) * screenH;
          const sx = 545 + (Math.random() - 0.5) * 34;
          state.hits.push({ x: sx, y: sy, age: 0 });
          if (state.hits.length > 1800) state.hits.shift();
          const binIdx = clamp(Math.floor((yNorm * 0.5 + 0.5) * state.bins.length), 0, state.bins.length - 1);
          state.bins[binIdx]++;
          state.totalHits++;
          break;
        }
      }
    }

    function clearScreen() {
      state.hits.length = 0;
      state.bins.fill(0);
      state.totalHits = 0;
    }

    function fireSingleParticle() {
      state.wavePackets.push({ x: 65, progress: 0 });
    }

    function syncParamsFromExternal(params) {
      if (!params) return;
      if (params.particle && PARTICLE_SPECS[params.particle] && params.particle !== state.particle) {
        state.particle = params.particle;
        clearScreen();
      }
      if (typeof params.wavelength === 'number') state.wavelength = params.wavelength;
      if (typeof params.slitSep === 'number') state.slitSep = params.slitSep;
      if (typeof params.slitWidth === 'number') state.slitWidth = params.slitWidth;
      if (params.whichWay !== undefined) {
        state.whichWay = params.whichWay ? (typeof params.whichWay === 'string' ? params.whichWay : 'left') : 'none';
      }
    }

    function rebuildUI() {
      ui.clear();
      const px = 670, py = 50, pw = 210;

      // Particle selector buttons (2x2 grid)
      const pKeys = ['photon', 'electron', 'neutron', 'helium'];
      const pLabels = ['光子 Photon', '电子 Electron', '中子 Neutron', '氦原子 He'];
      pKeys.forEach((k, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        ui.addButton('p_' + k, px + col * 104, py + 32 + row * 28, 100, 24, pLabels[idx], () => {
          state.particle = k;
          clearScreen();
        }, { active: state.particle === k, fontSize: 11 });
      });

      // Sliders
      ui.addSlider('wavelength', px, py + 114, pw, '波长 / 动量参数 λ', state.wavelength, 260, 700, 5, (v) => {
        state.wavelength = v;
        clearScreen();
      }, (v) => `${v} nm`);

      ui.addSlider('slitSep', px, py + 162, pw, '双缝间距 d', state.slitSep, 0.6, 3.0, 0.1, (v) => {
        state.slitSep = v;
        clearScreen();
      }, (v) => `${v.toFixed(1)} μm`);

      ui.addSlider('slitWidth', px, py + 210, pw, '单缝宽度 a', state.slitWidth, 0.10, 0.90, 0.05, (v) => {
        state.slitWidth = v;
        clearScreen();
      }, (v) => `${v.toFixed(2)} μm`);

      // Which-Way Detector toggle buttons
      const wwModes = [
        { k: 'none', label: '关闭探测器 (相干干涉)' },
        { k: 'left', label: '左缝探测器 (路径坍缩)' },
        { k: 'right', label: '右缝探测器 (路径坍缩)' }
      ];
      wwModes.forEach((m, i) => {
        ui.addButton('ww_' + m.k, px, py + 258 + i * 28, pw, 24, m.label, () => {
          state.whichWay = m.k;
          clearScreen();
        }, {
          active: state.whichWay === m.k,
          color: m.k === 'none' ? '#38bdf8' : '#f59e0b',
          fontSize: 11.5
        });
      });

      // Emission controls
      ui.addButton('mode_cont', px, py + 356, 102, 26, '连续粒子束', () => {
        state.gunMode = 'continuous';
      }, { active: state.gunMode === 'continuous', color: '#10b981', fontSize: 11.5 });

      ui.addButton('mode_single', px + 108, py + 356, 102, 26, '发射单粒子', () => {
        state.gunMode = 'single';
        fireSingleParticle();
      }, { active: state.gunMode === 'single', color: '#38bdf8', fontSize: 11.5 });

      ui.addButton('clear_screen', px, py + 390, pw, 26, '清空荧光屏累积亮点', () => {
        clearScreen();
      }, { color: '#f43f5e', fontSize: 11.5 });
    }

    function update(dt, params) {
      syncParamsFromExternal(params);
      state.time += dt || 0.016;

      if (state.gunMode === 'continuous') {
        for (let i = 0; i < state.emitRate; i++) {
          sampleScreenHit();
        }
      }

      for (let i = state.wavePackets.length - 1; i >= 0; i--) {
        const wp = state.wavePackets[i];
        wp.x += 240 * (dt || 0.016);
        if (wp.x >= 430) {
          sampleScreenHit();
          state.wavePackets.splice(i, 1);
        }
      }
    }

    function render(ctx, params) {
      syncParamsFromExternal(params);
      rebuildUI();

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      const spec = PARTICLE_SPECS[state.particle] || PARTICLE_SPECS.photon;
      const rgb = spec.colorFn(state.wavelength);

      // Header Banner
      drawPanel(ctx, 14, 10, 872, 34, '量子波干涉 (Quantum Wave Interference) — 双缝干涉与路径探测坍缩', spec.speedText(state.wavelength));

      // Left Wave Chamber Panel
      const wx = 14, wy = 50, ww = 430, wh = 415;
      drawPanel(ctx, wx, wy, ww, wh, '二维量子波包演化腔 (2D Wavefunction Propagation)', state.whichWay === 'none' ? '相干叠加态 ψ₁ + ψ₂' : '路径探测态 |ψ₁|² + |ψ₂|²');

      // Wave field rendering area
      const fx = wx + 52, fy = wy + 36, fw = 364, fh = 340;
      const barrierX = fx + Math.floor(fw * 0.36);
      const slitGapPx = clamp(state.slitSep * 42, 24, 130);
      const slitWidthPx = clamp(state.slitWidth * 36, 6, 34);
      const cy = fy + fh / 2;
      const slit1Y = cy - slitGapPx / 2;
      const slit2Y = cy + slitGapPx / 2;

      // Render 2D wave interference pattern on grid
      const step = 4;
      const kWave = (2 * Math.PI) / clamp(state.wavelength * 0.055, 12, 38);
      const omega = state.time * 9.0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(fx, fy, fw, fh);
      ctx.clip();

      ctx.fillStyle = '#04070e';
      ctx.fillRect(fx, fy, fw, fh);

      for (let gx = fx; gx < fx + fw; gx += step) {
        for (let gy = fy; gy < fy + fh; gy += step) {
          let amp = 0;
          if (gx < barrierX) {
            // Incident plane wave / wave packet
            const envY = Math.exp(-Math.pow((gy - cy) / 115, 2));
            if (state.gunMode === 'continuous') {
              amp = 0.5 + 0.5 * Math.cos(kWave * (gx - fx) - omega) * envY;
            } else {
              for (const wp of state.wavePackets) {
                const wpx = fx + (wp.x - 65);
                const dist2 = Math.pow(gx - wpx, 2) + Math.pow(gy - cy, 2) * 0.3;
                amp += Math.exp(-dist2 / 900) * (0.5 + 0.5 * Math.cos(kWave * (gx - wpx) - omega));
              }
            }
          } else {
            // Post-slit cylindrical Huygens wavelets from slit 1 and slit 2
            const dx = gx - barrierX;
            const r1 = Math.sqrt(dx * dx + Math.pow(gy - slit1Y, 2));
            const r2 = Math.sqrt(dx * dx + Math.pow(gy - slit2Y, 2));
            const sinTheta1 = (gy - slit1Y) / (r1 + 1);
            const sinTheta2 = (gy - slit2Y) / (r2 + 1);
            const diffEnv1 = sinc((Math.PI * state.slitWidth * 2.2 * sinTheta1) / (state.wavelength / 500));
            const diffEnv2 = sinc((Math.PI * state.slitWidth * 2.2 * sinTheta2) / (state.wavelength / 500));
            const atten = Math.min(1, 16 / Math.sqrt(dx + 12));

            if (state.gunMode === 'continuous') {
              if (state.whichWay === 'none') {
                const w1 = diffEnv1 * Math.cos(kWave * r1 - omega);
                const w2 = diffEnv2 * Math.cos(kWave * r2 - omega);
                const sum = (w1 + w2) * 0.5 * atten;
                amp = clamp(0.5 + sum * 0.65, 0, 1);
              } else {
                // Incoherent sum when path is measured
                const i1 = Math.pow(diffEnv1 * Math.cos(kWave * r1 - omega), 2);
                const i2 = Math.pow(diffEnv2 * Math.cos(kWave * r2 - omega), 2);
                amp = clamp((i1 + i2) * 0.55 * atten, 0, 1);
              }
            } else {
              for (const wp of state.wavePackets) {
                const wpx = fx + (wp.x - 65);
                const rFront = wpx - barrierX;
                if (rFront > 0) {
                  const p1 = Math.exp(-Math.pow(r1 - rFront, 2) / 700) * diffEnv1;
                  const p2 = Math.exp(-Math.pow(r2 - rFront, 2) / 700) * diffEnv2;
                  if (state.whichWay === 'none') {
                    amp += Math.abs(p1 * Math.cos(kWave * r1 - omega) + p2 * Math.cos(kWave * r2 - omega)) * 0.6;
                  } else {
                    amp += Math.sqrt(p1 * p1 + p2 * p2) * 0.6;
                  }
                }
              }
            }
          }

          if (amp > 0.06) {
            ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(amp * 0.88, 0, 0.95).toFixed(2)})`;
            ctx.fillRect(gx, gy, step, step);
          }
        }
      }

      // Draw double-slit barrier wall
      ctx.fillStyle = '#94a3b8';
      const topWallH = Math.max(0, slit1Y - slitWidthPx / 2 - fy);
      ctx.fillRect(barrierX - 3, fy, 6, topWallH);
      const midWallTop = slit1Y + slitWidthPx / 2;
      const midWallH = Math.max(0, (slit2Y - slitWidthPx / 2) - midWallTop);
      ctx.fillRect(barrierX - 3, midWallTop, 6, midWallH);
      const botWallTop = slit2Y + slitWidthPx / 2;
      ctx.fillRect(barrierX - 3, botWallTop, 6, Math.max(0, fy + fh - botWallTop));

      // Draw Which-Way Detector icon if active
      if (state.whichWay !== 'none') {
        const detY = state.whichWay === 'left' ? slit1Y : slit2Y;
        ctx.beginPath();
        ctx.arc(barrierX + 12, detY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('探测', barrierX + 14, detY - 14);
      }

      ctx.restore();

      // Particle gun emitter icon on left
      ctx.save();
      roundRect(ctx, wx + 10, cy - 22, 36, 44, 6);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.strokeStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('粒子源', wx + 28, cy + 4);
      ctx.restore();

      // Middle Panel: Phosphor Detector Screen & Theoretical Intensity Curve
      const sx = 452, sy = 50, sw = 210, sh = 415;
      drawPanel(ctx, sx, sy, sw, sh, '荧光探测屏与概率分布 I(y)', `N = ${state.totalHits}`);

      // Intensity curve area (left half of screen panel)
      const curveBaseX = sx + 16;
      const curveMaxW = 92;
      const screenStripX = sx + 122;
      const screenStripW = 42;
      const screenTopY = sy + 45;
      const screenH = 340;

      // Draw theoretical curve & histogram bins
      const maxBin = Math.max(10, ...state.bins);
      ctx.save();
      for (let b = 0; b < state.bins.length; b++) {
        const by = screenTopY + (b / state.bins.length) * screenH;
        const bw = (state.bins[b] / maxBin) * curveMaxW;
        if (bw > 0.5) {
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.32)`;
          ctx.fillRect(curveBaseX, by, bw, Math.ceil(screenH / state.bins.length));
        }
      }

      // Draw analytical quantum intensity I(y) curve
      ctx.beginPath();
      for (let pyOff = 0; pyOff <= screenH; pyOff += 2) {
        const yNorm = (pyOff / screenH - 0.5) * 2;
        const inten = computeIntensityAtY(yNorm);
        const cx = curveBaseX + inten * curveMaxW;
        const cyPos = screenTopY + pyOff;
        if (pyOff === 0) ctx.moveTo(cx, cyPos);
        else ctx.lineTo(cx, cyPos);
      }
      ctx.strokeStyle = state.whichWay === 'none' ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Phosphor screen strip background
      roundRect(ctx, screenStripX, screenTopY, screenStripW, screenH, 4);
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render individual accumulated quantum hits
      for (const h of state.hits) {
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`;
        ctx.fillRect(h.x, h.y, 2, 2);
      }

      // Labels on screen panel
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('理论曲线 & 统计', curveBaseX + curveMaxW / 2, screenTopY + screenH + 18);
      ctx.fillText('累积亮点', screenStripX + screenStripW / 2, screenTopY + screenH + 18);
      ctx.restore();

      // Right Control Panel
      drawPanel(ctx, 670, 50, 216, 415, '实验参数控制 (Controls)', '');
      ui.render(ctx);

      // Bottom Physics Formula Bar
      drawPanel(ctx, 14, 472, 872, 58, '', '');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        state.whichWay === 'none'
          ? '相干双缝干涉公式：I(y) = I₀ cos²(π d y / λL) · sinc²(π a y / λL)   |   波函数处于双路径相干叠加态 |ψ⟩ = (|ψ₁⟩ + |ψ₂⟩)/√2'
          : '开启 Which-Way 路径探测器：测量导致量子态坍缩，交叉干涉项 2Re(ψ₁*ψ₂) = 0，分布退化为两个单缝衍射包络之和 I(y) = I₁(y) + I₂(y)',
        28, 494
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        `当前粒子：${spec.name}   |   双缝间距 d = ${state.slitSep.toFixed(1)} μm   |   单缝宽 a = ${state.slitWidth.toFixed(2)} μm   |   路径探测：${state.whichWay === 'none' ? '关闭（有干涉条纹）' : '开启（干涉条纹消失）'}`,
        28, 515
      );

      ctx.restore();
    }

    return {
      id: 'quantum-wave-interference',
      title: '量子波干涉 (Quantum Wave Interference)',
      width: W,
      height: H,
      state,
      init() { clearScreen(); },
      reset() {
        state.particle = 'photon';
        state.wavelength = 520;
        state.slitSep = 1.5;
        state.slitWidth = 0.35;
        state.whichWay = 'none';
        state.gunMode = 'continuous';
        clearScreen();
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 2. 'quantum-coin-toss' (量子抛硬币)
  // ============================================================================
  function createQuantumCoinToss() {
    const ui = createUIManager();
    const state = {
      mode: 'quantum',      // 'quantum' or 'classical'
      probUp: 0.50,         // |α|^2 in [0.00, 1.00]
      phaseDeg: 0,          // φ in [0, 360]
      prepBasis: 'Z',       // 'Z' (|↑⟩), 'X' ((|↑⟩+|↓⟩)/√2), 'custom'
      time: 0,
      tossing: false,
      tossTimer: 0,
      lastOutcome: 'up',    // 'up' or 'down'
      quantumCounts: { up: 0, down: 0, total: 0 },
      classicalCounts: { up: 0, down: 0, total: 0 },
      history: []           // last 24 outcomes
    };

    function performToss(count) {
      const n = count || 1;
      for (let i = 0; i < n; i++) {
        // Quantum coin with probability |α|^2
        const qUp = Math.random() < state.probUp;
        if (qUp) state.quantumCounts.up++;
        else state.quantumCounts.down++;
        state.quantumCounts.total++;

        // Classical fair coin (or biased comparison)
        const cUp = Math.random() < 0.5;
        if (cUp) state.classicalCounts.up++;
        else state.classicalCounts.down++;
        state.classicalCounts.total++;

        const outcome = state.mode === 'quantum' ? (qUp ? 'up' : 'down') : (cUp ? 'up' : 'down');
        state.lastOutcome = outcome;
        state.history.push(outcome);
        if (state.history.length > 28) state.history.shift();
      }
      state.tossing = true;
      state.tossTimer = 0.45;
    }

    function resetStats() {
      state.quantumCounts = { up: 0, down: 0, total: 0 };
      state.classicalCounts = { up: 0, down: 0, total: 0 };
      state.history = [];
    }

    function rebuildUI() {
      ui.clear();
      const px = 665, py = 54, pw = 210;

      // Mode buttons
      ui.addButton('m_quantum', px, py + 28, 102, 26, '量子硬币 |ψ⟩', () => {
        state.mode = 'quantum';
      }, { active: state.mode === 'quantum', color: '#38bdf8' });

      ui.addButton('m_classical', px + 108, py + 28, 102, 26, '经典硬币 50/50', () => {
        state.mode = 'classical';
      }, { active: state.mode === 'classical', color: '#f59e0b' });

      // Preparation presets
      ui.addButton('prep_up', px, py + 64, 66, 24, '|↑⟩ (1.0)', () => {
        state.probUp = 1.0;
        state.prepBasis = 'Z+';
      }, { active: Math.abs(state.probUp - 1.0) < 0.01, fontSize: 11 });

      ui.addButton('prep_plus', px + 72, py + 64, 66, 24, '|+⟩ (0.5)', () => {
        state.probUp = 0.5;
        state.phaseDeg = 0;
        state.prepBasis = 'X+';
      }, { active: Math.abs(state.probUp - 0.5) < 0.01, fontSize: 11 });

      ui.addButton('prep_down', px + 144, py + 64, 66, 24, '|↓⟩ (0.0)', () => {
        state.probUp = 0.0;
        state.prepBasis = 'Z-';
      }, { active: Math.abs(state.probUp - 0.0) < 0.01, fontSize: 11 });

      // Sliders for |α|^2 and phase φ
      ui.addSlider('probUp', px, py + 124, pw, '向上概率幅平方 |α|² = cos²(θ/2)', state.probUp, 0.00, 1.00, 0.01, (v) => {
        state.probUp = v;
      }, (v) => v.toFixed(2));

      ui.addSlider('phaseDeg', px, py + 174, pw, '相对量子相位 φ (度)', state.phaseDeg, 0, 360, 5, (v) => {
        state.phaseDeg = v;
      }, (v) => `${v}°`);

      // Action buttons
      ui.addButton('toss_1', px, py + 216, pw, 32, '单次抛掷 / 量子测量 (1 Toss)', () => {
        performToss(1);
      }, { color: '#10b981', active: true, fontSize: 12.5 });

      ui.addButton('toss_100', px, py + 256, pw, 32, '连续抛掷 100 次 (100 Tosses)', () => {
        performToss(100);
      }, { color: '#38bdf8', fontSize: 12.5 });

      ui.addButton('toss_1000', px, py + 296, pw, 28, '快速大样本 1000 次', () => {
        performToss(1000);
      }, { color: '#a855f7', fontSize: 11.5 });

      ui.addButton('reset_stats', px, py + 332, pw, 28, '重置统计数据 (Reset)', () => {
        resetStats();
      }, { color: '#f43f5e', fontSize: 11.5 });
    }

    function update(dt, params) {
      if (params) {
        if (typeof params.probUp === 'number') state.probUp = clamp(params.probUp, 0, 1);
        if (typeof params.phaseDeg === 'number') state.phaseDeg = params.phaseDeg;
        if (params.mode) state.mode = params.mode;
      }
      state.time += dt || 0.016;
      if (state.tossing) {
        state.tossTimer -= dt || 0.016;
        if (state.tossTimer <= 0) state.tossing = false;
      }
    }

    function render(ctx, params) {
      rebuildUI();
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      const alpha = Math.sqrt(state.probUp);
      const beta = Math.sqrt(1 - state.probUp);
      const thetaRad = 2 * Math.acos(clamp(alpha, 0, 1));

      drawPanel(
        ctx, 14, 10, 872, 36,
        '量子抛硬币 (Quantum Coin Toss) — 量子比特叠加态制备与投影测量统计',
        `|ψ⟩ = ${alpha.toFixed(2)}|↑⟩ + e^(i${state.phaseDeg}°)${beta.toFixed(2)}|↓⟩`
      );

      // Left Panel: Quantum Superposition & Coin Collapse Visualization
      drawPanel(ctx, 14, 54, 315, 405, '量子态旋转与坍缩动画', state.tossing ? '测量坍缩中...' : '叠加态演化');

      const cx = 172, cy = 195, r = 78;
      ctx.save();
      // Outer Bloch circle projection
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Equator ellipse
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.stroke();
      ctx.setLineDash([]);

      // Spinning coin / qubit disc
      const spinScale = state.tossing
        ? Math.cos(state.tossTimer * 28)
        : Math.cos(state.time * 3.2 + (state.phaseDeg * Math.PI) / 180);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(8, Math.abs(spinScale) * 52), 52, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, 54);
      if (state.mode === 'quantum') {
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.65)');
      } else {
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        grad.addColorStop(1, 'rgba(180, 83, 9, 0.7)');
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // State vector arrow on Bloch circle
      const vecX = cx + r * Math.sin(thetaRad) * Math.cos((state.phaseDeg * Math.PI) / 180 + state.time * 1.5);
      const vecY = cy - r * Math.cos(thetaRad);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vecX, vecY);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(vecX, vecY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();

      // Pole labels
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('|↑⟩ 正面 (Heads)', cx, cy - r - 12);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('|↓⟩ 反面 (Tails)', cx, cy + r + 20);
      ctx.restore();

      // Latest Measurement Outcome Display
      roundRect(ctx, 32, 316, 278, 62, 8);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('最近一次测量坍缩结果：', 46, 340);
      ctx.fillStyle = state.lastOutcome === 'up' ? '#38bdf8' : '#f43f5e';
      ctx.font = 'bold 16px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        state.lastOutcome === 'up' ? '↑ 自旋向上 |↑⟩ (正面 Heads)' : '↓ 自旋向下 |↓⟩ (反面 Tails)',
        46, 365
      );

      // Recent outcome beads
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('最近测量序列：', 32, 398);
      state.history.forEach((h, idx) => {
        const bx = 36 + (idx % 14) * 19;
        const by = 415 + Math.floor(idx / 14) * 20;
        ctx.beginPath();
        ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = h === 'up' ? '#38bdf8' : '#f43f5e';
        ctx.fill();
      });

      // Center Panel: Experimental Frequency Histogram vs Theoretical Probability
      drawPanel(ctx, 338, 54, 318, 405, '实验频率 vs 理论量子概率对比', `总测量次数 N = ${state.quantumCounts.total}`);

      const qTotal = state.quantumCounts.total || 1;
      const expUpFreq = state.quantumCounts.total > 0 ? state.quantumCounts.up / qTotal : 0;
      const expDownFreq = state.quantumCounts.total > 0 ? state.quantumCounts.down / qTotal : 0;
      const cTotal = state.classicalCounts.total || 1;
      const cUpFreq = state.classicalCounts.total > 0 ? state.classicalCounts.up / cTotal : 0;

      const chartX = 374, chartY = 115, chartW = 252, chartH = 240;
      // Grid lines
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      for (let p = 0; p <= 1.0; p += 0.25) {
        const gy = chartY + chartH * (1 - p);
        ctx.beginPath();
        ctx.moveTo(chartX, gy);
        ctx.lineTo(chartX + chartW, gy);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10.5px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((p * 100).toFixed(0) + '%', chartX - 6, gy + 3);
      }

      // Group 1: |↑⟩ Heads (Theoretical vs Experimental)
      const bW = 36;
      // Theoretical Up
      const thUpH = state.probUp * chartH;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.fillRect(chartX + 20, chartY + chartH - thUpH, bW, thUpH);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(chartX + 20, chartY + chartH - thUpH, bW, thUpH);

      // Experimental Up
      const exUpH = expUpFreq * chartH;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(chartX + 62, chartY + chartH - exUpH, bW, exUpH);

      // Group 2: |↓⟩ Tails (Theoretical vs Experimental)
      const thDnH = (1 - state.probUp) * chartH;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.32)';
      ctx.fillRect(chartX + 142, chartY + chartH - thDnH, bW, thDnH);
      ctx.strokeStyle = '#f43f5e';
      ctx.strokeRect(chartX + 142, chartY + chartH - thDnH, bW, thDnH);

      const exDnH = expDownFreq * chartH;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(chartX + 184, chartY + chartH - exDnH, bW, exDnH);

      // Labels below bars
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('正面 / 自旋向上 |↑⟩', chartX + 59, chartY + chartH + 20);
      ctx.fillText('反面 / 自旋向下 |↓⟩', chartX + 181, chartY + chartH + 20);

      // Numeric labels above bars
      ctx.font = '10.5px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`理论 ${(state.probUp * 100).toFixed(0)}%`, chartX + 38, chartY + chartH - thUpH - 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`实验 ${(expUpFreq * 100).toFixed(1)}%`, chartX + 80, chartY + chartH - exUpH - 6);

      ctx.fillStyle = '#fda4af';
      ctx.fillText(`理论 ${((1 - state.probUp) * 100).toFixed(0)}%`, chartX + 160, chartY + chartH - thDnH - 6);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`实验 ${(expDownFreq * 100).toFixed(1)}%`, chartX + 202, chartY + chartH - exDnH - 6);

      // Summary statistics table at bottom of center panel
      roundRect(ctx, 354, 388, 286, 58, 6);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`量子硬币统计：↑ ${state.quantumCounts.up} 次 (${(expUpFreq * 100).toFixed(1)}%)  |  ↓ ${state.quantumCounts.down} 次 (${(expDownFreq * 100).toFixed(1)}%)`, 364, 408);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`经典硬币对照：正面 ${state.classicalCounts.up} 次 (${(cUpFreq * 100).toFixed(1)}%)  |  反面 ${state.classicalCounts.down} 次`, 364, 430);
      ctx.restore();

      // Right Control Panel
      drawPanel(ctx, 665, 54, 221, 405, '量子态制备与抛掷控制', '');
      ui.render(ctx);

      // Bottom Formula Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `量子比特态：|ψ⟩ = cos(θ/2)|↑⟩ + e^(iφ)sin(θ/2)|↓⟩ = ${alpha.toFixed(3)}|↑⟩ + e^(i${state.phaseDeg}°)${beta.toFixed(3)}|↓⟩`,
        28, 490
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        `玻恩定则 (Born Rule)：P(↑) = |⟨↑|ψ⟩|² = |α|² = ${(state.probUp * 100).toFixed(1)}% ，P(↓) = |⟨↓|ψ⟩|² = |β|² = ${((1 - state.probUp) * 100).toFixed(1)}% （大数定律下实验频率收敛于理论概率）`,
        28, 512
      );

      ctx.restore();
    }

    // Initialize with 20 tosses so histogram has immediate visual data
    performToss(20);

    return {
      id: 'quantum-coin-toss',
      title: '量子抛硬币 (Quantum Coin Toss)',
      width: W,
      height: H,
      state,
      init() { resetStats(); performToss(20); },
      reset() {
        state.probUp = 0.5;
        state.phaseDeg = 0;
        resetStats();
        performToss(20);
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 3. 'quantum-measurement' (量子测量：布洛赫球与多级施特恩-格拉赫自旋实验)
  // ============================================================================
  function createQuantumMeasurement() {
    const ui = createUIManager();
    const state = {
      initTheta: 90,   // polar angle θ in degrees (0 = +Z, 180 = -Z, 90 = +X/-X)
      initPhi: 0,      // azimuthal angle φ in degrees
      sgAngles: [0, 90, 0],        // 3 Stern-Gerlach analyzer angles in X-Z plane (0° = Z axis, 90° = X axis)
      blockedMinus: [true, true, false], // Whether the '-' channel of stage 1, 2 is blocked
      particles: [],
      spawnTimer: 0,
      stageCounts: [
        { plus: 0, minus: 0 },
        { plus: 0, minus: 0 },
        { plus: 0, minus: 0 }
      ],
      time: 0
    };

    function computeStageProbabilities() {
      // Stage 1: Incident spin state has polar angle initTheta (and azimuth initPhi).
      // In X-Z plane projection, angle difference between state (theta, phi) and SG1 axis (alpha1):
      const th0 = (state.initTheta * Math.PI) / 180;
      const ph0 = (state.initPhi * Math.PI) / 180;
      const sx0 = Math.sin(th0) * Math.cos(ph0);
      const sz0 = Math.cos(th0);

      const a1 = (state.sgAngles[0] * Math.PI) / 180;
      const m1x = Math.sin(a1), m1z = Math.cos(a1);
      const cosDelta1 = clamp(sx0 * m1x + sz0 * m1z, -1, 1);
      const p1Plus = 0.5 * (1 + cosDelta1); // cos^2(Δθ_1 / 2)

      // After Stage 1 (+ channel selected, since '-' channel is blocked onto absorber):
      // State collapses to |+a1⟩!
      const delta12 = ((state.sgAngles[1] - state.sgAngles[0]) * Math.PI) / 180;
      const p2PlusGiven1 = Math.pow(Math.cos(delta12 / 2), 2);

      // After Stage 2 (+ channel selected):
      // State collapses to |+a2⟩! (Even if SG3 is along Z and SG1 blocked -Z, SG2 along X resets the state!)
      const delta23 = ((state.sgAngles[2] - state.sgAngles[1]) * Math.PI) / 180;
      const p3PlusGiven2 = Math.pow(Math.cos(delta23 / 2), 2);

      return {
        p1Plus,
        p1Minus: 1 - p1Plus,
        p2PlusGiven1,
        p2MinusGiven1: 1 - p2PlusGiven1,
        p3PlusGiven2,
        p3MinusGiven2: 1 - p3PlusGiven2
      };
    }

    function resetCounters() {
      state.stageCounts = [
        { plus: 0, minus: 0 },
        { plus: 0, minus: 0 },
        { plus: 0, minus: 0 }
      ];
      state.particles.length = 0;
    }

    function spawnParticle() {
      const probs = computeStageProbabilities();
      const pass1 = Math.random() < probs.p1Plus;
      state.stageCounts[0][pass1 ? 'plus' : 'minus']++;

      let pass2 = false;
      let pass3 = false;
      if (pass1 || !state.blockedMinus[0]) {
        pass2 = Math.random() < (pass1 ? probs.p2PlusGiven1 : (1 - probs.p2PlusGiven1));
        state.stageCounts[1][pass2 ? 'plus' : 'minus']++;
        if (pass2 || !state.blockedMinus[1]) {
          pass3 = Math.random() < (pass2 ? probs.p3PlusGiven2 : (1 - probs.p3PlusGiven2));
          state.stageCounts[2][pass3 ? 'plus' : 'minus']++;
        }
      }

      state.particles.push({
        x: 245,
        y: 230,
        pass1,
        pass2,
        pass3,
        alive: true
      });
      if (state.particles.length > 90) state.particles.shift();
    }

    function rebuildUI() {
      ui.clear();
      const px = 672, py = 54, pw = 206;

      // Initial state presets
      const presets = [
        { label: '|+Z⟩ (0°)', th: 0, ph: 0 },
        { label: '|-Z⟩ (180°)', th: 180, ph: 0 },
        { label: '|+X⟩ (90°)', th: 90, ph: 0 },
        { label: '|-X⟩ (-90°)', th: 90, ph: 180 }
      ];
      presets.forEach((p, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const isAct = Math.abs(state.initTheta - p.th) < 1 && Math.abs(state.initPhi - p.ph) < 1;
        ui.addButton('pre_' + idx, px + col * 104, py + 28 + row * 26, 100, 22, p.label, () => {
          state.initTheta = p.th;
          state.initPhi = p.ph;
          resetCounters();
        }, { active: isAct, fontSize: 11 });
      });

      ui.addSlider('initTheta', px, py + 102, pw, '初态极角 θ (Bloch Polar)', state.initTheta, 0, 180, 5, (v) => {
        state.initTheta = v;
        resetCounters();
      }, (v) => `${v}°`);

      // SG Stage 1, 2, 3 angle sliders
      ui.addSlider('sg1', px, py + 150, pw, '第 1 级 SG₁ 磁铁角度 α₁', state.sgAngles[0], 0, 180, 15, (v) => {
        state.sgAngles[0] = v;
        resetCounters();
      }, (v) => `${v}° (${v === 0 ? 'Z轴' : v === 90 ? 'X轴' : '斜轴'})`);

      ui.addSlider('sg2', px, py + 198, pw, '第 2 级 SG₂ 磁铁角度 α₂', state.sgAngles[1], 0, 180, 15, (v) => {
        state.sgAngles[1] = v;
        resetCounters();
      }, (v) => `${v}° (${v === 0 ? 'Z轴' : v === 90 ? 'X轴' : '斜轴'})`);

      ui.addSlider('sg3', px, py + 246, pw, '第 3 级 SG₃ 磁铁角度 α₃', state.sgAngles[2], 0, 180, 15, (v) => {
        state.sgAngles[2] = v;
        resetCounters();
      }, (v) => `${v}° (${v === 0 ? 'Z轴' : v === 90 ? 'X轴' : '斜轴'})`);

      // Classic Z -> X -> Z non-commuting demo preset button
      ui.addButton('demo_zxz', px, py + 282, pw, 26, '经典演示：SG₁(Z) → SG₂(X) → SG₃(Z)', () => {
        state.initTheta = 90;
        state.initPhi = 0;
        state.sgAngles = [0, 90, 0];
        state.blockedMinus = [true, true, false];
        resetCounters();
      }, { color: '#38bdf8', fontSize: 11 });

      ui.addButton('demo_zz', px, py + 314, pw, 26, '对照演示：SG₁(Z) → SG₂(Z) → SG₃(Z)', () => {
        state.initTheta = 90;
        state.initPhi = 0;
        state.sgAngles = [0, 0, 0];
        state.blockedMinus = [true, true, false];
        resetCounters();
      }, { color: '#10b981', fontSize: 11 });

      // Block channel toggles
      ui.addButton('blk1', px, py + 348, 100, 24, state.blockedMinus[0] ? 'SG₁ 阻挡 |−⟩: 开' : 'SG₁ 阻挡 |−⟩: 关', () => {
        state.blockedMinus[0] = !state.blockedMinus[0];
        resetCounters();
      }, { active: state.blockedMinus[0], color: '#f59e0b', fontSize: 10.5 });

      ui.addButton('blk2', px + 106, py + 348, 100, 24, state.blockedMinus[1] ? 'SG₂ 阻挡 |−⟩: 开' : 'SG₂ 阻挡 |−⟩: 关', () => {
        state.blockedMinus[1] = !state.blockedMinus[1];
        resetCounters();
      }, { active: state.blockedMinus[1], color: '#f59e0b', fontSize: 10.5 });

      ui.addButton('reset_sg', px, py + 380, pw, 24, '重置粒子计数器', () => {
        resetCounters();
      }, { color: '#f43f5e', fontSize: 11 });
    }

    function update(dt, params) {
      state.time += dt || 0.016;
      state.spawnTimer += dt || 0.016;
      if (state.spawnTimer >= 0.06) {
        state.spawnTimer = 0;
        spawnParticle();
      }

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += 185 * (dt || 0.016);
        if (p.x > 645) {
          state.particles.splice(i, 1);
        }
      }
    }

    function renderBlochSphere(ctx, cx, cy, r) {
      ctx.save();
      // Sphere shaded background
      const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 5, cx, cy, r);
      grad.addColorStop(0, 'rgba(30, 58, 138, 0.45)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Equator
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.stroke();
      ctx.setLineDash([]);

      // Z and X axes
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 8);
      ctx.lineTo(cx, cy + r + 8);
      ctx.moveTo(cx - r - 8, cy);
      ctx.lineTo(cx + r + 8, cy);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('|+Z⟩', cx, cy - r - 12);
      ctx.fillText('|-Z⟩', cx, cy + r + 18);
      ctx.fillText('|+X⟩', cx + r + 16, cy + 4);

      // Draw initial state vector |ψ_0⟩
      const th = (state.initTheta * Math.PI) / 180;
      const ph = (state.initPhi * Math.PI) / 180;
      const vx = cx + r * Math.sin(th) * Math.cos(ph);
      const vy = cy - r * Math.cos(th);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vx, vy);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(vx, vy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Draw SG1 measurement axis
      const a1 = (state.sgAngles[0] * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx - r * Math.sin(a1), cy + r * Math.cos(a1));
      ctx.lineTo(cx + r * Math.sin(a1), cy - r * Math.cos(a1));
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    function render(ctx, params) {
      rebuildUI();
      const probs = computeStageProbabilities();

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      drawPanel(
        ctx, 14, 10, 872, 36,
        '量子测量 (Quantum Measurement) — 布洛赫球与多级施特恩-格拉赫 (Stern-Gerlach) 实验',
        '透射法则：P(+) = cos²(Δθ/2)  |  测量重置量子态'
      );

      // Left Panel: Bloch Sphere
      drawPanel(ctx, 14, 54, 210, 405, '布洛赫球 (Bloch Sphere)', `θ=${state.initTheta}°, φ=${state.initPhi}°`);
      renderBlochSphere(ctx, 119, 185, 68);

      // State breakdown below Bloch sphere
      const cHalf = Math.cos((state.initTheta * Math.PI) / 360);
      const sHalf = Math.sin((state.initTheta * Math.PI) / 360);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`入射初态：`, 28, 305);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`|ψ₀⟩ = ${cHalf.toFixed(2)}|+Z⟩ + ${sHalf.toFixed(2)}|-Z⟩`, 28, 324);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`SG₁ 轴角 α₁ = ${state.sgAngles[0]}°`, 28, 352);
      ctx.fillText(`SG₂ 轴角 α₂ = ${state.sgAngles[1]}°`, 28, 372);
      ctx.fillText(`SG₃ 轴角 α₃ = ${state.sgAngles[2]}°`, 28, 392);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`第3级 |+⟩ 净透射率：`, 28, 418);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${(probs.p1Plus * probs.p2PlusGiven1 * probs.p3PlusGiven2 * 100).toFixed(1)}%`, 28, 438);

      // Center Panel: 3-Stage Stern-Gerlach Apparatus
      drawPanel(ctx, 232, 54, 432, 405, '多级施特恩-格拉赫磁铁序列 (3-Stage Stern-Gerlach)', '');

      const stageX = [285, 415, 545];
      const baseY = 230;

      // Draw 3 SG Magnet Boxes
      stageX.forEach((sx, idx) => {
        const ang = state.sgAngles[idx];
        const axisName = ang === 0 ? 'Z 轴' : ang === 90 ? 'X 轴' : `${ang}° 轴`;

        // Magnet N/S poles
        roundRect(ctx, sx, baseY - 62, 68, 36, 5);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        roundRect(ctx, sx, baseY + 26, 68, 36, 5);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`SG${idx + 1} (${axisName})`, sx + 34, baseY - 72);
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('N', sx + 34, baseY - 40);
        ctx.fillStyle = '#93c5fd';
        ctx.fillText('S', sx + 34, baseY + 48);

        // Channel labels & probability readouts
        let pPlus = probs.p1Plus;
        if (idx === 1) pPlus = probs.p2PlusGiven1;
        if (idx === 2) pPlus = probs.p3PlusGiven2;

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`|+⟩ ${(pPlus * 100).toFixed(0)}%`, sx + 94, baseY - 28);

        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`|−⟩ ${((1 - pPlus) * 100).toFixed(0)}%`, sx + 94, baseY + 34);

        // Draw beam blocker on '-' branch for stage 1 and 2
        if (idx < 2 && state.blockedMinus[idx]) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(sx + 78, baseY + 12, 8, 28);
          ctx.font = '10px sans-serif';
          ctx.fillText('阻挡器', sx + 82, baseY + 52);
        }

        // Draw stage statistics at bottom of center panel
        const st = state.stageCounts[idx];
        const tot = st.plus + st.minus || 1;
        roundRect(ctx, sx - 12, 355, 118, 86, 6);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`第 ${idx + 1} 级测量统计`, sx - 4, 373);
        ctx.fillStyle = '#34d399';
        ctx.font = '11px sans-serif';
        ctx.fillText(`|+⟩: ${st.plus} (${((st.plus / tot) * 100).toFixed(0)}%)`, sx - 4, 394);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`|−⟩: ${st.minus} (${((st.minus / tot) * 100).toFixed(0)}%)`, sx - 4, 414);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`cos²(Δθ/2)=${(pPlus * 100).toFixed(0)}%`, sx - 4, 432);
      });

      // Render animated spin particles flowing through the stages
      for (const p of state.particles) {
        let py = baseY;
        let color = '#38bdf8';
        let visible = true;

        if (p.x >= stageX[0]) {
          if (p.pass1) {
            py = baseY - 18;
            color = '#34d399';
          } else {
            py = baseY + 22;
            color = '#f43f5e';
            if (state.blockedMinus[0] && p.x > stageX[0] + 78) visible = false;
          }
        }
        if (visible && p.x >= stageX[1] - 15 && p.x < stageX[1]) {
          py = baseY; // re-collimated into SG2 entrance
        }
        if (visible && p.x >= stageX[1]) {
          if (p.pass2) {
            py = baseY - 18;
            color = '#34d399';
          } else {
            py = baseY + 22;
            color = '#f43f5e';
            if (state.blockedMinus[1] && p.x > stageX[1] + 78) visible = false;
          }
        }
        if (visible && p.x >= stageX[2] - 15 && p.x < stageX[2]) {
          py = baseY; // re-collimated into SG3 entrance
        }
        if (visible && p.x >= stageX[2]) {
          py = p.pass3 ? baseY - 18 : baseY + 22;
          color = p.pass3 ? '#34d399' : '#f43f5e';
        }

        if (visible) {
          ctx.beginPath();
          ctx.arc(p.x, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Right Control Panel
      drawPanel(ctx, 672, 54, 214, 405, '自旋初态与各级磁铁控制', '');
      ui.render(ctx);

      // Bottom Physics Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `非对易算符 [σ_z, σ_x] = 2iσ_y ≠ 0：在 SG₁(Z) 阻挡 |-Z⟩ 后，若中间插入 SG₂(X) 测量，粒子坍缩至 |+X⟩ = (|+Z⟩ + |-Z⟩)/√2，使 SG₃(Z) 重新出现 50% |-Z⟩ 分量！`,
        28, 490
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        `当前三级透射率：SG₁ P(+) = ${(probs.p1Plus * 100).toFixed(1)}%  →  SG₂ P(+|1) = ${(probs.p2PlusGiven1 * 100).toFixed(1)}%  →  SG₃ P(+|2) = ${(probs.p3PlusGiven2 * 100).toFixed(1)}%`,
        28, 512
      );

      ctx.restore();
    }

    return {
      id: 'quantum-measurement',
      title: '量子测量 (Quantum Measurement)',
      width: W,
      height: H,
      state,
      init() { resetCounters(); },
      reset() {
        state.initTheta = 90;
        state.initPhi = 0;
        state.sgAngles = [0, 90, 0];
        state.blockedMinus = [true, true, false];
        resetCounters();
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 4. 'particle-in-a-box' (箱中粒子 / 一维无限深势阱)
  // ============================================================================
  function createParticleInABox() {
    const ui = createUIManager();
    // Physical constant: h^2 / (8 m_e) = 0.37603 eV * nm^2
    const H2_OVER_8ME = 0.37603;

    const state = {
      L: 1.0,          // Box width in nm (0.2 ~ 2.0)
      m: 1.0,          // Particle mass in m_e (0.5 ~ 5.0)
      n: 1,            // Principal quantum number n (1 ~ 8)
      showReal: true,
      showImag: true,
      showProb: true,
      showNodes: true,
      time: 0
    };

    function calcEnergyEV(n, L, m) {
      return (n * n * H2_OVER_8ME) / (m * L * L);
    }

    function rebuildUI() {
      ui.clear();
      const px = 674, py = 54, pw = 204;

      // Quantum number n buttons (1..8 in 2x4 grid)
      for (let qn = 1; qn <= 8; qn++) {
        const col = (qn - 1) % 4;
        const row = Math.floor((qn - 1) / 4);
        ui.addButton('qn_' + qn, px + col * 51, py + 28 + row * 28, 47, 24, `n=${qn}`, () => {
          state.n = qn;
        }, { active: state.n === qn, fontSize: 11.5 });
      }

      ui.addSlider('widthL', px, py + 112, pw, '势阱宽度 L (nm)', state.L, 0.2, 2.0, 0.05, (v) => {
        state.L = v;
      }, (v) => `${v.toFixed(2)} nm`);

      ui.addSlider('massM', px, py + 162, pw, '粒子质量 m (mₑ)', state.m, 0.5, 5.0, 0.1, (v) => {
        state.m = v;
      }, (v) => `${v.toFixed(1)} mₑ`);

      ui.addSlider('qnSlider', px, py + 212, pw, '主量子数 n (1 ~ 8)', state.n, 1, 8, 1, (v) => {
        state.n = Math.round(v);
      }, (v) => `n = ${v}`);

      // Display toggles
      ui.addButton('tog_re', px, py + 252, pw, 25, `实部 Re[ψₙ(x,t)] : ${state.showReal ? '显示' : '隐藏'}`, () => {
        state.showReal = !state.showReal;
      }, { active: state.showReal, color: '#38bdf8', fontSize: 11.5 });

      ui.addButton('tog_im', px, py + 283, pw, 25, `虚部 Im[ψₙ(x,t)] : ${state.showImag ? '显示' : '隐藏'}`, () => {
        state.showImag = !state.showImag;
      }, { active: state.showImag, color: '#f43f5e', fontSize: 11.5 });

      ui.addButton('tog_prob', px, py + 314, pw, 25, `概率密度 |ψₙ(x)|² : ${state.showProb ? '显示' : '隐藏'}`, () => {
        state.showProb = !state.showProb;
      }, { active: state.showProb, color: '#34d399', fontSize: 11.5 });

      ui.addButton('tog_nodes', px, py + 345, pw, 25, `标记节点 (Nodes = n-1) : ${state.showNodes ? '开启' : '关闭'}`, () => {
        state.showNodes = !state.showNodes;
      }, { active: state.showNodes, color: '#fbbf24', fontSize: 11.5 });
    }

    function update(dt, params) {
      if (params) {
        if (typeof params.L === 'number') state.L = clamp(params.L, 0.2, 2.0);
        if (typeof params.m === 'number') state.m = clamp(params.m, 0.5, 5.0);
        if (typeof params.n === 'number') state.n = clamp(Math.round(params.n), 1, 8);
      }
      state.time += dt || 0.016;
    }

    function render(ctx, params) {
      rebuildUI();
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      const En = calcEnergyEV(state.n, state.L, state.m);
      const E1 = calcEnergyEV(1, state.L, state.m);
      const E8 = calcEnergyEV(8, state.L, state.m);

      drawPanel(
        ctx, 14, 10, 872, 36,
        '箱中粒子 / 一维无限深势阱 (Particle in a 1D Infinite Square Well)',
        `E_${state.n} = ${En.toFixed(3)} eV  |  节点数 Nodes = ${state.n - 1}`
      );

      // Left Panel: Energy Level Diagram E_1 .. E_8
      drawPanel(ctx, 14, 54, 248, 405, '本征能级谱 (E₁ ~ E₈)', `E₁ = ${E1.toFixed(3)} eV`);

      const wellLeft = 62, wellRight = 212, wellTop = 98, wellBot = 415;
      const wellH = wellBot - wellTop;

      // Infinite potential walls hatching
      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.fillRect(wellLeft - 28, wellTop, 28, wellH);
      ctx.fillRect(wellRight, wellTop, 28, wellH);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(wellLeft, wellTop);
      ctx.lineTo(wellLeft, wellBot);
      ctx.lineTo(wellRight, wellBot);
      ctx.lineTo(wellRight, wellTop);
      ctx.stroke();

      // Draw levels n = 1..8 (scaled by n^2 / 64)
      for (let i = 1; i <= 8; i++) {
        const Ei = calcEnergyEV(i, state.L, state.m);
        const yFrac = (i * i) / 66;
        const ly = wellBot - yFrac * (wellH - 18);
        const isSel = i === state.n;

        ctx.beginPath();
        ctx.moveTo(wellLeft + 2, ly);
        ctx.lineTo(wellRight - 2, ly);
        ctx.strokeStyle = isSel ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = isSel ? 3 : 1.5;
        ctx.stroke();

        ctx.fillStyle = isSel ? '#38bdf8' : '#94a3b8';
        ctx.font = (isSel ? 'bold ' : '') + '10.5px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`n=${i}`, wellLeft - 5, ly + 3);
        ctx.textAlign = 'left';
        ctx.fillText(`${Ei.toFixed(2)}eV`, wellRight + 4, ly + 3);
      }

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`V(x) = ∞ (x≤0, x≥L)`, (wellLeft + wellRight) / 2, wellBot + 22);

      // Center Panel: Wavefunction Re[ψ], Im[ψ] & Probability Density |ψ|^2
      drawPanel(ctx, 270, 54, 396, 405, '波函数 ψₙ(x,t) 与 模平方概率密度 |ψₙ(x)|²', `L = ${state.L.toFixed(2)} nm`);

      // Visual width scales dynamically with L
      const maxPlotW = 330;
      const plotW = clamp(120 + (state.L / 2.0) * 210, 120, maxPlotW);
      const plotCenterX = 270 + 396 / 2;
      const x0 = plotCenterX - plotW / 2;
      const x1 = plotCenterX + plotW / 2;

      // Top sub-plot: Re[ψ(x,t)] and Im[ψ(x,t)]
      const waveMidY = 175;
      const waveAmp = 58;

      // Infinite wall boundaries
      ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.fillRect(x0 - 18, 92, 18, 330);
      ctx.fillRect(x1, 92, 18, 330);

      // Zero axes
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, waveMidY);
      ctx.lineTo(x1, waveMidY);
      ctx.stroke();

      const omega = state.time * (1.8 + state.n * 0.7);
      const cosWt = Math.cos(omega);
      const sinWt = -Math.sin(omega);

      // Real part Re[ψ]
      if (state.showReal) {
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const u = px / plotW;
          const psi = Math.sin(state.n * Math.PI * u) * cosWt;
          const vx = x0 + px;
          const vy = waveMidY - psi * waveAmp;
          if (px === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Imaginary part Im[ψ]
      if (state.showImag) {
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const u = px / plotW;
          const psiIm = Math.sin(state.n * Math.PI * u) * sinWt;
          const vx = x0 + px;
          const vy = waveMidY - psiIm * waveAmp;
          if (px === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      // Bottom sub-plot: Probability Density |ψ_n(x)|^2 = (2/L) sin^2(n π x / L)
      const probBaseY = 395;
      const probAmp = 105;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x0, probBaseY);
      ctx.lineTo(x1, probBaseY);
      ctx.stroke();

      if (state.showProb) {
        ctx.beginPath();
        ctx.moveTo(x0, probBaseY);
        for (let px = 0; px <= plotW; px += 2) {
          const u = px / plotW;
          const pVal = Math.pow(Math.sin(state.n * Math.PI * u), 2);
          ctx.lineTo(x0 + px, probBaseY - pVal * probAmp);
        }
        ctx.lineTo(x1, probBaseY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Mark Classical Turning Points (x = 0, x = L) and Internal Nodes (Nodes = n - 1)
      if (state.showNodes) {
        for (let k = 1; k < state.n; k++) {
          const nx = x0 + (k / state.n) * plotW;
          ctx.beginPath();
          ctx.arc(nx, waveMidY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nx, probBaseY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        }
      }

      // Turning point markers at x=0 and x=L
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x = 0 (转折点)', x0, probBaseY + 18);
      ctx.fillText(`x = ${state.L.toFixed(2)} nm (转折点)`, x1, probBaseY + 18);

      // Sub-plot titles
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Re[ψₙ(x,t)] (蓝) / Im[ψₙ(x,t)] (红)', x0 + 6, 106);
      ctx.fillStyle = '#34d399';
      ctx.fillText(`概率密度 |ψₙ(x)|² = (2/L)sin²(${state.n}πx/L)  [峰值 = ${(2 / state.L).toFixed(2)} nm⁻¹]`, x0 + 6, 275);

      // Right Control Panel
      drawPanel(ctx, 674, 54, 212, 405, '势阱与量子数控制', '');
      ui.render(ctx);

      // Bottom Formula Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      const deBroglieLam = (2 * state.L) / state.n;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `精确解析公式：Eₙ = n²h² / (8mL²) = ${En.toFixed(4)} eV   |   定态波函数：ψₙ(x,t) = √(2/L) sin(nπx/L) e^(-iEₙt/ℏ)`,
        28, 490
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        `驻波条件：L = n(λ/2) ⇒ 德布罗意波长 λ_${state.n} = 2L/n = ${deBroglieLam.toFixed(3)} nm   |   零点能 E₁ = ${E1.toFixed(4)} eV   |   内部节点数 = ${state.n - 1}`,
        28, 512
      );

      ctx.restore();
    }

    return {
      id: 'particle-in-a-box',
      title: '箱中粒子 / 一维无限深势阱 (Particle in a Box)',
      width: W,
      height: H,
      state,
      init() {},
      reset() {
        state.L = 1.0;
        state.m = 1.0;
        state.n = 1;
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 5. 'quantum-bound-states' (量子束缚态：有限深方势阱、量子谐振子、非对称库仑势)
  // ============================================================================
  const HERMITE_POLYS = [
    (u) => 1,
    (u) => 2 * u,
    (u) => 4 * u * u - 2,
    (u) => 8 * Math.pow(u, 3) - 12 * u,
    (u) => 16 * Math.pow(u, 4) - 48 * u * u + 12,
    (u) => 32 * Math.pow(u, 5) - 160 * Math.pow(u, 3) + 120 * u
  ];
  const FACTORIALS = [1, 1, 2, 6, 24, 120];

  function evalHarmonicEigenstate(n, u) {
    const Hn = HERMITE_POLYS[clamp(n, 0, 5)](u);
    const norm = 1 / Math.sqrt(Math.pow(2, n) * FACTORIALS[clamp(n, 0, 5)] * Math.sqrt(Math.PI));
    return norm * Hn * Math.exp(-0.5 * u * u);
  }

  function createQuantumBoundStates() {
    const ui = createUIManager();
    const state = {
      potentialType: 'finite-well', // 'finite-well', 'harmonic', 'coulomb'
      V0: 12.0,       // Well depth / strength in eV (4.0 ~ 25.0)
      widthL: 1.2,    // Characteristic width L in nm (0.5 ~ 2.0)
      mass: 1.0,      // Particle mass in m_e (0.5 ~ 3.0)
      stateIndex: 0,  // Selected bound eigenstate index (0 = ground state)
      time: 0
    };

    function computeBoundSpectrum() {
      const levels = [];
      if (state.potentialType === 'finite-well') {
        // Dimensionless strength parameter z0 = (L/2) * sqrt(2 m V0 / hbar^2)
        // hbar^2 / (2 m_e) = 0.0381 eV * nm^2
        const z0 = (state.widthL / 2) * Math.sqrt((state.mass * state.V0) / 0.0381);
        const maxStates = clamp(Math.ceil((2 * z0) / Math.PI), 1, 6);
        for (let n = 0; n < maxStates; n++) {
          // Approximate root z_n of transcendental equation for finite square well
          const zApprox = ((n + 1) * Math.PI * 0.5) * (z0 / (z0 + 1.15));
          const z = Math.min(z0 * 0.985, zApprox);
          const E = state.V0 * Math.pow(z / z0, 2);
          levels.push({ n, label: `n = ${n + 1}`, E, z, z0 });
        }
      } else if (state.potentialType === 'harmonic') {
        // E_n = hbar * omega * (n + 1/2)
        const hbarOmega = (1.6 * Math.sqrt(state.V0 / (state.mass * state.widthL * state.widthL)));
        for (let n = 0; n < 6; n++) {
          const E = hbarOmega * (n + 0.5);
          if (E < state.V0 * 1.35) {
            levels.push({ n, label: `n = ${n}`, E, hbarOmega });
          }
        }
      } else {
        // Asymmetric / 1D Coulomb-like well: E_n = V0 * (1 - 1 / (n + 1.15)^2)
        for (let n = 0; n < 5; n++) {
          const E = state.V0 * (1 - 1 / Math.pow(n + 1.15, 2));
          levels.push({ n, label: `n = ${n + 1}`, E });
        }
      }
      if (state.stateIndex >= levels.length) {
        state.stateIndex = Math.max(0, levels.length - 1);
      }
      return levels;
    }

    function evalWavefunctionAt(xNm, level) {
      // xNm in [-1.6, 1.6]
      const halfL = state.widthL / 2;
      if (state.potentialType === 'finite-well') {
        const k = level.z / halfL;
        const kappa = Math.sqrt(Math.max(0.05, level.z0 * level.z0 - level.z * level.z)) / halfL;
        const isEven = level.n % 2 === 0;
        if (Math.abs(xNm) <= halfL) {
          return isEven ? Math.cos(k * xNm) : Math.sin(k * xNm);
        } else {
          const edgeVal = isEven ? Math.cos(k * halfL) : Math.sin(k * halfL) * Math.sign(xNm);
          return edgeVal * Math.exp(-kappa * (Math.abs(xNm) - halfL));
        }
      } else if (state.potentialType === 'harmonic') {
        const alphaScale = 2.6 / state.widthL;
        return evalHarmonicEigenstate(level.n, xNm * alphaScale);
      } else {
        // Asymmetric radial-like wavefunction for x > -halfL
        const r = (xNm + halfL * 0.9) / (state.widthL * 0.42);
        if (r <= 0) {
          return 0.08 * Math.exp(3.5 * r);
        }
        const n = level.n + 1;
        const poly = n === 1 ? 1 : n === 2 ? (1 - 0.5 * r) : (1 - 0.65 * r + 0.1 * r * r);
        return r * poly * Math.exp(-r / (0.65 * n)) * 2.2;
      }
    }

    function rebuildUI(levels) {
      ui.clear();
      const px = 672, py = 54, pw = 206;

      const pots = [
        { k: 'finite-well', label: '有限深方势阱' },
        { k: 'harmonic', label: '量子谐振子' },
        { k: 'coulomb', label: '非对称/库仑势' }
      ];
      pots.forEach((p, idx) => {
        ui.addButton('pot_' + p.k, px, py + 26 + idx * 27, pw, 23, p.label, () => {
          state.potentialType = p.k;
          state.stateIndex = 0;
        }, { active: state.potentialType === p.k, fontSize: 11.5 });
      });

      // State selector buttons
      levels.forEach((lv, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        ui.addButton('lv_' + idx, px + col * 70, py + 116 + row * 26, 65, 22, lv.label, () => {
          state.stateIndex = idx;
        }, { active: state.stateIndex === idx, color: '#34d399', fontSize: 11 });
      });

      ui.addSlider('V0', px, py + 188, pw, '势阱深度 / 力常数 V₀ (eV)', state.V0, 4.0, 24.0, 0.5, (v) => {
        state.V0 = v;
      }, (v) => `${v.toFixed(1)} eV`);

      ui.addSlider('widthL', px, py + 238, pw, '特征宽度 L (nm)', state.widthL, 0.5, 1.8, 0.05, (v) => {
        state.widthL = v;
      }, (v) => `${v.toFixed(2)} nm`);

      ui.addSlider('mass', px, py + 288, pw, '粒子有效质量 m (mₑ)', state.mass, 0.5, 3.0, 0.1, (v) => {
        state.mass = v;
      }, (v) => `${v.toFixed(1)} mₑ`);
    }

    function update(dt, params) {
      if (params) {
        if (params.potentialType) state.potentialType = params.potentialType;
        if (typeof params.V0 === 'number') state.V0 = params.V0;
        if (typeof params.widthL === 'number') state.widthL = params.widthL;
      }
      state.time += dt || 0.016;
    }

    function render(ctx, params) {
      const levels = computeBoundSpectrum();
      const activeLv = levels[state.stateIndex] || levels[0];
      const zpe = levels[0] ? levels[0].E : 0;
      rebuildUI(levels);

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      drawPanel(
        ctx, 14, 10, 872, 36,
        '量子束缚态 (Quantum Bound States) — 势阱能级、零点能与经典禁戒区指数衰减隧穿尾巴',
        `零点能 ZPE = ${zpe.toFixed(3)} eV  |  当前本征能 E = ${activeLv.E.toFixed(3)} eV`
      );

      // Left Panel: Potential V(x) & Eigenvalues
      drawPanel(ctx, 14, 54, 320, 405, '势能曲线 V(x) 与 束缚能级', `共 ${levels.length} 个束缚态`);

      const pLeft = 48, pRight = 308, pTop = 100, pBot = 412;
      const pW = pRight - pLeft, pH = pBot - pTop;
      const pMidX = (pLeft + pRight) / 2;
      const nmToPx = pW / 3.2; // [-1.6 nm, +1.6 nm]
      const evToPy = (ev) => pBot - clamp(ev / (state.V0 * 1.25), 0, 1.05) * pH;

      // Draw potential V(x)
      ctx.save();
      ctx.beginPath();
      if (state.potentialType === 'finite-well') {
        const halfPx = (state.widthL / 2) * nmToPx;
        const vTopY = evToPy(state.V0);
        ctx.moveTo(pLeft, vTopY);
        ctx.lineTo(pMidX - halfPx, vTopY);
        ctx.lineTo(pMidX - halfPx, pBot);
        ctx.lineTo(pMidX + halfPx, pBot);
        ctx.lineTo(pMidX + halfPx, vTopY);
        ctx.lineTo(pRight, vTopY);
      } else if (state.potentialType === 'harmonic') {
        for (let px = pLeft; px <= pRight; px += 2) {
          const xNm = (px - pMidX) / nmToPx;
          const v = state.V0 * Math.pow(xNm / (state.widthL * 0.65), 2);
          const py = evToPy(v);
          if (px === pLeft) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      } else {
        // Asymmetric / Coulomb-like potential
        const wallX = pMidX - (state.widthL * 0.45) * nmToPx;
        ctx.moveTo(pLeft, evToPy(state.V0 * 1.15));
        ctx.lineTo(wallX, evToPy(state.V0 * 1.15));
        ctx.lineTo(wallX, pBot);
        for (let px = wallX + 2; px <= pRight; px += 2) {
          const rNm = (px - wallX) / nmToPx;
          const v = state.V0 * (1 - 0.28 / (rNm + 0.28));
          ctx.lineTo(px, evToPy(v));
        }
      }
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw energy levels inside V(x)
      levels.forEach((lv, idx) => {
        const ly = evToPy(lv.E);
        const isSel = idx === state.stateIndex;
        ctx.beginPath();
        ctx.moveTo(pLeft + 18, ly);
        ctx.lineTo(pRight - 18, ly);
        ctx.strokeStyle = isSel ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = isSel ? 2.8 : 1.4;
        ctx.stroke();

        ctx.fillStyle = isSel ? '#38bdf8' : '#94a3b8';
        ctx.font = (isSel ? 'bold ' : '') + '10.5px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${lv.label}: ${lv.E.toFixed(2)}eV`, pLeft + 22, ly - 5);
      });

      // Highlight Zero-Point Energy (ZPE) gap at bottom
      const zpeY = evToPy(zpe);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.fillRect(pMidX - 45, zpeY, 90, pBot - zpeY);
      ctx.fillStyle = '#fda4af';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`零点能 E₀ = ${zpe.toFixed(2)} eV > 0`, pMidX, pBot + 18);
      ctx.restore();

      // Center Panel: Wavefunction & Evanescent Tunneling Tails in Classically Forbidden Regions
      drawPanel(
        ctx, 342, 54, 322, 405,
        '本征波函数 ψₙ(x) 与 禁戒区指数衰减尾巴',
        `${activeLv.label} (节点数 = ${activeLv.n})`
      );

      const wLeft = 364, wRight = 642, wMidX = (wLeft + wRight) / 2;
      const wW = wRight - wLeft;
      const wNmScale = wW / 3.2;
      const halfWellPx = (state.widthL / 2) * wNmScale;

      // Highlight Classically Forbidden Regions |x| > L/2
      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.13)';
      ctx.fillRect(wLeft, 95, Math.max(0, wMidX - halfWellPx - wLeft), 330);
      ctx.fillRect(wMidX + halfWellPx, 95, Math.max(0, wRight - (wMidX + halfWellPx)), 330);

      // Turning point dashed lines
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(wMidX - halfWellPx, 95);
      ctx.lineTo(wMidX - halfWellPx, 425);
      ctx.moveTo(wMidX + halfWellPx, 95);
      ctx.lineTo(wMidX + halfWellPx, 425);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fda4af';
      ctx.font = '10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('禁戒区 V>E', (wLeft + wMidX - halfWellPx) / 2, 112);
      ctx.fillText('禁戒区 V>E', (wRight + wMidX + halfWellPx) / 2, 112);
      ctx.fillStyle = '#34d399';
      ctx.fillText('经典允许区 (E > V)', wMidX, 112);

      // Wavefunction plot (top) and |ψ|^2 plot (bottom)
      const psiMidY = 195;
      const probBaseY = 395;
      const phaseCos = Math.cos(state.time * 4.2);

      // Compute normalized samples
      const samples = [];
      let maxAbs = 0.01;
      for (let px = wLeft; px <= wRight; px += 2) {
        const xNm = (px - wMidX) / wNmScale;
        const val = evalWavefunctionAt(xNm, activeLv);
        if (Math.abs(val) > maxAbs) maxAbs = Math.abs(val);
        samples.push({ px, xNm, val });
      }

      // Draw ψ(x,t)
      ctx.beginPath();
      samples.forEach((s, i) => {
        const y = psiMidY - (s.val / maxAbs) * 62 * phaseCos;
        if (i === 0) ctx.moveTo(s.px, y);
        else ctx.lineTo(s.px, y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw |ψ(x)|^2 with highlighted evanescent tails
      ctx.beginPath();
      ctx.moveTo(wLeft, probBaseY);
      samples.forEach((s) => {
        const p2 = Math.pow(s.val / maxAbs, 2);
        ctx.lineTo(s.px, probBaseY - p2 * 110);
      });
      ctx.lineTo(wRight, probBaseY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('← 指数衰减量子隧穿尾巴 ψ(x) ∝ e^(-κ|x|) →', wMidX, 438);
      ctx.restore();

      // Right Control Panel
      drawPanel(ctx, 672, 54, 214, 405, '势场类型与能级控制', '');
      ui.render(ctx);

      // Bottom Formula Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      if (state.potentialType === 'finite-well') {
        ctx.fillText(
          '有限深方势阱：阱内振荡 ψ(x) ∝ cos(kx) 或 sin(kx)，经典禁戒区 (|x| > L/2, E < V₀) 指数衰减 ψ(x) ∝ e^(-κ|x|)，其中 κ = √(2m(V₀-E))/ℏ',
          28, 490
        );
      } else if (state.potentialType === 'harmonic') {
        ctx.fillText(
          `量子谐振子 V(x) = ½kx²：等间距能级 Eₙ = ℏω(n + ½)，零点能 E₀ = ½ℏω = ${zpe.toFixed(2)} eV，本征态 ψₙ(x) = Nₙ Hₙ(αx) e^(-½α²x²)`,
          28, 490
        );
      } else {
        ctx.fillText(
          '非对称库仑势阱：能级随主量子数 n 增大而逐渐密集，波函数向势场较缓的右侧延伸并展现非对称隧穿渗透',
          28, 490
        );
      }
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        `当前势阱深度 V₀ = ${state.V0.toFixed(1)} eV  |  特征宽度 L = ${state.widthL.toFixed(2)} nm  |  海森堡不确定性 Δx·Δp ≥ ℏ/2 决定了零点能 E₀ > 0`,
        28, 512
      );

      ctx.restore();
    }

    return {
      id: 'quantum-bound-states',
      title: '量子束缚态 (Quantum Bound States)',
      width: W,
      height: H,
      state,
      init() {},
      reset() {
        state.potentialType = 'finite-well';
        state.V0 = 12.0;
        state.widthL = 1.2;
        state.mass = 1.0;
        state.stateIndex = 0;
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 6. 'bound-state-superposition' (束缚态叠加：含时波包振荡与质心运动)
  // ============================================================================
  function createBoundStateSuperposition() {
    const ui = createUIManager();
    const state = {
      wellType: 'box', // 'box' (Infinite Square Well) or 'harmonic' (Harmonic Oscillator)
      n1: 1,           // 1..5
      n2: 2,           // 1..5
      c1Sq: 0.50,      // |c1|^2 weight in [0, 1], |c2|^2 = 1 - c1Sq
      speed: 1.0,      // simulation time speed multiplier
      paused: false,
      time: 0,
      trail: []        // recent expectation value <x(t)> history
    };

    function getEnergies() {
      const E0 = 0.376; // eV base for L = 1 nm
      if (state.wellType === 'box') {
        return {
          E1: state.n1 * state.n1 * E0,
          E2: state.n2 * state.n2 * E0
        };
      } else {
        const hw = 0.65;
        return {
          E1: (state.n1 - 0.5) * hw,
          E2: (state.n2 - 0.5) * hw
        };
      }
    }

    function evalBasisPsi(n, u) {
      // u in [0, 1]
      if (state.wellType === 'box') {
        return Math.sqrt(2) * Math.sin(n * Math.PI * u);
      } else {
        // map u in [0, 1] to [-3.2, 3.2]
        const x = (u - 0.5) * 6.4;
        return evalHarmonicEigenstate(n - 1, x) * 2.1;
      }
    }

    function rebuildUI() {
      ui.clear();
      const px = 672, py = 54, pw = 206;

      ui.addButton('wt_box', px, py + 28, 100, 25, '无限深方势阱', () => {
        state.wellType = 'box';
        state.trail.length = 0;
      }, { active: state.wellType === 'box', color: '#38bdf8', fontSize: 11 });

      ui.addButton('wt_ho', px + 106, py + 28, 100, 25, '量子谐振子', () => {
        state.wellType = 'harmonic';
        state.trail.length = 0;
      }, { active: state.wellType === 'harmonic', color: '#a855f7', fontSize: 11 });

      // n1 selector (1..5)
      for (let i = 1; i <= 5; i++) {
        ui.addButton('n1_' + i, px + (i - 1) * 41, py + 76, 38, 22, `n₁=${i}`, () => {
          state.n1 = i;
          state.trail.length = 0;
        }, { active: state.n1 === i, color: '#38bdf8', fontSize: 10.5 });
      }

      // n2 selector (1..5)
      for (let i = 1; i <= 5; i++) {
        ui.addButton('n2_' + i, px + (i - 1) * 41, py + 114, 38, 22, `n₂=${i}`, () => {
          state.n2 = i;
          state.trail.length = 0;
        }, { active: state.n2 === i, color: '#f43f5e', fontSize: 10.5 });
      }

      ui.addSlider('c1Sq', px, py + 168, pw, '叠加权重 |c₁|² (|c₂|² = 1 - |c₁|²)', state.c1Sq, 0.0, 1.0, 0.05, (v) => {
        state.c1Sq = v;
      }, (v) => `${(v * 100).toFixed(0)}% : ${((1 - v) * 100).toFixed(0)}%`);

      ui.addSlider('speed', px, py + 218, pw, '演化时间倍率', state.speed, 0.2, 2.5, 0.1, (v) => {
        state.speed = v;
      }, (v) => `${v.toFixed(1)}x`);

      // Quick superposition presets
      ui.addButton('pre_12', px, py + 256, pw, 26, '经典偶极振荡 (n₁=1, n₂=2, 50:50)', () => {
        state.n1 = 1; state.n2 = 2; state.c1Sq = 0.5; state.trail.length = 0;
      }, { color: '#10b981', fontSize: 11 });

      ui.addButton('pre_13', px, py + 288, pw, 26, '对称呼吸模式 (n₁=1, n₂=3, 50:50)', () => {
        state.n1 = 1; state.n2 = 3; state.c1Sq = 0.5; state.trail.length = 0;
      }, { color: '#38bdf8', fontSize: 11 });

      ui.addButton('pause_btn', px, py + 324, pw, 28, state.paused ? '▶ 继续含时演化' : '⏸ 暂停含时演化', () => {
        state.paused = !state.paused;
      }, { active: state.paused, color: '#f59e0b', fontSize: 11.5 });
    }

    function update(dt, params) {
      if (params) {
        if (typeof params.n1 === 'number') state.n1 = clamp(Math.round(params.n1), 1, 5);
        if (typeof params.n2 === 'number') state.n2 = clamp(Math.round(params.n2), 1, 5);
        if (typeof params.c1Sq === 'number') state.c1Sq = clamp(params.c1Sq, 0, 1);
      }
      if (!state.paused) {
        state.time += (dt || 0.016) * state.speed;
      }
    }

    function render(ctx, params) {
      rebuildUI();
      const { E1, E2 } = getEnergies();
      const deltaE = Math.abs(E2 - E1);
      const c1 = Math.sqrt(state.c1Sq);
      const c2 = Math.sqrt(1 - state.c1Sq);

      // Angular frequencies scaled for crisp visual beat oscillation
      const w1 = E1 * 3.2;
      const w2 = E2 * 3.2;
      const beatOmega = Math.abs(w2 - w1);

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      drawPanel(
        ctx, 14, 10, 872, 36,
        '束缚态叠加 (Bound-State Superposition) — 非定态波包往复振荡与位置期望值 ⟨x(t)⟩',
        `拍频 ΔE = |E₂ - E₁| = ${deltaE.toFixed(3)} eV  |  ω₁₂ = ΔE/ℏ`
      );

      // Left & Center Main Canvas: Wavefunction Superposition & Expectation Value Trajectory
      drawPanel(
        ctx, 14, 54, 648, 405,
        `含时叠加态 Ψ(x,t) = ${c1.toFixed(2)}ψ_${state.n1}(x)e^(-iE_${state.n1}t/ℏ) + ${c2.toFixed(2)}ψ_${state.n2}(x)e^(-iE_${state.n2}t/ℏ)`,
        state.n1 === state.n2 ? '定态（无拍频振荡）' : `非定态拍频周期 T₁₂ = ${(2 * Math.PI / (beatOmega || 1)).toFixed(2)} fs`
      );

      const x0 = 64, x1 = 614, plotW = x1 - x0;
      const topMidY = 162;
      const probBaseY = 365;

      // Numerical integration of |Ψ(x,t)|^2 and expectation value <x(t)>
      const N = 180;
      let sumProb = 0;
      let sumXProb = 0;
      const pts = [];

      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const p1 = evalBasisPsi(state.n1, u);
        const p2 = evalBasisPsi(state.n2, u);

        const re = c1 * p1 * Math.cos(w1 * state.time) + c2 * p2 * Math.cos(w2 * state.time);
        const im = -c1 * p1 * Math.sin(w1 * state.time) - c2 * p2 * Math.sin(w2 * state.time);
        const prob = re * re + im * im;

        sumProb += prob;
        sumXProb += u * prob;
        pts.push({ px: x0 + u * plotW, u, re, im, prob });
      }

      const expU = sumProb > 0 ? sumXProb / sumProb : 0.5;
      const expPx = x0 + expU * plotW;

      if (!state.paused) {
        state.trail.push(expPx);
        if (state.trail.length > 90) state.trail.shift();
      }

      // Draw potential walls
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, 95);
      ctx.lineTo(x0, 415);
      ctx.moveTo(x1, 95);
      ctx.lineTo(x1, 415);
      ctx.stroke();

      // Top subplot: Re[Ψ(x,t)] and Im[Ψ(x,t)]
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, topMidY);
      ctx.lineTo(x1, topMidY);
      ctx.stroke();

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const y = topMidY - p.re * 34;
        if (idx === 0) ctx.moveTo(p.px, y);
        else ctx.lineTo(p.px, y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const y = topMidY - p.im * 34;
        if (idx === 0) ctx.moveTo(p.px, y);
        else ctx.lineTo(p.px, y);
      });
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Bottom subplot: Non-stationary probability envelope |Ψ(x,t)|^2
      ctx.beginPath();
      ctx.moveTo(x0, probBaseY);
      pts.forEach((p) => {
        ctx.lineTo(p.px, probBaseY - p.prob * 36);
      });
      ctx.lineTo(x1, probBaseY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(52, 211, 153, 0.28)';
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Expectation Value <x(t)> Center-of-Mass Ball & Trajectory
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(expPx, 100);
      ctx.lineTo(expPx, probBaseY + 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trail on axis
      state.trail.forEach((tx, idx) => {
        const alpha = (idx + 1) / state.trail.length;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.35})`;
        ctx.fillRect(tx - 1, probBaseY + 20, 2, 6);
      });

      // Center of mass sphere
      ctx.beginPath();
      ctx.arc(expPx, probBaseY + 23, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`位置期望值质心 ⟨x(t)⟩ = ${(expU * 1.0).toFixed(3)} L`, expPx, probBaseY + 46);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px sans-serif';
      ctx.fillText('Re[Ψ(x,t)] (蓝) / Im[Ψ(x,t)] (红)', x0 + 8, 108);
      ctx.fillStyle = '#34d399';
      ctx.fillText('非定态概率密度包络 |Ψ(x,t)|² = |c₁|²|ψ₁|² + |c₂|²|ψ₂|² + 2|c₁c₂|ψ₁ψ₂cos(ω₁₂t)', x0 + 8, 232);

      // Right Control Panel
      drawPanel(ctx, 672, 54, 214, 405, '叠加本征态与权重控制', '');
      ui.render(ctx);

      // Bottom Formula Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      const parityDiff = Math.abs(state.n1 - state.n2) % 2 === 1;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `含时叠加原理：|Ψ(x,t)|² 含交叉干涉项 2c₁c₂ψ₁(x)ψ₂(x)cos((E₂-E₁)t/ℏ)，以玻尔拍频 ω₁₂ = (E₂-E₁)/ℏ 驱动波包振荡`,
        28, 490
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      ctx.fillText(
        parityDiff
          ? `当前组合 (n₁=${state.n1}, n₂=${state.n2}) 宇称相反 ⇒ 偶极跃迁矩阵元 ⟨ψ₁|x|ψ₂⟩ ≠ 0，质心 ⟨x(t)⟩ 以频率 ω₁₂ 左右简谐往复运动！`
          : `当前组合 (n₁=${state.n1}, n₂=${state.n2}) 宇称相同 ⇒ ⟨ψ₁|x|ψ₂⟩ = 0，质心 ⟨x(t)⟩ 恒居中心 0.500 L，波包呈对称呼吸脉动！`,
        28, 512
      );

      ctx.restore();
    }

    return {
      id: 'bound-state-superposition',
      title: '束缚态叠加 (Bound-State Superposition)',
      width: W,
      height: H,
      state,
      init() {},
      reset() {
        state.wellType = 'box';
        state.n1 = 1;
        state.n2 = 2;
        state.c1Sq = 0.5;
        state.speed = 1.0;
        state.paused = false;
        state.trail.length = 0;
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // 7. 'band-structure' (能带结构：Kronig-Penney 周期势阱、能级分裂与固体的带隙)
  // ============================================================================
  function createBandStructure() {
    const ui = createUIManager();
    const N_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 20];

    const state = {
      N: 6,                 // Number of coupled periodic wells: 1, 2, 3, 4, 6, 8, 12, 20
      latticeA: 0.45,       // Barrier spacing / lattice constant parameter a (0.20 ~ 0.90 nm)
      barrierV0: 8.0,       // Barrier height V0 (3.0 ~ 16.0 eV)
      selectedBand: 0,      // 0 = Valence Band (n=1), 1 = Conduction Band (n=2)
      selectedKIndex: 0,    // Sub-level index k in [0, N-1]
      materialType: 'semiconductor', // 'metal', 'semiconductor', 'insulator'
      time: 0
    };

    function computeBandsForN(nWells) {
      // Tight-binding / Kronig-Penney dispersion for N coupled wells:
      // E_{band, m} = E_center(band) - 2 * t_hop(band) * cos(m * pi / (nWells + 1)), m = 1..nWells
      // Hopping integral t_hop increases exponentially as latticeA decreases or barrierV0 decreases
      const decay = Math.exp(-1.55 * state.latticeA * Math.sqrt(state.barrierV0 / 6.0));
      const E1Center = 2.4;
      const E2Center = 7.2 + (state.barrierV0 - 8.0) * 0.22;

      const t1 = clamp(1.85 * decay, 0.04, 1.15);
      const t2 = clamp(2.95 * decay, 0.08, 1.65);

      const valence = [];
      const conduction = [];
      for (let m = 1; m <= nWells; m++) {
        const cosK = nWells === 1 ? 0 : Math.cos((m * Math.PI) / (nWells + 1));
        valence.push(E1Center - 2 * t1 * cosK);
        conduction.push(E2Center - 2 * t2 * cosK);
      }
      valence.sort((a, b) => a - b);
      conduction.sort((a, b) => a - b);

      const vTop = valence[valence.length - 1];
      const cBot = conduction[0];
      const Eg = Math.max(0, cBot - vTop);

      return { valence, conduction, vTop, cBot, Eg, t1, t2 };
    }

    function rebuildUI() {
      ui.clear();
      const px = 672, py = 54, pw = 206;

      // N selector buttons (1, 2, 3, 4, 6, 8, 12, 20)
      N_OPTIONS.forEach((nVal, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        ui.addButton('N_' + nVal, px + col * 51, py + 28 + row * 26, 47, 22, `N=${nVal}`, () => {
          state.N = nVal;
          state.selectedKIndex = clamp(state.selectedKIndex, 0, nVal - 1);
        }, { active: state.N === nVal, fontSize: 11 });
      });

      ui.addSlider('latticeA', px, py + 104, pw, '晶格常数 / 势垒间距 a (nm)', state.latticeA, 0.20, 0.90, 0.05, (v) => {
        state.latticeA = v;
      }, (v) => `${v.toFixed(2)} nm`);

      ui.addSlider('barrierV0', px, py + 152, pw, '周期势垒高度 V₀ (eV)', state.barrierV0, 3.0, 16.0, 0.5, (v) => {
        state.barrierV0 = v;
      }, (v) => `${v.toFixed(1)} eV`);

      // Band & Bloch state selector
      ui.addButton('b_val', px, py + 190, 100, 24, '价带 (Valence)', () => {
        state.selectedBand = 0;
      }, { active: state.selectedBand === 0, color: '#38bdf8', fontSize: 11 });

      ui.addButton('b_cond', px + 106, py + 190, 100, 24, '导带 (Conduction)', () => {
        state.selectedBand = 1;
      }, { active: state.selectedBand === 1, color: '#a855f7', fontSize: 11 });

      ui.addSlider('kIdx', px, py + 236, pw, `布洛赫子能级索引 k (1 ~ ${state.N})`, state.selectedKIndex + 1, 1, Math.max(1, state.N), 1, (v) => {
        state.selectedKIndex = clamp(Math.round(v) - 1, 0, state.N - 1);
      }, (v) => `k = ${v} / ${state.N}`);

      // Material electronic filling mode buttons
      const mats = [
        { k: 'metal', label: '金属 (Metal: 半满导带/零带隙)' },
        { k: 'semiconductor', label: '半导体 (Semiconductor: 小带隙 Eg)' },
        { k: 'insulator', label: '绝缘体 (Insulator: 宽禁带 Eg ≫ kT)' }
      ];
      mats.forEach((m, i) => {
        ui.addButton('mat_' + m.k, px, py + 276 + i * 28, pw, 24, m.label, () => {
          state.materialType = m.k;
          if (m.k === 'metal') {
            state.latticeA = 0.25;
            state.barrierV0 = 4.5;
          } else if (m.k === 'semiconductor') {
            state.latticeA = 0.45;
            state.barrierV0 = 8.0;
          } else {
            state.latticeA = 0.75;
            state.barrierV0 = 14.0;
          }
        }, { active: state.materialType === m.k, color: '#10b981', fontSize: 10.5 });
      });
    }

    function update(dt, params) {
      if (params) {
        if (typeof params.N === 'number') state.N = params.N;
        if (typeof params.latticeA === 'number') state.latticeA = params.latticeA;
        if (typeof params.barrierV0 === 'number') state.barrierV0 = params.barrierV0;
      }
      state.time += dt || 0.016;
    }

    function render(ctx, params) {
      state.selectedKIndex = clamp(state.selectedKIndex, 0, state.N - 1);
      rebuildUI();
      const currentBands = computeBandsForN(state.N);

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      drawPanel(
        ctx, 14, 10, 872, 36,
        '固体能带结构 (Band Structure — Kronig-Penney 周期势与能级分裂)',
        `耦合原子数 N = ${state.N}  |  禁带宽度 E_g = ${currentBands.Eg.toFixed(2)} eV`
      );

      // Left Panel: Periodic Potential Array & Bloch Modulated Wavefunction ψ_k(x)
      drawPanel(
        ctx, 14, 54, 330, 405,
        `一维周期势阱阵列 (N = ${state.N}) 与 布洛赫波函数 ψₖ(x)`,
        `${state.selectedBand === 0 ? '价带' : '导带'} k=${state.selectedKIndex + 1}`
      );

      const pLeft = 32, pRight = 326, pW = pRight - pLeft;
      const potBaseY = 395, potTopY = 255;
      const psiMidY = 158;

      // Draw N periodic Kronig-Penney potential wells
      const cellW = pW / state.N;
      const barrierRatio = clamp(state.latticeA * 0.42, 0.12, 0.42);
      const wellW = cellW * (1 - barrierRatio);
      const barrierH = clamp((state.barrierV0 / 16) * (potBaseY - potTopY), 35, 135);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pLeft, potBaseY - barrierH);
      for (let i = 0; i < state.N; i++) {
        const cx = pLeft + i * cellW;
        const bW = cellW * barrierRatio * 0.5;
        ctx.lineTo(cx + bW, potBaseY - barrierH);
        ctx.lineTo(cx + bW, potBaseY);
        ctx.lineTo(cx + bW + wellW, potBaseY);
        ctx.lineTo(cx + bW + wellW, potBaseY - barrierH);
        ctx.lineTo(cx + cellW, potBaseY - barrierH);
      }
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw energy levels inside the periodic array
      const evToPotY = (ev) => potBaseY - (ev / 12.0) * 130;
      currentBands.valence.forEach((ev, idx) => {
        const y = evToPotY(ev);
        const isSel = state.selectedBand === 0 && idx === state.selectedKIndex;
        ctx.beginPath();
        ctx.moveTo(pLeft + 4, y);
        ctx.lineTo(pRight - 4, y);
        ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = isSel ? 2.2 : 1;
        ctx.stroke();
      });

      currentBands.conduction.forEach((ev, idx) => {
        const y = evToPotY(ev);
        const isSel = state.selectedBand === 1 && idx === state.selectedKIndex;
        ctx.beginPath();
        ctx.moveTo(pLeft + 4, y);
        ctx.lineTo(pRight - 4, y);
        ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = isSel ? 2.2 : 1;
        ctx.stroke();
      });

      // Draw Bloch wave envelope & modulated atomic orbitals ψ_k(x) = u_k(x) * sin(k x)
      const kMode = state.selectedKIndex + 1;
      const phaseTime = Math.cos(state.time * 3.5);

      // Slow Bloch envelope sin(k * pi * x / L_crystal)
      ctx.beginPath();
      for (let px = 0; px <= pW; px += 2) {
        const u = px / pW;
        const env = Math.sin((kMode * Math.PI * u));
        const y = psiMidY - env * 46;
        if (px === 0) ctx.moveTo(pLeft + px, y);
        else ctx.lineTo(pLeft + px, y);
      }
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Full Bloch wavefunction ψ_k(x)
      ctx.beginPath();
      for (let px = 0; px <= pW; px += 1.5) {
        const u = px / pW;
        const cellIndex = Math.floor(u * state.N);
        const localU = (u * state.N) - cellIndex;
        // Atomic orbital inside each cell (1s-like for valence, 2p-like for conduction)
        const atomicOrb = state.selectedBand === 0
          ? Math.sin(Math.PI * localU)
          : Math.sin(2 * Math.PI * localU);
        const blochEnv = state.N === 1 ? 1 : Math.sin((kMode * Math.PI * (cellIndex + 0.5)) / (state.N + 1));
        const psi = atomicOrb * blochEnv * phaseTime;
        const y = psiMidY - psi * 48;
        if (px === 0) ctx.moveTo(pLeft + px, y);
        else ctx.lineTo(pLeft + px, y);
      }
      ctx.strokeStyle = state.selectedBand === 0 ? '#38bdf8' : '#a855f7';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('布洛赫波函数 ψₖ(x) = uₖ(x)e^(ikx) （黄虚线为包络）', pLeft, 102);
      ctx.fillText('Kronig-Penney 周期势阱 V(x+a) = V(x)', pLeft, 242);
      ctx.restore();

      // Center Panel: Level Splitting Evolution vs N (N = 1 -> 2 -> 3 -> 4 -> 6 -> 8 -> 12 -> 20)
      drawPanel(
        ctx, 352, 54, 312, 405,
        '能级分裂演化图 (N = 1 → 20 准连续能带)',
        `带隙 Eg = ${currentBands.Eg.toFixed(2)} eV`
      );

      const eLeft = 382, eRight = 648, eTop = 98, eBot = 412;
      const eW = eRight - eLeft;
      const evToDiagramY = (ev) => eBot - clamp(ev / 11.2, 0, 1.0) * (eBot - eTop);

      ctx.save();
      const colW = eW / N_OPTIONS.length;

      N_OPTIONS.forEach((nVal, colIdx) => {
        const sp = computeBandsForN(nVal);
        const cx = eLeft + colIdx * colW + colW * 0.5;
        const isCurrentN = nVal === state.N;

        if (isCurrentN) {
          roundRect(ctx, cx - colW * 0.45, eTop - 6, colW * 0.9, eBot - eTop + 26, 6);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.stroke();
        }

        // Draw Valence sub-levels (filled with electrons)
        sp.valence.forEach((ev) => {
          const ly = evToDiagramY(ev);
          ctx.beginPath();
          ctx.moveTo(cx - colW * 0.34, ly);
          ctx.lineTo(cx + colW * 0.34, ly);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = isCurrentN ? 2.0 : 1.2;
          ctx.stroke();
        });

        // Draw Conduction sub-levels (partially filled in metal, empty in insulator)
        sp.conduction.forEach((ev, kIdx) => {
          const ly = evToDiagramY(ev);
          const isFilledMetal = state.materialType === 'metal' && kIdx < Math.ceil(nVal / 2);
          ctx.beginPath();
          ctx.moveTo(cx - colW * 0.34, ly);
          ctx.lineTo(cx + colW * 0.34, ly);
          ctx.strokeStyle = isFilledMetal ? '#34d399' : '#a855f7';
          ctx.lineWidth = isCurrentN ? 2.0 : 1.2;
          ctx.stroke();
        });

        // N column label
        ctx.fillStyle = isCurrentN ? '#38bdf8' : '#94a3b8';
        ctx.font = (isCurrentN ? 'bold ' : '') + '10.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`N=${nVal}`, cx, eBot + 15);
      });

      // Highlight Band Gap Eg between Valence Band Top and Conduction Band Bottom
      const vTopY = evToDiagramY(currentBands.vTop);
      const cBotY = evToDiagramY(currentBands.cBot);
      if (vTopY > cBotY + 4) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
        ctx.fillRect(eLeft, cBotY, eW, vTopY - cBotY);

        // Fermi level E_F dashed line in the middle of the band gap
        const fermiY = (vTopY + cBotY) / 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(eLeft, fermiY);
        ctx.lineTo(eRight, fermiY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`禁带 Eg = ${currentBands.Eg.toFixed(2)} eV (E_F)`, eRight - 4, fermiY - 4);
      }

      // Labels for Conduction and Valence bands
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('导带 (Conduction Band)', eLeft + 4, eTop + 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('价带 (Valence Band, 电子填满)', eLeft + 4, eBot - 10);
      ctx.restore();

      // Right Control Panel
      drawPanel(ctx, 672, 54, 214, 405, '晶体周期势与电子填充控制', '');
      ui.render(ctx);

      // Bottom Physics Bar
      drawPanel(ctx, 14, 467, 872, 62, '', '');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12.5px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `布洛赫定理 (Bloch's Theorem)：ψₖ(x) = uₖ(x)e^(ikx)  |  紧束缚色散：E(k) = E₀ - 2t cos(ka)，N 个耦合原子将每条原子能级分裂为 N 条子能级`,
        28, 490
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11.5px "Inter", "PingFang SC", sans-serif';
      const matDesc = state.materialType === 'metal'
        ? '金属导体：导带半满或价带与导带交叠，电子在外加电场下可直接跃迁导电'
        : state.materialType === 'semiconductor'
          ? `半导体：禁带宽度适中 (Eg = ${currentBands.Eg.toFixed(2)} eV)，室温热激发或光照可将价带电子激发至导带形成电子-空穴导电`
          : `绝缘体：晶格间距较大、势垒高，禁带极宽 (Eg = ${currentBands.Eg.toFixed(2)} eV ≫ k_BT)，价带满而导带全空`;
      ctx.fillText(matDesc, 28, 512);

      ctx.restore();
    }

    return {
      id: 'band-structure',
      title: '能带结构 (Band Structure)',
      width: W,
      height: H,
      state,
      init() {},
      reset() {
        state.N = 6;
        state.latticeA = 0.45;
        state.barrierV0 = 8.0;
        state.selectedBand = 0;
        state.selectedKIndex = 0;
        state.materialType = 'semiconductor';
      },
      update,
      render,
      onPointerDown(x, y) { return ui.handlePointerDown(x, y); },
      onPointerMove(x, y) { return ui.handlePointerMove(x, y); },
      onPointerUp() { ui.handlePointerUp(); },
      onMouseDown(x, y) { return ui.handlePointerDown(x, y); },
      onMouseMove(x, y) { return ui.handlePointerMove(x, y); },
      onMouseUp() { ui.handlePointerUp(); }
    };
  }

  // ============================================================================
  // Register All 7 Simulations via window.registerSim(id, config)
  // Supporting both factory function and direct object instance conventions
  // ============================================================================
  const SIM_FACTORIES = {
    'quantum-wave-interference': createQuantumWaveInterference,
    'quantum-coin-toss': createQuantumCoinToss,
    'quantum-measurement': createQuantumMeasurement,
    'particle-in-a-box': createParticleInABox,
    'quantum-bound-states': createQuantumBoundStates,
    'bound-state-superposition': createBoundStateSuperposition,
    'band-structure': createBandStructure
  };

  const QUANTUM_SIDEBAR_META = {
    "quantum-wave-interference": {
      controls: [
        { type: "select", id: "particle", label: "入射量子粒子", options: [{value:"photon",label:"光子 (Photon)"},{value:"electron",label:"电子 (Electron)"},{value:"neutron",label:"中子 (Neutron)"},{value:"helium",label:"氦原子 (He)"}], default: "photon" },
        { type: "range", id: "wavelength", label: "波长参数 λ", min: 260, max: 700, step: 5, default: 520, unit: "nm" },
        { type: "range", id: "slitSep", label: "双缝间距 d", min: 0.6, max: 3.0, step: 0.1, default: 1.5, unit: "μm" },
        { type: "range", id: "slitWidth", label: "单缝宽度 a", min: 0.1, max: 0.9, step: 0.05, default: 0.35, unit: "μm" },
        { type: "select", id: "whichWay", label: "路径探测器 (Which-Way)", options: [{value:"none",label:"关闭探测器 (相干干涉)"},{value:"left",label:"左缝探测器 (坍缩)"},{value:"right",label:"右缝探测器 (坍缩)"}], default: "none" }
      ],
      getReadouts: (s) => [
        { label: "探测屏累积亮点 N", value: String(s.totalHits || 0) },
        { label: "双缝间距 d", value: Number(s.slitSep || 1.5).toFixed(1) + " μm" },
        { label: "状态", value: s.whichWay === "none" ? "相干叠加干涉" : "路径测量坍缩" }
      ]
    },
    "quantum-coin-toss": {
      controls: [
        { type: "select", id: "mode", label: "硬币类型", options: [{value:"quantum",label:"量子硬币 |ψ⟩"},{value:"classical",label:"经典硬币 50/50"}], default: "quantum" },
        { type: "range", id: "probUp", label: "向上概率 |α|²", min: 0, max: 1, step: 0.01, default: 0.5, unit: "" },
        { type: "range", id: "phaseDeg", label: "相对相位 φ", min: 0, max: 360, step: 5, default: 0, unit: "°" }
      ],
      getReadouts: (s) => [
        { label: "理论 P(↑)", value: ((s.probUp || 0.5) * 100).toFixed(1) + "%" },
        { label: "总测量次数 N", value: String((s.quantumCounts && s.quantumCounts.total) || 0) },
        { label: "最近坍缩结果", value: s.lastOutcome === "up" ? "|↑⟩ 正面" : "|↓⟩ 反面" }
      ]
    },
    "quantum-measurement": {
      controls: [
        { type: "range", id: "initTheta", label: "初态极角 θ", min: 0, max: 180, step: 5, default: 90, unit: "°" },
        { type: "range", id: "initPhi", label: "初态方位角 φ", min: 0, max: 360, step: 15, default: 0, unit: "°" }
      ],
      getReadouts: (s) => [
        { label: "初态极角 θ", value: (s.initTheta || 0) + "°" },
        { label: "SG₁/SG₂/SG₃ 轴角", value: (s.sgAngles || [0,90,0]).join("° / ") + "°" }
      ]
    },
    "particle-in-a-box": {
      controls: [
        { type: "range", id: "n", label: "主量子数 n", min: 1, max: 8, step: 1, default: 1, unit: "" },
        { type: "range", id: "L", label: "势阱宽度 L", min: 0.2, max: 2.0, step: 0.05, default: 1.0, unit: "nm" },
        { type: "range", id: "m", label: "粒子质量 m", min: 0.5, max: 5.0, step: 0.1, default: 1.0, unit: "mₑ" },
        { type: "checkbox", id: "showReal", label: "显示波函数实部 Re[ψ]", default: true },
        { type: "checkbox", id: "showImag", label: "显示波函数虚部 Im[ψ]", default: true },
        { type: "checkbox", id: "showProb", label: "显示概率密度 |ψ|²", default: true }
      ],
      getReadouts: (s) => {
        const En = ((s.n || 1) ** 2 * 0.37603) / ((s.m || 1) * (s.L || 1) ** 2);
        return [
          { label: "主量子数 n", value: String(s.n || 1) },
          { label: "本征能量 Eₙ", value: En.toFixed(3) + " eV" },
          { label: "节点数 (n-1)", value: String((s.n || 1) - 1) }
        ];
      }
    },
    "quantum-bound-states": {
      controls: [
        { type: "select", id: "potentialType", label: "势场类型", options: [{value:"finite-well",label:"有限深方势阱"},{value:"harmonic",label:"量子谐振子"},{value:"coulomb",label:"非对称/库仑势"}], default: "finite-well" },
        { type: "range", id: "V0", label: "势阱深度 V₀", min: 4.0, max: 24.0, step: 0.5, default: 12.0, unit: "eV" },
        { type: "range", id: "widthL", label: "特征宽度 L", min: 0.5, max: 1.8, step: 0.05, default: 1.2, unit: "nm" },
        { type: "range", id: "mass", label: "有效质量 m", min: 0.5, max: 3.0, step: 0.1, default: 1.0, unit: "mₑ" }
      ],
      getReadouts: (s) => [
        { label: "势场模型", value: s.potentialType || "finite-well" },
        { label: "势阱深度 V₀", value: Number(s.V0 || 12).toFixed(1) + " eV" },
        { label: "特征宽度 L", value: Number(s.widthL || 1.2).toFixed(2) + " nm" }
      ]
    },
    "bound-state-superposition": {
      controls: [
        { type: "select", id: "wellType", label: "势阱类型", options: [{value:"box",label:"无限深方势阱"},{value:"harmonic",label:"量子谐振子"}], default: "box" },
        { type: "range", id: "n1", label: "本征态 n₁", min: 1, max: 5, step: 1, default: 1, unit: "" },
        { type: "range", id: "n2", label: "本征态 n₂", min: 1, max: 5, step: 1, default: 2, unit: "" },
        { type: "range", id: "c1Sq", label: "叠加权重 |c₁|²", min: 0, max: 1, step: 0.05, default: 0.5, unit: "" },
        { type: "range", id: "speed", label: "演化速率", min: 0.2, max: 2.5, step: 0.1, default: 1.0, unit: "x" }
      ],
      getReadouts: (s) => [
        { label: "叠加态组合", value: `|ψ_${s.n1||1}⟩ + |ψ_${s.n2||2}⟩` },
        { label: "权重比 |c₁|²:|c₂|²", value: `${Math.round((s.c1Sq||0.5)*100)}% : ${Math.round((1-(s.c1Sq||0.5))*100)}%` }
      ]
    },
    "band-structure": {
      controls: [
        { type: "select", id: "materialType", label: "固体能带类型预设", options: [{value:"metal",label:"金属 (Metal)"},{value:"semiconductor",label:"半导体 (Semiconductor)"},{value:"insulator",label:"绝缘体 (Insulator)"}], default: "semiconductor" },
        { type: "range", id: "latticeA", label: "晶格常数 a", min: 0.20, max: 0.90, step: 0.05, default: 0.45, unit: "nm" },
        { type: "range", id: "barrierV0", label: "周期势垒高度 V₀", min: 3.0, max: 16.0, step: 0.5, default: 8.0, unit: "eV" }
      ],
      getReadouts: (s) => [
        { label: "耦合原子数 N", value: String(s.N || 6) },
        { label: "晶格常数 a", value: Number(s.latticeA || 0.45).toFixed(2) + " nm" },
        { label: "材料类型", value: s.materialType || "semiconductor" }
      ]
    }
  };

  Object.keys(SIM_FACTORIES).forEach((id) => {
    const instance = SIM_FACTORIES[id]();
    const meta = QUANTUM_SIDEBAR_META[id] || {};
    const wrapped = {
      id,
      title: instance.title,
      controls: meta.controls || [],
      init(state) {
        instance.reset();
        Object.assign(state, instance.state);
      },
      update(dt, state) {
        instance.update(dt);
        Object.assign(state, instance.state);
      },
      render(ctx, width, height, state) {
        instance.render(ctx);
      },
      onParamChange(key, val, state) {
        instance.state[key] = val;
        if (id === "quantum-wave-interference" && (key === "particle" || key === "wavelength" || key === "slitSep" || key === "slitWidth" || key === "whichWay")) {
          instance.init();
        }
        if (id === "band-structure" && key === "materialType") {
          if (val === "metal") { instance.state.latticeA = 0.25; instance.state.barrierV0 = 4.5; }
          else if (val === "semiconductor") { instance.state.latticeA = 0.45; instance.state.barrierV0 = 8.0; }
          else { instance.state.latticeA = 0.75; instance.state.barrierV0 = 14.0; }
        }
        Object.assign(state, instance.state);
      },
      getReadouts(state) {
        return meta.getReadouts ? meta.getReadouts(instance.state) : [];
      },
      onPointerDown(x, y) { return instance.onPointerDown(x, y); },
      onPointerMove(x, y) { return instance.onPointerMove(x, y); },
      onPointerUp(x, y) { return instance.onPointerUp(x, y); }
    };
    window.registerSim(id, wrapped);
  });
})();
