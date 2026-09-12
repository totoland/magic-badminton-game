// Keyboard -> Intent. An Intent is the only thing a player consumes, whether it came from
// keys, the touch layer (which presses virtual keys), or the CPU.
// Intent = { left, right, up, down, aim, smash, smashPressed, lift, liftPressed, drop, dropPressed }
//   left/right/up/down : movement, screen-relative (up = away from the camera)
//   aim                : -1..1 lateral aim at contact (keys: right - left; joystick: stick x)
//   smash / smashPressed : attack; a press takes off if grounded and arms a smash; serves long
//   lift / liftPressed   : held = clear (high, deep) at contact; a press serves long
//   drop / dropPressed   : held = net drop at contact; a press serves short

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);

export const EMPTY_INTENT = Object.freeze({
  left: false, right: false, up: false, down: false, aim: 0,
  smash: false, smashPressed: false, lift: false, liftPressed: false, drop: false, dropPressed: false,
});

export function mergeIntents(a, b) {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    aim: Math.max(-1, Math.min(1, a.aim + b.aim)),
    smash: a.smash || b.smash,
    smashPressed: a.smashPressed || b.smashPressed,
    lift: a.lift || b.lift,
    liftPressed: a.liftPressed || b.liftPressed,
    drop: a.drop || b.drop,
    dropPressed: a.dropPressed || b.dropPressed,
  };
}

export class Keyboard {
  constructor() {
    this.held = new Set();
    this.pressed = new Set(); // edge-triggered, cleared by endFrame() after each simulation step
    this.aimOverride = null; // continuous aim from a joystick, if any
  }

  attach(target = window) {
    target.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => this.held.clear());
    return this;
  }

  isHeld(codes) {
    return Array.isArray(codes) ? codes.some((c) => this.held.has(c)) : this.held.has(codes);
  }

  justPressed(codes) {
    return Array.isArray(codes) ? codes.some((c) => this.pressed.has(c)) : this.pressed.has(codes);
  }

  intent(map) {
    const left = this.isHeld(map.left);
    const right = this.isHeld(map.right);
    return {
      left,
      right,
      up: this.isHeld(map.up),
      down: this.isHeld(map.down),
      aim: this.aimOverride ?? (right ? 1 : 0) - (left ? 1 : 0),
      smash: this.isHeld(map.smash),
      smashPressed: this.justPressed(map.smash),
      lift: this.isHeld(map.lift),
      liftPressed: this.justPressed(map.lift),
      drop: this.isHeld(map.drop),
      dropPressed: this.justPressed(map.drop),
    };
  }

  /** Virtual key down (touch buttons). */
  press(code) {
    this.held.add(code);
    this.pressed.add(code);
  }

  release(code) {
    this.held.delete(code);
  }

  /** One-frame edge without a hold (tap zones). */
  tap(code) {
    this.pressed.add(code);
  }

  setAim(value) {
    this.aimOverride = value;
  }

  endFrame() {
    this.pressed.clear();
  }
}
