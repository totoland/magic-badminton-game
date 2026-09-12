import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, buttonAt, menuRowAt, rectsOverlap, inRect, activeButtons, playButtonsActive, stickKeys, stickHit } from '../src/layout.js';

const within = (r, frame) => r.x >= 0 && r.y >= 0 && r.x + r.w <= frame.w && r.y + r.h <= frame.h;

for (const orientation of ['portrait', 'landscape']) {
  test(`${orientation}: buttons stay inside the frame and never overlap`, () => {
    const L = buildLayout(orientation, true);
    for (const b of L.buttons) assert.ok(within(b, L.frame), `${b.id} outside frame`);
    for (const a of L.buttons) for (const b of L.buttons) {
      if (a !== b) assert.ok(!rectsOverlap(a, b), `${a.id} overlaps ${b.id}`);
    }
  });

  test(`${orientation}: menu rows, start and overlay buttons are inside the frame`, () => {
    const L = buildLayout(orientation, true);
    for (const r of L.menu.rows) assert.ok(within(r, L.frame));
    assert.ok(within(L.start, L.frame));
    for (const r of [L.gameover.rematch, L.gameover.back, L.pause.resume]) if (r) assert.ok(within(r, L.frame));
  });
}

test('portrait: play buttons live below the scene, big enough for thumbs', () => {
  const L = buildLayout('portrait', true);
  const sceneBottom = L.scene.y + L.scene.h;
  for (const b of L.buttons.filter((x) => !x.system)) {
    assert.ok(b.y >= sceneBottom, `${b.id} overlaps the court`);
    assert.ok(Math.min(b.w, b.h) >= 80, `${b.id} too small`);
  }
  assert.equal(L.frame.w / L.frame.h > 0.55 && L.frame.w / L.frame.h < 0.58, true, 'frame is 9:16');
});

test('hit testing', () => {
  const L = buildLayout('portrait', true);
  const smash = L.buttons.find((b) => b.id === 'smash');
  assert.equal(buttonAt(L, { x: smash.x + 5, y: smash.y + 5 }).code, 'Space');
  assert.equal(buttonAt(L, { x: 5, y: L.scene.y + 5 }), null);
  assert.equal(menuRowAt(L, { x: 100, y: L.menu.rows[2].y + 2 }), 2);
  assert.equal(menuRowAt(L, { x: 100, y: 5 }), -1);
  assert.equal(inRect({ x: 1, y: 1 }, null), false);
});

test('landscape without touch has no overlay buttons; portrait keeps system buttons', () => {
  assert.equal(buildLayout('landscape', false).buttons.length, 0);
  assert.ok(buildLayout('portrait', false).buttons.every((b) => b.system));
});

test('play buttons are hidden and untouchable outside a live rally', () => {
  const L = buildLayout('portrait', true);
  const smash = L.buttons.find((b) => b.id === 'smash');
  const p = { x: smash.x + 5, y: smash.y + 5 };
  for (const state of ['TITLE', 'GAMEOVER']) {
    const world = { state, paused: false };
    assert.equal(playButtonsActive(world), false);
    assert.equal(buttonAt(L, p, world), null, `${state}: smash should not be hittable`);
    assert.ok(activeButtons(L, world).every((b) => b.system));
  }
  assert.equal(playButtonsActive({ state: 'RALLY', paused: true }), false);
  assert.equal(buttonAt(L, p, { state: 'RALLY', paused: false }).id, 'smash');
  assert.ok(!activeButtons(L, { state: 'TITLE', paused: false }).some((b) => b.id === 'pause'), 'no pause button on the title');
});

test('joystick sits inside the frame, clear of the smash button and the court', () => {
  for (const orientation of ['portrait', 'landscape']) {
    const L = buildLayout(orientation, true);
    const j = L.joystick;
    assert.ok(j, `${orientation} has a joystick`);
    assert.ok(j.cx - j.grab >= 0 && j.cx + j.grab <= L.frame.w && j.cy - j.grab >= 0 && j.cy + j.grab <= L.frame.h);
    const smash = L.buttons.find((b) => b.id === 'smash');
    const nearestX = Math.max(smash.x, Math.min(j.cx, smash.x + smash.w));
    const nearestY = Math.max(smash.y, Math.min(j.cy, smash.y + smash.h));
    assert.ok(Math.hypot(nearestX - j.cx, nearestY - j.cy) > j.grab, `${orientation}: stick grab area overlaps smash`);
    if (L.portrait) assert.ok(j.cy - j.grab >= L.scene.y + L.scene.h, 'stick must not cover the court');
    assert.equal(stickHit(L, { x: j.cx + 5, y: j.cy - 5 }), true);
    assert.equal(stickHit(L, { x: j.cx + j.grab + 1, y: j.cy }), false);
  }
  assert.equal(buildLayout('portrait', false).joystick, null);
});

test('stick offsets map to move / lift / drop keys with a dead zone', () => {
  assert.deepEqual([...stickKeys(0, 0)], []);
  assert.deepEqual([...stickKeys(0.1, 0.1)], []);
  assert.deepEqual([...stickKeys(1, 0)], ['KeyD']);
  assert.deepEqual([...stickKeys(-0.6, 0.2)], ['KeyA']);
  assert.deepEqual([...stickKeys(0, -1)], ['KeyW']);
  assert.deepEqual([...stickKeys(0, 0.8)], ['KeyS']);
  assert.deepEqual([...stickKeys(0.7, -0.7)].sort(), ['KeyD', 'KeyW']); // diagonal: run and lift
  assert.deepEqual([...stickKeys(0.3, -0.3)], [], 'small diagonal stays in the dead zone');
});
