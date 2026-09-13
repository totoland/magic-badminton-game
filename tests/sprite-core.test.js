import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertSheet, detectBlockSize, despeckle } from '../tools/sprite-core.js';

// Synthetic "AI pixel art": a 20x24 design drawn with 8x8 fake pixels, anti-aliased block edges and colour noise.
const DESIGN = [
  '......DDDDDDDD......',
  '.....DDDDDDDDDD.....',
  '.....DDCCDDCCDD.....',
  '.....DDDDDDDDDD.....',
  '......CCCCCCCC......',
  '......CCCCCCCC......',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '......OO....OO......',
  '......OO....OO......',
  '......BB....BB......',
  '.....BBB....BBB.....',
  '....................',
];
const COLORS = { D: [60, 64, 72], C: [245, 242, 236], O: [74, 123, 208], B: [107, 68, 35] };
const BG = [255, 0, 255];

function synth(block = 8, seed = 7) {
  const w = DESIGN[0].length * block, h = DESIGN.length * block;
  const px = new Uint8ClampedArray(w * h * 4);
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const gx = Math.floor(x / block), gy = Math.floor(y / block);
    const ch = DESIGN[gy][gx];
    let c = ch === '.' ? BG : COLORS[ch];
    // anti-aliased edge: blend with the neighbour block on the first column/row of a block
    const nx = DESIGN[gy][Math.max(0, gx - 1)], ny = DESIGN[Math.max(0, gy - 1)][gx];
    if (x % block === 0 && nx !== ch) { const n = nx === '.' ? BG : COLORS[nx]; c = c.map((v, i) => (v + n[i]) / 2); }
    else if (y % block === 0 && ny !== ch) { const n = ny === '.' ? BG : COLORS[ny]; c = c.map((v, i) => (v + n[i]) / 2); }
    const noise = (rnd() - 0.5) * 24;
    const i = (y * w + x) * 4;
    px[i] = c[0] + noise; px[i + 1] = c[1] + noise; px[i + 2] = c[2] + noise; px[i + 3] = 255;
  }
  return { px, w, h };
}

test('detects the fake pixel size of AI pixel art', () => {
  const cell = synth(8);
  assert.equal(detectBlockSize(cell.px, cell.w, cell.h), 8);
});

test('a noisy AI-style cell converts to a clean grid with few colours and no specks', () => {
  const cell = synth(8);
  // the importer trims to the content box and fits it into the target, so target the trimmed design size (12 x 15)
  const res = convertSheet([cell], { tw: 12, th: 15, k: 5, bg: BG, tol: 60, block: 0, despeckle: true });
  assert.equal(res.blocks[0], 8);
  assert.ok(res.palette.length <= 5);
  const rows = res.rows[0];
  const trimmed = DESIGN.slice(0, 15).map((r) => r.slice(4, 16));
  let agree = 0, total = 0;
  for (let y = 0; y < 15; y += 1) for (let x = 0; x < 12; x += 1) {
    total += 1;
    if ((trimmed[y][x] !== '.') === (rows[y][x] !== '.')) agree += 1;
  }
  assert.ok(agree / total >= 0.9, `silhouette agreement ${(agree / total).toFixed(2)}\n${rows.join('\n')}`);
  // the four design colours map to four distinct letters
  const letters = new Set(rows.join('').replace(/\./g, ''));
  assert.ok(letters.size >= 4 && letters.size <= 5, `letters ${[...letters].join('')}`);
});

test('despeckle removes lone pixels and fills pinholes', () => {
  const idx = Int8Array.from([
    -1, -1, -1, -1,
    -1, 0, 0, -1,
    -1, 0, -1, 0,
    2, -1, 0, -1,
  ]);
  const out = despeckle({ w: 4, h: 4, idx });
  assert.equal(out.idx[12], -1, 'lone speck removed');
  assert.equal(out.idx[10], 0, 'hole surrounded on all four sides is filled');
});

test('halo pixels blended with the background do not leak into the palette, and frames share one scale', () => {
  const big = synth(8);
  // a "jump" frame: same design with the bottom 3 rows (feet) removed -> shorter content box
  const shortDesign = DESIGN.slice(0, 12).concat(['....................', '....................', '....................', '....................']);
  const small = synth(8);
  for (let y = 12 * 8; y < small.h; y += 1) for (let x = 0; x < small.w; x += 1) { const i = (y * small.w + x) * 4; small.px[i] = 255; small.px[i + 1] = 0; small.px[i + 2] = 255; }
  void shortDesign;
  const res = convertSheet([big, small], { tw: 12, th: 15, k: 5, bg: BG, tol: 60, block: 0, despeckle: true, bleed: 3 });
  for (const c of res.palette) assert.ok(!(c[0] > 150 && c[2] > 150 && c[1] < 90), `magenta-ish palette entry ${c}`);
  const height = (rows) => rows.filter((r) => r.includes('.') === false || /[^.]/.test(r)).length;
  assert.ok(height(res.rows[1]) < height(res.rows[0]), 'the shorter frame stays shorter (shared scale)');
});
