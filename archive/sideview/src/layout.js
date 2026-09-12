// Screen layouts. Pure geometry (no DOM) so it is testable in Node.
// The court scene is always 480x270. Landscape shows it as-is; portrait (9:16) wraps it in a
// 480x853 frame: score header on top, scene in the middle, touch controls / menus below.
import { W, H } from './config.js';
import { MENU_ROWS, STATES } from './game.js';

export const SCENE = { w: W, h: H };

// Touch controls map straight onto keyboard codes, so the game logic never knows about touch.
// Left thumb: a virtual joystick (left/right = move, up = jump/lift, down = drop). Right thumb: SMASH.
const PORTRAIT_BUTTONS = [
  { id: 'smash', code: 'Space', x: 320, y: 600, w: 140, h: 170, label: 'SMASH', accent: true },
];
const PORTRAIT_STICK = { cx: 140, cy: 690, r: 84, knob: 36, grab: 130 };
const PORTRAIT_SYSTEM_BUTTONS = [
  { id: 'pause', code: 'Escape', x: 416, y: 12, w: 52, h: 44, label: 'II', system: true },
  { id: 'mute', code: 'KeyM', x: 12, y: 12, w: 52, h: 44, label: 'M', system: true },
];
// Landscape touch fallback: translucent overlay on the wall band of the scene.
const LANDSCAPE_BUTTONS = [
  { id: 'smash', code: 'Space', x: 404, y: 96, w: 70, h: 96, label: 'SMASH', accent: true },
  { id: 'pause', code: 'Escape', x: 440, y: 30, w: 36, h: 22, label: 'II', system: true },
  { id: 'mute', code: 'KeyM', x: 400, y: 30, w: 36, h: 22, label: 'M', system: true },
];
const LANDSCAPE_STICK = { cx: 66, cy: 148, r: 42, knob: 18, grab: 66 };

/** Stick thresholds as fractions of the base radius. */
export const STICK = { dead: 0.22, side: 0.35, vertical: 0.55 };

/** Map a normalized stick offset (x right, y down, both in [-1, 1]) to held key codes. */
export function stickKeys(nx, ny) {
  const keys = new Set();
  if (Math.hypot(nx, ny) < STICK.dead) return keys;
  if (nx <= -STICK.side) keys.add('KeyA');
  if (nx >= STICK.side) keys.add('KeyD');
  if (ny <= -STICK.vertical) keys.add('KeyW');
  if (ny >= STICK.vertical) keys.add('KeyS');
  return keys;
}

/** Is a frame-space point on the joystick's grab area? */
export function stickHit(L, p) {
  const j = L.joystick;
  return !!j && Math.hypot(p.x - j.cx, p.y - j.cy) <= j.grab;
}

export function landscapeLayout(touch) {
  const rows = MENU_ROWS.map((_, i) => ({ x: 0, y: 72 + i * 14 - 3, w: W, h: 14 }));
  return {
    name: 'landscape',
    portrait: false,
    touch,
    fs: 1, // text scale factor
    frame: { w: W, h: H },
    scene: { x: 0, y: 0, ...SCENE },
    score: { cx: W / 2, y: 6, size: 8, gap: 12 },
    label: { cx: W / 2, y: 18, size: 8 },
    hint: { cx: W / 2, y: 96, y2: 110, size: 8 },
    banner: { x: 120, y: 84, w: 240, h: 52, size: 16, sub: 8 },
    title: { cx: W / 2, y: 20, size: 24, subY: 50, subSize: 8 },
    menu: { rows, labelX: 128, valueX: 360, cursorX: 112, size: 8, textDy: 3 },
    start: { x: 120, y: 126, w: 240, h: 22, size: 8, drawBox: false },
    help: { y: 150, dy: 11, size: 8, rulesY: 206 },
    gameover: { box: { x: 90, y: 80, w: 300, h: 64 }, size: 16, sub: 8, rematch: null, back: null },
    pause: { cx: W / 2, y: 100, size: 16, subY: 126, sub: 8, resume: null },
    buttons: touch ? LANDSCAPE_BUTTONS : [],
    joystick: touch ? LANDSCAPE_STICK : null,
    buttonText: 8,
    buttonAlpha: 0.5,
    outline: 1,
    muteAt: { x: W - 6, y: 6, size: 8, align: 'right' },
  };
}

export function portraitLayout(touch) {
  const sceneY = 176;
  const panelY = sceneY + H; // 446
  const rows = MENU_ROWS.map((_, i) => ({ x: 16, y: 470 + i * 58, w: W - 32, h: 50 }));
  return {
    name: 'portrait',
    portrait: true,
    touch,
    fs: 2,
    frame: { w: W, h: 853 },
    scene: { x: 0, y: sceneY, ...SCENE },
    header: { h: sceneY },
    panel: { y: panelY, h: 853 - panelY },
    score: { cx: W / 2, y: 76, size: 24, gap: 24 },
    label: { cx: W / 2, y: 120, size: 16 },
    hint: { cx: W / 2, y: 462, y2: 490, size: 16 },
    banner: { x: 60, y: sceneY + 95, w: 360, h: 80, size: 32, sub: 16 },
    title: { cx: W / 2, y: 36, size: 32, subY: 92, subSize: 16 },
    menu: { rows, labelX: 32, valueX: 448, cursorX: 20, size: 16, textDy: 17 },
    start: { x: 100, y: 712, w: 280, h: 84, size: 24, drawBox: true },
    help: { y: 0, dy: 0, size: 16, rulesY: 816 },
    gameover: {
      box: { x: 40, y: sceneY + 90, w: 400, h: 90 }, size: 24, sub: 16,
      rematch: { x: 60, y: 520, w: 360, h: 90, label: 'REMATCH' },
      back: { x: 60, y: 640, w: 360, h: 90, label: 'TITLE' },
    },
    pause: { cx: W / 2, y: sceneY + 110, size: 32, subY: sceneY + 160, sub: 16, resume: { x: 60, y: 520, w: 360, h: 90, label: 'RESUME' } },
    buttons: touch ? [...PORTRAIT_BUTTONS, ...PORTRAIT_SYSTEM_BUTTONS] : PORTRAIT_SYSTEM_BUTTONS,
    joystick: touch ? PORTRAIT_STICK : null,
    buttonText: 16,
    buttonAlpha: 1,
    outline: 2,
    muteAt: { x: 38, y: 62, size: 8, align: 'center' },
  };
}

export function buildLayout(orientation, touch) {
  return orientation === 'portrait' ? portraitLayout(touch) : landscapeLayout(touch);
}

/** Play buttons (move / lift / drop / smash) only exist during a live match. */
export function playButtonsActive(world) {
  return !world.paused && [STATES.SERVE, STATES.RALLY, STATES.POINT].includes(world.state);
}

/** Buttons that can be hit right now: system buttons always, play buttons only in play. */
export function activeButtons(L, world) {
  const play = playButtonsActive(world);
  return L.buttons.filter((b) => b.system ? !(b.id === 'pause' && world.state === STATES.TITLE) : play);
}

export const inRect = (p, r) => !!r && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

/** Which touch button (if any) is under a frame-space point. Pass `world` to respect state gating. */
export function buttonAt(L, p, world = null) {
  const list = world ? activeButtons(L, world) : L.buttons;
  return list.find((b) => inRect(p, b)) || null;
}

/** Menu row index under a point, or -1. */
export function menuRowAt(L, p) {
  return L.menu.rows.findIndex((r) => inRect(p, r));
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
