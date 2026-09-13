// Pure image processing for the sprite importer (no DOM), so it can be unit-tested in Node.
// Pixel buffers are RGBA Uint8ClampedArray like ImageData.data.

export const bgDistance = (px, i, bg) => Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]);
export const isBg = (px, i, bg, tol) => px[i + 3] < 128 || bgDistance(px, i, bg) <= tol;
/** Anti-aliased silhouette pixels: partly background, partly content. Neither counted as content nor averaged. */
export const isBleed = (px, i, bg, tol, bleed) => px[i + 3] >= 128 && bgDistance(px, i, bg) > tol && bgDistance(px, i, bg) <= tol * bleed;

/**
 * Estimate the size of the "fake pixels" in AI pixel art: block boundaries make the horizontal
 * gradient profile periodic, so the period shows up as the strongest autocorrelation lag.
 * Robust to grain and anti-aliased block edges. Returns 1 when no clear period exists.
 */
export function detectBlockSize(px, w, h) {
  const G = new Float64Array(w);
  for (let y = 0; y < h; y += 1) for (let x = 1; x < w; x += 1) {
    const i = (y * w + x) * 4;
    const j = i - 4;
    G[x] += Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);
  }
  const mean = G.reduce((a, b) => a + b, 0) / w;
  for (let x = 0; x < w; x += 1) G[x] -= mean;
  const maxLag = Math.min(64, Math.floor(w / 4));
  if (maxLag < 3) return 1;
  const R = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let x = 0; x + lag < w; x += 1) sum += G[x] * G[x + lag];
    R[lag] = sum / (w - lag);
  }
  let best = 1;
  let bestV = 0;
  for (let lag = 3; lag <= maxLag; lag += 1) if (R[lag] > bestV) { bestV = R[lag]; best = lag; }
  if (best === 1 || bestV < R[0] * 0.25) return 1;
  // prefer the fundamental period over its multiples
  let found = true;
  while (found) {
    found = false;
    for (const d of [2, 3, 5]) {
      const sub = best / d;
      if (Number.isInteger(sub) && sub >= 3 && R[sub] >= bestV * 0.7) { best = sub; found = true; break; }
    }
  }
  return best;
}

/** Bounding box of non-background pixels, or null. */
export function contentBox(px, w, h, bg, tol) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (isBg(px, (y * w + x) * 4, bg, tol)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Reduce an image by sampling the centre of each block (undoes AI "fake pixels"). */
export function reduceByBlock(px, w, h, block) {
  if (block <= 1) return { px, w, h };
  const rw = Math.max(1, Math.round(w / block));
  const rh = Math.max(1, Math.round(h / block));
  const out = new Uint8ClampedArray(rw * rh * 4);
  for (let y = 0; y < rh; y += 1) {
    const sy = Math.min(h - 1, Math.floor((y + 0.5) * h / rh));
    for (let x = 0; x < rw; x += 1) {
      const sx = Math.min(w - 1, Math.floor((x + 0.5) * w / rw));
      const i = (sy * w + sx) * 4;
      const o = (y * rw + x) * 4;
      out[o] = px[i]; out[o + 1] = px[i + 1]; out[o + 2] = px[i + 2]; out[o + 3] = px[i + 3];
    }
  }
  return { px: out, w: rw, h: rh };
}

/**
 * Box-filter a source region into a tw x th cell: keeps the aspect ratio, centres horizontally,
 * feet on the bottom row. A target pixel is opaque when at least half of its footprint is not background.
 * Returns { w, h, rgb: Float32Array(w*h*3), alpha: Uint8Array(w*h) }.
 */
export function downsampleCell(src, box, tw, th, bg, tol, opts = {}) {
  const { px, w } = src;
  const bleed = opts.bleed ?? 1;
  const scale = opts.scale ?? Math.min(tw / box.w, th / box.h);
  const dw = Math.max(1, Math.round(box.w * scale));
  const dh = Math.max(1, Math.round(box.h * scale));
  const ox = Math.floor((tw - dw) / 2);
  const oy = th - dh;
  const rgb = new Float32Array(tw * th * 3);
  const alpha = new Uint8Array(tw * th);
  for (let ty = 0; ty < dh; ty += 1) {
    const sy0 = box.y + Math.floor((ty * box.h) / dh);
    const sy1 = Math.max(sy0 + 1, box.y + Math.floor(((ty + 1) * box.h) / dh));
    for (let tx = 0; tx < dw; tx += 1) {
      const sx0 = box.x + Math.floor((tx * box.w) / dw);
      const sx1 = Math.max(sx0 + 1, box.x + Math.floor(((tx + 1) * box.w) / dw));
      let r = 0, g = 0, b = 0, n = 0, total = 0;
      for (let y = sy0; y < sy1; y += 1) for (let x = sx0; x < sx1; x += 1) {
        const i = (y * w + x) * 4;
        total += 1;
        if (isBg(px, i, bg, tol)) continue;
        if (bleed > 1 && isBleed(px, i, bg, tol, bleed)) { total -= 1; continue; } // ignore halo pixels
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n += 1;
      }
      if (n === 0 || n * 2 < total) continue;
      const o = (ty + oy) * tw + (tx + ox);
      rgb[o * 3] = r / n; rgb[o * 3 + 1] = g / n; rgb[o * 3 + 2] = b / n;
      alpha[o] = 1;
    }
  }
  return { w: tw, h: th, rgb, alpha };
}

/** k-means (k-means++ seeded, deterministic) over [r,g,b] points. Returns centres. */
export function kmeans(points, k, iters = 16) {
  if (points.length === 0) return [];
  k = Math.min(k, points.length);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const centers = [points[Math.floor(rnd() * points.length)].slice()];
  while (centers.length < k) {
    const dist = points.map((p) => Math.min(...centers.map((c) => d2(p, c))));
    const sum = dist.reduce((a, b) => a + b, 0);
    let r = rnd() * sum;
    let idx = dist.length - 1;
    for (let i = 0; i < dist.length; i += 1) { r -= dist[i]; if (r <= 0) { idx = i; break; } }
    centers.push(points[idx].slice());
  }
  for (let it = 0; it < iters; it += 1) {
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c += 1) { const d = d2(p, centers[c]); if (d < bd) { bd = d; best = c; } }
      acc[best][0] += p[0]; acc[best][1] += p[1]; acc[best][2] += p[2]; acc[best][3] += 1;
    }
    for (let c = 0; c < centers.length; c += 1) if (acc[c][3] > 0) centers[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
  }
  return centers.map((c) => c.map(Math.round));
}

/** Map every opaque pixel of every cell to the nearest palette index. Returns index grids (-1 = transparent). */
export function quantizeCells(cells, k) {
  const points = [];
  for (const c of cells) for (let i = 0; i < c.alpha.length; i += 1) if (c.alpha[i]) points.push([c.rgb[i * 3], c.rgb[i * 3 + 1], c.rgb[i * 3 + 2]]);
  const palette = kmeans(points, k);
  const nearest = (r, g, b) => { let best = 0, bd = Infinity; palette.forEach((p, i) => { const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
  const grids = cells.map((c) => {
    const g = new Int8Array(c.w * c.h).fill(-1);
    for (let i = 0; i < c.alpha.length; i += 1) if (c.alpha[i]) g[i] = nearest(c.rgb[i * 3], c.rgb[i * 3 + 1], c.rgb[i * 3 + 2]);
    return { w: c.w, h: c.h, idx: g };
  });
  return { palette, grids };
}

/** Remove isolated pixels and fill single-pixel holes (one pass). */
export function despeckle(grid) {
  const { w, h, idx } = grid;
  const out = Int8Array.from(idx);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : idx[y * w + x]);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    const opaque = n.filter((v) => v >= 0);
    const i = y * w + x;
    if (idx[i] >= 0 && opaque.length === 0) out[i] = -1; // lone speck
    else if (idx[i] < 0 && opaque.length === 4) { // pinhole: majority neighbour colour
      const counts = new Map();
      for (const v of opaque) counts.set(v, (counts.get(v) || 0) + 1);
      out[i] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return { w, h, idx: out };
}

export function gridToRows(grid, letters) {
  const rows = [];
  for (let y = 0; y < grid.h; y += 1) {
    let line = '';
    for (let x = 0; x < grid.w; x += 1) { const v = grid.idx[y * grid.w + x]; line += v < 0 ? '.' : letters[v]; }
    rows.push(line);
  }
  return rows;
}

export const hex = (p) => `#${p.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// Letters not used by the base palette (H h R Y S s E M W O o B D d L C c Z P F f N G).
export const FREE_LETTERS = 'abegijklmnpqrtuvwxyzAIJKQTUVX0123456789'.split('');

/**
 * Whole pipeline for one sheet. cellsPx = array of { px, w, h } (RGBA of each source cell).
 * opts = { tw, th, k, bg, tol, block (0 = auto), despeckle, bleed (halo cut-off as a multiple of tol, 1 = off) }
 * All cells share one scale (the largest frame fits the target), so a crouching frame stays smaller.
 */
export function convertSheet(cellsPx, opts) {
  const blocks = [];
  const prepared = [];
  for (const cell of cellsPx) {
    const block = opts.block > 0 ? opts.block : detectBlockSize(cell.px, cell.w, cell.h);
    blocks.push(block);
    const src = reduceByBlock(cell.px, cell.w, cell.h, block);
    const box = contentBox(src.px, src.w, src.h, opts.bg, opts.tol) || { x: 0, y: 0, w: src.w, h: src.h };
    prepared.push({ src, box });
  }
  const maxW = Math.max(...prepared.map((c) => c.box.w));
  const maxH = Math.max(...prepared.map((c) => c.box.h));
  const scale = Math.min(opts.tw / maxW, opts.th / maxH);
  const cells = prepared.map((c) => downsampleCell(c.src, c.box, opts.tw, opts.th, opts.bg, opts.tol, { scale, bleed: opts.bleed ?? 1 }));
  const { palette, grids } = quantizeCells(cells, opts.k);
  const cleaned = opts.despeckle ? grids.map(despeckle) : grids;
  return { palette, grids: cleaned, rows: cleaned.map((g) => gridToRows(g, FREE_LETTERS)), blocks };
}
