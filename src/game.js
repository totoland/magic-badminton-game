// Game state machine and world. Owns entities, calls physics/rules, emits world.events.
// Never imports audio or rendering (keeps it Node-testable).
import { SUBSTEPS, SHUTTLE_R, SHOTS, SMASH, AIM, SERVE, TIMERS, DIFFICULTY, DIFFICULTY_ORDER, CHARS, PLAYER } from './config.js';
import { stepShuttle, sweepNet, applyNetResponse, solveShot, solveSmash, predict } from './physics.js';
import { createPlayer, updatePlayer, placePlayer, inReach, inAirReach, nearLanding, swing } from './entities/player.js';
import { createShuttle, pinTo } from './entities/shuttle.js';
import { judgeLanding, isGameOver, winnerOf, sideOf, inCourt } from './rules.js';

export const STATES = Object.freeze({
  TITLE: 'TITLE', SERVE: 'SERVE', RALLY: 'RALLY', POINT: 'POINT', GAMEOVER: 'GAMEOVER',
});

export const MENU_ROWS = ['mode', 'difficulty', 'p1', 'p2'];

export function createWorld(rng = Math.random) {
  return {
    rng,
    state: STATES.TITLE,
    stateT: 0,
    time: 0,
    paused: false,
    matchId: 0,
    eventId: 0, // bumps on serve / hit / net touch; the CPU re-plans when it changes
    events: [], // 'serve' | 'hit' | 'smash' | 'net' | 'point' | 'gameover' | 'menu' | 'pause'
    settings: { mode: '1p', difficulty: 'normal', chars: ['lady', 'dog'] },
    menu: { cursor: 0 },
    players: [createPlayer({ side: -1, char: 'lady' }), createPlayer({ side: 1, char: 'dog' })],
    shuttle: createShuttle(),
    score: [0, 0],
    server: -1,
    cpuServeAt: 1,
    banner: '',
    subBanner: '',
    lastPoint: null,
    landing: null, // predicted landing spot of the shuttle in flight: { x, z, t, out, netHit }
  };
}

/** Recompute where the shuttle will land (shown on screen, same physics the CPU uses). */
export function refreshLanding(world) {
  const s = world.shuttle;
  if (s.held) { world.landing = null; return; }
  const p = predict(s);
  world.landing = { x: p.landX, z: p.landZ, t: p.tLand, out: p.out || !inCourt(p.landX, p.landZ), netHit: p.netHit };
}

export const idx = (side) => (side < 0 ? 0 : 1);
export const playerOf = (world, side) => world.players[idx(side)];

export function nameOf(world, side) {
  if (side < 0) return 'P1';
  return world.settings.mode === '1p' ? 'CPU' : 'P2';
}

function setState(world, state) {
  world.state = state;
  world.stateT = 0;
}

export function startMatch(world, firstServer = -1) {
  const { mode, difficulty, chars } = world.settings;
  world.players = [createPlayer({ side: -1, char: chars[0] }), createPlayer({ side: 1, char: chars[1] })];
  if (mode === '1p') world.players[1].speedScale = DIFFICULTY[difficulty].speedScale;
  world.score = [0, 0];
  world.server = firstServer;
  world.matchId += 1;
  world.paused = false;
  enterServe(world);
}

function enterServe(world) {
  const server = playerOf(world, world.server);
  const receiver = playerOf(world, -world.server);
  // Real rule: even score -> serve from the player's own right service court, receiver diagonal.
  const even = world.score[idx(world.server)] % 2 === 0;
  const sx = SERVE.x * (even ? 1 : -1) * (server.side < 0 ? 1 : -1);
  placePlayer(server, sx, server.side * SERVE.z);
  placePlayer(receiver, -sx, receiver.side * SERVE.z);
  const s = world.shuttle;
  s.lastHitBy = 0;
  s.netTouched = false;
  pinTo(s, server);
  const [lo, hi] = TIMERS.cpuServeDelay;
  world.cpuServeAt = lo + world.rng() * (hi - lo);
  world.banner = '';
  world.subBanner = '';
  world.landing = null;
  setState(world, STATES.SERVE);
}

const jitter = (world, amp) => (world.rng() * 2 - 1) * amp;
const clamp1 = (v) => Math.max(-1, Math.min(1, v));

/** Lateral landing target for an aim value in [-1, 1]. */
export function aimTarget(world, aim) {
  return clamp1(aim) * AIM.spread + jitter(world, AIM.jitterX);
}

function solveChain(world, from, chain, p, aimX) {
  for (const name of chain) {
    let v = null;
    if (name === 'smash') {
      const speed = SMASH.speed + jitter(world, SMASH.jitterSpeed);
      v = solveSmash(from, { x: aimX, z: p.dir * 120 }, { speed });
    } else {
      const shot = SHOTS[name];
      const target = { x: aimX, z: p.dir * (shot.depth + jitter(world, shot.jitterZ)) };
      v = solveShot(from, target, { angle: shot.angle + jitter(world, shot.jitterDeg) });
    }
    if (v) return { name, v };
  }
  // Last resort: a steep lob that will probably hit the net. That is a legitimate outcome.
  return { name: 'lob', v: { vx: 0, vz: p.dir * 80, vy: 450 } };
}

/**
 * Decide which shot chain the input asks for at contact.
 * Airborne: attack (smash key or attack jump) -> smash when high and near the net, else drive;
 *           lift held -> clear; drop held -> drop; nothing -> neutral.
 * Grounded: lift held -> clear; drop held -> drop; smash held or moving toward the net -> drive.
 */
export function chooseChain(intent, p, shuttleH, distNet) {
  const towardNet = p.side < 0 ? intent.up : intent.down;
  if (!p.grounded) {
    if (p.attack || intent.smash) {
      if (shuttleH >= SMASH.minH && distNet <= SMASH.maxDist) return ['smash', 'drive', 'neutral'];
      return ['drive', 'neutral'];
    }
    if (intent.lift) return ['clear', 'neutral'];
    if (intent.drop) return ['drop', 'neutral'];
    return ['neutral', 'clear'];
  }
  if (intent.lift) return ['clear', 'neutral'];
  if (intent.drop) return ['drop', 'neutral'];
  if (intent.smash || towardNet) return ['drive', 'neutral'];
  return ['neutral', 'clear'];
}

function launch(world, s, v, p, name) {
  s.vx = v.vx;
  s.vz = v.vz;
  s.vy = v.vy;
  s.lastHitBy = p.side;
  s.held = 0;
  s.netTouched = false;
  swing(p);
  world.eventId += 1;
  world.events.push(name);
  refreshLanding(world);
}

function doHit(world, p, intent) {
  const s = world.shuttle;
  const chain = chooseChain(intent, p, s.y, Math.abs(s.z));
  const from = { x: s.x, z: s.z, y: s.y };
  const { name, v } = solveChain(world, from, chain, p, aimTarget(world, intent.aim ?? 0));
  launch(world, s, v, p, name === 'smash' ? 'smash' : 'hit');
}

/** Which serve, if any, the server's input asks for: 'lowServe' | 'highServe' | null. */
export function serveRequest(intent, server) {
  if (intent.dropPressed) return 'lowServe';
  if (intent.smashPressed || intent.liftPressed) {
    const towardNet = server.side < 0 ? intent.up : intent.down;
    return intent.drop || towardNet ? 'lowServe' : 'highServe';
  }
  return null;
}

function serve(world, intent, name) {
  const server = playerOf(world, world.server);
  const s = world.shuttle;
  const from = { x: s.x, z: s.z, y: s.y };
  // Serve into the diagonally opposite service court; left/right shifts it a little inside the box.
  const aimX = -server.x + clamp1(intent.aim ?? 0) * 20 + jitter(world, 6);
  const { v } = solveChain(world, from, [name, 'neutral'], server, aimX);
  launch(world, s, v, server, 'serve');
  setState(world, STATES.RALLY);
}

function endRally(world) {
  const s = world.shuttle;
  const { winner, reason } = judgeLanding({ x: s.x, z: s.z, lastHitBy: s.lastHitBy });
  world.score[idx(winner)] += 1;
  world.server = winner;
  let banner = `${nameOf(world, winner)} SCORES`;
  if (reason === 'out') banner = 'OUT!';
  else if (s.netTouched && sideOf(s.z) === s.lastHitBy) banner = 'NET!';
  world.banner = banner;
  world.subBanner = reason === 'out' ? `${nameOf(world, -winner)} HIT OUT` : `POINT ${nameOf(world, winner)}`;
  world.lastPoint = { winner, reason, x: s.x, z: s.z };
  world.landing = null;
  world.events.push('point');
  setState(world, STATES.POINT);
}

function updateShuttle(world, intents) {
  const s = world.shuttle;
  const dt = 1 / 60 / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i += 1) {
    const prev = { z: s.z, y: s.y };
    stepShuttle(s, dt);
    const hit = sweepNet(prev, s);
    if (hit) {
      applyNetResponse(s, hit, world.rng);
      s.netTouched = true;
      world.eventId += 1;
      world.events.push('net');
      refreshLanding(world);
      continue;
    }
    let hitSomeone = false;
    for (const p of world.players) {
      if (s.lastHitBy === p.side || sideOf(s.z) !== p.side) continue;
      // Contact: inside the racket volume, or airborne with the shuttle near racket height within the
      // catch radius (jump smash), or grounded with the shuttle down at racket height while standing
      // inside the catch circle around the landing spot.
      const groundCatch = p.grounded && s.vy < 0 && s.y <= PLAYER.hitH && nearLanding(p, world.landing);
      if (inReach(p, s) || inAirReach(p, s) || groundCatch) {
        doHit(world, p, intents[idx(p.side)]);
        hitSomeone = true;
        break;
      }
    }
    if (hitSomeone) break;
    if (s.y - SHUTTLE_R <= 0) {
      s.y = SHUTTLE_R;
      endRally(world);
      return;
    }
    if (!Number.isFinite(s.x) || Math.abs(s.x) > 400 || Math.abs(s.z) > 400) {
      endRally(world);
      return;
    }
  }
}

function cycle(list, value, delta) {
  const i = list.indexOf(value);
  return list[(i + delta + list.length) % list.length];
}

function updateTitle(world, ui) {
  const m = world.menu;
  const st = world.settings;
  if (ui.up) { m.cursor = (m.cursor + MENU_ROWS.length - 1) % MENU_ROWS.length; world.events.push('menu'); }
  if (ui.down) { m.cursor = (m.cursor + 1) % MENU_ROWS.length; world.events.push('menu'); }
  const delta = (ui.right ? 1 : 0) - (ui.left ? 1 : 0);
  if (delta !== 0) {
    const row = MENU_ROWS[m.cursor];
    if (row === 'mode') st.mode = st.mode === '1p' ? '2p' : '1p';
    else if (row === 'difficulty') st.difficulty = cycle(DIFFICULTY_ORDER, st.difficulty, delta);
    else if (row === 'p1') st.chars[0] = cycle(CHARS, st.chars[0], delta);
    else if (row === 'p2') st.chars[1] = cycle(CHARS, st.chars[1], delta);
    world.events.push('menu');
  }
  if (ui.confirm) startMatch(world, -1);
}

export function togglePause(world) {
  if (![STATES.SERVE, STATES.RALLY, STATES.POINT].includes(world.state)) return;
  world.paused = !world.paused;
  world.events.push('pause');
}

/**
 * Advance the world by one fixed step.
 * intents = [intentP1, intentP2]; ui = { up, down, left, right, confirm, back, pause } (edge-triggered).
 */
export function update(world, intents, ui, dt) {
  world.time += dt;
  if (ui.pause) togglePause(world);
  if (world.paused) return;
  world.stateT += dt;

  switch (world.state) {
    case STATES.TITLE:
      updateTitle(world, ui);
      break;

    case STATES.SERVE: {
      for (const p of world.players) {
        const it = intents[idx(p.side)];
        // the server's smash key serves instead of launching an attack jump
        updatePlayer(p, p.side === world.server ? { ...it, smashPressed: false } : it, dt);
      }
      const server = playerOf(world, world.server);
      pinTo(world.shuttle, server);
      const si = intents[idx(world.server)];
      const req = world.stateT >= TIMERS.serveLock ? serveRequest(si, server) : null;
      if (req) serve(world, si, req);
      break;
    }

    case STATES.RALLY:
      for (const p of world.players) updatePlayer(p, intents[idx(p.side)], dt);
      updateShuttle(world, intents);
      break;

    case STATES.POINT:
      for (const p of world.players) updatePlayer(p, { ...intents[idx(p.side)], smashPressed: false }, dt);
      if (world.stateT >= TIMERS.pointBanner) {
        const [a, b] = world.score;
        if (isGameOver(a, b)) {
          world.banner = `${nameOf(world, winnerOf(a, b))} WINS ${Math.max(a, b)}-${Math.min(a, b)}`;
          world.subBanner = 'ENTER: REMATCH   ESC: TITLE';
          world.events.push('gameover');
          setState(world, STATES.GAMEOVER);
        } else {
          enterServe(world);
        }
      }
      break;

    case STATES.GAMEOVER:
      if (ui.confirm) startMatch(world, winnerOf(world.score[0], world.score[1]) || -1);
      else if (ui.back) { world.events.push('menu'); setState(world, STATES.TITLE); }
      break;

    default:
      break;
  }
}
