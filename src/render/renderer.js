// Draws the court scene (crowd, court in fake perspective, net, players, shuttle) into the
// 320x280 scene buffer. No text here: menus and HUD live in hud.js, composed by main.js.
import { SCENE, COURT, PLAYER } from '../config.js';
import { STATES } from '../game.js';
import { project } from './camera.js';
import { drawCharacter, drawShuttle } from './sprites.js';
import { text } from './hud.js';

const { w: W, h: H } = SCENE;

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function line(ctx, a, b, color = '#f4f4f4') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.sx + 0.5, a.sy + 0.5);
  ctx.lineTo(b.sx + 0.5, b.sy + 0.5);
  ctx.stroke();
}

/** Static backdrop: crowd, banner, surround, court and lines, umpire chair. Drawn once. */
function buildBackground() {
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  // crowd
  ctx.fillStyle = '#26306a';
  ctx.fillRect(0, 0, W, 40);
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const crowd = ['#e8e8f0', '#f0b0c0', '#f0d080', '#a0c0f0', '#c0a0e0', '#f08060'];
  for (let i = 0; i < 260; i += 1) {
    const x = Math.floor(hash(i) * W);
    const y = 4 + Math.floor(hash(i + 900) * 30);
    ctx.fillStyle = crowd[i % crowd.length];
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#1a2250';
    ctx.fillRect(x, y + 2, 2, 1);
  }
  // banner
  ctx.fillStyle = '#2f55c8';
  ctx.fillRect(0, 40, W, 18);
  ctx.fillStyle = '#1d3a94';
  ctx.fillRect(0, 56, W, 2);
  text(ctx, 'MINI GAMES', 92, 45, { color: '#ffffff', shadow: false });
  text(ctx, 'BADMINTON', 228, 45, { color: '#ffd166', shadow: false });
  // surround
  ctx.fillStyle = '#c96f2e';
  ctx.fillRect(0, 58, W, H - 58);
  ctx.fillStyle = '#b4602a';
  for (let y = 62; y < H; y += 12) ctx.fillRect(0, y, W, 1);
  // court
  const hw = COURT.halfW;
  const hl = COURT.halfLen;
  const c = [project(-hw, -hl), project(hw, -hl), project(hw, hl), project(-hw, hl)];
  ctx.fillStyle = '#3d8f3d';
  ctx.beginPath();
  ctx.moveTo(c[0].sx, c[0].sy);
  for (const p of c.slice(1)) ctx.lineTo(p.sx, p.sy);
  ctx.closePath();
  ctx.fill();
  // lines
  line(ctx, c[0], c[1]); // near baseline
  line(ctx, c[3], c[2]); // far baseline
  line(ctx, c[0], c[3]); // left sideline
  line(ctx, c[1], c[2]); // right sideline
  for (const z of [-COURT.shortService, COURT.shortService]) line(ctx, project(-hw, z), project(hw, z));
  line(ctx, project(0, -hl), project(0, -COURT.shortService));
  line(ctx, project(0, COURT.shortService), project(0, hl));
  // umpire chair (right of the net)
  const u = project(COURT.postX + 14, 0);
  const ux = Math.round(u.sx);
  const uy = Math.round(u.ground);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(ux - 6, uy - 44, 2, 44);
  ctx.fillRect(ux + 4, uy - 44, 2, 44);
  for (let y = uy - 40; y < uy; y += 8) ctx.fillRect(ux - 6, y, 12, 1);
  ctx.fillRect(ux - 8, uy - 46, 16, 3);
  ctx.fillStyle = '#f0b0c0';
  ctx.fillRect(ux - 3, uy - 58, 6, 6);
  ctx.fillStyle = '#4a7bd0';
  ctx.fillRect(ux - 4, uy - 52, 8, 7);
  return cv;
}

function drawNet(ctx) {
  const l = project(-COURT.postX, 0);
  const r = project(COURT.postX, 0);
  const top = project(0, 0, COURT.netH).sy;
  const x0 = Math.round(l.sx);
  const x1 = Math.round(r.sx);
  const y1 = Math.round(l.ground);
  const y0 = Math.round(top);
  ctx.fillStyle = '#1c1c2c';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = y0 + 3; y < y1; y += 3) for (let x = x0 + 1 + ((y / 3) % 2); x < x1; x += 3) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0, y0, x1 - x0, 2);
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(x0 - 2, y0 - 2, 2, y1 - y0 + 2);
  ctx.fillRect(x1, y0 - 2, 2, y1 - y0 + 2);
}

/** Landing marker: the catch circle (real radius) + cross at the predicted touchdown; red when it lands out. */
function drawLanding(ctx, landing, time) {
  const p = project(landing.x, landing.z, 0);
  const pulse = Math.floor(time * 4) % 2 === 0 ? 1 : 0;
  const color = landing.out ? '#ff5c5c' : '#ffd166';
  const rx = (PLAYER.catchRadius + pulse) * p.w;
  const ry = (PLAYER.catchRadius + pulse) * p.w * 0.45;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.ground, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(p.sx) - 2, Math.round(p.ground), 5, 1);
  ctx.fillRect(Math.round(p.sx), Math.round(p.ground) - 2, 1, 5);
}

function shadow(ctx, x, z, rx, ry, alpha) {
  const p = project(x, z, 0);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.ground + 1, rx * p.w, ry * p.w, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(buffer) {
  const ctx = buffer.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let bg = null;

  function drawPlayer(p) {
    const pr = project(p.x, p.z, p.y);
    drawCharacter(ctx, p.char, p.side < 0 ? 'back' : 'front', pr.sx, pr.sy, pr.scale, p.anim, p.animT, !p.grounded);
  }

  function drawShuttleAt(s) {
    const a = project(s.x, s.z, s.y);
    const b = project(s.x + s.vx * 0.05, s.z + s.vz * 0.05, s.y + s.vy * 0.05);
    const speed = Math.hypot(s.vx, s.vz, s.vy);
    const angle = speed > 20 ? Math.atan2(b.sy - a.sy, b.sx - a.sx) : Math.PI / 2;
    drawShuttle(ctx, a.sx, a.sy, angle, a.scale);
  }

  return {
    draw(world) {
      if (!bg) bg = buildBackground();
      ctx.drawImage(bg, 0, 0);
      const players = world.players;
      const s = world.shuttle;
      if (world.state === STATES.TITLE) {
        const st = world.settings;
        const a = project(-40, -150);
        const b = project(40, 150);
        drawNet(ctx);
        drawCharacter(ctx, st.chars[1], 'front', b.sx, b.sy, b.scale, 'idle', world.time + 0.25);
        drawCharacter(ctx, st.chars[0], 'back', a.sx, a.sy, a.scale, 'idle', world.time);
        ctx.fillStyle = 'rgba(10, 12, 24, 0.72)';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      // ground layer: landing marker, then shadows
      if (world.landing && world.state === STATES.RALLY) drawLanding(ctx, world.landing, world.time);
      for (const p of players) shadow(ctx, p.x, p.z, 9, 3, 0.28);
      shadow(ctx, s.x, s.z, Math.max(2.5, 5 - s.y / 60), 1.6, Math.max(0.2, 0.4 - s.y / 600));
      // far to near, net at depth 0
      const items = players.map((p) => ({ z: p.z, draw: () => drawPlayer(p) }));
      items.push({ z: s.z, draw: () => drawShuttleAt(s) });
      items.push({ z: 0, draw: () => drawNet(ctx) });
      items.sort((a, b) => b.z - a.z);
      for (const it of items) it.draw();
    },
  };
}
