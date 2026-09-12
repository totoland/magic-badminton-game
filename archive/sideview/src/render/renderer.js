// Draws the court scene (background, net, players, shuttle) into the 480x270 scene buffer.
// No text here: menus and HUD live in hud.js and are composed by main.js on the frame.
import { W, H, GROUND_Y, NET_X, NET_TOP_Y, LINES, serveX } from '../config.js';
import { STATES } from '../game.js';
import { drawCharacter, drawShuttle } from './sprites.js';
import { text } from './hud.js';

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Static backdrop: gym wall, banner strip, court floor, lines. Drawn once. */
function buildBackground() {
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const bands = [[0, 70, '#1d2540'], [70, 130, '#233050'], [130, 172, '#2a3a5e'], [172, 200, '#1a2238']];
  for (const [y0, y1, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(0, y0, W, y1 - y0);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 1, 172);
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < 90; i += 1) {
    const x = Math.floor(hash(i) * W);
    const y = 138 + Math.floor(hash(i + 500) * 26);
    ctx.fillStyle = ['#5c6b9a', '#7a5a8a', '#4f7f8a', '#8a7a4f'][i % 4];
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.fillStyle = '#7a2d3a';
  ctx.fillRect(0, 176, W, 20);
  ctx.fillStyle = '#5e1f2b';
  ctx.fillRect(0, 194, W, 2);
  text(ctx, 'MINI GAMES     BADMINTON     MINI GAMES', W / 2, 182, { color: '#f4d3d8', shadow: false });
  ctx.fillStyle = '#2a7d4f';
  ctx.fillRect(0, 200, W, GROUND_Y - 200);
  ctx.fillStyle = '#35995f';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#25704a';
  ctx.fillRect(0, GROUND_Y, W, 1);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 200, W, 1);
  ctx.fillRect(0, H - 2, W, 2);
  ctx.fillRect(LINES.left - 1, 200, 2, H - 200);
  ctx.fillRect(LINES.right - 1, 200, 2, H - 200);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(NET_X, 200, 1, GROUND_Y - 200);
  return cv;
}

function drawNet(ctx) {
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(NET_X - 1, NET_TOP_Y - 2, 3, GROUND_Y - NET_TOP_Y + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let y = NET_TOP_Y + 3; y < GROUND_Y; y += 3) {
    for (let x = NET_X - 3; x <= NET_X + 3; x += 2) ctx.fillRect(x + ((y / 3) % 2), y, 1, 1);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(NET_X - 3, NET_TOP_Y, 7, 2);
}

function shadow(ctx, x, rx, alpha) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), GROUND_Y + 2, rx, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(buffer) {
  const ctx = buffer.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let bg = null; // built on first draw so the pixel font is loaded

  function drawPlayers(world) {
    for (const p of world.players) shadow(ctx, p.x, 9, 0.28);
    for (const p of world.players) drawCharacter(ctx, p.char, p.x, p.y, p.dir, p.anim, p.animT, !p.grounded);
  }

  function drawShuttleWithShadow(world) {
    const s = world.shuttle;
    const h = Math.max(0, GROUND_Y - s.y);
    shadow(ctx, s.x, Math.max(2, 5 - h / 60), Math.max(0.08, 0.35 - h / 400));
    drawShuttle(ctx, s.x, s.y, s.angle);
    if (s.y < 0) {
      ctx.fillStyle = '#ffd166';
      const x = Math.round(s.x);
      ctx.fillRect(x - 3, 6, 7, 1);
      ctx.fillRect(x - 2, 5, 5, 1);
      ctx.fillRect(x - 1, 4, 3, 1);
      ctx.fillRect(x, 3, 1, 1);
    }
  }

  return {
    /** Render the court scene for the current world state. */
    draw(world) {
      if (!bg) bg = buildBackground();
      ctx.drawImage(bg, 0, 0);
      drawNet(ctx);
      if (world.state === STATES.TITLE) {
        ctx.fillStyle = 'rgba(10, 12, 24, 0.55)';
        ctx.fillRect(0, 0, W, H);
        const st = world.settings;
        drawCharacter(ctx, st.chars[0], serveX(-1), GROUND_Y, 1, 'idle', world.time);
        drawCharacter(ctx, st.chars[1], serveX(1), GROUND_Y, -1, 'idle', world.time + 0.25);
        return;
      }
      drawPlayers(world);
      drawShuttleWithShadow(world);
    },
  };
}
