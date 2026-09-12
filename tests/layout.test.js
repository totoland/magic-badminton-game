import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, buttonAt, menuRowAt, rectsOverlap, inRect, activeButtons, playButtonsActive, stickKeys, stickHit } from '../src/layout.js';

const within = (r, frame) => r.x >= 0 && r.y >= 0 && r.x + r.w <= frame.w && r.y + r.h <= frame.h;

for (const orientation of ['portrait', 'landscape']) {
  test(`${orientation}: buttons stay inside the frame and never overlap`, () => {
    const L = buildLayout(orientation, true);
    for (const b of L.buttons) assert.ok(within(b, L.frame), `${b.id} outside frame`);
    for (const a of L.buttons) for (const b of L.buttons) if (a !== b) assert.ok(!rectsOverlap(a, b), `${a.id} overlaps ${b.id}`);
    for (const r of L.menu.rows) assert.ok(within(r, L.frame));
    assert.ok(within(L.start, L.frame));
    for (const r of [L.gameover.rematch, L.gameover.back, L.pause.resume]) if (r) assert.ok(within(r, L.frame));
  });

  test(`${orientation}: joystick sits inside the frame, clear of the buttons`, () => {
    const L = buildLayout(orientation, true);
    const j = L.joystick;
    assert.ok(j.cx - j.grab >= 0 && j.cx + j.grab <= L.frame.w && j.cy - j.grab >= 0 && j.cy + j.grab <= L.frame.h);
    for (const b of L.buttons.filter((x) => !x.system)) {
      const nx = Math.max(b.x, Math.min(j.cx, b.x + b.w));
      const ny = Math.max(b.y, Math.min(j.cy, b.y + b.h));
      assert.ok(Math.hypot(nx - j.cx, ny - j.cy) > j.grab, `${orientation}: stick grab area overlaps ${b.id}`);
    }
    assert.equal(stickHit(L, { x: j.cx + 5, y: j.cy - 5 }), true);
    assert.equal(stickHit(L, { x: j.cx + j.grab + 1, y: j.cy }), false);
  });
}

test('portrait: play controls live below the scene, big enough for thumbs; frame is 9:16', () => {
  const L = buildLayout('portrait', true);
  const sceneBottom = L.scene.y + L.scene.h;
  for (const b of L.buttons.filter((x) => !x.system)) {
    assert.ok(b.y >= sceneBottom, `${b.id} overlaps the court`);
    assert.ok(Math.min(b.w, b.h) >= 100, `${b.id} too small`);
  }
  assert.ok(L.joystick.cy - L.joystick.grab >= sceneBottom);
  const ratio = L.frame.w / L.frame.h;
  assert.ok(ratio > 0.55 && ratio < 0.58, 'frame is 9:16');
  assert.equal(L.scene.w, 640);
});

test('stick offsets map to 4-way movement with a dead zone', () => {
  assert.deepEqual([...stickKeys(0, 0)], []);
  assert.deepEqual([...stickKeys(0.1, 0.1)], []);
  assert.deepEqual([...stickKeys(1, 0)], ['KeyD']);
  assert.deepEqual([...stickKeys(-0.6, 0.2)], ['KeyA']);
  assert.deepEqual([...stickKeys(0, -1)], ['KeyW']);
  assert.deepEqual([...stickKeys(0, 0.8)], ['KeyS']);
  assert.deepEqual([...stickKeys(0.7, -0.7)].sort(), ['KeyD', 'KeyW']);
});

test('play buttons are hidden and untouchable outside a live rally', () => {
  const L = buildLayout('portrait', true);
  const smash = L.buttons.find((b) => b.id === 'smash');
  const p = { x: smash.x + 5, y: smash.y + 5 };
  for (const state of ['TITLE', 'GAMEOVER']) {
    const world = { state, paused: false };
    assert.equal(playButtonsActive(world), false);
    assert.equal(buttonAt(L, p, world), null);
    assert.ok(activeButtons(L, world).every((b) => b.system));
  }
  assert.equal(buttonAt(L, p, { state: 'RALLY', paused: false }).id, 'smash');
  assert.equal(menuRowAt(L, { x: 100, y: L.menu.rows[2].y + 2 }), 2);
  assert.equal(inRect({ x: 1, y: 1 }, null), false);
  assert.equal(buildLayout('landscape', false).buttons.length, 0);
});

test('landscape touch: controls live in the side gutters, never over the court; desktop has no gutters', () => {
  const L = buildLayout('landscape', true);
  assert.equal(L.frame.w, 640);
  assert.equal(L.scene.x, 160);
  for (const b of L.buttons) assert.ok(!rectsOverlap(b, L.scene), `${b.id} overlaps the scene`);
  const j = L.joystick;
  assert.ok(j.cx + j.grab <= L.scene.x, 'stick stays left of the scene');
  const D = buildLayout('landscape', false);
  assert.equal(D.frame.w, 320);
  assert.equal(D.scene.x, 0);
  assert.equal(D.joystick, null);
});
