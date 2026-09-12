// CPU controller. Produces the same Intent a keyboard would.
// Predicts the shuttle once per shuttle event (serve / hit / net), never per frame.
import { COURT, PLAYER, SMASH, BASE_Z } from './config.js';
import { predict } from './physics.js';
import { sideOf } from './rules.js';
import { EMPTY_INTENT } from './input.js';

const RISE_TIME = PLAYER.jumpV / PLAYER.g; // take-off to apex
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createAI(params, side, rng = Math.random) {
  const dir = -side;
  const base = { x: 0, z: side * BASE_Z };
  const clampTarget = (t) => ({
    x: clamp(t.x, -(COURT.halfW + 20), COURT.halfW + 20),
    z: side < 0 ? clamp(t.z, -(COURT.halfLen + 10), -20) : clamp(t.z, 20, COURT.halfLen + 10),
  });
  const gauss = () => (rng() + rng() + rng() - 1.5) * 2;
  const mem = { eventId: -1, t: 0, target: base, pending: null, pendingIn: 0, plan: null, moveX: 0, moveZ: 0 };

  function setTarget(t) {
    mem.pending = clampTarget(t);
    mem.pendingIn = params.reactionMs / 1000;
  }

  function replan(world) {
    const s = world.shuttle;
    const opp = world.players[side < 0 ? 1 : 0];
    mem.t = 0;
    mem.plan = null;
    if (s.held || s.lastHitBy === side) { setTarget(base); return; }

    const pred = predict(s);
    if (sideOf(pred.landZ) !== side) { setTarget(base); return; }
    const willBeOut = Math.abs(pred.landX) > COURT.halfW || Math.abs(pred.landZ) > COURT.halfLen;
    if (params.judgeOut && willBeOut) { setTarget(base); return; }

    const mine = (pt) => sideOf(pt.z) === side;
    const errX = gauss() * params.posErrorPx;
    const errZ = gauss() * params.posErrorPx;

    // Grounded play: stand on the predicted landing spot, the center of the catch circle the human sees.
    let target = { x: pred.landX, z: pred.landZ };

    // Aim away from the opponent, sometimes wrong on purpose.
    let aim = (opp.x > 0 ? -1 : 1) * (0.6 + rng() * 0.4);
    if (rng() < params.mistakeProb) aim = rng() * 2 - 1;

    const sp = pred.path.find((pt) => mine(pt) && pt.vy < 0 && pt.y >= 80 && pt.y <= 100 && Math.abs(pt.z) <= SMASH.maxDist);
    if (sp && sp.t - RISE_TIME > 0.1 && rng() < params.jumpSmashProb) {
      mem.plan = { type: 'smash', jumpAt: sp.t - RISE_TIME, aim };
      target = { x: sp.x, z: sp.z - dir * PLAYER.hitOffset };
    } else {
      const oppDist = Math.abs(opp.z);
      let shot;
      if (oppDist > 140 && rng() < params.dropProb) shot = 'drop';
      else if (oppDist < 60) shot = 'clear';
      else shot = rng() < 0.5 ? 'neutral' : 'clear';
      if (rng() < params.mistakeProb) shot = ['drop', 'clear', 'neutral'][Math.floor(rng() * 3)];
      mem.plan = { type: shot, aim };
    }
    setTarget({ x: target.x + errX, z: target.z + errZ });
  }

  function axisMove(cur, dx, dz) {
    const dz0 = params.deadZonePx;
    const next = { x: mem.moveX, z: mem.moveZ };
    next.x = Math.abs(dx) <= dz0 ? 0 : Math.sign(dx);
    next.z = Math.abs(dz) <= dz0 ? 0 : Math.sign(dz);
    mem.moveX = next.x;
    mem.moveZ = next.z;
    void cur;
  }

  function moveToward(intent, me, t) {
    axisMove(me, t.x - me.x, t.z - me.z);
    if (mem.moveX > 0) intent.right = true;
    else if (mem.moveX < 0) intent.left = true;
    if (mem.moveZ > 0) intent.up = true; // +z is screen up for both players
    else if (mem.moveZ < 0) intent.down = true;
  }

  return {
    side,
    params,
    /** Returns an Intent for this frame. Call before game.update with the same world. */
    update(world, dt) {
      const intent = { ...EMPTY_INTENT };
      const me = world.players[side < 0 ? 0 : 1];
      const s = world.shuttle;

      if (world.state === 'SERVE') {
        mem.eventId = -1;
        mem.plan = null;
        mem.target = base;
        if (world.server === side) {
          if (world.stateT >= world.cpuServeAt) {
            if (rng() < 0.3) intent.dropPressed = true; // occasional short serve
            else intent.smashPressed = true;
          }
        } else {
          moveToward(intent, me, { x: me.x, z: me.z }); // hold position until the serve
        }
        return intent;
      }
      if (world.state !== 'RALLY') return intent;

      if (world.eventId !== mem.eventId) {
        mem.eventId = world.eventId;
        replan(world);
      }
      mem.t += dt;
      if (mem.pending !== null) {
        mem.pendingIn -= dt;
        if (mem.pendingIn <= 0) { mem.target = mem.pending; mem.pending = null; }
      }
      moveToward(intent, me, mem.target);

      const plan = mem.plan;
      const shuttleMine = sideOf(s.z) === side && s.lastHitBy !== side;
      if (plan) intent.aim = plan.aim;
      if (plan && plan.type === 'smash') {
        if (mem.t >= plan.jumpAt && me.grounded && shuttleMine) intent.smashPressed = true;
        if (!me.grounded) intent.smash = true;
      } else if (plan && shuttleMine) {
        if (plan.type === 'clear') intent.lift = true;
        else if (plan.type === 'drop') intent.drop = true;
      }
      return intent;
    },
  };
}
