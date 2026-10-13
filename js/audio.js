// Tiny synthesized sounds via Web Audio. No sound files needed.
(function () {
  'use strict';

  var ctx = null;
  var enabled = true;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol, endFreq) {
    var a = ac();
    if (!a) return;
    var t = a.currentTime + start;
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // A little "mew": a filtered sweep up then down.
  function meow() {
    var a = ac();
    if (!a) return;
    var t = a.currentTime;
    var osc = a.createOscillator();
    var filter = a.createBiquadFilter();
    var gain = a.createGain();
    osc.type = 'sawtooth';
    var base = 520 + Math.random() * 120;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.32);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(2200, t + 0.1);
    filter.frequency.linearRampToValueAtTime(800, t + 0.32);
    filter.Q.value = 6;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    osc.connect(filter).connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  var sounds = {
    pop: function () { tone(660, 0, 0.12, 'sine', 0.25, 990); },
    meow: meow,
    paw: function () { tone(880, 0, 0.06, 'triangle', 0.12); },
    oops: function () {
      tone(392, 0, 0.18, 'triangle', 0.2, 370);
      tone(311, 0.16, 0.28, 'triangle', 0.2, 280);
    },
    hint: function () {
      tone(1046, 0, 0.12, 'sine', 0.14);
      tone(1318, 0.08, 0.18, 'sine', 0.14);
    },
    win: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) {
        tone(f, i * 0.11, 0.35, 'triangle', 0.18);
      });
      setTimeout(meow, 650);
    },
    unlock: function () {
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, i * 0.08, 0.3, 'sine', 0.15); });
    }
  };

  window.CatAudio = {
    play: function (name) {
      if (!enabled || !sounds[name]) return;
      try { sounds[name](); } catch (e) { /* audio is optional */ }
    },
    setEnabled: function (on) { enabled = !!on; }
  };
})();
