// Run with: node tests/generator.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const CatGen = require(path.join(__dirname, '..', 'js', 'generator.js'));

function checkRules(p) {
  const n = p.size, cols = p.solution;
  assert.strictEqual(cols.length, n, 'one cat per row');
  assert.strictEqual(new Set(cols).size, n, 'one cat per column');
  const regs = cols.map((c, r) => p.regions[r * n + c]);
  assert.strictEqual(new Set(regs).size, n, 'one cat per colour');
  for (let r = 1; r < n; r++) {
    assert.ok(Math.abs(cols[r] - cols[r - 1]) >= 2, 'cats must not touch');
  }
}

function checkRegions(p) {
  const n = p.size;
  for (let g = 0; g < n; g++) {
    const cells = [];
    p.regions.forEach((x, i) => { if (x === g) cells.push(i); });
    assert.ok(cells.length > 0, 'region ' + g + ' is empty');
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const cur = stack.pop();
      const r = Math.floor(cur / n), c = cur % n;
      const nbs = [];
      if (r > 0) nbs.push(cur - n);
      if (r < n - 1) nbs.push(cur + n);
      if (c > 0) nbs.push(cur - 1);
      if (c < n - 1) nbs.push(cur + 1);
      for (const x of nbs) {
        if (p.regions[x] === g && !seen.has(x)) { seen.add(x); stack.push(x); }
      }
    }
    assert.strictEqual(seen.size, cells.length, 'region ' + g + ' is not connected');
  }
}

let failures = 0;
for (const n of [5, 6, 7, 8]) {
  let worst = 0;
  for (let i = 0; i < 50; i++) {
    const t0 = Date.now();
    const p = CatGen.generate(n, 'test-' + n + '-' + i);
    const ms = Date.now() - t0;
    worst = Math.max(worst, ms);
    try {
      checkRules(p);
      checkRegions(p);
      const sols = CatGen.solve(n, p.regions, 2);
      assert.strictEqual(sols.length, 1, 'puzzle must have exactly one solution');
      assert.deepStrictEqual(sols[0], p.solution);
    } catch (e) {
      failures++;
      console.error(`FAIL ${n}x${n} #${i}: ${e.message}`);
    }
  }
  console.log(`${n}x${n}: 50 puzzles ok-checked, slowest ${worst} ms`);
  if (worst > 200) console.warn(`  warning: slowest ${n}x${n} took over 200 ms`);
}

// Same seed -> same puzzle
const a = CatGen.puzzleFor('hard', 4), b = CatGen.puzzleFor('hard', 4);
assert.deepStrictEqual(a, b, 'puzzles must be deterministic');

if (failures) { console.error(failures + ' failures'); process.exit(1); }
console.log('All generator tests passed.');
