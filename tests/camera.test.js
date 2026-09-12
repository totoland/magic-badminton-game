import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../src/render/camera.js';
import { COURT, SCENE } from '../src/config.js';

test('far baseline is higher and narrower than the near baseline; height goes up on screen', () => {
  const near = project(COURT.halfW, -COURT.halfLen);
  const far = project(COURT.halfW, COURT.halfLen);
  assert.ok(far.sy < near.sy);
  assert.ok(far.sx - SCENE.w / 2 < near.sx - SCENE.w / 2);
  assert.ok(near.sx < SCENE.w && far.sy > 40, 'court fits under the banner');
  const up = project(0, 0, 50);
  const ground = project(0, 0, 0);
  assert.ok(up.sy < ground.sy && up.sx === ground.sx);
  assert.ok(project(0, COURT.halfLen).scale < project(0, -COURT.halfLen).scale);
});
