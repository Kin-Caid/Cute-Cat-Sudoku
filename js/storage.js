// Save/load everything in one localStorage entry. Storage can be missing
// (private mode, blocked site data), so every access is wrapped.
(function () {
  'use strict';

  var KEY = 'cuteCatSudoku.v1';

  function defaults() {
    return {
      difficulty: 'normal',
      level: { normal: 1, hard: 1, ultra: 1 },
      solved: 0,
      selectedCat: 0,
      settings: { relaxed: false, autoPaw: true, sound: true },
      // in-progress board per difficulty: { level, cells, hearts }
      current: {},
      seenHelp: false
    };
  }

  function load() {
    var data = defaults();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        data.difficulty = saved.difficulty || data.difficulty;
        data.level = Object.assign(data.level, saved.level);
        data.solved = saved.solved || 0;
        data.selectedCat = saved.selectedCat || 0;
        data.settings = Object.assign(data.settings, saved.settings);
        data.current = saved.current || {};
        data.seenHelp = !!saved.seenHelp;
      }
    } catch (e) { /* start fresh */ }
    return data;
  }

  function save(data) {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  window.CatStorage = { load: load, save: save };
})();
