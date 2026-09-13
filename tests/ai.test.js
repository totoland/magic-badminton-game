import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAI } from '../src/ai.js';
import { DIFFICULTY, COURT, SHOTS } from '../src/config.js';
import { createPlayer, placePlayer } from '../src/entities/player.js';
import { solveShot } from '../src/physics.js';

function world(shuttle, opts = {}) {
  const p1 = createPlayer({ side: -1, char: 'lady' });
  const p2 = createPlayer({ side: 1, char: 'bug' });
  placePlayer(p1, 0, -150);
  placePlayer(p2, opts.p2x ?? 0, opts.p2z ?? 110);
  return { state: 'RALLY', eventId: 1, stateT: 0, server: -1, cpuServeAt: 1, players: [p1, p2], shuttle: { held: 0, netTouched: false, ...shuttle } };
}
const run = (ai, w, n) => { let it = null; for (let i = 0; i < n; i += 1) it = ai.update(w, 1 / 60); return it; };

test('hard AI runs toward a deep cross-court clear (right and up on screen)', () => {
  const from = { x: -60, z: -180, y: 40 };
  const v = solveShot(from, { x: 60, z: SHOTS.clear.depth }, { angle: SHOTS.clear.angle });
  const w = world({ ...from, vx: v.vx, vz: v.vz, vy: v.vy, lastHitBy: -1 });
  const ai = createAI(DIFFICULTY.hard, 1, () => 0.9);
  const it = run(ai, w, 10);
  assert.equal(it.right, true, 'shuttle lands at x=+60, CPU at x=0');
  assert.equal(it.up, true, 'lands at z=190, CPU at z=110: move away from the camera');
});

test('AI returns to base when the shuttle is on the other side, and aims away from the opponent', () => {
  const w = world({ x: 0, z: -100, y: 60, vx: 0, vz: -100, vy: 100, lastHitBy: 1 }, { p2z: 200 });
  w.players[0].x = 60;
  const ai = createAI(DIFFICULTY.hard, 1, () => 0.5);
  const it = run(ai, w, 10);
  assert.equal(it.down, true, 'back toward base z=110 from z=200');
});

test('AI target never leaves its half', () => {
  const ai = createAI(DIFFICULTY.easy, 1, () => 0.99);
  const w = world({ x: 0, z: -10, y: 100, vx: 0, vz: 400, vy: 200, lastHitBy: -1 }, { p2z: 21 });
  const it = run(ai, w, 30);
  assert.equal(it.down, false, 'must not walk into the net');
});

test('CPU serves after its delay with the smash key', () => {
  const w = { state: 'SERVE', server: 1, stateT: 2, cpuServeAt: 1, eventId: 0, players: [createPlayer({ side: -1, char: 'lady' }), createPlayer({ side: 1, char: 'bug' })], shuttle: { held: 1 } };
  const ai = createAI(DIFFICULTY.normal, 1, () => 0.5);
  assert.equal(ai.update(w, 1 / 60).smashPressed, true);
  w.stateT = 0.2;
  assert.equal(ai.update(w, 1 / 60).smashPressed, false);
});
