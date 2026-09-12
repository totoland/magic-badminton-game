import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveShot, solveSmash, predict } from '../src/physics.js';
import { SHOTS, COURT, NET_MARGIN } from '../src/config.js';
import { chooseChain } from '../src/game.js';

const POS = [{ x: 0, z: -200 }, { x: -60, z: -150 }, { x: 40, z: -100 }, { x: 0, z: -40 }, { x: 70, z: -30 }];
const HS = [40, 95];

function legal(from, v) {
  const p = predict({ ...from, vx: v.vx, vz: v.vz, vy: v.vy }, { ignoreNet: true });
  const crossed = p.netClearance !== null && p.netClearance >= NET_MARGIN;
  const inBounds = Math.abs(p.landX) <= COURT.halfW && Math.abs(p.landZ) <= COURT.halfLen && Math.sign(p.landZ) !== Math.sign(from.z);
  return crossed && inBounds && !p.out;
}

test('every solved shot clears the net by the margin and lands in bounds, both sides, several aims', () => {
  for (const side of [-1, 1]) {
    const dir = -side;
    for (const [name, shot] of Object.entries(SHOTS)) {
      for (const pos of POS) for (const h of HS) for (const aimX of [-60, 0, 60]) {
        const from = { x: pos.x * -side, z: pos.z * -side * -1 * side, y: h };
        from.z = side < 0 ? pos.z : -pos.z;
        const target = { x: aimX, z: dir * shot.depth };
        const v = solveShot(from, target, { angle: shot.angle });
        if (v) {
          assert.ok(legal(from, v), `${name} from (${from.x},${from.z}) h=${h} aim=${aimX} side=${side} landed (${v.land.x.toFixed(0)},${v.land.z.toFixed(0)})`);
          assert.ok(Math.hypot(v.land.x - target.x, v.land.z - target.z) < 3, `${name} target miss`);
        } else {
          const fb = solveShot(from, { x: aimX, z: dir * SHOTS.neutral.depth }, { angle: SHOTS.neutral.angle });
          assert.ok(fb && legal(from, fb), `${name} unsolvable and neutral fallback failed from (${from.x},${from.z}) h=${h}`);
        }
      }
    }
  }
});

test('smash is legal close to the net and lands well inside the court', () => {
  for (const z of [-40, -100, -130]) {
    const v = solveSmash({ x: 20, z, y: 95 }, { x: -40, z: 120 });
    assert.ok(v, `smash solvable from z=${z}`);
    assert.ok(v.vy < 0, 'smash goes downward');
    assert.ok(v.land.z > 0 && v.land.z < 200 && Math.abs(v.land.x) <= COURT.halfW, `land (${v.land.x},${v.land.z})`);
  }
  assert.equal(solveSmash({ x: 0, z: -40, y: 30 }, { x: 0, z: 120 }), null); // too low to clear the tape downward
});

test('chooseChain only offers a smash airborne, high, and close to the net', () => {
  const air = { grounded: false, side: -1, attack: false };
  const attackJump = { grounded: false, side: -1, attack: true };
  assert.deepEqual(chooseChain({ smash: true }, air, 95, 120), ['smash', 'drive', 'neutral']);
  assert.deepEqual(chooseChain({}, attackJump, 95, 120), ['smash', 'drive', 'neutral']);
  assert.deepEqual(chooseChain({ smash: true }, air, 95, 180), ['drive', 'neutral']);
  assert.deepEqual(chooseChain({ smash: true }, air, 50, 120), ['drive', 'neutral']);
  assert.deepEqual(chooseChain({ lift: true }, air, 60, 120), ['clear', 'neutral']);
  const ground = { grounded: true, side: -1, attack: false };
  assert.deepEqual(chooseChain({ lift: true }, ground, 30, 120), ['clear', 'neutral']);
  assert.deepEqual(chooseChain({ drop: true }, ground, 30, 120), ['drop', 'neutral']);
  assert.deepEqual(chooseChain({ up: true }, ground, 30, 120), ['drive', 'neutral']); // P1 moving toward the net
  assert.deepEqual(chooseChain({ down: true }, { grounded: true, side: 1, attack: false }, 30, 120), ['drive', 'neutral']); // P2 toward the net
  assert.deepEqual(chooseChain({}, ground, 30, 120), ['neutral', 'clear']);
});
