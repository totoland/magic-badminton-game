// Pure shuttle physics on plain objects (x lateral, z depth, y height up). Node-testable.
import { COURT, G, K, SHUTTLE_R, MAX_SPEED, PREDICT_DT, NET_MARGIN, SMASH } from './config.js';

/** Semi-implicit Euler with gravity and quadratic drag. Mutates `s`. */
export function stepShuttle(s, dt) {
  const sp = Math.hypot(s.vx, s.vz, s.vy);
  s.vx += -K * sp * s.vx * dt;
  s.vz += -K * sp * s.vz * dt;
  s.vy += (-G - K * sp * s.vy) * dt;
  const sp2 = Math.hypot(s.vx, s.vz, s.vy);
  if (sp2 > MAX_SPEED) {
    const f = MAX_SPEED / sp2;
    s.vx *= f;
    s.vz *= f;
    s.vy *= f;
  }
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt;
}

/** Interpolated crossing of the net plane z = 0 between two depths, or null. */
export function netCrossing(pz, cz, py, cy) {
  if (pz === cz) return null;
  if ((pz <= 0) === (cz <= 0)) return null;
  const t = pz / (pz - cz);
  return { t, yCross: py + t * (cy - py), from: pz <= 0 ? -1 : 1 };
}

/** Swept net test for one substep. Returns null when it clears, else { yCross, tape, from }. */
export function sweepNet(prev, cur) {
  const c = netCrossing(prev.z, cur.z, prev.y, cur.y);
  if (!c) return null;
  if (c.yCross - SHUTTLE_R > COURT.netH) return null;
  return { yCross: c.yCross, tape: Math.abs(c.yCross - COURT.netH) < SHUTTLE_R + 2, from: c.from };
}

/** Net hit response. Mutates `s`, returns the side it ends up on. */
export function applyNetResponse(s, hit, rng = Math.random) {
  let toSide = hit.from;
  if (hit.tape) {
    if (rng() < 0.25) toSide = -hit.from;
    s.vz = 0.4 * Math.abs(s.vz) * toSide + (rng() * 60 - 30);
  } else {
    s.vz = -0.15 * s.vz;
  }
  s.vx *= 0.5;
  s.z = toSide * 4;
  s.y = Math.min(hit.yCross, COURT.netH);
  s.vy = Math.min(s.vy, 0) * 0.3;
  return toSide;
}

const isGone = (s) => Math.abs(s.x) > COURT.halfW + COURT.margin || Math.abs(s.z) > COURT.halfLen + COURT.margin;

/**
 * Forward-simulate in 3D until landing / leaving the court surround / maxT.
 * Returns { landX, landZ, tLand, netHit, netClearance, path, landed, out }.
 * netClearance = height of the shuttle bottom above the tape at the first crossing (negative = hits).
 */
export function predict(s0, opts = {}) {
  const dt = opts.dt ?? PREDICT_DT;
  const maxT = opts.maxT ?? 3;
  const sample = opts.sample ?? 4;
  const ignoreNet = !!opts.ignoreNet;
  const s = { x: s0.x, z: s0.z, y: s0.y, vx: s0.vx, vz: s0.vz, vy: s0.vy };
  const path = [];
  let t = 0;
  let i = 0;
  let netClearance = null;
  const done = (extra) => ({ landX: s.x, landZ: s.z, tLand: t, netHit: false, netClearance, path, landed: true, out: false, ...extra });
  while (t < maxT) {
    const pz = s.z;
    const py = s.y;
    stepShuttle(s, dt);
    t += dt;
    i += 1;
    if (netClearance === null) {
      const c = netCrossing(pz, s.z, py, s.y);
      if (c) {
        netClearance = c.yCross - SHUTTLE_R - COURT.netH;
        if (!ignoreNet && netClearance < 0) return done({ landZ: c.from * 4, tLand: t + 0.3, netHit: true });
      }
    }
    if (i % sample === 0) path.push({ t, x: s.x, z: s.z, y: s.y, vy: s.vy });
    if (s.y - SHUTTLE_R <= 0) return done();
    if (isGone(s)) return done({ out: true });
  }
  return done({ landed: false });
}

/**
 * 2D simulation along a shot direction: h = horizontal distance travelled, y = height.
 * `netAt` = horizontal distance at which the net plane is crossed (null = never).
 * Returns { landH, tLand, netClearance, apex }.
 */
export function predictAlong(y0, vh0, vy0, netAt, opts = {}) {
  const dt = opts.dt ?? PREDICT_DT;
  const maxT = opts.maxT ?? 4;
  let h = 0;
  let y = y0;
  let vh = vh0;
  let vy = vy0;
  let t = 0;
  let netClearance = null;
  let apex = y0;
  while (t < maxT) {
    const ph = h;
    const py = y;
    const sp = Math.hypot(vh, vy);
    vh += -K * sp * vh * dt;
    vy += (-G - K * sp * vy) * dt;
    h += vh * dt;
    y += vy * dt;
    t += dt;
    if (y > apex) apex = y;
    if (netAt !== null && netClearance === null && ph < netAt && h >= netAt) {
      const f = (netAt - ph) / (h - ph);
      netClearance = py + f * (y - py) - SHUTTLE_R - COURT.netH;
    }
    if (y - SHUTTLE_R <= 0) return { landH: h, tLand: t, netClearance, apex };
    if (h > 2000) break;
  }
  return { landH: h, tLand: t, netClearance, apex };
}

export function launchVelocity(angleDeg, speed) {
  const a = (angleDeg * Math.PI) / 180;
  return { vh: speed * Math.cos(a), vy: speed * Math.sin(a) };
}

function pathInfo(from, target) {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d < 1) return null;
  const crosses = (from.z <= 0) !== (target.z <= 0);
  const netAt = crosses ? (d * -from.z) / (target.z - from.z) : null;
  return { d, ux: dx / d, uz: dz / d, netAt };
}

const toWorld = (from, info, vh, vy, landH) => ({
  vx: vh * info.ux, vz: vh * info.uz, vy, land: { x: from.x + landH * info.ux, z: from.z + landH * info.uz },
});

/**
 * Solve the launch speed so a shot at `shot.angle` lands on `target` {x, z}.
 * Raises the angle 5 degrees (max 3 bumps) when the tape clearance is below the margin.
 * Returns { vx, vz, vy, angle, speed, land } or null.
 */
export function solveShot(from, target, shot, opts = {}) {
  const margin = opts.netMargin ?? NET_MARGIN;
  const info = pathInfo(from, target);
  if (!info) return null;
  let angle = shot.angle;
  for (let attempt = 0; attempt < 4; attempt += 1, angle += 5) {
    if (angle > 85) break;
    const reach = (sp) => { const v = launchVelocity(angle, sp); return predictAlong(from.y, v.vh, v.vy, info.netAt).landH; };
    let lo = 50;
    let hi = MAX_SPEED;
    if (reach(hi) < info.d) return null;
    for (let i = 0; i < 16; i += 1) {
      const mid = (lo + hi) / 2;
      if (reach(mid) < info.d) lo = mid;
      else hi = mid;
    }
    const speed = (lo + hi) / 2;
    const v = launchVelocity(angle, speed);
    const p = predictAlong(from.y, v.vh, v.vy, info.netAt);
    if (p.netClearance === null || p.netClearance >= margin) {
      return { ...toWorld(from, info, v.vh, v.vy, p.landH), angle, speed };
    }
  }
  return null;
}

/**
 * Smash toward `target`: fixed speed, steepest downward angle that clears the tape by the margin
 * and still lands inside the court. Returns { vx, vz, vy, angle, speed, land } or null.
 */
export function solveSmash(from, target, opts = {}) {
  const speed = opts.speed ?? SMASH.speed;
  const margin = opts.netMargin ?? SMASH.netMargin;
  const info = pathInfo(from, target);
  if (!info || info.netAt === null) return null;
  const ok = (deg) => {
    const v = launchVelocity(deg, speed);
    const p = predictAlong(from.y, v.vh, v.vy, info.netAt);
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
  if (!p) return null;
  const v = launchVelocity(hi, speed);
  const r = toWorld(from, info, v.vh, v.vy, p.landH);
  if (Math.abs(r.land.x) > COURT.halfW || Math.abs(r.land.z) > COURT.halfLen) return null;
  return { ...r, angle: hi, speed };
}
