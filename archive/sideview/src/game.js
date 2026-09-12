// Game state machine and world. Owns entities, calls physics/rules, emits world.events.
// Never imports audio or rendering (keeps it Node-testable).
import {
  W, GROUND_Y, NET_X, SUBSTEPS, SHUTTLE_R, SHOTS, SMASH, TIMERS, DIFFICULTY, DIFFICULTY_ORDER, CHARS,
  serveX, mirrorX,
} from './config.js';
import { stepShuttle, sweepNet, applyNetResponse, solveShot, solveSmash } from './physics.js';
import { createPlayer, updatePlayer, placePlayer, hitCircle, swing } from './entities/player.js';
import { createShuttle, pinTo } from './entities/shuttle.js';
import { judgeLanding, isGameOver, winnerOf, sideOf } from './rules.js';

export const STATES = Object.freeze({
  TITLE: 'TITLE', SERVE: 'SERVE', RALLY: 'RALLY', POINT: 'POINT', GAMEOVER: 'GAMEOVER',
});

export const MENU_ROWS = ['mode', 'difficulty', 'p1', 'p2'];

export function createWorld(rng = Math.random) {
  const world = {
    rng,
    state: STATES.TITLE,
    stateT: 0,
    time: 0,
    paused: false,
    matchId: 0,
    eventId: 0, // bumps on serve / hit / net touch; the AI re-plans when it changes
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
  };
  return world;
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
  for (const p of world.players) placePlayer(p, serveX(p.side));
  const s = world.shuttle;
  s.lastHitBy = 0;
  s.netTouched = false;
  pinTo(s, playerOf(world, world.server));
  const [lo, hi] = TIMERS.cpuServeDelay;
  world.cpuServeAt = lo + world.rng() * (hi - lo);
  world.banner = '';
  world.subBanner = '';
  setState(world, STATES.SERVE);
}

/** Shot spec for `name`, mirrored for `side`, with jitter applied before solving. */
function shotSpec(world, name, side) {
  const s = SHOTS[name];
  const j = (amp) => (world.rng() * 2 - 1) * amp;
  return { angle: s.angle + j(s.jitterDeg), targetX: mirrorX(s.targetX + j(s.jitterX), side) };
}

function solveChain(world, from, chain, side) {
  for (const name of chain) {
    let v = null;
    if (name === 'smash') {
      const speed = SMASH.speed + (world.rng() * 2 - 1) * SMASH.jitterSpeed;
      v = solveSmash(from, { speed });
    } else {
      v = solveShot(from, shotSpec(world, name, side));
    }
    if (v) return { name, v };
  }
  // Last resort: a steep lob that will probably hit the net. That is a legitimate outcome.
  return { name: 'lob', v: { vx: from.dir * 80, vy: -450 } };
}

/**
 * Decide which shot chain the input asks for at contact.
 * Airborne: attack (action key, or an attack jump) -> smash when high and near the net, else drive;
 *           lift key held -> clear; down -> drop; nothing -> neutral.
 * Grounded: lift key held -> clear; down -> drop; action held or moving toward the net -> drive; nothing -> neutral.
 */
export function chooseChain(intent, p, shuttleH, distNet) {
  const towardNet = p.side < 0 ? intent.right : intent.left;
  if (!p.grounded) {
    if (p.attack || intent.action) {
      if (shuttleH >= SMASH.minH && distNet <= SMASH.maxDist) return ['smash', 'drive', 'neutral'];
      return ['drive', 'neutral'];
    }
    if (intent.jump) return ['clear', 'neutral'];
    if (intent.down) return ['drop', 'neutral'];
    return ['neutral', 'clear'];
  }
  if (intent.jump) return ['clear', 'neutral'];
  if (intent.down) return ['drop', 'neutral'];
  if (intent.action || towardNet) return ['drive', 'neutral'];
  return ['neutral', 'clear'];
}

function doHit(world, p, intent) {
  const s = world.shuttle;
  const chain = chooseChain(intent, p, GROUND_Y - s.y, Math.abs(s.x - NET_X));
  const from = { x: s.x, y: s.y, dir: p.dir };
  const { name, v } = solveChain(world, from, chain, p.side);
  s.vx = v.vx;
  s.vy = v.vy;
  s.lastHitBy = p.side;
  s.netTouched = false;
  swing(p);
  world.eventId += 1;
  world.events.push(name === 'smash' ? 'smash' : 'hit');
}

function serve(world, intent) {
  const server = playerOf(world, world.server);
  const s = world.shuttle;
  const towardNet = server.side < 0 ? intent.right : intent.left;
  const name = intent.down || towardNet ? 'lowServe' : 'highServe';
  const from = { x: s.x, y: s.y, dir: server.dir };
  const { v } = solveChain(world, from, [name, 'neutral'], server.side);
  s.vx = v.vx;
  s.vy = v.vy;
  s.held = 0;
  s.lastHitBy = server.side;
  s.netTouched = false;
  swing(server);
  world.eventId += 1;
  world.events.push('serve');
  setState(world, STATES.RALLY);
}

function endRally(world, landing) {
  const s = world.shuttle;
  const { winner, reason } = judgeLanding(landing);
  world.score[idx(winner)] += 1;
  world.server = winner;
  const loser = -winner;
  let banner = `${nameOf(world, winner)} SCORES`;
  if (reason === 'out') banner = 'OUT!';
  else if (s.netTouched && sideOf(s.x) === s.lastHitBy) banner = 'NET!';
  world.banner = banner;
  world.subBanner = reason === 'out' ? `${nameOf(world, loser)} HIT OUT` : `POINT ${nameOf(world, winner)}`;
  world.lastPoint = { winner, reason };
  world.events.push('point');
  setState(world, STATES.POINT);
}

function updateShuttle(world, intents) {
  const s = world.shuttle;
  const dt = 1 / 60 / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i += 1) {
    const prev = { x: s.x, y: s.y };
    stepShuttle(s, dt);
    const hit = sweepNet(prev, s);
    if (hit) {
      applyNetResponse(s, hit, world.rng);
      s.netTouched = true;
      world.eventId += 1;
      world.events.push('net');
      continue;
    }
    let hitSomeone = false;
    for (const p of world.players) {
      if (s.lastHitBy === p.side || sideOf(s.x) !== p.side) continue;
      const c = hitCircle(p);
      if (Math.hypot(s.x - c.x, s.y - c.y) <= c.r + SHUTTLE_R) {
        doHit(world, p, intents[idx(p.side)]);
        hitSomeone = true;
        break;
      }
    }
    if (hitSomeone) break;
    if (s.y + SHUTTLE_R >= GROUND_Y) {
      s.y = GROUND_Y - SHUTTLE_R;
      endRally(world, { x: s.x, lastHitBy: s.lastHitBy });
      return;
    }
    if (s.x < -SHUTTLE_R || s.x > W + SHUTTLE_R) {
      endRally(world, { x: s.x, lastHitBy: s.lastHitBy });
      return;
    }
  }
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > 20) s.angle = Math.atan2(s.vy, s.vx);
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
        // the server's action key serves instead of launching an attack jump
        updatePlayer(p, p.side === world.server ? { ...it, actionPressed: false } : it, dt);
      }
      const server = playerOf(world, world.server);
      pinTo(world.shuttle, server);
      const si = intents[idx(world.server)];
      if (world.stateT >= TIMERS.serveLock && si.actionPressed) serve(world, si);
      break;
    }

    case STATES.RALLY:
      for (const p of world.players) updatePlayer(p, intents[idx(p.side)], dt);
      updateShuttle(world, intents);
      break;

    case STATES.POINT:
      for (const p of world.players) updatePlayer(p, { ...intents[idx(p.side)], jumpPressed: false, actionPressed: false }, dt);
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
