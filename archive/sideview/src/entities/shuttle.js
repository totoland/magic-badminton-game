import { hitCircle } from './player.js';

export function createShuttle() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastHitBy: 0, // side that last touched it, 0 before the serve
    held: 0, // side of the server holding it, 0 when in play
    netTouched: false, // touched the net since the last hit (for the "NET!" banner)
    angle: Math.PI / 2, // facing direction for drawing (cork leads)
  };
}

/** Pin the shuttle to the server's racket while waiting for the serve. */
export function pinTo(s, p) {
  const c = hitCircle(p);
  s.x = c.x + p.dir * 2;
  s.y = c.y + 4;
  s.vx = 0;
  s.vy = 0;
  s.held = p.side;
  s.angle = Math.PI / 2;
}
