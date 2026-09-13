// Pixel art as string grids. One character per palette entry, '.' = transparent.
// Each character has a BACK view (near player, seen from behind) and a FRONT view (far player).
// Frames are pre-rendered to offscreen canvases on first use and drawn scaled by depth.
// Characters live in ./chars/ (made with tools/sprite-import.html) with their own palettes.
import { BUG_DEF } from './chars/bug.js';
import { LADY_DEF } from './chars/lady.js';

export const PALETTE = {
  // racket (imported characters bring their own palettes)
  F: '#d94b3a', f: '#8f2f24', N: '#e8e8e8', G: '#2f2f2f',
};

const RACKET_UP = [
  '..FFF..',
  '.FNNNF.',
  'FNNNNNF',
  'FNNNNNF',
  'FNNNNNF',
  'FNNNNNF',
  '.FNNNF.',
  '..FFF..',
  '..fGf..',
  '...G...',
  '...G...',
  '...G...',
  '...G...',
  '..GGG..',
];
const RACKET_DIAG = [
  '.......FFF.',
  '......FNNNF',
  '.....FNNNNF',
  '.....FNNNNF',
  '....FNNNNF.',
  '...fFFFFF..',
  '..GG.......',
  '.GG........',
  'GG.........',
];

/**
 * Character definitions, keyed by the ids in config CHARS. Imported characters live in ./chars/ and
 * describe each view as full-body frames { stand, run1, run2, jump } with their own palette.
 * hand = racket grip anchor in the view's grid; facing = which way the swing racket points (+1 right).
 */
export const CHAR_DEFS = {};
CHAR_DEFS.lady = LADY_DEF;
CHAR_DEFS.bug = BUG_DEF;

function rotateCW(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const out = [];
  for (let c = 0; c < w; c += 1) {
    let line = '';
    for (let r = h - 1; r >= 0; r -= 1) line += rows[r][c];
    out.push(line);
  }
  return out;
}

const RACKETS = {
  up: { rows: RACKET_UP, grip: { x: 3, y: 13 } },
  fwd: { rows: rotateCW(RACKET_UP), grip: { x: 0, y: 3 } }, // head points right
  diag: { rows: RACKET_DIAG, grip: { x: 0, y: 8 } },
};

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const cache = new Map();

/** Render a grid to a canvas (optionally mirrored) with a palette. Cached by key. */
export function gridCanvas(key, rows, flip = false, palette = PALETTE) {
  const k = `${key}:${flip ? 'L' : 'R'}`;
  if (cache.has(k)) return cache.get(k);
  const h = rows.length;
  const w = rows[0].length;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d');
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const col = palette[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  cache.set(k, cv);
  return cv;
}

export function racketSprite(orient, facing) {
  const r = RACKETS[orient];
  const flip = facing < 0;
  const w = r.rows[0].length;
  return { canvas: gridCanvas(`racket-${orient}`, r.rows, flip), grip: { x: flip ? w - 1 - r.grip.x : r.grip.x, y: r.grip.y }, w, h: r.rows.length };
}

export function legsFrame(def, anim, animT) {
  if (anim === 'jump') return 'jump';
  if (anim === 'run') return def.runCycle[Math.floor(animT * 12) % def.runCycle.length];
  return 'stand';
}

/**
 * Draw a character with its feet at screen (sx, sy), scaled by `scale`.
 * view: 'back' | 'front'; anim: 'idle' | 'run' | 'jump' | 'swing'.
 */
export function drawCharacter(ctx, char, view, sx, sy, scale, anim = 'idle', animT = 0, airborne = false) {
  const def = CHAR_DEFS[char];
  const v = def.views[view];
  const bob = anim === 'idle' && Math.floor(animT * 2) % 2 === 1 ? 1 : 0;
  const w = def.w * scale;
  const h = def.h * scale;
  const x0 = Math.round(sx - w / 2);
  const y0 = Math.round(sy - h);
  const legsAnim = anim === 'swing' ? (airborne ? 'jump' : 'idle') : anim;
  const legsKey = legsFrame(def, legsAnim, animT);
  const frame = v.frames[legsKey] || v.frames.stand;
  ctx.drawImage(gridCanvas(`${char}-${view}-${legsKey}`, frame, false, def.palette || PALETTE), x0, y0 + bob, w, Math.round(frame.length * scale));

  const orient = anim === 'swing' ? v.racket.swing : v.racket.idle;
  const rk = racketSprite(orient, v.facing);
  const rx = x0 + Math.round((v.hand.x - rk.grip.x) * scale);
  const ry = y0 + bob + Math.round((v.hand.y - rk.grip.y) * scale);
  ctx.drawImage(rk.canvas, rx, ry, Math.round(rk.w * scale), Math.round(rk.h * scale));
}

/** Procedural shuttlecock: cork leads along `angle` (screen radians), feathers trail behind. */
export function drawShuttle(ctx, x, y, angle, scale = 1) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const len = Math.max(4, Math.round(6 * scale));
  ctx.fillStyle = '#f4f4f4';
  for (const spread of [-0.4, 0, 0.4]) {
    const b = angle + Math.PI + spread;
    for (let i = 2; i <= len; i += 1) {
      ctx.fillRect(Math.round(cx + Math.cos(b) * i), Math.round(cy + Math.sin(b) * i), 1, 1);
    }
  }
  ctx.fillStyle = '#e6dccb';
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(cx + Math.round(Math.cos(angle)), cy + Math.round(Math.sin(angle)), 1, 1);
}
