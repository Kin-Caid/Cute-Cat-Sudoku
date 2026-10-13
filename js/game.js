// Game state and rules for one level. No DOM here; ui.js draws it.
(function () {
  'use strict';

  var EMPTY = 0, PAW = 1, CAT = 2;
  var MAX_HEARTS = 3;

  function Game(puzzle, saved) {
    this.n = puzzle.size;
    this.regions = puzzle.regions;
    this.solution = puzzle.solution;
    this.cells = saved && saved.cells && saved.cells.length === this.n * this.n
      ? saved.cells.slice()
      : new Array(this.n * this.n).fill(EMPTY);
    this.hearts = saved && typeof saved.hearts === 'number' ? saved.hearts : MAX_HEARTS;
    this.history = [];
  }

  Game.prototype.rc = function (idx) {
    return { r: Math.floor(idx / this.n), c: idx % this.n };
  };

  Game.prototype.isSolutionCell = function (idx) {
    var p = this.rc(idx);
    return this.solution[p.r] === p.c;
  };

  Game.prototype.catCount = function () {
    return this.cells.filter(function (x) { return x === CAT; }).length;
  };

  Game.prototype.isWon = function () {
    return this.catCount() === this.n;
  };

  Game.prototype.snapshot = function () {
    this.history.push(this.cells.slice());
    if (this.history.length > 200) this.history.shift();
  };

  Game.prototype.undo = function () {
    if (!this.history.length) return false;
    this.cells = this.history.pop();
    return true;
  };

  // Why can't a cat go here? Returns a friendly reason, or null if it only
  // breaks the hidden solution (not an obvious rule).
  Game.prototype.conflictReason = function (idx) {
    var p = this.rc(idx), g = this.regions[idx];
    for (var i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== CAT) continue;
      var q = this.rc(i);
      if (q.r === p.r) return { text: 'There’s already a cat in this row!', other: i };
      if (q.c === p.c) return { text: 'There’s already a cat in this column!', other: i };
      if (this.regions[i] === g) return { text: 'This color already has a cat!', other: i };
      if (Math.abs(q.r - p.r) <= 1 && Math.abs(q.c - p.c) <= 1) {
        return { text: 'Cats don’t like to touch, even corners!', other: i };
      }
    }
    return null;
  };

  // Try to place a cat. Returns { result: 'ignored' | 'correct' | 'wrong' | 'won', reason }
  Game.prototype.placeCat = function (idx, opts) {
    opts = opts || {};
    if (this.cells[idx] === CAT) return { result: 'ignored' };
    if (!this.isSolutionCell(idx)) {
      if (!opts.relaxed) this.hearts = Math.max(0, this.hearts - 1);
      return { result: 'wrong', reason: this.conflictReason(idx) };
    }
    this.snapshot();
    this.cells[idx] = CAT;
    if (opts.autoPaw) this.autoPaw(idx);
    return { result: this.isWon() ? 'won' : 'correct' };
  };

  // Mark every cell the new cat rules out with a paw print.
  Game.prototype.autoPaw = function (idx) {
    var p = this.rc(idx), g = this.regions[idx];
    for (var i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== EMPTY) continue;
      var q = this.rc(i);
      if (q.r === p.r || q.c === p.c || this.regions[i] === g ||
          (Math.abs(q.r - p.r) <= 1 && Math.abs(q.c - p.c) <= 1)) {
        this.cells[i] = PAW;
      }
    }
  };

  Game.prototype.toggleMark = function (idx) {
    if (this.cells[idx] === CAT) return false;
    this.snapshot();
    this.cells[idx] = this.cells[idx] === PAW ? EMPTY : PAW;
    return true;
  };

  // Pick the most helpful missing cat: the one whose colour has the fewest
  // open cells left. Places it and returns its index.
  Game.prototype.hint = function (opts) {
    var self = this, best = -1, bestOpen = Infinity;
    for (var r = 0; r < this.n; r++) {
      var idx = r * this.n + this.solution[r];
      if (this.cells[idx] === CAT) continue;
      var g = this.regions[idx], open = 0;
      this.cells.forEach(function (x, i) {
        if (self.regions[i] === g && x === EMPTY) open++;
      });
      if (open < bestOpen) { bestOpen = open; best = idx; }
    }
    if (best < 0) return -1;
    this.snapshot();
    this.cells[best] = CAT;
    if (opts && opts.autoPaw) this.autoPaw(best);
    return best;
  };

  // keepHistory lets Undo bring back the board after an accidental restart.
  Game.prototype.reset = function (keepHistory) {
    if (keepHistory) this.snapshot();
    else this.history = [];
    this.cells = new Array(this.n * this.n).fill(EMPTY);
    this.hearts = MAX_HEARTS;
  };

  Game.prototype.toSave = function () {
    return { cells: this.cells.slice(), hearts: this.hearts };
  };

  window.CatGame = { Game: Game, EMPTY: EMPTY, PAW: PAW, CAT: CAT, MAX_HEARTS: MAX_HEARTS };
})();
