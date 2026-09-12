// Fake perspective (NES Tennis look): screen y is linear in depth, lateral scale shrinks with depth.
// Straight court lines stay straight; sprites shrink toward the far baseline.
import { COURT, CAMERA } from '../config.js';

export function project(x, z, y = 0) {
  const t = (z + COURT.halfLen) / (2 * COURT.halfLen); // 0 near baseline .. 1 far baseline
  const w = CAMERA.wNear + (CAMERA.wFar - CAMERA.wNear) * t;
  const h = CAMERA.hNear + (CAMERA.hFar - CAMERA.hNear) * t;
  const scale = CAMERA.sNear + (CAMERA.sFar - CAMERA.sNear) * t;
  const ground = CAMERA.yNear + (CAMERA.yFar - CAMERA.yNear) * t;
  return { sx: CAMERA.cx + x * w, sy: ground - y * h, ground, w, h, scale };
}
