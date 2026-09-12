// Pure badminton rules. Not modelled (2D side view): singles service courts, lets,
// player touching the net, change of ends.
import { W, NET_X, LINES } from './config.js';

export const WIN_SCORE = 21;
export const CAP_SCORE = 30;

/** Which side of the net an x is on (-1 left, +1 right). */
export const sideOf = (x) => (x < NET_X ? -1 : 1);
export const other = (side) => -side;

/**
 * Resolve a landing. Two distinct rules:
 *  - in-bounds ground on side S   -> point to the other side
 *  - OUT (beyond a back line or off-screen) -> point to whoever did NOT hit it last
 */
export function judgeLanding({ x, lastHitBy }) {
  if (x < 0 || x > W) return { winner: -lastHitBy, reason: 'out' };
  const side = sideOf(x);
  const inBounds = side < 0 ? x >= LINES.left : x <= LINES.right;
  if (!inBounds) return { winner: -lastHitBy, reason: 'out' };
  return { winner: -side, reason: 'in' };
}

export function isGameOver(a, b) {
  const mx = Math.max(a, b);
  return (mx >= WIN_SCORE && Math.abs(a - b) >= 2) || mx >= CAP_SCORE;
}

/** Returns -1 / +1 for the winner, 0 while the game is still on. a = left score, b = right score. */
export function winnerOf(a, b) {
  if (!isGameOver(a, b)) return 0;
  return a > b ? -1 : 1;
}

export function scoreLabel(a, b) {
  if (isGameOver(a, b)) return '';
  if (a === CAP_SCORE - 1 && b === CAP_SCORE - 1) return 'MATCH POINT';
  if (a === b && a >= WIN_SCORE - 1) return 'DEUCE';
  if (Math.max(a, b) >= WIN_SCORE - 1 && a !== b) return 'GAME POINT';
  return '';
}
