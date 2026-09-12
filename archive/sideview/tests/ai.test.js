import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAI } from '../src/ai.js';
import { DIFFICULTY, GROUND_Y, NET_X, LINES } from '../src/config.js';
import { createPlayer, placePlayer } from '../src/entities/player.js';
import { solveShot } from '../src/physics.js';
import { SHOTS } from '../src/config.js';

function world(shuttle, opts = {}) {
  const p1 = createPlayer({ side: -1, char: 'lady' });
  const p2 = createPlayer({ side: 1, char: 'dog' });
  placePlayer(p1, 100);
  placePlayer(p2, opts.p2x ?? 380);
  return { state: 'RALLY', eventId: 1, stateT: 0, server: -1, cpuServeAt: 1, players: [p1, p2], shuttle: { held: 0, netTouched: false, ...shuttle } };
}

function runFrames(ai, w, n) {
  let last = null;
  for (let i = 0; i < n; i += 1) last = ai.update(w, 1 / 60);
  return last;
}

test('hard AI moves toward the predicted landing and stays inside its clamp', () => {
  // A clear from P1 heading deep into P2's court (~x 430).
  const v = solveShot({ x: 60, y: GROUND_Y - 40, dir: 1 }, SHOTS.clear);
  const w = world({ x: 60, y: GROUND_Y - 40, vx: v.vx, vy: v.vy, lastHitBy: -1 });
  const ai = createAI(DIFFICULTY.hard, 1, () => 0.9); // 0.9 > jumpSmashProb: grounded intercept plan
  const intent = runFrames(ai, w, 10); // past the 80 ms reaction delay
  assert.equal(intent.right, true, 'should move right toward the deep landing');
  assert.equal(intent.left, false);
});

test('AI returns to base when the shuttle is on the other side', () => {
  const w = world({ x: 100, y: GROUND_Y - 60, vx: -100, vy: -100, lastHitBy: 1 }, { p2x: 440 });
  const ai = createAI(DIFFICULTY.hard, 1, () => 0.5);
  const intent = runFrames(ai, w, 10);
  assert.equal(intent.left, true, 'should move back toward base x=350');
});

test('AI target never leaves [near-net, back-stop]', () => {
  const ai = createAI(DIFFICULTY.easy, 1, () => 0.99); // large positive error
  const w = world({ x: 230, y: GROUND_Y - 100, vx: 400, vy: 200, lastHitBy: -1 }, { p2x: NET_X + 15 });
  const intent = runFrames(ai, w, 30);
  // Shuttle lands just past the net; with the near-net clamp at NET_X+20 the AI must not walk into the net.
  assert.equal(intent.left, false);
  const ai2 = createAI(DIFFICULTY.easy, 1, () => 0.01);
  const w2 = world({ x: 60, y: GROUND_Y - 40, vx: 600, vy: -500, lastHitBy: -1 }, { p2x: LINES.right - 5 });
  const intent2 = runFrames(ai2, w2, 30);
  assert.equal(intent2.right, false, 'must not run past the back stop');
});

test('CPU serves after its delay', () => {
  const w = { state: 'SERVE', server: 1, stateT: 2, cpuServeAt: 1, eventId: 0, players: [createPlayer({ side: -1, char: 'lady' }), createPlayer({ side: 1, char: 'dog' })], shuttle: { held: 1 } };
  const ai = createAI(DIFFICULTY.normal, 1, () => 0.5);
  assert.equal(ai.update(w, 1 / 60).actionPressed, true);
  w.stateT = 0.2;
  assert.equal(ai.update(w, 1 / 60).actionPressed, false);
});
