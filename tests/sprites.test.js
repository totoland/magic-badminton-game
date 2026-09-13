import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAR_DEFS, PALETTE } from '../src/render/sprites.js';
import { CHARS, CHAR_NAMES } from '../src/config.js';

test('every selectable character has consistent back/front art and a name', () => {
  for (const id of CHARS) {
    const def = CHAR_DEFS[id];
    assert.ok(def, `${id} has a definition`);
    assert.ok(CHAR_NAMES[id], `${id} has a display name`);
    for (const view of ['back', 'front']) {
      const v = def.views[view];
      assert.ok(v, `${id} ${view}`);
      const palette = def.palette || PALETTE;
      const grids = v.frames ? Object.values(v.frames) : [v.body, ...Object.values(def.legs)];
      for (const rows of grids) {
        for (const row of rows) {
          assert.equal(row.length, def.w, `${id} ${view}: row width ${row.length} != ${def.w}`);
          for (const ch of row) if (ch !== '.') assert.ok(palette[ch], `${id} ${view}: unknown palette letter '${ch}'`);
        }
      }
      if (v.frames) {
        for (const key of ['stand', 'run1', 'run2', 'jump']) assert.equal(v.frames[key].length, def.h, `${id} ${view} ${key} height`);
      } else {
        assert.equal(v.body.length + def.legs.stand.length, def.h, `${id} ${view}: body + legs = h`);
      }
      assert.ok(v.hand.x >= 0 && v.hand.x < def.w && v.hand.y >= 0 && v.hand.y < def.h, `${id} ${view}: hand anchor inside the sprite`);
    }
  }
});
