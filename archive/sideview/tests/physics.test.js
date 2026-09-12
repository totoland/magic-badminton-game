import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepShuttle, sweepNet, predict, applyNetResponse } from '../src/physics.js';
import { VT, NET_X, NET_TOP_Y, GROUND_Y, SHUTTLE_R } from '../src/config.js';

test('free fall converges to the terminal velocity within 1%', () => {
  const s = { x: 240, y: -5000, vx: 0, vy: 0 };
  for (let i = 0; i < 240 * 10; i += 1) stepShuttle(s, 1 / 240);
  assert.ok(Math.abs(s.vy - VT) / VT < 0.01, `vy=${s.vy}`);
});

test('sweepNet catches a fast crossing just below the tape and misses one above it', () => {
  const below = sweepNet({ x: NET_X - 5, y: NET_TOP_Y + 1 }, { x: NET_X + 5, y: NET_TOP_Y + 1 });
  assert.ok(below, 'should hit');
  assert.equal(below.from, -1);
  const above = sweepNet({ x: NET_X - 5, y: NET_TOP_Y - 10 }, { x: NET_X + 5, y: NET_TOP_Y - 10 });
  assert.equal(above, null);
  const sameSide = sweepNet({ x: NET_X - 20, y: GROUND_Y - 5 }, { x: NET_X - 10, y: GROUND_Y - 5 });
  assert.equal(sameSide, null);
});

test('net response leaves the shuttle on the incoming side for a body hit', () => {
  const s = { x: NET_X + 3, y: NET_TOP_Y + 20, vx: 500, vy: 100 };
  const side = applyNetResponse(s, { yCross: NET_TOP_Y + 20, tape: false, from: -1 }, () => 0.9);
  assert.equal(side, -1);
  assert.ok(s.x < NET_X);
  assert.ok(s.vx < 0 && Math.abs(s.vx) < 100);
});

test('predict landing matches stepped integration within 1 px', () => {
  const s0 = { x: 60, y: GROUND_Y - 40, vx: 420, vy: -400 };
  const p = predict(s0, { ignoreNet: true });
  const s = { ...s0 };
  let t = 0;
  while (s.y + SHUTTLE_R < GROUND_Y && t < 5) { stepShuttle(s, 1 / 240); t += 1 / 240; }
  assert.ok(Math.abs(p.landX - s.x) <= 1, `predict ${p.landX} vs stepped ${s.x}`);
  assert.ok(Math.abs(p.tLand - t) < 0.01);
  assert.ok(p.path.length > 10);
  assert.ok(p.netClearance !== null);
});

test('predict reports a net hit as a drop on the incoming side', () => {
  const p = predict({ x: 200, y: GROUND_Y - 20, vx: 300, vy: -50 });
  assert.equal(p.netHit, true);
  assert.ok(p.landX < NET_X);
});
