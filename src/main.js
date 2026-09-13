// Bootstrap: layout (landscape / 9:16 portrait), scaling, fixed-step loop, keyboard + touch, audio.
import { SCENE, STEP, KEYS, DIFFICULTY } from './config.js';
import { Keyboard, mergeIntents } from './input.js';
import { createWorld, update as updateGame, togglePause, STATES } from './game.js';
import { createAI } from './ai.js';
import { createRenderer } from './render/renderer.js';
import { drawHud } from './render/hud.js';
import { buildLayout } from './layout.js';
import { createTouch } from './touch.js';
import { audio } from './audio.js';
import { lockSupported, lockLandscape, unlockOrientation, shouldSuggestRotate, readDismissed, writeDismissed } from './orientation.js';

const scene = document.createElement('canvas');
scene.width = SCENE.w;
scene.height = SCENE.h;
const frame = document.createElement('canvas');
const fctx = frame.getContext('2d');
const screen = document.getElementById('game');
const sctx = screen.getContext('2d');

let touchMode = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
let L = buildLayout('landscape', touchMode);
let cssScale = 1;

function resize() {
  const portrait = window.innerHeight > window.innerWidth;
  L = buildLayout(portrait ? 'portrait' : 'landscape', touchMode);
  if (frame.width !== L.frame.w || frame.height !== L.frame.h) {
    frame.width = L.frame.w;
    frame.height = L.frame.h;
  }
  fctx.imageSmoothingEnabled = false;
  let scale = Math.min(window.innerWidth / L.frame.w, window.innerHeight / L.frame.h);
  if (scale >= 2) scale = Math.floor(scale); // integer scaling on big screens, fill on phones
  cssScale = scale;
  const cssW = Math.floor(L.frame.w * scale);
  const cssH = Math.floor(L.frame.h * scale);
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  screen.style.width = `${cssW}px`;
  screen.style.height = `${cssH}px`;
  screen.width = Math.round(cssW * dpr);
  screen.height = Math.round(cssH * dpr);
  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

const kb = new Keyboard().attach(window);
const world = createWorld();
const renderer = createRenderer(scene);
const prefs = { rotatePrompt: 'closed', lockSupported: lockSupported(), toast: '', toastUntil: 0 };
function toast(msg, seconds = 2.5) { prefs.toast = msg; prefs.toastUntil = world.time + seconds; }
function maybeSuggestRotate() {
  if (prefs.rotatePrompt === 'done') return;
  prefs.rotatePrompt = shouldSuggestRotate({ touch: touchMode, portrait: L.portrait, dismissed: readDismissed() }) ? 'open' : 'closed';
}
async function onAction(action) {
  if (action === 'keep') { prefs.rotatePrompt = 'done'; writeDismissed(); return; }
  if (action === 'rotate') {
    prefs.rotatePrompt = 'done';
    writeDismissed();
    if (!prefs.lockSupported) { toast('TURN YOUR PHONE SIDEWAYS'); return; }
    const ok = await lockLandscape();
    if (!ok) toast('ROTATE NOT ALLOWED HERE: TURN THE PHONE');
    return;
  }
  if (action === 'unrotate') await unlockOrientation();
}
const touch = createTouch({
  canvas: screen, kb, world, getLayout: () => L, getScale: () => cssScale, prefs, onAction,
  onTouchDetected: () => { touchMode = true; resize(); maybeSuggestRotate(); },
});
resize();
maybeSuggestRotate();
let ai = null;
let aiMatchId = -1;

function uiIntent() {
  return {
    up: kb.justPressed(KEYS.menuUp),
    down: kb.justPressed(KEYS.menuDown),
    left: kb.justPressed(KEYS.menuLeft),
    right: kb.justPressed(KEYS.menuRight),
    confirm: kb.justPressed(KEYS.confirm),
    back: kb.justPressed(KEYS.back),
    pause: kb.justPressed(KEYS.pause),
    mute: kb.justPressed(KEYS.mute),
  };
}

function tick(dt) {
  const ui = uiIntent();
  if (ui.mute) audio.toggleMute();
  let i1 = kb.intent(KEYS.p1);
  let i2 = kb.intent(KEYS.p2);
  if (world.settings.mode === '1p' && world.state !== STATES.TITLE) {
    i1 = mergeIntents(i1, i2); // both keymaps drive the human
    if (world.matchId !== aiMatchId) {
      ai = createAI(DIFFICULTY[world.settings.difficulty], 1);
      aiMatchId = world.matchId;
    }
    i2 = ai.update(world, dt);
  }
  updateGame(world, [i1, i2], ui, dt);
  for (const ev of world.events) audio.play(ev);
  world.events.length = 0;
  kb.endFrame();
}

function compose() {
  renderer.draw(world);
  fctx.fillStyle = '#101420';
  fctx.fillRect(0, 0, L.frame.w, L.frame.h);
  if (L.portrait) {
    fctx.fillStyle = '#151a2b';
    fctx.fillRect(0, 0, L.frame.w, L.header.h);
    fctx.fillStyle = '#2a3552';
    fctx.fillRect(0, L.header.h - 2, L.frame.w, 2);
    fctx.fillRect(0, L.panel.y, L.frame.w, 2);
  } else if (L.scene.x > 0) {
    fctx.fillStyle = '#2a3552';
    fctx.fillRect(L.scene.x - 2, 0, 2, L.frame.h);
    fctx.fillRect(L.scene.x + L.scene.w, 0, 2, L.frame.h);
  }
  fctx.drawImage(scene, L.scene.x, L.scene.y, L.scene.w, L.scene.h);
  drawHud(fctx, world, L, { touch, muted: audio.muted, prefs });
  sctx.drawImage(frame, 0, 0, screen.width, screen.height);
}

let last = performance.now();
let acc = 0;
function loop(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    tick(STEP);
    acc -= STEP;
  }
  compose();
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    touch.releaseAll();
    if (!world.paused) togglePause(world);
  }
});
window.addEventListener('keydown', () => audio.init(), { once: true });
screen.addEventListener('pointerdown', () => audio.init(), { once: true });

// Exposed for debugging and scripted checks in the console.
window.__badminton = { world, tick, kb, compose, prefs, getLayout: () => L, getScale: () => cssScale };

const fontReady = document.fonts ? document.fonts.load('8px "Press Start 2P"').catch(() => null) : Promise.resolve();
Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  last = performance.now();
  requestAnimationFrame(loop);
});
