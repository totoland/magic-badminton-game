import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSuggestRotate, lockSupported, readDismissed, writeDismissed } from '../src/orientation.js';

test('the rotate suggestion shows once, only for touch devices in portrait', () => {
  assert.equal(shouldSuggestRotate({ touch: true, portrait: true, dismissed: false }), true);
  assert.equal(shouldSuggestRotate({ touch: true, portrait: true, dismissed: true }), false);
  assert.equal(shouldSuggestRotate({ touch: false, portrait: true, dismissed: false }), false);
  assert.equal(shouldSuggestRotate({ touch: true, portrait: false, dismissed: false }), false);
});

test('lock support detection and the dismissed flag survive missing browser APIs', () => {
  assert.equal(lockSupported({ screen: {}, document: { documentElement: {} } }), false);
  assert.equal(lockSupported({ screen: { orientation: { lock() {} } }, document: { documentElement: { requestFullscreen() {} } } }), true);
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(readDismissed(storage), false);
  writeDismissed(storage);
  assert.equal(readDismissed(storage), true);
  assert.equal(readDismissed({ getItem() { throw new Error('blocked'); } }), false);
});
