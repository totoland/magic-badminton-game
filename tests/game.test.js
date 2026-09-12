import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, startMatch, update, STATES, refreshLanding, serveRequest } from '../src/game.js';
import { EMPTY_INTENT } from '../src/input.js';
import { COURT, PLAYER } from '../src/config.js';
import { solveShot } from '../src/physics.js';
import { placePlayer } from '../src/entities/player.js';
import { SMASH } from '../src/config.js';

const UI = { up: false, down: false, left: false, right: false, confirm: false, back: false, pause: false, mute: false };
const it = (o) => ({ ...EMPTY_INTENT, ...o });

test('the landing marker appears after the serve on the receiver side and clears when the point ends', () => {
  const world = createWorld(() => 0.5);
  startMatch(world, -1);
  assert.equal(world.state, STATES.SERVE);
  assert.equal(world.landing, null);
  for (let i = 0; i < 40; i += 1) update(world, [EMPTY_INTENT, EMPTY_INTENT], UI, 1 / 60);
  update(world, [it({ smashPressed: true }), EMPTY_INTENT], UI, 1 / 60);
  assert.equal(world.state, STATES.RALLY);
  assert.ok(world.landing, 'landing predicted right after the serve');
  assert.ok(world.landing.z > 0, 'high serve lands on the far side');
  assert.ok(Math.abs(world.landing.x) <= COURT.halfW && world.landing.z <= COURT.halfLen);
  assert.equal(world.landing.out, false);
  assert.ok(Math.abs(world.landing.x - (-40)) < 25, 'serve aims at the diagonal service court');
  // nobody moves: the shuttle lands, the point ends and the marker is cleared
  for (let i = 0; i < 400 && world.state === STATES.RALLY; i += 1) update(world, [EMPTY_INTENT, EMPTY_INTENT], UI, 1 / 60);
  assert.equal(world.state, STATES.POINT);
  assert.equal(world.landing, null);
  assert.deepEqual(world.score, [1, 0], "idle receiver: the server wins the point");
});

function incomingClear(world) {
  // CPU clear toward P1's back court, landing near (-30, -180)
  const from = { x: 30, z: 150, y: 40 };
  const v = solveShot(from, { x: -30, z: -180 }, { angle: 50 });
  Object.assign(world.shuttle, { ...from, vx: v.vx, vz: v.vz, vy: v.vy, held: 0, lastHitBy: 1, netTouched: false });
  world.state = STATES.RALLY;
  world.stateT = 0;
  refreshLanding(world);
}

test('standing inside the catch circle returns the shuttle without exact racket contact', () => {
  const world = createWorld(() => 0.5);
  startMatch(world, -1);
  incomingClear(world);
  const L = world.landing;
  placePlayer(world.players[0], L.x + 24, L.z + 8); // 25 units off: outside the racket ellipsoid, inside the circle
  placePlayer(world.players[1], 0, 150);
  for (let i = 0; i < 200 && world.shuttle.lastHitBy !== -1 && world.state === STATES.RALLY; i += 1) update(world, [EMPTY_INTENT, EMPTY_INTENT], UI, 1 / 60);
  assert.equal(world.shuttle.lastHitBy, -1, 'P1 returned it');
  assert.equal(world.state, STATES.RALLY);
});

test('standing outside the catch circle misses', () => {
  const world = createWorld(() => 0.5);
  startMatch(world, -1);
  incomingClear(world);
  const L = world.landing;
  placePlayer(world.players[0], L.x + PLAYER.catchRadius + 12, L.z);
  placePlayer(world.players[1], 0, 150);
  for (let i = 0; i < 200 && world.state === STATES.RALLY; i += 1) update(world, [EMPTY_INTENT, EMPTY_INTENT], UI, 1 / 60);
  assert.equal(world.state, STATES.POINT);
  assert.deepEqual(world.score, [0, 1]);
});

test('a smash press inside the catch circle connects in the air and produces a smash', () => {
  const world = createWorld(() => 0.5);
  startMatch(world, -1);
  // CPU lob landing near the net on P1's side (smash range), P1 waits inside the circle
  const from = { x: 20, z: 150, y: 40 };
  const v = solveShot(from, { x: -20, z: -90 }, { angle: 55 });
  Object.assign(world.shuttle, { ...from, vx: v.vx, vz: v.vz, vy: v.vy, held: 0, lastHitBy: 1, netTouched: false });
  world.state = STATES.RALLY;
  world.stateT = 0;
  refreshLanding(world);
  const L = world.landing;
  placePlayer(world.players[0], L.x + 14, L.z - 10);
  placePlayer(world.players[1], 0, 150);
  let pressed = false;
  for (let i = 0; i < 300 && world.shuttle.lastHitBy !== -1 && world.state === STATES.RALLY; i += 1) {
    const s = world.shuttle;
    const press = !pressed && s.z < 0 && s.vy < 0 && s.y <= 150;
    if (press) pressed = true;
    update(world, [it({ smashPressed: press, smash: pressed }), EMPTY_INTENT], UI, 1 / 60);
  }
  assert.equal(world.shuttle.lastHitBy, -1, 'P1 connected');
  const s = world.shuttle;
  assert.ok(s.vy < 0 && Math.hypot(s.vx, s.vz) > 500, `expected a smash, got v=(${s.vx.toFixed(0)},${s.vz.toFixed(0)},${s.vy.toFixed(0)})`);
  assert.ok(Math.abs(world.landing.z) <= COURT.halfLen && world.landing.z > 0, 'smash lands on the far side');
  void SMASH;
});

test('drop key serves short, smash or lob key serves long', () => {
  const p1 = { side: -1 };
  assert.equal(serveRequest(it({ dropPressed: true }), p1), 'lowServe');
  assert.equal(serveRequest(it({ smashPressed: true }), p1), 'highServe');
  assert.equal(serveRequest(it({ liftPressed: true }), p1), 'highServe');
  assert.equal(serveRequest(it({ smashPressed: true, up: true }), p1), 'lowServe'); // moving toward the net
  assert.equal(serveRequest(it({ smashPressed: true, down: true }), { side: 1 }), 'lowServe');
  assert.equal(serveRequest(it({ lift: true, drop: true }), p1), null);

  const world = createWorld(() => 0.5);
  startMatch(world, -1);
  for (let i = 0; i < 40; i += 1) update(world, [EMPTY_INTENT, EMPTY_INTENT], UI, 1 / 60);
  update(world, [it({ dropPressed: true }), EMPTY_INTENT], UI, 1 / 60);
  assert.equal(world.state, STATES.RALLY);
  assert.ok(world.landing.z > 0 && world.landing.z < COURT.shortService + 40, `short serve lands just past the service line, got z=${world.landing.z.toFixed(0)}`);
  assert.equal(world.players[0].grounded, true, 'serving does not jump');
});
