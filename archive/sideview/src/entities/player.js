import { W, GROUND_Y, NET_X, PLAYER } from '../config.js';

/** side: -1 left / +1 right. char: 'lady' | 'dog'. x = center, y = feet. */
export function createPlayer({ side, char }) {
  return {
    side,
    char,
    dir: -side, // always faces and hits toward the net
    x: 0,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    grounded: true,
    anim: 'idle',
    animT: 0,
    swingT: 0,
    speedScale: 1,
    attack: false, // armed by the action key: smash (or drive) at the next airborne contact
  };
}

export function placePlayer(p, x) {
  p.x = x;
  p.y = GROUND_Y;
  p.vx = 0;
  p.vy = 0;
  p.grounded = true;
  p.attack = false;
  p.anim = 'idle';
  p.animT = 0;
  p.swingT = 0;
}

export function updatePlayer(p, intent, dt) {
  const move = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  p.vx = move * PLAYER.run * p.speedScale;
  if (p.grounded && (intent.jumpPressed || intent.actionPressed)) {
    p.vy = -PLAYER.jumpV;
    p.grounded = false;
    p.attack = !!intent.actionPressed; // attack jump: smash at the top without a separate jump key
  } else if (!p.grounded && intent.actionPressed) {
    p.attack = true; // action pressed mid-air also arms the smash
  }
  if (!p.grounded) p.vy += PLAYER.g * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.y >= GROUND_Y) {
    p.y = GROUND_Y;
    p.vy = 0;
    p.grounded = true;
    p.attack = false;
  }
  const lo = p.side < 0 ? PLAYER.halfW : NET_X + PLAYER.netClamp;
  const hi = p.side < 0 ? NET_X - PLAYER.netClamp : W - PLAYER.halfW;
  p.x = Math.min(hi, Math.max(lo, p.x));

  if (p.swingT > 0) p.swingT -= dt;
  let next = 'idle';
  if (p.swingT > 0) next = 'swing';
  else if (!p.grounded) next = 'jump';
  else if (move !== 0) next = 'run';
  if (next !== p.anim) {
    p.anim = next;
    p.animT = 0;
  } else {
    p.animT += dt;
  }
}

/** Racket contact circle: in front of the player, at racket height. */
export function hitCircle(p) {
  return { x: p.x + p.dir * PLAYER.hitOffset, y: p.y - PLAYER.hitH, r: PLAYER.hitRadius };
}

export function swing(p) {
  p.swingT = PLAYER.swingTime;
}
