// Pointer (touch / mouse) input. The joystick and buttons feed the Keyboard as if keys were
// pressed, so the game and the CPU never know the difference. Tap zones drive menus and overlays.
import { buttonAt, menuRowAt, inRect, stickHit, stickKeys, playButtonsActive } from './layout.js';
import { STATES } from './game.js';

export function createTouch({ canvas, kb, world, getLayout, getScale, onTouchDetected }) {
  const active = new Map(); // pointerId -> button
  const down = new Set(); // button ids currently held (for drawing)
  const stick = { pointerId: null, dx: 0, dy: 0, keys: new Set() };
  let touchSeen = false;

  const toFrame = (e) => {
    const r = canvas.getBoundingClientRect();
    const s = getScale();
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  const press = (b) => { down.add(b.id); kb.press(b.code); };
  const release = (b) => { down.delete(b.id); kb.release(b.code); };

  function stickApply(next) {
    for (const k of stick.keys) if (!next.has(k)) kb.release(k);
    for (const k of next) if (!stick.keys.has(k)) kb.press(k);
    stick.keys = next;
  }
  function stickMove(L, p) {
    const j = L.joystick;
    let dx = p.x - j.cx;
    let dy = p.y - j.cy;
    const m = Math.hypot(dx, dy);
    if (m > j.r) { dx *= j.r / m; dy *= j.r / m; }
    stick.dx = dx;
    stick.dy = dy;
    stickApply(stickKeys(dx / j.r, dy / j.r));
    kb.setAim(Math.max(-1, Math.min(1, dx / j.r))); // continuous lateral aim
  }
  function stickRelease() {
    stickApply(new Set());
    stick.dx = 0;
    stick.dy = 0;
    stick.pointerId = null;
    kb.setAim(null);
  }

  function tapZone(L, p) {
    const inScene = inRect(p, L.scene);
    if (world.state === STATES.TITLE) {
      const row = menuRowAt(L, p);
      if (row >= 0) { world.menu.cursor = row; kb.tap('ArrowRight'); return; }
      if (inRect(p, L.start) || (!L.portrait && inScene && p.y >= L.start.y)) kb.tap('Enter');
      return;
    }
    if (world.paused) {
      if (inRect(p, L.pause.resume) || inScene) kb.tap('Escape');
      return;
    }
    if (world.state === STATES.GAMEOVER) {
      if (inRect(p, L.gameover.rematch)) kb.tap('Enter');
      else if (inRect(p, L.gameover.back)) kb.tap('Escape');
      else if (!L.portrait && inScene) kb.tap('Enter');
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (e.pointerType !== 'mouse' && !touchSeen) { touchSeen = true; onTouchDetected?.(); }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    const L = getLayout();
    const p = toFrame(e);
    if (stick.pointerId === null && playButtonsActive(world) && stickHit(L, p)) {
      stick.pointerId = e.pointerId;
      stickMove(L, p);
      return;
    }
    const b = buttonAt(L, p, world);
    if (b) { active.set(e.pointerId, b); press(b); return; }
    tapZone(L, p);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.pointerId) { e.preventDefault(); stickMove(getLayout(), toFrame(e)); return; }
    if (!active.has(e.pointerId)) return;
    e.preventDefault();
    const cur = active.get(e.pointerId);
    const b = buttonAt(getLayout(), toFrame(e), world);
    if (b === cur) return;
    if (cur) release(cur);
    if (b && !b.system) { press(b); active.set(e.pointerId, b); } else active.set(e.pointerId, null);
  });
  const end = (e) => {
    if (e.pointerId === stick.pointerId) { stickRelease(); return; }
    if (!active.has(e.pointerId)) return;
    const cur = active.get(e.pointerId);
    if (cur) release(cur);
    active.delete(e.pointerId);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    isDown: (id) => down.has(id),
    getStick: () => ({ dx: stick.dx, dy: stick.dy, active: stick.pointerId !== null }),
    get touchMode() { return touchSeen; },
    releaseAll() {
      for (const b of active.values()) if (b) release(b);
      active.clear();
      stickRelease();
    },
  };
}
