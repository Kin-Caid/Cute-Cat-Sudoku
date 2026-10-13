// Puzzle generator + solver. Pure functions, no DOM.
// Works in the browser (window.CatGen) and in Node (module.exports).
(function (root) {
  'use strict';

  // ---------- seeded random ----------
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function range(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return a;
  }

  // ---------- step 1: a valid cat placement ----------
  // cols[r] = column of the cat in row r. Neighbouring rows differ by >= 2,
  // which covers rows, columns and the no-touching rule at once.
  function placeCats(n, rng) {
    var cols = [];
    var used = [];
    function go(r) {
      if (r === n) return true;
      var options = shuffle(range(n), rng);
      for (var i = 0; i < options.length; i++) {
        var c = options[i];
        if (used[c]) continue;
        if (r > 0 && Math.abs(c - cols[r - 1]) < 2) continue;
        used[c] = true; cols[r] = c;
        if (go(r + 1)) return true;
        used[c] = false;
      }
      return false;
    }
    return go(0) ? cols : null;
  }

  function neighbours4(n, idx) {
    var r = Math.floor(idx / n), c = idx % n, out = [];
    if (r > 0) out.push(idx - n);
    if (r < n - 1) out.push(idx + n);
    if (c > 0) out.push(idx - 1);
    if (c < n - 1) out.push(idx + 1);
    return out;
  }

  // ---------- step 2: grow coloured regions from each cat ----------
  function growRegions(n, cols, rng) {
    var regions = new Array(n * n).fill(-1);
    for (var r = 0; r < n; r++) regions[r * n + cols[r]] = r;
    var remaining = n * n - n;
    while (remaining > 0) {
      // collect (from -> to) growth candidates
      var cands = [];
      for (var i = 0; i < n * n; i++) {
        if (regions[i] < 0) continue;
        var nb = neighbours4(n, i);
        for (var k = 0; k < nb.length; k++) {
          if (regions[nb[k]] < 0) cands.push([i, nb[k]]);
        }
      }
      var pick = cands[Math.floor(rng() * cands.length)];
      regions[pick[1]] = regions[pick[0]];
      remaining--;
    }
    return regions;
  }

  // ---------- solver ----------
  // Returns up to `limit` solutions (arrays of columns per row).
  function solve(n, regions, limit) {
    limit = limit || 2;
    var sols = [];
    var cols = [];
    var usedCol = [];
    var usedReg = [];
    function go(r) {
      if (sols.length >= limit) return;
      if (r === n) { sols.push(cols.slice()); return; }
      for (var c = 0; c < n; c++) {
        if (usedCol[c]) continue;
        if (r > 0 && Math.abs(c - cols[r - 1]) < 2) continue;
        var g = regions[r * n + c];
        if (usedReg[g]) continue;
        usedCol[c] = true; usedReg[g] = true; cols[r] = c;
        go(r + 1);
        usedCol[c] = false; usedReg[g] = false;
        if (sols.length >= limit) return;
      }
    }
    go(0);
    return sols;
  }

  // Is region g still connected if we remove cell `skip`?
  function connectedWithout(n, regions, g, skip) {
    var cells = [];
    for (var i = 0; i < n * n; i++) if (regions[i] === g && i !== skip) cells.push(i);
    if (cells.length === 0) return false;
    var seen = {}; seen[cells[0]] = true;
    var stack = [cells[0]], count = 1;
    while (stack.length) {
      var cur = stack.pop();
      var nb = neighbours4(n, cur);
      for (var k = 0; k < nb.length; k++) {
        var x = nb[k];
        if (x !== skip && regions[x] === g && !seen[x]) {
          seen[x] = true; count++; stack.push(x);
        }
      }
    }
    return count === cells.length;
  }

  // ---------- step 3: nudge regions until the solution is unique ----------
  function makeUnique(n, cols, regions, rng, maxSteps) {
    for (var step = 0; step < maxSteps; step++) {
      var sols = solve(n, regions, 2);
      var other = null;
      for (var s = 0; s < sols.length; s++) {
        if (sols[s].join() !== cols.join()) { other = sols[s]; break; }
      }
      if (!other) return true;

      // Steal one of the other solution's cat cells into a neighbouring region.
      // That gives the other solution two cats in one colour, killing it.
      // These cells are never our own cats, so our solution survives.
      var rows = shuffle(range(n).filter(function (r) { return other[r] !== cols[r]; }), rng);
      var moved = false;
      for (var i = 0; i < rows.length && !moved; i++) {
        var cell = rows[i] * n + other[rows[i]];
        var g = regions[cell];
        if (!connectedWithout(n, regions, g, cell)) continue;
        var nbs = shuffle(neighbours4(n, cell), rng);
        for (var k = 0; k < nbs.length; k++) {
          var h = regions[nbs[k]];
          if (h !== g) { regions[cell] = h; moved = true; break; }
        }
      }
      if (!moved) return false;
    }
    return false;
  }

  // ---------- public API ----------
  function generate(n, seed) {
    var rng = makeRng(typeof seed === 'string' ? hashString(seed) : seed);
    for (var attempt = 0; attempt < 500; attempt++) {
      var cols = placeCats(n, rng);
      if (!cols) continue;
      var regions = growRegions(n, cols, rng);
      if (makeUnique(n, cols, regions, rng, n * n * 2)) {
        return { size: n, regions: regions, solution: cols };
      }
    }
    throw new Error('Could not generate a ' + n + 'x' + n + ' puzzle');
  }

  // Normal: 5x5 for levels 1-3, then 6x6. Hard: 7x7. Ultra: 8x8.
  function sizeFor(difficulty, level) {
    if (difficulty === 'hard') return 7;
    if (difficulty === 'ultra') return 8;
    return level <= 3 ? 5 : 6;
  }

  function puzzleFor(difficulty, level) {
    return generate(sizeFor(difficulty, level), 'cats-' + difficulty + '-' + level);
  }

  var api = {
    generate: generate,
    solve: solve,
    sizeFor: sizeFor,
    puzzleFor: puzzleFor,
    hashString: hashString,
    makeRng: makeRng
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CatGen = api;
})(typeof window !== 'undefined' ? window : this);
