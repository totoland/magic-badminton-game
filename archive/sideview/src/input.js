// Keyboard -> Intent. An Intent is the only thing a player consumes, whether it
// came from keys (here) or from the CPU (ai.js).
// Intent = { left, right, jump, jumpPressed, down, action, actionPressed }
//   jump held = lift (clear) at contact; jumpPressed = take off
//   action held / actionPressed = attack: take off if grounded, smash (or drive) at contact

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);

export const EMPTY_INTENT = Object.freeze({
  left: false, right: false, jump: false, jumpPressed: false, down: false, action: false, actionPressed: false,
});

export function mergeIntents(a, b) {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    jump: a.jump || b.jump,
    jumpPressed: a.jumpPressed || b.jumpPressed,
    down: a.down || b.down,
    action: a.action || b.action,
    actionPressed: a.actionPressed || b.actionPressed,
  };
}

export class Keyboard {
  constructor() {
    this.held = new Set();
    this.pressed = new Set(); // edge-triggered, cleared by endFrame() after each simulation step
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
    return {
      left: this.isHeld(map.left),
      right: this.isHeld(map.right),
      jump: this.isHeld(map.jump),
      jumpPressed: this.justPressed(map.jump),
      down: this.isHeld(map.down),
      action: this.isHeld(map.action),
      actionPressed: this.justPressed(map.action),
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

  endFrame() {
    this.pressed.clear();
  }
}
