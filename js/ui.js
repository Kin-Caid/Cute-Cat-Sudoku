// Draws the game, handles taps and dialogs. Entry point of the app.
(function () {
  'use strict';

  var G = window.CatGame, Art = window.CatArt, Audio = window.CatAudio;
  var $ = function (id) { return document.getElementById(id); };

  var PAW_SVG = '<svg viewBox="0 0 100 100" class="paw-svg" aria-hidden="true"><g fill="currentColor">' +
    '<ellipse cx="50" cy="64" rx="19" ry="16"/><circle cx="27" cy="43" r="8"/><circle cx="41" cy="30" r="8.5"/>' +
    '<circle cx="59" cy="30" r="8.5"/><circle cx="73" cy="43" r="8"/></g></svg>';
  var HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8 3 4 6.8 4c2.2 0 3.7 1.3 4.6 2.6.2.3.6.3.8 0C13.1 5.3 14.6 4 16.8 4 20.7 4 22.8 8 21.4 11.6 19.5 16.4 12 21 12 21Z"/></svg>';

  var state = CatStorage.load();
  var game = null;
  var mode = 'cat';
  var tiles = [];
  var shown = [];      // what each tile currently displays, to avoid redraws
  var locked = false;  // true while the win/lose animation runs

  Audio.setEnabled(state.settings.sound);

  // ---------- level loading ----------
  function loadLevel() {
    var diff = state.difficulty;
    var level = state.level[diff];
    var puzzle = CatGen.puzzleFor(diff, level);
    var saved = state.current[diff];
    game = new G.Game(puzzle, saved && saved.level === level ? saved : null);
    locked = false;
    buildBoard();
    renderAll();
  }

  function save() {
    if (game) {
      var s = game.toSave();
      s.level = state.level[state.difficulty];
      state.current[state.difficulty] = s;
    }
    CatStorage.save(state);
  }

  // ---------- board ----------
  function buildBoard() {
    var board = $('board');
    board.innerHTML = '';
    board.style.setProperty('--n', game.n);
    tiles = [];
    shown = [];
    for (var i = 0; i < game.n * game.n; i++) {
      var t = document.createElement('button');
      var g = game.regions[i];
      t.className = 'tile r' + g;
      t.dataset.idx = i;
      var p = game.rc(i);
      t.setAttribute('aria-label', 'Row ' + (p.r + 1) + ', column ' + (p.c + 1));
      t.innerHTML = '<span class="tile-inner"></span>';
      board.appendChild(t);
      tiles.push(t);
      shown.push(null);
    }
  }

  function renderTile(i) {
    var v = game.cells[i];
    var key = v === G.CAT ? 'cat' + state.selectedCat : v === G.PAW ? 'paw' : '';
    if (shown[i] === key) return;
    shown[i] = key;
    var inner = tiles[i].firstChild;
    tiles[i].classList.toggle('has-cat', v === G.CAT);
    tiles[i].classList.toggle('has-paw', v === G.PAW);
    inner.innerHTML = v === G.CAT ? Art.catSvg(state.selectedCat) : v === G.PAW ? PAW_SVG : '';
  }

  function renderAll() {
    for (var i = 0; i < tiles.length; i++) renderTile(i);
    renderHeader();
  }

  function renderHeader() {
    var diff = state.difficulty;
    $('levelTitle').textContent = 'Level ' + state.level[diff];
    $('catsPlaced').textContent = game.catCount();
    $('catsTotal').textContent = game.n;
    $('counterCat').innerHTML = Art.catSvg(state.selectedCat);
    $('modeCatIcon').innerHTML = Art.catSvg(state.selectedCat);
    Array.prototype.forEach.call($('diffTabs').children, function (b) {
      var on = b.dataset.diff === diff;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    var hearts = $('hearts');
    hearts.hidden = state.settings.relaxed;
    var html = '';
    for (var h = 0; h < G.MAX_HEARTS; h++) {
      html += '<span class="heart' + (h < game.hearts ? '' : ' lost') + '">' + HEART_SVG + '</span>';
    }
    hearts.innerHTML = html;
  }

  function flash(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || 600);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---------- taps ----------
  function handleTap(idx) {
    if (locked) return;
    if (mode === 'paw') return markCell(idx);

    var res = game.placeCat(idx, { relaxed: state.settings.relaxed, autoPaw: state.settings.autoPaw });
    if (res.result === 'ignored') return;

    if (res.result === 'wrong') {
      Audio.play('oops');
      showGhost(idx);
      if (res.reason) {
        toast(res.reason.text);
        flash(tiles[res.reason.other], 'warn', 900);
      } else {
        toast('Hmm, not quite. Look for another spot!');
      }
      renderHeader();
      if (!state.settings.relaxed) {
        var lost = $('hearts').children[game.hearts];
        if (lost) flash(lost, 'break', 600);
        if (game.hearts <= 0) {
          locked = true;
          setTimeout(showLose, 800);
        }
      }
      save();
      return;
    }

    renderAll();
    flash(tiles[idx], 'pop', 500);
    Audio.play('pop');
    setTimeout(function () { Audio.play('meow'); }, 80);
    save();
    if (res.result === 'won') onWin();
  }

  function markCell(idx) {
    if (locked || !game.toggleMark(idx)) return;
    Audio.play('paw');
    renderTile(idx);
    save();
  }

  // A see-through cat that shakes and disappears on a wrong tap.
  function showGhost(idx) {
    var t = tiles[idx];
    var ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.innerHTML = Art.catSvg(state.selectedCat);
    t.appendChild(ghost);
    flash(t, 'shake', 500);
    setTimeout(function () { ghost.remove(); }, 650);
  }

  function setupBoardInput() {
    var board = $('board');
    var pressTimer = null, pressedIdx = -1, longPressed = false;

    board.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      pressedIdx = +t.dataset.idx;
      longPressed = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        longPressed = true;
        markCell(pressedIdx);
        if (navigator.vibrate) navigator.vibrate(15);
      }, 450);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      board.addEventListener(ev, function () { clearTimeout(pressTimer); });
    });
    board.addEventListener('click', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      if (longPressed) { longPressed = false; return; }
      handleTap(+t.dataset.idx);
    });
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  // ---------- toolbar ----------
  function setMode(m) {
    mode = m;
    $('modeCat').classList.toggle('active', m === 'cat');
    $('modePaw').classList.toggle('active', m === 'paw');
    $('modeCat').setAttribute('aria-checked', m === 'cat');
    $('modePaw').setAttribute('aria-checked', m === 'paw');
  }

  function setupToolbar() {
    $('modeCat').onclick = function () { setMode('cat'); };
    $('modePaw').onclick = function () { setMode('paw'); };

    $('hintBtn').onclick = function () {
      if (locked) return;
      var idx = game.hint({ autoPaw: state.settings.autoPaw });
      if (idx < 0) return;
      Audio.play('hint');
      renderAll();
      flash(tiles[idx], 'sparkle', 1200);
      save();
      if (game.isWon()) onWin();
    };
    $('undoBtn').onclick = function () {
      if (locked) return;
      if (game.undo()) { renderAll(); save(); Audio.play('paw'); }
    };
    $('restartBtn').onclick = function () {
      if (locked) return;
      game.reset(true);
      renderAll();
      save();
      toast('Fresh start! (Undo brings it back)');
    };
    $('helpBtn').onclick = function () { openDialog('helpDialog'); };
    $('collectionBtn').onclick = function () { renderCollection(); openDialog('collectionDialog'); };
    $('settingsBtn').onclick = function () { openDialog('settingsDialog'); };

    Array.prototype.forEach.call($('diffTabs').children, function (b) {
      b.onclick = function () {
        if (b.dataset.diff === state.difficulty) return;
        save();
        state.difficulty = b.dataset.diff;
        CatStorage.save(state);
        loadLevel();
      };
    });
  }

  // ---------- dialogs ----------
  function openDialog(id) {
    var d = $(id);
    if (!d.open) d.showModal();
  }

  function setupDialogs() {
    // Tap outside a dialog to close it (not the win/lose ones).
    ['helpDialog', 'collectionDialog', 'settingsDialog'].forEach(function (id) {
      var d = $(id);
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    });
    $('winDialog').addEventListener('cancel', function (e) { e.preventDefault(); });
    $('loseDialog').addEventListener('cancel', function (e) { e.preventDefault(); });

    // settings
    var binds = { setRelaxed: 'relaxed', setAutoPaw: 'autoPaw', setSound: 'sound' };
    Object.keys(binds).forEach(function (id) {
      var box = $(id), key = binds[id];
      box.checked = !!state.settings[key];
      box.onchange = function () {
        state.settings[key] = box.checked;
        if (key === 'sound') { Audio.setEnabled(box.checked); Audio.play('pop'); }
        renderHeader();
        save();
      };
    });

    $('nextBtn').onclick = function () {
      $('winDialog').close();
      stopConfetti();
      loadLevel();
    };
    $('retryBtn').onclick = function () {
      $('loseDialog').close();
      game.reset(false);
      locked = false;
      renderAll();
      save();
    };

    buildExample();
  }

  // Small 4x4 example for the help screen (our own layout).
  function buildExample() {
    var regions = [0, 0, 0, 1,
                   2, 0, 1, 1,
                   2, 2, 3, 1,
                   2, 3, 3, 3];
    var cats = [1, 7, 8, 14];
    var colorMap = [2, 4, 1, 3];
    var html = '';
    regions.forEach(function (g, i) {
      html += '<span class="tile r' + colorMap[g] + (cats.indexOf(i) >= 0 ? ' has-cat' : '') + '"><span class="tile-inner">' +
        (cats.indexOf(i) >= 0 ? Art.catSvg(0) : '') + '</span></span>';
    });
    $('exampleBoard').innerHTML = html;
  }

  function renderCollection() {
    var unlocked = Art.unlockedCount(state.solved);
    var grid = $('collectionGrid');
    grid.innerHTML = '';
    Art.CATS.forEach(function (cat, i) {
      var b = document.createElement('button');
      var open = i < unlocked;
      b.className = 'coll-item' + (i === state.selectedCat ? ' selected' : '') + (open ? '' : ' locked');
      b.innerHTML = '<span class="coll-cat">' + Art.catSvg(i, { locked: !open }) + '</span>' +
        '<span class="coll-name">' + (open ? cat.name : '???') + '</span>';
      b.disabled = !open;
      b.onclick = function () {
        state.selectedCat = i;
        shown = shown.map(function () { return null; });
        renderAll();
        save();
        Audio.play('meow');
        renderCollection();
      };
      grid.appendChild(b);
    });
    var lead = $('collectionLead');
    if (unlocked >= Art.CATS.length) {
      lead.textContent = 'You found every cat! Tap one to play with it.';
    } else {
      var need = unlocked * Art.UNLOCK_EVERY - state.solved;
      lead.textContent = 'Tap a cat to play with it. Solve ' + need + ' more level' +
        (need === 1 ? '' : 's') + ' to meet a new friend!';
    }
  }

  // ---------- win / lose ----------
  function onWin() {
    locked = true;
    var diff = state.difficulty;
    var before = Art.unlockedCount(state.solved);
    state.solved++;
    var after = Art.unlockedCount(state.solved);
    var finished = state.level[diff];
    state.level[diff]++;
    delete state.current[diff];
    CatStorage.save(state);

    tiles.forEach(function (t, i) {
      if (t.classList.contains('has-cat')) {
        setTimeout(function () { flash(t, 'dance', 900); }, i * 25);
      }
    });
    setTimeout(function () {
      Audio.play('win');
      startConfetti();
      $('winCat').innerHTML = Art.catSvg(state.selectedCat);
      var cheers = ['You did it!', 'Purr-fect!', 'Paw-some!', 'Meow-velous!', 'Clever kitty!'];
      $('winTitle').textContent = cheers[finished % cheers.length];
      $('winText').textContent = 'Level ' + finished + ' solved!';
      var box = $('unlockBox');
      box.hidden = after <= before;
      if (after > before) {
        var ni = after - 1;
        $('unlockCat').innerHTML = Art.catSvg(ni);
        $('unlockName').textContent = Art.CATS[ni].name;
        setTimeout(function () { Audio.play('unlock'); }, 900);
      }
      openDialog('winDialog');
    }, 700);
  }

  function showLose() {
    $('loseCat').innerHTML = Art.catSvg(state.selectedCat);
    openDialog('loseDialog');
  }

  // ---------- confetti + paw prints ----------
  var confettiRaf = null;
  function startConfetti() {
    var canvas = $('confetti');
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#6cb6e0', '#a9d98e', '#62c4bd', '#ebcb50', '#e597b4', '#9d85de', '#f3a66b', '#ff7fa3'];
    var parts = [];
    for (var i = 0; i < 140; i++) {
      parts.push({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * innerHeight * 0.6,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        size: 6 + Math.random() * 7,
        color: colors[i % colors.length],
        paw: i % 6 === 0
      });
    }
    var start = performance.now();
    canvas.style.display = 'block';
    function frame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var fade = Math.min(1, Math.max(0, (4200 - (now - start)) / 800));
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.03;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.paw) drawPaw(ctx, p.size * 1.6);
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      if (now - start < 4200) confettiRaf = requestAnimationFrame(frame);
      else stopConfetti();
    }
    cancelAnimationFrame(confettiRaf);
    confettiRaf = requestAnimationFrame(frame);
  }

  function drawPaw(ctx, s) {
    ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.3, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    [[-0.32, -0.12], [-0.12, -0.32], [0.12, -0.32], [0.32, -0.12]].forEach(function (o) {
      ctx.beginPath(); ctx.arc(o[0] * s, o[1] * s, s * 0.12, 0, Math.PI * 2); ctx.fill();
    });
  }

  function stopConfetti() {
    cancelAnimationFrame(confettiRaf);
    var canvas = $('confetti');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }

  // ---------- start ----------
  setupBoardInput();
  setupToolbar();
  setupDialogs();
  loadLevel();
  if (!state.seenHelp) {
    state.seenHelp = true;
    CatStorage.save(state);
    openDialog('helpDialog');
  }
})();
