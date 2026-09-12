import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepShuttle, sweepNet, predict, applyNetResponse, predictAlong, launchVelocity } from '../src/physics.js';
import { VT, COURT, SHUTTLE_R } from '../src/config.js';

test('free fall converges to the terminal velocity within 1%', () => {
  const s = { x: 0, z: 0, y: 5000, vx: 0, vz: 0, vy: 0 };
  for (let i = 0; i < 240 * 10; i += 1) stepShuttle(s, 1 / 240);
  assert.ok(Math.abs(-s.vy - VT) / VT < 0.01, `vy=${s.vy}`);
});

test('sweepNet catches a crossing below the tape and misses one above it', () => {
  const below = sweepNet({ z: -5, y: COURT.netH - 1 }, { z: 5, y: COURT.netH - 1 });
  assert.ok(below && below.from === -1);
  assert.equal(sweepNet({ z: -5, y: COURT.netH + 10 }, { z: 5, y: COURT.netH + 10 }), null);
  assert.equal(sweepNet({ z: -20, y: 5 }, { z: -10, y: 5 }), null);
});

test('net response leaves the shuttle on the incoming side for a body hit', () => {
  const s = { x: 10, z: 3, y: 30, vx: 100, vz: 500, vy: -100 };
  const side = applyNetResponse(s, { yCross: 30, tape: false, from: -1 }, () => 0.9);
  assert.equal(side, -1);
  assert.ok(s.z < 0 && s.vz < 0 && Math.abs(s.vz) < 100);
});

test('3D predict landing matches stepped integration within 1 unit', () => {
  const s0 = { x: -30, z: -180, y: 40, vx: 60, vz: 420, vy: 400 };
  const p = predict(s0, { ignoreNet: true });
  const s = { ...s0 };
  let t = 0;
  while (s.y - SHUTTLE_R > 0 && t < 5) { stepShuttle(s, 1 / 240); t += 1 / 240; }
  assert.ok(Math.abs(p.landX - s.x) <= 1 && Math.abs(p.landZ - s.z) <= 1, `predict (${p.landX},${p.landZ}) vs (${s.x},${s.z})`);
  assert.ok(p.path.length > 10 && p.netClearance !== null);
});

test('predict reports a net hit as a drop on the incoming side', () => {
  const p = predict({ x: 0, z: -40, y: 20, vx: 0, vz: 300, vy: 50 });
  assert.equal(p.netHit, true);
  assert.ok(p.landZ < 0);
});

test('predictAlong: net clearance is measured at the requested distance', () => {
  const v = launchVelocity(45, 500);
  const withNet = predictAlong(30, v.vh, v.vy, 150);
  const noNet = predictAlong(30, v.vh, v.vy, null);
  assert.ok(withNet.netClearance > 0);
  assert.equal(noNet.netClearance, null);
  assert.ok(Math.abs(withNet.landH - noNet.landH) < 0.01);
});
