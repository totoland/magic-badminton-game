// Pure badminton rules. Not modelled: lets, player touching the net, change of ends,
// and service-box faults (the serve is aimed at the right box but not judged).
import { COURT } from './config.js';

export const WIN_SCORE = 21;
export const CAP_SCORE = 30;

/** Side of the net for a depth (-1 near / P1, +1 far / P2). */
export const sideOf = (z) => (z < 0 ? -1 : 1);
export const other = (side) => -side;

/** Is a court point inside the singles lines (on the line = in)? */
export const inCourt = (x, z) => Math.abs(x) <= COURT.halfW && Math.abs(z) <= COURT.halfLen;

/**
 * Resolve a landing:
 *  - in-bounds on side S -> point to the other side
 *  - OUT (beyond a line or gone) -> point to whoever did NOT hit it last
 */
export function judgeLanding({ x, z, lastHitBy }) {
  if (!inCourt(x, z)) return { winner: -lastHitBy, reason: 'out' };
  return { winner: -sideOf(z), reason: 'in' };
}

export function isGameOver(a, b) {
  const mx = Math.max(a, b);
  return (mx >= WIN_SCORE && Math.abs(a - b) >= 2) || mx >= CAP_SCORE;
}

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
