import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, placePlayer, updatePlayer } from '../src/entities/player.js';
import { EMPTY_INTENT } from '../src/input.js';
import { GROUND_Y } from '../src/config.js';

const it = (o) => ({ ...EMPTY_INTENT, ...o });
const land = (p) => { let n = 0; while (!p.grounded && n < 300) { updatePlayer(p, EMPTY_INTENT, 1 / 60); n += 1; } };

test('the smash key alone takes off and arms the attack; landing disarms it', () => {
  const p = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p, 100);
  updatePlayer(p, it({ actionPressed: true, action: true }), 1 / 60);
  assert.equal(p.grounded, false);
  assert.equal(p.attack, true);
  land(p);
  assert.equal(p.y, GROUND_Y);
  assert.equal(p.attack, false);
});

test('jump is press-to-jump: holding the key after landing does not bounce', () => {
  const p = createPlayer({ side: -1, char: 'lady' });
  placePlayer(p, 100);
  updatePlayer(p, it({ jump: true, jumpPressed: true }), 1 / 60);
  assert.equal(p.grounded, false);
  assert.equal(p.attack, false);
  land(p);
  updatePlayer(p, it({ jump: true }), 1 / 60); // still held, no new edge
  assert.equal(p.grounded, true);
});

test('pressing the smash key mid-air arms the attack', () => {
  const p = createPlayer({ side: 1, char: 'dog' });
  placePlayer(p, 380);
  updatePlayer(p, it({ jumpPressed: true }), 1 / 60);
  updatePlayer(p, it({ actionPressed: true }), 1 / 60);
  assert.equal(p.attack, true);
});
