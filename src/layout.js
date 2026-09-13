// Screen layouts. Pure geometry (no DOM) so it is testable in Node.
// The court scene is 320x280. Landscape shows it 1:1; portrait (9:16) wraps it at 2x in a
// 640x1138 frame: score header on top, scene in the middle, joystick + buttons below.
import { SCENE } from './config.js';
import { MENU_ROWS, STATES } from './game.js';

const PORTRAIT_BUTTONS = [
  { id: 'lift', code: 'KeyQ', x: 380, y: 720, w: 120, h: 110, label: 'LOB' },
  { id: 'drop', code: 'KeyE', x: 510, y: 720, w: 120, h: 110, label: 'DROP' },
  { id: 'smash', code: 'Space', x: 380, y: 850, w: 250, h: 210, label: 'SMASH', accent: true },
];
const PORTRAIT_SYSTEM_BUTTONS = [
  { id: 'pause', code: 'Escape', x: 568, y: 16, w: 60, h: 52, label: 'II', system: true },
  { id: 'mute', code: 'KeyM', x: 12, y: 16, w: 60, h: 52, label: 'M', system: true },
  { id: 'rotate', action: 'rotate', x: 84, y: 16, w: 76, h: 52, label: 'ROT', system: true },
];
const PORTRAIT_STICK = { cx: 190, cy: 950, r: 120, knob: 50, grab: 180 };

// Landscape on a touch device: the frame is wider than the scene, so the stick sits in the left
// gutter and the buttons in the right gutter, leaving the court unobstructed.
const LANDSCAPE_GUTTER = 160;
const LANDSCAPE_BUTTONS = [
  { id: 'lift', code: 'KeyQ', x: 496, y: 44, w: 128, h: 56, label: 'LOB' },
  { id: 'drop', code: 'KeyE', x: 496, y: 108, w: 128, h: 56, label: 'DROP' },
  { id: 'smash', code: 'Space', x: 496, y: 172, w: 128, h: 100, label: 'SMASH', accent: true },
  { id: 'pause', code: 'Escape', x: 592, y: 6, w: 44, h: 28, label: 'II', system: true },
  { id: 'mute', code: 'KeyM', x: 544, y: 6, w: 44, h: 28, label: 'M', system: true },
  { id: 'unrotate', action: 'unrotate', x: 484, y: 6, w: 56, h: 28, label: 'PORT', system: true },
];
const LANDSCAPE_STICK = { cx: 80, cy: 170, r: 56, knob: 24, grab: 78 };

/** Stick thresholds as fractions of the base radius. */
export const STICK = { dead: 0.22, side: 0.35 };

/** Map a normalized stick offset (x right, y down, in [-1, 1]) to held movement key codes (P1 map). */
export function stickKeys(nx, ny) {
  const keys = new Set();
  if (Math.hypot(nx, ny) < STICK.dead) return keys;
  if (nx <= -STICK.side) keys.add('KeyA');
  if (nx >= STICK.side) keys.add('KeyD');
  if (ny <= -STICK.side) keys.add('KeyW');
  if (ny >= STICK.side) keys.add('KeyS');
  return keys;
}

export function stickHit(L, p) {
  const j = L.joystick;
  return !!j && Math.hypot(p.x - j.cx, p.y - j.cy) <= j.grab;
}

export function landscapeLayout(touch) {
  const W = SCENE.w;
  const ox = touch ? LANDSCAPE_GUTTER : 0; // scene offset inside the frame
  const cx = ox + W / 2;
  const rows = MENU_ROWS.map((_, i) => ({ x: ox, y: 68 + i * 14 - 3, w: W, h: 14 }));
  return {
    name: 'landscape',
    portrait: false,
    touch,
    fs: 1,
    frame: { w: W + ox * 2, h: SCENE.h },
    scene: { x: ox, y: 0, w: SCENE.w, h: SCENE.h },
    score: { cx, y: 4, size: 8, gap: 12, box: { x: ox + 88, y: 1, w: 144, h: 13 } },
    label: { cx, y: 16, size: 8 },
    hint: { cx, y: 96, y2: 110, size: 8 },
    banner: { x: ox + 60, y: 92, w: 200, h: 52, size: 16, sub: 8 },
    title: { cx, y: 10, size: 24, subY: 40, subSize: 8 },
    menu: { rows, labelX: ox + 44, valueX: ox + 276, cursorX: ox + 30, size: 8, textDy: 3 },
    start: { x: ox + 60, y: 128, w: 200, h: 22, size: 8, drawBox: false },
    help: { y: 152, dy: 11, size: 8, rulesY: 266 },
    gameover: { box: { x: ox + 30, y: 86, w: 260, h: 64 }, size: 16, sub: 8, rematch: null, back: null },
    pause: { cx, y: 106, size: 16, subY: 132, sub: 8, resume: null },
    buttons: touch ? LANDSCAPE_BUTTONS : [],
    joystick: touch ? LANDSCAPE_STICK : null,
    buttonText: 8,
    buttonAlpha: 1,
    outline: 1,
    muteAt: { x: touch ? 566 : W - 4, y: touch ? 38 : 40, size: 8, align: touch ? 'center' : 'right' },
    rotatePrompt: null,
  };
}

export function portraitLayout(touch) {
  const W = 640;
  const sceneY = 130;
  const sceneH = SCENE.h * 2;
  const panelY = sceneY + sceneH; // 690
  const rows = MENU_ROWS.map((_, i) => ({ x: 24, y: 712 + i * 76, w: W - 48, h: 66 }));
  return {
    name: 'portrait',
    portrait: true,
    touch,
    fs: 2,
    frame: { w: W, h: 1138 },
    scene: { x: 0, y: sceneY, w: SCENE.w * 2, h: sceneH },
    header: { h: sceneY },
    panel: { y: panelY, h: 1138 - panelY },
    score: { cx: W / 2, y: 30, size: 24, gap: 24 },
    label: { cx: W / 2, y: 100, size: 24 },
    hint: { cx: W / 2, y: 68, y2: 98, size: 24 },
    banner: { x: 80, y: sceneY + 230, w: 480, h: 100, size: 32, sub: 24 },
    title: { cx: W / 2, y: 22, size: 40, subY: 76, subSize: 24 },
    menu: { rows, labelX: 48, valueX: 592, cursorX: 30, size: 24, textDy: 21 },
    start: { x: 160, y: 1030, w: 320, h: 88, size: 32, drawBox: true },
    help: { y: 0, dy: 0, size: 16, rulesY: 108 },
    gameover: {
      box: { x: 40, y: sceneY + 220, w: 560, h: 110 }, size: 32, sub: 24,
      rematch: { x: 80, y: 740, w: 480, h: 110, label: 'REMATCH' },
      back: { x: 80, y: 890, w: 480, h: 110, label: 'TITLE' },
    },
    pause: { cx: W / 2, y: sceneY + 250, size: 40, subY: sceneY + 310, sub: 24, resume: { x: 80, y: 740, w: 480, h: 110, label: 'RESUME' } },
    buttons: touch ? [...PORTRAIT_BUTTONS, ...PORTRAIT_SYSTEM_BUTTONS] : PORTRAIT_SYSTEM_BUTTONS,
    joystick: touch ? PORTRAIT_STICK : null,
    buttonText: 24,
    buttonAlpha: 1,
    outline: 3,
    muteAt: { x: 42, y: 74, size: 16, align: 'center' },
    rotatePrompt: {
      box: { x: 60, y: sceneY + 200, w: 520, h: 330 },
      rotate: { x: 100, y: sceneY + 330, w: 440, h: 84, label: 'ROTATE' },
      keep: { x: 100, y: sceneY + 430, w: 440, h: 84, label: 'KEEP PORTRAIT' },
    },
  };
}

export function buildLayout(orientation, touch) {
  return orientation === 'portrait' ? portraitLayout(touch) : landscapeLayout(touch);
}

/** Play controls (stick / lift / drop / smash) only exist during a live match. */
export function playButtonsActive(world) {
  return !world.paused && [STATES.SERVE, STATES.RALLY, STATES.POINT].includes(world.state);
}

/** Buttons that can be hit right now: system buttons always (no pause on the title), play buttons only in play. */
export function activeButtons(L, world) {
  const play = playButtonsActive(world);
  return L.buttons.filter((b) => (b.system ? !(b.id === 'pause' && world.state === STATES.TITLE) : play));
}

export const inRect = (p, r) => !!r && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

export function buttonAt(L, p, world = null) {
  const list = world ? activeButtons(L, world) : L.buttons;
  return list.find((b) => inRect(p, b)) || null;
}

export function menuRowAt(L, p) {
  return L.menu.rows.findIndex((r) => inRect(p, r));
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
