import { COURT, PLAYER, SHUTTLE_R, SCENE } from '../config.js';
import { project } from '../render/camera.js';

/** side: -1 near (P1) / +1 far (P2). x lateral, z depth, y height, all in world units. */
export function createPlayer({ side, char }) {
  return {
    side,
    char,
    dir: -side, // hits toward the net
    x: 0,
    z: side * 110,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
    attack: false, // armed by the smash key: smash (or drive) at the next airborne contact
    anim: 'idle',
    animT: 0,
    swingT: 0,
    speedScale: 1,
  };
}

export function placePlayer(p, x, z) {
  p.x = x;
  p.z = z;
  p.y = 0;
  p.vx = 0;
  p.vz = 0;
  p.vy = 0;
  p.grounded = true;
  p.attack = false;
  p.anim = 'idle';
  p.animT = 0;
  p.swingT = 0;
}

export function updatePlayer(p, intent, dt) {
  let mx = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  let mz = (intent.up ? 1 : 0) - (intent.down ? 1 : 0); // screen up = +z for everyone
  if (mx !== 0 && mz !== 0) { mx *= Math.SQRT1_2; mz *= Math.SQRT1_2; }
  const speed = PLAYER.run * p.speedScale;
  p.vx = mx * speed;
  p.vz = mz * speed;

  if (p.grounded && intent.smashPressed) {
    p.vy = PLAYER.jumpV; // the smash key is the only take-off: jump + armed smash
    p.grounded = false;
    p.attack = true;
  } else if (!p.grounded && intent.smashPressed) {
    p.attack = true;
  }
  if (!p.grounded) {
    p.vy -= PLAYER.g * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
      p.attack = false;
    }
  }
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  if (p.side < 0) p.z = Math.min(-PLAYER.netClamp, Math.max(-COURT.halfLen - PLAYER.backMargin, p.z));
  else p.z = Math.max(PLAYER.netClamp, Math.min(COURT.halfLen + PLAYER.backMargin, p.z));
  // Lateral limit: the court plus a margin, but always inside the visible scene at this depth.
  const w = project(0, p.z).w;
  const xMax = Math.min(COURT.halfW + PLAYER.sideMargin, (SCENE.w / 2 - PLAYER.edgePad) / w);
  p.x = Math.min(xMax, Math.max(-xMax, p.x));

  if (p.swingT > 0) p.swingT -= dt;
  let next = 'idle';
  if (p.swingT > 0) next = 'swing';
  else if (!p.grounded) next = 'jump';
  else if (mx !== 0 || mz !== 0) next = 'run';
  if (next !== p.anim) {
    p.anim = next;
    p.animT = 0;
  } else {
    p.animT += dt;
  }
}

/** Center of the racket contact volume. */
export function hitCenter(p) {
  return { x: p.x, z: p.z + p.dir * PLAYER.hitOffset, y: p.y + PLAYER.hitH };
}

/** Is the shuttle inside the racket ellipsoid (grown by the shuttle radius)? */
export function inReach(p, s) {
  const c = hitCenter(p);
  const rx = PLAYER.reach.x + SHUTTLE_R;
  const rz = PLAYER.reach.z + SHUTTLE_R;
  const ry = PLAYER.reach.y + SHUTTLE_R;
  const dx = (s.x - c.x) / rx;
  const dz = (s.z - c.z) / rz;
  const dy = (s.y - c.y) / ry;
  return dx * dx + dz * dz + dy * dy <= 1;
}

/** Airborne catch: shuttle within the catch radius horizontally and near racket height (jump smash / net kill). */
export function inAirReach(p, s) {
  if (p.grounded) return false;
  const horizontal = Math.hypot(s.x - p.x, s.z - p.z) <= PLAYER.airCatchRadius;
  return horizontal && Math.abs(s.y - (p.y + PLAYER.hitH)) <= PLAYER.airCatchY;
}

/** Is the player standing inside the catch circle around the predicted landing spot? */
export function nearLanding(p, landing) {
  return !!landing && Math.hypot(p.x - landing.x, p.z - landing.z) <= PLAYER.catchRadius;
}

export function swing(p) {
  p.swingT = PLAYER.swingTime;
}
