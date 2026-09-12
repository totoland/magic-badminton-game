import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, placePlayer, updatePlayer, inReach, hitCenter, nearLanding } from '../src/entities/player.js';
import { EMPTY_INTENT } from '../src/input.js';
import { COURT, PLAYER, SCENE } from '../src/config.js';
import { project } from '../src/render/camera.js';

const it = (o) => ({ ...EMPTY_INTENT, ...o });
const land = (p) => { let n = 0; while (!p.grounded && n < 300) { updatePlayer(p, EMPTY_INTENT, 1 / 60); n += 1; } };

test('the smash key alone takes off and arms the attack; landing disarms it', () => {
  const p = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p, 0, -150);
  updatePlayer(p, it({ smashPressed: true, smash: true }), 1 / 60);
  assert.equal(p.grounded, false);
  assert.equal(p.attack, true);
  land(p);
  assert.equal(p.y, 0);
  assert.equal(p.attack, false);
});

test('the lob key never takes off; only the smash key jumps', () => {
  const p = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p, 0, -150);
  updatePlayer(p, it({ lift: true, liftPressed: true }), 1 / 60);
  assert.equal(p.grounded, true);
  updatePlayer(p, it({ drop: true, dropPressed: true }), 1 / 60);
  assert.equal(p.grounded, true);
});

test('movement is screen-relative on both sides and clamped to the own half', () => {
  const p1 = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p1, 0, -100);
  for (let i = 0; i < 120; i += 1) updatePlayer(p1, it({ up: true, right: true }), 1 / 60);
  assert.equal(p1.z, -PLAYER.netClamp, 'P1 stops at the net');
  assert.ok(p1.x > 50);
  const p2 = createPlayer({ side: 1, char: 'dog' });
  placePlayer(p2, 0, 100);
  for (let i = 0; i < 120; i += 1) updatePlayer(p2, it({ down: true }), 1 / 60);
  assert.equal(p2.z, PLAYER.netClamp, 'P2 moving down on screen reaches the net');
  for (let i = 0; i < 300; i += 1) updatePlayer(p2, it({ up: true, left: true }), 1 / 60);
  assert.equal(p2.z, COURT.halfLen + PLAYER.backMargin);
  assert.equal(p2.x, -(COURT.halfW + PLAYER.sideMargin));
});

test('holding the stick into any corner keeps both players inside the scene', () => {
  const dirs = [{ up: true, left: true }, { up: true, right: true }, { down: true, left: true }, { down: true, right: true }, { left: true }, { right: true }, { down: true }, { up: true }];
  for (const side of [-1, 1]) {
    for (const d of dirs) {
      const p = createPlayer({ side, char: 'lady' });
      placePlayer(p, 0, side * 110);
      for (let i = 0; i < 400; i += 1) updatePlayer(p, it(d), 1 / 60);
      const pr = project(p.x, p.z, 0);
      assert.ok(pr.sx >= PLAYER.edgePad - 1 && pr.sx <= SCENE.w - PLAYER.edgePad + 1, `side ${side} ${JSON.stringify(d)}: sx=${pr.sx.toFixed(0)}`);
      assert.ok(pr.ground <= SCENE.h - 2 && pr.ground >= 40, `side ${side} ${JSON.stringify(d)}: ground y=${pr.ground.toFixed(0)}`);
    }
  }
});

test('racket reach is an ellipsoid in front of the player', () => {
  const p = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p, 0, -100);
  const c = hitCenter(p);
  assert.deepEqual(c, { x: 0, z: -92, y: 28 });
  assert.equal(inReach(p, { x: 0, z: -92, y: 28 }), true);
  assert.equal(inReach(p, { x: 20, z: -92, y: 28 }), true);
  assert.equal(inReach(p, { x: 30, z: -92, y: 28 }), false);
  assert.equal(inReach(p, { x: 0, z: -60, y: 28 }), false);
  assert.equal(nearLanding(p, { x: 20, z: -120 }), true);
  assert.equal(nearLanding(p, { x: 0, z: -140 }), false);
  assert.equal(nearLanding(p, null), false);
});
