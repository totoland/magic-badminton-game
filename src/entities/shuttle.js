import { hitCenter } from './player.js';

export function createShuttle() {
  return {
    x: 0, z: 0, y: 0,
    vx: 0, vz: 0, vy: 0,
    lastHitBy: 0, // side that last touched it, 0 before the serve
    held: 0, // side of the server holding it, 0 when in play
    netTouched: false,
  };
}

/** Pin the shuttle to the server's racket while waiting for the serve. */
export function pinTo(s, p) {
  const c = hitCenter(p);
  s.x = c.x;
  s.z = c.z + p.dir * 2;
  s.y = c.y - 4;
  s.vx = 0;
  s.vz = 0;
  s.vy = 0;
  s.held = p.side;
}
