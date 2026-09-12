// Pixel art as string grids. One character per palette entry, '.' = transparent.
// Composites are pre-rendered to offscreen canvases (both facings) on first use.

export const PALETTE = {
  // farm girl
  H: '#e9c46a', h: '#b58a34', R: '#d64545', Y: '#f0c84a', S: '#f8cfa5', s: '#e0a97a',
  E: '#2a2a2a', M: '#c94a4a', W: '#fff5e1', O: '#4a7bd0', o: '#35589a', B: '#6b4423',
  // malamute
  D: '#3b3f46', d: '#6e7480', L: '#a3a9b3', C: '#f5f2ec', c: '#d9d5cd', Z: '#151515', P: '#e8748c',
  // racket
  F: '#d94b3a', f: '#8f2f24', N: '#e8e8e8', G: '#2f2f2f',
};

const LADY_BODY = [
  '......HHHHHH......',
  '.....HHHHHHHH.....',
  '.....HHRRRRHH.....',
  '..HHHHHHHHHHHHH...',
  '.hhhhhhhhhhhhhhh..',
  '...YYYYYYYYYYY....',
  '..YYSSSSSSSSSYY...',
  '..YSSSSSSSSSSSY...',
  '..YSSSESSSSESSY...',
  '..YSSSSSSSSSSSY...',
  '..YYSSSSMMSSSSY...',
  '..YY.SSSSSSSSS....',
  '..YY..sssssss.....',
  '..YY..WWWWWWW.....',
  '..YY.WWOOOOOWW....',
  '..YY.SWOOOOOWS....',
  '..Y..SOOOOOOOS....',
  '.....OOOOOOOOO....',
  '.....OOOOOOOOO....',
  '.....OoooooooO....',
  '.....OOOOOOOOO....',
  '.....ooooooooo....',
];

const LADY_LEGS = {
  stand: [
    '......OO..OO......',
    '......OO..OO......',
    '......OO..OO......',
    '......oo..oo......',
    '......SS..SS......',
    '......SS..SS......',
    '......BB..BB......',
    '......BBB.BBB.....',
    '.....BBBB.BBBB....',
  ],
  run1: [
    '.....OOO..OOO.....',
    '....OO......OO....',
    '....OO......OO....',
    '...oo........oo...',
    '...SS........SS...',
    '...SS........SS...',
    '...BB........BB...',
    '..BBB........BBB..',
    '..BBBB......BBBB..',
  ],
  run2: [
    '......OO..OO......',
    '.....OO...OO......',
    '....OO....OO......',
    '....oo....oo......',
    '...SS.....SS......',
    '...SS.....SS......',
    '...BB.....BB......',
    '..BBB.....BBB.....',
    '..BBBB...BBBB.....',
  ],
  jump: [
    '......OO..OO......',
    '......OO..OO......',
    '.....OO....OO.....',
    '.....oo....oo.....',
    '.....SS....SS.....',
    '....SS......SS....',
    '....BB......BB....',
    '...BBB......BBB...',
    '...BBBB....BBBB...',
  ],
};

const DOG_BODY = [
  '..........................DD..',
  '.........................DLLD.',
  '...DD....DD.............DLLLD.',
  '..DDDD..DDDD............DLLLD.',
  '..DDDDDDDDDD............DDLDD.',
  '.DDDDDDDDDDDD............DDD..',
  '.DDCCDDDDCCDDDDDDDDDDDDDDDDD..',
  '.DdddDDDDdddDDDDDDDDDDDDDDD...',
  '.DdEdDDDDdEdDDDDDDDDDDDDDDD...',
  '.DCCCCCCCCCCdddddddddddddDD...',
  'CCCCCCCCCCCCdddddddddddddd....',
  'ZCCCCCCCCCCCCCCCCCCCCCCCCC....',
  'ZCCPCCCCCCCCCCCCCCCCCCCCC.....',
  '.CCCCCCCCCCCCCCCCCCCCCCCc.....',
  '..CCCCCCCCCCCCCCCCCCCCCc......',
  '...CCCCCCCCCCCCCCCCCCCc.......',
];

const DOG_LEGS = {
  stand: [
    '...CC.CC.........CC.CC........',
    '...CC.CC.........CC.CC........',
    '...CC.CC.........CC.CC........',
    '...CC.CC.........CC.CC........',
    '...cc.cc.........cc.cc........',
    '..ccc.ccc.......ccc.ccc.......',
  ],
  run1: [
    '..CC....CC......CC....CC......',
    '.CC......CC....CC......CC.....',
    '.CC......CC....CC......CC.....',
    'CC........CC..CC........CC....',
    'cc........cc..cc........cc....',
    'ccc.......ccc.ccc.......ccc...',
  ],
  run2: [
    '....CCCC..........CCCC........',
    '....CC.CC........CC.CC........',
    '.....CC.CC......CC.CC.........',
    '.....CC.CC......CC.CC.........',
    '.....cc.cc......cc.cc.........',
    '....ccc.ccc....ccc.ccc........',
  ],
  jump: [
    '....CC.CC........CC.CC........',
    '.....CC.CC........CC.CC.......',
    '......CC.CC........CC.CC......',
    '.......CC.CC........CC.CC.....',
    '.......cc.cc........cc.cc.....',
    '..............................',
  ],
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

// 45-degree racket: head up-forward, grip at the bottom-left (native facing right).
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

/** Character definitions. `native` is the facing the grids are drawn in. */
export const CHAR_DEFS = {
  lady: {
    w: 18, h: 31, native: 1, body: LADY_BODY, legs: LADY_LEGS,
    hand: { x: 13, y: 15 }, // front hand, native facing
    racket: { idle: 'diag', swing: 'fwd' },
    runCycle: ['run1', 'stand', 'run2', 'stand'],
  },
  dog: {
    w: 30, h: 22, native: -1, body: DOG_BODY, legs: DOG_LEGS,
    hand: { x: 0, y: 11 }, // muzzle tip, native facing
    racket: { idle: 'fwd', swing: 'diag' },
    runCycle: ['run1', 'stand', 'run2', 'stand'],
  },
};

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

/** Render a grid to a canvas (optionally mirrored). Cached by key. */
export function gridCanvas(key, rows, flip = false) {
  const k = `${key}:${flip ? 'L' : 'R'}`;
  if (cache.has(k)) return cache.get(k);
  const h = rows.length;
  const w = rows[0].length;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d');
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const col = PALETTE[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  cache.set(k, cv);
  return cv;
}

/** Racket canvas plus grip anchor for a facing (+1 right, -1 left). */
export function racketSprite(orient, facing) {
  const r = RACKETS[orient];
  const flip = facing < 0;
  const w = r.rows[0].length;
  return { canvas: gridCanvas(`racket-${orient}`, r.rows, flip), grip: { x: flip ? w - 1 - r.grip.x : r.grip.x, y: r.grip.y } };
}

/** Pick the legs frame for an animation state. */
export function legsFrame(def, anim, animT) {
  if (anim === 'jump') return 'jump';
  if (anim === 'run') return def.runCycle[Math.floor(animT * 12) % def.runCycle.length];
  return 'stand';
}

/**
 * Draw a character with feet at (x, y), facing +1/-1.
 * anim: 'idle' | 'run' | 'jump' | 'swing'.
 */
export function drawCharacter(ctx, char, x, y, facing, anim = 'idle', animT = 0, airborne = false) {
  const def = CHAR_DEFS[char];
  const flip = facing !== def.native;
  const bodyRows = def.body.length;
  const bob = anim === 'idle' && Math.floor(animT * 2) % 2 === 1 ? 1 : 0;
  const x0 = Math.round(x - def.w / 2);
  const y0 = Math.round(y - def.h);
  const legsKey = legsFrame(def, anim === 'swing' && airborne ? 'jump' : anim === 'swing' ? 'stand' : anim, animT);
  ctx.drawImage(gridCanvas(`${char}-legs-${legsKey}`, def.legs[legsKey], flip), x0, y0 + bodyRows);
  ctx.drawImage(gridCanvas(`${char}-body`, def.body, flip), x0, y0 + bob);

  const orient = anim === 'swing' ? def.racket.swing : def.racket.idle;
  const { canvas, grip } = racketSprite(orient, facing);
  const handX = flip ? def.w - 1 - def.hand.x : def.hand.x;
  ctx.drawImage(canvas, x0 + handX - grip.x, y0 + def.hand.y - grip.y + bob);
}

/** Procedural shuttlecock: cork leads along `angle`, feathers trail behind. */
export function drawShuttle(ctx, x, y, angle) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  ctx.fillStyle = '#f4f4f4';
  for (const spread of [-0.4, 0, 0.4]) {
    const b = angle + Math.PI + spread;
    for (let i = 2; i <= 6; i += 1) {
      ctx.fillRect(Math.round(cx + Math.cos(b) * i), Math.round(cy + Math.sin(b) * i), 1, 1);
    }
  }
  ctx.fillStyle = '#e6dccb';
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(cx + Math.round(Math.cos(angle)), cy + Math.round(Math.sin(angle)), 1, 1);
}
