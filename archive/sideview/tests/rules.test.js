import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeLanding, isGameOver, scoreLabel, winnerOf } from '../src/rules.js';
import { LINES, W } from '../src/config.js';

test('isGameOver: 21 with a 2-point lead, deuce continues, cap at 30', () => {
  assert.equal(isGameOver(21, 19), true);
  assert.equal(isGameOver(21, 20), false);
  assert.equal(isGameOver(22, 20), true);
  assert.equal(isGameOver(29, 29), false);
  assert.equal(isGameOver(30, 29), true);
  assert.equal(isGameOver(20, 15), false);
});

test('winnerOf', () => {
  assert.equal(winnerOf(21, 10), -1);
  assert.equal(winnerOf(10, 21), 1);
  assert.equal(winnerOf(20, 20), 0);
});

test('scoreLabel', () => {
  assert.equal(scoreLabel(20, 20), 'DEUCE');
  assert.equal(scoreLabel(20, 19), 'GAME POINT');
  assert.equal(scoreLabel(19, 20), 'GAME POINT');
  assert.equal(scoreLabel(21, 20), 'GAME POINT');
  assert.equal(scoreLabel(29, 29), 'MATCH POINT');
  assert.equal(scoreLabel(10, 3), '');
  assert.equal(scoreLabel(21, 19), '');
});

test('judgeLanding: in-bounds ground gives the point to the other side', () => {
  assert.deepEqual(judgeLanding({ x: 100, lastHitBy: 1 }), { winner: 1, reason: 'in' });
  assert.deepEqual(judgeLanding({ x: 100, lastHitBy: -1 }), { winner: 1, reason: 'in' }); // own-side net dump
  assert.deepEqual(judgeLanding({ x: 400, lastHitBy: -1 }), { winner: -1, reason: 'in' });
  assert.deepEqual(judgeLanding({ x: LINES.left, lastHitBy: 1 }), { winner: 1, reason: 'in' }); // on the line = IN
  assert.deepEqual(judgeLanding({ x: LINES.right, lastHitBy: -1 }), { winner: -1, reason: 'in' });
});

test('judgeLanding: OUT gives the point to whoever did not hit last', () => {
  assert.deepEqual(judgeLanding({ x: LINES.right + 1, lastHitBy: -1 }), { winner: 1, reason: 'out' });
  assert.deepEqual(judgeLanding({ x: LINES.left - 1, lastHitBy: 1 }), { winner: -1, reason: 'out' });
  assert.deepEqual(judgeLanding({ x: -5, lastHitBy: 1 }), { winner: -1, reason: 'out' });
  assert.deepEqual(judgeLanding({ x: W + 5, lastHitBy: -1 }), { winner: 1, reason: 'out' });
});
