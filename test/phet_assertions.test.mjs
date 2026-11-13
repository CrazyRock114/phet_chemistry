import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('PhET Chemistry - Catalog Completeness (42 Simulations Across 7 Categories)', () => {
  const catalogCode = fs.readFileSync(path.join(rootDir, 'js/catalog.js'), 'utf8');
  const mockWindow = {
    PHET_REGISTRY: {},
    registerSim: () => {}
  };

  const evalContext = new Function('window', catalogCode);
  evalContext(mockWindow);

  const catalog = mockWindow.PHET_CATALOG;
  assert.ok(Array.isArray(catalog), 'PHET_CATALOG must be an array');
  assert.equal(catalog.length, 42, 'Must contain exactly 42 chemistry simulations');

  const expectedCategories = {
    atomic: 7,
    molecules: 7,
    reactions: 2,
    states: 7,
    solutions: 7,
    'electro-wave': 4,
    quantum: 8
  };

  const actualCounts = {};
  const ids = new Set();

  for (const sim of catalog) {
    assert.ok(sim.id, 'Every simulation must have an id');
    assert.ok(sim.nameZh, `Sim ${sim.id} must have nameZh`);
    assert.ok(sim.nameEn, `Sim ${sim.id} must have nameEn`);
    assert.ok(sim.category, `Sim ${sim.id} must have category`);
    assert.ok(sim.url, `Sim ${sim.id} must have reference url`);
    assert.ok(sim.summary, `Sim ${sim.id} must have summary description`);

    assert.ok(!ids.has(sim.id), `Duplicate simulation id found: ${sim.id}`);
    ids.add(sim.id);

    actualCounts[sim.category] = (actualCounts[sim.category] || 0) + 1;
  }

  for (const [cat, expectedCount] of Object.entries(expectedCategories)) {
    assert.equal(
      actualCounts[cat],
      expectedCount,
      `Category ${cat} must contain ${expectedCount} simulations (found ${actualCounts[cat]})`
    );
  }
});

test('PhET Chemistry - Simulation Implementation Files Completeness', () => {
  const jsDir = path.join(rootDir, 'js');
  const expectedFiles = [
    'catalog.js',
    'engine.js',
    'sims_atomic.js',
    'sims_molecules.js',
    'sims_quantum.js',
    'sims_reactions_states1.js',
    'sims_solutions2_electrowave.js',
    'sims_states2_solutions1.js'
  ];

  for (const file of expectedFiles) {
    const fullPath = path.join(jsDir, file);
    assert.ok(fs.existsSync(fullPath), `Missing JS file: js/${file}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 1000, `File js/${file} must have valid content (size > 1KB)`);
  }
});

test('PhET Chemistry - Ecosystem Nav Integration in index.html & all-in-one HTML', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('https://www.igcse.xyz/ecosystem-nav.js') || indexHtml.includes('https://igcse.xyz/ecosystem-nav.js'),
    'index.html must load ecosystem-nav.js'
  );
  assert.ok(
    indexHtml.includes('<igcse-nav active="phet" sticky>'),
    'index.html must mount <igcse-nav active="phet" sticky>'
  );

  const allSimsHtml = fs.readFileSync(path.join(rootDir, 'phet_chemistry_all_42_sims.html'), 'utf8');
  assert.ok(
    allSimsHtml.includes('https://www.igcse.xyz/ecosystem-nav.js') || allSimsHtml.includes('https://igcse.xyz/ecosystem-nav.js'),
    'phet_chemistry_all_42_sims.html must load ecosystem-nav.js'
  );
  assert.ok(
    allSimsHtml.includes('<igcse-nav active="phet" sticky>'),
    'phet_chemistry_all_42_sims.html must mount <igcse-nav active="phet" sticky>'
  );
});

test('PhET Chemistry - DEFECT-PHET-NAV-ZINDEX-COLLISION Vaccine Assertion', () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const allSimsHtml = fs.readFileSync(path.join(rootDir, 'phet_chemistry_all_42_sims.html'), 'utf8');

  // Verify .workspace-overlay z-index is >= 100000 in both files to avoid collision with <igcse-nav> (z-index: 99990)
  const zIndexRegex = /\.workspace-overlay\s*\{[^}]*?z-index:\s*(\d+)/s;
  
  const stylesMatch = stylesCss.match(zIndexRegex);
  assert.ok(stylesMatch, 'styles.css must declare z-index on .workspace-overlay');
  assert.ok(
    parseInt(stylesMatch[1], 10) >= 100000,
    `styles.css .workspace-overlay z-index must be >= 100000 (found ${stylesMatch[1]})`
  );

  const htmlMatch = allSimsHtml.match(zIndexRegex);
  assert.ok(htmlMatch, 'phet_chemistry_all_42_sims.html must declare z-index on .workspace-overlay');
  assert.ok(
    parseInt(htmlMatch[1], 10) >= 100000,
    `phet_chemistry_all_42_sims.html .workspace-overlay z-index must be >= 100000 (found ${htmlMatch[1]})`
  );
});
