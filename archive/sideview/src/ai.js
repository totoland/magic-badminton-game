// CPU controller. Produces the same Intent a keyboard would.
// Predicts the shuttle once per shuttle event (serve / hit / net), never per frame.
import { GROUND_Y, NET_X, LINES, PLAYER, SMASH, BASE_OFFSET } from './config.js';
import { predict } from './physics.js';
import { sideOf } from './rules.js';
import { EMPTY_INTENT } from './input.js';

const RISE_TIME = PLAYER.jumpV / PLAYER.g; // time from take-off to the apex

export function createAI(params, side, rng = Math.random) {
  const dir = -side;
  const baseX = NET_X + side * BASE_OFFSET;
  const nearNet = NET_X + side * 20;
  const backStop = side < 0 ? LINES.left + 10 : LINES.right - 10;
  const clampX = (x) => (side < 0 ? Math.min(Math.max(x, backStop), nearNet) : Math.max(Math.min(x, backStop), nearNet));
  const gauss = () => (rng() + rng() + rng() - 1.5) * 2; // cheap ~N(0,1)
  const mem = { eventId: -1, t: 0, targetX: baseX, pending: null, pendingIn: 0, plan: null, moving: 0 };

  function setTarget(x) {
    mem.pending = clampX(x);
    mem.pendingIn = params.reactionMs / 1000;
  }

  function replan(world) {
    const s = world.shuttle;
    const opp = world.players[side < 0 ? 1 : 0];
    mem.t = 0;
    mem.plan = null;
    if (s.held || s.lastHitBy === side) { setTarget(baseX); return; }

    const pred = predict(s);
    const mine = sideOf(pred.landX) === side;
    if (!mine) { setTarget(baseX); return; }
    const willBeOut = side < 0 ? pred.landX < LINES.left : pred.landX > LINES.right;
    if (params.judgeOut && willBeOut) { setTarget(baseX); return; }

    const onMySide = (pt) => sideOf(pt.x) === side;
    const h = (pt) => GROUND_Y - pt.y;
    const err = gauss() * params.posErrorPx;

    // Grounded intercept: where the shuttle descends through racket height.
    const ip = pred.path.find((pt) => onMySide(pt) && pt.vy > 0 && h(pt) <= PLAYER.hitH);
    let tx = (ip ? ip.x : pred.landX) - dir * PLAYER.hitOffset;

    // Jump smash: a point at ~apex racket height, close to the net, with time to take off.
    const sp = pred.path.find((pt) => onMySide(pt) && pt.vy > 0 && h(pt) >= 80 && h(pt) <= 100 && Math.abs(pt.x - NET_X) <= SMASH.maxDist);
    if (sp && sp.t - RISE_TIME > 0.1 && rng() < params.jumpSmashProb) {
      mem.plan = { type: 'smash', jumpAt: sp.t - RISE_TIME };
      tx = sp.x - dir * PLAYER.hitOffset;
    } else {
      const oppDist = Math.abs(opp.x - NET_X);
      let shot;
      if (oppDist > 140 && rng() < params.dropProb) shot = 'drop';
      else if (oppDist < 60) shot = 'clear';
      else shot = rng() < 0.5 ? 'neutral' : 'clear';
      if (rng() < params.mistakeProb) shot = ['drop', 'clear', 'neutral'][Math.floor(rng() * 3)];
      mem.plan = { type: shot };
    }
    setTarget(tx + err);
  }

  function moveToward(intent, me, x) {
    const dx = x - me.x;
    const dz = params.deadZonePx;
    if (Math.abs(dx) <= dz) mem.moving = 0;
    else if (mem.moving === 0 || Math.sign(dx) !== mem.moving) mem.moving = Math.abs(dx) > dz * 2 ? Math.sign(dx) : mem.moving;
    if (mem.moving > 0) intent.right = true;
    else if (mem.moving < 0) intent.left = true;
  }

  return {
    side,
    params,
    /** Returns an Intent for this frame. Must be called before game.update with the same world. */
    update(world, dt) {
      const intent = { ...EMPTY_INTENT };
      const me = world.players[side < 0 ? 0 : 1];
      const s = world.shuttle;

      if (world.state === 'SERVE') {
        mem.eventId = -1;
        mem.plan = null;
        mem.targetX = baseX;
        if (world.server === side) {
          if (world.stateT >= world.cpuServeAt) {
            intent.actionPressed = true;
            if (rng() < 0.3) intent.down = true; // occasional low serve
          }
        } else {
          moveToward(intent, me, baseX);
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
        if (mem.pendingIn <= 0) { mem.targetX = mem.pending; mem.pending = null; }
      }
      moveToward(intent, me, mem.targetX);

      const plan = mem.plan;
      const shuttleMine = sideOf(s.x) === side && s.lastHitBy !== side;
      if (plan && plan.type === 'smash') {
        // one press of the attack key takes off and arms the smash
        if (mem.t >= plan.jumpAt && me.grounded && shuttleMine) intent.actionPressed = true;
        if (!me.grounded) intent.action = true;
      } else if (plan && shuttleMine) {
        if (plan.type === 'clear') intent.jump = true; // held lift key, no take-off
        else if (plan.type === 'drop') intent.down = true;
      }
      return intent;
    },
  };
}
