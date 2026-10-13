// Our own cat art: one SVG face drawn from a few colour settings.
(function () {
  'use strict';

  // Cat i unlocks after i * UNLOCK_EVERY levels solved.
  var UNLOCK_EVERY = 3;

  var CATS = [
    { name: 'Mochi',     fur: '#f3dcc0', line: '#c99a73', pattern: 'tabby',  mark: '#c9925e', eye: '#5b3a29' },
    { name: 'Pumpkin',   fur: '#f5a85a', line: '#c97a35', pattern: 'tabby',  mark: '#d9733a', eye: '#4a7a3a' },
    { name: 'Oreo',      fur: '#3a3335', line: '#231e20', pattern: 'muzzle', mark: '#ffffff', eye: '#6fbf5a' },
    { name: 'Patches',   fur: '#fff7ee', line: '#c9b6a3', pattern: 'calico', mark: '#f0a050', mark2: '#3d3436', eye: '#c98a2e' },
    { name: 'Smokey',    fur: '#a9aab3', line: '#7f808a', pattern: 'tabby',  mark: '#7d7e88', eye: '#e0a93a' },
    { name: 'Luna',      fur: '#2f2a2e', line: '#1b1719', pattern: 'none',   eye: '#f2c84b' },
    { name: 'Snowball',  fur: '#ffffff', line: '#cfc6be', pattern: 'none',   eye: '#5aa9e0' },
    { name: 'Mango',     fur: '#f6ead6', line: '#c9b394', pattern: 'points', mark: '#6e5246', eye: '#4f9fe0' },
    { name: 'Cocoa',     fur: '#8a5a44', line: '#5f3c2c', pattern: 'muzzle', mark: '#e7cbb0', eye: '#7cbf4a' },
    { name: 'Pepper',    fur: '#ddd8d2', line: '#a8a19a', pattern: 'spots',  mark: '#6b6662', eye: '#4a8a5a' },
    { name: 'Bubblegum', fur: '#f8c6d8', line: '#d98fac', pattern: 'tabby',  mark: '#ee8fb3', eye: '#8a4fbf' },
    { name: 'Starlight', fur: '#cdb8f0', line: '#9a82c9', pattern: 'spots',  mark: '#fff6c7', eye: '#3a6fd0' }
  ];

  var uid = 0;

  function patternSvg(cat) {
    var m = cat.mark;
    switch (cat.pattern) {
      case 'tabby':
        return '<g stroke="' + m + '" stroke-width="3.6" stroke-linecap="round" fill="none">' +
          '<path d="M50 28v9M41 30l2.5 8M59 30l-2.5 8"/>' +
          '<path d="M11 55h10M12 63h8M89 55H79M88 63h-8"/></g>';
      case 'muzzle':
        return '<ellipse cx="50" cy="76" rx="21" ry="15" fill="' + m + '"/>' +
          '<path d="M50 40 L44 62 L56 62 Z" fill="' + m + '" opacity="0.9"/>';
      case 'calico':
        return '<ellipse cx="24" cy="32" rx="22" ry="18" fill="' + m + '"/>' +
          '<ellipse cx="78" cy="38" rx="18" ry="14" fill="' + cat.mark2 + '"/>' +
          '<ellipse cx="80" cy="84" rx="14" ry="9" fill="' + m + '"/>';
      case 'points':
        return '<path d="M14 44 L20 8 L44 26 Z M86 44 L80 8 L56 26 Z" fill="' + m + '"/>' +
          '<ellipse cx="50" cy="72" rx="19" ry="14" fill="' + m + '" opacity="0.75"/>';
      case 'spots':
        return '<g fill="' + m + '"><circle cx="30" cy="36" r="4.5"/><circle cx="70" cy="34" r="5"/>' +
          '<circle cx="50" cy="31" r="3.5"/><circle cx="20" cy="62" r="4"/><circle cx="80" cy="64" r="4.5"/></g>';
      default:
        return '';
    }
  }

  // Returns an SVG string. opts.locked draws a mystery silhouette.
  function catSvg(index, opts) {
    opts = opts || {};
    var cat = CATS[index] || CATS[0];
    var id = 'catclip' + (++uid);
    var shape = '<path d="M14 44 L20 8 L44 26 Z M86 44 L80 8 L56 26 Z"/>' +
      '<ellipse cx="50" cy="58" rx="40" ry="33"/>';

    if (opts.locked) {
      return '<svg viewBox="0 0 100 100" class="cat-svg locked" aria-hidden="true">' +
        '<g fill="#d8cdc2" stroke="#d8cdc2" stroke-width="4" stroke-linejoin="round">' + shape + '</g>' +
        '<text x="50" y="72" text-anchor="middle" font-size="36" font-weight="800" fill="#fff">?</text></svg>';
    }

    var dark = cat.fur === '#2f2a2e' || cat.fur === '#3a3335';
    var lineCol = dark ? '#8f8589' : '#6b4a3f';
    var whisker = dark ? '#bdb3b6' : '#9a7e72';

    return '<svg viewBox="0 0 100 100" class="cat-svg" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '">' + shape + '</clipPath></defs>' +
      // outline + fur
      '<g fill="' + cat.fur + '" stroke="' + cat.line + '" stroke-width="5" stroke-linejoin="round">' + shape + '</g>' +
      '<g fill="' + cat.fur + '" stroke="' + cat.fur + '" stroke-width="2" stroke-linejoin="round">' + shape + '</g>' +
      // markings (clipped to the head)
      '<g clip-path="url(#' + id + ')">' + patternSvg(cat) + '</g>' +
      // inner ears
      '<path d="M22 36 L24.5 17 L36 27 Z M78 36 L75.5 17 L64 27 Z" fill="#f7a9b8" opacity="0.85"/>' +
      // eyes
      eye(34, cat.eye) + eye(66, cat.eye) +
      // blush
      '<ellipse cx="23" cy="71" rx="6.5" ry="3.8" fill="#ff8fa8" opacity="0.5"/>' +
      '<ellipse cx="77" cy="71" rx="6.5" ry="3.8" fill="#ff8fa8" opacity="0.5"/>' +
      // nose + mouth
      '<path d="M45.5 67.5 Q50 65.5 54.5 67.5 Q50 73.5 45.5 67.5Z" fill="#ef8a9c"/>' +
      '<path d="M50 71.5 q-2.5 5 -7 2.2 M50 71.5 q2.5 5 7 2.2" stroke="' + lineCol + '" stroke-width="1.9" fill="none" stroke-linecap="round"/>' +
      // whiskers
      '<g stroke="' + whisker + '" stroke-width="1.3" stroke-linecap="round" opacity="0.7">' +
      '<path d="M6 66 L24 69 M7 75 L24 73 M94 66 L76 69 M93 75 L76 73"/></g>' +
      '</svg>';
  }

  function eye(cx, iris) {
    return '<ellipse cx="' + cx + '" cy="57" rx="8.5" ry="9.5" fill="' + iris + '"/>' +
      '<ellipse cx="' + cx + '" cy="57.5" rx="5.6" ry="7.2" fill="#2b1d1a"/>' +
      '<circle cx="' + (cx - 2.6) + '" cy="53.2" r="2.7" fill="#fff"/>' +
      '<circle cx="' + (cx + 2.6) + '" cy="60.5" r="1.3" fill="#fff"/>';
  }

  window.CatArt = {
    CATS: CATS,
    UNLOCK_EVERY: UNLOCK_EVERY,
    catSvg: catSvg,
    unlockedCount: function (solved) {
      return Math.min(CATS.length, 1 + Math.floor(solved / UNLOCK_EVERY));
    }
  };
})();
