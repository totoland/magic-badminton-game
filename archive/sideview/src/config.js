// Every tunable for the badminton mini-game lives here.
// Units: px of the 480x270 internal buffer, seconds, px/s, px/s^2.
// Side convention: P1 = -1 (left of the net), P2 = +1 (right). A player hits toward dir = -side.

export const W = 480;
export const H = 270;
export const STEP = 1 / 60;

// ---- Court geometry ---------------------------------------------------------
export const GROUND_Y = 246;
export const NET_X = 240;
export const NET_H = 50;
export const NET_TOP_Y = GROUND_Y - NET_H; // 196
export const LINES = { left: 24, right: 456 }; // back boundary lines, on the line = IN
export const SERVE_OFFSET = 100; // serve spot distance from the screen edge
export const BASE_OFFSET = 110; // AI "home" distance from the net

/** X of the serve spot for a side. */
export const serveX = (side) => (side < 0 ? SERVE_OFFSET : W - SERVE_OFFSET);
/** Mirror an x expressed for the left player so it applies to `side`. */
export const mirrorX = (x, side) => (side < 0 ? x : W - x);

// ---- Shuttle physics --------------------------------------------------------
export const G = 700; // gravity on the shuttle
export const VT = 600; // terminal velocity; drag length 1/K ~ 514 px (about 1.1x the court)
export const K = G / (VT * VT); // quadratic drag coefficient
export const SUBSTEPS = 4; // shuttle integration substeps per 60 Hz frame
export const SHUTTLE_R = 3;
export const MAX_SPEED = 1000;
export const PREDICT_DT = 1 / 240; // integration step for prediction and shot solving
export const NET_MARGIN = 6; // required clearance above the tape for a solved shot

// ---- Players ----------------------------------------------------------------
export const PLAYER = {
  run: 180,
  jumpV: 330, // apex +60 px, rise time 0.37 s
  g: 900,
  halfW: 8,
  hitOffset: 8, // racket circle center is this far toward the net
  hitH: 28, // ...and this high above the feet
  hitRadius: 16, // covers h 12..44 standing, 72..104 at the jump apex
  netClamp: 14, // body may approach the net up to this distance
  swingTime: 0.25,
};

// ---- Shot table (angles in degrees above horizontal, targets for the LEFT player) ----
export const SHOTS = {
  clear: { angle: 50, targetX: 430, jitterX: 15, jitterDeg: 3 },
  neutral: { angle: 42, targetX: 360, jitterX: 15, jitterDeg: 3 },
  drive: { angle: 12, targetX: 410, jitterX: 15, jitterDeg: 3 },
  drop: { angle: 38, targetX: 285, jitterX: 12, jitterDeg: 3 },
  highServe: { angle: 52, targetX: 430, jitterX: 10, jitterDeg: 2 },
  lowServe: { angle: 24, targetX: 300, jitterX: 10, jitterDeg: 2 },
};
export const SMASH = {
  speed: 800,
  jitterSpeed: 40,
  maxDist: 140, // max distance from the net for a smash to be legal
  minH: 60, // contact height needed (only reachable in the air); lower = more forgiving smash timing
  netMargin: NET_MARGIN,
};

// ---- CPU difficulty ---------------------------------------------------------
export const DIFFICULTY = {
  easy: { label: 'EASY', reactionMs: 350, posErrorPx: 28, speedScale: 0.75, jumpSmashProb: 0.15, dropProb: 0.1, mistakeProb: 0.25, deadZonePx: 6, judgeOut: false },
  normal: { label: 'NORMAL', reactionMs: 200, posErrorPx: 14, speedScale: 0.9, jumpSmashProb: 0.45, dropProb: 0.3, mistakeProb: 0.12, deadZonePx: 5, judgeOut: false },
  hard: { label: 'HARD', reactionMs: 80, posErrorPx: 5, speedScale: 1.0, jumpSmashProb: 0.8, dropProb: 0.45, mistakeProb: 0.04, deadZonePx: 4, judgeOut: true },
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

// ---- Timers -----------------------------------------------------------------
export const TIMERS = { serveLock: 0.5, pointBanner: 1.2, cpuServeDelay: [0.8, 1.2] };

// ---- Keys (KeyboardEvent.code) ---------------------------------------------
export const KEYS = {
  p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', action: 'Space' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', action: 'Enter' },
  menuUp: ['KeyW', 'ArrowUp'],
  menuDown: ['KeyS', 'ArrowDown'],
  menuLeft: ['KeyA', 'ArrowLeft'],
  menuRight: ['KeyD', 'ArrowRight'],
  confirm: ['Enter', 'Space'],
  back: ['Escape'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
};

// ---- Characters -------------------------------------------------------------
export const CHARS = ['lady', 'dog'];
export const CHAR_NAMES = { lady: 'FARM GIRL', dog: 'MALAMUTE' };
