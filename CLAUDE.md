# Cute Cat Sudoku

An ad-free, cat-themed logic puzzle for a young child. It's inspired by meowdoku.org, but the art, layout and code are our own; nothing is copied from that site. The reference screenshots are in `resources/`.

## The puzzle
An N×N grid split into N colored regions. The player places N cats so that:
1. every color region has exactly one cat
2. every row and every column has exactly one cat
3. no two cats touch, diagonals included
4. a wrong cat costs a heart (3 per level). Relaxed mode turns hearts off.

Every generated puzzle has exactly one solution, so a tap can be judged right or wrong immediately.

## Hard constraints
- **No build step, no dependencies.** Opening `index.html` directly (file://) must work.
- Use **classic `<script>` tags**, not ES modules: modules fail over file://. Each file is an IIFE that puts one object on `window`.
- Tablet/phone first: big touch targets, portrait layout, no page scroll while playing.
- Kid-friendly tone: gentle feedback, never harsh. Say "Oops!", never "Wrong!".
- The progress save must not break when localStorage is unavailable (wrap every access).

## File map
- `index.html`: page shell and all dialogs (help, collection, settings, win, lose)
- `css/style.css`: theme tokens, region colors `--r0..--r7` plus texture patterns, animations
- `js/generator.js`: seeded RNG, puzzle generator, solver (`window.CatGen`; also `module.exports` for Node)
- `js/cats.js`: SVG cat art and the 12-cat collection (`window.CatArt`). A new cat unlocks every 3 solved levels.
- `js/game.js`: rules and state for one level, no DOM (`window.CatGame`)
- `js/audio.js`: Web Audio sounds generated in code (`window.CatAudio`)
- `js/storage.js`: the single localStorage key `cuteCatSudoku.v1` (`window.CatStorage`)
- `js/ui.js`: rendering, input (tap, long-press = paw mark), dialogs, confetti. App entry point.

## Levels
`CatGen.puzzleFor(difficulty, level)` is deterministic: the seed is `cats-<difficulty>-<level>`.
- Normal: 5×5 for levels 1–3, then 6×6
- Hard: 7×7
- Ultra: 8×8

Changing the generator algorithm changes every level, and the saved in-progress boards will no longer match.

## Testing
- `node tests/generator.test.js`: checks that generated puzzles have exactly one solution, connected regions, follow the rules, and are deterministic.
- For UI changes: open `index.html` in a browser at phone and tablet widths.
