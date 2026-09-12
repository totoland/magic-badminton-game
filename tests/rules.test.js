import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeLanding, isGameOver, scoreLabel, winnerOf, inCourt } from '../src/rules.js';
import { COURT } from '../src/config.js';

test('isGameOver: 21 with a 2-point lead, deuce continues, cap at 30', () => {
  assert.equal(isGameOver(21, 19), true);
  assert.equal(isGameOver(21, 20), false);
  assert.equal(isGameOver(22, 20), true);
  assert.equal(isGameOver(29, 29), false);
  assert.equal(isGameOver(30, 29), true);
});

test('winnerOf and scoreLabel', () => {
  assert.equal(winnerOf(21, 10), -1);
  assert.equal(winnerOf(10, 21), 1);
  assert.equal(winnerOf(20, 20), 0);
  assert.equal(scoreLabel(20, 20), 'DEUCE');
  assert.equal(scoreLabel(20, 19), 'GAME POINT');
  assert.equal(scoreLabel(29, 29), 'MATCH POINT');
  assert.equal(scoreLabel(10, 3), '');
});

test('judgeLanding: in-bounds ground gives the point to the other side', () => {
  assert.deepEqual(judgeLanding({ x: 0, z: -100, lastHitBy: 1 }), { winner: 1, reason: 'in' });
  assert.deepEqual(judgeLanding({ x: 0, z: -100, lastHitBy: -1 }), { winner: 1, reason: 'in' }); // own-side net dump
  assert.deepEqual(judgeLanding({ x: 30, z: 150, lastHitBy: -1 }), { winner: -1, reason: 'in' });
  assert.deepEqual(judgeLanding({ x: COURT.halfW, z: COURT.halfLen, lastHitBy: -1 }), { winner: -1, reason: 'in' }); // on the lines = IN
});

test('judgeLanding: OUT (long or wide) gives the point to whoever did not hit last', () => {
  assert.deepEqual(judgeLanding({ x: 0, z: COURT.halfLen + 1, lastHitBy: -1 }), { winner: 1, reason: 'out' });
  assert.deepEqual(judgeLanding({ x: COURT.halfW + 1, z: 100, lastHitBy: -1 }), { winner: 1, reason: 'out' });
  assert.deepEqual(judgeLanding({ x: -200, z: -50, lastHitBy: 1 }), { winner: -1, reason: 'out' });
  assert.equal(inCourt(0, 0), true);
});
