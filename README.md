# Badminton

Arcade badminton with an NES Tennis style camera: you look over the near player's shoulder, the court
runs away from you in fake perspective, the opponent plays at the far end. Vanilla JS + Canvas, ES modules,
no dependencies, no image assets. Farm girl vs a one-year-old Alaskan Malamute holding the racket in its mouth.

The earlier side-view version (Pikachu Volleyball camera) is kept frozen in `archive/sideview/`.

## Run

```sh
npm run dev      # node serve.mjs (no-cache static server on :8080)
open http://localhost:8080
npm test         # node --test
```

ES modules do not load over `file://`, so use the dev server.

## Controls

| Player | Move | Lob (clear) | Drop | Smash (jump + smash) |
|---|---|---|---|---|
| P1 (near) | W A S D | Q | E | Space |
| P2 (far) | Arrows | . | , | Enter |

Movement is screen-relative: up moves away from the camera for both players. In 1P mode both key sets
drive the human. `P` or `Esc` pauses, `M` mutes.

Hits are automatic on racket contact. What you hold at contact picks the shot; left/right held at
contact aims the shot toward that sideline:

| Input held at contact | Shot |
|---|---|
| nothing | neutral arc to mid court |
| lob key | clear: high and deep to the back line |
| drop key | net drop just over the net |
| toward the net | drive: flat and fast |
| smash key | press it to jump; contact in the air is a smash when the shuttle is high and you are near the net, otherwise a jump drive |

**Aiming.** Depth comes from the shot type above. Direction comes from left/right: hold left or right
(or tilt the joystick sideways) at the moment of contact and the shot goes toward that sideline;
hold nothing and it goes down the middle. On the joystick the tilt is proportional.

**Serve.** Drop key = short serve just past the service line. Smash or lob key = long serve to the back
line (moving toward the net while pressing also serves short). Left/right shifts the serve a little
inside the box. The server stands in the right service court on an even score and the left on an odd
score, and serves diagonally, like the real rule. Serving never jumps.

**Returning.** You do not need exact racket contact: stand inside the yellow circle drawn at the
predicted landing spot when the shuttle comes down and you return it (red circle = it will land out).
In the air, a shuttle within a wider radius and near racket height is hit too, which is how jump
smashes connect.

## Mobile (9:16)

Open the same URL on a phone. In portrait the court sits in the middle of a 9:16 frame with a large
score header above and touch controls below: a virtual joystick for the left thumb (4-way run; its
horizontal tilt at contact aims the shot) and `LOB`, `DROP`, and a big `SMASH` for the right thumb.
Tap a menu row to change it, tap START to play, `II` pauses, `M` mutes. Landscape on a touch device
widens the frame and puts the joystick in the left gutter and the buttons in the right one, so the
court stays unobstructed. The page ships a web manifest for "Add to Home Screen"
(iOS home-screen icons need a PNG, which is not included yet).

## Rules

Rally scoring to 21, win by 2, cap at 30. The rally winner serves next. A shuttle landing beyond a
sideline or baseline is out and the point goes to the receiver. Not modelled: lets, net touches by a
player, change of ends, and service-box faults (the serve is aimed at the right box but not judged).

## Layout

- `src/config.js` every tunable (court, camera, physics, shot table, CPU levels, keys)
- `src/physics.js` 3D shuttle integration, net sweep, landing prediction, shot solver (pure, tested)
- `src/rules.js` scoring and landing judgement (pure, tested)
- `src/game.js` state machine TITLE -> SERVE -> RALLY -> POINT -> GAMEOVER
- `src/ai.js` CPU controller producing the same Intent as the keyboard
- `src/layout.js`, `src/touch.js` frames for landscape / portrait, joystick and buttons as virtual keys
- `src/render/camera.js` fake perspective projection; `render/sprites.js` front/back pixel art;
  `render/renderer.js` court scene; `render/hud.js` text, menus, overlays
