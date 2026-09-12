// Pure shuttle physics on plain objects. No DOM, fully testable in Node.
// Shuttle = { x, y, vx, vy } in canvas coordinates (y grows downward).
import {
  W, GROUND_Y, NET_X, NET_TOP_Y, LINES, G, K, SHUTTLE_R, MAX_SPEED, PREDICT_DT, NET_MARGIN, SMASH,
} from './config.js';

/** Semi-implicit Euler step with gravity and quadratic air drag. Mutates `s`. */
export function stepShuttle(s, dt) {
  const sp = Math.hypot(s.vx, s.vy);
  s.vx += -K * sp * s.vx * dt;
  s.vy += (G - K * sp * s.vy) * dt;
  const sp2 = Math.hypot(s.vx, s.vy);
  if (sp2 > MAX_SPEED) {
    const f = MAX_SPEED / sp2;
    s.vx *= f;
    s.vy *= f;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
}

/** Interpolated y where the segment prev->cur crosses the net plane, or null if it does not cross. */
function netCrossing(prev, cur) {
  const a = prev.x - NET_X;
  const b = cur.x - NET_X;
  if (a === b) return null;
  if ((a <= 0) === (b <= 0)) return null; // same side (NET_X itself counts as left)
  const t = a / (a - b);
  return { t, yCross: prev.y + t * (cur.y - prev.y), from: a <= 0 ? -1 : 1 };
}

/**
 * Swept test of the shuttle against the net for one substep.
 * Returns null when the shuttle clears the net or does not cross it,
 * otherwise { yCross, tape, from } where `from` is the side it came from.
 */
export function sweepNet(prev, cur) {
  const c = netCrossing(prev, cur);
  if (!c) return null;
  if (c.yCross + SHUTTLE_R < NET_TOP_Y) return null; // cleared the tape
  return { yCross: c.yCross, tape: Math.abs(c.yCross - NET_TOP_Y) < SHUTTLE_R + 2, from: c.from };
}

/**
 * Response to a net hit. Mutates `s`. Returns the side the shuttle ends up on.
 * Body of the net: drops back on the incoming side. Tape: usually falls back, sometimes dribbles over.
 */
export function applyNetResponse(s, hit, rng = Math.random) {
  let toSide = hit.from;
  if (hit.tape) {
    if (rng() < 0.25) toSide = -hit.from;
    s.vx = 0.4 * Math.abs(s.vx) * toSide + (rng() * 60 - 30);
  } else {
    s.vx = -0.15 * s.vx;
  }
  s.x = NET_X + toSide * 4;
  s.y = hit.yCross;
  s.vy = Math.max(s.vy, 0) * 0.3;
  return toSide;
}

/**
 * Forward-simulate a shuttle until it lands, leaves the screen, or maxT elapses.
 * Returns { landX, tLand, netHit, netClearance, path, landed, out }.
 * `netClearance` is px above the tape at the first net crossing (negative = would hit), null if no crossing.
 * With ignoreNet=false a net hit ends the prediction as a drop on the incoming side.
 * `path` is sampled every `sample` steps as { t, x, y, vy }.
 */
export function predict(s0, opts = {}) {
  const dt = opts.dt ?? PREDICT_DT;
  const maxT = opts.maxT ?? 3;
  const sample = opts.sample ?? 4;
  const ignoreNet = !!opts.ignoreNet;
  const s = { x: s0.x, y: s0.y, vx: s0.vx, vy: s0.vy };
  const path = [];
  let t = 0;
  let i = 0;
  let netClearance = null;
  const done = (extra) => ({ landX: s.x, tLand: t, netHit: false, netClearance, path, landed: true, out: false, ...extra });

  while (t < maxT) {
    const prev = { x: s.x, y: s.y };
    stepShuttle(s, dt);
    t += dt;
    i += 1;
    if (netClearance === null) {
      const c = netCrossing(prev, s);
      if (c) {
        netClearance = NET_TOP_Y - (c.yCross + SHUTTLE_R);
        if (!ignoreNet && netClearance < 0) {
          return done({ landX: NET_X + c.from * 4, tLand: t + 0.3, netHit: true });
        }
      }
    }
    if (i % sample === 0) path.push({ t, x: s.x, y: s.y, vy: s.vy });
    if (s.y + SHUTTLE_R >= GROUND_Y) return done();
    if (s.x < -SHUTTLE_R || s.x > W + SHUTTLE_R) return done({ out: true });
  }
  return done({ landed: false });
}

/** Velocity for a launch at `angleDeg` above horizontal toward `from.dir`. */
export function launchVelocity(dir, angleDeg, speed) {
  const a = (angleDeg * Math.PI) / 180;
  return { vx: dir * speed * Math.cos(a), vy: -speed * Math.sin(a) };
}

function landingFor(from, angleDeg, speed) {
  const v = launchVelocity(from.dir, angleDeg, speed);
  return predict({ x: from.x, y: from.y, vx: v.vx, vy: v.vy }, { ignoreNet: true });
}

/**
 * Solve the launch speed so a shot at `shot.angle` lands at `shot.targetX`.
 * from = { x, y, dir }. If the arc would clear the tape by less than the margin the angle is
 * raised 5 degrees and retried (max 3 bumps). Returns { vx, vy, angle, speed, landX } or null.
 */
export function solveShot(from, shot, opts = {}) {
  const margin = opts.netMargin ?? NET_MARGIN;
  const want = from.dir * (shot.targetX - from.x);
  if (want <= 0) return null;
  let angle = shot.angle;
  for (let attempt = 0; attempt < 4; attempt += 1, angle += 5) {
    if (angle > 85) break;
    const reach = (sp) => from.dir * (landingFor(from, angle, sp).landX - from.x);
    let lo = 50;
    let hi = MAX_SPEED;
    if (reach(hi) < want) return null; // out of range even at max speed; steeper only shortens it
    for (let i = 0; i < 16; i += 1) {
      const mid = (lo + hi) / 2;
      if (reach(mid) < want) lo = mid;
      else hi = mid;
    }
    const speed = (lo + hi) / 2;
    const p = landingFor(from, angle, speed);
    if (p.netClearance === null || p.netClearance >= margin) {
      return { ...launchVelocity(from.dir, angle, speed), angle, speed, landX: p.landX };
    }
  }
  return null;
}

/**
 * Smash: fixed speed, find the steepest downward angle that still clears the tape by the margin
 * and lands in bounds. Returns { vx, vy, angle, speed, landX } or null when no legal smash exists.
 */
export function solveSmash(from, opts = {}) {
  const speed = opts.speed ?? SMASH.speed;
  const margin = opts.netMargin ?? SMASH.netMargin;
  const ok = (deg) => {
    const p = landingFor(from, deg, speed);
    return p.netClearance !== null && p.netClearance >= margin ? p : null;
  };
  let lo = -80;
  let hi = 15;
  if (!ok(hi)) return null;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  const p = ok(hi);
  if (!p || p.out) return null;
  const inBounds = from.dir > 0 ? p.landX <= LINES.right : p.landX >= LINES.left;
  if (!inBounds) return null;
  return { ...launchVelocity(from.dir, hi, speed), angle: hi, speed, landX: p.landX };
}
