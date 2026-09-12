import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveShot, solveSmash, predict } from '../src/physics.js';
import { chooseChain } from '../src/game.js';
import { SHOTS, SMASH, GROUND_Y, NET_X, LINES, NET_MARGIN, mirrorX } from '../src/config.js';

const XS = [40, 100, 160, 200];
const HS = [40, 95];

function legal(from, v) {
  const p = predict({ x: from.x, y: from.y, vx: v.vx, vy: v.vy }, { ignoreNet: true });
  const crossed = p.netClearance !== null && p.netClearance >= NET_MARGIN;
  const inBounds = from.dir > 0 ? p.landX >= NET_X && p.landX <= LINES.right : p.landX <= NET_X && p.landX >= LINES.left;
  return crossed && inBounds && !p.out;
}

test('every solved shot clears the net by the margin and lands in bounds (both sides)', () => {
  for (const side of [-1, 1]) {
    const dir = -side;
    for (const [name, shot] of Object.entries(SHOTS)) {
      for (const x0 of XS) for (const h of HS) {
        const from = { x: mirrorX(x0, side), y: GROUND_Y - h, dir };
        const v = solveShot(from, { angle: shot.angle, targetX: mirrorX(shot.targetX, side) });
        if (v) {
          assert.ok(legal(from, v), `${name} from x=${from.x} h=${h} side=${side} landed at ${v.landX}`);
          assert.ok(Math.abs(v.landX - mirrorX(shot.targetX, side)) < 3, `${name} target miss ${v.landX}`);
        } else {
          const fb = solveShot(from, { angle: SHOTS.neutral.angle, targetX: mirrorX(SHOTS.neutral.targetX, side) });
          assert.ok(fb && legal(from, fb), `${name} unsolvable and neutral fallback failed from x=${from.x} h=${h}`);
        }
      }
    }
  }
});

test('clear from the back line lands deep and stays on screen', () => {
  const v = solveShot({ x: 40, y: GROUND_Y - 40, dir: 1 }, SHOTS.clear);
  assert.ok(v, 'clear solvable');
  const p = predict({ x: 40, y: GROUND_Y - 40, vx: v.vx, vy: v.vy }, { ignoreNet: true });
  const apex = Math.min(...p.path.map((pt) => pt.y));
  assert.ok(apex > 0, `apex y=${apex} should stay on screen`);
  assert.ok(p.landX > 400);
});

test('smash is legal close to the net and lands well before the back line', () => {
  for (const x of [200, 140, 110]) {
    const v = solveSmash({ x, y: GROUND_Y - 95, dir: 1 });
    assert.ok(v, `smash solvable from x=${x}`);
    assert.ok(v.vy > 0, 'smash goes downward');
    assert.ok(v.landX > NET_X && v.landX < 400, `landX=${v.landX}`);
    assert.ok(legal({ x, y: GROUND_Y - 95, dir: 1 }, v));
  }
});

test('smash from far away is nearly flat, and impossible when too low', () => {
  const far = solveSmash({ x: 60, y: GROUND_Y - 95, dir: 1 });
  assert.ok(far && far.angle > -10, 'far smash degrades to a flat drive-like arc');
  assert.equal(solveSmash({ x: 200, y: GROUND_Y - 30, dir: 1 }), null); // too low to clear the tape downward
});

test('chooseChain only offers a smash airborne, high, and close to the net', () => {
  const air = { grounded: false, side: -1, attack: false };
  const attackJump = { grounded: false, side: -1, attack: true };
  assert.deepEqual(chooseChain({ action: true }, air, 95, 120), ['smash', 'drive', 'neutral']);
  assert.deepEqual(chooseChain({}, attackJump, 95, 120), ['smash', 'drive', 'neutral']); // a tap of the smash key is enough
  assert.deepEqual(chooseChain({ action: true }, air, 95, 180), ['drive', 'neutral']); // too far
  assert.deepEqual(chooseChain({ action: true }, air, 50, 120), ['drive', 'neutral']); // too low
  assert.deepEqual(chooseChain({ jump: true }, air, 60, 120), ['clear', 'neutral']);
  const ground = { grounded: true, side: -1, attack: false };
  assert.deepEqual(chooseChain({ jump: true }, ground, 30, 120), ['clear', 'neutral']); // lift key held on the ground
  assert.deepEqual(chooseChain({ action: true }, ground, 30, 120), ['drive', 'neutral']);
  assert.deepEqual(chooseChain({ down: true }, ground, 30, 120), ['drop', 'neutral']);
  assert.deepEqual(chooseChain({ right: true }, ground, 30, 120), ['drive', 'neutral']);
  assert.deepEqual(chooseChain({ left: true }, { grounded: true, side: 1, attack: false }, 30, 120), ['drive', 'neutral']);
  assert.deepEqual(chooseChain({}, ground, 30, 120), ['neutral', 'clear']);
});

test('smash respects the max distance in config', () => {
  assert.ok(SMASH.maxDist <= 140);
});
