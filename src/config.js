// Every tunable for the badminton mini-game (court-view edition, NES Tennis style camera).
// World units are px-like: x = lateral (screen right +), z = depth (net at 0, P1 near side z < 0,
// P2 far side z > 0), y = height (up +). Side convention: P1 = -1 (near), P2 = +1 (far).
// A player hits toward dir = -side.

export const STEP = 1 / 60;

// ---- Court ------------------------------------------------------------------
export const COURT = {
  halfLen: 220, // baseline at |z| = 220
  halfW: 85, // singles sideline at |x| = 85
  shortService: 65, // short service line at |z| = 65
  netH: 50,
  postX: 95, // net posts just outside the sidelines
  margin: 60, // beyond this outside the lines the shuttle counts as gone
};

// ---- Scene and fake perspective (NES Tennis look) ---------------------------
export const SCENE = { w: 320, h: 280 };
export const CAMERA = {
  cx: 160,
  yNear: 268, // screen y of the near baseline
  yFar: 64, // screen y of the far baseline (just under the banner)
  wNear: 1.5, // px per world x unit at the near baseline (near baseline spans 255 px of 320)
  wFar: 0.95,
  hNear: 1.0, // px per world height unit; kept lower than the lateral scale so lobs stay on screen
  hFar: 0.6,
  sNear: 1.0, // sprite scale near
  sFar: 0.72,
};

// ---- Shuttle physics --------------------------------------------------------
export const G = 700;
export const VT = 600;
export const K = G / (VT * VT);
export const SUBSTEPS = 4;
export const SHUTTLE_R = 3;
export const MAX_SPEED = 1000;
export const PREDICT_DT = 1 / 240;
export const NET_MARGIN = 6;

// ---- Players ----------------------------------------------------------------
export const PLAYER = {
  run: 210,
  jumpV: 330,
  g: 900,
  hitOffset: 8, // racket volume center is this far toward the net
  hitH: 28, // ...and this high above the feet
  reach: { x: 22, z: 16, y: 16 }, // racket volume half-extents (ellipsoid), used for aerial contacts
  // Ground catch: standing within this radius of the predicted landing spot when the shuttle comes
  // down to racket height counts as a return. Judging depth + lateral position in the court view is hard.
  catchRadius: 32,
  // Airborne catch (jump smash / net kill): the shuttle is still travelling when it passes racket height,
  // so the horizontal radius is wider than the ground circle; vertical tolerance around racket height.
  airCatchRadius: 50,
  airCatchY: 24,
  netClamp: 14,
  sideMargin: 40, // may step this far outside the sidelines (world units)...
  backMargin: 18, // ...and behind the baseline
  edgePad: 12, // ...but never closer than this (px) to the scene's left/right edge
  swingTime: 0.25,
};

// ---- Shots: elevation angle and landing depth (|z| on the opponent's side) ----
export const SHOTS = {
  clear: { angle: 50, depth: 190, jitterZ: 15, jitterDeg: 3 },
  neutral: { angle: 42, depth: 125, jitterZ: 15, jitterDeg: 3 },
  drive: { angle: 12, depth: 170, jitterZ: 15, jitterDeg: 3 },
  drop: { angle: 38, depth: 45, jitterZ: 10, jitterDeg: 3 },
  highServe: { angle: 52, depth: 190, jitterZ: 10, jitterDeg: 2 },
  lowServe: { angle: 24, depth: 78, jitterZ: 8, jitterDeg: 2 },
};
export const AIM = { spread: 70, jitterX: 10 }; // lateral target = aim * spread + jitter
export const SMASH = { speed: 800, jitterSpeed: 40, maxDist: 140, minH: 60, netMargin: NET_MARGIN };
export const SERVE = { x: 40, z: 150 }; // server stands at |z| = 150, x = +-40 by score parity (real rule)
export const BASE_Z = 110; // CPU home depth

// ---- CPU difficulty ---------------------------------------------------------
export const DIFFICULTY = {
  easy: { label: 'EASY', reactionMs: 350, posErrorPx: 22, speedScale: 0.75, jumpSmashProb: 0.15, dropProb: 0.1, mistakeProb: 0.25, deadZonePx: 6, judgeOut: false },
  normal: { label: 'NORMAL', reactionMs: 200, posErrorPx: 10, speedScale: 0.9, jumpSmashProb: 0.45, dropProb: 0.3, mistakeProb: 0.12, deadZonePx: 5, judgeOut: false },
  hard: { label: 'HARD', reactionMs: 80, posErrorPx: 4, speedScale: 1.0, jumpSmashProb: 0.8, dropProb: 0.45, mistakeProb: 0.04, deadZonePx: 4, judgeOut: true },
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

export const TIMERS = { serveLock: 0.5, pointBanner: 1.2, cpuServeDelay: [0.8, 1.2] };

// ---- Keys (KeyboardEvent.code) ---------------------------------------------
export const KEYS = {
  p1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', smash: 'Space', lift: 'KeyQ', drop: 'KeyE' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', smash: 'Enter', lift: 'Period', drop: 'Comma' },
  menuUp: ['KeyW', 'ArrowUp'],
  menuDown: ['KeyS', 'ArrowDown'],
  menuLeft: ['KeyA', 'ArrowLeft'],
  menuRight: ['KeyD', 'ArrowRight'],
  confirm: ['Enter', 'Space'],
  back: ['Escape'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
};

export const CHARS = ['lady', 'dog'];
export const CHAR_NAMES = { lady: 'FARM GIRL', dog: 'MALAMUTE' };
