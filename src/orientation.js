// Landscape lock helpers. Android Chrome can lock orientation once the page is fullscreen; iOS Safari
// has no orientation API at all, so there the best we can do is ask the player to turn the phone.
const KEY = 'badminton.rotatePrompt';

export function lockSupported(win = globalThis) {
  const scr = win.screen;
  return !!(scr && scr.orientation && typeof scr.orientation.lock === 'function' && win.document && win.document.documentElement.requestFullscreen);
}

/** Try fullscreen + orientation lock ('landscape' | 'portrait'). Resolves true when the lock took. Must run inside a user gesture. */
export async function lockOrientation(orientation, win = globalThis) {
  try {
    const doc = win.document;
    if (!doc.fullscreenElement) await doc.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await win.screen.orientation.lock(orientation);
    return true;
  } catch {
    return false;
  }
}

export const lockLandscape = (win) => lockOrientation('landscape', win);

export async function unlockOrientation(win = globalThis) {
  try {
    if (win.screen.orientation && win.screen.orientation.unlock) win.screen.orientation.unlock();
    if (win.document.fullscreenElement) await win.document.exitFullscreen();
  } catch { /* ignore */ }
}

/** Show the rotate suggestion once per device: touch + portrait + not dismissed before. */
export function shouldSuggestRotate({ touch, portrait, dismissed }) {
  return !!touch && !!portrait && !dismissed;
}

export function readDismissed(storage = globalThis.localStorage) {
  try { return storage.getItem(KEY) === 'dismissed'; } catch { return false; }
}

export function writeDismissed(storage = globalThis.localStorage) {
  try { storage.setItem(KEY, 'dismissed'); } catch { /* private mode */ }
}
