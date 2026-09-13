// All text, menus, overlays and touch controls. Drawn on the frame using a layout (see layout.js).
import { DIFFICULTY, CHAR_NAMES } from '../config.js';
import { scoreLabel } from '../rules.js';
import { STATES, MENU_ROWS, nameOf } from '../game.js';
import { drawShuttle } from './sprites.js';
import { activeButtons, playButtonsActive } from '../layout.js';

const FONT = '"Press Start 2P", "Courier New", monospace';

export function text(ctx, str, x, y, { size = 8, color = '#fff', align = 'center', shadow = true } = {}) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  if (shadow) {
    const d = size >= 16 ? 2 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(str, x + d, y + d);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function measure(ctx, str, size) {
  ctx.font = `${size}px ${FONT}`;
  return ctx.measureText(str).width;
}

export function box(ctx, x, y, w, h, { fill = 'rgba(10, 12, 24, 0.78)', stroke = '#f4f4f4', line = 1 } = {}) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = stroke;
  ctx.fillRect(x, y, w, line);
  ctx.fillRect(x, y + h - line, w, line);
  ctx.fillRect(x, y, line, h);
  ctx.fillRect(x + w - line, y, line, h);
}

function overlayScene(ctx, L, alpha = 0.55) {
  ctx.fillStyle = `rgba(10, 12, 24, ${alpha})`;
  ctx.fillRect(L.scene.x, L.scene.y, L.scene.w, L.scene.h);
}

const blink = (world, period = 0.8) => Math.floor(world.time / period) % 2 === 0;

export function drawButton(ctx, L, b, pressed) {
  let fill = pressed ? '#5b6a9a' : '#2f3a5c';
  if (b.accent) fill = pressed ? '#ff8a6c' : '#d94b3a';
  if (b.system) fill = pressed ? '#3b4770' : '#1f2740';
  ctx.globalAlpha = L.buttonAlpha;
  box(ctx, b.x, b.y, b.w, b.h, { fill, stroke: pressed ? '#ffd166' : '#c9d0e6', line: L.outline });
  const size = L.buttonText;
  text(ctx, b.label, b.x + b.w / 2, b.y + (b.h - size) / 2, { size, shadow: false });
  ctx.globalAlpha = 1;
}

function circle(ctx, x, y, r, fill, stroke, line) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Virtual joystick (4-way move): base ring with direction marks, knob follows the finger. */
export function drawJoystick(ctx, L, stick) {
  const j = L.joystick;
  const on = !!(stick && stick.active);
  const size = L.buttonText;
  ctx.globalAlpha = L.buttonAlpha;
  circle(ctx, j.cx, j.cy, j.r + L.outline, 'rgba(47, 58, 92, 0.85)', on ? '#ffd166' : '#c9d0e6', L.outline);
  const dim = '#9aa4c8';
  text(ctx, '<', j.cx - j.r + size * 0.8, j.cy - size / 2, { size, color: dim, shadow: false });
  text(ctx, '>', j.cx + j.r - size * 0.8, j.cy - size / 2, { size, color: dim, shadow: false });
  text(ctx, '^', j.cx, j.cy - j.r + size * 0.4, { size, color: dim, shadow: false });
  text(ctx, 'v', j.cx, j.cy + j.r - size * 1.4, { size, color: dim, shadow: false });
  const dx = stick ? stick.dx : 0;
  const dy = stick ? stick.dy : 0;
  circle(ctx, j.cx + dx, j.cy + dy, j.knob, on ? '#ffd166' : '#8f9bc4', '#f4f4f4', L.outline);
  ctx.globalAlpha = 1;
}

function drawBigButton(ctx, L, rect) {
  if (!rect) return;
  const size = L.portrait ? 32 : 16;
  box(ctx, rect.x, rect.y, rect.w, rect.h, { fill: '#2f3a5c', stroke: '#c9d0e6', line: L.outline });
  text(ctx, rect.label, rect.x + rect.w / 2, rect.y + (rect.h - size) / 2, { size });
}

export function drawScore(ctx, world, L) {
  const S = L.score;
  const [a, b] = world.score;
  if (S.box) box(ctx, S.box.x, S.box.y, S.box.w, S.box.h, { fill: 'rgba(10, 12, 24, 0.85)', stroke: '#c9d0e6', line: L.outline });
  const left = `${nameOf(world, -1)} ${a}`;
  const right = `${b} ${nameOf(world, 1)}`;
  text(ctx, left, S.cx - S.gap, S.y, { align: 'right', size: S.size });
  text(ctx, '-', S.cx, S.y, { size: S.size });
  text(ctx, right, S.cx + S.gap, S.y, { align: 'left', size: S.size });
  const lw = measure(ctx, left, S.size);
  const rw = measure(ctx, right, S.size);
  const mx = world.server < 0 ? S.cx - S.gap - lw - S.size : S.cx + S.gap + rw + S.size;
  ctx.save();
  ctx.translate(mx, S.y + S.size / 2);
  ctx.scale(L.fs, L.fs);
  drawShuttle(ctx, 0, 0, world.server < 0 ? 0 : Math.PI);
  ctx.restore();
  const label = scoreLabel(a, b);
  if (label) text(ctx, label, L.label.cx, L.label.y, { color: '#ffd166', size: L.label.size });
}

export function drawServeHint(ctx, world, L) {
  const humanServer = world.settings.mode === '2p' || world.server < 0;
  const who = nameOf(world, world.server);
  text(ctx, `${who} TO SERVE`, L.hint.cx, L.hint.y, { color: '#cfd8ff', size: L.hint.size });
  if (humanServer && blink(world)) {
    let hint = world.server < 0 || world.settings.mode === '1p' ? 'SPACE LONG   E SHORT' : 'ENTER LONG   , SHORT';
    if (L.touch) hint = 'SMASH LONG   DROP SHORT';
    text(ctx, hint, L.hint.cx, L.hint.y2, { color: '#ffd166', size: L.hint.size });
  }
}

export function drawBanner(ctx, world, L) {
  const B = L.banner;
  box(ctx, B.x, B.y, B.w, B.h, { line: L.outline });
  text(ctx, world.banner, B.x + B.w / 2, B.y + B.h * 0.2, { size: B.size, color: '#ffd166' });
  text(ctx, world.subBanner, B.x + B.w / 2, B.y + B.h * 0.68, { size: B.sub, color: '#f4f4f4' });
}

export function drawPause(ctx, world, L) {
  overlayScene(ctx, L, 0.45);
  text(ctx, 'PAUSED', L.pause.cx, L.pause.y, { size: L.pause.size });
  const hint = L.touch ? 'TAP: RESUME' : 'P: RESUME   M: MUTE';
  text(ctx, hint, L.pause.cx, L.pause.subY, { color: '#cfd8ff', size: L.pause.sub });
  drawBigButton(ctx, L, L.pause.resume);
  void world;
}

export function drawGameOver(ctx, world, L) {
  overlayScene(ctx, L, 0.5);
  const G = L.gameover;
  box(ctx, G.box.x, G.box.y, G.box.w, G.box.h, { line: L.outline });
  text(ctx, world.banner, G.box.x + G.box.w / 2, G.box.y + G.box.h * 0.2, { size: G.size, color: '#ffd166' });
  if (!L.touch && blink(world)) text(ctx, world.subBanner, G.box.x + G.box.w / 2, G.box.y + G.box.h * 0.64, { size: G.sub });
  drawBigButton(ctx, L, G.rematch);
  drawBigButton(ctx, L, G.back);
}

export function drawTitle(ctx, world, L) {
  const st = world.settings;
  const T = L.title;
  text(ctx, 'BADMINTON', T.cx, T.y, { size: T.size, color: '#ffd166' });
  text(ctx, `${CHAR_NAMES[st.chars[0]]}  vs  ${CHAR_NAMES[st.chars[1]]}`, T.cx, T.subY, { color: '#cfd8ff', size: T.subSize });

  const values = {
    mode: ['MODE', st.mode === '1p' ? '1P VS CPU' : '2P LOCAL'],
    difficulty: ['CPU LEVEL', DIFFICULTY[st.difficulty].label],
    p1: ['P1', CHAR_NAMES[st.chars[0]]],
    p2: ['P2', CHAR_NAMES[st.chars[1]]],
    stick: ['CONTROLS', st.stickSide === 'right' ? 'STICK RIGHT' : 'STICK LEFT'],
  };
  const M = L.menu;
  MENU_ROWS.forEach((key, i) => {
    const r = M.rows[i];
    const y = r.y + M.textDy;
    const active = world.menu.cursor === i;
    const dim = key === 'difficulty' && st.mode === '2p';
    const color = dim ? '#6b7290' : active ? '#ffd166' : '#f4f4f4';
    if (L.portrait) box(ctx, r.x, r.y, r.w, r.h, { fill: active ? 'rgba(255, 209, 102, 0.12)' : 'rgba(255,255,255,0.05)', stroke: active ? '#ffd166' : '#3a4568', line: L.outline });
    text(ctx, active ? '>' : '', M.cursorX, y, { align: 'left', color, size: M.size });
    text(ctx, values[key][0], M.labelX, y, { align: 'left', color, size: M.size });
    text(ctx, `< ${values[key][1]} >`, M.valueX, y, { align: 'right', color, size: M.size });
  });

  const S = L.start;
  if (S.drawBox) {
    box(ctx, S.x, S.y, S.w, S.h, { fill: '#d94b3a', stroke: '#ffd166', line: L.outline });
    text(ctx, 'START', S.x + S.w / 2, S.y + (S.h - S.size) / 2, { size: S.size });
  } else if (blink(world)) {
    text(ctx, L.touch ? 'TAP TO START' : 'PRESS ENTER', S.x + S.w / 2, S.y + (S.h - S.size) / 2, { color: '#ffd166', size: S.size });
  }

  if (!L.portrait && !L.touch) {
    text(ctx, 'P1: WASD  Q LOB  E DROP  SPACE SMASH', T.cx, L.help.y, { size: L.help.size, color: '#9aa4c8' });
    text(ctx, 'P2: ARROWS  . LOB  , DROP  ENTER SMASH', T.cx, L.help.y + L.help.dy, { size: L.help.size, color: '#9aa4c8' });
    text(ctx, 'HOLD < > AT CONTACT TO AIM', T.cx, L.help.y + L.help.dy * 2, { size: L.help.size, color: '#ffd166' });
  }
  text(ctx, L.portrait ? 'RALLY TO 21 - WIN BY 2 - CAP 30' : 'RALLY TO 21, WIN BY 2, CAP 30', T.cx, L.help.rulesY, { size: L.help.size, color: '#9aa4c8' });
}

function drawRotatePrompt(ctx, L, prefs) {
  const P = L.rotatePrompt;
  overlayScene(ctx, L, 0.6);
  box(ctx, P.box.x, P.box.y, P.box.w, P.box.h, { line: L.outline });
  text(ctx, prefs.lockSupported ? 'FULLSCREEN: WHICH WAY?' : 'PLAY IN LANDSCAPE?', P.box.x + P.box.w / 2, P.box.y + 28, { size: 24, color: '#ffd166' });
  const sub = prefs.lockSupported ? 'LOCKS THE SCREEN, HIDES THE BROWSER BAR' : 'TURN YOUR PHONE SIDEWAYS';
  text(ctx, sub, P.box.x + P.box.w / 2, P.box.y + 72, { size: 16, color: '#cfd8ff' });
  drawBigButton(ctx, L, P.rotate);
  drawBigButton(ctx, L, P.keep);
}

/** Draw everything that is not the court scene. */
export function drawHud(ctx, world, L, { touch, muted, prefs = {} } = {}) {
  if (world.state === STATES.TITLE) {
    drawTitle(ctx, world, L);
  } else {
    drawScore(ctx, world, L);
    if (world.paused) drawPause(ctx, world, L);
    else if (world.state === STATES.SERVE) drawServeHint(ctx, world, L);
    else if (world.state === STATES.POINT) drawBanner(ctx, world, L);
    else if (world.state === STATES.GAMEOVER) drawGameOver(ctx, world, L);
  }
  for (const b of activeButtons(L, world)) drawButton(ctx, L, b, touch ? touch.isDown(b.id) : false);
  if (L.joystick && playButtonsActive(world)) drawJoystick(ctx, L, touch ? touch.getStick() : null);
  if (muted) text(ctx, 'MUTE', L.muteAt.x, L.muteAt.y, { align: L.muteAt.align, color: '#ffd166', size: L.muteAt.size });
  if (prefs.toast && world.time < prefs.toastUntil) {
    const y = L.portrait ? L.scene.y + L.scene.h - 40 : L.scene.y + L.scene.h - 20;
    text(ctx, prefs.toast, L.scene.x + L.scene.w / 2, y, { size: L.portrait ? 16 : 8, color: '#ffd166' });
  }
  if (prefs.rotatePrompt === 'open' && L.rotatePrompt) drawRotatePrompt(ctx, L, prefs);
}
